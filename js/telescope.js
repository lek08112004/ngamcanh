// The telescope on the hill behind the camp, and what you see through it.
//
// The instrument (stated in the UI): a 90 mm refractor, focal length 900 mm (f/10), on an alt-az
// mount, a 6×30 finder (about 7° of sky), and three eyepieces of 52° apparent field:
//   25 mm → 36×, 1.44° of sky;  10 mm → 90×, 0.58°;  6 mm → 150×, 0.35°.
// For a 90 mm aperture: faintest stars about magnitude 11.8 (2 + 5·log10(90)), the Airy disc's
// radius 1.54″ (1.22 λ/D at 550 nm); the air ("seeing") is taken as 2″.
//
// What you see is not the valley's painted sky zoomed in: it is drawn on a 2D canvas from astro.js,
// projected (gnomonic) about the direction the tube points, for the season's stated night at the
// valley clock's hour (the clock is held while you look). Moon, planets, the named stars and the
// target positions are computed; the faint field stars are generated per patch of sky from a hash
// (the same stars come back to the same place, but they are not a real catalogue) and the inner
// stars of the clusters, the shape of nebulae and the Moon's small craters are illustrations.
// "Minh hoạ tăng cường" adds colour to nebulae and galaxies and is labelled as not what the eye sees.
// The image is shown upright and not mirrored (a real star diagonal would mirror it).
// There is no way to look at the Sun: the telescope is only usable after sunset (Sun below -6°)
// for anything but the Moon and planets, and the Sun itself is never drawn.
import * as THREE from 'three';
import { TARGETS, locate, nightJD, toHorizon, sunAlt, sunPos, darkness, moonPos, planetGeo, planetSize, saturnRingTilt, galilean, SKY_NIGHTS, OBSERVER } from './astro.js';
import { TARGET_INFO, PLEIADES } from './skyinfo.js';
import { CONSTELLATIONS } from './game.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const SCOPE = { x: -2, z: 104 };
const EYEPIECES = [
  { id: 'finder', label: 'Kính tìm 6×30', mag: 6, fov: 7.0, aperture: 30 },
  { id: '25', label: 'Thị kính 25 mm', mag: 36, fov: 52 / 36, aperture: 90 },
  { id: '10', label: 'Thị kính 10 mm', mag: 90, fov: 52 / 90, aperture: 90 },
  { id: '6', label: 'Thị kính 6 mm', mag: 150, fov: 52 / 150, aperture: 90 },
];
const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* ---------------------------------------------------------------- the instrument on the hill */
function buildScope(terrainH) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.45, metalness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe9e6dc, roughness: 0.35, metalness: 0.1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5634, roughness: 0.6 });
  const y0 = terrainH(SCOPE.x, SCOPE.z);
  g.position.set(SCOPE.x, y0, SCOPE.z);
  // three wooden legs and a spreader tray
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI * 2 / 3 + 0.3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 1.22, 8), wood);
    leg.position.set(Math.cos(a) * 0.26, 0.58, Math.sin(a) * 0.26);
    leg.rotation.set(Math.sin(a) * 0.36, 0, -Math.cos(a) * 0.36);
    g.add(leg);
  }
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 3), metal);
  tray.position.y = 0.55; g.add(tray);
  // the head turns in azimuth; the tube tilts in altitude
  const head = new THREE.Group(); head.position.y = 1.17; g.add(head);
  head.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 16), metal), {}));
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.08), metal); arm.position.set(0.07, 0.1, 0); head.add(arm);
  const tilt = new THREE.Group(); tilt.position.set(0, 0.2, 0); head.add(tilt);
  // the tube: dew shield, main tube, focuser, star diagonal, eyepiece (it points along -z)
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.78, 24), white); tube.rotation.x = Math.PI / 2; tilt.add(tube);
  const dew = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.2, 24, 1, true), metal); dew.rotation.x = Math.PI / 2; dew.position.z = -0.47; tilt.add(dew);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.05, metalness: 0.9 })); lens.position.z = -0.4; lens.rotation.y = Math.PI; tilt.add(lens);
  const foc = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.14, 14), metal); foc.rotation.x = Math.PI / 2; foc.position.z = 0.45; tilt.add(foc);
  const diag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.04), metal); diag.position.set(0, 0.015, 0.54); tilt.add(diag);
  const ep = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.07, 12), metal); ep.position.set(0, 0.07, 0.54); tilt.add(ep);
  const finder = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 12), metal); finder.rotation.x = Math.PI / 2; finder.position.set(0.05, 0.075, 0.05); tilt.add(finder);
  return { g, head, tilt };
}

