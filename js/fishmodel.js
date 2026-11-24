// Procedural fish, built from a species' proportions (fishdata.js `shape`, `look`).
//
// One body builder with a profile per family (salmonid, coregonid, pike, perch, cyprinid, burbot,
// stickleback, sculpin, eel, smelt): a lofted body whose height, width and belly/back shape follow
// the family, then fins as thin ribbed sheets placed where that family has them (adipose fin on
// the salmonids and the smelt, two dorsal fins on the perches and sculpins, the long low fins of
// the burbot, the sail of the grayling, the spines of the sticklebacks, the continuous fin of the
// eel), eyes, a barbel where there is one. The pattern (spots, bars, parr marks, marbling, the
// lateral line, scales) is painted once per species on a canvas and wrapped round the body.
//
// Model space: snout at +x, length 1 (scaled to the fish's real length by the caller), back up
// (+y), sides along z. Nothing here is a scan or a photograph; these are drawn shapes.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// family defaults: tb tail base (fraction of length), umax where the body is deepest, ped peduncle
// height (fraction of the deepest), head length, eye size, where the pelvic fins sit
const FAM = {
  salmonid: { tb: 0.83, umax: 0.4, ped: 0.34, head: 0.22, eye: 1, pelvic: 0.5, dorsal: [0.36, 0.5, 0.11], anal: [0.66, 0.75, 0.08], adipose: true, tail: 'fork' },
  coregonid: { tb: 0.82, umax: 0.4, ped: 0.3, head: 0.18, eye: 1.15, pelvic: 0.5, dorsal: [0.36, 0.48, 0.13], anal: [0.64, 0.74, 0.08], adipose: true, tail: 'fork' },
  pike: { tb: 0.86, umax: 0.55, ped: 0.6, head: 0.27, eye: 0.8, pelvic: 0.55, dorsal: [0.66, 0.79, 0.08], anal: [0.68, 0.8, 0.07], tail: 'fork' },
  perch: { tb: 0.82, umax: 0.36, ped: 0.32, head: 0.27, eye: 1.15, pelvic: 0.3, dorsal: [0.27, 0.49, 0.13], dorsal2: [0.51, 0.68, 0.1], anal: [0.6, 0.7, 0.08], tail: 'emarg' },
  cyprinid: { tb: 0.82, umax: 0.4, ped: 0.33, head: 0.22, eye: 1, pelvic: 0.46, dorsal: [0.42, 0.55, 0.13], anal: [0.62, 0.72, 0.09], tail: 'fork' },
  burbot: { tb: 0.9, umax: 0.26, ped: 0.55, head: 0.2, eye: 0.7, pelvic: 0.19, dorsal: [0.33, 0.42, 0.05], dorsal2: [0.45, 0.89, 0.05], anal: [0.5, 0.89, 0.045], tail: 'round' },
  stickle: { tb: 0.84, umax: 0.36, ped: 0.16, head: 0.26, eye: 1.4, pelvic: 0.4, dorsal: [0.6, 0.73, 0.09], anal: [0.62, 0.73, 0.07], tail: 'trunc' },
  cottid: { tb: 0.85, umax: 0.22, ped: 0.38, head: 0.32, eye: 1.1, pelvic: 0.3, dorsal: [0.33, 0.47, 0.07], dorsal2: [0.49, 0.8, 0.09], anal: [0.53, 0.8, 0.07], tail: 'round' },
  eel: { tb: 1.0, umax: 0.32, ped: 0.35, head: 0.12, eye: 0.6, pelvic: 0, dorsal: [0.34, 1, 0.035], anal: [0.47, 1, 0.03], tail: 'eel' },
  smelt: { tb: 0.83, umax: 0.42, ped: 0.3, head: 0.22, eye: 1.2, pelvic: 0.47, dorsal: [0.44, 0.54, 0.1], anal: [0.64, 0.76, 0.08], adipose: true, tail: 'fork' },
};

