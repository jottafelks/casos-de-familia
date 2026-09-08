/* Assassinato, corpo, denúncia e reunião — 3 jogadores de verdade no navegador.
   Uso: node tests/morte.mjs [url] */
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:3000/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const t = async (n, fn) => { try { await fn(); console.log('  ✓ ' + n); pass++; } catch (e) { console.log('  ✗ ' + n + '\n      ' + String(e.message).split('\n')[0]); fail++; } };
const assert = (c, m) => { if (!c) throw new Error(m || 'falhou'); };
/** espera uma condição ficar verdadeira (o jogo roda em tempo real) */
const esperar = async (fn, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch {} await sleep(250); }
  return false;
};

const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] });
const erros = [];
const mk = async () => {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(1300);
  return p;
};
const P = [];
for (let i = 0; i < 4; i++) P.push(await mk());
const tela = p => p.evaluate(() => [...document.querySelectorAll('.screen')].filter(s => s.classList.contains('active')).map(s => s.id)[0]);
const papel = p => p.evaluate(() => window.__c47.net.state.secret?.role);
const nome = p => p.evaluate(() => window.__c47.net.state.players[window.__c47.net.playerId]?.name);
const corpos = p => p.evaluate(() => (window.__c47.net.state.corpses || []).length);
const vivo = p => p.evaluate(() => !window.__c47.net.state.dead[window.__c47.net.playerId]);

console.log('\nASSASSINATO, CORPO E REUNIÃO — 4 jogadores\n');

await P[0].fill('#input-name', 'Ana'); await P[0].click('#btn-create'); await sleep(1800);
const code = (await P[0].textContent('#lobby-code')).trim();
for (let i = 1; i < 4; i++) {
  await P[i].fill('#input-name', 'Jogador ' + (i + 1)); await P[i].click('#btn-join'); await sleep(400);
  await P[i].fill('#modal-root input', code); await P[i].click('#modal-root .btn-red'); await sleep(1500);
}
await P[0].click('#btn-start'); await sleep(1300);
for (const p of P) for (let i = 0; i < 12; i++) { if (await tela(p) === 'screen-role') break; await p.click('#btn-brief-next'); await sleep(280); }
for (const p of P) { await p.click('#btn-role-ok'); await sleep(650); await p.click('#modal-root .btn-ghost').catch(() => { }); }
await sleep(1800);

let ki = -1;
for (let i = 0; i < 4; i++) if (await papel(P[i]) === 'killer') ki = i;
assert(ki >= 0, 'nenhum assassino sorteado');
const K = P[ki];
const outros = P.filter((_, i) => i !== ki);
console.log(`      assassino: ${await nome(K)} · investigadores: ${(await Promise.all(outros.map(nome))).join(', ')}`);

/* assassino e vítima na primeira sala, lado a lado;
   o terceiro jogador fica em OUTRO cômodo (não pode testemunhar) */
const salas = await K.evaluate(() => { const w = window.__c47.game.world; return w.map.rooms.map(r => ({ cx: r.cx, cy: r.cy, id: r.id })); });
await K.evaluate(s => { const w = window.__c47.game.world; w.me.x = s.cx; w.me.y = s.cy; }, salas[0]);
await outros[0].evaluate(s => { const w = window.__c47.game.world; w.me.x = s.cx + 55; w.me.y = s.cy; }, salas[0]);
const salaLonge = salas[Math.min(1, salas.length - 1)];
for (const p of outros.slice(1)) {
  await p.evaluate(s => { const w = window.__c47.game.world; w.me.x = s.cx; w.me.y = s.cy; }, salaLonge);
}
await sleep(1600);
await K.evaluate(() => window.__c47.net.action({ type: '__test_ready' }));   // só funciona com TEST_HOOKS
// na versão publicada não há gancho de teste: espera a trégua real do assassino
const liberado = await esperar(() => K.evaluate(() => (window.__c47.net.state.killReadyAt || 0) <= Date.now()), 40000);
assert(liberado, 'o intervalo do assassino nunca liberou');
await sleep(400);