/* ---------------------------------------------------------------- the Moon's face (drawn once per phase) */
// Maria and a few craters by selenographic latitude/longitude (east limb, Mare Crisium, on the right).
const MARIA = [[33, -16, 11], [28, 17.5, 9], [8.5, 31, 10], [17, 59, 5.5], [-8, 51, 7.5], [-15, 35, 4.5], [-21, -17, 8], [18, -57, 16], [-24, -39, 4.5], [56, 1, 5], [13, 3.6, 3], [-10, -23, 5], [20, -40, 10]];
const CRATERS = [[-43, -11, 1.4, 1], [10, -20, 1.5, 1], [8, -38, 0.6, 1], [24, -47, 0.6, 1], [52, -9, 1.6, -1], [-5, -68, 2.2, -1], [-11, 16, 1.2, 0], [-27, -4, 1.0, 0], [-58, -14, 1.8, 0], [-20, 44, 1.2, 0]];
function moonFace(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const R = size / 2;
  // highlands
  const gr = g.createRadialGradient(R, R, 0, R, R, R);
  gr.addColorStop(0, '#d8d5cc'); gr.addColorStop(1, '#bdb9ae');
  g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  const at = (lat, lon) => [R + R * Math.cos(lat * DEG) * Math.sin(lon * DEG), R - R * Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lon * DEG)];
  g.save(); g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.clip();
  // small craters (illustration), then the maria over them
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 420; i++) {
    const lat = Math.asin(rnd() * 2 - 1) / DEG, lon = rnd() * 180 - 90;
    const [x, y, zf] = at(lat, lon); if (zf < 0.05) continue;
    const r = R * (0.003 + 0.011 * rnd() ** 3);
    const sx = Math.max(0.2, Math.abs(Math.cos(lon * DEG))), sy = Math.max(0.2, Math.cos(lat * DEG));
    // a crater: a darker floor and a bright rim on one side
    g.fillStyle = 'rgba(140,136,126,0.28)'; g.beginPath(); g.ellipse(x, y, r * sx, r * sy, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(236,234,226,0.22)'; g.lineWidth = Math.max(0.6, r * 0.25); g.beginPath(); g.ellipse(x, y, r * sx, r * sy, 0, 2.2, 5.2); g.stroke();
  }
  for (const [lat, lon, rad] of MARIA) {
    const [x, y, zf] = at(lat, lon); if (zf < -0.2) continue;
    // each mare as a few overlapping soft patches, so its edge is ragged, not a circle
    const base = R * Math.sin(rad * 1.25 * DEG);
    for (let k = 0; k < 7; k++) {
      const ox = (rnd() - 0.5) * base * 0.9, oy = (rnd() - 0.5) * base * 0.8, rr = base * (0.55 + 0.45 * rnd());
      const rx = rr * Math.max(0.3, Math.cos(lon * DEG)), ry = rr * Math.max(0.35, Math.cos(lat * DEG));
      const mg = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, Math.max(rx, ry));
      mg.addColorStop(0, 'rgba(96,96,94,0.5)'); mg.addColorStop(0.7, 'rgba(100,100,96,0.38)'); mg.addColorStop(1, 'rgba(110,108,102,0)');
      g.fillStyle = mg; g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, 0, 0, Math.PI * 2); g.fill();
    }
  }
  for (const [lat, lon, rad, kind] of CRATERS) {
    const [x, y] = at(lat, lon), r = R * Math.sin(rad * DEG);
    if (kind > 0) {          // bright young craters with rays (Tycho the longest)
      g.strokeStyle = 'rgba(245,244,236,0.18)'; g.lineWidth = Math.max(1, r * 0.25);
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2 + lat; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * (lat < -40 ? 16 : 6), y + Math.sin(a) * r * (lat < -40 ? 16 : 6)); g.stroke(); }
      g.fillStyle = 'rgba(250,250,244,0.9)';
    } else g.fillStyle = kind < 0 ? 'rgba(70,70,68,0.9)' : 'rgba(150,146,136,0.8)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  return c;
}
/** the lit part of the Moon: phase angle i (0 = full), the bright limb toward angle chi (canvas radians) */
function moonLit(face, i, chi) {
  const size = face.width, R = size / 2;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.drawImage(face, 0, 0);
  const img = g.getImageData(0, 0, size, size), d = img.data;
  const sx = Math.sin(i) * Math.cos(chi), sy = Math.sin(i) * Math.sin(chi), sz = Math.cos(i);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x - R + 0.5) / R, ny = (y - R + 0.5) / R, r2 = nx * nx + ny * ny;
    const k = (y * size + x) * 4;
    if (r2 > 1) { d[k + 3] = 0; continue; }
    const nz = Math.sqrt(1 - r2);
    const l = nx * sx + ny * sy + nz * sz;
    // a soft terminator, a little earthshine on the night side
    const lit = clamp(l * 6 + 0.15, 0, 1);
    const sh = 0.035 + 0.965 * lit * (0.75 + 0.25 * Math.max(0, l));
    d[k] *= sh; d[k + 1] *= sh; d[k + 2] *= sh * 1.02;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/* ---------------------------------------------------------------- the controller */
