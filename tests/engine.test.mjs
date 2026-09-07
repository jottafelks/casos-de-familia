/* =============================================================================
   CASOS DE FAMÍLIA — testes de regras (rodam sem navegador)
   ========================================================================== */
import assert from 'node:assert/strict';
import {
  createState, addPlayer, startGame, applyAction, beginPlay, resolveVotes, endByTime,
  timeLeft, currentCase, META, CASES, getCase, getClue, getWitness
} from '../public/shared/engine.js';

let pass = 0, fail = 0;
const t = (nome, fn) => {
  try { fn(); console.log('  ✓ ' + nome); pass++; }
  catch (e) { console.log('  ✗ ' + nome + '\n      ' + e.message); fail++; }
};
const rnd = (() => { let s = 12345; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; })();

function mesa(n, caseId = 'mansao') {
  const st = createState({ caseId });
  for (let i = 0; i < n; i++) addPlayer(st, 'p' + i, 'Jog' + i, i % 2 ? 'f' : 'm');
  startGame(st, { caseId });
  beginPlay(st);
  return st;
}
const act = (st, pid, a) => applyAction(st, a, { playerId: pid, name: st.players[pid].name });

console.log('\nCASOS DE FAMÍLIA — regras\n');

/* ------------------------------------------------------------ casos */
console.log('casos e dados');
t('há pelo menos 3 casos publicados', () => assert.ok(CASES.length >= 3));
t('cada caso tem vítima, locais, pistas, papéis e solução', () => {
  for (const c of CASES) {
    assert.ok(c.victim?.name, c.id + ': vítima');
    assert.ok(c.locations?.length >= 4, c.id + ': locais');
    assert.ok(Object.keys(c.clues || {}).length >= 10, c.id + ': pistas');
    assert.ok(c.roles?.length >= 6, c.id + ': papéis');
    assert.ok(c.solution?.reveal, c.id + ': solução');
  }
});
t('nenhuma pista cita o nome do culpado', () => {
  for (const c of CASES) {
    const guilt = c.roles.find(r => r.guilty);
    for (const [id, txt] of Object.entries(c.clues)) {
      const fala = typeof txt === 'string' ? txt : txt.text;
      assert.ok(!new RegExp(guilt.label.replace(/[()]/g, ''), 'i').test(fala), c.id + '/' + id);
    }
  }
});
t('toda pista tem nível de dificuldade', () => {
  for (const c of CASES) for (const [id, x] of Object.entries(c.clues)) {
    const nivel = (typeof x === 'string') ? 'medio' : x.level;
    assert.ok(['facil', 'medio', 'dificil'].includes(nivel || 'medio'), c.id + '/' + id);
  }
});
t('as ações dos objetos apontam para pistas existentes', () => {
  for (const c of CASES) for (const L of c.locations) for (const o of L.objects || []) for (const a of o.actions || [])
    for (const e of a.effects || []) if (e.t === 'clue') assert.ok(c.clues[e.id], c.id + ' pista órfã: ' + e.id);
});

/* ------------------------------------------------------------ papéis */
console.log('\nsorteio dos papéis');
for (const n of [2, 3, 4, 5, 6]) {
  t(`${n} jogadores → exatamente 1 assassino`, () => {
    const st = mesa(n);
    const killers = Object.values(st.roles).filter(r => r.role === 'killer');
    assert.equal(killers.length, 1);
    assert.equal(st.killerId !== null, true);
  });
}
t('solo → nenhum assassino entre os jogadores', () => {
  const st = mesa(1);
  assert.equal(st.killerId, null);
  assert.equal(st.roles.p0.role, 'investigator');
});
t('o assassino muda de jogador entre partidas', () => {
  const vistos = new Set();
  for (let i = 0; i < 40; i++) vistos.add(mesa(4).killerId);
  assert.ok(vistos.size >= 3, 'só variou ' + vistos.size);
});
t('o assassino recebe 2 objetivos secretos (e inocentes, nenhum)', () => {
  const st = mesa(4);
  const k = st.killerId;
  assert.equal(st.roles[k].objectives.length, 2);
  for (const pid of Object.keys(st.roles)) if (pid !== k) assert.equal(st.roles[pid].objectives.length, 0);
});
t('nunca sorteia objetivo de incriminar o próprio perfil do assassino', () => {
  for (let i = 0; i < 60; i++) {
    const st = mesa(4); const k = st.killerId; const CASE = currentCase(st);
    const perfil = st.roles[k].profileId;
    for (const id of st.roles[k].objectives) {
      const o = CASE.objectives.find(x => x.id === id);
      assert.ok(!(o.kind === 'frame' && o.target === perfil));
    }
  }
});
t('cada jogador recebe um perfil diferente', () => {
  const st = mesa(6);
  const ids = Object.values(st.roles).map(r => r.profileId);
  assert.equal(new Set(ids).size, 6);
});

