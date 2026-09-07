/* =============================================================================
   CASOS DE FAMÍLIA — fluxo: home → sala → briefing → papel → cena → voto → fim
   ========================================================================== */
import { Network } from './net.js';
import { Voice } from './voice.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import * as A from './audio.js';
import { CASES, getCase, currentCase, META } from '../shared/engine.js';

const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const net = new Network();
let game = null;
let voice = null;
let myAvatar = localStorage.getItem('cf_avatar') || 'm';
let caseId = localStorage.getItem('cf_case') || CASES[0].id;
let briefStep = 0;
let roleShownFor = null;      // rodada em que o papel já foi exibido
let lastPhase = null;

/* ------------------------------------------------------------------ home */
function initHome() {
  const name = localStorage.getItem('cf_name') || '';
  $('#input-name').value = name;
  setAvatar(myAvatar);
  renderCasePicker();
  refreshReturn();

  document.querySelectorAll('.avatar-opt').forEach(b => {
    b.onclick = () => { setAvatar(b.dataset.avatar); myAvatar = b.dataset.avatar; localStorage.setItem('cf_avatar', myAvatar); A.initAudio(); };
  });

  $('#btn-create').onclick = async () => {
    const n = nameOr();
    A.initAudio();
    showLoading('abrindo a sala…');
    const r = await net.create(n, { caseId, avatar: myAvatar });
    localStorage.setItem('cf_code', r.code);
    hideLoading();
    enterLobby();
  };

  $('#btn-join').onclick = () => openJoinModal();
  $('#btn-solo').onclick = async () => {
    const n = nameOr();
    A.initAudio();
    showLoading('preparando o caso…');
    await net.solo(n, { caseId, avatar: myAvatar });
    hideLoading();
    enterLobby(true);
  };
  $('#btn-return').onclick = () => openJoinModal(localStorage.getItem('cf_code') || '');
}

function nameOr() {
  const v = ($('#input-name').value || '').trim();
  const n = v || 'Investigador(a)';
  localStorage.setItem('cf_name', v);
  return n.slice(0, 14);
}

function setAvatar(a) {
  document.querySelectorAll('.avatar-opt').forEach(b => b.classList.toggle('on', b.dataset.avatar === a));
}

function renderCasePicker() {
  const box = $('#case-picker');
  if (!box) return;
  box.innerHTML = '';
  for (const c of CASES) {
    const b = document.createElement('button');
    b.className = 'case-opt' + (c.id === caseId ? ' on' : '');
    b.innerHTML = `<b>${c.code}</b><small>${c.title}</small>`;
    b.onclick = () => { caseId = c.id; localStorage.setItem('cf_case', c.id); renderCasePicker(); refreshCaseInfo(); };
    box.appendChild(b);
  }
  refreshCaseInfo();
}

function refreshCaseInfo() {
  const c = getCase(caseId);
  $('#case-title').textContent = c.title;
  $('#case-place').textContent = c.place;
  $('#case-victim').textContent = c.victim.name;
  $('#case-hook').textContent = c.victim.bio;
}

function refreshReturn() {
  const saved = localStorage.getItem('cf_code');
  if (saved && saved !== 'SOLO') {
    $('#btn-return').classList.remove('hidden');
    $('#return-code').textContent = saved;
  } else $('#btn-return').classList.add('hidden');
}

