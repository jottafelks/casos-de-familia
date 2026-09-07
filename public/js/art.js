/* =============================================================================
   ARTE — tudo desenhado em Canvas 2D, sem assets externos.
   Estilo: noir cinematográfico. Silhuetas, luz de recorte, sombras longas.
   ========================================================================== */

export const W = 1280, H = 720;

/* ---------------------------------------------------------------- helpers */
export function rr(c, x, y, w, h, r = 4) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}
export function lg(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  return g;
}
export function rg(c, x, y, r0, r1, stops) {
  const g = c.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  return g;
}
export function shadow(c, x, y, w, h, a = 0.45) {
  c.save();
  c.fillStyle = rg(c, x, y + h * 0.1, 0, Math.max(w, h) * 0.6, [[0, `rgba(0,0,0,${a})`], [1, 'rgba(0,0,0,0)']]);
  c.beginPath(); c.ellipse(x, y, w * 0.6, h * 0.22, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}
export function glow(c, x, y, r, color, a = 0.5) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = rg(c, x, y, 0, r, [[0, color], [1, 'rgba(0,0,0,0)']]);
  c.globalAlpha = a;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.restore();
}
export function stroke(c, color, w = 1) { c.strokeStyle = color; c.lineWidth = w; c.stroke(); }
export function woodGrain(c, x, y, w, h, base, dark, lines = 7) {
  c.save();
  c.fillStyle = base; c.fillRect(x, y, w, h);
  c.strokeStyle = dark; c.lineWidth = 1; c.globalAlpha = 0.5;
  for (let i = 1; i < lines; i++) {
    const yy = y + (h / lines) * i + Math.sin(i * 2.3) * 2;
    c.beginPath(); c.moveTo(x + 2, yy);
    c.bezierCurveTo(x + w * 0.3, yy + 2, x + w * 0.7, yy - 2, x + w - 2, yy + 1);
    c.stroke();
  }
  c.restore();
}
export function bricks(c, x, y, w, h, c1, c2, size = 34) {
  c.save();
  c.fillStyle = c1; c.fillRect(x, y, w, h);
  c.strokeStyle = c2; c.lineWidth = 1.4; c.globalAlpha = 0.55;
  for (let r = 0, yy = y; yy < y + h; yy += size, r++) {
    c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke();
    for (let xx = x + (r % 2 ? -size / 2 : 0); xx < x + w; xx += size) {
      c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + size); c.stroke();
    }
  }
  c.restore();
}
export function noiseDots(c, x, y, w, h, n, color, a = 0.06) {
  c.save(); c.globalAlpha = a; c.fillStyle = color;
  for (let i = 0; i < n; i++) {
    c.fillRect(x + Math.random() * w, y + Math.random() * h, 1.4, 1.4);
  }
  c.restore();
}

/* =========================================================================
   CASCA DA SALA (paredes, piso, rodapé, teto)
   ========================================================================== */
export function drawRoomShell(c, amb, t, dark = 0, vr = null) {
  const horizon = 430;
  // rect visível do mundo (permite telas altas/estreitas sem cortar a sala)
  const V = vr || { x: 0, y: 0, w: W, h: H };
  const x0 = V.x - 4, x1 = V.x + V.w + 4, y0 = V.y - 4, y1 = V.y + V.h + 4;

  // teto (acima do mundo quando a tela é mais alta)
  if (y0 < horizon) {
    c.fillStyle = lg(c, 0, Math.min(y0, -160), 0, horizon,
      [[0, '#08080a'], [0.7, shade(amb.wall, -0.30)], [1, shade(amb.wall, -0.06)]]);
    c.fillRect(x0, y0, x1 - x0, horizon - y0);
  }

  // parede
  c.fillStyle = lg(c, 0, 0, 0, horizon, [[0, shade(amb.wall, -0.42)], [0.62, amb.wall], [1, shade(amb.wall, -0.34)]]);
  c.fillRect(x0, Math.max(y0, 0), x1 - x0, horizon - Math.max(y0, 0));
  c.save(); c.globalAlpha = 0.05; c.strokeStyle = '#000'; c.lineWidth = 2;
  for (let x = Math.floor(x0 / 64) * 64; x < x1; x += 64) {
    c.beginPath(); c.moveTo(x, Math.max(y0, 0)); c.lineTo(x, horizon); c.stroke();
  }
  c.restore();
  noiseDots(c, x0, Math.max(y0, 0), x1 - x0, horizon - Math.max(y0, 0), 420, '#fff', 0.02);

  // rodapé / boiserie
  c.fillStyle = shade(amb.wall, -0.55); c.fillRect(x0, horizon - 54, x1 - x0, 54);
  c.fillStyle = shade(amb.wall, 0.12); c.fillRect(x0, horizon - 58, x1 - x0, 5);
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x0, horizon - 6, x1 - x0, 6);

  // piso em perspectiva (estende-se até o fim da tela)
  c.fillStyle = lg(c, 0, horizon, 0, Math.max(y1, H), [[0, shade(amb.floor, 0.26)], [1, '#050506']]);
  c.fillRect(x0, horizon, x1 - x0, y1 - horizon);
  c.save(); c.globalAlpha = 0.32; c.strokeStyle = shade(amb.floor, 0.5); c.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const p = i / 20, y = horizon + Math.pow(p, 1.7) * (Math.max(y1, H) - horizon);
    if (y > y1) break;
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
  }
  for (let i = -10; i <= 10; i++) {
    c.beginPath();
    c.moveTo(W / 2 + i * 26, horizon);
    c.lineTo(W / 2 + i * 210, Math.max(y1, H) + 200);
    c.stroke();
  }
  c.restore();

  // brilho ambiente do teto
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = rg(c, W / 2, 60, 40, W * 0.62, [[0, `rgba(120,104,80,${0.16 - dark * 0.06})`], [1, 'rgba(0,0,0,0)']]);
  c.fillRect(x0, y0, x1 - x0, Math.max(horizon + 60 - y0, 10));
  c.restore();
}
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + 255 * amt)));
  g = Math.max(0, Math.min(255, Math.round(g + 255 * amt)));
  b = Math.max(0, Math.min(255, Math.round(b + 255 * amt)));
  return `rgb(${r},${g},${b})`;
}

/* =========================================================================
   JANELA COM CHUVA (decorativo)
   ========================================================================== */
export function drawWindow(c, x, y, w, h, t, lit = 0.25) {
  c.save();
  c.fillStyle = '#0a0d12'; c.fillRect(x, y, w, h);
  // céu de tempestade
  c.fillStyle = lg(c, x, y, x, y + h, [[0, '#141b26'], [1, '#080a0e']]);
  c.fillRect(x + 4, y + 4, w - 8, h - 8);
  // clarão de relâmpago ocasional
  const bolt = Math.max(0, Math.sin(t * 0.00042) - 0.985) * 12;
  if (bolt > 0) {
    c.fillStyle = `rgba(180,205,255,${Math.min(0.5, bolt * 3)})`;
    c.fillRect(x + 4, y + 4, w - 8, h - 8);
  }
  // chuva
  c.strokeStyle = 'rgba(180,205,255,.35)'; c.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const rx = x + 6 + ((i * 47 + t * 0.22) % (w - 12));
    const ry = y + 6 + ((i * 31 + t * 0.55) % (h - 12));
    c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 3, ry + 11); c.stroke();
  }
  // moldura
  c.strokeStyle = '#2b241c'; c.lineWidth = 10; c.strokeRect(x, y, w, h);
  c.strokeStyle = '#1a1611'; c.lineWidth = 4;
  c.beginPath();
  c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h);
  c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2);
  c.stroke();
  // brilho no vidro
  c.globalAlpha = 0.06; c.fillStyle = '#cfe8ff';
  c.beginPath(); c.moveTo(x + w * 0.1, y + h); c.lineTo(x + w * 0.55, y); c.lineTo(x + w * 0.8, y); c.lineTo(x + w * 0.3, y + h); c.fill();
  c.restore();
}

/* =========================================================================
   PROPS — um desenho por tipo de objeto interativo
   Assinatura: (c, o, env) onde o = {x,y,w,h} e env = {t, amb, open, flags, state}
   ========================================================================== */
