// Flowers and trees: the tulip beds, and the garden east of the camp with roses,
// lavender, sunflowers, daisies, a rose arch and cherry trees.
// Each flower is an instanced model built from smooth curved strips (petals, leaves)
// that carry UVs; the flower shader cuts their outlines per pixel and lights them.
import * as THREE from 'three';
import {
  tulipVertex, tulipFragment, cardVertex, cardFragment, flowerDepthFragment, butterflyVertex, butterflyFragment,
} from './shaders/tulip.js';
import { terrainH, insideCabin, insideCamp } from './world.js';
import { GARDEN, CAMP } from './layout.js';

/* ---------- mesh builder: position, (kind, open), uv; normals are computed smooth ---------- */
class Geo {
  constructor() { this.p = []; this.n = []; this.uv = []; this.x = []; }
  get count() { return this.p.length / 3; }
  v(x, y, z, kind, open, u, vv) { this.p.push(x, y, z); this.n.push(kind, open); this.uv.push(u, vv); return this.count - 1; }
  /** a grid over u in [-1,1], v in [0,1] */
  strip(fn, nu, nv, kind, open) {
    const start = this.count;
    for (let j = 0; j < nv; j++) {
      const vv = j / (nv - 1);
      for (let i = 0; i < nu; i++) {
        const u = -1 + (2 * i) / (nu - 1);
        const q = fn(u, vv);
        this.v(q[0], q[1], q[2], kind, open * vv, u, vv);
      }
    }
    for (let j = 0; j < nv - 1; j++) {
      for (let i = 0; i < nu - 1; i++) {
        const a = start + j * nu + i, b = a + 1, c = a + nu, d = c + 1;
        this.x.push(a, b, d, a, d, c);
      }
    }
  }
  /** one petal or leaf growing from the stem axis toward azimuth `a` */
  petal({ a, y0, r0 = 0.01, R, rise, W, curl = 0, prof = 'open', droop = 0, open = 0, kind = 1, nu = 3, nv = 4, broad = false, roll = 0 }) {
    const dx = Math.cos(a), dz = Math.sin(a);
    // 'egg' is the closed goblet of a tulip: widest two fifths of the way up, the tips nearly meeting
    const rOf = prof === 'cup'
      ? (v) => r0 + R * Math.sin(Math.min(v * 2.3, Math.PI))
      : prof === 'egg'
        ? (v) => r0 + R * Math.pow(Math.sin(Math.min(v * 2.62, Math.PI)), 0.75)
        : (v) => r0 + R * Math.pow(v, 0.8);
    // a rose petal is widest near its tip; the others swell in the middle
    const wOf = broad
      ? (v) => W * (0.40 + 0.60 * Math.sin(Math.PI * (0.15 + 0.60 * v)))
      : (v) => W * (0.55 + 0.45 * Math.sin(Math.PI * v));
    this.strip((u, v) => {
      const w = wOf(v);
      // `roll` turns the lip of the petal back outward, as an opened rose does
      const lip = roll * Math.max(0, v - 0.6) * Math.max(0, v - 0.6) * 6.0;
      const r = rOf(v) + curl * u * u * w + lip * W;
      return [dx * r - dz * u * w, y0 + rise * v - droop * v * v - lip * W * 0.5, dz * r + dx * u * w];
    }, nu, nv, kind, open);
  }
  tube(h, r, sides = 5) {
    const start = this.count;
    for (let j = 0; j < 2; j++) {
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        this.v(Math.cos(a) * r, j * h, Math.sin(a) * r, 0, 0, 0, j * 0.7);
      }
    }
    for (let s = 0; s < sides; s++) {
      const a = start + s, b = start + (s + 1) % sides;
      this.x.push(a, b, b + sides, a, b + sides, a + sides);
    }
  }
  /** the seed disc of a daisy or sunflower: a low dome around +Y. Its UVs are the position on
      the disc (-1..1), which is what the shader needs to lay the florets out in spirals. */
  dome(cy, r, h, sides = 9, kind = 2, rings = 2) {
    const top = this.v(0, cy + h, 0, kind, 0, 0, 0);
    const start = this.count;
    for (let ri = 1; ri <= rings; ri++) {
      const rr = ri / rings, hh = Math.cos(rr * Math.PI / 2);
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        this.v(Math.cos(a) * r * rr, cy + h * hh, Math.sin(a) * r * rr, kind, 0, Math.cos(a) * rr, Math.sin(a) * rr);
      }
    }
    for (let s = 0; s < sides; s++) {
      const a = start + s, b = start + (s + 1) % sides;
      this.x.push(top, b, a);
      for (let ri = 0; ri < rings - 1; ri++) {
        const a0 = a + ri * sides, b0 = b + ri * sides;
        this.x.push(a0, b0, b0 + sides, a0, b0 + sides, a0 + sides);
      }
    }
  }
  /** rigidly move every vertex added since `from` (used to tilt a sunflower's head) */
  transform(from, m) {
    const v = new THREE.Vector3();
    for (let i = from; i < this.count; i++) {
      v.set(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]).applyMatrix4(m);
      this.p[i * 3] = v.x; this.p[i * 3 + 1] = v.y; this.p[i * 3 + 2] = v.z;
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('aInfo', new THREE.Float32BufferAttribute(this.n, 2));
    g.setAttribute('aUv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.x);
    g.computeVertexNormals();
    return g;
  }
}
const TAU = Math.PI * 2;

