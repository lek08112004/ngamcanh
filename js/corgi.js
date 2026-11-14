// Bơ, the camp corgi. Built like the walking companions, from capsules and spheres hung on
// pivots, so the legs, head, ears and tail can move; long low body, short legs, upright ears,
// a stub of a tail. The coat is two-tone, red-gold with a cream belly, bib, socks and blaze:
// painted into vertex colours from where each vertex sits on the dog, not a bitmap. On medium
// and high the coat has a sheen (a velvety rim, as short fur has); on low it is plain.
//
// It walks with a four-beat gait (each foot on its own beat: left hind, left fore, right hind,
// right fore) and trots on diagonals when it hurries; the body bobs twice a stride, the head
// counters the bob, the tail wags all the while it is content, and the ears turn to you.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
const BODY_Y = 0.27;

/* ---------- the coat ---------- */
const RED = new THREE.Color('#9c4c18'), SADDLE = new THREE.Color('#6a3311'), CREAM = new THREE.Color('#e4d6bf');
const TIP = new THREE.Color('#5a3218'), PINK = new THREE.Color('#d9a08e');
/** colour of the coat at p (dog space at rest: x right, y up, z forward, metres above the ground) */
function coat(p, part, out) {
  out.copy(RED);
  // a darker saddle along the top of the back
  if (part === 'torso' || part === 'rump' || part === 'neck') out.lerp(SADDLE, 0.5 * smooth(0.33, 0.39, p.y) * smooth(0.10, 0.02, Math.abs(p.x) - 0.02));
  let white = 0;
  if (part === 'torso' || part === 'rump' || part === 'chest' || part === 'neck') {
    white = Math.max(white, smooth(0.215, 0.165, p.y));                                // belly
    white = Math.max(white, smooth(0.17, 0.27, p.z) * smooth(0.47, 0.36, p.y));         // bib: chest and throat
  }
  if (part === 'head' || part === 'muzzle') {
    white = Math.max(white, smooth(0.355, 0.40, p.z));                                  // muzzle
    white = Math.max(white, smooth(0.032, 0.012, Math.abs(p.x)) * smooth(0.30, 0.345, p.z) * smooth(0.545, 0.50, p.y));   // blaze
    white = Math.max(white, smooth(0.435, 0.405, p.y) * smooth(0.27, 0.31, p.z));       // under the jaw
  }
  if (part === 'legF') white = Math.max(0.72, smooth(0.15, 0.09, p.y));                 // forelegs mostly white
  if (part === 'legH') white = smooth(0.13, 0.07, p.y);                                 // socks behind
  if (part === 'paw') white = 1;
  if (part === 'tail') white = smooth(0.335, 0.30, p.y) * 0.6;
  out.lerp(CREAM, white);
  if (part === 'ear') out.lerp(TIP, smooth(0.56, 0.64, p.y));                           // dark rims to the ear tips
  if (part === 'earIn') out.copy(PINK).lerp(CREAM, 0.35);
  return out;
}
function paint(mesh, part, root, seed) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position, n = pos.count;
  const col = new Float32Array(n * 3), v = new THREE.Vector3(), c = new THREE.Color();
  mesh.updateWorldMatrix(true, false);
  const m = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(m);
    coat(v, part, c);
    // a faint unevenness, as a coat lies a little differently everywhere
    const j = 0.94 + 0.12 * (Math.sin(v.x * 173 + v.y * 311 + v.z * 241 + seed) * 0.5 + 0.5);
    col[i * 3] = c.r * j; col[i * 3 + 1] = c.g * j; col[i * 3 + 2] = c.b * j;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/* ---------- the model ---------- */