/* -------------------------------------------------------- cronômetro */
console.log('\ncronômetro e modos');
t('3 a 6 jogadores → 10 minutos', () => {
  for (const n of [3, 4, 5, 6]) assert.equal(mesa(n).duration, 10 * 60 * 1000);
});
t('solo e dupla → 5 minutos', () => {
  assert.equal(mesa(1).duration, 5 * 60 * 1000);
  assert.equal(mesa(2).duration, 5 * 60 * 1000);
});
t('solo e dupla exigem evidência mínima; 3+ não', () => {
  assert.ok(mesa(1).minEvidence >= 3);
  assert.ok(mesa(2).minEvidence >= 3);
  for (const n of [3, 4, 5, 6]) assert.equal(mesa(n).minEvidence, 0);
});
t('no tempo zerado o assassino vence', () => {
  const st = mesa(4); st.endAt = Date.now() - 1;
  endByTime(st);
  assert.equal(st.result, 'killer');
  assert.equal(st.endReason, 'time');
  assert.ok(st.scores[st.killerId] >= META.score.killerEscaped);
});

/* ---------------------------------------------------------- votação */
console.log('\nvotação');
t('voto é irreversível', () => {
  const st = mesa(4);
  const alvo = Object.keys(st.players).find(p => p !== 'p0');
  assert.equal(act(st, 'p0', { type: 'vote', target: alvo }).ok, true);
  const antes = st.votes.p0;
  const r = act(st, 'p0', { type: 'vote', target: 'p1' });
  assert.equal(r.ok, false);
  assert.equal(st.votes.p0, antes);
});
t('solo não vota sem evidência mínima', () => {
  const st = mesa(1);
  const suspeito = currentCase(st).witnesses[0].id;
  const r = act(st, 'p0', { type: 'vote', target: suspeito });
  assert.equal(r.ok, false, 'deveria barrar por falta de evidência');
  assert.ok(/evidênci/i.test(r.msg), 'mensagem: ' + r.msg);
});
t('maioria certa → investigadores ganham, assassino perde', () => {
  const st = mesa(5); const k = st.killerId;
  const outros = Object.keys(st.players).filter(p => p !== k);
  act(st, outros[0], { type: 'vote', target: k });
  act(st, outros[1], { type: 'vote', target: k });
  act(st, outros[2], { type: 'vote', target: k });
  act(st, outros[3], { type: 'vote', target: outros[0] });   // erra
  resolveVotes(st, 'vote');
  assert.equal(st.result, 'investigators');
  assert.equal(st.scores[outros[0]], META.score.investigatorRight);
  assert.equal(st.scores[outros[3]], META.score.investigatorWrong);
  // o assassino perde pontos ao ser pego (objetivos cumpridos podem amenizar)
  assert.ok(st.scores[k] < META.score.investigatorRight, 'assassino: ' + st.scores[k]);
  assert.ok(st.reveal.deltas[k] <= META.score.killerCaught + 200);
});
t('assassino pego nunca termina a rodada no positivo', () => {
  for (let i = 0; i < 25; i++) {
    const st = mesa(4); const k = st.killerId;
    const outros = Object.keys(st.players).filter(p => p !== k);
    // três votos no assassino = maioria
    act(st, outros[0], { type: 'vote', target: k });
    act(st, outros[1], { type: 'vote', target: k });
    act(st, outros[2], { type: 'vote', target: k });
    resolveVotes(st, 'vote');
    if (st.result !== 'investigators') continue;
    const d = st.reveal.deltas[k];
    assert.ok(d <= 0, 'assassino pego com saldo positivo na rodada: ' + d);
    assert.ok(d >= META.score.killerCaught, 'perda além do previsto: ' + d);
  }
});

