/* =============================================================================
   CASOS DE FAMÍLIA — SERVIDOR
   Salas, códigos curtos (FAM-4821), papéis secretos, cronômetro autoritativo,
   votação irreversível, pontuação persistente na sessão e sinalização de voz.

   DOIS TRANSPORTES, MESMAS REGRAS:
     • WebSocket (/ws)  — melhor latência
     • HTTP (/api/*)    — ações por POST + long-poll; entra quando o túnel/proxy
                          não repassa o Upgrade do WebSocket
   ========================================================================== */

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';

import {
  createState, addPlayer, removePlayer, startGame, applyAction,
  checkTimedEvents, timeLeft, META, getCase, CASES
} from '../public/shared/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '512kb' }));
app.use(express.static(PUBLIC, { maxAge: 0 }));
app.get('/healthz', (_, res) => res.json({ ok: true, rooms: rooms.size, uptime: process.uptime(), game: 'casos-de-familia' }));

/* Configuração de ICE para o chat de voz (WebRTC).
   Por padrão usa STUN público. Para funcionar em redes de celular mais
   restritivas, defina TURN_URL / TURN_USER / TURN_PASS no ambiente.        */
app.get('/api/ice', (req, res) => {
  const ice = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (process.env.TURN_URL) {
    ice.push({
      urls: process.env.TURN_URL.split(',').map(u => u.trim()),
      username: process.env.TURN_USER || '',
      credential: process.env.TURN_PASS || ''
    });
  }
  res.json({ iceServers: ice });
});
app.get('/api/cases', (_, res) => res.json({
  cases: CASES.map(c => ({ id: c.id, code: c.code, title: c.title, place: c.place, date: c.date }))
}));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/** code -> { state, sockets: Map<pid, conn>, timer } */
const rooms = new Map();
const conns = new WeakMap();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rand = (n) => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

function newCode() {
  let c;
  do { c = `FAM-${rand(4)}`; } while (rooms.has(c));
  return c;
}
/** aceita "FAM-4821", "fam4821" ou "4821" */
function normalizeCode(raw) {
  let s = String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (/^[A-Z0-9]{4}$/.test(s)) s = 'FAM-' + s;
  else if (/^FAM[A-Z0-9]{4}$/.test(s)) s = 'FAM-' + s.slice(3);
  else if (/^[A-Z]{3}[A-Z0-9]{4}$/.test(s)) s = s.slice(0, 3) + '-' + s.slice(3);
  return s;
}

/* ------------------------------------------------------------------ conns */
function newConn(ws) {
  return {
    kind: ws ? 'ws' : 'http', ws: ws || null,
    code: null, playerId: null,
    outbox: [], seq: 0, waiters: [], tick: null,
    lastSeen: Date.now(), capture: null
  };
}
function send(ws, obj) { if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(obj)); } catch {} } }

function deliver(conn, obj) {
  if (!conn) return;
  if (conn.kind === 'ws') { send(conn.ws, obj); return; }
  if (conn.capture) { conn.capture.push(obj); if (obj.type === 'error') return; }
  if (obj.type === 'tick') { conn.tick = obj; return; }
  conn.seq++;
  conn.outbox.push({ seq: conn.seq, msg: obj });
  if (conn.outbox.length > 80) conn.outbox.shift();
  const w = conn.waiters.shift(); if (w) w();
}
function broadcast(room, obj, except) {
  for (const [pid, conn] of room.sockets) if (pid !== except) deliver(conn, obj);
}
function pushState(room, events = []) {
  for (const [pid, conn] of room.sockets) {
    deliver(conn, { type: 'state', state: publicState(room.state, pid), events, t: Date.now() });
  }
}
function playerLeft(room, pid, conn) {
  room.sockets.delete(pid);
  const p = room.state.players[pid];
  if (p) {
    if (room.state.phase !== 'lobby' && room.state.phase !== 'ended') p.online = false;
    else removePlayer(room.state, pid);
    pushState(room, [{ type: 'log', text: `${p.name} deixou a investigação.` }]);
  }
  if (conn && conn.ws) conns.delete(conn.ws);
  cleanupRoom(room.code);
}
function cleanupRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  if (room.sockets.size === 0) {
    clearInterval(room.timer);
    rooms.delete(code);
    console.log(`[sala ${code}] encerrada (vazia)`);
  }
}

