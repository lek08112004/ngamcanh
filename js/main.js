import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { skyVertex, skyFragment, starPointsVertex, starPointsFragment } from './shaders/sky.js';
import { FinalShader, LensShader } from './shaders/post.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import {
  makeRng, terrainH, mountainRise, createTerrain, createMountains, createCabin, createFence,
  createRocks, createGrass, createFireflies, createCamp, createSnow, streamX, streamW, ROCK_SPOTS,
} from './world.js';
import { createGarden, createBeds, createSignposts, GARDEN_TREES, GARDEN_ARCH, GARDEN_BENCH, walkFlowerAt, nearBench, LOD_NEAR } from './flora.js';
import { CABIN, CAMP, GARDEN, BOUNDS } from './layout.js';
import { Party, cleanName, cleanCode } from './net.js';
import { Soundscape } from './audio.js';
import { StardustGame, CONSTELLATIONS, WEAVE_ORDER } from './game.js';
import { LORE, THREADS, SEASON_SKY, starOfFlower } from './lore.js';
import { glowVertex, glowFragment } from './shaders/post.js';
import { Story, CHAPTERS, FLOWERS } from './story.js';
import { store } from './store.js';
import * as cloud from './cloud.js';
import { SHELF, pagesOf } from './library.js';
import { WorldClock, SEASONS, PHASES, SEASON_LIGHT, clockText, bedFlowerAt, sunAt } from './seasons.js';
import { createCabinRoom, ROOM_LAYER } from './cabinroom.js';
import { createCorgi } from './corgi.js';
import { MoverShadow } from './movers.js';

const $ = (id) => document.getElementById(id);
const query = new URLSearchParams(location.search);
const DEG = Math.PI / 180;
const PITCH_DEG = 11.6;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------------------------------------------------------------- quality */
// Three tiers, chosen from the device unless the visitor picks one. Within a tier
// the image stays sharp; if frames drop, detail is shed step by step (see adaptQuality).
const coarse = matchMedia('(pointer: coarse)').matches;
const lowPower = coarse || Math.min(innerWidth, innerHeight) < 560;
const dpr = window.devicePixelRatio || 1;
let qualityChoice = store.get('settings.quality', 'auto');
if (!['auto', 'low', 'medium', 'high'].includes(qualityChoice)) qualityChoice = 'auto';
if (['low', 'medium', 'high'].includes(query.get('q'))) qualityChoice = query.get('q');
function detectTier() {
  if (lowPower) return 'low';
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'low';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) return 'low';
    // integrated and mobile-class chips
    if (/intel|uhd|iris|hd graphics|mali|adreno|powervr|radeon\(tm\) graphics|radeon\(tm\) \d{3}m\b|vega \d/i.test(gpu) && !/arc\b/i.test(gpu)) return 'medium';
  } catch (e) { return 'medium'; }
  if ((navigator.deviceMemory || 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4) return 'medium';
  return 'high';
}
const tier = qualityChoice === 'auto' ? detectTier() : qualityChoice;
const TIERS = {
  low: { steps: 14, grassNear: 9000, grass: 24000, grassFar: 0, roof: 2500, terrainQ: 0, flowerLod: 0, snow: 1200, sharp: 0, tulips: 5000, garden: 0.3, stars: 1400, flies: 30, maxPR: 1, minPR: 0.7, msaa: 0, lens: 0, shadow: 0, mountains: 0.4, mtnMap: 256, mtnQ: 0 },
  medium: { steps: 20, grassNear: 30000, grass: 60000, grassFar: 26000, roof: 6000, terrainQ: 1, flowerLod: 1, snow: 3000, sharp: 0.22, tulips: 11000, garden: 0.6, stars: 2400, flies: 50, maxPR: Math.min(dpr, 1.25), minPR: 0.85, msaa: 2, lens: 12, shadow: 2048, mountains: 0.66, mtnMap: 512, mtnQ: 1 },
  high: { steps: 32, grassNear: 50000, grass: 110000, grassFar: 50000, roof: 12000, terrainQ: 1, flowerLod: 1, snow: 6000, sharp: 0.32, tulips: 20000, garden: 1, stars: 3200, flies: 80, maxPR: Math.min(dpr, 2), minPR: Math.min(dpr, 1), msaa: 4, lens: 22, shadow: 4096, mountains: 1, mtnMap: 1024, mtnQ: 2 },
};
const Q = { ...TIERS[tier] };
// keep very large canvases (4K at 200%) within a sane pixel budget
const budgetPR = Math.sqrt((tier === 'high' ? 4.6e6 : 2.6e6) / Math.max(1, innerWidth * innerHeight));
Q.maxPR = Math.max(Math.min(Q.maxPR, budgetPR), Math.min(dpr, tier === 'low' ? 0.8 : 1));
Q.minPR = Math.min(Q.minPR, Q.maxPR);

/* --------------------------------------------------------------- renderer */
const canvas = $('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (err) {
  window.__bootFail('Thiết bị hoặc trình duyệt này chưa hỗ trợ WebGL.');
  throw err;
}
let pixelRatio = Q.maxPR;
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const fogColor = new THREE.Color().setRGB(0.010, 0.026, 0.034);
scene.fog = new THREE.FogExp2(fogColor, 0.0042);
scene.background = new THREE.Color(0x02050a);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 4000);
camera.rotation.order = 'YXZ';
const camBase = new THREE.Vector3(0, terrainH(0, 8) + 1.8, 8);
camera.position.copy(camBase);

/* ------------------------------------------------------ calendar and clock */
// Which season it is and what time it is. The day starts at the visitor's own time of day
// and then runs by itself; the season is remembered in the save. Both can be pinned from the
// address (?season=autumn&time=dusk, or ?hour=17.5), which also stops the clock. See seasons.js.
const pinned = query.has('time') || query.has('hour') || query.has('season');
const clock = new WorldClock({
  season: SEASONS.some((x) => x.id === query.get('season')) ? query.get('season') : store.get('settings.season', 'spring'),
  hour: query.has('hour') ? parseFloat(query.get('hour'))
    : PHASES.some((x) => x.id === query.get('time')) ? PHASES.find((x) => x.id === query.get('time')).hour
      : (() => { const now = new Date(); return now.getHours() + now.getMinutes() / 60; })(),
  auto: store.get('settings.flow', true) && !pinned,
});
const SUN_DIR = Object.fromEntries(PHASES.map((ph) => [ph.id, new THREE.Vector3(...ph.sun).normalize()]));
SUN_DIR.dawn = new THREE.Vector3(...sunAt(6.4)).normalize();       // the mountains bake the sunrise light too

/* -------------------------------------------------------- shared uniforms */
const uDay = { value: 0 };                       // 0 night .. 1 morning
const shared = {
  uTime: { value: 0 },
  uDay,
  uAmb: { value: new THREE.Vector3(0.08, 0.13, 0.18) },
  uSunCol: { value: new THREE.Vector3(0, 0, 0) },
  uSunDir: { value: new THREE.Vector3(...clock.sun) },
  uSeason: { value: new THREE.Vector4(...clock.weights) },
  uAuroraTint: { value: new THREE.Vector3(0.2, 0.5, 0.34) },
  uCabinLight: { value: new THREE.Vector3() },
  uFireLight: { value: new THREE.Vector4(0, 0, 0, 0.5) },
  uLampLight: { value: new THREE.Vector4(0, -50, 0, 0) },   // the lantern by the garden bench: xyz position, w level
  uFire: { value: 0.5 },
  uFogColor: { value: fogColor },
  uFogDensity: { value: 0.0042 },
  uPixelRatio: { value: pixelRatio },
  uPointScale: { value: 600 },
  uPlayer: { value: camBase },
  uGrassFar: { value: Q.grassFar ? 108 : 54 },
  flowerShadows: Q.shadow > 0,          // blooms cast into the (static) sun shadow map
  light: {
    uShadowMap: { value: null },
    uShadowMatrix: { value: new THREE.Matrix4() },
    uShadowOn: { value: 0 },
    uShadowTexel: { value: 1 / 2048 },
    uSunReach: { value: 1 },
    uSunFlat: { value: new THREE.Vector4(0, 1, 1, 0) },   // the sun's bearing and height, for the shade line (see sunReachAt)
    uRidge: { value: new THREE.Vector2(100, 500) },
    uMoverMap: { value: null },              // the corgi and companions: see movers.js
    uMoverMatrix: { value: new THREE.Matrix4() },
    uMoverOn: { value: 0 },
    uMoverTexel: { value: 1 / 1024 },
  },
  aurora: {
    uDay,
    uDusk: { value: clock.dusk },
    uMorn: { value: 0 },                   // 1 before noon: the low sun is rising (cooler colours, its own mountain light)
    uAurora: { value: 1.0 },
    uAurTime: { value: Number(query.get('t')) || 0 },
    uAurTall: { value: 2.5 },
    uAurLow: { value: new THREE.Vector3(0.08, 1.0, 0.42) },
    uAurMid: { value: new THREE.Vector3(1.0, 0.20, 0.52) },
    uAurHigh: { value: new THREE.Vector3(0.46, 0.16, 0.95) },
    uGlow: { value: new THREE.Vector3(0.36, 0.44, 0.08) },
  },
};

/* ------------------------------------------------------------ aurora moods */
const MOODS = [
  { id: 'emerald', name: 'Lục bảo', low: [0.08, 1.0, 0.42], mid: [1.0, 0.20, 0.52], high: [0.46, 0.16, 0.95], glow: [0.36, 0.44, 0.08], int: 1.0, speed: 1.0, tall: 2.5, stars: 1.0 },
  { id: 'rose', name: 'Hồng thạch', low: [1.0, 0.24, 0.56], mid: [0.72, 0.20, 0.98], high: [0.28, 0.26, 1.0], glow: [0.46, 0.14, 0.30], int: 1.05, speed: 0.9, tall: 2.7, stars: 1.0 },
  { id: 'ice', name: 'Băng lam', low: [0.12, 0.92, 1.0], mid: [0.28, 0.50, 1.0], high: [0.62, 0.40, 1.0], glow: [0.08, 0.34, 0.44], int: 0.95, speed: 0.8, tall: 2.4, stars: 1.05 },
  { id: 'storm', name: 'Bão từ', low: [0.16, 1.0, 0.34], mid: [1.0, 0.12, 0.30], high: [0.78, 0.03, 0.12], glow: [0.30, 0.42, 0.10], int: 1.3, speed: 2.6, tall: 3.3, stars: 0.9 },
  { id: 'still', name: 'Tĩnh lặng', low: [0.10, 0.95, 0.50], mid: [0.30, 0.55, 0.95], high: [0.40, 0.30, 0.90], glow: [0.10, 0.20, 0.14], int: 0.26, speed: 0.5, tall: 2.2, stars: 1.5 },
];
const mood = { index: 0, auto: true, timer: 0, int: 1.0, speed: 1.0, stars: 1.0 };
{
  const want = MOODS.findIndex((m) => m.id === query.get('mood'));
  if (want >= 0) { mood.index = want; mood.auto = false; }
}
function applyMood(dt, instant) {
  const m = MOODS[mood.index];
  const k = instant ? 1 : 1 - Math.exp(-dt * 0.55);
  const A = shared.aurora;
  const lerp3 = (u, c) => { u.value.x += (c[0] - u.value.x) * k; u.value.y += (c[1] - u.value.y) * k; u.value.z += (c[2] - u.value.z) * k; };
  lerp3(A.uAurLow, m.low); lerp3(A.uAurMid, m.mid); lerp3(A.uAurHigh, m.high); lerp3(A.uGlow, m.glow);
  A.uAurTall.value += (m.tall - A.uAurTall.value) * k;
  mood.int += (m.int - mood.int) * k;
  mood.speed += (m.speed - mood.speed) * k;
  mood.stars += (m.stars - mood.stars) * k;
}
applyMood(0, true);

/* -------------------------------------------------------------------- sky */
const galCore = new THREE.Vector3(0.50, 0.20, -0.84).normalize();
const galArm = new THREE.Vector3(-0.55, 0.72, -0.42).normalize();
const galNormal = new THREE.Vector3().crossVectors(galCore, galArm).normalize();
const pole = new THREE.Vector3(0, Math.sin(68 * DEG), -Math.cos(68 * DEG));   // facing north at 68°N
const uStarGain = { value: 1 };
const uZoom = { value: 1 };

const skyMat = new THREE.ShaderMaterial({
  vertexShader: skyVertex,
  fragmentShader: skyFragment,
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    ...shared.aurora,
    uTime: shared.uTime,
    uFrame: { value: 0 },
    uSteps: { value: Q.steps },
    uSkyRot: { value: new THREE.Matrix3() },
    uStarGain,
    uSunDir: shared.uSunDir,
    uGalN: { value: galNormal },
    uGalC: { value: galCore },
    uMetHead: { value: new THREE.Vector4(0, 1, 0, 0) },
    uMetTail: { value: new THREE.Vector3(0, 1, 0) },
    uMetColor: { value: new THREE.Vector3(0.80, 0.93, 1.0) },
  },
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), skyMat);
sky.frustumCulled = false;
scene.add(sky);

function createStarPoints(count, rng) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const v = new THREE.Vector3();
  let n = 0;
  while (n < count) {
    // the whole sphere: the sky turns during time-lapse
    v.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1);
    const l = v.lengthSq();
    if (l > 1 || l < 0.01) continue;
    v.normalize();
    const b = v.dot(galNormal);
    if (rng() > 0.30 + 0.70 * Math.exp(-(b * b) / 0.045)) continue;
    pos[n * 3] = v.x * 1700; pos[n * 3 + 1] = v.y * 1700; pos[n * 3 + 2] = v.z * 1700;
    const t = rng();
    let c;
    if (t < 0.30) c = [0.62, 0.76, 1.0];
    else if (t < 0.72) c = [1.0, 1.0, 1.0];
    else if (t < 0.92) c = [1.0, 0.86, 0.62];
    else c = [1.0, 0.68, 0.45];
    const mag = Math.pow(rng(), 7);
    const lum = 0.55 + 1.9 * mag;
    col[n * 3] = c[0] * lum; col[n * 3 + 1] = c[1] * lum; col[n * 3 + 2] = c[2] * lum;
    size[n] = 2.2 + 8.0 * mag + rng() * 1.0;
    phase[n] = rng();
    n++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: starPointsVertex,
    fragmentShader: starPointsFragment,
    uniforms: { uTime: shared.uTime, uPixelRatio: shared.uPixelRatio, uStarGain, uZoom },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 1;
  return pts;
}

/* ------------------------------------------------------------------ world */
const rng = makeRng(20261112);
const starPoints = createStarPoints(Q.stars * 2, rng);
scene.add(starPoints);
scene.add(createMountains(shared, Q.mountains, Q.mtnMap, Q.mtnQ, SUN_DIR));
scene.add(createTerrain(shared, Q.terrainQ));
const cabin = createCabin(rng, shared);
scene.add(cabin.group, cabin.smoke);
shared.uCabinLight.value.copy(cabin.lightWorld);
const fence = createFence(rng);
const rocks = createRocks(rng);
scene.add(fence, rocks);
const camp = createCamp(shared, rng);
scene.add(camp.group);
shared.uFireLight.value.set(camp.firePos.x, camp.firePos.y, camp.firePos.z, 0.5);
// three nested tiles of blades: fine and dense underfoot, the meadow proper, coarse tufts far out
const grass = createGrass(shared, rng, [
  { r: 11, count: Q.grassNear, h: [0.26, 0.74], w: [0.011, 0.020], grow: 0.0, widen: 0.8, tuft: 2, spread: 0.16, loose: 1 },
  { r: 56, count: Q.grass, h: [0.38, 1.00], w: [0.020, 0.036], grow: 0.5, widen: 2.4, tuft: 2, spread: 0.34, loose: 1 },
  { r: 110, count: Q.grassFar, h: [0.55, 1.15], w: [0.05, 0.10], grow: 0.6, widen: 1.0, fadeIn: 46 },
], cabin, Q.roof, Q.msaa, Q.shadow > 0);
scene.add(grass);

// Places worth walking to. Reaching one writes it into the trek log.
const PLACES = [
  { id: 'camp', name: 'Trại trên đồi', x: 0, z: 8, r: 7, note: 'Lều, lửa và chỗ ngồi quen thuộc.', sign: false },
  { id: 'garden', name: 'Vườn bách hoa', x: GARDEN.x, z: GARDEN.z, r: 9, note: 'Hoa hồng, oải hương, hướng dương, cúc và anh đào.', signAt: [GARDEN_ARCH.x - 1.8, GARDEN.z - 2.8] },
  { id: 'cabin', name: 'Hiên nhà gỗ', x: -9.5, z: -10, r: 5, note: 'Ngôi nhà mái cỏ kiểu Bắc Âu.', signAt: [-7.2, -7.2] },
  { id: 'tulips', name: 'Luống tulip', x: -2, z: -24, r: 8, note: 'Những dải màu chạy xuống thung lũng.' },
  { id: 'stream', name: 'Bờ suối', x: streamX(-70), z: -70, r: 9, note: 'Nước chảy qua thung lũng, soi cả bầu trời.', signAt: [streamX(-70) + 7, -68] },
  { id: 'pond', name: 'Ao lặng', x: streamX(-95), z: -95, r: 11, note: 'Chỗ dòng suối loang rộng thành ao.', signAt: [streamX(-95) + 11, -95] },
  { id: 'east', name: 'Đồi phía đông', x: 118, z: -58, r: 12, note: 'Cao hơn trại, nhìn được cả thung lũng.' },
  { id: 'south', name: 'Đồi sau trại', x: -6, z: 112, r: 12, note: 'Nhìn ngược về trại và dãy núi phương bắc.' },
];
const garden = createGarden(shared, rng, Q.garden, Q.flowerLod);
shared.uLampLight.value.set(garden.userData.lantern.pos.x, garden.userData.lantern.pos.y, garden.userData.lantern.pos.z, 0);
const signposts = createSignposts(PLACES);
const beds = createBeds(shared, rng, Q.tulips, Q.flowerLod);
const snow = createSnow(shared, rng, Q.snow);
scene.add(garden, signposts, beds, snow);
// every instanced flower bed, so the quality ladder can thin them out together
const flowerBeds = [...beds.children, ...garden.children].filter((c) => c.geometry && c.geometry.isInstancedBufferGeometry)
  .map((m) => ({ geo: m.geometry, total: m.geometry.instanceCount }));
scene.add(createFireflies(shared, rng, Q.flies));

const hemi = new THREE.HemisphereLight(0x3a6a86, 0x0a160d, 0.9);
scene.add(hemi);
const auroraLight = new THREE.DirectionalLight(0x5ce6a4, 0.55);
auroraLight.position.set(-20, 55, -80);
scene.add(auroraLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 0);
sunLight.target.position.set(14, 9, 2);
sunLight.position.copy(sunLight.target.position).addScaledVector(shared.uSunDir.value, 220);
scene.add(sunLight, sunLight.target);

