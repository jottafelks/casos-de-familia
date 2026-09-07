/* =============================================================================
   CASOS DE FAMÍLIA — exploração da cena do crime.
   Reaproveita o motor de arte (canvas 2D), partículas, iluminação, câmera de
   cinema e o sistema de interação do projeto original.
   ========================================================================== */
import { W, H, Props, Decor, Particles, drawRoomShell, drawLighting, drawFilmGrain, glow, rr } from './art.js';
import { UI } from './ui.js';
import * as A from './audio.js';
import { getLocation, getClue, getWitness, currentCase } from '../shared/engine.js';

export class Game {
  constructor(canvas, net, hooks = {}) {
    this.c = canvas.getContext('2d');
    this.canvas = canvas;
    this.net = net;
    this.hooks = hooks;
    this.state = null;
    this.meId = null;
    this.scene = 'hall';
    this.particles = new Particles();
    this.hover = null;
    this.selected = null;
    this.pointer = { x: W / 2, y: H / 2, sx: 0, sy: 0, down: false, dragging: false, moved: 0 };
    this.cam = { x: W / 2, y: H / 2, zoom: 1, shake: 0, targetX: W / 2, targetY: H / 2, drift: 0 };
    this.t = 0; this.last = performance.now();
    this.lightCanvas = document.createElement('canvas');
    this.fade = 1;
    this.sceneTitle = null;
    this.cameraMove = true;
    this.ended = false;
    this._amActions = null;

    this._bindInput();
    window.addEventListener('resize', () => this.resize());
    /* Economia de bateria: nada de desenhar com a aba/ aplicativo em
       segundo plano, e limite de 30 qps em aparelhos que não aguentam 60. */
    this.paused = false; this.fpsCap = 0; this._acc = 0; this._frames = 0; this._slow = 0;
    document.addEventListener('visibilitychange', () => {
      const escondido = document.hidden;
      this.paused = escondido;
      if (!escondido) { this.last = performance.now(); if (!this._raf) requestAnimationFrame(() => this.loop()); }
    });
    this.resize();
    requestAnimationFrame(() => this.loop());
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.dpr = dpr; this.vw = r.width || 360; this.vh = r.height || 640;
    this.lightCanvas.width = this.canvas.width;
    this.lightCanvas.height = this.canvas.height;
  }

  CASE() { return currentCase(this.state || { caseId: 'mansao' }); }
  loc(id) { return getLocation(this.CASE(), id || this.scene); }

  /* ====================================================================== */
  attach(state, meId) {
    this.state = state;
    this.meId = meId;
    this.ended = false;
    const sc = state?.players?.[meId]?.scene || this.CASE().locations[0].id;
    if (sc !== this.scene) { this.scene = sc; this.particles.seed(sc, this.loc(sc).ambient); }
    this.syncHud();
  }

  syncHud() {
    if (!this.state) return;
    UI.setScene(this.loc().short || this.loc().name);
    UI.setClueCount(this.state.clues.length);
    UI.renderPlayersStrip(this.state, this.meId, this.net.playerId);
  }

  /** Saídas da cena: aceita tanto {to,x,y,w,h} quanto uma simples lista de
      ids — nesse caso as setas são posicionadas automaticamente. */
  navOf(L) {
    const slots = [
      { x: 0, y: 300, w: 90, h: 220 },
      { x: 1190, y: 300, w: 90, h: 220 },
      { x: 470, y: 40, w: 340, h: 110 },
      { x: 470, y: 610, w: 340, h: 110 }
    ];
    return (L?.nav || []).map((n, i) => {
      if (typeof n !== 'string') return n;
      const dest = this.CASE().locations.find(l => l.id === n);
      return { to: n, label: dest?.short || dest?.name || n, ...slots[i % slots.length] };
    });
  }

  loop() {
    if (this.paused) { this._raf = null; return; }
    this._raf = requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);

