/* Testa o caso mais recente no navegador: seleção na home, exploração,
   local trancado que abre por bandeira, pistas, depoimentos e votação.
   Uso: node tests/caso-novo.mjs [url] [caseId] */
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:3000/';
const CASE_ID = process.argv[3] || 'empresa';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const t = async (n, fn) => { try { await fn(); console.log('  ✓ ' + n); pass++; }
  catch (e) { console.log('  ✗ ' + n + '\n      ' + String(e.message).split('\n')[0]); fail++; } };
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const tela = p => p.evaluate(() => [...document.querySelectorAll('.screen')].filter(s => s.classList.contains('active')).map(s => s.id)[0]);

const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] });
const mk = async () => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await c.newPage(); p.on('pageerror', e => console.log('  ! erro: ' + e.message));
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(600); return p; };
const P = [await mk(), await mk(), await mk()];

console.log(`\nCASOS DE FAMÍLIA — caso "${CASE_ID}" no navegador\n`);

await t('o caso aparece na seleção da home', async () => {
  const titulos = await P[0].$$eval('.case-opt small', e => e.map(x => x.textContent));
  const dados = await P[0].evaluate(async (id) => { const m = await import('/shared/cases.js'); const c = m.getCase(id); return c.title; }, CASE_ID);
  assert(titulos.includes(dados), 'títulos=' + titulos.join(' | '));
  const opts = await P[0].$$('.case-opt');
  const idx = await P[0].evaluate(async (id) => { const m = await import('/shared/cases.js'); return m.CASES.findIndex(c => c.id === id); }, CASE_ID);
  await opts[idx].click(); await sleep(300);
  assert((await P[0].textContent('#case-title')).trim() === dados, 'não selecionou: ' + await P[0].textContent('#case-title'));
});

await t('sala criada com o caso escolhido', async () => {
  await P[0].fill('#input-name', 'Ana'); await P[0].click('#btn-create'); await sleep(1500);
  const code = (await P[0].textContent('#lobby-code')).trim();
  assert(/^FAM-/.test(code), 'código=' + code);
  for (let i = 1; i < 3; i++) {
    await P[i].fill('#input-name', 'Jog' + i); await P[i].click('#btn-join'); await sleep(300);
    await P[i].fill('#modal-root input', code); await P[i].click('#modal-root .btn-red'); await sleep(1100);
  }
  assert(await P[0].evaluate((id) => window.__c47.net.state.caseId === id, CASE_ID), 'caseId errado');
});

await P[0].click('#btn-start'); await sleep(900);
for (const p of P) for (let i = 0; i < 12; i++) { if (await tela(p) === 'screen-role') break; await p.click('#btn-brief-next'); await sleep(260); }
for (const p of P) { await p.click('#btn-role-ok'); await sleep(500); await p.click('#modal-root .btn-ghost').catch(() => {}); }
await sleep(500);

await t('todos os locais aparecem na barra, com o trancado marcado', async () => {
  const locais = await P[0].$$eval('.loc-btn', e => e.map(x => ({ txt: x.textContent, locked: x.classList.contains('locked') })));
  assert(locais.length === 5, 'locais=' + locais.map(l => l.txt).join('/'));
  assert(locais.some(l => l.locked), 'nenhum local trancado');
});

await t('investigar o cofre dá pista e libera o arquivo', async () => {
  const antes = await P[0].evaluate(() => window.__c47.net.state.clues.length);
  await P[0].evaluate(() => window.__c47.net.action({ type: 'travel', scene: 'escritorio' }));
  await sleep(700);
  await P[0].evaluate(() => window.__c47.game.clickObject('cofre')); await sleep(350);
  await P[0].evaluate(() => window.__c47.game.pickAction(0)); await sleep(1200);
  const depois = await P[0].evaluate(() => window.__c47.net.state.clues);
  assert(depois.length > antes, 'sem pista nova');
  assert(depois.includes('cofre_aberto'), 'pista do cofre não veio: ' + depois.join(','));
  const trancados = await P[0].$$eval('.loc-btn', e => e.filter(x => x.classList.contains('locked')).length);
  assert(trancados === 0, 'arquivo continua trancado');
});

