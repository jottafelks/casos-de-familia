/* =============================================================================
   PERSONAGENS VIVOS — rotina, caminhada, ações, humor, reações e fala.
   Desenhados como silhuetas noir com luz de recorte (estilo cinematográfico).
   ========================================================================== */
import { W, H, glow } from './art.js';
import { CHARACTERS } from '../shared/content.js';

const FLOOR_Y = { hall: 560, biblioteca: 580, cozinha: 570, escritorio: 570, porao: 560 };

export class Actor {
  constructor(id) {
    this.def = CHARACTERS[id];
    this.id = id;
    this.scene = this.def.scene;
    this.x = 300 + Math.random() * 600;
    this.y = FLOOR_Y[this.scene] || 560;
    this.facing = 1;
    this.phase = Math.random() * 10;
    this.mood = 'calma';
    this.beat = 0;
    this.beatT = 0;
    this.act = 'idle';
    this.actT = 0;
    this.target = null;      // {scene, x}
    this.traveling = false;
    this.bubble = null;
    this.anim = 0;
    this.vx = 0;
    this.lastFlags = {};
    this.pauseT = 0;
    this.headTurn = 0;
    this.reactCooldown = 0;
  }

  /* ------------------------------------------------------------ update */
  update(dt, ctx) {
    const d = this.def;
    this.phase += dt;
    this.anim += dt * (this.mood === 'nervoso' ? 1.4 : this.mood === 'triste' ? 0.75 : 1);
    if (this.reactCooldown > 0) this.reactCooldown -= dt;
    if (this.bubble) { this.bubble.t -= dt; if (this.bubble.t <= 0) this.bubble = null; }
    if (this.pauseT > 0) { this.pauseT -= dt; }

    /* --- reações a descobertas da equipe (dirigidas por flags) --------- */
    for (const [flag, r] of Object.entries(d.reactions || {})) {
      if (ctx.flags[flag] && !this.lastFlags[flag]) {
        this.lastFlags[flag] = true;
        this.react(r, ctx);
      }
      if (!ctx.flags[flag]) this.lastFlags[flag] = false;
    }

    /* --- reações avulsas vindas do servidor --------------------------- */
    if (ctx.pendingReacts && ctx.pendingReacts.length) {
      for (const r of ctx.pendingReacts) {
        if (r.char === this.id) this.react({ line: r.line, mood: r.mood }, ctx);
      }
    }

    /* --- movimento ----------------------------------------------------- */
    if (this.target && this.pauseT <= 0) {
      const dir = Math.sign(this.target.x - this.x);
      if (Math.abs(this.target.x - this.x) > 6) {
        this.x += dir * this.speed() * dt;
        this.facing = dir || this.facing;
        this.act = 'walk'; this.vx = dir;
      } else {
        this.x = this.target.x;
        this.vx = 0;
        if (this.traveling && this.target.scene !== this.scene) {
          this.scene = this.target.scene;
          this.y = FLOOR_Y[this.scene] || 560;
          this.x = this.facing > 0 ? 30 : W - 30;
          this.traveling = false;
          this.target = { scene: this.scene, x: this.target.x };
        } else {
          this.target = null; this.traveling = false;
          this.act = this.pendingAct || 'idle';
          this.pendingAct = null;
        }
      }
    } else if (this.pauseT <= 0) {
      this.actT -= dt;
      this.vx = 0;
      if (this.actT <= 0) this.nextBeat(ctx);
      if (this.act === 'pace') {
        this.x += Math.sin(this.anim * 1.1) * 26 * dt;
        this.facing = Math.cos(this.anim * 1.1) > 0 ? 1 : -1;
        this.vx = Math.cos(this.anim * 1.1) * 0.4;
      }
      // olhar para jogadores próximos de vez em quando
      if (Math.random() < dt * 0.25 && ctx.nearbyPlayerX != null) {
        this.headTurn = Math.sign(ctx.nearbyPlayerX - this.x) * 0.5;
        setTimeout(() => { this.headTurn = 0; }, 1600);
      }
    }

    this.y = FLOOR_Y[this.scene] || this.y;
  }

  speed() {
    return this.mood === 'nervoso' ? 108 : this.mood === 'triste' ? 52 : 72;
  }