function openJoinModal(prefill = '') {
  const box = document.createElement('div');
  const p = document.createElement('p');
  p.className = 'puzzle-desc';
  p.textContent = 'Digite o código que o anfitrião compartilhou (ex.: FAM-4821):';
  box.appendChild(p);
  const inp = document.createElement('input');
  inp.className = 'text-input';
  inp.placeholder = 'FAM-0000';
  inp.value = prefill || '';
  inp.autocomplete = 'off';
  inp.style.cssText = 'width:100%;min-height:52px;font-size:18px;text-align:center;letter-spacing:.14em;text-transform:uppercase';
  box.appendChild(inp);
  const foot = document.createElement('div');
  const ok = document.createElement('button');
  ok.className = 'btn btn-red';
  ok.textContent = 'ENTRAR';
  const cancel = document.createElement('button');
  cancel.className = 'btn btn-ghost';
  cancel.textContent = 'CANCELAR';
  foot.append(ok, cancel);
  UI.openModal({ title: 'ENTRAR EM SALA', body: box, foot });
  setTimeout(() => inp.focus(), 80);

  const doJoin = async () => {
    const code = inp.value.trim().toUpperCase();
    if (!code) return;
    A.initAudio();
    UI.closeModal();
    showLoading('entrando na sala…');
    try {
      const r = await net.join(code, nameOr(), { avatar: myAvatar });
      localStorage.setItem('cf_code', r.code);
      hideLoading();
      enterLobby();
    } catch (e) {
      hideLoading();
      UI.openModal({
        title: 'NÃO FOI POSSÍVEL ENTRAR',
        body: (() => { const d = document.createElement('p'); d.className = 'puzzle-desc'; d.textContent = e.message || 'Erro desconhecido.'; return d; })(),
        foot: (() => { const f = document.createElement('div'); const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'OK'; b.onclick = () => UI.closeModal(); f.appendChild(b); return f; })()
      });
    }
  };
  ok.onclick = doJoin;
  inp.onkeydown = (e) => { if (e.key === 'Enter') doJoin(); };
  cancel.onclick = () => UI.closeModal();
}

/* ----------------------------------------------------------------- lobby */
function enterLobby(solo = false) {
  renderLobby();
  refreshReturn();
  /* Ao voltar para uma sala com a partida em andamento, quem escolhe a tela
     é o handler de estado (role/papel/cena/fim) — não pisamos em cima dele. */
  if (net.state && net.state.phase && net.state.phase !== 'lobby') return;
  UI.show('screen-lobby');
}

function renderLobby() {
  const st = net.state;
  if (!st) return;
  $('#lobby-code').textContent = net.code === 'SOLO' ? 'MODO SOLO' : net.code;
  $('#lobby-url').textContent = location.origin + location.pathname;
  const list = $('#lobby-players');
  list.innerHTML = '';
  for (const p of Object.values(st.players)) {
    const row = document.createElement('div');
    row.className = 'pcard' + (p.id === st.host ? ' host' : '');
    const av = document.createElement('div');
    av.className = 'av';
    av.innerHTML = (st.avatars?.[p.id] === 'f')
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5 21c0-4.2 3.4-7.5 7-7.5S19 16.8 19 21"/><path d="M8 6c1-3 7-3 8 0"/></svg>'
      : '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
    av.style.color = p.color;
    row.appendChild(av);
    const nm = document.createElement('div');
    nm.className = 'nm';
    const b = document.createElement('b');
    b.textContent = p.name;
    nm.appendChild(b);
    const sp = document.createElement('span');
    sp.textContent = st.roles?.[p.id] ? 'papel sorteado' : '';
    nm.appendChild(sp);
    row.appendChild(nm);
    const stt = document.createElement('div');
    stt.className = 'st' + (st.ready?.[p.id] ? ' on' : '');
    stt.textContent = st.ready?.[p.id] ? 'PRONTO' : 'AGUARDANDO';
    row.appendChild(stt);
    list.appendChild(row);
  }
  const isHost = st.host === net.playerId;
  const n = Object.keys(st.players).length;
  $('#lobby-count') && ($('#lobby-count').textContent = String(n));
  $('#btn-start').textContent = net.offline ? 'COMEÇAR INVESTIGAÇÃO' : 'INICIAR CASO';
  $('#btn-start').disabled = !isHost && !net.offline;
  $('#btn-start').style.opacity = ($('#btn-start').disabled ? .45 : 1);
  $('#host-note').textContent = net.offline
    ? 'Modo solo: você investiga sozinho contra suspeitos controlados pelo jogo.'
    : (isHost ? `Você é o anfitrião. ${n} de ${META.maxPlayers} jogadores.` : 'Aguardando o anfitrião iniciar.');
  $('#btn-ready').textContent = st.ready?.[net.playerId] ? 'PRONTO ✓' : 'ESTOU PRONTO';
}