// The sun's shadow camera is fitted round the part of the valley people play in, seen from the
// sun: the cabin and the camp with the beds just round them, and the garden with the walk to it
// (boxes below, up to the cherry crowns). It used to be a fixed 104 m square; fitted, its sides
// run from about 26 m (early morning, the ground seen at a slant) to 100 m (noon, when the
// cabin-to-garden diagonal lies across the view), so the same map has 1.6 to 6.7 times the
// texels per square metre over the camp. Outside it, as before, the ground paints its own row
// shade (shadowCover in light.js). Refitted at each redraw.
const SHADOW_BOXES = [[-24, 12, -23, 4, 4, 15], [-1, 57, -12, 36, 4, 23]];       // x0 x1 z0 z1 y0 y1
const SHADOW_PTS = [];
for (const [x0, x1, z0, z1, y0, y1] of SHADOW_BOXES) for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [y0, y1]) SHADOW_PTS.push(new THREE.Vector3(x, y, z));
const _sx = new THREE.Vector3(), _sy = new THREE.Vector3(), _sz = new THREE.Vector3(), _sp = new THREE.Vector3();
function fitSunShadow() {
  // the axes three.js gives the shadow camera (lookAt from the sun to the target, up = +y)
  _sz.copy(shared.uSunDir.value).normalize();
  _sx.set(0, 1, 0).cross(_sz).normalize();
  _sy.copy(_sz).cross(_sx);
  let l = Infinity, r = -Infinity, b = Infinity, t = -Infinity;
  for (const p of SHADOW_PTS) {
    _sp.copy(p).sub(sunLight.target.position);
    const u = _sp.dot(_sx), v = _sp.dot(_sy);
    l = Math.min(l, u); r = Math.max(r, u); b = Math.min(b, v); t = Math.max(t, v);
  }
  // a metre of margin, and whole metres, so small sun steps rarely change the texel size
  const sc = sunLight.shadow.camera;
  sc.left = Math.floor(l - 1); sc.right = Math.ceil(r + 1); sc.bottom = Math.floor(b - 1); sc.top = Math.ceil(t + 1);
  sc.updateProjectionMatrix();
  // the push along the normal against acne scales with the texel (it was 0.04 m at 104 m)
  sunLight.shadow.normalBias = 0.04 * Math.max(sc.right - sc.left, sc.top - sc.bottom) / 104;
}
// Sun shadows. The morning sun never moves, so the shadow map is drawn once and
// then only sampled: real shadows from the cabin, tent, fence, rocks and trees
// at no per-frame cost.
if (Q.shadow) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;      // the cabin, bench and tent get soft edges too
  renderer.shadowMap.autoUpdate = false;
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(Q.shadow, Q.shadow);
  const sc = sunLight.shadow.camera;
  sc.near = 60; sc.far = 400;              // a 340 m depth range: light.js counts on it (sunShadowSoft)
  sunLight.shadow.bias = -0.0006;
  fitSunShadow();
  shared.light.uShadowTexel.value = 1 / Q.shadow;
  for (const root of [cabin.group, camp.group, fence, rocks, garden, signposts, beds]) {
    root.traverse((o) => {
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      if (o.isMesh && mat && mat.isMeshStandardMaterial) {
        o.castShadow = true;
        o.receiveShadow = !o.userData.shadowOnly;
      }
    });
  }
  renderer.shadowMap.needsUpdate = true;
}
// The room inside the cabin (its own layer: drawn only when you are in it) and its own random
// numbers, so building it leaves the rest of the world exactly as it was.
const room = createCabinRoom(cabin, makeRng(5150), { shadows: Q.shadow > 0, shadowSize: tier === 'high' ? 512 : 256 });
// Winter lays snow on the tops of things: every built thing outdoors (cabin, tent, fence, rocks,
// bench, signposts, tree limbs) whitens where its surface faces the sky, in a ragged edge. One
// small addition to each material's own shader; it costs nothing while uSnowCover is 0.
const uSnowCover = { value: 0 };
function snowy(mat) {
  if (!mat || !mat.isMeshStandardMaterial || mat.userData.snowy) return;
  mat.userData.snowy = true;
  const prev = mat.onBeforeCompile, prevKey = prev ? prev.toString() : '';
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(mat, sh, r);
    sh.uniforms.uSnowCover = uSnowCover;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSnowW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSnowW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uSnowCover;
varying vec3 vSnowW;
float snHash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float snNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(snHash(i), snHash(i + vec2(1.0, 0.0)), f.x), mix(snHash(i + vec2(0.0, 1.0)), snHash(i + vec2(1.0, 1.0)), f.x), f.y); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (uSnowCover > 0.001) {
  float up = dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
  float sn = snNoise(vSnowW.xz * 6.0 + vSnowW.y * 2.0) * 0.6 + snNoise(vSnowW.xz * 21.0 + 3.0) * 0.4;
  float cover = smoothstep(0.62, 0.90, up + (sn - 0.5) * 0.5) * smoothstep(0.0, 0.6, uSnowCover * 1.6 - (1.0 - up) * 0.4);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.56, 0.59, 0.65) * (0.92 + 0.16 * sn), cover);
  roughnessFactor = mix(roughnessFactor, 0.72, cover);
  metalnessFactor = mix(metalnessFactor, 0.0, cover);
}`);
  };
  mat.customProgramCacheKey = () => `snow|${prevKey}`;
  mat.needsUpdate = true;
}
for (const root of [cabin.group, camp.group, fence, rocks, garden, signposts]) {
  root.traverse((o) => {
    if (!o.isMesh || o.layers.mask === 2) return;            // not the room inside the cabin
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) snowy(m);
  });
}
// What moves and throws a shadow: drawn every frame into a small map of its own (movers.js).
const movers = Q.shadow ? new MoverShadow(renderer, shared.light, tier === 'high' ? 1024 : 768, 11) : null;

/* --------------------------------------------------------- post-processing */
const target = new THREE.WebGLRenderTarget(4, 4, {
  type: THREE.HalfFloatType, samples: Q.msaa, depthTexture: new THREE.DepthTexture(4, 4),
});
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
// lens blur reads the depth of whichever buffer the scene was just drawn into
const lensPass = new ShaderPass(LensShader);
lensPass.uniforms.uTexel.value = new THREE.Vector2(1 / innerWidth, 1 / innerHeight);
lensPass.uniforms.uNear.value = camera.near;
lensPass.uniforms.uFar.value = camera.far;
class GrabDepth extends Pass {
  constructor() { super(); this.needsSwap = false; }
  render(r, writeBuffer, readBuffer) { lensPass.uniforms.tDepth.value = readBuffer.depthTexture; }
}
composer.addPass(new GrabDepth());
composer.addPass(lensPass);
lensPass.enabled = Q.lens > 0 && query.get('lens') !== '0';
lensPass.uniforms.uTaps.value = Q.lens;
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.72, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const finalPass = new ShaderPass(FinalShader);
finalPass.uniforms.uTexel.value = new THREE.Vector2(1 / innerWidth, 1 / innerHeight);
finalPass.uniforms.uSharp.value = Q.sharp;
composer.addPass(finalPass);

/* ------------------------------------------------------------ audio + game */
const audio = new Soundscape();
const game = new StardustGame({
  scene, camera, audio,
  pixelRatio: shared.uPixelRatio,
  pitchDeg: PITCH_DEG,
  lowPower,
});

// ?debug=1&stage=N: start the star game N constellations in, as if they had been woven (not saved)
if (query.has('debug') && query.has('stage')) {
  const n = clamp(Math.floor(Number(query.get('stage')) || 0), 0, 60);
  game.stage = n; game.cycle = Math.floor(n / WEAVE_ORDER.length); game.index = n % WEAVE_ORDER.length;
  for (let i = 0; i < Math.min(n, WEAVE_ORDER.length); i++) game.woven.add(WEAVE_ORDER[i]);
}
/* ------------------------------------------------------------ keepsake stars */
// Every constellation woven in the game leaves a star of its own in the night sky, above it,
// for good. They show whenever it is dark, game or no game.
const KEEP_MAX = CONSTELLATIONS.length;
const keepGeo = new THREE.BufferGeometry();
keepGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(KEEP_MAX * 3), 3));
keepGeo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(KEEP_MAX * 3), 3));
keepGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(KEEP_MAX), 1));
keepGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(KEEP_MAX), 1));
const keepStars = new THREE.Points(keepGeo, new THREE.ShaderMaterial({
  vertexShader: glowVertex, fragmentShader: glowFragment, uniforms: { uPixelRatio: shared.uPixelRatio },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
}));
keepStars.frustumCulled = false;
keepStars.renderOrder = 2;
scene.add(keepStars);
function syncKeepsakes() {
  const ks = game.keepsakes();
  const pos = keepGeo.attributes.position, col = keepGeo.attributes.aColor, size = keepGeo.attributes.aSize;
  ks.forEach((k, i) => {
    pos.setXYZ(i, k.dir.x * 1500, k.dir.y * 1500, k.dir.z * 1500);
    col.setXYZ(i, 1.0, 0.92, 0.74);
    size.setX(i, 15);
  });
  keepGeo.setDrawRange(0, ks.length);
  pos.needsUpdate = col.needsUpdate = size.needsUpdate = true;
}
syncKeepsakes();

/* --------------------------------------------------------- camera / viewing */
let baseFov = 50;
const view = { yaw: 0, pitch: PITCH_DEG, fov: 50, yawT: 0, pitchT: PITCH_DEG, fovT: 50 };
const LIMIT = { pitchMin: -32, pitchMax: 80, fovMin: 20 };
const wrapYaw = (y) => ((y + 180) % 360 + 360) % 360 - 180;
const tour = { on: false, t: 0, i: 0 };
const TOUR = [
  { yaw: 0, pitch: PITCH_DEG, fov: 1.0 },      // the whole valley
  { yaw: 15, pitch: 30, fov: 0.86 },           // along the Milky Way
  { yaw: 19, pitch: -4, fov: 0.56 },           // by the campfire
  { yaw: -6, pitch: 52, fov: 1.16 },           // lying back, looking up
  { yaw: -23, pitch: 4, fov: 0.62 },           // the cabin windows
  { yaw: 7, pitch: 5, fov: 0.46 },             // the stream, far away
];
// Places to sit. The camera really moves there; yaw/pitch/fov are just the opening pose.
const SPOTS = [
  { id: 'hill', name: 'Đồi trại', x: 0, z: 8, eye: 1.8, yaw: 0, pitch: PITCH_DEG, fov: 1.0 },
  { id: 'fire', name: 'Bên lửa', x: 2.6, z: -0.6, eye: 1.05, yaw: 22, pitch: 9, fov: 1.1 },
  { id: 'lie', name: 'Nằm ngắm trời', x: 1.0, z: 3.0, eye: 0.55, yaw: 4, pitch: 60, fov: 1.3 },
  { id: 'tulip', name: 'Giữa luống tulip', x: -3.6, z: -5.2, eye: 0.82, yaw: -3, pitch: 5, fov: 1.05 },
  { id: 'garden', name: 'Cổng vườn hoa', x: GARDEN_ARCH.x - 3.4, z: GARDEN.z, eye: 1.6, yaw: 90, pitch: 4, fov: 1.0 },
  { id: 'bench', name: 'Ghế dưới anh đào', x: GARDEN_BENCH.x + Math.sin(GARDEN_BENCH.yaw) * 0.05, z: GARDEN_BENCH.z + Math.cos(GARDEN_BENCH.yaw) * 0.05, eye: 1.12, yaw: Math.atan2(Math.sin(GARDEN_BENCH.yaw), -Math.cos(GARDEN_BENCH.yaw)) / DEG, pitch: -2, fov: 1.15 },
];
const camTarget = camBase.clone();
let spotIndex = 0;

/* ----------------------------------------------------------------- walking */
// W A S D / arrows (or the on-screen stick) to walk, Shift to run. 1 unit = 1 metre.
const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift']);
const keys = new Set();
const stick = { x: 0, y: 0 };
const walker = { on: false, x: 0, z: 8, eye: 1.7, bob: 0, speed: 0, stepAcc: 0 };
const BLOCKS = [
  [CABIN.x + 0.86, CABIN.z + 0.68, 4.3],
  [CAMP.tent.x, CAMP.tent.z, 2.4],
  [CAMP.fire.x, CAMP.fire.z, 1.25],
  ...GARDEN_TREES.map(([x, z]) => [x, z, 0.6]),
  ...ROCK_SPOTS.map(([x, z, size]) => [x, z, size * 0.82 + 0.25]),
];
// Bơ, the camp corgi (corgi.js): lives between the fire and the cabin, sleeps by the fire at
// night (or by the stove, if you have gone in), and comes over when you arrive.
const corgi = createCorgi({ rich: tier !== 'low', low: tier === 'low', home: { x: -1.5, z: -3.5, r: 7 } });
corgi.group.traverse((o) => {
  o.layers.enable(ROOM_LAYER);                 // seen indoors as well as out
  if (o.isMesh) o.receiveShadow = Q.shadow > 0;
});
scene.add(corgi.group);
if (movers) movers.roots.push(corgi.group);
const DOG_FIRE = { x: CAMP.fire.x - 1.25, z: CAMP.fire.z + 1.3 }, DOG_PORCH = { x: -8.5, z: -9.0 };
const trek = { dist: 0, found: new Set(['camp']), saveAt: 0 };
trek.dist = store.get('trek.dist', 0);
for (const id of store.get('trek.found', [])) trek.found.add(id);
function saveTrek() { store.patch('trek', { dist: Math.round(trek.dist), found: trek.found }); }
function inStream(x, z) { return z < -30 && Math.abs(x - streamX(z)) < streamW(z); }
/** wading slows you and splashes; in winter the stream is frozen and you walk over the ice */
function wetAt(x, z) { return inStream(x, z) && clock.weights[3] < 0.5; }
function updateWalk(dt) {
  let fx = 0, fz = 0;
  if (mode === 'view' && journal.classList.contains('hidden') && partyBox.classList.contains('hidden')) {
    if (keys.has('w') || keys.has('arrowup')) fz += 1;
    if (keys.has('s') || keys.has('arrowdown')) fz -= 1;
    if (keys.has('a') || keys.has('arrowleft')) fx -= 1;
    if (keys.has('d') || keys.has('arrowright')) fx += 1;
    fx += stick.x; fz -= stick.y;
  }
  const mag = Math.hypot(fx, fz);
  walker.speed = 0;
  if (stroll.on) { if (mag > 0.08 || mode !== 'view') setStroll(false); else updateStroll(dt); }
  if (mag > 0.08) {
    if (!walker.on) {
      // stand up from wherever you were sitting
      walker.on = true;
      walker.x = camBase.x; walker.z = camBase.z;
      walker.eye = camBase.y - terrainH(camBase.x, camBase.z);
      setTour(false);
      [...$('spots').children].forEach((c) => c.setAttribute('aria-pressed', 'false'));
    }
    const run = keys.has('shift') ? 2.0 : 1.0;
    const wet = wetAt(walker.x, walker.z);
    const sp = 3.3 * run * Math.min(1, mag) * (wet ? 0.55 : 1);
    const yr = view.yaw * DEG;
    const dx = (Math.sin(yr) * fz + Math.cos(yr) * fx) / mag;
    const dz = (-Math.cos(yr) * fz + Math.sin(yr) * fx) / mag;
    const indoorSp = indoor.on ? 0.55 : 1;                  // a small room: you take it slowly
    let nx = walker.x + dx * sp * indoorSp * dt, nz = walker.z + dz * sp * indoorSp * dt;
    if (indoor.on) {
      [nx, nz] = room.confine(nx, nz, 0.32);                 // the four walls and the furniture
    } else {
      for (const [bx, bz, br] of BLOCKS) {
        const ox = nx - bx, oz = nz - bz, d = Math.hypot(ox, oz);
        if (d < br && d > 1e-4) { nx = bx + (ox / d) * br; nz = bz + (oz / d) * br; }
      }
      nx = clamp(nx, BOUNDS.minX, BOUNDS.maxX);
      nz = clamp(nz, BOUNDS.minZ, BOUNDS.maxZ);
    }
    const moved = Math.hypot(nx - walker.x, nz - walker.z);
    walker.x = nx; walker.z = nz;
    walker.speed = moved / Math.max(dt, 1e-4);
    walker.bob += moved * 2.1;
    trek.dist += moved;
    storyAcc.walked += moved;
    walker.stepAcc += moved;
    if (walker.stepAcc > (run > 1 ? 1.15 : 0.82)) { walker.stepAcc = 0; audio.step(wet); }
  }
  if (walker.on) {
    walker.eye += ((indoor.on ? 1.6 : 1.7) - walker.eye) * (1 - Math.exp(-dt * 4));
    const bob = Math.sin(walker.bob) * 0.035 * Math.min(1, walker.speed / 3);
    camTarget.set(walker.x, (indoor.on ? room.floorY : terrainH(walker.x, walker.z)) + walker.eye + bob, walker.z);
  }
}
// "Dạo vườn": the camera takes an unhurried walk through the beds on its own. Any key, drag
// or scroll hands the walk back to you, exactly where you are standing.
const STROLL = [
  [0, 6], [-1.5, -3], [-0.9, -11], [-0.9, -19], [6, -14], [13, -4], [19, 6], [GARDEN_ARCH.x - 2.5, GARDEN.z],
  [GARDEN_ARCH.x + 2, GARDEN.z], [GARDEN.x - 4.9, GARDEN.z + 4.9], [GARDEN.x, GARDEN.z + 7], [GARDEN.x + 4.9, GARDEN.z + 4.9],
  [GARDEN.x + 9, GARDEN.z + 9.6], [GARDEN.x + 15, GARDEN.z + 9.6], [GARDEN.x + 18.5, GARDEN.z + 2], [GARDEN.x + 18.6, GARDEN.z - 9],
  [GARDEN.x + 11, GARDEN.z - 4.4], [GARDEN.x + 4.9, GARDEN.z - 4.9], [GARDEN.x, GARDEN.z - 7], [GARDEN.x - 4.9, GARDEN.z - 4.9],
  [GARDEN.x - 7, GARDEN.z], [GARDEN.x - 2.9, GARDEN.z + 1.2],
];
const stroll = { on: false, i: 0, pause: 0, look: 0 };
function setStroll(on) {
  if (stroll.on === on || (on && indoor.on)) return;
  stroll.on = on;
  $('qStroll').setAttribute('aria-pressed', String(on));
  if (!on) return;
  setTour(false);
  if (!walker.on) {
    walker.on = true;
    walker.x = camBase.x; walker.z = camBase.z;
    walker.eye = camBase.y - terrainH(camBase.x, camBase.z);
    [...$('spots').children].forEach((c) => c.setAttribute('aria-pressed', 'false'));
  }
  // start from the nearest point of the path, not from the beginning
  let best = 1e9;
  STROLL.forEach(([x, z], k) => { const d = Math.hypot(x - walker.x, z - walker.z); if (d < best) { best = d; stroll.i = k; } });
  stroll.pause = 0;
  if (clock.phase.id === 'night') toast('Dạo vườn ban đêm cũng được, nhưng hoa đẹp nhất khi còn nắng (phím N)');
  else toast('Cứ thả lỏng. Bấm phím bất kỳ hoặc kéo chuột để tự đi tiếp');
}
function updateStroll(dt) {
  const [tx, tz] = STROLL[stroll.i];
  const dx = tx - walker.x, dz = tz - walker.z, d = Math.hypot(dx, dz);
  if (stroll.pause > 0) {
    // a moment to stand and look: the gaze drifts down to the flowers alongside
    stroll.pause -= dt;
    view.pitchT = -14;
    view.yawT = view.yaw + wrapYaw(stroll.look - view.yaw) * 0.5;
    return;
  }
  if (d < 0.5) {
    stroll.i = (stroll.i + 1) % STROLL.length;
    if (stroll.i % 3 === 0) {
      stroll.pause = 5.5;
      stroll.look = view.yaw + (stroll.i % 2 ? 55 : -55);
    }
    return;
  }
  const sp = 0.95;
  const step = Math.min(d, sp * dt);
  walker.x += (dx / d) * step; walker.z += (dz / d) * step;
  walker.speed = sp;
  walker.bob += step * 2.1;
  trek.dist += step;
  storyAcc.walked += step;
  walker.stepAcc += step;
  if (walker.stepAcc > 0.86) { walker.stepAcc = 0; audio.step(false); }
  // look a little ahead of where the feet are going, and slightly down
  const heading = Math.atan2(dx, -dz) / DEG;
  view.yawT = view.yaw + wrapYaw(heading + Math.sin(time * 0.21) * 16 - view.yaw);
  view.pitchT = -5 + Math.sin(time * 0.13) * 3;
  view.fovT = baseFov;
}
function goSpot(i, pose = true) {
  if (indoor.on) leaveRoom();                  // a place outside: you step out of the cabin first
  setStroll(false);
  spotIndex = i;
  walker.on = false;
  const sp = SPOTS[i];
  camTarget.set(sp.x, terrainH(sp.x, sp.z) + sp.eye, sp.z);
  if (pose) {
    view.yaw = wrapYaw(view.yaw);
    view.yawT = sp.yaw; view.pitchT = sp.pitch; view.fovT = baseFov * sp.fov;
  }
  const box = document.getElementById('spots');
  if (box) [...box.children].forEach((c, k) => c.setAttribute('aria-pressed', String(k === i)));
}
function tourGo(i) {
  const k = TOUR[i % TOUR.length];
  view.yawT = k.yaw; view.pitchT = k.pitch; view.fovT = baseFov * k.fov;
}

function resize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h;
  const prev = baseFov;
  baseFov = camera.aspect < 0.8 ? 72 : camera.aspect < 1.25 ? 60 : 50;
  view.fovT *= baseFov / prev;
  view.fov *= baseFov / prev;
  camera.fov = view.fov;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(w, h);
  shared.uPixelRatio.value = pixelRatio;
  lensPass.uniforms.uTexel.value.set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
  lensPass.uniforms.uMaxBlur.value = 9 * pixelRatio * (h / 1080);
  finalPass.uniforms.uTexel.value.set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
  game.baseFov = baseFov;
  game.layout();
  syncKeepsakes();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 250));
resize();

/* ----------------------------------------------------------------- pointer */
const pointer = { x: 0, y: 0.2, sx: 0, sy: 0.2, touch: false };
const pointers = new Map();
let pinchDist = 0;
let dragMoved = 0;
let lastMove = performance.now();

function setPointer(e) {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -((e.clientY / innerHeight) * 2 - 1);
  pointer.touch = e.pointerType === 'touch';
}
addEventListener('pointermove', (e) => {
  setPointer(e);
  lastMove = performance.now();
  document.body.classList.remove('idle');
}, { passive: true });

canvas.addEventListener('pointerdown', (e) => {
  setPointer(e);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  dragMoved = 0;
  if (mode === 'view') {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    document.body.classList.add('dragging');
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
});
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p || mode !== 'view') return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  dragMoved += Math.abs(dx) + Math.abs(dy);
  if (pointers.size === 1) {
    if (dragMoved > 4) { setTour(false); setStroll(false); }
    const degPerPx = view.fov / innerHeight;
    view.yawT -= dx * degPerPx;
    view.pitchT = clamp(view.pitchT + dy * degPerPx, LIMIT.pitchMin, LIMIT.pitchMax);
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDist > 0 && d > 0) {
      setTour(false);
      view.fovT = clamp(view.fovT * (pinchDist / d), LIMIT.fovMin, baseFov * 1.35);
    }
    pinchDist = d;
  }
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  pinchDist = 0;
  if (pointers.size === 0) document.body.classList.remove('dragging');
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', (e) => {
  if (mode !== 'view') return;
  e.preventDefault();
  setTour(false);
  setStroll(false);
  view.fovT = clamp(view.fovT * Math.exp(e.deltaY * 0.0012), LIMIT.fovMin, baseFov * 1.35);
}, { passive: false });

/* ----------------------------------------------------------------- meteors */
const meteor = { active: false, t: 0, dur: 1, a: new THREE.Vector3(), b: new THREE.Vector3(), head: new THREE.Vector3(), wait: 5, caught: false };
const _t = new THREE.Vector3();
function dirFrom(azDeg, elDeg, out) {
  const az = azDeg * DEG, el = elDeg * DEG;
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}
function spawnMeteor() {
  const playing = mode === 'play';
  const az = view.yaw + (Math.random() * 2 - 1) * 36;
  const el = clamp(view.pitch + 10 + Math.random() * 22, 16, 78);
  dirFrom(az, el, meteor.a);
  const sweep = (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 14);
  dirFrom(az + sweep, Math.max(8, el - 7 - Math.random() * 10), meteor.b);
  meteor.t = 0;
  meteor.dur = playing ? 1.25 + Math.random() * 0.6 : 0.65 + Math.random() * 0.6;
  meteor.active = true;
  meteor.caught = false;
  skyMat.uniforms.uMetColor.value.set(0.80, 0.93, 1.0);
  audio.meteor();
}
function updateMeteor(dt) {
  const u = skyMat.uniforms;
  if (!meteor.active) {
    game.meteorDir = null;
    meteor.wait -= dt;
    if (meteor.wait <= 0 && uDay.value < 0.2) {
      spawnMeteor();
      meteor.wait = mode === 'play' ? 8 + Math.random() * 8 : 5 + Math.random() * 11;
    }
    u.uMetHead.value.w = 0;
    return;
  }
  meteor.t += dt / meteor.dur;
  if (meteor.t >= 1) { meteor.active = false; game.meteorDir = null; u.uMetHead.value.w = 0; return; }
  const p = meteor.t;
  meteor.head.copy(meteor.a).lerp(meteor.b, p).normalize();
  _t.copy(meteor.a).lerp(meteor.b, Math.max(0, p - 0.32)).normalize();
  u.uMetHead.value.set(meteor.head.x, meteor.head.y, meteor.head.z, Math.pow(Math.sin(Math.PI * p), 0.6) * (meteor.caught ? 2.2 : 1));
  u.uMetTail.value.copy(_t);
  game.meteorDir = meteor.caught ? null : meteor.head;
}

/* ------------------------------------------------------------- the seasons */
// What grows, what colour the trees are, whether it snows. `w` is the season blend.
const CROWN = [                                  // two tones for the cherry crowns, per season
  [[0.70, 0.30, 0.44], [0.86, 0.60, 0.69]],      // blossom
  [[0.022, 0.085, 0.024], [0.070, 0.180, 0.045]],
  [[0.40, 0.065, 0.018], [0.78, 0.34, 0.035]],
];
const LEAF = [CROWN[1], CROWN[1], CROWN[2]];     // the arch is in leaf from spring on
const DRIFT = [[[0.70, 0.42, 0.50], [0.84, 0.70, 0.74]], [[0, 0, 0], [0, 0, 0]], [[0.46, 0.10, 0.02], [0.80, 0.40, 0.04]]];
const _hemiDay = new THREE.Color(), _hemiGround = new THREE.Color(), _snowBounce = new THREE.Color().setRGB(0.30, 0.31, 0.33);
const SOD_GREEN = new THREE.Color(0x1a2a10), SOD_SNOW = new THREE.Color().setRGB(0.62, 0.66, 0.72);
function applySeason(w) {
  for (const group of [beds, garden]) {
    for (const [name, u] of Object.entries(group.userData.grow)) {
      u.uGrow.value = ease(clock.grow(name));
      const ms = group.userData.meshes && group.userData.meshes[name];
      // a close-up plot (flora.js) is drawn only while the viewer is within reach of it
      if (ms) for (const m of ms) m.visible = u.uGrow.value > 0.02 && (!m.userData.near || Math.hypot(camera.position.x - m.userData.near.center.x, camera.position.z - m.userData.near.center.z) < LOD_NEAR + 1 + m.userData.near.radius);
    }
  }
  garden.userData.grow.ring.uTint.value.set(0.72, 0.035, 0.075, w[3]);          // roses give way to red camellias
  const leafy = w[0] + w[1] + w[2] || 1;
  const blend = (u, table) => {
    for (const [key, i] of [['uColA', 0], ['uColB', 1]]) {
      u[key].value.set(0, 0, 0);
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const c = table[sIdx][i], f = w[sIdx] / leafy;
        u[key].value.x += c[0] * f; u[key].value.y += c[1] * f; u[key].value.z += c[2] * f;
      }
    }
  };
  const { crown, foliage, drift, shades, butterflies } = garden.userData;
  crown.uScale.value = foliage.uScale.value = ease(clock.grow('crown'));
  crown.uLeaf.value = 1 - w[0] / leafy;
  blend(crown, CROWN);
  blend(foliage, LEAF);
  blend(drift, DRIFT);
  drift.uAmount.value = w[0] * 0.9 + w[2] * 0.75;
  for (const sh of shades) sh.visible = w[3] < 0.5;
  butterflies.visible = w[3] < 0.5;
  snow.visible = w[3] > 0.02;
  snow.material.uniforms.uAmount.value = w[3];
  cabin.sod.color.copy(SOD_GREEN).lerp(SOD_SNOW, w[3]);
  uSnowCover.value = w[3];
}

/* ------------------------------------------------------------ day and night */
const NIGHT_AMB = [0.08, 0.13, 0.18], DAY_AMB = [0.40, 0.50, 0.68], DUSK_AMB = [0.34, 0.30, 0.42];
const NIGHT_FOG = [0.010, 0.026, 0.034], DAY_FOG = [0.46, 0.63, 0.86], DUSK_FOG = [0.50, 0.33, 0.36];
// Lamps for the built things (cabin, tent, rocks). By day they are matched to the light the
// ground and the grass get from the shader uniforms: three.js divides by pi, so the numbers differ.
const HEMI_SKY_N = new THREE.Color(0x3a6a86), HEMI_GROUND_N = new THREE.Color(0x0a160d), HEMI_GROUND_D = new THREE.Color().setRGB(0.20, 0.22, 0.13);
const SUN = [2.9, 2.55, 1.95], DUSK_SUN = [3.4, 1.42, 0.50];
// Sunrise is not sunset run backwards: the air is cold and clean after the night, the light
// pale gold and rose, the shadows lilac; sunset is warm, dusty and orange.
const DAWN_SUN = [3.1, 1.95, 1.20], DAWN_AMB = [0.30, 0.33, 0.48], DAWN_FOG = [0.50, 0.46, 0.58];
let lanternOn = true;
const _sunWas = new THREE.Vector3(), _seasonWas = new THREE.Vector4(-1, 0, 0, 0);
let shadowSettle = 0;
const ease = (t) => t * t * (3 - 2 * t);
/** the crest that hides a low sun: walk out from the camp along the sun's bearing over the real
    ground and mountain heights, keep the point seen highest. Cached per tenth of a degree. */
const _ridge = { key: NaN, h: 100, d: 500 };
const _ridgeWant = new THREE.Vector2();
function ridgeFor(sx, sz, out) {
  const key = Math.round(Math.atan2(sz, sx) * 1800 / Math.PI);           // a tenth of a degree
  if (key !== _ridge.key) {
    _ridge.key = key;
    const h0 = terrainH(0, 0) + 1.7;
    let best = -1e9;
    for (let d = 20, step = 6; d < 1250; d += step, step *= 1.025) {
      const x = sx * d, z = sz * d;
      const h = terrainH(x, z) + mountainRise(x, z);
      const tn = (h - h0) / d;
      if (tn > best) { best = tn; _ridge.h = h; _ridge.d = d; }
    }
  }
  out.set(_ridge.h, _ridge.d);
}
function applyDay(dt) {
  clock.hold = mode === 'play';             // the star game keeps its night
  clock.update(dt);
  const d = clock.day, k = clock.dusk, w = clock.weights;
  uDay.value = d;
  shared.aurora.uDusk.value = k;
  shared.uSeason.value.set(w[0], w[1], w[2], w[3]);
  // what the season does to the colour of the light
  const tint = (row, ch) => SEASON_LIGHT[0][row][ch] * w[0] + SEASON_LIGHT[1][row][ch] * w[1] + SEASON_LIGHT[2][row][ch] * w[2] + SEASON_LIGHT[3][row][ch] * w[3];
  const mix3 = (out, night, dayC, dusk, row) => {
    for (let ch = 0; ch < 3; ch++) {
      const v = night[ch] + (dayC[ch] - night[ch]) * d;
      out[ch] = (v + (dusk[ch] - v) * k) * (row < 0 ? 1 : 1 + (tint(row, ch) - 1) * d);
    }
    return out;
  };
  const morn = clock.hour < 12 ? 1 : 0;           // at noon there is no sunrise or sunset colour, so the switch never shows
  shared.aurora.uMorn.value = morn;
  const amb = mix3([0, 0, 0], NIGHT_AMB, DAY_AMB, morn ? DAWN_AMB : DUSK_AMB, 1);
  shared.uAmb.value.set(amb[0], amb[1], amb[2]);
  // the low sun is orange while rising, then whitens; at sunset it goes all the way to ember
  const warm = 1 - d;
  const sun = [SUN[0] * d, SUN[1] * d * (1 - 0.35 * warm), SUN[2] * d * (1 - 0.6 * warm)];
  const lowSun = morn ? DAWN_SUN : DUSK_SUN;
  for (let ch = 0; ch < 3; ch++) sun[ch] = (sun[ch] + (lowSun[ch] - sun[ch]) * k) * tint(0, ch);
  shared.uSunCol.value.set(sun[0], sun[1], sun[2]);
  shared.uSunDir.value.set(clock.sun[0], clock.sun[1], clock.sun[2]);
  // below about ten degrees the sun is behind the mountain wall: the valley floor loses its
  // direct light while the sky and the peaks keep theirs
  let reach = ease(Math.min(1, Math.max(0, (clock.sun[1] - 0.10) / 0.12)));
  shared.light.uSunReach.value = reach;
  if (Q.terrainQ > 0) {
    // medium and high: the shade line creeps across the valley (sunReachAt in light.js); the
    // built things get the sun as it is where you stand
    const sf = shared.light.uSunFlat.value, rd = shared.light.uRidge.value;
    const h = Math.hypot(clock.sun[0], clock.sun[2]) || 1e-4;
    sf.set(clock.sun[0] / h, clock.sun[2] / h, clock.sun[1] / h, 1);
    // the crest that matters can change from one peak to the next as the sun swings round:
    // ease toward it, so the shade line glides instead of jumping
    ridgeFor(sf.x, sf.y, _ridgeWant);
    if (rd.x === 100 && rd.y === 500) rd.copy(_ridgeWant);
    else rd.lerp(_ridgeWant, 1 - Math.exp(-dt * 1.5));
    const t = Math.max(rd.y - (camBase.x * sf.x + camBase.z * sf.y), 40);
    const e = sf.z - (rd.x - camBase.y + 1.7) / t;
    reach = ease(Math.min(1, Math.max(0, (e + 0.026) / 0.052)));
  }
  const fog = mix3([0, 0, 0], NIGHT_FOG, DAY_FOG, morn ? DAWN_FOG : DUSK_FOG, -1);
  // winter air is paler, autumn air a little golden
  fogColor.setRGB(fog[0] * (1 + 0.10 * w[3] * d + 0.05 * w[2] * d), fog[1] * (1 + 0.08 * w[3] * d), fog[2] * (1 + 0.04 * w[3] * d - 0.08 * w[2] * d));
  const lerp = (a, b) => a + (b - a) * d;
  hemi.intensity = lerp(0.9, Math.PI);
  hemi.color.copy(HEMI_SKY_N).lerp(_hemiDay.setRGB(amb[0], amb[1], amb[2]), d);
  hemi.groundColor.copy(HEMI_GROUND_N).lerp(_hemiGround.copy(HEMI_GROUND_D).lerp(_snowBounce, w[3]), d);
  shared.uFogDensity.value = scene.fog.density = lerp(0.0042, 0.0012) * (1 - 0.25 * k + 0.6 * w[3] * d);
  const sunMax = Math.max(sun[0], sun[1], sun[2], 1e-4);
  sunLight.color.setRGB(sun[0] / sunMax, sun[1] / sunMax, sun[2] / sunMax);
  sunLight.intensity = sunMax * Math.PI * reach;
  bloom.threshold = lerp(0.82, 1.08);
  renderer.toneMappingExposure = lerp(1.12, 1.04) * (1 - 0.10 * w[3] * d);       // snow is bright: hold the highlights
  applySeason(w);

  // The shadow map is drawn and reused. It goes stale when the sun has moved a twentieth of a
  // degree or the plantings change height (a new season); then it is redrawn, at most every
  // other frame, until things settle. (It used to wait for a third of a degree: with the clock
  // running every shadow then jumped a hand's breadth twice a second, which the owner saw as
  // juddering. Measured on the 780M, a redraw does not lengthen the frame it happens in.)
  if (Q.shadow) {
    const moved = _sunWas.distanceToSquared(shared.uSunDir.value) > 8e-7 || !_seasonWas.equals(shared.uSeason.value);
    if (moved) shadowSettle = 2;
    if (shadowSettle > 0 && frames % 2 === 0) {
      _sunWas.copy(shared.uSunDir.value);
      _seasonWas.copy(shared.uSeason.value);
      sunLight.position.copy(sunLight.target.position).addScaledVector(shared.uSunDir.value, 220);
      fitSunShadow();
      renderer.shadowMap.needsUpdate = true;
      shadowStale = true;
      if (!moved) shadowSettle--;
    }
  }
  const dim = 1 - 0.88 * d;
  for (const [m, r, g, b] of cabin.glows) m.color.setRGB(r * dim, g * dim, b * dim);
  const lamp = lanternOn ? dim : 0.05;
  for (const [m, r, g, b] of camp.glows) m.color.setRGB(r * lamp, g * lamp, b * lamp);
  cabin.paneMat.uniforms.uLit.value = dim;
  camp.doorMat.uniforms.uLit.value = lamp;
  camp.canvasMat.emissiveIntensity = 0.03 + 0.34 * lamp;       // the lantern glows through the cloth
  cabin.light.intensity = 7 * dim;
  camp.tentLight.intensity = lanternOn ? 2.2 * dim : 0;
  // the lantern by the garden bench: lit from dusk, a small steady flame
  const bl = garden.userData.lantern;
  const lv = Math.min(1, Math.max(0, (dim - 0.35) / 0.5));
  bl.light.intensity = 1.6 * lv;
  bl.glass.emissiveIntensity = 1.4 * lv;
  bl.flame.visible = lv > 0.02;
  shared.uLampLight.value.w = 0.55 * lv;
  if (indoor.on) room.update(dt, time, { day: d, dusk: k, sunCol: sun, snow: w[3] });
  return d;
}

/* ---------------------------------------------------------------- campfire */
// The fire is not a lamp that burns for ever. It burns down over a few minutes and goes out;
// feeding it takes wood you carry (up to four sticks, picked up by walking past the woodpile
// beside the tent), and you have to be near it. Once it is out it has to be kindled again.
// In the star game the fire is only a source of stardust, so there it never runs out.
const FIRE_REACH = 12, WOOD_MAX = 4, WOODPILE = { x: 7.1, z: -5.4 };
const fire = { level: 0.5, cooldown: 0, told: false, lastAudio: -1, wood: 3, label: '' };
const _fireDir = new THREE.Vector3();
const _proj = new THREE.Vector3();
const fireBtn = $('fireBtn');
function stoke(remote) {
  if (fire.cooldown > 0 || mode === 'intro') return;
  const own = remote !== true, out = fire.level < 0.04;
  if (own && mode === 'view') {
    if (Math.hypot(camBase.x - CAMP.fire.x, camBase.z - CAMP.fire.z) > FIRE_REACH) {
      fire.cooldown = 1.2;
      toast('Đống lửa ở xa quá. Đi lại gần rồi hãy thêm củi');
      return;
    }
    if (fire.wood <= 0) {
      fire.cooldown = 1.2;
      toast('Hết củi trong tay. Đống củi ở ngay cạnh lều: đi ngang qua là ôm được một bó');
      return;
    }
    fire.wood--;
  }
  if (own) {
    party.sendEvent('stoke');
    if (mode === 'view') {
      story.mark('fire');
      if (out) { story.mark('kindle'); story.note(`k:${story.log.filter((x) => x.startsWith('k:')).length + 1}`); }
    }
  }
  fire.cooldown = 0.35;
  if (out && own && mode === 'view') toast(`Thổi vài hơi vào đám than, lửa bén lại từ một nhúm vỏ cây. Còn ${fire.wood} thanh củi trong tay`);
  fire.level = out ? 0.42 : Math.min(1, fire.level + 0.28);
  audio.init();
  audio.stoke();
  fireBtn.classList.remove('pop');
  void fireBtn.offsetWidth;
  fireBtn.classList.add('pop');
  if (mode === 'play') {
    _fireDir.copy(camp.firePos).sub(camera.position).normalize();
    game.releaseEmbers(_fireDir, 3);
    if (!fire.told) { fire.told = true; toast('Tàn lửa bay lên hoá thành bụi sao — hãy đón lấy'); }
  } else if (!fire.told && !out) {
    fire.told = true;
    toast(`Lửa bùng lên ấm áp. Còn ${fire.wood} thanh củi trong tay; lửa sẽ tàn dần nếu không ai trông`);
  }
}
fireBtn.addEventListener('click', () => stoke());
canvas.addEventListener('pointerup', (e) => {
  if (dragMoved > 6) return;
  _proj.copy(camp.firePos).project(camera);
  if (_proj.z > 1) return;
  const sx = (_proj.x * 0.5 + 0.5) * innerWidth, sy = (-_proj.y * 0.5 + 0.5) * innerHeight;
  if (Math.hypot(e.clientX - sx, e.clientY - sy) < 64) stoke();
});

/* ---------------------------------------------------------------------- UI */
const ui = {
  score: $('score'), best: $('best'), combo: $('combo'), mult: $('mult'),
  comboBar: $('comboBar'), pips: $('pips'), conName: $('conName'), conLatin: $('conLatin'),
  conDots: $('conDots'), hint: $('hint'), toast: $('toast'), status: $('status'),
  volume: $('volume'), soundBtn: $('soundBtn'), moods: $('moods'), timelapse: $('timelapse'),
};
let mode = 'intro';           // intro | play | view
let zen = false;
let started = false;
let showCons = false;
let timelapse = 0;
let toastTimer = 0;
let lastScore = -1;
let lastStatus = '';
let wantPhoto = false;
let shadowStale = false;      // the shadow map was just redrawn: its matrix must be handed to the shaders
let focusHit = 40;            // how far along the view ray the ground (or a flower) is

function toast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 3600);
}

/* the day's thread: a card that suggests one small thing to do next */
const story = new Story();
const storyEl = $('story');
/** the constellation worth looking for tonight: one tied to a flower already pressed, else
    one the season's evening sky offers, else any not yet picked out */
function starHint() {
  for (const f of story.flowers) { const cid = starOfFlower(f); if (cid && !story.seen.has(cid)) return cid; }
  for (const cid of SEASON_SKY[clock.seasonIndex]) if (!story.seen.has(cid)) return cid;
  const left = CONSTELLATIONS.find((c) => !story.seen.has(c.id));
  return left ? left.id : '';
}
const consName = (id) => (CONSTELLATIONS.find((c) => c.id === id) || { name: id }).name;
const flowerName = (id) => (FLOWERS.find((f) => f.id === id) || { name: id }).name;
function renderStory(turned) {
  const ch = story.current;
  $('storyStep').textContent = ch ? `Một ngày ở trại · ${ch.when} · ${story.count + 1}/${story.total}` : 'Một ngày ở trại · trọn vẹn';
  $('storyTitle').textContent = ch ? ch.title : 'Thung lũng là của bạn';
  let ask = ch ? ch.ask : 'Bạn đã đi hết một ngày ở trại. Cứ ở lại bao lâu tuỳ thích; trong Sổ tay có nút để bắt đầu lại một ngày mới.';
  if (ch && (ch.id === 'star' || ch.id === 'lie' || ch.id === 'night')) {
    const cid = starHint();
    if (cid) {
      const why = THREADS[cid] && story.flowers.has(THREADS[cid].flower) ? ` (bông ${flowerName(THREADS[cid].flower).toLowerCase()} trong sổ của bạn có một sợi chỉ nối tới nó)` : ' (chòm của mùa này)';
      ask += ` Đêm nay hãy tìm chòm ${consName(cid)}${why}; la bàn sẽ chỉ hướng.`;
    }
  }
  if (ch && ch.id === 'press' && story.satchel.size) ask = `Bạn đang mang ${story.satchel.size} cành hoa trong túi. Về tới lều là chúng được ép vào sổ.`;
  $('storyAsk').textContent = ask;
  $('storyBar').style.transform = `scaleX(${(story.count / story.total).toFixed(3)})`;
  storyEl.classList.toggle('folded', story.folded);
  $('storyFold').setAttribute('aria-expanded', String(!story.folded));
  if (turned) { storyEl.classList.remove('turn'); void storyEl.offsetWidth; storyEl.classList.add('turn'); }
}
story.onPage = (ch, all) => {
  renderStory(true);
  if (all) { toast('Một ngày ở trại đã trọn vẹn. Thung lũng là của bạn.'); audio.complete(); }
  else { toast(`✓ ${ch.title} — ${ch.memo}`); audio.node(story.count); }
};
$('storyFold').addEventListener('click', () => { story.folded = !story.folded; story.save(); renderStory(false); });
renderStory(false);

/* the camp diary: short ids in the save, written out here */
function logText(id) {
  const [k, v] = id.split(':');
  if (k === 'w') return ['Một đêm dệt sao', `Dệt trọn chòm ${consName(v)}. Một ngôi sao mới sáng lại mãi trên trời trại, ngay phía trên chòm ấy.`];
  if (k === 'p') return ['Sổ hoa', `Ép một cành ${flowerName(v).toLowerCase()} vào sổ, kẹp giữa hai trang giấy.`];
  if (k === 'f') return ['Sổ hoa', `Sổ hoa đã có ${v} loài.${v === String(FLOWERS.length) ? ' Đủ cả bốn mùa của thung lũng.' : ''}`];
  if (k === 't') return ['Sợi chỉ', `Tìm ra sợi chỉ nối ${flowerName(THREADS[v].flower).toLowerCase()} dưới đất với chòm ${consName(v)} trên trời.`];
  if (k === 'r') return ['Nhà gỗ', v === '1' ? 'Lần đầu vào nghỉ trong nhà gỗ: một ấm trà, một trang sách.' : `Lại vào nghỉ trong nhà gỗ (lần thứ ${v}).`];
  if (k === 'k') return ['Lửa trại', v === '1' ? 'Lửa tàn, bạn tự tay nhóm lại.' : `Nhóm lại lửa trại lần thứ ${v}.`];
  if (k === 'd') return ['Trọn một ngày', `Đi hết một ngày ở trại (lần thứ ${v}).`];
  if (k === 'l') { const b = SHELF.find((x) => x.id === v); return b ? ['Giá sách', `Lần đầu mở cuốn “${b.title}” của ${b.author === 'Bạn' ? 'chính bạn' : b.author}.`] : ['', id]; }
  if (k === 'c') return ['Bơ', `Gãi tai cho Bơ, chú corgi của trại, giữa ${SEASONS[Number(v)] ? SEASONS[Number(v)].name.toLowerCase() : 'trại'}. Cái đuôi cộc vẫy không ngừng.`];
  if (k === 'b') return ['Ghế dưới anh đào', `Ngồi đọc sách dưới cây anh đào giữa ${SEASONS[Number(v)] ? SEASONS[Number(v)].name.toLowerCase() : 'vườn'}, hoa nở quanh chân ghế.`];
  return ['', id];
}
/** a flower pressed and its constellation picked out (or woven): the thread between them shows */
function checkThreads() {
  for (const [cid, t] of Object.entries(THREADS)) {
    if (story.flowers.has(t.flower) && (story.seen.has(cid) || game.woven.has(cid)) && story.note(`t:${cid}`)) {
      setTimeout(() => toast(`Sợi chỉ mới: ${flowerName(t.flower)} ↔ chòm ${consName(cid)}. Đọc trong Sổ tay (J)`), 3800);
    }
  }
}
function pressAtTent() {
  const got = story.pressAll();
  if (!got.length) return;
  for (const f of got) story.note(`p:${f.id}`);
  for (const m of [4, 8, FLOWERS.length]) if (story.flowers.size >= m) story.note(`f:${m}`);
  story.mark('press');
  audio.node(story.flowers.size + 4);
  toast(`Về tới lều: ép ${got.map((f) => f.name.toLowerCase()).join(', ')} vào Sổ hoa (${story.flowers.size}/${FLOWERS.length}). Mở Sổ tay (J) để đọc chuyện của chúng`);
  checkThreads();
  renderStory(false);
}

/* resting in the cabin: a fade, a page of the day, and the clock moves on */
const PORCH = { x: -9.5, z: -10 };
const rest = { on: false, ready: 0 };
const veil = $('veil');
function readingFor() {
  // something from the book on the table: a tale of a flower you pressed or a sky you wove
  const pool = [];
  for (const id of story.flowers) { const f = FLOWERS.find((x) => x.id === id); if (f) for (const t of f.tales) pool.push([f.name, t]); }
  for (const id of game.woven) if (LORE[id] && LORE[id].deep) pool.push([`chòm ${consName(id)}`, LORE[id].deep]);
  if (!pool.length) return '';
  const [who, t] = pool[Math.floor(Math.random() * pool.length)];
  const cut = t.length > 260 ? `${t.slice(0, t.lastIndexOf(' ', 250))}…` : t;
  return `Cuốn sổ trên bàn mở ở trang ${who}: “${cut}”`;
}
function restInCabin() {
  if (rest.on || mode !== 'view') return;
  rest.on = true;
  setStroll(false);
  const from = clock.hour;
  const to = from < 6.5 ? 7.5 : from < 16.5 ? 17.6 : from < 21 ? 22.5 : 31.5;          // the next part of the day worth waking to
  const [when, text] = to === 7.5 || to === 31.5
    ? ['Sáng hôm sau', 'Bạn ngủ một giấc dài dưới mái cỏ. Khi mở cửa ra hiên, sương còn đọng trên cỏ và mặt trời vừa lên khỏi dãy núi.']
    : to === 17.6
      ? ['Chiều muộn', 'Bạn pha một ấm trà, ngồi bên cửa sổ đọc sách. Ngẩng lên đã thấy nắng ngả vàng trên các luống hoa.']
      : ['Đêm xuống', 'Bạn ăn tối bên bếp củi. Lúc bước ra hiên, trời đã tối hẳn và những ngôi sao đầu tiên đã lên.'];
  $('veilWhen').textContent = when;
  $('veilText').textContent = text;
  $('veilRead').textContent = readingFor();
  $('veilHint').textContent = 'Bấm để nhìn quanh căn phòng';
  veil.classList.remove('hidden', 'fading', 'quick', 'blank');
  rest.ready = performance.now() + 2200;
  setTimeout(() => {
    const hours = to - from;
    if (to > 24 && clock.auto) clock.setSeason(SEASONS[(clock.seasonIndex + 1) % SEASONS.length].id, true);
    clock.quiet = true;
    clock.setHour(to % 24);
    clock.quiet = false;
    syncClockUi();
    fire.level = Math.max(0, fire.level - hours * 0.4);          // nobody tended the fire meanwhile
    enterRoom();
  }, 900);
  story.mark('rest');
  story.note(`r:${story.log.filter((x) => x.startsWith('r:')).length + 1}`);
}
/* inside: the room is its own layer; the camera switches to it, and walking keeps to the four walls */
const indoor = { on: false, leaving: false };
function enterRoom() {
  indoor.on = true;
  setStroll(false);
  setTour(false);
  camera.layers.set(ROOM_LAYER);
  document.body.classList.add('indoor');
  walker.on = true;
  walker.x = room.entry.x; walker.z = room.entry.z; walker.eye = 1.6; walker.speed = 0;
  view.yawT = view.yaw = room.entry.yaw; view.pitchT = view.pitch = -8;
  view.fovT = baseFov;
  camTarget.set(walker.x, room.floorY + walker.eye, walker.z);
  camBase.copy(camTarget);
  // Bơ comes in too: asleep on its cushion by the stove at night, at your heels by day
  const sleepy = clock.day < 0.35;
  if (sleepy) corgi.place(room.dogSpot.x, room.dogSpot.z, Math.atan2(room.fire.x - room.dogSpot.x, room.fire.z - room.dogSpot.z) + 1.2, 'sleep');
  else {
    const [x, z] = room.confine(walker.x + (room.dogSpot.x - walker.x) * 0.35, walker.z + (room.dogSpot.z - walker.z) * 0.35, 0.3);
    corgi.place(x, z, Math.atan2(walker.x - x, walker.z - z), 'sit', 5);
  }
  for (const o of corgi.meshes) o.castShadow = Q.shadow > 0;        // into the stove light's shadow
  if (Q.shadow) renderer.shadowMap.needsUpdate = true;
}
function leaveRoom() {
  if (!indoor.on) return;
  indoor.on = false;
  camera.layers.set(0);
  document.body.classList.remove('indoor');
  walker.on = true;
  walker.x = PORCH.x + 1.2; walker.z = PORCH.z + 1.0; walker.eye = 1.7;
  view.yawT = view.yaw = 120; view.pitchT = view.pitch = 4;
  camTarget.set(walker.x, terrainH(walker.x, walker.z) + walker.eye, walker.z);
  camBase.copy(camTarget);
  corgi.place(DOG_PORCH.x + 0.6, DOG_PORCH.z + 0.4, 2.2, 'idle', 2);   // it trots out after you
  for (const o of corgi.meshes) o.castShadow = false;               // outside it is in the movers' map instead
  shadowSettle = 2;                                                  // the sun may have moved while you were in
}
/** the veil after resting lifts on the room; inside, E (or the button) takes you back out onto the porch */
function leaveCabin() {
  if (rest.on) {
    if (performance.now() < rest.ready) return;
    veil.classList.add('fading');
    setTimeout(() => { veil.classList.add('hidden'); rest.on = false; }, 1200);
    return;
  }
  if (!indoor.on || indoor.leaving) return;
  indoor.leaving = true;
  veil.classList.add('quick', 'blank', 'fading');
  veil.classList.remove('hidden');
  void veil.offsetWidth;
  veil.classList.remove('fading');                                   // a short fade to dark at the door
  audio.step(false);
  setTimeout(() => {
    leaveRoom();
    veil.classList.add('fading');
    setTimeout(() => { veil.classList.add('hidden'); veil.classList.remove('quick', 'blank'); indoor.leaving = false; }, 520);
  }, 480);
}
veil.addEventListener('click', leaveCabin);
/** a scratch behind the ears: the dog is glad, says so, and the diary remembers */
const PET_WORDS = [
  'Bơ vẫy cái đuôi cộc tít mù, nhảy cẫng lên hai cái rồi ngồi xuống sát chân bạn',
  'Bơ dụi mõm vào tay bạn, hai tai dựng thẳng, đuôi ngoáy liên hồi',
  'Bơ thở hổn hển vì vui, lè lưỡi nhìn bạn như chờ thêm một lần nữa',
  'Bơ nghiêng đầu nhìn bạn rồi sủa khẽ một tiếng, mông lắc theo đuôi',
];
function petCorgi() {
  if (corgi.distanceTo(camBase.x, camBase.z) > 2.4) return;
  const wasAsleep = corgi.state === 'sleep';
  corgi.pet();
  audio.init();
  const rel = wrapYaw(Math.atan2(corgi.x - camBase.x, -(corgi.z - camBase.z)) / DEG - view.yaw);
  audio.bark(clamp(rel / 60, -1, 1), clamp(1.6 - corgi.distanceTo(camBase.x, camBase.z) * 0.4, 0, 1));
  toast(wasAsleep ? 'Bơ đang ngủ thì mở mắt, đập đuôi xuống sàn mấy cái rồi đứng dậy đòi bạn gãi tiếp' : PET_WORDS[(corgi.petCount - 1) % PET_WORDS.length]);
  story.note(`c:${clock.seasonIndex}`);
}
/* the shelf on the garden bench: six books (js/library.js); where you left each one is saved */
const book = { open: false, id: '', pages: [], i: 0, turning: 0 };
const bookEl = $('book');
function shelfCtx() {
  const si = clock.seasonIndex;
  const word = SEASONS[si].name.replace('Mùa ', '').toLowerCase();
  return {
    FLOWERS, CONS: CONSTELLATIONS, LORE, THREADS, flowerName, logText,
    pressed: story.flowers, seen: story.seen, woven: game.woven, log: story.log,
    inSeason: FLOWERS.filter((f) => f.season.toLowerCase().includes(word)),
  };
}
const bookOf = (id) => SHELF.find((b) => b.id === id);
// The owner's own full books live in private/ (git-ignored: never committed or deployed). When
// the folder is there, its book joins the shelf; when it is not (any public copy), nothing happens.
import('../private/money/book.js').then(({ default: b }) => {
  if (!b || !Array.isArray(b.pages) || SHELF.some((x) => x.id === b.id)) return;
  SHELF.push({ ...b, imgBase: 'private/money/img/' });
  if (book.open && !book.id) renderShelf();
}).catch(() => {});
/** the saved page of a book ('id:n' in read.at) */
function savedPage(id) {
  const hit = store.get('read.at', []).find((s) => s.startsWith(`${id}:`));
  return hit ? Number(hit.split(':')[1]) || 0 : 0;
}
function savePage(id, n) {
  store.set('read.at', [`${id}:${n}`, ...store.get('read.at', []).filter((s) => !s.startsWith(`${id}:`))]);
  store.set('read.book', id);
}
function renderShelf() {
  const el = $('shelf');
  el.textContent = '';
  const ctx = shelfCtx();
  SHELF.forEach((b, k) => {
    const n = pagesOf(b, ctx).length, at = savedPage(b.id);
    const s = document.createElement('button');
    s.type = 'button';
    s.className = `spine spine-${b.kind}`;
    s.style.setProperty('--c', b.color);
    s.style.setProperty('--ink', b.ink);
    s.style.setProperty('--h', b.h);
    s.style.setProperty('--tilt', `${k === 2 ? -4 : k === 5 ? 3 : 0}deg`);
    s.dataset.book = b.id;
    s.setAttribute('aria-label', `${b.title}, ${b.author}`);
    s.innerHTML = '<span class="spine-band"></span><span class="spine-title"></span><span class="spine-author"></span><span class="spine-mark"></span>';
    s.querySelector('.spine-title').textContent = b.title;
    s.querySelector('.spine-author').textContent = b.author;
    s.querySelector('.spine-mark').textContent = at > 0 ? `tr. ${Math.min(at, n - 1) + 1}/${n}` : `${n} tr.`;
    s.addEventListener('click', () => openVolume(b.id));
    el.append(s);
  });
}
function showShelf() {
  book.id = '';
  $('readView').classList.add('hidden');
  $('shelfView').classList.remove('hidden');
  renderShelf();
  const last = store.get('read.book', '');
  const btn = last && $('shelf').querySelector(`[data-book="${last}"]`);
  (btn || $('shelf').firstChild).focus({ preventScroll: true });
}
function openVolume(id) {
  const b = bookOf(id);
  if (!b) return;
  book.id = id;
  book.pages = pagesOf(b, shelfCtx());
  book.i = Math.min(savedPage(id), book.pages.length - 1);
  $('shelfView').classList.add('hidden');
  $('readView').classList.remove('hidden');
  const sheet = $('bookSheet');
  sheet.style.setProperty('--c', b.color);
  sheet.classList.remove('turn-out', 'turn-in-next', 'turn-in-prev');
  void sheet.offsetWidth;
  sheet.classList.add('turn-in-next');
  renderPage();
  savePage(id, book.i);
  story.note(`l:${id}`);
}
function renderPage() {
  const b = bookOf(book.id), p = book.pages[book.i];
  $('bookRun').textContent = b.title;
  $('bookAuthor').textContent = b.translator ? `${b.author} · ${b.translator} dịch` : b.author;
  $('bookTitle').textContent = p.h;
  const q = $('bookQuote'), ref = $('bookRef');
  q.classList.toggle('hidden', !p.q);
  q.textContent = p.q || '';
  ref.classList.toggle('hidden', !p.ref);
  ref.textContent = p.ref ? `${p.ref}. ${b.kind === 'classic' ? 'Chuyển ý:' : ''}` : '';
  const text = $('bookText');
  text.textContent = '';
  for (const para of p.t.split('\n\n')) {
    // a whole book (private/): [[img:NN]] a picture, [[q]] a quoted passage, [[sub:…]] a chapter's subtitle
    const pic = /^\[\[img:(\d+)\]\]$/.exec(para);
    if (pic && b.imgBase) {
      const im = document.createElement('img');
      im.className = 'book-img'; im.loading = 'lazy'; im.alt = '';
      im.src = `${b.imgBase}${pic[1]}.jpg`;
      text.append(im);
      continue;
    }
    if (pic) continue;
    const e = document.createElement('p');
    const sub = /^\[\[sub:(.*)\]\]$/.exec(para);
    if (sub) { e.className = 'book-sub'; e.textContent = sub[1]; }
    else if (para.startsWith('[[q]]')) { e.className = 'book-q'; e.textContent = para.slice(5); }
    else e.textContent = para;
    text.append(e);
  }
  $('bookSrc').textContent = book.i === 0 ? b.src : '';
  $('bookPage').textContent = `${book.i + 1} / ${book.pages.length}`;
  $('bookPrev').disabled = book.i === 0;
  $('bookNext').disabled = book.i === book.pages.length - 1;
  $('bookSheet').scrollTop = 0;
}
/** turn a page slowly: the sheet lifts away, the next settles in */
function turnPage(dir) {
  const to = book.i + dir;
  if (!book.id || to < 0 || to >= book.pages.length || performance.now() < book.turning) return;
  book.turning = performance.now() + 640;
  const sheet = $('bookSheet');
  sheet.classList.remove('turn-in-next', 'turn-in-prev');
  sheet.dataset.dir = dir > 0 ? 'next' : 'prev';
  sheet.classList.add('turn-out');
  audio.page();
  setTimeout(() => {
    book.i = to;
    renderPage();
    savePage(book.id, book.i);
    sheet.classList.remove('turn-out');
    void sheet.offsetWidth;
    sheet.classList.add(dir > 0 ? 'turn-in-next' : 'turn-in-prev');
  }, 300);
}
/** paper grain drawn once on a canvas: fine speckle, a few long fibres, faint foxing */
let paperDone = false;
function paintPaper() {
  if (paperDone) return;
  paperDone = true;
  try {
    const n = 256, cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const g = cv.getContext('2d'), img = g.createImageData(n, n), r = makeRng(1854);
    for (let i = 0; i < n * n; i++) {
      const v = (r() - 0.5) * 22;
      img.data[i * 4] = 120 + v; img.data[i * 4 + 1] = 96 + v; img.data[i * 4 + 2] = 60 + v;
      img.data[i * 4 + 3] = 10 + r() * 16;
    }
    g.putImageData(img, 0, 0);
    g.lineCap = 'round';
    for (let i = 0; i < 70; i++) {                       // fibres, wrapped so the tile repeats
      const x = r() * n, y = r() * n, a = r() * Math.PI, l = 6 + r() * 22;
      g.strokeStyle = `rgba(${r() < 0.5 ? '120,90,50' : '255,250,235'},${0.06 + r() * 0.08})`;
      g.lineWidth = 0.5 + r() * 0.7;
      for (const [dx, dy] of [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n]]) {
        g.beginPath(); g.moveTo(x + dx, y + dy);
        g.quadraticCurveTo(x + dx + Math.cos(a + 0.4) * l * 0.5, y + dy + Math.sin(a + 0.4) * l * 0.5, x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l);
        g.stroke();
      }
    }
    for (let i = 0; i < 5; i++) {                        // foxing: soft brown spots of old paper
      const x = r() * n, y = r() * n, rad = 3 + r() * 9;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(150,100,50,0.07)'); gr.addColorStop(1, 'rgba(150,100,50,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    $('bookSheet').style.setProperty('--paper', `url(${cv.toDataURL()})`);
  } catch (e) { /* plain ivory then */ }
}
function openBook(open) {
  if (open === book.open) return;
  paintPaper();
  book.open = open;
  bookEl.classList.toggle('hidden', !open);
  document.body.classList.toggle('reading', open);
  if (!open) { book.id = ''; return; }
  setStroll(false);
  goSpot(SPOTS.findIndex((sp) => sp.id === 'bench'));
  showShelf();
  story.mark('bench');
  story.note(`b:${clock.seasonIndex}`);
}
$('bookPrev').addEventListener('click', () => turnPage(-1));
$('bookNext').addEventListener('click', () => turnPage(1));
$('bookShelf').addEventListener('click', showShelf);
$('bookClose').addEventListener('click', () => openBook(false));
// a swipe across the page turns it (phones)
{
  let x0 = null;
  $('bookSheet').addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  $('bookSheet').addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) turnPage(e.clientX < x0 ? 1 : -1); x0 = null; });
}
const actBtn = $('actBtn');
let actKind = '';
function updateActions() {
  // what you can do right where you stand
  let kind = '';
  if (mode === 'view' && started && !rest.on && !indoor.leaving) {
    const x = camBase.x, z = camBase.z;
    const dog = corgi.distanceTo(x, z) < 2.0 && corgi.state !== 'happy';
    if (indoor.on) kind = Math.hypot(x - room.entry.x, z - room.entry.z) > 1.3 && dog ? 'pet' : 'leave';
    else if (Math.hypot(x - PORCH.x, z - PORCH.z) < 3.6) kind = 'rest';
    else if (nearBench(x, z, 2.2) && !book.open) kind = 'read';
    else if (dog && !book.open) kind = 'pet';
  }
  if (book.open && (walker.on || mode !== 'view')) openBook(false);           // standing up closes the book
  if (kind !== actKind) {
    actKind = kind;
    actBtn.classList.toggle('hidden', !kind);
    if (kind === 'rest') actBtn.textContent = 'Vào nhà nghỉ · E';
    if (kind === 'read') actBtn.textContent = 'Ngồi đọc sách · E';
    if (kind === 'pet') actBtn.textContent = 'Vuốt ve corgi · E';
    if (kind === 'leave') actBtn.textContent = 'Rời nhà · E';
  }
}
function doAction() {
  if (actKind === 'rest') restInCabin();
  else if (actKind === 'read') openBook(true);
  else if (actKind === 'pet') petCorgi();
  else if (actKind === 'leave') leaveCabin();
}
actBtn.addEventListener('click', doAction);

// Pages are turned by what you actually do. Checked a few times a second, never per frame.
const storyAcc = { walked: 0, bloom: 0, lie: 0, bench: 0, gaze: new Map(), flower: '', flowerT: 0 };
const FLOWER_TINT = { daffodil: '#f5c518', poppy: '#e2321c', cosmos: '#e86aa6', mum: '#f0a818', snowdrop: '#eef2ec', muscari: '#3a46c8', heather: '#d84c8e', tulip: '#e8433a', rose: '#e0527a', sunflower: '#f2b21c', lavender: '#8e6fd8', daisy: '#f4f1e4', cherry: '#f6bfd0', camellia: '#c81e34' };
function flowerHere(x, z) {
  // what is in bloom where you stand depends on the season (only a settled season counts)
  const si = clock.seasonIndex;
  if (clock.weights[si] < 0.9) return '';
  const gx = x - GARDEN.x, gz = z - GARDEN.z;
  if (si === 0) for (const [tx, tz] of GARDEN_TREES) if (Math.hypot(x - tx, z - tz) < 3.4 && view.pitch > 12) return 'cherry';
  if (si === 1 && gx > 4 && gx < 19 && gz > -16 && gz < -4) return 'sunflower';
  if (si === 1 && gx > 2.5 && gx < 17.5 && gz > 4.6 && gz < 15.6) return 'lavender';
  const walk = walkFlowerAt(si, x, z);
  if (walk) return walk;
  const r = Math.hypot(gx, gz);
  if (r > 3.2 && r < 7.2) return si === 3 ? 'camellia' : 'rose';
  if (z < 3 && z > -52 && Math.abs(x) < 9 + (8 - z) * 1.55 && !(x > 10.5 && z > -7)) return bedFlowerAt(si, x, z);
  return '';
}
const _cen = new THREE.Vector3();
function updateStory(step) {
  if (mode !== 'view' || !started) return;
  const dayNow = uDay.value > 0.6, nightNow = uDay.value < 0.15;
  const x = camBase.x, z = camBase.z;
  if (storyAcc.walked > 30) story.mark('walk');
  if (trek.found.has('tulips')) story.mark('tulips');
  if (trek.found.has('garden')) story.mark('garden');
  if (trek.found.has('east') || trek.found.has('south')) story.mark('hill');
  if (inStream(x, z)) story.mark('stream');
  // close study of a flower: the view ray ends within arm's reach, among the beds, by daylight
  const inBeds = (z < 3 && z > -52 && Math.abs(x) < 9 + (8 - z) * 1.55) || (Math.abs(x - GARDEN.x) < GARDEN.hx && Math.abs(z - GARDEN.z) < GARDEN.hz);
  storyAcc.bloom = dayNow && inBeds && focusHit < 1.6 && view.pitch < -15 ? storyAcc.bloom + step : 0;
  if (storyAcc.bloom > 1.6) story.mark('bloom');
  // the flower book: linger among a kind of flower (standing, or pausing on a stroll) by day
  {
    const kind = dayNow && !indoor.on && (walker.speed < 0.2 || stroll.pause > 0) ? flowerHere(x, z) : '';
    storyAcc.flowerT = kind && kind === storyAcc.flower ? storyAcc.flowerT + step : 0;
    storyAcc.flower = kind;
    if (kind && storyAcc.flowerT > 2.0) {
      const f = story.pick(kind);
      if (f) {
        audio.node(story.satchel.size + 4);
        toast(`Hái một cành ${f.name.toLowerCase()} bỏ vào túi (${story.satchel.size} cành). Mang về lều để ép vào Sổ hoa`);
        renderStory(false);
      }
    }
  }
  // the tent: what you carry is pressed there; the woodpile beside it fills your arms
  if (story.satchel.size && Math.hypot(x - CAMP.tent.x, z - CAMP.tent.z) < 3.9) pressAtTent();
  if (fire.wood < WOOD_MAX && Math.hypot(x - WOODPILE.x, z - WOODPILE.z) < 2.4) {
    fire.wood = WOOD_MAX;
    toast(`Ôm một bó củi (${WOOD_MAX} thanh). Space hoặc bấm vào lửa để thêm củi`);
  }
  storyAcc.bench = Math.hypot(x - (GARDEN.x - 1.9), z - (GARDEN.z + 2.0)) < 2.6 && walker.speed < 0.2 ? storyAcc.bench + step : 0;
  if (storyAcc.bench > 2.5) story.mark('bench');
  if (nightNow && clock.phase.id === 'night') story.mark('night');
  if (nightNow && !lanternOn) story.mark('lamp');
  storyAcc.lie = nightNow && view.pitch > 42 ? storyAcc.lie + step : 0;
  if (storyAcc.lie > 5) story.mark('lie');
  if (nightNow && meteor.active && meteor.head.dot(_fwd) > 0.86) story.mark('meteor');
  // picking out a constellation: hold its middle near the centre of the view
  if (nightNow) {
    for (const c of game.cons) {
      _cen.set(0, 0, 0);
      for (const d of c.dirs) _cen.add(d);
      const on = _cen.normalize().dot(_fwd) > 0.988;            // within about 9 degrees
      const t = on ? (storyAcc.gaze.get(c.def.id) || 0) + step : 0;
      storyAcc.gaze.set(c.def.id, t);
      if (t > 2.2 && story.spot(c.def.id)) {
        audio.node(story.seen.size + 2);
        if (!story.mark('star')) toast(`Bạn vừa nhận ra chòm ${c.def.name} (${story.seen.size}/${game.cons.length}). Chuyện của nó có trong Sổ tay.`);
        checkThreads();
        renderStory(false);
      }
    }
  }
}

function renderHud(s) {
  if (s.score !== lastScore) {
    ui.score.textContent = s.score.toLocaleString('vi-VN');
    if (lastScore >= 0) {
      ui.score.classList.remove('bump');
      void ui.score.offsetWidth;
      ui.score.classList.add('bump');
    }
    lastScore = s.score;
  }
  ui.best.textContent = s.best.toLocaleString('vi-VN');
  ui.combo.textContent = s.combo;
  ui.mult.textContent = `×${s.multiplier.toFixed(1)}`;
  if (ui.pips.children.length !== s.maxCharge) {
    ui.pips.innerHTML = '';
    for (let i = 0; i < s.maxCharge; i++) {
      const p = document.createElement('span');
      p.className = 'pip';
      ui.pips.appendChild(p);
    }
  }
  [...ui.pips.children].forEach((p, i) => p.classList.toggle('on', i < s.charge));
  ui.conName.textContent = s.name;
  ui.conLatin.textContent = s.latin;
  if (ui.conDots.children.length !== s.total) {
    ui.conDots.innerHTML = '';
    for (let i = 0; i < s.total; i++) {
      const d = document.createElement('span');
      d.className = 'dot';
      ui.conDots.appendChild(d);
    }
  }
  [...ui.conDots.children].forEach((d, i) => d.classList.toggle('on', i < s.lit));
  if (s.done) ui.hint.textContent = 'Chòm sao đã hoàn thành. Ngả lưng ngắm cực quang đổi sắc một lát…';
  else if (s.charge === 0) ui.hint.textContent = 'Lướt đom đóm qua bụi sao đang trôi, hoặc thêm củi để tàn lửa bay lên thành bụi sao.';
  else if (s.lit === 0) ui.hint.textContent = s.stage >= 2 ? `Chạm vào một ngôi sao của ${s.name}. Không còn nét mờ chỉ hình: hãy nhớ dáng chòm sao (Sổ tay có cách tìm).` : `Chạm vào một ngôi sao của ${s.name} để bắt đầu dệt.`;
  else ui.hint.textContent = s.beckon ? `Đi tiếp sang ngôi sao ánh vàng liền kề để giữ mạch dệt hoàn hảo (${s.lit}/${s.total}).` : `Đi tiếp sang một ngôi sao nối với sao đã sáng: không còn ánh vàng dẫn đường (${s.lit}/${s.total}).`;
}
game.onChange = renderHud;
game.onToast = toast;
game.onComplete = (c, first) => {
  meteor.wait = Math.min(meteor.wait, 1.2);
  story.mark('weave');
  if (story.note(`w:${c.def.id}`)) {
    syncKeepsakes();
    setTimeout(() => toast(`Một ngôi sao mới sẽ sáng mãi trên trời trại, ngay phía trên chòm ${c.def.name}. Sổ tay vừa mở thêm một chuyện chỉ người dệt mới biết`), 4200);
  }
  checkThreads();
  // every finished constellation turns the sky a new colour
  mood.index = (mood.index + 1) % 4;
  mood.timer = 0;
  syncMoodChips();
};
game.onWish = () => {
  meteor.caught = true;
  skyMat.uniforms.uMetColor.value.set(1.0, 0.85, 0.5);
};

function updateStatus() {
  let html = '';
  if (game.storm > 0) html += `Bão cực quang ${Math.ceil(game.storm)}s · điểm ×2 `;
  if (game.freeze > 0) html += `<span class="ice">Giữ chuỗi ${Math.ceil(game.freeze)}s</span> `;
  if (game.dawn > 0 && game.current.lit.some(Boolean) && !game.current.done) html += `Rạng đông sau ${Math.ceil(game.dawn)}s `;
  if (Number.isFinite(game.rules.slips) && game.slips > 0 && !game.current.done) html += `· nét lạc ${game.slips}/${game.rules.slips}`;
  if (html !== lastStatus) { lastStatus = html; ui.status.innerHTML = html; }
}

/* moods */
function syncMoodChips() {
  [...ui.moods.children].forEach((c) => {
    const id = c.dataset.mood;
    c.setAttribute('aria-pressed', String(id === 'auto' ? mood.auto : !mood.auto && MOODS[mood.index].id === id));
  });
}
function setMood(i) { mood.index = i; mood.auto = false; mood.timer = 0; syncMoodChips(); }
{
  const mk = (id, label, css) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.mood = id;
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = css;
    b.append(sw, label);
    ui.moods.appendChild(b);
    return b;
  };
  mk('auto', 'Tự đổi', 'conic-gradient(#5ef0ae, #ff7fb6, #7fc8ff, #ffb36b, #5ef0ae)')
    .addEventListener('click', () => { mood.auto = true; mood.timer = 0; syncMoodChips(); });
  const rgb = (c) => `rgb(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(',')})`;
  MOODS.forEach((m, i) => {
    mk(m.id, m.name, `linear-gradient(180deg, ${rgb(m.high)}, ${rgb(m.mid)} 50%, ${rgb(m.low)})`)
      .addEventListener('click', () => setMood(i));
  });
  syncMoodChips();
}
ui.timelapse.addEventListener('input', () => {
  const v = Number(ui.timelapse.value);
  ui.timelapse.style.setProperty('--fill', `${v}%`);
  timelapse = v / 100;
});

/* modes */
function setTour(on) {
  if (tour.on === on) return;
  if (on) setStroll(false);
  tour.on = on;
  tour.t = 0;
  $('tourBtn').setAttribute('aria-pressed', String(on));
  if (on) { goSpot(0, false); view.yaw = wrapYaw(view.yaw); tour.i = 1; tourGo(tour.i); }
}
function syncGameMode() {
  game.setMode(mode === 'play' ? 'play' : mode === 'view' && showCons ? 'show' : 'off');
}
function setMode(next) {
  mode = next;
  document.body.classList.toggle('play', next === 'play');
  document.body.classList.toggle('view', next === 'view');
  $('segPlay').setAttribute('aria-pressed', String(next === 'play'));
  $('segView').setAttribute('aria-pressed', String(next === 'view'));
  if (next === 'play') { setTour(false); goSpot(0); view.yaw = wrapYaw(view.yaw); setDay(false, true); mood.auto = false; syncMoodChips(); }
  syncGameMode();
}
function setZen(on) {
  zen = on;
  document.body.classList.toggle('zen', on);
  if (on) {
    lastMove = performance.now();
    if (mode === 'view') setTour(true);
  }
}
function start(next, hide) {
  if (started) return;
  started = true;
  audio.init();
  $('intro').classList.add('leaving');
  $('hud').classList.remove('hidden');
  setMode(next);
  if (hide) setZen(true);
  else if (next === 'view') toast(coarse ? 'Cần điều khiển bên trái để đi bộ · kéo để nhìn quanh' : 'W A S D để đi bộ · Shift để chạy · kéo để nhìn quanh');
}

$('btnPlay').addEventListener('click', () => start('play'));
$('btnView').addEventListener('click', () => start('view'));
$('segPlay').addEventListener('click', () => setMode('play'));
$('segView').addEventListener('click', () => setMode('view'));
$('hideBtn').addEventListener('click', () => setZen(true));
$('zenExit').addEventListener('click', () => setZen(false));
$('tourBtn').addEventListener('click', () => setTour(!tour.on));
$('conBtn').addEventListener('click', () => {
  showCons = !showCons;
  $('conBtn').setAttribute('aria-pressed', String(showCons));
  syncGameMode();
  toast(showCons ? (clock.phase.id !== 'night' ? 'Chòm sao sẽ hiện khi đêm xuống' : 'Đang hiện 7 chòm sao — bấm vào tên để đọc về từng chòm') : 'Đã ẩn các chòm sao');
});
$('photoBtn').addEventListener('click', () => { wantPhoto = true; });

/* the control tray folds away so it never hides the view */
$('dockToggle').addEventListener('click', () => {
  const min = document.body.classList.toggle('dock-min');
  $('dockToggle').textContent = 'Thu gọn';
  $('dockToggle').setAttribute('aria-expanded', String(!min));
});
$('dockToggle').click();                         // start with the quick bar only
$('qMore').addEventListener('click', () => $('dockToggle').click());
$('qPhoto').addEventListener('click', () => { wantPhoto = true; });
$('qStroll').addEventListener('click', () => setStroll(!stroll.on));
$('qJournal').addEventListener('click', () => openJournal(true));
$('qTime').addEventListener('click', cyclePhase);

/* picture quality: automatic by default, or pinned by the visitor */
[['auto', 'Tự động'], ['low', 'Thấp'], ['medium', 'Vừa'], ['high', 'Cao']].forEach(([id, label]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = id === 'auto' ? `${label} (${{ low: 'thấp', medium: 'vừa', high: 'cao' }[tier]})` : label;
  b.setAttribute('aria-pressed', String(qualityChoice === id));
  b.addEventListener('click', () => {
    store.set('settings.quality', id);
    store.flush();
    const url = new URL(location.href);
    url.searchParams.delete('q');
    location.replace(url);
  });
  $('qualityChips').appendChild(b);
});

/* time of day and season */
const timeSlider = $('timeSlider');
let clockShown = '';
function syncClockUi() {
  document.body.classList.toggle('day', clock.phase.id !== 'night');
  [...$('seasonChips').children].forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.season === clock.season.id)));
  $('autoDay').setAttribute('aria-pressed', String(clock.auto));
  $('autoDay').textContent = clock.auto ? 'Thời gian đang trôi' : 'Thời gian đứng yên';
  clockShown = '';
  syncClockFace();
}
/** the clock face in the quick bar and the slider in the dock; called every frame, writes only when the minute changes */
function syncClockFace() {
  const text = `${clockText(clock.hour)} · ${clock.part.name}`;
  if (text === clockShown) return;
  clockShown = text;
  $('qTime').textContent = text;
  $('timeLabel').textContent = `${text} · ${clock.season.name}`;
  if (document.activeElement !== timeSlider) timeSlider.value = clock.hour.toFixed(2);
}
clock.onPart = (part, byItself) => { syncClockUi(); if (started && !clock.quiet && clock.target === null) toast(`${part.name} — ${part.line}`); };
clock.onSeason = (se) => {
  syncClockUi();
  store.set('settings.season', se.id);
  if (started && !clock.quiet) toast(`${se.name} — ${se.line}`);
};
function setPhase(id) { clock.setPhase(id); }
/** kept for the places that only know day from night */
function setDay(on) { setPhase(on ? 'day' : 'night'); }
function cyclePhase() { clock.nextPhase(); toast(`Tua tới ${PHASES.find((p) => p.hour === clock.target).name.toLowerCase()}`); }
for (const se of SEASONS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.dataset.season = se.id;
  b.textContent = se.name;
  b.title = se.line;
  b.addEventListener('click', () => clock.setSeason(se.id));
  $('seasonChips').appendChild(b);
}
timeSlider.addEventListener('input', () => { clock.setHour(parseFloat(timeSlider.value)); syncClockFace(); });
$('autoDay').addEventListener('click', () => {
  clock.auto = !clock.auto;
  store.set('settings.flow', clock.auto);
  syncClockUi();
  toast(clock.auto ? 'Thời gian trôi: một ngày đêm dài mười sáu phút, mỗi bình minh là một mùa mới' : 'Thời gian đứng yên ở lúc bạn chọn');
});
syncClockUi();

/* the copy in the cloud (cloud.js) and the opt-in performance line */
cloud.onStatus(({ state, text }) => {
  const el = $('cloudStatus');
  el.textContent = state === 'off' ? 'Tiến độ lưu trên máy này' : text;
  el.dataset.state = state;
  el.classList.toggle('act', state === 'newer');
  el.title = state === 'newer' ? 'Bấm để tải lại trang' : '';
});
$('cloudStatus').addEventListener('click', () => { if ($('cloudStatus').dataset.state === 'newer') location.reload(); });
function syncTelemetryUi() {
  const on = store.get('settings.telemetry', false);
  $('telemetryBtn').setAttribute('aria-pressed', String(on));
}
$('telemetryBtn').addEventListener('click', () => {
  const on = !store.get('settings.telemetry', false);
  store.set('settings.telemetry', on);
  syncTelemetryUi();
  toast(on ? 'Cảm ơn bạn. Sau một phút chơi, một dòng ẩn danh về hiệu năng máy sẽ được gửi (một lần mỗi lượt vào)' : 'Đã tắt: không gửi gì về hiệu năng máy');
});
syncTelemetryUi();
cloud.start();

/* seats */
SPOTS.forEach((sp, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = sp.name;
  b.setAttribute('aria-pressed', String(i === 0));
  b.addEventListener('click', () => { setTour(false); goSpot(i); });
  $('spots').appendChild(b);
});

/* tent lantern */
$('lampBtn').addEventListener('click', () => {
  lanternOn = !lanternOn;
  $('lampBtn').setAttribute('aria-pressed', String(lanternOn));
  toast(lanternOn ? 'Đèn lều đã bật' : 'Đèn lều đã tắt — trời sao rõ hơn');
});

/* constellation name labels (only with the overlay on) */
const labelBox = $('labels');
const labels = CONSTELLATIONS.map((c) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sky-label';
  b.textContent = c.name;
  b.title = `Đọc về ${c.name} (${c.latin})`;
  b.addEventListener('click', () => openJournal(true, c.id));
  labelBox.appendChild(b);
  return b;
});
const _lab = new THREE.Vector3();
function updateLabels() {
  const on = game.mode === 'show' && !zen && uDay.value < 0.5 && journal.classList.contains('hidden');
  labelBox.classList.toggle('hidden', !on);
  if (!on) return;
  game.cons.forEach((c, i) => {
    _lab.set(0, 0, 0);
    let low = 1;
    for (const d of c.dirs) { _lab.add(d); low = Math.min(low, d.y); }
    _lab.normalize();
    _lab.y = low - 0.035;
    _lab.normalize().multiplyScalar(400).add(camera.position).project(camera);
    const vis = _lab.z < 1 && Math.abs(_lab.x) < 0.95 && Math.abs(_lab.y) < 0.92;
    labels[i].style.display = vis ? '' : 'none';
    if (vis) {
      labels[i].style.transform = `translate(${((_lab.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-_lab.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%, 0)`;
    }
  });
}

/* walking together (opt-in, peer to peer) */
const party = new Party();
const partyBox = $('party');
const friends = new Map();          // id -> { group, label, x, z, yaw }
function friendColor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;          // similar ids must not get similar colours
  return new THREE.Color().setHSL((h % 360) / 360, 0.75, 0.6);
}
// A walking companion: a small hiker in a jacket of their own colour, pack on the back,
// lantern in one hand. Limbs hang from pivots at hip and shoulder so they can swing.
const FRIEND_GEO = {
  leg: new THREE.CapsuleGeometry(0.07, 0.52, 3, 8),
  arm: new THREE.CapsuleGeometry(0.052, 0.40, 3, 8),
  torso: new THREE.CapsuleGeometry(0.175, 0.36, 4, 12),
  head: new THREE.SphereGeometry(0.125, 14, 12),
  hat: new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  bobble: new THREE.SphereGeometry(0.04, 8, 6),
  scarf: new THREE.TorusGeometry(0.135, 0.05, 6, 14),
  pack: new THREE.CapsuleGeometry(0.105, 0.20, 3, 10),
  boot: new THREE.BoxGeometry(0.11, 0.09, 0.22),
  lamp: new THREE.SphereGeometry(0.055, 10, 8),
};
const FRIEND_MAT = {
  trousers: new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.95 }),
  boots: new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.9 }),
  face: new THREE.MeshStandardMaterial({ color: 0x9a8576, roughness: 0.85 }),
  pack: new THREE.MeshStandardMaterial({ color: 0x33342b, roughness: 1 }),
};
function makeFriend(c) {
  const group = new THREE.Group();
  const hsl = c.getHSL({});
  const jacket = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hsl.h, 0.42, 0.26), roughness: 0.9 });
  const wool = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, emissive: c, emissiveIntensity: 0.30 });
  const body = new THREE.Group();                 // everything above the hips; leans and bobs
  group.add(body);
  const add = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const limb = (parent, geo, mat, x, y, len) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    add(pivot, geo, mat, 0, -len / 2, 0);
    parent.add(pivot);
    return pivot;
  };
  const legL = limb(group, FRIEND_GEO.leg, FRIEND_MAT.trousers, -0.095, 0.74, 0.66);
  const legR = limb(group, FRIEND_GEO.leg, FRIEND_MAT.trousers, 0.095, 0.74, 0.66);
  for (const leg of [legL, legR]) add(leg, FRIEND_GEO.boot, FRIEND_MAT.boots, 0, -0.70, -0.04);
  add(body, FRIEND_GEO.torso, jacket, 0, 1.06, 0);
  add(body, FRIEND_GEO.head, FRIEND_MAT.face, 0, 1.53, 0);
  add(body, FRIEND_GEO.hat, wool, 0, 1.56, 0);
  add(body, FRIEND_GEO.bobble, wool, 0, 1.71, 0);
  add(body, FRIEND_GEO.scarf, wool, 0, 1.36, 0).rotation.x = Math.PI / 2;
  add(body, FRIEND_GEO.pack, FRIEND_MAT.pack, 0, 1.10, 0.21).scale.set(1.25, 1, 0.8);
  const armL = limb(body, FRIEND_GEO.arm, jacket, -0.235, 1.30, 0.50);
  const armR = limb(body, FRIEND_GEO.arm, jacket, 0.235, 1.30, 0.50);
  // the lantern hangs from the right hand
  add(armR, FRIEND_GEO.lamp, new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2 * c.r + 0.8, 3.2 * c.g + 0.8, 3.2 * c.b + 0.8) }), 0, -0.62, -0.02);
  return { group, body, legL, legR, armL, armR };
}
function syncFriends() {
  for (const [id, f] of friends) {
    if (!party.others.has(id)) {
      scene.remove(f.group); f.label.remove(); friends.delete(id);
      if (movers) movers.roots = movers.roots.filter((r) => r !== f.group);
    }
  }
  for (const [id, o] of party.others) {
    if (friends.has(id)) continue;
    const f = makeFriend(friendColor(id));
    scene.add(f.group);
    if (movers) movers.roots.push(f.group);            // a real shadow on the ground in the sun
    f.group.traverse((o) => { if (o.isMesh) o.receiveShadow = Q.shadow > 0; });
    const label = document.createElement('div');
    label.className = 'friend-label';
    labelBox.parentNode.insertBefore(label, labelBox);
    friends.set(id, { ...f, label, x: o.x, z: o.z, yaw: o.yaw, speed: 0, stride: 0, wave: 0 });
  }
  $('qFriends').textContent = party.active ? `Bạn đường · ${party.count}` : 'Đi cùng bạn';
  $('partyWho').textContent = party.active
    ? (party.count ? `Đang đi cùng: ${[...party.others.values()].map((o) => o.name).join(', ')}` : 'Chưa có ai vào. Gửi mã phòng cho bạn của bạn.')
    : '';
}
party.onChange = syncFriends;
party.onStatus = (t) => { $('partyStatus').textContent = t; };
party.onEvent = (kind, who) => {
  if (kind === 'stoke') stoke(true);
  else if (kind === 'wave' && who) {
    toast(`${who.name} vẫy tay chào bạn`);
    for (const [id, f] of friends) if (party.others.get(id) === who) f.wave = 2.4;
  }
  else if (kind === 'world') {
    if ((clock.phase.id !== 'night') !== who.day) setDay(who.day, true);
    if (mood.index !== who.mood) { mood.index = who.mood; mood.auto = false; syncMoodChips(); }
  }
};
let netAcc = 0, worldAcc = 0;
const _fp = new THREE.Vector3();
// ?ghost=N puts N make-believe companions on the hill, with no network at all: a way to
// look at the figures and their labels without opening a room.
const ghosts = clamp(Math.floor(Number(query.get('ghost')) || 0), 0, 7);
function updateGhosts() {
  const now = performance.now();
  for (let i = 0; i < ghosts; i++) {
    const id = `ghost-${i}`;
    let o = party.others.get(id);
    if (!o) { o = { name: ['Mai', 'Linh', 'An', 'Vy', 'Khang', 'Thu', 'Nam'][i], x: 0, z: 0, yaw: 0, t: now }; party.others.set(id, o); syncFriends(); }
    // the first one stands still by the fire; the others stroll round a small loop
    const a = i === 0 ? 0.6 : time * 0.42 / (1 + i * 0.3) + i * 2.1, r = i === 0 ? 0 : 1.6 + i * 0.5;
    o.x = 1.2 + i * 1.5 + Math.cos(a) * r;
    o.z = 1.5 - i * 1.2 + Math.sin(a) * r;
    o.yaw = i === 0 ? 150 : Math.atan2(-Math.sin(a), -Math.cos(a)) / DEG;
    o.t = now;
    const f = friends.get(id);
    if (f && i === 0 && f.wave <= 0 && Math.floor(time) % 7 === 0) f.wave = 2.4;
  }
}
function updateParty(dt) {
  if (ghosts) updateGhosts();
  if (!party.active && !ghosts) return;
  netAcc += dt; worldAcc += dt;
  if (netAcc > 0.1) { netAcc = 0; party.sendState(camBase.x, camBase.z, view.yaw); }
  if (worldAcc > 2) { worldAcc = 0; party.sendWorld(clock.phase.id !== 'night', mood.index); party.prune(); }
  const k = 1 - Math.exp(-dt * 8);
  for (const [id, f] of friends) {
    const o = party.others.get(id);
    if (!o) continue;
    const px = f.x, pz = f.z;
    f.x += (o.x - f.x) * k; f.z += (o.z - f.z) * k;
    f.yaw += wrapYaw(o.yaw - f.yaw) * k;
    const y = terrainH(f.x, f.z);
    f.group.position.set(f.x, y, f.z);
    f.group.rotation.y = -f.yaw * DEG;
    // gait: the faster they cover ground, the longer and quicker the stride
    const v = Math.hypot(f.x - px, f.z - pz) / Math.max(dt, 1e-3);
    f.speed += (Math.min(v, 7) - f.speed) * (1 - Math.exp(-dt * 6));
    f.stride += f.speed * dt * 3.0;
    const amp = Math.min(1, f.speed / 3.2), sw = Math.sin(f.stride) * 0.50 * amp;
    f.legL.rotation.x = sw; f.legR.rotation.x = -sw;
    f.armL.rotation.x = -sw * 0.8; f.armR.rotation.x = sw * 0.35;         // the lantern arm is held steadier
    f.body.position.y = Math.abs(Math.cos(f.stride)) * 0.035 * amp + Math.sin(time * 1.4 + f.x) * 0.006;
    f.body.rotation.x = -0.06 * amp;
    f.armL.rotation.z = 0;
    if (f.wave > 0) {
      f.wave -= dt;
      const up = Math.min(1, (2.4 - f.wave) * 4) * Math.min(1, f.wave * 3);
      f.armL.rotation.x *= 1 - up;
      f.armL.rotation.z = -(2.55 + Math.sin(time * 11) * 0.32) * up;
    }
    _fp.set(f.x, y + 1.84, f.z).project(camera);
    const vis = _fp.z < 1 && Math.abs(_fp.x) < 1 && Math.abs(_fp.y) < 1 && !zen;
    f.label.style.display = vis ? '' : 'none';
    if (vis) {
      if (f.label.textContent !== o.name) f.label.textContent = o.name;
      f.label.style.transform = `translate(${((_fp.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-_fp.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
}
function openParty(open) { partyBox.classList.toggle('hidden', !open); }
function partyUi() {
  const on = party.active;
  $('partyJoinRow').classList.toggle('hidden', on);
  $('partyLive').classList.toggle('hidden', !on);
  $('partyCodeShow').textContent = party.code;
  syncFriends();
}
async function partyDo(fn) {
  try {
    store.set('settings.name', cleanName($('partyName').value));
    await fn();
  } catch (err) {
    party.leave();
    const kind = err && (err.type || err.message);
    $('partyStatus').textContent = kind === 'peer-unavailable' || kind === 'timeout'
      ? 'Không tìm thấy phòng đó. Kiểm tra lại mã, hoặc nhờ bạn mở phòng mới.'
      : kind === 'code' ? 'Mã phòng gồm 6 ký tự.'
      : 'Không kết nối được. Mạng của bạn có thể đang chặn kết nối trực tiếp.';
  }
  partyUi();
}
$('partyName').value = store.get('settings.name', '');
$('qFriends').addEventListener('click', () => openParty(true));
$('partyClose').addEventListener('click', () => openParty(false));
partyBox.addEventListener('click', (e) => { if (e.target === partyBox) openParty(false); });
$('partyHost').addEventListener('click', () => partyDo(() => party.host($('partyName').value)));
$('partyJoin').addEventListener('click', () => partyDo(() => party.join($('partyCode').value, $('partyName').value)));
$('partyCode').addEventListener('input', () => { $('partyCode').value = cleanCode($('partyCode').value); });
$('partyLeave').addEventListener('click', () => { party.leave(); $('partyStatus').textContent = 'Đã rời phòng.'; partyUi(); });
$('partyCopy').addEventListener('click', () => {
  if (navigator.clipboard) navigator.clipboard.writeText(party.code).then(() => toast('Đã chép mã phòng'), () => {});
});
$('partyWave').addEventListener('click', () => { party.sendEvent('wave'); toast('Bạn vẫy tay chào mọi người'); });
addEventListener('pagehide', () => party.leave());

/* compass and trail guide */
const PPD = 2.2;                                  // pixels per degree on the compass strip
const compassStrip = $('compassStrip');
{
  const names = ['B', 'ĐB', 'Đ', 'ĐN', 'N', 'TN', 'T', 'TB'];
  for (let deg = -360; deg <= 720; deg += 15) {
    const m = ((deg % 360) + 360) % 360;
    const el = document.createElement('span');
    el.style.left = `${(deg + 360) * PPD}px`;
    if (m % 45 === 0) { el.textContent = names[m / 45]; el.className = m % 90 === 0 ? 'card' : 'inter'; }
    else el.className = 'tick';
    compassStrip.appendChild(el);
  }
}
const guideArrow = $('guideArrow'), guideText = $('guideText');
let lastGuide = '';
function updateCompass() {
  const heading = ((view.yaw % 360) + 360) % 360;
  compassStrip.style.transform = `translateX(${(-(heading + 360) * PPD).toFixed(1)}px)`;
  if (frames % 8) return;
  let best = null, bd = 1e9;
  for (const p of PLACES) {
    const d = Math.hypot(p.x - camBase.x, p.z - camBase.z);
    if (mode === 'view' && d < p.r && !trek.found.has(p.id)) {
      trek.found.add(p.id);
      saveTrek();
      audio.node(trek.found.size);
      toast(`Đã tới ${p.name} — ${p.note}`);
    }
    if (!trek.found.has(p.id) && d < bd) { bd = d; best = p; }
  }
  if (trek.dist - trek.saveAt > 60) { trek.saveAt = trek.dist; saveTrek(); }
  let text = 'Bạn đã tới mọi điểm trên bản đồ';
  // by night the guide points at the sky instead: the constellation worth finding tonight
  const cid = uDay.value < 0.15 && mode === 'view' ? starHint() : '';
  if (cid) {
    const c = game.byId(cid);
    _cen.set(0, 0, 0);
    for (const d of c.dirs) _cen.add(d);
    _cen.normalize();
    const bearing = Math.atan2(_cen.x, -_cen.z) / DEG;
    guideArrow.style.transform = `rotate(${wrapYaw(bearing - heading).toFixed(0)}deg)`;
    text = `★ Đêm nay: chòm ${c.def.name} · cao ${Math.round(Math.asin(_cen.y) / DEG)}°`;
  } else if (best) {
    const bearing = Math.atan2(best.x - camBase.x, -(best.z - camBase.z)) / DEG;
    guideArrow.style.transform = `rotate(${wrapYaw(bearing - heading).toFixed(0)}deg)`;
    text = `${best.name} · ${Math.round(bd)} m`;
  }
  guideArrow.style.visibility = best || cid ? 'visible' : 'hidden';
  if (text !== lastGuide) { lastGuide = text; guideText.textContent = text; }
}

/* on-screen walking stick for touch */
{
  const pad = $('stick'), knob = $('stickKnob');
  let id = null;
  const move = (e) => {
    const r = pad.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    stick.x = x; stick.y = y;
    knob.style.transform = `translate(${(x * 28).toFixed(1)}px, ${(y * 28).toFixed(1)}px)`;
  };
  const end = () => { id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerdown', (e) => { id = e.pointerId; pad.setPointerCapture(id); move(e); e.preventDefault(); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
}

/* sound */
function setMuted(m) {
  audio.setMuted(m);
  ui.soundBtn.setAttribute('aria-pressed', String(!m));
  $('icoSoundOn').classList.toggle('hidden', m);
  $('icoSoundOff').classList.toggle('hidden', !m);
}
ui.soundBtn.addEventListener('click', () => { audio.init(); setMuted(!audio.muted); });
function syncVolume() {
  const v = Number(ui.volume.value);
  ui.volume.style.setProperty('--fill', `${v}%`);
  audio.setVolume(v / 100);
  if (v > 0 && audio.muted) setMuted(false);
}
ui.volume.addEventListener('input', syncVolume);
syncVolume();

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
  else (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
}
$('fsBtn').addEventListener('click', toggleFullscreen);

/* journal */
const journal = $('journal');
function openJournal(open, focusId) {
  if (open) {
    const km = trek.dist >= 1000 ? `${(trek.dist / 1000).toFixed(2)} km` : `${Math.round(trek.dist)} m`;
    $('trekSum').textContent = `Đã đi bộ ${km} · đã tới ${trek.found.size}/${PLACES.length} điểm. Cột mốc gỗ có chóp vàng đánh dấu từng nơi; la bàn phía trên chỉ hướng tới điểm gần nhất bạn chưa đến.`;
    const tl = $('trekList');
    tl.innerHTML = '';
    for (const p of PLACES) {
      const li = document.createElement('li');
      const found = trek.found.has(p.id);
      if (found) li.className = 'found';
      const nm = document.createElement('b');
      nm.textContent = (found ? '◆ ' : '◇ ') + p.name;
      const nt = document.createElement('span');
      nt.textContent = found ? p.note : 'Chưa đặt chân tới.';
      li.append(nm, nt);
      tl.appendChild(li);
    }
    $('storySum').textContent = story.finished
      ? 'Bạn đã đi trọn một ngày ở trại. Những dòng dưới đây là những gì còn lại trong sổ.'
      : `${story.total} việc nhỏ từ sáng tới đêm, làm theo thứ tự nào cũng được, bỏ qua cũng không sao. Đã xong ${story.count}/${story.total}.`;
    // the camp diary, newest first
    const cl = $('campLog');
    cl.innerHTML = '';
    $('campSum').textContent = story.log.length
      ? 'Những gì đã xảy ra ở trại, mới nhất ở trên.'
      : 'Còn trống. Nhóm lửa, ép hoa, nghỉ trong nhà gỗ, dệt một chòm sao: mỗi việc sẽ để lại một dòng ở đây.';
    for (const id of [...story.log].reverse()) {
      const [head, body] = logText(id);
      const li = document.createElement('li');
      const sm = document.createElement('small');
      sm.textContent = head;
      li.append(sm, body);
      cl.appendChild(li);
    }
    const sl = $('storyList');
    sl.innerHTML = '';
    const nextCh = story.current;
    for (const ch of CHAPTERS) {
      const li = document.createElement('li');
      const isDone = story.done.has(ch.id);
      if (isDone) li.className = 'done'; else if (ch === nextCh) li.className = 'next';
      const nm = document.createElement('b');
      nm.textContent = ch.title;
      const wh = document.createElement('small');
      wh.textContent = ch.when;
      nm.appendChild(wh);
      const nt = document.createElement('span');
      nt.textContent = isDone ? ch.memo : ch.ask;
      li.append(nm, nt);
      sl.appendChild(li);
    }
    if (story.count > 0) {
      const li = document.createElement('li');
      const again = document.createElement('button');
      again.type = 'button';
      again.className = 'chip';
      again.textContent = 'Bắt đầu lại một ngày mới';
      again.addEventListener('click', () => { story.restart(); storyAcc.walked = 0; renderStory(true); openJournal(true); });
      li.style.cssText = 'padding:9px 12px;border-style:dashed;place-content:center';
      li.appendChild(again);
      sl.appendChild(li);
    }
    $('flowerSum').textContent = `Mỗi mùa có hoa của nó. Khi còn nắng, đứng yên giữa một loài đang nở (hoặc để “Dạo vườn” đưa bạn tới) là hái được một cành; mang về lều thì cành ấy được ép vào sổ. Đổi mùa trong bảng Tuỳ chỉnh. Đã ép ${story.flowers.size}/${FLOWERS.length} loài${story.satchel.size ? `, ${story.satchel.size} cành còn trong túi` : ''}.`;
    const fl = $('flowerList');
    fl.innerHTML = '';
    for (const f of FLOWERS) {
      const li = document.createElement('li');
      const found = story.flowers.has(f.id);
      if (found) { li.className = 'found'; li.style.setProperty('--c', FLOWER_TINT[f.id]); }
      const nm = document.createElement('b');
      nm.textContent = f.name;
      const lt = document.createElement('small');
      lt.textContent = `${f.latin} · ${f.season}`;
      nm.appendChild(lt);
      const nt = document.createElement('span');
      nt.textContent = found ? f.note : story.satchel.has(f.id) ? 'Đang nằm trong túi của bạn. Về lều để ép nó vào sổ, chuyện của nó sẽ hiện ở đây.' : `Chưa gặp. ${f.where}.`;
      li.append(document.createElement('i'), nm, nt);
      // the stories are the reward for having met the flower
      if (found) {
        const det = document.createElement('details');
        det.className = 'tales';
        const sum = document.createElement('summary');
        sum.textContent = 'Chuyện của loài hoa này';
        det.appendChild(sum);
        for (const text of f.tales) { const para = document.createElement('p'); para.textContent = text; det.appendChild(para); }
        const cid = starOfFlower(f.id);
        if (cid) {
          const para = document.createElement('p');
          para.className = 'thread';
          para.textContent = story.seen.has(cid) || game.woven.has(cid)
            ? `Sợi chỉ tới chòm ${consName(cid)}: ${THREADS[cid].text}`
            : `Có một sợi chỉ nối loài hoa này với một chòm sao. Đêm nào trời quang, hãy tìm chòm ${consName(cid)} (la bàn sẽ chỉ hướng), sợi chỉ sẽ hiện ra ở đây.`;
          det.appendChild(para);
        }
        li.appendChild(det);
      }
      fl.appendChild(li);
    }
    const n = game.woven.size;
    $('trekSum').textContent += n ? ` Đã dệt ${n} chòm sao; mỗi chòm để lại một ngôi sao riêng trên trời trại.` : '';
    $('journalSum').textContent =
      'Bảy chòm sao của bầu trời đêm nay: chúng từ đâu mà có tên, ngôi sao nào đáng nhìn, và tìm chúng bằng cách nào. Bấm vào từng chòm để mở. '
      + (n > 0 ? `Bạn đã tự tay dệt ${n}/${CONSTELLATIONS.length} chòm (đánh dấu ✦).` : '');
    const list = $('journalList');
    list.innerHTML = '';
    for (const c of CONSTELLATIONS) {
      const woven = game.woven.has(c.id);
      const L = LORE[c.id];
      const li = document.createElement('li');
      li.id = `lore-${c.id}`;
      if (woven) li.className = 'woven';
      const det = document.createElement('details');
      det.open = c.id === focusId;
      det.addEventListener('toggle', () => { if (det.open) story.mark('lore'); });
      const sum = document.createElement('summary');
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.textContent = woven ? '✦' : '✧';
      const head = document.createElement('span');
      head.className = 'jhead';
      const name = document.createElement('span');
      name.className = 'jname';
      name.textContent = c.name;
      const latin = document.createElement('small');
      latin.textContent = c.latin;
      name.appendChild(latin);
      if (story.seen.has(c.id)) {
        const tag = document.createElement('span');
        tag.className = 'seen-tag';
        tag.textContent = 'đã nhận ra trên trời';
        name.appendChild(tag);
      }
      const season = document.createElement('span');
      season.className = 'jseason';
      season.textContent = L.season;
      head.append(name, season);
      sum.append(mark, head);
      det.appendChild(sum);
      const section = (title, items) => {
        const h = document.createElement('h3');
        h.textContent = title;
        det.appendChild(h);
        for (const text of items) {
          const para = document.createElement('p');
          para.textContent = text;
          det.appendChild(para);
        }
      };
      section('Nguồn gốc và truyền thuyết', L.origin);
      section('Những ngôi sao đáng chú ý', L.stars);
      if (L.tale) section('Chuyện thật dưới chòm sao này', L.tale);
      if (THREADS[c.id]) {
        const fl = THREADS[c.id].flower;
        section('Sợi chỉ dưới mặt đất', [story.flowers.has(fl)
          ? THREADS[c.id].text
          : `Chòm sao này có một sợi chỉ nối với một loài hoa trong thung lũng. Ép được loài ấy vào Sổ hoa thì sợi chỉ sẽ hiện ra. (Gợi ý: ${FLOWERS.find((x) => x.id === fl).season.toLowerCase()}.)`]);
      }
      section('Điều chỉ người dệt mới biết', [woven ? L.deep : 'Dệt trọn chòm này trong “Trò dệt sao” để mở thêm một chuyện.']);
      section('Cách tìm trên trời', [L.find]);
      li.appendChild(det);
      list.appendChild(li);
    }
    $('dataStatus').textContent = store.persistent ? '' : 'Trình duyệt đang chặn lưu trữ (chế độ riêng tư?), nên tiến trình sẽ mất khi đóng trang.';
    if (focusId) requestAnimationFrame(() => { const el = $(`lore-${focusId}`); if (el) el.scrollIntoView({ block: 'start' }); });
  }
  journal.classList.toggle('hidden', !open);
}
$('journalBtn').addEventListener('click', () => openJournal(true));

/* the save file: back it up, bring it back, or start over */
$('dataExport').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([store.export()], { type: 'application/json' }));
  a.download = `aurora-vale-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  $('dataStatus').textContent = 'Đã lưu một file sao lưu. Giữ nó để mang tiến trình sang máy hoặc trình duyệt khác.';
});
$('dataImport').addEventListener('click', () => $('dataFile').click());
$('dataFile').addEventListener('change', async () => {
  const file = $('dataFile').files[0];
  if (!file) return;
  const ok = file.size < 200000 && store.import(await file.text());
  $('dataFile').value = '';
  if (ok) location.reload();
  else $('dataStatus').textContent = 'File này không phải bản sao lưu của Aurora Vale.';
});
{
  let armed = 0;
  $('dataReset').addEventListener('click', () => {
    if (performance.now() - armed < 4000) { store.reset(); location.reload(); return; }
    armed = performance.now();
    $('dataStatus').textContent = 'Bấm “Xoá tiến trình” lần nữa trong 4 giây để xoá hành trình, sổ hoa, các trang đã lật và kỷ lục.';
  });
}
$('journalClose').addEventListener('click', () => openJournal(false));
journal.addEventListener('click', (e) => { if (e.target === journal) openJournal(false); });

addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  const typing = e.target instanceof HTMLInputElement && e.target.type === 'text';
  if (book.open && !typing && ['arrowleft', 'arrowright', 'a', 'd', 'backspace', 'pageup', 'pagedown'].includes(k)) {
    e.preventDefault();                            // reading: the keys turn pages, they do not walk
    if (k === 'backspace') showShelf();
    else if (book.id) turnPage(k === 'arrowleft' || k === 'a' || k === 'pageup' ? -1 : 1);
    return;
  }
  if (started && MOVE_KEYS.has(k) && !typing) {
    keys.add(k);
    if (k.startsWith('arrow')) e.preventDefault();
    return;
  }
  if (e.repeat) return;
  if (!started) {
    if (k === 'enter') start('view');
    return;
  }
  if (typing && k !== 'escape') return;
  if (k === 'escape') {
    if (rest.on || indoor.on) leaveCabin();
    else if (book.open) openBook(false);
    else if (!partyBox.classList.contains('hidden')) openParty(false);
    else if (!journal.classList.contains('hidden')) openJournal(false);
    else if (zen) setZen(false);
  } else if (k === 'm') setMode(mode === 'play' ? 'view' : 'play');
  else if (k === 'h') setZen(!zen);
  else if (k === 'o') setMuted(!audio.muted);
  else if (k === 'f') toggleFullscreen();
  else if (k === 'p') wantPhoto = true;
  else if (k === 'g' && party.active) $('partyWave').click();
  else if (k === 'b') $('dockToggle').click();
  else if (k === 'n') cyclePhase();
  else if (k === 'e') { if (rest.on) leaveCabin(); else if (book.open) openBook(false); else doAction(); }
  else if (k === 'j') openJournal(journal.classList.contains('hidden'));
  else if (k === 't' && mode === 'view') setTour(!tour.on);
  else if (k === 'v' && mode === 'view') setStroll(!stroll.on);
  else if (k === 'c' && mode === 'view') $('conBtn').click();
  else if (k === ' ') { e.preventDefault(); stoke(); }
  else if (k >= '1' && k <= '5') setMood(Number(k) - 1);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.suspend();
  else audio.resume();
});

function savePhoto() {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aurora-vale-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(`Đã lưu ảnh ${canvas.width}×${canvas.height}`);
    if (mode === 'view') story.mark('photo');
  }, 'image/png');
  const f = $('flash');
  f.classList.remove('go');
  void f.offsetWidth;
  f.classList.add('go');
}

// ?debug=1 hands the page's state to the developer tools (tools/check.mjs reads it).
if (query.has('debug')) {
  window.__av = {
    camBase, view, walker, trek, party, friends, fire, tier, story, game, stroll, clock, store, rest, beds, garden, scene, rocks: ROCK_SPOTS,
    restInCabin, leaveCabin, openBook, book, corgi, petCorgi, indoor, room, enterRoom, leaveRoom, camera, camTarget, terrainH, renderer,
    actKind: () => actKind, wetAt, streamX, movers: () => (movers ? shared.light.uMoverOn.value : -1), openVolume, turnPage, showShelf, shelf: SHELF, pagesOf: (id) => pagesOf(bookOf(id), shelfCtx()),
    started: () => started,
    setPixelRatio: (p) => { pixelRatio = p; resize(); },
    cloud, perfTotal: () => ({ ...perfTotal }),
    gpu: () => {
      const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown renderer';
    },
    quality: () => ({ pixelRatio, grassFrac, flowerFrac, steps: skyMat.uniforms.uSteps.value, lens: lensPass.enabled }),
  };
}

/* -------------------------------------------------------------- render loop */
const frameClock = new THREE.Clock();
let time = Number(query.get('t')) || 0;
let frames = 0;
let skyAngle = (Number(query.get('sky')) || 0) * DEG;
let perfAcc = 0, perfFrames = 0, perfSkip = 3;
let grassFrac = 1;
let firstFrame = true;
let storyClock = 0;
// test hooks: ?room=1 starts inside the cabin; ?dog=run keeps Bơ trotting to and fro in front of the camp
let dogLoop = query.get('dog') === 'run' ? 1 : 0;
const _q = new THREE.Quaternion();
const _fwd = new THREE.Vector3();
const _m4 = new THREE.Matrix4();

// Quality ladder (automatic mode only). When frames drop, shed in this order:
// aurora slices, lens blur, grass density, flower density, and resolution last.
let flowerFrac = 1;
let perfWarm = 2;
const perfTotal = { t: 0, n: 0 };
let telemetrySent = false, telemetryTries = 0;
function maybeSendTelemetry() {
  if (telemetrySent || telemetryTries >= 3 || perfTotal.t < 60 || !store.get('settings.telemetry', false)) return;
  telemetrySent = true;
  telemetryTries++;
  const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
  cloud.sendTelemetry({
    tier,
    avg_fps: Math.round(perfTotal.n / perfTotal.t * 10) / 10,
    gpu: ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)).slice(0, 160) : null,
    day_night: clock.day > 0.6 ? 'day' : clock.day > 0.15 ? 'dusk' : 'night',
    season: clock.season.id,
  }).then((ok) => { if (!ok) telemetrySent = false; });     // try again at the next window
}
function adaptQuality(dt) {
  if (dt > 0.5) return;                 // back from a hidden tab: that gap was not a frame
  perfAcc += dt; perfFrames++;
  if (perfAcc < 1.5) return;
  const fps = perfFrames / perfAcc;
  // the same windows feed the average frame rate of the visit (the telemetry line), once the
  // start-up hitches are over, and only while the scene is actually being looked at
  if (perfWarm > 0) perfWarm--;
  else if (started) { perfTotal.t += perfAcc; perfTotal.n += perfFrames; }
  perfAcc = 0; perfFrames = 0;
  maybeSendTelemetry();
  if (perfSkip-- > 0 || qualityChoice !== 'auto') return;
  if (fps >= 48) return;
  const u = skyMat.uniforms.uSteps;
  if (u.value > 14) {
    u.value = Math.max(14, u.value - 6);
  } else if (lensPass.enabled) {
    lensPass.enabled = false;
  } else if (grassFrac > 0.6) {
    grassFrac = 0.6;
    for (const l of grass.userData.layers) l.geo.instanceCount = Math.floor(l.total * grassFrac);
  } else if (flowerFrac > 0.55) {
    flowerFrac = 0.55;
    for (const b of flowerBeds) b.geo.instanceCount = Math.floor(b.total * flowerFrac);
  } else if (pixelRatio > Q.minPR + 0.01) {
    pixelRatio = Math.max(Q.minPR, pixelRatio - 0.125);
    resize();
  }
  perfSkip = 1;
}

function frame() {
  requestAnimationFrame(frame);
  const raw = frameClock.getDelta();
  if (document.hidden) return;
  const dt = Math.min(raw, 0.05);
  time += dt;
  frames++;
  shared.uTime.value = time;
  finalPass.uniforms.uTime.value = time;
  finalPass.uniforms.uDay.value = uDay.value;
  skyMat.uniforms.uFrame.value = frames % 64;

  /* ---- camera ---- */
  const ease = 1 - Math.exp(-dt * 2.2);
  pointer.sx += (pointer.x - pointer.sx) * ease;
  pointer.sy += (pointer.y - pointer.sy) * ease;
  let follow = 7;
  if (mode !== 'view') {
    view.yawT = 0; view.pitchT = PITCH_DEG; view.fovT = baseFov;
    follow = 2.2;
  } else if (tour.on) {
    follow = 0.42;
    tour.t += dt;
    if (tour.t > 15) { tour.t = 0; tour.i++; tourGo(tour.i); }
  }
  const kf = 1 - Math.exp(-dt * follow);
  view.yaw += (view.yawT - view.yaw) * kf;
  view.pitch += (view.pitchT - view.pitch) * kf;
  view.fov += (view.fovT - view.fov) * kf;
  if (Math.abs(camera.fov - view.fov) > 0.002) {
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
  }
  shared.uPointScale.value = innerHeight / (2 * Math.tan(camera.fov * DEG / 2));
  uZoom.value = clamp(Math.sqrt(baseFov / camera.fov), 0.9, 1.9);

  updateWalk(dt);
  camBase.lerp(camTarget, 1 - Math.exp(-dt * (walker.on ? 12 : 1.3)));
  const par = mode === 'play' ? 1 : mode === 'intro' ? 0.5 : 0;
  camera.position.set(
    camBase.x + pointer.sx * 1.7 * par + Math.sin(time * 0.07) * 0.3,
    camBase.y + pointer.sy * 0.3 * par + Math.sin(time * 0.11) * 0.05,
    camBase.z);
  camera.rotation.y = -view.yaw * DEG - pointer.sx * 0.07 * par + Math.sin(time * 0.05) * 0.008;
  camera.rotation.x = view.pitch * DEG + pointer.sy * 0.035 * par;
  camera.updateMatrixWorld();
  sky.position.copy(camera.position);
  starPoints.position.copy(camera.position);
  keepStars.position.copy(camera.position);

  const dayAmt = applyDay(dt);

  /* ---- sky: mood, rotation, time-lapse ---- */
  if (mood.auto && mode === 'view') {
    mood.timer += dt * (1 + timelapse * 4);
    if (mood.timer > 70) { mood.timer = 0; mood.index = (mood.index + 1) % MOODS.length; }
  }
  applyMood(dt, false);
  shared.aurora.uAurTime.value += dt * mood.speed * (1 + timelapse * 3);
  skyAngle += timelapse * timelapse * 0.035 * dt;
  _q.setFromAxisAngle(pole, skyAngle);
  starPoints.quaternion.copy(_q);
  _m4.makeRotationFromQuaternion(_q.invert());
  skyMat.uniforms.uSkyRot.value.setFromMatrix4(_m4);
  uStarGain.value = mood.stars * (1 - dayAmt) * (1 - dayAmt);
  {
    const al = keepGeo.attributes.aAlpha;
    for (let i = 0; i < keepGeo.drawRange.count && i < KEEP_MAX; i++) al.setX(i, uStarGain.value * (0.82 + 0.18 * Math.sin(time * 1.3 + i * 2.1)));
    al.needsUpdate = true;
  }
  syncClockFace();

  /* ---- game ---- */
  if (mode === 'play') {
    game.setPointer(pointer.x, pointer.y, pointer.touch);
    ui.comboBar.style.transform = `scaleX(${(game.freeze > 0 && game.combo > 0 ? 1 : game.comboFraction).toFixed(3)})`;
    updateStatus();
  }
  updateMeteor(dt);
  game.update(dt, time);
  if (zen && performance.now() - lastMove > 2600) document.body.classList.add('idle');

  /* ---- aurora intensity drives light, sound and bloom ---- */
  const level = mode === 'play'
    ? game.auroraTarget
    : 1.12 + 0.14 * Math.sin(time * 0.06) + 0.06 * Math.sin(time * 0.17 + 1.3);
  const a = shared.aurora.uAurora;
  a.value += (level * mood.int * (1 - dayAmt) - a.value) * (1 - Math.exp(-dt * 1.4));
  const breathe = 0.9 + 0.1 * Math.sin(time * 0.23);
  const lo = shared.aurora.uAurLow.value, mi = shared.aurora.uAurMid.value;
  shared.uAuroraTint.value.set(
    lo.x * 0.42 + mi.x * 0.12 + 0.03,
    lo.y * 0.42 + mi.y * 0.12 + 0.03,
    lo.z * 0.42 + mi.z * 0.12 + 0.03).multiplyScalar(a.value * breathe);
  const tint = shared.uAuroraTint.value;
  const tmax = Math.max(tint.x, tint.y, tint.z, 1e-4);
  auroraLight.color.setRGB(tint.x / tmax, tint.y / tmax, tint.z / tmax);
  auroraLight.intensity = 0.5 * a.value * breathe;
  bloom.strength = (0.38 + 0.08 * Math.min(a.value, 2)) * (1 - 0.5 * dayAmt);
  audio.setDay(dayAmt * (1 - 0.85 * clock.weights[3]));          // few birds sing in the snow
  audio.setIntensity((a.value - 0.3) / 1.6);

  /* ---- campfire ---- */
  fire.cooldown -= dt;
  // about three minutes from a good blaze to cold ash (the star game keeps its embers)
  fire.level = Math.max(mode === 'play' ? 0.3 : 0, fire.level - dt * 0.0034);
  {
    const f = shared.uFire.value;
    camp.flame.visible = f > 0.03;
    camp.flame.scale.setScalar(Math.min(1, f / 0.22));
    camp.embers.visible = f > 0.06;
  }
  const flicker = 0.84 + 0.10 * Math.sin(time * 11.3) + 0.06 * Math.sin(time * 23.7 + 1.0) + 0.05 * Math.sin(time * 5.1 + 2.0);
  shared.uFire.value += (fire.level - shared.uFire.value) * (1 - Math.exp(-dt * 3));
  shared.uFireLight.value.w = shared.uFire.value * flicker;
  camp.light.intensity = 10 * shared.uFire.value * flicker;
  camp.charred.emissiveIntensity = (0.12 + 0.75 * shared.uFire.value * flicker) * (1 - 0.8 * dayAmt);   // embers pale in daylight
  camp.flame.rotation.y = Math.atan2(camera.position.x - camp.firePos.x, camera.position.z - camp.firePos.z);
  {
    const heard = indoor.on ? 0.5 : fire.level;               // indoors it is the stove that crackles
    if (Math.abs(heard - fire.lastAudio) > 0.03) { fire.lastAudio = heard; audio.setFire(heard); }
  }

  // The lens focuses on what you are looking at. Walk the view ray out to where it meets the
  // flowers or the ground: look out over the valley and everything is sharp; bend down to a
  // bloom and it is the bloom that is sharp, with only what lies nearer still going soft.
  {
    camera.getWorldDirection(_fwd);
    let hit = 40;
    if (indoor.on) hit = 2.6;                                  // indoors: the far wall, near enough; the loop below is skipped
    else for (let i = 0, d = 0.5; i < 30; i++, d *= 1.17) {
      const hx = camera.position.x + _fwd.x * d, hy = camera.position.y + _fwd.y * d, hz = camera.position.z + _fwd.z * d;
      // how tall the planting is here: head-high in the sunflower field, knee-high elsewhere
      const gx = hx - GARDEN.x, gz = hz - GARDEN.z;
      const cover = gx > 4.5 && gx < 18.5 && gz > -15.5 && gz < -4.5 ? 1.95 : 0.55;
      if (hy < terrainH(hx, hz) + cover) { hit = d; break; }
    }
    focusHit = hit;
    const want = mode === 'play' ? 0 : clamp(hit * 0.6, 0.3, 11);
    const u = lensPass.uniforms.uFocus;
    u.value += (want - u.value) * (frames < 6 ? 1 : 1 - Math.exp(-dt * 3.5));   // no hunting on arrival
    // and it stops down as the subject comes near: studying a flower, nothing is smeared;
    // the soft foreground is kept for the long views, where it gives depth
    const t = clamp((u.value - 1.5) / 6.5, 0, 1);
    lensPass.uniforms.uAperture.value = 0.13 * t * t * (3 - 2 * t);
  }
  updateLabels();
  updateCompass();
  if (dogLoop && started && !corgi.target) { dogLoop = -dogLoop; corgi.walkTo(dogLoop > 0 ? 0.2 : 3.6, dogLoop > 0 ? 3.4 : 0.8, 1); }
  corgi.update(dt, time, {
    px: camBase.x, pz: camBase.z, camY: indoor.on ? walker.eye : camBase.y - terrainH(camBase.x, camBase.z),
    night: clock.day < 0.3, indoor: indoor.on, room,
    rest: fire.level > 0.06 ? DOG_FIRE : DOG_PORCH,
    ground: terrainH, blocks: BLOCKS,
  });
  if (frames % 6 === 0) updateActions();
  if (frames % 12 === 0) updateStory(Math.min(0.6, (time - storyClock)));
  if (frames % 12 === 0) storyClock = time;
  updateParty(dt);
  {
    const sd = camBase.z < -20 ? Math.abs(camBase.x - streamX(camBase.z)) : 60;
    audio.setStream(clamp(1 - sd / 38, 0, 1) * (1 - clock.weights[3]));     // a frozen stream is silent
  }
  // shadows that move: outdoors the dog's and companions' little map; indoors the stove light's
  // cube map, redrawn every third frame as the flame shifts (nothing else is in it then)
  if (movers) {
    if (indoor.on) shared.light.uMoverOn.value = 0;
    else movers.render(camBase, shared.uSunDir.value, dayAmt > 0.03 && shared.light.uSunReach.value > 0.02);
  }
  if (indoor.on && Q.shadow) renderer.shadowMap.needsUpdate = true;        // every frame: the room is small, and the flame never steps
  composer.render(dt);
  if (Q.shadow && (shadowStale || !shared.light.uShadowOn.value) && sunLight.shadow.map) {
    shadowStale = false;
    shared.light.uShadowMap.value = sunLight.shadow.map.texture;
    shared.light.uShadowMatrix.value.copy(sunLight.shadow.matrix);
    shared.light.uShadowOn.value = 1;
  }
  if (wantPhoto) { wantPhoto = false; savePhoto(); }

  /* ---- "+ củi" button rides on the fire ---- */
  if (started && frames % 2 === 0) {
    _proj.set(camp.firePos.x, camp.firePos.y + 1.0, camp.firePos.z).project(camera);
    const on = _proj.z < 1 && Math.abs(_proj.x) < 0.96 && _proj.y > -0.9 && _proj.y < 0.9 && journal.classList.contains('hidden') && !indoor.on;
    fireBtn.classList.toggle('hidden', !on);
    const label = mode !== 'view' ? '+ củi' : fire.level < 0.04 ? (fire.wood ? 'Nhóm lửa' : 'Lửa đã tắt · cần củi') : fire.wood ? `+ củi · còn ${fire.wood}` : '+ củi · hết củi';
    if (label !== fire.label) { fire.label = label; fireBtn.textContent = label; }
    if (on) {
      const x = (_proj.x * 0.5 + 0.5) * innerWidth, y = (-_proj.y * 0.5 + 0.5) * innerHeight;
      fireBtn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  if (firstFrame) {
    firstFrame = false;
    $('loader').classList.add('done');
    const auto = query.get('auto');
    if (auto === 'play' || auto === 'view') start(auto);
    else if (auto === 'zen') start('view', true);
    else $('intro').classList.remove('hidden');
    if (query.get('open') === 'journal') openJournal(true, query.get('focus') || undefined);
    if (query.get('cons') === '1' && !showCons) $('conBtn').click();
    {
      const si = SPOTS.findIndex((sp) => sp.id === query.get('spot'));
      if (si > 0) { goSpot(si); camBase.copy(camTarget); view.yaw = view.yawT; view.pitch = view.pitchT; view.fov = view.fovT; }
    }
    if (query.has('x') && query.has('z')) {
      // test hook: stand anywhere (x, z in metres, eye height above the ground)
      const px = clamp(Number(query.get('x')) || 0, BOUNDS.minX, BOUNDS.maxX);
      const pz = clamp(Number(query.get('z')) || 0, BOUNDS.minZ, BOUNDS.maxZ);
      const eye = clamp(Number(query.get('eye')) || 1.7, 0.2, 60);
      walker.on = false;
      camTarget.set(px, terrainH(px, pz) + eye, pz);
      camBase.copy(camTarget);
    }
    if (query.get('room') === '1') enterRoom();
    if (query.has('yaw') || query.has('pitch') || query.has('fov')) {
      setTour(false);
      view.yaw = view.yawT = Number(query.get('yaw')) || 0;
      view.pitch = view.pitchT = query.has('pitch') ? Number(query.get('pitch')) : PITCH_DEG;
      view.fov = view.fovT = Number(query.get('fov')) || baseFov;
    }
  }
  adaptQuality(raw);
}
frame();