export const Props = {
  /* ---------------------------------------------------------- HALL */
  clock(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w, 24, 0.55);
    woodGrain(c, x, y, w, h, '#3a2416', '#22130a', 12);
    c.fillStyle = '#150c06'; c.fillRect(x + 6, y + 6, w - 12, h - 12);
    // mostrador
    const cx = x + w / 2, cy = y + 46, r = w * 0.36;
    c.fillStyle = '#e8dcc0'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#7a5a2c'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = '#3a2b16';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.lineWidth = i % 3 === 0 ? 3 : 1.5;
      c.beginPath();
      c.moveTo(cx + Math.sin(a) * (r - 7), cy - Math.cos(a) * (r - 7));
      c.lineTo(cx + Math.sin(a) * (r - 2), cy - Math.cos(a) * (r - 2));
      c.stroke();
    }
    // ponteiros parados em 23:47
    const ah = (23 % 12) / 12 * Math.PI * 2, am = 47 / 60 * Math.PI * 2;
    c.strokeStyle = '#1d150c'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(ah) * r * 0.5, cy - Math.cos(ah) * r * 0.5); c.stroke();
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(am) * r * 0.78, cy - Math.cos(am) * r * 0.78); c.stroke();
    c.lineCap = 'butt';
    // porta de vidro
    const open = e.open;
    c.fillStyle = 'rgba(0,0,0,.55)';
    if (open) { c.fillRect(x + 12, y + r + 62, w - 24, h - r - 74); c.fillStyle = '#0b0705'; c.fillRect(x + 14, y + r + 64, w - 28, h - r - 78); }
    else { c.fillRect(x + 14, y + r + 62, w - 28, h - r - 78); }
    c.strokeStyle = '#5a3a1c'; c.lineWidth = 3; c.strokeRect(x + 12, y + r + 62, w - 24, h - r - 74);
    // pêndulo
    const sw = Math.sin(e.t * 0.0016) * (open ? 0 : 16);
    c.strokeStyle = '#8a6a2f'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, y + r + 62); c.lineTo(cx + sw, y + h - 54); c.stroke();
    c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(cx + sw, y + h - 48, 13, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7a5a2c'; c.beginPath(); c.arc(cx + sw, y + h - 48, 5, 0, Math.PI * 2); c.fill();
    if (open) { // bilhete dentro
      c.save(); c.translate(cx + 8, y + r + 96); c.rotate(-0.15);
      c.fillStyle = '#efe6d0'; c.fillRect(-16, -12, 32, 24);
      c.strokeStyle = '#b9a97e'; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-11, -5 + i * 6); c.lineTo(11, -5 + i * 6); c.stroke(); }
      c.restore();
    }
  },

  painting(c, o, e) {
    const { x, y, w, h } = o;
    if (e.open) { // deslocado
      c.save(); c.translate(-34, 0); Props._frame(c, o, e, true); c.restore();
      // marca na parede + tijolo solto
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x + 2, y + 4, w - 6, h - 8);
      bricks(c, x + 12, y + 26, 70, 52, '#4a3a30', '#241b15', 26);
      if (!e.flags.tijolo_removido) {
        c.fillStyle = '#5c483a'; c.fillRect(x + 14, y + 28, 30, 22);
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 14, y + 44, 30, 6);
      } else {
        c.fillStyle = '#0a0806'; c.fillRect(x + 14, y + 28, 30, 22);
      }
      glow(c, x + 30, y + 40, 26, 'rgba(255,180,100,.18)', 0.5);
      return;
    }
    Props._frame(c, o, e, false);
  },
  _frame(c, o, e, shifted) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w, 18, 0.5);
    c.fillStyle = '#6b4c22'; c.fillRect(x - 5, y - 5, w + 10, h + 10);
    c.fillStyle = '#3d2a12'; c.fillRect(x, y, w, h);
    // retrato: silhueta feminina
    c.save();
    c.beginPath(); c.rect(x + 3, y + 3, w - 6, h - 6); c.clip();
    c.fillStyle = lg(c, x, y, x, y + h, [[0, '#2d2a2a'], [1, '#141213']]);
    c.fillRect(x + 3, y + 3, w - 6, h - 6);
    glow(c, x + w / 2, y + h * 0.32, w * 0.5, 'rgba(255,190,120,.20)', 0.7);
    c.fillStyle = '#0d0c0d';
    c.beginPath(); c.ellipse(x + w / 2, y + h * 0.30, w * 0.15, h * 0.19, 0, 0, Math.PI * 2); c.fill(); // cabeça
    c.beginPath();
    c.moveTo(x + w * 0.20, y + h);
    c.quadraticCurveTo(x + w * 0.28, y + h * 0.52, x + w * 0.5, y + h * 0.50);
    c.quadraticCurveTo(x + w * 0.72, y + h * 0.52, x + w * 0.80, y + h);
    c.fill(); // ombros
    // olhos riscados
    c.strokeStyle = '#e8e0cf'; c.lineWidth = 2.4; c.globalAlpha = 0.85;
    c.beginPath();
    c.moveTo(x + w * 0.40, y + h * 0.26); c.lineTo(x + w * 0.48, y + h * 0.32);
    c.moveTo(x + w * 0.60, y + h * 0.26); c.lineTo(x + w * 0.52, y + h * 0.32);
    c.moveTo(x + w * 0.40, y + h * 0.30); c.lineTo(x + w * 0.48, y + h * 0.24);
    c.stroke();
    c.restore();
    c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
  },
  painting_dark(c, o, e) {
    const { x, y, w, h } = o;
    c.save();
    c.translate(x + w / 2, y + h / 2);
    c.rotate(e.flags?.quadro_esc_visto ? 0 : 0.09);
    c.translate(-w / 2, -h / 2);
    c.fillStyle = '#4a3418'; c.fillRect(-4, -4, w + 8, h + 8);
    c.fillStyle = lg(c, 0, 0, w, h, [[0, '#24303a'], [1, '#11161a']]);
    c.fillRect(0, 0, w, h);
    // paisagem sombria
    c.fillStyle = '#0b0f13'; c.fillRect(0, h * 0.62, w, h * 0.38);
    c.fillStyle = '#1a232b';
    c.beginPath(); c.moveTo(0, h * 0.62);
    for (let i = 0; i <= 6; i++) c.lineTo((w / 6) * i, h * (0.42 + 0.2 * Math.sin(i * 1.7)));
    c.lineTo(w, h); c.lineTo(0, h); c.fill();
    glow(c, w * 0.7, h * 0.28, 34, 'rgba(220,235,255,.16)', 0.6);
    c.restore();
  },

  console(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.9, 22, 0.5);
    woodGrain(c, x, y + 20, w, h - 20, '#2f1f13', '#180e07', 9);
    c.fillStyle = '#3d2818'; c.fillRect(x - 6, y, w + 12, 24);
    c.fillStyle = 'rgba(255,220,160,.10)'; c.fillRect(x - 6, y, w + 12, 4);
    c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x, y + h - 8, w, 8);
  },
  drawer_console(c, o, e) {
    const { x, y, w, h } = o;
    const out = e.open ? 16 : 0;
    c.save();
    c.fillStyle = '#241708'; c.fillRect(x - 2, y - 2, w + 4, h + 4);
    c.fillStyle = '#3a2716'; c.fillRect(x, y + out, w, h);
    c.fillStyle = 'rgba(255,220,160,.09)'; c.fillRect(x, y + out, w, 3);
    c.fillStyle = '#c9a24a';
    c.beginPath(); c.roundRect(x + w / 2 - 22, y + out + h / 2 - 4, 44, 8, 4); c.fill();
    if (e.open) {
      c.fillStyle = '#0a0705'; c.fillRect(x + 4, y + out - 8, w - 8, 12);
      if (e.objId === 'gaveta_recepcao') {
        c.fillStyle = '#c8c2b4'; c.beginPath(); c.roundRect(x + 16, y + out - 14, 34, 12, 2); c.fill(); // lanterna
        c.fillStyle = '#e8e0cb'; c.fillRect(x + 60, y + out - 12, 26, 9); // livro
      }
    }
    c.restore();
  },

  door_main(c, o, e) {
    const { x, y, w, h } = o;
    c.save();
    c.fillStyle = '#150e08'; c.fillRect(x - 10, y - 10, w + 20, h + 10);
    woodGrain(c, x, y, w, h, '#33200f', '#1a0f06', 10);
    c.strokeStyle = '#1c1108'; c.lineWidth = 6;
    c.strokeRect(x + 18, y + 16, w - 36, h * 0.42);
    c.strokeRect(x + 18, y + h * 0.52, w - 36, h * 0.40);
    c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(x + w - 30, y + h * 0.5, 8, 0, Math.PI * 2); c.fill();
    // corrente
    const cut = e.flags.corrente_cortada;
    c.strokeStyle = cut ? '#6b6b70' : '#8d8d94'; c.lineWidth = 5;
    c.beginPath();
    c.moveTo(x + 6, y + h * 0.46);
    c.lineTo(x + w * 0.35, y + h * 0.50);
    if (cut) { c.moveTo(x + w * 0.62, y + h * 0.50); c.lineTo(x + w - 6, y + h * 0.47); }
    else { c.lineTo(x + w - 6, y + h * 0.47); }
    c.stroke();
    if (cut) {
      c.fillStyle = '#a33a34'; c.font = '11px monospace';
      c.fillText('CORTADA', x + w * 0.36, y + h * 0.62);
    }
    // luz da tempestade pela fresta
    c.fillStyle = 'rgba(180,205,255,.10)'; c.fillRect(x + w - 4, y, 4, h);
    c.restore();
  },
  door_office(c, o, e) {
    const { x, y, w, h } = o;
    c.fillStyle = '#120d08'; c.fillRect(x - 8, y - 8, w + 16, h + 8);
    woodGrain(c, x, y, w, h, '#2a1c11', '#16 0d06'.replace(' ', ''), 8);
    c.strokeStyle = '#1a1109'; c.lineWidth = 5;
    c.strokeRect(x + 20, y + 20, w - 40, h - 50);
    c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(x + w - 26, y + h * 0.55, 7, 0, Math.PI * 2); c.fill();
    if (e.flags.escritorio_aberto) {
      c.fillStyle = '#05070a'; c.fillRect(x + 8, y + 8, w - 16, h - 8);
      glow(c, x + w / 2, y + h * 0.6, 90, 'rgba(255,200,120,.16)', 0.7);
    } else {
      c.fillStyle = '#e8e0cb'; c.font = 'bold 12px serif';
      c.fillText('E', x + w / 2 - 4, y + h * 0.58);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x, y, w, 6);
    }
  },
  coatrack(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, 70, 18, 0.45);
    c.strokeStyle = '#3b2a18'; c.lineWidth = 7;
    c.beginPath(); c.moveTo(x + w / 2, y + h); c.lineTo(x + w / 2, y + 18); c.stroke();
    c.lineWidth = 5;
    [-1, 1].forEach(s => {
      c.beginPath(); c.moveTo(x + w / 2, y + 30); c.lineTo(x + w / 2 + s * 46, y + 12); c.stroke();
    });
    // casacos pendurados
    const coats = [
      { dx: -40, col: '#2b3a44', len: 150 },
      { dx: 6, col: '#3a2f26', len: 130 },
      { dx: 44, col: '#26332a', len: 118 }
    ];
    coats.forEach((ct, i) => {
      const bx = x + w / 2 + ct.dx;
      c.fillStyle = ct.col;
      c.beginPath();
      c.moveTo(bx - 22, y + 26);
      c.quadraticCurveTo(bx, y + 8, bx + 22, y + 26);
      c.lineTo(bx + 26, y + ct.len);
      c.quadraticCurveTo(bx, y + ct.len + 14, bx - 26, y + ct.len);
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.05)';
      c.fillRect(bx - 8, y + 40, 5, ct.len - 30);
      if (i === 1 && e.flags?.casacos_vistos) {
        // brilho de água
        c.fillStyle = 'rgba(150,200,255,.16)';
        c.fillRect(bx - 26, y + 26, 52, 26);
      }
    });
    if (e.flags?.casacos_vistos) {
      // coleira com plaquinha
      c.strokeStyle = '#8a6a2f'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x + w / 2 + 22, y + 30); c.lineTo(x + w / 2 + 34, y + 74); c.stroke();
      c.fillStyle = '#d8c070'; c.beginPath(); c.arc(x + w / 2 + 34, y + 80, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3a2a12'; c.font = 'bold 7px monospace'; c.fillText('BIDU', x + w / 2 + 27, y + 83);
    }
  },
  rug(c, o, e) {
    const { x, y, w, h } = o;
    if (e.open) {
      c.save(); c.translate(-70, 26); c.rotate(-0.06);
      Props._rugTop(c, x, y, w, h);
      c.restore();
      // marcas de arrasto
      c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 7;
      c.beginPath(); c.moveTo(x + 40, y + 10); c.lineTo(x + w - 30, y + 62); c.stroke();
      c.beginPath(); c.moveTo(x + 74, y + 6); c.lineTo(x + w - 4, y + 58); c.stroke();
      c.strokeStyle = 'rgba(120,80,40,.30)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + 40, y + 12); c.lineTo(x + w - 30, y + 64); c.stroke();
      return;
    }
    Props._rugTop(c, x, y, w, h);
  },
  _rugTop(c, x, y, w, h) {
    c.save();
    c.fillStyle = '#4a1f1c'; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6b2a22'; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2 - 16, h / 2 - 10, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c9a24a'; c.lineWidth = 2; c.globalAlpha = 0.6;
    c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2 - 30, h / 2 - 20, 0, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 0.35;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.ellipse(x + w / 2, y + h / 2, (w / 2 - 40) * (1 - i * 0.15), (h / 2 - 30) * (1 - i * 0.15), 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  },
  breaker(c, o, e) {
    const { x, y, w, h } = o;
    c.fillStyle = '#3a3a3e'; c.fillRect(x, y, w, h);
    c.fillStyle = '#222225'; c.fillRect(x + 4, y + 4, w - 8, h - 8);
    c.fillStyle = e.flags?.blecaute ? '#a33a34' : '#6bc46b';
    c.fillRect(x + w / 2 - 6, y + 12, 12, 12);
    c.strokeStyle = '#555'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
    for (let i = 0; i < 3; i++) { c.fillStyle = '#111'; c.fillRect(x + 8, y + 34 + i * 14, w - 16, 8); }
  },
  chandelier(c, o, e) {
    const { x, y, w, h } = o;
    const sway = Math.sin(e.t * 0.0009) * 5 + (e.shake || 0) * 8;
    c.save();
    c.translate(x + w / 2, y);
    c.rotate(sway * 0.004);
    c.strokeStyle = '#4a3a22'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, h * 0.42); c.stroke();
    c.strokeStyle = '#4a3a22'; c.lineWidth = 3;
    c.beginPath(); c.arc(0, h * 0.42, w * 0.28, Math.PI, 0); c.stroke();
    const on = e.flags?.blecaute ? 0.06 : 1;
    for (let i = -2; i <= 2; i++) {
      const lx = i * w * 0.13, ly = h * 0.42 - Math.cos(i * 0.7) * 8;
      c.strokeStyle = '#4a3a22'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(lx, h * 0.42 - 6); c.lineTo(lx, ly + 16); c.stroke();
      const lit = (i === 0) ? on : on * 0.18;
      c.fillStyle = `rgba(255,214,150,${0.25 * lit + 0.06})`;
      c.beginPath(); c.ellipse(lx, ly + 20, 9, 13, 0, 0, Math.PI * 2); c.fill();
      if (lit > 0.5) glow(c, lx, ly + 20, 46, 'rgba(255,190,110,.5)', 0.5 + 0.2 * Math.sin(e.t * 0.011 + i));
    }
    c.restore();
  },

  /* ------------------------------------------------------- BIBLIOTECA */
  bookshelf(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.8, 24, 0.5);
    woodGrain(c, x, y, w, h, '#2a1a10', '#150c06', 10);
    const cols = 3, rows = 4;
    const cw = (w - 24) / cols, ch = (h - 24) / rows;
    const palette = ['#5a2b26', '#2c3f3a', '#3a3350', '#4a3a1c', '#233244', '#3d2230'];
    for (let r = 0; r < rows; r++) {
      const sy = y + 12 + r * ch;
      c.fillStyle = '#0a0705'; c.fillRect(x + 12, sy, w - 24, ch - 8);
      for (let i = 0; i < 16; i++) {
        const bw = 8 + (i % 4) * 3, bh = ch - 16 - (i % 3) * 3;
        const bx = x + 16 + i * ((w - 34) / 16);
        c.fillStyle = palette[(i * 3 + r * 5) % palette.length];
        c.fillRect(bx, sy + 4 + (ch - 8 - bh), bw, bh);
        c.fillStyle = 'rgba(255,220,160,.14)';
        c.fillRect(bx + bw - 3, sy + 4 + (ch - 8 - bh), 2, bh);
      }
      c.strokeStyle = '#150c06'; c.lineWidth = 4; c.strokeRect(x + 12, sy, w - 24, ch - 8);
    }
    if (e.flags?.livro_aberto) {
      // livro puxado + compartimento
      c.save();
      c.fillStyle = '#0a0705'; c.fillRect(x + w / 2 - 40, y + 12 + ch, 80, ch - 12);
      glow(c, x + w / 2, y + 12 + ch + 30, 60, 'rgba(255,190,110,.22)', 0.6);
      c.fillStyle = '#e8e0cb'; c.fillRect(x + w / 2 - 26, y + 12 + ch + 8, 44, 12);
      c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(x + w / 2 + 24, y + 12 + ch + 40, 8, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  },
  fireplace(c, o, e) {
    const { x, y, w, h } = o;
    bricks(c, x, y, w, h, '#3a3129', '#1c1712', 30);
    c.fillStyle = '#0a0806'; c.fillRect(x + 30, y + 60, w - 60, h - 90);
    // fogo
    const flick = 0.6 + Math.sin(e.t * 0.006) * 0.2 + Math.sin(e.t * 0.021) * 0.13;
    const fh = (h - 110) * flick * (e.flags?.blecaute ? 0.5 : 1);
    const cx = x + w / 2, base = y + h - 30;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const s = 1 - i * 0.2;
      c.fillStyle = rg(c, cx, base - fh * 0.4, 2, 60 * s, [[0, ['rgba(255,220,120,.55)', 'rgba(255,140,40,.42)', 'rgba(200,60,20,.30)', 'rgba(90,20,10,.22)'][i]], [1, 'rgba(0,0,0,0)']]);
      c.beginPath();
      c.ellipse(cx + Math.sin(e.t * 0.004 + i) * 6, base - fh * 0.35, 46 * s * flick, fh * 0.6 * s, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    // lenha
    c.fillStyle = '#241a10';
    c.save(); c.translate(cx, base - 6); c.rotate(0.12); c.fillRect(-52, -8, 104, 15); c.restore();
    c.save(); c.translate(cx, base - 2); c.rotate(-0.08); c.fillRect(-46, -7, 92, 13); c.restore();
    glow(c, cx, base - 30, 150, 'rgba(255,150,60,.34)', 0.7 * flick);
    // cinzas / documento
    c.fillStyle = 'rgba(30,26,22,.9)'; c.beginPath(); c.ellipse(cx, base + 14, w * 0.34, 14, 0, 0, Math.PI * 2); c.fill();
    if (e.flags?.cinzas_vistas && !e.flags?.serpente_vista) {
      c.fillStyle = '#d9cba8'; c.save(); c.translate(cx + 20, base + 10); c.rotate(0.2); c.fillRect(-14, -8, 28, 16); c.restore();
    }
    // console da lareira
    c.fillStyle = '#2b1f14'; c.fillRect(x - 12, y - 18, w + 24, 20);
    c.fillStyle = 'rgba(255,220,160,.08)'; c.fillRect(x - 12, y - 18, w + 24, 3);
  },
  photoalbum(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.8, 16, 0.4);
    c.fillStyle = '#3a2418'; c.fillRect(x - 4, y - 4, w + 8, h + 8);
    c.fillStyle = '#e8e0cb'; c.fillRect(x, y, w, h);
    c.fillStyle = '#c9b98e'; c.fillRect(x, y, w, 6);
    c.fillStyle = '#b9a97e'; c.fillRect(x + 6, y + 12, 10, h - 24);
    if (e.flags?.album_visto) {
      c.fillStyle = '#cfc7b6';
      c.fillRect(x + 24, y + 12, w - 34, h - 24);
      c.fillStyle = '#8d8574'; c.fillRect(x + 30, y + 18, w - 46, h - 36);
    }
  },
  bar(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.8, 22, 0.45);
    woodGrain(c, x, y, w, h, '#33200f', '#190e06', 8);
    c.strokeStyle = '#1a0f06'; c.lineWidth = 4;
    c.strokeRect(x + 12, y + 12, w - 24, h - 24);
    if (e.open) {
      c.fillStyle = '#0a0705'; c.fillRect(x + 16, y + 16, w - 32, h - 32);
      // garrafas
      const bottles = [['#2f4a2c', 0.72], ['#3a2a12', 0.62], ['#40202a', 0.66]];
      bottles.forEach((b, i) => {
        const bx = x + 40 + i * 46;
        c.fillStyle = b[0];
        c.fillRect(bx, y + 60, 22, h * b[1]);
        c.fillRect(bx + 8, y + 40, 6, 24);
        c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(bx + 3, y + 66, 4, h * b[1] - 12);
      });
      // taças
      c.fillStyle = 'rgba(210,230,255,.20)';
      [0, 1].forEach(i => {
        const gx = x + w - 80 + i * 34;
        c.beginPath(); c.moveTo(gx - 11, y + 120); c.lineTo(gx + 11, y + 120); c.lineTo(gx, y + 142); c.fill();
        c.fillRect(gx - 2, y + 142, 4, 20);
        c.fillRect(gx - 12, y + 160, 24, 4);
      });
      if (e.flags?.bar_aberto) {
        c.fillStyle = 'rgba(190,40,60,.35)'; // batom
        c.beginPath(); c.arc(x + w - 80 + 4, y + 126, 4, 0, Math.PI * 2); c.fill();
      }
      glow(c, x + w / 2, y + h * 0.55, 90, 'rgba(255,190,110,.14)', 0.6);
    } else {
      c.strokeStyle = '#5a3a1c'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x + w / 2, y + h / 2 - 16); c.lineTo(x + w / 2, y + h / 2 + 16); c.stroke();
    }
  },
  recordplayer(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.7, 18, 0.45);
    c.fillStyle = '#3a2414'; c.fillRect(x, y + 30, w, h - 30);
    c.fillStyle = '#241608'; c.fillRect(x + 6, y + 36, w - 12, h - 42);
    const spinning = e.flags?.disco_tocado;
    c.save();
    c.translate(x + w * 0.42, y + 46);
    if (spinning) c.rotate(e.t * 0.004);
    c.fillStyle = '#0d0d0f'; c.beginPath(); c.arc(0, 0, w * 0.24, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 1;
    for (let i = 1; i < 6; i++) { c.beginPath(); c.arc(0, 0, w * 0.04 * i, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = '#8a2f2a'; c.beginPath(); c.arc(0, 0, w * 0.07, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill();
    c.restore();
    // braço
    c.strokeStyle = '#c9a24a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x + w - 26, y + 44); c.lineTo(x + w * 0.5, y + 54); c.stroke();
    if (spinning) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const a = (e.t * 0.001 + i * 1.2) % (Math.PI * 2);
        const rr2 = 40 + i * 9;
        c.fillStyle = 'rgba(200,220,255,.10)';
        c.beginPath(); c.arc(x + w * 0.42 + Math.cos(a) * rr2, y + 46 + Math.sin(a) * rr2 * 0.4, 2.5, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
  },
  armchair(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.7, 20, 0.5);
    c.fillStyle = '#3b2a34';
    c.beginPath();
    c.moveTo(x + 10, y + h);
    c.quadraticCurveTo(x + 4, y + 30, x + 40, y + 20);
    c.lineTo(x + w - 40, y + 20);
    c.quadraticCurveTo(x + w - 4, y + 30, x + w - 10, y + h);
    c.closePath(); c.fill();
    c.fillStyle = '#4a3644';
    c.beginPath(); c.roundRect(x + 26, y + 30, w - 52, h - 46, 12); c.fill();
    c.fillStyle = 'rgba(255,220,180,.06)';
    c.beginPath(); c.roundRect(x + 26, y + 30, w - 52, 16, 8); c.fill();
    c.fillStyle = '#2a1d26'; c.fillRect(x + 16, y + h - 14, 16, 14);
    c.fillRect(x + w - 32, y + h - 14, 16, 14);
  },
  sidetable(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.8, 16, 0.4);
    woodGrain(c, x, y + 8, w, h - 8, '#2f1f13', '#180e07', 6);
    c.fillStyle = '#3d2818'; c.fillRect(x - 8, y, w + 16, 12);
    c.fillStyle = 'rgba(255,220,160,.08)'; c.fillRect(x - 8, y, w + 16, 3);
    // papéis
    c.fillStyle = '#e8e0cb'; c.save(); c.translate(x + 30, y - 4); c.rotate(-0.08); c.fillRect(0, 0, 46, 30); c.restore();
    c.fillStyle = '#d9cba8'; c.save(); c.translate(x + 62, y - 2); c.rotate(0.12); c.fillRect(0, 0, 40, 26); c.restore();
  },
  desk_small(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w, 18, 0.45);
    woodGrain(c, x, y + 14, w, h - 14, '#2c1d11', '#160d06', 7);
    c.fillStyle = '#3a2515'; c.fillRect(x - 6, y, w + 12, 16);
    c.strokeStyle = '#160d06'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x + 10, y + 42); c.lineTo(x + w - 10, y + 42); c.stroke();
    c.fillStyle = '#e8e0cb'; c.fillRect(x + 24, y - 6, 34, 10);
  },
  trapdoor(c, o, e) {
    const { x, y, w, h } = o;
    if (!e.open) {
      // tapete cobrindo
      c.fillStyle = '#3a2320'; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#52302a'; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2 - 18, h / 2 - 12, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#c9a24a'; c.globalAlpha = 0.4; c.lineWidth = 2;
      c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2 - 34, h / 2 - 22, 0, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1;
      return;
    }
    // tapete afastado + alçapão
    c.save(); c.translate(-120, 30); c.rotate(-0.1);
    c.fillStyle = '#3a2320'; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    woodGrain(c, x + 20, y + 10, w - 40, h - 20, '#2e1d10', '#150c06', 5);
    c.strokeStyle = '#150c06'; c.lineWidth = 4; c.strokeRect(x + 20, y + 10, w - 40, h - 20);
    c.strokeStyle = '#5a3a1c'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(x + 30, y + 16); c.lineTo(x + w - 30, y + h - 16); c.stroke();
    // cadeado
    c.fillStyle = '#6b6b70'; c.beginPath(); c.arc(x + w / 2, y + h / 2 + 6, 14, Math.PI, 0); c.stroke();
    c.strokeStyle = '#8d8d94'; c.lineWidth = 5;
    c.beginPath(); c.arc(x + w / 2, y + h / 2 + 6, 14, Math.PI, 0); c.stroke();
    c.fillStyle = '#7a7a80'; c.fillRect(x + w / 2 - 12, y + h / 2 + 4, 24, 20);
    if (e.flags?.porao_aberto) { c.fillStyle = 'rgba(0,0,0,.8)'; c.fillRect(x + 24, y + 14, w - 48, h - 28); }
  },

  /* ----------------------------------------------------------- COZINHA */
  radio(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.8, 14, 0.4);
    c.fillStyle = '#3a3428'; c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill();
    c.fillStyle = '#22201a'; c.beginPath(); c.roundRect(x + 8, y + 10, w - 16, h - 26, 4); c.fill();
    c.strokeStyle = '#5a5240'; c.lineWidth = 2;
    for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(x + 14 + i * 16, y + 16); c.lineTo(x + 14 + i * 16, y + h - 22); c.stroke(); }
    c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(x + w - 26, y + h - 26, 8, 0, Math.PI * 2); c.fill();
    // antena
    c.strokeStyle = '#8d8574'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + w - 16, y); c.lineTo(x + w - 30, y - 42); c.stroke();
    if (e.flags?.radio_ligado) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const a = 0.2 + Math.abs(Math.sin(e.t * 0.005)) * 0.35;
      c.strokeStyle = `rgba(140,220,255,${a})`; c.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        c.beginPath(); c.arc(x + w - 30, y - 42, i * 12, -Math.PI * 0.8, -Math.PI * 0.2); c.stroke();
      }
      c.restore();
      c.fillStyle = '#6bc46b'; c.fillRect(x + w - 30, y + h - 30, 8, 8);
    }
  },
  pantry(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.7, 20, 0.4);
    woodGrain(c, x, y, w, h, '#2b2418', '#15110a', 8);
    c.strokeStyle = '#15110a'; c.lineWidth = 4; c.strokeRect(x + 10, y + 10, w - 20, h - 20);
    if (e.open) {
      c.fillStyle = '#0a0906'; c.fillRect(x + 14, y + 14, w - 28, h - 28);
      // prateleiras com mantimentos
      for (let r = 0; r < 3; r++) {
        const sy = y + 40 + r * (h - 70) / 3;
        c.fillStyle = '#241f16'; c.fillRect(x + 18, sy + 26, w - 36, 6);
        for (let i = 0; i < 4; i++) {
          c.fillStyle = ['#5a3a1c', '#3a4a2c', '#4a2a2a', '#2c3f4a'][(i + r) % 4];
          c.fillRect(x + 26 + i * 42, sy + 6, 26, 22);
        }
      }
      c.fillStyle = '#c8c2b4'; // alicate
      c.save(); c.translate(x + 40, y + h - 44); c.rotate(-0.3);
      c.fillRect(-16, -3, 32, 6); c.fillRect(-22, -8, 8, 16); c.restore();
      glow(c, x + w / 2, y + h * 0.55, 80, 'rgba(255,200,140,.12)', 0.6);
    } else {
      c.fillStyle = '#8a6a2f'; c.beginPath(); c.arc(x + w - 32, y + h / 2, 6, 0, Math.PI * 2); c.fill();
    }
  },
  can(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w, 12, 0.4);
    c.fillStyle = '#5a3a1c'; c.beginPath(); c.roundRect(x, y, w, h, 6); c.fill();
    c.fillStyle = '#7a4a22'; c.beginPath(); c.roundRect(x + 4, y + 4, w - 8, 18, 4); c.fill();
    c.fillStyle = '#e8dcc0'; c.fillRect(x + 8, y + 34, w - 16, h * 0.36);
    c.fillStyle = '#3a2412'; c.font = 'bold 11px serif'; c.fillText('CAFÉ', x + 16, y + 52);
    if (e.flags?.olho_visto) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x + 4, y + 4, w - 8, 18); }
  },
  knife_block(c, o, e) {
    const { x, y, w, h } = o;
    c.fillStyle = '#3a2414';
    c.beginPath();
    c.moveTo(x, y + h); c.lineTo(x + 8, y + 26); c.lineTo(x + w - 8, y + 26); c.lineTo(x + w, y + h);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,220,160,.08)'; c.fillRect(x + 8, y + 26, w - 16, 5);
    for (let i = 0; i < 5; i++) {
      const kx = x + 14 + i * 18;
      c.fillStyle = '#8d8574'; c.fillRect(kx, y + 2, 5, 24);
      c.fillStyle = '#241a10'; c.fillRect(kx - 2, y + 24, 9, 5);
    }
    if (e.flags?.facas_vistas) {
      // espaço vazio
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x + 14 + 2 * 18 - 4, y + 2, 12, 26);
      c.strokeStyle = 'rgba(255,120,90,.5)'; c.lineWidth = 1.5;
      c.strokeRect(x + 14 + 2 * 18 - 4, y + 2, 12, 26);
    }
  },
  sink(c, o, e) {
    const { x, y, w, h } = o;
    c.fillStyle = '#4a4a50'; c.beginPath(); c.roundRect(x, y + 20, w, h - 20, 6); c.fill();
    c.fillStyle = '#2a2a2e'; c.beginPath(); c.roundRect(x + 12, y + 30, w - 24, h - 44, 10); c.fill();
    c.strokeStyle = '#8d8d94'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(x + w / 2, y + 30); c.lineTo(x + w / 2, y); c.quadraticCurveTo(x + w / 2, y - 20, x + w / 2 + 30, y - 20); c.stroke();
    c.fillStyle = '#1a1a1e'; c.beginPath(); c.arc(x + w / 2, y + h - 26, 9, 0, Math.PI * 2); c.fill();
    if (e.flags?.pia_vista) {
      c.fillStyle = 'rgba(120,20,30,.30)';
      c.beginPath(); c.ellipse(x + w / 2, y + h - 24, 14, 5, 0, 0, Math.PI * 2); c.fill();
    }
  },
  fridge(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.8, 18, 0.4);
    c.fillStyle = '#8d8f94'; c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill();
    c.fillStyle = '#a8aab0'; c.fillRect(x, y, w, h * 0.34);
    c.fillStyle = '#6e7076'; c.fillRect(x, y + h * 0.34, w, 6);
    c.fillStyle = '#4a4c52'; c.fillRect(x + w - 14, y + 50, 6, 70);
    c.fillStyle = '#4a4c52'; c.fillRect(x + w - 14, y + h * 0.44, 6, 70);
    if (e.open) {
      c.fillStyle = '#0e1013'; c.fillRect(x + 6, y + h * 0.36, w - 12, h * 0.6);
      glow(c, x + w / 2, y + h * 0.6, 90, 'rgba(200,230,255,.20)', 0.8);
      for (let r = 0; r < 3; r++) {
        c.fillStyle = '#22262b'; c.fillRect(x + 14, y + h * 0.42 + r * 44, w - 28, 5);
        c.fillStyle = ['#7a9a5a', '#a88a4a', '#8a5a4a'][r];
        c.fillRect(x + 26 + r * 8, y + h * 0.42 + r * 44 - 16, 22, 16);
      }
    }
  },
  calendar(c, o, e) {
    const { x, y, w, h } = o;
    c.fillStyle = '#e8e0cb'; c.fillRect(x, y, w, h);
    c.fillStyle = '#5a2b26'; c.fillRect(x, y, w, 22);
    c.fillStyle = '#e8dcc0'; c.font = 'bold 10px sans-serif'; c.fillText('SET', x + 8, y + 16);
    c.fillStyle = '#8d8574'; c.font = '9px sans-serif';
    for (let r = 0; r < 4; r++) for (let cc = 0; cc < 7; cc++) {
      c.fillText(String(r * 7 + cc + 1), x + 8 + cc * 15, y + 40 + r * 20);
    }
    c.fillStyle = '#a33a34'; c.beginPath(); c.arc(x + 8 + 13 * 15 + 4, y + 40 + 12, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8e0cb'; c.fillText('14', x + 8 + 13 * 15, y + 44 + 12);
    if (e.flags?.agenda_vista) {
      c.fillStyle = 'rgba(60,50,30,.85)'; c.font = 'italic 9px serif';
      c.fillText('23:30 T.', x + 6, y + h - 6);
    }
  },
  door_service(c, o, e) {
    const { x, y, w, h } = o;
    woodGrain(c, x, y, w, h, '#2a2218', '#14100a', 6);
    c.strokeStyle = '#14100a'; c.lineWidth = 5; c.strokeRect(x + 16, y + 14, w - 32, h - 40);
    c.fillStyle = '#8a6a2f'; c.beginPath(); c.arc(x + w - 26, y + h * 0.5, 7, 0, Math.PI * 2); c.fill();
    // teia de aranha
    c.strokeStyle = 'rgba(230,230,230,.30)'; c.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 1.2 + 0.3;
      c.beginPath(); c.moveTo(x + w - 4, y + 6);
      c.lineTo(x + w - 4 + Math.cos(a) * 52, y + 6 + Math.sin(a) * 52); c.stroke();
    }
    for (let i = 1; i < 4; i++) {
      c.beginPath(); c.arc(x + w - 4, y + 6, i * 14, 0.3, Math.PI * 0.9); c.stroke();
    }
  },
  fuse(c, o, e) {
    const { x, y, w, h } = o;
    c.fillStyle = '#3a3a3e'; c.fillRect(x, y, w, h);
    c.fillStyle = '#1e1e22'; c.fillRect(x + 4, y + 4, w - 8, h - 8);
    c.fillStyle = e.flags?.blecaute ? '#a33a34' : '#6bc46b';
    c.fillRect(x + 8, y + 10, w - 16, 10);
    c.strokeStyle = '#555'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
    c.fillStyle = '#111';
    for (let i = 0; i < 4; i++) c.fillRect(x + 8, y + 30 + i * 14, w - 16, 9);
  },
  stove(c, o, e) {
    const { x, y, w, h } = o;
    c.fillStyle = '#6e7076'; c.beginPath(); c.roundRect(x, y + 10, w, h - 10, 6); c.fill();
    c.fillStyle = '#3a3c42'; c.fillRect(x, y, w, 16);
    c.strokeStyle = '#24262a'; c.lineWidth = 3;
    [0, 1, 2, 3].forEach(i => {
      c.beginPath(); c.arc(x + 40 + (i % 2) * 90, y + 52 + Math.floor(i / 2) * 46, 22, 0, Math.PI * 2); c.stroke();
    });
    c.fillStyle = '#1a1c20'; c.fillRect(x + 8, y + h - 34, w - 16, 26);
  },

  /* --------------------------------------------------------- ESCRITÓRIO */
  computer(c, o, e) {
    const { x, y, w, h } = o;
    const on = e.flags?.pc_aberto;
    shadow(c, x + w / 2, y + h, w * 0.8, 16, 0.4);
    c.fillStyle = '#1a1c20'; c.beginPath(); c.roundRect(x + 10, y, w - 20, h * 0.62, 6); c.fill();
    c.fillStyle = on ? '#0e1a24' : '#08090b'; c.fillRect(x + 18, y + 8, w - 36, h * 0.62 - 16);
    if (on) {
      glow(c, x + w / 2, y + h * 0.3, 130, 'rgba(120,200,255,.22)', 0.9);
      c.fillStyle = 'rgba(140,220,255,.85)'; c.font = '11px monospace';
      c.fillText('> ALENCAR/FINANCAS', x + 28, y + 26);
      c.fillText('> 2 novas mensagens', x + 28, y + 42);
      c.fillText('> rascunho_helena.txt', x + 28, y + 58);
      c.fillStyle = 'rgba(140,220,255,.35)';
      c.fillRect(x + 28, y + 66, 90, 3);
      // scanline
      c.fillStyle = 'rgba(120,200,255,.06)';
      const sl = ((e.t * 0.06) % (h * 0.6)) + y;
      c.fillRect(x + 18, sl, w - 36, 2);
    } else {
      c.fillStyle = 'rgba(255,255,255,.03)'; c.fillRect(x + 18, y + 8, w - 36, h * 0.62 - 16);
      c.fillStyle = 'rgba(200,220,255,.30)'; c.font = 'bold 12px monospace';
      c.fillText('BLOQUEADO', x + w / 2 - 40, y + h * 0.32);
      c.fillStyle = 'rgba(200,220,255,.18)'; c.font = '9px monospace';
      c.fillText('senha: ________', x + w / 2 - 36, y + h * 0.42);
    }
    // teclado + base
    c.fillStyle = '#2a2c30'; c.beginPath(); c.roundRect(x - 20, y + h * 0.66, w + 40, 22, 4); c.fill();
    c.fillStyle = '#1a1c20'; c.fillRect(x - 14, y + h * 0.66 + 4, w + 28, 14);
    c.fillStyle = '#e8e0cb'; c.save(); c.translate(x + w + 4, y + h * 0.62); c.rotate(0.12);
    c.fillRect(0, 0, 30, 18); c.restore(); // adesivo
  },
  safe(c, o, e) {
    const { x, y, w, h } = o;
    c.fillStyle = '#2a2c30'; c.fillRect(x, y, w, h);
    c.fillStyle = '#3a3d42'; c.fillRect(x + 6, y + 6, w - 12, h - 12);
    c.strokeStyle = '#1a1c20'; c.lineWidth = 5; c.strokeRect(x + 6, y + 6, w - 12, h - 12);
    // mostrador
    c.fillStyle = '#15171a'; c.beginPath(); c.arc(x + w / 2, y + h * 0.35, w * 0.22, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c9a24a'; c.lineWidth = 3; c.stroke();
    const rot = (e.safeDial || 0) * (Math.PI * 2 / 4);
    c.strokeStyle = '#e8dcc0'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x + w / 2, y + h * 0.35);
    c.lineTo(x + w / 2 + Math.sin(rot) * w * 0.18, y + h * 0.35 - Math.cos(rot) * w * 0.18); c.stroke();
    // símbolos gravados
    ['lua', 'serpente', 'olho', 'chave'].forEach((s, i) => {
      const sx = x + 24 + (i % 2) * (w - 60), sy = y + h * 0.62 + Math.floor(i / 2) * 34;
      drawSymbol(c, s, sx, sy, 11, 'rgba(224,180,100,.30)');
    });
    c.fillStyle = '#15171a'; c.fillRect(x + w - 40, y + h - 34, 26, 8);
    if (e.flags?.cofre_aberto) {
      c.fillStyle = '#08090b'; c.fillRect(x + 12, y + 12, w - 24, h - 24);
      glow(c, x + w / 2, y + h * 0.55, 110, 'rgba(255,190,110,.22)', 0.8);
      c.fillStyle = '#e8e0cb'; c.fillRect(x + 26, y + 40, w - 52, 26); // contrato
      c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(x + 40, y + h - 40, 9, 0, Math.PI * 2); c.fill(); // chave
    }
  },
  desk_drawer(c, o, e) {
    const { x, y, w, h } = o;
    const out = e.open ? 14 : 0;
    c.fillStyle = '#1c1409'; c.fillRect(x - 2, y - 2, w + 4, h + 4);
    c.fillStyle = '#33200f'; c.fillRect(x, y + out, w, h);
    c.fillStyle = '#c9a24a'; c.beginPath(); c.roundRect(x + w / 2 - 20, y + out + h / 2 - 3, 40, 6, 3); c.fill();
    if (e.open) {
      c.fillStyle = '#080601'; c.fillRect(x + 4, y + out - 6, w - 8, 10);
      c.fillStyle = '#cfc7b6'; c.beginPath(); c.roundRect(x + 14, y - 8, 28, 8, 2); c.fill();
      c.fillStyle = '#e8e0cb'; c.save(); c.translate(x + w - 30, y - 10); c.rotate(0.2); c.fillRect(0, 0, 22, 14); c.restore();
    } else {
      c.fillStyle = '#6b6b70'; c.beginPath(); c.arc(x + w / 2, y + h / 2, 4, 0, Math.PI * 2); c.fill();
    }
  },
  phone(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.7, 12, 0.4);
    c.fillStyle = '#23252a'; c.beginPath(); c.roundRect(x, y + 16, w, h - 16, 6); c.fill();
    c.fillStyle = '#15171a';
    for (let r = 0; r < 3; r++) for (let cc = 0; cc < 3; cc++) {
      c.beginPath(); c.roundRect(x + 16 + cc * 30, y + 26 + r * 20, 24, 15, 3); c.fill();
    }
    c.fillStyle = '#3a3d42'; c.beginPath(); c.roundRect(x + 8, y - 2, w - 16, 22, 8); c.fill();
    c.strokeStyle = '#5a5d64'; c.lineWidth = 3;
    c.beginPath(); c.arc(x + w / 2, y + h - 6, 22, Math.PI, 0); c.stroke();
    if (e.flags?.telefone_aberto || e.flags?.chamadas_vistas) glow(c, x + w / 2, y + h / 2, 60, 'rgba(120,200,255,.14)', 0.6);
  },
  filing(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.8, 18, 0.4);
    c.fillStyle = '#4a4d52'; c.fillRect(x, y, w, h);
    c.fillStyle = '#3a3d42'; c.fillRect(x + 4, y + 4, w - 8, h - 8);
    for (let i = 0; i < 3; i++) {
      const dy = y + 14 + i * (h - 24) / 3;
      const out = e.open && i === 1 ? 16 : 0;
      c.fillStyle = '#2a2c30'; c.fillRect(x + 10, dy + out, w - 20, (h - 30) / 3);
      c.fillStyle = '#8d8574'; c.fillRect(x + w / 2 - 22, dy + out + 8, 44, 6);
      c.fillStyle = '#c9b98e'; c.fillRect(x + w / 2 - 14, dy + out + 4, 28, 12);
      if (out) { c.fillStyle = '#e8e0cb'; c.fillRect(x + 16, dy + out - 8, w - 32, 10); }
    }
  },
  whiskey(c, o, e) {
    const { x, y, w, h } = o;
    c.fillStyle = 'rgba(200,220,255,.16)';
    c.beginPath(); c.moveTo(x + 12, y + 20); c.lineTo(x + w - 12, y + 20); c.lineTo(x + w - 20, y + h); c.lineTo(x + 20, y + h); c.fill();
    c.fillStyle = 'rgba(180,90,30,.55)';
    c.fillRect(x + 16, y + 44, w - 32, h - 48);
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2;
    c.strokeRect(x + 12, y + 20, w - 24, h - 20);
    c.fillStyle = '#3a3c42'; c.beginPath(); c.roundRect(x + w - 40, y + h - 18, 34, 12, 4); c.fill();
    c.fillStyle = '#2a2c30'; c.fillRect(x + w - 26, y + h - 22, 6, 8);
  },
  window_night(c, o, e) { drawWindow(c, o.x, o.y, o.w, o.h, e.t); },
  lamp(c, o, e) {
    const { x, y, w, h } = o;
    c.strokeStyle = '#5a3a1c'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(x + w / 2, y + h); c.lineTo(x + w / 2, y + 30); c.stroke();
    c.fillStyle = '#2a2c30'; c.beginPath(); c.ellipse(x + w / 2, y + h, 30, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = e.flags?.blecaute ? '#2a2620' : '#c9a24a';
    c.beginPath();
    c.moveTo(x + 6, y + 34); c.lineTo(x + w - 6, y + 34); c.lineTo(x + w - 18, y + 6); c.lineTo(x + 18, y + 6);
    c.closePath(); c.fill();
    if (!e.flags?.blecaute) glow(c, x + w / 2, y + 46, 130, 'rgba(255,190,110,.30)', 0.7);
  },

  /* -------------------------------------------------------------- PORÃO */
  darkness(c, o, e) {
    if (e.flags?.porao_claro) return;
    c.save();
    c.fillStyle = 'rgba(0,0,0,.72)';
    c.fillRect(o.x, o.y, o.w, o.h);
    c.fillStyle = 'rgba(0,0,0,.5)';
    c.fillRect(o.x - 60, o.y - 40, o.w + 120, o.h + 80);
    c.restore();
  },
  suitcase(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.8, 14, 0.5);
    c.fillStyle = '#3a2414'; c.beginPath(); c.roundRect(x, y, w, h, 6); c.fill();
    c.strokeStyle = '#1a1008'; c.lineWidth = 4; c.strokeRect(x + 6, y + 6, w - 12, h - 12);
    c.fillStyle = '#5a3a1c'; c.fillRect(x + w / 2 - 10, y + h / 2 - 6, 20, 12);
    c.strokeStyle = '#5a3a1c'; c.lineWidth = 5;
    c.beginPath(); c.arc(x + w / 2, y, 18, Math.PI, 0); c.stroke();
    if (e.open) {
      c.fillStyle = '#0a0806'; c.fillRect(x + 10, y + 10, w - 20, h * 0.4);
      c.fillStyle = '#8a7a58'; c.fillRect(x + 16, y + 12, w - 32, 8);
      c.fillStyle = '#a89570'; c.fillRect(x + 20, y + 22, w - 40, 8);
      glow(c, x + w / 2, y + 20, 70, 'rgba(200,180,120,.16)', 0.6);
    }
  },
  recorder(c, o, e) {
    const { x, y, w, h } = o;
    shadow(c, x + w / 2, y + h, w * 0.8, 10, 0.5);
    c.fillStyle = '#2a2c30'; c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill();
    c.fillStyle = '#15171a'; c.fillRect(x + 12, y + 12, w - 24, h * 0.34);
    c.fillStyle = '#a33a34'; c.beginPath(); c.arc(x + 26, y + h - 22, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5a5d64'; c.fillRect(x + 44, y + h - 28, 20, 10);
    c.fillStyle = '#5a5d64'; c.fillRect(x + 72, y + h - 28, 20, 10);
    if (e.flags?.gravacao_ouvida) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const bh = 6 + Math.abs(Math.sin(e.t * 0.006 + i)) * 22;
        c.fillStyle = 'rgba(140,220,255,.35)';
        c.fillRect(x + 16 + i * 15, y + 22 - bh / 2 + 10, 8, bh);
      }
      c.restore();
      glow(c, x + w / 2, y + h / 2, 90, 'rgba(120,200,255,.18)', 0.7);
    }
  },
  knife_floor(c, o, e) {
    const { x, y, w, h } = o;
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(-0.42);
    c.fillStyle = '#c8ccd2'; c.fillRect(-w * 0.34, -3, w * 0.5, 6);
    c.fillStyle = '#eef2f6'; c.fillRect(-w * 0.34, -3, w * 0.5, 2);
    c.fillStyle = '#2a1a10'; c.fillRect(w * 0.16, -4, w * 0.2, 8);
    c.restore();
    c.fillStyle = 'rgba(120,20,20,.30)';
    c.beginPath(); c.ellipse(x + w * 0.6, y + h * 0.72, 26, 8, 0, 0, Math.PI * 2); c.fill();
    if (e.flags?.faca_vista) glow(c, x + w / 2, y + h / 2, 60, 'rgba(255,120,90,.18)', 0.6);
  },
  barrels(c, o, e) {
    const { x, y, w, h } = o;
    const cols = [
      { c1: '#3a4a2c', c2: '#20281a' }, { c1: '#4a3a1c', c2: '#2a2010' }, { c1: '#2c3f4a', c2: '#1a252c' }
    ];
    cols.forEach((b, i) => {
      const bx = x + 20 + i * 62, by = y + 30 + (i % 2) * 18, bw = 56, bh = h - 50;
      c.fillStyle = b.c1; c.beginPath(); c.roundRect(bx, by, bw, bh, 8); c.fill();
      c.fillStyle = b.c2; c.fillRect(bx, by + bh * 0.3, bw, 10);
      c.fillRect(bx, by + bh * 0.7, bw, 10);
      c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(bx + 6, by + 6, 6, bh - 12);
      c.fillStyle = '#e8e0cb'; c.fillRect(bx + 12, by + bh * 0.45, 30, 12);
      c.fillStyle = '#3a3020'; c.font = '7px monospace'; c.fillText('AMOSTRA', bx + 13, by + bh * 0.45 + 9);
    });
  },
  bricks(c, o, e) {
    const { x, y, w, h } = o;
    bricks(c, x, y, w, h, '#2a2723', '#15130f', 40);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x, y + h - 40, w, 40);
    if (!e.flags?.tijolo_porao) {
      c.fillStyle = '#3a342c'; c.fillRect(x + w * 0.3, y + h * 0.35, 52, 34);
      c.strokeStyle = '#15130f'; c.lineWidth = 2; c.strokeRect(x + w * 0.3, y + h * 0.35, 52, 34);
    } else {
      c.fillStyle = '#08090a'; c.fillRect(x + w * 0.3, y + h * 0.35, 52, 34);
      glow(c, x + w * 0.3 + 26, y + h * 0.35 + 17, 40, 'rgba(255,190,110,.14)', 0.6);
    }
    // umidade
    c.fillStyle = 'rgba(80,140,160,.08)'; c.fillRect(x, y, w, 20);
  },
  tunnel(c, o, e) {
    const { x, y, w, h } = o;
    c.fillStyle = '#050607';
    c.beginPath();
    c.moveTo(x, y + h); c.lineTo(x, y + 60);
    c.quadraticCurveTo(x + w / 2, y - 30, x + w, y + 60);
    c.lineTo(x + w, y + h); c.closePath(); c.fill();
    // tábuas
    c.strokeStyle = '#3a2414'; c.lineWidth = 12;
    for (let i = 0; i < 4; i++) {
      const ang = -0.5 + i * 0.34;
      c.beginPath();
      c.moveTo(x + w / 2 + Math.cos(ang) * 110, y + 70 + Math.sin(ang) * 60);
      c.lineTo(x + w / 2 + Math.cos(ang + 0.24) * 110, y + 70 + Math.sin(ang + 0.24) * 60 + 60);
      c.stroke();
    }
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x, y + h - 30, w, 30);
  }
};

