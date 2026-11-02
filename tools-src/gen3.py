import os, json, re
D = "/home/claude/quickscan/docs"; DOMAIN = "https://mrabc1201.github.io/quickscan"
LANGS = {"es": "Español", "pt": "Português", "id": "Bahasa Indonesia", "hi": "हिन्दी"}
SEL = 'style="width:100%;max-width:360px;margin-top:6px"'
INP = 'style="width:100%;padding:10px;border:1px solid #c8d2e2;border-radius:8px;font-size:16px"'

L = {
"es": dict(home="Inicio", priv="Política de privacidad", about="Acerca de", contact="Contacto", more="Más herramientas gratis", faq="Preguntas frecuentes",
  private="Privado: tu archivo se queda en tu dispositivo y nunca se sube.", drop="Toca para elegir tu PDF", drag="o arrástralo aquí"),
"pt": dict(home="Início", priv="Política de privacidade", about="Sobre", contact="Contato", more="Mais ferramentas grátis", faq="Perguntas frequentes",
  private="Privado: seu arquivo fica no seu dispositivo e nunca é enviado.", drop="Toque para escolher seu PDF", drag="ou arraste aqui"),
"id": dict(home="Beranda", priv="Kebijakan Privasi", about="Tentang", contact="Kontak", more="Alat gratis lainnya", faq="Pertanyaan umum",
  private="Privat: file Anda tetap di perangkat Anda dan tidak pernah diunggah.", drop="Ketuk untuk memilih PDF Anda", drag="atau seret ke sini"),
"hi": dict(home="होम", priv="गोपनीयता नीति", about="हमारे बारे में", contact="संपर्क", more="और मुफ़्त टूल", faq="अक्सर पूछे जाने वाले सवाल",
  private="निजी: आपकी फ़ाइल आपके डिवाइस पर ही रहती है, कभी अपलोड नहीं होती।", drop="अपनी PDF चुनने के लिए टैप करें", drag="या यहाँ खींचकर छोड़ें"),
}