$('#btn-ready').onclick = () => {
  const v = !net.state?.ready?.[net.playerId];
  net.action({ type: 'ready', value: v });
};
$('#btn-start').onclick = () => { A.initAudio(); net.start({ caseId }); };
$('#btn-leave').onclick = () => { net.leave(); localStorage.removeItem('cf_code'); location.reload(); };
$('#btn-copy').onclick = async () => {
  const code = net.code || '';
  try { await navigator.clipboard.writeText(code); UI.toast('Código copiado: ' + code, 'good'); }
  catch { UI.toast('Copie manualmente: ' + code); }
};
$('#btn-share').onclick = async () => {
  const url = location.origin + location.pathname;
  const text = `CASOS DE FAMÍLIA — sala ${net.code}. Entre por ${url} e use o código ${net.code}.`;
  try {
    if (navigator.share) await navigator.share({ title: 'CASOS DE FAMÍLIA', text, url });
    else { await navigator.clipboard.writeText(text); UI.toast('Convite copiado!', 'good'); }
  } catch { /* usuário cancelou */ }
};

/* -------------------------------------------------------------- briefing */
function startBriefing() {
  const c = getCase(net.state.caseId || caseId);
  briefStep = 0;
  $('#brief-title').textContent = c.title;
  $('#brief-place').textContent = c.place;
  $('#brief-date').textContent = c.date;
  $('#brief-victim').textContent = `${c.victim.name} — ${c.victim.role}`;
  renderBriefStep();
  UI.show('screen-briefing');
}
function renderBriefStep() {
  const c = getCase(net.state.caseId || caseId);
  const lines = c.briefing;
  $('#brief-text').textContent = lines[briefStep];
  $('#brief-step').textContent = `${briefStep + 1}/${lines.length}`;
  const dots = $('#brief-dots');
  dots.innerHTML = '';
  lines.forEach((_, i) => {
    const d = document.createElement('i');
    if (i === briefStep) d.className = 'on';
    dots.appendChild(d);
  });
  $('#btn-brief-next').innerHTML = briefStep < lines.length - 1
    ? 'CONTINUAR <span id="brief-step">' + (briefStep + 1) + '/' + lines.length + '</span>'
    : 'VER MEU PAPEL <span id="brief-step">✓</span>';
}
$('#btn-brief-next').onclick = () => {
  const c = getCase(net.state.caseId || caseId);
  if (briefStep < c.briefing.length - 1) { briefStep++; A.playSfx('click'); renderBriefStep(); return; }
  A.playSfx('stamp');
  /* A engine marca este jogador como pronto; quando todos terminam (ou no
     solo, na hora) ela muda a fase para "playing" e o handler de estado
     mostra o cartão secreto. Nada mais é preciso aqui. */
  net.action({ type: 'briefingDone' });
};
$('#btn-brief-back').onclick = () => {
  const c = getCase(net.state.caseId || caseId);
  if (briefStep > 0) { briefStep--; renderBriefStep(); }
};

/* ---------------------------------------------------------- papel secreto */
function afterBriefing() {
  const st = net.state;
  const secret = net.secret || st.roles?.[net.playerId];
  const roundKey = (st.rounds || 0) + ':' + st.caseId;
  if (roleShownFor === roundKey) { enterGame(); return; }
  roleShownFor = roundKey;
  if (!secret) { enterGame(); return; }
  UI.showRole(secret, st, () => { A.playSfx('click'); enterGame(); });
}

$('#btn-role-ok').onclick = () => { A.playSfx('click'); enterGame(); };

/* ------------------------------------------------------------------ jogo */
function enterGame() {
  UI.show('screen-game');
  if (!game) {
    game = new Game($('#scene-canvas'), net, { onEnd: () => showEnd() });
  }
  game.attach(net.state, net.playerId);
  game.resize();
  UI.renderLocBar(net.state, net.playerId, net.state.players[net.playerId]?.scene);
  UI.renderPlayersStrip(net.state, net.playerId, net.playerId);
  setupVoicePrompt();
  if (net.state.minEvidence) {
    UI.toast(`Investigação difícil: ${net.state.minEvidence} evidências mínimas para votar.`);
  }
}

