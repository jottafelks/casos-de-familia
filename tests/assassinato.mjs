/* Regras do assassinato, corpos, reuniões e fantasmas (sem navegador).
   Uso: node tests/assassinato.mjs */
import {
  createState, addPlayer, startGame, beginPlay, applyAction, timeLeft,
  mapaDoCaso, linhaDeVisao, corposAvistados, META
} from '../public/shared/engine.js';

let pass = 0, fail = 0;
const t = (n, fn) => {
  try { fn(); console.log('  ✓ ' + n); pass++; }
  catch (e) { console.log('  ✗ ' + n + '\n      ' + e.message); fail++; }
};
const assert = (c, m) => { if (!c) throw new Error(m || 'falhou'); };

/** monta uma partida em andamento com n jogadores e posições escolhidas */
function partida(n = 4, caso = 'mansao') {
  const st = createState({ caseId: caso });
  for (let i = 0; i < n; i++) addPlayer(st, 'p' + i, 'Jogador ' + (i + 1));
  startGame(st, {});
  beginPlay(st);
  st.killReadyAt = 0;                        // sem trégua nos testes
  const mapa = mapaDoCaso(st);
  const sala = mapa.rooms[0];
  for (const pid of st.order) st.players[pid].pos = { x: sala.cx, y: sala.cy, room: sala.id };
  return { st, mapa, sala };
}
const killer = st => st.killerId;
const vitima = st => st.order.find(p => p !== st.killerId);

console.log('\nASSASSINATO, CORPOS E REUNIÃO (regras)\n');

t('a partida sorteia exatamente um assassino', () => {
  for (let i = 0; i < 12; i++) {
    const { st } = partida(4);
    const ks = st.order.filter(p => st.roles[p]?.role === 'killer');
    assert(ks.length === 1, 'assassinos: ' + ks.length);
    assert(st.killerId === ks[0], 'killerId inconsistente');
  }
});

t('só o assassino pode matar', () => {
  const { st } = partida(4);
  const k = killer(st), v = vitima(st);
  const r = applyAction(st, { type: 'kill', target: v }, { playerId: v });
  assert(!r.ok, 'deixou um inocente matar');
  assert(/assassino/.test(r.msg || ''), 'mensagem: ' + r.msg);
  assert(!st.dead[v], 'a vítima morreu mesmo assim');
});

t('não mata à distância (precisa estar ao lado)', () => {
  const { st, sala } = partida(4);
  const k = killer(st), v = vitima(st);
  st.players[v].pos = { x: sala.cx + 600, y: sala.cy, room: sala.id };   // longe
  const r = applyAction(st, { type: 'kill', target: v }, { playerId: k });
  assert(!r.ok, 'matou de longe');
  assert(!st.dead[v], 'morreu de longe');
});

t('não mata de outro cômodo nem através da parede', () => {
  const { st, mapa } = partida(4);
  const k = killer(st), v = vitima(st);
  const a = mapa.rooms[0], b = mapa.rooms[1];
  st.players[k].pos = { x: a.cx, y: a.cy, room: a.id };
  st.players[v].pos = { x: b.cx, y: b.cy, room: b.id };
  const r = applyAction(st, { type: 'kill', target: v }, { playerId: k });
  assert(!r.ok, 'matou de outro cômodo');
  assert(!linhaDeVisao(mapa, a.cx, a.cy, b.cx, b.cy), 'a parede deveria bloquear a visão');
});

t('mata quem está ao lado, no mesmo cômodo', () => {
  const { st, sala } = partida(4);
  const k = killer(st), v = vitima(st);
  st.players[v].pos = { x: sala.cx + 60, y: sala.cy, room: sala.id };
  const r = applyAction(st, { type: 'kill', target: v }, { playerId: k });
  assert(r.ok, 'não matou: ' + r.msg);
  assert(st.dead[v] === true, 'vítima não marcada como morta');
  assert(st.corpses.length === 1, 'corpo não criado');
  const c = st.corpses[0];
  assert(c.room === sala.id && c.victim === v, 'corpo no lugar errado');
  assert(c.found === false, 'corpo já nasce descoberto');
});

