/* =============================================================================
   VOZ — chat de voz em malha (WebRTC).
   • Um RTCPeerConnection por par de jogadores (até 6 = 5 conexões por cliente)
   • Sinalização pelo próprio transporte do jogo (WebSocket ou long-poll)
   • Negociação perfeita: quem tem o menor id faz a oferta
   • Papo secreto: só a voz do parceiro fica audível
   ========================================================================== */

const ICE_REFRESH_MS = 4 * 60 * 1000;

export class Voice {
  constructor(net, hooks = {}) {
    this.net = net;
    this.hooks = hooks;
    this.peers = new Map();       // pid -> { pc, stream, audio, analyser, raf, speaking, makingOffer, polite }
    this.local = null;            // MediaStream do microfone
    this.enabled = false;
    this.muted = false;
    this.whisperWith = null;      // pid do papo secreto (voz)
    this.iceServers = null;
    this.error = null;
    this._sigs = new Map();       // pid -> candidatos recebidos antes do pc existir
    this._lastIce = 0;

    net.on('signal', (e) => this._onSignal(e.detail.from, e.detail.data));
  }

  get available() { return this.enabled && !this.error; }
  get speakingPids() { return [...this.peers.entries()].filter(([, p]) => p.speaking).map(([pid]) => pid); }

  async _loadIce() {
    const now = Date.now();
    if (this.iceServers && now - this._lastIce < ICE_REFRESH_MS) return this.iceServers;
    try {
      const r = await fetch('/api/ice', { cache: 'no-store' });
      const d = await r.json();
      this.iceServers = d.iceServers || [{ urls: ['stun:stun.l.google.com:19302'] }];
      this._lastIce = now;
    } catch {
      this.iceServers = [{ urls: ['stun:stun.l.google.com:19302'] }];
    }
    return this.iceServers;
  }