/* ------------------------------------------------------------ WebSocket */
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
    const conn = conns.get(ws) || newConn(ws);
    try { handle(conn, msg); }
    catch (err) { console.error('[erro]', err); send(ws, { type: 'error', msg: 'Erro interno.' }); }
  });
  ws.on('close', () => {
    const conn = conns.get(ws);
    if (!conn) return;
    const room = rooms.get(conn.code);
    if (room) playerLeft(room, conn.playerId, conn);
  });
});

/* ------------------------------------------------------- transporte HTTP */
app.post('/api/create', (req, res) => {
  const conn = newConn(null);
  conn.capture = [];
  try { doCreate(conn, req.body || {}); }
  catch (err) { console.error('[erro]', err); return res.json({ type: 'error', msg: 'Erro interno.' }); }
  const w = conn.capture.find(m => m.type === 'welcome');
  conn.capture = null;
  if (!w) return res.json({ type: 'error', msg: 'Não foi possível criar a sala.' });
  res.json(w);
});

app.post('/api/join', (req, res) => {
  const conn = newConn(null);
  conn.capture = [];
  try { doJoin(conn, req.body || {}); }
  catch (err) { console.error('[erro]', err); return res.json({ type: 'error', msg: 'Erro interno.' }); }
  const err = conn.capture.find(m => m.type === 'error');
  const w = conn.capture.find(m => m.type === 'welcome');
  conn.capture = null;
  if (err || !w) return res.json({ type: 'error', msg: err ? err.msg : 'Não foi possível entrar.' });
  res.json(w);
});

app.post('/api/act', (req, res) => {
  const code = normalizeCode(req.body?.code);
  const room = rooms.get(code);
  if (!room) return res.json({ ok: false, msg: 'Sala não encontrada.' });
  const conn = room.sockets.get(req.body?.pid);
  if (!conn || conn.kind !== 'http') return res.json({ ok: false, msg: 'Conexão expirada. Recarregue a página.' });
  conn.lastSeen = Date.now();
  conn.capture = [];
  try { handle(conn, req.body.msg || {}); }
  catch (err) { console.error('[erro]', err); }
  const err = conn.capture.find(m => m.type === 'error');
  conn.capture = null;
  res.json(err ? { ok: false, msg: err.msg } : { ok: true });
});

app.get('/api/poll', (req, res) => {
  const code = normalizeCode(req.query.code);
  const pid = String(req.query.pid || '');
  const room = rooms.get(code);
  if (!room) return res.json({ gone: true });
  const conn = room.sockets.get(pid);
  if (!conn || conn.kind !== 'http') return res.json({ gone: true });
  conn.lastSeen = Date.now();
  const since = Number(req.query.since || 0);

  const responder = () => {
    if (res.headersSent) return;
    const msgs = conn.outbox.filter(m => m.seq > since);
    const last = conn.outbox.length ? conn.outbox[conn.outbox.length - 1].seq : since;
    res.json({ msgs, seq: last, t: Date.now(), left: timeLeft(room.state), phase: room.state.phase });
  };
  if (conn.outbox.some(m => m.seq > since)) return responder();

  let done = false;
  const finish = () => {
    if (done) return;
    done = true; clearTimeout(to);
    const i = conn.waiters.indexOf(finish); if (i >= 0) conn.waiters.splice(i, 1);
    responder();
  };
  const to = setTimeout(finish, 10000);
  conn.waiters.push(finish);
  req.on('close', finish);
});

/* ------------------------------------------------------------- handlers */
/* --------------------------------------------------- estado por jogador
   NUNCA enviamos o estado bruto: ele contém killerId, os traços/álibis de
   todos, os objetivos do assassino e o teor dos sussurros. Cada conexão
   recebe uma visão filtrada — só o dono vê o próprio papel secreto.      */
function publicState(state, pid) {
  const s = { ...state };
  const ended = state.phase === 'ended';

  // papéis: durante a partida, só o próprio jogador vê o seu
  const roles = {};
  for (const [id, r] of Object.entries(state.roles || {})) {
    if (ended) roles[id] = { role: r.role, label: r.label, profileId: r.profileId, traits: r.traits };
    else if (id === pid) roles[id] = { label: r.label };
    else roles[id] = {};
  }
  s.roles = roles;
  s.secret = state.roles?.[pid] || null;

  // identidade do assassino: só no resultado final
  if (!ended) s.killerId = null;

  // votos: cada um vê apenas o seu (o total é público); todos são abertos no fim
  const v = {};
  if (ended) Object.assign(v, state.votes || {});
  else if (state.votes && state.votes[pid] != null) v[pid] = state.votes[pid];
  s.votes = v;
  s.voteCount = Object.keys(state.votes || {}).length;

  // sussurros: só as conversas deste jogador (no fim, todos são revelados)
  const wh = {};
  for (const [key, arr] of Object.entries(state.whispers || {})) {
    if (ended || key.split('|').includes(pid)) wh[key] = arr;
  }
  s.whispers = wh;

  return s;
}