  nextBeat(ctx) {
    const routine = this.def.routine;
    const b = routine[this.beat % routine.length];
    this.beat++;
    if (b.scene !== this.scene) {
      // caminhar até a saída da cena atual, trocar de cena e ir até o ponto
      const nav = ctx.navOf(this.scene, b.scene);
      const doorX = nav ? nav.x + nav.w / 2 : (b.scene === 'cozinha' ? 60 : W - 60);
      this.target = { scene: b.scene, x: doorX };
      this.traveling = true;
      this.pendingAct = b.act;
      this.actT = (b.dur || 3000) / 1000;
      return;
    }
    if (b.x != null && Math.abs(b.x - this.x) > 30) {
      this.target = { scene: b.scene, x: b.x };
      this.pendingAct = b.act;
      this.actT = (b.dur || 3000) / 1000;
    } else {
      this.act = b.act || 'idle';
      this.actT = (b.dur || 3000) / 1000;
    }
  }

  react(r, ctx) {
    if (!r) return;
    if (r.line) this.say(r.line, 5.2);
    if (r.mood) { this.mood = r.mood; setTimeout(() => { if (this.mood === r.mood) this.mood = 'calma'; }, 22000); }
    if (r.moveTo) {
      this.scene = r.moveTo;
      this.y = FLOOR_Y[this.scene] || 560;
      if (r.x != null) { this.target = { scene: r.moveTo, x: r.x }; }
      this.act = 'walk';
      this.actT = 6;
    }
    this.pauseT = 1.2;
  }

  say(text, dur = 4) { this.bubble = { text, t: dur, max: dur }; }