/* ---------------------------------------------------------------- the body */
/** height above/below the axis and half width at u (0 snout .. tb tail base) */
function section(f, s, u) {
  const d = s.depth * 0.5, w = s.width * 0.5;
  let H;
  if (u <= f.umax) {
    const t = u / f.umax;
    // a rounded snout: steep at first, then flattening into the shoulder
    H = Math.pow(Math.sin(t * Math.PI / 2), s.fam === 'pike' ? 0.9 : s.snout === 'round' ? 0.45 : 0.6);
  } else {
    const t = (u - f.umax) / (f.tb - f.umax);
    H = lerp(1, f.ped, sm(0, 1, t) * 0.85 + t * 0.15);
  }
  if (s.fam === 'eel') H = Math.min(1, Math.pow(Math.min(1, u / 0.12), 0.6)) * lerp(1, 0.55, sm(0.3, 1, u));
  let top = d * H, bot = d * H, wid = w * H;
  // families: the pike's long flat bill, the sculpin's broad flat head and flat belly, humped backs
  if (s.fam === 'pike') { const b = sm(0, 0.2, u); top *= lerp(0.38, 1, b); bot *= lerp(0.5, 1, b); wid *= lerp(1.25, 1, b); top *= 1 - 0.1 * sm(0.5, 0.8, u); }
  if (s.fam === 'cottid') { const hd = 1 - sm(0.12, 0.42, u); wid *= 1 + 0.75 * hd; top *= lerp(1, 0.78, hd); bot *= 0.72; }
  if (s.fam === 'burbot') { wid *= 1 + 0.25 * (1 - sm(0.1, 0.4, u)); bot *= 0.9; }
  if (s.hump) top *= 1 + 0.16 * Math.exp(-((u - f.umax * 0.95) ** 2) / 0.02);
  if (s.fam === 'perch' || s.fam === 'cyprinid') bot *= 0.94;
  if (s.upjaw && u < 0.05) top *= 0.85;
  if (s.long) { top *= 0.92; }
  return [top, bot, wid];
}