/* ---------- species ---------- */
// `fine` builds the close-up version: the same flower with enough facets that the curl of
// a petal is a curve, not a fold. It is only ever drawn for the few flowers beside you.
function tulipGeo(fine) {
  const g = new Geo();
  const nu = fine ? 7 : 3, nv = fine ? 9 : 4;
  g.tube(0.66, 0.016, fine ? 8 : 5);
  // broad strap leaves that clasp the stem and arch outward, the way a tulip's do
  const ln = fine ? 5 : 3, lv = fine ? 8 : 4;
  g.petal({ kind: 0, a: 0.5, y0: 0.02, R: 0.20, rise: 0.50, W: 0.070, curl: -0.55, droop: 0.10, nu: ln, nv: lv });
  g.petal({ kind: 0, a: 3.4, y0: 0.02, R: 0.17, rise: 0.44, W: 0.062, curl: -0.55, droop: 0.06, nu: ln, nv: lv });
  if (fine) g.petal({ kind: 0, a: 1.9, y0: 0.16, R: 0.11, rise: 0.34, W: 0.040, curl: -0.6, droop: 0.02, nu: ln, nv: lv });
  // six tepals in two whorls of three, overlapping into a goblet
  for (let k = 0; k < 3; k++) {
    g.petal({ a: (k / 3) * TAU, y0: 0.655, r0: 0.010, R: 0.082, rise: 0.300, W: 0.086, curl: -0.62, prof: 'egg', open: 1, nu, nv });
    g.petal({ a: (k / 3) * TAU + TAU / 6, y0: 0.660, r0: 0.008, R: 0.070, rise: 0.292, W: 0.078, curl: -0.62, prof: 'egg', open: 1, nu, nv });
  }
  return g.build();
}
function roseGeo(fine) {
  const g = new Geo();
  g.tube(0.70, 0.014, fine ? 8 : 5);
  g.petal({ kind: 0, a: 0.3, y0: 0.22, R: 0.14, rise: 0.05, W: 0.042 });
  g.petal({ kind: 0, a: 2.5, y0: 0.38, R: 0.13, rise: 0.05, W: 0.040 });
  g.petal({ kind: 0, a: 4.6, y0: 0.52, R: 0.12, rise: 0.04, W: 0.036 });
  if (!fine) {
    for (let k = 0; k < 5; k++) g.petal({ kind: 3, broad: true, roll: 0.7, a: (k / 5) * TAU, y0: 0.70, r0: 0.016, R: 0.082, rise: 0.105, W: 0.066, curl: 0.15, droop: 0.03, open: 0.3 });
    for (let k = 0; k < 5; k++) g.petal({ kind: 3, broad: true, roll: 0.4, a: (k / 5) * TAU + 0.63, y0: 0.71, r0: 0.012, R: 0.060, rise: 0.145, W: 0.056, curl: -0.3, open: 0.2 });
    for (let k = 0; k < 4; k++) g.petal({ kind: 3, broad: true, a: (k / 4) * TAU + 0.3, y0: 0.72, r0: 0.006, R: 0.038, rise: 0.165, W: 0.044, curl: -0.7, prof: 'egg', open: 0.1 });
    for (let k = 0; k < 3; k++) g.petal({ kind: 3, broad: true, a: (k / 3) * TAU + 1.1, y0: 0.73, r0: 0.003, R: 0.022, rise: 0.165, W: 0.032, curl: -0.9, prof: 'egg', open: 0.05, nv: 3 });
    return g.build();
  }
  // close up: more leaves, sepals, and the real thing: some thirty petals on a spiral, each
  // turned 137.5 degrees from the last. The heart is a furled bud; each petal further out
  // stands a little lower and leans a little more, and only the outermost lay their lips back.
  g.petal({ kind: 0, a: 1.4, y0: 0.30, R: 0.12, rise: 0.06, W: 0.040, nu: 4, nv: 5 });
  g.petal({ kind: 0, a: 3.6, y0: 0.45, R: 0.13, rise: 0.05, W: 0.040, nu: 4, nv: 5 });
  g.petal({ kind: 0, a: 5.6, y0: 0.60, R: 0.10, rise: 0.04, W: 0.034, nu: 4, nv: 5 });
  for (let k = 0; k < 5; k++) g.petal({ kind: 0, a: (k / 5) * TAU + 0.3, y0: 0.695, r0: 0.012, R: 0.050, rise: -0.012, W: 0.012, droop: 0.02, nu: 2, nv: 3 });
  const N = 30;
  for (let k = 0; k < N; k++) {
    const t = k / (N - 1);                         // 0 at the heart .. 1 outermost
    g.petal({
      kind: 3, broad: true, a: k * 2.39996, y0: 0.728 - 0.022 * t, r0: 0.002 + 0.012 * t,
      // the furled heart sits a little below the cup of petals round it, as in a real bloom
      R: 0.014 + 0.030 * t + 0.050 * t * t, rise: 0.105 + 0.110 * t - 0.125 * t * t, W: 0.030 + 0.044 * t,
      curl: -0.95 + 0.85 * t, roll: 0.9 * t * t * t, droop: 0.02 * t * t, prof: t < 0.5 ? 'cup' : 'open',
      open: 0.05 + 0.25 * t, nu: t < 0.3 ? 4 : 6, nv: t < 0.3 ? 5 : 6,
    });
  }
  return g.build();
}
function lavenderGeo() {
  const g = new Geo();
  g.tube(0.56, 0.008, 4);
  g.petal({ kind: 0, a: 0.6, y0: 0.04, R: 0.16, rise: 0.16, W: 0.012, nu: 2, nv: 3 });
  g.petal({ kind: 0, a: 3.6, y0: 0.06, R: 0.14, rise: 0.14, W: 0.011, nu: 2, nv: 3 });
  for (let k = 0; k < 8; k++) {
    const y = 0.57 + k * 0.056, R = 0.032 * (1 - k * 0.08);
    for (let j = 0; j < 3; j++) g.petal({ a: k * 0.9 + (j / 3) * TAU, y0: y, r0: 0.004, R, rise: 0.036, W: 0.017, curl: -0.3, nu: 2, nv: 3 });
  }
  return g.build();
}
function sunflowerGeo(fine) {
  const g = new Geo();
  g.tube(0.88, 0.021, fine ? 8 : 6);
  // big heart-shaped leaves, drooping under their own weight
  const ln = fine ? 5 : 3, lv = fine ? 6 : 4;
  g.petal({ kind: 0, a: 0.4, y0: 0.22, R: 0.30, rise: 0.07, W: 0.130, droop: 0.10, curl: 0.25, nu: ln, nv: lv });
  g.petal({ kind: 0, a: 2.7, y0: 0.40, R: 0.28, rise: 0.06, W: 0.120, droop: 0.09, curl: 0.25, nu: ln, nv: lv });
  g.petal({ kind: 0, a: 5.0, y0: 0.56, R: 0.24, rise: 0.05, W: 0.100, droop: 0.07, curl: 0.25, nu: ln, nv: lv });
  g.petal({ kind: 0, a: 1.6, y0: 0.70, R: 0.19, rise: 0.04, W: 0.080, droop: 0.05, curl: 0.25, nu: ln, nv: lv });
  const head = g.count;
  // green bracts behind the head, then two rows of rays, then the broad seed disc
  const nb = fine ? 21 : 9;
  for (let k = 0; k < nb; k++) g.petal({ kind: 0, a: (k / nb) * TAU + 0.1, y0: -0.018, r0: 0.07, R: 0.085, rise: -0.004, W: 0.030, nu: 2, nv: 3 });
  const nr = fine ? 17 : 13;
  for (let k = 0; k < nr; k++) g.petal({ kind: 4, a: (k / nr) * TAU, y0: 0, r0: 0.092, R: 0.150, rise: 0.004, W: 0.036, droop: 0.026, curl: 0.5, nu: fine ? 5 : 3, nv: fine ? 5 : 3 });
  for (let k = 0; k < nr; k++) g.petal({ kind: 4, a: ((k + 0.5) / nr) * TAU, y0: 0.006, r0: 0.088, R: 0.118, rise: 0.022, W: 0.032, curl: 0.5, nu: fine ? 5 : 3, nv: fine ? 5 : 3 });
  g.dome(0.004, 0.104, 0.026, fine ? 28 : 12, 2, fine ? 5 : 2);
  // the head nods forward to face the sun
  g.transform(head, new THREE.Matrix4().makeTranslation(0, 0.905, 0.03).multiply(new THREE.Matrix4().makeRotationX(1.13)));
  return g.build();
}
function daisyGeo() {
  const g = new Geo();
  g.tube(0.90, 0.009, 4);
  g.petal({ kind: 0, a: 1.0, y0: 0.10, R: 0.22, rise: 0.10, W: 0.028, nv: 3 });
  g.petal({ kind: 0, a: 4.0, y0: 0.16, R: 0.19, rise: 0.10, W: 0.026, nv: 3 });
  for (let k = 0; k < 16; k++) g.petal({ kind: 4, a: (k / 16) * TAU, y0: 0.915, r0: 0.034, R: 0.150, rise: 0.012, W: 0.022, droop: 0.03, open: 1, nv: 3 });
  g.dome(0.915, 0.044, 0.030, 9, 5, 2);
  return g.build();
}

