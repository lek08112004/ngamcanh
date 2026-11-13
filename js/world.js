import * as THREE from 'three';
import { terrainVertex, terrainFragment } from './shaders/terrain.js';
import {
  grassVertex, grassFragment, flowerVertex, flowerFragment, fireflyVertex, fireflyFragment,
} from './shaders/grass.js';
import { CABIN, CAMP } from './layout.js';

export { CABIN, CAMP };
import { flameVertex, flameFragment, emberVertex, emberFragment, smokeVertex, smokeFragment } from './shaders/fire.js';
import { tulipVertex, tulipFragment } from './shaders/tulip.js';
import { mountainVertex, mountainFragment } from './shaders/mountains.js';

/* ---------- deterministic random ---------- */
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- landscape functions (mirrored in shaders/terrain.js) ---------- */
const smooth = (t) => {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
};

export function streamX(z) {
  return 4 + 9 * Math.sin(z * 0.028 + 0.4) + 3 * Math.sin(z * 0.071 + 2.0)
    + 70 * Math.exp(Math.min((z + 18) * 0.11, 6));
}
export function streamW(z) {
  const d = (z + 95) / 14;
  return 2.6 + 1.1 * Math.sin(z * 0.05 + 1.0) + 5.0 * Math.exp(-d * d);
}

export function terrainH(x, z) {
  let r = 1.2 * Math.sin(x * 0.031 + 1.3) * Math.cos(z * 0.027 - 0.4)
    + 0.7 * Math.sin(x * 0.058 + z * 0.043 + 2.0)
    + 0.3 * Math.sin(x * 0.13 - 0.7) * Math.sin(z * 0.11 + 0.5);
  const hill = 9.5 * smooth((z + 58) / 62);            // viewer's knoll
  const side = 18 * smooth((Math.abs(x - 4) - 55) / 130);
  const far = 16 * smooth((-z - 170) / 220);
  const back = 12 * smooth((z - 45) / 110);       // hills behind the camp
  const dv = Math.abs(x - streamX(z));
  const flat = smooth((dv - 2) / 14);
  const inValley = 1 - smooth((z + 50) / 25);
  r *= 1 - inValley * (1 - flat);
  return r + hill + side + far + back - 0.6 * inValley * (1 - flat);
}

