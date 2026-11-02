const $ = s => document.querySelector(s);
const fmt = b => b > 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB';
let pdfjs = null, bytes = null, fname = 'document.pdf';
let items = [], sel = null, sig = null;

async function loadPdfjs() {
  if (pdfjs) return pdfjs;
  pdfjs = await import('./lib/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = './lib/pdf.worker.min.mjs';
  return pdfjs;
}

const drop = $('#drop'), inp = $('#file');
drop.addEventListener('click', () => inp.click());
['dragover', 'dragenter'].forEach(e => drop.addEventListener(e, ev => ev.preventDefault()));
drop.addEventListener('drop', ev => { ev.preventDefault(); openFile(ev.dataTransfer.files[0]); });
inp.addEventListener('change', () => openFile(inp.files[0]));

async function openFile(f) {
  if (!f) return;
  try {
    fname = f.name.replace(/\.pdf$/i, '');
    bytes = new Uint8Array(await f.arrayBuffer());
    $('#info').textContent = 'Loading ' + f.name + ' (' + fmt(f.size) + ') ...';
    const lib = await loadPdfjs();
    if (!bytes.length) throw new Error('this file is empty (0 KB). Please download or save it again');
    const head = new TextDecoder('latin1').decode(bytes.slice(0, 1024));
    if (head.indexOf('%PDF') < 0) throw new Error('this file is not a PDF (' + (f.type || 'unknown type') + '). Choose a .pdf file');
    let doc;
    try { doc = await lib.getDocument({ data: bytes.slice() }).promise; }
    catch (e1) {
      const fixed = await (await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false })).save();
      bytes = new Uint8Array(fixed);
      doc = await lib.getDocument({ data: bytes.slice() }).promise;
    }
    $('#editor').style.display = 'block';
    const box = $('#pages'); box.innerHTML = ''; items = []; sel = null;
    const cw = Math.max(240, Math.min(box.clientWidth || 360, 820));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (let n = 1; n <= doc.numPages; n++) {
      const pg = await doc.getPage(n);
      const v1 = pg.getViewport({ scale: 1 });
      const sc = cw / v1.width;
      const v = pg.getViewport({ scale: sc * dpr });
      const c = document.createElement('canvas');
      c.width = Math.floor(v.width); c.height = Math.floor(v.height);
      c.style.width = cw + 'px'; c.style.height = (v1.height * sc) + 'px';
      await pg.render({ canvas: c, canvasContext: c.getContext('2d'), viewport: v }).promise;
      const w = document.createElement('div');
      w.className = 'pg'; w.style.width = cw + 'px'; w.style.height = (v1.height * sc) + 'px';
      w.dataset.page = n - 1; w.appendChild(c); box.appendChild(w);
    }
    $('#info').textContent = f.name + ' (' + fmt(f.size) + ', ' + doc.numPages + ' page' + (doc.numPages > 1 ? 's' : '') + ')';
    $('#out').innerHTML = '';
  } catch (e) {
    $('#info').textContent = 'Could not open this PDF: ' + e.message + (/empty|not a PDF/.test(e.message) ? '.' : '. The file may be damaged, incomplete or password-protected - try downloading it again.');
  }
}