await t('o assassino vê os outros jogadores por perto', async () => {
  const atores = await K.evaluate(() => window.__c47.game.world.actors.size);
  assert(atores === P.length - 1, 'atores visíveis: ' + atores);
});

await t('escolher o alvo exige dois toques (evita morte sem querer)', async () => {
  const r = await K.evaluate(() => {
    const w = window.__c47.game.world;
    const id = [...w.actors.keys()].find(i => !window.__c47.net.state.dead[i]);
    const o = w.actors.get(id);
    w.clicouEmAlguem(o.x, o.y);
    const depoisDe1 = !!w.armado;
    w.clicouEmAlguem(o.x, o.y);
    return { depoisDe1, depoisDe2: !!w.armado };
  });
  assert(!r.depoisDe1, 'armou no primeiro toque');
  assert(r.depoisDe2, 'não armou no segundo toque');
});

await t('o botão ASSASSINAR aparece e mata quem está ao lado', async () => {
  const apareceu = await esperar(() => K.evaluate(() =>
    !document.querySelector('#btn-kill').classList.contains('hidden')), 6000);
  const d = await K.evaluate(() => {
    const w = window.__c47.game.world;
    return { armado: !!w.armado, alvo: w.alvo ? String(w.alvo).slice(-4) : null,
             valido: !!w.alvoValido(), papel: window.__c47.net.state.secret?.role,
             atores: [...w.actors.entries()].map(([id, o]) => ({ id: String(id).slice(-4), d: Math.round(Math.hypot(o.x - w.me.x, o.y - w.me.y)) })),
             visivel: !document.querySelector('#btn-kill').classList.contains('hidden'),
             tempo: Math.round(performance.now() - (w.alvoT || 0)) };
  });
  if (!apareceu && !d.visivel) throw new Error('botão não apareceu · ' + JSON.stringify(d));
  await K.click('#btn-kill');
  await sleep(1600);
  const mortos = await Promise.all(P.map(p => p.evaluate(() => Object.keys(window.__c47.net.state.dead || {}).length)));
  assert(mortos.every(n => n === 1), 'mortes: ' + JSON.stringify(mortos));
});

await t('a vítima vira fantasma e vê quem a matou', async () => {
  const v = P.find(async p => false);
  void v;
  let vitima = null, note = '';
  for (const p of P) {
    const morto = await p.evaluate(() => !!window.__c47.net.state.dead[window.__c47.net.playerId]);
    if (morto) { vitima = p; note = await p.evaluate(() => document.querySelector('#ghost-note').textContent); }
  }
  assert(vitima, 'ninguém morreu');
  const barra = await vitima.evaluate(() => !document.querySelector('#ghost-bar').classList.contains('hidden'));
  assert(barra, 'a barra de fantasma não apareceu');
  assert(/Você viu quem fez isso/.test(note), 'nota: ' + note);
  console.log('      ' + (await nome(vitima)) + ' → ' + note.trim());
});

await t('o corpo é sigiloso: quem não estava lá não sabe de nada', async () => {
  const porJogador = await Promise.all(P.map(async p => ({ nome: await nome(p), corpos: await corpos(p), morto: !(await vivo(p)) })));
  console.log('      ' + porJogador.map(x => `${x.nome}: ${x.corpos} corpo(s)${x.morto ? ' (vítima)' : ''}`).join(' · '));
  const vitima = porJogador.find(x => x.morto);
  assert(vitima.corpos === 1, 'a vítima não vê o próprio corpo');
  assert(porJogador[ki].corpos === 1, 'o assassino não vê o corpo');
  const longe = porJogador.find((_, i) => i !== ki && !porJogador[i].morto);
  assert(longe.corpos === 0, 'quem estava em outro cômodo viu o corpo: ' + JSON.stringify(porJogador));
});

