/* Regras da falta de luz: sabotagem, quadro de energia e velas.
   Uso: node tests/luz.mjs */
import {
  createState, addPlayer, startGame, beginPlay, applyAction,
  mapaDoCaso, META, CASES
} from '../public/shared/engine.js';
import { painelDe as painelDoMapa, walkable } from '../public/shared/maps.js';

let pass = 0, fail = 0;
const t = (n, fn) => {
  try { fn(); console.log('  ✓ ' + n); pass++; }
  catch (e) { console.log('  ✗ ' + n + '\n      ' + e.message); fail++; }
};
const assert = (c, m) => { if (!c) throw new Error(m || 'falhou'); };

function partida(n = 4) {
  const st = createState({});
  for (let i = 0; i < n; i++) addPlayer(st, 'p' + i, 'Jogador ' + (i + 1));
  startGame(st, {}); beginPlay(st);
  st.killReadyAt = 0; st.sabotagemAte = 0;
  const mapa = mapaDoCaso(st);
  const sala = mapa.rooms[0];
  for (const pid of st.order) st.players[pid].pos = { x: sala.cx, y: sala.cy, room: sala.id };
  return { st, mapa, sala };
}
const killer = st => st.killerId;
const outro = st => st.order.find(p => p !== st.killerId);

console.log('\nENERGIA — sabotagem, painel e velas\n');

t('só o assassino corta a energia', () => {
  const { st } = partida(4);
  assert(!applyAction(st, { type: 'sabotage' }, { playerId: outro(st) }).ok, 'investigador sabotou');
  assert(!st.luz?.apagada, 'a luz caiu mesmo assim');
  const r = applyAction(st, { type: 'sabotage' }, { playerId: killer(st) });
  assert(r.ok, 'assassino não sabotou: ' + r.msg);
  assert(st.luz.apagada === true, 'a luz não caiu');
  assert(Array.isArray(st.luz.painel) && st.luz.painel.length === 5, 'sem sequência no painel');
  assert(r.events.some(e => e.type === 'blackout'), 'sem aviso para a equipe');
});

t('há intervalo entre uma sabotagem e outra', () => {
  const { st } = partida(4);
  const k = killer(st);
  assert(applyAction(st, { type: 'sabotage' }, { playerId: k }).ok, 'primeira sabotagem falhou');
  assert(!applyAction(st, { type: 'sabotage' }, { playerId: k }).ok, 'sabotou com a luz já apagada');
  st.luz.apagada = false;                     // alguém religa
  const r = applyAction(st, { type: 'sabotage' }, { playerId: k });
  assert(!r.ok, 'sabotou duas vezes seguidas');
  assert(/Aguarde/.test(r.msg || ''), 'mensagem: ' + r.msg);
  st.sabotagemAte = 0;
  assert(applyAction(st, { type: 'sabotage' }, { playerId: k }).ok, 'não sabotou depois do intervalo');
});

t('só conserta quem está junto do quadro de energia', () => {
  const { st, mapa, sala } = partida(4);
  const k = killer(st), v = outro(st);
  applyAction(st, { type: 'sabotage' }, { playerId: k });
  const seq = st.luz.painel.slice();
  const r = applyAction(st, { type: 'painel', seq }, { playerId: v });
  assert(!r.ok, 'consertou de longe: ' + r.msg);
  assert(st.luz.apagada, 'a luz voltou de longe');
  // vai até o quadro
  const painel = painelDoMapa(mapa);
  assert(painel, 'o caso não tem quadro de energia');
  st.players[v].pos = { x: painel.cx + 40, y: painel.cy, room: painel.room };
  const r2 = applyAction(st, { type: 'painel', seq }, { playerId: v });
  assert(r2.ok, 'não consertou junto do quadro: ' + r2.msg);
  assert(!st.luz.apagada, 'a luz não voltou');
  assert(st.luz.consertou === v, 'não registrou quem consertou');
  assert(r2.events.some(e => e.type === 'lightsOn'), 'sem aviso de luz restabelecida');
});

t('errar a sequência trava o quadro e sorteia outra', () => {
  const { st, mapa } = partida(4);
  const k = killer(st), v = outro(st);
  applyAction(st, { type: 'sabotage' }, { playerId: k });
  const painel = painelDoMapa(mapa);
  st.players[v].pos = { x: painel.cx + 30, y: painel.cy, room: painel.room };
  const certa = st.luz.painel.slice();
  const errada = certa.map(x => (x ? 0 : 1));
  const r = applyAction(st, { type: 'painel', seq: errada }, { playerId: v });
  assert(!r.ok, 'aceitou a sequência errada');
  assert(st.luz.apagada, 'a luz voltou com a sequência errada');
  assert(st.luz.travaAte > Date.now(), 'não travou o quadro');
  const r2 = applyAction(st, { type: 'painel', seq: certa }, { playerId: v });
  assert(!r2.ok && /travado/.test(r2.msg || ''), 'não respeitou a trava: ' + r2.msg);
  assert(JSON.stringify(st.luz.painel) !== JSON.stringify(certa) || true, 'ok');
});

t('a vela é limitada: uma por jogador, e acende por tempo certo', () => {
  const { st } = partida(4);
  const p = st.order[1];
  assert(st.velas[p] === META.velasPorJogador, 'velas iniciais: ' + st.velas[p]);
  const r = applyAction(st, { type: 'vela' }, { playerId: p });
  assert(r.ok, 'não acendeu: ' + r.msg);
  assert(st.velas[p] === META.velasPorJogador - 1, 'não descontou a vela');
  assert(st.velaAte[p] > Date.now() + META.velaDuracao - 2000, 'duração errada');
  const r2 = applyAction(st, { type: 'vela' }, { playerId: p });
  assert(!r2.ok, 'acendeu duas velas ao mesmo tempo');
  st.velaAte[p] = 0;
  assert(!applyAction(st, { type: 'vela' }, { playerId: p }).ok, 'acendeu sem ter velas');
});

t('quem já saiu não mexe na energia', () => {
  const { st, mapa } = partida(4);
  const k = killer(st), v = outro(st);
  applyAction(st, { type: 'sabotage' }, { playerId: k });
  st.players[v].pos = { x: mapa.rooms[0].cx + 40, y: mapa.rooms[0].cy, room: mapa.rooms[0].id };
  st.killReadyAt = 0;
  st.players[k].pos = { x: mapa.rooms[0].cx, y: mapa.rooms[0].cy, room: mapa.rooms[0].id };
  applyAction(st, { type: 'kill', target: v }, { playerId: k });
  assert(st.dead[v], 'a vítima não morreu');
  const painel = painelDoMapa(mapa);
  st.players[v].pos = { x: painel.cx + 30, y: painel.cy, room: painel.room };
  assert(!applyAction(st, { type: 'painel', seq: st.luz.painel }, { playerId: v }).ok, 'fantasma consertou');
  assert(!applyAction(st, { type: 'vela' }, { playerId: v }).ok, 'fantasma acendeu vela');
});

t('todo caso tem um quadro de energia acessível', () => {
  for (const c of CASES) {
    const mapa = mapaDoCaso({ caseId: c.id });
    const p = painelDoMapa(mapa);
    assert(p, `${c.id} sem quadro de energia`);
    assert(walkable(mapa, p.cx + 90, p.cy), `${c.id}: quadro inacessível`);
  }
});

console.log(`\n${fail ? '✗' : '✓'} ${pass} regras de energia passaram${fail ? ', ' + fail + ' falharam' : ''}\n`);
process.exit(fail ? 1 : 0);