function currentPage() {
  const pages = [...document.querySelectorAll('.pg')];
  const mid = innerHeight / 2; let best = pages[0], bd = 1e9;
  for (const p of pages) {
    const r = p.getBoundingClientRect();
    const d = (r.top <= mid && r.bottom >= mid) ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function select(it) {
  items.forEach(i => i.el.classList.remove('sel'));
  sel = it; if (it) it.el.classList.add('sel');
}

function addItem(kind, data) {
  const wrap = currentPage(); if (!wrap) return;
  const cw = wrap.clientWidth, ch = wrap.clientHeight;
  const el = document.createElement('div'); el.className = 'it';
  const it = { el, wrap, kind, data };
  if (kind === 'sig') {
    const w = Math.min(190, cw * 0.4), h = w * data.h / data.w;
    el.style.width = w + 'px'; el.style.height = h + 'px';
    const im = document.createElement('img'); im.src = data.url; im.draggable = false;
    im.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none';
    el.appendChild(im);
  } else {
    el.textContent = data.text; el.style.fontSize = '15px'; el.style.color = color; it.color = color;
    el.style.whiteSpace = 'nowrap'; el.style.fontFamily = 'Helvetica, Arial, sans-serif'; el.style.lineHeight = '1.15';
  }
  wrap.appendChild(el);
  const r = wrap.getBoundingClientRect();
  let y = innerHeight / 2 - r.top - el.offsetHeight / 2;
  y = Math.max(0, Math.min(ch - el.offsetHeight, y));
  el.style.left = Math.max(0, (cw - el.offsetWidth) / 2) + 'px'; el.style.top = y + 'px';
  let sx, sy, sl, st;
  el.addEventListener('pointerdown', e => {
    select(it); el.setPointerCapture(e.pointerId);
    sx = e.clientX; sy = e.clientY; sl = el.offsetLeft; st = el.offsetTop; e.preventDefault();
  });
  el.addEventListener('pointermove', e => {
    if (!el.hasPointerCapture(e.pointerId)) return;
    const nl = Math.max(0, Math.min(wrap.clientWidth - el.offsetWidth, sl + e.clientX - sx));
    const nt = Math.max(0, Math.min(wrap.clientHeight - el.offsetHeight, st + e.clientY - sy));
    el.style.left = nl + 'px'; el.style.top = nt + 'px';
  });
  items.push(it); select(it);
}

function resize(f) {
  if (!sel) return;
  const el = sel.el;
  if (sel.kind === 'sig') { el.style.width = el.offsetWidth * f + 'px'; el.style.height = el.offsetHeight * f + 'px'; }
  else el.style.fontSize = (parseFloat(el.style.fontSize) * f) + 'px';
}
$('#bBig').onclick = () => resize(1.15);
$('#bSmall').onclick = () => resize(0.87);
$('#bDel').onclick = () => { if (!sel) return; sel.el.remove(); items = items.filter(i => i !== sel); sel = null; };
$('#bText').onclick = () => { const t = prompt('Type the text to add (name, address, X ...):'); if (t) addItem('text', { text: t }); };
$('#bDate').onclick = () => addItem('text', { text: new Date().toLocaleDateString('en-US') });
document.addEventListener('pointerdown', e => { if (!e.target.closest('.it') && !e.target.closest('button')) select(null); });

/* signature dialog */
const sc = $('#sigCanvas'), sx = sc.getContext('2d');
let drawing = false, color = '#1a3fb0', mode = 'draw';
function pos(e) { const r = sc.getBoundingClientRect(); return { x: (e.clientX - r.left) * sc.width / r.width, y: (e.clientY - r.top) * sc.height / r.height }; }
function clearSig() { sx.clearRect(0, 0, sc.width, sc.height); sx.lineWidth = 4; sx.lineCap = 'round'; sx.lineJoin = 'round'; sx.strokeStyle = color; }
clearSig();
sc.addEventListener('pointerdown', e => { drawing = true; sc.setPointerCapture(e.pointerId); const p = pos(e); sx.strokeStyle = color; sx.beginPath(); sx.moveTo(p.x, p.y); sx.lineTo(p.x + 0.01, p.y); sx.stroke(); e.preventDefault(); });
sc.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); sx.lineTo(p.x, p.y); sx.stroke(); });
['pointerup', 'pointercancel'].forEach(t => sc.addEventListener(t, () => { drawing = false; }));
$('#sigClear').onclick = clearSig;
function recolor() {
  sx.save(); sx.globalCompositeOperation = 'source-atop'; sx.fillStyle = color; sx.fillRect(0, 0, sc.width, sc.height); sx.restore();
  sx.strokeStyle = color;
}
document.querySelectorAll('input[name=col]').forEach(r => r.addEventListener('change', () => { color = r.value; recolor(); drawType(); }));
function setMode(m) {
  mode = m;
  $('#tabDraw').classList.toggle('on', m === 'draw'); $('#tabType').classList.toggle('on', m === 'type');
  $('#paneDraw').style.display = m === 'draw' ? 'block' : 'none'; $('#paneType').style.display = m === 'type' ? 'block' : 'none';
}
$('#tabDraw').onclick = () => setMode('draw'); $('#tabType').onclick = () => { setMode('type'); drawType(); };
const tp = $('#typePrev'), tx = tp.getContext('2d');
const fontOf = () => $('#fontSel').value;
function drawType() {
  tx.clearRect(0, 0, tp.width, tp.height);
  tx.fillStyle = color; tx.font = '64px ' + fontOf(); tx.textBaseline = 'middle';
  tx.fillText($('#typeIn').value || '', 16, tp.height / 2);
}
$('#typeIn').addEventListener('input', drawType); $('#fontSel').addEventListener('change', drawType);
function trim(cv) {
  const c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const p = 6; x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p); x1 = Math.min(cv.width - 1, x1 + p); y1 = Math.min(cv.height - 1, y1 + p);
  const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
  o.getContext('2d').drawImage(cv, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  return { url: o.toDataURL('image/png'), w: o.width, h: o.height };
}
$('#sigDone').onclick = () => {
  if (mode === 'type') drawType();
  const r = trim(mode === 'draw' ? sc : tp);
  if (!r) { alert('Please draw or type your signature first.'); return; }
  sig = r; $('#sigModal').style.display = 'none'; addItem('sig', sig);
  $('#bSign').textContent = 'Add another copy'; $('#bChange').style.display = 'inline-block';
};
$('#sigCancel').onclick = () => { $('#sigModal').style.display = 'none'; };
$('#bSign').onclick = () => { if (sig) addItem('sig', sig); else $('#sigModal').style.display = 'flex'; };
$('#bChange').onclick = () => { $('#sigModal').style.display = 'flex'; };