/* ---------- instancing ---------- */
// Flowers within LOD_NEAR metres of the camera swap to their close-up model. Both models
// share the same instance buffers; each one's vertex shader drops the flowers that belong
// to the other, so nothing is ever drawn twice.
export const LOD_NEAR = 7;
function flowerMaterial(shared, lod) {
  const defines = {};
  if (lod) defines[lod] = LOD_NEAR.toFixed(1);
  return new THREE.ShaderMaterial({
    vertexShader: tulipVertex,
    fragmentShader: tulipFragment,
    side: THREE.DoubleSide,
    alphaToCoverage: true,
    defines,
    uniforms: {
      ...shared.light,
      uTime: shared.uTime,
      uDay: shared.uDay,
      uAmb: shared.uAmb,
      uSunCol: shared.uSunCol,
      uSunDir: shared.uSunDir,
      uAuroraTint: shared.uAuroraTint,
      uCabinLight: shared.uCabinLight,
      uFireLight: shared.uFireLight,
      uFogColor: shared.uFogColor,
      uFogDensity: shared.uFogDensity,
    },
  });
}

function instanceAttributes(list) {
  const n = list.length;
  const off = new Float32Array(n * 3), par = new Float32Array(n * 3), col = new Float32Array(n * 3);
  list.forEach((f, i) => {
    off[i * 3] = f.x; off[i * 3 + 1] = f.y; off[i * 3 + 2] = f.z;
    par[i * 3] = f.h; par[i * 3 + 1] = f.yaw; par[i * 3 + 2] = f.seed;
    col[i * 3] = f.c[0]; col[i * 3 + 1] = f.c[1]; col[i * 3 + 2] = f.c[2];
  });
  return {
    n,
    aOffset: new THREE.InstancedBufferAttribute(off, 3),
    aParams: new THREE.InstancedBufferAttribute(par, 3),
    aColor: new THREE.InstancedBufferAttribute(col, 3),
  };
}
// What a flower leaves in the sun's shadow map. The map is drawn once, so this costs nothing
// per frame; every bloom still throws its own shadow on the soil and on its neighbours.
let depthMat = null;
function flowerDepthMaterial(shared) {
  if (!depthMat) {
    depthMat = new THREE.ShaderMaterial({
      vertexShader: tulipVertex,
      fragmentShader: flowerDepthFragment,
      side: THREE.DoubleSide,
      defines: { DEPTH_ONLY: '' },
      uniforms: { ...shared.light, uTime: shared.uTime, uDay: { value: 1 }, uSunDir: shared.uSunDir },
    });
  }
  return depthMat;
}
function instanced(geometry, material, inst, caster) {
  if (Array.isArray(inst)) inst = instanceAttributes(inst);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = geometry.index;
  for (const name of ['position', 'normal', 'aInfo', 'aUv']) geo.setAttribute(name, geometry.attributes[name]);
  geo.setAttribute('aOffset', inst.aOffset);
  geo.setAttribute('aParams', inst.aParams);
  geo.setAttribute('aColor', inst.aColor);
  geo.instanceCount = inst.n;
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  if (caster) { mesh.castShadow = true; mesh.customDepthMaterial = caster; }
  return mesh;
}
/** one species, as one mesh, or as a far model plus a close-up model when `lod` is on */
function species(shared, makeGeo, list, lod) {
  const caster = shared.flowerShadows ? flowerDepthMaterial(shared) : null;
  if (!lod) return [instanced(makeGeo(false), flowerMaterial(shared), list, caster)];
  const inst = instanceAttributes(list);
  return [
    instanced(makeGeo(false), flowerMaterial(shared, 'LOD_FAR'), inst, caster),     // the far model casts for both
    instanced(makeGeo(true), flowerMaterial(shared, 'LOD_NEAR'), inst),
  ];
}