/** the lofted body with uv: x along the body (0 snout, 1 tail base), y round it (0 back, .5 belly) */
function bodyGeometry(f, s) {
  const NU = 56, NV = 40;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) {
    // more rings near the snout, where the shape turns fastest
    const a = i / NU, u = f.tb * (a * a * 0.35 + a * 0.65);
    const [top, bot, wid] = section(f, s, u);
    const x = 0.5 - u;
    const tipY = s.upjaw ? 0.004 : 0;
    for (let j = 0; j <= NV; j++) {
      const th = (j / NV) * TAU;
      const c = Math.cos(th), sn = Math.sin(th);
      // a slight keel along the back and belly, flatter flanks on compressed fish
      const hgt = c > 0 ? top : bot;
      const flat = s.width < s.depth * 0.45 ? 0.82 : 1;
      const y = c * hgt * (1 - 0.06 * Math.pow(Math.abs(sn), 3)) + tipY * (1 - Math.min(1, u / 0.06));
      const z = sn * wid * (flat + (1 - flat) * Math.abs(c)) ;
      pos.push(x, y, z);
      uv.push(u / f.tb, 1 - j / NV);
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const a = i * (NV + 1) + j, b = a + NV + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------------------------------------------------------------- fins */
/**
 * a ribbed sheet between a base line and an outline: rays from base[i] to tip[i] (same count),
 * three rows so the sheet can curve. uv: x along the fin (0 front), y from base (0) to edge (1)
 */
function finSheet(base, tip, curl = 0) {
  const n = base.length, pos = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) {
    for (let r = 0; r <= 2; r++) {
      const t = r / 2;
      const b = base[i], p = tip[i];
      pos.push(lerp(b[0], p[0], t), lerp(b[1], p[1], t), lerp(b[2], p[2], t) + curl * Math.sin(t * Math.PI) * (i % 2 ? 1 : -1) * 0.002);
      uv.push(i / (n - 1), t);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let r = 0; r < 2; r++) {
    const a = i * 3 + r, b = a + 3;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** a fin standing on the back (up = 1) or hanging from the belly (up = -1), from u0 to u1 */
function midFin(f, s, u0, u1, h, up, shape) {
  const n = 9, base = [], tip = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), u = lerp(u0, u1, t);
    const [top, bot] = section(f, s, Math.min(u, f.tb));
    const y0 = up > 0 ? top * 0.92 : -bot * 0.92;
    let hh;
    if (shape === 'sail') hh = h * (0.55 + 0.6 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.85));
    else if (shape === 'spiny') hh = h * (0.55 + 0.45 * Math.sin(t * Math.PI)) * (1 - 0.35 * t);
    else if (shape === 'low') hh = h * (0.7 + 0.3 * Math.sin(t * Math.PI));
    else if (shape === 'round') hh = h * Math.sin(Math.min(1, t * 1.0 + 0.05) * Math.PI) * 0.95 + h * 0.05;
    else if (shape === 'concave') hh = h * (1 - 0.65 * t) * (1 - 0.25 * Math.sin(t * Math.PI));
    else hh = h * (1 - 0.72 * t) * (0.86 + 0.14 * Math.sin(t * 2.4));     // triangular, sweeping back
    const lean = shape === 'sail' ? 0.25 : 0.45;
    base.push([0.5 - u, y0, 0]);
    tip.push([0.5 - u - hh * lean, y0 + up * hh, 0]);
  }
  return finSheet(base, tip);
}
function tailFin(f, s) {
  const u0 = f.tb - 0.01, [top, bot] = section(f, s, u0);
  const len = 1 - f.tb + 0.02, n = 11, base = [], tip = [];
  const fork = s.fork !== undefined ? s.fork : f.tail === 'fork' ? 0.5 : 0;
  const span = Math.max(top, bot) * (f.tail === 'round' ? 1.35 : f.tail === 'trunc' ? 1.9 : 2.3) + 0.02;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), v = t * 2 - 1;                    // -1 bottom .. 1 top
    base.push([0.5 - u0, v > 0 ? v * top : v * bot, 0]);
    let ext;
    if (f.tail === 'round') ext = len * Math.sqrt(Math.max(0, 1 - v * v * 0.8));
    else if (f.tail === 'trunc' || f.tail === 'emarg') ext = len * (1 - (f.tail === 'emarg' ? 0.18 : 0.05) * (1 - Math.abs(v)));
    else ext = len * (1 - fork * 0.75 * (1 - Math.abs(v)) ** 1.6);
    tip.push([0.5 - u0 - ext, v * span * (0.65 + 0.35 * Math.abs(v)), 0]);
  }
  return finSheet(base, tip);
}
/** a paired fin (pectoral or pelvic): side = ±1 */
function pairFin(f, s, u, sDown, len, spread, side, droop, back = 0.75) {
  const [top, bot, wid] = section(f, s, u);
  const x = 0.5 - u, y = -bot * sDown, z = side * wid * 0.85;
  const n = 7, base = [], tip = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const bx = x - t * len * 0.25;
    base.push([bx, y + (0.5 - t) * len * 0.08, z]);
    const ang = lerp(-spread, spread, t);
    const L = len * (0.6 + 0.4 * Math.sin((0.2 + 0.8 * t) * Math.PI * 0.9));
    tip.push([bx - L * back * Math.cos(ang), y - L * droop + L * 0.2 * Math.sin(ang), z + side * L * (0.55 + 0.3 * Math.cos(ang))]);
  }
  return finSheet(base, tip);
}