/* --------------------------------------------------------------- voz */
async function setupVoicePrompt() {
  if (voice || net.offline) return;
  const asked = sessionStorage.getItem('cf_mic_asked');
  if (asked) { initVoice(false); return; }
  sessionStorage.setItem('cf_mic_asked', '1');
  const box = document.createElement('div');
  const p = document.createElement('p');
  p.className = 'puzzle-desc';
  p.innerHTML = 'O jogo tem <b>chat de voz</b> entre os jogadores. O navegador vai perguntar se pode usar o microfone.';
  box.appendChild(p);
  const foot = document.createElement('div');
  const yes = document.createElement('button');
  yes.className = 'btn btn-red';
  yes.textContent = '🎤 ATIVAR MICROFONE';
  const no = document.createElement('button');
  no.className = 'btn btn-ghost';
  no.textContent = 'JOGAR SEM VOZ';
  foot.append(yes, no);
  UI.openModal({ title: 'CONVERSAR POR VOZ', body: box, foot });
  yes.onclick = async () => { UI.closeModal(); await initVoice(true); };
  no.onclick = () => { UI.closeModal(); initVoice(false); };
}

async function initVoice(ask) {
  if (voice) return;
  voice = new Voice(net, {
    onChange: () => updateVoiceUI(),
    onSpeaking: (pid, on) => { UI.setSpeaking(pid, on); },
    onError: (err) => {
      updateVoiceUI();
      UI.toast(err === 'NotAllowedError' || err === 'denied'
        ? 'Para conversar por voz, permita o acesso ao microfone nas configurações do navegador.'
        : 'Não foi possível usar o microfone. O jogo continua sem voz.', 'bad');
    }
  });
  if (ask) {
    const ok = await voice.enable();
    if (ok) { voice.startLocalMeter(); UI.toast('Microfone ativado 🎤', 'good'); }
  }
  updateVoiceUI();
}

function updateVoiceUI() {
  const micBtn = $('#btn-mic');
  const strip = $('#voice-strip');
  if (!micBtn) return;
  const on = voice?.available;
  micBtn.classList.toggle('on', !!on && !voice.muted);
  micBtn.classList.toggle('off', !on);
  micBtn.title = on ? (voice.muted ? 'Microfone desligado' : 'Microfone ligado') : 'Ativar microfone';
  strip.classList.toggle('hidden', !on);
  const label = $('#mute-label');
  const ico = $('#mute-ico');
  if (label) label.textContent = voice?.muted ? 'MICROFONE DESLIGADO' : 'MICROFONE LIGADO';
  if (ico) ico.textContent = voice?.muted ? '🔇' : '🎤';
  const pill = $('#btn-mute');
  if (pill) pill.classList.toggle('muted', !!voice?.muted);
}

$('#btn-mic').onclick = async () => {
  if (!voice) { await initVoice(true); return; }
  if (!voice.available) { await voice.enable(); voice.startLocalMeter(); updateVoiceUI(); return; }
  voice.setMuted(!voice.muted);
};
$('#btn-mute').onclick = () => { if (voice) voice.setMuted(!voice.muted); };
$('#btn-whisper-close').onclick = () => { net.action({ type: 'whisperClose' }); if (voice) voice.stopWhisper(); UI.renderPanel(); };

/* -------------------------------------------------------------- painéis */
document.querySelectorAll('.ptab').forEach(t => {
  t.onclick = () => { UI.panelTab = t.dataset.tab; UI.renderPanel(); };
});
$('#panel-close').onclick = () => UI.closePanel();
$('#btn-clues').onclick = () => { UI.openPanel('evidencias'); };
$('#btn-suspects').onclick = () => { UI.openPanel('suspeitos'); };
$('#btn-chat').onclick = () => { UI.openPanel('chat'); };
$('#btn-vote').onclick = () => {
  if (net.state.votes?.[net.playerId]) { UI.toast('Seu voto já foi registrado.'); }
  UI.openVote(net.state, (id) => {
    net.action({ type: 'vote', target: id });
    UI.closeVote();
    A.playSfx('stamp');
    UI.toast('Seu voto foi registrado. Não é possível alterar.', 'good');
  });
};
$('#vote-close').onclick = () => UI.closeVote();

