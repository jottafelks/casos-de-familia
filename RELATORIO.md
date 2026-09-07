# CASOS DE FAMÍLIA — relatório de entrega

Data: 07/09/2026 · tudo abaixo foi testado de verdade neste workspace (não é simulação).

---

## 1. Onde jogar agora

| | |
|---|---|
| **Link temporário (para testar hoje)** | https://oxford-redeem-posted-graphic.trycloudflare.com |
| **Link permanente** | ⚠️ **Pendente — depende da sua conta** (veja o item 4) |
| Servidor local | `npm start` → http://localhost:3000 |

O endereço temporário funciona no celular agora mesmo (testei o `/healthz` e uma partida de
2 jogadores por ele). Ele **não** é a entrega final: cai quando esta máquina desliga, e o
watchdog pode trocá-lo — nesse caso o endereço atualizado fica em `ACESSO.md`. O que falta para o endereço definitivo está
no item 4, e é a única etapa que eu não consigo fazer sozinho.

---

## 2. O que o jogo faz

Um jogador é secretamente o **assassino**; os outros são **investigadores**. A cena é
explorada no canvas (salas, objetos investigáveis), as pistas apontam **características**
(botas com terra, briga às 22h, letra canhota) e nunca dizem "foi fulano" — a equipe precisa
cruzar evidências, conversar, desconfiar e votar antes de o cronômetro zerar.

* **4 casos prontos**: **Mansão (CF-01)**, **Fazenda (CF-02)**, **Hotel (CF-03)** e
  **Empresa (CF-04 — "O Último Balanço")**, este escrito em arquivo próprio
  (`public/shared/case-empresa.js`) como modelo para os próximos. Cada caso tem vítima,
  4–5 locais (um trancado até certa descoberta), 12–20 objetos investigáveis, 13–26 pistas
  (fácil/médio/difícil), 6 perfis, testemunhas, contradições e solução.
* **Voz obrigatória**: WebRTC em malha, prompt de microfone, 🎤/🔇/🔊, papo secreto que
  isola a voz dos outros, detector de fala, religação automática.
* **Salas** `FAM-XXXX` com link compartilhável, 1 a 6 jogadores, reconexão automática.
* **Voto irreversível** com tela de confirmação; cronômetro 10 min (3–6) ou 5 min (solo/dupla);
  pontuação acumulada que **pode ficar negativa**; objetivos secretos variáveis por partida.

---

## 3. Testes executados — 91 no total, todos passando

| Suíte | Comando | Resultado | O que cobre |
|---|---|---|---|
| Regras (Node) | `npm test` | **35 ✓** | papéis, sorteio, cronômetro, voto irreversível, pontuação negativa, maioria, objetivos, sussurros, marcas, dados dos casos |
| HTTP/long-poll | `npm test` | **12 ✓** | criar/entrar sala, limite de 6, transporte sem WebSocket, sigilo do estado, sinalização de voz |
| Navegador (3 jogadores reais) | `npm run test:e2e` | **18 ✓** | partida completa: briefing manual, papel secreto, sigilo, chat, papo secreto, pistas, voto, placar, fim por tempo, reconexão, tela cheia, zero erro de JS |
| Caso novo (CF-04) | `npm run test:caso` | **9 ✓** |
| Varredura dos casos | `npm run test:casos` | **4 ✓** |
| Robustez | `npm run test:stress` | **13 ✓** | **partida completa com 6 jogadores**, microfone negado (mensagem amigável + jogo continua), telas de 320 px sem transbordo e com alvos ≥ 44 px |

Partidas jogadas de verdade: **solo, 2, 3 e 6 jogadores**. 4 e 5 jogadores têm cobertura de
regras (35 testes) e de sala; a partida completa em navegador foi validada em 3 e em 6.
Os 4 casos foram varridos objeto por objeto no navegador (sem erro de JS em nenhum).

**Voz**: testada com microfone falso do Chrome — 6 de 6 conexões entre 3 jogadores, mesmo
liberando o microfone em momentos diferentes; mute, medidor e isolamento no papo secreto
confirmados. Em iPhone/Android reais eu não consigo testar aqui: usei `getUserMedia` em
resposta a um toque (exigência do iOS), `playsInline` e STUN público.

---

## 4. ⚠️ O que falta — e o que eu preciso de você

A **hospedagem permanente** é o único item aberto. O projeto já está configurado
(`render.yaml`, Blueprint do Render, plano grátis, health check, variáveis de voz), mas criar
a conta e autorizar o repositório **só você pode fazer**.

### Opção A — você faz em ~10 min (recomendado)

Siga **[RENDER-PASSO-A-PASSO.md](RENDER-PASSO-A-PASSO.md)**. O repositório Git já está
pronto nesta pasta (commit inicial feito). Resumo: crie o repositório no GitHub →
`git remote add origin … && git push -u origin main` → Render → **New + → Blueprint** →
aplique → use `https://casos-de-familia.onrender.com`.

