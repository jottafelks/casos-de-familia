/* =============================================================================
   CASOS DE FAMÍLIA — ENGINE (regras puras)
   -----------------------------------------------------------------------------
   Usada PELO SERVIDOR (autoridade) e PELO CLIENTE (modo solo offline).
   Nenhuma regra de jogo vive fora daqui: online e offline nunca divergem.

   Fases:  lobby → briefing → playing → voting → ended
   ========================================================================== */

import { CASES, getCase, getObject, getLocation, getClue, getWitness, DEFAULT_CASE_ID } from './cases.js';
import { buildMap, walkable } from './maps.js';

export const META = {
  maxPlayers: 6,
  minPlayers: 1,
  durationSmall: 5 * 60 * 1000,   // 1–2 jogadores
  durationBig: 10 * 60 * 1000,    // 3–6 jogadores
  defaultDuration: 10 * 60 * 1000,
  score: {
    investigatorRight: 100,
    investigatorWrong: -50,
    killerCaught: -100,
    killerEscaped: 150
  },
  killCooldown: 40 * 1000,        // intervalo mínimo entre ataques
  killGrace: 25 * 1000,           // trégua no início da partida
  killDist: 150,                  // só mata quem está ao lado (px do mundo)
  witnessDist: 340,               // alcance para testemunhar um assassinato
  bodySight: 300,                 // distância para avistar um corpo
  meetingTime: 150 * 1000         // duração máxima de uma reunião
};

export const PLAYER_COLORS = ['#ff7a59', '#59d4ff', '#8ef58a', '#ffd166', '#c792ea', '#ff8fc7'];

export { CASES, getCase, getObject, getLocation, getClue, getWitness, DEFAULT_CASE_ID };

/* ------------------------------------------------------------------ estado */
export function createState(opts = {}) {
  return {
    phase: 'lobby',                 // lobby | briefing | playing | voting | ended
    result: null,                   // investigators | killer
    endReason: null,                // time | vote | solo
    caseId: opts.caseId || DEFAULT_CASE_ID,
    createdAt: Date.now(),
    startedAt: null,
    duration: opts.duration || META.defaultDuration,
    endAt: null,
    penaltyMs: 0,
    solo: !!opts.solo,
    minEvidence: 0,

    players: {},
    order: [],
    host: null,
    ready: {},                      // pid -> true
    avatars: {},                    // pid -> 'm' | 'f'

    roles: {},                      // pid -> papel secreto
    killerId: null,

    clues: [],                      // pistas da equipe
    foundBy: {},
    marks: {},                      // clueId -> { pid: 'important'|'doubt'|'confirmed' }
    talked: {},                     // 'charId:topicId' -> true

    votes: {},                      // pid -> alvo (IRREVERSÍVEL)
    scores: {},                     // pid -> pontos (persistente na sessão; pode negativar)
    rounds: 0,

    whispers: {},                   // 'a|b' -> [{from,text,t}]
    whisperLog: [],                 // [{a,b,t}]
    whisperPair: {},                // pid -> parceiro (papo secreto ativo)

    /* ---- assassinatos, corpos e reuniões (investigação com assassino) ---- */
    dead: {},                       // pid -> true (morto durante a partida)
    corpses: [],                    // {id, victim, name, color, room, x, y, t, found, foundBy, seenBy}
    meeting: null,
    lastMeeting: null,
    killReadyAt: 0,                 // quando o assassino pode agir de novo
    emergencyUsed: {},              // pid -> true (o botão de emergência é único)
    frozenLeft: null,               // cronômetro congelado durante a reunião
    deathCause: {},                 // pid -> {by, t, room}

    flags: {}, opened: {}, taken: {}, firedEvents: {},
    chat: [], log: [],
    reveal: null
  };
}

export function addPlayer(state, id, name, avatar) {
  const idx = state.order.length;
  state.players[id] = {
    id, name: (name || ('Jogador ' + (idx + 1))).slice(0, 14),
    color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
    scene: currentCase(state).locations[0].id,
    pos: null,          // {x, y, room} — posição no mundo (quando o mapa está ativo)
    online: true, joinedAt: Date.now()
  };
  if (!state.order.includes(id)) state.order.push(id);
  if (state.host === null) state.host = id;
  if (state.scores[id] === undefined) state.scores[id] = 0;
  if (avatar) state.avatars[id] = avatar;
  state.ready[id] = false;
  return state.players[id];
}

export function removePlayer(state, id) {
  delete state.players[id];
  state.order = state.order.filter(p => p !== id);
  delete state.ready[id];
  if (state.host === id) state.host = state.order[0] || null;
}

export function currentCase(state) { return getCase(state.caseId); }

/* ------------------------------------------------------- sorteio dos papéis */
function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pairKey = (a, b) => [a, b].sort().join('|');