/* ---------------------------------------------------------------- the painted coat */
const hex = (c) => new THREE.Color(c);
const css = (c, k = 1, a = 1) => { const col = hex(c).multiplyScalar(k); return `rgba(${Math.round(Math.min(1, col.r) * 255)},${Math.round(Math.min(1, col.g) * 255)},${Math.round(Math.min(1, col.b) * 255)},${a})`; };
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seedOf = (id) => [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

function coatTexture(fish, f) {
  const W = 512, H = 256, s = fish.shape, L = fish.look;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rnd = mulberry(seedOf(fish.id));
  // the round-the-body scale: a circle on the fish is wider in y on the canvas than in x
  const perim = Math.PI * (s.depth * 0.5 + s.width * 0.5) * 1.05;
  const kx = W / f.tb, ky = H / perim;
  // ground: back, flank, belly by how far round the body
  for (let y = 0; y < H; y++) {
    const v = y / H, cv = Math.cos(v * TAU);             // 1 back, -1 belly
    const col = new THREE.Color();
    const back = hex(L.back), side = hex(L.side), belly = hex(L.belly);
    if (cv > 0.1) col.copy(side).lerp(back, sm(0.1, 0.85, cv));
    else col.copy(side).lerp(belly, sm(-0.05, -0.75, cv));
    g.fillStyle = `rgb(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)})`;
    g.fillRect(0, y, W, 1);
  }
  // the belly colour of a spawning char or a stickleback is on the throat and belly only
  if (fish.id === 'stick3') { g.fillStyle = css(L.side, 1, 1); g.fillRect(W * 0.42, H * 0.38, W, H * 0.24); }
  // flank points: s in [-1 back .. 1 belly], drawn on both sides
  const both = (fn) => { fn(false); fn(true); };
  const at = (x, sv, mirror) => [x * W, ((sv + 1) / 4) * H * (mirror ? -1 : 1) + (mirror ? H : 0)];
  const spot = (x, sv, r, color, mirror, ry = 1) => {
    const [px, py] = at(x, sv, mirror);
    g.fillStyle = color;
    g.beginPath(); g.ellipse(px, py, r * kx, r * ky * ry, 0, 0, TAU); g.fill();
  };
  const scatter = (n, x0, x1, s0, s1, r0, r1, color, halo) => both((m) => {
    const rr = mulberry(seedOf(fish.id) + (m ? 7 : 3));
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, rr()), sv = lerp(s0, s1, rr()), r = lerp(r0, r1, rr());
      if (halo) spot(x, sv, r * 1.7, halo, m);
      spot(x, sv, r, color, m);
    }
  });
  const p = L.pat;
  if (p === 'trout') { scatter(80, 0.08, 0.92, -0.95, 0.25, 0.004, 0.0075, 'rgba(25,18,12,0.92)'); scatter(18, 0.2, 0.85, -0.25, 0.35, 0.0035, 0.0055, 'rgba(200,40,24,0.95)', 'rgba(236,220,190,0.75)'); }
  if (p === 'parr') {
    both((m) => { for (let i = 0; i < 10; i++) spot(0.25 + i * 0.058, 0.02, 0.016, 'rgba(48,52,58,0.55)', m, 1.9); });
    scatter(12, 0.25, 0.8, -0.35, 0.15, 0.004, 0.006, 'rgba(196,52,36,0.9)');
    scatter(20, 0.1, 0.6, -0.9, -0.3, 0.004, 0.007, 'rgba(25,22,18,0.85)');
  }
  if (p === 'char') scatter(70, 0.1, 0.9, -0.85, 0.35, 0.0035, 0.006, 'rgba(236,200,184,0.8)');
  if (p === 'laketr') scatter(140, 0.02, 0.95, -1, 0.4, 0.005, 0.009, 'rgba(230,228,210,0.8)');
  if (p === 'brook') {
    both((m) => { const rr = mulberry(seedOf(fish.id) + (m ? 11 : 5)); g.strokeStyle = 'rgba(200,190,130,0.75)'; g.lineWidth = 2.2; for (let i = 0; i < 46; i++) { const x = rr(), sv = lerp(-1, -0.35, rr()); const [px, py] = at(x, sv, m); g.beginPath(); g.moveTo(px, py); g.bezierCurveTo(px + 8, py - 6, px + 12, py + 6, px + 22, py); g.stroke(); } });
    scatter(14, 0.2, 0.85, -0.2, 0.3, 0.005, 0.007, 'rgba(206,40,40,0.95)', 'rgba(70,110,200,0.8)');
  }
  if (p === 'pike') {
    both((m) => { const rr = mulberry(seedOf(fish.id) + (m ? 9 : 4)); for (let row = 0; row < 5; row++) for (let i = 0; i < 26; i++) { const x = 0.12 + i * 0.03 + rr() * 0.02; spot(x, -0.55 + row * 0.23 + rr() * 0.06, 0.007 + rr() * 0.004, 'rgba(226,220,160,0.75)', m, 0.75); } });
  }
  if (p === 'perch' || p === 'zander') {
    const n = p === 'perch' ? 6 : 8;
    both((m) => {
      for (let i = 0; i < n; i++) {
        const x = 0.26 + i * (0.56 / n);
        const [px, py] = at(x, -1, m), [, py2] = at(x, p === 'perch' ? 0.45 : 0.05, m);
        g.fillStyle = p === 'perch' ? 'rgba(25,32,16,0.72)' : 'rgba(40,44,38,0.4)';
        g.beginPath(); g.moveTo(px - 0.022 * kx, py); g.lineTo(px + 0.022 * kx, py); g.lineTo(px + 0.008 * kx, py2); g.lineTo(px - 0.004 * kx, py2); g.closePath(); g.fill();
      }
    });
  }
  if (p === 'minnow') { both((m) => { for (let i = 0; i < 11; i++) spot(0.24 + i * 0.055, 0.05, 0.014, 'rgba(36,38,24,0.6)', m, 1.3); }); scatter(40, 0.05, 0.9, -1, -0.4, 0.004, 0.008, 'rgba(36,34,20,0.5)'); }
  if (p === 'marble' || p === 'ruffe' || p === 'sculpin' || p === 'sculpin2' || p === 'stickle9') {
    const dark = p === 'marble' ? 'rgba(46,36,14,0.55)' : 'rgba(40,30,18,0.5)';
    const n = p === 'marble' ? 150 : p === 'stickle9' ? 60 : 90;
    scatter(n, 0.02, 0.98, -1, 0.5, p === 'sculpin2' ? 0.012 : 0.008, p === 'marble' ? 0.022 : 0.016, dark);
    if (p === 'sculpin' || p === 'sculpin2') both((m) => { for (let i = 0; i < 4; i++) spot(0.34 + i * 0.15, -0.85, 0.035, 'rgba(30,22,12,0.55)', m, 1.4); });
  }
  if (p === 'grayling') { scatter(9, 0.18, 0.45, -0.5, 0.2, 0.006, 0.009, 'rgba(20,20,22,0.9)'); both((m) => { for (let k = 0; k < 7; k++) { const [x0, y0] = at(0.1, -0.7 + k * 0.17, m); g.strokeStyle = 'rgba(70,78,90,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(W * 0.95, y0); g.stroke(); } }); }
  if (p === 'stickle') both((m) => { g.strokeStyle = 'rgba(210,214,200,0.45)'; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = 0.24 + i * 0.019; const [px, py] = at(x, -0.35, m), [, py2] = at(x, 0.45, m); g.beginPath(); g.moveTo(px, py); g.lineTo(px - 3, py2); g.stroke(); } });
  if (p === 'smelt') both((m) => { const [, py] = at(0, 0.02, m); g.fillStyle = 'rgba(236,244,246,0.85)'; g.fillRect(0.12 * W, py - 4, 0.8 * W, 8); });
  if (p === 'tench' || p === 'eel') { const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(0,0,0,0.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  // scales: rows of faint crescents, except on the naked or tiny-scaled fish
  const scaled = !['cottid', 'burbot', 'eel'].includes(s.fam) && p !== 'tench' && p !== 'stickle' && p !== 'stickle9';
  if (scaled) {
    const step = s.fam === 'pike' || s.fam === 'salmonid' || p === 'minnow' ? 6 : 9;
    g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1;
    for (let y = step; y < H; y += step) for (let x = W * 0.2 + ((y / step) % 2) * step * 0.5; x < W * 0.98; x += step * 1.2) {
      g.beginPath(); g.arc(x, y, step * 0.62, -1.1, 1.1); g.stroke();
    }
  }
  // the lateral line, the gill cover, the mouth
  both((m) => {
    if (s.fam !== 'eel') { const [x0, y0] = at(f.head * 1.05 / f.tb, -0.25, m), [x1, y1] = at(0.98, 0.02, m); g.strokeStyle = 'rgba(30,30,30,0.28)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, y0 - (m ? -6 : 6), x1, y1); g.stroke(); }
    const [gx, gy] = at(f.head / f.tb, -0.2, m), [, gy2] = at(f.head / f.tb, 0.9, m);
    g.strokeStyle = 'rgba(20,18,14,0.38)'; g.lineWidth = 2; g.beginPath(); g.moveTo(gx - 6, gy); g.quadraticCurveTo(gx + 6, (gy + gy2) / 2, gx - 8, gy2); g.stroke();
    const [mx, my] = at(0, s.upjaw ? 0.05 : 0.25, m);
    g.strokeStyle = 'rgba(30,20,16,0.6)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + (s.fam === 'pike' ? 0.16 : s.fam === 'cottid' ? 0.1 : 0.07) * W, my + (m ? -3 : 3)); g.stroke();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function finTexture(fish) {
  const W = 128, H = 64, L = fish.look, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, css(L.fin, 0.85)); gr.addColorStop(1, css(L.fin, 1.25, 0.55));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(30,24,18,0.45)'; g.lineWidth = 1.2;
  for (let x = 3; x < W; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 2, H); g.stroke(); }
  const rnd = mulberry(seedOf(fish.id) + 99);
  if (['pike', 'grayling', 'zander', 'ruffe', 'laketr', 'sculpin', 'sculpin2', 'trout'].includes(L.pat)) {
    g.fillStyle = L.pat === 'grayling' ? 'rgba(160,40,90,0.7)' : 'rgba(30,22,14,0.55)';
    for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(rnd() * W, rnd() * H, 1.6 + rnd() * 2, 0, TAU); g.fill(); }
  }
  // the char's white leading edges are painted on its lower fins (see buildFish), the perch's
  // black spot at the back of its first dorsal fin is a separate texture
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function perchDorsalTexture(base) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d'); g.drawImage(base.image, 0, 0);
  g.fillStyle = 'rgba(10,10,12,0.9)'; g.beginPath(); g.ellipse(112, 34, 14, 18, 0, 0, TAU); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function edgeTexture(base, color) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d'); g.drawImage(base.image, 0, 0);
  g.fillStyle = color; g.fillRect(0, 0, 12, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function eyeTexture(iris) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = iris; g.fillRect(0, 0, 64, 64);
  const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0.35, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#050505'; g.beginPath(); g.arc(32, 32, 15, 0, TAU); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------------------------------------------------------- swimming */
// One shared clock for every fish on screen; each species' materials bend their vertices with a
// travelling wave along the body (vertex shader, no skeleton): almost nothing at the head, growing
// toward the tail, so eyes, barbels and the fins near the head stay where they are and the tail
// fin follows the body. The wave is a family trait: one stroke on a fusiform fish, two or more
// on the burbot and the eel. uSwimOn = 0 holds every fish still (paused, reduced motion).
export const SWIM = { uSwimT: { value: 0 }, uSwimOn: { value: 1 } };
const WAVE = {   // [amplitude (fraction of length), waves along the body, tail-heavy power, beats per second]
  salmonid: [0.055, 0.8, 2.2, 2.0], coregonid: [0.05, 0.8, 2.2, 2.2], pike: [0.045, 0.9, 2.6, 1.4], perch: [0.05, 0.75, 2.4, 2.0],
  cyprinid: [0.055, 0.8, 2.2, 2.2], burbot: [0.06, 1.5, 1.4, 1.6], stickle: [0.07, 0.7, 2.6, 3.2], cottid: [0.05, 0.9, 2.0, 2.0],
  eel: [0.075, 2.1, 1.0, 1.4], smelt: [0.05, 0.8, 2.2, 2.4],
};
function swimMaterial(mat, fam) {
  const [A, K, P, F] = WAVE[fam] || WAVE.salmonid;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSwimT = SWIM.uSwimT; sh.uniforms.uSwimOn = SWIM.uSwimOn;
    sh.vertexShader = 'uniform float uSwimT;' + String.fromCharCode(10) + 'uniform float uSwimOn;' + String.fromCharCode(10) + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        // s: 0 at the snout, 1 at the tip of the tail (the model runs +0.5 to -0.5 along x)
        float s = clamp(0.5 - position.x, 0.0, 1.0);
        float env = pow(s, ${P.toFixed(2)}) * 0.92 + 0.08 * s;
        float ph = uSwimT * ${(F * 6.2832).toFixed(3)} - s * ${(K * 6.2832).toFixed(3)};
        transformed.z += uSwimOn * ${A.toFixed(3)} * env * sin(ph);
        // the head turns slightly against the tail, as a swimming fish's does
        transformed.z -= uSwimOn * ${(A * 0.18).toFixed(3)} * (1.0 - s) * sin(ph + 1.2);
      }`);
  };
  mat.customProgramCacheKey = () => `swim-${fam}`;
  return mat;
}

/* ---------------------------------------------------------------- assembly, cached per species */
const cache = new Map();
function parts(fish) {
  if (cache.has(fish.id)) return cache.get(fish.id);
  const s = fish.shape, f = { ...FAM[s.fam] };
  if (s.head) f.head *= s.head;
  const silver = ['silver', 'smelt'].includes(fish.look.pat) || s.fam === 'coregonid';
  const bodyMat = new THREE.MeshStandardMaterial({ map: coatTexture(fish, f), roughness: s.fam === 'cottid' || s.fam === 'burbot' || s.fam === 'eel' ? 0.42 : 0.3, metalness: silver ? 0.35 : 0.12 });
  const finTex = finTexture(fish);
  const finMat = new THREE.MeshStandardMaterial({ map: finTex, roughness: 0.55, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false });
  const geos = [];
  const add = (geo, mat) => geos.push([geo, mat]);
  add(bodyGeometry(f, s), bodyMat);
  // dorsal fins
  if (s.fam !== 'stickle') {
    const [d0, d1, dh] = f.dorsal;
    if (s.fused) add(midFin(f, s, d0, (f.dorsal2 || [0, 0.66])[1], dh, 1, 'spiny'), finMat);
    else if (s.sail) add(midFin(f, s, 0.3, 0.6, 0.15, 1, 'sail'), finMat);
    else add(midFin(f, s, d0, d1, dh * (s.longDorsal ? 0.9 : 1), 1, s.fam === 'perch' ? 'spiny' : s.roundFins ? 'round' : s.fam === 'eel' || s.fam === 'burbot' ? 'low' : 'tri'), s.fam === 'perch' && !s.long && !s.fused ? new THREE.MeshStandardMaterial({ map: perchDorsalTexture(finTex), roughness: 0.55, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }) : finMat);
    if (s.longDorsal) add(midFin(f, s, 0.36, 0.62, 0.1, 1, 'round'), finMat);
    if (f.dorsal2 && !s.fused) add(midFin(f, s, f.dorsal2[0], f.dorsal2[1], f.dorsal2[2], 1, s.fam === 'burbot' || s.fam === 'cottid' ? 'low' : 'tri'), finMat);
  } else {
    add(midFin(f, s, f.dorsal[0], f.dorsal[1], f.dorsal[2], 1, 'tri'), finMat);
  }
  if (f.adipose) add(midFin(f, s, 0.73, 0.78, 0.035, 1, 'round'), finMat);
  // anal fin
  const [a0, a1, ah] = f.anal;
  const lowerMat = fish.id === 'char' || fish.id === 'brookt' ? new THREE.MeshStandardMaterial({ map: edgeTexture(finTex, 'rgba(250,248,240,0.95)'), roughness: 0.55, transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false }) : finMat;
  add(midFin(f, s, s.longAnal ? 0.5 : a0, a1, ah, -1, s.fam === 'eel' || s.fam === 'burbot' ? 'low' : fish.id === 'dace' ? 'concave' : s.roundFins ? 'round' : 'tri'), lowerMat);
  if (f.tail !== 'eel') add(tailFin(f, s), finMat);
  // paired fins
  for (const side of [-1, 1]) {
    if (s.fam === 'cottid') add(pairFin(f, s, f.head + 0.02, 0.4, 0.16, 0.9, side, 0.25, 0.55), finMat);
    else if (s.fam !== 'eel') add(pairFin(f, s, f.head + 0.015, 0.55, s.fam === 'salmonid' && fish.id === 'salmon' ? 0.13 : 0.1, 0.5, side, 0.35), lowerMat);
    else add(pairFin(f, s, f.head + 0.01, 0.2, 0.035, 0.4, side, 0.1), finMat);
    if (f.pelvic > 0) add(pairFin(f, s, f.pelvic, 0.92, s.longPelvic ? 0.1 : s.fam === 'cottid' ? 0.07 : 0.08, 0.35, side, 0.75), s.longPelvic ? new THREE.MeshStandardMaterial({ map: edgeTexture(finTex, 'rgba(30,24,16,0.6)'), roughness: 0.55, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }) : lowerMat);
  }
  // eyes
  const eyeR = 0.017 * f.eye * (s.eye || 1) * (s.fam === 'stickle' ? 1.3 : 1);
  const eyeMat = new THREE.MeshStandardMaterial({ map: eyeTexture(fish.look.eye || (s.fam === 'pike' ? '#c8b44a' : s.fam === 'perch' ? '#c89a3a' : '#c9c2a2')), roughness: 0.08, metalness: 0.2 });
  const eu = f.head * (s.fam === 'pike' ? 0.72 : s.fam === 'cottid' ? 0.5 : 0.45);
  const [et, , ew] = section(f, s, eu);
  const eyeGeo = new THREE.SphereGeometry(eyeR, 16, 12);
  // the texture's centre faces out of the side
  eyeGeo.rotateX(Math.PI / 2);
  for (const side of [-1, 1]) {
    const g = eyeGeo.clone(); if (side < 0) g.rotateY(Math.PI);
    g.translate(0.5 - eu, et * (s.fam === 'cottid' ? 0.75 : 0.35), side * ew * (s.fam === 'cottid' ? 0.6 : 0.82));
    add(g, eyeMat);
  }
  // a barbel (burbot: one on the chin; tench: two small at the corners of the mouth)
  const barbMat = new THREE.MeshStandardMaterial({ color: fish.look.fin, roughness: 0.5 });
  if (s.fam === 'burbot') { const b = new THREE.ConeGeometry(0.004, 0.045, 6); b.rotateZ(-2.6); b.translate(0.5 - 0.035, -s.depth * 0.32, 0); add(b, barbMat); }
  if (fish.look.pat === 'tench') for (const side of [-1, 1]) { const b = new THREE.ConeGeometry(0.003, 0.022, 6); b.rotateZ(-2.2); b.translate(0.495, -s.depth * 0.08, side * 0.012); add(b, barbMat); }
  // stickleback spines
  if (s.spines) {
    const spMat = new THREE.MeshStandardMaterial({ color: '#c9c6ae', roughness: 0.4 });
    const n = s.spines;
    for (let i = 0; i < n; i++) {
      const u = n === 3 ? [0.3, 0.42, 0.57][i] : 0.28 + i * 0.035;
      const hgt = n === 3 ? [0.09, 0.08, 0.03][i] : 0.025;
      const [top] = section(f, s, u);
      const sp = new THREE.ConeGeometry(0.0045, hgt, 5);
      sp.rotateZ(0.25);
      sp.translate(0.5 - u, top + hgt * 0.45, 0);
      add(sp, spMat);
    }
    for (const side of [-1, 1]) { const ps = new THREE.ConeGeometry(0.004, 0.06, 5); ps.rotateZ(Math.PI * 0.62); ps.translate(0.5 - f.pelvic, -s.depth * 0.42, side * s.width * 0.3); add(ps, spMat); }
  }
  // every material of this species bends with the body (body, fins, eyes, barbels, spines)
  for (const m of new Set(geos.map(([, mm]) => mm))) swimMaterial(m, s.fam);
  const out = { geos, f };
  cache.set(fish.id, out);
  return out;
}

/** a new group for this species, `lengthM` metres long, snout to +x, centred on the body */
export function buildFish(fish, lengthM = 1) {
  const { geos } = parts(fish);
  const grp = new THREE.Group();
  for (const [g, m] of geos) {
    const mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = m.transparent ? 2 : 1;
    grp.add(mesh);
  }
  grp.scale.setScalar(lengthM);
  grp.userData.fish = fish;
  return grp;
}
/** bend the fish as if swimming: a travelling wave, larger toward the tail (cheap: whole-part offsets) */
export function swimPose(grp, t, amp = 1) {
  grp.rotation.y = Math.sin(t * 6) * 0.08 * amp;
}
export const FAMILIES = Object.keys(FAM);