function build(rich) {
  const fur = rich
    ? new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.82, sheen: 0.7, sheenRoughness: 0.45, sheenColor: new THREE.Color(0.75, 0.55, 0.36) })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0b0807, roughness: 0.22 });
  const tongueMat = new THREE.MeshStandardMaterial({ color: 0xc45a62, roughness: 0.4 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0x9c2230, roughness: 0.6 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd2a446, roughness: 0.3, metalness: 0.9 });

  const root = new THREE.Group();
  root.name = 'corgi';
  const body = new THREE.Group();
  body.position.y = BODY_Y;
  root.add(body);
  const painted = [];
  const add = (parent, geo, mat, part, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    parent.add(m);
    if (part) painted.push([m, part]);
    return m;
  };
  const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const capZ = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 16).rotateX(Math.PI / 2);

  const torso = add(body, capZ(0.112, 0.30), fur, 'torso', 0, 0, 0, 1, 0.95, 1);
  add(body, new THREE.SphereGeometry(0.118, 20, 14), fur, 'rump', 0, 0.005, -0.18, 1, 0.95, 0.95);
  add(body, new THREE.SphereGeometry(0.112, 20, 14), fur, 'chest', 0, -0.005, 0.16, 0.95, 1.05, 1);
  // neck and head
  const neck = pivot(body, 0, 0.05, 0.21);
  add(neck, new THREE.CapsuleGeometry(0.072, 0.08, 6, 14), fur, 'neck', 0, 0.06, 0.045).rotation.x = 0.75;
  const collar = add(neck, new THREE.TorusGeometry(0.076, 0.011, 8, 28), collarMat, null, 0, 0.035, 0.03);
  collar.rotation.x = Math.PI / 2 + 0.75;
  add(neck, new THREE.CylinderGeometry(0.016, 0.016, 0.004, 12), brass, null, 0, -0.03, 0.095).rotation.x = Math.PI / 2 - 0.4;
  const head = pivot(neck, 0, 0.13, 0.08);
  add(head, new THREE.SphereGeometry(0.088, 22, 16), fur, 'head', 0, 0, 0, 1, 0.88, 1);
  add(head, new THREE.SphereGeometry(0.072, 20, 14), fur, 'head', 0, -0.035, 0.035, 1.12, 0.8, 1);
  add(head, capZ(0.036, 0.05), fur, 'muzzle', 0, -0.04, 0.095, 1.1, 0.85, 1);
  add(head, new THREE.SphereGeometry(0.019, 12, 10), black, null, 0, -0.026, 0.148, 1.2, 0.85, 0.9);
  const eyes = [-1, 1].map((sx) => add(head, new THREE.SphereGeometry(0.0125, 12, 10), black, null, sx * 0.040, 0.010, 0.071));
  const tongue = add(head, new THREE.SphereGeometry(0.03, 12, 8), tongueMat, null, 0, -0.077, 0.112, 0.75, 0.25, 1.1);
  tongue.visible = false;
  const ears = [-1, 1].map((sx) => {
    const e = pivot(head, sx * 0.046, 0.056, -0.014);
    add(e, new THREE.ConeGeometry(0.043, 0.118, 14).translate(0, 0.059, 0), fur, 'ear', 0, 0, 0, 1, 1, 0.5);
    add(e, new THREE.ConeGeometry(0.029, 0.08, 12).translate(0, 0.042, 0), fur, 'earIn', 0, 0.004, 0.012, 1, 1, 0.3);
    e.userData.side = sx;
    return e;
  });
  // legs: a pivot at shoulder or hip, a second at the wrist or hock
  const legs = [];
  for (const [fx, fz, front] of [[-1, 0.16, true], [1, 0.16, true], [-1, -0.17, false], [1, -0.17, false]]) {
    const hip = pivot(body, fx * (front ? 0.068 : 0.070), front ? -0.03 : -0.02, fz);
    const part = front ? 'legF' : 'legH';
    if (!front) add(hip, new THREE.SphereGeometry(0.062, 14, 10), fur, 'legH', 0, -0.035, 0, 0.75, 1.15, 1.05);
    add(hip, new THREE.CapsuleGeometry(0.036, 0.06, 4, 12), fur, part, 0, -0.055, 0);
    const knee = pivot(hip, 0, front ? -0.11 : -0.115, 0);
    add(knee, new THREE.CapsuleGeometry(0.030, 0.05, 4, 12), fur, part, 0, -0.05, 0);
    add(knee, new THREE.SphereGeometry(0.033, 12, 10), fur, 'paw', 0, -0.10, 0.012, 1, 0.7, 1.25);
    legs.push({ hip, knee, front, side: fx });
  }
  // the tail: a stub that wags side to side, tipped up and back
  const tailWag = pivot(body, 0, 0.06, -0.285);
  const tailTilt = pivot(tailWag, 0, 0, 0);
  tailTilt.rotation.x = -0.75;
  add(tailTilt, new THREE.CapsuleGeometry(0.038, 0.035, 4, 12), fur, 'tail', 0, 0.035, 0);

  root.updateMatrixWorld(true);
  let k = 0;
  for (const [m, part] of painted) paint(m, part, root, k++);
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  return { root, body, torso, neck, head, eyes, tongue, ears, legs, tailWag, tailTilt, meshes };
}

