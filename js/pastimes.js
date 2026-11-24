// Two quiet things to do at camp, and the few decorations a visitor may choose for it.
//
//  - Tea by the fire: sit on a low stool south of the fire (between the two sitting logs, which
//    point at the fire and are no seat to face it from); the kettle on its flat stone heats
//    (if the fire is lit), hisses, comes to the boil, is poured into the cup on the tray; the cup
//    steams for a while and cools. You get up whenever you like.
//  - The rocking chair by the stove (inside the cabin, see cabinroom.js `rocker`): driven from
//    main.js; only its sounds and rocking live there.
//  - Decorations, in fixed places only (no free building): the cabin porch (a string of cloth
//    pennants under the eave, or three paper lanterns that glow at night) and in front of the tent
//    (a woven rug, or two pots of flowers by the door). Each is built once at load and shown or
//    hidden; what is chosen is saved through store.js by main.js (me.decor).
//
// Everything is procedural: lathed shapes and canvas-drawn textures, no files.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CAMP, CABIN } from './layout.js';
import { terrainH, CAMP_SEATS } from './world.js';

/* ---------------------------------------------------------- where things are */
// the stool: south of the fire, between the logs, 2.8 m from the flames (the fire is a tall one)
const SEAT_X = CAMP.fire.x + 0.15, SEAT_Z = CAMP.fire.z + 2.8;
void CAMP_SEATS;
const toFire = (() => { const dx = CAMP.fire.x - SEAT_X, dz = CAMP.fire.z - SEAT_Z, d = Math.hypot(dx, dz); return [dx / d, dz / d]; })();
const side = [-toFire[1], toFire[0]];
/** where you sit for tea: on the stool, the fire a little to the right, the tray and the kettle
 *  in front (yaw in degrees, the camera's convention: + turns right) */
export const TEA_SEAT = { x: SEAT_X, z: SEAT_Z, yaw: Math.atan2(toFire[0], -toFire[1]) * 180 / Math.PI - 12, pitch: -24, eye: 1.0 };
const TRAY = { x: SEAT_X + toFire[0] * 0.55 - side[0] * 0.42, z: SEAT_Z + toFire[1] * 0.55 - side[1] * 0.42 };
const KETTLE = { x: CAMP.fire.x - toFire[0] * 1.0 - side[0] * 0.35, z: CAMP.fire.z - toFire[1] * 1.0 - side[1] * 0.35 };

export const DECOR = {
  porch: { name: 'Hiên nhà gỗ', variants: [['', 'Để trống'], ['flags', 'Dây cờ vải'], ['lanterns', 'Đèn lồng giấy']] },
  tent: { name: 'Trước cửa lều', variants: [['', 'Để trống'], ['rug', 'Tấm thảm dệt'], ['pots', 'Hai chậu hoa']] },
};

/* ------------------------------------------------------------------- textures */
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
/** a soft round puff for the steam, white in the middle fading to nothing */
const puffTex = () => canvasTex(64, 64, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,0.55)');
  r.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, w, w);
});
/** a woven cotton rug: warm stripes, a little fringe of warp at each end, uneven threads */
const rugTex = (rng) => canvasTex(256, 384, (g, w, h) => {
  const bands = ['#b8553a', '#e8d7b0', '#3f6b73', '#e8d7b0', '#c98d3a', '#e8d7b0', '#b8553a'];
  let y = 18;
  const bh = (h - 36) / 23;
  for (let i = 0; i < 23; i++) {
    g.fillStyle = bands[(i * 3 + (i > 11 ? 1 : 0)) % bands.length];
    g.fillRect(14, y, w - 28, bh + 0.5);
    y += bh;
  }
  for (let i = 0; i < 2600; i++) {             // the weave: short light and dark threads
    g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
    g.fillRect(14 + rng() * (w - 28), 18 + rng() * (h - 36), 2 + rng() * 5, 1);
  }
  g.strokeStyle = '#e2d3ad';
  g.lineWidth = 1.2;
  for (let x = 16; x < w - 14; x += 5) {       // the fringe
    g.beginPath(); g.moveTo(x, 18); g.lineTo(x + (rng() - 0.5) * 3, 3 + rng() * 5); g.stroke();
    g.beginPath(); g.moveTo(x, h - 18); g.lineTo(x + (rng() - 0.5) * 3, h - 3 - rng() * 5); g.stroke();
  }
});
/** paper for a lantern: warm washi with long fibres and darker ribs */
const paperTex = (rng) => canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#f2d9a8';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) {
    g.strokeStyle = `rgba(160,110,60,${0.05 + rng() * 0.08})`;
    g.lineWidth = 0.6;
    const x = rng() * w, y = rng() * h, a = rng() * Math.PI;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke();
  }
  g.fillStyle = 'rgba(120,70,30,0.35)';
  for (let k = 0; k < 7; k++) g.fillRect(0, (k + 0.5) * h / 7, w, 1.4);
});