/* ---------- terrain ---------- */
export function createTerrain(shared, quality = 1) {
  // the world now surrounds the walker on every side
  const W = 1100, D = 1000, SX = 250, SZ = 228;
  const geo = new THREE.PlaneGeometry(W, D, SX, SZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -150);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, terrainH(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    vertexShader: terrainVertex,
    fragmentShader: terrainFragment,
    defines: { TERRAIN_Q: quality },
    uniforms: {
      ...shared.aurora,
      ...shared.light,
      uGrassFar: shared.uGrassFar,
      uTime: shared.uTime,
      uAuroraTint: shared.uAuroraTint,
      uCabinLight: shared.uCabinLight,
      uFireLight: shared.uFireLight,
      uAmb: shared.uAmb,
      uSunCol: shared.uSunCol,
      uSunDir: shared.uSunDir,
      uDay: shared.uDay,
      uFogColor: shared.uFogColor,
      uFogDensity: shared.uFogDensity,
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

/* ---------- distant mountains ---------- */
/* ---------- value noise on the CPU (for the mountain ring) ---------- */
function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  let fx = x - ix, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
const MOUNTAIN = { cx: 0, cz: -150, r0: 430, r1: 1050 };
/** how far the fjells rise above the valley floor at (x, z) */
export function mountainRise(x, z) {
  const r = Math.hypot(x - MOUNTAIN.cx, z - MOUNTAIN.cz);
  const ramp = smooth((r - MOUNTAIN.r0) / 230);
  if (ramp <= 0) return 0;
  // ridged noise: sharp crests, wide valleys; the last octaves are crags a few metres across
  let ridged = 0, amp = 0.5, f = 0.0042, norm = 0;
  for (let o = 0; o < 7; o++) {
    const n = 1 - Math.abs(2 * noise2(x * f + o * 17.3, z * f - o * 9.1) - 1);
    ridged += amp * n * n;
    norm += amp;
    amp *= o >= 4 ? 0.36 : 0.5; f *= 2.07;
  }
  ridged /= norm;
  const massif = 0.45 + 0.55 * noise2(x * 0.0016 + 40, z * 0.0016 + 11);     // some ranges taller than others
  const plateau = Math.min(ridged, 0.62 + 0.25 * noise2(x * 0.004, z * 0.004)); // flat Nordic summits
  return ramp * (26 + 330 * Math.pow(plateau, 1.25) * massif);
}

/* Bake what the low sun does to the range, once: a smooth normal (rg), how hollow the
   spot is (b) and whether the sun reaches it past the ridges in the way (a). */
function bakeMountainMap(size, sunDir) {
  const half = MOUNTAIN.r1 + 30;
  const x0 = MOUNTAIN.cx - half, z0 = MOUNTAIN.cz - half, cell = (2 * half) / size;
  const N = size * size;
  const H = new Float32Array(N);
  for (let j = 0, k = 0; j < size; j++) {
    const z = z0 + (j + 0.5) * cell;
    for (let i = 0; i < size; i++, k++) {
      const x = x0 + (i + 0.5) * cell;
      H[k] = terrainH(x, z) + mountainRise(x, z);
    }
  }
  // box blurs (running sums) for the two occlusion scales
  const blur = (src, rad) => {
    const tmp = new Float32Array(N), out = new Float32Array(N), w = 2 * rad + 1;
    for (let j = 0; j < size; j++) {
      const row = j * size;
      let acc = 0;
      for (let i = -rad; i <= rad; i++) acc += src[row + Math.min(size - 1, Math.max(0, i))];
      for (let i = 0; i < size; i++) {
        tmp[row + i] = acc / w;
        acc += src[row + Math.min(size - 1, i + rad + 1)] - src[row + Math.max(0, i - rad)];
      }
    }
    for (let i = 0; i < size; i++) {
      let acc = 0;
      for (let j = -rad; j <= rad; j++) acc += tmp[Math.min(size - 1, Math.max(0, j)) * size + i];
      for (let j = 0; j < size; j++) {
        out[j * size + i] = acc / w;
        acc += tmp[Math.min(size - 1, j + rad + 1) * size + i] - tmp[Math.max(0, j - rad) * size + i];
      }
    }
    return out;
  };
  const B1 = blur(H, Math.max(1, Math.round(26 / cell)));
  const B2 = blur(H, Math.max(2, Math.round(95 / cell)));
  const sh = Math.hypot(sunDir.x, sunDir.z);
  const sx = sunDir.x / sh / cell, sz = sunDir.z / sh / cell, tanE = sunDir.y / sh;
  const data = new Uint8Array(N * 4);
  const rMin = (MOUNTAIN.r0 - 40) / cell, c = size / 2;
  const heightAt = (fi, fj) => {                    // bilinear, so the ray does not catch on texel steps
    const i0 = Math.floor(fi), j0 = Math.floor(fj);
    if (i0 < 0 || j0 < 0 || i0 >= size - 1 || j0 >= size - 1) return -1e9;
    const tx = fi - i0, tz = fj - j0, k = j0 * size + i0;
    return (H[k] * (1 - tx) + H[k + 1] * tx) * (1 - tz) + (H[k + size] * (1 - tx) + H[k + size + 1] * tx) * tz;
  };
  const L = new Float32Array(N).fill(1);
  for (let j = 0, k = 0; j < size; j++) {
    for (let i = 0; i < size; i++, k++) {
      if (Math.hypot(i - c, j - c) <= rMin) continue;
      // walk toward the sun; a ridge that rises above the ray puts this spot in shade
      const h0 = H[k] + 0.5 + 0.35 * cell;
      let lit = 1, d = 2 * cell, step = 1.5 * cell;
      for (let s = 0; s < 40 && lit > 0; s++) {
        const hs = heightAt(i + sx * d, j + sz * d);
        if (hs < -1e8) break;
        const clear = (h0 + d * tanE - hs) / (0.045 * d + cell);
        if (clear < lit) lit = clear < 0 ? 0 : clear;
        step *= 1.09; d += step;
      }
      L[k] = lit;
    }
  }
  for (let j = 0, k = 0; j < size; j++) {
    for (let i = 0; i < size; i++, k++) {
      const il = Math.max(0, i - 1), ir = Math.min(size - 1, i + 1), jd = Math.max(0, j - 1), ju = Math.min(size - 1, j + 1);
      const gx = (H[j * size + ir] - H[j * size + il]) / ((ir - il) * cell);
      const gz = (H[ju * size + i] - H[jd * size + i]) / ((ju - jd) * cell);
      const inv = 1 / Math.sqrt(gx * gx + gz * gz + 1);
      const ao = Math.min(1, Math.max(0, 0.62 + (H[k] - B1[k]) / 24 + (H[k] - B2[k]) / 130));
      // soften the shadow edge over the neighbouring texels
      const lit = (L[k] * 4 + L[j * size + il] * 2 + L[j * size + ir] * 2 + L[jd * size + i] * 2 + L[ju * size + i] * 2
        + L[jd * size + il] + L[jd * size + ir] + L[ju * size + il] + L[ju * size + ir]) / 16;
      data[k * 4] = Math.round((-gx * inv * 0.5 + 0.5) * 255);
      data[k * 4 + 1] = Math.round((-gz * inv * 0.5 + 0.5) * 255);
      data[k * 4 + 2] = Math.round(ao * 255);
      data[k * 4 + 3] = Math.round(lit * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return { tex, rect: new THREE.Vector4(x0, z0, 1 / (2 * half), 1 / (2 * half)) };
}

/* ---------- the fjells: a ring of real terrain around the valley ---------- */
export function createMountains(shared, detail = 1, mapSize = 512, quality = 2) {
  const SEG = Math.round(640 * detail), RINGS = Math.round(96 * detail);
  const pos = new Float32Array((SEG + 1) * (RINGS + 1) * 3);
  const rise = new Float32Array((SEG + 1) * (RINGS + 1));
  const idx = new Uint32Array(SEG * RINGS * 6);
  let n = 0;
  for (let j = 0; j <= RINGS; j++) {
    const t = j / RINGS;
    const r = MOUNTAIN.r0 + (MOUNTAIN.r1 - MOUNTAIN.r0) * Math.pow(t, 1.25);
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const x = MOUNTAIN.cx + Math.sin(a) * r, z = MOUNTAIN.cz + Math.cos(a) * r;
      const h = mountainRise(x, z);
      pos[n * 3] = x; pos[n * 3 + 1] = terrainH(x, z) + 0.6 + h; pos[n * 3 + 2] = z;
      rise[n] = h;
      n++;
    }
  }
  let q = 0;
  for (let j = 0; j < RINGS; j++) {
    for (let i = 0; i < SEG; i++) {
      const a = j * (SEG + 1) + i, b = a + 1, c = a + SEG + 1, d = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRise', new THREE.BufferAttribute(rise, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const map = bakeMountainMap(mapSize, shared.uSunDir.value);
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    vertexShader: mountainVertex,
    fragmentShader: mountainFragment,
    defines: { MTN_Q: quality },
    uniforms: {
      ...shared.light,
      uTime: shared.uTime,
      uDay: shared.uDay,
      uAmb: shared.uAmb,
      uSunCol: shared.uSunCol,
      uSunDir: shared.uSunDir,
      uAuroraTint: shared.uAuroraTint,
      uFogColor: shared.uFogColor,
      uMtnMap: { value: map.tex },
      uMtnRect: { value: map.rect },
    },
  }));
  mesh.frustumCulled = false;
  return mesh;
}

/* ---------- procedural wood texture ---------- */
function woodTexture(rng) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#4a2f1c';
  g.fillRect(0, 0, 256, 256);
  const planks = 3;
  const ph = 256 / planks;
  for (let p = 0; p < planks; p++) {
    const tone = 0.82 + rng() * 0.3;
    g.fillStyle = `rgb(${(74 * tone) | 0},${(47 * tone) | 0},${(28 * tone) | 0})`;
    g.fillRect(0, p * ph, 256, ph);
    for (let i = 0; i < 46; i++) {
      const y = p * ph + rng() * ph;
      g.strokeStyle = `rgba(${rng() < 0.5 ? '20,10,4' : '120,84,52'},${0.08 + rng() * 0.14})`;
      g.lineWidth = 0.6 + rng() * 1.4;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(80, y + (rng() - 0.5) * 5, 170, y + (rng() - 0.5) * 5, 256, y);
      g.stroke();
    }
    // a knot or two, with the grain flowing round it
    for (let k = 0; k < 2; k++) {
      if (rng() < 0.4) continue;
      const kx = rng() * 256, ky = p * ph + ph * (0.3 + rng() * 0.4);
      for (let r = 7; r > 0; r -= 1.5) {
        g.strokeStyle = `rgba(18,9,4,${0.10 + 0.05 * (7 - r)})`;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(kx, ky, r * 1.7, r, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    // checks: short dark splits along the log
    for (let k = 0; k < 5; k++) {
      const x = rng() * 256, y = p * ph + 10 + rng() * (ph - 20), len = 14 + rng() * 40;
      g.fillStyle = `rgba(6,3,1,${0.35 + rng() * 0.3})`;
      g.fillRect(x, y, len, 1.2);
    }
    g.fillStyle = 'rgba(8,4,2,0.75)';
    g.fillRect(0, p * ph, 256, 4);
    g.fillStyle = 'rgba(160,120,80,0.10)';
    g.fillRect(0, p * ph + 4, 256, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  // height map: every course bulges like a round log, with a little grain
  const b = document.createElement('canvas');
  b.width = b.height = 256;
  const bg = b.getContext('2d');
  for (let y = 0; y < 256; y++) {
    const v = Math.pow(Math.sin(Math.PI * ((y % ph) / ph)), 0.55);
    const k = Math.round(40 + 215 * v);
    bg.fillStyle = `rgb(${k},${k},${k})`;
    bg.fillRect(0, y, 256, 1);
  }
  for (let i = 0; i < 260; i++) {
    bg.fillStyle = `rgba(0,0,0,${0.04 + rng() * 0.10})`;
    bg.fillRect(rng() * 256, rng() * 256, 30 + rng() * 120, 1);
  }
  const bump = new THREE.CanvasTexture(b);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  t.userData.bump = bump;
  return t;
}

/* ---------- growth rings for the sawn end of a log ---------- */
function ringTexture(rng) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#7a5636';
  g.fillRect(0, 0, 128, 128);
  const cx = 64 + (rng() - 0.5) * 12, cy = 64 + (rng() - 0.5) * 12;
  for (let r = 62; r > 1; r -= 2 + rng() * 2.5) {
    g.strokeStyle = `rgba(${rng() < 0.5 ? '40,22,10' : '150,112,72'},${0.25 + rng() * 0.35})`;
    g.lineWidth = 0.8 + rng() * 1.2;
    g.beginPath();
    g.ellipse(cx, cy, r, r * (0.94 + rng() * 0.08), rng(), 0, Math.PI * 2);
    g.stroke();
  }
  for (let k = 0; k < 5; k++) {                      // drying cracks from the heart
    const a = rng() * Math.PI * 2, len = 20 + rng() * 38;
    g.strokeStyle = 'rgba(14,7,3,0.7)';
    g.lineWidth = 1 + rng();
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- rough bark ---------- */
function barkTexture(rng) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#4a372a';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 420; i++) {
    const x = rng() * 128, y = rng() * 128, len = 8 + rng() * 30;
    g.strokeStyle = `rgba(${rng() < 0.6 ? '16,10,6' : '128,104,84'},${0.18 + rng() * 0.3})`;
    g.lineWidth = 0.8 + rng() * 2.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rng() - 0.5) * 4, y + len);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- dry-stone masonry (colour + height) ---------- */
function stoneTexture(rng) {
  const c = document.createElement('canvas'), b = document.createElement('canvas');
  c.width = c.height = b.width = b.height = 256;
  const g = c.getContext('2d'), bg = b.getContext('2d');
  g.fillStyle = '#1d1f1f';
  g.fillRect(0, 0, 256, 256);
  bg.fillStyle = '#000';
  bg.fillRect(0, 0, 256, 256);
  const stone = (ctx, x, y, w, h, fill) => {
    const r = Math.min(9, w / 3, h / 3);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.fill();
  };
  let y = 0;
  while (y < 256) {
    const h = Math.min(30 + rng() * 22, 256 - y);
    let x = -rng() * 40;
    while (x < 256) {
      const w = 36 + rng() * 52, tone = 0.62 + rng() * 0.6, warm = rng() * 14;
      const col = `rgb(${(96 * tone + warm) | 0},${(97 * tone + warm * 0.6) | 0},${(94 * tone) | 0})`;
      const k = (150 + rng() * 105) | 0;
      for (const ox of [0, 256, -256]) {            // wrap sideways so courses tile
        stone(g, x + ox + 2, y + 2, w - 4, h - 4, col);
        stone(bg, x + ox + 3, y + 3, w - 6, h - 6, `rgb(${k},${k},${k})`);
      }
      x += w;
    }
    y += h;
  }
  for (let i = 0; i < 2600; i++) {                   // grain and lichen flecks
    const lichen = rng() < 0.12;
    g.fillStyle = lichen ? `rgba(120,128,70,${0.10 + rng() * 0.2})` : `rgba(${rng() < 0.5 ? '0,0,0' : '210,210,205'},${0.04 + rng() * 0.10})`;
    const s = lichen ? 2 + rng() * 5 : 1 + rng() * 2;
    g.fillRect(rng() * 256, rng() * 256, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const bump = new THREE.CanvasTexture(b);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  t.userData.bump = bump;
  return t;
}

/* ---------- woven canvas for the tent: one sheet, ridge along the middle of u ---------- */
function canvasTexture(rng) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  // waxed cotton: bleached along the ridge, grimy toward the hem
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, '#6f4a2c');
  grad.addColorStop(0.16, '#a9703f');
  grad.addColorStop(0.5, '#c08a55');
  grad.addColorStop(0.84, '#a9703f');
  grad.addColorStop(1.0, '#6f4a2c');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {                     // weather stains and patches of damp
    g.fillStyle = `rgba(${rng() < 0.7 ? '50,26,10' : '230,200,160'},${0.03 + rng() * 0.06})`;
    g.beginPath();
    g.ellipse(rng() * 256, rng() * 256, 8 + rng() * 34, 6 + rng() * 60, 0, 0, Math.PI * 2);
    g.fill();
  }
  for (let k = 1; k < 4; k++) {                      // sewn panels running over the ridge
    const y = k * 64 + (rng() - 0.5) * 4;
    g.fillStyle = 'rgba(40,18,6,0.45)';
    g.fillRect(0, y, 256, 2);
    g.fillStyle = 'rgba(240,210,170,0.18)';
    g.fillRect(0, y + 2, 256, 1.5);
    for (let x = 0; x < 256; x += 5) {
      g.fillStyle = 'rgba(235,215,180,0.5)';
      g.fillRect(x, y - 2, 2.4, 1);
    }
  }
  g.fillStyle = 'rgba(40,18,6,0.5)';                 // ridge seam
  g.fillRect(126.5, 0, 3, 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  // the weave itself, as a small height map tiled many times
  const b = document.createElement('canvas');
  b.width = b.height = 64;
  const bg = b.getContext('2d');
  bg.fillStyle = '#808080';
  bg.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 2) {
    bg.fillStyle = `rgba(255,255,255,${0.25 + rng() * 0.3})`;
    bg.fillRect(i, 0, 1, 64);
    bg.fillStyle = `rgba(0,0,0,${0.2 + rng() * 0.3})`;
    bg.fillRect(0, i, 64, 1);
  }
  const bump = new THREE.CanvasTexture(b);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(26, 26);
  t.userData.bump = bump;
  return t;
}

/* ---------- lit windows: curtains, a lamp-lit room behind, sky on the glass by day ---------- */
const paneVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vN;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const paneFragment = /* glsl */ `
uniform float uTime;
uniform float uDay;
uniform float uLit;        // how brightly the room is lit (1 at night)
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uSunDir;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vN;
void main(){
  vec2 p = vUv;
  float side = abs(p.x - 0.5) * 2.0;                       // 0 at the middle of the window, 1 at the frame
  // linen curtains tied back a third of the way up
  float tie = 1.0 - abs(p.y - 0.34) / 0.66;
  float edge = mix(0.86, 0.36, smoothstep(0.34, 1.0, p.y)) + 0.10 * (1.0 - tie) * step(p.y, 0.34);
  float cur = smoothstep(edge - 0.035, edge + 0.035, side);
  float fold = 0.5 + 0.5 * sin(side * 34.0 + sin(p.y * 6.0) * 1.2 + (1.0 - p.y) * side * 9.0);
  float valance = smoothstep(0.90, 0.93, p.y + 0.012 * sin(p.x * 60.0));
  cur = max(cur, valance);

  // the room: a lamp on the table, the hearth flickering on the back wall, a dark beam overhead
  vec3 lamp = vec3(1.0, 0.52, 0.16);
  float d = distance(p, vec2(0.58, 0.40));
  float flick = 0.90 + 0.06 * sin(uTime * 7.3) * sin(uTime * 3.1 + 1.0) + 0.04 * sin(uTime * 13.7);
  vec3 room = lamp * (0.85 + 2.6 * exp(-d * d * 9.0) + 5.0 * exp(-d * d * 160.0)) * flick;
  room *= 1.0 - 0.55 * smoothstep(0.80, 0.90, p.y);
  room *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.22, p.y));  // the sill and what stands on it
  float shelf = step(abs(p.y - 0.62), 0.012) * step(0.5, p.x);
  room *= 1.0 - 0.6 * shelf;
  // cloth glows where the lamp is behind it; the folds keep their shadows
  vec3 cloth = lamp * vec3(1.0, 0.80, 0.56) * (0.45 + 0.75 * fold) * (0.8 + 1.2 * exp(-d * d * 4.0));
  vec3 night = mix(room, cloth, cur) * 1.55 * uLit;

  // by day: dim room, pale curtains, and the glass throws back the sky
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 R = reflect(-V, normalize(vN));
  float fres = 0.10 + 0.90 * pow(1.0 - max(dot(V, normalize(vN)), 0.0), 3.0);
  vec3 skyC = mix(vec3(0.50, 0.70, 0.95), vec3(0.08, 0.22, 0.62), clamp(R.y * 1.4 + 0.2, 0.0, 1.0));
  skyC += uSunCol * 0.6 * pow(max(dot(R, uSunDir), 0.0), 60.0);
  vec3 dayIn = mix(vec3(0.020, 0.018, 0.016), vec3(0.42, 0.39, 0.33) * (0.30 + 0.55 * fold) * (uAmb + uSunCol * 0.12), cur);
  vec3 dayC = mix(dayIn, skyC, fres * 0.75);
  gl_FragColor = vec4(night + dayC * uDay, 1.0);
}
`;

/* ---------- Nordic turf-roof cabin ---------- */

export function createCabin(rng, shared) {
  const g = new THREE.Group();
  const woodMap = woodTexture(rng);
  const stoneMap = stoneTexture(rng);
  const ringMap = ringTexture(rng);

  // Weathering for everything wooden on the house: the dark under the eaves, splash-back
  // and damp near the ground, rain streaks, and sun-silvered patches. It reads the spot's
  // position in the cabin's own frame, so it costs one varying.
  const cabinInv = { value: new THREE.Matrix4() };
  const weathered = (mat) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uCabinInv = cabinInv;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform mat4 uCabinInv;\nvarying vec3 vCab;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCab = (uCabinInv * modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vCab;
float wHash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float wNoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y); }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
{
  float roofY = 3.8 - abs(vCab.x) * 0.652;                        // underside of the roof above this spot
  float gap = roofY - vCab.y;
  float eave = smoothstep(0.80, 0.0, gap) * step(-0.25, gap) * step(abs(vCab.z), 3.6);
  float splash = smoothstep(0.60, 0.0, vCab.y);
  float run = wNoise(vec2((vCab.x + vCab.z) * 6.0, vCab.y * 0.45));
  float damp = smoothstep(0.50, 0.85, run) * smoothstep(2.6, 0.3, vCab.y);
  float silver = smoothstep(0.35, 0.8, wNoise(vCab.xz * 1.1 + vCab.y * 0.7));
  vec3 c = diffuseColor.rgb;
  c = mix(c, vec3(dot(c, vec3(0.3333))) * vec3(1.25, 1.2, 1.12), 0.30 * silver);
  c = mix(c, c * vec3(0.50, 0.56, 0.48), damp * 0.65);
  c *= 1.0 - 0.34 * splash;
  c = mix(c, c * vec3(0.55, 0.75, 0.45), splash * 0.35 * run);    // a little green where it stays wet
  c *= 1.0 - 0.58 * eave;
  diffuseColor.rgb = c;
}`);
    };
    return mat;
  };

  const wood = weathered(new THREE.MeshStandardMaterial({ map: woodMap, bumpMap: woodMap.userData.bump, bumpScale: 2.6, roughness: 0.92, metalness: 0 }));
  const darkWood = weathered(new THREE.MeshStandardMaterial({ color: 0x3a2515, map: woodMap, roughness: 0.95 }));
  const boardMap = woodMap.clone();                 // the same boards standing upright, for the door and shutters
  boardMap.rotation = Math.PI / 2;
  boardMap.repeat.set(1, 1.4);
  boardMap.needsUpdate = true;
  const boards = weathered(new THREE.MeshStandardMaterial({ color: 0x8a6a4c, map: boardMap, roughness: 0.9 }));
  const stone = new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneMap.userData.bump, bumpScale: 3.0, roughness: 1 });
  const sod = new THREE.MeshStandardMaterial({ color: 0x1a2a10, roughness: 1 });
  const birch = new THREE.MeshStandardMaterial({ color: 0x6f6858, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.55, metalness: 0.85 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb98d3c, roughness: 0.32, metalness: 0.9 });
  const endGrain = new THREE.MeshStandardMaterial({ map: ringMap, roughness: 1 });
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 2.8, 0.9) });
  const paneMat = new THREE.ShaderMaterial({
    vertexShader: paneVertex,
    fragmentShader: paneFragment,
    uniforms: { uTime: shared.uTime, uDay: shared.uDay, uLit: { value: 1 }, uAmb: shared.uAmb, uSunCol: shared.uSunCol, uSunDir: shared.uSunDir },
  });

  const W = 2.3, L = 3.2, wallH = 2.3, ridgeH = 3.8;

  // log body with gable ends (pentagon profile extruded along Z)
  const shape = new THREE.Shape();
  shape.moveTo(-W, 0);
  shape.lineTo(W, 0);
  shape.lineTo(W, wallH);
  shape.lineTo(0, ridgeH);
  shape.lineTo(-W, wallH);
  shape.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: L * 2, bevelEnabled: false });
  bodyGeo.translate(0, 0, -L);
  {
    // the side walls come out of the extrusion with their courses standing on end: lay the logs level
    const uv = bodyGeo.attributes.uv, side = bodyGeo.groups[1];
    for (let i = side.start; i < side.start + side.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
  }
  g.add(new THREE.Mesh(bodyGeo, wood));

  const box = (w, h, d, mat, x, y, z, parent = g) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const rod = (r, len, mat, x, y, z, axis, parent = g, sides = 10) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, sides), mat);
    m.position.set(x, y, z);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    else if (axis === 'z') m.rotation.x = Math.PI / 2;
    parent.add(m);
    return m;
  };

  // foundation of fitted stones (the texture tiles about once per metre)
  const fUv = (m, u, v) => { const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v); return m; };
  fUv(box(W * 2 + 0.3, 2.4, L * 2 + 0.3, stone, 0, -1.2, 0), 4, 1.6);

  // notched log ends sticking out at the four corners, course by course, sawn faces showing their rings
  const logEnd = new THREE.CylinderGeometry(0.155, 0.155, 0.36, 12);
  const logMats = [wood, endGrain, endGrain];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let k = 0; k < 7; k++) {
        const y = 0.17 + k * 0.33;
        const along = new THREE.Mesh(logEnd, logMats);       // runs along Z
        along.rotation.x = Math.PI / 2;
        along.rotation.y = rng() * 6;
        along.position.set(sx * (W - 0.03), y, sz * (L + 0.17 + rng() * 0.05));
        const across = new THREE.Mesh(logEnd, logMats);      // runs along X
        across.rotation.z = Math.PI / 2;
        across.rotation.x = rng() * 6;
        across.position.set(sx * (W + 0.17 + rng() * 0.05), y + 0.165, sz * (L - 0.03));
        g.add(along, across);
      }
    }
  }
  // a window box under the gable window, and board shutters with iron straps
  box(1.25, 0.16, 0.22, darkWood, 0.95, 0.74, L + 0.14);
  for (const sx of [-1, 1]) {
    box(0.34, 1.05, 0.05, boards, 0.95 + sx * 0.74, 1.38, L + 0.05);
    for (const hy of [1.06, 1.70]) box(0.30, 0.035, 0.012, iron, 0.95 + sx * 0.74, hy, L + 0.08);
  }

  // turf roof: birch bark under the sod, a log along each eave to hold it, boards along the verge
  const a = Math.atan2(ridgeH - wallH, W);
  const slabLen = 3.25, slabT = 0.24, roofLen = L * 2 + 0.7;
  const cx = Math.cos(a) * (slabLen / 2 - 0.05) + Math.sin(a) * slabT * 0.5;
  const cy = ridgeH - Math.sin(a) * (slabLen / 2 - 0.05) + Math.cos(a) * slabT * 0.5;
  const roofR = box(slabLen, slabT, roofLen, sod, cx, cy, 0);
  roofR.rotation.z = -a;
  const roofL = box(slabLen, slabT, roofLen, sod, -cx, cy, 0);
  roofL.rotation.z = a;
  for (const [roof, s] of [[roofR, 1], [roofL, -1]]) {
    box(slabLen + 0.05, 0.03, roofLen + 0.06, birch, s * 0.02, -slabT / 2 - 0.012, 0, roof);
    rod(0.075, roofLen + 0.1, wood, s * (slabLen / 2 - 0.03), slabT / 2 + 0.01, 0, 'z', roof);
    for (const hz of [-2.6, -0.9, 0.9, 2.6]) {      // hooks that keep the eave log from sliding
      box(0.22, 0.05, 0.07, darkWood, s * (slabLen / 2 + 0.03), -0.02, hz, roof);
    }
  }
  for (const sz of [-1, 1]) {
    const vr = box(slabLen, 0.20, 0.07, darkWood, cx, cy - 0.03, sz * (L + 0.37));
    vr.rotation.z = -a;
    const vl = box(slabLen, 0.20, 0.07, darkWood, -cx, cy - 0.03, sz * (L + 0.37));
    vl.rotation.z = a;
  }
  // chimney of the same stone, with a slab cap
  fUv(box(0.60, 1.25, 0.60, stone, 0.95, 3.75, -1.5), 0.6, 1.1);
  fUv(box(0.78, 0.07, 0.78, stone, 0.95, 4.41, -1.5), 0.7, 0.2);
  box(0.36, 0.02, 0.36, new THREE.MeshBasicMaterial({ color: 0x020202 }), 0.95, 4.452, -1.5);

  // gable (+Z): plank door in its frame, on strap hinges, with a brass latch
  box(0.95, 1.95, 0.07, boards, -0.85, 0.98, L + 0.03);
  for (const sx of [-1, 1]) box(0.09, 2.07, 0.13, darkWood, -0.85 + sx * 0.52, 1.02, L + 0.04);
  box(1.15, 0.11, 0.14, darkWood, -0.85, 2.01, L + 0.045);
  box(1.10, 0.05, 0.22, stone, -0.85, 0.02, L + 0.10);              // worn threshold
  for (const hy of [0.42, 1.56]) {
    box(0.62, 0.05, 0.014, iron, -1.02, hy, L + 0.072);
    rod(0.022, 0.11, iron, -1.325, hy, L + 0.085, 'y');
    for (const bx of [-1.22, -1.0, -0.78]) rod(0.012, 0.012, iron, bx, hy, L + 0.082, 'z', g, 6);
  }
  box(0.055, 0.19, 0.012, brass, -0.50, 1.02, L + 0.071);           // escutcheon
  rod(0.011, 0.045, brass, -0.50, 1.05, L + 0.095, 'z', g, 8);
  rod(0.012, 0.12, brass, -0.545, 1.05, L + 0.115, 'x', g, 8);      // lever handle
  box(0.008, 0.022, 0.004, iron, -0.50, 0.965, L + 0.078);          // keyhole
  // window: glass, frame, glazing bars, sill
  box(1.05, 1.05, 0.05, paneMat, 0.95, 1.38, L + 0.02);
  box(1.2, 0.09, 0.1, darkWood, 0.95, 1.94, L + 0.04);
  box(1.28, 0.06, 0.16, darkWood, 0.95, 0.83, L + 0.06);
  box(0.09, 1.2, 0.1, darkWood, 0.39, 1.38, L + 0.04);
  box(0.09, 1.2, 0.1, darkWood, 1.51, 1.38, L + 0.04);
  box(0.04, 1.05, 0.07, darkWood, 0.95, 1.38, L + 0.045);
  box(1.05, 0.04, 0.07, darkWood, 0.95, 1.38, L + 0.045);
  box(0.42, 0.42, 0.05, paneMat, 0, 3.0, L + 0.02);                 // attic light
  for (const [w, h, x, y] of [[0.54, 0.06, 0, 3.24], [0.54, 0.06, 0, 2.76], [0.06, 0.54, -0.24, 3.0], [0.06, 0.54, 0.24, 3.0], [0.03, 0.42, 0, 3.0]]) {
    box(w, h, 0.08, darkWood, x, y, L + 0.04);
  }

  // long side (-X): two windows
  for (const wz of [-1.45, 1.35]) {
    box(0.05, 0.9, 1.15, paneMat, -W - 0.02, 1.38, wz);
    box(0.1, 0.08, 1.3, darkWood, -W - 0.04, 1.87, wz);
    box(0.16, 0.06, 1.36, darkWood, -W - 0.06, 0.89, wz);
    box(0.1, 1.05, 0.08, darkWood, -W - 0.04, 1.38, wz - 0.61);
    box(0.1, 1.05, 0.08, darkWood, -W - 0.04, 1.38, wz + 0.61);
    box(0.07, 0.9, 0.04, darkWood, -W - 0.045, 1.38, wz);
    box(0.07, 0.04, 1.15, darkWood, -W - 0.045, 1.38, wz);
  }

  // firewood stacked under the eave on the sunny side
  const billet = new THREE.CylinderGeometry(0.075, 0.075, 0.42, 9);
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i < 11 - (row > 3 ? 3 : 0); i++) {
      const m = new THREE.Mesh(billet, [darkWood, endGrain, endGrain]);
      m.rotation.z = Math.PI / 2;
      m.rotation.x = rng() * 6;
      m.scale.set(0.8 + rng() * 0.45, 1, 0.8 + rng() * 0.45);
      m.position.set(W + 0.24 + (rng() - 0.5) * 0.05, 0.085 + row * 0.142, -2.3 + i * 0.158 + (row % 2) * 0.08);
      g.add(m);
    }
  }

  // porch deck of separate boards, with railing
  const deckD = 2.3;
  for (let i = 0; i < 12; i++) {
    const bw = deckD / 12;
    box(W * 2 + 0.6, 0.12 + rng() * 0.012, bw - 0.016, wood, 0, 0.02, L + bw / 2 + i * bw).rotation.y = (rng() - 0.5) * 0.004;
  }
  for (const px of [-W - 0.2, 0, W + 0.2]) {
    box(0.16, 1.6, 0.16, darkWood, px, -0.8, L + deckD - 0.12);
  }
  const railZ = L + deckD - 0.08;
  for (let i = 0; i <= 8; i++) {
    const px = -W - 0.22 + (i / 8) * (W * 2 + 0.44);
    if (Math.abs(px + 0.85) < 0.6) continue;                        // gap for the steps
    box(0.07, 0.85, 0.07, darkWood, px, 0.5, railZ);
  }
  box(1.25, 0.08, 0.1, darkWood, -W - 0.22 + 0.62, 0.92, railZ);
  box(W * 2 + 0.44 - 2.25, 0.08, 0.1, darkWood, 0.9, 0.92, railZ);
  for (const sx of [-1, 1]) {
    box(0.1, 0.08, deckD, darkWood, sx * (W + 0.22), 0.92, L + deckD / 2);
    box(0.07, 0.85, 0.07, darkWood, sx * (W + 0.22), 0.5, L + deckD * 0.5);
  }
  box(0.9, 0.12, 0.4, wood, -0.85, -0.2, L + deckD + 0.2);          // step

  // porch lantern: an iron cage round the flame, hung from a bracket
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), lampMat);
  lamp.position.set(-0.1, 2.1, L + 0.22);
  g.add(lamp);
  box(0.03, 0.03, 0.26, iron, -0.1, 2.30, L + 0.12);
  rod(0.006, 0.10, iron, -0.1, 2.25, L + 0.22, 'y', g, 5);
  box(0.15, 0.02, 0.15, iron, -0.1, 2.20, L + 0.22);
  box(0.13, 0.02, 0.13, iron, -0.1, 2.00, L + 0.22);
  for (const [ex, ez] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rod(0.006, 0.20, iron, -0.1 + ex * 0.06, 2.10, L + 0.22 + ez * 0.06, 'y', g, 4);
  const light = new THREE.PointLight(0xffa24a, 7, 30, 2);
  light.position.set(-0.1, 2.0, L + 0.9);
  g.add(light);

  const y = terrainH(CABIN.x, CABIN.z) + 0.25;
  g.position.set(CABIN.x, y, CABIN.z);
  g.rotation.y = CABIN.yaw;
  g.updateMatrixWorld(true);
  cabinInv.value.copy(g.matrixWorld).invert();

  const lightWorld = light.getWorldPosition(new THREE.Vector3());

  // smoke curling from the chimney
  const top = g.localToWorld(new THREE.Vector3(0.95, 4.46, -1.5));
  const PUFFS = 16;
  const sp = new Float32Array(PUFFS * 3), ss = new Float32Array(PUFFS * 4);
  for (let i = 0; i < PUFFS; i++) {
    sp[i * 3] = top.x + (rng() - 0.5) * 0.2; sp[i * 3 + 1] = top.y; sp[i * 3 + 2] = top.z + (rng() - 0.5) * 0.2;
    ss[i * 4] = i / PUFFS; ss[i * 4 + 1] = rng(); ss[i * 4 + 2] = rng(); ss[i * 4 + 3] = rng();
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aSeed', new THREE.BufferAttribute(ss, 4));
  const smoke = new THREE.Points(sg, new THREE.ShaderMaterial({
    vertexShader: smokeVertex,
    fragmentShader: smokeFragment,
    uniforms: { uTime: shared.uTime, uPixelRatio: shared.uPixelRatio, uScale: shared.uPointScale, uAmb: shared.uAmb, uSunCol: shared.uSunCol },
    transparent: true,
    depthWrite: false,
  }));
  smoke.frustumCulled = false;
  smoke.renderOrder = 7;
  return { group: g, roofs: [roofL, roofR], lightWorld, light, smoke, paneMat, glows: [[lampMat, 5.0, 2.8, 0.9]] };
}

export function insideCabin(x, z, margin = 0.6) {
  const dx = x - CABIN.x, dz = z - CABIN.z;
  const c = Math.cos(-CABIN.yaw), s = Math.sin(-CABIN.yaw);
  const lx = c * dx + s * dz;
  const lz = -s * dx + c * dz;
  return Math.abs(lx) < 2.6 + margin && lz > -3.5 - margin && lz < 5.9 + margin;
}

/* ---------- weathered fence ---------- */
export function createFence(rng) {
  const g = new THREE.Group();
  const map = barkTexture(rng);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9a8f80, map, roughness: 1 });
  const runs = [
    [[-19, -7.5], [-15.6, -5.6], [-12.2, -4.2], [-8.8, -3.6], [-5.6, -3.2], [-2.8, -2.2]],
    [[5.2, -8.5], [8.3, -10.0], [11.6, -10.6]],
    [[-24, -22], [-21, -19], [-19.5, -15.5]],
  ];
  const up = new THREE.Vector3(1, 0, 0);
  for (const run of runs) {
    const tops = [];
    for (const [x, z] of run) {
      const h = 1.15 + rng() * 0.3;
      // split posts: roughly round, a little tapered, never quite upright
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, h + 0.5, 7), mat);
      const y = terrainH(x, z);
      post.position.set(x, y + h / 2 - 0.25, z);
      post.rotation.set((rng() - 0.5) * 0.22, rng() * 3, (rng() - 0.5) * 0.22);
      g.add(post);
      tops.push(new THREE.Vector3(x, y, z));
    }
    for (let i = 0; i < tops.length - 1; i++) {
      for (const rh of [0.42, 0.88]) {
        if (rng() < 0.12) continue;                                   // a missing rail
        const p0 = tops[i].clone().setY(tops[i].y + rh + (rng() - 0.5) * 0.08);
        const p1 = tops[i + 1].clone().setY(tops[i + 1].y + rh + (rng() - 0.5) * 0.08);
        const dir = p1.clone().sub(p0);
        const len = dir.length();
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len + 0.25, 0.1, 0.045), mat);
        rail.position.copy(p0).addScaledVector(dir, 0.5);
        rail.quaternion.setFromUnitVectors(up, dir.normalize());
        g.add(rail);
      }
    }
  }
  return g;
}

/* ---------- mossy boulders ---------- */
// x, z, size. Also used by the walker, so nobody strolls through a rock.
export const ROCK_SPOTS = [
  [9.5, -2.5, 1.25], [11.8, -4.2, 0.7], [14.5, -1.8, 0.9], [-5.5, 0.4, 0.55],
  [3.4, -12, 0.8], [18, -9, 1.5], [-22, -9, 1.1], [7.5, 2.2, 0.5],
  [22, -30, 1.8], [-30, -34, 2.2], [35, -60, 2.6], [-8, -48, 1.6],
];
function noise3(x, y, z) {
  const iy = Math.floor(y), fy0 = y - iy, fy = fy0 * fy0 * (3 - 2 * fy0);
  const a = noise2(x + iy * 37.7, z + iy * 17.3), b = noise2(x + (iy + 1) * 37.7, z + (iy + 1) * 17.3);
  return a + (b - a) * fy;
}
export function createRocks(rng) {
  const g = new THREE.Group();
  // speckled granite
  const grain = document.createElement('canvas');
  grain.width = grain.height = 128;
  const gg = grain.getContext('2d');
  gg.fillStyle = '#9a9a98';
  gg.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 5000; i++) {
    const k = (60 + rng() * 180) | 0;
    gg.fillStyle = `rgba(${k},${k},${(k * 0.97) | 0},${0.25 + rng() * 0.5})`;
    gg.fillRect(rng() * 128, rng() * 128, 1 + rng() * 2, 1 + rng() * 2);
  }
  const tex = new THREE.CanvasTexture(grain);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, bumpMap: tex, bumpScale: 1.4, roughness: 0.96 });
  const spots = ROCK_SPOTS;
  const rock = new THREE.Color(0x77797a);
  const dark = new THREE.Color(0x3d3f42);
  const moss = new THREE.Color(0x3c5a26);
  const lichen = new THREE.Color(0x8d8f6a);
  const tmp = new THREE.Color();
  for (const [x, z, s] of spots) {
    // a smooth, indexed sphere pushed about by noise: rounded shoulders, a few flat faces
    const geo = new THREE.SphereGeometry(1, 44, 30);
    const p = geo.attributes.position;
    const seed = rng() * 100;
    const v = new THREE.Vector3();
    const planes = [];
    for (let k = 0; k < 5; k++) planes.push([new THREE.Vector3(rng() - 0.5, rng() * 0.8 + 0.1, rng() - 0.5).normalize(), 0.62 + rng() * 0.28]);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n1 = noise3(v.x * 1.3 + seed, v.y * 1.3 + seed, v.z * 1.3) - 0.5;
      const n2 = noise3(v.x * 3.4 + seed, v.y * 3.4, v.z * 3.4 + seed) - 0.5;
      const n3 = noise3(v.x * 9 + seed, v.y * 9, v.z * 9) - 0.5;
      let r = 1 + n1 * 0.55 + n2 * 0.20 + n3 * 0.05;
      for (const [pn, pd] of planes) {                 // cleaved faces
        const d = v.dot(pn);
        if (d * r > pd) r = pd / d;
      }
      v.multiplyScalar(r);
      v.y *= 0.66;
      if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.3;  // sits in the ground
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    // the seam and the poles share positions: average their normals so no crease shows
    const nrm = geo.attributes.normal;
    const acc = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
      let e = acc.get(key);
      if (!e) acc.set(key, e = { n: new THREE.Vector3(), ids: [] });
      e.n.add(v.fromBufferAttribute(nrm, i));
      e.ids.push(i);
    }
    for (const e of acc.values()) {
      if (e.ids.length < 2) continue;
      e.n.normalize();
      for (const i of e.ids) nrm.setXYZ(i, e.n.x, e.n.y, e.n.z);
    }
    const colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
      const tone = noise3(px * 2.2 + seed, py * 2.2, pz * 2.2);
      tmp.copy(dark).lerp(rock, 0.25 + 0.75 * tone);
      const lk = smooth((noise3(px * 4 + 9, py * 4 + seed, pz * 4) - 0.55) / 0.2);
      tmp.lerp(lichen, lk * 0.5);
      // moss on the tops and the shaded north side, thicker in the hollows
      const top = smooth((nrm.getY(i) - 0.35) / 0.45) * smooth((noise3(px * 1.7, py * 1.7 + seed, pz * 1.7) - 0.30) / 0.3);
      tmp.lerp(moss, Math.min(1, top * 0.9));
      const foot = 1 - 0.45 * smooth((0.25 - py) / 0.45);          // damp and dark where it meets the grass
      colors[i * 3] = tmp.r * foot; colors[i * 3 + 1] = tmp.g * foot; colors[i * 3 + 2] = tmp.b * foot;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, terrainH(x, z) + s * 0.10, z);
    m.scale.setScalar(s);
    m.rotation.y = rng() * 6.28;
    g.add(m);
  }
  return g;
}

/* ---------- grass + wildflowers ---------- */
// layers: [{ r, count, h: [min, max], w: [min, max], grow, widen, fadeIn }] from near to far
export function createGrass(shared, rng, layers, cabin, roofCount) {
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, 0, 0, 0.5, 0, 0, -0.36, 0.45, 0, 0.36, 0.45, 0, -0.2, 0.78, 0, 0.2, 0.78, 0, 0, 1, 0,
  ], 3));
  blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]);

  const uniforms = {
    ...shared.light,
    uTime: shared.uTime,
    uPlayer: shared.uPlayer,
    uAuroraTint: shared.uAuroraTint,
    uCabinLight: shared.uCabinLight,
    uFireLight: shared.uFireLight,
    uAmb: shared.uAmb,
    uSunCol: shared.uSunCol,
    uSunDir: shared.uSunDir,
    uDay: shared.uDay,
    uFogColor: shared.uFogColor,
    uFogDensity: shared.uFogDensity,
  };
  const build = (offsets, params, n, defines) => {
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = blade.index;
    geo.setAttribute('position', blade.attributes.position);
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
    geo.instanceCount = n;
    const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: grassVertex,
      fragmentShader: grassFragment,
      side: THREE.DoubleSide,
      defines,
      uniforms,
    }));
    mesh.frustumCulled = false;
    return mesh;
  };
  const group = new THREE.Group();
  group.userData.layers = [];

  // tiles of blades; the vertex shader wraps each one around the walker
  for (const L of layers) {
    if (!L.count) continue;
    const offsets = new Float32Array(L.count * 3);
    const params = new Float32Array(L.count * 4);
    for (let i = 0; i < L.count; i++) {
      offsets[i * 3] = (rng() * 2 - 1) * L.r;
      offsets[i * 3 + 2] = (rng() * 2 - 1) * L.r;
      params[i * 4] = L.h[0] + rng() * (L.h[1] - L.h[0]);
      params[i * 4 + 1] = rng() * Math.PI;
      params[i * 4 + 2] = rng();
      params[i * 4 + 3] = L.w[0] + rng() * (L.w[1] - L.w[0]);
    }
    const defines = { GRASS_R: L.r.toFixed(1), GRASS_GROW: L.grow.toFixed(2), GRASS_WIDEN: L.widen.toFixed(2) };
    if (L.fadeIn) defines.GRASS_IN = L.fadeIn.toFixed(1);
    const mesh = build(offsets, params, L.count, defines);
    group.add(mesh);
    group.userData.layers.push({ geo: mesh.geometry, total: L.count });
  }

  // turf on the cabin roof stays where it is: a shaggy sod of long and short blades
  if (roofCount > 0) {
    const ro = new Float32Array(roofCount * 3);
    const rp = new Float32Array(roofCount * 4);
    const v = new THREE.Vector3();
    for (let i = 0; i < roofCount; i++) {
      const roof = cabin.roofs[i % 2];
      const edge = rng() < 0.12;                      // a fringe hanging over the eaves and the ridge
      v.set(edge ? (rng() < 0.5 ? -1 : 1) * (1.5 + rng() * 0.12) : (rng() - 0.5) * 3.2, 0.12, (rng() - 0.5) * 7.0).applyMatrix4(roof.matrixWorld);
      ro[i * 3] = v.x; ro[i * 3 + 1] = v.y; ro[i * 3 + 2] = v.z;
      const tall = rng();
      rp[i * 4] = 0.10 + 0.22 * rng() + 0.34 * tall * tall * tall;
      rp[i * 4 + 1] = rng() * Math.PI;
      rp[i * 4 + 2] = rng();
      rp[i * 4 + 3] = 0.022 + rng() * 0.030;
    }
    group.add(build(ro, rp, roofCount, { STATIC: '', GRASS_R: '1.0', GRASS_GROW: '0.0', GRASS_WIDEN: '0.0' }));
  }
  return group;
}

export function createFlowers(shared, rng, count) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const info = new Float32Array(count * 2);
  const palette = [[1.0, 1.0, 0.95], [1.0, 0.86, 0.35], [0.95, 0.55, 0.85], [0.70, 0.75, 1.0], [1.0, 1.0, 1.0]];
  let n = 0, guard = 0;
  while (n < count && guard++ < count * 8) {
    const dist = 4 + 50 * Math.pow(rng(), 1.5);
    const x = (rng() - 0.5) * 2 * (10 + dist * 1.6);
    const z = 8 - dist;
    // flowers gather in drifts
    if (Math.sin(x * 0.35 + 1.0) * Math.sin(z * 0.41 + 2.0) < 0.05 - rng() * 0.5) continue;
    if (insideCabin(x, z, 0.3) || insideCamp(x, z)) continue;
    pos[n * 3] = x; pos[n * 3 + 1] = terrainH(x, z); pos[n * 3 + 2] = z;
    const c = palette[Math.floor(rng() * palette.length)];
    col[n * 3] = c[0]; col[n * 3 + 1] = c[1]; col[n * 3 + 2] = c[2];
    info[n * 2] = 0.45 + rng() * 0.45;
    info[n * 2 + 1] = rng();
    n++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aInfo', new THREE.BufferAttribute(info, 2));
  geo.setDrawRange(0, n);
  const mat = new THREE.ShaderMaterial({
    vertexShader: flowerVertex,
    fragmentShader: flowerFragment,
    uniforms: {
      uTime: shared.uTime,
      uPixelRatio: shared.uPixelRatio,
      uScale: shared.uPointScale,
      uAuroraTint: shared.uAuroraTint,
      uAmb: shared.uAmb,
      uSunCol: shared.uSunCol,
    },
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

/* ---------- ambient fireflies ---------- */
export function createFireflies(shared, rng, count) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const dist = 5 + 48 * Math.pow(rng(), 1.3);
    const x = (rng() - 0.5) * 2 * (8 + dist * 1.3);
    const z = 8 - dist;
    pos[i * 3] = x;
    pos[i * 3 + 1] = terrainH(x, z) + 0.55 + rng() * 1.3;
    pos[i * 3 + 2] = z;
    seed[i * 4] = rng();
    seed[i * 4 + 1] = 0.15 + rng() * 0.35;
    seed[i * 4 + 2] = 0.6 + rng() * 1.8;
    seed[i * 4 + 3] = rng();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    vertexShader: fireflyVertex,
    fragmentShader: fireflyFragment,
    uniforms: { uTime: shared.uTime, uPixelRatio: shared.uPixelRatio, uScale: shared.uPointScale, uDay: shared.uDay },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 8;
  return pts;
}

/* ---------- campsite: fire ring, logs, tent ---------- */

export function insideCamp(x, z) {
  const fx = x - CAMP.fire.x, fz = z - CAMP.fire.z;
  if (fx * fx + fz * fz < 1.9 * 1.9) return true;
  const tx = x - CAMP.tent.x, tz = z - CAMP.tent.z;
  return tx * tx + tz * tz < 2.3 * 2.3;
}

export function createCamp(shared, rng) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x4a4e50, roughness: 1 });
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4130, roughness: 1 });
  const charred = new THREE.MeshStandardMaterial({ color: 0x120b07, roughness: 1, emissive: 0xff4a10, emissiveIntensity: 0.5 });

  // --- fire ring ---
  const fx = CAMP.fire.x, fz = CAMP.fire.z;
  const fy = terrainH(fx, fz);
  const fire = new THREE.Group();
  fire.position.set(fx, fy, fz);
  g.add(fire);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + rng() * 0.2;
    const s = 0.16 + rng() * 0.1;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 2), stone);
    m.position.set(Math.cos(a) * 0.82, s * 0.45, Math.sin(a) * 0.82);
    m.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    m.scale.y = 0.75;
    fire.add(m);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.05, 7), charred);
    log.position.set(Math.cos(a) * 0.26, 0.36, Math.sin(a) * 0.26);
    log.rotation.set(Math.sin(a) * -0.75, 0, Math.cos(a) * 0.75);
    fire.add(log);
  }

  const fireUniforms = { uTime: shared.uTime, uFire: shared.uFire, uPixelRatio: shared.uPixelRatio, uScale: shared.uPointScale };
  const flameGeo = new THREE.PlaneGeometry(1.9, 2.4);
  flameGeo.translate(0, 1.2, 0);
  const flame = new THREE.Mesh(flameGeo, new THREE.ShaderMaterial({
    vertexShader: flameVertex,
    fragmentShader: flameFragment,
    uniforms: fireUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }));
  flame.position.y = 0.08;
  flame.renderOrder = 9;
  fire.add(flame);

  const EMBERS = 46;
  const ePos = new Float32Array(EMBERS * 3);
  const eSeed = new Float32Array(EMBERS * 4);
  for (let i = 0; i < EMBERS; i++) {
    ePos[i * 3] = fx + (rng() - 0.5) * 0.4;
    ePos[i * 3 + 1] = fy + 0.5 + rng() * 0.3;
    ePos[i * 3 + 2] = fz + (rng() - 0.5) * 0.4;
    for (let k = 0; k < 4; k++) eSeed[i * 4 + k] = rng();
  }
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  eGeo.setAttribute('aSeed', new THREE.BufferAttribute(eSeed, 4));
  const embers = new THREE.Points(eGeo, new THREE.ShaderMaterial({
    vertexShader: emberVertex,
    fragmentShader: emberFragment,
    uniforms: fireUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  embers.frustumCulled = false;
  embers.renderOrder = 9;
  g.add(embers);

  const light = new THREE.PointLight(0xff8a3a, 5, 18, 2);
  light.position.set(fx, fy + 0.9, fz);
  g.add(light);

  // --- sitting logs: bark on the round, growth rings on the sawn ends ---
  const barkMap = barkTexture(rng);
  barkMap.repeat.set(2, 1);
  const barkMat = new THREE.MeshStandardMaterial({ map: barkMap, roughness: 1 });
  const ringMat = new THREE.MeshStandardMaterial({ map: ringTexture(rng), roughness: 1 });
  const logMats = [barkMat, ringMat, ringMat];
  const seats = [[3.0, -2.5, 0.5, 2.1], [6.4, -3.0, -0.7, 1.7]];
  for (const [x, z, yaw, len] of seats) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, len, 16), logMats);
    log.position.set(x, terrainH(x, z) + 0.22, z);
    log.rotation.set(0, yaw, Math.PI / 2);
    g.add(log);
  }
  // small wood pile
  for (let i = 0; i < 5; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 9), logMats);
    const x = 6.9 + (i % 3) * 0.19 + (i > 2 ? 0.1 : 0), z = -5.4;
    log.position.set(x, terrainH(x, z) + 0.09 + (i > 2 ? 0.16 : 0), z);
    log.rotation.set(Math.PI / 2, 0, 0.1 * (rng() - 0.5));
    g.add(log);
  }

  // --- A-frame tent, lantern-lit from inside ---
  const tx = CAMP.tent.x, tz = CAMP.tent.z;
  const tent = new THREE.Group();
  tent.position.set(tx, terrainH(tx, tz) - 0.05, tz);
  tent.rotation.y = CAMP.tent.yaw;
  const HW = 1.55, HH = 1.9, HL = 1.9;
  const cloth = canvasTexture(rng);
  const canvasMat = new THREE.MeshStandardMaterial({
    map: cloth, bumpMap: cloth.userData.bump, bumpScale: 0.5, roughness: 0.95, side: THREE.DoubleSide,
    emissive: 0xff7a2a, emissiveIntensity: 0.05,
  });
  // the fly sheet: a ridge that sags between its poles, panels that belly inward,
  // creases where the guy lines pull and slack cloth between the pegs
  const NU = 44, NV = 32;
  const cp = [], cuv = [], ci = [];
  for (let j = 0; j <= NV; j++) {
    const t = -1 + (2 * j) / NV;
    const ridge = HH - 0.13 * (1 - t * t);
    for (let i = 0; i <= NU; i++) {
      const sN = -1 + (2 * i) / NU, as = Math.abs(sN);
      const pull = Math.sin(Math.PI * as);
      let y = ridge * Math.pow(1 - as, 0.92) - 0.07 * pull * (1 - t * t);
      y += 0.020 * Math.sin(as * 8 + t * 3.1 + 1.4 * Math.sin(t * 4.2 + sN)) * pull;
      y += 0.011 * Math.sin(t * 13 + as * 5) * pull * (1 - t * t);
      y -= 0.034 * Math.pow(Math.sin(Math.PI * 1.5 * (t + 1)), 2) * as * (1 - as) * 2;
      const x = sN * (HW + 0.06) * (1 + 0.010 * Math.sin(t * 9 + as * 4) * pull);
      cp.push(x, Math.max(y, 0.0), t * HL);
      cuv.push(i / NU, j / NV);
    }
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      ci.push(a, c, b, b, c, d);
    }
  }
  const sheet = new THREE.BufferGeometry();
  sheet.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  sheet.setAttribute('uv', new THREE.Float32BufferAttribute(cuv, 2));
  sheet.setIndex(ci);
  sheet.computeVertexNormals();
  tent.add(new THREE.Mesh(sheet, canvasMat));
  const tri = new THREE.Shape();
  tri.moveTo(-HW, 0); tri.lineTo(HW, 0); tri.lineTo(0, HH); tri.closePath();
  for (const sz of [-1, 1]) {                       // end walls, cut from a plain part of the cloth
    const wg = new THREE.ShapeGeometry(tri);
    const uv = wg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.17 + 0.20 * (uv.getX(i) / HW * 0.5 + 0.5), 0.03 + 0.22 * (uv.getY(i) / HH));
    const wall = new THREE.Mesh(wg, canvasMat);
    wall.position.z = sz * HL;
    tent.add(wall);
  }
  const groundSheet = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, HL * 2), new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 1 }));
  groundSheet.rotation.x = -Math.PI / 2;
  groundSheet.position.y = 0.03;
  tent.add(groundSheet);
  // guy ropes down to pegs
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xcfc4a6, roughness: 1 });
  const rope = (ax, ay, az, bx, by, bz) => {
    const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, a.distanceTo(b), 5), ropeMat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    tent.add(m);
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.008, 0.22, 5), bark);
    peg.position.set(bx, 0.07, bz);
    peg.rotation.z = bx > 0 ? -0.5 : 0.5;
    tent.add(peg);
  };
  for (const sz of [-1, 1]) {
    rope(0, HH, sz * HL, 0, 0.02, sz * (HL + 1.5));
    for (const sx of [-1, 1]) rope(sx * HW * 0.5, HH * 0.52, sz * HL, sx * (HW + 0.9), 0.02, sz * (HL + 0.7));
  }
  for (const sx of [-1, 1]) for (const t of [-0.6, 0, 0.6]) rope(sx * HW * 0.92, 0.14, t * HL, sx * (HW + 0.75), 0.02, t * HL);
  // the doorway: two flaps tied back, the lantern-lit inside showing between them
  const door = new THREE.Shape();
  door.moveTo(-HW * 0.62, 0.02); door.lineTo(HW * 0.62, 0.02); door.lineTo(0, HH * 0.80); door.closePath();
  const doorMat = new THREE.ShaderMaterial({
    uniforms: { uLit: { value: 1 }, uDay: shared.uDay, uAmb: shared.uAmb, uSunCol: shared.uSunCol },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uLit;
      uniform float uDay;
      uniform vec3 uAmb;
      uniform vec3 uSunCol;
      varying vec2 vP;
      void main(){
        float hgt = clamp(vP.y / 1.52, 0.0, 1.0);
        float halfW = (0.40 * (1.0 - hgt) + 0.02) * (0.72 + 0.40 * sin(hgt * 3.14159));
        float open = 1.0 - smoothstep(halfW - 0.025, halfW + 0.025, abs(vP.x));
        vec3 lamp = vec3(1.0, 0.50, 0.15);
        float d = distance(vP, vec2(0.0, 1.20));
        float glow = exp(-d * d * 1.6);
        float bed = smoothstep(0.36, 0.30, vP.y);
        vec3 inside = lamp * (0.22 + 1.5 * glow);
        inside = mix(inside, lamp * vec3(0.60, 0.34, 0.44) * (0.45 + 0.25 * step(0.5, fract(vP.x * 5.0))), bed * 0.85);
        float fold = 0.5 + 0.5 * sin(abs(vP.x) * 26.0 - hgt * 6.0);
        vec3 flap = lamp * vec3(1.0, 0.78, 0.50) * (0.28 + 0.5 * fold) * (0.35 + glow);
        vec3 night = mix(flap, inside, open) * 1.5 * uLit;
        vec3 clothDay = vec3(0.34, 0.19, 0.075) * (0.50 + 0.50 * fold) * (uAmb * 0.9 + uSunCol * 0.22);
        vec3 inDay = vec3(0.010, 0.008, 0.007) + vec3(0.050, 0.030, 0.034) * bed * uAmb;
        gl_FragColor = vec4(night + mix(clothDay, inDay, open) * uDay, 1.0);
      }
    `,
  });
  const doorMesh = new THREE.Mesh(new THREE.ShapeGeometry(door), doorMat);
  doorMesh.position.z = HL + 0.012;
  tent.add(doorMesh);
  for (const sz of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, HH + 0.25, 8), bark);
    pole.position.set(0, (HH + 0.25) / 2, sz * (HL + 0.05));
    tent.add(pole);
  }
  const lanternMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 2.6, 0.9) });
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), lanternMat);
  lantern.position.set(0.0, HH * 0.86, HL + 0.16);
  tent.add(lantern);
  const cage = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6, metalness: 0.8 });
  for (const cyy of [0.085, -0.085]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.022, 8), cage);
    cap.position.set(0.0, HH * 0.86 + cyy, HL + 0.16);
    tent.add(cap);
  }
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 4), cage);
  hook.position.set(0.0, HH * 0.86 + 0.15, HL + 0.16);
  tent.add(hook);
  const tentLight = new THREE.PointLight(0xffb060, 2.2, 9, 2);
  tentLight.position.set(0, 1.0, HL + 0.9);
  tent.add(tentLight);
  g.add(tent);

  return {
    group: g, flame, light, tentLight, doorMat, canvasMat, charred,
    firePos: new THREE.Vector3(fx, fy + 0.9, fz),
    glows: [[lanternMat, 4.5, 2.6, 0.9]],
  };
}

