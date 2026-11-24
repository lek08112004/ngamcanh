// Choco's own things outside: a little wooden shelter with straw in it, a scratching post wound
// with rope, and a water bowl, beside the cabin by the porch (in the strip round the cabin where
// the beds are not planted, and outside the circle that keeps walkers off its walls). And the
// ball of wool you can roll for it. Everything is built here from geometry and vertex colours; no image files.
import * as THREE from 'three';
import { CABIN } from './layout.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** a point given in the cabin's own frame (x across, z toward the porch), in the world */
function cabinWorld(lx, lz) {
  const c = Math.cos(-CABIN.yaw), s = Math.sin(-CABIN.yaw);
  return [CABIN.x + c * lx - s * lz, CABIN.z + s * lx + c * lz];
}
/** the world heading (atan2(dx, dz)) of a direction given in the cabin's frame */
function cabinHeading(lx, lz) {
  const [x0, z0] = cabinWorld(0, 0), [x1, z1] = cabinWorld(lx, lz);
  return Math.atan2(x1 - x0, z1 - z0);
}

/** vertex colours for a geometry from a function of its (local) position */
function paint(geo, fn) {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { fn(v.fromBufferAttribute(pos, i), c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export function createCatProps({ rich, ground }) {
  const group = new THREE.Group();
  group.name = 'cat-things';
  const wood = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 });
  const roofMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const straw = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const grain = (base, k = 1) => (p, c) => {
    const g = 0.86 + 0.14 * Math.sin(p.x * 90 * k + Math.sin(p.y * 40) * 2) * Math.sin(p.z * 23 + p.y * 7);
    c.copy(base).multiplyScalar(g);
  };
  const plank = (w, h, d, base) => paint(new THREE.BoxGeometry(w, h, d), grain(base));

  /* ---------- the shelter: three walls, a pitched roof, straw inside; open toward the camp ---------- */
  const SH = cabinWorld(3.7, 4.6);
  const shelter = { x: SH[0], z: SH[1], yaw: cabinHeading(1, 0) };      // facing out of the opening
  {
    const g = new THREE.Group();
    g.position.set(shelter.x, ground(shelter.x, shelter.z) - 0.01, shelter.z);
    g.rotation.y = shelter.yaw;
    group.add(g);
    const W = 0.62, D = 0.5, H = 0.36;                  // across, deep, wall height (the opening is +z)
    const board = new THREE.Color('#7a5434'), dark = new THREE.Color('#5a3c24');
    const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); g.add(o); return o; };
    add(plank(W, 0.03, D, dark), wood, 0, 0.015, 0);                                   // floor
    add(plank(W, H, 0.025, board), wood, 0, H / 2, -D / 2);                             // back
    for (const sx of [-1, 1]) add(plank(0.025, H, D, board), wood, sx * W / 2, H / 2, 0);   // sides
    // gables, then two roof boards meeting at a ridge, overhanging the front a little
    for (const z of [-D / 2, D / 2 - 0.012]) {
      const tri = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, 0.17)]);
      const gab = paint(new THREE.ExtrudeGeometry(tri, { depth: 0.022, bevelEnabled: false }), grain(board));
      add(gab, wood, 0, H, z - 0.011);
    }
    const slope = Math.atan2(0.17, W / 2), len = Math.hypot(W / 2, 0.17) + 0.07;
    const shingle = (p, c) => { c.setRGB(0.36, 0.25, 0.17).multiplyScalar(0.8 + 0.2 * Math.sign(Math.sin(p.x * 70))); };
    for (const sx of [-1, 1]) {
      const r = add(paint(new THREE.BoxGeometry(len, 0.022, D + 0.12), shingle), roofMat, sx * (len / 2 - 0.035) * Math.cos(slope), H + 0.085 + 0.01, 0.03, 0, -sx * slope);
      r.userData.roof = true;
    }
    // straw: a low heap of short strands (one merged geometry of thin boxes), gold and pale
    const strands = [];
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < (rich ? 150 : 60); i++) {
      const b = new THREE.BoxGeometry(0.004, 0.004, 0.09 + rnd() * 0.07);
      b.rotateX((rnd() - 0.5) * 0.5); b.rotateY(rnd() * TAU);
      const rr = Math.sqrt(rnd()) * 0.23, a = rnd() * TAU;
      b.translate(Math.cos(a) * rr * 1.1, 0.04 + (0.23 - rr) * 0.12 + rnd() * 0.02, Math.sin(a) * rr * 0.85);
      const t = rnd();
      paint(b, (_, c) => c.setRGB(0.62 + 0.2 * t, 0.5 + 0.16 * t, 0.24 + 0.1 * t));
      strands.push(b);
    }
    const heap = paint(new THREE.SphereGeometry(0.22, 18, 8, 0, TAU, 0, Math.PI / 2), (p, c) => c.setRGB(0.55, 0.43, 0.2).multiplyScalar(0.85 + 0.15 * Math.sin(p.x * 120) * Math.sin(p.z * 110)));
    heap.scale(1.15, 0.28, 0.95).translate(0, 0.03, 0);
    strands.push(heap);
    add(mergeAll(strands), straw, 0, 0, 0.0);
  }

  /* ---------- the scratching post: a square foot, a post wound with sisal rope, a cap ---------- */
  const PO = cabinWorld(3.5, 6.0);
  const post = { x: PO[0], z: PO[1] };
  {
    const g = new THREE.Group();
    g.position.set(post.x, ground(post.x, post.z) - 0.01, post.z);
    group.add(g);
    const foot = new THREE.Mesh(plank(0.3, 0.035, 0.3, new THREE.Color('#6b4a2e')), wood);
    foot.position.y = 0.017;
    g.add(foot);
    // the rope: bands of a spiral wound round the post, in vertex colours on a finely ringed cylinder
    const rope = paint(new THREE.CylinderGeometry(0.048, 0.048, 0.36, 18, 48, true), (p, c) => {
      const a = Math.atan2(p.z, p.x), turn = Math.sin(p.y * 260 + a);
      c.setRGB(0.66, 0.55, 0.38).multiplyScalar(0.72 + 0.28 * (0.5 + 0.5 * turn) + 0.05 * Math.sin(a * 9));
    });
    const r = new THREE.Mesh(rope, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    r.position.y = 0.035 + 0.18;
    g.add(r);
    const cap = new THREE.Mesh(plank(0.13, 0.025, 0.13, new THREE.Color('#6b4a2e')), wood);
    cap.position.y = 0.035 + 0.36 + 0.012;
    cap.userData.roof = true;
    g.add(cap);
  }
  // where the cat stands to scratch: in front of the post, facing it, on the side toward the camp
  const postFace = cabinHeading(-0.15, -1);
  post.standX = post.x - Math.sin(postFace) * 0.27;
  post.standZ = post.z - Math.cos(postFace) * 0.27;
  post.face = postFace;

  /* ---------- the water bowl: glazed earthenware, water in it (ice in deep winter) ---------- */
  const BO = cabinWorld(3.1, 5.4);
  const bowl = { x: BO[0], z: BO[1] };
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x23323a, roughness: 0.06, metalness: 0.1 });
  {
    const g = new THREE.Group();
    g.position.set(bowl.x, ground(bowl.x, bowl.z) - 0.005, bowl.z);
    group.add(g);
    const prof = [[0.0, 0.0], [0.07, 0.0], [0.085, 0.01], [0.092, 0.05], [0.083, 0.052], [0.074, 0.016], [0.0, 0.016]].map(([x, y]) => new THREE.Vector2(x, y));
    const b = paint(new THREE.LatheGeometry(prof, 28), (p, c) => c.setRGB(0.42, 0.52, 0.56).multiplyScalar(p.y > 0.045 ? 1.25 : 0.95));
    g.add(new THREE.Mesh(b, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32 })));
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.076, 24).rotateX(-Math.PI / 2), waterMat);
    w.position.y = 0.04;
    g.add(w);
  }
  const bowlFace = cabinHeading(-1, 0.2);
  bowl.standX = bowl.x - Math.sin(bowlFace) * 0.24;
  bowl.standZ = bowl.z - Math.cos(bowlFace) * 0.24;
  bowl.face = bowlFace;

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const snowable = [];
  group.traverse((o) => { if (o.isMesh && o.userData.roof && !snowable.includes(o.material)) snowable.push(o.material); });

  return {
    group, shelter, post, bowl, snowable,
    // what you (and the dog) walk round: the shelter, the post and the bowl; the cat walks round
    // the post and the bowl, but into its shelter
    blocks: [[shelter.x, shelter.z, 0.42], [post.x, post.z, 0.2], [bowl.x, bowl.z, 0.14]],
    catBlocks: [[post.x, post.z, 0.14], [bowl.x, bowl.z, 0.1]],
    /** in deep winter the water is a pale disc of ice, and the cat does not drink here */
    setWinter(w) {
      waterMat.color.setRGB(0.14 + 0.62 * w, 0.2 + 0.6 * w, 0.23 + 0.62 * w);
      waterMat.roughness = 0.06 + 0.3 * w;
    },
  };
}

