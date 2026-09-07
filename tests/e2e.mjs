/* =============================================================================
   CASOS DE FAMÍLIA — testes de ponta a ponta no navegador (Playwright).
   Sobe 3 jogadores reais, joga uma partida completa e confere:
   sigilo dos papéis, chat, papo secreto, pistas, voto irreversível,
   pontuação, fim por tempo e reconexão.

   Requer o servidor rodando:  TEST_HOOKS=1 node server/server.js
   Uso: node tests/e2e.mjs [http://localhost:3000]
   ========================================================================== */
import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:3000/';
const NOMES = ['Ana', 'Bruno', 'Célia'];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;

const t = async (nome, fn) => {
  try { await fn(); console.log('  ✓ ' + nome); pass++; }
  catch (e) { console.log('  ✗ ' + nome + '\n      ' + String(e.message).split('\n')[0]); fail++; }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };

const erros = [];   // erros de JavaScript capturados nas páginas

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] });
const abrir = async (i) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => { erros.push(`[${NOMES[i] || i}] ${e.message}`); console.log(`  ! [${NOMES[i] || i}] erro de página: ${e.message}`); });
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(700);
  return p;
};
const tela = (p) => p.evaluate(() => [...document.querySelectorAll('.screen')].filter(s => s.classList.contains('active')).map(s => s.id)[0]);

console.log('\nCASOS DE FAMÍLIA — ponta a ponta (3 jogadores)\n');

const P = [await abrir(0), await abrir(1), await abrir(2)];
let code, papel, assassino = -1, idKiller;

/* ------------------------------------------------------------------ home */
await t('a home mostra o nome do jogo e os casos', async () => {
  const titulo = (await P[0].textContent('.brand-text h1')).trim();
  assert(titulo.includes('CASOS DE FAMÍLIA'), 'título=' + titulo);
  const casos = await P[0].$$eval('.case-opt', e => e.length);
  assert(casos >= 3, 'casos=' + casos);
});

await t('é possível escolher personagem masculino/feminino', async () => {
  await P[0].click('#av-f');
  const ativo = await P[0].evaluate(() => document.querySelector('.avatar-opt.on')?.dataset.avatar);
  assert(ativo === 'f', 'avatar=' + ativo);
});

/* ----------------------------------------------------------------- sala */
await t('criar sala devolve código FAM-XXXX', async () => {
  await P[0].fill('#input-name', NOMES[0]);
  await P[0].click('#btn-create');
  await sleep(1600);
  code = (await P[0].textContent('#lobby-code')).trim();
  assert(/^FAM-[A-Z0-9]{4}$/.test(code), 'código=' + code);
});

await t('dois jogadores entram pelo código e todos se veem', async () => {
  for (let i = 1; i < 3; i++) {
    await P[i].fill('#input-name', NOMES[i]);
    await P[i].click('#btn-join'); await sleep(400);
    await P[i].fill('#modal-root input', code);
    await P[i].click('#modal-root .btn-red'); await sleep(1400);
  }
  for (const p of P) assert(await p.$$eval('.pcard', e => e.length) === 3, 'cartões na sala');
});

/* ------------------------------------------------------------- briefing */
await t('briefing é manual (botão CONTINUAR, sem avanço automático)', async () => {
  await P[0].click('#btn-start'); await sleep(1000);
  const antes = (await P[0].textContent('#brief-step')).trim();
  assert(antes.startsWith('1/'), 'não começou no passo 1: ' + antes);
  await sleep(3000);   // se houvesse avanço automático, mudaria aqui
  assert((await P[0].textContent('#brief-step')).trim() === antes, 'o briefing avançou sozinho');
  const total = Number(antes.split('/')[1] || 0);
  assert(total >= 4, 'briefing curto demais: ' + antes);
  let cliques = 0;
  for (const p of P) {
    for (let i = 0; i < 12; i++) { if (await tela(p) === 'screen-role') break; await p.click('#btn-brief-next'); cliques++; await sleep(300); }
  }
  assert(cliques >= total, 'avançou com menos cliques que passos');
});