/* ---------- tulip garden: colour stripes running toward the valley ---------- */
const TULIP_COLORS = [
  [0.86, 0.04, 0.05], [0.98, 0.70, 0.05], [0.95, 0.28, 0.46], [0.42, 0.10, 0.62],
  [0.92, 0.88, 0.80], [0.98, 0.36, 0.04], [0.80, 0.06, 0.22], [1.00, 0.86, 0.30],
];

function tulipGeometry() {
  const pos = [], info = [], idx = [];
  const v = (x, y, z, kind, open, shade) => { pos.push(x, y, z); info.push(kind, open, shade); return pos.length / 3 - 1; };
  const quad = (a, b, c, d) => idx.push(a, b, c, a, c, d);
  // stem: two crossed ribbons
  for (const [dx, dz] of [[0.02, 0], [0, 0.02]]) {
    quad(v(-dx, 0, -dz, 0, 0, 0.25), v(dx, 0, dz, 0, 0, 0.25), v(dx, 0.70, dz, 0, 0, 0.8), v(-dx, 0.70, -dz, 0, 0, 0.8));
  }
  // two leaves
  for (const sgn of [1, -1]) {
    const a = v(0, 0.02, 0, 0, 0, 0.3);
    const b = v(sgn * 0.11, 0.26, sgn * 0.03, 0, 0, 0.6);
    const c = v(sgn * 0.20, 0.46, sgn * 0.06, 0, 0, 0.95);
    const d = v(sgn * 0.03, 0.30, -sgn * 0.02, 0, 0, 0.55);
    idx.push(a, b, d, d, b, c);
  }
  // cup: five rings of eight, the rim alternating high/low to suggest petals
  const SEG = 8;
  const rings = [[0.66, 0.018, 0.0], [0.715, 0.058, 0.2], [0.80, 0.078, 0.5], [0.90, 0.074, 0.85], [1.0, 0.040, 1.0]];
  const start = pos.length / 3;
  rings.forEach(([y, r, open], ri) => {
    for (let s = 0; s < SEG; s++) {
      const a = (s / SEG) * Math.PI * 2;
      const top = ri === rings.length - 1;
      const yy = top ? y - (s % 2) * 0.075 : y;
      const shade = (0.22 + 0.78 * (ri / (rings.length - 1))) * (0.60 + 0.40 * Math.cos(a - 0.9));
      v(Math.cos(a) * r, yy, Math.sin(a) * r, 1, open, shade);
    }
  });
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let s = 0; s < SEG; s++) {
      const a = start + ri * SEG + s, b = start + ri * SEG + (s + 1) % SEG;
      quad(a, b, b + SEG, a + SEG);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aInfo', new THREE.Float32BufferAttribute(info, 3));
  g.setIndex(idx);
  return g;
}

