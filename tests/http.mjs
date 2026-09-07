/* =============================================================================
   CASOS DE FAMÍLIA — testes do transporte HTTP (long-poll) e da API.
   Cobre o caminho usado quando o túnel/proxy não repassa WebSocket.
   Uso: node tests/http.mjs [http://localhost:3000]
   ========================================================================== */
const BASE = process.argv[2] || 'http://localhost:3000';
let pass = 0, fail = 0;

const t = async (nome, fn) => {
  try { await fn(); console.log('  ✓ ' + nome); pass++; }
  catch (e) { console.log('  ✗ ' + nome + '\n      ' + e.message); fail++; }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };
const post = (p, body) => fetch(BASE + p, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {})
}).then(r => r.json());
const get = (p) => fetch(BASE + p).then(r => r.json());
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

console.log('\nCASOS DE FAMÍLIA — HTTP/long-poll (' + BASE + ')\n');

let code, pidA, pidB;

await t('GET /healthz responde e identifica o jogo', async () => {
  const d = await get('/healthz');
  assert(d.ok === true, 'ok');
  assert(d.game === 'casos-de-familia', 'game=' + d.game);
});

await t('GET /api/cases lista os casos', async () => {
  const d = await get('/api/cases');
  assert(Array.isArray(d.cases) && d.cases.length >= 3, 'casos: ' + d.cases?.length);
  assert(d.cases.every(c => c.id && c.title), 'caso sem título');
});

await t('GET /api/ice devolve servidores ICE sem expor credenciais', async () => {
  const d = await get('/api/ice');
  assert(Array.isArray(d.iceServers) && d.iceServers.length, 'iceServers vazio');
  const txt = JSON.stringify(d);
  assert(!/secret|password/i.test(txt), 'ICE expondo segredo');
});

await t('POST /api/create gera código FAM-XXXX', async () => {
  const w = await post('/api/create', { name: 'Ana', caseId: 'mansao', avatar: 'f' });
  assert(w.type === 'welcome', 'tipo=' + w.type);
  assert(/^FAM-[A-Z0-9]{4}$/.test(w.code), 'código=' + w.code);
  code = w.code; pidA = w.playerId;
});

await t('POST /api/join aceita o código com ou sem prefixo', async () => {
  const semPrefixo = await post('/api/join', { code: code.slice(4), name: 'Bruno' });
  assert(semPrefixo.type === 'welcome', 'sem prefixo: ' + JSON.stringify(semPrefixo).slice(0, 80));
  pidB = semPrefixo.playerId;
  const comPrefixo = await post('/api/join', { code: code, name: 'Bruno', playerId: pidB });
  assert(comPrefixo.type === 'welcome', 'com prefixo');
  assert(comPrefixo.playerId === pidB, 'mesmo jogador reconectado');
});

await t('código inexistente é recusado com mensagem amigável', async () => {
  const d = await post('/api/join', { code: 'FAM-ZZZZ', name: 'X' });
  assert(d.type === 'error', 'deveria dar erro');
  assert(/não encontrada|confira/i.test(d.msg), 'msg=' + d.msg);
});

await t('sala respeita o limite de 6 jogadores', async () => {
  for (let i = 2; i < 6; i++) await post('/api/join', { code, name: 'J' + i });
  const d = await post('/api/join', { code, name: 'Sétimo' });
  assert(d.type === 'error' && /cheia/i.test(d.msg), 'msg=' + d.msg);
});

await t('o anfitrião inicia o caso (fase briefing)', async () => {
  const d = await post('/api/act', { code, pid: pidA, msg: { type: 'start', caseId: 'mansao' } });
  assert(d.ok === true, JSON.stringify(d));
  const p = await get(`/api/poll?code=${code}&pid=${pidB}&since=0`);
  assert(p.phase === 'briefing', 'fase=' + p.phase);
});

await t('estado enviado a cada jogador não revela o assassino', async () => {
  const p = await get(`/api/poll?code=${code}&pid=${pidB}&since=0`);
  const st = (p.msgs || []).map(m => m.msg).filter(m => m.type === 'state').pop()?.state;
  assert(st, 'nenhum estado no long-poll');
  assert(st.killerId === null, 'killerId vazou: ' + st.killerId);
  for (const [pid, r] of Object.entries(st.roles || {})) {
    if (pid === pidB) continue;
    assert(!r.role && !r.traits && !r.objectives, 'papel alheio vazou: ' + JSON.stringify(r));
  }
});

await t('cada jogador recebe o próprio papel secreto', async () => {
  const p = await get(`/api/poll?code=${code}&pid=${pidB}&since=0`);
  const st = (p.msgs || []).map(m => m.msg).filter(m => m.type === 'state').pop()?.state;
  assert(st.secret && st.secret.role, 'sem papel secreto');
  assert(['killer', 'investigator'].includes(st.secret.role), 'papel=' + st.secret.role);
});

await t('chat e ações chegam por long-poll', async () => {
  const antes = await get(`/api/poll?code=${code}&pid=${pidB}&since=0`);
  const seq = antes.seq;
  await post('/api/act', { code, pid: pidA, msg: { type: 'chat', text: 'olha o relógio' } });
  await sleep(300);
  const d = await get(`/api/poll?code=${code}&pid=${pidB}&since=${seq}`);
  const txt = JSON.stringify(d.msgs || []);
  assert(/olha o rel/g.test(txt), 'mensagem não chegou');
});

await t('sinalização de voz é repassada sem interpretar', async () => {
  const d = await post('/api/act', { code, pid: pidA, msg: { type: 'signal', to: pidB, data: { kind: 'teste' } } });
  assert(d.ok === true, 'act signal: ' + JSON.stringify(d));
  const p = await get(`/api/poll?code=${code}&pid=${pidB}&since=0`);
  const txt = JSON.stringify(p.msgs || []);
  assert(/"kind":"teste"/.test(txt), 'sinal não chegou ao destino');
});

console.log(`\n${fail ? '✗' : '✓'} ${pass} testes HTTP passaram` + (fail ? `, ${fail} falharam` : '') + '\n');
process.exit(fail ? 1 : 0);
