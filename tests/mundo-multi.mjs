/* Movimento multiplayer: dois jogadores se veem andando pelo mundo.
   Uso: node tests/mundo-multi.mjs [url] */
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:3000/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const t = async (n, fn) => { try { await fn(); console.log('  ✓ ' + n); pass++; } catch (e) { console.log('  ✗ ' + n + '\n      ' + String(e.message).split('\n')[0]); fail++; } };
const assert = (c, m) => { if (!c) throw new Error(m || 'falhou'); };

const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] });
const mk = async () => {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  p.on('pageerror', e => console.log('  ! erro JS: ' + e.message));
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(1400);
  return p;
};
const A = await mk(), B = await mk();
const tela = p => p.evaluate(() => [...document.querySelectorAll('.screen')].filter(s => s.classList.contains('active')).map(s => s.id)[0]);

console.log('\nMUNDO MULTIPLAYER — 2 jogadores\n');

await A.fill('#input-name', 'Ana'); await A.click('#btn-create'); await sleep(1900);
const code = (await A.textContent('#lobby-code')).trim();
await B.fill('#input-name', 'Bia'); await B.click('#btn-join'); await sleep(400);
await B.fill('#modal-root input', code); await B.click('#modal-root .btn-red'); await sleep(1900);
await A.click('#btn-start'); await sleep(1300);
for (const p of [A, B]) for (let i = 0; i < 12; i++) { if (await tela(p) === 'screen-role') break; await p.click('#btn-brief-next'); await sleep(270); }
for (const p of [A, B]) { await p.click('#btn-role-ok'); await sleep(650); await p.click('#modal-root .btn-ghost').catch(() => { }); }
await sleep(1600);

await t('cada jogador entra no mundo com o mesmo mapa', async () => {
  const ma = await A.evaluate(() => ({ r: window.__c47.game.world.map.rooms.length, o: window.__c47.game.world.map.objects.length }));
  const mb = await B.evaluate(() => ({ r: window.__c47.game.world.map.rooms.length, o: window.__c47.game.world.map.objects.length }));
  assert(ma.r === mb.r && ma.o === mb.o, 'mapas diferentes: ' + JSON.stringify(ma) + ' vs ' + JSON.stringify(mb));
});

await t('B vê A andar em tempo real', async () => {
  const antes = await A.evaluate(() => Math.round(window.__c47.game.world.me.x));
  await A.keyboard.down('ArrowRight'); await sleep(1800); await A.keyboard.up('ArrowRight');
  await sleep(1400);
  const meu = await A.evaluate(() => ({ x: Math.round(window.__c47.game.world.me.x), y: Math.round(window.__c47.game.world.me.y) }));
  const visto = await B.evaluate(() => [...(window.__c47.game.world?.actors || [])]
    .map(([id, o]) => ({ id, x: Math.round(o.x), y: Math.round(o.y), nome: window.__c47.net.state.players[id]?.name })));
  const v = visto.find(x => x.nome === 'Ana');
  assert(v, 'B não vê Ana: ' + JSON.stringify(visto));
  const andou = Math.abs(meu.x - antes) > 100;
  assert(andou, 'A não andou o suficiente: ' + antes + ' -> ' + meu.x);
  assert(Math.abs(v.x - meu.x) < 70 && Math.abs(v.y - meu.y) < 120,
    `posição diferente: A em ${meu.x},${meu.y} · B vê ${v.x},${v.y}`);
  console.log(`      A andou de ${antes} para ${meu.x} · B vê Ana em ${v.x},${v.y}`);
});

await t('A também vê B se mover', async () => {
  const antesB = await B.evaluate(() => Math.round(window.__c47.game.world.me.x));
  await B.keyboard.down('ArrowLeft'); await sleep(1500); await B.keyboard.up('ArrowLeft');
  await sleep(1300);
  const meuB = await B.evaluate(() => Math.round(window.__c47.game.world.me.x));
  const vistos = await A.evaluate(() => [...(window.__c47.game.world?.actors || [])]
    .map(([id, o]) => ({ tx: Math.round(o.tx), nome: window.__c47.net.state.players[id]?.name })));
  const v = vistos.find(x => x.nome === 'Bia');
  assert(v, 'A não vê Bia');
  assert(Math.abs(meuB - antesB) > 60, 'B não andou: ' + antesB + ' -> ' + meuB);
  assert(Math.abs(v.tx - meuB) < 70, ` dessincronizado: B em ${meuB}, A vê ${v.tx}`);
});

await t('os dois continuam investigando juntos (pista aparece para os dois)', async () => {
  await A.evaluate(() => {
    const w = window.__c47.game.world;
    const o = w.map.objects[0];
    w.me.x = o.cx; w.me.y = o.cy + 60; w.abrirBalao(o);
  });
  await sleep(600);
  await A.evaluate(() => document.querySelector('.bal-act').click());
  await sleep(1600);
  const pistas = await Promise.all([A, B].map(p => p.evaluate(() => window.__c47.net.state.clues.length)));
  assert(pistas[0] >= 1 && pistas[1] >= 1, 'pista não chegou para os dois: ' + JSON.stringify(pistas));
});

await b.close();
console.log(`\n${fail ? '✗' : '✓'} ${pass} testes de mundo multiplayer passaram${fail ? ', ' + fail + ' falharam' : ''}\n`);
process.exit(fail ? 1 : 0);
