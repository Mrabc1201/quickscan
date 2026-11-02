const $ = s => document.querySelector(s);
const fmt = b => b > 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB';
const TOOL = window.TOOL;
let file = null, bytes = null, pdfjs = null;
const out = $('#out');
function add(name, blob, label) {
  const u = URL.createObjectURL(blob), d = document.createElement('div'); d.className = 'res';
  d.innerHTML = '<span>' + name + ' - ' + fmt(blob.size) + '</span><a download="' + name + '" href="' + u + '">' + (label || 'Download') + '</a>';
  out.appendChild(d);
}
const say = t => { const e = $('#status'); if (e) e.textContent = t || ''; };
async function loadPdfjs() { if (!pdfjs) { pdfjs = await import('./lib/pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = new URL('./lib/pdf.worker.min.mjs', import.meta.url).href; } return pdfjs; }
function parseRange(s, n) {
  const set = new Set();
  for (const part of s.split(',').map(x => x.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/); if (!m) throw new Error('Could not understand "' + part + '". Use numbers like 1,3,5-7');
    let a = +m[1], b = m[2] ? +m[2] : a; if (a > b) [a, b] = [b, a];
    for (let i = a; i <= b; i++) if (i >= 1 && i <= n) set.add(i);
  }
  return [...set].sort((a, b) => a - b);
}
const base = () => (file ? file.name.replace(/\.[^.]+$/, '') : 'file');
const drop = $('#drop'), inp = $('#file');
function blobOf(c, type, q) { return new Promise(r => c.toBlob(r, type, q)); }

async function pdfOpen(f) {
  bytes = new Uint8Array(await f.arrayBuffer());
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 1024));
  if (!bytes.length) throw new Error('this file is empty. Please download it again');
  if (head.indexOf('%PDF') < 0) throw new Error('this is not a PDF file');
  const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false });
  return doc;
}
async function savePdf(doc, suffix) { const b = new Blob([await doc.save()], { type: 'application/pdf' }); add(base() + suffix + '.pdf', b); }

/* ---------- tool implementations ---------- */
const PDF_TOOLS = {
  async 'rotate-pdf'(doc) {
    const n = doc.getPageCount(), ang = +$('#angle').value, rs = $('#pages').value.trim();
    const sel = rs ? parseRange(rs, n) : Array.from({ length: n }, (_, i) => i + 1);
    if (!sel.length) throw new Error('No valid pages selected');
    sel.forEach(p => { const pg = doc.getPage(p - 1); pg.setRotation(PDFLib.degrees((pg.getRotation().angle + ang) % 360)); });
    await savePdf(doc, '-rotated');
  },
  async 'delete-pdf-pages'(doc) {
    const n = doc.getPageCount(), del = parseRange($('#pages').value, n);
    if (!del.length) throw new Error('Type the page numbers to delete, for example 2,4-6');
    if (del.length >= n) throw new Error('You cannot delete all pages');
    del.reverse().forEach(p => doc.removePage(p - 1));
    await savePdf(doc, '-edited');
  },
  async 'page-numbers-pdf'(doc) {
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica), n = doc.getPageCount();
    const pos = $('#pos').value, start = parseInt($('#start').value || '1', 10), style = $('#style').value;
    doc.getPages().forEach((pg, i) => {
      const num = start + i, txt = style === 'of' ? 'Page ' + num + ' of ' + (start + n - 1) : String(num);
      const { width, height } = pg.getSize(), size = 11, w = font.widthOfTextAtSize(txt, size);
      const x = pos.endsWith('left') ? 36 : pos.endsWith('right') ? width - 36 - w : (width - w) / 2;
      const y = pos.startsWith('top') ? height - 36 : 28;
      pg.drawText(txt, { x, y, size, font, color: PDFLib.rgb(0.2, 0.2, 0.2) });
    });
    await savePdf(doc, '-numbered');
  },
  async 'watermark-pdf'(doc) {
    const text = $('#wtext').value.trim(); if (!text) throw new Error('Type the watermark text');
    const font = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold), op = +$('#opacity').value;
    const col = { gray: [0.5, 0.5, 0.5], red: [0.8, 0.1, 0.1], blue: [0.1, 0.25, 0.75] }[$('#wcol').value];
    doc.getPages().forEach(pg => {
      const { width, height } = pg.getSize(); let size = 80, w = font.widthOfTextAtSize(text, size);
      const maxw = Math.hypot(width, height) * 0.7; if (w > maxw) { size = size * maxw / w; w = maxw; }
      const a = Math.atan2(height, width), cx = width / 2, cy = height / 2;
      pg.drawText(text, { x: cx - (w / 2) * Math.cos(a) + (size * 0.3) * Math.sin(a), y: cy - (w / 2) * Math.sin(a) - (size * 0.3) * Math.cos(a), size, font, color: PDFLib.rgb(...col), opacity: op, rotate: PDFLib.radians(a) });
    });
    await savePdf(doc, '-watermarked');
  }
};