  /* -------------------------------------------------------------- draw */
  draw(c, env) {
    const d = this.def;
    const h = 116 * (d.height || 1);
    const walking = this.act === 'walk' || Math.abs(this.vx) > 0.05;
    const t = this.anim;
    const breath = Math.sin(t * (this.mood === 'nervoso' ? 3.4 : 1.8)) * 1.6 * (walking ? 0.3 : 1);
    const bob = walking ? Math.abs(Math.sin(t * 7.5)) * 4 : 0;

    const fx = this.x, fy = this.y;             // pés
    const hipY = fy - h * 0.46;
    const shY = fy - h * 0.82 + breath;
    const headY = fy - h * 0.93 + breath;

    c.save();
    // sombra
    c.fillStyle = 'rgba(0,0,0,.5)';
    c.beginPath(); c.ellipse(fx, fy + 4, 30, 9, 0, 0, Math.PI * 2); c.fill();
    // brilho no chão (luz de recorte)
    glow(c, fx, fy - h * 0.4, 90, 'rgba(255,190,120,.07)', 0.6);

    const f = this.facing;
    const swing = walking ? Math.sin(t * 7.5) : 0;
    const legSwing = swing * 16;
    const armSwing = swing * 11;

    const coat = d.coat, skin = '#c9a07a', rim = d.color;

    /* ---------------- pernas ---------------- */
    c.strokeStyle = shadeOf(coat, -0.12); c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(fx - 3, hipY); c.lineTo(fx - 3 + legSwing, fy - bob);
    c.moveTo(fx + 3, hipY); c.lineTo(fx + 3 - legSwing, fy - (walking ? Math.abs(Math.cos(t * 7.5)) * 4 : 0));
    c.stroke();

    /* ---------------- tronco (casaco) ---------------- */
    let lean = 0;
    if (this.act === 'examine') lean = 0.22 * f;
    if (this.act === 'look') lean = -0.06 * f;
    if (this.act === 'sit') lean = 0;
    c.save();
    c.translate(fx, hipY + bob * 0.2);
    c.rotate(lean * 0.4);
    c.translate(-fx, -(hipY + bob * 0.2));

    const bodyGrad = c.createLinearGradient(fx - 22, shY, fx + 22, hipY);
    bodyGrad.addColorStop(0, shadeOf(coat, 0.10));
    bodyGrad.addColorStop(0.55, coat);
    bodyGrad.addColorStop(1, shadeOf(coat, -0.18));
    c.fillStyle = bodyGrad;
    c.beginPath();
    c.moveTo(fx - 20, shY);
    c.quadraticCurveTo(fx - 30, hipY - 16, fx - 24, hipY + 8);
    c.lineTo(fx + 24, hipY + 8);
    c.quadraticCurveTo(fx + 30, hipY - 16, fx + 20, shY);
    c.quadraticCurveTo(fx, shY - 12, fx - 20, shY);
    c.fill();

    // gola / ombro iluminado
    c.fillStyle = shadeOf(coat, 0.22);
    c.beginPath();
    c.moveTo(fx - 14, shY - 2); c.quadraticCurveTo(fx, shY - 16, fx + 14, shY - 2);
    c.quadraticCurveTo(fx, shY + 8, fx - 14, shY - 2); c.fill();

    // luz de recorte no ombro voltado para a luz
    c.strokeStyle = rim; c.globalAlpha = 0.5; c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(fx - 19 * (f > 0 ? 1 : -1), shY + 2);
    c.quadraticCurveTo(fx - 27 * (f > 0 ? 1 : -1), hipY - 14, fx - 22 * (f > 0 ? 1 : -1), hipY + 6);
    c.stroke();
    c.globalAlpha = 1;

    // braços
    c.strokeStyle = shadeOf(coat, -0.05); c.lineWidth = 9;
    let armY = shY + 14;
    if (this.act === 'examine') {
      c.beginPath();
      c.moveTo(fx - 14, armY); c.lineTo(fx + 26 * f, armY + 16);
      c.moveTo(fx + 14, armY); c.lineTo(fx + 30 * f, armY + 12);
      c.stroke();
    } else if (this.act === 'wipe') {
      const w = Math.sin(t * 4) * 18;
      c.beginPath();
      c.moveTo(fx - 14, armY); c.lineTo(fx + 10 * f, armY + 20);
      c.moveTo(fx + 14, armY); c.lineTo(fx + (26 + w) * f, armY + 16);
      c.stroke();
    } else {
      c.beginPath();
      c.moveTo(fx - 15, armY); c.lineTo(fx - 12 + armSwing, armY + 34);
      c.moveTo(fx + 15, armY); c.lineTo(fx + 12 - armSwing, armY + 34);
      c.stroke();
    }
    c.restore();

    /* ---------------- cabeça ---------------- */
    const hx = fx + (this.act === 'look' ? 4 * f : 0) + this.headTurn * 6;
    c.fillStyle = skin;
    c.beginPath(); c.ellipse(hx, headY, 13, 15, 0, 0, Math.PI * 2); c.fill();
    // cabelo
    c.fillStyle = d.hair;
    c.beginPath();
    c.arc(hx, headY - 2, 14, Math.PI * 1.05, Math.PI * 1.95);
    c.lineTo(hx + 13, headY + 2); c.lineTo(hx - 13, headY + 2);
    c.closePath(); c.fill();
    // olhos
    const blink = (Math.sin(t * 1.7) > 0.985) ? 0.15 : 1;
    c.fillStyle = 'rgba(20,18,16,.9)';
    c.beginPath();
    c.ellipse(hx - 4 + 2 * f, headY + 1, 1.6, 2.1 * blink, 0, 0, Math.PI * 2);
    c.ellipse(hx + 4 + 2 * f, headY + 1, 1.6, 2.1 * blink, 0, 0, Math.PI * 2);
    c.fill();
    // luz de recorte na cabeça
    c.strokeStyle = rim; c.globalAlpha = 0.45; c.lineWidth = 1.8;
    c.beginPath(); c.arc(hx, headY, 13.5, Math.PI * 1.15, Math.PI * 1.75); c.stroke();
    c.globalAlpha = 1;

    /* ---------------- acessórios ---------------- */
    switch (d.accessory) {
      case 'brooch':
        c.fillStyle = '#7ee0d0';
        c.beginPath(); c.arc(fx + 10 * f, shY + 22, 3, 0, Math.PI * 2); c.fill();
        glow(c, fx + 10 * f, shY + 22, 16, 'rgba(126,224,208,.45)', 0.7);
        break;
      case 'tie':
        c.fillStyle = '#8a2f2a';
        c.beginPath();
        c.moveTo(fx + 2 * f, shY + 6); c.lineTo(fx - 3 * f + 6, shY + 30); c.lineTo(fx + 8 * f, shY + 30);
        c.closePath(); c.fill();
        break;
      case 'camera':
        c.fillStyle = '#22212b';
        c.fillRect(fx + (this.act === 'examine' ? 20 : 14) * f - 9, shY + 20, 18, 13);
        c.fillStyle = '#111';
        c.beginPath(); c.arc(fx + 14 * f, shY + 26, 4, 0, Math.PI * 2); c.fill();
        break;
      case 'apron':
        c.fillStyle = 'rgba(220,215,200,.85)';
        c.beginPath();
        c.moveTo(fx - 13, shY + 12); c.lineTo(fx + 13, shY + 12);
        c.lineTo(fx + 17, hipY + 4); c.lineTo(fx - 17, hipY + 4);
        c.closePath(); c.fill();
        break;
      case 'boots':
        c.fillStyle = '#1a1512';
        c.fillRect(fx - 12, fy - 12, 11, 12); c.fillRect(fx + 2, fy - 12, 11, 12);
        break;
    }

    /* ---------------- humor (indicador sutil) ---------------- */
    if (this.mood === 'nervoso' || this.mood === 'irritado') {
      const a = 0.25 + Math.abs(Math.sin(t * 3)) * 0.35;
      c.fillStyle = this.mood === 'irritado' ? `rgba(200,60,50,${a * 0.35})` : `rgba(255,190,90,${a * 0.28})`;
      c.beginPath(); c.arc(hx, headY - 22, 5 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2); c.fill();
    }
    c.restore();

    /* ---------------- balão de fala ---------------- */
    if (this.bubble) this.drawBubble(c, env);
  }

