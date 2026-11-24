// Fishing at the stream and the pond: the rod, line, float, the cast, the bite and the reel.
//
// A small state machine, driven from main.js (which owns the camera, the keys and the UI):
//   off → aim → cast (the float flies) → wait (nibbles, then a bite) → hooked (fight) → landed
//   (the fish in your hands) → release (it swims off) → aim.  Every state can be left with
//   `reelIn()`: the line comes back in half a second and nothing is lost.
// Only the fish on the line exists: no fish are simulated in the water. Which fish bites is drawn
// from fishdata.js when it bites (spot, season, hour); it is only written into the book when it
// is landed (main.js listens for 'landed').
//
// Two ways to play (settings.fishing): 'relaxed' strikes for you if you miss the moment, eases off
// the reel when the fish runs, and the line never parts; 'manual' leaves the strike, the reel and
// the tension to you. Neither asks for rapid tapping: reeling is holding a key or a button.
//
// The water is the painted stream of the terrain (world.js streamX/streamW): the float sits at
// the ground height there. Casts land only on water inside the spot's reach.
import * as THREE from 'three';
import { SPOTS, drawFish } from './fishdata.js';
import { buildFish, SWIM } from './fishmodel.js';
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

export function createFishing({ scene, camera, audio, terrainH, streamX, streamW, rnd = Math.random }) {
  const group = new THREE.Group();
  group.name = 'fishing';
  scene.add(group);

  /* ---------- the places, worked out from the stream ---------- */
  const isWater = (x, z, margin = 0.35) => z < -36 && Math.abs(x - streamX(z)) < streamW(z) - margin;
  const spots = SPOTS.map((s) => {
    const cx = streamX(s.z), w = streamW(s.z);
    const bx = cx + s.side * (w + 1.25), bz = s.z;
    const yaw = Math.atan2(cx - bx, -(s.z - bz)) * 180 / Math.PI;      // facing the water
    return { ...s, x: bx, z: bz, yaw, waterY: terrainH(cx, s.z) };
  });
  const near = (x, z) => {
    let best = null, bd = 2.2;
    for (const s of spots) { const d = Math.hypot(x - s.x, z - s.z); if (d < bd) { bd = d; best = s; } }
    return best;
  };

  /* ---------- the tackle ---------- */
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.55 });
  const blank = new THREE.MeshStandardMaterial({ color: 0x2d3324, roughness: 0.35, metalness: 0.1 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.3, metalness: 0.8 });
  const ROD = 2.7;
  const rod = new THREE.Group();
  {
    // a two-piece rod: cork grip, a tapered blank, a few guides, a small fixed-spool reel
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.32, 10), wood);
    grip.position.y = 0.16; rod.add(grip);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.009, ROD - 0.3, 8), blank);
    b.position.y = 0.3 + (ROD - 0.3) / 2; rod.add(b);
    for (let i = 0; i < 5; i++) {
      const gy = 0.55 + i * (ROD - 0.7) / 5;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.006 - i * 0.0007, 0.0008, 4, 10), metal);
      ring.position.set(0, gy, -0.011); rod.add(ring);
    }
    const reel = new THREE.Group();
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), metal);
    spool.rotation.x = Math.PI / 2; reel.add(spool);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.03), blank);
    body.position.set(0, 0, 0.02); reel.add(body);
    reel.position.set(0, 0.34, 0.035); rod.add(reel);
    rod.userData.spool = spool;
  }
  rod.visible = false;
  group.add(rod);
  const tipLocal = new THREE.Vector3(0, ROD, 0);

  // the float: red cap, white body, a thin antenna; it rides on the water
  const float = new THREE.Group();
  {
    const pts = [[0, -0.03], [0.006, -0.025], [0.012, -0.008], [0.013, 0], [0.011, 0.01], [0.004, 0.022], [0, 0.026]].map(([r, y]) => new THREE.Vector2(r, y));
    const low = new THREE.Mesh(new THREE.LatheGeometry(pts.slice(0, 4), 14), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.4 }));
    const up = new THREE.Mesh(new THREE.LatheGeometry(pts.slice(3), 14), new THREE.MeshStandardMaterial({ color: 0xe0321e, roughness: 0.35, emissive: 0x401006 }));
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.05, 5), new THREE.MeshStandardMaterial({ color: 0xff5a2a, emissive: 0x802008 }));
    ant.position.y = 0.05;
    float.add(low, up, ant);
  }
  float.visible = false;
  group.add(float);

  // the line: a polyline from the rod tip to the float (or the fish's mouth)
  const LN = 28;
  const linePos = new Float32Array(LN * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xe8ecef, transparent: true, opacity: 0.75 }));
  line.frustumCulled = false;
  line.visible = false;
  group.add(line);

  // where the cast will land: a ring on the water (green-gold if it can go there, grey if not)
  const aimRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.27, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.7, depthWrite: false }));
  aimRing.visible = false;
  aimRing.renderOrder = 5;
  group.add(aimRing);
  // rings spreading on the water (a pool of four, reused)
  const ripples = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.renderOrder = 4; m.userData.t = 9;
    group.add(m); ripples.push(m);
  }
  const ripple = (x, z, size = 1) => {
    const m = ripples.reduce((a, b) => (a.userData.t > b.userData.t ? a : b));
    m.position.set(x, terrainH(x, z) + 0.012, z);
    m.userData.t = 0; m.userData.size = size; m.visible = true;
  };

  // the fish in your hands / swimming off: built when it is landed, at most one at a time
  let held = null;

  /* ---------- state ---------- */
  const S = {
    state: 'off', spot: null, mode: 'relaxed', t: 0,
    aim: new THREE.Vector3(), aimOk: false, aimWhy: '',
    from: new THREE.Vector3(), to: new THREE.Vector3(), castT: 0,
    bobber: new THREE.Vector3(),
    biteAt: 0, nibbles: [], biteWindow: 0, bit: false, missed: 0,
    catch: null,                          // { fish, cm } once hooked
    dist: 0, dir: 0, run: 0, runT: 0, restT: 0, energy: 1, tension: 0.2, over: 0, slack: 0, reel: false, reelAcc: 0,
    lateral: 0,
    recent: [], seen: new Set(),
    season: 0, hour: 12,
  };
  const listeners = [];
  const emit = (ev, data) => { for (const f of listeners) f(ev, data); };

  const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _tip = new THREE.Vector3(), _ray = new THREE.Ray(), _plane = new THREE.Plane();
  const ROD_REST = new THREE.Euler(-0.95, 0, -0.18);

  /** where the rod is: held in the right hand, raised in front; `lift` raises it (cast, fight) */
  function placeRod(lift, bend) {
    _v.set(0.26, -0.34, -0.42).applyMatrix4(camera.matrixWorld);
    rod.position.copy(_v);
    rod.quaternion.copy(camera.quaternion);
    rod.rotateX(ROD_REST.x + lift);
    rod.rotateZ(ROD_REST.z);
    rod.scale.set(1, 1 - bend * 0.06, 1);
    rod.updateMatrixWorld();
    _tip.copy(tipLocal).applyMatrix4(rod.matrixWorld);
    // a rod under load bends: pull the tip toward the line a little
    if (bend > 0) _tip.lerp(S.bobber, bend * 0.05);
  }
  function setLine(a, b, sag) {
    for (let i = 0; i < LN; i++) {
      const t = i / (LN - 1);
      linePos[i * 3] = a.x + (b.x - a.x) * t;
      linePos[i * 3 + 1] = a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t);
      linePos[i * 3 + 2] = a.z + (b.z - a.z) * t;
    }
    lineGeo.attributes.position.needsUpdate = true;
  }
  /** keep a point on the water of this spot (a fish never drags the float onto the bank) */
  function keepInWater(p) {
    const cx = streamX(p.z), w = streamW(p.z) - 0.5;
    if (p.z > -37) p.z = -37;
    p.x = clamp(p.x, cx - w, cx + w);
    return p;
  }
  const panOf = (p) => {
    _w.copy(p).sub(camera.position);
    const right = _v.set(1, 0, 0).applyQuaternion(camera.quaternion);
    return clamp(_w.normalize().dot(right), -1, 1);
  };

  function reset() {
    S.state = 'off'; S.spot = null; S.catch = null;
    rod.visible = float.visible = line.visible = aimRing.visible = false;
    if (held) { group.remove(held); held = null; }
  }
  function scheduleBite() {
    // how long until something takes it: a few seconds to about twenty, faster at dawn and dusk
    const part = S.hour >= 4.5 && S.hour < 7.5 || S.hour >= 17 && S.hour < 21 ? 0.75 : 1;
    S.biteAt = S.t + (4 + rnd() * 13) * part;
    S.nibbles = [];
    const n = Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) S.nibbles.push(S.biteAt - 0.6 - rnd() * 3.5);
    S.nibbles.sort((a, b) => a - b);
    S.bit = false;
  }

  const api = {
    group, spots, near, isWater, state: S,
    on(fn) { listeners.push(fn); },
    get active() { return S.state !== 'off'; },
    /** start at a spot: the rod comes out, you aim */
    begin(spot, opts = {}) {
      S.spot = spot; S.mode = opts.mode || 'relaxed'; S.season = opts.season || 0; S.hour = opts.hour || 12;
      if (opts.seen) S.seen = opts.seen;
      S.state = 'aim'; S.t = 0;
      rod.visible = true;
      emit('state', S.state);
    },
    setMode(m) { S.mode = m; },
    /** the aim follows the middle of your view where it meets the water */
    updateAim() {
      if (S.state !== 'aim' || !S.spot) return;
      _ray.origin.copy(camera.position);
      camera.getWorldDirection(_ray.direction);
      _plane.set(_v.set(0, 1, 0), -S.spot.waterY);
      const hit = _ray.intersectPlane(_plane, _w);
      const d = hit ? Math.hypot(hit.x - S.spot.x, hit.z - S.spot.z) : 0;
      if (!hit || _ray.direction.y > -0.02) { S.aimOk = false; S.aimWhy = 'Nhìn xuống mặt nước để chọn chỗ thả'; }
      else if (d > S.spot.reach) { S.aimOk = false; S.aimWhy = 'Xa quá tầm quăng'; }
      else if (d < 1.6) { S.aimOk = false; S.aimWhy = 'Gần bờ quá'; }
      else if (!isWater(hit.x, hit.z)) { S.aimOk = false; S.aimWhy = 'Chỗ đó không phải mặt nước'; }
      else { S.aimOk = true; S.aimWhy = ''; }
      if (hit) {
        S.aim.copy(hit); S.aim.y = terrainH(hit.x, hit.z) + 0.015;
        aimRing.position.copy(S.aim);
        aimRing.visible = !!hit && d < S.spot.reach + 4;
        aimRing.material.color.set(S.aimOk ? 0xffe2a0 : 0x9aa4aa);
        aimRing.material.opacity = S.aimOk ? 0.75 : 0.35;
      } else aimRing.visible = false;
    },
    /** let it fly: returns '' or why not */
    cast() {
      if (S.state !== 'aim') return '';
      if (!S.aimOk) return S.aimWhy;
      placeRod(0.25, 0);
      S.from.copy(_tip); S.to.copy(S.aim);
      S.state = 'cast'; S.castT = 0;
      aimRing.visible = false;
      float.visible = true; line.visible = true;
      audio.castSwish(panOf(S.aim));
      emit('state', S.state);
      return '';
    },
    /** the strike: in time with a bite, the fish is on; otherwise nothing happens but a little wait */
    strike() {
      if (S.state !== 'wait') return '';
      if (S.bit && S.t <= S.biteWindow) { hook(); return ''; }
      // too early: the fish that was nosing the bait swims off; another comes in a while
      scheduleBite();
      S.missed++;
      emit('early');
      return 'Giật sớm quá, phao chưa chìm hẳn. Chờ thêm chút nữa.';
    },
    /** hold to reel (key or button); during a fight it brings the fish in, otherwise the float */
    reel(on) { S.reel = !!on; },
    /** put the fish back */
    release() {
      if (S.state !== 'landed' || !held) return;
      S.state = 'release'; S.t0 = S.t;
      held.userData.from = held.position.clone();
      _w.set(S.spot.x, 0, S.spot.z).lerp(_v.set(streamX(S.spot.z), 0, S.spot.z), 0.55);
      held.userData.to = new THREE.Vector3(_w.x, terrainH(_w.x, _w.z) - 0.02, _w.z);
      emit('state', S.state);
    },
    /** bring everything in (Esc, walking off, the door): safe from any state */
    reelIn() {
      if (S.state === 'off') return;
      if (S.state === 'landed') { this.release(); return; }
      if (held) { group.remove(held); held = null; }
      S.state = 'retrieve'; S.t0 = S.t;
      S.catch = null;
      emit('state', S.state);
    },
    end() { S.leaving = false; reset(); emit('state', 'off'); },
    /** stop fishing altogether: the line comes in first (or the fish goes back), then the rod is put away */
    leave() {
      if (S.state === 'off') return;
      if (S.state === 'aim') { api.end(); return; }
      S.leaving = true;
      if (S.state !== 'retrieve' && S.state !== 'release') api.reelIn();
    },
    /** per frame while active */
    update(dt, time) {
      if (S.state === 'off') return;
      S.t += dt;
      const sp = S.spot;
      switch (S.state) {
        case 'aim': placeRod(0.1, 0); api.updateAim(); line.visible = false; float.visible = false; break;
        case 'cast': {
          S.castT += dt / 0.85;
          const k = sm(S.castT);
          placeRod(0.25 - 0.45 * sm(S.castT * 2), 0);
          S.bobber.lerpVectors(S.from, S.to, k);
          S.bobber.y += Math.sin(Math.min(1, S.castT) * Math.PI) * (1.2 + S.from.distanceTo(S.to) * 0.18);
          float.position.copy(S.bobber);
          setLine(_tip, S.bobber, 0.05);
          if (S.castT >= 1) {
            S.bobber.copy(S.to);
            ripple(S.to.x, S.to.z, 0.8);
            audio.plop(panOf(S.to), 0.35);
            S.state = 'wait';
            scheduleBite();
            emit('state', S.state);
          }
          break;
        }
        case 'wait': {
          placeRod(-0.05, 0);
          const wy = terrainH(S.bobber.x, S.bobber.z) + 0.01;
          let dip = Math.sin(time * 1.7) * 0.004;                 // riding the ripples
          // nibbles: two or three small, quick dips (a ring each)
          while (S.nibbles.length && S.t >= S.nibbles[0]) {
            S.nibbles.shift(); S.nibT = S.t; ripple(S.bobber.x, S.bobber.z, 0.35);
            audio.plop(panOf(S.bobber), 0.12); emit('nibble');
          }
          if (S.nibT && S.t - S.nibT < 0.35) dip -= Math.sin((S.t - S.nibT) / 0.35 * Math.PI) * 0.018;
          // the bite: the float is pulled under and dragged a little; a short window to strike
          if (!S.bit && S.t >= S.biteAt) {
            S.bit = true;
            S.biteWindow = S.t + (S.mode === 'relaxed' ? 2.6 : 1.5);
            S.catch = drawFish(sp.id, S.season, S.hour, rnd, S.recent, S.seen);
            ripple(S.bobber.x, S.bobber.z, 1);
            audio.plop(panOf(S.bobber), 1);
            emit('bite');
          }
          if (S.bit) {
            const k = clamp((S.t - (S.biteWindow - (S.mode === 'relaxed' ? 2.6 : 1.5))) / 0.25, 0, 1);
            dip -= 0.06 * k;
            S.bobber.x += Math.sin(S.t * 2.3) * dt * 0.15;
            keepInWater(S.bobber);
            if (S.t > S.biteWindow) {
              if (S.mode === 'relaxed') hook(true);                // the relaxed way strikes for you
              else { S.bit = false; S.catch = null; scheduleBite(); emit('late'); }
            }
          }
          S.bobber.y = wy + dip;
          float.position.copy(S.bobber);
          setLine(_tip, S.bobber, 0.25);
          break;
        }
        case 'hooked': fight(dt, time); break;
        case 'landed': {
          // the fish held up in front of you, turning slowly, still wriggling
          placeRod(0.45, 0);
          _v.set(-0.03, 0.03, -held.userData.view).applyMatrix4(camera.matrixWorld);
          held.position.lerp(_v, 1 - Math.exp(-dt * 10));
          held.quaternion.copy(camera.quaternion);
          held.rotateY(Math.sin(S.t * 0.6) * 0.3);                  // side on, turning a little each way
          // it wriggles hard at first, then lies quieter in your hands (the body bends: fishmodel SWIM)
          SWIM.uSwimT.value = time;
          SWIM.uSwimOn.value = REDUCED ? 0 : 0.35 + 1.1 * Math.exp(-(S.t - S.t0) * 0.45);
          line.visible = false; float.visible = false;
          break;
        }
        case 'release': {
          const k = clamp((S.t - S.t0) / 1.1, 0, 1);
          placeRod(0.1, 0);
          SWIM.uSwimT.value = time; SWIM.uSwimOn.value = REDUCED ? 0 : 1;
          held.position.lerpVectors(held.userData.from, held.userData.to, sm(k));
          held.position.y += Math.sin(k * Math.PI) * 0.25;
          if (k >= 1) {
            // it slips under and swims off along the bottom, out of sight
            if (!S.swim) { S.swim = S.t; ripple(held.position.x, held.position.z, 0.7); audio.splash(panOf(held.position), 0.5); held.rotation.set(0, Math.atan2(sp.x - streamX(sp.z), 0) + Math.PI, 0); }
            const s = S.t - S.swim;
            held.position.x += (streamX(sp.z) - held.position.x) * dt * 1.5;
            held.position.z -= dt * 0.9;
            held.position.y -= dt * 0.12;
            held.rotation.y += Math.sin(s * 9) * 0.02;
            if (s > 1.6) { group.remove(held); held = null; S.swim = 0; S.state = 'aim'; S.catch = null; emit('released'); if (S.leaving) { api.end(); return; } emit('state', S.state); }
          }
          break;
        }
        case 'retrieve': {
          const k = clamp((S.t - S.t0) / 0.5, 0, 1);
          placeRod(0.2, 0);
          if (float.visible) { S.bobber.lerp(_tip, k); float.position.copy(S.bobber); setLine(_tip, S.bobber, 0.02 * (1 - k)); }
          if (k >= 1) { float.visible = false; line.visible = false; S.state = 'aim'; if (S.leaving) { api.end(); return; } emit('state', S.state); }
          break;
        }
        default: break;
      }
      // ripples spread and fade
      for (const m of ripples) {
        if (!m.visible) continue;
        m.userData.t += dt;
        const t = m.userData.t;
        const r = (0.12 + t * 0.55) * m.userData.size;
        m.scale.setScalar(r);
        m.material.opacity = Math.max(0, 0.45 * (1 - t / 1.6));
        if (t > 1.6) m.visible = false;
      }
    },
  };

  function hook(auto) {
    if (!S.catch) S.catch = drawFish(S.spot.id, S.season, S.hour, rnd, S.recent, S.seen);
    if (!S.catch) { scheduleBite(); return; }
    const { fish, cm } = S.catch;
    S.state = 'hooked'; S.t0 = S.t;
    S.dist = Math.hypot(S.bobber.x - S.spot.x, S.bobber.z - S.spot.z);
    S.dir = Math.atan2(S.bobber.x - S.spot.x, S.bobber.z - S.spot.z);
    S.lateral = 0;                                // each fish starts where the float is (no jump)
    // a big fish is strong and has stamina; a minnow comes in at once
    const k = clamp(cm / 45, 0.08, 1.6);
    S.power = 0.25 + 0.75 * Math.min(1, k);
    S.energy = 0.6 + 2.4 * k;
    S.run = 0; S.runT = 0.5 + rnd(); S.restT = 0; S.tension = 0.3; S.over = 0; S.slack = 0;
    emit('hooked', { auto, fish, cm });
    emit('state', S.state);
    void fish;
  }
  function fight(dt, time) {
    const relaxed = S.mode === 'relaxed';
    // the fish alternates runs and rests; a run pulls line off the reel against the drag
    if (S.run > 0) {
      S.run -= dt;
      S.energy = Math.max(0, S.energy - dt * 0.18);
      S.lateral += dt * S.runDir * 0.35;
      if (S.run <= 0) { S.restT = 1.2 + rnd() * 1.8; }
    } else {
      S.restT -= dt;
      if (S.restT <= 0 && S.energy > 0.05) {
        S.run = (0.8 + rnd() * 1.6) * Math.min(1, 0.4 + S.energy * 0.4);
        S.runDir = rnd() < 0.5 ? -1 : 1;
        if (S.power > 0.4) { audio.splash(panOf(S.bobber), S.power); ripple(S.bobber.x, S.bobber.z, 0.9); }
        audio.drag(0.25, S.power);
        S.restT = 0;
      }
    }
    const running = S.run > 0 ? 1 : 0;
    const pull = running * S.power * (0.5 + 0.5 * Math.min(1, S.energy));
    // relaxed: the reel eases off by itself while the fish runs, and never past breaking
    const reelIn = S.reel ? (relaxed && running ? 0.3 : 1) : 0;
    const wantT = 0.18 + pull * 0.75 + reelIn * (0.25 + running * 0.55 * S.power);
    S.tension += (wantT - S.tension) * (1 - Math.exp(-dt * 6));
    if (relaxed) S.tension = Math.min(S.tension, 0.86);
    // line in or out
    const reelSpeed = 1.1 + 0.6 * (1 - S.power);
    S.dist += (pull * 0.9 - reelIn * reelSpeed * (1 - running * 0.85)) * dt;
    S.dist = Math.max(0.8, Math.min(S.spot.reach + 3, S.dist));
    if (!running && S.reel) S.energy = Math.max(0, S.energy - dt * 0.06);
    // reel clicks in time with the turning
    if (reelIn > 0) { S.reelAcc += dt * (8 + 6 * reelIn); if (S.reelAcc > 1) { S.reelAcc = 0; audio.reelTick(0.3, S.tension); } rod.userData.spool.rotation.y += dt * 18 * reelIn; }
    // too much, too long: the hook pulls free (manual only); too slack too long, the fish shakes it
    if (!relaxed) {
      S.over = S.tension > 1 ? S.over + dt : Math.max(0, S.over - dt * 2);
      S.slack = S.tension < 0.2 && !running && !S.reel ? S.slack + dt : 0;
      if (S.over > 1.1 || S.slack > 6) { lost(S.over > 1.1 ? 'snap' : 'slack'); return; }
    }
    // where the fish is: along the cast direction, swinging to the side on its runs, always in the water
    const a = S.dir + clamp(S.lateral, -0.9, 0.9);
    S.bobber.set(S.spot.x + Math.sin(a) * S.dist, 0, S.spot.z + Math.cos(a) * S.dist);
    keepInWater(S.bobber);
    S.bobber.y = terrainH(S.bobber.x, S.bobber.z) + (running ? -0.03 : 0.005);
    float.position.copy(S.bobber);
    float.position.y -= 0.02 + 0.03 * running;
    placeRod(0.35 + 0.15 * S.tension, S.tension);
    setLine(_tip, S.bobber, 0.25 * (1 - S.tension));
    if (Math.sin(time * 9) > 0.97 && S.tension > 0.5) ripple(S.bobber.x, S.bobber.z, 0.3);
    // in close enough: lift it out
    if (S.dist <= 1.0 + 0.4 * (1 - S.power) || (S.energy <= 0.02 && S.dist < 2.2)) land();
  }
  function land() {
    const { fish, cm } = S.catch;
    held = buildFish(fish, Math.max(0.05, cm / 100));
    // the fish is shown at its real length, but never so big it fills the screen
    const fit = Math.min(1, 0.42 / (cm / 100));
    held.scale.multiplyScalar(fit);
    // held closer to the eyes the smaller it is, so a minnow is not a speck
    held.userData.view = clamp(cm / 100 * fit * 1.45, 0.24, 0.62);
    held.position.copy(S.bobber);
    group.add(held);
    audio.splash(panOf(S.bobber), Math.min(1, cm / 40));
    ripple(S.bobber.x, S.bobber.z, 1.2);
    S.state = 'landed'; S.t0 = S.t;
    S.recent.unshift(fish.id); S.recent.length = Math.min(S.recent.length, 3);
    float.visible = false; line.visible = false;
    emit('landed', { fish, cm, spot: S.spot });
    emit('state', S.state);
  }
  function lost(why) {
    const fish = S.catch && S.catch.fish;
    S.catch = null;
    audio.splash(panOf(S.bobber), 0.6);
    ripple(S.bobber.x, S.bobber.z, 1);
    S.state = 'retrieve'; S.t0 = S.t;
    emit('lost', { why, fish });
  }

  reset();
  return api;
}
