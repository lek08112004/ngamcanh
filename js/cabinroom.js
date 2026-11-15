// The inside of the turf-roof cabin: one room you can really stand in. Log walls, a board floor,
// a cast-iron stove with a small fire behind its open door, a bed with a patchwork quilt, the
// table with the notebook open on it, and windows that let in the light of the hour.
//
// Everything in here lives on layer ROOM_LAYER only, lights included. Outside, the camera sees
// layer 0 and none of this costs anything; inside, the camera sees only this layer, so the
// valley, the grass and the sky are not drawn at all (the windows show a painted view instead).
// The stove's light is the one dynamic shadow caster in the room (a small cube map, redrawn a
// few times a second as the flame moves: see main.js); there is no shadow map on `low`.
import * as THREE from 'three';
import { woodTexture, stoneTexture } from './world.js';

export const ROOM_LAYER = 1;
const IW = 2.18, IL = 3.08, WALL = 2.3, RIDGE = 3.62;     // inner half-width, half-length, wall height, ridge (cabin frame)
const TAU = Math.PI * 2;

/* ---------- canvas textures ---------- */
function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d')]; }
function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}
/** floorboards running along v: eight boards across the tile, butt joints staggered, worn paler down the middle */
function floorTexture(rng) {
  const [c, g] = canvas(512);
  const bw = 512 / 8;
  for (let b = 0; b < 8; b++) {
    let v = -rng() * 300;
    while (v < 512) {
      const len = 160 + rng() * 260, tone = 0.78 + rng() * 0.34;
      g.fillStyle = `rgb(${(132 * tone) | 0},${(92 * tone) | 0},${(58 * tone) | 0})`;
      g.fillRect(b * bw, v, bw, len);
      for (let i = 0; i < 26; i++) {                     // grain
        const x = b * bw + 3 + rng() * (bw - 6);
        g.strokeStyle = `rgba(${rng() < 0.6 ? '50,28,12' : '190,150,105'},${0.07 + rng() * 0.12})`;
        g.lineWidth = 0.5 + rng() * 1.2;
        g.beginPath(); g.moveTo(x, v); g.bezierCurveTo(x + (rng() - 0.5) * 6, v + len * 0.33, x + (rng() - 0.5) * 6, v + len * 0.66, x, v + len); g.stroke();
      }
      g.fillStyle = 'rgba(20,10,4,0.75)';                // butt joint
      g.fillRect(b * bw, v, bw, 2);
      for (const nx of [0.25, 0.75]) { g.fillStyle = 'rgba(15,10,8,0.8)'; g.fillRect(b * bw + bw * nx - 1.5, v + 8, 3, 3); }   // nail heads
      v += len;
    }
    g.fillStyle = 'rgba(14,7,3,0.85)';                   // gap between boards
    g.fillRect(b * bw, 0, 2, 512);
  }
  // worn along the path from the door to the stove: paler, smoother
  const wear = g.createLinearGradient(0, 0, 512, 0);
  wear.addColorStop(0, 'rgba(255,230,190,0)'); wear.addColorStop(0.5, 'rgba(255,230,190,0.07)'); wear.addColorStop(1, 'rgba(255,230,190,0)');
  g.fillStyle = wear; g.fillRect(0, 0, 512, 512);
  return tex(c);
}
/** a patchwork quilt: squares of faded cotton, each with its own small print, stitched in the seams */
function quiltTexture(rng) {
  const [c, g] = canvas(512);
  const cols = ['#8c3b2e', '#c9a46a', '#3f5a6e', '#e8dcc2', '#6d7b4a', '#a85a3c', '#d6c08e', '#4b3a5a'];
  const n = 6, s = 512 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const col = cols[Math.floor(rng() * cols.length)];
    g.fillStyle = col; g.fillRect(i * s, j * s, s, s);
    const kind = Math.floor(rng() * 4);
    g.fillStyle = 'rgba(255,248,230,0.32)'; g.strokeStyle = 'rgba(30,20,12,0.25)';
    if (kind === 0) for (let k = 0; k < 9; k++) for (let l = 0; l < 9; l++) { g.beginPath(); g.arc(i * s + (k + 0.5) * s / 9, j * s + (l + 0.5) * s / 9, 2.2, 0, TAU); g.fill(); }
    else if (kind === 1) for (let k = 0; k < 8; k++) { g.fillRect(i * s, j * s + k * s / 8, s, s / 20); }
    else if (kind === 2) { g.lineWidth = 2; for (let k = -8; k < 16; k++) { g.beginPath(); g.moveTo(i * s + k * 10, j * s); g.lineTo(i * s + k * 10 + s, j * s + s); g.stroke(); } }
    else { g.beginPath(); g.moveTo(i * s + s / 2, j * s + 10); g.lineTo(i * s + s - 10, j * s + s / 2); g.lineTo(i * s + s / 2, j * s + s - 10); g.lineTo(i * s + 10, j * s + s / 2); g.closePath(); g.fill(); }
    g.fillStyle = `rgba(0,0,0,${0.05 + rng() * 0.12})`; g.fillRect(i * s, j * s, s, s);     // some patches more faded than others
  }
  g.strokeStyle = 'rgba(245,235,210,0.55)'; g.lineWidth = 1.4; g.setLineDash([5, 4]);   // running stitch
  for (let k = 0; k <= n; k++) {
    g.beginPath(); g.moveTo(k * s + 4, 0); g.lineTo(k * s + 4, 512); g.stroke();
    g.beginPath(); g.moveTo(0, k * s + 4); g.lineTo(512, k * s + 4); g.stroke();
  }
  g.setLineDash([]);
  return tex(c);
}
/** a rag rug: bands of torn cloth woven across, never quite straight */
function rugTexture(rng) {
  const [c, g] = canvas(256);
  const cols = ['#6b2f25', '#9b6a3a', '#2f4250', '#b9a27a', '#5b6040', '#7a4a5a'];
  let y = 0;
  while (y < 256) {
    const h = 6 + rng() * 14, col = cols[Math.floor(rng() * cols.length)];
    g.fillStyle = col; g.fillRect(0, y, 256, h);
    for (let x = 0; x < 256; x += 4) { g.fillStyle = `rgba(${rng() < 0.5 ? '0,0,0' : '255,240,220'},${0.05 + rng() * 0.12})`; g.fillRect(x, y, 3, h); }
    y += h;
  }
  g.strokeStyle = 'rgba(230,210,170,0.6)'; g.lineWidth = 6; g.strokeRect(5, 5, 246, 246);
  return tex(c);
}
/** the notebook on the table, open: ruled ivory pages, a hand's untidy lines, a pressed flower drawn on the right */
function pageTexture(rng) {
  const [c, g] = canvas(512);
  g.fillStyle = '#eee3c8'; g.fillRect(0, 0, 512, 512);
  const fold = g.createLinearGradient(236, 0, 276, 0);
  fold.addColorStop(0, 'rgba(90,70,40,0)'); fold.addColorStop(0.5, 'rgba(90,70,40,0.35)'); fold.addColorStop(1, 'rgba(90,70,40,0)');
  g.fillStyle = fold; g.fillRect(236, 0, 40, 512);
  g.strokeStyle = 'rgba(70,90,130,0.18)'; g.lineWidth = 1;
  for (let y = 60; y < 480; y += 22) { g.beginPath(); g.moveTo(24, y); g.lineTo(232, y); g.moveTo(280, y); g.lineTo(488, y); g.stroke(); }
  g.strokeStyle = 'rgba(40,30,30,0.75)'; g.lineWidth = 1.3;
  for (let y = 56; y < 470; y += 22) {                   // handwriting: runs of small loops, words and gaps
    if (rng() < 0.1) continue;
    let x = 28, end = 220 - rng() * 60;
    g.beginPath(); g.moveTo(x, y);
    while (x < end) {
      const w = 12 + rng() * 26;
      for (let k = 0; k < w; k += 3) g.lineTo(x + k, y - 2 - Math.abs(Math.sin(k * 1.3 + rng())) * 6);
      x += w + 6; g.moveTo(x, y);
    }
    g.stroke();
  }
  // a little sprig, drawn and coloured on the right page
  g.strokeStyle = 'rgba(60,90,40,0.8)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(380, 430); g.quadraticCurveTo(372, 330, 390, 240); g.stroke();
  for (const [x, y, a] of [[378, 380, -0.6], [384, 320, 0.7], [386, 280, -0.5]]) {
    g.fillStyle = 'rgba(80,120,50,0.6)'; g.beginPath(); g.ellipse(x + Math.cos(a) * 14, y, 16, 6, a, 0, TAU); g.fill();
  }
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.fillStyle = 'rgba(200,70,90,0.7)'; g.beginPath(); g.ellipse(390 + Math.cos(a) * 12, 228 + Math.sin(a) * 12, 11, 7, a, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(220,170,40,0.9)'; g.beginPath(); g.arc(390, 228, 5, 0, TAU); g.fill();
  return tex(c);
}

/* ---------- the fire behind the stove door, and the view through the windows ---------- */
const quadVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const flameFragment = /* glsl */ `
uniform float uTime;
uniform float uLevel;
varying vec2 vUv;
float fh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float fn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fh(i), fh(i + vec2(1.0, 0.0)), f.x), mix(fh(i + vec2(0.0, 1.0)), fh(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  vec2 p = vUv;
  float t = uTime;
  // tongues of flame licking up off the logs: noise rising, pinched at the sides
  float w = fn(vec2(p.x * 6.0, p.y * 3.0 - t * 2.4)) * 0.6 + fn(vec2(p.x * 13.0 + 3.0, p.y * 7.0 - t * 4.3)) * 0.4;
  float tongues = 0.5 + 0.5 * sin(p.x * 21.0 + fn(vec2(p.y * 2.0 - t * 1.3, 4.0)) * 5.0);
  float top = (0.28 + 0.55 * tongues * w) * uLevel;
  float f = smoothstep(top, top * 0.25, p.y - 0.10) * smoothstep(0.02, 0.16, p.x) * smoothstep(0.98, 0.84, p.x);
  vec3 c = mix(vec3(0.9, 0.16, 0.02), vec3(1.0, 0.78, 0.36), smoothstep(0.25, 0.95, f)) * f * 3.4;
  // the logs and the glowing bed of embers under them
  float logs = smoothstep(0.17, 0.12, abs(p.y - 0.13 - 0.04 * sin(p.x * 3.0)));
  float ember = 0.55 + 0.45 * fn(vec2(p.x * 24.0, t * 0.7)) * fn(vec2(p.x * 9.0 + 7.0, t * 0.4));
  c += vec3(1.0, 0.28, 0.04) * smoothstep(0.14, 0.0, p.y) * ember * 2.4;
  c = mix(c, vec3(0.03, 0.015, 0.01) + vec3(0.9, 0.2, 0.02) * ember * 0.5, logs * (1.0 - f));
  gl_FragColor = vec4(c, 1.0);
}
`;
const viewFragment = /* glsl */ `
uniform vec3 uSkyLo;
uniform vec3 uSkyHi;
uniform vec3 uLand;
uniform float uSeed;
uniform float uDay;
varying vec2 vUv;
void main(){
  vec2 p = vUv;
  // what lies outside: sky, the far ridge, the meadow; a little out of focus, as through old glass
  vec3 col = mix(uSkyLo, uSkyHi, smoothstep(0.30, 1.0, p.y));
  float ridge = 0.40 + 0.07 * sin(p.x * 4.0 + uSeed) + 0.035 * sin(p.x * 11.0 + uSeed * 3.0) + 0.012 * sin(p.x * 31.0 + uSeed);
  float hill = smoothstep(ridge + 0.012, ridge - 0.012, p.y);
  col = mix(col, mix(uSkyLo, uLand * 0.55, 0.75), hill);
  float near = smoothstep(0.24, 0.20, p.y + 0.03 * sin(p.x * 6.0 + uSeed * 2.0));
  col = mix(col, uLand, near);
  // a faint sheen where the old glass waves
  col *= 0.94 + 0.06 * sin(p.x * 40.0 + p.y * 9.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ---------- the room ---------- */
export function createCabinRoom(cabin, rng, opts = {}) {
  const shadows = !!opts.shadows;
  const room = new THREE.Group();
  room.name = 'cabin-room';
  cabin.group.add(room);

  const woodMap = woodTexture(rng);
  const stoneMap = stoneTexture(rng);
  const logs = new THREE.MeshStandardMaterial({ map: woodMap, bumpMap: woodMap.userData.bump, bumpScale: 2.2, roughness: 0.88, side: THREE.BackSide, color: 0xd9c2a4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x5a3c26, map: woodMap, roughness: 0.85 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xc8a27a, map: woodMap, roughness: 0.75 });
  const floorMap = floorTexture(rng);
  floorMap.repeat.set((IW * 2) / 1.12, (IL * 2) / 2.2);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.62, metalness: 0 });
  const stone = new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneMap.userData.bump, bumpScale: 2.0, roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.5, metalness: 0.8 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xb06a3c, roughness: 0.35, metalness: 0.9 });
  const linen = new THREE.MeshStandardMaterial({ color: 0xe9e1cf, roughness: 0.95 });
  const quilt = new THREE.MeshStandardMaterial({ map: quiltTexture(rng), roughness: 0.95 });
  const rugMat = new THREE.MeshStandardMaterial({ map: rugTexture(rng), roughness: 1 });
  const pageMat = new THREE.MeshStandardMaterial({ map: pageTexture(rng), roughness: 0.9 });
  const curtain = new THREE.MeshStandardMaterial({ color: 0xb9a582, roughness: 1, side: THREE.DoubleSide });
  const soot = new THREE.MeshBasicMaterial({ color: 0x060403 });

  const meshes = [];
  const put = (geo, mat, x, y, z, parent = room) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    meshes.push(m);
    return m;
  };
  const box = (w, h, d, mat, x, y, z, parent) => put(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const cyl = (r0, r1, h, mat, x, y, z, seg = 14, parent) => put(new THREE.CylinderGeometry(r0, r1, h, seg), mat, x, y, z, parent);

  /* shell: walls, gables and the roof's underside in one inward-facing log body */
  {
    const s = new THREE.Shape();
    s.moveTo(-IW, 0); s.lineTo(IW, 0); s.lineTo(IW, WALL); s.lineTo(0, RIDGE); s.lineTo(-IW, WALL); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: IL * 2, bevelEnabled: false });
    geo.translate(0, 0, -IL);
    const uv = geo.attributes.uv, side = geo.groups[1];
    for (let i = side.start; i < side.start + side.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));   // logs lie level
    put(geo, logs, 0, 0, 0);
  }
  const floor = put(new THREE.PlaneGeometry(IW * 2, IL * 2).rotateX(-Math.PI / 2), floorMat, 0, 0.012, 0);
  floor.userData.floor = true;
  // skirting, tie beams across the room, a ridge beam, and rafters down each slope
  for (const sx of [-1, 1]) box(0.05, 0.10, IL * 2, dark, sx * (IW - 0.025), 0.06, 0);
  for (const bz of [-2.1, 0.0, 2.1]) {
    box(IW * 2, 0.16, 0.16, dark, 0, WALL - 0.02, bz);
    box(0.10, RIDGE - WALL - 0.12, 0.10, dark, 0, (WALL + RIDGE) / 2 - 0.08, bz);      // king post
  }
  box(0.14, 0.16, IL * 2, dark, 0, RIDGE - 0.14, 0);
  {
    const a = Math.atan2(RIDGE - WALL, IW), len = Math.hypot(RIDGE - WALL, IW);
    for (let k = -3; k <= 3; k++) for (const sx of [-1, 1]) {
      const r = box(len, 0.09, 0.08, dark, sx * IW / 2, (WALL + RIDGE) / 2 - 0.07, k * 0.95);
      r.rotation.z = -sx * a;
    }
  }

  /* the windows: a painted view, a deep sill, a frame with glazing bars, and linen curtains tied back */
  const views = [];
  const windowAt = (pos, normal, w, h, seed) => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: quadVertex, fragmentShader: viewFragment,
      uniforms: { uSkyLo: { value: new THREE.Vector3() }, uSkyHi: { value: new THREE.Vector3() }, uLand: { value: new THREE.Vector3() }, uSeed: { value: seed }, uDay: { value: 1 } },
    });
    views.push(mat);
    const g = new THREE.Group();
    g.position.copy(pos);
    g.lookAt(pos.clone().add(normal));
    room.add(g);
    // (the log wall is solid, so the glass sits just proud of it, inside its frame)
    const pane = put(new THREE.PlaneGeometry(w, h), mat, 0, 0, 0.012, g);
    pane.userData.glow = true;
    box(w + 0.16, 0.07, 0.08, dark, 0, h / 2 + 0.035, 0.01, g);
    box(w + 0.22, 0.05, 0.22, pale, 0, -h / 2 - 0.025, 0.08, g);             // sill
    for (const sx of [-1, 1]) box(0.07, h + 0.12, 0.08, dark, sx * (w / 2 + 0.035), 0, 0.01, g);
    box(0.035, h, 0.03, dark, 0, 0, 0.03, g);
    box(w, 0.035, 0.03, dark, 0, 0, 0.03, g);
    // curtains: a gathered panel each side, pinched in by a tie a third of the way up
    for (const sx of [-1, 1]) {
      const cg = new THREE.PlaneGeometry(0.26, h + 0.30, 8, 10);
      const p = cg.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), t = (y + (h + 0.3) / 2) / (h + 0.3);
        const pinch = 1 - 0.55 * Math.exp(-Math.pow((t - 0.34) / 0.12, 2));
        p.setX(i, x * pinch + sx * 0.02 * (1 - pinch));
        p.setZ(i, Math.sin(x * 46 + sx) * 0.018 + 0.06);
      }
      cg.computeVertexNormals();
      put(cg, curtain, sx * (w / 2 + 0.06), 0.06, 0.06, g);
    }
    box(w + 0.6, 0.03, 0.03, iron, 0, h / 2 + 0.18, 0.08, g);               // curtain rod
    return g;
  };
  // long side (-X): two windows; gable (+Z): one beside the door
  windowAt(new THREE.Vector3(-IW + 0.005, 1.38, -1.45), new THREE.Vector3(1, 0, 0), 1.10, 0.86, 1.3);
  windowAt(new THREE.Vector3(-IW + 0.005, 1.38, 1.35), new THREE.Vector3(1, 0, 0), 1.10, 0.86, 4.1);
  windowAt(new THREE.Vector3(0.95, 1.38, IL - 0.005), new THREE.Vector3(0, 0, -1), 1.0, 1.0, 2.7);

  // the door, from inside: boards, ledges and a brace, a wooden latch
  {
    const dg = new THREE.Group();
    dg.position.set(-0.85, 0.98, IL - 0.03);
    room.add(dg);
    const boardMap = woodMap.clone();
    boardMap.rotation = Math.PI / 2; boardMap.repeat.set(1, 1.4); boardMap.needsUpdate = true;
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xa7835e, map: boardMap, roughness: 0.85 });
    box(0.95, 1.95, 0.04, doorMat, 0, 0, 0, dg);
    for (const y of [-0.62, 0.62]) box(0.86, 0.12, 0.04, dark, 0, y, -0.04, dg);
    const brace = box(0.10, 1.40, 0.035, dark, 0, 0, -0.04, dg);
    brace.rotation.z = 0.56;
    box(0.20, 0.04, 0.05, dark, 0.32, 0.05, -0.07, dg);
    for (const sx of [-1, 1]) box(0.09, 2.07, 0.10, dark, sx * 0.52, 0.04, 0.0, dg);
    box(1.15, 0.10, 0.10, dark, 0, 1.03, 0.0, dg);
  }

  /* the stove: on a slab of the house's stone, a cast-iron box on short legs, its door open on a small fire */
  const STOVE = { x: 0.95, z: -1.6 };
  const fireAt = new THREE.Vector3(STOVE.x, 0.50, STOVE.z + 0.40);
  let flameMat;
  {
    const sg = new THREE.Group();
    sg.position.set(STOVE.x, 0, STOVE.z);
    room.add(sg);
    const slab = box(1.15, 0.06, 1.05, stone, 0, 0.03, 0.12, sg);
    slab.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 1.1; });
    // body: sides, top and back, with a dark firebox inside and the door hung open on the right
    const W = 0.62, H = 0.52, D = 0.48, y0 = 0.16;
    box(W, 0.04, D, iron, 0, y0 + H, 0, sg);
    box(W, 0.04, D, iron, 0, y0, 0, sg);
    box(0.04, H, D, iron, -W / 2 + 0.02, y0 + H / 2, 0, sg);
    box(0.04, H, D, iron, W / 2 - 0.02, y0 + H / 2, 0, sg);
    box(W, H, 0.04, iron, 0, y0 + H / 2, -D / 2 + 0.02, sg);
    box(W, 0.11, 0.04, iron, 0, y0 + H - 0.05, D / 2 - 0.02, sg);           // lintel over the door
    box(W, 0.08, 0.04, iron, 0, y0 + 0.05, D / 2 - 0.02, sg);
    box(W - 0.08, H - 0.06, 0.01, soot, 0, y0 + H / 2, -D / 2 + 0.05, sg);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = cyl(0.025, 0.035, y0 - 0.06, iron, lx * (W / 2 - 0.05), 0.06 + (y0 - 0.06) / 2, lz * (D / 2 - 0.05), 8, sg);
      leg.userData.leg = true;
    }
    const door = new THREE.Group();
    door.position.set(W / 2 - 0.02, y0 + H / 2 - 0.02, D / 2);
    door.rotation.y = 1.9;                                             // swung well open
    sg.add(door);
    box(0.44, 0.32, 0.03, iron, -0.22, 0, 0, door);
    box(0.06, 0.02, 0.05, copper, -0.40, 0, 0.03, door);
    // the fire itself, set back in the firebox
    flameMat = new THREE.ShaderMaterial({
      vertexShader: quadVertex, fragmentShader: flameFragment,
      uniforms: { uTime: { value: 0 }, uLevel: { value: 1 } },
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    const flame = put(new THREE.PlaneGeometry(W - 0.10, H - 0.14), flameMat, 0, y0 + 0.02 + (H - 0.14) / 2, 0.02, sg);
    flame.userData.glow = true;
    // logs in the firebox
    for (const [lx, a] of [[-0.08, 0.3], [0.08, -0.25]]) {
      const l = cyl(0.04, 0.04, 0.42, dark, lx, y0 + 0.08, 0.0, 8, sg);
      l.rotation.set(0, a, Math.PI / 2);
    }
    // flue: up through the roof to the stone chimney
    const pipeTop = RIDGE - (STOVE.x / IW) * (RIDGE - WALL);
    cyl(0.075, 0.075, pipeTop - (y0 + H), iron, 0, y0 + H + (pipeTop - y0 - H) / 2, 0.06, 16, sg);
    cyl(0.10, 0.10, 0.03, iron, 0, y0 + H + 0.35, 0.06, 16, sg);           // damper collar
    // a kettle keeping warm
    const k = put(new THREE.SphereGeometry(0.11, 18, 12), copper, 0.12, y0 + H + 0.10, 0.10, sg);
    k.scale.set(1, 0.72, 1);
    const spout = cyl(0.016, 0.026, 0.13, copper, 0.24, y0 + H + 0.14, 0.10, 8, sg);
    spout.rotation.z = -0.9;
    const handle = put(new THREE.TorusGeometry(0.085, 0.009, 6, 16, Math.PI), iron, 0.12, y0 + H + 0.16, 0.10, sg);
    handle.rotation.y = Math.PI / 2;
    // a basket of split wood beside it
    const bx = 0.92, bz = 0.05;
    cyl(0.20, 0.17, 0.26, new THREE.MeshStandardMaterial({ color: 0x6e5534, roughness: 1 }), bx, 0.13, bz, 14, sg);
    for (let i = 0; i < 7; i++) {
      const b = cyl(0.04, 0.045, 0.42, dark, bx + (rng() - 0.5) * 0.18, 0.30 + (rng() - 0.5) * 0.06, bz + (rng() - 0.5) * 0.18, 7, sg);
      b.rotation.set((rng() - 0.5) * 0.4, rng() * 3, (rng() - 0.5) * 0.4);
    }
  }

  /* the bed in the back corner: a plank frame, a straw mattress, a pillow and the quilt */
  {
    const bx = -IW + 0.50, bz = -IL + 1.06;
    box(0.98, 0.26, 2.06, dark, bx, 0.17, bz);
    box(1.0, 0.82, 0.07, dark, bx, 0.43, -IL + 0.06);                   // headboard
    for (const sx of [-1, 1]) cyl(0.045, 0.045, 0.92, dark, bx + sx * 0.48, 0.46, -IL + 0.08, 10);
    box(0.92, 0.15, 1.98, linen, bx, 0.375, bz);
    const pillow = put(new THREE.SphereGeometry(0.5, 20, 10), linen, bx, 0.50, -IL + 0.34);
    pillow.scale.set(0.74, 0.16, 0.36);
    // the quilt hangs over the edge and the foot; its folds are a few bumps in the surface
    const qg = new THREE.BoxGeometry(1.04, 0.05, 1.45, 10, 1, 14);
    const qp = qg.attributes.position;
    for (let i = 0; i < qp.count; i++) {
      const x = qp.getX(i), z = qp.getZ(i);
      qp.setY(i, qp.getY(i) + 0.012 * Math.sin(x * 9 + z * 4) + 0.010 * Math.sin(z * 13));
    }
    qg.computeVertexNormals();
    put(qg, quilt, bx, 0.47, bz + 0.26);
    box(0.05, 0.22, 1.45, quilt, bx + 0.53, 0.37, bz + 0.26);             // hanging down the room side
    box(1.04, 0.22, 0.05, quilt, bx, 0.37, bz + 0.99);                    // and the foot
  }

  /* the table under the window, the notebook open on it, a candle, a mug; a chair pulled up */
  const TABLE = { x: -IW + 0.48, z: 1.35 };
  let candleLight, candleFlame;
  {
    const tg = new THREE.Group();
    tg.position.set(TABLE.x, 0, TABLE.z);
    room.add(tg);
    box(0.78, 0.05, 1.15, pale, 0, 0.75, 0, tg);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.06, 0.73, 0.06, dark, sx * 0.32, 0.365, sz * 0.50, tg);
    box(0.06, 0.06, 0.95, dark, 0, 0.20, 0, tg);                         // stretcher
    // the notebook: two pages either side of the spine, a ribbon
    const book = new THREE.Group();
    book.position.set(0.05, 0.777, -0.05);
    book.rotation.y = 0.25;
    tg.add(book);
    box(0.47, 0.012, 0.31, new THREE.MeshStandardMaterial({ color: 0x5a2e22, roughness: 0.8 }), 0, 0, 0, book);
    const pg = new THREE.PlaneGeometry(0.44, 0.29, 16, 1);
    const pp = pg.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i); pp.setZ(i, 0.022 * Math.pow(Math.abs(x) / 0.22, 0.45)); }   // the pages rise from the spine
    pg.computeVertexNormals();
    const pages = put(pg, pageMat, 0, 0.008, 0, book);
    pages.rotation.x = -Math.PI / 2;
    box(0.008, 0.002, 0.18, new THREE.MeshStandardMaterial({ color: 0x8a1e2a, roughness: 0.6 }), 0.0, 0.03, 0.18, book);
    // candle in a tin holder, and the light it gives at night
    cyl(0.055, 0.06, 0.015, copper, -0.16, 0.785, 0.38, 14, tg);
    cyl(0.022, 0.022, 0.12, new THREE.MeshStandardMaterial({ color: 0xefe6cf, roughness: 0.6, emissive: 0x3a2008, emissiveIntensity: 0.4 }), -0.16, 0.85, 0.38, 12, tg);
    candleFlame = put(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 2.2, 0.8) }), -0.16, 0.93, 0.38, tg);
    candleFlame.scale.set(1, 2.2, 1);
    candleFlame.userData.glow = true;
    candleLight = new THREE.PointLight(0xffb468, 0, 5, 2);
    candleLight.position.set(-0.16, 0.98, 0.38);
    tg.add(candleLight);
    // a mug
    cyl(0.042, 0.038, 0.10, new THREE.MeshStandardMaterial({ color: 0x3d5566, roughness: 0.4 }), 0.18, 0.825, 0.36, 14, tg);
    // the chair, pulled up to the table, facing the window
    const cg = new THREE.Group();
    cg.position.set(0.72, 0, 0.0);
    tg.add(cg);
    box(0.42, 0.04, 0.42, pale, 0, 0.46, 0, cg);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.04, 0.46, 0.04, dark, sx * 0.18, 0.23, sz * 0.18, cg);
    for (const sz of [-1, 1]) box(0.04, 0.50, 0.04, dark, 0.19, 0.72, sz * 0.18, cg);
    for (const y of [0.62, 0.80, 0.94]) box(0.03, 0.06, 0.40, dark, 0.19, y, 0, cg);
  }

  /* a shelf of jars and books on the far wall, a rag rug before the stove, a rocking chair by the fire */
  {
    for (const y of [1.28, 1.66]) {
      box(0.24, 0.035, 1.3, pale, IW - 0.13, y, 1.15);
      for (const z of [0.6, 1.7]) box(0.20, 0.08, 0.04, dark, IW - 0.12, y - 0.06, z);
    }
    const jarCols = [0x6d8a5a, 0x9a5b2e, 0xc7b276, 0x8b3a3a];
    for (let i = 0; i < 4; i++) {
      cyl(0.045, 0.045, 0.13 + (i % 2) * 0.04, new THREE.MeshStandardMaterial({ color: jarCols[i], roughness: 0.25, transparent: true, opacity: 0.88 }), IW - 0.13, 1.30 + 0.07 + (i % 2) * 0.02, 0.62 + i * 0.12, 14);
    }
    const bookCols = [0x3e4a5c, 0x7a2e24, 0x5c6b3a, 0x8c6a2c, 0x433a52, 0x6b3a2c];
    let z = 0.62;
    for (let i = 0; i < 9; i++) {
      const h = 0.17 + rng() * 0.07, t = 0.035 + rng() * 0.03;
      const b = box(0.15, h, t, new THREE.MeshStandardMaterial({ color: bookCols[i % bookCols.length], roughness: 0.7 }), IW - 0.13, 1.68 + h / 2, z + t / 2);
      if (i === 8) b.rotation.x = 0.3;
      z += t + 0.004;
    }
    put(new THREE.PlaneGeometry(1.5, 1.05).rotateX(-Math.PI / 2), rugMat, 0.35, 0.016, -0.55);
    // rocking chair: two rockers, a slatted seat and back, turned toward the stove
    const rg = new THREE.Group();
    rg.position.set(1.62, 0, 0.42);
    rg.rotation.y = 2.5;
    room.add(rg);
    for (const sx of [-1, 1]) {
      const rk = put(new THREE.TorusGeometry(0.75, 0.018, 6, 24, 0.9), dark, sx * 0.22, 0.78, 0, rg);
      rk.rotation.set(0, Math.PI / 2, -Math.PI / 2 - 0.45);
      box(0.035, 0.42, 0.035, dark, sx * 0.22, 0.25, 0.18, rg);
      box(0.035, 0.95, 0.035, dark, sx * 0.22, 0.52, -0.2, rg).rotation.x = -0.18;
      box(0.04, 0.03, 0.42, dark, sx * 0.24, 0.62, 0.0, rg);                // arm rest
    }
    box(0.46, 0.035, 0.42, pale, 0, 0.44, 0, rg);
    for (let k = 0; k < 4; k++) box(0.44, 0.05, 0.02, pale, 0, 0.62 + k * 0.14, -0.22 - k * 0.025, rg).rotation.x = -0.18;
    put(new THREE.BoxGeometry(0.40, 0.08, 0.38), quilt, 0, 0.50, 0.0, rg);   // a folded blanket on the seat
    // a round cushion on the rug where the dog sleeps
    const cushion = put(new THREE.TorusGeometry(0.30, 0.09, 10, 26), new THREE.MeshStandardMaterial({ color: 0x7a5a44, roughness: 1 }), 0.15, 0.07, -0.62);
    cushion.rotation.x = -Math.PI / 2;
    cushion.scale.set(1, 1.25, 0.8);
    put(new THREE.CircleGeometry(0.30, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9a7a5c, roughness: 1 }), 0.15, 0.05, -0.62);
  }

  /* lights: the fire (the shadow caster), the candle, the daylight from each window, a little sky fill */
  const fireLight = new THREE.PointLight(0xff8a3c, 0, 9, 2);
  fireLight.position.copy(fireAt);
  room.add(fireLight);
  if (shadows) {
    fireLight.castShadow = true;
    fireLight.shadow.mapSize.set(opts.shadowSize || 512, opts.shadowSize || 512);
    fireLight.shadow.camera.near = 0.05;
    fireLight.shadow.camera.far = 9;
    fireLight.shadow.bias = -0.004;
    fireLight.shadow.normalBias = 0.02;
    fireLight.shadow.radius = 3;
  }
  const windowLights = [];
  for (const [px, pz, tx, tz] of [[-IW - 0.6, -1.45, -0.2, -1.2], [-IW - 0.6, 1.35, -0.2, 1.0], [0.95, IL + 0.6, 0.7, 0.8]]) {
    const s = new THREE.SpotLight(0xdfe8ff, 0, 9, 0.75, 0.9, 1.6);
    s.position.set(px, 2.05, pz);
    s.target.position.set(tx, 0, tz);
    room.add(s, s.target);
    windowLights.push(s);
  }
  const fill = new THREE.HemisphereLight(0xbfd2e8, 0x5a4030, 0);
  room.add(fill);
  // firelight that has bounced off the floor and the ceiling: soft, everywhere, no shadow
  const bounce = new THREE.PointLight(0xff9a5a, 0, 8, 1.2);
  bounce.position.set(STOVE.x - 0.4, 2.0, STOVE.z + 1.4);
  room.add(bounce);
  // the corner behind the stove: the stove body stands between it and the flame, so at night it
  // fell to black. Iron and the pipe give off a dull warmth, and the fire's light comes down off
  // the ceiling there: a weak warm lamp up behind the stove, no shadow, short reach.
  const stoveFill = new THREE.PointLight(0xff9c62, 0, 3.2, 1.6);
  stoveFill.position.set(STOVE.x + 0.45, 1.45, STOVE.z - 0.75);
  room.add(stoveFill);
  const lights = [fireLight, candleLight, fill, bounce, stoveFill, ...windowLights];

  // every mesh and light of the room, and nothing else, is on the room's layer
  room.traverse((o) => {
    o.layers.set(ROOM_LAYER);
    if (o.isMesh && !o.userData.glow) {
      o.castShadow = shadows && !o.userData.floor;
      o.receiveShadow = shadows;
    }
  });

  /* ---------- placing things and people in the room ---------- */
  const g = cabin.group;
  const c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y);
  const floorY = g.position.y + 0.012;
  const toWorld = (lx, lz) => [g.position.x + c * lx + s * lz, g.position.z - s * lx + c * lz];
  const toLocal = (x, z) => { const dx = x - g.position.x, dz = z - g.position.z; return [c * dx - s * dz, s * dx + c * dz]; };
  // what you cannot walk through, in the room's own frame: [minX, maxX, minZ, maxZ]
  const SOLID = [
    [-IW, -IW + 1.0, -IL, -IL + 2.1],                  // bed
    [-IW, TABLE.x + 0.46, TABLE.z - 0.66, TABLE.z + 0.66],   // table (the chair is pushed in under it as you pass)
    [STOVE.x - 0.62, STOVE.x + 1.15, STOVE.z - 0.55, STOVE.z + 0.55],   // stove, hearth, wood basket
    [1.30, IW, 0.05, 0.80],                            // rocking chair
  ];
  /** keep a point r metres clear of the walls and the furniture (world in, world out) */
  function confine(x, z, r = 0.3) {
    let [lx, lz] = toLocal(x, z);
    lx = Math.max(-IW + r, Math.min(IW - r, lx));
    lz = Math.max(-IL + r, Math.min(IL - r, lz));
    for (const [x0, x1, z0, z1] of SOLID) {
      const a = x0 - r, b = x1 + r, cc = z0 - r, d = z1 + r;
      if (lx > a && lx < b && lz > cc && lz < d) {
        const pushes = [[lx - a, a, lz], [b - lx, b, lz], [lz - cc, lx, cc], [d - lz, lx, d]];
        pushes.sort((p, q) => p[0] - q[0]);
        for (const [, px, pz] of pushes) {
          if (px > -IW + r - 1e-3 && px < IW - r + 1e-3 && pz > -IL + r - 1e-3 && pz < IL - r + 1e-3) { lx = px; lz = pz; break; }
        }
      }
    }
    return toWorld(lx, lz);
  }
  const yawOf = (lx, lz) => {                         // the walker's yaw (degrees) for a direction in the room's frame
    const [wx, wz] = [c * lx + s * lz, -s * lx + c * lz];
    return Math.atan2(wx, -wz) * 180 / Math.PI;
  };
  const [ex, ez] = toWorld(-0.70, 2.45);
  const [dx, dz] = toWorld(0.12, -0.66);
  const [fx, fz] = toWorld(fireAt.x, fireAt.z);
  const [tx, tz] = toWorld(TABLE.x, TABLE.z);

  /* ---------- light of the hour ---------- */
  const _lo = new THREE.Color(), _hi = new THREE.Color();
  function update(dt, time, env) {
    const { day, dusk, sunCol, frames } = env;
    const flick = 0.82 + 0.10 * Math.sin(time * 11.3) + 0.06 * Math.sin(time * 23.7 + 1.0) + 0.05 * Math.sin(time * 5.1 + 2.0);
    const level = 0.75 + 0.25 * (1 - day);           // a bigger fire in the evening
    fireLight.intensity = 16 * level * flick;
    // the flame moves, and the shadows it throws shift with it
    fireLight.position.set(fireAt.x + Math.sin(time * 3.7) * 0.025, fireAt.y + Math.sin(time * 5.3) * 0.02, fireAt.z + Math.sin(time * 2.9 + 1.0) * 0.02);
    flameMat.uniforms.uTime.value = time;
    flameMat.uniforms.uLevel.value = level;
    const night = 1 - day;
    candleLight.intensity = 3.0 * night * (0.92 + 0.08 * Math.sin(time * 9.0));
    candleFlame.visible = night > 0.05;
    // the windows: what they show, and the daylight they let in
    const warm = dusk;
    _lo.setRGB(0.020, 0.035, 0.060).lerp(_hi.setRGB(1.25, 1.35, 1.45), day).lerp(_hi.setRGB(1.5, 0.75, 0.42), warm * 0.8);
    const lo = _lo.clone();
    _hi.setRGB(0.006, 0.012, 0.025).lerp(_lo.setRGB(0.55, 0.80, 1.30), day).lerp(_lo.setRGB(0.45, 0.32, 0.62), warm * 0.7);
    const land = new THREE.Color(0.004, 0.007, 0.006).lerp(new THREE.Color(0.28, 0.42, 0.16), day);
    if (env.snow) land.lerp(new THREE.Color(0.9, 0.95, 1.05), env.snow * day);
    for (const m of views) { m.uniforms.uSkyLo.value.set(lo.r, lo.g, lo.b); m.uniforms.uSkyHi.value.set(_hi.r, _hi.g, _hi.b); m.uniforms.uLand.value.set(land.r, land.g, land.b); }
    for (const l of windowLights) {
      l.intensity = 26 * day + 6 * warm;
      l.color.setRGB(0.80 + 0.2 * sunCol[0] / 3, 0.86 + 0.1 * sunCol[1] / 3, 1.0).lerp(_lo.setRGB(1.0, 0.62, 0.40), warm * 0.8);
    }
    fill.intensity = 0.45 + 1.1 * day;
    bounce.intensity = 3.4 * level * (0.9 + 0.1 * flick);
    stoveFill.intensity = 1.8 * level * (0.95 + 0.05 * flick);
    void dt; void frames;
  }

  return {
    group: room, lights, fireLight, floorY, confine, toWorld, toLocal, update, yawOf,
    entry: { x: ex, z: ez, yaw: yawOf(0.25, -1) },
    dogSpot: { x: dx, z: dz },
    // the cat: by night on the folded blanket of the rocking chair (seat top 0.53 m above the
    // floor, facing the way the chair faces), by day on the rug nearer the stove
    chair: (() => { const [x, z] = toWorld(1.62, 0.42); return { x, z, y: 0.528, yaw: g.rotation.y + 2.5 }; })(),
    catSpot: (() => { const [x, z] = toWorld(0.78, -0.32); return { x, z }; })(),
    fire: { x: fx, z: fz },
    table: { x: tx, z: tz },
  };
}