export function createTelescope({ scene, terrainH, store, audio, toast, note }) {
  const model = buildScope(terrainH);
  scene.add(model.g);

  const S = {
    active: false, view: 'finder', az: 160, alt: 25, focus: 0, focusOff: 0, enhance: false,
    assist: store.get('sky.scope', 'assist') === 'assist', target: 'moon', jd: 0, season: 0, hour: 22,
    keys: new Set(), drag: null, hold: 0, slew: null, moonCache: { key: '', img: null }, face: null, focusHold: 0,
  };

  /* ---------- DOM ---------- */
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const wrap = el('div', 'scope hidden'); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'Nhìn qua kính thiên văn');
  const cv = el('canvas', 'scope-canvas'); cv.setAttribute('role', 'img');
  const top = el('div', 'scope-top');
  const title = el('b', 'scope-title'), spec = el('p', 'scope-spec'), skyLine = el('p', 'scope-sky');
  top.append(title, spec, skyLine);
  const side = el('div', 'scope-side');
  const tSel = el('select', 'scope-select'); tSel.setAttribute('aria-label', 'Mục tiêu');
  const goBtn = el('button', 'chip', 'Dẫn ống kính tới'); goBtn.type = 'button';
  const helpRow = el('div', 'scope-row');
  const bAssist = el('button', 'chip', 'Hỗ trợ'); bAssist.type = 'button'; bAssist.title = 'Chọn mục tiêu, ống kính tự quay tới và tự lấy nét';
  const bManual = el('button', 'chip', 'Tự ngắm'); bManual.type = 'button'; bManual.title = 'Tự quay ống kính bằng kính tìm, tự chỉnh nét';
  helpRow.append(bAssist, bManual);
  const epRow = el('div', 'scope-row'); epRow.setAttribute('role', 'group'); epRow.setAttribute('aria-label', 'Thị kính');
  const epBtns = EYEPIECES.map((e, k) => { const b = el('button', 'chip', `${e.label}${e.id === 'finder' ? '' : ` · ${e.mag}×`}`); b.type = 'button'; b.dataset.k = String(k); b.title = `Phím ${k + 1}`; epRow.append(b); return b; });
  const focRow = el('div', 'scope-row');
  const fMinus = el('button', 'chip', 'Nét −'), fPlus = el('button', 'chip', 'Nét +'); fMinus.type = fPlus.type = 'button';
  fMinus.title = 'Giữ để vặn núm lấy nét (phím Q)'; fPlus.title = 'Giữ để vặn núm lấy nét (phím E)';
  const bEnh = el('button', 'chip', 'Minh hoạ tăng cường'); bEnh.type = 'button'; bEnh.setAttribute('aria-pressed', 'false'); bEnh.title = 'Thêm màu cho tinh vân và thiên hà như ảnh chụp phơi sáng. Mắt nhìn qua thị kính không thấy như vậy';
  focRow.append(fMinus, fPlus, bEnh);
  const bExit = el('button', 'btn', 'Rời kính · Esc'); bExit.type = 'button';
  const more = el('button', 'chip scope-more', 'Thị kính, nét…'); more.type = 'button'; more.setAttribute('aria-expanded', 'false');
  more.addEventListener('click', () => { const on = !side.classList.contains('open'); side.classList.toggle('open', on); more.setAttribute('aria-expanded', String(on)); });
  for (const k of [tSel, goBtn, more, bExit]) k.classList.add('keep');
  side.append(el('label', 'scope-label', 'Mục tiêu'), tSel, goBtn, more, el('span', 'scope-label', 'Cách ngắm'), helpRow, el('span', 'scope-label', 'Thị kính'), epRow, el('span', 'scope-label', 'Lấy nét'), focRow, bExit);
  const bottom = el('div', 'scope-bottom'); bottom.setAttribute('aria-live', 'polite');
  const card = el('div', 'scope-card hidden');
  const keysHint = el('p', 'scope-keys', 'Kéo hoặc W A S D / phím mũi tên: quay ống kính (Shift: chậm) · 1–4: đổi thị kính · Q / E: lấy nét · Esc: rời kính');
  wrap.append(cv, top, side, bottom, card, keysHint);
  document.body.append(wrap);
  for (const t of TARGETS) { const o = el('option', '', t.vi); o.value = t.id; tSel.append(o); }

  const ctx = cv.getContext('2d');
  let dpr = 1;
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); };

  /* ---------- the sky around the pointing ---------- */
  const enu = (alt, az) => [Math.cos(alt * DEG) * Math.sin(az * DEG), Math.cos(alt * DEG) * Math.cos(az * DEG), Math.sin(alt * DEG)];
  let F, Rt, U;
  function frame() {
    F = enu(S.alt, S.az);
    Rt = [Math.cos(S.az * DEG), -Math.sin(S.az * DEG), 0];
    U = [-Math.sin(S.alt * DEG) * Math.sin(S.az * DEG), -Math.sin(S.alt * DEG) * Math.cos(S.az * DEG), Math.cos(S.alt * DEG)];
  }
  /** an alt/az to field coordinates in degrees (x right, y up), or null if behind */
  function proj(alt, az) {
    const v = enu(alt, az);
    const d = v[0] * F[0] + v[1] * F[1] + v[2] * F[2];
    if (d <= 0.2) return null;
    return [(v[0] * Rt[0] + v[1] * Rt[1] + v[2] * Rt[2]) / d / DEG, (v[0] * U[0] + v[1] * U[1] + v[2] * U[2]) / d / DEG];
  }
  const radec = (ra, dec) => { const h = toHorizon(ra, dec, S.jd); return proj(h.alt, h.az); };
  // faint field stars: per patch of sky (0.5° in declination), a fixed handful from a hash
  const cells = new Map();
  function cellStars(i, j) {
    const key = i * 4096 + j;
    let c = cells.get(key);
    if (c) return c;
    c = [];
    const dec0 = -90 + i * 0.5, w = 0.5 / Math.max(0.05, Math.cos((dec0 + 0.25) * DEG));
    const n = 8 + Math.floor(hash(i, j) * 10);
    for (let k = 0; k < n; k++) {
      const u = hash(i * 31 + k, j * 17 - k);
      const mag = clamp(11.8 + Math.log10(Math.max(1e-4, u)) / 0.33, 5.8, 11.8);
      c.push({ ra: (j * w + hash(k, i * 7 + j) * w) / 15, dec: dec0 + hash(j, k * 13 + i) * 0.5, mag, col: hash(k * 3, i + j) });
    }
    if (cells.size > 3000) cells.clear();
    cells.set(key, c);
    return c;
  }
  // named bright stars for finding your way (the constellations' stars: real positions, magnitude ~3 assumed)
  const BRIGHT = [];
  for (const cdef of CONSTELLATIONS) for (const [ra, dec] of cdef.stars) BRIGHT.push({ ra, dec, mag: 2.6 });
  for (const [, ra, dec, mag] of PLEIADES) BRIGHT.push({ ra, dec, mag });

  /* ---------- drawing ---------- */
  function drawStar(x, y, mag, pxPerDeg, lim, blur, col = '#ffffff') {
    if (mag > lim + 0.3) return;
    const k = clamp((lim + 0.5 - mag) / 6, 0.05, 1.4);
    const seeing = Math.max(1.2 * dpr, (2.0 / 3600) * pxPerDeg);
    const r = seeing * (0.8 + 1.4 * k) + blur;
    if (blur > 1.5 * dpr) {
      // out of focus: a doughnut (the secondary is not there in a refractor, but a defocused star is a soft disc with a brighter rim)
      ctx.strokeStyle = col; ctx.globalAlpha = Math.min(0.9, k * 0.5 * (3 * dpr / blur)); ctx.lineWidth = Math.max(1, blur * 0.25);
      ctx.beginPath(); ctx.arc(x, y, blur, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, col); g.addColorStop(0.35, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = Math.min(1, k);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function draw() {
    const W = cv.width, H = cv.height;
    const ep = EYEPIECES[viewIndex()];
    const sideR = side.getBoundingClientRect();
    const below = innerWidth <= 700 ? Math.max(0, innerHeight - sideR.top) * dpr : 0;
    const top0 = innerWidth <= 700 ? top.getBoundingClientRect().bottom * dpr : 0;
    const freeH = H - below - top0;
    const cx = W / 2, cy = top0 + freeH / 2, R = Math.min(W, freeH) * 0.44;
    const pxPerDeg = R / (ep.fov / 2);
    frame();
    const sa = sunAlt(S.jd);
    const skyB = clamp((sa + 12) / 12, 0, 1);              // 0 = dark, 1 = civil twilight or brighter
    const lim = (ep.id === 'finder' ? 9.5 : 11.8) - 6 * skyB - (moonUp() ? 1.0 : 0);
    const blur = ep.id === 'finder' ? 0 : Math.abs(S.focus - S.focusOff) * 22 * dpr * (ep.mag / 90);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    // the sky's own glow (twilight, moonlight)
    const sky = skyB > 0 ? `rgb(${Math.round(18 + 50 * skyB)},${Math.round(26 + 70 * skyB)},${Math.round(44 + 100 * skyB)})` : moonUp() ? '#0b0f18' : '#04060a';
    ctx.fillStyle = sky; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    const P = (p) => [cx + p[0] * pxPerDeg, cy - p[1] * pxPerDeg];
    const inField = (p, m = 0) => p && Math.hypot(p[0], p[1]) < ep.fov / 2 + m;
    // the ground: the mount will not go below 2°, but the field can show the hill's edge
    {
      const hz = proj(0, S.az);
      if (hz && S.alt < ep.fov) {
        const [, gy] = P(hz);
        ctx.fillStyle = '#05070a'; ctx.fillRect(cx - R, gy, 2 * R, cy + R - gy);
      }
    }
    // faint stars (illustration) by patch
    const pad = ep.fov * 0.75;
    const cen = toHorizonInv();
    const i0 = Math.floor((cen.dec - pad + 90) / 0.5), i1 = Math.floor((cen.dec + pad + 90) / 0.5);
    for (let i = Math.max(0, i0); i <= Math.min(359, i1); i++) {
      const dec0 = -90 + i * 0.5, w = 0.5 / Math.max(0.05, Math.cos((dec0 + 0.25) * DEG));
      const span = pad / Math.max(0.05, Math.cos(clamp(Math.abs(dec0) + 0.5, 0, 89.5) * DEG)) + w;
      const j0 = Math.floor((cen.ra * 15 - span) / w), j1 = Math.floor((cen.ra * 15 + span) / w);
      if (j1 - j0 > 400) continue;
      for (let j = j0; j <= j1; j++) for (const st of cellStars(i, j)) {
        if (st.mag > lim) continue;
        const p = radec(st.ra, st.dec);
        if (!inField(p, 0.1)) continue;
        const [x, y] = P(p);
        drawStar(x, y, st.mag, pxPerDeg, lim, blur, st.col < 0.2 ? '#ffd9b0' : st.col > 0.85 ? '#cfe0ff' : '#ffffff');
      }
    }
    for (const st of BRIGHT) { const p = radec(st.ra, st.dec); if (inField(p, 0.1)) { const [x, y] = P(p); drawStar(x, y, st.mag, pxPerDeg, lim, blur); } }
    // the targets
    for (const t of TARGETS) drawTarget(t, P, inField, pxPerDeg, lim, blur, ep);
    ctx.restore();
    // the eyepiece's edge, and the finder's cross-hair with the main tube's field marked
    ctx.strokeStyle = 'rgba(120,130,140,0.35)'; ctx.lineWidth = 2 * dpr;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    if (ep.id === 'finder') {
      ctx.strokeStyle = 'rgba(200,60,40,0.75)'; ctx.lineWidth = 1 * dpr;
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx - 6 * dpr, cy); ctx.moveTo(cx + 6 * dpr, cy); ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy - 6 * dpr); ctx.moveTo(cx, cy + 6 * dpr); ctx.lineTo(cx, cy + R); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,150,0.3)';
      ctx.beginPath(); ctx.arc(cx, cy, (EYEPIECES[1].fov / 2) * pxPerDeg, 0, Math.PI * 2); ctx.stroke();
    }
    // where the chosen target is, if it is outside the field
    const t = TARGETS.find((x) => x.id === S.target);
    const loc = locate(t, S.jd);
    const p = proj(loc.alt, loc.az);
    // (never pointing into the ground: a target below the horizon gets a line of text, no arrow)
    if (loc.alt > 0 && (!p || Math.hypot(p[0], p[1]) > ep.fov / 2)) {
      const ang = p ? Math.atan2(-p[1], p[0]) : Math.atan2(-(loc.alt - S.alt), ((loc.az - S.az + 540) % 360) - 180);
      const ax = cx + Math.cos(ang) * (R + 22 * dpr), ay = cy + Math.sin(ang) * (R + 22 * dpr);
      ctx.fillStyle = 'rgba(255,214,140,0.85)';
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(10 * dpr, 0); ctx.lineTo(-6 * dpr, -7 * dpr); ctx.lineTo(-6 * dpr, 7 * dpr); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    return { p, loc, ep, skyB, blur };
  }
  function moonUp() { const m = moonPos(S.jd); return toHorizon(m.ra, m.dec, S.jd).alt > 0; }
  /** the ra/dec at the centre of the field (for the field-star patches) */
  function toHorizonInv() {
    // from (alt, az) back to (ra, dec): the inverse of astro.toHorizon
    const lat = OBSERVER.lat * DEG, a = S.alt * DEG, A = S.az * DEG;
    const dec = Math.asin(Math.sin(lat) * Math.sin(a) + Math.cos(lat) * Math.cos(a) * Math.cos(A));
    const H = Math.atan2(-Math.sin(A) * Math.cos(a), Math.cos(lat) * Math.sin(a) - Math.sin(lat) * Math.cos(a) * Math.cos(A));
    const lst = (gmstDeg(S.jd) + OBSERVER.lon) * DEG;
    let ra = (lst - H) / DEG / 15; ra = ((ra % 24) + 24) % 24;
    return { ra, dec: dec / DEG };
  }
  function drawTarget(t, P, inField, pxPerDeg, lim, blur, ep) {
    const loc = locate(t, S.jd);
    if (loc.alt < -1) return;
    const p = proj(loc.alt, loc.az);
    const big = t.kind === 'moon' ? 0.3 : t.size ? t.size / 120 : 0.05;
    if (!inField(p, big + 0.05)) return;
    const [x, y] = P(p);
    const soft = blur > 0 ? `blur(${(blur * 0.6).toFixed(1)}px)` : 'none';
    // which way is celestial north here (for orienting discs and pairs)
    const pn = radec(loc.ra, loc.dec + 0.2), northAng = pn ? Math.atan2(-(pn[1] - p[1]), pn[0] - p[0]) : -Math.PI / 2;
    if (t.kind === 'moon') {
      const m = loc.moon, rpx = (0.2725 * 3474.2 / 2 / m.dist) / DEG * pxPerDeg * 2 * 1.0;
      const rr = Math.atan(1737.4 / m.dist) / DEG * pxPerDeg;
      const s = sunPos(S.jd), sh = toHorizon(s.ra, s.dec, S.jd), ps = proj(sh.alt, sh.az);
      // the bright limb faces the Sun: its direction in the field (if the Sun is behind, use the great-circle direction)
      let chi;
      if (ps) chi = Math.atan2(-(ps[1] - p[1]), ps[0] - p[0]);
      else { const v = enu(sh.alt, sh.az), d = Math.max(1e-6, Math.hypot(v[0] * Rt[0] + v[1] * Rt[1], v[2] * U[2] + v[0] * U[0] + v[1] * U[1])); chi = Math.atan2(-((v[0] * U[0] + v[1] * U[1] + v[2] * U[2]) / d), (v[0] * Rt[0] + v[1] * Rt[1] + v[2] * Rt[2]) / d); }
      const ph = Math.PI - m.elong * DEG;
      const key = `${Math.round(ph * 30)}|${Math.round(chi * 20)}|${Math.round(northAng * 20)}`;
      if (S.moonCache.key !== key) {
        if (!S.face) S.face = moonFace(512);
        // rotate the face so its north points to celestial north, then light it
        const rot = document.createElement('canvas'); rot.width = rot.height = 512;
        const rg = rot.getContext('2d'); rg.translate(256, 256); rg.rotate(northAng + Math.PI / 2); rg.drawImage(S.face, -256, -256);
        S.moonCache = { key, img: moonLit(rot, ph, chi) };
      }
      ctx.filter = soft;
      ctx.drawImage(S.moonCache.img, x - rr, y - rr, rr * 2, rr * 2);
      ctx.filter = 'none';
      void rpx;
      return;
    }
    if (t.kind === 'planet') {
      const pl = loc.planet, diam = planetSize(t.planet, pl.dist);
      const r = Math.max(1.3 * dpr, diam / 3600 / 2 * pxPerDeg);
      ctx.save(); ctx.translate(x, y); ctx.rotate(northAng + Math.PI / 2);
      // a small telescope at this power softens everything by the seeing (~2″)
      ctx.filter = `blur(${Math.max(0.4, (2 / 3600) * pxPerDeg * 0.5 + blur * 0.6).toFixed(1)}px)`;
      if (t.planet === 'jupiter') {
        // the four moons along the equator (Meeus): positive x = west
        for (const mo of galilean(S.jd)) {
          if (mo.behind && Math.abs(mo.x) < 1) continue;
          drawStar(mo.x * r, 0, 5.5, pxPerDeg, lim, blur, '#fff6e0');           // north up: west is to the right
        }
        ctx.scale(1, 0.935);
        const g = ctx.createLinearGradient(0, -r, 0, r);
        g.addColorStop(0, '#b89a78'); g.addColorStop(0.3, '#ecdcc0'); g.addColorStop(0.4, '#a87a58'); g.addColorStop(0.46, '#ecdcc0'); g.addColorStop(0.56, '#f2e6cc'); g.addColorStop(0.62, '#a8805c'); g.addColorStop(0.7, '#ecdcc0'); g.addColorStop(1, '#b89a78');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      } else if (t.planet === 'saturn') {
        const B = saturnRingTilt(S.jd) * DEG, k = Math.max(0.012, Math.abs(Math.sin(B)));
        const ring = (ro, ri, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, ro * r, ro * r * k, 0, 0, Math.PI * 2); ctx.ellipse(0, 0, ri * r, ri * r * k, 0, 0, Math.PI * 2, true); ctx.fill('evenodd'); };
        const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#c8b07a'); g.addColorStop(0.5, '#ecdcae'); g.addColorStop(1, '#c0a874');
        ring(2.27, 1.95, 'rgba(214,200,160,0.8)'); ring(1.92, 1.53, 'rgba(236,222,186,0.95)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
        // the near half of the rings crosses in front of the ball
        ctx.save(); ctx.beginPath(); ctx.rect(-3 * r, B < 0 ? -3 * r : 0, 6 * r, 3 * r); ctx.clip();
        ring(2.27, 1.95, 'rgba(214,200,160,0.8)'); ring(1.92, 1.53, 'rgba(236,222,186,0.95)'); ctx.restore();
      } else {
        const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
        g.addColorStop(0, '#e6936a'); g.addColorStop(1, '#a8502e');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        if (r > 4 * dpr) { ctx.fillStyle = 'rgba(250,246,236,0.85)'; ctx.beginPath(); ctx.ellipse(0, -r * 0.82, r * 0.35, r * 0.15, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
      ctx.filter = 'none';
      return;
    }
    if (t.kind === 'double') {
      // position angle: from north through east (with north up and the image not mirrored, east is to the left)
      const off = (sep, pa) => { const a = northAng - pa * DEG; return [x + Math.cos(a) * sep / 3600 * pxPerDeg, y + Math.sin(a) * sep / 3600 * pxPerDeg]; };
      drawStar(x, y, t.mag, pxPerDeg, lim, blur, t.col);
      const [bx, by] = off(t.sep, t.pa);
      drawStar(bx, by, t.comp.mag, pxPerDeg, lim, blur, t.comp.col);
      if (t.wide) { const [wx, wy] = off(t.wide.sepArcmin * 60, t.wide.pa); drawStar(wx, wy, t.wide.mag, pxPerDeg, lim, blur); }
      return;
    }
    if (t.id === 'pleiades') {
      for (let k = 0; k < 70; k++) {           // the fainter members: illustration
        const a = hash(k, 3) * Math.PI * 2, d = Math.sqrt(hash(k, 9)) * 0.9;
        const q = radec(t.ra + Math.cos(a) * d / 15 / Math.cos(t.dec * DEG), t.dec + Math.sin(a) * d);
        if (inField(q)) { const [qx, qy] = P(q); drawStar(qx, qy, 7 + hash(k, 5) * 4, pxPerDeg, lim, blur, '#e4ecff'); }
      }
      if (S.enhance) glow(x, y, 0.8 * pxPerDeg, 'rgba(120,160,255,0.18)');
      return;            // the nine bright ones are in BRIGHT
    }
    if (t.id === 'double') {
      for (const [ra, dec, seed] of [[2.317, 57.15, 1], [2.367, 57.133, 2]]) {
        for (let k = 0; k < 90; k++) {
          const a = hash(k, seed * 7) * Math.PI * 2, d = Math.pow(hash(k, seed * 13), 1.6) * 0.17;
          const q = radec(ra + Math.cos(a) * d / 15 / Math.cos(dec * DEG), dec + Math.sin(a) * d);
          if (inField(q)) { const [qx, qy] = P(q); drawStar(qx, qy, 6.6 + hash(k, seed) * 4.5, pxPerDeg, lim, blur, hash(k, 2) < 0.12 ? '#ffc890' : '#eef2ff'); }
        }
      }
      return;
    }
    // nebulae and galaxies: low-contrast grey through the eyepiece; colour only when "tăng cường"
    const darkK = clamp(1 - (moonUp() ? 0.45 : 0) - S_sky * 1.0, 0.05, 1);
    ctx.save(); ctx.translate(x, y); ctx.rotate(northAng + Math.PI / 2);
    ctx.filter = blur > 0 ? `blur(${(blur * 0.5).toFixed(1)}px)` : 'none';
    if (t.id === 'm31') {
      ctx.rotate(55 * DEG);                 // major axis at position angle ~35° (approximate)
      const rx = 3.17 / 2 * pxPerDeg, ry = 0.5 * pxPerDeg;
      ellipseGlow(0, 0, rx, ry, S.enhance ? 'rgba(255,236,210,0.32)' : `rgba(200,205,210,${0.16 * darkK})`);
      ellipseGlow(0, 0, rx * 0.12, ry * 0.25, `rgba(235,235,230,${0.55 * darkK})`);
      if (S.enhance) { ctx.strokeStyle = 'rgba(80,60,40,0.35)'; ctx.lineWidth = 3 * dpr; ctx.beginPath(); ctx.ellipse(0, -ry * 0.15, rx * 0.6, ry * 0.45, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
    } else if (t.id === 'm42') {
      const r = 32 / 60 * pxPerDeg;
      ellipseGlow(0, r * 0.15, r, r * 0.85, S.enhance ? 'rgba(255,110,150,0.35)' : `rgba(190,205,200,${0.22 * darkK})`);
      ellipseGlow(-r * 0.1, -r * 0.05, r * 0.35, r * 0.3, S.enhance ? 'rgba(120,230,220,0.4)' : `rgba(210,222,218,${0.35 * darkK})`);
      for (const [dx, dy, m] of [[-6, 4, 6.7], [5, 2, 7.9], [0, -5, 5.1], [8, -6, 6.7]]) drawStar(dx / 3600 * pxPerDeg * 2, dy / 3600 * pxPerDeg * 2, m, pxPerDeg, lim, blur);
    } else if (t.id === 'm57') {
      const rx = 0.75 / 60 * pxPerDeg, ry = 0.5 / 60 * pxPerDeg;
      ctx.strokeStyle = S.enhance ? 'rgba(120,220,200,0.6)' : `rgba(200,210,210,${0.45 * darkK})`;
      ctx.lineWidth = Math.max(1, rx * 0.45);
      ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.75, ry * 0.75, 0, 0, Math.PI * 2); ctx.stroke();
      if (S.enhance) { ctx.strokeStyle = 'rgba(255,90,70,0.45)'; ctx.lineWidth = Math.max(1, rx * 0.2); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
    ctx.filter = 'none';
  }
  let S_sky = 0;
  function ellipseGlow(x, y, rx, ry, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / Math.max(rx, 1e-3));
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function glow(x, y, r, col) { ellipseGlow(x, y, r, r, col); }
  function gmstDeg(jd) { const T = (jd - 2451545) / 36525; return (((280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T) % 360) + 360) % 360; }

  /* ---------- controls ---------- */
  const viewIndex = () => EYEPIECES.findIndex((e) => e.id === S.view);
  function setView(k) {
    const prev = S.view;
    S.view = EYEPIECES[k].id;
    epBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === k)));
    // a new eyepiece is not quite at the same focus (manual); assisted focusing finds it
    if (prev !== S.view && S.view !== 'finder' && !S.assist) S.focusOff = (Math.random() - 0.5) * 0.5;
    if (S.assist) S.focus = S.focusOff;
    audio.tap(0, 0.6);
    updateSpec();
  }
  function setAssist(on) {
    S.assist = on;
    store.set('sky.scope', on ? 'assist' : 'manual');
    bAssist.setAttribute('aria-pressed', String(on)); bManual.setAttribute('aria-pressed', String(!on));
    goBtn.disabled = !on;
    goBtn.title = on ? 'Ống kính tự quay tới mục tiêu đã chọn' : 'Ở chế độ Tự ngắm: dùng kính tìm và mũi tên vàng ở mép để tự quay tới';
    if (on) S.focus = S.focusOff;
  }
  function updateSpec() {
    const ep = EYEPIECES[viewIndex()];
    title.textContent = ep.id === 'finder' ? 'Kính tìm 6×30 · trường nhìn khoảng 7°' : `${ep.label} · ${ep.mag}× · trường nhìn ${ep.fov.toFixed(2).replace('.', ',')}°`;
    spec.textContent = 'Kính khúc xạ 90 mm, tiêu cự 900 mm (f/10), giá alt-az. Sao mờ nhất khoảng cấp 11,8; giới hạn tách 1,3″; không khí làm nhoè khoảng 2″. Ảnh thẳng, không lật gương.';
  }
  bAssist.addEventListener('click', () => setAssist(true));
  bManual.addEventListener('click', () => setAssist(false));
  epBtns.forEach((b, k) => b.addEventListener('click', () => setView(k)));
  tSel.addEventListener('change', () => { S.target = tSel.value; showCard(false); });
  goBtn.addEventListener('click', () => slewTo(S.target));
  bEnh.addEventListener('click', () => { S.enhance = !S.enhance; bEnh.setAttribute('aria-pressed', String(S.enhance)); });
  bExit.addEventListener('click', () => api.exit());
  const holdBtn = (b, d) => {
    b.addEventListener('pointerdown', () => { S.focusHold = d; });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { S.focusHold = 0; });
  };
  holdBtn(fMinus, -1); holdBtn(fPlus, 1);
  cv.addEventListener('pointerdown', (e) => { S.drag = [e.clientX, e.clientY]; S.slew = null; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
  cv.addEventListener('pointermove', (e) => {
    if (!S.drag) return;
    const ep = EYEPIECES[viewIndex()], R = Math.min(innerWidth, innerHeight * 0.7) * 0.44, k = (ep.fov / 2) / R;
    // dragging the sky: the field follows your finger
    S.az = (S.az - (e.clientX - S.drag[0]) * k / Math.max(0.15, Math.cos(S.alt * DEG)) + 360) % 360;
    S.alt = clamp(S.alt + (e.clientY - S.drag[1]) * k, 2, 89);
    S.drag = [e.clientX, e.clientY];
  });
  const endDrag = () => { S.drag = null; };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); if (!S.assist) S.focus = clamp(S.focus + (e.deltaY > 0 ? -0.02 : 0.02), -1, 1); }, { passive: false });

  function slewTo(id) {
    const t = TARGETS.find((x) => x.id === id), loc = locate(t, S.jd);
    if (loc.alt < 2) { toast(`${t.vi} đang ở dưới chân trời (cao ${Math.round(loc.alt)}°) trong đêm mô phỏng này`); return; }
    S.slew = { az: loc.az, alt: loc.alt };
  }
  function showCard(on, t) {
    card.classList.toggle('hidden', !on);
    if (!on || !t) return;
    const info = TARGET_INFO[t.id];
    card.innerHTML = '';
    const h = el('h3', '', t.vi);
    const tag = el('p', 'eyebrow', 'Đã ghi vào Sổ quan sát');
    card.append(tag, h, el('p', '', info.eye), el('p', '', info.fact), el('p', 'scope-small', `Cách vẽ: ${info.draw}`));
    const src = el('p', 'scope-small'); src.textContent = 'Nguồn: ' + info.src.map(([n]) => n).join('; ');
    const close = el('button', 'chip', 'Đóng'); close.type = 'button'; close.addEventListener('click', () => showCard(false));
    card.append(src, close);
  }

  /* ---------- per frame ---------- */
  let lastBottom = '';
  const api = {
    get active() { return S.active; },
    state: S, model,
    near(x, z) { return Math.hypot(x - SCOPE.x, z - SCOPE.z) < 2.2; },
    enter(season, hour) {
      S.active = true; S.season = season; S.hour = hour; S.jd = nightJD(season, hour);
      size();
      wrap.classList.remove('hidden');
      document.body.classList.add('scoping');
      setAssist(store.get('sky.scope', 'assist') === 'assist');
      tSel.value = S.target;
      setView(0);
      // start pointing where the tube was left (or at the chosen target, low and roughly)
      const n = SKY_NIGHTS[season];
      skyLine.textContent = `Bầu trời mô phỏng: ${n.label}, ${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')} giờ địa phương, ${OBSERVER.name} · ${darkness(S.jd)}. Đồng hồ thung lũng dừng khi bạn nhìn qua kính.`;
      if (sunAlt(S.jd) > -0.8) toast('Trời đang sáng. Kính này không bao giờ được hướng vào Mặt Trời; hãy quay lại sau hoàng hôn. Mặt Trăng và hành tinh sáng vẫn có thể thấy lúc chạng vạng');
      showCard(false);
      setTimeout(() => { try { tSel.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 60);
    },
    exit() {
      if (!S.active) return;
      S.active = false; S.keys.clear(); S.focusHold = 0;
      wrap.classList.add('hidden');
      document.body.classList.remove('scoping');
      // focus back where you came from: the action button by the telescope
      const back = document.getElementById('actBtn');
      if (back && !back.classList.contains('hidden')) { try { back.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    },
    resize() { if (S.active) size(); },
    /** keyboard while looking (returns true if used) */
    key(e, down) {
      const k = e.key.toLowerCase();
      if (!down) { S.keys.delete(k); if (k === 'q' || k === 'e') S.focusHold = 0; return true; }
      if (e.target instanceof HTMLSelectElement && ['arrowup', 'arrowdown'].includes(k)) return false;
      if (k === 'escape') { if (!card.classList.contains('hidden')) showCard(false); else api.exit(); return true; }
      if (k >= '1' && k <= '4') { setView(Number(k) - 1); return true; }
      if (k === 'q') { S.focusHold = -1; return true; }
      if (k === 'e') { S.focusHold = 1; return true; }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { S.keys.add(k); e.preventDefault(); S.slew = null; return true; }
      return true;
    },
    update(dt) {
      // the model on the hill follows the tube
      model.head.rotation.y = -S.az * DEG + Math.PI;
      model.tilt.rotation.x = S.alt * DEG;
      if (!S.active) return;
      const ep = EYEPIECES[viewIndex()];
      // slewing: speed scales with the field (fine at high power), slower with Shift
      const sp = ep.fov * (S.keys.has('shift') ? 0.12 : 0.6) * dt;
      let dx = 0, dy = 0;
      if (S.keys.has('a') || S.keys.has('arrowleft')) dx -= 1;
      if (S.keys.has('d') || S.keys.has('arrowright')) dx += 1;
      if (S.keys.has('w') || S.keys.has('arrowup')) dy += 1;
      if (S.keys.has('s') || S.keys.has('arrowdown')) dy -= 1;
      if (dx || dy) { S.az = (S.az + dx * sp / Math.max(0.15, Math.cos(S.alt * DEG)) + 360) % 360; S.alt = clamp(S.alt + dy * sp, 2, 89); }
      if (S.slew) {
        let da = ((S.slew.az - S.az + 540) % 360) - 180, dl = S.slew.alt - S.alt;
        const k = 1 - Math.exp(-dt * 3);
        S.az = (S.az + da * k + 360) % 360; S.alt = clamp(S.alt + dl * k, 2, 89);
        if (Math.abs(da) < 0.005 && Math.abs(dl) < 0.005) S.slew = null;
      }
      if (S.focusHold && !S.assist) S.focus = clamp(S.focus + S.focusHold * dt * 0.25, -1, 1);
      if (S.assist) S.focus += (S.focusOff - S.focus) * (1 - Math.exp(-dt * 4));
      S_sky = clamp((sunAlt(S.jd) + 12) / 12, 0, 1);
      const r = draw();
      // what is in the middle, and recording an observation
      const t = TARGETS.find((x) => x.id === S.target);
      let line = '';
      const centred = r.p && Math.hypot(r.p[0], r.p[1]) < (r.ep.fov / 2) * (t.kind === 'galaxy' || t.id === 'pleiades' ? 0.6 : 0.35);
      const sharp = r.ep.id !== 'finder' && Math.abs(S.focus - S.focusOff) < 0.08;
      const dark = t.kind === 'moon' || t.kind === 'planet' ? sunAlt(S.jd) < -0.8 : sunAlt(S.jd) < -6;
      if (r.loc.alt < 2) line = `${t.vi}: dưới chân trời trong đêm mô phỏng này (cao ${Math.round(r.loc.alt)}°)`;
      else if (!dark) line = `${t.vi}: trời còn quá sáng để thấy`;
      else if (centred && r.ep.id === 'finder') line = `${t.vi} nằm giữa kính tìm. Chuyển sang thị kính 25 mm (phím 2)`;
      else if (centred && !sharp) line = S.assist ? 'Đang lấy nét…' : `${t.vi} ở giữa thị trường nhưng còn nhoè: giữ Q hoặc E để vặn núm lấy nét`;
      else if (centred) {
        S.hold += dt;
        line = `${t.vi} · cao ${Math.round(r.loc.alt)}°, phương vị ${Math.round(r.loc.az)}°`;
        if (S.hold > 2 && record(t)) showCard(true, t);
      } else { S.hold = 0; line = r.p ? `Mục tiêu ${t.vi} ở gần, theo mũi tên vàng ở mép` : `Mũi tên vàng ở mép chỉ về phía ${t.vi} (cao ${Math.round(r.loc.alt)}°, phương vị ${Math.round(r.loc.az)}°)`; }
      if (!centred) S.hold = 0;
      if (line !== lastBottom) { lastBottom = line; bottom.textContent = line; }
      cv.setAttribute('aria-label', `Thị trường kính thiên văn. ${line}`);
    },
  };
  function record(t) {
    const obs = store.get('sky.obs', []);
    if (obs.includes(t.id)) return false;
    store.set('sky.obs', [...obs, t.id]);
    store.set('sky.first', [...store.get('sky.first', []), `${t.id}|${S.season}|${Math.round(S.hour)}`]);
    note(`o:${t.id}`);
    audio.node(obs.length + 1);
    toast(`Đã quan sát ${t.vi}. Ghi vào Sổ quan sát`);
    return true;
  }
  addEventListener('resize', () => api.resize());
  return api;
}
export { EYEPIECES };