/** Sorteia 2 objetivos secretos para o assassino — nunca um que mande
 *  incriminar o próprio perfil dele (isso não faria sentido). */
function pickObjectives(objectives, ownProfileId) {
  const pool = objectives.filter(o => !(o.kind === 'frame' && o.target === ownProfileId));
  return pool.slice(0, 2).map(o => o.id);
}


export function assignRoles(state, rnd = Math.random) {
  const CASE = currentCase(state);
  const pids = state.order.slice();
  const roles = shuffle(CASE.roles, rnd);
  const objectives = shuffle(CASE.objectives, rnd);

  state.roles = {};
  state.killerId = null;
  const solo = pids.length <= 1;
  /* O assassino é um JOGADOR sorteado ao acaso — nunca um perfil fixo do caso.
     Assim o rótulo público do perfil não entrega nada e o cargo de culpado
     muda de mão a cada partida. */
  const killerPos = solo ? -1 : Math.floor(rnd() * Math.max(1, pids.length));

  pids.forEach((pid, i) => {
    const profile = roles[i % roles.length];
    const isKiller = i === killerPos;
    state.roles[pid] = {
      role: isKiller ? 'killer' : 'investigator',
      profileId: profile.id,
      label: profile.label,
      traits: profile.traits.slice(),
      alibi: profile.alibi,
      secret: profile.secret,
      objectives: isKiller ? pickObjectives(objectives, profile.id) : [],
      done: []
    };
    if (isKiller) state.killerId = pid;
  });

  // modo solo: não há assassino entre os jogadores — o culpado é um personagem
  if (solo) state.killerId = null;

  // segurança: com 2+ jogadores precisa existir exatamente um assassino
  if (!solo && !state.killerId && pids.length > 1) {
    const first = pids[0];
    state.roles[first].role = 'killer';
    state.roles[first].objectives = objectives.slice(0, 2).map(o => o.id);
    state.killerId = first;
  }

  state.minEvidence = (pids.length <= 2) ? (CASE.minEvidence || 6) : 0;
  return state.roles;
}

export function startGame(state, opts = {}) {
  const n = state.order.length;
  state.duration = opts.duration || (n <= 2 ? META.durationSmall : META.durationBig);
  state.phase = 'briefing';
  state.startedAt = Date.now();
  state.endAt = null;              // o relógio só corre depois do briefing
  state.penaltyMs = 0;
  state.votes = {};
  state.clues = [];
  state.foundBy = {};
  state.marks = {};
  state.talked = {};
  state.whispers = {};
  state.whisperLog = [];
  state.whisperPair = {};
  state.firedEvents = [];
  state.flags = {};
  state.opened = {};
  state.result = null;
  state.endReason = null;
  state.reveal = null;
  state.rounds = (state.rounds || 0) + 1;
  /* nova partida: limpa mortes, corpos e reuniões da anterior */
  state.dead = {};
  state.corpses = [];
  state.meeting = null;
  state.lastMeeting = null;
  state.killReadyAt = 0;
  state.emergencyUsed = {};
  state.frozenLeft = null;
  state.deathCause = {};
  for (const pid of state.order) { const p = state.players[pid]; if (p) p.pos = null; }
  if (opts.caseId) state.caseId = opts.caseId;
  assignRoles(state);
  return state;
}

/* ------------------------------------------- mundo: geometria e linha de visão */
const _mapas = new Map();
export function mapaDoCaso(state) {
  const id = state.caseId || DEFAULT_CASE_ID;
  if (!_mapas.has(id)) _mapas.set(id, buildMap(getCase(id) || currentCase(state)));
  return _mapas.get(id);
}
/** true se não há parede entre os dois pontos */
export function linhaDeVisao(map, ax, ay, bx, by, passo = 16) {
  const d = Math.hypot(bx - ax, by - ay);
  if (d < 2) return true;
  const n = Math.max(1, Math.ceil(d / passo));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (!walkable(map, ax + (bx - ax) * t, ay + (by - ay) * t, 4)) return false;
  }
  return true;
}
/** jogadores vivos (que ainda podem agir) */
export function vivos(state) { return state.order.filter(pid => !state.dead[pid]); }
export function investigadoresVivos(state) {
  return state.order.filter(pid => !state.dead[pid] && state.roles[pid]?.role !== 'killer').length;
}
/** quem assistiu ao assassinato: mesmo cômodo, perto e com linha de visão */
export function testemunhasDe(state, killerId, victimId) {
  const mapa = mapaDoCaso(state);
  const v = state.players[victimId];
  if (!v || !v.pos) return [];
  const lista = [];
  for (const pid of state.order) {
    if (pid === killerId || pid === victimId) continue;
    if (state.dead[pid]) continue;
    const p = state.players[pid];
    if (!p || !p.pos) continue;
    if (p.pos.room !== v.pos.room) continue;
    const d = Math.hypot(p.pos.x - v.pos.x, p.pos.y - v.pos.y);
    if (d > META.witnessDist) continue;
    if (!linhaDeVisao(mapa, p.pos.x, p.pos.y, v.pos.x, v.pos.y)) continue;
    lista.push(pid);
  }
  return lista;
}
/** corpos que este jogador ainda não avistou mas deveria ver agora */
export function corposAvistados(state, pid) {
  const p = state.players[pid];
  if (!p || !p.pos || state.dead[pid] === undefined && false) return [];
  const mapa = mapaDoCaso(state);
  const novos = [];
  for (const c of state.corpses) {
    if (c.seenBy?.[pid]) continue;
    if (c.room !== p.pos.room) continue;
    if (Math.hypot(p.pos.x - c.x, p.pos.y - c.y) > META.bodySight) continue;
    if (!linhaDeVisao(mapa, p.pos.x, p.pos.y, c.x, c.y)) continue;
    c.seenBy = c.seenBy || {}; c.seenBy[pid] = true;
    novos.push(c);
  }
  return novos;
}

