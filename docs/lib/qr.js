/* Minimal QR Code encoder (byte mode, error correction M, versions 1-15). */
const QR = (() => {
  const EC = [null, [10,1,16,0,0],[16,1,28,0,0],[26,1,44,0,0],[18,2,32,0,0],[24,2,43,0,0],[16,4,27,0,0],[18,4,31,0,0],[22,2,38,2,39],[22,3,36,2,37],[26,4,43,1,44],[30,1,50,4,51],[22,6,36,2,37],[22,8,37,1,38],[24,4,40,5,41],[24,5,41,5,42]];
  const ALIGN = [null,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70]];
  const EXP = new Array(512), LOG = new Array(256);
  (() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  const mul = (a, b) => (a && b) ? EXP[LOG[a] + LOG[b]] : 0;
  function rsGen(n) { let p = [1]; for (let i = 0; i < n; i++) { const q = new Array(p.length + 1).fill(0); for (let j = 0; j < p.length; j++) { q[j] ^= p[j]; q[j + 1] ^= mul(p[j], EXP[i]); } p = q; } return p; }
  function rsRem(data, n) { const g = rsGen(n), r = new Array(n).fill(0); for (const b of data) { const f = b ^ r.shift(); r.push(0); for (let i = 0; i < n; i++) r[i] ^= mul(g[i + 1], f); } return r; }
  const dataCW = v => { const e = EC[v]; return e[1] * e[2] + e[3] * e[4]; };
  function encode(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    let v = 1;
    for (; v <= 15; v++) { const cc = v < 10 ? 8 : 16; if (4 + cc + bytes.length * 8 <= dataCW(v) * 8) break; }
    if (v > 15) throw new Error('Text is too long for this QR generator (max about 400 characters).');
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
    const cap = dataCW(v) * 8;
    put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
    for (let p = 0xEC; data.length < dataCW(v); p ^= 0xEC ^ 0x11) data.push(p);
    const [ecn, g1, d1, g2, d2] = EC[v], blocks = [], ecs = []; let k = 0;
    for (let i = 0; i < g1 + g2; i++) { const len = i < g1 ? d1 : d2; const blk = data.slice(k, k + len); k += len; blocks.push(blk); ecs.push(rsRem(blk, ecn)); }
    const all = []; const maxd = Math.max(d1, d2);
    for (let i = 0; i < maxd; i++) blocks.forEach(b => { if (i < b.length) all.push(b[i]); });
    for (let i = 0; i < ecn; i++) ecs.forEach(e => all.push(e[i]));
    return build(v, all);
  }
  function build(v, cw) {
    const size = v * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const f = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < size && y < size) { m[y][x] = c; f[y][x] = true; } };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 2 && d !== 4); }
    const ap = ALIGN[v], last = ap.length - 1;
    for (let i = 0; i <= last; i++) for (let j = 0; j <= last; j++) { if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
    const fmt = mask => { const d = (0 << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); const bits = ((d << 10) | r) ^ 0x5412; const b = i => ((bits >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, b(i)); set(8, 7, b(6)); set(8, 8, b(7)); set(7, 8, b(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, b(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, b(i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, b(i)); set(8, size - 8, true); };
    fmt(0);
    if (v >= 7) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const bits = (v << 12) | r; for (let i = 0; i < 18; i++) { const c = ((bits >>> i) & 1) === 1, a = size - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, c); set(b, a, c); } }
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert; if (!f[y][x] && i < cw.length * 8) { m[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; } } }
    const maskFn = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0, (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
    let best = null, bestP = 1e9;
    for (let mk = 0; mk < 8; mk++) {
      const t = m.map(r => r.slice());
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!f[y][x] && maskFn[mk](x, y)) t[y][x] = !t[y][x];
      const save = m.map(r => r.slice()); for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) m[y][x] = t[y][x];
      fmt(mk); const snap = m.map(r => r.slice()); const p = penalty(snap);
      if (p < bestP) { bestP = p; best = snap; }
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) m[y][x] = save[y][x];
    }
    return best;
  }
  function penalty(m) {
    const n = m.length; let p = 0, dark = 0;
    for (let a = 0; a < n; a++) for (const row of [true, false]) { let run = 1; for (let b = 1; b < n; b++) { const c = row ? m[a][b] : m[b][a], pc = row ? m[a][b - 1] : m[b - 1][a]; if (c === pc) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { if (m[y][x]) dark++; if (x < n - 1 && y < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3; }
    const pat = [true, false, true, true, true, false, true];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) for (const h of [true, false]) {
      const g = k => h ? (x + k < n ? m[y][x + k] : null) : (y + k < n ? m[y + k][x] : null);
      let ok = true; for (let k = 0; k < 7 && ok; k++) if (g(k) !== pat[k]) ok = false;
      if (!ok) continue;
      const after = [7, 8, 9, 10].every(k => g(k) === false), before = (() => { const gb = k => h ? (x - k >= 0 ? m[y][x - k] : null) : (y - k >= 0 ? m[y - k][x] : null); return [1, 2, 3, 4].every(k => gb(k) === false); })();
      if (after) p += 40; if (before) p += 40;
    }
    const total = n * n; p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return p;
  }
  function toCanvas(text, scale, fg, bg, quiet) {
    const m = encode(text), n = m.length, q = quiet == null ? 4 : quiet, c = document.createElement('canvas');
    c.width = c.height = (n + q * 2) * scale; const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.fillStyle = fg;
    for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) if (m[y][i]) x.fillRect((i + q) * scale, (y + q) * scale, scale, scale);
    return c;
  }
  return { encode, toCanvas };
})();
if (typeof module !== 'undefined') module.exports = QR;