QR = {
"es": dict(title="Generador de Códigos QR Gratis - Enlace, Texto y WiFi, Sin Registro", desc="Crea un código QR gratis para un enlace, texto o la contraseña del WiFi. Descárgalo como PNG. Sin registro, sin caducidad y sin marca de agua.",
  h1="Generador de Códigos QR Gratis", sub="Crea un código QR para un enlace web, un texto o tu WiFi. Nunca caduca y no tiene marca de agua.",
  what="¿Para qué es?", t_text="Enlace o texto", t_wifi="Red WiFi", ph="https://ejemplo.com", ssid="Nombre del WiFi", pw="Contraseña del WiFi", wpa="WPA / WPA2", nop="Sin contraseña",
  col="Color", c=["Negro","Azul","Verde","Rojo oscuro"], btn="Descargar código QR (PNG)",
  faq=[("¿Cómo hago un código QR para un enlace?","Escribe o pega tu enlace en el cuadro. El código QR aparece al instante. Pulsa Descargar para guardarlo como imagen."),
       ("¿El código QR caduca?","No. El código contiene tu enlace o texto, así que funciona siempre y no depende de esta página."),
       ("¿Puedo crear un QR para el WiFi?","Sí. Elige Red WiFi, escribe el nombre y la contraseña, y tus invitados podrán conectarse escaneando con la cámara del móvil."),
       ("¿Es gratis?","Sí. No necesitas registrarte, no tiene marca de agua ni límite de uso.")]),
"pt": dict(title="Gerador de QR Code Grátis - Link, Texto e WiFi, Sem Cadastro", desc="Crie um QR Code grátis para um link, texto ou senha do WiFi. Baixe em PNG. Sem cadastro, sem validade e sem marca d'água.",
  h1="Gerador de QR Code Grátis", sub="Crie um QR Code para um link, um texto ou o seu WiFi. Ele nunca expira e não tem marca d'água.",
  what="Para que é?", t_text="Link ou texto", t_wifi="Rede WiFi", ph="https://exemplo.com", ssid="Nome do WiFi", pw="Senha do WiFi", wpa="WPA / WPA2", nop="Sem senha",
  col="Cor", c=["Preto","Azul","Verde","Vermelho escuro"], btn="Baixar QR Code (PNG)",
  faq=[("Como fazer um QR Code para um link?","Digite ou cole o link na caixa. O QR Code aparece na hora. Clique em Baixar para salvar como imagem."),
       ("O QR Code expira?","Não. O código contém o seu link ou texto, então funciona para sempre e não depende deste site."),
       ("Posso fazer um QR Code do WiFi?","Sim. Escolha Rede WiFi, digite o nome e a senha, e seus convidados conectam escaneando com a câmera do celular."),
       ("É grátis?","Sim. Sem cadastro, sem marca d'água e sem limite.")]),
"id": dict(title="Pembuat Kode QR Gratis - Link, Teks, dan WiFi, Tanpa Daftar", desc="Buat kode QR gratis untuk link, teks, atau password WiFi. Unduh sebagai PNG. Tanpa daftar, tanpa kedaluwarsa, tanpa watermark.",
  h1="Pembuat Kode QR Gratis", sub="Buat kode QR untuk link website, teks, atau WiFi Anda. Tidak pernah kedaluwarsa dan tanpa watermark.",
  what="Untuk apa?", t_text="Link atau teks", t_wifi="Jaringan WiFi", ph="https://contoh.com", ssid="Nama WiFi", pw="Password WiFi", wpa="WPA / WPA2", nop="Tanpa password",
  col="Warna", c=["Hitam","Biru","Hijau","Merah tua"], btn="Unduh kode QR (PNG)",
  faq=[("Bagaimana cara membuat kode QR untuk link?","Ketik atau tempel link di kotak. Kode QR langsung muncul. Tekan Unduh untuk menyimpannya sebagai gambar."),
       ("Apakah kode QR kedaluwarsa?","Tidak. Kode berisi link atau teks Anda sendiri, jadi berfungsi selamanya dan tidak bergantung pada situs ini."),
       ("Bisakah membuat QR untuk WiFi?","Bisa. Pilih Jaringan WiFi, isi nama dan password, lalu tamu bisa terhubung dengan memindai memakai kamera ponsel."),
       ("Apakah gratis?","Ya. Tanpa daftar, tanpa watermark, tanpa batas.")]),
"hi": dict(title="मुफ़्त QR कोड जनरेटर - लिंक, टेक्स्ट और WiFi, बिना साइनअप", desc="लिंक, टेक्स्ट या WiFi पासवर्ड के लिए मुफ़्त QR कोड बनाएँ। PNG में डाउनलोड करें। साइनअप नहीं, एक्सपायरी नहीं, वॉटरमार्क नहीं।",
  h1="मुफ़्त QR कोड जनरेटर", sub="वेबसाइट लिंक, टेक्स्ट या अपने WiFi का QR कोड बनाएँ। यह कभी एक्सपायर नहीं होता और इस पर वॉटरमार्क नहीं है।",
  what="किसलिए चाहिए?", t_text="लिंक या टेक्स्ट", t_wifi="WiFi नेटवर्क", ph="https://example.com", ssid="WiFi का नाम", pw="WiFi पासवर्ड", wpa="WPA / WPA2", nop="बिना पासवर्ड",
  col="रंग", c=["काला","नीला","हरा","गहरा लाल"], btn="QR कोड डाउनलोड करें (PNG)",
  faq=[("लिंक का QR कोड कैसे बनाएँ?","बॉक्स में अपना लिंक लिखें या पेस्ट करें। QR कोड तुरंत दिख जाएगा। इमेज के रूप में सेव करने के लिए डाउनलोड दबाएँ।"),
       ("क्या QR कोड एक्सपायर होता है?","नहीं। कोड के अंदर आपका अपना लिंक या टेक्स्ट होता है, इसलिए यह हमेशा काम करता है और इस वेबसाइट पर निर्भर नहीं है।"),
       ("क्या WiFi का QR कोड बन सकता है?","हाँ। WiFi नेटवर्क चुनें, नाम और पासवर्ड भरें। मेहमान फ़ोन कैमरे से स्कैन करके जुड़ सकते हैं।"),
       ("क्या यह मुफ़्त है?","हाँ। साइनअप नहीं, वॉटरमार्क नहीं और कोई सीमा नहीं।")]),
}

