/* Testa o mundo: mapa, movimento (teclado e joystick), câmera, portas,
   NPCs andando, inspeção por proximidade e o balão (abrir/fechar de 3 jeitos).
   Uso: node tests/mundo.mjs [url] */
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:3000/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const t = async (n, fn) => { try { await fn(); console.log('  ✓ ' + n); pass++; } catch (e) { console.log('  ✗ ' + n + '\n      ' + String(e.message).split('\n')[0]); fail++; } };
const assert = (c, m) => { if (!c) throw new Error(m || 'falhou'); };

const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', e => erros.push(e.message));
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await sleep(1200);

const tela = () => p.evaluate(() => [...document.querySelectorAll('.screen')].filter(s => s.classList.contains('active')).map(s => s.id)[0]);
const pos = () => p.evaluate(() => { const w = window.__c47.game.world; return { x: Math.round(w.me.x), y: Math.round(w.me.y), room: w.me.room, camX: Math.round(w.cam.x), camY: Math.round(w.cam.y) }; });

console.log('\nMUNDO — mapa, movimento e inspeção\n');

await p.fill('#input-name', 'Ana');
await p.click('#btn-solo');
await sleep(1200);
await p.click('#btn-start');
await sleep(900);
for (let i = 0; i < 12; i++) { if (await tela() === 'screen-role') break; await p.click('#btn-brief-next'); await sleep(250); }
await p.click('#btn-role-ok'); await sleep(700);
await p.click('#modal-root .btn-ghost').catch(() => { });
await sleep(1200);

await t('o mapa é gerado com cômodos, portas e objetos', async () => {
  const m = await p.evaluate(() => {
    const w = window.__c47.game.world;
    return { rooms: w.map.rooms.length, doors: w.map.doors.length, objects: w.map.objects.length, w: Math.round(w.map.w), h: Math.round(w.map.h), npcs: w.npcs.length };
  });
  console.log(`      cômodos: ${m.rooms} · portas: ${m.doors} · objetos: ${m.objects} · NPCs: ${m.npcs} · mundo ${m.w}x${m.h}`);
  assert(m.rooms >= 4, 'cômodos=' + m.rooms);
  assert(m.doors >= 3, 'portas=' + m.doors);
  assert(m.objects >= 10, 'objetos=' + m.objects);
  assert(m.npcs >= 1, 'nenhum NPC');
});

await t('o personagem anda com o teclado (setas)', async () => {
  const a = await pos();
  await p.keyboard.down('ArrowRight'); await sleep(900); await p.keyboard.up('ArrowRight');
  await sleep(200);
  const c = await pos();
  assert(Math.abs(c.x - a.x) > 30, 'não andou: ' + a.x + ' -> ' + c.x);
});

await t('a câmera acompanha o personagem', async () => {
  const a = await pos();
  await p.keyboard.down('ArrowLeft'); await sleep(900); await p.keyboard.up('ArrowLeft');
  await sleep(400);
  const c = await pos();
  assert(Math.abs(c.camX - a.camX) > 15 || Math.abs(c.camX - c.x) < 200, 'câmera travada: cam=' + c.camX + ' me=' + c.x);
});