/* ---------- poses ---------- */
// h: height of the body pivot; pitch: + nose down; legF/legH: base swing of fore and hind legs
// (+ = foot back); kneeF/kneeH: bend at wrist and hock; head: + nose down; ear: + laid back
const POSES = {
  stand: { h: BODY_Y, pitch: 0, roll: 0, legF: 0, legH: 0, kneeF: 0, kneeH: 0, head: 0.05, ear: 0.0 },
  sit: { h: 0.19, pitch: -0.62, roll: 0, legF: 0.62, legH: -1.3, kneeF: 0.05, kneeH: 1.95, head: 0.05, ear: 0.0 },
  lie: { h: 0.135, pitch: 0.02, roll: 0, legF: -1.32, legH: -1.25, kneeF: 0.25, kneeH: 1.9, head: 0.12, ear: 0.25 },
  sleep: { h: 0.128, pitch: 0.03, roll: 0.10, legF: -1.36, legH: -1.3, kneeF: 0.3, kneeH: 1.95, head: 0.62, ear: 0.55 },
};
const KEYS = Object.keys(POSES.stand);

/**
 * opts: { rich: sheen on the coat, low: pose at half rate, home: {x, z, r} }
 * update(dt, time, ctx) where ctx = { px, pz: where the player stands, moving: whether they walk,
 *   night, indoor, room (cabinroom api, when indoor), rest: {x, z} the place to lie down outdoors at night,
 *   ground(x, z), blocks: [[x, z, r]], camY: eye height (for the head to look up) }
 */