    /* amostragem: dois períodos ruins seguidos → trava em 30 qps */
    this._acc += dt; this._frames++;
    if (this._acc >= 2) {
      const fps = this._frames / this._acc;
      this._slow = fps < 40 ? this._slow + 1 : 0;
      if (this._slow >= 2) this.fpsCap = 30;
      this._acc = 0; this._frames = 0;
    }
    if (this.fpsCap && (now - (this._lastDraw || 0)) < (1000 / this.fpsCap) - 2) return;
    this._lastDraw = now;

    this.last = now;
    this.t += dt * 1000;

    if (this.state) {
      const left = this.net.timeLeft();
      const frac = this.net.fraction();
      UI.setTimer(left, frac);
      A.setTension(Math.pow(frac, 1.3));
      if (this.state.phase === 'playing') {
        try { this.update(dt, frac); this.render(dt, frac); }
        catch (err) { this.renderErrors = (this.renderErrors || 0) + 1; if (this.renderErrors <= 3) console.error('[render]', err); }
      }
    }
  }

  /* ------------------------------------------------------------ update */
  update(dt) {
    const st = this.state;
    const me = st.players[this.meId];
    if (me && me.scene !== this.scene) {
      const from = this.scene;
      this.scene = me.scene;
      const L = this.loc();
      this.particles.seed(this.scene, L.ambient);
      UI.setScene(L.short || L.name);
      UI.say('Você entrou: ' + L.name + '.');
      A.playSfx('door');
      this.fade = 1;
      const cameFromLeft = this.navOf(this.loc(from)).some(n => n.to === this.scene && n.x < W / 2);
      const spawn = L.spawn || { x: W / 2, y: 500 };
      this.cam.x = spawn.x + (cameFromLeft ? -300 : 300);
      this.cam.targetX = spawn.x;
      this.cam.y = this.cam.targetY = H / 2;
      this.focusZoom = false;
      this.sceneTitle = { text: L.name, t: 2.6 };
      UI.renderLocBar(this.state, this.meId, this.scene);
    }
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 2.2);
    if (this.sceneTitle) { this.sceneTitle.t -= dt; if (this.sceneTitle.t <= 0) this.sceneTitle = null; }

    this.cam.drift += dt;
    const s = this.scale();
    const visW = this.vw / s, visH = this.vh / s;
    const cxMin = visW >= W ? W - visW / 2 : visW / 2;
    const cxMax = visW >= W ? visW / 2 : W - visW / 2;
    const cyMin = visH >= H ? H - visH / 2 : visH / 2;
    const cyMax = visH >= H ? visH / 2 : H - visH / 2;

    if (visW < W) {
      const margin = Math.min(340, visW * 0.30);
      if (this.pointer.x < this.cam.x - margin) this.cam.targetX = this.pointer.x + margin;
      else if (this.pointer.x > this.cam.x + margin) this.cam.targetX = this.pointer.x - margin;
    } else this.cam.targetX = W / 2;

    const driftX = this.cameraMove ? Math.sin(this.cam.drift * 0.32) * 10 : 0;
    const driftY = this.cameraMove ? Math.sin(this.cam.drift * 0.21 + 1.3) * 6 : 0;
    this.cam.targetX = clamp(this.cam.targetX + driftX, cxMin + 8, cxMax - 8);
    this.cam.targetY = clamp(H / 2 + driftY + (this.focusY || 0), cyMin + 8, cyMax - 8);
    this.cam.x += (this.cam.targetX - this.cam.x) * Math.min(1, dt * 2.6);
    this.cam.y += (this.cam.targetY - this.cam.y) * Math.min(1, dt * 2.0);
    if (this.cam.shake > 0) this.cam.shake = Math.max(0, this.cam.shake - dt * 1.6);

    const focusing = UI.actionMenuOpen() || UI.modalOpen() || this.selected != null;
    const wantZoom = (focusing && this.focusZoom) ? 1.14 : 1;
    this.cam.zoom += (wantZoom - this.cam.zoom) * Math.min(1, dt * 2.4);
    if (!focusing) { this.focusZoom = false; this.focusY = 0; }

    this.particles.update(dt);
  }

  scale() {
    const cover = Math.max(this.vw / W, this.vh / H);
    return cover * this.baseZoom() * this.cam.zoom;
  }
  baseZoom() {
    const cover = Math.max(this.vw / W, this.vh / H) || 1;
    const visW = this.vw / cover;
    return Math.min(1, visW / (W * 0.46));
  }
  visRect() {
    const s = this.scale();
    return { x: this.cam.x - this.vw / (2 * s), y: this.cam.y - this.vh / (2 * s), w: this.vw / s, h: this.vh / s };
  }

  /* ------------------------------------------------------------ render */
  render(dt, frac) {
    const c = this.c;
    const st = this.state;
    const L = this.loc();
    const s = this.scale();
    const shakeX = this.cam.shake ? (Math.random() - 0.5) * 22 * this.cam.shake : 0;
    const shakeY = this.cam.shake ? (Math.random() - 0.5) * 22 * this.cam.shake : 0;

    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#050506'; c.fillRect(0, 0, this.vw, this.vh);

    c.save();
    c.translate(this.vw / 2 + shakeX, this.vh / 2 + shakeY);
    c.scale(s, s);
    c.translate(-this.cam.x, -this.cam.y);

    const env = { t: this.t, amb: L.ambient, flags: st.flags, shake: this.cam.shake };

    drawRoomShell(c, L.ambient, this.t, this.darkness(), this.visRect());
    const dec = Decor[L.decor || this.scene];
    if (dec) dec(c, env);

    const objs = this.visibleObjects().sort((a, b) => (a.y + a.h) - (b.y + b.h));
    for (const o of objs) {
      const fn = Props[o.prop];
      if (!fn) continue;
      const oenv = { ...env, open: !!st.opened[this.scene + ':' + o.id], objId: o.id, flags: st.flags };
      c.save(); fn(c, o, oenv); c.restore();
      if (this.hover === o) this.highlight(c, o);
    }

    // setas de saída
    for (const n of this.navOf(L)) {
      if (!this.unlocked(n.to)) continue;
      const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
      const pulse = 0.20 + Math.sin(this.t * 0.003) * 0.08;
      const right = n.x > W / 2;
      c.save();
      c.globalAlpha = pulse + (this.hover && this.hover.kind === 'nav' && this.hover.to === n.to ? 0.4 : 0);
      c.fillStyle = '#e0b464';
      c.beginPath();
      if (Math.abs(n.w) > Math.abs(n.h)) {
        const s2 = 16;
        c.moveTo(cx - s2 * (right ? 1 : -1), cy - s2);
        c.lineTo(cx + s2 * (right ? 1 : -1), cy);
        c.lineTo(cx - s2 * (right ? 1 : -1), cy + s2);
      } else {
        const s2 = 16, up = n.y < H / 2;
        c.moveTo(cx - s2, cy - s2 * (up ? 1 : -1));
        c.lineTo(cx, cy + s2 * (up ? 1 : -1));
        c.lineTo(cx + s2, cy - s2 * (up ? 1 : -1));
      }
      c.closePath(); c.fill();
      c.restore();
    }

    this.drawPlayers(c);
    this.particles.draw(c, this.t);
    c.restore();

    const lights = this.buildLights().map(l => ({
      ...l, t: this.t,
      x: (l.x - this.cam.x) * s + this.vw / 2,
      y: (l.y - this.cam.y) * s + this.vh / 2,
      r: l.r * s * (s > 1 ? 0.9 : 1)
    }));
    drawLighting(c, this.lightCanvas, lights, this.darkAlpha());

    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawFilmGrain(c, this.t, 0.03 + frac * 0.04);

    c.save();
    const vg = c.createRadialGradient(this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * (0.34 - frac * 0.08),
      this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${0.30 + frac * 0.32})`);
    c.fillStyle = vg; c.fillRect(0, 0, this.vw, this.vh);
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(58,52,44,${0.05 + 0.03 * (1 - frac)})`;
    c.fillRect(0, 0, this.vw, this.vh);
    c.globalCompositeOperation = 'source-over';
    c.restore();

    if (frac > 0.85) {
      const p = (Math.sin(this.t * 0.004) * 0.5 + 0.5) * (frac - 0.85) / 0.15;
      c.fillStyle = `rgba(140,12,14,${0.10 * p})`;
      c.fillRect(0, 0, this.vw, this.vh);
    }
    if (this.fade > 0) { c.fillStyle = `rgba(0,0,0,${this.fade})`; c.fillRect(0, 0, this.vw, this.vh); }
    if (this.sceneTitle) this.drawSceneTitle(c);
  }

  darkness() { return 0.22 + this.net.fraction() * 0.30; }
  darkAlpha() { return 0.30 + this.net.fraction() * 0.30; }

  buildLights() {
    const f = this.net.fraction();
    const base = 1 - f * 0.22;
    return [
      { x: W * 0.5, y: 120, r: 620, a: 0.95 * base, color: 'rgba(255,206,140,.34)', flicker: true },
      { x: this.pointer.x, y: this.pointer.y, r: 320, a: 0.55 * base, color: 'rgba(255,225,190,.14)' },
      { x: W * 0.18, y: 420, r: 340, a: 0.45 * base, color: 'rgba(150,190,255,.12)' }
    ];
  }

  drawPlayers(c) {
    const st = this.state;
    for (const p of Object.values(st.players)) {
      if (p.id === this.meId || p.scene !== this.scene) continue;
      const pos = this.playerPos(p);
      const bob = Math.sin(this.t * 0.002 + p.name.length) * 3;
      c.save();
      glow(c, pos.x, pos.y - 40, 60, hexA(p.color, 0.16), 0.8);
      c.fillStyle = hexA(p.color, 0.85);
      c.beginPath(); c.arc(pos.x, pos.y - 34 + bob, 5, 0, Math.PI * 2); c.fill();
      c.font = '700 12px Helvetica, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = hexA(p.color, 0.95);
      c.fillText(p.name.toUpperCase(), pos.x, pos.y - 48 + bob);
      c.restore();
    }
  }

  playerPos(p) {
    const spawn = this.loc()?.spawn || { x: 640, y: 520 };
    const idx = Object.keys(this.state.players).indexOf(p.id);
    return { x: spawn.x + (idx - 2) * 78, y: spawn.y };
  }

  highlight(c, o) {
    c.save();
    c.strokeStyle = 'rgba(224,180,100,.9)'; c.lineWidth = 2;
    c.setLineDash([7, 6]); c.lineDashOffset = -this.t * 0.02;
    rr(c, o.x - 6, o.y - 6, o.w + 12, o.h + 12, 5);
    c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(224,180,100,.07)'; c.fill();
    c.restore();
  }

  drawSceneTitle(c) {
    const t = this.sceneTitle;
    const a = t.t > 2.2 ? (2.6 - t.t) / 0.4 : Math.min(1, t.t / 0.6);
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, a));
    c.textAlign = 'center';
    c.fillStyle = '#f3ead6';
    c.font = '300 28px Georgia, serif';
    c.fillText(t.text.toUpperCase(), this.vw / 2, this.vh * 0.2);
    c.strokeStyle = 'rgba(224,180,100,.65)'; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(this.vw / 2 - 90, this.vh * 0.2 + 16);
    c.lineTo(this.vw / 2 + 90, this.vh * 0.2 + 16);
    c.stroke();
    c.restore();
  }

  /* ------------------------------------------------------------- input */
  unlocked(sceneId) {
    const L = this.loc(sceneId);
    if (!L) return false;
    return !L.unlockBy || !!this.state.flags[L.unlockBy];
  }

  toWorld(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const s = this.scale();
    return {
      x: this.cam.x + (clientX - r.left - this.vw / 2) / s,
      y: this.cam.y + (clientY - r.top - this.vh / 2) / s
    };
  }

  _bindInput() {
    const el = this.canvas;
    const move = (e) => {
      const src = e.touches ? e.touches[0] : e;
      if (!src) return;
      const p = this.toWorld(src.clientX, src.clientY);
      this.pointer.x = clamp(p.x, 0, W); this.pointer.y = clamp(p.y, 0, H);
      this.pointer.sx = src.clientX; this.pointer.sy = src.clientY;
      const hit = this.pick(this.pointer.x, this.pointer.y);
      this.hover = hit && hit.kind === 'obj' ? hit.o : (hit && hit.kind === 'nav' ? hit : null);
      UI.cursorLabel(this.hover && this.hover.kind === 'obj'
        ? { text: this.hover.name, x: src.clientX, y: src.clientY - 24 }
        : null);
    };
    el.addEventListener('mousemove', move);
    el.addEventListener('touchmove', (e) => { move(e); }, { passive: true });
    el.addEventListener('click', (e) => {
      const p = this.toWorld(e.clientX, e.clientY);
      this.pointer.x = p.x; this.pointer.y = p.y;
      this.click(p);
    });
    el.addEventListener('touchend', (e) => {
      const src = e.changedTouches && e.changedTouches[0];
      if (!src) return;
      const p = this.toWorld(src.clientX, src.clientY);
      if (Math.hypot(src.clientX - this.pointer.sx, src.clientY - this.pointer.sy) < 22) this.click(p);
    });
  }

  pick(x, y) {
    const L = this.loc();
    const list = (L.objects || []).slice().sort((a, b) => (a.w * a.h) - (b.w * b.h));
    for (const o of list) {
      const pad = 10;
      if (x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad) return { kind: 'obj', o };
    }
    for (const n of this.navOf(L)) {
      if (x > n.x && x < n.x + n.w && y > n.y && y < n.y + n.h && this.unlocked(n.to)) return { kind: 'nav', ...n };
    }
    return null;
  }

  visibleObjects() { return (this.loc().objects || []).filter(o => !this.state.taken?.[o.id]); }

  click(p) {
    if (!this.state || this.state.phase !== 'playing') return;
    const hit = this.pick(p.x, p.y);
    if (!hit) { UI.hideActionMenu(); return; }
    if (hit.kind === 'nav') { this.net.action({ type: 'travel', scene: hit.to }); A.playSfx('door'); return; }
    const o = hit.o;
    this.selected = o;
    this.focusZoom = true;
    this.cam.targetX = o.x + o.w / 2;
    this.focusY = clamp((o.y + o.h / 2) - H / 2, -120, 120) * 0.5;
    const acts = (o.actions || []).map(a => ({ ...a, disabled: false }));
    if (!acts.length) return;
    A.playSfx('click');
    this._amActions = acts;
    UI.showActionMenu(o, acts, (a) => this.doAction(a));
  }

  doAction(a) {
    A.playSfx('click');
    this.net.action({ type: 'interact', scene: this.scene, objId: this.selected.id, actionId: a.id });
  }

  /* ------------------------------------------------------------ eventos */
  onEvents(events) {
    for (const ev of events || []) {
      switch (ev.type) {
        case 'clue': {
          const cl = getClue(this.CASE(), ev.id);
          UI.say((cl && cl.text) || 'Nova evidência encontrada.', 6500);
          UI.toast('NOVA EVIDÊNCIA · ' + (ev.by || 'equipe'), 'good');
          A.playSfx('chime');
          break;
        }
        case 'dialogue':
          UI.say(ev.name ? ev.name + ': “' + ev.text + '”' : ev.text, 7000);
          break;
        case 'say': UI.say(ev.text, 5000); break;
        case 'sfx': A.playSfx(ev.id); break;
        case 'voted': UI.toast((ev.name || 'Alguém') + ' votou.', ''); break;
        case 'whisperOpen': break;
        case 'end': this.ended = true; this.hooks.onEnd?.(ev.result); break;
      }
    }
    this.syncHud();
  }

  /* -------- depuração / auto-teste (usado pelos testes e pelo preview) --- */
  clickObject(objId) {
    const o = (this.loc().objects || []).find(x => x.id === objId);
    if (!o) return false;
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    this.cam.x = this.cam.targetX = cx;
    this.cam.y = this.cam.targetY = cy;
    this.click({ x: cx, y: cy });
    return true;
  }
  pickAction(i) {
    const a = this._amActions && this._amActions[i];
    if (!a || a.disabled) return false;
    UI.hideActionMenu();
    this.doAction(a);
    return true;
  }
  travelTo(scene) { this.net.action({ type: 'travel', scene }); }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function hexA(hex, a) {
  try {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  } catch { return `rgba(255,255,255,${a})`; }
}
export { getWitness };