async function pdfToImages() {
  const lib = await loadPdfjs(), pdf = await lib.getDocument({ data: bytes.slice() }).promise, scale = +$('#scale').value, type = $('#fmt').value;
  const ext = type === 'image/png' ? 'png' : 'jpg', files = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    say('Converting page ' + n + ' of ' + pdf.numPages + ' ...');
    const pg = await pdf.getPage(n), v = pg.getViewport({ scale }), c = document.createElement('canvas');
    c.width = Math.floor(v.width); c.height = Math.floor(v.height);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvas: c, canvasContext: x, viewport: v }).promise;
    const b = await blobOf(c, type, 0.92); files.push([base() + '-page-' + n + '.' + ext, b]);
    if (pdf.numPages <= 12) add(files[files.length - 1][0], b);
  }
  if (pdf.numPages > 1) {
    const z = new JSZip(); files.forEach(([n, b]) => z.file(n, b));
    add(base() + '-images.zip', await z.generateAsync({ type: 'blob' }), 'Download all (ZIP)');
  }
  say('Done: ' + pdf.numPages + ' page' + (pdf.numPages > 1 ? 's' : '') + ' converted.');
}
async function pdfToText() {
  const lib = await loadPdfjs(), pdf = await lib.getDocument({ data: bytes.slice() }).promise; let all = '';
  for (let n = 1; n <= pdf.numPages; n++) {
    say('Reading page ' + n + ' of ' + pdf.numPages + ' ...');
    const tc = await (await pdf.getPage(n)).getTextContent(); let t = '';
    for (const it of tc.items) { t += it.str + (it.hasEOL ? '\n' : ' '); }
    all += t.trim() + '\n\n';
  }
  all = all.trim();
  if (!all) { say('No text found. This PDF is probably a scan (pictures of pages), so there is no text to copy.'); return; }
  const ta = document.createElement('textarea'); ta.value = all; ta.style.cssText = 'width:100%;height:240px;margin-top:10px;padding:10px;border:1px solid #c8d2e2;border-radius:8px;font-size:14px';
  out.appendChild(ta); add(base() + '.txt', new Blob([all], { type: 'text/plain' }));
  const cp = document.createElement('button'); cp.textContent = 'Copy text'; cp.className = 'sec'; cp.onclick = async () => { try { await navigator.clipboard.writeText(all); cp.textContent = 'Copied'; } catch (e) { ta.select(); } };
  out.appendChild(cp); say('Done: ' + all.length + ' characters from ' + pdf.numPages + ' page(s).');
}

