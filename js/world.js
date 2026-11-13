import * as THREE from 'three';
import { terrainVertex, terrainFragment } from './shaders/terrain.js';
import {
  grassVertex, grassFragment, flowerVertex, flowerFragment, fireflyVertex, fireflyFragment, GRASS_R,
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
export function createTerrain(shared) {
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
    uniforms: {
      ...shared.aurora,
      ...shared.light,
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
  // ridged noise: sharp crests, wide valleys
  let ridged = 0, amp = 0.5, f = 0.0042, norm = 0;
  for (let o = 0; o < 5; o++) {
    const n = 1 - Math.abs(2 * noise2(x * f + o * 17.3, z * f - o * 9.1) - 1);
    ridged += amp * n * n;
    norm += amp;
    amp *= 0.5; f *= 2.07;
  }
  ridged /= norm;
  const massif = 0.45 + 0.55 * noise2(x * 0.0016 + 40, z * 0.0016 + 11);     // some ranges taller than others
  const plateau = Math.min(ridged, 0.62 + 0.25 * noise2(x * 0.004, z * 0.004)); // flat Nordic summits
  return ramp * (26 + 330 * Math.pow(plateau, 1.25) * massif);
}

/* ---------- the fjells: a ring of real terrain around the valley ---------- */
export function createMountains(shared, detail = 1) {
  const SEG = Math.round(300 * detail), RINGS = Math.round(46 * detail);
  const pos = new Float32Array((SEG + 1) * (RINGS + 1) * 3);
  const rise = new Float32Array((SEG + 1) * (RINGS + 1));
  const idx = [];
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
  for (let j = 0; j < RINGS; j++) {
    for (let i = 0; i < SEG; i++) {
      const a = j * (SEG + 1) + i, b = a + 1, c = a + SEG + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRise', new THREE.BufferAttribute(rise, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    vertexShader: mountainVertex,
    fragmentShader: mountainFragment,
    uniforms: {
      ...shared.light,
      uTime: shared.uTime,
      uDay: shared.uDay,
      uAmb: shared.uAmb,
      uSunCol: shared.uSunCol,
      uSunDir: shared.uSunDir,
      uAuroraTint: shared.uAuroraTint,
      uFogColor: shared.uFogColor,
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
    g.fillStyle = 'rgba(8,4,2,0.75)';
    g.fillRect(0, p * ph, 256, 4);
    g.fillStyle = 'rgba(160,120,80,0.10)';
    g.fillRect(0, p * ph + 4, 256, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
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
  for (let i = 0; i < 160; i++) {
    bg.fillStyle = `rgba(0,0,0,${0.04 + rng() * 0.08})`;
    bg.fillRect(rng() * 256, rng() * 256, 30 + rng() * 120, 1);
  }
  const bump = new THREE.CanvasTexture(b);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  t.userData.bump = bump;
  return t;
}

/* ---------- woven canvas for the tent ---------- */
function canvasTexture(rng) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#b0623a';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) {
    g.fillStyle = `rgba(${rng() < 0.5 ? '255,220,180' : '60,20,5'},${0.03 + rng() * 0.05})`;
    g.fillRect(i, 0, 1, 128);
    g.fillRect(0, i, 128, 1);
  }
  g.fillStyle = 'rgba(40,14,4,0.35)';
  g.fillRect(0, 62, 128, 3);                       // a stitched seam
  for (let i = 0; i < 26; i++) {                   // weather stains
    g.fillStyle = `rgba(60,30,12,${0.03 + rng() * 0.05})`;
    g.beginPath();
    g.arc(rng() * 128, rng() * 128, 6 + rng() * 22, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- Nordic turf-roof cabin ---------- */

export function createCabin(rng, shared) {
  const g = new THREE.Group();
  const woodMap = woodTexture(rng);
  const wood = new THREE.MeshStandardMaterial({ map: woodMap, bumpMap: woodMap.userData.bump, bumpScale: 2.2, roughness: 0.9, metalness: 0 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x24160c, roughness: 0.95 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x34383a, roughness: 1 });
  const turf = new THREE.MeshStandardMaterial({ color: 0x1c3a19, roughness: 1 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.75, 0.5) });
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 2.8, 0.9) });

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
  g.add(new THREE.Mesh(bodyGeo, wood));

  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  box(W * 2 + 0.3, 2.4, L * 2 + 0.3, stone, 0, -1.2, 0);           // foundation

  // notched log ends sticking out at the four corners, course by course
  const endGrain = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 1 });
  const logEnd = new THREE.CylinderGeometry(0.155, 0.155, 0.36, 10);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let k = 0; k < 7; k++) {
        const y = 0.17 + k * 0.33;
        const along = new THREE.Mesh(logEnd, k % 2 ? wood : endGrain);       // runs along Z
        along.rotation.x = Math.PI / 2;
        along.position.set(sx * (W - 0.03), y, sz * (L + 0.17));
        const across = new THREE.Mesh(logEnd, k % 2 ? endGrain : wood);      // runs along X
        across.rotation.z = Math.PI / 2;
        across.position.set(sx * (W + 0.17), y + 0.165, sz * (L - 0.03));
        g.add(along, across);
      }
    }
  }
  // a window box of flowers under the gable window, and shutters
  box(1.25, 0.16, 0.22, darkWood, 0.95, 0.74, L + 0.14);
  for (const sx of [-1, 1]) box(0.34, 1.05, 0.05, endGrain, 0.95 + sx * 0.74, 1.38, L + 0.05);

  // turf roof slabs
  const a = Math.atan2(ridgeH - wallH, W);
  const slabLen = 3.25, slabT = 0.24;
  const cx = Math.cos(a) * (slabLen / 2 - 0.05) + Math.sin(a) * slabT * 0.5;
  const cy = ridgeH - Math.sin(a) * (slabLen / 2 - 0.05) + Math.cos(a) * slabT * 0.5;
  const roofR = box(slabLen, slabT, L * 2 + 0.7, turf, cx, cy, 0);
  roofR.rotation.z = -a;
  const roofL = box(slabLen, slabT, L * 2 + 0.7, turf, -cx, cy, 0);
  roofL.rotation.z = a;
  // timber verge boards
  for (const sz of [-1, 1]) {
    const vr = box(slabLen, 0.14, 0.1, darkWood, cx, cy - 0.06, sz * (L + 0.36));
    vr.rotation.z = -a;
    const vl = box(slabLen, 0.14, 0.1, darkWood, -cx, cy - 0.06, sz * (L + 0.36));
    vl.rotation.z = a;
  }
  box(0.55, 1.2, 0.55, stone, 0.95, 3.75, -1.5);                    // chimney

  // gable (+Z): door, window
  box(0.95, 1.95, 0.08, darkWood, -0.85, 0.98, L + 0.03);
  box(0.06, 0.06, 0.06, lampMat, -0.52, 1.0, L + 0.09);             // brass knob catch-light
  box(1.05, 1.05, 0.05, glow, 0.95, 1.38, L + 0.02);
  box(1.2, 0.09, 0.1, darkWood, 0.95, 1.94, L + 0.04);
  box(1.2, 0.09, 0.1, darkWood, 0.95, 0.82, L + 0.04);
  box(0.09, 1.2, 0.1, darkWood, 0.39, 1.38, L + 0.04);
  box(0.09, 1.2, 0.1, darkWood, 1.51, 1.38, L + 0.04);
  box(0.05, 1.05, 0.08, darkWood, 0.95, 1.38, L + 0.04);
  box(1.05, 0.05, 0.08, darkWood, 0.95, 1.38, L + 0.04);
  box(0.42, 0.42, 0.05, glow, 0, 3.0, L + 0.02);                    // attic light

  // long side (-X): two windows
  for (const wz of [-1.45, 1.35]) {
    box(0.05, 0.9, 1.15, glow, -W - 0.02, 1.38, wz);
    box(0.1, 0.08, 1.3, darkWood, -W - 0.04, 1.87, wz);
    box(0.1, 0.08, 1.3, darkWood, -W - 0.04, 0.89, wz);
    box(0.1, 1.05, 0.08, darkWood, -W - 0.04, 1.38, wz - 0.61);
    box(0.1, 1.05, 0.08, darkWood, -W - 0.04, 1.38, wz + 0.61);
    box(0.08, 0.9, 0.05, darkWood, -W - 0.04, 1.38, wz);
    box(0.08, 0.05, 1.15, darkWood, -W - 0.04, 1.38, wz);
  }

  // porch deck with railing
  const deckD = 2.3;
  box(W * 2 + 0.6, 0.14, deckD, wood, 0, 0.02, L + deckD / 2);
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

  // porch lantern
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), lampMat);
  lamp.position.set(-0.1, 2.1, L + 0.16);
  g.add(lamp);
  const light = new THREE.PointLight(0xffa24a, 7, 30, 2);
  light.position.set(-0.1, 2.0, L + 0.9);
  g.add(light);

  const y = terrainH(CABIN.x, CABIN.z) + 0.25;
  g.position.set(CABIN.x, y, CABIN.z);
  g.rotation.y = CABIN.yaw;
  g.updateMatrixWorld(true);

  const lightWorld = light.getWorldPosition(new THREE.Vector3());

  // smoke curling from the chimney
  const top = g.localToWorld(new THREE.Vector3(0.95, 4.42, -1.5));
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
  return { group: g, roofs: [roofL, roofR], lightWorld, light, smoke, glows: [[glow, 3.4, 1.75, 0.5], [lampMat, 5.0, 2.8, 0.9]] };
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
  const mat = new THREE.MeshStandardMaterial({ color: 0x4b4034, roughness: 1 });
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
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, h + 0.5, 0.15), mat);
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
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len + 0.25, 0.1, 0.055), mat);
        rail.position.copy(p0).addScaledVector(dir, 0.5);
        rail.quaternion.setFromUnitVectors(up, dir.normalize());
        g.add(rail);
      }
    }
  }
  return g;
}