t('o crime é sigiloso: só vítima, assassino e testemunhas recebem o evento', () => {
  const { st, sala } = partida(5);
  const k = killer(st);
  const outros = st.order.filter(p => p !== k);
  const v = outros[0], w = outros[1], longe = outros[2];
  st.players[v].pos = { x: sala.cx + 50, y: sala.cy, room: sala.id };
  st.players[w].pos = { x: sala.cx + 200, y: sala.cy, room: sala.id };       // testemunha perto
  st.players[longe].pos = { x: sala.cx, y: sala.cy, room: 'outro-cômodo' };  // fora
  const r = applyAction(st, { type: 'kill', target: v }, { playerId: k });
  const ev = r.events.find(e => e.type === 'kill');
  assert(ev, 'sem evento de morte');
  assert(ev.witnesses.includes(w), 'testemunha não identificada');
  assert(!ev.witnesses.includes(longe), 'quem está fora testemunhou');
  assert(ev.only.includes(v) && ev.only.includes(k) && ev.only.includes(w), 'lista "only" incompleta');
  assert(!ev.only.includes(longe), 'quem não viu recebeu o evento');
});

t('o corpo só é visto por quem chega perto, com visão', () => {
  const { st, mapa, sala } = partida(4);
  const k = killer(st);
  const v = vitima(st);
  const outro = st.order.find(p => p !== k && p !== v);
  st.players[v].pos = { x: sala.cx + 50, y: sala.cy, room: sala.id };
  st.players[outro].pos = { x: mapa.rooms[1].cx, y: mapa.rooms[1].cy, room: mapa.rooms[1].id }; // fora na hora do crime
  applyAction(st, { type: 'kill', target: v }, { playerId: k });
  // longe do corpo
  st.players[outro].pos = { x: sala.x + 60, y: sala.y + 60, room: sala.id };
  assert(corposAvistados(st, outro).length === 0, 'viu o corpo de longe');
  // pertinho
  st.players[outro].pos = { x: st.corpses[0].x + 80, y: st.corpses[0].y, room: sala.id };
  assert(corposAvistados(st, outro).length === 1, 'não viu o corpo ao lado');
  assert(corposAvistados(st, outro).length === 0, 'viu o corpo duas vezes');
});

t('há intervalo entre um assassinato e outro', () => {
  const { st, sala } = partida(5);
  const k = killer(st);
  const alvos = st.order.filter(p => p !== k).slice(0, 2);
  st.players[alvos[0]].pos = { x: sala.cx + 40, y: sala.cy, room: sala.id };
  assert(applyAction(st, { type: 'kill', target: alvos[0] }, { playerId: k }).ok, 'primeiro ataque falhou');
  st.players[alvos[1]].pos = { x: sala.cx + 40, y: sala.cy, room: sala.id };
  assert(!st.dead[alvos[1]], 'segundo alvo já devia estar vivo');
  const r = applyAction(st, { type: 'kill', target: alvos[1] }, { playerId: k });
  assert(!r.ok, 'matou duas vezes seguidas');
  assert(/[Aa]guarde/.test(r.msg || ''), 'mensagem: ' + r.msg);
  st.killReadyAt = Date.now() - 1;                                           // espera terminar
  assert(applyAction(st, { type: 'kill', target: alvos[1] }, { playerId: k }).ok, 'não matou depois do intervalo');
});