/* ---------- image tools ---------- */
let img = null;
function loadImg(f) { return new Promise((res, rej) => { const u = URL.createObjectURL(f), i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not open this image. Use JPG, PNG or WEBP.')); i.src = u; }); }
const outType = () => (file && /png/i.test(file.type) ? 'image/png' : 'image/jpeg');
const extOf = t => t === 'image/png' ? 'png' : 'jpg';

// crop
let cz = 1, cx = 0, cy = 0, ratio = 0;
function cropGeom() {
  const v = $('#view'), vw = v.width, vh = v.height;
  const cover = Math.max(vw / img.naturalWidth, vh / img.naturalHeight), s = cover * cz;
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  cx = Math.min(0, Math.max(vw - dw, cx)); cy = Math.min(0, Math.max(vh - dh, cy));
  return { s, dw, dh, vw, vh };
}
function cropDraw() {
  const v = $('#view'), g = cropGeom(), x = v.getContext('2d');
  x.fillStyle = '#ddd'; x.fillRect(0, 0, g.vw, g.vh); x.drawImage(img, cx, cy, g.dw, g.dh);
}
function cropSetRatio(r) {
  ratio = r; const v = $('#view'), maxw = Math.min(340, $('#viewBox').clientWidth || 340);
  const rr = r || img.naturalWidth / img.naturalHeight;
  let w = maxw, h = w / rr; if (h > 420) { h = 420; w = h * rr; }
  v.width = Math.round(w); v.height = Math.round(h); v.style.width = v.width + 'px'; v.style.height = v.height + 'px';
  cz = 1; const g = cropGeom(); cx = (g.vw - g.dw) / 2; cy = (g.vh - g.dh) / 2; cropDraw();
}
function cropSetup() {
  const v = $('#view'); let drag = null;
  v.addEventListener('pointerdown', e => { v.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, cx, cy }; });
  v.addEventListener('pointermove', e => { if (!drag) return; cx = drag.cx + (e.clientX - drag.x); cy = drag.cy + (e.clientY - drag.y); cropDraw(); });
  ['pointerup', 'pointercancel'].forEach(t => v.addEventListener(t, () => { drag = null; }));
  $('#zoom').addEventListener('input', () => { const g0 = cropGeom(), mx = (g0.vw / 2 - cx) / g0.s, my = (g0.vh / 2 - cy) / g0.s; cz = +$('#zoom').value; const g = cropGeom(); cx = g.vw / 2 - mx * g.s; cy = g.vh / 2 - my * g.s; cropDraw(); });
  $('#ratio').addEventListener('change', () => cropSetRatio(+$('#ratio').value));
}
async function cropGo() {
  const g = cropGeom(), sx = -cx / g.s, sy = -cy / g.s, sw = g.vw / g.s, sh = g.vh / g.s;
  const c = document.createElement('canvas'); c.width = Math.round(sw); c.height = Math.round(sh);
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const t = outType(); add(base() + '-cropped.' + extOf(t), await blobOf(c, t, 0.93));
}

// rotate / flip
let rc = null;
function rcDraw() { const v = $('#view'), k = Math.min(1, 340 / Math.max(rc.width, rc.height)); v.width = Math.round(rc.width * k); v.height = Math.round(rc.height * k); v.getContext('2d').drawImage(rc, 0, 0, v.width, v.height); }
function rcOp(op) {
  const n = document.createElement('canvas'), w = rc.width, h = rc.height, x = n.getContext('2d');
  if (op === 'l' || op === 'r') { n.width = h; n.height = w; x.translate(h / 2, w / 2); x.rotate(op === 'r' ? Math.PI / 2 : -Math.PI / 2); x.drawImage(rc, -w / 2, -h / 2); }
  else { n.width = w; n.height = h; if (op === 'h') { x.translate(w, 0); x.scale(-1, 1); } else { x.translate(0, h); x.scale(1, -1); } x.drawImage(rc, 0, 0); }
  rc = n; rcDraw();
}
async function rcGo() { const t = outType(); add(base() + '-edited.' + extOf(t), await blobOf(rc, t, 0.93)); }

// grayscale / black&white
function bwRender(target) {
  const mode = $('#mode').value, th = +$('#th').value, c = target || $('#view');
  const k = target ? 1 : Math.min(1, 340 / Math.max(img.naturalWidth, img.naturalHeight));
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    let l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    if (mode === 'bw') l = l > th ? 255 : 0; else if (mode === 'doc') l = Math.max(0, Math.min(255, (l - 60) * 1.7 + 30));
    p[i] = p[i + 1] = p[i + 2] = l;
  }
  x.putImageData(d, 0, 0);
}
async function bwGo() { const c = document.createElement('canvas'); bwRender(c); const t = outType(); add(base() + '-bw.' + extOf(t), await blobOf(c, t, 0.93)); }

// signature background remover
function sigRender(target) {
  const th = +$('#th').value, col = $('#ink').value, c = target || $('#view');
  const k = target ? 1 : Math.min(1, 340 / Math.max(img.naturalWidth, img.naturalHeight));
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, lo = th - 60;
  const rgb = col === 'blue' ? [26, 63, 176] : col === 'black' ? [17, 17, 17] : null;
  for (let i = 0; i < p.length; i += 4) {
    const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    const a = l >= th ? 0 : l <= lo ? 255 : Math.round(255 * (th - l) / 60);
    if (rgb) { p[i] = rgb[0]; p[i + 1] = rgb[1]; p[i + 2] = rgb[2]; }
    p[i + 3] = Math.min(p[i + 3], a);
  }
  x.putImageData(d, 0, 0);
}
async function sigGo() {
  const c = document.createElement('canvas'); sigRender(c);
  const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (g[(y * c.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  let o = c; if (x1 >= 0) { o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); }
  add(base() + '-signature.png', await blobOf(o, 'image/png'));
}

/* ---------- QR ---------- */
function qrText() {
  const t = $('#qtype').value;
  if (t === 'wifi') return 'WIFI:T:' + $('#wenc').value + ';S:' + $('#wssid').value.replace(/([\;,:"])/g, '\\$1') + ';P:' + $('#wpass').value.replace(/([\;,:"])/g, '\\$1') + ';;';
  return $('#qtext').value;
}
function qrDraw() {
  const v = $('#view'), t = qrText(); if (!t.trim()) { v.style.display = 'none'; return null; }
  try { const c = QR.toCanvas(t, 10, $('#qfg').value, '#ffffff', 4); v.style.display = 'block'; v.width = c.width; v.height = c.height; v.getContext('2d').drawImage(c, 0, 0); say(''); return c; }
  catch (e) { say(e.message); v.style.display = 'none'; return null; }
}

/* ---------- wiring ---------- */
const IMG_TOOLS = ['crop-image', 'rotate-flip-image', 'bw-image', 'signature-background-remover'];
async function onFile(f) {
  if (!f) return; file = f; out.innerHTML = ''; say('');
  try {
    if (PDF_TOOLS[TOOL] || TOOL === 'pdf-to-jpg' || TOOL === 'pdf-to-text') {
      const doc = await pdfOpen(f); $('#info').textContent = f.name + ' (' + fmt(f.size) + ', ' + doc.getPageCount() + ' pages)';
      $('#editor').style.display = 'block'; window.PAGES = doc.getPageCount();
    } else {
      img = await loadImg(f); $('#info').textContent = f.name + ' (' + img.naturalWidth + 'x' + img.naturalHeight + ', ' + fmt(f.size) + ')'; $('#editor').style.display = 'block';
      if (TOOL === 'crop-image') cropSetRatio(+$('#ratio').value);
      if (TOOL === 'rotate-flip-image') { rc = document.createElement('canvas'); rc.width = img.naturalWidth; rc.height = img.naturalHeight; rc.getContext('2d').drawImage(img, 0, 0); rcDraw(); }
      if (TOOL === 'bw-image') bwRender();
      if (TOOL === 'signature-background-remover') sigRender();
    }
  } catch (e) { $('#info').textContent = 'Could not open: ' + e.message; $('#editor').style.display = 'none'; }
}
if (inp) {
  drop.addEventListener('click', () => inp.click());
  ['dragover', 'dragenter'].forEach(e => drop.addEventListener(e, ev => ev.preventDefault()));
  drop.addEventListener('drop', ev => { ev.preventDefault(); onFile(ev.dataTransfer.files[0]); });
  inp.addEventListener('change', () => onFile(inp.files[0]));
}
if (TOOL === 'crop-image') cropSetup();
if (TOOL === 'rotate-flip-image') document.querySelectorAll('[data-op]').forEach(b => b.onclick = () => rc && rcOp(b.dataset.op));
if (TOOL === 'bw-image') { $('#mode').onchange = $('#th').oninput = () => img && bwRender(); }
if (TOOL === 'signature-background-remover') { $('#ink').onchange = $('#th').oninput = () => img && sigRender(); }
if (TOOL === 'qr-code-generator') {
  const sw = () => { const w = $('#qtype').value === 'wifi'; $('#pText').style.display = w ? 'none' : 'block'; $('#pWifi').style.display = w ? 'block' : 'none'; qrDraw(); };
  $('#qtype').onchange = sw; document.querySelectorAll('#qtext,#wssid,#wpass,#wenc,#qfg').forEach(e => e.addEventListener('input', qrDraw));
  $('#go').onclick = async () => { out.innerHTML = ''; const c = qrDraw(); if (!c) { say('Type something first.'); return; } add('qr-code.png', await blobOf(c, 'image/png')); };
} else {
  $('#go').addEventListener('click', async () => {
    const go = $('#go'); go.disabled = true; out.innerHTML = ''; say('Working ...');
    try {
      if (PDF_TOOLS[TOOL]) await PDF_TOOLS[TOOL](await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false }));
      else if (TOOL === 'pdf-to-jpg') await pdfToImages();
      else if (TOOL === 'pdf-to-text') await pdfToText();
      else if (TOOL === 'crop-image') await cropGo();
      else if (TOOL === 'rotate-flip-image') await rcGo();
      else if (TOOL === 'bw-image') await bwGo();
      else if (TOOL === 'signature-background-remover') await sigGo();
      if (!/Done|No text/.test($('#status').textContent)) say('Done. Tap Download below.');
    } catch (e) { say('Error: ' + e.message); }
    go.disabled = false;
  });
}