function welcomePayload(conn, code, pid, room) {
  return {
    type: 'welcome', code, playerId: pid, state: publicState(room.state, pid),
    t: Date.now(), serverTime: Date.now(),
    secret: room.state.roles[pid] || null
  };
}

function doCreate(conn, msg) {
  const code = newCode();
  const caseId = CASES.some(c => c.id === msg.caseId) ? msg.caseId : CASES[0].id;
  const state = createState({ caseId, solo: msg.solo === true });
  const pid = 'p_' + Math.random().toString(36).slice(2, 9);
  const room = { code, state, sockets: new Map(), timer: setInterval(() => tick(room), 500) };
  rooms.set(code, room);
  conn.code = code; conn.playerId = pid;
  room.sockets.set(pid, conn);
  if (conn.ws) conns.set(conn.ws, conn);
  addPlayer(state, pid, msg.name, msg.avatar);
  console.log(`[sala ${code}] criada por ${state.players[pid].name} (${conn.kind}) caso=${caseId}`);
  deliver(conn, welcomePayload(conn, code, pid, room));
  pushState(room, [{ type: 'log', text: `${state.players[pid].name} abriu o caso.` }]);
}

function doJoin(conn, msg) {
  const code = normalizeCode(msg.code);
  const room = rooms.get(code);
  if (!room) return deliver(conn, { type: 'error', msg: 'Sala não encontrada. Confira o código.' });
  if (room.state.phase === 'ended' && !msg.playerId) {
    return deliver(conn, { type: 'error', msg: 'Este caso já foi encerrado.' });
  }
  if (room.state.order.length >= META.maxPlayers && !(msg.playerId && room.state.players[msg.playerId])) {
    return deliver(conn, { type: 'error', msg: `A sala está cheia (máx. ${META.maxPlayers} jogadores).` });
  }
  let pid = msg.playerId && room.state.players[msg.playerId] ? msg.playerId : null;
  if (!pid) {
    pid = 'p_' + Math.random().toString(36).slice(2, 9);
    addPlayer(room.state, pid, msg.name, msg.avatar);
  } else {
    const p = room.state.players[pid];
    if (p) { p.online = true; if (msg.name) p.name = String(msg.name).slice(0, 14); }
  }
  if (msg.avatar) room.state.avatars[pid] = msg.avatar === 'f' ? 'f' : 'm';
  room.sockets.set(pid, conn);
  conn.code = code; conn.playerId = pid;
  if (conn.ws) conns.set(conn.ws, conn);
  deliver(conn, welcomePayload(conn, code, pid, room));
  pushState(room, [{ type: 'log', text: `${room.state.players[pid].name} entrou na investigação.` }]);
  console.log(`[sala ${code}] ${room.state.players[pid].name} entrou (${room.state.order.length}, ${conn.kind})`);
}

