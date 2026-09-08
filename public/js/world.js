/* =============================================================================
   MUNDO — o cenário que o jogador percorre a pé.
   Câmera que acompanha, colisão, portas entre cômodos, NPCs que vivem o caso
   e inspeção por proximidade (balão flutuante).

   Tudo aqui convive com o que já existe: a engine continua sendo a autoridade
   das regras, o net continua sincronizando, e entrar num cômodo pelo mundo
   dispara o mesmo "travel" de antes (barra de locais, falas, pistas).
   ========================================================================== */
import { Props, Decor, Particles, glow, rr, drawLighting, drawFilmGrain } from './art.js';
import { buildMap, roomAt, walkable, nearestObject, WALL } from '../shared/maps.js';
import { Actor } from './characters.js';
import { CHARACTERS } from '../shared/content.js';
import { UI } from './ui.js';
import * as A from './audio.js';
import { currentCase, getClue } from '../shared/engine.js';

const SPEED = 250;          // px/s do meu personagem
const RAIO = 15;            // raio de colisão
const ALCANCE = 165;        // distância para aparecer o botão INVESTIGAR
const ALCANCE_MATA = 150;   // só mata quem está bem ao lado
const PASSO_S = 0.40;       // intervalo do som de passos

/* ------------------------------------------------------------------ atores */
/** Um personagem do caso andando pelo mundo.
    Reaproveita o Actor original (silhueta noir, humor, fala, reações),
    trocando só a locomoção: agora 2D, com destino em coordenadas do mundo. */
class WorldActor extends Actor {
  constructor(id, world) {
    super(id);
    this.world = world;
    this.vy = 0;
    this.ty = this.y;
    this.homeRoom = this.def.scene;
    this.task = null;
    this.taskT = 0;
    this.grupo = null;      // id de quem ele está acompanhando
  }

  speed() { return super.speed() * (this.mood === 'nervoso' ? 1.25 : 1); }

  /** Escolhe para onde ir: uma rotina do personagem, um objeto ou alguém. */
  escolherDestino(ctx) {
    const map = this.world.map;
    const rotina = this.def.routine || [];
    const proximo = rotina[this.beat % Math.max(1, rotina.length)];
    this.beat++;

    let sala = proximo?.scene || this.homeRoom;
    let room = map.rooms.find(r => r.id === sala) || map.rooms.find(r => r.id === this.homeRoom) || map.rooms[0];
    if (!room) return;

    // às vezes visita alguém (forma pequenos grupos)
    const outros = this.world.npcs.filter(n => n !== this);
    if (outros.length && Math.random() < 0.22) {
      const amigo = outros[Math.floor(Math.random() * outros.length)];
      if (this.def.likes?.includes(amigo.id)) {
        this.grupo = amigo.id;
        this.irPara(amigo.x + (Math.random() < 0.5 ? -70 : 70), amigo.y + 20, room.id);
        this.actT = 6 + Math.random() * 6;
        return;
      }
    }
    this.grupo = null;

    // às vezes vai investigar um objeto da sala
    const daSala = map.objects.filter(o => o.room === room.id);
    if (daSala.length && Math.random() < 0.45) {
      const alvo = daSala[Math.floor(Math.random() * daSala.length)];
      this.task = alvo.id;
      this.irPara(alvo.cx + (Math.random() < 0.5 ? -60 : 60), alvo.cy + 55, room.id);
      this.pendingAct = 'examine';
      this.actT = (proximo?.dur || 4000) / 1000;
      return;
    }

    const x = room.x + WALL + 60 + Math.random() * (room.w - 2 * WALL - 120);
    const y = room.y + WALL + 80 + Math.random() * (room.h - 2 * WALL - 160);
    this.task = null;
    this.irPara(x, y, room.id);
    this.pendingAct = proximo?.act || 'idle';
    this.actT = (proximo?.dur || 4000) / 1000;
  }

  irPara(x, y, sala) {
    this.target = { x, y, scene: sala || this.scene };
    this.ty = y;
    this.traveling = sala != null && sala !== this.scene;
  }