/* --------------------------------------------------- reuniões e eliminações */
function congelarCronometro(state) {
  if (state.frozenLeft == null) state.frozenLeft = timeLeft(state);
}
function descongelarCronometro(state) {
  if (state.frozenLeft != null) {
    state.endAt = Date.now() + state.frozenLeft + state.penaltyMs;
    state.frozenLeft = null;
  }
}
export function iniciarReuniao(state, info) {
  congelarCronometro(state);
  state.phase = 'meeting';
  state.meeting = {
    by: info.by, byName: state.players[info.by]?.name || 'Alguém',
    reason: info.reason,                     // 'body' | 'button'
    corpseId: info.corpseId || null,
    room: info.room || null,
    at: Date.now(), endsAt: Date.now() + META.meetingTime,
    votes: {}, chat: [], result: null,
    presentes: vivos(state).map(pid => ({
      pid, name: state.players[pid]?.name || '?',
      room: state.players[pid]?.pos?.room || state.players[pid]?.scene || '?',
      color: state.players[pid]?.color || '#ccc', sou: false
    }))
  };
  return state.meeting;
}
export function encerrarReuniao(state) {
  if (!state.meeting) return null;
  state.meeting.endedAt = Date.now();
  descongelarCronometro(state);
  state.lastMeeting = state.meeting;
  state.meeting = null;
  state.phase = 'playing';
  state.killReadyAt = Math.max(state.killReadyAt || 0, Date.now() + 12000); // trégua ao voltar
  return state.lastMeeting;
}
/** conta os votos da reunião, elimina (ou não) e encerra */
export function resolverReuniao(state) {
  const m = state.meeting;
  if (!m) return [];
  const out = [];
  for (const pid of vivos(state)) if (m.votes[pid] === undefined) m.votes[pid] = null; // quem não votou, pulou
  const count = {}; let skip = 0;
  for (const v of Object.values(m.votes)) { if (v == null) skip++; else count[v] = (count[v] || 0) + 1; }
  let expelled = null, maior = 0, empate = false;
  for (const [pid, n] of Object.entries(count)) {
    if (n > maior) { maior = n; expelled = pid; empate = false; }
    else if (n === maior) empate = true;
  }
  if (empate || maior <= skip) expelled = null;
  m.result = { expelled, votes: count, skip, wasKiller: false };
  if (expelled) {
    state.dead[expelled] = true;
    m.result.wasKiller = state.roles[expelled]?.role === 'killer';
    m.result.expelledName = state.players[expelled]?.name;
    state.log.push({ t: Date.now(), text: `${m.result.expelledName} foi retirado da investigação.`, kind: 'sys' });
  }
  out.push({ type: 'meetingEnd', expelled, name: expelled ? state.players[expelled]?.name : null, wasKiller: m.result.wasKiller, votes: count, skip });
  encerrarReuniao(state);
  if (expelled && expelled === state.killerId) finalizarPartida(state, 'investigators', 'meeting');
  else if (investigadoresVivos(state) === 0) finalizarPartida(state, 'killer', 'wiped');
  if (state.phase === 'ended') out.push({ type: 'end', result: state.result });
  return out;
}
/** encerra a partida fora da votação final (assassinato ou eliminação) */
function finalizarPartida(state, result, reason) {
  const CASE = currentCase(state);
  const killer = state.killerId;
  const deltas = {};
  const bump = (pid, d) => { deltas[pid] = (deltas[pid] || 0) + d; state.scores[pid] = (state.scores[pid] || 0) + d; };
  if (killer) {
    for (const pid of state.order) {
      if (pid === killer) continue;
      bump(pid, result === 'investigators' ? META.score.investigatorRight : META.score.investigatorWrong);
    }
    bump(killer, result === 'investigators' ? META.score.killerCaught : META.score.killerEscaped);
    const objetivos = evaluateObjectives(state, CASE);
    if (result !== 'investigators') for (const o of objetivos) if (o.done) bump(killer, o.points);
  } else if (state.order[0]) {
    bump(state.order[0], result === 'investigators' ? META.score.investigatorRight : META.score.investigatorWrong);
  }
  state.phase = 'ended';
  state.result = result;
  state.endReason = reason;
  state.reveal = {
    killerId: killer,
    killerName: killer ? state.players[killer]?.name : null,
    killerLabel: killer ? state.roles[killer]?.label : null,
    npcKiller: CASE.solution?.npcKiller,
    revealText: killer ? CASE.solution?.reveal : CASE.solution?.npcReveal,
    revealTraits: killer ? (state.roles[killer]?.traits || []).map(t => CASE.traits?.[t]).filter(Boolean) : [],
    votes: {}, deltas, objectives: []
  };
  return state.reveal;
}