/* ---------- mossy rocks ---------- */
export function createRocks(rng) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const spots = [
    [9.5, -2.5, 1.25], [11.8, -4.2, 0.7], [14.5, -1.8, 0.9], [-5.5, 0.4, 0.55],
    [3.4, -12, 0.8], [18, -9, 1.5], [-22, -9, 1.1], [7.5, 2.2, 0.5],
    [22, -30, 1.8], [-30, -34, 2.2], [35, -60, 2.6], [-8, -48, 1.6],
  ];
  const rock = new THREE.Color(0x7d8386);
  const moss = new THREE.Color(0x4a7a36);
  const tmp = new THREE.Color();
  for (const [x, z, s] of spots) {
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const p = geo.attributes.position;
    const seed = rng() * 100;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = Math.sin(v.x * 2.3 + seed) * Math.sin(v.y * 2.9 + seed * 1.3) * Math.sin(v.z * 2.1 + seed * 0.7);
      v.multiplyScalar(1 + n * 0.28);
      v.y *= 0.62;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    const colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const k = smooth((nrm.getY(i) - 0.25) / 0.5) * (0.6 + 0.4 * Math.sin(p.getX(i) * 5 + seed));
      tmp.copy(rock).lerp(moss, Math.max(0, k));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, terrainH(x, z) + s * 0.12, z);
    m.scale.setScalar(s);
    m.rotation.y = rng() * 6.28;
    g.add(m);
  }
  return g;
}