t('sem maioria → assassino escapa', () => {
  const st = mesa(5); const k = st.killerId;
  const outros = Object.keys(st.players).filter(p => p !== k);
  act(st, outros[0], { type: 'vote', target: k });
  act(st, outros[1], { type: 'vote', target: outros[0] });
  act(st, outros[2], { type: 'vote', target: outros[1] });
  act(st, outros[3], { type: 'vote', target: k });
  resolveVotes(st, 'vote');
  assert.equal(st.result, 'killer');
  assert.ok(st.scores[k] >= META.score.killerEscaped);
});
t('placar acumula entre partidas e pode ficar negativo', () => {
  const st = mesa(3);
  let k = st.killerId;
  const errante = Object.keys(st.players).find(p => p !== k);
  // rodada 1: todos votam num inocente → assassino escapa, quem errou perde pontos
  const inocente1 = Object.keys(st.players).find(p => p !== k && p !== errante);
  Object.keys(st.players).forEach(p => act(st, p, { type: 'vote', target: inocente1 }));
  resolveVotes(st, 'vote');
  assert.equal(st.result, 'killer');
  assert.equal(st.scores[errante], META.score.investigatorWrong);

  // rodada 2: mesmo comportamento → a pontuação negativa continua caindo
  st.phase = 'lobby';
  startGame(st, { caseId: st.caseId }); beginPlay(st);
  k = st.killerId;
  const inocente2 = Object.keys(st.players).find(p => p !== k && p !== errante);
  if (errante === k) return;   // papel sorteado de novo: nada a verificar
  Object.keys(st.players).forEach(p => act(st, p, { type: 'vote', target: inocente2 }));
  resolveVotes(st, 'vote');
  assert.equal(st.scores[errante], META.score.investigatorWrong * 2);   // -100
  assert.ok(st.scores[errante] < 0, 'placar negativo obrigatório');
  assert.ok(st.scores[k] > 0, 'assassino soma pontos ao escapar');
});

/* ------------------------------------------------------ investigação */
console.log('\ninvestigação, marcas e sussurros');
t('ações registram pistas e quem achou', () => {
  const st = mesa(3);
  const CASE = currentCase(st);
  const alvo = CASE.locations.flatMap(L => (L.objects || []).map(o => ({ L, o })))
    .flatMap(({ L, o }) => (o.actions || []).map(a => ({ a, L, o })))
    .find(x => (x.a.effects || []).some(e => e.t === 'clue'));
  const id = alvo.a.effects.find(e => e.t === 'clue').id;
  act(st, 'p0', { type: 'interact', scene: alvo.L.id, objId: alvo.o.id, actionId: alvo.a.id });
  assert.ok(st.clues.includes(id));
  assert.equal(st.foundBy[id], 'p0');
});
t('pista repetida não entra duas vezes', () => {
  const st = mesa(3); const CASE = currentCase(st);
  const item = CASE.locations.flatMap(L => (L.objects || []).map(o => ({ L, o })))
    .flatMap(({ L, o }) => (o.actions || []).map(a => ({ a, L, o })))
    .find(x => (x.a.effects || []).some(e => e.t === 'clue'));
  const a1 = { type: 'interact', scene: item.L.id, objId: item.o.id, actionId: item.a.id };
  act(st, 'p0', a1); const n = st.clues.length; act(st, 'p1', a1);
  assert.equal(st.clues.length, n);
});
t('marcas IMPORTANTE / DUVIDOSA / CONFIRMADA por jogador', () => {
  const st = mesa(3); const CASE = currentCase(st);
  const pista = Object.keys(CASE.clues)[0];
  st.clues.push(pista);
  act(st, 'p0', { type: 'mark', clueId: pista, mark: 'important' });
  act(st, 'p1', { type: 'mark', clueId: pista, mark: 'doubt' });
  assert.equal(st.marks[pista].p0, 'important');
  assert.equal(st.marks[pista].p1, 'doubt');
  act(st, 'p0', { type: 'mark', clueId: pista, mark: null });
  assert.equal(st.marks[pista].p0, undefined);
  // não dá para marcar pista que ninguém encontrou
  assert.equal(act(st, 'p0', { type: 'mark', clueId: 'inventada', mark: 'important' }).ok, false);
});
t('papo secreto: só os dois participantes e com hora marcada', () => {
  const st = mesa(3);
  act(st, 'p0', { type: 'whisperOpen', to: 'p1' });
  assert.equal(st.whisperPair.p0, 'p1');
  assert.equal(st.whisperPair.p1, 'p0');
  act(st, 'p0', { type: 'whisper', to: 'p1', text: 'foi ele' });
  const chave = ['p0', 'p1'].sort().join('|');
  assert.equal(st.whispers[chave].length, 1);
  assert.equal(st.whispers[chave][0].text, 'foi ele');
  assert.equal(st.whisperLog.length, 1);
});
t('sussurro sem destinatário é recusado', () => {
  const st = mesa(3);
  assert.equal(act(st, 'p0', { type: 'whisper', text: 'oi' }).ok, false);
  assert.equal(act(st, 'p0', { type: 'whisper', to: 'ninguem', text: 'oi' }).ok, false);
  assert.equal(st.whisperLog.length, 0);
});
t('chat da equipe é público', () => {
  const st = mesa(3);
  act(st, 'p0', { type: 'chat', text: 'olha a cozinha' });
  assert.equal(st.chat.at(-1).text, 'olha a cozinha');
});
t('viajar para local existente e falar com testemunha', () => {
  const st = mesa(3); const CASE = currentCase(st);
  assert.equal(act(st, 'p0', { type: 'travel', scene: CASE.locations[1].id }).ok, true);
  const w = CASE.witnesses[0];
  const r = act(st, 'p0', { type: 'talk', charId: w.id, topicId: w.topics[0].id });
  assert.equal(r.ok, true);
  assert.ok(r.events.some(e => ['say', 'clue', 'log', 'dialogue'].includes(e.type)));
  assert.ok(r.events.some(e => e.type === 'dialogue' && e.text));
});

