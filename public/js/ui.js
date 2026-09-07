/* =============================================================================
   CASOS DE FAMÍLIA — interface (mobile-first).
   Um painel por vez, alvos de toque grandes, textos legíveis.
   ========================================================================== */
import { getClue, getWitness, currentCase, META } from '../shared/engine.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};
const esc = (s) => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const AV = {
  m: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  f: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5 21c0-4.2 3.4-7.5 7-7.5S19 16.8 19 21"/><path d="M8 6c1-3 7-3 8 0"/></svg>'
};

class UIClass {
  constructor() {
    this.handlers = {};
    this.panelTab = 'evidencias';
    this.sayTo = 0;
    this._speaking = new Set();
  }

  /* ------------------------------------------------------------- básicos */
  show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const s = document.getElementById(id);
    if (s) s.classList.add('active');
    document.body.classList.toggle('screen-game-active', id === 'screen-game');
  }

  setTimer(ms, frac) {
    const t = $('#timer-text');
    if (!t) return;
    const s = Math.max(0, Math.ceil(ms / 1000));
    t.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const box = $('#hud-timer');
    box.classList.toggle('warn', frac > 0.6 && frac <= 0.85);
    box.classList.toggle('crit', frac > 0.85);
  }

  setScene(name) { const e = $('#hud-case'); if (e) e.textContent = String(name || '').toUpperCase(); }
  setClueCount(n) { const e = $('#clue-count'); if (e) e.textContent = String(n); }

  say(text, ms = 4800) {
    const s = $('#subtitle');
    if (!s) return;
    s.textContent = text;
    s.classList.remove('hidden');
    clearTimeout(this.sayTo);
    this.sayTo = setTimeout(() => s.classList.add('hidden'), ms);
  }

  toast(text, kind = '') {
    const box = $('#toasts');
    if (!box) return;
    const t = el('div', 'toast ' + kind, text);
    box.appendChild(t);
    setTimeout(() => t.remove(), 3200);
    while (box.children.length > 3) box.firstChild.remove();
  }

  cursorLabel(info) {
    const e = $('#cursor-label');
    if (!e) return;
    if (!info) { e.classList.add('hidden'); return; }
    e.textContent = info.text;
    e.style.left = info.x + 'px';
    e.style.top = info.y + 'px';
    e.classList.remove('hidden');
  }

  /* --------------------------------------------------------- menu de ação */
  showActionMenu(obj, actions, onPick) {
    $('#am-title').textContent = (obj.name || 'OBJETO').toUpperCase();
    const body = $('#am-body');
    body.innerHTML = '';
    for (const a of actions) {
      const b = el('button', 'am-act', a.label);
      b.onclick = () => { this.hideActionMenu(); onPick(a); };
      body.appendChild(b);
    }
    $('#action-menu').classList.remove('hidden');
  }
  hideActionMenu() { $('#action-menu')?.classList.add('hidden'); }
  actionMenuOpen() { return !$('#action-menu')?.classList.contains('hidden'); }

  /* ------------------------------------------------------------- modais */
  modalOpen() { return !$('#modal-root')?.classList.contains('hidden'); }
  openModal({ title, body, foot }) {
    $('#modal-title').textContent = title || '';
    const b = $('#modal-body'); b.innerHTML = '';
    if (body) b.appendChild(body);
    const f = $('#modal-foot'); f.innerHTML = '';
    if (foot) f.appendChild(foot);
    $('#modal-root').classList.remove('hidden');
  }
  closeModal() { $('#modal-root').classList.add('hidden'); }

  /* --------------------------------------------------------- jogadores */
  renderPlayersStrip(state, meId, pid) {
    const strip = $('#players-strip');
    if (!strip) return;
    strip.innerHTML = '';
    for (const p of Object.values(state.players)) {
      const chip = el('button', 'pchip' + (p.id === pid ? ' me' : '') + (p.online === false ? ' offline' : ''));
      const av = el('span', 'av');
      av.style.color = p.color;
      av.innerHTML = AV[state.avatars?.[p.id] || 'm'];
      chip.appendChild(av);
      chip.appendChild(el('span', null, p.name));
      if (this._speaking.has(p.id)) {
        chip.classList.add('speaking');
        chip.appendChild(el('span', 'sp', '🔊'));
      }
      chip.onclick = () => this.handlers.onPlayerTap?.(p.id);
      strip.appendChild(chip);
    }
    const n = Object.keys(state.players).length;
    const cnt = $('#players-count');
    if (cnt) cnt.textContent = String(n);
  }

  setSpeaking(pid, on) {
    if (on) this._speaking.add(pid); else this._speaking.delete(pid);
    const chip = [...document.querySelectorAll('.pchip')].find(c => c.dataset.pid === pid);
    if (chip) chip.classList.toggle('speaking', on);
  }

  renderLocBar(state, meId, scene) {
    const bar = $('#loc-bar');
    if (!bar) return;
    const CASE = currentCase(state);
    bar.innerHTML = '';
    for (const L of CASE.locations) {
      const locked = L.unlockBy && !state.flags[L.unlockBy];
      const b = el('button', 'loc-btn' + (L.id === scene ? ' on' : '') + (locked ? ' locked' : ''), L.short || L.name);
      b.onclick = () => {
        if (locked) { this.say(L.lockedText || 'Está trancado.'); return; }
        this.handlers.onTravel?.(L.id);
      };
      bar.appendChild(b);
    }
  }

  /* ----------------------------------------------------------- painéis */
  openPanel(tab) {
    this.panelTab = tab || 'evidencias';
    $('#panel').classList.remove('hidden');
    document.querySelectorAll('.ptab').forEach(t => t.classList.toggle('active', t.dataset.tab === this.panelTab));
    this.renderPanel();
  }
  closePanel() { $('#panel').classList.add('hidden'); }
  panelOpen() { return !$('#panel').classList.contains('hidden'); }

  renderPanel() {
    const st = this.handlers.state?.();
    if (!st) return;
    document.querySelectorAll('.ptab').forEach(t => t.classList.toggle('active', t.dataset.tab === this.panelTab));
    const body = $('#panel-body');
    body.innerHTML = '';
    if (this.panelTab === 'evidencias') this.renderEvidence(body, st);
    else if (this.panelTab === 'suspeitos') this.renderSuspects(body, st);
    else if (this.panelTab === 'chat') this.renderChatPanel(body, st);
    else this.renderNotes(body, st);
  }

  renderEvidence(body, st) {
    const CASE = currentCase(st);
    const head = el('p', 'eyebrow', `EVIDÊNCIAS DA EQUIPE — ${st.clues.length}`);
    body.appendChild(head);
    if (st.minEvidence) {
      body.appendChild(el('p', 'tiny', `Mínimo para votar: ${st.clues.length}/${st.minEvidence} evidências`));
    }
    if (!st.clues.length) {
      body.appendChild(el('p', 'tiny', 'Nenhuma evidência ainda. Toque nos objetos da cena para investigar.'));
    }
    for (const id of st.clues) {
      const c = getClue(CASE, id);
      if (!c) continue;
      const box = el('div', 'ev');
      box.appendChild(el('p', 'txt', c.text));
      const meta = el('div', 'meta');
      meta.appendChild(el('span', 'lvl ' + (c.level || 'medio'), (c.level || 'medio').toUpperCase()));
      const by = st.foundBy?.[id] ? st.players[st.foundBy[id]]?.name : null;
      meta.appendChild(el('span', 'by', by ? 'encontrada por ' + by : ''));
      box.appendChild(meta);
      const marks = el('div', 'marks');
      const mine = st.marks?.[id]?.[this.handlers.myId?.()];
      for (const [key, label] of [['important', 'IMPORTANTE'], ['doubt', 'DUVIDOSA'], ['confirmed', 'CONFIRMADA']]) {
        const b = el('button', 'mark-btn ' + key + (mine === key ? ' on' : ''), label);
        b.onclick = () => this.handlers.onMark?.(id, mine === key ? null : key);
        marks.appendChild(b);
      }
      box.appendChild(marks);
      body.appendChild(box);
    }
  }

  renderSuspects(body, st) {
    const CASE = currentCase(st);
    body.appendChild(el('p', 'eyebrow', 'JOGADORES'));
    for (const p of Object.values(st.players)) {
      const row = el('div', 'sus');
      const av = el('div', 'av');
      av.style.color = p.color;
      av.innerHTML = AV[st.avatars?.[p.id] || 'm'];
      row.appendChild(av);
      const info = el('div', 'info');
      info.appendChild(el('b', null, p.name + (p.id === this.handlers.myId?.() ? ' (você)' : '')));
      const role = st.roles?.[p.id];
      info.appendChild(el('span', null, role?.label || ''));
      row.appendChild(info);
      const btns = el('div', 'btns');
      const isMe = p.id === this.handlers.myId?.();
      if (!isMe) {
        const w = el('button', 'mini-btn' + (st.whisperPair?.[this.handlers.myId?.()] === p.id ? ' on' : ''), 'PAPO SECRETO');
        w.onclick = () => this.handlers.onWhisper?.(p.id);
        btns.appendChild(w);
        const v = el('button', 'mini-btn red', st.votes?.[this.handlers.myId?.()] === p.id ? 'VOTADO' : 'VOTAR');
        v.disabled = !!st.votes?.[this.handlers.myId?.()];
        v.onclick = () => this.handlers.onVote?.(p.id);
        btns.appendChild(v);
      }
      row.appendChild(btns);
      body.appendChild(row);
    }
    body.appendChild(el('p', 'eyebrow', 'TESTEMUNHAS'));
    for (const w of (CASE.witnesses || [])) {
      const row = el('div', 'sus');
      const av = el('div', 'av');
      av.innerHTML = AV.m;
      av.style.color = '#9aa0a8';
      row.appendChild(av);
      const info = el('div', 'info');
      info.appendChild(el('b', null, w.name));
      info.appendChild(el('span', null, w.role));
      row.appendChild(info);
      const btns = el('div', 'btns');
      const t = el('button', 'mini-btn', 'OUVIR');
      t.onclick = () => this.handlers.onTalk?.(w.id);
      btns.appendChild(t);
      const n = Object.keys(st.players).length;
      if (n <= 2) {
        const v = el('button', 'mini-btn red', 'VOTAR');
        v.disabled = !!st.votes?.[this.handlers.myId?.()];
        v.onclick = () => this.handlers.onVote?.(w.id);
        btns.appendChild(v);
      }
      row.appendChild(btns);
      body.appendChild(row);
    }
  }

  renderChatPanel(body, st) {
    const myId = this.handlers.myId?.();
    const partner = st.whisperPair?.[myId];
    if (partner && st.players[partner]) {
      const wbox = el('div', 'whisper-box');
      wbox.appendChild(el('h5', null, '🔒 PAPO SECRETO COM ' + st.players[partner].name.toUpperCase()));
      const key = [myId, partner].sort().join('|');
      const log = el('div', 'chat-log');
      for (const m of (st.whispers?.[key] || [])) {
        const line = el('div', 'msg');
        line.innerHTML = '<b>' + esc(m.name) + ':</b> ' + esc(m.text);
        log.appendChild(line);
      }
      wbox.appendChild(log);
      const f = el('form', 'chat-form');
      const inp = el('input');
      inp.placeholder = 'só vocês dois ouvem...';
      inp.maxLength = 200;
      f.appendChild(inp);
      const b = el('button', null, '▸');
      f.appendChild(b);
      f.onsubmit = (e) => {
        e.preventDefault();
        const v = inp.value.trim();
        if (!v) return;
        this.handlers.onWhisperMsg?.(partner, v);
        inp.value = '';
      };
      wbox.appendChild(f);
      const sair = el('button', 'mini-btn', 'ENCERRAR PAPO SECRETO');
      sair.style.marginTop = '8px';
      sair.onclick = () => this.handlers.onWhisperClose?.();
      wbox.appendChild(sair);
      body.appendChild(wbox);
    }

    body.appendChild(el('p', 'eyebrow', 'CHAT DA EQUIPE'));
    const log = el('div', 'chat-log');
    for (const m of (st.chat || [])) {
      if (m.sys) { log.appendChild(el('div', 'msg', m.text)); continue; }
      const line = el('div', 'msg');
      line.innerHTML = '<b style="color:' + esc(m.color || '#fff') + '">' + esc(m.name) + ':</b> ' + esc(m.text);
      log.appendChild(line);
    }
    body.appendChild(log);

    const f = el('form', 'chat-form');
    const inp = el('input');
    inp.placeholder = 'fale com a equipe...';
    inp.maxLength = 160;
    f.appendChild(inp);
    const b = el('button', null, '▸');
    f.appendChild(b);
    f.onsubmit = (e) => {
      e.preventDefault();
      const v = inp.value.trim();
      if (!v) return;
      this.handlers.onChat?.(v);
      inp.value = '';
    };
    body.appendChild(f);
  }

  renderNotes(body, st) {
    body.appendChild(el('p', 'eyebrow', 'SUAS ANOTAÇÕES (só você vê)'));
    const ta = el('textarea', 'notes-area');
    ta.placeholder = 'Ex.: botas com terra → caseiro? / advogado canhoto → bilhete do relógio';
    ta.value = localStorage.getItem('cf_notes_' + (st.caseId || '')) || '';
    ta.oninput = () => localStorage.setItem('cf_notes_' + (st.caseId || ''), ta.value);
    body.appendChild(ta);
  }

  /* ------------------------------------------------------ diálogo (NPC) */
  openDialogue(w, st, onTopic) {
    const box = el('div');
    box.appendChild(el('p', 'puzzle-desc', '“' + (w.intro || 'Posso ajudar?') + '”'));
    const list = el('div', 'am-body');
    for (const t of (w.topics || [])) {
      const asked = st.talked?.[w.id + ':' + t.id];
      const b = el('button', 'am-act', t.label + (asked ? '  · já perguntado' : ''));
      b.onclick = () => onTopic(t.id);
      list.appendChild(b);
    }
    box.appendChild(list);
    this.openModal({ title: w.name + ' · ' + w.role, body: box });
  }

  /* ---------------------------------------------------------- papel */
  showRole(secret, st, onOk) {
    const CASE = currentCase(st);
    const inner = $('#role-inner');
    const killer = secret?.role === 'killer';
    inner.classList.toggle('killer', killer);
    $('#role-kicker').textContent = killer ? 'IDENTIDADE SECRETA — NÃO COMPARTILHE' : 'SUA IDENTIDADE SECRETA';
    $('#role-title').textContent = killer ? 'VOCÊ É O ASSASSINO' : 'VOCÊ É INVESTIGADOR(A)';
    $('#role-sub').textContent = killer
      ? 'Ninguém mais sabe disso. Minta bem e sobreviva até o fim do cronômetro.'
      : 'Seu papel é descobrir quem, entre vocês, cometeu o crime.';

    const card = $('#role-card');
    card.innerHTML = '';
    card.classList.toggle('killer', killer);

    if (killer) {
      const v = CASE.victim;
      const b1 = el('div');
      b1.appendChild(el('h4', null, 'A VÍTIMA'));
      b1.appendChild(el('p', null, `${v.name} — ${v.role}.`));
      b1.appendChild(el('p', null, v.bio));
      card.appendChild(b1);

      const b2 = el('div');
      b2.appendChild(el('h4', null, 'SEU OBJETIVO'));
      const ul = el('ul');
      ul.appendChild(el('li', null, 'Fazer os investigadores votarem em outra pessoa.'));
      ul.appendChild(el('li', null, 'Sobreviver até o cronômetro chegar a zero.'));
      ul.appendChild(el('li', null, 'Usar papos secretos para plantar teorias falsas.'));
      b2.appendChild(ul);
      card.appendChild(b2);

      const b3 = el('div');
      b3.appendChild(el('h4', null, 'O QUE VOCÊ SABE (e eles não)'));
      const ul2 = el('ul');
      for (const tr of secret.traits || []) ul2.appendChild(el('li', null, CASE.traits?.[tr] || tr));
      b3.appendChild(ul2);
      b3.appendChild(el('p', null, 'Cuidado: as pistas da cena apontam para essas características. Esconda-as ou explique-as.'));
      card.appendChild(b3);

      const b4 = el('div');
      b4.appendChild(el('h4', null, 'OBJETIVOS SECUNDÁRIOS'));
      for (const id of secret.objectives || []) {
        const o = (CASE.objectives || []).find(x => x.id === id);
        if (!o) continue;
        const row = el('div', 'obj');
        row.appendChild(el('span', null, o.text));
        row.appendChild(el('b', null, '+' + o.points));
        b4.appendChild(row);
        const hint = el('p', 'tiny');
        hint.style.textAlign = 'left';
        hint.textContent = 'dica: ' + o.hint;
        b4.appendChild(hint);
      }
      card.appendChild(b4);
      $('#role-tip').textContent = 'Se alguém descobrir suas características, diga que são coincidência — e jogue a dúvida para outro.';
    } else {
      const b1 = el('div');
      b1.appendChild(el('h4', null, 'QUEM VOCÊ É'));
      b1.appendChild(el('p', null, secret?.label || 'Investigador(a)'));
      card.appendChild(b1);
      const b2 = el('div');
      b2.appendChild(el('h4', null, 'SUAS CARACTERÍSTICAS (privadas)'));
      const ul = el('ul');
      for (const tr of secret?.traits || []) ul.appendChild(el('li', null, CASE.traits?.[tr] || tr));
      b2.appendChild(ul);
      card.appendChild(b2);
      const b3 = el('div');
      b3.appendChild(el('h4', null, 'SEU ÁLIBI'));
      b3.appendChild(el('p', null, secret?.alibi || '—'));
      card.appendChild(b3);
      const b4 = el('div');
      b4.appendChild(el('h4', null, 'O QUE VOCÊ ESCONDE'));
      b4.appendChild(el('p', null, secret?.secret || '—'));
      card.appendChild(b4);
      $('#role-tip').textContent = 'As pistas apontam características, não nomes. Compare o que a cena diz com o que cada um admite.';
    }

    $('#btn-role-ok').onclick = onOk;
    this.show('screen-role');
  }

  /* ---------------------------------------------------------- votação */
  showVote(st, onVote, opts = {}) {
    const CASE = currentCase(st);
    const myId = this.handlers.myId?.();
    const already = st.votes?.[myId];
    $('#vote-title').textContent = already ? '🗳 SEU VOTO FOI REGISTRADO' : '🗳 VOTAR NO SUSPEITO';
    const body = $('#vote-body');
    body.innerHTML = '';
    const foot = $('#vote-foot');
    foot.innerHTML = '';

    if (already) {
      const target = st.players[already]?.name || getWitness(CASE, already)?.name || already;
      body.appendChild(el('p', 'puzzle-desc', 'Você votou em ' + target + '.'));
      body.appendChild(el('p', 'tiny', 'O voto é irreversível: não é possível alterar, cancelar ou trocar.'));
      body.appendChild(el('p', 'tiny', 'Aguardando os demais jogadores votarem (ou o fim do cronômetro).'));
      return;
    }

    if (st.minEvidence && st.clues.length < st.minEvidence) {
      body.appendChild(el('p', 'puzzle-desc',
        `Investigação difícil: você precisa de pelo menos ${st.minEvidence} evidências para acusar. Faltam ${st.minEvidence - st.clues.length}.`));
      return;
    }

    const mk = (id, name, sub) => {
      const row = el('div', 'sus');
      const av = el('div', 'av');
      av.innerHTML = AV[st.avatars?.[id] || 'm'];
      if (st.players[id]) av.style.color = st.players[id].color;
      row.appendChild(av);
      const info = el('div', 'info');
      info.appendChild(el('b', null, name));
      info.appendChild(el('span', null, sub || ''));
      row.appendChild(info);
      const btns = el('div', 'btns');
      const b = el('button', 'mini-btn red', 'VOTAR');
      b.onclick = () => confirm(id, name);
      btns.appendChild(b);
      row.appendChild(btns);
      body.appendChild(row);
    };

    const confirm = (id, name) => {
      body.innerHTML = '';
      const warn = el('p', 'puzzle-desc', 'Confirmar voto em ' + name + '?');
      warn.style.color = '#e0434f';
      body.appendChild(warn);
      body.appendChild(el('p', 'tiny', 'Depois de confirmar, NÃO será possível voltar atrás, cancelar ou trocar o voto.'));
      foot.innerHTML = '';
      const back = el('button', 'btn btn-ghost', 'ESCOLHER OUTRO');
      back.onclick = () => this.showVote(st, onVote, opts);
      const go = el('button', 'btn btn-red', 'CONFIRMAR VOTO');
      go.onclick = () => onVote(id);
      foot.appendChild(back);
      foot.appendChild(go);
    };

    for (const p of Object.values(st.players)) {
      if (p.id === myId) continue;
      mk(p.id, p.name, st.roles?.[p.id]?.label || '');
    }
    if (Object.keys(st.players).length <= 2) {
      body.appendChild(el('p', 'eyebrow', 'OU UM SUSPEITO DO CASO'));
      for (const w of (CASE.witnesses || [])) mk(w.id, w.name, w.role);
    }
  }

  openVote(st, onVote) {
    $('#vote-root').classList.remove('hidden');
    this.showVote(st, onVote);
  }
  closeVote() { $('#vote-root').classList.add('hidden'); }

  /* --------------------------------------------------------------- fim */
  renderEnd(st, opts = {}) {
    const CASE = currentCase(st);
    const rev = st.reveal || {};
    const win = st.result === 'investigators';
    const inner = document.querySelector('.end-inner');
    inner.classList.toggle('win', win);
    inner.classList.toggle('lose', !win);

    $('#end-kicker').textContent = st.endReason === 'time' ? 'O TEMPO ACABOU' : 'VOTAÇÃO ENCERRADA';
    $('#end-title').textContent = win ? 'ASSASSINO DESCOBERTO' : 'O ASSASSINO VENCEU';

    let ep = '';
    if (rev.killerId) {
      ep = `${rev.killerName} era o assassino — ${rev.killerLabel || ''}. `;
    } else {
      ep = `O culpado era ${getWitness(CASE, CASE.solution.npcKiller)?.name || 'um dos suspeitos'}. `;
    }
    ep += rev.revealText || '';
    if (rev.revealTraits?.length) ep += ' As pistas apontavam exatamente para quem: ' + rev.revealTraits.join('; ') + '.';
    if (st.endReason === 'time') ep += ' O cronômetro chegou a zero sem uma conclusão da equipe.';
    $('#end-epilogue').textContent = ep;

    const box = $('#end-stats');
    box.innerHTML = '';
    box.appendChild(el('p', 'eyebrow', 'PONTUAÇÃO DA SESSÃO'));
    const rank = Object.entries(st.scores || {}).sort((a, b) => b[1] - a[1]);
    rank.forEach(([pid, pts], i) => {
      const p = st.players[pid];
      const row = el('div', 'score-row');
      row.appendChild(el('div', 'pos', String(i + 1) + 'º'));
      const nm = el('div', 'nm');
      nm.appendChild(document.createTextNode(p?.name || (opts.isSolo ? 'Você' : 'Jogador')));
      const d = rev.deltas?.[pid];
      nm.appendChild(el('small', null, (st.roles?.[pid]?.label || '') + (d ? `  ·  ${d > 0 ? '+' : ''}${d} nesta partida` : '')));
      row.appendChild(nm);
      const v = el('div', 'pts ' + (pts < 0 ? 'neg' : pts > 0 ? 'pos' : ''), String(pts));
      row.appendChild(v);
      box.appendChild(row);
    });

    const killer = rev.killerId;
    if (killer && rev.objectives?.length) {
      box.appendChild(el('p', 'eyebrow', 'OBJETIVOS SECRETOS DO ASSASSINO'));
      for (const o of rev.objectives) {
        const row = el('div', 'score-row');
        row.appendChild(el('div', 'nm', o.text));
        row.appendChild(el('div', 'pts ' + (o.done ? 'pos' : ''), o.done ? '+' + o.points : '—'));
        box.appendChild(row);
      }
    }
  }
}

export const UI = new UIClass();
export default UI;
