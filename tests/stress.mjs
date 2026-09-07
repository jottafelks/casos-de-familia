/* =============================================================================
   CASOS DE FAMÍLIA — robustez: partida cheia (6 jogadores), microfone negado
   e telas muito pequenas (320 px).
   Requer o servidor rodando.  Uso: node tests/stress.mjs [url]
   ========================================================================== */
import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:3000/';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const t = async (nome, fn) => {
  try { await fn(); console.log('  ✓ ' + nome); pass++; }
  catch (e) { console.log('  ✗ ' + nome + '\n      ' + String(e.message).split('\n')[0]); fail++; }
};
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const tela = (p) => p.evaluate(() => [...document.querySelectorAll('.screen')].filter(s => s.classList.contains('active')).map(s => s.id)[0]);

console.log('\nCASOS DE FAMÍLIA — robustez\n');

/* =========================================================== 6 JOGADORES */
console.log('partida completa com 6 jogadores');
{
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] });
  const P = [];
  for (let i = 0; i < 6; i++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('  ! erro de página: ' + e.message));
    await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(500);
    P.push(p);
  }
  let code;
  await t('seis jogadores entram na mesma sala', async () => {
    await P[0].fill('#input-name', 'Ana'); await P[0].click('#btn-create'); await sleep(1500);
    code = (await P[0].textContent('#lobby-code')).trim();
    for (let i = 1; i < 6; i++) {
      await P[i].fill('#input-name', 'Jog' + i);
      await P[i].click('#btn-join'); await sleep(300);
      await P[i].fill('#modal-root input', code);
      await P[i].click('#modal-root .btn-red'); await sleep(1000);
    }
    for (const p of P) assert(await p.$$eval('.pcard', e => e.length) === 6, 'cartões=' + await p.$$eval('.pcard', e => e.length));
    assert(await P[0].textContent('#lobby-count') === '6', 'contador');
  });

  await P[0].click('#btn-start'); await sleep(1000);
  for (const p of P) for (let i = 0; i < 12; i++) { if (await tela(p) === 'screen-role') break; await p.click('#btn-brief-next'); await sleep(260); }
  let papel, k;
  await t('exatamente um assassino entre os seis', async () => {
    papel = await Promise.all(P.map(p => p.evaluate(() => window.__c47.net.secret?.role)));
    assert(papel.filter(r => r === 'killer').length === 1, 'papéis=' + papel.join(','));
    k = papel.indexOf('killer');
  });

  for (const p of P) { await p.click('#btn-role-ok'); await sleep(500); await p.click('#modal-root .btn-ghost').catch(() => {}); }
  await sleep(600);

  await t('cena com cronômetro de 10 min e os 6 jogadores visíveis', async () => {
    for (const p of P) assert(await tela(p) === 'screen-game', 'tela=' + await tela(p));
    const relogio = (await P[0].textContent('#timer-text')).trim();
    assert(/^0?9:5\d$/.test(relogio), 'cronômetro=' + relogio);
    assert(await P[0].$$eval('.pchip', e => e.length) === 6, 'chips');
  });

  await t('pista encontrada por um chega aos outros cinco', async () => {
    await P[0].evaluate(() => window.__c47.game.clickObject('relogio')); await sleep(350);
    await P[0].evaluate(() => window.__c47.game.pickAction(0)); await sleep(1500);
    for (const p of P) assert(await p.evaluate(() => window.__c47.net.state.clues.length) >= 1, 'sem pista');
  });

  const votar = async (p, alvo) => {
    await p.evaluate(() => window.__c47.UI.closePanel());
    await p.click('#btn-vote'); await sleep(500);
    await p.evaluate((a) => {
      const st = window.__c47.net.state, eu = window.__c47.net.playerId;
      const ordem = Object.keys(st.players).filter(id => id !== eu);
      [...document.querySelectorAll('#vote-body .sus')][ordem.indexOf(a)].querySelector('.mini-btn.red').click();
    }, alvo);
    await sleep(400); await p.click('#vote-foot .btn-red'); await sleep(600);
    await p.click('#vote-close').catch(() => {});
  };

  await t('votação com maioria (4 de 6 no assassino) e placar correto', async () => {
    const idK = await P[k].evaluate(() => window.__c47.net.playerId);
    const outros = [0, 1, 2, 3, 4, 5].filter(i => i !== k);
    for (let n = 0; n < 4; n++) await votar(P[outros[n]], idK);      // 4 acertam
    await votar(P[outros[4]], await P[outros[0]].evaluate(() => window.__c47.net.playerId)); // 1 erra
    await votar(P[k], await P[outros[1]].evaluate(() => window.__c47.net.playerId));         // assassino
    await sleep(3000);

    const st = await P[0].evaluate(() => ({
      resultado: window.__c47.net.state.result,
      scores: window.__c47.net.state.scores,
      deltas: window.__c47.net.state.reveal?.deltas,
      killer: window.__c47.net.state.reveal?.killerId
    }));
    assert(st.resultado === 'investigators', 'resultado=' + st.resultado);
    const certos = Object.entries(st.deltas).filter(([pid]) => pid !== st.killer).filter(([, d]) => d === 100).length;
    const errados = Object.entries(st.deltas).filter(([pid]) => pid !== st.killer).filter(([, d]) => d === -50).length;
    assert(certos === 4, 'acertaram ' + certos + ' (esperado 4)');
    assert(errados === 1, 'erraram ' + errados + ' (esperado 1)');
    // pego: perde pontos (os objetivos podem amenizar até zerar, nunca deixar positivo)
    assert(st.deltas[st.killer] <= 0, 'assassino pego com saldo positivo: ' + st.deltas[st.killer]);
    assert(st.deltas[st.killer] >= -100, 'perda além do previsto: ' + st.deltas[st.killer]);
    for (const p of P) assert(await tela(p) === 'screen-end', 'tela final');
    const linhas = await P[0].$$eval('.score-row', e => e.length);
    assert(linhas >= 6, 'ranking com ' + linhas + ' linhas');
  });

  await b.close();
}