  /** Pede o microfone e entra na malha de voz. */
  async enable() {
    if (this.enabled) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.error = 'unsupported';
      this.hooks.onError?.('unsupported');
      return false;
    }
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false
      });
    } catch (e) {
      this.error = e && e.name ? e.name : 'denied';
      this.hooks.onError?.(this.error);
      return false;
    }
    this.enabled = true;
    this.error = null;
    await this._loadIce();
    this.syncPeers();
    clearInterval(this._watchdog);
    this._watchdog = setInterval(() => this.syncPeers(), 2500);
    this.hooks.onChange?.();
    return true;
  }

  disable() {
    this.enabled = false;
    clearInterval(this._watchdog);
    for (const [pid] of [...this.peers]) this._closePeer(pid);
    if (this.local) { this.local.getTracks().forEach(t => t.stop()); this.local = null; }
    this.hooks.onChange?.();
  }

  setMuted(m) {
    this.muted = !!m;
    if (this.local) this.local.getAudioTracks().forEach(t => { t.enabled = !m; });
    this.hooks.onChange?.();
  }

  /** Papo secreto: ouve (e fala com) apenas um jogador. */
  startWhisper(pid) {
    this.whisperWith = pid;
    this._applyAudibility();
    this.hooks.onChange?.();
  }
  stopWhisper() {
    this.whisperWith = null;
    this._applyAudibility();
    this.hooks.onChange?.();
  }

  _applyAudibility() {
    for (const [pid, p] of this.peers) {
      const audible = !this.whisperWith || this.whisperWith === pid;
      if (p.audio) p.audio.muted = !audible;
      p.tracks?.forEach(t => { t.enabled = audible; });
    }
  }

  /* ------------------------------------------------------------- malha */
  syncPeers() {
    const st = this.net.state;
    if (!st || !this.enabled) return;
    const others = st.order.filter(pid => pid !== this.net.playerId);
    for (const pid of others) {
      const p = this.peers.get(pid);
      if (!p || p.pc.signalingState === 'closed') { this._ensurePeer(pid); continue; }
      this._repair(pid, p);
    }
    for (const pid of [...this.peers.keys()]) {
      if (!others.includes(pid) || st.players[pid]?.online === false) this._closePeer(pid);
    }
  }

  /** Religação automática: se um par travar em "new/connecting" ou ficar
      preso em estado de sinalização, recomeça a negociação. É o que salva
      a partida quando alguém libera o microfone depois dos outros. */
  _repair(pid, p) {
    const pc = p.pc, now = Date.now();
    const st = pc.connectionState;
    if (st === 'connected' || st === 'completed') return;
    if (pc.signalingState !== 'stable' && now - (p.sigSince || 0) > 5000) {
      this._closePeer(pid); this._ensurePeer(pid); return;
    }
    if (st === 'failed') { this._closePeer(pid); this._ensurePeer(pid); return; }
    // o lado de menor id reenvia a oferta periodicamente até conectar
    if (this.net.playerId < pid && pc.signalingState === 'stable' && now - (p.lastOffer || 0) > 2500) {
      p.lastOffer = now;
      try { pc.onnegotiationneeded(); } catch {}
    }
  }

  _ensurePeer(pid) {
    if (this.peers.has(pid)) return this.peers.get(pid);
    const pc = new RTCPeerConnection({ iceServers: this.iceServers || [{ urls: ['stun:stun.l.google.com:19302'] }] });
    const peer = { pc, stream: null, audio: null, analyser: null, raf: 0, speaking: false, makingOffer: false, polite: this.net.playerId > pid, tracks: [] };
    this.peers.set(pid, peer);

    if (this.local) this.local.getTracks().forEach(t => pc.addTrack(t, this.local));

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        peer.lastOffer = Date.now();
        await pc.setLocalDescription();
        this.net.signal(pid, { kind: 'offer', sdp: pc.localDescription });
      } catch (e) { /* ignorado: nova negociação virá */ }
      finally { peer.makingOffer = false; }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) this.net.signal(pid, { kind: 'candidate', candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      peer.stream = e.streams[0];
      peer.tracks = peer.stream ? peer.stream.getAudioTracks() : [];
      let audio = document.getElementById('voice-audio-' + pid);
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'voice-audio-' + pid;
        audio.autoplay = true;
        audio.playsInline = true;      // iOS: toca sem abrir o player nativo
        audio.style.display = 'none';
        document.body.appendChild(audio);
      }
      audio.srcObject = peer.stream;
      audio.play?.().catch(() => {});
      peer.audio = audio;
      this._watchSpeaking(pid, peer);
      this._applyAudibility();
      this.hooks.onChange?.();
    };

    pc.onsignalingstatechange = () => { peer.sigSince = Date.now(); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        // tenta reconectar uma vez
        if (this.enabled && pc.connectionState === 'failed') {
          this._closePeer(pid);
          setTimeout(() => this.enabled && this._ensurePeer(pid), 1200);
        }
      }
      this.hooks.onChange?.();
    };

    // candidatos que chegaram antes do pc existir
    const pending = this._sigs.get(pid);
    if (pending) { pending.forEach(m => this._handle(pid, m)); this._sigs.delete(pid); }

    // quem tem o menor id inicia a oferta
    if (this.net.playerId < pid) {
      setTimeout(() => {
        if (!peer.makingOffer && pc.signalingState === 'stable' && this.enabled) {
          pc.onnegotiationneeded?.();
        }
      }, 200);
    } else {
      // força a negociação do lado "polite" também (addTrack já dispara em muitos navegadores)
    }
    return peer;
  }

  _closePeer(pid) {
    const p = this.peers.get(pid);
    if (!p) return;
    try { p.pc.onnegotiationneeded = null; p.pc.onicecandidate = null; p.pc.ontrack = null; p.pc.close(); } catch {}
    if (p.raf) cancelAnimationFrame(p.raf);
    if (p.audio) { try { p.audio.pause(); p.audio.srcObject = null; p.audio.remove(); } catch {} }
    try { p.ctx?.close(); } catch {}
    this.peers.delete(pid);
    this.hooks.onChange?.();
  }

  async _onSignal(from, data) {
    if (!data || from === this.net.playerId) return;
    /* Ainda sem microfone: guarda o sinal (até 20 por jogador) em vez de
       descartá-lo — assim a oferta de quem liberou primeiro não se perde. */
    if (!this.enabled) {
      if (!this._sigs.has(from)) this._sigs.set(from, []);
      const q = this._sigs.get(from);
      q.push(data); if (q.length > 20) q.shift();
      return;
    }
    let peer = this.peers.get(from);
    if (!peer) {
      if (!this._sigs.has(from)) this._sigs.set(from, []);
      this._sigs.get(from).push(data);
      peer = this._ensurePeer(from);
      const pending = this._sigs.get(from) || [];
      this._sigs.delete(from);
      for (const m of pending) await this._handle(from, m);
      return;
    }
    await this._handle(from, data);
  }

  async _handle(from, data) {
    const peer = this.peers.get(from);
    if (!peer) return;
    const pc = peer.pc;
    try {
      if (data.kind === 'offer') {
        const offerCollision = peer.makingOffer || pc.signalingState !== 'stable';
        peer.ignoreOffer = offerCollision && !peer.polite;
        if (peer.ignoreOffer) return;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await pc.setLocalDescription();
        this.net.signal(from, { kind: 'answer', sdp: pc.localDescription });
      } else if (data.kind === 'answer') {
        if (pc.signalingState !== 'have-local-offer') return;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.kind === 'candidate') {
        try { await pc.addIceCandidate(data.candidate ? new RTCIceCandidate(data.candidate) : null); }
        catch (e) { if (!peer.ignoreOffer) throw e; }
      }
    } catch (e) { /* silencioso: a malha se recupera */ }
  }

  /* ------------------------------------------------- detector de fala */
  _watchSpeaking(pid, peer) {
    if (!peer.stream) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      peer.ctx = new AC();
      const src = peer.ctx.createMediaStreamSource(peer.stream);
      const an = peer.ctx.createAnalyser();
      an.fftSize = 512; an.smoothingTimeConstant = 0.6;
      src.connect(an);
      peer.analyser = an;
      const buf = new Uint8Array(an.frequencyBinCount);
      let quiet = 0;
      const loop = () => {
        if (!this.peers.has(pid)) return;
        an.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        const talking = rms > 12;
        if (talking) quiet = 0; else quiet++;
        const now = talking || quiet < 12;
        if (now !== peer.speaking) { peer.speaking = now; this.hooks.onSpeaking?.(pid, now); }
        peer.raf = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { /* sem detector: tudo bem */ }
  }

  /** Nível do microfone local (0..1) para o indicador visual. */
  localLevel() {
    if (!this.enabled || this.muted || !this.local) return 0;
    return this._localLevel || 0;
  }

  startLocalMeter() {
    if (this._meterRaf || !this.local) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(this.local);
      const an = ctx.createAnalyser(); an.fftSize = 256;
      src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        if (!this.enabled) { this._meterRaf = 0; return; }
        an.getByteFrequencyData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        this._localLevel = Math.min(1, Math.sqrt(sum / buf.length) / 60);
        this._meterRaf = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { /* ignorado */ }
  }

  destroy() {
    this.disable();
    for (const [pid] of [...this.peers]) this._closePeer(pid);
  }
}