JPG = {
"es": dict(title="Convertidor de PDF a JPG Online Gratis - PDF a Imágenes", desc="Convierte las páginas de un PDF a JPG o PNG gratis. Funciona en el móvil y el ordenador, no se sube nada, sin registro ni marca de agua.",
  h1="Convertidor de PDF a JPG", sub="Convierte cada página de un PDF en una imagen JPG o PNG. Descárgalas una por una o todas en un ZIP.",
  q="Calidad", q1="Estándar", q2="Alta", q3="Muy alta (archivos grandes)", f="Formato", btn="Convertir a imágenes",
  faq=[("¿Cómo convierto un PDF a JPG?","Elige tu PDF, selecciona la calidad y pulsa Convertir. Cada página se convierte en una imagen que puedes descargar."),
       ("¿Es gratis y privado?","Sí. Es gratis, sin marca de agua y funciona en tu navegador, así que tu PDF nunca se sube."),
       ("¿Puedo convertir un PDF de muchas páginas?","Sí. Si tiene más de una página, también recibes un único archivo ZIP con todas las imágenes."),
       ("¿Qué calidad debo elegir?","Alta es suficiente para casi todo. Elige Muy alta solo para imprimir, porque los archivos son grandes.")]),
"pt": dict(title="Conversor de PDF para JPG Online Grátis - PDF em Imagens", desc="Converta páginas de PDF em JPG ou PNG grátis. Funciona no celular e no computador, nada é enviado, sem cadastro nem marca d'água.",
  h1="Conversor de PDF para JPG", sub="Transforme cada página de um PDF em imagem JPG ou PNG. Baixe uma a uma ou todas em um ZIP.",
  q="Qualidade", q1="Padrão", q2="Alta", q3="Muito alta (arquivos grandes)", f="Formato", btn="Converter em imagens",
  faq=[("Como converter PDF para JPG?","Escolha seu PDF, selecione a qualidade e clique em Converter. Cada página vira uma imagem para baixar."),
       ("É grátis e privado?","Sim. É grátis, sem marca d'água e roda no seu navegador, então seu PDF nunca é enviado."),
       ("Posso converter um PDF com muitas páginas?","Sim. Com mais de uma página, você também recebe um único ZIP com todas as imagens."),
       ("Qual qualidade escolher?","Alta serve para quase tudo. Escolha Muito alta só para imprimir, pois os arquivos ficam grandes.")]),
"id": dict(title="Konverter PDF ke JPG Online Gratis - PDF ke Gambar", desc="Ubah halaman PDF menjadi JPG atau PNG gratis. Bisa di HP dan komputer, tidak ada yang diunggah, tanpa daftar dan tanpa watermark.",
  h1="Konverter PDF ke JPG", sub="Ubah setiap halaman PDF menjadi gambar JPG atau PNG. Unduh satu per satu atau semuanya dalam ZIP.",
  q="Kualitas", q1="Standar", q2="Tinggi", q3="Sangat tinggi (file besar)", f="Format", btn="Ubah ke gambar",
  faq=[("Bagaimana cara mengubah PDF ke JPG?","Pilih PDF Anda, tentukan kualitas, lalu tekan Ubah. Setiap halaman menjadi gambar yang bisa diunduh."),
       ("Apakah gratis dan privat?","Ya. Gratis, tanpa watermark, dan berjalan di browser Anda, jadi PDF tidak pernah diunggah."),
       ("Bisakah PDF banyak halaman?","Bisa. Jika lebih dari satu halaman, Anda juga mendapat satu file ZIP berisi semua gambar."),
       ("Kualitas mana yang dipilih?","Tinggi sudah cukup untuk hampir semua kebutuhan. Pilih Sangat tinggi hanya untuk dicetak karena file menjadi besar.")]),
"hi": dict(title="PDF से JPG कन्वर्टर ऑनलाइन मुफ़्त - PDF को इमेज में बदलें", desc="PDF के पेज मुफ़्त में JPG या PNG में बदलें। फ़ोन और कंप्यूटर पर चलता है, कुछ अपलोड नहीं होता, साइनअप और वॉटरमार्क नहीं।",
  h1="PDF से JPG कन्वर्टर", sub="PDF के हर पेज को JPG या PNG इमेज में बदलें। एक-एक करके डाउनलोड करें या सब एक ZIP में।",
  q="क्वालिटी", q1="सामान्य", q2="ऊँची", q3="बहुत ऊँची (बड़ी फ़ाइलें)", f="फ़ॉर्मैट", btn="इमेज में बदलें",
  faq=[("PDF को JPG में कैसे बदलें?","अपनी PDF चुनें, क्वालिटी चुनें और बदलें दबाएँ। हर पेज एक इमेज बन जाएगा जिसे आप डाउनलोड कर सकते हैं।"),
       ("क्या यह मुफ़्त और निजी है?","हाँ। यह मुफ़्त है, वॉटरमार्क नहीं है और आपके ब्राउज़र में चलता है, इसलिए आपकी PDF कभी अपलोड नहीं होती।"),
       ("क्या कई पेज वाली PDF बदल सकते हैं?","हाँ। एक से ज़्यादा पेज हों तो सारी इमेज की एक ZIP फ़ाइल भी मिलती है।"),
       ("कौन-सी क्वालिटी चुनें?","ज़्यादातर काम के लिए ऊँची काफ़ी है। बहुत ऊँची सिर्फ़ प्रिंट के लिए चुनें, क्योंकि फ़ाइलें बड़ी हो जाती हैं।")]),
}