/* ==================================================== MICROFONE NEGADO */
console.log('\njogar sem microfone (permissão negada)');
{
  // navegador SEM fake device: getUserMedia falha como num celular sem permissão
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] });
  const P = [];
  for (let i = 0; i < 2; i++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('  ! erro de página: ' + e.message));
    await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(500);
    P.push(p);
  }
  await P[0].fill('#input-name', 'Ana'); await P[0].click('#btn-create'); await sleep(1400);
  const code = (await P[0].textContent('#lobby-code')).trim();
  await P[1].fill('#input-name', 'Bruno'); await P[1].click('#btn-join'); await sleep(300);
  await P[1].fill('#modal-root input', code); await P[1].click('#modal-root .btn-red'); await sleep(1200);
  await P[0].click('#btn-start'); await sleep(900);
  for (const p of P) for (let i = 0; i < 12; i++) { if (await tela(p) === 'screen-role') break; await p.click('#btn-brief-next'); await sleep(260); }
  for (const p of P) { await p.click('#btn-role-ok'); await sleep(500); }

  await t('o jogo pergunta pelo microfone ao entrar na cena', async () => {
    assert(await P[0].isVisible('#modal-root'), 'modal não apareceu');
    const txt = await P[0].textContent('#modal-title');
    assert(/VOZ|MICROFONE/i.test(txt), 'título=' + txt);
  });

  await t('sem permissão, mostra mensagem amigável e o jogo continua', async () => {
    await P[0].click('#modal-root .btn-red');                 // 🎤 ATIVAR MICROFONE
    await sleep(3000);
    const v = await P[0].evaluate(() => ({ erro: window.__c47.voice?.error, disp: window.__c47.voice?.available }));
    assert(!v.disp, 'voz ficou disponível mesmo sem microfone');
    const aviso = await P[0].textContent('#toasts');
    assert(/microfone/i.test(aviso), 'aviso=' + aviso.trim().slice(0, 80));
    // continua jogável
    await P[0].click('#btn-clues'); await sleep(500);
    assert(await P[0].isVisible('#panel'), 'painel não abre sem microfone');
    await P[0].click('#panel-close'); await sleep(200);
    await P[0].click('#btn-chat'); await sleep(400);
    await P[0].fill('#panel-body .chat-form input', 'sem mic e jogando');
    await P[0].press('#panel-body .chat-form input', 'Enter'); await sleep(1200);
    await P[1].evaluate(() => window.__c47.UI.openPanel('chat')); await sleep(400);
    assert((await P[1].textContent('#panel-body')).includes('sem mic'), 'chat quebrou sem microfone');
  });

  await t('dá para tentar o microfone de novo pelo botão 🎤', async () => {
    await P[0].click('#btn-mic'); await sleep(1500);
    assert(await tela(P[0]) === 'screen-game', 'saiu da cena ao tentar reativar');
  });

  await b.close();
}