t('denunciar o corpo abre a reunião e congela o cronômetro', () => {
  const { st, sala } = partida(4);
  const k = killer(st), v = vitima(st);
  const outro = st.order.find(p => p !== k && p !== v);
  st.players[v].pos = { x: sala.cx + 50, y: sala.cy, room: sala.id };
  applyAction(st, { type: 'kill', target: v }, { playerId: k });
  // quem está longe não pode denunciar
  st.players[outro].pos = { x: sala.x + 40, y: sala.y + 40, room: sala.id };
  assert(!applyAction(st, { type: 'report', corpseId: st.corpses[0].id }, { playerId: outro }).ok,
    'denunciou de longe');
  // perto do corpo, pode
  st.players[outro].pos = { x: st.corpses[0].x + 60, y: st.corpses[0].y, room: sala.id };
  const antes = timeLeft(st);
  const r = applyAction(st, { type: 'report', corpseId: st.corpses[0].id }, { playerId: outro });
  assert(r.ok, 'não denunciou: ' + r.msg);
  assert(st.phase === 'meeting', 'fase: ' + st.phase);
  assert(st.corpses[0].found === true && st.corpses[0].foundBy === outro, 'corpo não marcado');
  const espera = new Promise(r2 => setTimeout(r2, 260));
  assert(st.meeting.reason === 'body' && st.meeting.by === outro, 'motivo errado');
  assert(Math.abs(timeLeft(st) - antes) < 120, 'cronômetro não congelou');
  return espera;
});

t('a reunião mostra quem encontrou, onde e quem estava por perto', () => {
  const { st, sala } = partida(4);
  const k = killer(st), v = vitima(st);
  const outro = st.order.find(p => p !== k && p !== v);
  st.players[v].pos = { x: sala.cx + 50, y: sala.cy, room: sala.id };
  applyAction(st, { type: 'kill', target: v }, { playerId: k });
  st.players[outro].pos = { x: st.corpses[0].x + 60, y: st.corpses[0].y, room: sala.id };
  applyAction(st, { type: 'report', corpseId: st.corpses[0].id }, { playerId: outro });
  const m = st.meeting;
  assert(m.byName === st.players[outro].name, 'sem o nome de quem encontrou');
  assert(m.room === sala.id, 'sem o cômodo');
  assert(Array.isArray(m.presentes) && m.presentes.length === 3, 'presentes: ' + m.presentes?.length);
  assert(m.presentes.every(p => p.name && p.room), 'presentes sem informação');
});

t('o botão de emergência só funciona uma vez por jogador', () => {
  const { st } = partida(4);
  const p = st.order[0];
  const r1 = applyAction(st, { type: 'meeting' }, { playerId: p });
  assert(r1.ok, 'não abriu reunião: ' + r1.msg);
  assert(st.meeting.reason === 'button', 'motivo: ' + st.meeting?.reason);
  // encerra à força para o segundo teste
  for (const pid of st.order) applyAction(st, { type: 'vote', target: null }, { playerId: pid });
  const r2 = applyAction(st, { type: 'meeting' }, { playerId: p });
  assert(!r2.ok, 'usou o botão duas vezes');
});

t('voto da reunião é irreversível e expulsa quem tem mais votos', () => {
  const { st } = partida(5);
  const alvo = st.order[1];
  applyAction(st, { type: 'meeting' }, { playerId: st.order[0] });
  assert(applyAction(st, { type: 'vote', target: alvo }, { playerId: st.order[0] }).ok, 'voto 1');
  const repetido = applyAction(st, { type: 'vote', target: null }, { playerId: st.order[0] });
  assert(!repetido.ok, 'deixou mudar o voto');
  applyAction(st, { type: 'vote', target: alvo }, { playerId: st.order[2] });
  applyAction(st, { type: 'vote', target: alvo }, { playerId: st.order[3] });  // 3 votos x 2 pulos
  applyAction(st, { type: 'vote', target: null }, { playerId: st.order[4] });
  const r = applyAction(st, { type: 'vote', target: null }, { playerId: alvo });
  assert(r.ok, 'último voto falhou');
  assert(st.phase === 'playing', 'não voltou ao jogo: ' + st.phase);
  assert(st.dead[alvo] === true, 'não expulsou o mais votado');
  assert(st.lastMeeting.result.expelled === alvo, 'resultado: ' + JSON.stringify(st.lastMeeting.result));
});

