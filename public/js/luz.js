/* Falta de luz: aviso, vela e o minijogo do quadro de energia.
   A sequência certa vive no servidor — aqui só se reproduce e se envia. */
import { UI } from './ui.js';
import * as A from './audio.js';

const $ = (s) => document.querySelector(s);

export class Luz {
  constructor(net) {
    this.net = net;
    this.root = $('#painel-root');
    this.modelo = $('#painel-modelo');
    this.chaves = $('#painel-chaves');
    this.dica = $('#painel-dica');
    this.erro = $('#painel-erro');
    this.btnReligar = $('#painel-religar');
    this.seq = [0, 0, 0, 0, 0];
    this.alvo = null;
    this.timer = null;

    $('#painel-close')?.addEventListener('click', () => this.fechar());
    $('#painel-cancelar')?.addEventListener('click', () => this.fechar());
    this.btnReligar?.addEventListener('click', () => this.religar());
  }

  get state() { return this.net?.state; }
  get apagada() { return !!this.state?.luz?.apagada; }
  get velaAcesa() { return (this.state?.velaAte?.[this.net.playerId] || 0) > Date.now(); }
  get tenhoVelas() { return (this.state?.velas?.[this.net.playerId] || 0) > 0; }

  /* ------------------------------------------------------------- minijogo */
  abrir() {
    const alvo = this.state?.luz?.painel;
    if (!alvo) { UI.toast('A energia está normal por aqui.', ''); return; }
    this.alvo = alvo.slice();
    this.seq = [0, 0, 0, 0, 0];
    this.erro?.classList.add('hidden');
    this.root?.classList.remove('hidden');
    this.desenhar();
    A.playSfx('switch');
    // a sequência aparece só por alguns segundos: é preciso memorizar
    let falta = 2.6;
    this.dica.textContent = 'Memorize a sequência… ' + falta.toFixed(1) + 's';
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      falta -= 0.1;
      if (falta <= 0) {
        clearInterval(this.timer);
        this.modelo?.classList.add('oculto');
        this.dica.textContent = 'Reproduza a sequência e religue a energia.';
        if (this.btnReligar) this.btnReligar.disabled = false;
      } else {
        this.dica.textContent = 'Memorize a sequência… ' + falta.toFixed(1) + 's';
      }
    }, 100);
  }

  fechar() {
    clearInterval(this.timer);
    this.root?.classList.add('hidden');
  }

  desenhar() {
    if (this.modelo) {
      this.modelo.classList.remove('oculto');
      this.modelo.innerHTML = '';
      for (const v of this.alvo) {
        const d = document.createElement('div');
        d.className = 'painel-lamp ' + (v ? 'acesa' : 'apagada');
        d.textContent = v ? 'I' : 'O';
        this.modelo.appendChild(d);
      }
    }
    if (this.chaves) {
      this.chaves.innerHTML = '';
      this.seq.forEach((v, i) => {
        const b = document.createElement('button');
        b.className = 'painel-chave' + (v ? ' on' : '');
        b.innerHTML = `<i></i><span>${v ? 'ON' : 'OFF'}</span>`;
        b.onclick = () => {
          this.seq[i] = v ? 0 : 1;
          this.desenhar();
          A.playSfx('switch');
        };
        this.chaves.appendChild(b);
      });
    }
  }

  religar() {
    if (!this.alvo) return;
    this.net.action({ type: 'painel', seq: this.seq });
    A.playSfx('metal');
    this.fechar();
  }

  acenderVela() {
    if (!this.tenhoVelas) { UI.toast('Você não tem mais velas.', 'bad'); return; }
    if (this.velaAcesa) { UI.toast('Sua vela ainda está acesa.', ''); return; }
    this.net.action({ type: 'vela' });
  }

  /* ------------------------------------------------ aviso na tela inteira */
  sincronizar() {
    const barra = $('#blackout-bar');
    if (barra) barra.classList.toggle('hidden', !this.apagada);
    const nota = $('#blackout-note');
    if (nota && this.apagada) {
      nota.textContent = this.velaAcesa
        ? 'Sua vela está acesa — cuidado: ela também revela você.'
        : 'Vá até o quadro de energia ou acenda uma vela.';
    }
    const btn = $('#btn-vela');
    if (btn) {
      const pode = this.apagada && this.tenhoVelas && !this.velaAcesa;
      btn.classList.toggle('hidden', !pode);
      const txt = btn.querySelector('.wa-txt');
      if (txt) txt.textContent = 'ACENDER VELA (' + (this.state?.velas?.[this.net.playerId] || 0) + ')';
    }
  }
}
