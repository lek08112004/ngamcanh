// The flower garden east of the camp: roses, lavender, sunflowers, daisies,
// a rose arch and cherry trees. Every flower is an instanced low-poly model
// drawn with the tulip shader (wind sway, opens by day, closes at night).
import * as THREE from 'three';
import { tulipVertex, tulipFragment } from './shaders/tulip.js';
import { terrainH } from './world.js';
import { GARDEN } from './layout.js';

/* ---------- tiny mesh builder: position + (kind, open, shade) per vertex ---------- */
class Geo {
  constructor() { this.p = []; this.n = []; this.x = []; }
  v(x, y, z, kind, open, shade) { this.p.push(x, y, z); this.n.push(kind, open, shade); return this.p.length / 3 - 1; }
  tri(a, b, c) { this.x.push(a, b, c); }
  quad(a, b, c, d) { this.x.push(a, b, c, a, c, d); }
  stem(h, w) {
    for (const [dx, dz] of [[w, 0], [0, w]]) {
      this.quad(this.v(-dx, 0, -dz, 0, 0, 0.25), this.v(dx, 0, dz, 0, 0, 0.25), this.v(dx, h, dz, 0, 0, 0.8), this.v(-dx, h, -dz, 0, 0, 0.8));
    }
  }
  leaf(y0, ang, len, wid, rise) {
    const dx = Math.cos(ang), dz = Math.sin(ang);
    const b = this.v(0, y0, 0, 0, 0, 0.3);
    const mx = dx * len * 0.5, mz = dz * len * 0.5, my = y0 + rise * 0.65;
    const l = this.v(mx - dz * wid, my, mz + dx * wid, 0, 0, 0.6);
    const r = this.v(mx + dz * wid, my, mz - dx * wid, 0, 0, 0.55);
    const t = this.v(dx * len, y0 + rise, dz * len, 0, 0, 0.95);
    this.tri(b, l, t); this.tri(b, t, r);
  }
  /** rings: [y, radius, open, shade]; `zig` drops every other rim vertex to hint at petals */
  cup(rings, seg, rot = 0, zig = 0, kind = 1) {
    const start = this.p.length / 3;
    rings.forEach(([y, r, open, shade], ri) => {
      for (let s = 0; s < seg; s++) {
        const a = rot + (s / seg) * Math.PI * 2;
        const yy = ri === rings.length - 1 ? y - (s % 2) * zig : y;
        this.v(Math.cos(a) * r, yy, Math.sin(a) * r, kind, open, shade * (0.62 + 0.38 * Math.cos(a - 0.9)));
      }
    });
    for (let ri = 0; ri < rings.length - 1; ri++) {
      for (let s = 0; s < seg; s++) {
        const a = start + ri * seg + s, b = start + ri * seg + (s + 1) % seg;
        this.quad(a, b, b + seg, a + seg);
      }
    }
  }
  /** a daisy-like head: centre disc + pointed petals, in the plane through `c` with normal `nrm` */
  head(c, nrm, rc, rp, petals, open) {
    const n = new THREE.Vector3(...nrm).normalize();
    const u = new THREE.Vector3(1, 0, 0);
    if (Math.abs(n.x) > 0.9) u.set(0, 0, 1);
    u.sub(n.clone().multiplyScalar(u.dot(n))).normalize();
    const w = new THREE.Vector3().crossVectors(n, u);
    const at = (a, r, lift = 0) => [
      c[0] + (u.x * Math.cos(a) + w.x * Math.sin(a)) * r + n.x * lift,
      c[1] + (u.y * Math.cos(a) + w.y * Math.sin(a)) * r + n.y * lift,
      c[2] + (u.z * Math.cos(a) + w.z * Math.sin(a)) * r + n.z * lift,
    ];
    const centre = this.v(c[0] + n.x * rc * 0.35, c[1] + n.y * rc * 0.35, c[2] + n.z * rc * 0.35, 2, 0, 0.9);
    const SEG = 8;
    const ring = [];
    for (let s = 0; s < SEG; s++) ring.push(this.v(...at((s / SEG) * Math.PI * 2, rc), 2, 0, 0.45));
    for (let s = 0; s < SEG; s++) this.tri(centre, ring[s], ring[(s + 1) % SEG]);
    const half = (Math.PI / petals) * 0.78;
    for (let k = 0; k < petals; k++) {
      const a = (k / petals) * Math.PI * 2;
      const b0 = this.v(...at(a - half, rc * 0.9), 1, 0, 0.55);
      const b1 = this.v(...at(a + half, rc * 0.9), 1, 0, 0.6);
      const tip = this.v(...at(a, rp, rp * 0.12), 1, open, 1.0);
      this.tri(b0, b1, tip);
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('aInfo', new THREE.Float32BufferAttribute(this.n, 3));
    g.setIndex(this.x);
    return g;
  }
}

/* ---------- species ---------- */
function roseGeo() {
  const g = new Geo();
  g.stem(0.70, 0.016);
  g.leaf(0.20, 0.3, 0.17, 0.05, 0.05);
  g.leaf(0.36, 2.5, 0.16, 0.045, 0.05);
  g.leaf(0.52, 4.6, 0.14, 0.04, 0.04);
  g.cup([[0.70, 0.03, 0, 0.25], [0.75, 0.105, 0.20, 0.50], [0.84, 0.135, 0.35, 0.80], [0.90, 0.125, 0.35, 1.0]], 7, 0, 0.03);
  g.cup([[0.74, 0.03, 0, 0.30], [0.82, 0.075, 0.15, 0.60], [0.93, 0.085, 0.25, 0.95]], 6, 0.4, 0.02);
  g.cup([[0.80, 0.02, 0, 0.35], [0.90, 0.040, 0.05, 0.70], [0.965, 0.030, 0.05, 1.0]], 5, 0.9, 0);
  return g.build();
}
function lavenderGeo() {
  const g = new Geo();
  g.stem(0.56, 0.009);
  g.leaf(0.05, 0.6, 0.20, 0.014, 0.14);
  g.leaf(0.08, 3.6, 0.18, 0.012, 0.12);
  for (let k = 0; k < 6; k++) {
    const y = 0.58 + k * 0.074, r = 0.038 * (1 - k * 0.10), sh = 0.4 + k * 0.12;
    g.cup([[y - 0.045, 0.004, 0, sh * 0.7], [y, r, 0, sh], [y + 0.045, 0.004, 0, sh]], 4, k * 0.8, 0);
  }
  return g.build();
}
function sunflowerGeo() {
  const g = new Geo();
  g.stem(0.89, 0.016);
  g.leaf(0.28, 0.4, 0.26, 0.09, 0.02);
  g.leaf(0.48, 2.7, 0.24, 0.085, 0.02);
  g.leaf(0.66, 5.0, 0.20, 0.07, 0.02);
  g.head([0, 0.905, 0.035], [0, 0.42, 0.9], 0.085, 0.195, 14, 0);
  return g.build();
}
function daisyGeo() {
  const g = new Geo();
  g.stem(0.90, 0.011);
  g.leaf(0.10, 1.0, 0.26, 0.03, 0.10);
  g.leaf(0.16, 4.0, 0.22, 0.028, 0.10);
  g.head([0, 0.92, 0], [0, 1, 0.12], 0.05, 0.19, 9, 1);
  return g.build();
}

/* ---------- instancing ---------- */
function instanced(geometry, material, list) {
  const n = list.length;
  const off = new Float32Array(n * 3), par = new Float32Array(n * 3), col = new Float32Array(n * 3);
  list.forEach((f, i) => {
    off[i * 3] = f.x; off[i * 3 + 1] = f.y; off[i * 3 + 2] = f.z;
    par[i * 3] = f.h; par[i * 3 + 1] = f.yaw; par[i * 3 + 2] = f.seed;
    col[i * 3] = f.c[0]; col[i * 3 + 1] = f.c[1]; col[i * 3 + 2] = f.c[2];
  });
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = geometry.index;
  geo.setAttribute('position', geometry.attributes.position);
  geo.setAttribute('aInfo', geometry.attributes.aInfo);
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(par, 3));
  geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(col, 3));
  geo.instanceCount = n;
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return mesh;
}

const petalVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
attribute vec4 aSeed;
varying float vA;
void main(){
  float life = fract(uTime * (0.045 + aSeed.y * 0.05) + aSeed.x);
  vec3 p = position;
  p.y -= life * (3.6 + aSeed.w);
  p.x += sin(life * 7.0 + aSeed.z * 30.0) * 0.6 + life * 1.6;
  p.z += cos(life * 5.0 + aSeed.w * 30.0) * 0.6 + life * 0.6;
  vA = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.85, 1.0, life));
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uScale * uPixelRatio * 0.085 / -mv.z, 1.0, 10.0);
}
`;
const petalFragment = /* glsl */ `
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uAuroraTint;
varying float vA;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  if (dot(q, q) > 1.0 || vA < 0.02) discard;
  vec3 col = vec3(0.50, 0.26, 0.34) * (uAmb + uSunCol * 0.7 + uAuroraTint);
  gl_FragColor = vec4(col, 1.0);
}
`;

const ROSES = [[0.80, 0.03, 0.06], [0.95, 0.30, 0.45], [0.95, 0.90, 0.85], [0.98, 0.78, 0.20], [0.98, 0.52, 0.38], [0.55, 0.02, 0.10]];
const DAISIES = [[0.95, 0.95, 0.90], [0.95, 0.52, 0.72], [0.82, 0.22, 0.52], [0.98, 0.92, 0.55], [0.95, 0.95, 0.90]];

export const GARDEN_TREES = [[GARDEN.x, GARDEN.z], [GARDEN.x - 5.5, GARDEN.z + 9.5], [GARDEN.x + 10, GARDEN.z - 1.5]];
export const GARDEN_ARCH = { x: GARDEN.x - 8.5, z: GARDEN.z };

export function createGarden(shared, rng, scale) {
  const group = new THREE.Group();
  const cx = GARDEN.x, cz = GARDEN.z;
  const mat = new THREE.ShaderMaterial({
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
  });
  const tone = (c) => { const t = 0.82 + rng() * 0.36; return [c[0] * t, c[1] * t, c[2] * t]; };
  const place = (x, z, h, c, yaw) => ({ x, y: terrainH(x, z) - 0.02, z, h, yaw: yaw === undefined ? rng() * Math.PI * 2 : yaw, seed: rng(), c: tone(c) });

  /* --- roses: a ring bed around the central cherry tree, cut by four paths --- */
  const roses = [];
  for (let i = 0, n = Math.floor(1700 * scale); i < n; i++) {
    const a = rng() * Math.PI * 2;
    if (Math.abs(Math.sin(2 * a)) < 0.16) continue;
    const r = 3.75 + rng() * 2.35;
    const sector = Math.floor((a / (Math.PI * 2)) * 6) % 6;
    roses.push(place(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0.55 + rng() * 0.28, ROSES[sector]));
  }
  // border beds either side of the arch
  const ax = GARDEN_ARCH.x;
  for (let i = 0, n = Math.floor(620 * scale); i < n; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const z = cz + side * (2.4 + rng() * 7.5);
    const x = ax - 0.9 + rng() * 2.0;
    roses.push(place(x, z, 0.5 + rng() * 0.3, ROSES[1 + Math.floor(rng() * 2)]));
  }
  // climbing roses over the arch
  const baseY = terrainH(ax, cz);
  for (let i = 0, n = Math.floor(380 * scale); i < n; i++) {
    const u = rng();
    let y, z;
    if (u < 0.3) { const s = rng() < 0.5 ? -1 : 1; z = cz + s * 1.4; y = rng() * 1.45; }
    else { const t = rng() * Math.PI; z = cz + Math.cos(t) * 1.4; y = 1.45 + Math.sin(t) * 1.3; }
    const h = 0.20 + rng() * 0.14;
    roses.push({
      x: ax - 0.15 + rng() * 0.9, y: baseY + y - h * 0.8 + (rng() - 0.5) * 0.2, z: z + (rng() - 0.5) * 0.3,
      h, yaw: rng() * 6.28, seed: rng(), c: tone(ROSES[rng() < 0.6 ? 1 : rng() < 0.5 ? 0 : 2]),
    });
  }
  group.add(instanced(roseGeo(), mat, roses));

  /* --- lavender rows --- */
  const lav = [];
  for (let row = 0; row < 11; row++) {
    const z = cz + 5.2 + row * 0.95;
    for (let x = cx + 3; x < cx + 17; x += 0.3 / Math.max(scale, 0.4)) {
      for (let k = 0; k < 3; k++) {
        lav.push(place(x + (rng() - 0.5) * 0.22, z + (rng() - 0.5) * 0.26, 0.48 + rng() * 0.24, [0.42 + rng() * 0.1, 0.28, 0.86]));
      }
    }
  }
  group.add(instanced(lavenderGeo(), mat, lav));

  /* --- sunflowers, all turned to the morning sun --- */
  const sun = shared.uSunDir.value;
  const sunYaw = Math.atan2(-sun.x, sun.z);
  const sf = [];
  for (let i = 0, n = Math.floor(340 * scale); i < n; i++) {
    const x = cx + 5 + rng() * 13, z = cz - 15 + rng() * 10;
    sf.push(place(x, z, 1.4 + rng() * 0.55, [1.0, 0.70, 0.05], sunYaw + (rng() - 0.5) * 0.5));
  }
  group.add(instanced(sunflowerGeo(), mat, sf));

  /* --- daisies and cosmos scattered between the beds and out into the meadow --- */
  const dz = [];
  for (let i = 0, n = Math.floor(3200 * scale); i < n; i++) {
    const x = cx + (rng() * 2 - 1) * (GARDEN.hx + 5), z = cz + (rng() * 2 - 1) * (GARDEN.hz + 5);
    const dc = Math.hypot(x - cx, z - cz);
    if (dc < 8.0) continue;                                               // the rose ring and its walks
    if (Math.sin(x * 0.55) * Math.sin(z * 0.6 + 1.0) < -0.25) continue;   // drifts, not a carpet
    dz.push(place(x, z, 0.30 + rng() * 0.24, DAISIES[Math.floor(rng() * DAISIES.length)]));
  }
  group.add(instanced(daisyGeo(), mat, dz));

  /* --- rose arch --- */
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6a2c, roughness: 1, flatShading: true, emissive: 0x0c2a0e, emissiveIntensity: 0.6 });
  for (const ox of [0.0, 0.6]) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 6, 22, Math.PI), wood);
    arc.rotation.y = Math.PI / 2;
    arc.position.set(ax + ox, baseY + 1.45, cz);
    group.add(arc);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.9, 6), wood);
      post.position.set(ax + ox, baseY + 0.5, cz + s * 1.4);
      group.add(post);
    }
  }
  for (let i = 0; i < 30; i++) {
    const t = (i / 29) * Math.PI;
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13 + rng() * 0.09, 0), leafMat);
    blob.position.set(ax + 0.3 + (rng() - 0.5) * 0.5, baseY + 1.45 + Math.sin(t) * 1.3, cz + Math.cos(t) * 1.4);
    blob.rotation.set(rng() * 3, rng() * 3, 0);
    group.add(blob);
  }

  /* --- cherry trees with drifting petals --- */
  const bark = new THREE.MeshStandardMaterial({ color: 0x33221a, roughness: 1 });
  const blossom = new THREE.MeshStandardMaterial({ color: 0xf6a8c6, roughness: 1, flatShading: true, emissive: 0x7a2a48, emissiveIntensity: 0.5 });
  const blossom2 = new THREE.MeshStandardMaterial({ color: 0xfdd6e4, roughness: 1, flatShading: true, emissive: 0x7a3a52, emissiveIntensity: 0.5 });
  const petalPos = [], petalSeed = [];
  for (const [tx, tz] of GARDEN_TREES) {
    const ty = terrainH(tx, tz);
    const tree = new THREE.Group();
    tree.position.set(tx, ty, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.27, 2.5, 8), bark);
    trunk.position.y = 1.25;
    trunk.rotation.z = (rng() - 0.5) * 0.12;
    tree.add(trunk);
    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2 + rng();
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.10, 1.9, 6), bark);
      br.position.set(Math.cos(a) * 0.62, 2.85, Math.sin(a) * 0.62);
      br.rotation.set(Math.sin(a) * 0.75, 0, -Math.cos(a) * 0.75);
      tree.add(br);
    }
    // many small tufts of blossom rather than a few big lumps
    for (let k = 0; k < 90; k++) {
      const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * 2.7;
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + rng() * 0.26, 1), k % 3 ? blossom : blossom2);
      blob.position.set(Math.cos(a) * rr, 3.3 + rng() * 1.5 - rr * rr * 0.10, Math.sin(a) * rr);
      blob.rotation.set(rng() * 3, rng() * 3, 0);
      blob.scale.y = 0.7;
      tree.add(blob);
    }
    group.add(tree);
    for (let i = 0, n = Math.floor(70 * scale); i < n; i++) {
      const a = rng() * Math.PI * 2, rr = rng() * 2.2;
      petalPos.push(tx + Math.cos(a) * rr, ty + 4.0 + rng() * 0.8, tz + Math.sin(a) * rr);
      petalSeed.push(rng(), rng(), rng(), rng());
    }
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(petalPos, 3));
  pg.setAttribute('aSeed', new THREE.Float32BufferAttribute(petalSeed, 4));
  const petals = new THREE.Points(pg, new THREE.ShaderMaterial({
    vertexShader: petalVertex,
    fragmentShader: petalFragment,
    uniforms: {
      uTime: shared.uTime, uPixelRatio: shared.uPixelRatio, uScale: shared.uPointScale,
      uAmb: shared.uAmb, uSunCol: shared.uSunCol, uAuroraTint: shared.uAuroraTint,
    },
  }));
  petals.frustumCulled = false;
  group.add(petals);

  /* --- a bench under the blossom --- */
  const bench = new THREE.Group();
  const plank = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); m.position.set(x, y, z); bench.add(m); };
  plank(1.8, 0.07, 0.5, 0, 0.46, 0);
  plank(1.8, 0.45, 0.06, 0, 0.78, -0.24);
  for (const sx of [-0.8, 0.8]) { plank(0.08, 0.46, 0.46, sx, 0.23, 0); }
  bench.position.set(cx - 1.6, terrainH(cx - 1.6, cz + 1.7), cz + 1.7);
  bench.rotation.y = 2.2;
  group.add(bench);

  return group;
}

/* ---------- trail signposts ---------- */
export function createSignposts(places) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
  const cap = new THREE.MeshStandardMaterial({ color: 0xc8a35a, roughness: 0.9, emissive: 0x4a3410, emissiveIntensity: 0.5 });
  for (const p of places) {
    if (p.sign === false) continue;
    const [sx, sz] = p.signAt || [p.x + 1.6, p.z + 1.2];
    const y = terrainH(sx, sz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.9, 6), wood);
    post.position.set(sx, y + 0.95, sz);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 0.05), wood);
    board.position.set(sx, y + 1.62, sz);
    board.rotation.y = Math.atan2(p.x - sx, p.z - sz) + Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), cap);
    tip.position.set(sx, y + 1.98, sz);
    group.add(post, board, tip);
    // a small cairn beside it
    for (let k = 0; k < 4; k++) {
      const st = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 - k * 0.035, 0), new THREE.MeshStandardMaterial({ color: 0x6a6e70, roughness: 1, flatShading: true }));
      st.position.set(sx + 0.55, y + 0.12 + k * 0.2, sz + 0.2);
      st.rotation.set(k, k * 2, 0);
      st.scale.y = 0.7;
      group.add(st);
    }
  }
  return group;
}