  update(dt, ctx) {
    this.anim += dt * (this.mood === 'nervoso' ? 1.35 : this.mood === 'triste' ? 0.8 : 1);
    if (this.bubble) { this.bubble.t -= dt; if (this.bubble.t <= 0) this.bubble = null; }
    if (this.pauseT > 0) { this.pauseT -= dt; }
    if (this.reactCooldown > 0) this.reactCooldown -= dt;

    // reações a descobertas da equipe (vindas das flags do caso)
    for (const [flag, r] of Object.entries(this.def.reactions || {})) {
      if (ctx.flags[flag] && !this.lastFlags[flag]) { this.lastFlags[flag] = true; this.react(r, ctx); }
      if (!ctx.flags[flag]) this.lastFlags[flag] = false;
    }
    if (ctx.pendingReacts?.length) {
      for (const r of ctx.pendingReacts) if (r.char === this.id) this.react({ line: r.line, mood: r.mood }, ctx);
    }

    if (this.target && this.pauseT <= 0) {
      const dx = this.target.x - this.x, dy = (this.target.y ?? this.y) - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        const v = this.speed();
        const nx = this.x + (dx / dist) * v * dt;
        const ny = this.y + (dy / dist) * v * dt;
        // desliza pelas paredes: tenta um eixo por vez
        if (walkable(this.world.map, nx, this.y, RAIO)) this.x = nx;
        if (walkable(this.world.map, this.x, ny, RAIO)) this.y = ny;
        this.facing = Math.abs(dx) > 2 ? Math.sign(dx) : this.facing;
        this.act = 'walk'; this.vx = (dx / dist); this.vy = (dy / dist);
      } else {
        this.x = this.target.x; this.y = this.target.y ?? this.y;
        this.vx = 0; this.vy = 0;
        this.traveling = false;
        this.target = null;
        this.act = this.pendingAct || 'idle';
        this.pendingAct = null;
      }
    } else if (this.pauseT <= 0) {
      this.actT -= dt; this.vx = 0; this.vy = 0;
      if (this.actT <= 0) this.escolherDestino(ctx);
      if (this.act === 'pace') {
        const nx = this.x + Math.sin(this.anim * 1.1) * 22 * dt;
        if (walkable(this.world.map, nx, this.y, RAIO)) this.x = nx;
        this.facing = Math.cos(this.anim * 1.1) > 0 ? 1 : -1;
        this.vx = Math.cos(this.anim * 1.1) * 0.4;
      }
      // olha para quem está por perto
      if (this.world.me && Math.hypot(this.world.me.x - this.x, this.world.me.y - this.y) < 260) {
        if (Math.random() < dt * 0.5) {
          this.headTurn = Math.sign(this.world.me.x - this.x) * 0.5;
          clearTimeout(this._ht); this._ht = setTimeout(() => { this.headTurn = 0; }, 1600);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ mundo */
export class World {
  constructor(game) {
    this.g = game;                       // Game: canvas, net, state
    this.map = null;
    this.me = { x: 0, y: 0, dir: 1, anim: 0, moving: false, room: null };
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.input = { ax: 0, ay: 0, tap: null };
    this.npcs = [];
    this.actors = new Map();             // outros jogadores
    this.particles = new Particles();
    this.t = 0;
    this.stepT = 0;
    this.sendT = 0;
    this.dark = 0;                       // 0 aceso · 1 apagado (sabotagem)
    this.foco = null;                    // objeto em alcance
    this.balaoAberto = false;
    this._criarInterface();
    this._bindInput();
  }

  /* ------------------------------------------------------------- preparo */
  build(state, meId) {
    const caso = currentCase(state || { caseId: 'mansao' });
    this.map = buildMap(caso);
    this.caso = caso;

    const spawn = this.map.spawns[0] || { x: this.map.rooms[0].cx, y: this.map.rooms[0].cy };
    const salvo = state?.players?.[meId]?.pos;
    this.me.x = salvo?.x ?? spawn.x;
    this.me.y = salvo?.y ?? spawn.y;
    if (!walkable(this.map, this.me.x, this.me.y)) {
      const r = this.map.rooms[0]; this.me.x = r.cx; this.me.y = r.cy;
    }
    this.me.room = roomAt(this.map, this.me.x, this.me.y)?.id || this.map.rooms[0].id;
    this.cam.x = this.me.x; this.cam.y = this.me.y;
    this.particles.seed(this.me.room, this.map.rooms[0].ambient);

    // NPCs: as testemunhas do caso + o elenco do content.js que existir
    this.npcs = [];
    const usados = new Set();
    for (const t of (caso.witnesses || [])) {
      const def = CHARACTERS[t.id];
      if (!def) continue;
      usados.add(t.id);
      this.npcs.push(this._criarActor(t.id));
    }
    for (const ch of Object.keys(CHARACTERS)) {
      if (usados.has(ch)) continue;
      if (this.npcs.length >= 6) break;
      if (!this.map.rooms.some(r => r.id === CHARACTERS[ch].scene)) CHARACTERS[ch].scene = this.map.rooms[0].id;
      this.npcs.push(this._criarActor(ch));
    }
    for (const n of this.npcs) n.escolherDestino(this.ctx());
    return this.map;
  }

  _criarActor(id) {
    const a = new WorldActor(id, this);
    const r = this.map.rooms.find(x => x.id === a.def.scene) || this.map.rooms[Math.floor(Math.random() * this.map.rooms.length)];
    a.scene = r.id;
    a.x = r.x + 100 + Math.random() * (r.w - 200);
    a.y = r.y + 160 + Math.random() * (r.h - 260);
    a.actT = Math.random() * 3;
    return a;
  }

  ctx() {
    return {
      flags: this.g.state?.flags || {},
      pendingReacts: this.g._pendingReacts || [],
      nearbyPlayerX: this.me.x,
      navOf: (from, to) => this.map.doors.find(d => (d.a === from && d.b === to) || (d.a === to && d.b === from)),
    };
  }

  /* ---------------------------------------------------------- interface */
  _criarInterface() {
    const host = document.getElementById('screen-game') || document.body;
    const btn = document.createElement('button');
    btn.id = 'btn-investigar';
    btn.className = 'btn-investigar hidden';
    btn.innerHTML = '<span>🔎</span> INVESTIGAR';
    btn.onclick = (e) => { e.stopPropagation(); this.abrirBalao(this.foco); };
    host.appendChild(btn);
    this.btnInv = btn;

    // botões do mundo: assassinar / denunciar / convocar reunião
    const btnK = document.getElementById('btn-kill');
    if (btnK) { btnK.onclick = (e) => { e.stopPropagation(); this.assassinar(); }; this.btnKill = btnK; }
    const btnR = document.getElementById('btn-report');
    if (btnR) { btnR.onclick = (e) => { e.stopPropagation(); this.denunciar(); }; this.btnReport = btnR; }
    const btnM = document.getElementById('btn-emergency');
    if (btnM) { btnM.onclick = (e) => { e.stopPropagation(); this.convocarReuniao(); }; this.btnMeet = btnM; }
    const btnS = document.getElementById('btn-sabotagem');
    if (btnS) { btnS.onclick = (e) => { e.stopPropagation(); this.sabotar(); }; this.btnSabotagem = btnS; }
    this.cdBadge = document.getElementById('kill-cooldown');
    this.cdTxt = document.getElementById('kill-cd-txt');
    this.ghostBar = document.getElementById('ghost-bar');
    this.ghostNote = document.getElementById('ghost-note');

    const bal = document.createElement('div');
    bal.id = 'inspect-balloon';
    bal.className = 'balloon hidden';
    bal.innerHTML = `<div class="bal-head"><span id="bal-title">OBJETO</span><button id="bal-x" class="bal-x">✕</button></div>
                     <div class="bal-body" id="bal-body"></div>
                     <div class="bal-foot"><button id="bal-close" class="btn-mini">FECHAR</button></div>`;
    host.appendChild(bal);
    this.balao = bal;

    const fechar = (e) => { e?.stopPropagation?.(); this.fecharBalao(); };
    bal.querySelector('#bal-x').onclick = fechar;
    bal.querySelector('#bal-close').onclick = fechar;
    bal.addEventListener('pointerdown', e => e.stopPropagation());

    // joystick
    const joy = document.createElement('div');
    joy.id = 'joystick';
    joy.className = 'joystick hidden';
    joy.innerHTML = '<div class="joy-base"><div class="joy-knob"></div></div>';
    host.appendChild(joy);
    this.joy = joy;
    const base = joy.querySelector('.joy-base');
    const knob = joy.querySelector('.joy-knob');
    let ativo = false, cx = 0, cy = 0;
    const R = 52;
    const mover = (t) => {
      const rect = base.getBoundingClientRect();
      let dx = t.clientX - (rect.left + rect.width / 2);
      let dy = t.clientY - (rect.top + rect.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.input.ax = dx / R; this.input.ay = dy / R;
    };
    const soltar = () => {
      ativo = false; knob.style.transform = 'translate(0,0)';
      this.input.ax = 0; this.input.ay = 0;
    };
    base.addEventListener('pointerdown', (e) => {
      ativo = true; base.setPointerCapture(e.pointerId); mover(e); e.stopPropagation();
    });
    base.addEventListener('pointermove', (e) => { if (ativo) mover(e); });
    base.addEventListener('pointerup', soltar);
    base.addEventListener('pointercancel', soltar);

    // clicar em qualquer lugar fora do balão (inclusive na HUD) fecha
    document.addEventListener('pointerdown', (e) => {
      if (!this.balaoAberto) return;
      const alvo = e.target;
      if (alvo && alvo.closest && (alvo.closest('#inspect-balloon') || alvo.closest('#btn-investigar'))) return;
      this.fecharBalao();
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.balaoAberto) { this.fecharBalao(); return; }
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        this.teclas[k] = true; e.preventDefault();
      }
    });
    document.addEventListener('keyup', (e) => { this.teclas[e.key.toLowerCase()] = false; });
    this.teclas = {};
  }

  _bindInput() {
    const cv = this.g.canvas;
    cv.addEventListener('pointerdown', (e) => {
      if (this.balaoAberto) { this.fecharBalao(); return; }
      const p = this.telaParaMundo(e.offsetX, e.offsetY);
      if (this.clicouEmAlguem(p.x, p.y)) { this.input.tap = null; return; }
      if (this.clicouEmCorpo(p.x, p.y)) { this.input.tap = null; return; }
      if (p) { this.input.tap = p; }
    });
    cv.addEventListener('pointerup', () => { /* mantém o destino até chegar */ });
  }

  telaParaMundo(sx, sy) {
    const { vw, vh } = this.g;
    const wx = (sx - vw / 2) / this.cam.zoom + this.cam.x;
    const wy = (sy - vh / 2) / this.cam.zoom + this.cam.y;
    return { x: wx, y: wy };
  }
  mundoParaTela(wx, wy) {
    const { vw, vh } = this.g;
    return { x: (wx - this.cam.x) * this.cam.zoom + vw / 2, y: (wy - this.cam.y) * this.cam.zoom + vh / 2 };
  }

  /* ------------------------------------------------------------- balão */
  abrirBalao(obj) {
    if (!obj) return;
    this.balaoAberto = true;
    const titulo = obj.name || 'OBJETO';
    this.balao.querySelector('#bal-title').textContent = '🔎 ' + titulo;
    const body = this.balao.querySelector('#bal-body');
    body.innerHTML = '';
    const desc = document.createElement('p');
    desc.className = 'bal-desc';
    desc.textContent = obj.hint || 'Algo aqui chama a atenção. De mais perto dá para ver detalhes.';
    body.appendChild(desc);
    for (const a of (obj.actions || [])) {
      const b = document.createElement('button');
      b.className = 'bal-act';
      b.textContent = a.label;
      b.onclick = () => this.executarAcao(obj, a);
      body.appendChild(b);
    }
    this.balao.classList.remove('hidden');
    this.posicionarBalao(obj);
    A.playSfx('paper');
    this.ultimoObjeto = obj;
  }

  executarAcao(obj, a) {
    if (a && a.id === 'painel') { this.fecharBalao(); this.g.luz?.abrir(); return; }
    this.g.net.action({ type: 'interact', scene: obj.room, objId: obj.id, actionId: a.id });
    A.playSfx('click');
    this.ultimoObjeto = obj;
    // o texto da pista aparece quando o evento chega (onEvents -> mostrarResultado)
  }

  mostrarResultado(texto) {
    if (!this.balaoAberto) return;
    const body = this.balao.querySelector('#bal-body');
    const r = document.createElement('p');
    r.className = 'bal-result';
    r.textContent = texto;
    body.appendChild(r);
    body.scrollTop = body.scrollHeight;
    this.posicionarBalao(this.ultimoObjeto);
  }

  posicionarBalao(obj) {
    if (!obj) return;
    const p = this.mundoParaTela(obj.cx, obj.cy - 40);
    const { vw, vh } = this.g;
    const w = Math.min(320, vw - 24);
    let x = p.x - w / 2, y = p.y - 40;
    x = Math.max(12, Math.min(vw - w - 12, x));
    y = Math.max(60, Math.min(vh - 240, y));
    this.balao.style.left = x + 'px';
    this.balao.style.top = y + 'px';
    this.balao.style.width = w + 'px';
  }

  fecharBalao() {
    this.balaoAberto = false;
    this.balao.classList.add('hidden');
    this.g.clearSelection?.();
  }

  /* -------------------------------------------------------------- update */
  update(dt) {
    if (!this.map) return;
    this.t += dt;
    const st = this.g.state;

    /* ---- entrada: teclado, joystick e toque ---- */
    let ax = this.input.ax, ay = this.input.ay;
    const T = this.teclas;
    if (T['a'] || T['arrowleft']) ax -= 1;
    if (T['d'] || T['arrowright']) ax += 1;
    if (T['w'] || T['arrowup']) ay -= 1;
    if (T['s'] || T['arrowdown']) ay += 1;

    if (this.input.tap) {
      const dx = this.input.tap.x - this.me.x, dy = this.input.tap.y - this.me.y;
      const d = Math.hypot(dx, dy);
      if (d < 14) this.input.tap = null;
      else { ax += dx / d; ay += dy / d; }
    }

    const m = Math.hypot(ax, ay);
    let moveu = false;
    if (m > 0.08) {
      const nx = ax / Math.max(1, m), ny = ay / Math.max(1, m);
      const px = this.me.x + nx * SPEED * dt;
      const py = this.me.y + ny * SPEED * dt;
      if (walkable(this.map, px, this.me.y, RAIO)) this.me.x = px;
      if (walkable(this.map, this.me.x, py, RAIO)) this.me.y = py;
      if (Math.abs(nx) > 0.2) this.me.dir = nx > 0 ? 1 : -1;
      this.me.moving = true; this.me.anim += dt * 9;
      moveu = true;
      this.stepT -= dt;
      if (this.stepT <= 0) { A.playSfx('step'); this.stepT = PASSO_S; }
    } else {
      this.me.moving = false; this.me.anim += dt * 1.6;
    }

    /* ---- cômodo atual: avisa a engine (mesma ação "travel" de antes) ---- */
    const sala = roomAt(this.map, this.me.x, this.me.y);
    if (sala && sala.id !== this.me.room) {
      const anterior = this.me.room;
      this.me.room = sala.id;
      this.particles.seed(sala.id, sala.ambient);
      UI.setScene(sala.short || sala.name);
      UI.renderLocBar(st, this.g.meId, sala.id);
      A.playSfx('door');
      if (st?.players?.[this.g.meId]?.scene !== sala.id) {
        this.cenaPendente = sala.id;          // evita o estado puxar o jogador de volta
        this.cenaPendenteT = Date.now();
        this.g.net.action({ type: 'travel', scene: sala.id });
      }
      this.g.scene = sala.id;
      this.input.tap = null;
      void anterior;
    }

    /* ---- posição para os outros jogadores (10 Hz) ---- */
    this.sendT -= dt;
    if (this.sendT <= 0) {
      this.sendT = 0.1;
      this.g.net.action({ type: 'pos', x: Math.round(this.me.x), y: Math.round(this.me.y), room: this.me.room });
    }

    /* ---- NPCs ---- */
    const ctx = this.ctx();
    for (const n of this.npcs) n.update(dt, ctx);

    /* ---- outros jogadores (interpolação) ---- */
    for (const [id, o] of this.actors) {
      o.x += (o.tx - o.x) * Math.min(1, dt * 12);
      o.y += (o.ty - o.y) * Math.min(1, dt * 12);
      if (Math.hypot(o.tx - o.x, o.ty - o.y) > 1) o.anim += dt * 9; else o.anim += dt * 1.6;
      void id;
    }

    /* ---- objeto em alcance ---- */
    if (!this.balaoAberto) {
      const o = nearestObject(this.map, this.me.x, this.me.y, ALCANCE);
      this.foco = o;
      if (o) {
        const p = this.mundoParaTela(o.cx, o.cy - 30);
        this.btnInv.classList.remove('hidden');
        this.btnInv.style.left = Math.round(p.x) + 'px';
        this.btnInv.style.top = Math.round(p.y) + 'px';
      } else {
        this.btnInv.classList.add('hidden');
      }
    } else {
      this.btnInv.classList.add('hidden');
      if (this.ultimoObjeto) this.posicionarBalao(this.ultimoObjeto);
    }

    /* ---- assassinar, denunciar e fantasma ---- */
    this.atualizarAcoes(dt);

    /* ---- câmera ---- */
    const alvoX = this.me.x + (this.me.moving ? this.me.dir * 40 : 0);
    const alvoY = this.me.y + 30;
    this.cam.x += (alvoX - this.cam.x) * Math.min(1, dt * 6);
    this.cam.y += (alvoY - this.cam.y) * Math.min(1, dt * 6);
    const { vw, vh } = this.g;
    this.cam.zoom = Math.max(0.42, Math.min(1.15, Math.min(vw / 1150, vh / 780)));
    const meioW = vw / 2 / this.cam.zoom, meioH = vh / 2 / this.cam.zoom;
    const mapa = this.map;
    this.cam.x = Math.max(mapa.x + Math.min(meioW, mapa.w / 2), Math.min(mapa.x + mapa.w - Math.min(meioW, mapa.w / 2), this.cam.x));
    this.cam.y = Math.max(mapa.y + Math.min(meioH, mapa.h / 2), Math.min(mapa.y + mapa.h - Math.min(meioH, mapa.h / 2), this.cam.y));

    this.particles.update(dt);
    void moveu;
  }


  /* ------------------------------------------------- assassinato e corpos */
  /** clique em outro jogador vivo: um toque escolhe, dois armam o ataque */
  clicouEmAlguem(x, y) {
    const st = this.g?.state;
    if (!st || st.dead?.[this.g.meId]) return false;
    for (const [id, o] of this.actors) {
      if (id === this.g.meId) continue;
      if (st.dead?.[id]) continue;
      if (Math.hypot(o.x - x, o.y - y) < 46) {
        const agora = performance.now();
        const mesmo = this.alvo === id;
        this.alvo = id; this.alvoT = agora;
        if (mesmo && agora - (this.alvoTap || 0) < 900) this.armado = true;   // segundo toque: arma
        this.alvoTap = agora;
        return true;
      }
    }
    return false;
  }

  clicouEmCorpo(x, y) {
    const c = this.corpoPerto(x, y, 130);
    if (!c) return false;
    this.denunciar(c);
    return true;
  }

  corpoPerto(x, y, raio = 190) {
    const st = this.g?.state;
    if (!st) return null;
    let melhor = null, md = raio;
    for (const c of st.corpses || []) {
      if (c.found) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < md && c.room === this.me.room && this.verLinha(c.x, c.y)) { melhor = c; md = d; }
    }
    return melhor;
  }

  /** existe linha de visão entre mim e um ponto do mundo? */
  verLinha(x, y) {
    const d = Math.hypot(x - this.me.x, y - this.me.y);
    const n = Math.max(1, Math.ceil(d / 16));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (!walkable(this.map, this.me.x + (x - this.me.x) * t, this.me.y + (y - this.me.y) * t, 3)) return false;
    }
    return true;
  }

  alvoValido() {
    const st = this.g?.state;
    if (!st || !this.alvo) return null;
    if (st.secret?.role !== 'killer') return null;
    if (st.dead?.[this.g.meId] || st.dead?.[this.alvo]) return null;
    const o = this.actors.get(this.alvo);
    if (!o) return null;
    if (Math.hypot(o.x - this.me.x, o.y - this.me.y) > ALCANCE_MATA) return null;
    if (!this.verLinha(o.x, o.y)) return null;
    return this.alvo;
  }

  assassinar() {
    const st = this.g?.state;
    const alvo = this.alvoValido();
    if (!alvo || !st) { UI.toast('Chegue mais perto da sua vítima.', 'bad'); return; }
    if (Date.now() < (st.killReadyAt || 0)) { UI.toast('Aguarde o intervalo entre ataques.', 'bad'); return; }
    this.g.net.action({ type: 'kill', target: alvo });
    this.armado = false; this.alvo = null;
    if (this.btnKill) this.btnKill.classList.add('hidden');
  }

  denunciar(corpo) {
    const st = this.g?.state;
    const c = corpo || this.corpoPerto(this.me.x, this.me.y);
    if (!c || !st) { UI.toast('Nenhum corpo por perto.', 'bad'); return; }
    this.g.net.action({ type: 'report', corpseId: c.id });
  }

  sabotar() {
    const st = this.g?.state;
    if (!st) return;
    if (st.secret?.role !== 'killer') return;
    if (st.luz?.apagada) { UI.toast('A energia já está cortada.', ''); return; }
    if (Date.now() < (st.sabotagemAte || 0)) { UI.toast('Aguarde para sabotar de novo.', 'bad'); return; }
    this.g.net.action({ type: 'sabotage' });
  }

  convocarReuniao() {
    const st = this.g?.state;
    if (!st) return;
    if (st.dead?.[this.g.meId]) { UI.toast('Quem já saiu não convoca reunião.', 'bad'); return; }
    if (st.emergencyUsed?.[this.g.meId]) { UI.toast('Você já usou o botão de emergência.', 'bad'); return; }
    this.g.net.action({ type: 'meeting' });
  }

  /** a cada quadro: botões, fantasma e intervalo em dia */
  atualizarAcoes(dt) {
    const st = this.g?.state;
    if (!st) return;
    const eu = this.g.meId;
    const morto = !!st.dead?.[eu];

    if (morto !== this._fantasma) {
      this._fantasma = morto;
      if (this.ghostBar) this.ghostBar.classList.toggle('hidden', !morto);
      if (morto) {
        const causa = st.deathCause?.[eu];
        const nome = causa?.by ? st.players?.[causa.by]?.name : null;
        if (this.ghostNote) {
          const souAssassino = st.secret?.role === 'killer';
          this.ghostNote.innerHTML = souAssassino
            ? 'Sua identidade foi descoberta. Assista ao resto.'
            : (nome ? `Você viu quem fez isso: <b>${nome}</b>. E não pode contar a ninguém.`
                    : 'Pode observar, mas não fala, não vota e não denuncia.');
        }
      }
    }

    const corpo = morto ? null : this.corpoPerto(this.me.x, this.me.y);
    if (this.btnReport) this.btnReport.classList.toggle('hidden', !corpo);

    if (this.btnMeet) {
      // sozinho não há reunião: esconde o botão
      const muitaGente = Object.keys(st.players || {}).length > 1;
      const pode = !morto && muitaGente && !st.emergencyUsed?.[eu] && st.phase === 'playing';
      this.btnMeet.classList.toggle('hidden', !pode);
    }

    const souAssassino = st.secret?.role === 'killer';
    const alvo = this.alvoValido();
    if (!souAssassino || morto || !alvo || !this.armado || performance.now() - (this.alvoT || 0) > 5000) {
      if (this.btnKill) this.btnKill.classList.add('hidden');
    } else if (this.btnKill) {
      this.btnKill.classList.remove('hidden');
      const nome = st.players?.[alvo]?.name || 'alvo';
      const txt = this.btnKill.querySelector('.wa-txt');
      if (txt) txt.textContent = 'ASSASSINAR ' + nome.toUpperCase();
    }

    if (souAssassino && !morto && this.cdBadge) {
      const falta = Math.max(0, (st.killReadyAt || 0) - Date.now());
      if (falta > 300) {
        this.cdBadge.classList.remove('hidden');
        if (this.cdTxt) this.cdTxt.textContent = '🔪 AGUARDE ' + Math.ceil(falta / 1000) + 's';
      } else this.cdBadge.classList.add('hidden');
    } else if (this.cdBadge) this.cdBadge.classList.add('hidden');

    void dt;
  }

  /* -------------------------------------------------------------- render */
  render(dt) {
    const g = this.g, c = g.c;
    const { vw, vh, dpr } = g;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, vw, vh);
    c.fillStyle = '#07080a';
    c.fillRect(0, 0, vw, vh);

    c.save();
    c.translate(vw / 2, vh / 2);
    c.scale(this.cam.zoom, this.cam.zoom);
    c.translate(-this.cam.x, -this.cam.y);

    const vis = {
      x: this.cam.x - vw / 2 / this.cam.zoom - 80,
      y: this.cam.y - vh / 2 / this.cam.zoom - 80,
      w: vw / this.cam.zoom + 160,
      h: vh / this.cam.zoom + 160,
    };
    const visivel = (r) => r.x < vis.x + vis.w && r.x + r.w > vis.x && r.y < vis.y + vis.h && r.y + r.h > vis.y;

    // corredores (chão entre os cômodos)
    c.fillStyle = '#100d0a';
    c.fillRect(this.map.x, this.map.y, this.map.w, this.map.h);

    for (const r of this.map.rooms) {
      if (!visivel(r)) continue;
      this.desenharSala(c, r, vis);
    }
    for (const d of this.map.doors) this.desenharPorta(c, d);
    for (const o of this.map.objects) {
      if (!visivel(o)) continue;
      this.desenharObjeto(c, o);
    }
    this.particles.draw(c, this.t);

    // corpos (só para quem já os avistou)
    const stR = this.g.state;
    for (const corpo of stR?.corpses || []) {
      if (corpo.room && !visivel({ x: corpo.x - 60, y: corpo.y - 60, w: 120, h: 120 })) continue;
      this.desenharCorpo(c, corpo);
    }

    // atores: ordem por y para dar profundidade
    const gente = [];
    for (const n of this.npcs) if (visivel({ x: n.x - 60, y: n.y - 140, w: 120, h: 150 })) gente.push({ y: n.y, draw: () => n.draw(c, { t: this.t }) });
    for (const [id, o] of this.actors) {
      if (id === this.g.meId) continue;
      if (!visivel({ x: o.x - 60, y: o.y - 140, w: 120, h: 150 })) continue;
      gente.push({ y: o.y, draw: () => this.desenharJogador(c, o, id) });
    }
    gente.push({ y: this.me.y, draw: () => this.desenharEu(c) });
    gente.sort((a, b) => a.y - b.y);
    for (const p of gente) p.draw();

    c.restore();

    /* ---- luz (em coordenadas de tela) ---- */
    const stL = this.g.state;
    const apagada = !!stL?.luz?.apagada;
    const agora = Date.now();
    const minhaVela = (stL?.velaAte?.[this.g.meId] || 0) > agora;
    const luzes = [];
    const mp = this.mundoParaTela(this.me.x, this.me.y - 30);
    if (apagada) {
      // energia cortada: só o que a vela alcança
      luzes.push({
        x: mp.x, y: mp.y,
        r: (minhaVela ? 215 : 100) * this.cam.zoom,
        a: minhaVela ? 0.95 : 0.75, t: this.t, flicker: true,
      });
      for (const [id, o] of this.actors) {
        if ((stL?.velaAte?.[id] || 0) <= agora) continue;      // vela dos outros também ilumina
        const p = this.mundoParaTela(o.x, o.y - 30);
        luzes.push({ x: p.x, y: p.y, r: 205 * this.cam.zoom, a: 0.9, t: this.t, flicker: true });
      }
    } else {
      luzes.push({ x: mp.x, y: mp.y, r: 300 * this.cam.zoom, a: 0.85, t: this.t, flicker: true });
      for (const r of this.map.rooms) {
        if (!visivel(r)) continue;
        const p = this.mundoParaTela(r.cx, r.cy - 120);
        luzes.push({ x: p.x, y: p.y, r: Math.max(r.w, r.h) * 0.72 * this.cam.zoom, a: 0.5, t: this.t });
      }
    }
    drawLighting(c, g.lightCanvas, luzes, apagada ? 0.9 : 0.62 + this.dark * 0.3);
    drawFilmGrain(c, this.t, 0.035);
    void dt;
  }