/** thousands of small blossom (or leaf) cards */
function cards(shared, list, leaf) {
  const n = list.length;
  const off = new Float32Array(n * 3), seed = new Float32Array(n * 4);
  list.forEach((c, i) => {
    off[i * 3] = c[0]; off[i * 3 + 1] = c[1]; off[i * 3 + 2] = c[2];
    seed[i * 4] = Math.random(); seed[i * 4 + 1] = c[3]; seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = Math.random();
  });
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geo.instanceCount = n;
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    vertexShader: cardVertex,
    fragmentShader: cardFragment,
    side: THREE.DoubleSide,
    alphaToCoverage: true,
    uniforms: {
      uTime: shared.uTime,
      uLeaf: { value: leaf ? 1 : 0 },
      uAmb: shared.uAmb,
      uSunCol: shared.uSunCol,
      uSunDir: shared.uSunDir,
      uAuroraTint: shared.uAuroraTint,
      uFogColor: shared.uFogColor,
      uFogDensity: shared.uFogDensity,
    },
  }));
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
  gl_PointSize = clamp(uScale * uPixelRatio * 0.075 / -mv.z, 1.0, 9.0);
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

const TULIPS = [
  [0.86, 0.04, 0.05], [0.98, 0.70, 0.05], [0.95, 0.28, 0.46], [0.42, 0.10, 0.62],
  [0.92, 0.88, 0.80], [0.98, 0.36, 0.04], [0.80, 0.06, 0.22], [1.00, 0.86, 0.30],
];
// crimson, old-rose pink, cream, yellow, salmon, deep red
const ROSES = [[0.78, 0.03, 0.07], [0.92, 0.22, 0.38], [0.96, 0.88, 0.74], [0.98, 0.74, 0.16], [0.98, 0.46, 0.32], [0.50, 0.015, 0.08]];
const DAISIES = [[0.95, 0.95, 0.90], [0.95, 0.52, 0.72], [0.82, 0.22, 0.52], [0.98, 0.92, 0.55], [0.95, 0.95, 0.90]];