export function beginPlay(state) {
  if (state.phase !== 'briefing') return false;
  state.phase = 'playing';
  state.startedAt = Date.now();
  state.endAt = state.startedAt + state.duration;
  state.killReadyAt = Date.now() + META.killGrace;
  state.log.push({ t: Date.now(), text: 'A investigação começou.', kind: 'sys' });
  return true;
}

export function timeLeft(state) {
  if (!state.endAt) return state.duration;
  return Math.max(0, state.endAt - state.penaltyMs - Date.now());
}
export function timeFraction(state) {
  if (!state.endAt) return 0;
  return Math.min(1, Math.max(0, 1 - timeLeft(state) / state.duration));
}

/* --------------------------------------------------------------- efeitos */
export function applyEffects(state, effects, ctx, out) {
  for (const e of effects || []) {
    switch (e.t) {
      case 'clue':
        if (!state.clues.includes(e.id)) {
          state.clues.push(e.id);
          state.foundBy[e.id] = ctx.playerId;
          const c = getClue(currentCase(state), e.id);
          out.push({ type: 'clue', id: e.id, by: ctx.name, text: c ? c.text : '', level: c ? c.level : 'medio' });
        }
        break;
      case 'flag': state.flags[e.k] = e.v; out.push({ type: 'flag', k: e.k, v: e.v }); break;
      case 'open': state.opened[ctx.scene + ':' + ctx.objId] = true; break;
      case 'sfx': out.push({ type: 'sfx', id: e.id }); break;
      case 'fx': out.push({ type: 'fx', id: e.id }); break;
      case 'nothing': out.push({ type: 'say', text: e.text }); break;
      case 'say': out.push({ type: 'say', text: e.text }); break;
      case 'log':
        state.log.push({ t: Date.now(), text: (ctx.name ? ctx.name + ' ' : '') + e.text });
        out.push({ type: 'log', text: (ctx.name ? ctx.name + ' ' : '') + e.text });
        break;
    }
  }
  return out;
}

/* ------------------------------------------------------------- resolução */
function tallyVotes(state) {
  const count = {};
  for (const target of Object.values(state.votes)) count[target] = (count[target] || 0) + 1;
  return count;
}

function evaluateObjectives(state, CASE) {
  const killer = state.killerId;
  const res = [];
  if (!killer) return res;
  const role = state.roles[killer] || {};
  const count = tallyVotes(state);

  for (const id of role.objectives || []) {
    const obj = (CASE.objectives || []).find(o => o.id === id);
    if (!obj) continue;
    let done = false;
    if (obj.kind === 'frame') {
      // incriminar OUTRA pessoa: o alvo tem de ser o mais votado e não pode ser o próprio assassino
      const targetPid = Object.keys(state.roles).find(pid => state.roles[pid].profileId === obj.target);
      const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
      done = !!(targetPid && targetPid !== killer && best && best[0] === targetPid && best[1] >= 2);
    } else if (obj.kind === 'hide') {
      done = !state.clues.includes(obj.clue);
    } else if (obj.kind === 'two_votes') {
      // convencer pelo menos duas pessoas a votar em alguém que NÃO seja o assassino
      done = Object.entries(count).some(([pid, v]) => v >= 2 && pid !== killer);
    } else if (obj.kind === 'not_whispered') {
      done = !state.whisperLog.some(w => w.a === killer || w.b === killer);
    }
    res.push({ id: obj.id, text: obj.text, points: obj.points, done });
  }
  return res;
}