UI.handlers = {
  state: () => net.state,
  myId: () => net.playerId,
  onTravel: (scene) => net.action({ type: 'travel', scene }),
  onMark: (clueId, mark) => net.action({ type: 'mark', clueId, mark }),
  onChat: (text) => net.chat(text),
  onWhisper: (pid) => {
    net.action({ type: 'whisperOpen', to: pid });
    if (voice) voice.startWhisper(pid);
    UI.openPanel('chat');
    UI.toast('Papo secreto iniciado 🔒');
  },
  onWhisperMsg: (pid, text) => net.action({ type: 'whisper', to: pid, text }),
  onWhisperClose: () => { net.action({ type: 'whisperClose' }); if (voice) voice.stopWhisper(); UI.renderPanel(); },
  onTalk: (charId) => {
    const st = net.state;
    const w = getCase(st.caseId).witnesses.find(x => x.id === charId);
    if (!w) return;
    A.playSfx('talk');
    UI.openDialogue({ ...w, intro: 'Pode perguntar.' }, st, (topicId) => {
      net.action({ type: 'talk', charId, topicId });
      UI.closeModal();
      setTimeout(() => UI.openDialogue({ ...w, intro: 'Pode perguntar.' }, net.state, (t2) => {
        net.action({ type: 'talk', charId, topicId: t2 });
        UI.closeModal();
      }), 300);
    });
  },
  onVote: (id) => {
    UI.closePanel();
    UI.openVote(net.state, (target) => {
      net.action({ type: 'vote', target });
      UI.closeVote();
      A.playSfx('stamp');
      UI.toast('Seu voto foi registrado. Não é possível alterar.', 'good');
    });
  },
  onPlayerTap: (pid) => {
    if (pid === net.playerId) return;
    UI.openPanel('suspeitos');
  }
};

/* ---------------------------------------------------------------- eventos */
net.on('welcome', () => {
  lastPhase = null;
  if (!net.offline && net.code && net.code !== 'SOLO') {
    localStorage.setItem('cf_code', net.code);
    localStorage.setItem('cf_pid', net.playerId);
  }
});

net.on('state', (ev) => {
  const { state, events } = ev.detail || {};
  if (!state) return;
  const phase = state.phase;
  const changed = phase !== lastPhase;
  lastPhase = phase;

  if (game && (phase === 'playing' || phase === 'voting')) {
    game.attach(state, net.playerId);
    game.onEvents(events);
    if (UI.panelOpen()) UI.renderPanel();
    UI.renderPlayersStrip(state, net.playerId, net.playerId);
    UI.setClueCount(state.clues.length);
  }

  if (phase === 'lobby') { renderLobby(); UI.show('screen-lobby'); }
  else if (phase === 'briefing' && changed) { roleShownFor = null; startBriefing(); }
  else if (phase === 'playing' && changed) { afterBriefing(); }
  else if (phase === 'ended' && changed) { showEnd(); }

  for (const ev of events || []) {
    if (ev.type === 'clue' && phase === 'playing' && !game) UI.toast('Nova evidência', 'good');
    if (ev.type === 'whisper') A.playSfx('blip');
    if (ev.type === 'voted') A.playSfx('stamp');
  }
  if (voice) voice.syncPeers();
});

net.on('error', (e) => { UI.toast(e.detail?.msg || 'Algo deu errado.', 'bad'); });
net.on('kicked', () => { UI.toast('Você foi removido da sala.', 'bad'); setTimeout(() => location.reload(), 1500); });
net.on('closed', () => {
  if (net.offline) return;
  UI.toast('Conexão perdida. Tentando reconectar…', 'bad');
  net.reconnect().then(ok => {
    if (ok) UI.toast('Você voltou para a investigação.', 'good');
    else UI.toast('Não foi possível reconectar. Recarregue a página.', 'bad');
  });
});
net.on('reconnecting', () => showLoading('reconectando…'));
net.on('reconnected', () => hideLoading());
net.on('reconnect_failed', () => hideLoading());