/* save */
$('#bSave').onclick = async () => {
  if (!items.length) { alert('Add a signature or some text first.'); return; }
  const btn = $('#bSave'); btn.disabled = true; btn.textContent = 'Saving ...';
  try {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    for (const it of items) {
      const pi = +it.wrap.dataset.page, page = pages[pi];
      const { width: pw, height: ph } = page.getSize();
      const f = pw / it.wrap.clientWidth;
      const left = it.el.offsetLeft, top = it.el.offsetTop;
      if (it.kind === 'sig') {
        const png = await doc.embedPng(await (await fetch(it.data.url)).arrayBuffer());
        const w = it.el.offsetWidth * f, h = it.el.offsetHeight * f;
        page.drawImage(png, { x: left * f, y: ph - top * f - h, width: w, height: h });
      } else {
        const px = parseFloat(it.el.style.fontSize);
        const txt = it.data.text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
        page.drawText(txt, { x: (left + 2) * f, y: ph - (top + px * 0.95) * f, size: px * f, font, color: rgb(parseInt((it.color || '#111111').slice(1, 3), 16) / 255, parseInt((it.color || '#111111').slice(3, 5), 16) / 255, parseInt((it.color || '#111111').slice(5, 7), 16) / 255) });
      }
    }
    const out = await doc.save();
    const blob = new Blob([out], { type: 'application/pdf' }), u = URL.createObjectURL(blob);
    const name = fname + '-signed.pdf';
    $('#out').innerHTML = '<div class="res"><span>' + name + ' - ' + fmt(blob.size) + '</span><a id="dl" download="' + name + '" href="' + u + '">Download</a></div>';
  } catch (e) {
    $('#out').innerHTML = '<div class="note">Could not save: ' + e.message + '</div>';
  }
  btn.disabled = false; btn.textContent = 'Download signed PDF';
};