/* ------------------------------------------------------------- símbolos */
export function drawSymbol(c, kind, x, y, r, color) {
  c.save();
  c.strokeStyle = color || '#e0b464'; c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round';
  c.translate(x, y);
  switch (kind) {
    case 'lua':
      c.beginPath();
      c.arc(0, 0, r, Math.PI * 0.35, Math.PI * 1.65);
      c.stroke();
      c.beginPath();
      c.arc(r * 0.42, 0, r * 0.92, Math.PI * 0.62, Math.PI * 1.38, true);
      c.stroke();
      break;
    case 'serpente':
      c.beginPath();
      c.moveTo(-r, r * 0.6);
      c.bezierCurveTo(-r * 0.2, -r, r * 0.4, r, r, -r * 0.5);
      c.stroke();
      c.beginPath(); c.arc(r, -r * 0.72, r * 0.2, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(r * 0.86, -r * 0.86); c.lineTo(r * 1.3, -r * 1.05); c.stroke();
      break;
    case 'olho':
      c.beginPath();
      c.moveTo(-r, 0);
      c.quadraticCurveTo(0, -r * 0.95, r, 0);
      c.quadraticCurveTo(0, r * 0.95, -r, 0);
      c.stroke();
      c.beginPath(); c.arc(0, 0, r * 0.34, 0, Math.PI * 2); c.stroke();
      break;
    case 'chave':
      c.beginPath(); c.arc(-r * 0.45, 0, r * 0.45, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(r * 0.9, 0); c.stroke();
      c.beginPath(); c.moveTo(r * 0.9, 0); c.lineTo(r * 0.9, r * 0.42); c.stroke();
      c.beginPath(); c.moveTo(r * 0.5, 0); c.lineTo(r * 0.5, r * 0.32); c.stroke();
      break;
  }
  c.restore();
}

/* =========================================================================
   DECOR DE FUNDO POR CENA
   ========================================================================== */
export const Decor = {
  hall(c, e) {
    // escadaria
    c.save();
    c.fillStyle = '#1a1209';
    c.beginPath();
    c.moveTo(W - 330, 470); c.lineTo(W - 60, 470); c.lineTo(W - 60, 700); c.lineTo(W - 420, 700);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,220,160,.05)';
    for (let i = 0; i < 7; i++) {
      const y = 500 + i * 26;
      c.fillRect(W - 320 - i * 30, y, 240 + i * 40, 8);
    }
    c.strokeStyle = '#3a2413'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(W - 66, 470); c.lineTo(W - 66, 210); c.lineTo(W - 300, 210); c.stroke();
    c.restore();
    // espelho
    c.save();
    c.fillStyle = '#4a3418'; c.fillRect(120, 150, 130, 170);
    c.fillStyle = lg(c, 120, 150, 250, 320, [[0, '#1b2229'], [0.5, '#0d1116'], [1, '#161c22']]);
    c.fillRect(126, 156, 118, 158);
    c.fillStyle = 'rgba(200,220,255,.05)';
    c.beginPath(); c.moveTo(140, 314); c.lineTo(210, 156); c.lineTo(232, 156); c.lineTo(162, 314); c.fill();
    c.restore();
    // janela alta com chuva
    drawWindow(c, 950, 90, 150, 200, e.t);
    // arco / molduras
    c.strokeStyle = 'rgba(255,220,160,.06)'; c.lineWidth = 3;
    c.strokeRect(430, 120, 320, 300);
    // vaso
    c.fillStyle = '#2a2c30';
    c.beginPath(); c.moveTo(300, 470); c.lineTo(316, 400); c.lineTo(384, 400); c.lineTo(400, 470); c.fill();
    c.fillStyle = '#26332a';
    c.beginPath(); c.ellipse(350, 398, 40, 12, 0, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 5; i++) {
      c.strokeStyle = '#2c3a2c'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(350, 396);
      c.quadraticCurveTo(350 + (i - 2) * 22, 350, 350 + (i - 2) * 34, 320 - (i % 2) * 20); c.stroke();
    }
  },
  biblioteca(c, e) {
    // estante ao fundo (esquerda)
    c.save();
    c.fillStyle = '#1d130a'; c.fillRect(0, 60, 90, 400);
    for (let i = 0; i < 5; i++) c.fillStyle = 'rgba(0,0,0,.4)', c.fillRect(0, 70 + i * 78, 90, 4);
    c.restore();
    // janela com chuva
    drawWindow(c, 520, 60, 240, 180, e.t);
    // cortina
    c.fillStyle = '#3a1f28';
    c.beginPath(); c.moveTo(490, 60); c.quadraticCurveTo(470, 200, 486, 300); c.lineTo(430, 300); c.lineTo(430, 60); c.fill();
    c.beginPath(); c.moveTo(790, 60); c.quadraticCurveTo(810, 200, 794, 300); c.lineTo(848, 300); c.lineTo(848, 60); c.fill();
    // lustre de velas
    c.save();
    c.translate(760, 60);
    c.strokeStyle = '#3a2a18'; c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, 90, 0, Math.PI); c.stroke();
    for (let i = -2; i <= 2; i++) {
      const lx = i * 40, ly = -Math.cos(i * 0.6) * 16 + 26;
      c.fillStyle = '#e8dcc0'; c.fillRect(lx - 4, ly, 8, 22);
      const fl = e.flags?.blecaute ? 0.2 : 1;
      c.fillStyle = `rgba(255,200,120,${0.85 * fl})`;
      c.beginPath(); c.ellipse(lx, ly - 6 + Math.sin(e.t * 0.01 + i) * 2, 4, 9, 0, 0, Math.PI * 2); c.fill();
      if (fl > 0.5) glow(c, lx, ly - 4, 60, 'rgba(255,170,70,.35)', 0.5 + 0.2 * Math.sin(e.t * 0.013 + i * 2));
    }
    c.restore();
    // quadros pequenos na parede
    for (let i = 0; i < 3; i++) {
      c.fillStyle = '#3d2a12'; c.fillRect(900 + i * 70, 90, 56, 44);
      c.fillStyle = '#1a1d22'; c.fillRect(904 + i * 70, 94, 48, 36);
    }
  },
  cozinha(c, e) {
    // azulejos
    c.save();
    c.globalAlpha = 0.5;
    c.strokeStyle = 'rgba(180,220,255,.12)'; c.lineWidth = 1;
    for (let y = 60; y < 430; y += 26) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (let x = 0; x < W; x += 26) { c.beginPath(); c.moveTo(x, 60); c.lineTo(x, 430); c.stroke(); }
    c.restore();
    // armários suspensos
    c.fillStyle = '#26332a'; c.fillRect(40, 70, 300, 110);
    c.fillStyle = '#1e2a22'; c.fillRect(48, 78, 284, 94);
    c.strokeStyle = '#141c17'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(190, 78); c.lineTo(190, 172); c.stroke();
    // panela pendurada
    c.strokeStyle = '#8d8574'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(520, 70); c.lineTo(520, 120); c.stroke();
    c.fillStyle = '#4a4c52'; c.beginPath(); c.ellipse(520, 150, 40, 26, 0, 0, Math.PI); c.fill();
    c.fillStyle = '#5a5d64'; c.fillRect(480, 146, 80, 8);
    // janela
    drawWindow(c, 900, 90, 190, 150, e.t);
    // bancada
    c.fillStyle = '#2a2e30'; c.fillRect(0, 440, W, 26);
    c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(0, 440, W, 4);
  },
  escritorio(c, e) {
    // painel de madeira
    c.save();
    for (let x = 0; x < W; x += 90) {
      c.fillStyle = x % 180 === 0 ? 'rgba(255,255,255,.015)' : 'rgba(0,0,0,.08)';
      c.fillRect(x, 0, 88, 430);
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 430); c.stroke();
    }
    c.restore();
    // estante de fundo
    c.fillStyle = '#20140a'; c.fillRect(880, 120, 320, 260);
    for (let r = 0; r < 3; r++) {
      c.fillStyle = '#150d06'; c.fillRect(890, 136 + r * 84, 300, 70);
      for (let i = 0; i < 12; i++) {
        c.fillStyle = ['#3a2a12', '#2c3f4a', '#4a2a2a'][(i + r) % 3];
        c.fillRect(896 + i * 24, 142 + r * 84, 14, 58);
      }
    }
    // tapete
    c.fillStyle = 'rgba(40,30,22,.6)';
    c.beginPath(); c.ellipse(640, 620, 460, 90, 0, 0, Math.PI * 2); c.fill();
    // relógio de parede
    c.save();
    c.translate(200, 130);
    c.fillStyle = '#3a2414'; c.beginPath(); c.arc(0, 0, 44, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8dcc0'; c.beginPath(); c.arc(0, 0, 36, 0, Math.PI * 2); c.fill();
    const tt = e.t * 0.0006;
    c.strokeStyle = '#241a10'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(tt) * 20, -Math.cos(tt) * 20); c.stroke();
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(tt * 12) * 28, -Math.cos(tt * 12) * 28); c.stroke();
    c.restore();
  },
  porao(c, e) {
    bricks(c, 0, 0, W, 470, '#232021', '#100e0d', 46);
    // canos
    c.strokeStyle = '#3a3d42'; c.lineWidth = 14;
    c.beginPath(); c.moveTo(0, 70); c.lineTo(W, 96); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(0, 66); c.lineTo(W, 92); c.stroke();
    c.strokeStyle = '#2a2c30'; c.lineWidth = 10;
    c.beginPath(); c.moveTo(180, 0); c.lineTo(180, 96); c.stroke();
    c.beginPath(); c.moveTo(1120, 0); c.lineTo(1120, 104); c.stroke();
    // poças
    c.fillStyle = 'rgba(70,120,140,.10)';
    c.beginPath(); c.ellipse(300, 660, 150, 26, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(980, 690, 190, 30, 0, 0, Math.PI * 2); c.fill();
    // escada para o alçapão
    c.save();
    c.fillStyle = '#2a1d10';
    for (let i = 0; i < 8; i++) c.fillRect(40, 90 + i * 34, 150, 16);
    c.strokeStyle = '#1a1208'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(46, 80); c.lineTo(46, 400); c.moveTo(184, 80); c.lineTo(184, 400); c.stroke();
    c.restore();
    // prateleira
    c.fillStyle = '#241a10'; c.fillRect(1000, 300, 250, 12);
    c.fillStyle = '#2a2018'; c.fillRect(1000, 400, 250, 12);
    // teias
    c.strokeStyle = 'rgba(220,220,220,.10)'; c.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI + 0.4;
      c.beginPath(); c.moveTo(0, 40); c.lineTo(Math.cos(a) * 90, 40 + Math.sin(a) * 90); c.stroke();
    }
    for (let i = 1; i < 4; i++) { c.beginPath(); c.arc(0, 40, i * 22, 0.4, Math.PI); c.stroke(); }
  }
};