export function createCorgi(opts = {}) {
  const m = build(!!opts.rich);
  const home = opts.home || { x: 0, z: 0, r: 8 };
  const dog = {
    group: m.root, meshes: m.meshes, name: 'Bơ',
    x: home.x, z: home.z, y: 0, heading: 0, speed: 0,
    state: 'idle', timer: 2, target: null, run: 0,
    phase: 0, wagPhase: 0, wag: 0.25, happy: 0, hop: 0, pant: 0,
    blink: 3, look: 0, lookPitch: 0, tilt: 0, sniff: 0,
    pose: { ...POSES.stand }, want: 'stand',
    comeCool: 0, inside: false, frame: 0, petCount: 0,
  };
  const groundY = (ctx, x, z) => (ctx.indoor && ctx.room ? ctx.room.floorY : ctx.ground(x, z));
  function goTo(x, z, run) { dog.target = { x, z }; dog.run = run; }
  function pick(ctx) {
    // somewhere near home that is not inside a rock or the tent
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TAU, r = home.r * Math.sqrt(Math.random());
      const x = home.x + Math.cos(a) * r, z = home.z + Math.sin(a) * r;
      if (!ctx.blocks.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br + 0.4)) return [x, z];
    }
    return [home.x, home.z];
  }
  function setState(s, t) { dog.state = s; dog.timer = t; }

  /** petted: up on its feet, a hop or two, a tail going like a propeller */
  dog.pet = () => {
    dog.happy = 2.8; dog.hop = 1.0; dog.pant = 6;
    dog.petCount++;
    setState('happy', 2.8);
    dog.target = null;
  };
  dog.distanceTo = (x, z) => Math.hypot(x - dog.x, z - dog.z);
  /** put the dog somewhere at once (through a door, under a fade) */
  dog.place = (x, z, heading, state = 'idle', t = 2) => {
    dog.x = x; dog.z = z; dog.heading = heading; dog.speed = 0; dog.target = null;
    setState(state, t);
    if (state === 'sleep' || state === 'lie') { dog.want = state; Object.assign(dog.pose, POSES[state]); }
  };

  /* ---------- deciding what to do ---------- */
  function think(dt, ctx) {
    const dP = Math.hypot(ctx.px - dog.x, ctx.pz - dog.z);
    dog.timer -= dt;
    dog.comeCool -= dt;
    dog.withYou = Math.max(0, (dog.withYou || 0) - dt);
    const last = dog.lastDP;
    dog.lastDP = dP;
    if (dog.happy > 0) {
      dog.happy -= dt;
      if (dog.happy <= 0) setState('sit', 7 + Math.random() * 5);
      return dP;
    }
    if (ctx.indoor) {
      // in the cabin: by night it sleeps on its cushion by the stove; by day it stays near you
      const spot = ctx.room.dogSpot;
      if (ctx.night) {
        if (Math.hypot(spot.x - dog.x, spot.z - dog.z) > 0.25) { if (dog.state !== 'walk') goTo(spot.x, spot.z, 0); setState('walk', 9); }
        else if (dog.state !== 'sleep' && dog.state !== 'lie') setState('lie', 5);
        else if (dog.state === 'lie' && dog.timer <= 0) setState('sleep', 999);
        return dP;
      }
      if (dP > 2.4 && dog.state !== 'walk') { const t = ctx.room.confine(mix(dog.x, ctx.px, 0.6), mix(dog.z, ctx.pz, 0.6), 0.3); goTo(t[0], t[1], 0); setState('walk', 6); }
      else if (dog.state === 'walk' && !dog.target) setState('sit', 6 + Math.random() * 6);
      else if (dog.timer <= 0 && dog.state !== 'walk') setState(Math.random() < 0.5 ? 'sit' : 'lie', 6 + Math.random() * 8);
      return dP;
    }
    if (ctx.night) {
      // by night it lies down by the fire (or on the porch when the fire is out)
      const r = ctx.rest;
      const dR = Math.hypot(r.x - dog.x, r.z - dog.z);
      if (dR > 0.6) { if (dog.state !== 'walk' || !dog.target) { goTo(r.x, r.z, dR > 8 ? 1 : 0); setState('walk', 30); } }
      else if (dog.state === 'walk' || dog.state === 'idle' || dog.state === 'sit') setState('lie', 8);
      else if (dog.state === 'lie' && dog.timer <= 0 && dP > 3.5) setState('sleep', 999);
      else if (dog.state === 'sleep' && dP < 2.2) setState('lie', 6);                // it hears you coming and looks up
      return dP;
    }
    const fromHome = Math.hypot(ctx.px - home.x, ctx.pz - home.z);
    switch (dog.state) {
      case 'come':
      case 'follow':
        if (fromHome > home.r + 26) { const [x, z] = pick(ctx); goTo(x, z, 0); setState('walk', 20); break; }
        if (dP < 1.5) { dog.target = null; setState('sit', dog.state === 'come' ? 7 + Math.random() * 6 : 3 + Math.random() * 3); dog.comeCool = 40; dog.withYou = 45; break; }
        if (dog.timer <= 0) { setState('idle', 2); break; }
        {
          const k = 1.25 / dP;                           // stop a step short of the player, on the near side
          goTo(ctx.px + (dog.x - ctx.px) * k, ctx.pz + (dog.z - ctx.pz) * k, dP > 4 ? 1 : 0.3);
        }
        break;
      default: {
        // you arrive (or it has not seen you for a while): it trots over to say hello
        const arrived = dP < 9 && (last === undefined || last >= 9);       // the first sight of you counts too
        const checkIn = dP < 9 && dog.comeCool <= 0 && Math.random() < dt / 25;
        if ((arrived || checkIn) && fromHome < home.r + 24 && dP > 2.2) { setState('come', 12); break; }
        // you walk off while it is sitting with you: it follows a little way, then lets you go
        if (dog.withYou > 0 && (dog.state === 'sit' || dog.state === 'idle') && dP > 3.2 && dP < 14 && fromHome < home.r + 24) { setState('follow', 10); break; }
        if (dog.state === 'walk' && !dog.target) setState('idle', 2 + Math.random() * 3);
        if (dog.timer > 0) break;
        if (dog.state === 'idle') {
          const r = Math.random();
          if (r < 0.55) { const [x, z] = pick(ctx); goTo(x, z, Math.random() < 0.15 ? 1 : 0); setState('walk', 25); }
          else if (r < 0.8) setState('sit', 5 + Math.random() * 6);
          else setState('lie', 7 + Math.random() * 8);
        } else setState('idle', 2 + Math.random() * 3);
      }
    }
    return dP;
  }

  /* ---------- moving ---------- */
  function move(dt, ctx) {
    let want = 0;
    if (dog.target) {
      const dx = dog.target.x - dog.x, dz = dog.target.z - dog.z, d = Math.hypot(dx, dz);
      if (d < 0.12) dog.target = null;
      else {
        const turn = wrap(Math.atan2(dx, dz) - dog.heading);
        const rate = mix(3.2, 5.5, dog.run);
        dog.heading = wrap(dog.heading + clamp(turn, -rate * dt, rate * dt));
        // slow for sharp turns and on arrival, as a dog does
        want = mix(0.85, 2.3, dog.run) * clamp(d / 0.8, 0.25, 1) * (1 - 0.7 * smooth(0.6, 1.6, Math.abs(turn)));
      }
    }
    dog.speed += (want - dog.speed) * (1 - Math.exp(-dt * (want > dog.speed ? 4 : 6)));
    if (dog.speed < 0.01) dog.speed = 0;
    let nx = dog.x + Math.sin(dog.heading) * dog.speed * dt, nz = dog.z + Math.cos(dog.heading) * dog.speed * dt;
    if (ctx.indoor && ctx.room) [nx, nz] = ctx.room.confine(nx, nz, 0.26);
    else {
      for (const [bx, bz, br] of ctx.blocks) {
        const ox = nx - bx, oz = nz - bz, d = Math.hypot(ox, oz), rr = br + 0.15;
        if (d < rr && d > 1e-4) { nx = bx + (ox / d) * rr; nz = bz + (oz / d) * rr; }
      }
    }
    // never underfoot
    const ox = nx - ctx.px, oz = nz - ctx.pz, d = Math.hypot(ox, oz);
    if (d < 0.75 && d > 1e-4) { nx = ctx.px + (ox / d) * 0.75; nz = ctx.pz + (oz / d) * 0.75; }
    if (dog.target && Math.hypot(nx - dog.x, nz - dog.z) < dog.speed * dt * 0.2 && dog.speed > 0.3) dog.stuck = (dog.stuck || 0) + dt;
    else dog.stuck = 0;
    if (dog.stuck > 1.2) { dog.target = null; dog.stuck = 0; }           // walked into something: give up on that spot
    dog.x = nx; dog.z = nz;
  }

  /* ---------- the body ---------- */
  const _sp = {};
  function animate(dt, time, ctx, dP) {
    const p = dog.pose;
    // which resting pose the state asks for; moving always stands
    let want = dog.state === 'sit' ? 'sit' : dog.state === 'lie' ? 'lie' : dog.state === 'sleep' ? 'sleep' : 'stand';
    if (dog.speed > 0.08 || dog.happy > 0) want = 'stand';
    const tgt = POSES[want];
    const k = 1 - Math.exp(-dt * (want === 'stand' ? 6 : 3.2));
    for (const key of KEYS) p[key] += (tgt[key] - p[key]) * k;

    const move = clamp(dog.speed / 0.6, 0, 1);
    const run = clamp((dog.speed - 1.0) / 1.0, 0, 1);
    const stride = mix(0.36, 0.62, run);
    dog.phase = (dog.phase + dt * dog.speed / stride) % 1;
    const duty = mix(0.62, 0.5, run);
    const A = mix(0.34, 0.48, run) * move;
    // walk: left hind, left fore, right hind, right fore; trot: diagonal pairs together
    const offs = [[0.25, 0], [0.75, 0.5], [0, 0.5], [0.5, 0]];       // LF, RF, LH, RH : [walk, trot]
    m.legs.forEach((leg, i) => {
      const s = (dog.phase + mix(offs[i][0], offs[i][1], run)) % 1;
      let ang, bend = 0;
      if (s < duty) ang = mix(-A, A, s / duty);
      else { const u = (s - duty) / (1 - duty); ang = mix(A, -A, u * u * (3 - 2 * u)); bend = Math.sin(u * Math.PI) * mix(0.9, 1.25, run) * move; }
      leg.hip.rotation.x = (leg.front ? p.legF : p.legH) + ang;
      leg.knee.rotation.x = (leg.front ? p.kneeF : p.kneeH) + bend * (leg.front ? 1 : 0.8);
    });
    // body: the ground's slope, a bob twice a stride, a sway once, and a hop when it is glad
    const ahead = groundY(ctx, dog.x + Math.sin(dog.heading) * 0.22, dog.z + Math.cos(dog.heading) * 0.22);
    const behind = groundY(ctx, dog.x - Math.sin(dog.heading) * 0.22, dog.z - Math.cos(dog.heading) * 0.22);
    const slope = Math.atan2(ahead - behind, 0.44);
    const bob = -0.011 * Math.cos(dog.phase * TAU * 2) * move;
    let hop = 0;
    if (dog.hop > 0) { dog.hop -= dt / 1.3; hop = Math.abs(Math.sin((1 - dog.hop) * Math.PI * 3)) * 0.05 * dog.hop; }
    m.body.position.y = p.h + bob + hop;
    m.body.rotation.x = p.pitch - slope * (want === 'stand' ? 1 : 0.4) + 0.025 * Math.sin(dog.phase * TAU * 2) * run;
    m.body.rotation.z = p.roll + 0.035 * Math.sin(dog.phase * TAU) * move * (1 - run);
    // tail: wags whenever it is content, harder when glad, still when asleep
    const wagWant = dog.state === 'sleep' ? 0 : dog.happy > 0 ? 0.95 : dP < 4 ? 0.55 : dog.state === 'lie' ? 0.12 : 0.3;
    dog.wag += (wagWant - dog.wag) * (1 - Math.exp(-dt * 3));
    dog.wagPhase += dt * mix(7, 17, dog.wag);
    const wagNow = Math.sin(dog.wagPhase) * dog.wag;
    m.tailWag.rotation.y = wagNow * 0.9;
    m.tailTilt.rotation.x = -0.75 - 0.25 * dog.wag;
    m.body.rotation.y = -0.05 * wagNow;                              // the whole rear end joins in
    // head: looks at you when you are near (up to your eyes), sniffs the ground now and then
    let look = 0, lookUp = 0;
    if (dP < 7 && dog.state !== 'sleep') {
      look = wrap(Math.atan2(ctx.px - dog.x, ctx.pz - dog.z) - dog.heading);
      lookUp = -Math.atan2((ctx.camY || 1.6) - 0.45, Math.max(dP, 0.5)) * 0.8;
      if (Math.abs(look) > 1.2 && dog.speed < 0.05 && (dog.state === 'sit' || dog.state === 'idle' || dog.state === 'happy')) {
        dog.heading = wrap(dog.heading + clamp(look, -1, 1) * dt * 2.2);     // turn round to face you
      }
      look = clamp(look, -1.1, 1.1);
    } else if (dog.state === 'idle' || dog.state === 'sit' || dog.state === 'lie') {
      look = Math.sin(time * 0.37 + 1.3) * 0.7 + Math.sin(time * 0.91) * 0.25;   // watching the camp go by
    }
    dog.sniff = dog.state === 'idle' && dP > 4 ? smooth(0.6, 0.9, Math.sin(time * 0.53 + 2.0)) : dog.state === 'walk' && dog.run < 0.5 ? smooth(0.7, 0.95, Math.sin(time * 0.71)) * 0.6 : 0;
    dog.look += (look - dog.look) * (1 - Math.exp(-dt * 4));
    dog.lookPitch += (lookUp - dog.lookPitch) * (1 - Math.exp(-dt * 4));
    // a curious tilt of the head now and then while you stand near
    const tiltWant = dP < 3 && dog.state === 'sit' && Math.sin(time * 0.6) > 0.7 ? 0.28 : 0;
    dog.tilt += (tiltWant - dog.tilt) * (1 - Math.exp(-dt * 5));
    m.neck.rotation.y = dog.look * 0.55;
    m.head.rotation.y = dog.look * 0.45;
    m.neck.rotation.x = 0.55 * dog.sniff * (want === 'stand' ? 1 : 0);
    m.head.rotation.x = p.head - p.pitch * 0.7 + dog.lookPitch * (1 - dog.sniff) + 0.06 * Math.sin(dog.phase * TAU * 2 + 0.6) * move + 0.4 * dog.sniff;
    m.head.rotation.z = dog.tilt;
    // ears: up and turned to you when it listens, laid back when it runs or sleeps
    const earBack = p.ear + 0.35 * run - (dP < 6 ? 0.08 : 0);
    for (const e of m.ears) {
      const sx = e.userData.side;
      e.rotation.set(-earBack + 0.07 * Math.sin(dog.phase * TAU * 2) * move, clamp(dog.look * 0.5, -0.4, 0.4) - sx * 0.1, -sx * 0.30);
    }
    // breath: slow at rest, a pant after running or when glad, the tongue out
    if (dog.speed > 1.6) dog.pant = Math.max(dog.pant, 4);
    dog.pant = Math.max(0, dog.pant - dt);
    const panting = dog.pant > 0 && dog.state !== 'sleep';
    const br = panting ? Math.sin(time * 15) * 0.018 : Math.sin(time * (dog.state === 'sleep' ? 1.3 : 2.2)) * 0.012;
    m.torso.scale.set(1 + br, 0.95 + br, 1);
    m.tongue.visible = panting;
    // eyes: a blink every few seconds, shut when asleep
    dog.blink -= dt;
    if (dog.blink < -0.13) dog.blink = 2.5 + Math.random() * 4;
    const shut = dog.state === 'sleep' || dog.blink < 0;
    for (const e of m.eyes) e.scale.y = shut ? 0.12 : 1;
    void _sp;
  }

  /** for the test tools: walk (run 0) or trot (run 1) to a point, ignoring everything else */
  dog.walkTo = (x, z, run = 0) => { dog.scripted = true; goTo(x, z, run); setState('walk', 99); };
  /** for the test tools: hold a resting pose (sit, lie, sleep) where it is */
  dog.hold = (state) => { dog.scripted = true; dog.target = null; setState(state, 99); };
  dog.free = () => { dog.scripted = false; setState('idle', 1); };

  dog.update = (dt, time, ctx) => {
    if (ctx.indoor !== dog.inside) dog.inside = ctx.indoor;
    const dP = dog.scripted ? Math.hypot(ctx.px - dog.x, ctx.pz - dog.z) : think(dt, ctx);
    if (dog.scripted && dog.happy > 0) { dog.happy -= dt; if (dog.happy <= 0) setState('sit', 99); }
    move(dt, ctx);
    dog.y = groundY(ctx, dog.x, dog.z);
    m.root.position.set(dog.x, dog.y, dog.z);
    m.root.rotation.y = dog.heading;
    // on low the pose is worked out at half the frame rate
    dog.frame++;
    dog.acc = (dog.acc || 0) + dt;
    if (opts.low && dog.frame % 2) return;
    animate(dog.acc, time, ctx, dP);
    dog.acc = 0;
  };
  return dog;
}