  desenharSala(c, r, vis) {
    const amb = r.ambient;
    // chão
    c.fillStyle = amb.floor || '#26211b';
    c.fillRect(r.x, r.y, r.w, r.h);
    // textura de tábuas
    c.save();
    c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
    c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 2;
    for (let y = r.y; y < r.y + r.h; y += 46) { c.beginPath(); c.moveTo(r.x, y); c.lineTo(r.x + r.w, y); c.stroke(); }
    c.fillStyle = 'rgba(255,220,170,.03)';
    c.fillRect(r.x, r.y, r.w, r.h);
    // decoração do caso (desenhada no espaço 1280x720, reposicionada aqui)
    if (r.decor && Decor[r.decor]) {
      c.save();
      const s = Math.min(r.w / 1280, r.h / 720);
      c.translate(r.x + (r.w - 1280 * s) / 2, r.y + (r.h - 720 * s) / 2);
      c.scale(s, s);
      try { Decor[r.decor](c, { t: this.t, amb }); } catch { }
      c.restore();
    }
    c.restore();
    // tapete no meio
    c.fillStyle = 'rgba(90,40,30,.22)';
    rr(c, r.cx - r.w * 0.24, r.cy - r.h * 0.12, r.w * 0.48, r.h * 0.34, 14); c.fill();

    // paredes (4 lados; as portas são recortadas depois)
    c.fillStyle = amb.wall || '#3d342b';
    c.fillRect(r.x, r.y, r.w, WALL);                                  // norte
    c.fillRect(r.x, r.y + r.h - WALL, r.w, WALL);                     // sul
    c.fillRect(r.x, r.y, WALL, r.h);                                  // oeste
    c.fillRect(r.x + r.w - WALL, r.y, WALL, r.h);                     // leste
    // contorno interno
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 3;
    c.strokeRect(r.x + WALL, r.y + WALL, r.w - WALL * 2, r.h - WALL * 2);

    // nome do cômodo no chão
    c.save();
    c.globalAlpha = 0.16;
    c.fillStyle = '#e9e3d6';
    c.font = '600 34px ui-sans-serif, system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText((r.short || r.name || '').toUpperCase(), r.cx, r.cy + r.h * 0.30);
    c.restore();
    void vis;
  }