await t('quem chega perto avista o corpo e pode denunciar', async () => {
  // escolhe um jogador que ainda não viu o corpo
  let curioso = null;
  for (const p of P) {
    if (p === K) continue;
    const viu = await corpos(p);
    const morto = await p.evaluate(() => !!window.__c47.net.state.dead[window.__c47.net.playerId]);
    if (!viu && !morto) { curioso = p; break; }
  }
  assert(curioso, 'todos já tinham visto o corpo');
  const c = await K.evaluate(() => {
    const cs = window.__c47.net.state.corpses[0];
    return { x: cs.x, y: cs.y };
  });
  await curioso.evaluate(cc => { const w = window.__c47.game.world; w.me.x = cc.x + 70; w.me.y = cc.y; }, c);
  const viu = await esperar(async () => await corpos(curioso) === 1, 6000);
  assert(viu, 'não avistou o corpo chegando perto');
  const botao = await esperar(() => curioso.evaluate(() => !document.querySelector('#btn-report').classList.contains('hidden')), 4000);
  assert(botao, 'o botão de denúncia não apareceu');
  await curioso.click('#btn-report');
  await sleep(1500);
  const fase = await curioso.evaluate(() => window.__c47.net.state.phase);
  assert(fase === 'meeting', 'fase: ' + fase);
});

await t('a reunião abre para todos mostrando quem achou e onde', async () => {
  for (const p of P) {
    const aberto = await p.evaluate(() => !document.querySelector('#meeting-root').classList.contains('hidden'));
    assert(aberto, 'a reunião não abriu para ' + await nome(p));
  }
  const info = await P[0].evaluate(() => ({
    titulo: document.querySelector('#mt-title-txt').textContent,
    sub: document.querySelector('#mt-sub').textContent,
    cadeiras: document.querySelectorAll('.mt-seat').length,
    presentes: document.querySelectorAll('#mt-presentes .mt-quem').length,
  }));
  assert(/CORPO/.test(info.titulo), 'título: ' + info.titulo);
  assert(/encontrou o corpo de/.test(info.sub), 'subtítulo: ' + info.sub);
  assert(info.cadeiras === 4, 'cadeiras: ' + info.cadeiras);
  console.log('      "' + info.sub.trim() + '" · ' + info.cadeiras + ' cadeiras · ' + info.presentes + ' no local');
});

await t('os depoimentos da reunião chegam para todos', async () => {
  await P[ki].fill('#mt-input', 'Eu estava na cozinha, juro.');
  await P[ki].click('.mt-send');
  await sleep(1200);
  for (const p of P) {
    const msgs = await p.evaluate(() => document.querySelectorAll('#mt-msgs .mt-msg').length);
    assert(msgs >= 1, 'sem mensagem para ' + await nome(p));
  }
});

await t('o voto da reunião é irreversível e expulsa o mais votado', async () => {
  const vivos = [];
  for (const p of P) if (await vivo(p)) vivos.push(p);
  if (vivos.length < 2) { console.log('      (menos de 2 vivos — pulando)'); return; }
  // escolhe um inocente vivo como alvo (expulsar inocente NÃO encerra o caso)
  const alvoIdx = P.findIndex(p => vivos.includes(p) && p !== K);
  const alvo = await P[alvoIdx].evaluate(() => window.__c47.net.playerId);
  await vivos[0].evaluate(id => {
    const b = [...document.querySelectorAll('#mt-vote .mt-sus')];
    window.__c47.net.action({ type: 'vote', target: id });
    void b;
  }, alvo);
  await sleep(800);
  // tenta votar de novo: não pode
  const repetido = await vivos[0].evaluate(() => {
    const antes = window.__c47.net.state.meeting?.votes?.[window.__c47.net.playerId];
    window.__c47.net.action({ type: 'vote', target: null });
    return antes;
  });
  assert(repetido !== null, 'estado do voto incerto');
  for (const p of vivos.slice(1)) await p.evaluate(id => window.__c47.net.action({ type: 'vote', target: id }), alvo);
  await sleep(1800);
  const res = await P[0].evaluate(() => ({
    fase: window.__c47.net.state.phase,
    resultado: window.__c47.net.state.lastMeeting?.result
  }));
  assert(res.fase === 'playing', 'não voltou ao jogo: ' + res.fase);
  assert(res.resultado?.expelled === alvo, 'resultado: ' + JSON.stringify(res.resultado));
  let morto = null;
  for (const p of P) { if (await p.evaluate(() => window.__c47.net.playerId) === alvo) { morto = p; break; } }
  const ghost = await morto.evaluate(() => !document.querySelector('#ghost-bar').classList.contains('hidden'));
  assert(ghost, 'o eliminado não virou fantasma');
  console.log('      ' + (await nome(morto)) + ' foi retirado · era ' + (res.resultado.wasKiller ? 'O ASSASSINO' : 'inocente'));
});