/* ------------------------------------------------------------------- fim */
function showEnd() {
  const st = net.state;
  if (!st) return;
  UI.closeVote();
  UI.closePanel();
  if (voice) { voice.stopWhisper(); }
  UI.renderEnd(st, { isSolo: net.offline });
  UI.show('screen-end');
  A.playSfx(st.result === 'investigators' ? 'chime' : 'error');
}

$('#btn-again').onclick = () => {
  if (net.offline) {
    // novo caso solo, mantendo a pontuação
    const next = CASES[(CASES.findIndex(c => c.id === net.state.caseId) + 1) % CASES.length].id;
    net.restart(next);
    net.start({ caseId: next });
    roleShownFor = null;
    return;
  }
  const next = CASES[(CASES.findIndex(c => c.id === net.state.caseId) + 1) % CASES.length].id;
  if (net.state.host === net.playerId) {
    net.restart(next);
    UI.toast('Novo caso sorteado!', 'good');
  } else {
    UI.toast('Só o anfitrião pode iniciar um novo caso.');
  }
};
$('#btn-home').onclick = () => location.reload();

/* --------------------------------------------------------------- extras */
function showLoading(t) { const l = $('#loading'); if (!l) return; $('#loading-text').textContent = t; l.classList.remove('hidden'); }
function hideLoading() { $('#loading')?.classList.add('hidden'); }

/* tela cheia */
function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el).catch(() => {});
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document).catch(() => {});
  }
}
$('#btn-fullscreen-top').onclick = toggleFullscreen;
$('#btn-fs').onclick = toggleFullscreen;
$('#btn-fs-game').onclick = toggleFullscreen;

/* config */
$('#btn-config').onclick = () => { $('#cfg-code').textContent = net.code || '—'; $('#config-root').classList.remove('hidden'); };
$('#config-close').onclick = () => $('#config-root').classList.add('hidden');
document.querySelectorAll('#config-root .modal-backdrop').forEach(b => b.onclick = () => $('#config-root').classList.add('hidden'));
$('#cfg-music').oninput = (e) => A.setVolumes({ music: e.target.value / 100 });
$('#cfg-sfx').oninput = (e) => A.setVolumes({ sfx: e.target.value / 100 });
$('#cfg-mic').onchange = async (e) => {
  if (e.target.checked) { await initVoice(true); } else if (voice) { voice.setMuted(true); }
  updateVoiceUI();
};
$('#cfg-listen').onchange = (e) => {
  document.querySelectorAll('audio[id^=voice-audio-]').forEach(a => { a.muted = !e.target.checked; });
};
$('#cfg-quit').onclick = () => { net.leave(); localStorage.removeItem('cf_code'); location.reload(); };
$('#modal-close').onclick = () => UI.closeModal();
document.querySelectorAll('#modal-root [data-close]').forEach(b => b.onclick = () => UI.closeModal());

/* -------------------------------------------------- volta automática
   Se o jogador recarregar a página (celular em segundo plano, aba
   descartada, rede caindo), tentamos recolocá-lo na mesma sala com o
   mesmo papel e a mesma pontuação. */
async function autoReturn() {
  const savedCode = localStorage.getItem('cf_code');
  const savedPid = localStorage.getItem('cf_pid');
  if (!savedCode || savedCode === 'SOLO' || !savedPid) return;
  showLoading('voltando para a sala…');
  try {
    await net.join(savedCode, localStorage.getItem('cf_name') || 'Investigador(a)', { avatar: myAvatar, playerId: savedPid });
    hideLoading();
    enterLobby();
  } catch {
    hideLoading();
    localStorage.removeItem('cf_code');
    localStorage.removeItem('cf_pid');
    refreshReturn();
    UI.toast('A sala anterior não existe mais.');
  }
}

/* boot */
initHome();
UI.show('screen-home');
autoReturn();
window.addEventListener('resize', () => game?.resize());

/* API de depuração (usada pelos testes automatizados) */
window.__c47 = {
  net, A, UI,
  get game() { return game; },
  get voice() { return voice; },
  enterGame,
  showEnd
};
