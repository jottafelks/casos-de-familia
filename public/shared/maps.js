/* =============================================================================
   MAPAS NAVEGÁVEIS — transforma um caso (locais + objetos) num mundo que o
   jogador pode percorrer a pé, com cômodos ligados por portas.

   Nada de conteúdo novo é inventado aqui: os cômodos vêm de `case.locations`,
   os objetos vêm de `location.objects` e as ligações vêm de `location.nav`.
   Assim todo caso existente (e os 30 que virão) ganha o mundo automaticamente.
   ========================================================================== */

export const CELL_W = 1180;   // tamanho de um cômodo no mundo
export const CELL_H = 840;
export const WALL = 28;       // espessura da parede
export const DOOR_W = 168;    // largura da abertura da porta
export const GAP = 90;        // espaço entre cômodos (corredor visual)

/* ------------------------------------------------------------------ layout */
function layoutRooms(caseData) {
  const locs = caseData.locations;
  const placed = new Map();          // id -> {gx, gy}
  const ocupado = new Set();
  const key = (x, y) => x + ',' + y;

  const vizinhanca = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  const first = locs[0];
  placed.set(first.id, { gx: 0, gy: 0 });
  ocupado.add(key(0, 0));

  // largura em fila (BFS) seguindo as ligações do caso
  const fila = [first.id];
  const lOrd = [];
  while (fila.length) {
    const id = fila.shift();
    lOrd.push(id);
    const L = locs.find(l => l.id === id);
    const saidas = (L?.nav || []).map(n => (typeof n === 'string' ? n : n.to));
    for (const dest of saidas) {
      if (placed.has(dest)) continue;
      const p = placed.get(id);
      let escolhido = null;
      for (const [dx, dy] of vizinhanca) {
        const gx = p.gx + dx, gy = p.gy + dy;
        if (!ocupado.has(key(gx, gy))) { escolhido = { gx, gy }; break; }
      }
      if (!escolhido) escolhido = { gx: p.gx, gy: p.gy + 1 };   // mundo cheio: empilha
      placed.set(dest, escolhido);
      ocupado.add(key(escolhido.gx, escolhido.gy));
      fila.push(dest);
    }
  }
  // locais que não foram alcançados pelas ligações ainda entram no mapa
  for (const L of locs) {
    if (placed.has(L.id)) continue;
    let gy = 0;
    while (ocupado.has(key(0, gy))) gy++;
    placed.set(L.id, { gx: 0, gy });
    ocupado.add(key(0, gy));
  }
  return placed;
}

/* --------------------------------------------------------------- geometria */
function rectOf(g) {
  return {
    x: g.gx * (CELL_W + GAP),
    y: g.gy * (CELL_H + GAP),
    w: CELL_W,
    h: CELL_H,
  };
}

/** Aresta compartilhada entre dois retângulos vizinhos: 'n','s','l','o' */
function ladoComum(a, b) {
  const dx = (b.x + b.w / 2) - (a.x + a.w / 2);
  const dy = (b.y + b.h / 2) - (a.y + a.h / 2);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'l' : 'o';
  return dy > 0 ? 's' : 'n';
}

function portaEntre(a, b) {
  const lado = ladoComum(a, b);
  if (lado === 'l' || lado === 'o') {
    const x = lado === 'l' ? a.x + a.w : a.x;
    const yTop = Math.max(a.y, b.y), yBot = Math.min(a.y + a.h, b.y + b.h);
    const meio = (yTop + yBot) / 2;
    return { x: x - WALL / 2, y: meio - DOOR_W / 2, w: WALL + 6, h: DOOR_W, lado };
  }
  const y = lado === 's' ? a.y + a.h : a.y;
  const xTop = Math.max(a.x, b.x), xBot = Math.min(a.x + a.w, b.x + b.w);
  const meio = (xTop + xBot) / 2;
  return { x: meio - DOOR_W / 2, y: y - WALL / 2, w: DOOR_W, h: WALL + 6, lado };
}