### Opção B — eu faço por você

Me passe **um** destes conjuntos:

1. **GitHub**: seu usuário + um Personal Access Token com escopo `repo`; **ou**
2. **Render**: um API Key (Account Settings → API Keys).

Com isso eu crio o repositório, disparo o Blueprint, testo a URL e te devolvo
`LINK FINAL DO JOGO: …` verificado.

### Configuração que pode ser necessária depois

| Variável | Onde | Quando |
|---|---|---|
| `TURN_URL`, `TURN_USER`, `TURN_PASS` | painel do Render (Environment) | **Opcional.** Só se algum jogador não conseguir falar por voz em 4G/Wi-Fi restritivo. Pode usar o Open Relay gratuito da Metered. Ficam no servidor e são entregues ao navegador por `GET /api/ice` — nunca no código do front-end |
| Ping a cada 10 min em `/healthz` | cron-job.org | **Opcional.** Evita o servidor dormir no plano grátis do Render |

Nenhuma credencial está no código; o `.env` está no `.gitignore`.

### Enquanto isso: link de teste (temporário)

`ACESSO.md` e `COMO-ACESSAR.md` trazem o endereço público de agora (túnel) com QR code, e um
watchdog na máquina mantém o túnel vivo, regravando a URL sozinho se ele cair. **Esse túnel
não é o endereço final** — serve para você jogar hoje do celular. Um detalhe: túneis gratuitos
não transportam WebSocket, então por ele o jogo usa automaticamente o transporte reserva
(HTTP long-poll). A partida sincroniza igual; só a sinalização da voz fica ~1 s mais lenta.
No endereço definitivo (Render), volta ao WebSocket.

---

## 5. Desempenho e qualidade (medidos)

| Métrica | Valor |
|---|---|
| Peso total da página | **264 KB** em 11 requisições |
| DOMContentLoaded | **65 ms** |
| Recursos externos (CDN, fontes) | **0** — funciona offline |
| Quadros por segundo na cena | **60 fps** |
| Heap JavaScript | **10 MB** |
| Pausa em segundo plano | sim — para de desenhar com a aba oculta |
| Limite adaptativo | cai para 30 qps em aparelhos que não sustentam 60 |
| Bibliotecas de front-end | **nenhuma** — canvas 2D, Web Audio e WebRTC puros |

---

## 6. Correções importantes feitas nesta fase

1. **Vazamento de informação (grave)**: o servidor mandava o estado completo — qualquer
   jogador podia descobrir o assassino abrindo o console. Agora cada um recebe uma visão
   filtrada (`killerId`, papéis alheios, votos e sussurros dos outros ficam fora até o fim).
2. **Assassino previsível**: era sempre o mesmo perfil do caso (o rótulo público entregava o
   culpado). Agora é um jogador sorteado a cada partida.
3. **Pontuação invertida**: objetivos secretos valiam pontos quando o assassino era o mais
   votado. Corrigido — e quem é pego nunca fecha a rodada no positivo.
4. **Voz muda entre dois jogadores** quando um liberava o microfone depois do outro.
   Corrigido com religação automática.
5. **Modo solo pulava a tela do papel secreto** e não permitia votar nos suspeitos do sistema.
6. **Botão de tela cheia** faltava dentro da partida.
7. **Reconexão**: queda de rede ou recarregar no meio da partida devolve o jogador à sala com
   o mesmo papel, pontuação e tempo restante.
8. **Setas de saída da cena não funcionavam** nos casos 2 e 3 (usavam um formato de dados
   diferente do caso 1). Agora os dois formatos são aceitos.
9. **Botão de local trancado não atualizava**: no CF-04, depois de abrir o cofre, a barra de
   locais continuava mostrando a sala do servidor como trancada.
10. **Economia de bateria**: o jogo agora pausa explicitamente com o app em segundo plano e
    cai para 30 qps em aparelhos que não sustentam 60.

---

## 7. Arquivos principais

```
server/server.js          salas FAM-XXXX, cronômetro, voto, /api/ice, sinalização de voz
public/shared/engine.js   regras puras (papéis, voto, pontuação, sussurros, objetivos)
public/shared/cases.js    DADOS DOS CASOS — adicionar caso novo mexe só aqui
public/js/net.js          transporte (WebSocket → HTTP long-poll → offline) e reconexão
public/js/voice.js        malha de voz WebRTC
public/js/game.js         cena, objetos investigáveis, câmera, economia de bateria
public/js/ui.js           painéis, evidências, suspeitos, votação, resultado
public/js/main.js         fluxo completo
tests/                    35 regras + 12 HTTP + 18 navegador + 13 robustez
render.yaml               Blueprint do Render (deploy permanente)
RENDER-PASSO-A-PASSO.md   passo a passo da hospedagem
COMO-ACESSAR.md           link, QR e instruções para o celular
```
