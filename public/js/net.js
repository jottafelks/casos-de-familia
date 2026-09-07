/* =============================================================================
   REDE — multiplayer + modo offline (mesmas regras da engine).
   Transportes: 1) WebSocket (/ws)  2) HTTP long-poll (/api)  3) offline
   Também transporta a sinalização do chat de voz (WebRTC).
   ========================================================================== */
import { createState, addPlayer, startGame, applyAction, checkTimedEvents, timeLeft, META } from '../shared/engine.js';

const WS_TIMEOUT = 3000;

export class Network extends EventTarget {
  constructor() {
    super();
    this.ws = null;
    this.state = null;
    this.playerId = null;
    this.code = null;
    this.offline = false;
    this.connected = false;
    this.transport = null;
    this.secret = null;              // papel secreto (só este cliente)
    this.serverOffset = 0;
    this._tick = null;
    this._seq = 0;
    this._polling = false;
    this._fails = 0;
    this._bye = false;
  }

  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  /* ------------------------------------------------------------ transporte */
  async _connect() {
    try { await this._wsConnect(); this.transport = 'ws'; this.connected = true; return 'ws'; } catch (e) {}
    try { await this._httpProbe(); this.transport = 'http'; this.connected = true; return 'http'; } catch (e) {}
    throw new Error('sem transporte');
  }