export function resolveVotes(state, reason = 'vote') {
  const CASE = currentCase(state);
  const count = tallyVotes(state);
  const killer = state.killerId;
  const deltas = {};
  const bump = (pid, d) => { deltas[pid] = (deltas[pid] || 0) + d; state.scores[pid] = (state.scores[pid] || 0) + d; };

  let result;
  if (killer) {
    const votesOnKiller = count[killer] || 0;
    const voters = Object.keys(state.votes).length || 1;
    const needed = Math.max(1, Math.ceil(state.order.length / 2));
    result = (votesOnKiller >= needed) ? 'investigators' : 'killer';

    for (const pid of state.order) {
      if (pid === killer) continue;
      const votedRight = state.votes[pid] === killer;
      bump(pid, votedRight ? META.score.investigatorRight : META.score.investigatorWrong);
    }
    bump(killer, result === 'investigators' ? META.score.killerCaught : META.score.killerEscaped);
  } else {
    // solo: o jogador acusa um personagem
    const pid = state.order[0];
    const target = state.votes[pid];
    result = (target === CASE.solution.npcKiller) ? 'investigators' : 'killer';
    if (pid) bump(pid, result === 'investigators' ? META.score.investigatorRight : META.score.investigatorWrong);
  }

  const objectives = evaluateObjectives(state, CASE);
  if (killer) {
    for (const o of objectives) if (o.done) bump(killer, o.points);
    state.roles[killer].done = objectives.filter(o => o.done).map(o => o.id);
    /* Quem é pego não sai no lucro: os objetivos amenizam a perda (até zerar),
       mas nunca transformam a derrota em pontos positivos. */
    if (result === 'investigators' && deltas[killer] > 0) {
      state.scores[killer] -= deltas[killer];
      deltas[killer] = 0;
    }
  }

  state.phase = 'ended';
  state.result = result;
  state.endReason = reason;
  state.reveal = {
    killerId: killer,
    killerName: killer ? state.players[killer]?.name : null,
    killerLabel: killer ? state.roles[killer]?.label : null,
    npcKiller: CASE.solution[result === 'investigators' ? 'npcKiller' : 'npcKiller'],
    revealText: killer ? CASE.solution.reveal : CASE.solution.npcReveal,
    revealTraits: killer ? (state.roles[killer]?.traits || []).map(t => CASE.traits?.[t]).filter(Boolean) : [],
    votes: count,
    deltas,
    objectives
  };
  return state.reveal;
}

export function endByTime(state) {
  if (state.phase === 'ended') return state.reveal;
  const CASE = currentCase(state);
  const deltas = {};
  const killer = state.killerId;
  if (killer) {
    state.scores[killer] = (state.scores[killer] || 0) + META.score.killerEscaped;
    deltas[killer] = META.score.killerEscaped;
    for (const pid of state.order) if (pid !== killer) {
      const v = state.votes[pid];
      if (v === killer) { state.scores[pid] = (state.scores[pid] || 0) + META.score.investigatorRight; deltas[pid] = META.score.investigatorRight; }
    }
  } else {
    const pid = state.order[0];
    if (pid && state.votes[pid]) { state.scores[pid] = (state.scores[pid] || 0) + META.score.investigatorWrong; deltas[pid] = META.score.investigatorWrong; }
  }
  state.phase = 'ended';
  state.result = 'killer';
  state.endReason = 'time';
  state.reveal = {
    killerId: killer,
    killerName: killer ? state.players[killer]?.name : null,
    killerLabel: killer ? state.roles[killer]?.label : null,
    revealText: killer ? CASE.solution.reveal : CASE.solution.npcReveal,
    revealTraits: killer ? (state.roles[killer]?.traits || []).map(t => CASE.traits?.[t]).filter(Boolean) : [],
    votes: tallyVotes(state),
    deltas,
    objectives: evaluateObjectives(state, CASE)
  };
  return state.reveal;
}

