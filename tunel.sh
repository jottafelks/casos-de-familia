#!/bin/bash
# Watchdog de túnel público para o jogo (porta 3000).
# Provider 1: tunnelmole  -> HTTPS direto, sem tela de aviso (preferido)
# Provider 2: serveo      -> reserva (mostra "Continue to Site" na 1a visita)
# Verifica /healthz a cada 20s; se falhar 2x seguidas, recria o túnel trocando
# de provider e republica URL em TUNNEL-URL.txt, ACESSO.md e no QR.
DIR=/home/user/escape-room
PORT=3000
TMOLE=/home/user/.tun/node_modules/.bin/tmole
LOG=/tmp/tunel.log
URLFILE=$DIR/TUNNEL-URL.txt
HIST=$DIR/tunel-history.log
PROVFILE=/tmp/tunel.prov

publica() {
  local U="$1" P="$2" NOTA="$3"
  echo "$U" > "$URLFILE"
  cat > "$DIR/ACESSO.md" <<MD
# 🎮 CASO 47 — link para abrir no celular

## 👉 $U

Abra esse endereço no celular. $NOTA

📱 **QR code:** abra \`preview/QR-ACESSO.png\` e aponte a câmera do celular.

Link ativo em: $(date '+%d/%m/%Y %H:%M:%S') — via **$P**

---

## Jogar em grupo

1. Um aparelho toca **CRIAR SALA** → código de 5 letras
2. Os outros tocam **ENTRAR COM CÓDIGO** → digitam o código
3. Quem criou toca **COMEÇAR INVESTIGAÇÃO**

Sozinho: **JOGAR SOZINHO**, ou abra 2 abas do navegador (uma cria, outra entra).

---

## Se o link cair

Abra este arquivo de novo — o watchdog recria o túnel sozinho e regrava a URL
aqui em ~1 minuto (o QR é regerado junto).

Para não depender de túnel, rode na sua máquina:
\`\`\`bash
cd escape-room && npm install && npm start
# celulares na mesma rede Wi-Fi usam o IP que aparece no terminal
\`\`\`
Ou publique de graça com URL fixa (Render/Railway) — \`render.yaml\` e \`Dockerfile\` prontos.
MD
  python3 - "$U" <<'PY'
import sys, qrcode
from PIL import Image, ImageDraw, ImageFont
url = sys.argv[1]
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=3)
qr.add_data(url); qr.make(fit=True)
img = qr.make_image(fill_color="#0a0b0d", back_color="#e9e3d6").convert('RGB')
W, H = img.size
out = Image.new('RGB', (W, H + 110), "#e9e3d6")
out.paste(img, (0, 60))
d = ImageDraw.Draw(out); f = ImageFont.load_default()
t = "CASO 47 - A NOITE DE HELENA"
b = d.textbbox((0, 0), t, font=f); d.text(((W - (b[2]-b[0])) / 2, 20), t, fill="#7a5a1e", font=f)
b2 = d.textbbox((0, 0), url, font=f); d.text(((W - (b2[2]-b2[0])) / 2, H + 68), url, fill="#3a2a12", font=f)
out.save('/home/user/escape-room/preview/QR-ACESSO.png')
PY
}

para_tudo() {
  pkill -f "tmole $PORT" 2>/dev/null
  pkill -f "tunnelmole" 2>/dev/null
  pkill -f "ssh .*serveo.net" 2>/dev/null
  pkill -f "sleep 100000" 2>/dev/null
  sleep 2
}

inicia_tmole() {
  para_tudo
  : > "$LOG"
  nohup "$TMOLE" $PORT >> "$LOG" 2>&1 &
  local U=""
  for i in $(seq 1 20); do
    sleep 3
    U=$(grep -aoE "https://[a-z0-9.-]+\.tunnelmole\.net" "$LOG" | head -1)
    if [ -n "$U" ]; then
      local code
      code=$(curl -s -o /dev/null -m 15 -w "%{http_code}" "$U/healthz")
      if [ "$code" = "200" ]; then
        publica "$U" "tunnelmole" "Abre direto, sem tela de aviso."
        echo "$(date -Is) OK    tmole   $U" >> "$HIST"
        echo tmole > "$PROVFILE"
        return 0
      fi
    fi
  done
  echo "$(date -Is) FALHA tmole" >> "$HIST"
  return 1
}

inicia_serveo() {
  para_tudo
  : > "$LOG"
  nohup bash -c 'sleep 100000 | ssh -tt -o StrictHostKeyChecking=no -o ServerAliveInterval=20 -o ServerAliveCountMax=3 -R 80:127.0.0.1:3000 serveo.net' >> "$LOG" 2>&1 &
  local U=""
  for i in $(seq 1 20); do
    sleep 3
    U=$(grep -aoE "https://[a-z0-9.-]+serveousercontent\.com" "$LOG" | head -1)
    if [ -n "$U" ]; then
      local code
      code=$(curl -s -o /dev/null -m 15 -w "%{http_code}" "$U/healthz")
      if [ "$code" = "200" ]; then
        publica "$U" "serveo" "Na primeira visita aparece um aviso do Serveo — toque em **Continue to Site**."
        echo "$(date -Is) OK    serveo  $U" >> "$HIST"
        echo serveo > "$PROVFILE"
        return 0
      fi
    fi
  done
  echo "$(date -Is) FALHA serveo" >> "$HIST"
  return 1
}

PROX=tmole
FALHAS=0
while true; do
  OK=0
  if [ -f "$URLFILE" ]; then
    U=$(cat "$URLFILE")
    code=$(curl -s -o /dev/null -m 15 -w "%{http_code}" "$U/healthz")
    [ "$code" = "200" ] && OK=1
  fi
  if [ "$OK" = "1" ]; then
    FALHAS=0
  else
    FALHAS=$((FALHAS+1))
    if [ "$FALHAS" -ge 2 ]; then
      echo "$(date -Is) reiniciando (${FALHAS} falhas)" >> "$HIST"
      if [ "$PROX" = "tmole" ]; then
        inicia_tmole || { PROX=serveo; inicia_serveo; }
        PROX=serveo
      else
        inicia_serveo || { PROX=tmole; inicia_tmole; }
        PROX=tmole
      fi
      FALHAS=0
      sleep 25
    fi
  fi
  sleep 20
done