  _wsConnect() {
    return new Promise((resolve, reject) => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      let settled = false;
      try { this.ws = new WebSocket(`${proto}://${location.host}/ws`); } catch (e) { reject(e); return; }
      const to = setTimeout(() => { if (!settled) { settled = true; try { this.ws.close(); } catch {} reject(new Error('timeout')); } }, WS_TIMEOUT);
      this.ws.onopen = () => { clearTimeout(to); if (settled) return; settled = true; this.connected = true; resolve(); };
      this.ws.onerror = () => { clearTimeout(to); if (!settled) { settled = true; reject(new Error('ws error')); } };
      this.ws.onclose = () => {
        this.connected = false;
        if (this._tick) clearInterval(this._tick);
        if (!this._bye && this.transport === 'ws') this.emit('closed');
      };
      this.ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch { return; } this._apply(m); };
    });
  }

  async _httpProbe() {
    const r = await fetch('/healthz?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('healthz ' + r.status);
  }

  _post(url, body) {
    return fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify(body || {})
    }).then(r => r.json());
  }

  _apply(m) {
    switch (m.type) {
      case 'welcome':
        this.playerId = m.playerId; this.code = m.code; this.state = m.state;
        if (m.secret) this.secret = m.secret;
        this.serverOffset = (m.serverTime || m.t || Date.now()) - Date.now();
        this.emit('welcome', m);
        this.emit('state', { state: m.state, events: [] });
        break;
      case 'state':
        this.state = m.state;
        // o servidor manda o próprio papel secreto dentro do estado filtrado
        if (m.state && m.state.secret) this.secret = m.state.secret;
        this.emit('state', { state: m.state, events: m.events || [] });
        break;
      case 'tick':
        this.serverOffset = m.t - Date.now();
        if (this.state) { this.state.__left = m.left; this.state.__phase = m.phase; }
        break;
      case 'signal': this.emit('signal', { from: m.from, data: m.data }); break;
      case 'error': this.emit('error', m); break;
      case 'kicked': this.emit('kicked', m); break;
    }
  }

  _startPoll() {
    if (this._polling) return;
    this._polling = true;
    (async () => {
      while (this.transport === 'http' && !this._bye) {
        try {
          const r = await fetch(`/api/poll?code=${encodeURIComponent(this.code)}&pid=${encodeURIComponent(this.playerId)}&since=${this._seq}&_=${Date.now()}`, { cache: 'no-store' });
          const d = await r.json();
          if (d.gone) { this._polling = false; if (!this._bye) this.emit('closed'); return; }
          this.serverOffset = (d.t || Date.now()) - Date.now();
          if (Array.isArray(d.msgs)) for (const m of d.msgs) { this._seq = Math.max(this._seq, m.seq || 0); this._apply(m.msg); }
          if (typeof d.seq === 'number') this._seq = Math.max(this._seq, d.seq);
          if (this.state) { this.state.__left = d.left; this.state.__phase = d.phase; }
          this._fails = 0;
        } catch (e) {
          this._fails++;
          if (this._fails > 6) { this._polling = false; if (!this._bye) this.emit('closed'); return; }
          await new Promise(r => setTimeout(r, 1200 * this._fails));
        }
      }
      this._polling = false;
    })();
  }

  _send(obj) {
    if (this.transport === 'ws' && this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(obj)); return; }
    if (this.transport === 'http' && this.code && !this._bye) {
      fetch('/api/act', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: this.code, pid: this.playerId, msg: obj })
      }).then(r => r.json()).then(d => { if (d && d.ok === false && d.msg) this.emit('error', { msg: d.msg }); }).catch(() => {});
    }
  }

  /** Sinalização WebRTC (oferta/resposta/candidatos) para um jogador. */
  signal(to, data) { if (!this.offline) this._send({ type: 'signal', to, data }); }

  /* --------------------------------------------------------------- salas */
  async create(name, opts = {}) {
    this.localName = name;
    try { await this._connect(); } catch { return this.solo(name, opts); }
    if (this.transport === 'http') {
      try {
        const w = await this._post('/api/create', { name, caseId: opts.caseId, avatar: opts.avatar });
        if (w && w.type === 'welcome') { this._apply(w); this._startPoll(); return { code: this.code }; }
      } catch (e) {}
      return this.solo(name, opts);
    }
    return new Promise((resolve, reject) => {
      const onWelcome = () => { this.off('welcome', onWelcome); resolve({ code: this.code }); };
      this.on('welcome', onWelcome);
      this._send({ type: 'create', name, caseId: opts.caseId, avatar: opts.avatar });
      setTimeout(() => reject(new Error('timeout-create')), 6000);
    }).catch(() => this.solo(name, opts));
  }

  async join(code, name, opts = {}) {
    this.localName = name;
    try { await this._connect(); } catch { return this.solo(name, opts); }
    if (this.transport === 'http') {
      try {
        const w = await this._post('/api/join', { code, name, playerId: opts.playerId, avatar: opts.avatar });
        if (w && w.type === 'error') throw new Error(w.msg);
        if (w && w.type === 'welcome') { this._apply(w); this._startPoll(); return { code: this.code }; }
      } catch (e) { throw e; }
      throw new Error('Não foi possível entrar na sala.');
    }
    return new Promise((resolve, reject) => {
      const onWelcome = () => { this.off('welcome', onWelcome); resolve({ code: this.code }); };
      const onErr = (e) => { this.off('error', onErr); reject(new Error(e.detail.msg)); };
      this.on('welcome', onWelcome); this.on('error', onErr);
      this._send({ type: 'join', code, name, playerId: opts.playerId, avatar: opts.avatar });
      setTimeout(() => reject(new Error('timeout-join')), 6000);
    });
  }

  start(opts = {}) { if (!this.offline) this._send({ type: 'start', ...opts }); else this._localStart(opts); }
  restart(caseId) { if (!this.offline) this._send({ type: 'restart', caseId }); else this._localRestart(caseId); }
  leave() {
    this._bye = true;
    if (!this.offline) { this._send({ type: 'leave' }); if (this.ws) { try { this.ws.close(); } catch {} } }
  }

  async reconnect(tries = 12) {
    if (this.offline || this._bye) return false;
    this.emit('reconnecting', {});
    for (let i = 0; i < tries; i++) {
      await new Promise(r => setTimeout(r, 1200 + i * 400));
      if (this._bye) return false;
      try {
        if (this.transport === 'http') {
          const w = await this._post('/api/join', {
            code: this.code, name: this.localName || this.state?.players?.[this.playerId]?.name,
            playerId: this.playerId
          });
          if (w && w.type === 'welcome') { this._apply(w); this._startPoll(); this.emit('reconnected', {}); return true; }
        } else {
          await this._connect();
          this._send({ type: 'join', code: this.code, name: this.localName || this.state?.players?.[this.playerId]?.name, playerId: this.playerId });
          const got = await new Promise(res => {
            const to = setTimeout(() => res(false), 5000);
            const h = () => { clearTimeout(to); this.off('welcome', h); res(true); };
            this.on('welcome', h);
          });
          if (got) { this.emit('reconnected', {}); return true; }
        }
      } catch (e) {}
    }
    this.emit('reconnect_failed', {});
    return false;
  }

  action(a) { if (!this.offline) this._send({ type: 'action', action: a }); else this._localAction(a); }
  chat(text) { if (!this.offline) this._send({ type: 'chat', text }); else this._localChat(text); }

  on(type, fn) { this.addEventListener(type, fn); }
  off(type, fn) { this.removeEventListener(type, fn); }

  timeLeft() {
    if (!this.state) return 0;
    if (this.offline) return timeLeft(this.state);
    if (!this.state.endAt) return this.state.duration;
    return Math.max(0, this.state.endAt - this.state.penaltyMs - (Date.now() + this.serverOffset));
  }
  fraction() {
    if (!this.state || !this.state.duration) return 0;
    return Math.min(1, Math.max(0, 1 - this.timeLeft() / this.state.duration));
  }

  /* ----------------------------------------------------------- offline */
  solo(name, opts = {}) {
    this.offline = true;
    this.transport = 'offline';
    this.localName = name;
    this.state = createState({ caseId: opts.caseId, solo: true });
    this.playerId = 'solo';
    addPlayer(this.state, this.playerId, name, opts.avatar);
    this.code = 'SOLO';
    this._bye = false;
    this.emit('welcome', { code: 'SOLO', playerId: 'solo', state: this.state, secret: null });
    this.emit('state', { state: this.state, events: [] });
    this.emit('fallback', {});
    if (this._tick) clearInterval(this._tick);
    this._tick = setInterval(() => {
      if (this.state.phase === 'playing') {
        const out = [];
        checkTimedEvents(this.state, out);
        if (out.length) this.emit('state', { state: this.state, events: out });
      }
    }, 500);
    return { code: 'SOLO' };
  }
  _localStart(opts = {}) {
    startGame(this.state, { caseId: opts.caseId });
    this.emit('state', { state: this.state, events: [{ type: 'briefing' }] });
  }
  _localRestart(caseId) {
    const scores = this.state.scores || {};
    const fresh = createState({ caseId: caseId || this.state.caseId, solo: true });
    addPlayer(fresh, 'solo', this.localName || 'Você', this.state.avatars?.solo);
    fresh.scores.solo = scores.solo || 0;
    this.state = fresh;
    this.emit('state', { state: this.state, events: [{ type: 'restarted' }] });
  }
  _localAction(a) {
    const res = applyAction(this.state, a, { playerId: this.playerId, name: this.state.players[this.playerId]?.name });
    if (!res.ok && res.msg) this.emit('error', { msg: res.msg });
    if (res.events?.length || res.ok) this.emit('state', { state: this.state, events: res.events || [] });
    return res;
  }
  _localChat(text) { return this._localAction({ type: 'chat', text }); }
}