/* ------------------------------------------------------------------ ações */
export function applyAction(state, action, ctx = {}) {
  const out = [];
  const CASE = currentCase(state);
  const player = state.players[ctx.playerId] || {};
  const cx = { ...ctx, name: player.name || ctx.name || 'Alguém', scene: action.scene || player.scene || CASE.locations[0].id };
  const inPlay = state.phase === 'playing';
  const inBriefing = state.phase === 'briefing';

  /* ---- sala: pronto / avatar ------------------------------------------- */
  if (action.type === 'ready') {
    state.ready[ctx.playerId] = !!action.value;
    return { ok: true, events: [{ type: 'ready', player: ctx.playerId, value: !!action.value }] };
  }
  if (action.type === 'avatar') {
    state.avatars[ctx.playerId] = action.value === 'f' ? 'f' : 'm';
    return { ok: true, events: [{ type: 'avatar', player: ctx.playerId, value: state.avatars[ctx.playerId] }] };
  }

  /* ---- briefing: confirmar leitura -------------------------------------- */
  if (action.type === 'briefingDone') {
    if (!inBriefing) return { ok: false, events: out, msg: 'O briefing já terminou.' };
    state.ready[ctx.playerId] = true;
    out.push({ type: 'ready', player: ctx.playerId, value: true });
    const all = state.order.every(pid => state.ready[pid]);
    if (all && beginPlay(state)) out.push({ type: 'start' });
    return { ok: true, events: out };
  }

  /* ---- posição no mundo (leve: não gera evento nem estado completo) ----- */
  if (action.type === 'pos') {
    const p = state.players[ctx.playerId];
    if (p) p.pos = { x: Number(action.x) || 0, y: Number(action.y) || 0, room: action.room || p.scene };
    return { ok: true, events: [], pos: true };
  }

  /* ---- reunião em andamento ------------------------------------------- */
  if (state.phase === 'meeting' && state.meeting) {
    if (action.type === 'meetingChat') {
      if (state.dead[ctx.playerId]) return { ok: false, events: out, msg: 'Quem já saiu não fala na reunião.' };
      const txt = String(action.text || '').slice(0, 200);
      if (txt) {
        state.meeting.chat.push({ id: ctx.playerId, name: cx.name, color: player.color, text: txt, t: Date.now() });
        if (state.meeting.chat.length > 60) state.meeting.chat.shift();
      }
      return { ok: true, events: out };
    }
    if (action.type === 'vote') {
      const m = state.meeting;
      if (state.dead[ctx.playerId]) return { ok: false, events: out, msg: 'Quem já saiu não vota.' };
      if (m.votes[ctx.playerId] !== undefined) return { ok: false, events: out, msg: 'Seu voto já foi registrado e não pode ser alterado.' };
      const alvo = action.target;
      if (alvo != null) {
        if (!state.players[alvo]) return { ok: false, events: out, msg: 'Suspeito inválido.' };
        if (state.dead[alvo]) return { ok: false, events: out, msg: 'Não se vota em quem já saiu.' };
      }
      m.votes[ctx.playerId] = alvo || null;
      out.push({ type: 'meetingVote', player: ctx.playerId, name: cx.name, target: alvo || null });
      out.push({ type: 'sfx', id: 'stamp' });
      if (vivos(state).every(pid => m.votes[pid] !== undefined)) out.push(...resolverReuniao(state));
      return { ok: true, events: out };
    }
    return { ok: false, events: out, msg: 'A reunião está em andamento.' };
  }

  if (!inPlay) return { ok: false, events: out, msg: 'A investigação não está em andamento.' };

  switch (action.type) {
    /* ---- investigar objeto --------------------------------------------- */
    case 'interact': {
      const obj = getObject(CASE, action.scene, action.objId);
      if (!obj) return { ok: false, events: out, msg: 'Nada a ver aqui.' };
      const act = (obj.actions || []).find(a => a.id === action.actionId);
      if (!act) return { ok: false, events: out, msg: 'Nada a ver aqui.' };
      applyEffects(state, act.effects, { ...cx, scene: action.scene, objId: action.objId }, out);
      if (!out.some(e => e.type === 'clue')) out.push({ type: 'sfx', id: 'paper' });
      return { ok: true, events: out };
    }

    /* ---- assassinato (só o assassino, só perto, sem parede no meio) ------ */
    case 'kill': {
      if (state.roles[ctx.playerId]?.role !== 'killer')
        return { ok: false, events: out, msg: 'Só o assassino pode atacar.' };
      if (state.dead[ctx.playerId]) return { ok: false, events: out, msg: 'Você está fora da jogada.' };
      const alvo = action.target;
      const v = state.players[alvo];
      if (!v || alvo === ctx.playerId) return { ok: false, events: out, msg: 'Alvo inválido.' };
      if (state.dead[alvo]) return { ok: false, events: out, msg: 'Essa pessoa já está fora.' };
      const agora = Date.now();
      if (agora < (state.killReadyAt || 0))
        return { ok: false, events: out, msg: `Aguarde ${Math.ceil((state.killReadyAt - agora) / 1000)}s para agir de novo.` };
      const kp = state.players[ctx.playerId].pos, vp = v.pos;
      if (!kp || !vp) return { ok: false, events: out, msg: 'Aproxime-se da vítima.' };
      const mapa = mapaDoCaso(state);
      const d = Math.hypot(kp.x - vp.x, kp.y - vp.y);
      if (vp.room !== kp.room || d > META.killDist || !linhaDeVisao(mapa, kp.x, kp.y, vp.x, vp.y))
        return { ok: false, events: out, msg: 'Você precisa estar ao lado da vítima, no mesmo cômodo.' };
      state.dead[alvo] = true;
      state.killReadyAt = agora + META.killCooldown;
      state.deathCause[alvo] = { by: ctx.playerId, t: agora, room: vp.room };
      const test = testemunhasDe(state, ctx.playerId, alvo);
      const corpo = {
        id: 'c' + (state.corpses.length + 1) + '-' + alvo.slice(-4), victim: alvo,
        name: v.name, color: v.color, room: vp.room,
        x: Math.round(vp.x), y: Math.round(vp.y), t: agora,
        found: false, foundBy: null, seenBy: {}
      };
      corpo.seenBy[ctx.playerId] = true; corpo.seenBy[alvo] = true;
      for (const w of test) corpo.seenBy[w] = true;
      state.corpses.push(corpo);
      out.push({
        type: 'kill', victim: alvo, name: v.name, by: ctx.playerId,
        room: vp.room, x: corpo.x, y: corpo.y, witnesses: test,
        only: [alvo, ctx.playerId, ...test]          // só a vítima, o assassino e as testemunhas sabem
      });
      out.push({ type: 'sfx', id: 'kill', only: [alvo, ctx.playerId, ...test] });
      if (investigadoresVivos(state) === 0) {
        finalizarPartida(state, 'killer', 'wiped');
        out.push({ type: 'end', result: state.result });
      }
      return { ok: true, events: out };
    }

    /* ---- denunciar um corpo --------------------------------------------- */
    case 'report': {
      if (state.dead[ctx.playerId]) return { ok: false, events: out, msg: 'Quem já saiu não pode denunciar.' };
      if (state.phase !== 'playing') return { ok: false, events: out, msg: 'Agora não.' };
      const corpo = state.corpses.find(c => c.id === action.corpseId && !c.found);
      if (!corpo) return { ok: false, events: out, msg: 'Não há corpo a denunciar.' };
      const p = state.players[ctx.playerId].pos;
      const mapa = mapaDoCaso(state);
      if (!p || p.room !== corpo.room || Math.hypot(p.x - corpo.x, p.y - corpo.y) > META.bodySight + 80)
        return { ok: false, events: out, msg: 'Chegue perto do corpo para denunciar.' };
      corpo.found = true; corpo.foundBy = ctx.playerId; corpo.foundAt = Date.now();
      const m = iniciarReuniao(state, { by: ctx.playerId, reason: 'body', corpseId: corpo.id, room: corpo.room });
      out.push({ type: 'meetingStart', meeting: m, by: m.byName, reason: 'body', room: corpo.room, victim: corpo.name });
      return { ok: true, events: out };
    }

    /* ---- botão de emergência (uma vez por jogador) ----------------------- */
    case 'meeting': {
      if (state.dead[ctx.playerId]) return { ok: false, events: out, msg: 'Quem já saiu não convoca reunião.' };
      if (state.phase !== 'playing') return { ok: false, events: out, msg: 'Agora não.' };
      if (state.emergencyUsed[ctx.playerId]) return { ok: false, events: out, msg: 'Você já usou o botão de emergência.' };
      state.emergencyUsed[ctx.playerId] = true;
      const sala = state.players[ctx.playerId]?.pos?.room || state.players[ctx.playerId]?.scene || null;
      const m = iniciarReuniao(state, { by: ctx.playerId, reason: 'button', room: sala });
      out.push({ type: 'meetingStart', meeting: m, by: m.byName, reason: 'button', room: sala, victim: null });
      return { ok: true, events: out };
    }

    /* ---- navegar entre locais ------------------------------------------- */
    case 'travel': {
      const loc = getLocation(CASE, action.scene);
      if (!loc) return { ok: false, events: out, msg: 'Local inexistente.' };
      if (loc.unlockBy && !state.flags[loc.unlockBy]) {
        return { ok: false, events: out, msg: loc.lockedText || 'Está trancado.' };
      }
      player.scene = action.scene;
      out.push({ type: 'travel', player: ctx.playerId, scene: action.scene, name: cx.name });
      return { ok: true, events: out };
    }

    /* ---- falar com personagem ------------------------------------------- */
    case 'talk': {
      const w = getWitness(CASE, action.charId);
      if (!w) return { ok: false, events: out, msg: 'Personagem inexistente.' };
      const topic = (w.topics || []).find(t => t.id === action.topicId);
      if (!topic) return { ok: false, events: out, msg: 'Assunto inexistente.' };
      state.talked[w.id + ':' + topic.id] = true;
      out.push({ type: 'dialogue', char: w.id, name: w.name, text: topic.text });
      if (topic.gives && !state.clues.includes(topic.gives)) {
        state.clues.push(topic.gives);
        state.foundBy[topic.gives] = ctx.playerId;
        const c = getClue(CASE, topic.gives);
        out.push({ type: 'clue', id: topic.gives, by: cx.name, text: c ? c.text : '', level: c ? c.level : 'medio' });
      }
      out.push({ type: 'sfx', id: 'talk' });
      return { ok: true, events: out };
    }

    /* ---- marcar evidência ----------------------------------------------- */
    case 'mark': {
      if (!state.clues.includes(action.clueId)) return { ok: false, events: out, msg: 'Pista desconhecida.' };
      const m = ['important', 'doubt', 'confirmed'].includes(action.mark) ? action.mark : null;
      state.marks[action.clueId] = state.marks[action.clueId] || {};
      if (m) state.marks[action.clueId][ctx.playerId] = m;
      else delete state.marks[action.clueId][ctx.playerId];
      out.push({ type: 'mark', clueId: action.clueId, mark: m, by: cx.name });
      return { ok: true, events: out };
    }

    /* ---- papo secreto ---------------------------------------------------- */
    case 'whisperOpen': {
      const to = action.to;
      if (!state.players[to]) return { ok: false, events: out, msg: 'Jogador não está na sala.' };
      state.whisperPair[ctx.playerId] = to;
      state.whisperPair[to] = ctx.playerId;
      state.whisperLog.push({ a: ctx.playerId, b: to, t: Date.now() });
      out.push({ type: 'whisperOpen', a: ctx.playerId, b: to });
      return { ok: true, events: out };
    }
    case 'whisperClose': {
      const to = state.whisperPair[ctx.playerId];
      delete state.whisperPair[ctx.playerId];
      if (to) delete state.whisperPair[to];
      out.push({ type: 'whisperClose', a: ctx.playerId, b: to });
      return { ok: true, events: out };
    }
    case 'whisper': {
      const to = action.to || state.whisperPair[ctx.playerId];
      if (!to || !state.players[to]) return { ok: false, events: out, msg: 'Escolha com quem falar.' };
      const key = pairKey(ctx.playerId, to);
      const msg = String(action.text || '').slice(0, 200);
      if (msg) {
        state.whispers[key] = state.whispers[key] || [];
        state.whispers[key].push({ from: ctx.playerId, name: cx.name, text: msg, t: Date.now() });
        if (state.whispers[key].length > 40) state.whispers[key].shift();
        out.push({ type: 'whisper', from: ctx.playerId, to, text: msg, name: cx.name });
      }
      return { ok: true, events: out };
    }

    /* ---- voto (IRREVERSÍVEL) -------------------------------------------- */
    case 'vote': {
      if (state.votes[ctx.playerId]) {
        return { ok: false, events: out, msg: 'Seu voto já foi registrado e não pode ser alterado.' };
      }
      const n = state.order.length;
      const target = action.target;
      const isPlayer = !!state.players[target];
      const isNpc = !!getWitness(CASE, target);
      if (!isPlayer && !isNpc) return { ok: false, events: out, msg: 'Escolha um suspeito válido.' };
      if (isNpc && n > 2) return { ok: false, events: out, msg: 'Com 3 ou mais jogadores, o voto é entre vocês.' };
      if (target === ctx.playerId && state.roles[ctx.playerId]?.role !== 'killer') {
        return { ok: false, events: out, msg: 'Você não pode votar em si mesmo.' };
      }
      if (state.minEvidence && state.clues.length < state.minEvidence) {
        return { ok: false, events: out, msg: `Faltam evidências: ${state.clues.length}/${state.minEvidence}.` };
      }
      state.votes[ctx.playerId] = target;
      out.push({ type: 'voted', player: ctx.playerId, name: cx.name, target });
      out.push({ type: 'sfx', id: 'stamp' });
      if (state.order.every(pid => state.votes[pid])) {
        resolveVotes(state, 'vote');
        out.push({ type: 'end', result: state.result });
      }
      return { ok: true, events: out };
    }

    /* ---- chat da equipe -------------------------------------------------- */
    case 'chat': {
      if (state.dead[ctx.playerId]) return { ok: false, events: out, msg: 'Quem já saiu perde a voz.' };
      const msg = String(action.text || '').slice(0, 160);
      if (msg) {
        state.chat.push({ id: ctx.playerId, name: cx.name, color: player.color, text: msg, t: Date.now() });
        if (state.chat.length > 60) state.chat.shift();
      }
      return { ok: true, events: out };
    }
  }
  return { ok: false, events: out, msg: 'Ação desconhecida.' };
}

/* ----------------------------------------------------------- eventos/tempo */
export function checkTimedEvents(state, out = []) {
  if (state.phase !== 'playing') return out;
  if (timeLeft(state) <= 0) {
    endByTime(state);
    out.push({ type: 'end', result: state.result, reason: 'time' });
  }
  return out;
}