await t('é possível entrar no local que abriu e investigar a escada', async () => {
  await P[0].evaluate(() => window.__c47.net.action({ type: 'travel', scene: 'arquivo' }));
  await sleep(900);
  assert(await P[0].evaluate(() => window.__c47.net.state.players[window.__c47.net.playerId].scene) === 'arquivo', 'não entrou');
  await P[0].evaluate(() => window.__c47.game.clickObject('escada')); await sleep(350);
  await P[0].evaluate(() => window.__c47.game.pickAction(0)); await sleep(1200);
  assert((await P[0].evaluate(() => window.__c47.net.state.clues)).includes('graxa_escada'), 'pista da escada faltou');
});

await t('setas de saída da cena funcionam (nav)', async () => {
  const nav = await P[0].evaluate(() => { const L = window.__c47.game.loc(); return window.__c47.game.navOf(L).map(n => ({ to: n.to, x: n.x, w: n.w })); });
  assert(nav.length >= 1, 'sem saídas');
  assert(nav.every(n => Number.isFinite(n.x) && Number.isFinite(n.w)), 'saída sem geometria: ' + JSON.stringify(nav));
});

await t('depoimento de testemunha entrega pista', async () => {
  await P[0].evaluate(() => window.__c47.UI.handlers.onTalk('ti'));
  await sleep(700);
  const botoes = await P[0].$$eval('#modal-body .am-act', e => e.length);
  assert(botoes >= 3, 'tópicos=' + botoes);
  await P[0].evaluate(() => [...document.querySelectorAll('#modal-body .am-act')][0].click());
  await sleep(1200);
  await P[0].click('#modal-close').catch(() => {});
  assert((await P[0].evaluate(() => window.__c47.net.state.clues)).includes('camera_21h12'), 'pista do depoimento faltou');
});

await t('pistas aparecem no painel de evidências com os níveis', async () => {
  await P[0].click('#btn-clues'); await sleep(600);
  const cards = await P[0].$$eval('.ev', e => e.length);
  const niveis = await P[0].$$eval('.lvl', e => [...new Set(e.map(x => x.textContent))]);
  assert(cards >= 3, 'cards=' + cards);
  assert(niveis.some(n => /FACIL|MEDIO|DIFICIL/.test(n)), 'níveis=' + niveis.join(','));
  await P[0].click('#panel-close');
});

await t('votação encerra o caso com placar', async () => {
  const papel = await Promise.all(P.map(p => p.evaluate(() => window.__c47.net.secret?.role)));
  const k = papel.indexOf('killer');
  const idK = await P[k].evaluate(() => window.__c47.net.playerId);
  const votar = async (p, alvo) => {
    await p.evaluate(() => window.__c47.UI.closePanel());
    await p.click('#btn-vote'); await sleep(500);
    await p.evaluate((a) => { const st = window.__c47.net.state, eu = window.__c47.net.playerId;
      const ordem = Object.keys(st.players).filter(id => id !== eu);
      [...document.querySelectorAll('#vote-body .sus')][ordem.indexOf(a)].querySelector('.mini-btn.red').click(); }, alvo);
    await sleep(400); await p.click('#vote-foot .btn-red'); await sleep(600);
    await p.click('#vote-close').catch(() => {});
  };
  for (let i = 0; i < 3; i++) if (i !== k) await votar(P[i], idK);
  const outro = await P[(k + 1) % 3].evaluate(() => window.__c47.net.playerId);
  await votar(P[k], outro);
  await sleep(2500);
  const st = await P[0].evaluate(() => ({ r: window.__c47.net.state.result, s: window.__c47.net.state.scores,
    ep: document.querySelector('#end-epilogue').textContent.trim() }));
  assert(st.r === 'investigators', 'resultado=' + st.r);
  assert(Object.values(st.s).some(v => v > 0), 'ninguém pontuou: ' + JSON.stringify(st.s));
  assert(st.ep.length > 60, 'epílogo curto');
});

await b.close();
console.log(`\n${fail ? '✗' : '✓'} ${pass} testes do caso passaram` + (fail ? `, ${fail} falharam` : '') + '\n');
process.exit(fail ? 1 : 0);
