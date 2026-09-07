#!/usr/bin/env python3
"""Republica a URL do túnel: TUNNEL-URL.txt, ACESSO.md e QR code.
Uso: python3 publica-url.py <url> <provedor> <nota>"""
import sys, datetime, re, os

U, P, NOTA = (sys.argv + ['', '', ''])[1:4]
agora = datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')

md = f"""# CASOS DE FAMILIA - link para abrir no celular

## {U}

Abra esse endereco no celular. {NOTA}

QR code: abra `preview/QR-ACESSO.png` e aponte a camera do celular.

Link ativo em: {agora} - via **{P}**

---

## Jogar em grupo

1. Um aparelho toca **CRIAR SALA** -> codigo `FAM-XXXX`
2. Os outros tocam **ENTRAR EM SALA** -> digitam o codigo (ou abrem o link compartilhado)
3. Todos marcam **PRONTO**; quem criou toca **INICIAR CASO**
4. Cada um le o briefing no seu ritmo (**CONTINUAR**) e recebe o papel secreto
5. Investiguem, conversem pelo microfone, usem **PAPO SECRETO** e votem antes de o tempo acabar

Sozinho: **JOGAR SOZINHO**. Em 2: o sistema entra com suspeitos e a partida dura 5 min.

---

## Casos

CF-01 Mansao - CF-02 Fazenda - CF-03 Hotel - CF-04 O Ultimo Balanco (empresa)

---

## Se o link cair

Se o link nao abrir: espere ~2 minutos e recarregue. O watchdog cuida do tunel sozinho e
regrava o endereco novo aqui (e no QR) quando precisa trocar. Enquanto a maquina de
desenvolvimento estiver ligada, o jogo volta no ar sem voce precisar fazer nada.

Para nao depender de tunel: `RENDER-PASSO-A-PASSO.md` (URL fixa e gratuita) ou rode na sua
maquina com `npm install && npm start`.
"""
open('/home/user/escape-room/ACESSO.md', 'w').write(md)

# mantém os outros documentos com o mesmo endereço
for arq in ['COMO-ACESSAR.md', 'RELATORIO.md']:
    p = '/home/user/escape-room/' + arq
    if os.path.exists(p):
        s = open(p).read()
        s2 = re.sub(r'https://[a-z0-9.-]+\.(lhr\.life|localhost\.run|trycloudflare\.com|tunnelmole\.net|serveousercontent\.com)', U, s)
        if s2 != s:
            open(p, 'w').write(s2)

try:
    import qrcode
    from PIL import Image, ImageDraw, ImageFont
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=3)
    qr.add_data(U); qr.make(fit=True)
    img = qr.make_image(fill_color="#0a0b0d", back_color="#e9e3d6").convert('RGB')
    W, H = img.size
    out = Image.new('RGB', (W, H + 110), "#e9e3d6"); out.paste(img, (0, 60))
    d = ImageDraw.Draw(out); f = ImageFont.load_default()
    t = "CASOS DE FAMILIA"
    b = d.textbbox((0, 0), t, font=f); d.text(((W - (b[2] - b[0])) / 2, 20), t, fill="#7a5a1e", font=f)
    b2 = d.textbbox((0, 0), U, font=f); d.text(((W - (b2[2] - b[0])) / 2, H + 68), U, fill="#3a2a12", font=f)
    out.save('/home/user/escape-room/preview/QR-ACESSO.png')
except Exception as e:
    print('qr nao gerado:', e)

print('URL publicada:', U, 'via', P)
