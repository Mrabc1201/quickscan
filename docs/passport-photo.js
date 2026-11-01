const $ = s => document.querySelector(s);
const fmt = b => b > 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB';
const PRESETS = {
  us: { label: 'USA / India - 2x2 inch (51x51 mm)', w: 600, h: 600, maxKB: 240, tip: 'Head should be 1 to 1-3/8 inch (50-69% of the photo height). Plain white background.' },
  uk: { label: 'UK / Schengen EU / Australia - 35x45 mm', w: 413, h: 531, maxKB: 0, tip: 'Head should be 29-34 mm (about 65-75% of the photo height). Plain light background.' },
  ca: { label: 'Canada - 50x70 mm', w: 591, h: 827, maxKB: 0, tip: 'Face 31-36 mm from chin to crown. Plain white background.' },
  cn: { label: 'China visa - 33x48 mm', w: 390, h: 567, maxKB: 0, tip: 'Head 28-33 mm. Plain white background.' }
};
const sel = $('#preset');
Object.keys(PRESETS).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = PRESETS[k].label; sel.appendChild(o); });
let img = null, P = PRESETS.us, zoom = 1, ox = 0, oy = 0, base = 1;
const view = $('#view'), vx = view.getContext('2d');
function setup() {
  P = PRESETS[sel.value];
  const vw = Math.min(320, ($('#viewBox').clientWidth || 320));
  view.width = vw; view.height = Math.round(vw * P.h / P.w);
  view.style.width = vw + 'px'; view.style.height = view.height + 'px';
  $('#tip').textContent = P.tip;
  if (img) { base = Math.max(view.width / img.width, view.height / img.height); zoom = 1; $('#zoom').value = 1; ox = (view.width - img.width * base) / 2; oy = (view.height - img.height * base) / 2; draw(); }
}
function draw() {
  vx.fillStyle = '#fff'; vx.fillRect(0, 0, view.width, view.height);
  if (!img) return;
  vx.drawImage(img, ox, oy, img.width * base * zoom, img.height * base * zoom);
  vx.strokeStyle = 'rgba(47,111,237,.9)'; vx.lineWidth = 2; vx.setLineDash([6, 5]);
  vx.beginPath(); vx.ellipse(view.width / 2, view.height * 0.46, view.width * 0.27, view.height * 0.34, 0, 0, Math.PI * 2); vx.stroke();
  vx.setLineDash([]);
  vx.beginPath(); vx.moveTo(view.width * 0.5, 0); vx.lineTo(view.width * 0.5, view.height); vx.strokeStyle = 'rgba(47,111,237,.25)'; vx.stroke();
}
function clampOff() {
  const w = img.width * base * zoom, h = img.height * base * zoom;
  ox = Math.min(0, Math.max(view.width - w, ox)); oy = Math.min(0, Math.max(view.height - h, oy));
}
sel.addEventListener('change', setup);
$('#zoom').addEventListener('input', e => {
  if (!img) return;
  const nz = +e.target.value, cx = view.width / 2, cy = view.height / 2;
  ox = cx - (cx - ox) * nz / zoom; oy = cy - (cy - oy) * nz / zoom; zoom = nz; clampOff(); draw();
});
let drag = null;
view.addEventListener('pointerdown', e => { if (!img) return; drag = { x: e.clientX, y: e.clientY, ox, oy }; view.setPointerCapture(e.pointerId); e.preventDefault(); });
view.addEventListener('pointermove', e => { if (!drag) return; ox = drag.ox + e.clientX - drag.x; oy = drag.oy + e.clientY - drag.y; clampOff(); draw(); });
['pointerup', 'pointercancel'].forEach(t => view.addEventListener(t, () => { drag = null; }));
const drop = $('#drop'), inp = $('#file');
drop.addEventListener('click', () => inp.click());
['dragover', 'dragenter'].forEach(e => drop.addEventListener(e, ev => ev.preventDefault()));
drop.addEventListener('drop', ev => { ev.preventDefault(); load(ev.dataTransfer.files[0]); });
inp.addEventListener('change', () => load(inp.files[0]));
function load(f) {
  if (!f) return;
  const u = URL.createObjectURL(f), im = new Image();
  im.onload = () => { img = im; $('#editor').style.display = 'block'; setup(); $('#info').textContent = f.name + ' (' + im.width + 'x' + im.height + ' px)'; };
  im.onerror = () => { $('#info').textContent = 'Could not open this image. Use a JPG or PNG photo.'; };
  im.src = u;
}
function render(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), k = W / view.width;
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, ox * k, oy * k, img.width * base * zoom * k, img.height * base * zoom * k);
  return c;
}
const toBlob = (c, q) => new Promise(r => c.toBlob(r, 'image/jpeg', q));
async function jpegUnder(c, maxKB) {
  let q = 0.95, b = await toBlob(c, q);
  while (maxKB && b.size > maxKB * 1024 && q > 0.4) { q -= 0.07; b = await toBlob(c, q); }
  return b;
}
function addRes(name, blob, extra) {
  const u = URL.createObjectURL(blob), d = document.createElement('div'); d.className = 'res';
  d.innerHTML = '<span>' + name + ' - ' + fmt(blob.size) + (extra ? ' ' + extra : '') + '</span><a download="' + name + '" href="' + u + '">Download</a>';
  $('#out').appendChild(d);
}
$('#bPhoto').onclick = async () => {
  if (!img) return; $('#out').innerHTML = '';
  const c = render(P.w, P.h), b = await jpegUnder(c, P.maxKB);
  addRes('passport-photo-' + sel.value + '.jpg', b, '(' + P.w + 'x' + P.h + ' px)');
};
$('#bSheet').onclick = async () => {
  if (!img) return; $('#out').innerHTML = '';
  const W = 1800, H = 1200, sheet = document.createElement('canvas'); sheet.width = W; sheet.height = H;
  const x = sheet.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  const one = render(P.w, P.h);
  let cols = Math.floor(W / P.w), rows = Math.floor(H / P.h);
  if (cols < 1 || rows < 1) { cols = 1; rows = 1; }
  const gx = (W - cols * P.w) / 2, gy = (H - rows * P.h) / 2;
  x.strokeStyle = '#bbb'; x.lineWidth = 1;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const px = gx + q * P.w, py = gy + r * P.h; x.drawImage(one, px, py); x.strokeRect(px + .5, py + .5, P.w - 1, P.h - 1);
  }
  const b = await toBlob(sheet, 0.93);
  addRes('passport-photos-4x6-print.jpg', b, '(' + cols * rows + ' photos on a 4x6 inch sheet, 300 dpi)');
};