  desenharPorta(c, d) {
    // abre o vão: piso + batentes
    c.fillStyle = '#1c1712';
    c.fillRect(d.x - 6, d.y - 6, d.w + 12, d.h + 12);
    c.fillStyle = '#2a231c';
    c.fillRect(d.x, d.y, d.w, d.h);
    c.strokeStyle = 'rgba(255,200,140,.25)'; c.lineWidth = 3;
    c.strokeRect(d.x, d.y, d.w, d.h);
  }

  desenharObjeto(c, o) {
    const f = Props[o.prop];
    const destaque = this.foco && this.foco.id === o.id;
    if (destaque) glow(c, o.cx, o.cy, Math.max(o.w, o.h) * 0.8, 'rgba(255,190,120,.22)', 0.9);
    if (f) { try { f(c, o, { t: this.t }); return; } catch { } }
    // reserva: caixa genérica com o nome
    c.fillStyle = 'rgba(0,0,0,.45)';
    rr(c, o.x, o.y + o.h - 10, o.w, 14, 7); c.fill();
    c.fillStyle = '#3a3129';
    rr(c, o.x, o.y, o.w, o.h, 8); c.fill();
    c.strokeStyle = 'rgba(255,210,150,.35)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(233,227,214,.7)';
    c.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText(o.name || 'objeto', o.cx, o.y + o.h / 2);
  }

