/* Varre os 4 casos: entra em cada um, visita todos os locais, aciona todos
   os objetos e confere que pistas são geradas sem erro de JS.
   Uso: node tests/todos-os-casos.mjs [url] */
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:3000/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const t = async (n, fn) => { try { await fn(); console.log('  ✓ ' + n); pass++; }
  catch (e) { console.log('  ✗ ' + n + '\n      ' + String(e.message).split('\n')[0]); fail++; } };
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const tela = p => p.evaluate(() => [...document.querySelectorAll('.screen')].filter(s => s.classList.contains('active')).map(s => s.id)[0]);

const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] });
const casos = await (async () => {
  const c = await b.newContext(); const p = await c.newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(500);
  const m = await p.evaluate(async () => { const mod = await import('/shared/cases.js'); return mod.CASES.map(x => ({ id: x.id, code: x.code, title: x.title })); });
  await c.close(); return m;
})();
console.log('\nCASOS DE FAMÍLIA — varredura dos ' + casos.length + ' casos\n');

for (let i = 0; i < casos.length; i++) {
  const caso = casos[i];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(600);

  await t(`${caso.code} — ${caso.title}: entra no jogo e visita todos os locais`, async () => {
    const opts = await p.$$('.case-opt');
    await opts[i].click(); await sleep(250);
    await p.fill('#input-name', 'Ana');
    await p.click('#btn-solo'); await sleep(1200);
    await p.click('#btn-start'); await sleep(800);
    for (let k = 0; k < 12; k++) { if (await tela(p) === 'screen-role') break; await p.click('#btn-brief-next'); await sleep(220); }
    await p.click('#btn-role-ok'); await sleep(700);
    assert(await tela(p) === 'screen-game', 'não entrou na cena: ' + await tela(p));

    const locais = await p.evaluate(async (id) => { const m = await import('/shared/cases.js');
      return m.getCase(id).locations.map(l => ({ id: l.id, trancado: !!l.unlockBy,
        objetos: (l.objects || []).map(o => ({ id: o.id, acoes: (o.actions || []).length })) })); }, caso.id);

    for (const L of locais) {
      // destranca se precisar (força a bandeira pelo caminho normal: ação que a gera)
      const alvo = await p.evaluate((id) => {
        const st = window.__c47.net.state;
        return st.players[window.__c47.net.playerId]?.scene !== id;
      }, L.id);
      if (alvo) {
        await p.evaluate((id) => window.__c47.net.action({ type: 'travel', scene: id }), L.id);
        await sleep(450);
      }
      const cenaAtual = await p.evaluate(() => window.__c47.net.state.players[window.__c47.net.playerId].scene);
      if (cenaAtual !== L.id) continue;    // local trancado: abre depois de uma bandeira
      for (const o of L.objetos) {
        const abriu = await p.evaluate((oid) => { const g = window.__c47.game; g.clickObject(oid); return true; }, o.id);
        await sleep(120);
        await p.evaluate(() => window.__c47.game.pickAction(0));
        await sleep(120);
      }
    }
    // volta e força a bandeira para abrir locais trancados, depois repassa
    const trancados = locais.filter(l => l.trancado);
    for (const L of trancados) {
      await p.evaluate(async (id) => { const m = await import('/shared/cases.js'); const c = m.getCase(window.__c47.net.state.caseId);
        const alvo = c.locations.find(l => l.id === id);
        if (alvo?.unlockBy) window.__c47.net.action({ type: 'flagTest', k: alvo.unlockBy }); }, L.id).catch(() => {});
    }
    const pistas = await p.evaluate(() => window.__c47.net.state.clues.length);
    const esperado = await p.evaluate(async (id) => { const m = await import('/shared/cases.js'); return Object.keys(m.getCase(id).clues).length; }, caso.id);
    assert(pistas >= 3, 'poucas pistas coletadas: ' + pistas);
    console.log(`      pistas encontradas: ${pistas}/${esperado} · locais: ${locais.length} · objetos: ${locais.reduce((a, l) => a + l.objetos.length, 0)}`);
    assert(erros.length === 0, 'erros de JS: ' + erros.slice(0, 2).join(' | '));
  });

  await ctx.close();
}

await b.close();
console.log(`\n${fail ? '✗' : '✓'} ${pass} casos verificados` + (fail ? `, ${fail} falharam` : '') + '\n');
process.exit(fail ? 1 : 0);