def head(lang, slug, title, desc, alts, faq):
    faqld = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}, ensure_ascii=False)
    hl = "".join(f'<link rel="alternate" hreflang="{l}" href="{DOMAIN}/{u}">' for l, u in alts)
    return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} | QuickFileTools</title><meta name="description" content="{desc}">
<link rel="canonical" href="{DOMAIN}/{lang}/{slug}.html">{hl}<link rel="stylesheet" href="../style.css">
<script type="application/ld+json">{faqld}</script></head><body>'''

def tail(lang, slug, h1, sub, body, faq, scripts, lg, others):
    faqhtml = "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in faq)
    ol = " ".join(f'<a href="../{u}">{n}</a>' for n, u in others)
    return f'''<header><a href="../index.html">Quick<span>FileTools</span></a></header><main>
<h1>{h1}</h1><p class="sub">{sub}</p>{body}<div class="ad"></div>
<h2>{lg["faq"]}</h2>{faqhtml}
<h2>{lg["more"]}</h2><div class="grid">{"".join(f'<a href="../{u}">{n}</a>' for n,u in others)}</div>
</main><footer><a href="../index.html">{lg["home"]}</a><a href="../privacy.html">{lg["priv"]}</a><a href="../about.html">{lg["about"]}</a><a href="../contact.html">{lg["contact"]}</a><br>&copy; QuickFileTools</footer>{scripts}</body></html>'''

pages = {}  # (lang, slug) -> path
TOOLS = ["qr-code-generator", "pdf-to-jpg"]
EN_TITLE = {"qr-code-generator": "QR Code Generator", "pdf-to-jpg": "PDF to JPG Converter"}
def alts_for(slug, lang_first=None):
    a = [("en", f"{slug}.html"), ("x-default", f"{slug}.html")] + [(l, f"{l}/{slug}.html") for l in LANGS]
    return a

os.makedirs(D, exist_ok=True)
for lang in LANGS:
    os.makedirs(f"{D}/{lang}", exist_ok=True)
    lg = L[lang]
    others_all = lambda cur: [(QR[lang]["h1"] if s == "qr-code-generator" else JPG[lang]["h1"], f"{lang}/{s}.html") for s in TOOLS if s != cur] + [("English", "index.html")]
    q = QR[lang]
    body = f'''<label>{q["what"]} <select id="qtype" {SEL}><option value="text">{q["t_text"]}</option><option value="wifi">{q["t_wifi"]}</option></select></label>