export function createTulips(shared, rng, count) {
  const ROW = 0.44, STRIPE = 3.6;
  const offsets = new Float32Array(count * 3);
  const params = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  let n = 0, guard = 0;
  while (n < count && guard++ < count * 8) {
    const dist = 4.5 + 60 * Math.pow(rng(), 1.2);
    const z = 8 - dist;
    let x = (rng() - 0.5) * 2 * (9 + dist * 1.55);
    x = Math.round(x / ROW) * ROW + (rng() - 0.5) * 0.10;
    const sx = (x + 1000) / STRIPE;
    const lane = sx - Math.floor(sx);
    if (lane < 0.13) continue;                                   // grassy aisle between beds
    if (insideCabin(x, z, 1.4) || insideCamp(x, z)) continue;
    if (Math.hypot(x - CAMP.fire.x, z - CAMP.fire.z) < 3.6) continue;
    if (Math.hypot(x, z - 8) < 3.2) continue;                    // where you stand
    if (x > 10.5 && z > -7) continue;                            // the flower garden begins here
    const bed = Math.floor(sx);
    const ci = (bed * 5 + Math.floor(bed / 3) * 3 + 1000) % TULIP_COLORS.length;
    const c = TULIP_COLORS[ci];
    const far = Math.min(1, dist / 62);
    offsets[n * 3] = x;
    offsets[n * 3 + 1] = terrainH(x, z) - 0.02;
    offsets[n * 3 + 2] = z + (rng() - 0.5) * 0.12;
    params[n * 3] = (0.44 + rng() * 0.20) * (1 + far * 0.8);
    params[n * 3 + 1] = rng() * Math.PI * 2;
    params[n * 3 + 2] = rng();
    const tone = 0.82 + rng() * 0.36;
    colors[n * 3] = c[0] * tone; colors[n * 3 + 1] = c[1] * tone; colors[n * 3 + 2] = c[2] * tone;
    n++;
  }
  const base = tulipGeometry();
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.attributes.position);
  geo.setAttribute('aInfo', base.attributes.aInfo);
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 3));
  geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
  geo.instanceCount = n;
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    vertexShader: tulipVertex,
    fragmentShader: tulipFragment,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: shared.uTime,
      uDay: shared.uDay,
      uAmb: shared.uAmb,
      uSunCol: shared.uSunCol,
      uAuroraTint: shared.uAuroraTint,
      uCabinLight: shared.uCabinLight,
      uFireLight: shared.uFireLight,
      uFogColor: shared.uFogColor,
      uFogDensity: shared.uFogDensity,
    },
  }));
  mesh.frustumCulled = false;
  return mesh;
}