/* ------------------------------------------------------------------ mapa */
export function buildMap(caseData) {
  const grid = layoutRooms(caseData);
  const rooms = caseData.locations.map(L => {
    const r = rectOf(grid.get(L.id));
    return {
      id: L.id, name: L.name, short: L.short || L.name,
      decor: L.decor || null,
      ambient: L.ambient || { wall: '#3d342b', floor: '#26211b', light: '#ffb46b', dust: 0.5 },
      ...r,
      cx: r.x + r.w / 2, cy: r.y + r.h / 2,
    };
  });

  // portas: uma por ligação (sem duplicar A↔B)
  const doors = [];
  const feitas = new Set();
  for (const L of caseData.locations) {
    for (const n of (L.nav || [])) {
      const dest = typeof n === 'string' ? n : n.to;
      if (!dest) continue;
      const k = [L.id, dest].sort().join('|');
      if (feitas.has(k)) continue;
      const A = rooms.find(r => r.id === L.id), B = rooms.find(r => r.id === dest);
      if (!A || !B) continue;
      feitas.add(k);
      const p = portaEntre(A, B);
      doors.push({ a: L.id, b: dest, ...p, label: (typeof n === 'object' && n.label) || B.short });
    }
  }

  // objetos: coordenadas do caso (1280x720) -> coordenadas do mundo
  const objects = [];
  for (const L of caseData.locations) {
    const R = rooms.find(r => r.id === L.id);
    if (!R) continue;
    const s = Math.min((R.w - 150) / 1280, (R.h - 170) / 720);
    const ox = R.x + (R.w - 1280 * s) / 2;
    const oy = R.y + (R.h - 720 * s) / 2;
    for (const o of (L.objects || [])) {
      objects.push({
        ...o,
        room: L.id,
        x: ox + o.x * s, y: oy + o.y * s, w: o.w * s, h: o.h * s,
        cx: ox + (o.x + o.w / 2) * s, cy: oy + (o.y + o.h / 2) * s,
      });
    }
  }

  // pontos de entrada (spawn) e pontos de espera dos NPCs
  const spawns = rooms.map(R => ({
    room: R.id,
    x: R.cx + (Math.random() - 0.5) * 120,
    y: R.cy + (Math.random() - 0.5) * 120,
  }));

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rooms) {
    minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
  }
  const pad = 120;
  return {
    id: caseData.id,
    rooms, doors, objects, spawns,
    x: minX - pad, y: minY - pad,
    w: (maxX - minX) + pad * 2,
    h: (maxY - minY) + pad * 2,
  };
}

/* -------------------------------------------------------------- consultas */
export function roomAt(map, x, y) {
  for (const r of map.rooms) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return null;
}

/** Um ponto está dentro da área caminhável (respeitando as paredes)? */
export function walkable(map, x, y, raio = 16) {
  const r = roomAt(map, x, y);
  if (!r) {
    // corredor entre cômodos: só passa se estiver alinhado a uma porta
    for (const d of map.doors) {
      if (x >= d.x - 20 && x <= d.x + d.w + 20 && y >= d.y - 20 && y <= d.y + d.h + 20) return true;
    }
    return false;
  }
  const dentroX = x >= r.x + WALL + raio && x <= r.x + r.w - WALL - raio;
  const dentroY = y >= r.y + WALL + raio && y <= r.y + r.h - WALL - raio;
  if (dentroX && dentroY) return true;
  // encostado numa parede onde existe porta?
  for (const d of map.doors) {
    if (d.a !== r.id && d.b !== r.id) continue;
    if (x >= d.x - 26 && x <= d.x + d.w + 26 && y >= d.y - 26 && y <= d.y + d.h + 26) return true;
  }
  return false;
}

/** Objeto investigável mais próximo dentro do alcance. */
export function nearestObject(map, x, y, alcance = 150) {
  let melhor = null, best = alcance * alcance;
  for (const o of map.objects) {
    const dx = o.cx - x, dy = o.cy - y;
    const d = dx * dx + dy * dy;
    if (d < best) { best = d; melhor = o; }
  }
  return melhor;
}