t('empate ou maioria em PULAR VOTO não elimina ninguém', () => {
  const { st } = partida(5);
  applyAction(st, { type: 'meeting' }, { playerId: st.order[0] });
  applyAction(st, { type: 'vote', target: st.order[1] }, { playerId: st.order[0] });
  applyAction(st, { type: 'vote', target: st.order[2] }, { playerId: st.order[1] });
  for (const pid of st.order.slice(2)) applyAction(st, { type: 'vote', target: null }, { playerId: pid });
  assert(st.phase === 'playing', 'não voltou ao jogo');
  assert(Object.keys(st.dead).length === 0, 'alguém foi expulso no empate: ' + JSON.stringify(st.dead));
  assert(st.lastMeeting.result.expelled === null, 'expulsou mesmo assim');
});

t('expulsar o assassino encerra o caso com vitória dos investigadores', () => {
  const { st } = partida(4);
  const k = killer(st);
  applyAction(st, { type: 'meeting' }, { playerId: st.order[0] });
  for (const pid of st.order) {
    if (pid === k) continue;
    applyAction(st, { type: 'vote', target: k }, { playerId: pid });
  }
  applyAction(st, { type: 'vote', target: null }, { playerId: k });
  assert(st.phase === 'ended', 'fase: ' + st.phase);
  assert(st.result === 'investigators', 'resultado: ' + st.result);
  assert(st.reveal?.killerId === k, 'não revelou o assassino');
});

t('quem morreu vira fantasma: não vota, não fala, não denuncia', () => {
  const { st, sala } = partida(5);
  const k = killer(st);
  const v = st.order.find(p => p !== k);
  st.players[v].pos = { x: sala.cx + 50, y: sala.cy, room: sala.id };
  applyAction(st, { type: 'kill', target: v }, { playerId: k });
  assert(!applyAction(st, { type: 'chat', text: 'oi' }, { playerId: v }).ok, 'fantasma falou');
  assert(!applyAction(st, { type: 'meeting' }, { playerId: v }).ok, 'fantasma convocou reunião');
  assert(!applyAction(st, { type: 'report', corpseId: 'x' }, { playerId: v }).ok, 'fantasma denunciou');
  applyAction(st, { type: 'meeting' }, { playerId: k });
  assert(!applyAction(st, { type: 'vote', target: null }, { playerId: v }).ok, 'fantasma votou');
});

t('se o assassino eliminar todos os investigadores, ele vence', () => {
  const { st, sala } = partida(3);
  const k = killer(st);
  const outros = st.order.filter(p => p !== k);
  for (const v of outros) {
    st.killReadyAt = 0;
    st.players[v].pos = { x: sala.cx + 40, y: sala.cy, room: sala.id };
    st.players[k].pos = { x: sala.cx, y: sala.cy, room: sala.id };
    const r = applyAction(st, { type: 'kill', target: v }, { playerId: k });
    assert(r.ok, 'não matou: ' + r.msg);
  }
  assert(st.phase === 'ended', 'fase: ' + st.phase);
  assert(st.result === 'killer', 'resultado: ' + st.result);
  assert(st.endReason === 'wiped', 'motivo: ' + st.endReason);
});

t('a reunião devolve o tempo que sobrava no cronômetro', () => {
  const { st } = partida(4);
  applyAction(st, { type: 'meeting' }, { playerId: st.order[0] });
  const durante = timeLeft(st);
  for (const pid of st.order) applyAction(st, { type: 'vote', target: null }, { playerId: pid });
  const depois = timeLeft(st);
  assert(Math.abs(depois - durante) < 400, `cronômetro: ${durante} -> ${depois}`);
});

console.log(`\n${fail ? '✗' : '✓'} ${pass} regras de assassinato passaram${fail ? ', ' + fail + ' falharam' : ''}\n`);
process.exit(fail ? 1 : 0);