export const GARDEN_TREES = [[GARDEN.x, GARDEN.z], [GARDEN.x - 5.5, GARDEN.z + 9.5], [GARDEN.x + 10, GARDEN.z - 1.5]];
export const GARDEN_ARCH = { x: GARDEN.x - 8.5, z: GARDEN.z };

/* ---------- tulip beds: colour stripes running down toward the valley ---------- */
export function createTulips(shared, rng, count, lod) {
  const ROW = 0.44, STRIPE = 3.6;
  const list = [];
  let guard = 0;
  while (list.length < count && guard++ < count * 8) {
    const dist = 4.5 + 60 * Math.pow(rng(), 1.2);
    const z = 8 - dist;
    let x = (rng() - 0.5) * 2 * (9 + dist * 1.55);
    x = Math.round(x / ROW) * ROW + (rng() - 0.5) * 0.10;
    const sx = (x + 1000) / STRIPE;
    if (sx - Math.floor(sx) < 0.13) continue;                    // grassy aisle between beds
    if (insideCabin(x, z, 1.4) || insideCamp(x, z)) continue;
    if (Math.hypot(x - CAMP.fire.x, z - CAMP.fire.z) < 3.6) continue;
    if (Math.hypot(x, z - 8) < 3.2) continue;                    // where you stand
    if (x > 10.5 && z > -7) continue;                            // the flower garden begins here
    const bed = Math.floor(sx);
    const c = TULIPS[(bed * 5 + Math.floor(bed / 3) * 3 + 1000) % TULIPS.length];
    const far = Math.min(1, dist / 62);
    const tone = 0.82 + rng() * 0.36;
    list.push({
      x, y: terrainH(x, z) - 0.02, z: z + (rng() - 0.5) * 0.12,
      h: (0.44 + rng() * 0.20) * (1 + far * 0.8), yaw: rng() * TAU, seed: rng(),
      c: [c[0] * tone, c[1] * tone, c[2] * tone],
    });
  }
  const group = new THREE.Group();
  group.add(...species(shared, tulipGeo, list, lod));
  return group;
}