function mergeAll(geos) {
  let n = 0, ni = 0;
  for (const g of geos) { n += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), I = new Uint32Array(ni);
  let o = 0, oi = 0;
  for (const g of geos) {
    const c = g.attributes.position.count;
    P.set(g.attributes.position.array, o * 3);
    N.set(g.attributes.normal.array, o * 3);
    C.set(g.attributes.color.array, o * 3);
    if (g.index) for (let i = 0; i < g.index.count; i++) I[oi++] = g.index.getX(i) + o;
    else for (let i = 0; i < c; i++) I[oi++] = i + o;
    o += c;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  geo.setIndex(new THREE.BufferAttribute(I, 1));
  return geo;
}

/* ---------- the ball of wool ---------- */
// One ball, reused: rolled out from where you stand, it rolls on the ground with friction, turns
// as it rolls, bounces off what is in the way, never wanders more than a few metres from where
// it was rolled, and is put away (shrinks and goes) when the game is over or nobody touches it.
export function createToy({ rich }) {
  const R = 0.034;
  const geo = paint(new THREE.SphereGeometry(R, rich ? 22 : 14, rich ? 16 : 10), (p, c) => {
    // wound strands: bands round several tilted axes, the way a ball of yarn is wrapped
    let w = 0;
    for (const [ax, ay, az, f] of [[1, 0.2, 0, 1], [0.1, 1, 0.4, 1.3], [0.6, -0.3, 1, 0.8]]) {
      const l = Math.hypot(ax, ay, az);
      w += Math.sin(((p.x * ax + p.y * ay + p.z * az) / l) * 520 * f);
    }
    c.setRGB(0.78, 0.2, 0.22).multiplyScalar(0.8 + 0.07 * w);
  });
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  // a loose end of yarn trailing from it
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0025, 4, 12, 2.2), new THREE.MeshStandardMaterial({ color: 0xb8383a, roughness: 1 }));
  tail.position.set(0.012, -0.02, -0.02);
  tail.rotation.set(1.2, 0.3, 0);
  mesh.add(tail);
  mesh.visible = false;
  mesh.castShadow = true;
  const toy = {
    mesh, active: false, x: 0, z: 0, vx: 0, vz: 0, ax: 0, az: 0, idle: 0, fade: 0, leash: 3.2,
    /** roll it out from (x, z) with velocity (vx, vz); it stays within `leash` metres of (ax, az) */
    spawn(x, z, vx, vz, ax = x, az = z) {
      Object.assign(toy, { active: true, x, z, vx, vz, ax, az, idle: 0, fade: 0 });
      mesh.visible = true;
      mesh.scale.setScalar(1);
    },
    /** a bat of the paw */
    kick(vx, vz) { toy.vx += vx; toy.vz += vz; toy.idle = 0; },
    /** put it away (it shrinks over half a second) */
    stow() { if (toy.active && !toy.fade) toy.fade = 0.5; },
    speed() { return Math.hypot(toy.vx, toy.vz); },
    update(dt, ctx) {
      if (!toy.active) return;
      if (toy.fade) {
        toy.fade -= dt;
        mesh.scale.setScalar(clamp(toy.fade / 0.5, 0.001, 1));
        if (toy.fade <= 0) { toy.active = false; toy.fade = 0; mesh.visible = false; }
      }
      const sp = Math.hypot(toy.vx, toy.vz);
      if (sp > 0) {
        const ns = Math.max(0, sp - dt * (0.35 + 1.2 * sp));        // rolling friction, more when fast
        toy.vx *= ns / sp; toy.vz *= ns / sp;
      }
      let nx = toy.x + toy.vx * dt, nz = toy.z + toy.vz * dt;
      // the leash: past it, it comes back as if off a gentle slope
      const lx = nx - toy.ax, lz = nz - toy.az, ld = Math.hypot(lx, lz);
      if (ld > toy.leash) {
        nx = toy.ax + (lx / ld) * toy.leash; nz = toy.az + (lz / ld) * toy.leash;
        const dot = (toy.vx * lx + toy.vz * lz) / ld;
        if (dot > 0) { toy.vx -= 1.6 * dot * lx / ld; toy.vz -= 1.6 * dot * lz / ld; }
      }
      if (ctx.indoor && ctx.room) {
        const [cx, cz] = ctx.room.confine(nx, nz, 0.05);
        if (Math.abs(cx - nx) + Math.abs(cz - nz) > 1e-4) { toy.vx *= -0.4; toy.vz *= -0.4; }
        nx = cx; nz = cz;
      } else for (const [bx, bz, br] of ctx.blocks) {
        const ox = nx - bx, oz = nz - bz, d = Math.hypot(ox, oz), rr = br + R;
        if (d < rr && d > 1e-4) {
          nx = bx + (ox / d) * rr; nz = bz + (oz / d) * rr;
          const dot = (toy.vx * ox + toy.vz * oz) / d;
          if (dot < 0) { toy.vx -= 1.5 * dot * ox / d; toy.vz -= 1.5 * dot * oz / d; }
        }
      }
      if (ctx.safe && !ctx.safe(nx, nz) && ctx.safe(toy.x, toy.z)) { nx = toy.x; nz = toy.z; toy.vx = toy.vz = 0; }
      const mx = nx - toy.x, mz = nz - toy.z, md = Math.hypot(mx, mz);
      if (md > 1e-6) mesh.rotateOnWorldAxis(_ax.set(mz / md, 0, -mx / md), md / R);
      toy.x = nx; toy.z = nz;
      const gy = ctx.indoor && ctx.room ? ctx.room.floorY : ctx.ground(nx, nz);
      mesh.position.set(nx, gy + R, nz);
      toy.idle += dt;
    },
  };
  return toy;
}
const _ax = new THREE.Vector3();