  desenharCorpo(c, corpo) {
    const x = corpo.x, y = corpo.y;
    c.save();
    // sombra no chão
    c.fillStyle = 'rgba(0,0,0,.45)';
    c.beginPath(); c.ellipse(x, y + 6, 30, 12, 0, 0, Math.PI * 2); c.fill();
    // silhueta caída
    c.translate(x, y);
    c.rotate(-0.22);
    c.fillStyle = 'rgba(18,18,20,.92)';
    c.beginPath(); c.ellipse(0, 0, 34, 13, 0, 0, Math.PI * 2); c.fill();
    // cabeça
    c.beginPath(); c.arc(-26, -4, 10, 0, Math.PI * 2); c.fill();
    // contorno do casaco (cor do jogador)
    c.strokeStyle = corpo.color || '#b3202a';
    c.lineWidth = 2.4; c.globalAlpha = 0.85;
    c.beginPath(); c.ellipse(0, 0, 34, 13, 0, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
    // mancha
    c.fillStyle = 'rgba(120,16,22,.55)';
    c.beginPath(); c.ellipse(14, 6, 22, 9, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    // nome (quem ainda não denunciou vê de longe)
    if (!corpo.found) {
      c.save();
      c.font = '700 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(255,255,255,.55)';
      c.fillText((corpo.name || '?').toUpperCase(), x, y - 26);
      c.restore();
    }
  }

  desenharEu(c) {
    const morto = !!this.g?.state?.dead?.[this.g.meId];
    if (morto) c.globalAlpha = 0.45;
    this._boneco(c, this.me.x, this.me.y, this.me.dir, this.me.anim, this.me.moving, '#c8b48a', '#2f3b46', true);
    // nome
    const p = this.g.state?.players?.[this.g.meId];
    if (p) {
      c.save();
      c.fillStyle = 'rgba(233,227,214,.85)';
      c.font = '700 15px ui-sans-serif, system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText(morto ? 'você (fantasma)' : 'você', this.me.x, this.me.y - 132);
      c.restore();
    }
    c.globalAlpha = 1;
  }

  desenharJogador(c, o, id) {
    const p = st?.players?.[id];
    const cor = p?.color || '#8fb8d8';
    const alvo = this.alvo === id && !morto;

    // anel no chão: marca quem está por perto / foi escolhido
    c.save();
    if (alvo) {
      c.strokeStyle = this.armado ? '#e0434f' : 'rgba(224,180,100,.85)';
      c.lineWidth = this.armado ? 3.5 : 2.5;
      const pulso = 1 + Math.sin(this.t * 6) * 0.06;
      c.beginPath(); c.ellipse(o.x, o.y, 26 * pulso, 11 * pulso, 0, 0, Math.PI * 2); c.stroke();
    }
    c.restore();

    if (morto) c.globalAlpha = 0.4;
    this._boneco(c, o.x, o.y, o.dir || 1, o.anim, true, cor, morto ? '#3a4149' : '#243040', false);
    if (p?.name) {
      c.save();
      c.fillStyle = morto ? 'rgba(160,160,160,.7)' : cor;
      c.font = '700 15px ui-sans-serif, system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText(morto ? p.name + ' †' : p.name, o.x, o.y - 132);
      c.restore();
    }
    c.globalAlpha = 1;
  }

  /** Silhueta noir com caminhada — reaproveita o estilo do jogo. */
  _boneco(c, fx, fy, dir, anim, andando, cor, casaco, eu) {
    const h = 116;
    const bob = andando ? Math.abs(Math.sin(anim)) * 4 : 0;
    const swing = andando ? Math.sin(anim) : 0;
    const hipY = fy - h * 0.46, shY = fy - h * 0.82, headY = fy - h * 0.93;

    c.save();
    c.fillStyle = 'rgba(0,0,0,.5)';
    c.beginPath(); c.ellipse(fx, fy + 4, 30, 9, 0, 0, Math.PI * 2); c.fill();
    if (eu) glow(c, fx, fy - h * 0.45, 110, 'rgba(255,200,140,.10)', 0.8);

    // pernas
    c.strokeStyle = '#1d1712'; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(fx - 3, hipY); c.lineTo(fx - 3 + swing * 16, fy - bob);
    c.moveTo(fx + 3, hipY); c.lineTo(fx + 3 - swing * 16, fy - (andando ? Math.abs(Math.cos(anim)) * 4 : 0));
    c.stroke();

    // tronco
    const grad = c.createLinearGradient(fx - 22, shY, fx + 22, hipY);
    grad.addColorStop(0, casaco); grad.addColorStop(1, '#141a20');
    c.fillStyle = grad;
    c.beginPath();
    c.moveTo(fx - 20, shY);
    c.quadraticCurveTo(fx - 30, hipY - 16, fx - 24, hipY + 8);
    c.lineTo(fx + 24, hipY + 8);
    c.quadraticCurveTo(fx + 30, hipY - 16, fx + 20, shY);
    c.quadraticCurveTo(fx, shY - 12, fx - 20, shY);
    c.fill();

    // braços
    c.strokeStyle = casaco; c.lineWidth = 9;
    c.beginPath();
    c.moveTo(fx - 14, shY + 10); c.lineTo(fx - 18 - swing * 11, hipY - 6);
    c.moveTo(fx + 14, shY + 10); c.lineTo(fx + 18 + swing * 11, hipY - 6);
    c.stroke();

    // cabeça
    c.fillStyle = '#c9a07a';
    c.beginPath(); c.arc(fx + dir * 2, headY, 13, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#241c17';
    c.beginPath(); c.arc(fx + dir * 2, headY - 5, 13, Math.PI, Math.PI * 2); c.fill();
    c.fillRect(fx + dir * 2 - 13, headY - 7, 26, 5);

    // luz de recorte
    c.strokeStyle = cor; c.lineWidth = 2.4; c.globalAlpha = 0.75;
    c.beginPath();
    c.moveTo(fx + dir * 18, shY + 4);
    c.quadraticCurveTo(fx + dir * 26, hipY - 10, fx + dir * 20, hipY + 6);
    c.stroke();
    c.restore();
  }

  /* --------------------------------------------------------------- rede */
  aplicarPos(id, x, y, room) {
    let o = this.actors.get(id);
    if (!o) { o = { x, y, tx: x, ty: y, anim: 0, dir: 1, room }; this.actors.set(id, o); }
    o.tx = x; o.ty = y; o.room = room;
    if (Math.abs(x - o.x) > 300 || Math.abs(y - o.y) > 300) { o.x = x; o.y = y; }
    if (x > o.x + 2) o.dir = 1; else if (x < o.x - 2) o.dir = -1;
  }

  /** Evento de pista vindo da engine: mostra o texto no balão. */
  onClue(id) {
    const cl = getClue(this.caso, id);
    if (cl?.text) this.mostrarResultado(cl.text);
  }

  mostrarJoystick(visivel) {
    this.joy.classList.toggle('hidden', !visivel);
  }
}