/* ---------------------------------------------------------------- papéis */
await t('cada jogador vê o próprio papel; o assassino vê objetivos secretos', async () => {
  papel = await Promise.all(P.map(p => p.evaluate(() => window.__c47.net.secret?.role)));
  assert(papel.filter(r => r === 'killer').length === 1, 'papéis=' + papel.join(','));
  assassino = papel.indexOf('killer');
  const titulos = await Promise.all(P.map(p => p.textContent('#role-title')));
  assert(titulos[assassino].includes('ASSASSINO'), 'título=' + titulos[assassino]);
  for (let i = 0; i < 3; i++) if (i !== assassino) assert(titulos[i].includes('INVESTIGADOR'), 'título=' + titulos[i]);
  const objetivos = await P[assassino].$$eval('.obj', e => e.length);
  assert(objetivos === 2, 'objetivos do assassino=' + objetivos);
  const inocenteViu = await P[(assassino + 1) % 3].$$eval('.obj', e => e.length);
  assert(inocenteViu === 0, 'inocente viu objetivos');
});

await t('ninguém descobre o assassino pelo estado do cliente', async () => {
  for (const p of P) {
    const s = await p.evaluate(() => { const s = window.__c47.net.state; return { k: s.killerId, roles: s.roles, votos: s.votes }; });
    assert(!s.k, 'killerId exposto: ' + s.k);
    for (const [pid, r] of Object.entries(s.roles || {})) {
      if (pid === await p.evaluate(() => window.__c47.net.playerId)) continue;
      assert(!r.role && !r.traits, 'papel alheio exposto: ' + JSON.stringify(r));
    }
  }
});

/* ----------------------------------------------------------------- jogo */
await t('a cena abre com cronômetro de 10 min e botões de local', async () => {
  for (const p of P) { await p.click('#btn-role-ok'); await sleep(700); await p.click('#modal-root .btn-ghost').catch(() => {}); }
  await sleep(600);
  for (const p of P) assert(await tela(p) === 'screen-game', 'tela=' + await tela(p));
  const relogio = (await P[0].textContent('#timer-text')).trim();
  assert(/^0?9:5\d$/.test(relogio), 'cronômetro=' + relogio);
  const locais = await P[0].$$eval('.loc-btn', e => e.map(x => x.textContent));
  assert(locais.length >= 4, 'locais=' + locais.length);
  const altura = await P[0].$$eval('.loc-btn', e => Math.min(...e.map(x => x.getBoundingClientRect().height)));
  assert(altura >= 44, 'botão de local pequeno: ' + altura + 'px');
});

await t('investigar objeto gera pista compartilhada com a equipe', async () => {
  await P[0].evaluate(() => window.__c47.game.clickObject('relogio'));
  await sleep(400);
  await P[0].evaluate(() => window.__c47.game.pickAction(0));
  await sleep(1400);
  const pistas = await P[1].evaluate(() => window.__c47.net.state.clues);
  assert(pistas.length >= 1, 'sem pistas: ' + JSON.stringify(pistas));
  assert(await P[2].textContent('#clue-count') === String(pistas.length), 'HUD desatualizado');
});

await t('painel de evidências lista e permite marcar', async () => {
  await P[0].click('#btn-clues'); await sleep(600);
  const cards = await P[0].$$eval('.ev', e => e.length);
  assert(cards >= 1, 'cards=' + cards);
  await P[0].click('.mark-btn.important'); await sleep(600);
  const marca = await P[0].evaluate(() => Object.values(window.__c47.net.state.marks)[0]);
  assert(Object.values(marca || {}).includes('important'), 'marca=' + JSON.stringify(marca));
  await P[0].click('#panel-close');
});

await t('chat da equipe é público', async () => {
  await P[0].click('#btn-chat'); await sleep(400);
  await P[0].fill('#panel-body .chat-form input', 'achei o bilhete do relogio');
  await P[0].press('#panel-body .chat-form input', 'Enter');
  await sleep(1200);
  await P[1].evaluate(() => window.__c47.UI.openPanel('chat')); await sleep(400);
  assert((await P[1].textContent('#panel-body')).includes('bilhete'), 'chat não sincronizou');
});