<div id="pText" style="margin-top:10px"><textarea id="qtext" placeholder="{q["ph"]}" style="width:100%;height:90px;padding:10px;border:1px solid #c8d2e2;border-radius:8px;font-size:16px"></textarea></div>
<div id="pWifi" style="display:none;margin-top:10px"><input id="wssid" type="text" placeholder="{q["ssid"]}" {INP}><input id="wpass" type="text" placeholder="{q["pw"]}" {INP.replace('font-size:16px','font-size:16px;margin-top:8px')}>
<select id="wenc" {SEL}><option value="WPA">{q["wpa"]}</option><option value="WEP">WEP</option><option value="nopass">{q["nop"]}</option></select></div>
<label style="display:block;margin-top:10px">{q["col"]} <select id="qfg" {SEL}><option value="#000000">{q["c"][0]}</option><option value="#1a3fb0">{q["c"][1]}</option><option value="#0b6b3a">{q["c"][2]}</option><option value="#8a1c1c">{q["c"][3]}</option></select></label>
<div id="viewBox" style="margin-top:12px"><canvas id="view" width="300" height="300" style="display:none;max-width:100%;width:260px;height:auto;image-rendering:pixelated;border:1px solid #e3e8ef"></canvas></div>
<button id="go">{q["btn"]}</button><div id="status" class="note" style="margin-top:10px"></div><div id="out"></div>'''
    sc = '<script src="../lib/qr.js"></script><script>window.TOOL="qr-code-generator"</script><script type="module" src="../tools2.js"></script>'
    html = head(lang, "qr-code-generator", q["title"], q["desc"], alts_for("qr-code-generator"), q["faq"]) + tail(lang, "qr-code-generator", q["h1"], q["sub"], body, q["faq"], sc, lg, others_all("qr-code-generator"))
    open(f"{D}/{lang}/qr-code-generator.html", "w", encoding="utf-8").write(html)
    j = JPG[lang]
    body = f'''<div class="drop" id="drop"><b>{lg["drop"]}</b><br><span class="note">{lg["drag"]}</span><input type="file" id="file" accept="application/pdf"></div><div id="info" class="note"></div>
<div id="editor" style="display:none"><label>{j["q"]} <select id="scale" {SEL}><option value="1.5">{j["q1"]}</option><option value="2" selected>{j["q2"]}</option><option value="3">{j["q3"]}</option></select></label>
<label style="display:block;margin-top:10px">{j["f"]} <select id="fmt" {SEL}><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></label>
<button id="go">{j["btn"]}</button><div id="status" class="note" style="margin-top:10px"></div><div id="out"></div></div><div class="note">{lg["private"]}</div>'''
    sc = '<script src="../lib/pdf-lib.min.js"></script><script src="../lib/jszip.min.js"></script><script>window.TOOL="pdf-to-jpg"</script><script type="module" src="../tools2.js"></script>'
    html = head(lang, "pdf-to-jpg", j["title"], j["desc"], alts_for("pdf-to-jpg"), j["faq"]) + tail(lang, "pdf-to-jpg", j["h1"], j["sub"], body, j["faq"], sc, lg, others_all("pdf-to-jpg"))
    open(f"{D}/{lang}/pdf-to-jpg.html", "w", encoding="utf-8").write(html)

# hreflang on English pages (idempotent)
for slug in TOOLS:
    p = f"{D}/{slug}.html"; s = open(p, encoding="utf-8").read()
    if "hreflang" not in s:
        hl = "".join(f'<link rel="alternate" hreflang="{l}" href="{DOMAIN}/{u}">' for l, u in alts_for(slug))
        s = s.replace('<link rel="stylesheet" href="style.css">', hl + '<link rel="stylesheet" href="style.css">', 1)
        open(p, "w", encoding="utf-8").write(s)
# language links on home page (idempotent)
p = f"{D}/index.html"; s = open(p, encoding="utf-8").read()
if "Other languages" not in s:
    links = " ".join(f'<a href="{l}/{sl}.html">{LANGS[l]}</a>' for l in LANGS for sl in TOOLS[:1])
    block = '<h2>Other languages</h2><p class="note">QR Code Generator: ' + links + '<br>PDF to JPG: ' + " ".join(f'<a href="{l}/pdf-to-jpg.html">{LANGS[l]}</a>' for l in LANGS) + '</p>'
    s = s.replace("</main>", block + "</main>", 1); open(p, "w", encoding="utf-8").write(s)
sm = open(f"{D}/sitemap.xml").read()
for l in LANGS:
    for sl in TOOLS:
        u = f"{DOMAIN}/{l}/{sl}.html"
        if u not in sm: sm = sm.replace("</urlset>", f"<url><loc>{u}</loc></url></urlset>")
open(f"{D}/sitemap.xml", "w").write(sm)
print("ok")
