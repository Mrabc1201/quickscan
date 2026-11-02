import os, json, shutil, re
D = "/home/claude/quickscan/docs"
DOMAIN = "https://mrabc1201.github.io/quickscan"
HERE = os.path.dirname(os.path.abspath(__file__))
shutil.copy("/opt/npm-tools/node_modules/jszip/dist/jszip.min.js", D + "/lib/jszip.min.js")
shutil.copy(HERE + "/qr.js", D + "/lib/qr.js")
shutil.copy(HERE + "/tools2.js", D + "/tools2.js")

def page(slug, title, desc, h1, sub, body, faq, scripts):
    faqld = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    faqhtml = "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in faq)
    more = open(D + "/index.html", encoding="utf-8").read()
    grid = re.search(r'<div class="grid">.*?</div>', more, re.S).group(0)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} | QuickFileTools</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{DOMAIN}/{slug}.html"><link rel="stylesheet" href="style.css">
<script type="application/ld+json">{faqld}</script><!-- AdSense script yahan <head> mein daalein --></head><body>
<header><a href="index.html">Quick<span>FileTools</span></a></header><main>
<h1>{h1}</h1><p class="sub">{sub}</p>
{body}
<!-- AdSense approve hone ke baad yahan apna ad code paste karein -->
<div class="ad"></div>
<h2>FAQ</h2>{faqhtml}
<h2>More free tools</h2>{grid}
</main><footer><a href="index.html">Home</a><a href="privacy.html">Privacy Policy</a><a href="about.html">About</a><a href="contact.html">Contact</a><br>&copy; QuickFileTools</footer>
{scripts}</body></html>"""

def drop(t, acc):
    return f'<div class="drop" id="drop"><b>{t}</b><br><span class="note">or drag and drop here</span><input type="file" id="file" accept="{acc}"></div><div id="info" class="note"></div>'
PRIV = '<div class="note">Private: your file stays on your device and is never uploaded.</div>'
PDF, IMGA = "application/pdf", "image/*"
GO = lambda t: f'<button id="go">{t}</button><div id="status" class="note" style="margin-top:10px"></div><div id="out"></div>'
SEL = 'style="width:100%;max-width:360px;margin-top:6px"'
pdf_scr = '<script src="lib/pdf-lib.min.js"></script><script src="lib/jszip.min.js"></script>'
def S(tool, extra=""):
    return f'<script>window.TOOL="{tool}"</script>{extra}<script type="module" src="tools2.js"></script>'

T = []  # slug, menu title, seo title, desc, h1, sub, body, faq, scripts
def add(slug, menu, seo, desc, h1, sub, body, faq, scripts): T.append((slug, menu, seo, desc, h1, sub, body, faq, scripts))

add("pdf-to-jpg", "PDF to JPG Converter", "PDF to JPG Converter Online Free - Convert PDF Pages to Images",
 "Convert PDF pages to JPG or PNG images free. Works on phone and computer, nothing is uploaded, no signup, no watermark.",
 "PDF to JPG Converter", "Turn every page of a PDF into a JPG or PNG image. Download one by one or all pages as a ZIP.",
 drop("Tap to choose your PDF", PDF) + f'''<div id="editor" style="display:none"><label>Quality <select id="scale" {SEL}><option value="1.5">Standard</option><option value="2" selected>High</option><option value="3">Very high (big files)</option></select></label>
<label style="display:block;margin-top:10px">Format <select id="fmt" {SEL}><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></label>
{GO("Convert to images")}</div>''' + PRIV,
 [("How do I convert a PDF to JPG?", "Choose your PDF, pick the quality and press Convert. Every page becomes an image you can download."),
  ("Is it free and private?", "Yes. It is free, has no watermark and runs in your browser, so your PDF is never uploaded."),
  ("Can I convert a many-page PDF?", "Yes. For more than one page you also get a single ZIP file with all the images."),
  ("Which quality should I choose?", "High is fine for most uses. Choose Very high only if you need to print, because the files get large.")],
 pdf_scr + S("pdf-to-jpg"))

add("pdf-to-text", "PDF to Text Converter (Copy Text from PDF)", "PDF to Text Converter - Copy Text from a PDF Free",
 "Extract text from a PDF and copy it or save it as a TXT file. Free, private, works in your browser on phone or computer.",
 "PDF to Text Converter", "Copy all the text out of a PDF. Works for PDFs made from Word, websites and most downloads.",
 drop("Tap to choose your PDF", PDF) + f'<div id="editor" style="display:none">{GO("Extract text")}</div>' + PRIV,
 [("How do I copy text from a PDF?", "Choose the PDF and press Extract text. The text appears in a box that you can copy, or download as a TXT file."),
  ("Why is no text found?", "Scanned PDFs and photos of pages contain pictures, not text, so there is nothing to extract. You need OCR software for those."),
  ("Is my file uploaded?", "No. Everything runs in your browser."),
  ("Does it keep formatting?", "No. You get plain text only, without fonts, tables or images.")],
 pdf_scr + S("pdf-to-text"))

add("rotate-pdf", "Rotate PDF Pages", "Rotate PDF Online Free - Rotate Pages 90, 180, 270 Degrees",
 "Rotate PDF pages 90, 180 or 270 degrees and save. Rotate all pages or only selected ones. Free, private, no signup.",
 "Rotate PDF Pages", "Fix sideways or upside-down pages. Rotate all pages or only the ones you choose, then download.",
 drop("Tap to choose your PDF", PDF) + f'''<div id="editor" style="display:none"><label>Rotate <select id="angle" {SEL}><option value="90">90 degrees right</option><option value="180">180 degrees (upside down)</option><option value="270">90 degrees left</option></select></label>
<label style="display:block;margin-top:10px">Pages (leave empty for all) <input id="pages" type="text" placeholder="for example 2,4-6" style="width:100%;max-width:360px;padding:10px;border:1px solid #c8d2e2;border-radius:8px;font-size:16px"></label>
{GO("Rotate and save")}</div>''' + PRIV,
 [("How do I rotate a PDF?", "Choose the PDF, pick how much to rotate and press Rotate and save. Download the new file."),
  ("Can I rotate only one page?", "Yes. Type the page number in the Pages box, for example 3, or a range like 2-5."),
  ("Is it free?", "Yes, free with no watermark and no signup."),
  ("Is my PDF uploaded?", "No. It stays on your device.")],
 pdf_scr + S("rotate-pdf"))

add("delete-pdf-pages", "Delete PDF Pages", "Delete Pages from PDF Online Free - Remove PDF Pages",
 "Remove unwanted pages from a PDF and download the new file. Free, private, works on phone and computer.",
 "Delete Pages from PDF", "Type the pages you want to remove, for example 2,4-6, and download the cleaned PDF.",
 drop("Tap to choose your PDF", PDF) + f'''<div id="editor" style="display:none"><label>Pages to delete <input id="pages" type="text" placeholder="for example 2,4-6" style="width:100%;max-width:360px;padding:10px;border:1px solid #c8d2e2;border-radius:8px;font-size:16px;display:block;margin-top:6px"></label>
{GO("Delete pages and save")}</div>''' + PRIV,
 [("How do I remove pages from a PDF?", "Choose your PDF, type the page numbers you want to delete and press the button. You get a new PDF without those pages."),
  ("Can I delete several pages?", "Yes. Separate numbers with commas and use a dash for ranges, like 1,3,5-8."),
  ("Is the original changed?", "No. Your original file stays as it is. You download a new file."),
  ("Is it private?", "Yes. Nothing is uploaded.")],
 pdf_scr + S("delete-pdf-pages"))

add("page-numbers-pdf", "Add Page Numbers to PDF", "Add Page Numbers to PDF Online Free",
 "Add page numbers to a PDF. Choose position, start number and style like Page 1 of 10. Free, private, no signup.",
 "Add Page Numbers to PDF", "Number the pages of any PDF. Choose where the numbers go and the style.",
 drop("Tap to choose your PDF", PDF) + f'''<div id="editor" style="display:none"><label>Position <select id="pos" {SEL}><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="top-center">Top center</option><option value="top-right">Top right</option><option value="top-left">Top left</option></select></label>
<label style="display:block;margin-top:10px">Style <select id="style" {SEL}><option value="n">1, 2, 3</option><option value="of">Page 1 of 10</option></select></label>
<label style="display:block;margin-top:10px">Start at <input id="start" type="number" value="1" min="0" style="width:100px;padding:10px;border:1px solid #c8d2e2;border-radius:8px;font-size:16px"></label>
{GO("Add numbers and save")}</div>''' + PRIV,
 [("How do I add page numbers to a PDF?", "Choose your PDF, pick the position and style and press the button. Download the numbered PDF."),
  ("Can I start from a number other than 1?", "Yes. Change the Start at box, for example to 5."),
  ("Does it work with scanned PDFs?", "Yes. The numbers are added on top of each page."),
  ("Is my file uploaded?", "No. It stays on your device.")],
 pdf_scr + S("page-numbers-pdf"))

add("watermark-pdf", "Add Watermark to PDF", "Add Watermark to PDF Online Free - Text Watermark",
 "Add a text watermark like CONFIDENTIAL or DRAFT to every page of a PDF. Choose colour and opacity. Free and private.",
 "Add Watermark to PDF", "Stamp text such as CONFIDENTIAL, DRAFT or your name diagonally across every page.",
 drop("Tap to choose your PDF", PDF) + f'''<div id="editor" style="display:none"><label>Watermark text <input id="wtext" type="text" value="CONFIDENTIAL" maxlength="40" style="width:100%;max-width:360px;padding:10px;border:1px solid #c8d2e2;border-radius:8px;font-size:16px;display:block;margin-top:6px"></label>
<label style="display:block;margin-top:10px">Colour <select id="wcol" {SEL}><option value="gray">Gray</option><option value="red">Red</option><option value="blue">Blue</option></select></label>
<label style="display:block;margin-top:10px">Strength <select id="opacity" {SEL}><option value="0.15">Light</option><option value="0.3" selected>Medium</option><option value="0.5">Strong</option></select></label>
{GO("Add watermark and save")}</div>''' + PRIV,
 [("How do I add a watermark to a PDF?", "Choose your PDF, type the watermark text, pick colour and strength and press the button."),
  ("Can I use my own text?", "Yes. Type any text, for example your name or COPY. Use plain English letters and numbers."),
  ("Is the watermark on every page?", "Yes. It is placed diagonally in the middle of each page."),
  ("Is it private?", "Yes. The file never leaves your device.")],
 pdf_scr + S("watermark-pdf"))

add("crop-image", "Crop Image Online", "Crop Image Online Free - Crop Photo to Square, 4:3, 16:9",
 "Crop a photo to square, 4:3, 3:4, 16:9 or any shape. Drag to position, zoom, download. Free, private, no signup.",
 "Crop Image Online", "Choose a shape, drag the photo to frame it, zoom if needed and download the cropped image.",
 drop("Tap to choose your image", IMGA) + f'''<div id="editor" style="display:none"><label>Shape <select id="ratio" {SEL}><option value="1">Square 1:1</option><option value="1.3333333">4:3 landscape</option><option value="0.75">3:4 portrait</option><option value="1.7777778">16:9 wide</option><option value="0.5625">9:16 tall (Stories)</option><option value="0">Original</option></select></label>
<div id="viewBox" style="margin-top:10px"><canvas id="view" width="300" height="300"></canvas></div>
<div class="note">Drag the photo to move it.</div>
<label style="display:block;max-width:360px">Zoom <input id="zoom" type="range" min="1" max="4" step="0.01" value="1"></label>
{GO("Download cropped image")}</div>''' + PRIV,
 [("How do I crop a photo?", "Choose your image, pick a shape, drag the photo to frame it and press Download cropped image."),
  ("Does cropping reduce quality?", "No. The crop is cut from your original pixels, so the quality stays the same."),
  ("Can I crop a profile picture?", "Yes. Choose Square 1:1, which is what most apps use for profile pictures."),
  ("Is my photo uploaded?", "No. Everything runs on your device.")],
 S("crop-image"))

add("rotate-flip-image", "Rotate and Flip Image", "Rotate Image Online Free - Rotate and Flip Photos",
 "Rotate a photo left or right or flip it horizontally or vertically. Free, private, runs in your browser.",
 "Rotate and Flip Image", "Fix a sideways photo or mirror it. Tap the buttons, then download.",
 drop("Tap to choose your image", IMGA) + f'''<div id="editor" style="display:none"><div class="bar"><button class="sec" data-op="l">Rotate left</button><button class="sec" data-op="r">Rotate right</button><button class="sec" data-op="h">Flip horizontal</button><button class="sec" data-op="v">Flip vertical</button></div>
<div id="viewBox" style="margin-top:10px"><canvas id="view" width="300" height="300"></canvas></div>{GO("Download image")}</div>''' + PRIV,
 [("How do I rotate a photo?", "Choose the photo and tap Rotate left or Rotate right until it looks right. Then press Download."),
  ("What is the difference between rotate and flip?", "Rotate turns the picture. Flip makes a mirror image, left to right or top to bottom."),
  ("Does it lower the quality?", "Quality stays almost the same. JPG photos are saved at high quality."),
  ("Is it free and private?", "Yes. Your photo is never uploaded.")],
 S("rotate-flip-image"))

add("bw-image", "Black and White Image Converter", "Convert Image to Black and White Online Free - Grayscale Photo",
 "Make a photo black and white or grayscale, or clean a document photo for printing. Free, private, no signup.",
 "Black and White Photo Converter", "Turn any photo into grayscale, pure black and white, or a high-contrast document look for printing.",
 drop("Tap to choose your image", IMGA) + f'''<div id="editor" style="display:none"><label>Style <select id="mode" {SEL}><option value="gray">Grayscale</option><option value="doc">Document (high contrast)</option><option value="bw">Pure black and white</option></select></label>
<label style="display:block;max-width:360px;margin-top:10px">Threshold (for pure black and white) <input id="th" type="range" min="40" max="220" value="128"></label>
<div id="viewBox" style="margin-top:10px"><canvas id="view" width="300" height="300"></canvas></div>{GO("Download image")}</div>''' + PRIV,
 [("How do I make a photo black and white?", "Choose the photo, pick Grayscale and download it."),
  ("What is the Document style for?", "It raises the contrast so a photo of a page looks cleaner and uses less ink when printed."),
  ("What does the threshold do?", "In pure black and white mode, brighter pixels become white and darker ones become black. Move the slider until it looks right."),
  ("Is my image uploaded?", "No. It runs in your browser.")],
 S("bw-image"))

add("signature-background-remover", "Signature Background Remover (Transparent PNG)", "Signature Background Remover - Make Signature Transparent PNG Free",
 "Turn a photo of your signature into a transparent PNG. Remove the white paper background, choose black or blue ink. Free and private.",
 "Signature Background Remover", "Sign on white paper, take a photo, and get a clean transparent PNG signature you can use anywhere.",
 drop("Tap to choose your signature photo", IMGA) + f'''<div id="editor" style="display:none"><label>Ink colour <select id="ink" {SEL}><option value="orig">Keep original</option><option value="black">Black</option><option value="blue" selected>Blue</option></select></label>
<label style="display:block;max-width:360px;margin-top:10px">Remove background (move until paper disappears) <input id="th" type="range" min="80" max="240" value="170"></label>
<div id="viewBox" style="margin-top:10px;background:repeating-conic-gradient(#e5e7eb 0 25%,#fff 0 50%) 50%/16px 16px;display:inline-block;border-radius:6px"><canvas id="view" width="300" height="300" style="display:block;max-width:100%"></canvas></div>
{GO("Download transparent PNG")}</div><div class="note">Tip: sign with a dark pen on plain white paper in bright light, and keep the photo straight.</div>''' + PRIV,
 [("How do I make my signature transparent?", "Sign on white paper, take a photo, choose it here, move the slider until the paper disappears and download the PNG."),
  ("Can I change the ink colour?", "Yes. Choose black or blue, or keep the original colour."),
  ("Where can I use the PNG?", "You can insert it into Word, Google Docs, Canva or any editor. It has no background, so it sits cleanly on the page."),
  ("Is my signature uploaded?", "No. It never leaves your device.")],
 S("signature-background-remover"))

add("qr-code-generator", "QR Code Generator (Free)", "QR Code Generator Free - Link, Text and WiFi QR Code, No Signup",
 "Create a free QR code for a link, text or WiFi password. Download as a PNG. No signup, no expiry, no watermark.",
 "Free QR Code Generator", "Make a QR code for a website link, text or your WiFi. It never expires and has no watermark.",
 f'''<label>What is it for? <select id="qtype" {SEL}><option value="text">Link or text</option><option value="wifi">WiFi network</option></select></label>
<div id="pText" style="margin-top:10px"><textarea id="qtext" placeholder="https://example.com" style="width:100%;height:90px;padding:10px;border:1px solid #c8d2e2;border-radius:8px;font-size:16px"></textarea></div>
<div id="pWifi" style="display:none;margin-top:10px"><input id="wssid" type="text" placeholder="WiFi name" style="width:100%;padding:10px;border:1px solid #c8d2e2;border-radius:8px;font-size:16px"><input id="wpass" type="text" placeholder="WiFi password" style="width:100%;padding:10px;border:1px solid #c8d2e2;border-radius:8px;font-size:16px;margin-top:8px">
<select id="wenc" {SEL}><option value="WPA">WPA / WPA2</option><option value="WEP">WEP</option><option value="nopass">No password</option></select></div>
<label style="display:block;margin-top:10px">Colour <select id="qfg" {SEL}><option value="#000000">Black</option><option value="#1a3fb0">Blue</option><option value="#0b6b3a">Green</option><option value="#8a1c1c">Dark red</option></select></label>
<div id="viewBox" style="margin-top:12px"><canvas id="view" width="300" height="300" style="display:none;max-width:100%;width:260px;height:auto;image-rendering:pixelated;border:1px solid #e3e8ef"></canvas></div>
{GO("Download QR code (PNG)")}''',
 [("How do I make a QR code for a link?", "Type or paste your link in the box. The QR code appears straight away. Press Download to save it as an image."),
  ("Does the QR code expire?", "No. The code contains your link or text itself, so it works forever and does not depend on this website."),
  ("Can I make a WiFi QR code?", "Yes. Choose WiFi network, enter the name and password and guests can join by scanning with their phone camera."),
  ("Is it free?", "Yes. There is no signup, no watermark and no limit.")],
 '<script src="lib/qr.js"></script>' + S("qr-code-generator"))

grid_links = "".join(f'<a href="{t[0]}.html">{t[1]}</a>' for t in T)
for t in T:
    slug, menu, seo, desc, h1, sub, body, faq, scripts = t
    open(f"{D}/{slug}.html", "w", encoding="utf-8").write(page(slug, seo, desc, h1, sub, body, faq, scripts))

for f in os.listdir(D):
    if not f.endswith(".html"): continue
    s = open(f"{D}/{f}", encoding="utf-8").read()
    changed = False
    for t in T:
        if f'href="{t[0]}.html"' not in s.split("<h2>More free tools</h2>")[-1] if 'class="grid"' in s else False:
            pass
    if 'class="grid"' in s:
        add_links = "".join(f'<a href="{t[0]}.html">{t[1]}</a>' for t in T if f'<a href="{t[0]}.html">' not in s)
        if add_links:
            marker = '<a href="compress-pdf.html">'
            i = s.find(marker)
            if i >= 0:
                j = s.find("</a>", i) + 4
                s = s[:j] + add_links + s[j:]
            else:
                s = s.replace('<div class="grid">', '<div class="grid">' + add_links, 1)
            open(f"{D}/{f}", "w", encoding="utf-8").write(s)

sm = open(D + "/sitemap.xml").read()
for t in T:
    u = f"{DOMAIN}/{t[0]}.html"
    if u not in sm: sm = sm.replace("</urlset>", f"<url><loc>{u}</loc></url></urlset>")
open(D + "/sitemap.xml", "w").write(sm)
print("generated", len(T))
