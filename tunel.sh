#!/bin/bash
# Watchdog de túnel público para o jogo (porta 3000).
# Provider 1: localhost.run (SSH)          -> medido aqui: 12/12 OK + WebSocket em ~390 ms
# Provider 2: cloudflared (trycloudflare)  -> HTTPS, WebSocket, mas ~40% de falhas aqui
# Provider 3: tunnelmole                   -> HTTPS, sem WebSocket neste plano
# Provider 4: serveo (ssh)                 -> reserva, mostra "Continue to Site"
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

# Só considera o túnel bom se /healthz responder COM A IDENTIDADE DO JOGO.
# (um provedor pode devolver 200 na própria página e enganar a checagem)
ok_url() {
  local body
  body=$(curl -s -m 15 "$1/healthz")
  case "$body" in *'"game"'*"casos-de-familia"*) return 0 ;; esac
  sleep 5
  body=$(curl -s -m 15 "$1/healthz")
  case "$body" in *'"game"'*"casos-de-familia"*) return 0 ;; esac
  return 1
}

# Provider 1: localhost.run (SSH). Foi o mais estável a partir desta máquina:
# 12/12 requisições OK e WebSocket em ~390 ms.
inicia_lhr() {
  para_tudo
  : > "$LOG"
  nohup bash -c "sleep 100000 | ssh -tt -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ServerAliveInterval=20 -o ServerAliveCountMax=3 -R 80:127.0.0.1:$PORT nokey@localhost.run" >> "$LOG" 2>&1 &
  local U=""
  for i in $(seq 1 20); do
    sleep 3
    # o subdomínio do túnel tem 16 hex; ignoramos links tipo https://admin.localhost.run
    U=$(grep -aoE "https://[a-f0-9]{10,}\.lhr\.life|https://[a-z0-9-]{10,}\.localhost\.run" "$LOG" | head -1)
    if [ -n "$U" ] && ok_url "$U"; then
      publica "$U" "localhost.run" "Abre direto, sem tela de aviso, e com WebSocket (voz e chat instantaneos)."
      echo "$(date -Is) OK    lhr    $U" >> "$HIST"
      return 0
    fi
  done
  echo "$(date -Is) FALHA lhr" >> "$HIST"
  return 1
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
  pgrep -f "nokey@localhost" >/dev/null 2>&1 && return 0
  pgrep -f "cloudflared tunnel" >/dev/null 2>&1 && return 0
  pgrep -f "tmole $PORT" >/dev/null 2>&1 && return 0
  pgrep -f "ssh .*serveo" >/dev/null 2>&1 && return 0
  return 1
}

# Regra de ouro: NUNCA matar um túnel que está vivo só porque uma requisição falhou.
# O cloudflared se reconecta sozinho; se a gente o matar, o endereço muda à toa.
#   - processo morto        -> recria na hora
#   - processo vivo, sem 200 -> espera (6 checagens ~ 3 min) antes de recriar
FALHAS=0
while true; do
  OK=0
  U=$(cat "$URLFILE" 2>/dev/null)
  if vivo && [ -n "$U" ]; then
    ok_url "$U" && OK=1
  fi
  if [ "$OK" = "1" ]; then
    FALHAS=0
  else
    FALHAS=$((FALHAS+1))
    MORTO=1; vivo && MORTO=0
    if [ "$MORTO" = "1" ] || [ "$FALHAS" -ge 6 ]; then
      echo "$(date -Is) reiniciando (falhas=$FALHAS processo_morto=$MORTO url=$U)" >> "$HIST"
      inicia_lhr || inicia_cf || inicia_tmole || inicia_serveo
      FALHAS=0
    fi
  fi
  sleep 20
done
