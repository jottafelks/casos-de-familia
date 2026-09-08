# CASOS DE FAMÍLIA — progresso da evolução

**Jogo publicado:** https://casos-de-familia.onrender.com
**Código:** https://github.com/jottafelks/casos-de-familia
**Status do deploy:** `live` — automático a cada push na `main` (Render, plano free, região Oregon)

Tudo abaixo foi **testado na versão publicada**, não só no computador local.

---

## O que já está no ar

### Etapa 1 — o mundo navegável (itens 3, 4, 5, 6, 27, 28)
- Mapa gerado automáticamente a partir de cada caso: cômodos ligados por portas, sem sobreposição.
- Meu personagem anda de verdade: **joystick** no canto inferior esquerdo (celular) e **WASD/setas** (computador).
- A câmera acompanha; a casa é maior que a tela e **não há troca de tela** ao mudar de cômodo.
- Colisão com paredes, passagem por portas, profundidade por ordenação vertical.
- **Os personagens voltaram a andar** (`characters.js` estava abandonado): cada NPC tem rotina,
  destino, cômodo, tarefa e humor; conversam entre si e examinam objetos. Nada sincronizado.
- **Inspeção por proximidade:** chegar perto mostra o botão 🔎; o exame abre num **balão flutuante**
  que fecha no X, no FECHAR, no ESC ou clicando fora (a janela antiga travava — o ✕ não tinha
  função nenhuma no código).
- Posição sincronizada entre jogadores a 10 Hz, num pacote leve que não reenvia o estado inteiro.

### Etapa 2 — assassinato, corpos e reunião (itens 9, 10, 11, 12, 22)
- Só o assassino ataca, e **só encostado na vítima**, no mesmo cômodo e com linha de visão
  (parede no meio impede). Escolher o alvo exige **dois toques**, para não matar sem querer.
- Testemunhas calculadas **no servidor**, com a mesma geometria do mapa: quem estava perto e
  enxergando é marcado como testemunha.
- O crime é **sigiloso**: só a vítima, o assassino e as testemunhas recebem o evento.
- O corpo fica no chão e **só é visto por quem chega perto** — os outros continuam sem saber.
- 🚨 **REPORTAR CORPO** e 🔔 **CONVOCAR REUNIÃO** (uma vez por jogador) abrem a reunião.
- **Reunião com todos à mesa:** nome, avatar, situação e voto de cada um; mostra quem encontrou,
  onde e quem estava no local; depoimentos por escrito; **voto irreversível com PULAR VOTO**.
- Empate ou maioria em “pular” não elimina ninguém. Expulsar o assassino encerra o caso com
  vitória dos investigadores; expulsar um inocente deixa o assassino mais perto de ganhar.
- Quem morre **vira fantasma**: vê quem o matou, continua andando pela casa, mas não fala,
  não vota e não denuncia.
- Intervalo entre ataques (40 s) e trégua no início da partida (25 s).

### Etapa 3 — falta de luz (itens 13, 14, 15)
- ⚡ O assassino corta a energia: aviso **⚠️ ENERGIA INTERROMPIDA**, visão reduzida e fim da luz
  dos cômodos. Intervalo de 45 s entre sabotagens.
- Todo caso tem um **quadro de energia** num cômodo sempre acessível.
- **Minijogo:** memorize a sequência das chaves e religue. A sequência é validada no servidor;
  errar trava o quadro por 5 s e sorteia outra.
- **Velas limitadas** (uma por jogador) acendem um círculo pequeno de luz — que também revela
  quem as carrega.

---

## Testes

| Suíte | O que cobre | Resultado |
|---|---|---|
| `tests/engine.test.mjs` | regras gerais do jogo | 35 ✓ |
| `tests/assassinato.mjs` | assassinato, testemunhas, corpos, reunião, fantasmas | 17 ✓ |
| `tests/luz.mjs` | sabotagem, quadro de energia, velas | 7 ✓ |
| `tests/morte.mjs` | **4 jogadores de verdade** no navegador: matar, denunciar, reunir, votar, apagar e religar a luz | 12 ✓ |
| `tests/mundo.mjs` | mapa, movimento, câmera, joystick, NPCs, balão de inspeção, portas, colisão | 14 ✓ |
| `tests/mundo-multi.mjs` | dois jogadores se vendo andar e investigando juntos | 4 ✓ |
| `tests/http.mjs` | servidor, salas, transporte HTTP e WebSocket | 12 ✓ |
| `tests/e2e.mjs` | fluxo completo do jogo (voto, chat, papo secreto, cronômetro, reconexão) | 18 ✓ |
| `tests/caso-novo.mjs` | o caso CF-04 do começo ao fim | 9 ✓ |
| `tests/todos-os-casos.mjs` | varredura dos 4 casos atuais | 4 ✓ |

Desempenho medido no celular (390×844): **60 quadros por segundo**, 10 MB de memória,
402 KB e 69 ms para carregar, **nenhum recurso externo**.

---

## Bugs encontrados e corrigidos nesta evolução

1. **O ✕ da janela de inspeção não fechava nada** — existia só no HTML, sem código. Agora fecha
   no X, no ESC e clicando fora.
2. **Eventos sigilosos vazavam**: a morte era entregue a todos. Criada entrega seletiva.
3. **O selo de intervalo cobria o botão ASSASSINAR** e o tornou impossível de apertar.
4. **O `pushState` não entregava o estado** quando não havia eventos: mortes e sabotagens
   não chegavam a quem não era testemunha.
5. **Mensagens novas eram descartadas** no cliente (`corpo avistado` nunca chegava).
6. **O papel do jogador vinha só como rótulo** no estado público: o assassino nunca via o próprio
   botão de matar. Passou a usar o campo secreto, que é pessoal.
7. **A sincronia de sala puxava o jogador de volta** quando o servidor ainda não tinha confirmado
   a mudança de cômodo — a casa “piscava” e teleportes falhavam.
8. **O quadro de energia caía em cômodo trancado** (o porão da mansão), ficando inalcançável.
9. **Os eventos do `net` são eventos DOM**: o conteúdo vem em `ev.detail` — a posição dos outros
   jogadores chegava vazia.

---

## O que falta (na ordem combinada)

- **Tarefas de investigação** (item 17), **caderno do investigador** com 🔴🟡🟢 (item 20),
  **funções especiais** (item 21), **câmeras** (item 18) e **álibis com registro de eventos** (item 19).
- **Outras sabotagens**: portas trancadas, comunicação cortada, pânico (item 16).
- **Condições de vitória variadas por caso** (item 23) e **sorteio que sempre tenha solução** (item 24).
- **30 casos realmente diferentes** (item 7) — profundidade média: 8–12 cômodos, 12–16 objetos,
  12–18 pistas em três níveis. Hoje há 4.
- **Áudio** (item 26): passos, portas, descoberta, assassinato, apagão, reunião, voto, vitória,
  derrota, trilha de suspense e controles separados de música/efeitos/microfone/voz da equipe.
- **Acabamento visual** (item 25) e **relatório final** (item 34).

## Como rodar no computador

```bash
git clone https://github.com/jottafelks/casos-de-familia.git
cd casos-de-familia && npm install
node server/server.js        # http://localhost:3000
```

Variáveis de ambiente: `PORT` (porta do servidor) e `TURN_URL` / `TURN_USER` / `TURN_PASS`
(só se a rede móvel exigir TURN para a voz). Nenhuma é obrigatória — e **nenhuma credencial
está no código**.
