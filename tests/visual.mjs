/* Captura as telas principais para conferência visual (mobile e desktop). */
import { chromium } from 'playwright';
import fs from 'node:fs';
const URL = process.argv[2] || 'http://localhost:3000/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dir = 'preview';
fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] });

const tamanhos = [
  { nome: 'iphone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { nome: 'android', viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true }
];
for (const cfg of tamanhos) {
  const ctx = await b.newContext(cfg);
  const P = [];
  for (let i = 0; i < 3; i++) { const p = await ctx.newPage(); await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(600); P.push(p); }
  const tela = p => p.evaluate(() => [...document.querySelectorAll('.screen')].filter(s => s.classList.contains('active')).map(s => s.id)[0]);
  const shot = (p, n) => p.screenshot({ path: `${dir}/${cfg.nome}-${n}.png` });

  await P[0].fill('#input-name', 'Ana');
  await shot(P[0], '01-home');
  await P[0].click('#btn-create'); await sleep(1600);
  const code = (await P[0].textContent('#lobby-code')).trim();
  for (let i = 1; i < 3; i++) {
    await P[i].fill('#input-name', ['Bruno', 'Célia'][i - 1]);
    await P[i].click('#btn-join'); await sleep(400);
    await P[i].fill('#modal-root input', code); await P[i].click('#modal-root .btn-red'); await sleep(1300);
  }
  await shot(P[0], '02-sala');
  await P[0].click('#btn-start'); await sleep(1000);
  await shot(P[0], '03-briefing');
  for (const p of P) for (let i = 0; i < 9; i++) { if (await tela(p) === 'screen-role') break; await p.click('#btn-brief-next'); await sleep(300); }
  const papel = await Promise.all(P.map(p => p.evaluate(() => window.__c47.net.secret?.role)));
  const k = papel.indexOf('killer');
  await shot(P[k], '04-papel-assassino');
  await shot(P[(k + 1) % 3], '05-papel-investigador');
  for (const p of P) { await p.click('#btn-role-ok'); await sleep(700); await p.click('#modal-root .btn-ghost').catch(() => {}); }
  await sleep(600);
  // investiga para ter evidências
  await P[0].evaluate(async () => { const m = await import('/shared/cases.js'); const C = m.getCase(window.__c47.net.state.caseId);
    const alvos = []; for (const L of C.locations) for (const o of (L.objects||[])) for (const a of (o.actions||[]))
      if ((a.effects||[]).some(e => e.t === 'clue')) alvos.push({ scene:L.id, objId:o.id, actionId:a.id });
    alvos.slice(0,5).forEach(t => window.__c47.net.action({ type:'interact', ...t })); });
  await sleep(1800);
  await shot(P[0], '06-cena');
  await P[0].click('#btn-clues'); await sleep(700); await shot(P[0], '07-evidencias');
  await P[0].evaluate(() => { window.__c47.UI.closePanel(); window.__c47.UI.openPanel('suspeitos'); }); await sleep(500);
  await shot(P[0], '08-suspeitos');
  await P[0].evaluate(() => window.__c47.UI.closePanel());
  await P[0].click('#btn-vote'); await sleep(700); await shot(P[0], '09-votacao');
  await P[0].evaluate(() => document.querySelectorAll('#vote-body .sus')[0]?.querySelector('.mini-btn.red')?.click());
  await sleep(500); await shot(P[0], '10-confirmar-voto');
  await P[0].click('#vote-close');
  await ctx.close();
  console.log(`telas de ${cfg.nome} salvas em ${dir}/ (sala ${code})`);
}
await b.close();