/* ==================================================== TELA DE 320 px */
console.log('\ntela pequena (320 px) e alvos de toque');
{
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('  ! erro de página: ' + e.message));
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(700);

  const semTransbordo = async (onde) => {
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    assert(m.sw <= m.cw + 1, `transbordo horizontal em ${onde}: scrollWidth ${m.sw} > ${m.cw}`);
  };
  const alvos = async (sel, min) => {
    const hs = await p.$$eval(sel, e => e.map(x => x.getBoundingClientRect().height));
    const pequenos = hs.filter(h => h > 0 && h < min);
    assert(pequenos.length === 0, `${sel}: ${pequenos.length} alvo(s) abaixo de ${min}px (${pequenos.map(Math.round).join(',')})`);
  };

  await t('home cabe em 320 px e os botões são grandes', async () => {
    await semTransbordo('home');
    await alvos('.case-opt', 40);
    await alvos('.btn-big', 44);
  });

  await t('sala cabe em 320 px', async () => {
    await p.fill('#input-name', 'Ana'); await p.click('#btn-create'); await sleep(1400);
    await semTransbordo('sala');
    await alvos('.lobby-foot .btn', 44);
  });

  await p.click('#btn-start'); await sleep(900);
  await t('briefing cabe em 320 px', async () => {
    await semTransbordo('briefing');
    await alvos('#btn-brief-next', 44);
    const fonte = await p.$eval('#brief-text', e => parseFloat(getComputedStyle(e).fontSize));
    assert(fonte >= 14, 'texto do briefing pequeno: ' + fonte + 'px');
  });

  for (let i = 0; i < 12; i++) { if (await tela(p) === 'screen-role') break; await p.click('#btn-brief-next'); await sleep(260); }
  await t('cartão secreto cabe em 320 px e fica legível', async () => {
    await semTransbordo('papel');
    const fonte = await p.$eval('#role-card', e => parseFloat(getComputedStyle(e).fontSize));
    assert(fonte >= 13, 'texto do papel pequeno: ' + fonte + 'px');
    await p.click('#btn-role-ok'); await sleep(600);
  });

  await t('a cena cabe em 320 px, com locais e ações grandes', async () => {
    await p.click('#modal-root .btn-ghost').catch(() => {});
    await sleep(500);
    await semTransbordo('cena');
    await alvos('.loc-btn', 44);
    await alvos('.hud-actions .pill', 40);
    const fonte = await p.$eval('#timer-text', e => parseFloat(getComputedStyle(e).fontSize));
    assert(fonte >= 15, 'cronômetro pequeno: ' + fonte + 'px');
  });

  await b.close();
}

console.log(`\n${fail ? '✗' : '✓'} ${pass} testes de robustez passaram` + (fail ? `, ${fail} falharam` : '') + '\n');
process.exit(fail ? 1 : 0);