  drawBubble(c, env) {
    const b = this.bubble;
    const alpha = Math.min(1, b.t * 2.5);
    const h = 116 * (this.def.height || 1);
    const bx = this.x, by = this.y - h - 26;
    c.save();
    c.globalAlpha = alpha;
    c.font = '14px Georgia, serif';
    const maxW = 300;
    const words = b.text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (c.measureText(test).width > maxW - 24 && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    const wBox = Math.min(maxW, Math.max(...lines.map(l => c.measureText(l).width)) + 26);
    const hBox = lines.length * 20 + 18;
    let x = bx - wBox / 2;
    x = Math.max(20, Math.min(W - wBox - 20, x));
    const y = by - hBox;

    c.fillStyle = 'rgba(12,13,15,.94)';
    c.strokeStyle = 'rgba(224,180,100,.55)'; c.lineWidth = 1.4;
    roundRectPath(c, x, y, wBox, hBox, 6); c.fill(); c.stroke();
    c.beginPath();
    c.moveTo(bx - 7, y + hBox); c.lineTo(bx + 7, y + hBox); c.lineTo(bx, y + hBox + 12);
    c.fillStyle = 'rgba(12,13,15,.94)'; c.fill();

    c.fillStyle = '#f0e8d8';
    c.textAlign = 'left';
    lines.forEach((l, i) => c.fillText(l, x + 13, y + 24 + i * 20));
    // nome
    c.font = 'bold 9px sans-serif';
    c.fillStyle = this.def.color;
    c.fillText(this.def.name.toUpperCase(), x + 13, y + 13);
    c.restore();
  }

  hit(px, py) {
    const h = 116 * (this.def.height || 1);
    return px > this.x - 34 && px < this.x + 34 && py > this.y - h - 16 && py < this.y + 12;
  }
}

function roundRectPath(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function shadeOf(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + 255 * amt)));
  g = Math.max(0, Math.min(255, Math.round(g + 255 * amt)));
  b = Math.max(0, Math.min(255, Math.round(b + 255 * amt)));
  return `rgb(${r},${g},${b})`;
}

/* -------------------------------------------------------------------------- */
export class Cast {
  constructor() {
    this.actors = Object.keys(CHARACTERS).map(id => new Actor(id));
  }
  get(sceneId) { return this.actors.filter(a => a.scene === sceneId); }
  update(dt, ctx) {
    for (const a of this.actors) {
      const nearby = ctx.playersInScene(a.scene)[0];
      a.update(dt, {
        flags: ctx.flags,
        navOf: ctx.navOf,
        nearbyPlayerX: nearby,
        pendingReacts: ctx.takeReacts(a.id)
      });
    }
  }
  draw(c, sceneId, env) {
    for (const a of this.actors) {
      if (a.scene !== sceneId) continue;
      a.draw(c, env);
    }
  }
  pick(sceneId, x, y) {
    const list = this.get(sceneId).sort((a, b) => b.y - a.y);
    for (const a of list) if (a.hit(x, y)) return a;
    return null;
  }
  sayRandom(sceneId, text) {
    const list = this.get(sceneId);
    if (list.length) list[Math.floor(Math.random() * list.length)].say(text, 4.5);
  }
  allSay(text, dur = 4) { this.actors.forEach(a => a.say(text, dur)); }
}
