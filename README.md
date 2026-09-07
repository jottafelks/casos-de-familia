# CASOS DE FAMÍLIA

**Jogo de investigação social multiplayer (1 a 6 jogadores) com chat de voz, salas por
código e votação irreversível.** Roda no celular e no computador, direto no navegador.

Um jogador é secretamente o **assassino**. Os outros são **investigadores**: exploram a
cena, acham pistas, conversam, desconfiam, fazem papos secretos e votam. As pistas nunca
dizem "foi fulano" — elas apontam **características** (botas com terra, briga às 22h,
letra canhota) que precisam ser cruzadas em discussão. O assassino vence se ninguém
descobrir até o cronômetro zerar.

---

## Como jogar

1. Abra o jogo → escolha **nome** e **personagem** (masculino/feminino) → **CRIAR SALA**.
2. Mande o código **FAM-XXXX** (ou o link da sala) para os amigos → eles usam **ENTRAR EM SALA**.
3. O anfitrião toca em **INICIAR CASO**. Todos leem o briefing no próprio ritmo (**CONTINUAR**).
4. Cada um recebe um **papel secreto**. O assassino vê a vítima, seus objetivos secretos e
   as características que precisa esconder.
5. Na cena: toque nos objetos para investigar, troque de local pelos botões grandes,
   converse por voz (🎤), faça **PAPO SECRETO** com alguém, marque evidências.
6. Quando todos votarem — ou o tempo acabar — o caso é encerrado e o placar aparece.

### Regras principais

| Regra | Como funciona |
|---|---|
| Cronômetro | **10 min** com 3 a 6 jogadores · **5 min** no solo e na dupla |
| Voto | É **irreversível**: depois de confirmar, não dá para trocar nem cancelar |
| Resultado | Maioria no assassino → investigadores ganham. Sem maioria ou tempo zerado → **assassino vence** |
| Pontos | Investigador certo **+100** · errado **−50** · assassino pego **−100** · escapou **+150** · objetivo secreto **+50/+75/+100** |
| Placar | Acumula entre partidas e **pode ficar negativo** |
| Solo / dupla | Há suspeitos controlados pelo sistema e **evidência mínima** (6) para acusar |

---

## Tecnologia

* **Servidor Node** (Express + `ws`): salas `FAM-XXXX`, cronômetro autoritativo, votação,
  pontuação e sinalização de voz. Sem banco de dados — tudo em memória.
* **Dois transportes**: WebSocket (`/ws`) com queda automática para **HTTP long-poll**
  (`/api/*`) quando a rede não repassa o Upgrade — é o que faz funcionar atrás de túneis.
* **Voz WebRTC em malha** (um `RTCPeerConnection` por par), negociação perfeita,
  religação automática, detecção de fala e isolamento de áudio no papo secreto.
* **Sem dependências de front-end**: canvas 2D, Web Audio e WebRTC puros.

### Scripts

```bash
npm start          # sobe o servidor (PORT=3000 por padrão)
npm test           # 34 testes de regra + 12 de HTTP/long-poll
npm run test:e2e   # 18 testes de navegador (3 jogadores reais, Playwright)
npm run test:all   # tudo
```

## Estrutura

```
server/server.js        salas, códigos, cronômetro, voto, sinalização de voz (/api/ice)
public/shared/engine.js regras puras (papéis, voto, pontuação, sussurros, objetivos)
public/shared/cases.js  DADOS DOS CASOS (adicionar um caso novo = 1 objeto aqui)
public/js/net.js        transporte (ws → http → offline) e reconexão
public/js/voice.js      malha de voz WebRTC
public/js/game.js       cena, objetos investigáveis, câmera
public/js/ui.js         painéis, evidências, suspeitos, votação, fim
public/js/main.js       fluxo: home → sala → briefing → papel → cena → voto → fim
tests/                  suítes de regra, HTTP e ponta a ponta
```

### Adicionar um caso novo

Edite só `public/shared/cases.js`: `briefing[]`, `victim`, `locations[]` (com
`objects[].actions[].effects`), `clues{}`, `traits`, `roles[]`, `witnesses[]`,
`objectives[]` e `solution`. Nada mais precisa mudar — a engine, a cena e a interface
leem tudo daí.

---

## Colocar no ar (URL permanente)

O projeto já vem com o Blueprint do Render pronto (`render.yaml`). O passo a passo —
incluindo o que **só você** pode fazer (criar a conta) e as variáveis de voz (`TURN_*`) —
está em **[RENDER-PASSO-A-PASSO.md](RENDER-PASSO-A-PASSO.md)**.

Resumo: suba o repositório → Render → **New + → Blueprint** → aplique → use a URL
`https://casos-de-familia.onrender.com`.

> Túnel (tunnelmole/ngrok/localhost) **não é endereço final**: cai e muda de endereço.
