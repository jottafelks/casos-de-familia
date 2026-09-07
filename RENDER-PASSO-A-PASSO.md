# CASOS DE FAMÍLIA — colocar o jogo no ar (URL permanente)

O jogo precisa de um servidor que segure as salas, o cronômetro e a sinalização de voz.
Túnel (tunnelmole/ngrok/localtunnel) **não serve como endereço final**: ele cai, muda de
endereço e não repassa WebSocket. O plano abaixo usa o **Render.com** (plano grátis),
que já está configurado neste projeto pelo arquivo `render.yaml`.

Tempo estimado: **10 minutos**, e só você pode fazer (precisa de conta).

---

## 1. Subir o código para um repositório

O Render puxa o jogo de um repositório Git. Escolha um:

* **GitHub** (recomendado): crie um repositório vazio e suba esta pasta:
  ```bash
  cd escape-room
  git init
  git add .
  git commit -m "CASOS DE FAMÍLIA"
  git branch -M main
  git remote add origin https://github.com/SEU-USUARIO/casos-de-familia.git
  git push -u origin main
  ```
* Ou use o **GitLab** / **Bitbucket** (o Render aceita os três).

> O `.gitignore` já impede o envio de `node_modules` e de um eventual `.env`.

## 2. Criar o serviço no Render

1. Acesse <https://dashboard.render.com> e entre (GitHub/Google/e-mail).
2. **New +** → **Blueprint** (ou "New" → "Blueprint").
3. Escolha o repositório `casos-de-familia` → **Apply**.
4. O Render lê o `render.yaml` e cria um **Web Service** chamado `casos-de-familia`
   (Node, plano free, `npm install --omit=dev`, `npm start`, health check em `/healthz`).
5. Aguarde o primeiro deploy (1–3 min). A URL aparece no topo:
   `https://casos-de-familia.onrender.com`

## 3. (Opcional) Deixar a URL sempre acordada

No plano grátis o serviço **dorme depois de ~15 minutos sem visitas** e acorda em ~30 s
no primeiro acesso — o jogo volta sozinho, mas a primeira tela demora um pouco.

Se quiser evitar isso: crie em <https://cron-job.org> (grátis) um ping a cada 10 minutos
para `https://SUA-URL.onrender.com/healthz`.

## 4. (Opcional) Voz em redes móveis difíceis

O jogo já vem com STUN público do Google: na maioria dos Wi-Fi e 4G a voz conecta
sem configurar nada. Se algum jogador ficar sem áudio, peça um servidor TURN gratuito
(<https://www.metered.ca/tools/openrelay/>) e preencha no painel do Render
(**Environment**):

| Variável    | Exemplo                        |
|-------------|--------------------------------|
| `TURN_URL`  | `turn:openrelay.metered.ca:80` |
| `TURN_USER` | `openrelayproject`             |
| `TURN_PASS` | `openrelayproject`             |

Essas credenciais ficam **no servidor** e são entregues ao navegador por `GET /api/ice`
para montar as conexões WebRTC — nunca ficam no código do front-end.
Depois de salvar, o Render reinicia sozinho.

## 5. Testar

1. Abra `https://SUA-URL.onrender.com/healthz` — deve responder
   `{"ok":true,...,"game":"casos-de-familia"}`.
2. Abra a URL no celular → **CRIAR SALA** → mande o código `FAM-XXXX` (ou o link) para os amigos.
3. O navegador vai perguntar pelo microfone na primeira partida — é o chat de voz.

---

## O que eu preciso que você me passe (se quiser que eu faça por você)

* **GitHub:** `GITHUB_USER` e um **Personal Access Token** com escopo `repo`
  (para eu criar o repositório e o push).
* **Render:** um **API Key** (Account Settings → API Keys).

Com esses dois eu mesmo crio o repositório, disparo o Blueprint e te devolvo a URL pronta.
Sem eles, o passo a passo acima resolve em ~10 minutos — e o projeto já está configurado.

---

## Rodando os testes

```bash
npm test          # 34 testes de regra + 12 de HTTP/long-poll (rápido)
npm run test:e2e  # 18 testes de navegador (3 jogadores reais, Playwright)
npm run test:all  # tudo
```
