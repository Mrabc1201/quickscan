const $ = s => document.querySelector(s);
const fmt = b => b > 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB';
let pdfjs = null, bytes = null, fname = 'document', fsize = 0;
async function loadPdfjs() {
  if (pdfjs) return pdfjs;
  pdfjs = await import('./lib/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = './lib/pdf.worker.min.mjs';
  return pdfjs;
}
const drop = $('#drop'), inp = $('#file'), go = $('#go');
drop.addEventListener('click', () => inp.click());
['dragover', 'dragenter'].forEach(e => drop.addEventListener(e, ev => ev.preventDefault()));
drop.addEventListener('drop', ev => { ev.preventDefault(); setFile(ev.dataTransfer.files[0]); });
inp.addEventListener('change', () => setFile(inp.files[0]));
async function setFile(f) {
  if (!f) return;
  fname = f.name.replace(/\.pdf$/i, ''); fsize = f.size;
  bytes = new Uint8Array(await f.arrayBuffer());
  $('#info').textContent = f.name + ' (' + fmt(f.size) + ')'; go.disabled = false; $('#out').innerHTML = '';
}
const sel = $('#target'), cust = $('#custom');
sel.addEventListener('change', () => { cust.style.display = sel.value === 'custom' ? 'inline-block' : 'none'; });
function targetBytes() {
  const v = sel.value === 'custom' ? parseFloat(cust.value) : parseFloat(sel.value);
  return (isFinite(v) && v > 10 ? v : 500) * 1024;
}
go.addEventListener('click', async () => {
  const target = targetBytes(), out = $('#out'), st = $('#status');
  out.innerHTML = ''; go.disabled = true;
  try {
    if (fsize <= target) { st.textContent = 'Your file (' + fmt(fsize) + ') is already smaller than ' + fmt(target) + '. Pick a smaller target.'; go.disabled = false; return; }
    const lib = await loadPdfjs();
    const doc = await lib.getDocument({ data: bytes.slice() }).promise;
    const plans = [[1.6, .72], [1.4, .62], [1.2, .52], [1.0, .45], [0.9, .38], [0.8, .32], [0.7, .27], [0.6, .22], [0.5, .18], [0.4, .15]];
    const ratio = target / fsize;
    let start = ratio < 0.04 ? 6 : ratio < 0.08 ? 5 : ratio < 0.15 ? 4 : ratio < 0.3 ? 3 : ratio < 0.5 ? 2 : ratio < 0.7 ? 1 : 0;
    let best = null;
    for (let pi = start; pi < plans.length; pi++) {
      const [scale, q] = plans[pi];
      const { PDFDocument } = PDFLib;
      const outDoc = await PDFDocument.create();
      for (let n = 1; n <= doc.numPages; n++) {
        st.textContent = 'Compressing page ' + n + ' of ' + doc.numPages + ' (quality level ' + (pi - start + 1) + ') ...';
        const pg = await doc.getPage(n);
        const v1 = pg.getViewport({ scale: 1 }), v = pg.getViewport({ scale });
        const c = document.createElement('canvas'); c.width = Math.ceil(v.width); c.height = Math.ceil(v.height);
        const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
        await pg.render({ canvas: c, canvasContext: cx, viewport: v }).promise;
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
        const img = await outDoc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        const page = outDoc.addPage([v1.width, v1.height]);
        page.drawImage(img, { x: 0, y: 0, width: v1.width, height: v1.height });
        c.width = c.height = 1;
      }
      const saved = await outDoc.save();
      best = saved;
      if (saved.length <= target) break;
    }
    const blob = new Blob([best], { type: 'application/pdf' }), u = URL.createObjectURL(blob), name = fname + '-compressed.pdf';
    const ok = best.length <= target;
    st.textContent = ok ? 'Done. ' + fmt(fsize) + ' to ' + fmt(best.length) + '.' : 'Smallest we could reach is ' + fmt(best.length) + ' (target was ' + fmt(target) + '). Try a bigger target.';
    out.innerHTML = '<div class="res"><span>' + name + ' - ' + fmt(best.length) + '</span><a download="' + name + '" href="' + u + '">Download</a></div>' +
      '<div class="note">Note: pages are saved as images, so text in the compressed PDF cannot be selected. Keep your original for editing.</div>';
  } catch (e) { st.textContent = 'Could not compress this PDF: ' + e.message; }
  go.disabled = false;
});