/* --------------------------------------------------------------------- shapes */
/** replace a group's meshes by one merged mesh per material, in the group's own frame */
function bake(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const byMat = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.clone() : o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(g.index ? g : g.setIndex([...Array(g.attributes.position.count).keys()]));
  });
  for (const c of [...root.children]) root.remove(c);
  for (const [mat, list] of byMat) root.add(new THREE.Mesh(mergeGeometries(list), mat));
}
const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

export function createPastimes({ rich, shadows }) {
  let seed = 7;
  const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const group = new THREE.Group();
  group.name = 'pastimes';
  const meshes = [];
  const add = (m, parent = group) => { parent.add(m); if (m.isMesh) meshes.push(m); return m; };

  /* ---- the tea things ---- */
  const enamel = new THREE.MeshStandardMaterial({ color: 0x2c5a5e, roughness: 0.38, metalness: 0.05 });
  const soot = new THREE.MeshStandardMaterial({ color: 0x1b1714, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6142, roughness: 0.75 });
  const clay = new THREE.MeshStandardMaterial({ color: 0x6e3a28, roughness: 0.42 });
  const glaze = new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.25 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x55585a, roughness: 1 });
  const teaMat = new THREE.MeshStandardMaterial({ color: 0x8a4a12, roughness: 0.08, transparent: true, opacity: 0.92 });

  // the flat stone the kettle sits on, and the kettle: a squat enamel body, a domed lid with a
  // knob, a curved spout toward the seat, a wire bail handle over the top
  const ky = terrainH(KETTLE.x, KETTLE.z);
  const flat = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.07, 14), stone));
  flat.position.set(KETTLE.x, ky + 0.02, KETTLE.z);
  const kettle = new THREE.Group();
  kettle.position.set(KETTLE.x, ky + 0.055, KETTLE.z);
  kettle.rotation.y = Math.atan2(-toFire[0], -toFire[1]);           // spout toward the log
  group.add(kettle);
  add(new THREE.Mesh(lathe([[0.0, 0], [0.09, 0.0], [0.115, 0.03], [0.12, 0.07], [0.105, 0.12], [0.07, 0.15], [0.0, 0.155]], 22), enamel), kettle);
  add(new THREE.Mesh(lathe([[0.0, 0.0], [0.092, 0.0], [0.095, 0.006], [0.0, 0.008]], 18), soot), kettle);   // the blackened base
  const knob = add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), soot), kettle);
  knob.position.y = 0.165;
  const spoutCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.05, 0.1), new THREE.Vector3(0, 0.09, 0.15), new THREE.Vector3(0, 0.14, 0.19)]);
  add(new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 8, 0.014, 8), enamel), kettle);
  const bail = add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.005, 6, 20, Math.PI), soot), kettle);
  bail.position.y = 0.12;
  const spoutTip = new THREE.Vector3(0, 0.15, 0.2);

  // the tray by your feet: a board with a rim, a clay teapot, two cups (the near one is yours)
  const ty = terrainH(TRAY.x, TRAY.z);
  const tray = new THREE.Group();
  tray.position.set(TRAY.x, ty + 0.012, TRAY.z);
  tray.rotation.y = Math.atan2(toFire[0], toFire[1]);
  group.add(tray);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.024, 0.28), wood), tray).position.y = 0.012;
  for (const [w, d, x, z] of [[0.42, 0.012, 0, 0.134], [0.42, 0.012, 0, -0.134], [0.012, 0.28, 0.204, 0], [0.012, 0.28, -0.204, 0]]) {
    add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.022, d), wood), tray).position.set(x, 0.033, z);
  }
  // a small clay teapot: a round body with a shoulder, a lid with a knob, a short spout, a loop handle
  const pot = new THREE.Group();
  pot.position.set(-0.1, 0.024, 0.02);
  pot.rotation.y = 0.6;
  tray.add(pot);
  add(new THREE.Mesh(lathe([[0, 0], [0.042, 0], [0.062, 0.02], [0.066, 0.045], [0.056, 0.066], [0.034, 0.076], [0.034, 0.08], [0.0, 0.08]], 22), clay), pot);
  add(new THREE.Mesh(lathe([[0, 0.078], [0.036, 0.078], [0.03, 0.088], [0.012, 0.092], [0.008, 0.1], [0.012, 0.106], [0, 0.108]], 18), clay), pot);
  const potSpout = new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 0.03, 0), new THREE.Vector3(0.08, 0.05, 0), new THREE.Vector3(0.095, 0.075, 0)]);
  add(new THREE.Mesh(new THREE.TubeGeometry(potSpout, 6, 0.008, 8), clay), pot);
  const handle = add(new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 6, 14, Math.PI * 1.3), clay), pot);
  handle.position.set(-0.07, 0.045, 0);
  handle.rotation.set(0, 0, Math.PI * 0.35);
  const cupGeo = lathe([[0, 0], [0.026, 0], [0.03, 0.004], [0.036, 0.045], [0.034, 0.047], [0.03, 0.006], [0, 0.006]], 18);
  // your cup (the near one) is a group with the tea inside it, so it can be lifted to your lips
  const CUP_HOME = new THREE.Vector3(0.07, 0.024, -0.05);
  const mine = new THREE.Group();
  mine.position.copy(CUP_HOME);
  tray.add(mine);
  // yours is seen at arm's length when you drink, so it is turned with more sides
  add(new THREE.Mesh(lathe([[0, 0], [0.026, 0], [0.03, 0.004], [0.036, 0.045], [0.034, 0.047], [0.03, 0.006], [0, 0.006]], 40), glaze), mine);
  add(new THREE.Mesh(cupGeo, glaze), tray).position.set(0.1, 0.024, 0.07);
  // the tea in your cup: a disc that rises as it is poured and sinks as you drink
  const tea = add(new THREE.Mesh(new THREE.CircleGeometry(0.031, 18).rotateX(-Math.PI / 2), teaMat), mine);
  tea.position.set(0, 0.006, 0);
  tea.visible = false;
  const cupTop = new THREE.Vector3(0, 0.046, 0);
  // a sip: the cup comes up in front of your eyes, tips, and goes back to the tray
  const SIP_S = 2.8;
  const sipAt = new THREE.Vector3(), _sipL = new THREE.Vector3(), sipAxis = new THREE.Vector3(), _q = new THREE.Quaternion();

  // the stool: a round seat of one thick board on three splayed legs
  {
    const sy = terrainH(SEAT_X, SEAT_Z);
    const stool = new THREE.Group();
    stool.position.set(SEAT_X, sy, SEAT_Z);
    group.add(stool);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.045, 20), wood), stool).position.y = 0.31;
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI * 2 / 3 + 0.4;
      const leg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.32, 8), wood), stool);
      leg.position.set(Math.cos(a) * 0.1, 0.15, Math.sin(a) * 0.1);
      leg.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2);
    }
  }

  /* ---- steam: a small pool of soft sprites, reused ---- */
  const puff = puffTex();
  const STEAM = 18;
  const steam = [];
  for (let i = 0; i < STEAM; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0, color: 0xf4efe8 }));
    s.visible = false;
    s.renderOrder = 8;
    s.userData = { life: 0, max: 1, vx: 0, vz: 0, size: 0.1 };
    group.add(s);
    steam.push(s);
  }
  const _w = new THREE.Vector3();
  let emitK = 0, emitC = 0;
  function emit(at, size, life) {
    let s = null;
    for (const x of steam) if (!x.visible) { s = x; break; }
    if (!s) return;
    s.position.copy(at);
    s.userData.life = 0; s.userData.max = life; s.userData.size = size;
    s.userData.vx = (rng() - 0.5) * 0.05; s.userData.vz = (rng() - 0.5) * 0.05;
    s.visible = true;
  }

  /* ---- tea, as a little state machine ---- */
  // idle → heating (needs the fire) → poured (the cup steams) → cool (back to idle when you get up)
  const T = { state: 'idle', t: 0, heat: 0, steam: 0, fill: 0, sip: -1, sips: 0 };
  const HEAT_S = 7, POUR_S = 2.4;
  const pastimes = {
    group, meshes, TEA_SEAT,
    tea: T,
    blocks: [[TRAY.x, TRAY.z, 0.24], [SEAT_X, SEAT_Z, 0.26]],
    /** begin: returns '' or the reason it cannot be made now */
    brew(fire) {
      if (T.state === 'heating' || T.state === 'pouring') return 'Nước đang đun, chờ thêm chút nữa';
      if (fire < 0.08) return 'Lửa tắt rồi, nước không sôi được. Thêm củi (Space) trước đã';
      T.state = 'heating'; T.t = 0; T.fill = 0; T.sips = 0; T.sip = -1;
      return '';
    },
    /** is there tea in your cup to drink (hot or not), and not already at your lips */
    canSip() { return (T.state === 'poured' || T.state === 'cool') && T.fill > 0.05 && T.sip < 0; },
    /** lift the cup to a point in the world (in front of your eyes); returns false if there is nothing to drink */
    sip(at, eye) {
      if (!pastimes.canSip()) return false;
      sipAt.copy(at); T.sip = 0;
      // tip the cup toward you: about the level line across your view (in the tray's own frame)
      const a = tray.worldToLocal(_sipL.copy(at)).clone(), e = tray.worldToLocal(_w.copy(eye));
      sipAxis.set(e.z - a.z, 0, -(e.x - a.x)).normalize();
      return true;
    },
    /** you got up: the kettle goes off the boil, the cup is quietly emptied for next time */
    stop() { if (T.state !== 'idle') { T.state = 'idle'; T.t = 0; } T.sip = -1; mine.position.copy(CUP_HOME); mine.rotation.set(0, 0, 0); },
    /**
     * dt in seconds; fire 0..1; on: whether you are sitting there; events go to the callback
     * ('boil', 'poured', 'cool'), sounds are asked for through the same callback
     */
    update(dt, fire, cb) {
      T.t += dt;
      // the kettle: warms only on a lit fire, and cools when nobody is making tea
      const want = T.state === 'heating' || T.state === 'pouring' ? Math.min(1, fire * 2.5) : 0;
      T.heat += (want - T.heat) * (1 - Math.exp(-dt * (want > T.heat ? 0.55 : 0.25)));
      if (T.state === 'heating' && T.t > HEAT_S && T.heat > 0.6) { T.state = 'pouring'; T.t = 0; cb('pour'); }
      else if (T.state === 'heating' && T.t > 20 && fire < 0.08) { T.state = 'idle'; cb('nofire'); }
      if (T.state === 'pouring') {
        T.fill = Math.min(1, T.t / POUR_S);
        if (T.t > POUR_S) { T.state = 'poured'; T.t = 0; T.steam = 1; cb('poured'); }
      }
      if (T.state === 'poured') {
        // a cup of tea out of doors stays hot about a minute and a half
        T.steam = Math.max(0, 1 - Math.max(0, T.t - 40) / 50);
        if (T.steam <= 0) { T.state = 'cool'; cb('cool'); }
      }
      if (T.state === 'idle') T.fill = Math.max(0, T.fill - dt * 0.5);
      // a sip: up (0.8 s), at your lips (1.2 s, a quarter of the cup), back down (0.8 s)
      if (T.sip >= 0) {
        const before = T.sip;
        T.sip += dt;
        const up = T.sip < 0.8 ? T.sip / 0.8 : T.sip < 2.0 ? 1 : Math.max(0, 1 - (T.sip - 2.0) / 0.8);
        const e = up * up * (3 - 2 * up);
        tray.worldToLocal(_sipL.copy(sipAt));
        mine.position.lerpVectors(CUP_HOME, _sipL, e);
        mine.quaternion.copy(_q.setFromAxisAngle(sipAxis, 0.38 * e * Math.min(1, Math.max(0, (T.sip - 0.6) / 0.5)) * (T.sip < 2.0 ? 1 : up)));
        if (T.sip > 0.8 && T.sip < 2.0) T.fill = Math.max(0, T.fill - dt * 0.24 / 1.2);
        if (before < 0.9 && T.sip >= 0.9) cb('sip');
        if (T.sip >= SIP_S) {
          T.sip = -1; T.sips++;
          mine.position.copy(CUP_HOME); mine.rotation.set(0, 0, 0);
          if (T.fill < 0.06) { T.fill = 0; T.state = 'cool'; T.steam = 0; cb('empty'); }
          else cb('sipped', T.sips);
        }
      }
      tea.visible = T.fill > 0.02;
      tea.position.y = 0.006 + 0.032 * T.fill;
      tea.scale.setScalar(0.82 + 0.18 * T.fill);
      cb('kettle', T.heat);
      // steam: from the spout as it nears the boil, from the cup while the tea is hot
      emitK += dt * (T.heat > 0.35 ? 10 * (T.heat - 0.35) : 0);
      while (emitK > 1) { emitK -= 1; emit(kettle.localToWorld(_w.copy(spoutTip)), 0.07, 1.6); }
      emitC += dt * (T.state === 'poured' || T.state === 'pouring' ? 3.2 * Math.max(T.steam, T.fill * 0.6) : 0);
      while (emitC > 1) { emitC -= 1; emit(mine.localToWorld(_w.copy(cupTop)), 0.045, 2.2); }
      for (const s of steam) {
        if (!s.visible) continue;
        const u = s.userData;
        u.life += dt;
        const k = u.life / u.max;
        if (k >= 1) { s.visible = false; continue; }
        s.position.x += (u.vx + Math.sin(u.life * 2.1 + u.size * 40) * 0.03) * dt;
        s.position.z += u.vz * dt;
        s.position.y += (0.16 + 0.1 * k) * dt;
        s.scale.setScalar(u.size * (1 + 2.6 * k));
        s.material.opacity = Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k) * 0.55;
      }
    },
  };

  /* ---- decorations ---- */
  const decor = { porch: {}, tent: {} };
  const cabinAt = (lx, ly, lz) => {
    const c = Math.cos(CABIN.yaw), s = Math.sin(CABIN.yaw);
    const x = CABIN.x + c * lx + s * lz, z = CABIN.z - s * lx + c * lz;
    return new THREE.Vector3(x, terrainH(CABIN.x, CABIN.z) + 0.25 + ly, z);
  };
  // the porch: the cabin's front wall is at local z = 3.2, the eave lantern at y 2.1 by x = -0.1
  {
    const flags = new THREE.Group();
    const cloth = ['#c4553c', '#e7c66a', '#4f7f86', '#f0e6d2', '#9a5a8a', '#6f8f4e'];
    const cord = new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 1 });
    const flagMats = cloth.map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, side: THREE.DoubleSide }));
    // a cord that sags between two hooks under the eave, pennants hanging from it
    const a = cabinAt(-2.2, 2.28, 3.42), b = cabinAt(2.2, 2.28, 3.42);
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      p.y -= 0.32 * 4 * t * (1 - t);
      pts.push(p);
    }
    add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.004, 4), cord), flags);
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.075, 0, 0, 0.075, 0, 0, 0, -0.2, 0], 3));
    tri.computeVertexNormals();
    for (let i = 1; i < 24; i += 1) {
      const p = pts[i];
      const f = add(new THREE.Mesh(tri, flagMats[i % flagMats.length]), flags);
      f.position.copy(p);
      f.rotation.set((rng() - 0.5) * 0.15, CABIN.yaw + (rng() - 0.5) * 0.2, (rng() - 0.5) * 0.1);
      f.userData.sway = rng() * 6;
    }
    flags.visible = false;
    group.add(flags);
    decor.porch.flags = flags;

    const lanterns = new THREE.Group();
    // red paper over bamboo ribs, the old kind hung for a feast: taller than wide, a dark cap and
    // foot, a tassel; by day plain red paper, from dusk lit from within (emissive, no extra lamp)
    const paper = new THREE.MeshStandardMaterial({ map: paperTex(rng), color: 0xd2402a, roughness: 0.85, emissive: 0xff4a1c, emissiveIntensity: 0, side: THREE.DoubleSide });
    const ring = new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.8 });
    const tassel = new THREE.MeshStandardMaterial({ color: 0xe0a630, roughness: 0.9 });
    const prof = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, y = -0.2 + 0.4 * t; prof.push([0.035 + 0.115 * Math.sin(Math.PI * t) ** 0.8, y]); }
    const body = lathe(prof, 20);
    for (const [lx, drop] of [[-1.55, 0.0], [1.05, 0.1], [1.95, 0.03]]) {
      const top = cabinAt(lx, 2.3, 3.36);
      const l = new THREE.Group();
      l.position.copy(top);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.12 + drop, 4), ring), l).position.y = -(0.12 + drop) / 2;
      const bodyM = add(new THREE.Mesh(body, paper), l);
      bodyM.position.y = -0.34 - drop;
      for (const y of [-0.13 - drop, -0.55 - drop]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14), ring), l).position.y = y;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.12, 6), tassel), l).position.y = -0.63 - drop;
      lanterns.add(l);
    }
    lanterns.userData.paper = paper;
    lanterns.visible = false;
    group.add(lanterns);
    decor.porch.lanterns = lanterns;
  }
  // in front of the tent: its door faces the fire (local +z)
  {
    const tc = Math.cos(CAMP.tent.yaw), ts = Math.sin(CAMP.tent.yaw);
    const tentAt = (lx, lz) => [CAMP.tent.x + tc * lx + ts * lz, CAMP.tent.z - ts * lx + tc * lz];
    // across the doorway, short of the woodpile that lies about 3.3 m out from the door
    const [rx, rz] = tentAt(0, 2.32);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.72, 8, 5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: rugTex(rng), roughness: 1 }));
    rug.material.map.rotation = Math.PI / 2;
    rug.material.map.center.set(0.5, 0.5);
    // lay it on the slope: each vertex on the ground beneath it
    rug.rotation.y = CAMP.tent.yaw;
    rug.position.set(rx, 0, rz);
    rug.updateMatrixWorld(true);
    {
      const pos = rug.geometry.attributes.position, w = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        w.set(pos.getX(i), 0, pos.getZ(i)).applyMatrix4(rug.matrixWorld);
        pos.setY(i, terrainH(w.x, w.z) + 0.018);
      }
      pos.needsUpdate = true;
      rug.geometry.computeVertexNormals();
    }
    rug.userData.flatOnGround = true;
    rug.visible = false;
    add(rug);
    decor.tent.rug = rug;

    const pots = new THREE.Group();
    const terra = new THREE.MeshStandardMaterial({ color: 0xa65a3a, roughness: 0.85 });
    const soil = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 });
    const leaf = new THREE.MeshStandardMaterial({ color: 0x3f6a32, roughness: 0.8, side: THREE.DoubleSide });
    const potGeo = lathe([[0.0, 0], [0.1, 0], [0.13, 0.2], [0.15, 0.21], [0.15, 0.24], [0.12, 0.24], [0.105, 0.03], [0, 0.03]], 20);
    const leafGeo = new THREE.SphereGeometry(0.03, 6, 4).scale(1, 0.25, 2.2);
    const petal = new THREE.SphereGeometry(0.014, 6, 4).scale(1, 0.4, 1.6);
    for (const [lx, cols] of [[-1.0, ['#f2f0ea', '#f6d24a']], [1.0, ['#e2577a', '#f6d24a']]]) {
      const [px, pz] = tentAt(lx, 2.2);
      const p = new THREE.Group();
      p.position.set(px, terrainH(px, pz) - 0.01, pz);
      pots.add(p);
      add(new THREE.Mesh(potGeo, terra), p);
      add(new THREE.Mesh(new THREE.CircleGeometry(0.13, 18).rotateX(-Math.PI / 2), soil), p).position.y = 0.225;
      const petalMat = new THREE.MeshStandardMaterial({ color: cols[0], roughness: 0.6 });
      const eyeMat = new THREE.MeshStandardMaterial({ color: cols[1], roughness: 0.6 });
      // a mound of leaves and a dozen small daisy-like heads on short stems
      for (let i = 0; i < 16; i++) {
        const a = rng() * Math.PI * 2, r = 0.03 + rng() * 0.09;
        const l = add(new THREE.Mesh(leafGeo, leaf), p);
        l.position.set(Math.cos(a) * r, 0.25 + rng() * 0.05, Math.sin(a) * r);
        l.rotation.set(-0.5 + rng() * 0.4, a, 0);
      }
      for (let i = 0; i < 11; i++) {
        const a = rng() * Math.PI * 2, r = rng() * 0.1;
        const h = new THREE.Group();
        h.position.set(Math.cos(a) * r, 0.29 + rng() * 0.07, Math.sin(a) * r);
        h.rotation.set(-0.4 + rng() * 0.3, rng() * 6, (rng() - 0.5) * 0.5);
        p.add(h);
        for (let k = 0; k < 8; k++) {
          const pm = add(new THREE.Mesh(petal, petalMat), h);
          const pa = (k / 8) * Math.PI * 2;
          pm.position.set(Math.cos(pa) * 0.02, 0, Math.sin(pa) * 0.02);
          pm.rotation.y = -pa + Math.PI / 2;
        }
        add(new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), eyeMat), h).position.y = 0.004;
      }
    }
    // some two hundred little pieces: baked into one mesh per material (5 draws, not ~200)
    bake(pots);
    pots.visible = false;
    group.add(pots);
    decor.tent.pots = pots;
  }
  meshes.length = 0;
  group.traverse((o) => { if (o.isMesh && !o.isSprite) meshes.push(o); });
  for (const m of meshes) {
    m.castShadow = shadows && !m.userData.flatOnGround;
    m.receiveShadow = shadows;
  }
  void rich;

  const chosen = { porch: '', tent: '' };
  /** show one variant of a slot ('' for none) */
  pastimes.setDecor = (slot, variant) => {
    if (!decor[slot]) return;
    chosen[slot] = decor[slot][variant] ? variant : '';
    for (const [id, obj] of Object.entries(decor[slot])) obj.visible = id === chosen[slot];
  };
  pastimes.chosen = chosen;
  /** a little life in the decorations: the pennants stir, the paper lanterns glow at dusk */
  pastimes.animate = (time, dark, calm) => {
    if (decor.porch.flags.visible && !calm) {
      for (const f of decor.porch.flags.children) if (f.userData.sway !== undefined) f.rotation.x = 0.12 * Math.sin(time * 1.7 + f.userData.sway) + 0.05 * Math.sin(time * 3.1 + f.userData.sway * 2);
    }
    if (decor.porch.lanterns.visible) decor.porch.lanterns.userData.paper.emissiveIntensity = 1.15 * dark * (0.94 + 0.06 * Math.sin(time * 2.3));
  };
  return pastimes;
}
