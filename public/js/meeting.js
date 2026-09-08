/* Reunião de emergência: todos à mesa, depoimentos e voto irreversível.
   Nada aqui é copiado de outros jogos — é a sala de interrogatório do caso. */
import { UI } from './ui.js';

const $ = (s) => document.querySelector(s);

export class Meeting {
  constructor(net, hooks = {}) {
    this.net = net;
    this.hooks = hooks;
    this.root = $('#meeting-root');
    this.aberto = false;
    this.votando = false;

    this.form = $('#mt-form');
    this.input = $('#mt-input');
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const txt = (this.input.value || '').trim();
        if (!txt) return;
        this.input.value = '';
        this.net.action({ type: 'meetingChat', text: txt });
      });
    }
  }

  /* ------------------------------------------------------------- abrir */
  abrir(state) {
    const m = state.meeting;
    if (!m) return;
    this.aberto = true;
    this.root?.classList.remove('hidden');
    this.montar(state);
    this.hooks.onOpen?.(true);
  }

  fechar() {
    if (!this.aberto) return;
    this.aberto = false;
    this.root?.classList.add('hidden');
    this.hooks.onOpen?.(false);
  }

  /* chamado sempre que chega estado novo */
  atualizar(state) {
    if (state.phase === 'meeting' && state.meeting) {
      if (!this.aberto) this.abrir(state);
      else this.montar(state);
    } else if (this.aberto) {
      const r = state.lastMeeting?.result;
      if (r) this.mostrarResultado(state, r);
      else this.fechar();
    }
  }

  /* ------------------------------------------------------------ montar */
  montar(state) {
    const m = state.meeting;
    if (!m) return;
    const eu = this.net.meId;

    /* cabeçalho */
    const corpo = m.corpseId ? (state.corpses || []).find(c => c.id === m.corpseId) : null;
    const sala = (m.room || '').toUpperCase().replace(/-/g, ' ');
    const titulo = $('#mt-title-txt');
    const sub = $('#mt-sub');
    if (titulo) titulo.textContent = corpo ? 'UM CORPO FOI ENCONTRADO' : 'REUNIÃO DE EMERGÊNCIA';
    if (sub) {
      sub.innerHTML = corpo
        ? `<b>${m.byName}</b> encontrou o corpo de <b>${corpo.name}</b> em <b>${sala}</b>.`
        : `<b>${m.byName}</b> convocou a equipe em <b>${sala}</b>.`;
    }

    /* cronômetro da reunião */
    const falta = Math.max(0, m.endsAt - Date.now());
    const tt = $('#mt-timer');
    if (tt) {
      const s = Math.ceil(falta / 1000);
      tt.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      tt.style.color = s < 30 ? 'var(--red-2)' : 'var(--warn)';
    }

    /* mesa: uma cadeira por jogador */
    this.montarMesa(state, m, eu);

    /* quem estava no local */
    const pres = $('#mt-presentes');
    if (pres) {
      const lista = (m.presentes || []).map(p =>
        `<span class="mt-quem"><i style="background:${p.color}"></i>${p.name} · ${(p.room || '').replace(/-/g, ' ')}</span>`
      ).join('');
      pres.innerHTML = lista || '<span class="mt-quem">ninguém por perto</span>';
    }

    /* depoimentos */
    this.montarChat(state, m, eu);

    /* voto */
    this.montarVoto(state, m, eu);
  }

  montarMesa(state, m, eu) {
    const mesa = $('#mt-table');
    if (!mesa) return;
    const vivos = state.order.filter(id => !state.dead[id]);
    const todos = [...vivos, ...state.order.filter(id => state.dead[id])];
    mesa.innerHTML = '';
    const n = Math.max(1, todos.length);
    todos.forEach((id, i) => {
      const p = state.players[id];
      if (!p) return;
      const ang = (-Math.PI / 2) + (i / n) * Math.PI * 2;
      const seat = document.createElement('div');
      seat.className = 'mt-seat' + (state.dead[id] ? ' dead' : '') + (id === eu ? ' me' : '');
      seat.style.left = (50 + Math.cos(ang) * 42) + '%';
      seat.style.top = (50 + Math.sin(ang) * 42) + '%';

      const votou = m.votes[id] !== undefined;
      const alvoVoto = votou && m.votes[id] ? (state.players[m.votes[id]]?.name || '?') : null;
      const status = state.dead[id] ? 'FORA'
        : !votou ? 'pensando…'
          : alvoVoto ? 'votou em ' + alvoVoto
            : 'pulou o voto';

      const inicial = (p.name || '?').trim().charAt(0).toUpperCase();
      seat.innerHTML = `
        <div class="mt-avatar" style="background:${p.color}">${inicial}</div>
        <div class="mt-nome">${p.name}${id === eu ? ' (você)' : ''}</div>
        <div class="mt-votou">${status}</div>`;
      mesa.appendChild(seat);
    });
  }

  montarChat(state, m, eu) {
    const box = $('#mt-msgs');
    if (!box) return;
    const morto = !!state.dead?.[eu];
    const msgs = (m.chat || []).slice(-40).map(c =>
      `<div class="mt-msg"><b style="color:${c.color || '#ddd'}">${c.name}:</b> ${escapeHtml(c.text)}</div>`
    ).join('');
    const aviso = morto
      ? '<div class="mt-msg sys">Você já saiu: não pode falar nem votar.</div>'
      : '<div class="mt-msg sys">Digite o que viu. Quem já saiu não fala.</div>';
    box.innerHTML = aviso + msgs;
    box.scrollTop = box.scrollHeight;
    if (this.input) { this.input.disabled = morto; this.input.placeholder = morto ? 'Você perdeu a voz…' : 'Escreva seu depoimento…'; }
    const send = this.root?.querySelector('.mt-send');
    if (send) send.disabled = morto;
  }

  montarVoto(state, m, eu) {
    const box = $('#mt-vote');
    const hint = $('#mt-hint');
    if (!box) return;
    const morto = !!state.dead?.[eu];
    const jaVotou = m.votes[eu] !== undefined;
    const meuVoto = m.votes[eu];

    if (morto) {
      box.innerHTML = '';
      if (hint) hint.textContent = 'Você saiu da investigação e não vota.';
      return;
    }
    if (jaVotou) {
      box.innerHTML = '';
      if (hint) {
        const nome = meuVoto ? state.players[meuVoto]?.name : null;
        hint.innerHTML = `Seu voto foi registrado: <b>${nome ? nome : 'PULAR VOTO'}</b>. Aguardando os outros…`;
      }
      return;
    }

    box.innerHTML = '';
    for (const id of state.order) {
      if (id === eu || state.dead[id]) continue;
      const p = state.players[id];
      if (!p) continue;
      const b = document.createElement('button');
      b.className = 'mt-sus';
      b.innerHTML = `<i style="width:9px;height:9px;border-radius:50%;background:${p.color};display:inline-block"></i> ${p.name}`;
      b.onclick = () => this.votar(id);
      box.appendChild(b);
    }
    const pular = document.createElement('button');
    pular.className = 'mt-sus pular';
    pular.textContent = 'PULAR VOTO';
    pular.onclick = () => this.votar(null);
    box.appendChild(pular);
    if (hint) hint.textContent = 'O voto é irreversível — escolha com cuidado.';
  }

  votar(alvo) {
    if (this.votando) return;
    this.votando = true;
    setTimeout(() => { this.votando = false; }, 600);
    this.net.action({ type: 'vote', target: alvo });
  }

  /* ---------------------------------------------------------- resultado */
  mostrarResultado(state, r) {
    const box = $('#mt-vote');
    const hint = $('#mt-hint');
    if (!box) { this.fechar(); return; }
    if (r.expelled) {
      const nome = r.expelledName || state.players[r.expelled]?.name || 'Alguém';
      const era = r.wasKiller ? 'Era o assassino.' : 'Era inocente.';
      if (box) box.innerHTML = '';
      if (hint) hint.innerHTML = `<b style="color:var(--warn)">${nome} foi retirado da investigação.</b> ${era}`;
      UI.toast(`${nome} foi retirado · ${era}`, r.wasKiller ? 'good' : 'bad');
    } else {
      if (box) box.innerHTML = '';
      if (hint) hint.innerHTML = '<b>Ninguém foi retirado.</b> A investigação continua.';
      UI.toast('Ninguém foi retirado da equipe.', '');
    }
    setTimeout(() => this.fechar(), 2600);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