/* ---------- grass + wildflowers ---------- */
export function createGrass(shared, rng, count, cabin) {
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

  // one tile of blades; the vertex shader wraps it around the walker
  const offsets = new Float32Array(count * 3);
  const params = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    offsets[i * 3] = (rng() * 2 - 1) * GRASS_R;
    offsets[i * 3 + 2] = (rng() * 2 - 1) * GRASS_R;
    params[i * 4] = 0.42 + rng() * 0.62;
    params[i * 4 + 1] = rng() * Math.PI;
    params[i * 4 + 2] = rng();
    params[i * 4 + 3] = 0.028 + rng() * 0.026;
  }
  const meadow = build(offsets, params, count, {});

  // turf on the cabin roof stays where it is
  const roofCount = Math.floor(count * 0.03);
  const ro = new Float32Array(roofCount * 3);
  const rp = new Float32Array(roofCount * 4);
  const v = new THREE.Vector3();
  for (let i = 0; i < roofCount; i++) {
    const roof = cabin.roofs[i % 2];
    v.set((rng() - 0.5) * 3.2, 0.12, (rng() - 0.5) * 7.0).applyMatrix4(roof.matrixWorld);
    ro[i * 3] = v.x; ro[i * 3 + 1] = v.y; ro[i * 3 + 2] = v.z;
    rp[i * 4] = 0.16 + rng() * 0.3;
    rp[i * 4 + 1] = rng() * Math.PI;
    rp[i * 4 + 2] = rng();
    rp[i * 4 + 3] = 0.04 + rng() * 0.03;
  }
  const group = new THREE.Group();
  group.add(meadow, build(ro, rp, roofCount, { STATIC: '' }));
  group.userData.meadow = meadow;
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

  // --- sitting logs ---
  const seats = [[3.0, -2.5, 0.5, 2.1], [6.4, -3.0, -0.7, 1.7]];
  for (const [x, z, yaw, len] of seats) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, len, 10), bark);
    log.position.set(x, terrainH(x, z) + 0.22, z);
    log.rotation.set(0, yaw, Math.PI / 2);
    g.add(log);
  }
  // small wood pile
  for (let i = 0; i < 5; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 7), bark);
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
  const tri = new THREE.Shape();
  tri.moveTo(-HW, 0); tri.lineTo(HW, 0); tri.lineTo(0, HH); tri.closePath();
  const cloth = canvasTexture(rng);
  cloth.repeat.set(2, 2);
  const canvasMat = new THREE.MeshStandardMaterial({
    map: cloth, color: 0xc9a58a, roughness: 0.96, side: THREE.DoubleSide, emissive: 0xff7a2a, emissiveIntensity: 0.05,
  });
  // the fly sheet: a ridge that sags between its poles and panels that belly inward
  const NU = 14, NV = 12;
  const cp = [], cuv = [], ci = [];
  for (let j = 0; j <= NV; j++) {
    const t = -1 + (2 * j) / NV;
    const ridge = HH - 0.13 * (1 - t * t);
    for (let i = 0; i <= NU; i++) {
      const sN = -1 + (2 * i) / NU, as = Math.abs(sN);
      const y = ridge * Math.pow(1 - as, 0.92) - 0.07 * Math.sin(Math.PI * as) * (1 - t * t);
      cp.push(sN * (HW + 0.06), Math.max(y, 0.0), t * HL);
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
  for (const sz of [-1, 1]) {                       // end walls
    const wall = new THREE.Mesh(new THREE.ShapeGeometry(tri), canvasMat);
    wall.position.z = sz * HL;
    tent.add(wall);
  }
  const groundSheet = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, HL * 2), new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 1 }));
  groundSheet.rotation.x = -Math.PI / 2;
  groundSheet.position.y = 0.03;
  tent.add(groundSheet);
  // guy ropes down to pegs
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 1 });
  const rope = (ax, ay, az, bx, by, bz) => {
    const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, a.distanceTo(b), 4), ropeMat);
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
  const door = new THREE.Shape();
  door.moveTo(-HW * 0.62, 0.02); door.lineTo(HW * 0.62, 0.02); door.lineTo(0, HH * 0.80); door.closePath();
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.74, 0.22) });
  const doorMesh = new THREE.Mesh(new THREE.ShapeGeometry(door), glowMat);
  doorMesh.position.z = HL + 0.012;
  tent.add(doorMesh);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.035, HH * 0.8, 0.02), new THREE.MeshStandardMaterial({ color: 0x5a2a16, roughness: 1 }));
  flap.position.set(0, HH * 0.4, HL + 0.02);
  tent.add(flap);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, HH + 0.25, 6), bark);
  pole.position.set(0, (HH + 0.25) / 2, HL + 0.05);
  tent.add(pole);
  const lanternMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 2.6, 0.9) });
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), lanternMat);
  lantern.position.set(0.0, HH * 0.86, HL + 0.16);
  tent.add(lantern);
  const tentLight = new THREE.PointLight(0xffb060, 2.2, 9, 2);
  tentLight.position.set(0, 1.0, HL + 0.9);
  tent.add(tentLight);
  g.add(tent);

  return {
    group: g, flame, light, tentLight,
    firePos: new THREE.Vector3(fx, fy + 0.9, fz),
    glows: [[glowMat, 1.5, 0.74, 0.22], [lanternMat, 4.5, 2.6, 0.9]],
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