/* =========================================================================
   PARTÍCULAS (poeira, fumaça, brasa, chuva)
   ========================================================================== */
export class Particles {
  constructor() { this.list = []; }
  seed(sceneId, amb) {
    this.list = [];
    const n = Math.round((amb.dust || 0.5) * 60);
    for (let i = 0; i < n; i++) {
      this.list.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 7,
        r: 0.6 + Math.random() * 1.8, a: 0.05 + Math.random() * 0.20, life: Math.random() * 100
      });
    }
    if (sceneId === 'biblioteca') {
      for (let i = 0; i < 26; i++) this.list.push({
        x: 650 + (Math.random() - 0.5) * 90, y: 460 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 12, vy: -14 - Math.random() * 22,
        r: 1 + Math.random() * 2.4, a: 0.5, ember: true, life: Math.random() * 60
      });
    }
    if (sceneId === 'porao') {
      for (let i = 0; i < 34; i++) this.list.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 3,
        r: 3 + Math.random() * 9, a: 0.02 + Math.random() * 0.04, fog: true, life: Math.random() * 100
      });
    }
  }
  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.ember) { p.vy -= 6 * dt; p.vx += Math.sin(p.life * 3) * 8 * dt; }
      if (p.y < -20 || p.y > H + 20 || p.x < -30 || p.x > W + 30 || p.life <= 0) {
        p.y = H + 10; p.x = Math.random() * W; p.life = 8 + Math.random() * 14;
        if (p.ember) { p.x = 620 + (Math.random() - 0.5) * 100; p.y = 470; p.vy = -14 - Math.random() * 20; }
      }
    }
  }
  draw(c, t) {
    c.save();
    for (const p of this.list) {
      if (p.fog) {
        c.globalAlpha = p.a;
        c.fillStyle = '#8fb8c8';
        c.beginPath(); c.arc(p.x + Math.sin(t * 0.0004 + p.life) * 14, p.y, p.r * 3, 0, Math.PI * 2); c.fill();
      } else if (p.ember) {
        c.globalAlpha = Math.min(0.55, p.a * (p.life / 40));
        c.fillStyle = '#ff9a3c';
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
      } else {
        c.globalAlpha = p.a;
        c.fillStyle = '#ffe9c4';
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  }
}

/* =========================================================================
   ILUMINAÇÃO — recortes de luz sobre a escuridão
   ========================================================================== */
export function drawLighting(c, lightCanvas, lights, darkAlpha) {
  const lc = lightCanvas.getContext('2d');
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
  lc.fillStyle = `rgba(2,3,5,${darkAlpha})`;
  lc.fillRect(0, 0, lightCanvas.width, lightCanvas.height);
  lc.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const lt = Number.isFinite(l.t) ? l.t : 0;
    const flick = l.flicker ? (0.82 + Math.sin(lt * 0.013) * 0.1 + Math.sin(lt * 0.037) * 0.08) : 1;
    const r = Math.max(1, (Number.isFinite(l.r) ? l.r : 200) * flick);
    if (!Number.isFinite(l.x) || !Number.isFinite(l.y)) continue;
    const g = lc.createRadialGradient(l.x, l.y, r * 0.08, l.x, l.y, r);
    g.addColorStop(0, `rgba(0,0,0,${l.a})`);
    g.addColorStop(0.55, `rgba(0,0,0,${l.a * 0.55})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = g;
    lc.beginPath(); lc.arc(l.x, l.y, r, 0, Math.PI * 2); lc.fill();
  }
  lc.globalCompositeOperation = 'source-over';
  c.drawImage(lightCanvas, 0, 0, W, H);

  // camada de cor quente das luzes
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!l.color) continue;
    const lt2 = Number.isFinite(l.t) ? l.t : 0;
    const flick = l.flicker ? (0.85 + Math.sin(lt2 * 0.011 + l.x) * 0.12) : 1;
    const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.9 * flick);
    g.addColorStop(0, l.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = Math.min(1, l.a * 0.78);
    c.fillStyle = g;
    c.beginPath(); c.arc(l.x, l.y, l.r * flick, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

/* grão de filme + vinheta final */
export function drawFilmGrain(c, t, amount = 0.05) {
  c.save();
  c.globalAlpha = amount;
  c.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 90; i++) {
    c.fillStyle = i % 2 ? '#fff' : '#000';
    c.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  c.restore();
  // scanlines sutis
  c.save();
  c.globalAlpha = 0.04; c.fillStyle = '#000';
  for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
  c.restore();
}