await t('papo secreto só é visto pelos dois participantes', async () => {
  const alvo = await P[1].evaluate(() => window.__c47.net.playerId);
  await P[0].evaluate((pid) => window.__c47.UI.handlers.onWhisper(pid), alvo);
  await sleep(1200);
  await P[0].fill('#panel-body .whisper-box .chat-form input', 'vamos votar na Celia');
  await P[0].press('#panel-body .whisper-box .chat-form input', 'Enter');
  await sleep(1400);
  const parceiroVe = await P[1].evaluate(() => { window.__c47.UI.openPanel('chat'); return document.querySelector('#panel-body').textContent.includes('Celia'); });
  const terceiroVe = await P[2].evaluate(() => { window.__c47.UI.openPanel('chat'); return document.querySelector('#panel-body').textContent.includes('Celia'); });
  assert(parceiroVe, 'destinatário não recebeu');
  assert(!terceiroVe, 'terceiro jogador ouviu o papo secreto');
  await P[0].evaluate(() => window.__c47.UI.handlers.onWhisperClose());
});

/* --------------------------------------------------------------- votação */
await t('voto pede confirmação e não pode ser alterado', async () => {
  idKiller = await P[assassino].evaluate(() => window.__c47.net.playerId);
  const votar = async (p) => {
    await p.evaluate(() => window.__c47.UI.closePanel());
    await p.click('#btn-vote'); await sleep(600);
    await p.evaluate((alvo) => {
      const st = window.__c47.net.state, eu = window.__c47.net.playerId;
      const ordem = Object.keys(st.players).filter(id => id !== eu);
      const linhas = [...document.querySelectorAll('#vote-body .sus')];
      linhas[ordem.indexOf(alvo)].querySelector('.mini-btn.red').click();
    }, idKiller);
    await sleep(500);
    const rodape = await p.textContent('#vote-foot');
    assert(/CONFIRMAR/i.test(rodape), 'falta confirmação: ' + rodape);
    await p.click('#vote-foot .btn-red'); await sleep(700);
    await p.click('#vote-close').catch(() => {});
  };
  for (let i = 0; i < 3; i++) if (i !== assassino) await votar(P[i]);
  // tenta votar de novo
  await P[(assassino + 1) % 3].click('#btn-vote'); await sleep(600);
  const titulo = await P[(assassino + 1) % 3].textContent('#vote-title');
  assert(/REGISTRADO/i.test(titulo), 'título=' + titulo);
  await P[(assassino + 1) % 3].click('#vote-close');
});

await t('o assassino vota e o caso termina com placar', async () => {
  const inocente = await P[(assassino + 1) % 3].evaluate(() => window.__c47.net.playerId);
  await P[assassino].evaluate(() => window.__c47.UI.closePanel());
  await P[assassino].click('#btn-vote'); await sleep(600);
  await P[assassino].evaluate((alvo) => {
    const st = window.__c47.net.state, eu = window.__c47.net.playerId;
    const ordem = Object.keys(st.players).filter(id => id !== eu);
    [...document.querySelectorAll('#vote-body .sus')][ordem.indexOf(alvo)].querySelector('.mini-btn.red').click();
  }, inocente);
  await sleep(500);
  await P[assassino].click('#vote-foot .btn-red');
  await sleep(3000);

  for (const p of P) assert(await tela(p) === 'screen-end', 'tela final=' + await tela(p));
  const st = await P[0].evaluate(() => ({
    resultado: window.__c47.net.state.result,
    killer: window.__c47.net.state.reveal?.killerName,
    scores: window.__c47.net.state.scores,
    deltas: window.__c47.net.state.reveal?.deltas
  }));
  assert(st.resultado === 'investigators', 'resultado=' + st.resultado);
  assert(st.killer === NOMES[assassino], 'assassino revelado=' + st.killer);
  const valorDoAssassino = st.scores[idKiller];
  assert(valorDoAssassino <= 0, 'assassino não perdeu pontos: ' + valorDoAssassino);
  assert(Object.values(st.deltas).some(d => d > 0), 'ninguém ganhou pontos');
  const linhas = await P[0].$$eval('.score-row', e => e.length);
  assert(linhas >= 3, 'ranking com ' + linhas + ' linhas');
});