function handle(conn, msg) {
  if (msg.type === 'create') return doCreate(conn, msg);
  if (msg.type === 'join') return doJoin(conn, msg);

  const room = rooms.get(conn.code);
  if (!room) return;
  const state = room.state;
  const ctx = { playerId: conn.playerId, name: state.players[conn.playerId]?.name };

  /* ---- sinalização de voz (WebRTC) — só repassa, nunca interpreta ------ */
  if (msg.type === 'signal') {
    const target = room.sockets.get(msg.to);
    if (target) deliver(target, { type: 'signal', from: conn.playerId, data: msg.data });
    return;
  }

  if (msg.type === 'start') {
    if (conn.playerId !== state.host) return deliver(conn, { type: 'error', msg: 'Só o anfitrião pode começar.' });
    if (state.phase !== 'lobby') return;
    startGame(state, { caseId: msg.caseId, duration: msg.duration });
    pushState(room, [{ type: 'briefing' }]);
    return;
  }

  if (msg.type === 'kick') {
    if (conn.playerId !== state.host) return;
    const target = room.sockets.get(msg.playerId);
    if (target && msg.playerId !== state.host) {
      const victim = state.players[msg.playerId];
      if (victim) { state.order = state.order.filter(id => id !== msg.playerId); delete state.players[msg.playerId]; }
      deliver(target, { type: 'kicked' });
      if (target.ws) target.ws.close(); else playerLeft(room, msg.playerId, target);
      pushState(room, [{ type: 'log', text: `${victim?.name || 'Jogador'} foi removido.` }]);
    }
    return;
  }

  if (msg.type === 'restart') {
    if (conn.playerId !== state.host) return;
    const scores = { ...state.scores };
    const avatars = { ...state.avatars };
    const names = {}; for (const id of state.order) names[id] = state.players[id]?.name;
    const fresh = createState({ caseId: msg.caseId || state.caseId });
    for (const id of state.order) {
      if (!names[id]) continue;
      addPlayer(fresh, id, names[id], avatars[id]);
      fresh.scores[id] = scores[id] || 0;
    }
    fresh.host = state.host;
    room.state = fresh;
    for (const [pid, c] of room.sockets) { c.code = room.code; c.playerId = pid; if (c.ws) conns.set(c.ws, c); }
    pushState(room, [{ type: 'log', text: 'Novo caso sorteado. A sala continua.' }, { type: 'restarted' }]);
    return;
  }

  if (msg.type === 'leave') return playerLeft(room, conn.playerId, conn);

  if (msg.type === 'pong') { if (conn.ws) conn.ws.isAlive = true; conn.lastSeen = Date.now(); return; }

  /* ---- ações de jogo (validadas pela engine) --------------------------- */
  if (msg.type === 'action') {
    /* Gancho só para testes automatizados (exige TEST_HOOKS=1 no ambiente):
       encurta o cronômetro para validar o fim por tempo. */
    if (msg.action?.type === '__test_fastforward') {
      if (process.env.TEST_HOOKS !== '1') return;
      if (state.phase !== 'playing' && state.phase !== 'voting') return;
      state.endAt = Date.now() + Math.max(500, Number(msg.action.ms) || 3000);
      pushState(room, [{ type: 'log', text: 'cronômetro encurtado (teste)' }]);
      return;
    }
    const before = state.phase;
    const res = applyAction(state, msg.action, ctx);
    if (!res.ok && res.msg) deliver(conn, { type: 'error', msg: res.msg });
    if (res.events?.length || res.ok || before !== state.phase) pushState(room, res.events || []);
    return;
  }

  if (msg.type === 'chat') {
    const p = state.players[conn.playerId];
    state.chat.push({
      id: conn.playerId, name: p?.name || '?', color: p?.color || '#fff',
      text: String(msg.text || '').slice(0, 160), t: Date.now()
    });
    if (state.chat.length > 60) state.chat.shift();
    pushState(room, []);
    return;
  }
}

/* ----------------------------------------------------------------- tick */
function tick(room) {
  const state = room.state;
  if (state.phase !== 'playing') {
    broadcast(room, { type: 'tick', t: Date.now(), left: timeLeft(state), phase: state.phase });
    return;
  }
  const out = [];
  const before = state.phase;
  checkTimedEvents(state, out);
  if (out.length || before !== state.phase) pushState(room, out);
  else broadcast(room, { type: 'tick', t: Date.now(), left: timeLeft(state), phase: state.phase });
}

/* Varredura: jogador HTTP que para de buscar atualizações sai da sala. */
setInterval(() => {
  for (const [code, room] of [...rooms]) {
    for (const [pid, conn] of [...room.sockets]) {
      if (conn.kind === 'http' && Date.now() - conn.lastSeen > 45000) {
        console.log(`[sala ${code}] ${room.state.players[pid]?.name || pid} inativo (http)`);
        playerLeft(room, pid, conn);
      }
    }
    cleanupRoom(code);
  }
}, 15000);

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  }
}, 20000);
wss.on('close', () => clearInterval(heartbeat));

app.get('*', (_, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

server.listen(PORT, '0.0.0.0', () => {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
  }
  console.log('\n  ┌───────────────────────────────────────────────┐');
  console.log('  │  CASOS DE FAMÍLIA — servidor                 │');
  console.log('  └───────────────────────────────────────────────┘');
  console.log(`\n  Neste computador :  http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  Celulares (Wi-Fi):  http://${ip}:${PORT}`));
  console.log(`\n  Casos: ${CASES.map(c => c.id).join(', ')}`);
  console.log(`  Transportes: WebSocket /ws  +  HTTP /api (long-poll)`);
  console.log(`  Voz: WebRTC (STUN${process.env.TURN_URL ? ' + TURN configurado' : ' — defina TURN_URL para redes móveis restritivas'})`);
  console.log(`  Salas ativas: ${rooms.size}\n`);
});