/* --------------------------------------------------------- objetivos */
console.log('\nobjetivos secretos do assassino');
t('incriminar outro só conta se o alvo for o mais votado', () => {
  const st = mesa(4); const k = st.killerId;
  const outro = Object.keys(st.players).find(p => p !== k);
  st.roles[k].objectives = [currentCase(st).objectives.find(o => o.kind === 'frame' && o.target === st.roles[outro].profileId)?.id]
    .filter(Boolean);
  if (!st.roles[k].objectives.length) return;      // caso sem esse objetivo
  act(st, k, { type: 'vote', target: outro });
  act(st, Object.keys(st.players).filter(p => p !== k && p !== outro)[0], { type: 'vote', target: outro });
  act(st, Object.keys(st.players).filter(p => p !== k && p !== outro)[1], { type: 'vote', target: outro });
  resolveVotes(st, 'vote');
  assert.equal(st.reveal.objectives[0].done, true);
});
t('incriminar NÃO vale quando o mais votado é o próprio assassino', () => {
  const st = mesa(4); const k = st.killerId;
  const alvo = Object.keys(st.players).filter(p => p !== k);
  st.roles[k].objectives = [currentCase(st).objectives.find(o => o.kind === 'frame')?.id].filter(Boolean);
  alvo.forEach(p => act(st, p, { type: 'vote', target: k }));
  resolveVotes(st, 'vote');
  const frame = st.reveal.objectives.find(o => /INCRIMIN|VOTAD/i.test(o.text));
  if (frame) assert.equal(frame.done, false);
});
t('esconder pista vale enquanto ninguém a encontra', () => {
  const st = mesa(4); const k = st.killerId;
  const o = currentCase(st).objectives.find(x => x.kind === 'hide');
  if (!o) return;
  st.roles[k].objectives = [o.id];
  Object.keys(st.players).forEach((p, i) => act(st, p, { type: 'vote', target: Object.keys(st.players)[(i + 1) % 4] }));
  resolveVotes(st, 'vote');
  assert.equal(st.reveal.objectives[0].done, !st.clues.includes(o.clue));
});

/* ------------------------------------------------------------结果 */
console.log(`\n${fail ? '✗' : '✓'} ${pass} testes de regra passaram` + (fail ? `, ${fail} falharam` : '') + '\n');
process.exit(fail ? 1 : 0);