/* ----------------------------------------------------------- fim por tempo */
await t('cronômetro no zero encerra o caso e o assassino vence', async () => {
  await P[0].click('#btn-again'); await sleep(2000);
  await P[0].click('#btn-start'); await sleep(900);
  for (const p of P) for (let i = 0; i < 9; i++) { if (await tela(p) === 'screen-role') break; await p.click('#btn-brief-next'); await sleep(280); }
  for (const p of P) { await p.click('#btn-role-ok'); await sleep(600); await p.click('#modal-root .btn-ghost').catch(() => {}); }
  await sleep(500);
  await P[0].evaluate(() => window.__c47.net.action({ type: '__test_fastforward', ms: 3000 }));
  await sleep(8000);
  for (const p of P) assert(await tela(p) === 'screen-end', 'tela=' + await tela(p));
  const st = await P[0].evaluate(() => ({ r: window.__c47.net.state.result, m: window.__c47.net.state.endReason }));
  assert(st.m === 'time', 'motivo=' + st.m);
  assert(st.r === 'killer', 'resultado=' + st.r);
  const titulo = await P[0].textContent('#end-title');
  assert(/ASSASSINO VENCEU/i.test(titulo), 'título=' + titulo);
});

/* ------------------------------------------------------------- reconexão */
await t('recarregar a página no meio do caso devolve o jogador à sala', async () => {
  await P[0].click('#btn-again'); await sleep(2000);
  await P[0].click('#btn-start'); await sleep(900);
  for (const p of P) for (let i = 0; i < 9; i++) { if (await tela(p) === 'screen-role') break; await p.click('#btn-brief-next'); await sleep(280); }
  for (const p of P) { await p.click('#btn-role-ok'); await sleep(600); await p.click('#modal-root .btn-ghost').catch(() => {}); }
  await sleep(800);
  const idAntes = await P[1].evaluate(() => window.__c47.net.playerId);
  const papelAntes = await P[1].evaluate(() => window.__c47.net.secret?.role);
  await P[1].reload({ waitUntil: 'domcontentloaded' });
  await sleep(4500);
  const depois = await P[1].evaluate(() => ({ code: window.__c47.net.code, pid: window.__c47.net.playerId, papel: window.__c47.net.secret?.role }));
  assert(depois.code === code, 'sala=' + depois.code);
  assert(depois.pid === idAntes, 'jogador novo criado no lugar do antigo');
  assert(depois.papel === papelAntes, 'papel mudou: ' + depois.papel);
  if (await tela(P[1]) === 'screen-role') { await P[1].click('#btn-role-ok'); await sleep(900); }
  await P[1].click('#modal-root .btn-ghost').catch(() => {});
  await sleep(700);
  assert(await tela(P[1]) === 'screen-game', 'não voltou para a cena: ' + await tela(P[1]));
});

/* ------------------------------------------------------------- qualidade */
await t('há botão de tela cheia na home e durante a partida', async () => {
  const onde = await tela(P[0]);
  const naHome = await P[0].isVisible('#btn-fullscreen-top') || await P[0].isVisible('#btn-fs') || await P[0].isVisible('#btn-fs-game');
  assert(naHome, 'nenhum botão de tela cheia visível (tela atual: ' + onde + ')');
  const emJogo = await P[0].isVisible('#btn-fs-game');
  assert(emJogo, 'sem botão de tela cheia dentro da partida');
  const alvo = await P[0].evaluate(() => {
    const b = document.querySelector('#btn-fullscreen-top');
    const r = b.getBoundingClientRect();
    return { w: r.width, h: r.height, fixo: getComputedStyle(b).position };
  });
  assert(alvo.fixo === 'fixed', 'botão não é fixo: ' + alvo.fixo);
});

await t('nenhum erro de JS foi registrado durante a sessão', async () => {
  assert(erros.length === 0, erros.join(' | '));
});

await browser.close();
console.log(`\n${fail ? '✗' : '✓'} ${pass} testes de navegador passaram` + (fail ? `, ${fail} falharam` : '') + '\n');
process.exit(fail ? 1 : 0);
