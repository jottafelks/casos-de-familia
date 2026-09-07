#!/bin/bash
# Watchdog de túnel público para o jogo (porta 3000).
# Provider 1: cloudflared (trycloudflare)  -> HTTPS estável E WebSocket (voz/chat em tempo real)
# Provider 2: tunnelmole                   -> HTTPS, sem WebSocket neste plano
# Provider 3: serveo (ssh)                 -> reserva, mostra "Continue to Site"
# Verifica /healthz a cada 20s; se falhar 2x seguidas (ou o processo do túnel tiver morrido),
# recria o túnel trocando de provedor e republica a URL em TUNNEL-URL.txt, ACESSO.md e no QR.
DIR=/home/user/escape-room
PORT=3000
CF=/home/user/.tun/bin/cloudflared
TMOLE=/home/user/.tun/node_modules/.bin/tmole
LOG=/tmp/tunel.log
URLFILE=$DIR/TUNNEL-URL.txt
HIST=$DIR/tunel-history.log

publica() {
  local U="$1" P="$2" NOTA="$3"
  echo "$U" > "$URLFILE"
  python3 /home/user/escape-room/publica-url.py "$U" "$P" "$NOTA"
}

para_tudo() {
  pkill -f "cloudflared tunnel" 2>/dev/null
  pkill -f "tmole $PORT" 2>/dev/null
  pkill -f "tunnelmole" 2>/dev/null
  pkill -f "ssh .*serveo.net" 2>/dev/null
  pkill -f "sleep 100000" 2>/dev/null
  sleep 2
}

ok_url() {   # $1 = url  -> 0 se /healthz responder 200
  local c; c=$(curl -s -o /dev/null -m 15 -w "%{http_code}" "$1/healthz")
  [ "$c" = "200" ]
}

inicia_cf() {
  if [ ! -x "$CF" ]; then return 1; fi
  para_tudo
  : > "$LOG"
  nohup "$CF" tunnel --url "http://127.0.0.1:$PORT" --no-autoupdate --protocol http2 >> "$LOG" 2>&1 &
  local U=""
  for i in $(seq 1 20); do
    sleep 3
    U=$(grep -aoE "https://[a-z0-9.-]+\.trycloudflare\.com" "$LOG" | head -1)
    if [ -n "$U" ] && ok_url "$U"; then
      publica "$U" "Cloudflare" "Abre direto, sem tela de aviso, e com WebSocket (voz e chat instantaneos)."
      echo "$(date -Is) OK    cf     $U" >> "$HIST"
      return 0
    fi
  done
  echo "$(date -Is) FALHA cf" >> "$HIST"
  return 1
}

inicia_tmole() {
  if [ ! -x "$TMOLE" ]; then return 1; fi
  para_tudo
  : > "$LOG"
  nohup "$TMOLE" $PORT >> "$LOG" 2>&1 &
  local U=""
  for i in $(seq 1 20); do
    sleep 3
    U=$(grep -aoE "https://[a-z0-9.-]+\.tunnelmole\.net" "$LOG" | head -1)
    if [ -n "$U" ] && ok_url "$U"; then
      publica "$U" "tunnelmole" "Abre direto, sem tela de aviso. (Sem WebSocket: o jogo usa o transporte reserva.)"
      echo "$(date -Is) OK    tmole  $U" >> "$HIST"
      return 0
    fi
  done
  echo "$(date -Is) FALHA tmole" >> "$HIST"
  return 1
}

inicia_serveo() {
  para_tudo
  : > "$LOG"
  nohup bash -c "sleep 100000 | ssh -tt -o StrictHostKeyChecking=no -o ServerAliveInterval=20 -o ServerAliveCountMax=3 -R 80:127.0.0.1:$PORT serveo.net" >> "$LOG" 2>&1 &
  local U=""
  for i in $(seq 1 20); do
    sleep 3
    U=$(grep -aoE "https://[a-z0-9.-]+serveousercontent\.com" "$LOG" | head -1)
    if [ -n "$U" ] && ok_url "$U"; then
      publica "$U" "serveo" "Na primeira visita aparece um aviso do Serveo - toque em Continue to Site."
      echo "$(date -Is) OK    serveo $U" >> "$HIST"
      return 0
    fi
  done
  echo "$(date -Is) FALHA serveo" >> "$HIST"
  return 1
}

vivo() {   # o processo do túnel está de pé?
  pgrep -f "cloudflared tunnel" >/dev/null 2>&1 && return 0
  pgrep -f "tmole $PORT" >/dev/null 2>&1 && return 0
  pgrep -f "ssh .*serveo" >/dev/null 2>&1 && return 0
  return 1
}

FALHAS=0
while true; do
  OK=0
  if [ -f "$URLFILE" ] && vivo; then
    U=$(cat "$URLFILE")
    ok_url "$U" && OK=1
  fi
  if [ "$OK" = "1" ]; then
    FALHAS=0
  else
    FALHAS=$((FALHAS+1))
    if [ "$FALHAS" -ge 2 ]; then
      echo "$(date -Is) reiniciando (${FALHAS} falhas)" >> "$HIST"
      inicia_cf || inicia_tmole || inicia_serveo
      FALHAS=0
    fi
  fi
  sleep 20
done