/* ---------- the garden ---------- */
export function createGarden(shared, rng, scale, lod) {
  const group = new THREE.Group();
  const cx = GARDEN.x, cz = GARDEN.z;
  const mat = flowerMaterial(shared);
  const tone = (c) => { const t = 0.82 + rng() * 0.36; return [c[0] * t, c[1] * t, c[2] * t]; };
  const place = (x, z, h, c, yaw) => ({ x, y: terrainH(x, z) - 0.02, z, h, yaw: yaw === undefined ? rng() * TAU : yaw, seed: rng(), c: tone(c) });

  /* --- roses: a ring bed around the central cherry tree, cut by four paths --- */
  // Roses grow as bushes: a handful of canes from one root, one variety to a bush, blooms at
  // different heights and a bud or two still to open.
  const roses = [];
  const bush = (bx, bz, c, canes) => {
    for (let k = 0; k < canes; k++) {
      const a = rng() * TAU, r = 0.06 + rng() * 0.30;
      const f = place(bx + Math.cos(a) * r, bz + Math.sin(a) * r, (0.50 + rng() * 0.36) * (rng() < 0.2 ? 0.72 : 1), c);
      if (rng() < 0.2) f.seed *= 0.3;                // a bud: these stay furled (see `open` in the shader)
      roses.push(f);
    }
  };
  for (let i = 0, n = Math.floor(230 * scale); i < n; i++) {
    const a = rng() * TAU;
    if (Math.abs(Math.sin(2 * a)) < 0.17) continue;
    const r = 4.0 + rng() * 1.9;
    bush(cx + Math.cos(a) * r, cz + Math.sin(a) * r, ROSES[Math.floor((a / TAU) * 6) % 6], 4 + Math.floor(rng() * 4));
  }
  const ax = GARDEN_ARCH.x;
  for (let i = 0, n = Math.floor(110 * scale); i < n; i++) {             // border beds beside the arch
    const side = rng() < 0.5 ? -1 : 1;
    bush(ax - 0.7 + rng() * 1.6, cz + side * (2.5 + rng() * 7.3), ROSES[[1, 2, 4, 0][Math.floor(rng() * 4)]], 4 + Math.floor(rng() * 3));
  }
  const baseY = terrainH(ax, cz);
  const archPoint = () => {
    if (rng() < 0.3) return [cz + (rng() < 0.5 ? -1 : 1) * 1.4, rng() * 1.45];
    const t = rng() * Math.PI;
    return [cz + Math.cos(t) * 1.4, 1.45 + Math.sin(t) * 1.3];
  };
  for (let i = 0, n = Math.floor(300 * scale); i < n; i++) {             // climbing roses
    const [z, y] = archPoint();
    const h = 0.18 + rng() * 0.12;
    roses.push({
      x: ax - 0.15 + rng() * 0.9, y: baseY + y - h * 0.8 + (rng() - 0.5) * 0.2, z: z + (rng() - 0.5) * 0.3,
      h, yaw: rng() * TAU, seed: rng(), c: tone(ROSES[rng() < 0.6 ? 1 : rng() < 0.5 ? 0 : 2]),
    });
  }
  group.add(...species(shared, roseGeo, roses, lod));

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
  group.add(instanced(lavenderGeo(), mat, lav, shared.flowerShadows ? flowerDepthMaterial(shared) : null));

  /* --- sunflowers, all turned to the morning sun --- */
  const sun = shared.uSunDir.value;
  const sunYaw = Math.atan2(-sun.x, sun.z);
  const sf = [];
  const sfStep = 0.5 / Math.sqrt(Math.max(scale, 0.3));
  for (let z = cz - 15; z < cz - 5; z += 0.78) {             // sown in rows, like a field
    for (let x = cx + 5; x < cx + 18; x += sfStep) {
      if (rng() < 0.06) continue;
      sf.push(place(x + (rng() - 0.5) * 0.22, z + (rng() - 0.5) * 0.20, 1.35 + rng() * 0.60, [1.0, 0.56 + rng() * 0.10, 0.02], sunYaw + (rng() - 0.5) * 0.45));
    }
  }
  group.add(...species(shared, sunflowerGeo, sf, lod));

  /* --- daisies and cosmos out in the meadow around the beds --- */
  const dz = [];
  for (let i = 0, n = Math.floor(3200 * scale); i < n; i++) {
    const x = cx + (rng() * 2 - 1) * (GARDEN.hx + 5), z = cz + (rng() * 2 - 1) * (GARDEN.hz + 5);
    if (Math.hypot(x - cx, z - cz) < 8.0) continue;                        // the rose ring and its walks
    if (Math.sin(x * 0.55) * Math.sin(z * 0.6 + 1.0) < -0.25) continue;    // drifts, not a carpet
    dz.push(place(x, z, 0.30 + rng() * 0.24, DAISIES[Math.floor(rng() * DAISIES.length)]));
  }
  group.add(instanced(daisyGeo(), mat, dz, shared.flowerShadows ? flowerDepthMaterial(shared) : null));

  /* --- rose arch, leafed over --- */
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a5138, roughness: 1 });
  for (const ox of [0.0, 0.6]) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.045, 8, 28, Math.PI), wood);
    arc.rotation.y = Math.PI / 2;
    arc.position.set(ax + ox, baseY + 1.45, cz);
    group.add(arc);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.9, 8), wood);
      post.position.set(ax + ox, baseY + 0.5, cz + s * 1.4);
      group.add(post);
    }
  }
  const leaves = [];
  for (let i = 0, n = Math.floor(900 * scale); i < n; i++) {
    const [z, y] = archPoint();
    leaves.push([ax - 0.1 + rng() * 0.8, baseY + y + (rng() - 0.5) * 0.3, z + (rng() - 0.5) * 0.36, 0.26 + rng() * 0.22]);
  }
  group.add(cards(shared, leaves, true));

  /* --- cherry trees: crowns of blossom, petals drifting down --- */
  const bark = new THREE.MeshStandardMaterial({ color: 0x5c4336, roughness: 1 });
  const blossom = [];
  const petalPos = [], petalSeed = [];
  for (const [tx, tz] of GARDEN_TREES) {
    const ty = terrainH(tx, tz);
    const tree = new THREE.Group();
    tree.position.set(tx, ty, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.26, 2.6, 10), bark);
    trunk.position.y = 1.3;
    trunk.rotation.z = (rng() - 0.5) * 0.12;
    tree.add(trunk);
    for (let b = 0; b < 7; b++) {
      const a = (b / 7) * TAU + rng(), lean = 0.55 + rng() * 0.45, len = 1.7 + rng() * 0.9;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.085, len, 6), bark);
      br.position.set(Math.cos(a) * Math.sin(lean) * len * 0.5, 2.5 + Math.cos(lean) * len * 0.5, Math.sin(a) * Math.sin(lean) * len * 0.5);
      br.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
      tree.add(br);
    }
    const shade = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ colorWrite: false, depthWrite: false }));
    shade.position.set(0, 4.0, 0);
    shade.scale.set(2.7, 1.5, 2.7);
    shade.userData.shadowOnly = true;
    tree.add(shade);
    group.add(tree);
    for (let i = 0, n = Math.floor(2600 * scale); i < n; i++) {
      // an umbrella-shaped crown, denser toward the outside
      const a = rng() * TAU, up = Math.acos(1 - rng() * 1.35), rad = 0.45 + 0.55 * Math.pow(rng(), 0.45);
      blossom.push([
        tx + Math.cos(a) * Math.sin(up) * 2.9 * rad,
        ty + 3.05 + Math.cos(up) * 1.75 * rad,
        tz + Math.sin(a) * Math.sin(up) * 2.9 * rad,
        0.30 + rng() * 0.30,
      ]);
    }
    for (let i = 0, n = Math.floor(70 * scale); i < n; i++) {
      const a = rng() * TAU, rr = rng() * 2.4;
      petalPos.push(tx + Math.cos(a) * rr, ty + 4.0 + rng() * 0.8, tz + Math.sin(a) * rr);
      petalSeed.push(rng(), rng(), rng(), rng());
    }
  }
  group.add(cards(shared, blossom, false));
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

  /* --- butterflies working the beds by day --- */
  {
    const n = Math.max(12, Math.floor(90 * scale));
    const bp = new Float32Array(n * 3), bs = new Float32Array(n * 4), bc = new Float32Array(n * 3);
    const wings = [[0.95, 0.90, 0.78], [0.98, 0.62, 0.10], [0.95, 0.82, 0.20], [0.55, 0.70, 0.98], [0.98, 0.98, 0.95]];
    for (let i = 0; i < n; i++) {
      // most over the garden, some over the tulips by the camp
      const home = rng() < 0.7
        ? [cx + (rng() * 2 - 1) * (GARDEN.hx - 1), cz + (rng() * 2 - 1) * (GARDEN.hz - 1)]
        : [(rng() * 2 - 1) * 26, -4 - rng() * 30];
      const tall = home[0] > cx + 4 && home[1] < cz - 4 ? 1.5 : 0;          // above the sunflowers
      bp[i * 3] = home[0]; bp[i * 3 + 1] = terrainH(home[0], home[1]) + 0.75 + tall; bp[i * 3 + 2] = home[1];
      bs[i * 4] = rng(); bs[i * 4 + 1] = rng(); bs[i * 4 + 2] = 1.0 + rng() * 2.2; bs[i * 4 + 3] = rng() * 0.5;
      const w = wings[Math.floor(rng() * wings.length)];
      bc[i * 3] = w[0]; bc[i * 3 + 1] = w[1]; bc[i * 3 + 2] = w[2];
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    bg.setAttribute('aSeed', new THREE.Float32BufferAttribute(bs, 4));
    bg.setAttribute('aColor', new THREE.Float32BufferAttribute(bc, 3));
    const flies = new THREE.Points(bg, new THREE.ShaderMaterial({
      vertexShader: butterflyVertex,
      fragmentShader: butterflyFragment,
      uniforms: {
        uTime: shared.uTime, uDay: shared.uDay, uPixelRatio: shared.uPixelRatio, uScale: shared.uPointScale,
        uAmb: shared.uAmb, uSunCol: shared.uSunCol,
      },
    }));
    flies.frustumCulled = false;
    group.add(flies);
  }

  /* --- a bench under the blossom --- */
  const bench = new THREE.Group();
  const plank = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); m.position.set(x, y, z); bench.add(m); };
  plank(1.8, 0.07, 0.5, 0, 0.46, 0);
  plank(1.8, 0.45, 0.06, 0, 0.78, -0.24);
  for (const sx of [-0.8, 0.8]) plank(0.08, 0.46, 0.46, sx, 0.23, 0);
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
  const stone = new THREE.MeshStandardMaterial({ color: 0x6a6e70, roughness: 1 });
  for (const p of places) {
    if (p.sign === false) continue;
    const [sx, sz] = p.signAt || [p.x + 1.6, p.z + 1.2];
    const y = terrainH(sx, sz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.9, 8), wood);
    post.position.set(sx, y + 0.95, sz);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 0.05), wood);
    board.position.set(sx, y + 1.62, sz);
    board.rotation.y = Math.atan2(p.x - sx, p.z - sz) + Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), cap);
    tip.position.set(sx, y + 1.98, sz);
    group.add(post, board, tip);
    for (let k = 0; k < 4; k++) {                 // a small cairn beside it
      const st = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 - k * 0.035, 2), stone);
      st.position.set(sx + 0.55, y + 0.12 + k * 0.2, sz + 0.2);
      st.rotation.set(k, k * 2, 0);
      st.scale.y = 0.7;
      group.add(st);
    }
  }
  return group;
}