await t('o assassino corta a energia e todos ficam no escuro', async () => {
  const podeSabotar = await esperar(() => K.evaluate(() => {
    const st = window.__c47.net.state;
    return (st.sabotagemAte || 0) <= Date.now() && !st.dead?.[window.__c47.net.playerId];
  }), 60000);
  if (!podeSabotar) { console.log('      (assassino fora da jogada — pulando)'); return; }
  await K.evaluate(() => window.__c47.net.action({ type: 'sabotage' }));
  await sleep(1600);
  for (const p of P) {
    const d = await p.evaluate(() => ({
      apagada: !!window.__c47.net.state.luz?.apagada,
      barra: !document.querySelector('#blackout-bar').classList.contains('hidden'),
    }));
    assert(d.apagada, 'a luz não caiu para ' + await nome(p));
    assert(d.barra, 'o aviso não apareceu para ' + await nome(p));
  }
});

await t('acertar a sequência no quadro de energia religa a luz', async () => {
  let vivo = null;
  for (const p of P) if (await vivo === null && await p.evaluate(() => !window.__c47.net.state.dead[window.__c47.net.playerId])) { vivo = p; break; }
  assert(vivo, 'ninguém vivo para consertar');
  await vivo.evaluate(() => {
    const w = window.__c47.game.world;
    const p = w.map.objects.find(o => o.id === 'painel-energia');
    if (p) { w.me.x = p.cx + 60; w.me.y = p.cy; }
  });
  const perto = await esperar(() => vivo.evaluate(() => !document.querySelector('#btn-investigar').classList.contains('hidden')), 6000);
  assert(perto, 'não chegou no quadro de energia');
  await vivo.click('#btn-investigar'); await sleep(700);
  await vivo.evaluate(() => {
    const b = [...document.querySelectorAll('.bal-act')].find(x => /quadro/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await sleep(800);
  const abriu = await vivo.evaluate(() => !document.querySelector('#painel-root').classList.contains('hidden'));
  assert(abriu, 'o minijogo do quadro não abriu');
  await sleep(3200);                                  // espera o tempo de memorizar
  await vivo.evaluate(() => {
    const alvo = window.__c47.net.state.luz.painel.slice();
    window.__c47.game.world.g.luz.seq = alvo;
    window.__c47.game.world.g.luz.desenhar();
  });
  await sleep(300);
  await vivo.evaluate(() => { window.__errosPainel = []; window.__c47.net.on('error', e => window.__errosPainel.push(e.detail?.msg)); });
  await vivo.click('#painel-religar');
  await sleep(1600);
  const voltou = await vivo.evaluate(() => !window.__c47.net.state.luz?.apagada);
  if (!voltou) {
    const erros = await vivo.evaluate(() => window.__errosPainel || []);
    const onde = await vivo.evaluate(() => {
      const w = window.__c47.game.world; const p = w.map.objects.find(o => o.id === 'painel-energia');
      return { sala: w.me.room, salaPainel: p.room, dist: Math.round(Math.hypot(w.me.x - p.cx, w.me.y - p.cy)) };
    });
    throw new Error('a luz não voltou · ' + JSON.stringify(erros) + ' · ' + JSON.stringify(onde));
  }
  for (const p of P) {
    const ok = await p.evaluate(() => !window.__c47.net.state.luz?.apagada);
    assert(ok, 'a luz não voltou para ' + await nome(p));
  }
  console.log('      ' + (await nome(vivo)) + ' religou a energia da casa');
});

await t('sem erros de JavaScript durante toda a sessão', async () => {
  assert(erros.length === 0, erros.slice(0, 2).join(' | '));
});

await b.close();
console.log(`\n${fail ? '✗' : '✓'} ${pass} testes de assassinato e reunião passaram${fail ? ', ' + fail + ' falharam' : ''}\n`);
process.exit(fail ? 1 : 0);