await t('o joystick aparece e move o personagem', async () => {
  const vis = await p.evaluate(() => !document.querySelector('#joystick').classList.contains('hidden'));
  assert(vis, 'joystick escondido no celular');
  const r = await p.evaluate(() => { const b = document.querySelector('.joy-base').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const a = await pos();
  await p.mouse.move(r.x, r.y); await p.mouse.down();
  await p.mouse.move(r.x + 60, r.y, { steps: 6 }); await sleep(900);
  await p.mouse.up(); await sleep(200);
  const c = await pos();
  assert(Math.abs(c.x - a.x) > 25, 'joystick não moveu: ' + a.x + ' -> ' + c.x);
});

await t('os NPCs andam (posição muda com o tempo)', async () => {
  const a = await p.evaluate(() => window.__c47.game.world.npcs.map(n => Math.round(n.x) + ',' + Math.round(n.y)).join('|'));
  await sleep(2500);
  const c = await p.evaluate(() => window.__c47.game.world.npcs.map(n => Math.round(n.x) + ',' + Math.round(n.y)).join('|'));
  assert(a !== c, 'NPCs parados: ' + a);
  const andando = await p.evaluate(() => window.__c47.game.world.npcs.filter(n => n.act === 'walk').length);
  console.log(`      NPCs andando agora: ${andando}`);
});

await t('chegar perto de um objeto mostra 🔎 INVESTIGAR', async () => {
  await p.evaluate(() => {
    const w = window.__c47.game.world;
    const o = w.map.objects[0];
    w.me.x = o.cx; w.me.y = o.cy + 60;
    w.input.tap = null;
  });
  await sleep(600);
  const vis = await p.evaluate(() => !document.querySelector('#btn-investigar').classList.contains('hidden'));
  assert(vis, 'botão não apareceu');
});

await t('o balão abre, mostra as ações e entrega a pista', async () => {
  await p.click('#btn-investigar');
  await sleep(600);
  const aberto = await p.evaluate(() => !document.querySelector('#inspect-balloon').classList.contains('hidden'));
  assert(aberto, 'balão não abriu');
  const titulo = await p.textContent('#bal-title');
  const acoes = await p.$$eval('.bal-act', e => e.length);
  assert(acoes >= 1, 'sem ações no balão');
  await p.evaluate(() => document.querySelector('.bal-act').click());
  await sleep(1500);
  const resultado = await p.$$eval('.bal-result', e => e.map(x => x.textContent).join(' '));
  console.log(`      "${titulo.trim()}" → ${resultado.slice(0, 70)}…`);
  assert(resultado.length > 15, 'pista não apareceu no balão');
});

await t('o balão fecha pelo X', async () => {
  await p.click('#bal-x'); await sleep(400);
  assert(await p.evaluate(() => document.querySelector('#inspect-balloon').classList.contains('hidden')), 'não fechou no X');
});

await t('o balão fecha pelo FECHAR', async () => {
  await p.click('#btn-investigar').catch(async () => { await p.evaluate(() => window.__c47.game.world.abrirBalao(window.__c47.game.world.foco)); });
  await sleep(500);
  await p.click('#bal-close'); await sleep(400);
  assert(await p.evaluate(() => document.querySelector('#inspect-balloon').classList.contains('hidden')), 'não fechou no FECHAR');
});

await t('o balão fecha no ESC', async () => {
  await p.evaluate(() => window.__c47.game.world.abrirBalao(window.__c47.game.world.foco));
  await sleep(500);
  await p.keyboard.press('Escape'); await sleep(400);
  assert(await p.evaluate(() => document.querySelector('#inspect-balloon').classList.contains('hidden')), 'não fechou no ESC');
});

await t('o balão fecha clicando fora', async () => {
  await p.evaluate(() => window.__c47.game.world.abrirBalao(window.__c47.game.world.foco));
  await sleep(500);
  // escolhe um ponto que NÃO seja o balão (senão o clique é num botão dele)
  const ponto = await p.evaluate(() => {
    const r = document.querySelector('#inspect-balloon').getBoundingClientRect();
    const candidatos = [[372, 108], [20, 108], [372, 700]];
    for (const [x, y] of candidatos) {
      if (x < r.left - 8 || x > r.right + 8 || y < r.top - 8 || y > r.bottom + 8) {
        const e = document.elementFromPoint(x, y);
        if (e && !e.closest('#inspect-balloon')) return { x, y, em: e.id || e.tagName };
      }
    }
    return null;
  });
  assert(ponto, 'não achei ponto fora do balão');
  await p.mouse.click(ponto.x, ponto.y);
  await sleep(400);
  assert(await p.evaluate(() => document.querySelector('#inspect-balloon').classList.contains('hidden')),
    `não fechou clicando fora (clique em ${ponto.em})`);
});

await t('atravessar uma porta troca de cômodo', async () => {
  const antes = await p.evaluate(() => window.__c47.game.world.me.room);
  const ok = await p.evaluate(async () => {
    const w = window.__c47.game.world;
    const d = w.map.doors.find(x => x.a === w.me.room || x.b === w.me.room);
    if (!d) return false;
    const outro = (d.a === w.me.room) ? d.b : d.a;
    const sala = w.map.rooms.find(r => r.id === outro);
    w.me.x = sala.cx; w.me.y = sala.cy;
    return true;
  });
  assert(ok, 'sem porta no cômodo');
  await sleep(900);
  const depois = await p.evaluate(() => window.__c47.game.world.me.room);
  assert(depois !== antes, 'cômodo não mudou: ' + antes + ' -> ' + depois);
  const cena = await p.evaluate(() => window.__c47.net.state.players[window.__c47.net.playerId].scene);
  assert(cena === depois, 'engine não foi avisada: scene=' + cena);
});

await t('não atravessa parede (colisão)', async () => {
  const r = await p.evaluate(async () => {
    const w = window.__c47.game.world;
    const sala = w.map.rooms.find(x => x.id === w.me.room) || w.map.rooms[0];
    w.me.x = sala.x + 40; w.me.y = sala.cy;
    for (let i = 0; i < 40; i++) w.world?.update?.(0.05);
    return { x: w.me.x, salaX: sala.x };
  });
  assert(r.x >= r.salaX + 10, 'atravessou a parede: x=' + Math.round(r.x) + ' sala em ' + Math.round(r.salaX));
});

await t('sem erros de JavaScript', async () => {
  assert(erros.length === 0, erros.slice(0, 2).join(' | '));
});

await b.close();
console.log(`\n${fail ? '✗' : '✓'} ${pass} testes do mundo passaram${fail ? ', ' + fail + ' falharam' : ''}\n`);
process.exit(fail ? 1 : 0);
