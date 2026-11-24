// Choco, the camp cat: a plump grey-brown tabby (after the owner's own cat) who keeps Bơ company.
//
// Unlike the corgi (rigid capsules on pivots), the cat is ONE skinned mesh: the body, legs, head,
// ears and tail are modelled as pieces, each hung on a bone, then merged; where two pieces meet
// at a joint their vertices are shared half and half between the two bones, so an elbow, a
// neck or a curling tail bends as one skin instead of showing the seams. The spine has two
// bones (chest and loin), so the back can round when it sits and dip when it stretches; the
// tail has nine; the chin hangs on a small jaw bone, so a yawn really opens the mouth. The coat
// is painted into vertex colours (a taupe mackerel tabby: dark stripes, a line down the spine,
// ringed legs and tail, a pale chest and belly); up close on medium and high a few shells of
// short fur stand off the skin (strands hashed from the skin's rest position, so they stay put
// as it moves; no fur on the thin ears, short fur on the face and feet). No image files, no
// models loaded: everything is built here.
//
// The face: amber eyes (greenish at the rim) under real lids, with pupils that are slits in
// bright sun (never thinner than a soft oval) and round at night, wider when something has its
// attention; a pale pink nose, a mouth line, fine whiskers, ears that turn and twitch on their
// own, forward when it is curious, out to the side when it wants to be left alone.
//
// This module is the body: poses (stand, sit, loaf, sleep, stretch, crouch to drink or sniff,
// a low stalk, up on the scratching post), the walk and trot, kneading, a pounce, turning round
// before lying down, a yawn, a head tilt, leaning into a rub, and steering round what is in the
// way. What it decides to do is catmind.js.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
const BODY_Y = 0.205;

/* ---------- the coat ---------- */
// A grey-brown mackerel tabby, after the owner's own cat: a taupe ground, brown-black stripes down
// the flanks, a dark line along the spine, rings round the legs and tail, the lines of a tabby's
// mask on the crown and cheeks, and a much paler chest, belly, muzzle and feet.
const BASE = new THREE.Color('#5b4f42'), DARK = new THREE.Color('#15100c'), LIGHT = new THREE.Color('#a39480'), WARM = new THREE.Color('#6b563f');
const EAR_IN = new THREE.Color('#b08478'), EAR_TIP = new THREE.Color('#231b15');
const stripe = (v, lo, hi) => smooth(lo, hi, 0.5 + 0.5 * Math.sin(v));
/** colour of the coat at p (cat space at rest: x right, y up, z forward; metres above the ground) */
function coat(p, part, out) {
  out.copy(BASE);
  const ax = Math.abs(p.x);
  if (part === 'torso' || part === 'neck') {
    out.lerp(WARM, 0.3 * smooth(0.25, 0.18, p.y));                              // warmer low on the flanks
    // mackerel stripes: down the flanks, wavering, fading out toward the belly
    const s = stripe(p.z * 118 + Math.sin(p.y * 60 + p.z * 23) * 1.1 + ax * 14, 0.42, 0.78);
    out.lerp(DARK, 0.86 * s * smooth(0.16, 0.205, p.y));
    out.lerp(DARK, 0.85 * smooth(0.017, 0.006, ax) * smooth(0.24, 0.262, p.y));    // the line down the spine
    out.lerp(LIGHT, 0.8 * smooth(0.172, 0.14, p.y));                           // the belly
    out.lerp(LIGHT, 0.7 * smooth(0.12, 0.19, p.z) * smooth(0.255, 0.2, p.y));     // the bib
  }
  if (part === 'head') {
    const hy = p.y - 0.299, hz = p.z - 0.196;                                    // from the middle of the skull
    // the mask: dark lines running back over the crown from the brow (the "M"), bars across the cheeks
    out.lerp(DARK, 0.75 * smooth(0.012, 0.03, hy) * stripe(ax * 330 + 1.57, 0.45, 0.8));
    out.lerp(DARK, 0.55 * stripe(hy * 420 - ax * 120, 0.5, 0.82) * smooth(0.026, 0.036, ax) * smooth(-0.034, -0.02, hy) * smooth(0.012, 0.0, hy) * smooth(0.06, 0.035, hz));
    for (const sx of [-1, 1]) {                                                  // pale rims round the eyes
      const d = Math.hypot(p.x - sx * 0.0205, hy + 0.0035, hz - 0.0395);
      out.lerp(LIGHT, 0.42 * smooth(0.021, 0.013, d));
    }
    out.lerp(WARM, 0.5 * smooth(0.012, 0.004, ax) * smooth(0.03, 0.042, hz) * smooth(-0.02, -0.008, hy));   // the bridge of the nose
    out.lerp(LIGHT, 0.85 * smooth(0.03, 0.042, hz) * smooth(-0.016, -0.026, hy));   // muzzle and chin
    out.lerp(LIGHT, 0.7 * smooth(-0.03, -0.042, hy));                            // the throat
  }
  if (part === 'legF' || part === 'legH' || part === 'paw') {
    out.lerp(DARK, 0.7 * stripe(p.y * 150 + p.z * 25, 0.5, 0.8) * smooth(0.035, 0.07, p.y));   // rings
    out.lerp(LIGHT, 0.55 * smooth(0.06, 0.02, p.y));                             // pale feet
  }
  if (part === 'tail') out.lerp(DARK, Math.max(0.8 * stripe(p.z * 120, 0.45, 0.75), smooth(-0.43, -0.46, p.z)));   // rings, a dark tip
  if (part === 'ear') out.lerp(EAR_TIP, 0.5 + 0.4 * smooth(0.36, 0.385, p.y));
  if (part === 'earIn') out.copy(EAR_IN);
  return out;
}

/* ---------- fur shells ---------- */
// One material per shell (its height in uShell); all share one program. The strand pattern is
// hashed from the vertex's REST position (the `position` attribute, before skinning), so each
// hair stays on the same spot of skin while the cat moves. Fewer strands survive further out:
// hairs taper. Inner shells are darker, as the undercoat is.
function shellMaterial(base, s, len) {
  const m = base.clone();
  m.userData.uShell = { value: s };
  m.userData.uLen = { value: len };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uShell = m.userData.uShell;
    sh.uniforms.uLen = m.userData.uLen;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uShell;\nuniform float uLen;\nattribute float furK;\nvarying vec3 vFurP;\nvarying float vFurK;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvec3 furN = objectNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += (furN * uLen * uShell + vec3(0.0, -0.25, -0.35) * uLen * uShell * uShell) * furK;\nvFurP = position * 640.0;\nvFurK = furK;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uShell;\nvarying vec3 vFurP;\nvarying float vFurK;\nfloat furHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }')
      .replace('#include <color_fragment>', '#include <color_fragment>\nif (vFurK < 0.05 || furHash(floor(vFurP)) < 0.12 + 0.82 * uShell) discard;\ndiffuseColor.rgb *= mix(0.84, 1.0, uShell);')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nif (any(isnan(gl_FragColor)) || any(isinf(gl_FragColor))) discard;');
  };
  m.customProgramCacheKey = () => 'cat-fur-shell';
  return m;
}

/* ---------- the model ---------- */
function build(rich, furShells) {
  const fur = rich
    ? new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.78, sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color(0.4, 0.36, 0.3) })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
  const root = new THREE.Group();
  root.name = 'cat';
  const bones = [];
  const bone = (parent, x, y, z, name) => { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); parent.add(b); bones.push(b); return b; };
  const pieces = [];   // { geo, bone, part, weight(p) -> [[bone, w], ...] | null }
  const piece = (b, geo, part, weight = null) => pieces.push({ geo, bone: b, part, weight });
  const blob = (b, r, x, y, z, sx, sy, sz, part, weight = null, ws = 20, hs = 14) =>
    piece(b, new THREE.SphereGeometry(r, ws, hs).scale(sx, sy, sz).translate(x, y, z), part, weight);
  // a limb or tail segment from bone b's origin to (dx, dy, dz): makes the bone at the far end;
  // the skin near each end is shared with the bone on the other side of that joint
  const _up = new THREE.Vector3(0, 1, 0);
  // a capsule with rings along its length as well (the coat's bars are vertex colours: a limb
  // with one long quad from end to end could not carry them)
  const capsule = (r, len) => {
    const pts = [], n = Math.max(2, Math.round(len / 0.008));
    for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + (i / 5) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r, -len / 2 + Math.sin(a) * r)); }
    for (let i = 1; i < n; i++) pts.push(new THREE.Vector2(r, -len / 2 + (i / n) * len));
    for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r, len / 2 + Math.sin(a) * r)); }
    pts[0].x = 0; pts[pts.length - 1].x = 0;
    return new THREE.LatheGeometry(pts, 14);
  };
  const seg = (b, dx, dy, dz, r, part, name) => {
    const end = bone(b, dx, dy, dz, name);
    const dir = new THREE.Vector3(dx, dy, dz), L = dir.length();
    dir.normalize();
    const geo = capsule(r, Math.max(0.001, L - r * 0.4));
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, dir));
    geo.translate(dx / 2, dy / 2, dz / 2);
    const par = b.parent;
    piece(b, geo, part, (p) => {
      const t = clamp(p.dot(dir) / L, 0, 1);
      const a = par && par.isBone ? 0.5 * (1 - smooth(0, 0.38, t)) : 0;
      const e = 0.5 * smooth(0.62, 1, t);
      return [[b, 1 - a - e], [par && par.isBone ? par : b, a], [end, e]];
    });
    return end;
  };
  const halfParent = (b, k = 0.5) => () => [[b, 1 - k], [b.parent, k]];

  const base = bone(root, 0, 0, 0, 'base');
  const body = bone(base, 0, BODY_Y, 0, 'body');
  const chest = bone(body, 0, 0, 0, 'chest');
  const loin = bone(body, 0, 0, 0, 'loin');

  // the trunk: one lathe, deep at the chest, a slight waist, round haunches; narrow side to side
  const prof = [[-0.216, 0], [-0.206, 0.03], [-0.188, 0.05], [-0.155, 0.064], [-0.105, 0.067], [-0.045, 0.066], [0.015, 0.065],
    [0.075, 0.065], [0.128, 0.064], [0.168, 0.057], [0.198, 0.043], [0.214, 0.022], [0.22, 0]];
  // (the profile is resampled finely along the body, so the stripes have vertices to sit on)
  const profPts = new THREE.SplineCurve(prof.map(([z, r]) => new THREE.Vector2(r * 1.05, z * 0.86))).getPoints(60);
  for (const q of profPts) q.x = Math.max(0, q.x);
  profPts[0].x = 0; profPts[profPts.length - 1].x = 0;
  const torso = new THREE.LatheGeometry(profPts, 36).rotateX(Math.PI / 2);
  {
    const pos = torso.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // (rotateX(+90deg) sent the lathe's axis, the profile's z, to +z: tail at -z, chest at +z)
      v.x *= 0.96; v.y *= 1.12;                                   // round, not deep: a well-fed cat
      if (v.y < -0.03) v.y -= 0.011 * smooth(-0.15, -0.05, v.z) * smooth(0.035, -0.025, v.z);   // the loose belly
      if (v.y > 0) v.y += 0.006 * smooth(-0.05, -0.14, v.z);                                 // the haunches sit a little higher
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    torso.computeVertexNormals();
  }
  piece(body, torso, 'torso', (p) => { const w = smooth(-0.08, 0.08, p.z); return [[chest, w], [loin, 1 - w]]; });

  // neck and head
  const neckBase = bone(chest, 0, 0.03, 0.142, 'neck');
  blob(neckBase, 0.052, 0, 0.0, 0.0, 1.0, 1.0, 1.05, 'neck', halfParent(neckBase, 0.55));     // the ruff where neck meets chest
  const head = seg(neckBase, 0, 0.052, 0.042, 0.034, 'neck', 'head');
  head.rotation.order = 'YXZ';
  neckBase.rotation.order = 'YXZ';
  const H = (r, x, y, z, sx, sy, sz) => blob(head, r, x, y, z, sx, sy, sz, 'head', null, 24, 16);
  H(0.046, 0, 0.012, 0.012, 1.0, 0.9, 1.05);            // cranium
  H(0.043, 0, -0.009, 0.029, 1.36, 0.84, 0.86);         // cheeks, wide as a cat's are
  H(0.0145, 0, 0.0, 0.056, 0.95, 0.8, 1.0);             // the short nose
  for (const sx of [-1, 1]) H(0.0155, sx * 0.0125, -0.018, 0.061, 1, 0.85, 0.9);   // whisker pads
  // the chin hangs on its own little jaw bone, so a yawn really opens the mouth
  const jaw = bone(head, 0, -0.02, 0.03, 'jaw');
  blob(jaw, 0.0125, 0, -0.011, 0.025, 1, 0.75, 1, 'head', null, 24, 16);   // chin
  // ears: thin, wide-based, rounded at the tip; a pinkish inside with a little hair
  const ears = [-1, 1].map((sx) => {
    const e = bone(head, sx * 0.029, 0.041, 0.004, 'ear');
    e.rotation.set(-0.12, sx * 0.28, -sx * 0.36);
    e.userData.base = e.rotation.clone();
    e.userData.side = sx;
    const ew = (p) => { const a = 0.5 * (1 - smooth(0, 0.016, p.y)); return [[e, 1 - a], [head, a]]; };
    piece(e, new THREE.ConeGeometry(0.0272, 0.058, 18, 3).translate(0, 0.027, 0).scale(1, 1, 0.34), 'ear', ew);
    piece(e, new THREE.ConeGeometry(0.0205, 0.045, 16, 2).translate(0, 0.022, 0).scale(1, 1, 0.22).translate(0, 0.002, 0.0042), 'earIn', ew);
    return e;
  });

  // legs: shoulder / elbow / wrist / paw in front, hip / stifle / hock / paw behind
  const toes = (pb, front) => {
    blob(pb, 0.0172, 0, -0.002, front ? 0.009 : 0.011, 1.05, 0.6, 1.25, 'paw');
    for (const [tx, tz] of [[-0.0165, 0.017], [-0.006, 0.023], [0.006, 0.023], [0.0165, 0.017]]) {
      blob(pb, 0.0068, tx * 0.95, -0.003, tz + (front ? 0 : 0.002), 1, 0.85, 1, 'paw', null, 10, 8);
    }
  };
  const legs = [];
  for (const [sx, front] of [[-1, true], [1, true], [-1, false], [1, false]]) {
    if (front) {
      const sh = bone(chest, sx * 0.045, -0.025, 0.106, 'shoulder');
      blob(sh, 0.027, 0, -0.014, 0.0, 0.72, 1.2, 1.0, 'legF', halfParent(sh, 0.6));
      const el = seg(sh, 0, -0.075, -0.012, 0.0255, 'legF', 'elbow');
      const wr = seg(el, 0, -0.072, 0.008, 0.0186, 'legF', 'wrist');
      const pw = seg(wr, 0, -0.016, 0.006, 0.0128, 'legF', 'paw');
      toes(pw, true);
      legs.push({ front, side: sx, a: sh, b: el, c: wr, paw: pw });
    } else {
      const hp = bone(loin, sx * 0.044, -0.005, -0.115, 'hip');
      blob(hp, 0.046, 0, -0.026, 0.012, 0.66, 1.12, 1.05, 'legH', halfParent(hp, 0.5));   // the haunch
      const st = seg(hp, 0, -0.062, 0.035, 0.027, 'legH', 'stifle');
      blob(st, 0.019, 0, -0.022, -0.02, 0.72, 1.3, 1.0, 'legH', halfParent(st, 0.3));   // calf
      const ho = seg(st, 0, -0.062, -0.05, 0.0172, 'legH', 'hock');
      const pw = seg(ho, 0, -0.058, -0.004, 0.0122, 'legH', 'paw');
      toes(pw, false);
      legs.push({ front, side: sx, a: hp, b: st, c: ho, paw: pw });
    }
  }
  // the tail: nine segments, thick at the root, tapering
  const tail = [];
  let tb = bone(loin, 0, 0.035, -0.172, 'tail');
  for (let i = 0; i < 9; i++) {
    tail.push(tb);
    tb = seg(tb, 0, 0, -0.034, mix(0.0172, 0.0098, i / 8), 'tail', 'tail');
  }

  /* merge every piece into one skinned geometry */
  root.updateMatrixWorld(true);
  const index = new Map(bones.map((b, i) => [b, i]));
  const P = [], N = [], C = [], SI = [], SW = [], IDX = [], FK = [];
  // how long the fur is on each part (the shells): none on the thin ears, short on face and feet
  const FUR = { ear: 0, earIn: 0, paw: 0.45, head: 0.6, neck: 0.9, legF: 0.75, legH: 0.85, tail: 1, torso: 1 };
  const v = new THREE.Vector3(), w = new THREE.Vector3(), col = new THREE.Color();
  let k = 0;
  for (const pc of pieces) {
    const g = pc.geo.index ? pc.geo : pc.geo;
    const pos = g.attributes.position, nor = g.attributes.normal;
    const m = pc.bone.matrixWorld;
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const off = P.length / 3;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const ws = pc.weight ? pc.weight(v) : [[pc.bone, 1]];
      const merged = new Map();
      for (const [b, x] of ws) if (x > 1e-4) merged.set(b, (merged.get(b) || 0) + x);
      const list = [...merged].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const sum = list.reduce((s, x) => s + x[1], 0) || 1;
      for (let j = 0; j < 4; j++) { SI.push(list[j] ? index.get(list[j][0]) : 0); SW.push(list[j] ? list[j][1] / sum : 0); }
      w.copy(v).applyMatrix4(m);
      P.push(w.x, w.y, w.z);
      v.fromBufferAttribute(nor, i).applyMatrix3(nm);
      // a zero normal (where a lathe or cone closes to a point) would turn into NaN in the shader
      if (v.lengthSq() < 1e-12) v.copy(w).sub(pc.bone.getWorldPosition(new THREE.Vector3()));
      if (v.lengthSq() < 1e-12) v.set(0, 1, 0);
      v.normalize();
      N.push(v.x, v.y, v.z);
      coat(w, pc.part, col);
      FK.push(FUR[pc.part] ?? 1);
      const j = 0.95 + 0.10 * (Math.sin(w.x * 173 + w.y * 311 + w.z * 241 + k) * 0.5 + 0.5);
      C.push(col.r * j, col.g * j, col.b * j);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) IDX.push(g.index.getX(i) + off);
    else for (let i = 0; i < pos.count; i++) IDX.push(i + off);
    k++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  geo.setAttribute('furK', new THREE.Float32BufferAttribute(FK, 1));
  geo.setIndex(IDX);
  geo.computeBoundingSphere();
  const skin = new THREE.SkinnedMesh(geo, fur);
  skin.frustumCulled = false;
  root.add(skin);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skin.bind(skeleton);
  const shells = [];
  for (let i = 1; i <= furShells; i++) {
    const s = new THREE.SkinnedMesh(geo, shellMaterial(fur, i / furShells, 0.0027));
    s.frustumCulled = false;
    s.userData.shell = true;
    root.add(s);
    s.bind(skeleton, skin.bindMatrix);
    shells.push(s);
  }

  /* the face: eyes, lids, nose, mouth, whiskers, tongue (plain meshes on the head bone) */
  const lidMat = new THREE.MeshStandardMaterial({ color: BASE.clone().multiplyScalar(0.85), roughness: 0.8 });
  const eyes = [-1, 1].map((sx) => {
    const g = new THREE.Group();
    g.position.set(sx * 0.0205, 0.0085, 0.0496);
    g.rotation.set(-0.06, sx * 0.21, sx * 0.16);
    g.scale.set(1, 1, 0.9);
    head.add(g);
    const R = 0.0116;
    const ball = new THREE.SphereGeometry(R, 32, 24);
    const ic = new Float32Array(ball.attributes.position.count * 3), q = new THREE.Vector3(), c = new THREE.Color();
    const GOLD = new THREE.Color('#c98a26'), GREEN = new THREE.Color('#9a9842'), RIM = new THREE.Color('#463f1a'), BACK = new THREE.Color('#1c120c');
    for (let i = 0; i < ball.attributes.position.count; i++) {
      q.fromBufferAttribute(ball.attributes.position, i).normalize();
      const a = Math.acos(clamp(q.z, -1, 1));
      const fib = 0.92 + 0.16 * (0.5 + 0.5 * Math.sin(Math.atan2(q.y, q.x) * 23 + a * 9));    // the iris' radial fibres
      c.copy(GOLD).lerp(GREEN, smooth(0.3, 0.62, a)).lerp(RIM, smooth(0.62, 0.9, a)).multiplyScalar(fib);
      if (a > 0.98) c.copy(BACK);
      ic[i * 3] = c.r; ic[i * 3 + 1] = c.g; ic[i * 3 + 2] = c.b;
    }
    ball.setAttribute('color', new THREE.BufferAttribute(ic, 3));
    g.add(new THREE.Mesh(ball, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0x070401 })));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(R * 0.62, 18, 12), new THREE.MeshStandardMaterial({ color: 0x030202, roughness: 0.3 }));
    pupil.position.z = R * 0.8;
    pupil.scale.set(0.2, 1, 0.42);
    g.add(pupil);
    // the wet cornea: black, added on top, so only its gloss shows
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.04, 24, 16), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.06, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    const glint = new THREE.Mesh(new THREE.SphereGeometry(R * 0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
    glint.position.set(R * 0.3, R * 0.38, R * 0.9);
    g.add(glint);
    const upper = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 22, 10, 0, TAU, 0, 1.2), lidMat);
    const lower = new THREE.Mesh(new THREE.SphereGeometry(R * 1.11, 22, 8, 0, TAU, Math.PI - 1.0, 1.0), lidMat);
    g.add(upper, lower);
    return { g, pupil, upper, lower, glint };
  });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0068, 14, 10), new THREE.MeshStandardMaterial({ color: 0xd29a94, roughness: 0.42 }));
  nose.position.set(0, -0.0035, 0.0705);
  nose.scale.set(1.4, 0.85, 0.62);
  head.add(nose);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc8707a, roughness: 0.45 }));
  tongue.position.set(0, -0.007, 0.034);           // (on the jaw: at rest just behind the lip)
  tongue.scale.set(0.9, 0.32, 1.35);
  tongue.visible = false;
  jaw.add(tongue);
  // the inside of the mouth: a dark lining between the whisker pads and the chin, as thin as a
  // line until the jaw drops (a yawn), so it never shows when the mouth is shut
  const maw = new THREE.Mesh(new THREE.SphereGeometry(0.0115, 16, 10), new THREE.MeshStandardMaterial({ color: 0x3b1416, roughness: 0.7 }));
  maw.position.set(0, -0.027, 0.0585);
  maw.scale.set(1.0, 0.05, 0.35);
  maw.visible = false;
  head.add(maw);
  // the mouth: the line down from the nose and the two curves of the lip
  const mouth = [];
  const line = (pts) => { for (let i = 0; i < pts.length - 1; i++) mouth.push(...pts[i], ...pts[i + 1]); };
  line([[0, -0.009, 0.0705], [0, -0.017, 0.0688]]);
  for (const sx of [-1, 1]) line([[0, -0.017, 0.0688], [sx * 0.004, -0.0205, 0.0676], [sx * 0.009, -0.0205, 0.0655], [sx * 0.0125, -0.019, 0.062]]);
  const mouthGeo = new THREE.BufferGeometry();
  mouthGeo.setAttribute('position', new THREE.Float32BufferAttribute(mouth, 3));
  head.add(new THREE.LineSegments(mouthGeo, new THREE.LineBasicMaterial({ color: 0x24130d, transparent: true, opacity: 0.35 })));
  // whiskers: four rows each side out of the pads, curving out, down, back; three over each eye
  const wh = [];
  const rng = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (const sx of [-1, 1]) {
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      const o = [sx * (0.016 + col * 0.003), -0.0125 - row * 0.0042, 0.066 - col * 0.0045];
      const len = 0.055 + rng() * 0.02 - row * 0.004, drop = -0.004 - row * 0.005 + rng() * 0.003;
      let prev = o;
      for (let s = 1; s <= 4; s++) {
        const t = s / 4;
        const p = [o[0] + sx * len * t, o[1] + drop * t * t + 0.003 * Math.sin(t * Math.PI), o[2] + 0.012 * t - 0.03 * t * t];
        wh.push(...prev, ...p);
        prev = p;
      }
    }
    for (let b = 0; b < 3; b++) {
      const o = [sx * (0.016 + b * 0.005), 0.024, 0.052 - b * 0.002];
      wh.push(...o, o[0] + sx * 0.012, o[1] + 0.022, o[2] + 0.008 - b * 0.002);
    }
  }
  const whGeo = new THREE.BufferGeometry();
  whGeo.setAttribute('position', new THREE.Float32BufferAttribute(wh, 3));
  const whMat = new THREE.LineBasicMaterial({ color: 0xe8e0d4, transparent: true, opacity: 0.4 });
  head.add(new THREE.LineSegments(whGeo, whMat));

  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  return { root, body, chest, loin, neck: neckBase, head, jaw, maw, ears, legs, tail, eyes, tongue, shells, whMat, meshes, skin };
}

/* ---------- poses ---------- */
// h: body height; pitch: + nose down; chest/loin: the two halves of the spine (+ front/rear down);
// legs a/b/c: shoulder elbow wrist (front), hip stifle hock (hind), + = foot back; flat: how much
// the paws are kept flat on the ground; tail: lift of the root (+ up), curl along it, tip, wrap
// (sideways per segment); ear: + laid back
const POSES = {
  stand: { h: BODY_Y, pitch: 0, roll: 0, chest: 0, loin: 0, neck: 0, head: 0.05, fa: 0, fb: 0, fc: 0, ha: 0, hb: 0, hc: 0, flat: 1, tLift: 0.35, tBend: 0.1, tCurl: 0.1, tTip: -0.06, tWrap: 0, ear: 0 },
  sit: { h: 0.158, pitch: -1.0, roll: 0, chest: 0.45, loin: 0.35, neck: 0.25, head: 0.14, fa: 0.55, fb: 0, fc: 0, ha: 0, hb: 0.96, hc: -1.95, flat: 1, tLift: -0.2, tBend: 0.8, tCurl: 0.0, tTip: 0.0, tWrap: -0.32, ear: 0 },
  loaf: { h: 0.093, pitch: 0.02, roll: 0, chest: 0, loin: 0, neck: 0.04, head: -0.02, fa: 1.32, fb: -2.5, fc: 1.05, ha: -1.0, hb: 2.28, hc: -1.5, flat: 0.2, tLift: -0.18, tBend: 0.05, tCurl: 0.0, tTip: 0.0, tWrap: -0.32, ear: 0 },
  sleep: { h: 0.089, pitch: 0.04, roll: 0.12, chest: 0.04, loin: 0, neck: 0.5, head: 0.32, fa: 1.36, fb: -2.55, fc: 1.1, ha: -1.0, hb: 2.3, hc: -1.5, flat: 0.2, tLift: -0.2, tBend: 0.05, tCurl: 0.0, tTip: 0.0, tWrap: -0.38, ear: 0.22 },
  stretch: { h: 0.14, pitch: 0.42, roll: 0, chest: 0.18, loin: -0.2, neck: -0.5, head: -0.38, fa: -1.4, fb: 0.3, fc: -0.2, ha: 0.25, hb: 0, hc: 0, flat: 1, tLift: 1.15, tBend: 0.06, tCurl: 0.06, tTip: 0.04, tWrap: 0, ear: 0.1 },
  // low over a bowl (or nose to a hand): forelegs bent, hindquarters folded, head down
  crouch: { h: 0.128, pitch: 0.2, roll: 0, chest: 0.16, loin: -0.12, neck: 0.5, head: 0.42, fa: 0.5, fb: -1.0, fc: 0.55, ha: -0.7, hb: 1.6, hc: -1.05, flat: 1, tLift: -0.15, tBend: 0.05, tCurl: 0.02, tTip: 0.05, tWrap: -0.22, ear: 0 },
  // stalking: belly low, legs bent, head level and forward, tail low and straight
  stalk: { h: 0.128, pitch: 0.06, roll: 0, chest: 0.06, loin: -0.02, neck: -0.42, head: 0.36, fa: 0.5, fb: -1.05, fc: 0.62, ha: -0.58, hb: 1.3, hc: -0.85, flat: 1, tLift: -0.12, tBend: 0.0, tCurl: 0.0, tTip: 0.1, tWrap: 0, ear: -0.25 },
  // up on the hind legs, forepaws on the scratching post
  scratch: { h: 0.205, pitch: -0.62, roll: 0, chest: -0.12, loin: 0.08, neck: 0.32, head: 0.36, fa: -1.6, fb: 0.3, fc: -0.35, ha: 0.62, hb: 0.42, hc: -0.75, flat: 1, tLift: 0.25, tBend: 0.12, tCurl: 0.08, tTip: -0.05, tWrap: 0, ear: 0 },
};
const KEYS = Object.keys(POSES.stand);
const POSE_OF = {
  idle: 'stand', walk: 'stand', curl: 'stand', rub: 'stand', sit: 'sit', groom: 'sit', watch: 'sit', knead: 'sit', loaf: 'loaf',
  sleep: 'sleep', stretch: 'stretch', happy: 'loaf', drink: 'crouch', sniff: 'crouch', stalk: 'stalk', pounce: 'stalk', scratch: 'scratch',
};

/**
 * opts: { rich, low, fur: number of fur shells (0 = none), home: {x, z, r} }
 * update(dt, time, ctx) where ctx = { px, pz, camY, cam: camera position, moving, night, light (0..1),
 *   indoor, room, rest: {x, z} the dog's place by the fire, ground(x, z), blocks, buddy: the corgi }
 * What it decides to do comes from outside (`cat.brain(dt, ctx)`, see catmind.js); this module is
 * the body: it walks where it is sent, holds the pose of its state and keeps its face alive.
 */
export function createCat(opts = {}) {
  const m = build(!!opts.rich, opts.fur || 0);
  const home = opts.home || { x: 0, z: 0, r: 7 };
  const cat = {
    group: m.root, meshes: m.meshes, name: 'Choco', home,
    x: home.x + 1.2, z: home.z + 0.6, y: 0, heading: 1, speed: 0, perch: 0,
    state: 'sit', timer: 4, target: null, path: null, run: 0, after: '',
    phase: 0, happy: 0, petCount: 0, wasAsleep: false,
    blink: 3, slow: 0, lid: 0, look: 0, lookPitch: 0, tilt: 0, twitch: [0, 0], twitchT: 2,
    pupil: 0.3, groomT: 0, swish: 0, annoyed: 0, curious: 0,
    // set by the mind: a point to look at, the face it wears, short gestures
    attend: null, expr: { ear: 0, away: 0, lid: 0, tailUp: 0 }, slowOk: false,
    yawnT: 0, tiltT: 0, tiltSide: 1, lean: 0, wiggle: 0, turnRate: 0, pounceT: 0, pounceV: 0, onLand: null,
    stuck: 0, blocked: false, onScreen: true, inside: false,
    pose: { ...POSES.sit }, frame: 0, brain: null,
  };
  const groundY = (ctx, x, z) => (ctx.indoor && ctx.room ? ctx.room.floorY : ctx.ground(x, z));
  const goTo = (x, z, run = 0) => { cat.path = null; cat.target = { x, z }; cat.run = run; cat.blocked = false; prog.t = 0; prog.d = 1e9; prog.tries = 0; prog.all = 0; };
  const setState = (s, t) => { cat.state = s; cat.timer = t; if (s === 'groom') cat.groomT = 0; };
  const clear = (ctx, x, z) => !ctx.blocks.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br + 0.35);
  cat.goTo = goTo;
  cat.setState = setState;
  cat.clear = clear;
  /** walk a list of waypoints ([x, z] pairs), the last one being where it means to stop */
  cat.follow = (pts, run = 0) => { goTo(pts[0][0], pts[0][1], run); cat.path = pts.slice(1).map(([x, z]) => ({ x, z })); };
  /** a resting place beside the dog's: to its side, facing the same way */
  cat.besideDog = (ctx) => {
    const r = ctx.rest, d = ctx.buddy;
    // once the dog has settled, beside the dog itself; until then, beside its place
    const at = d && Math.hypot(d.x - r.x, d.z - r.z) < 1.2 ? d : r;
    const ang = d ? d.heading : 0;
    // whichever side of it is free (not in the fire ring or a rock) and nearer
    const sides = [1, -1].map((k) => [at.x + k * Math.cos(ang) * 0.56, at.z - k * Math.sin(ang) * 0.56])
      .filter(([x, z]) => !ctx.blocks.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br + 0.15));
    if (!sides.length) return [at.x - Math.sin(ang) * 0.75, at.z - Math.cos(ang) * 0.75];   // behind it, then
    sides.sort((a, b) => Math.hypot(a[0] - cat.x, a[1] - cat.z) - Math.hypot(b[0] - cat.x, b[1] - cat.z));
    return sides[0];
  };
  cat.distanceTo = (x, z) => Math.hypot(x - cat.x, z - cat.z);
  /** put it somewhere at once (through a door, under a fade); perch: height above the floor (a chair) */
  cat.place = (x, z, heading, state = 'sit', t = 4, perch = 0) => {
    cat.x = x; cat.z = z; cat.heading = heading; cat.speed = 0; cat.target = null; cat.path = null; cat.perch = perch;
    cat.pounceT = 0; cat.turnRate = 0; cat.wiggle = 0; cat.lean = 0; cat.yawnT = 0; cat.blocked = false;
    setState(state, t);
    Object.assign(cat.pose, POSES[POSE_OF[state] || 'stand']);
  };
  /** gestures the mind can ask for */
  cat.yawn = () => { if (cat.yawnT <= 0) cat.yawnT = 1.9; };
  cat.tiltHead = (side = 1) => { cat.tiltT = 1.3; cat.tiltSide = side; };
  cat.slowBlink = () => { cat.slow = 1.7; };
  /** a short leap of `dist` metres along its heading (onto a toy); onLand is called when it lands */
  cat.pounce = (dist, onLand) => { setState('pounce', 0.5); cat.pounceT = 0.46; cat.pounceV = clamp(dist, 0.15, 0.7) / 0.46; cat.onLand = onLand || null; cat.target = null; cat.path = null; };

  /* ---------- moving ---------- */
  // Steering: straight for the target, swinging round any obstacle circle that lies across the
  // way (always round the same side of the same obstacle, so it does not dither), a detour when
  // it stops getting closer, and after two failed detours it gives up and says so (`blocked`),
  // for the mind to choose somewhere else.
  const prog = { t: 0, d: 1e9, tries: 0, all: 0 };
  let avoidIdx = -1, avoidSide = 1;
  function steer(ctx, ang, d) {
    if (ctx.indoor) return ang;
    const fx = Math.sin(ang), fz = Math.cos(ang), look = Math.min(d, 1.4);
    let best = -1, bestT = 1e9;
    for (let i = 0; i < ctx.blocks.length; i++) {
      const [bx, bz, br] = ctx.blocks[i];
      const ox = bx - cat.x, oz = bz - cat.z, t = ox * fx + oz * fz;
      if (t <= 0 || t > look + br) continue;
      const side = Math.abs(ox * fz - oz * fx);
      if (side < br + 0.22 && t < bestT) { bestT = t; best = i; }
    }
    if (best < 0) { avoidIdx = -1; return ang; }
    const [bx, bz, br] = ctx.blocks[best];
    const ox = bx - cat.x, oz = bz - cat.z, dist = Math.hypot(ox, oz);
    if (best !== avoidIdx) { avoidIdx = best; avoidSide = (ox * fz - oz * fx) > 0 ? -1 : 1; }
    const off = Math.asin(clamp((br + 0.3) / Math.max(dist, 1e-3), 0, 1)) + 0.08;
    return Math.atan2(ox, oz) + avoidSide * off;
  }
  function move(dt, ctx) {
    let want = 0;
    if (!cat.target && cat.path && cat.path.length) { cat.target = cat.path.shift(); prog.d = 1e9; prog.t = 0; prog.all = 0; }
    if (cat.pounceT > 0) {
      cat.pounceT -= dt;
      want = cat.pounceV;
      cat.speed = want;
      if (cat.pounceT <= 0) { cat.pounceT = 0; cat.speed = 0; want = 0; const f = cat.onLand; cat.onLand = null; if (f) f(); }
    } else if (cat.target && !cat.perch) {
      const dx = cat.target.x - cat.x, dz = cat.target.z - cat.z, d = Math.hypot(dx, dz);
      const via = cat.path && cat.path.length;
      if (d < (via ? 0.35 : 0.1)) { cat.target = null; if (!via) cat.path = null; }
      else {
        const ang = steer(ctx, Math.atan2(dx, dz), d);
        const turn = wrap(ang - cat.heading);
        cat.heading = wrap(cat.heading + clamp(turn, -3.6 * dt, 3.6 * dt));
        const top = cat.state === 'stalk' ? 0.22 : mix(0.5, 1.3, cat.run);
        want = top * clamp(d / 0.6, via ? 1 : 0.3, 1) * (1 - 0.75 * smooth(0.5, 1.5, Math.abs(turn)));
        // not getting any closer: try a detour, then give up (the clock only runs while it is
        // pointed the right way and under way: turning round to set off is not being stuck)
        if (Math.abs(turn) < 0.6 && cat.speed > 0.15) prog.t += dt;
        // (and however it is turning, a minute on one leg of the way is too long: it gives up)
        prog.all += dt;
        if (prog.all > 60) { cat.target = null; cat.path = null; cat.blocked = true; prog.all = 0; }
        if (prog.t > 1.8) {
          if (d > prog.d - 0.12) {
            if (prog.tries < 2) {
              prog.tries++;
              const s = prog.tries % 2 ? 1 : -1, px = -dz / d, pz = dx / d;
              let wx = cat.x + px * s * 1.3 + (dx / d) * 0.4, wz = cat.z + pz * s * 1.3 + (dz / d) * 0.4;
              if (ctx.indoor && ctx.room) [wx, wz] = ctx.room.confine(wx, wz, 0.2, true);
              cat.path = [cat.target, ...(cat.path || [])];
              cat.target = { x: wx, z: wz };
            } else { cat.target = null; cat.path = null; cat.blocked = true; }
          }
          prog.d = d; prog.t = 0;
        }
      }
    }
    if (cat.pounceT <= 0) cat.speed += (want - cat.speed) * (1 - Math.exp(-dt * (want > cat.speed ? 3.5 : 6)));
    if (cat.speed < 0.01) cat.speed = 0;
    if (cat.turnRate) cat.heading = wrap(cat.heading + cat.turnRate * dt);
    if (cat.perch) return;
    let nx = cat.x + Math.sin(cat.heading) * cat.speed * dt, nz = cat.z + Math.cos(cat.heading) * cat.speed * dt;
    if (ctx.indoor && ctx.room) [nx, nz] = ctx.room.confine(nx, nz, 0.2, true);
    else for (const [bx, bz, br] of ctx.blocks) {
      const ox = nx - bx, oz = nz - bz, d = Math.hypot(ox, oz), rr = br + 0.12;
      if (d < rr && d > 1e-4) { nx = bx + (ox / d) * rr; nz = bz + (oz / d) * rr; }
    }
    // never underfoot, never inside the dog
    const push = (cx, cz, r) => { const ox = nx - cx, oz = nz - cz, d = Math.hypot(ox, oz); if (d < r && d > 1e-4) { nx = cx + (ox / d) * r; nz = cz + (oz / d) * r; } };
    push(ctx.px, ctx.pz, 0.48);
    if (ctx.buddy) push(ctx.buddy.x, ctx.buddy.z, 0.42);
    // the stream's edge: it stops short (but if it is already in the water, any step is allowed)
    if (ctx.safe && !ctx.safe(nx, nz) && ctx.safe(cat.x, cat.z)) { nx = cat.x; nz = cat.z; }
    cat.x = nx; cat.z = nz;
  }

  /* ---------- the body ---------- */
  function animate(dt, time, ctx, dP) {
    const p = cat.pose;
    let want = POSE_OF[cat.state] || 'stand';
    if (cat.speed > 0.06 && want !== 'stalk') want = 'stand';
    if (cat.state === 'happy' && !cat.wasAsleep) want = 'sit';
    const tgt = POSES[want];
    const k = 1 - Math.exp(-dt * (want === 'stand' ? 5 : want === 'stretch' || want === 'scratch' ? 3 : want === 'stalk' ? 4 : 2.6));
    for (const key of KEYS) p[key] += (tgt[key] - p[key]) * k;

    // turning on the spot (before lying down) steps as walking does
    const stepSpeed = Math.max(cat.speed, Math.abs(cat.turnRate) * 0.11);
    const move = cat.pounceT > 0 ? 0 : clamp(stepSpeed / 0.4, 0, 1);
    const run = clamp((cat.speed - 0.7) / 0.6, 0, 1);
    const stride = cat.state === 'stalk' ? 0.16 : mix(0.30, 0.5, run);
    cat.phase = (cat.phase + dt * stepSpeed / stride) % 1;
    const duty = mix(0.64, 0.5, run);
    const A = mix(0.36, 0.5, run) * move * (cat.state === 'stalk' ? 0.6 : 1);
    const offs = [[0.25, 0], [0.75, 0.5], [0, 0.5], [0.5, 0]];   // LF, RF, LH, RH : [walk, trot]
    // the body's pitch and the spine, so the paws can be kept flat
    const ahead = groundY(ctx, cat.x + Math.sin(cat.heading) * 0.18, cat.z + Math.cos(cat.heading) * 0.18);
    const behind = groundY(ctx, cat.x - Math.sin(cat.heading) * 0.18, cat.z - Math.cos(cat.heading) * 0.18);
    const slope = cat.perch ? 0 : Math.atan2(ahead - behind, 0.36);
    const pitch = p.pitch - slope * (want === 'stand' || want === 'stalk' ? 1 : 0.4);
    // grooming: one forepaw up to the mouth, licked, then drawn over the face
    let gA = 0, gB = 0, gC = 0, gHead = 0, gTurn = 0, gTilt = 0, licking = false;
    if (cat.state === 'groom' && cat.speed < 0.05) {
      cat.groomT += dt;
      const up = smooth(0.2, 0.9, cat.groomT) * smooth(0, 0.6, cat.timer);
      const wipe = smooth(0.4, 0.6, Math.sin(cat.groomT * 0.9)) * up;
      licking = up > 0.6 && wipe < 0.4;
      gA = -mix(0.95, 1.25, wipe) * up; gB = mix(1.9, 2.15, wipe) * up; gC = 0.6 * up;
      gHead = mix(0.32, -0.05, wipe) * up + (licking ? 0.07 * Math.sin(time * 9) : 0);
      gTurn = mix(0.22, 0.42, wipe) * up; gTilt = mix(0.0, 0.32, wipe) * up;
      if (wipe > 0.4) gA += 0.12 * Math.sin(time * 4) * up;
    }
    // kneading: the forepaws press down in turn, slowly, as if into a blanket
    const kneading = cat.state === 'knead' && cat.speed < 0.05 ? 1 : 0;
    // scratching: the forepaws rake down the post in turn
    const scratching = cat.state === 'scratch' && cat.speed < 0.05 ? 1 : 0;
    // the leap: front legs reach, hind legs push out behind, the body lifts on an arc
    const leap = cat.pounceT > 0 ? Math.sin(Math.PI * clamp(1 - cat.pounceT / 0.46, 0, 1)) : 0;
    m.legs.forEach((leg, i) => {
      const s = (cat.phase + mix(offs[i][0], offs[i][1], run)) % 1;
      let ang, bend = 0;
      if (s < duty) ang = mix(-A, A, s / duty);
      else { const u = (s - duty) / (1 - duty); ang = mix(A, -A, u * u * (3 - 2 * u)); bend = Math.sin(u * Math.PI) * move; }
      const groomLeg = leg.front && leg.side === 1;
      if (leg.front) {
        const press = kneading * Math.max(0, Math.sin(time * 4.2 + (leg.side > 0 ? 0 : Math.PI)));
        const rake = scratching * Math.sin(time * 7 + (leg.side > 0 ? 0 : Math.PI));
        leg.a.rotation.x = p.fa + ang + (groomLeg ? gA : 0) - 0.32 * press + 0.22 * rake - 0.9 * leap;
        leg.b.rotation.x = p.fb - 0.55 * bend + (groomLeg ? gB : 0) - 0.55 * press - 0.15 * rake;
        leg.c.rotation.x = p.fc + 1.2 * bend + (groomLeg ? gC : 0) + 0.65 * press;
        leg.paw.rotation.x = -(pitch + p.chest + leg.a.rotation.x + leg.b.rotation.x + leg.c.rotation.x) * p.flat * (groomLeg && gA < -0.1 ? 0 : 1) * (1 - leap);
      } else {
        leg.a.rotation.x = p.ha + ang + 0.75 * leap;
        leg.b.rotation.x = p.hb + 0.6 * bend - 0.4 * leap;
        leg.c.rotation.x = p.hc - 0.85 * bend + 0.3 * leap;
        leg.paw.rotation.x = -(pitch + p.loin + leg.a.rotation.x + leg.b.rotation.x + leg.c.rotation.x) * p.flat * (1 - leap);
      }
    });
    const bob = -0.007 * Math.cos(cat.phase * TAU * 2) * move;
    // the butt wiggle before a pounce, and a lean into you when it rubs past
    cat.wiggle = Math.max(0, cat.wiggle - dt);
    const wig = cat.wiggle > 0 ? Math.sin(time * 26) * smooth(0, 0.3, cat.wiggle) : 0;
    m.body.position.y = p.h + bob + 0.075 * leap;
    m.body.rotation.x = pitch - 0.25 * leap * (1 - 2 * clamp(1 - cat.pounceT / 0.46, 0, 1));
    m.body.rotation.z = p.roll + 0.02 * Math.sin(cat.phase * TAU) * move - 0.16 * cat.lean + 0.025 * wig;
    m.chest.rotation.x = p.chest + 0.02 * Math.sin(cat.phase * TAU * 2) * move;
    m.loin.rotation.x = p.loin - 0.02 * Math.sin(cat.phase * TAU * 2 + 1) * move;
    m.loin.rotation.y = 0.04 * Math.sin(cat.phase * TAU) * move + 0.14 * wig;         // the hips swing as it walks
    // breath: the chest rises and falls, slower asleep
    const br = Math.sin(time * (cat.state === 'sleep' ? 1.6 : 2.6)) * 0.008;
    m.chest.scale.set(1 + br, 1 + br, 1);

    // the head: on whatever it is attending to (sent by the mind), else on you when you are
    // near, otherwise watching things; turned away when it wants to be left alone
    let look = 0, lookUp = 0;
    const calm = cat.state === 'sit' || cat.state === 'loaf' || cat.state === 'idle' || cat.state === 'happy' || cat.state === 'watch' || cat.state === 'knead';
    const busy = cat.state === 'sleep' || cat.state === 'groom' || cat.state === 'drink' || cat.state === 'scratch' || cat.state === 'curl';
    if (cat.attendYou && !busy && cat.expr.away < 0.5) {
      // you called, held out a hand, blinked at it: it looks at you, ears forward
      look = wrap(Math.atan2(ctx.px - cat.x, ctx.pz - cat.z) - cat.heading);
      lookUp = -Math.atan2((ctx.camY || 1.6) - 0.3 - cat.perch, Math.max(dP, 0.4)) * 0.8;
      if (Math.abs(look) > 1.3 && cat.speed < 0.05 && calm) cat.heading = wrap(cat.heading + clamp(look, -1, 1) * dt * 1.6);
      look = clamp(look, -1.25, 1.25);
    } else if (cat.attend && !busy) {
      const a = cat.attend;
      look = wrap(Math.atan2(a.x - cat.x, a.z - cat.z) - cat.heading);
      lookUp = -Math.atan2((a.y ?? cat.y + 0.3) - cat.y - 0.3 - cat.perch, Math.max(Math.hypot(a.x - cat.x, a.z - cat.z), 0.3)) * 0.8;
      if (Math.abs(look) > 1.3 && cat.speed < 0.05 && calm) cat.heading = wrap(cat.heading + clamp(look, -1, 1) * dt * 1.4);
      look = clamp(look, -1.25, 1.25);
    } else if (dP < 6 && !busy && cat.expr.away < 0.5) {
      look = wrap(Math.atan2(ctx.px - cat.x, ctx.pz - cat.z) - cat.heading);
      lookUp = -Math.atan2((ctx.camY || 1.6) - 0.3 - cat.perch, Math.max(dP, 0.4)) * 0.8;
      if (Math.abs(look) > 1.4 && cat.speed < 0.05 && calm) cat.heading = wrap(cat.heading + clamp(look, -1, 1) * dt * 1.2);
      look = clamp(look, -1.2, 1.2);
    } else if (calm || cat.expr.away >= 0.5) {
      look = Math.sin(time * 0.29 + 0.7) * 0.8 + Math.sin(time * 1.13) * 0.15;
      lookUp = -0.15 * Math.max(0, Math.sin(time * 0.21));
      if (cat.expr.away >= 0.5) {                       // its head turned from you, not at you
        const toYou = wrap(Math.atan2(ctx.px - cat.x, ctx.pz - cat.z) - cat.heading);
        look = clamp(-Math.sign(toYou || 1) * 0.9 + 0.15 * Math.sin(time * 0.4), -1.2, 1.2);
      }
    }
    if (cat.lean) look = clamp(look + cat.lean * 0.5, -1.2, 1.2);
    cat.look += (look - cat.look) * (1 - Math.exp(-dt * 3.5));
    cat.lookPitch += (lookUp - cat.lookPitch) * (1 - Math.exp(-dt * 3.5));
    const headBack = -(pitch + p.chest) * (want === 'stand' || want === 'stalk' ? 0.6 : 0);  // keep the eyes level on a slope
    // a yawn: the head goes back, the eyes shut, the jaw drops wide, then it all closes again
    cat.yawnT = Math.max(0, cat.yawnT - dt);
    const yu = 1 - cat.yawnT / 1.9;
    const yawn = cat.yawnT > 0 ? smooth(0.05, 0.35, yu) * (1 - smooth(0.7, 0.98, yu)) : 0;
    m.neck.rotation.y = cat.look * 0.45 + gTurn * 0.4;
    m.neck.rotation.x = p.neck + gHead * 0.5 - 0.15 * yawn;
    m.head.rotation.y = cat.look * 0.55 + gTurn * 0.6;
    m.head.rotation.x = p.head + headBack + cat.lookPitch * (cat.state === 'groom' ? 0 : 1) + gHead + 0.04 * Math.sin(cat.phase * TAU * 2 + 0.5) * move - 0.32 * yawn;
    m.jaw.rotation.x = 0.62 * yawn + (cat.state === 'drink' ? 0.08 * Math.max(0, Math.sin(time * 7)) : 0);
    m.maw.visible = yawn > 0.02;
    m.maw.scale.y = 0.05 + 1.05 * yawn;
    // the tilt of a head at a sound or a question; held still, not wobbled
    cat.tiltT = Math.max(0, cat.tiltT - dt);
    const tiltWant = cat.state === 'happy' ? 0.35 : cat.tiltT > 0 ? 0.3 * cat.tiltSide * smooth(0, 0.25, cat.tiltT) : gTilt;
    cat.tilt += (tiltWant - cat.tilt) * (1 - Math.exp(-dt * 4));
    m.head.rotation.z = cat.tilt;
    const lapping = cat.state === 'drink' && Math.sin(time * 7) > 0.2;
    m.tongue.visible = (licking && Math.sin(time * 9) > -0.2) || lapping || yawn > 0.45;

    // ears: each turns on its own now and then; back when the dog bustles past or it runs;
    // forward when something has its attention, out to the side when it wants to be left alone
    cat.twitchT -= dt;
    if (cat.twitchT < 0) { cat.twitchT = 2 + Math.random() * 6; cat.twitch[Math.random() < 0.5 ? 0 : 1] = 1; }
    if (ctx.buddy && ctx.buddy.speed > 1.2 && Math.hypot(ctx.buddy.x - cat.x, ctx.buddy.z - cat.z) < 1.4) cat.annoyed = 2.5;
    cat.annoyed = Math.max(0, cat.annoyed - dt);
    const back = p.ear + 0.3 * run + 0.6 * smooth(0, 0.6, cat.annoyed) + cat.expr.ear + 0.3 * yawn - (cat.attendYou ? 0.18 : 0);
    const side = 0.35 * smooth(0.3, 0.8, cat.expr.away);
    m.ears.forEach((e, i) => {
      cat.twitch[i] = Math.max(0, cat.twitch[i] - dt * 4);
      const tw = Math.sin(cat.twitch[i] * Math.PI) * 0.5;
      const sx = e.userData.side, b = e.userData.base;
      e.rotation.set(b.x - 0.5 * back, b.y + sx * (0.55 * back + tw) + clamp(cat.look * 0.3, -0.3, 0.3), b.z - sx * (0.25 * back + side));
    });

    // the tail: up with a hook at the tip when it walks, round its feet when it sits, swishing
    // at the tip when it is annoyed, straight up and quivering when it is stroked or greeting you
    const up = want === 'stand' ? smooth(0.0, 0.25, cat.speed) : 0;
    const happyUp = Math.max(cat.state === 'happy' && !cat.wasAsleep ? 1 : 0, cat.expr.tailUp);
    const lift = mix(p.tLift, 1.05, Math.max(up, happyUp));
    const curl = mix(p.tCurl, happyUp ? 0.2 : 0.17, Math.max(up, happyUp));
    const bend1 = mix(p.tBend, happyUp ? 0.2 : 0.17, Math.max(up, happyUp));
    const tip = mix(p.tTip, happyUp ? 0.05 : -0.3, Math.max(up, happyUp));
    const flick = cat.annoyed > 0 || cat.expr.away > 0.5 || cat.state === 'stalk';
    cat.swish += dt * (flick ? 7 : cat.state === 'sleep' ? 0.6 : 2.2);
    const swAmp = flick ? 0.22 : cat.state === 'sleep' ? 0.02 : up > 0.5 ? 0.08 : 0.06;
    m.tail.forEach((t, i) => {
      const along = i / 8;
      t.rotation.x = i === 0 ? lift : i === 1 ? bend1 : i < 6 ? curl : tip;
      // (a flick moves only the end of the tail; the root stays where the pose put it)
      t.rotation.y = p.tWrap * smooth(0, 0.3, along) + swAmp * Math.sin(cat.swish - i * 0.7) * smooth(flick ? 0.5 : 0.2, 1, along)
        + (happyUp > 0.5 ? 0.03 * Math.sin(time * 30) * along : 0);
    });

    // eyes: pupils follow the light (wider when something has its attention); a blink every few
    // seconds; a slow blink at you only when it is at ease with you (the mind says when)
    const pupilWant = mix(0.95, 0.3, clamp(ctx.light ?? 1, 0, 1)) * (cat.state === 'happy' ? 0.85 : 1) * ((cat.attend && cat.state === 'stalk') || cat.attendYou ? 1.35 : 1);
    cat.pupil += (clamp(pupilWant, 0.12, 1) - cat.pupil) * (1 - Math.exp(-dt * 2));
    cat.blink -= dt;
    if (cat.blink < 0) {
      cat.blink = 3 + Math.random() * 4;
      cat.slow = dP < 3.5 && calm && cat.slowOk ? 1.6 : 0.16;
    }
    cat.slow = Math.max(0, cat.slow - dt);
    let lidWant = cat.state === 'sleep' ? 1 : cat.state === 'happy' ? 0.62 : cat.slow > 0 ? (cat.slow > 0.4 ? 1 : 0.2) : cat.state === 'loaf' ? 0.35 : cat.state === 'knead' ? 0.55 : 0.08;
    if (cat.state !== 'sleep' && cat.slow <= 0) lidWant = clamp(lidWant + cat.expr.lid, 0, 0.85);
    if (licking) lidWant = 0.6;
    if (yawn > 0.2) lidWant = 1;
    cat.lid += (lidWant - cat.lid) * (1 - Math.exp(-dt * (cat.slow > 0.4 && cat.slow < 1.5 ? 3 : 12)));
    for (const e of m.eyes) {
      e.pupil.scale.x = cat.pupil;
      e.upper.rotation.x = mix(-0.42, 1.32, cat.lid);
      e.lower.rotation.x = mix(0.05, -0.32, cat.lid);
      e.glint.visible = cat.lid < 0.7;
      e.glint.material.opacity = 0.35 + 0.45 * clamp(ctx.light ?? 1, 0, 1);
    }

    // fur shells and whiskers: only where you can see them (with a little slack, so the fur
    // does not pop on and off as you sway at the edge of the distance)
    if (ctx.cam) {
      const dc = Math.hypot(ctx.cam.x - cat.x, ctx.cam.y - (cat.y + 0.2), ctx.cam.z - cat.z);
      const nearAt = opts.furNear || 2.6;
      const near = m.shells.length && (m.shells[0].visible ? dc < nearAt + 0.25 : dc < nearAt);
      for (const s of m.shells) s.visible = !!near;
      m.whMat.opacity = clamp(1.1 - dc * 0.35, 0, 0.4);
      m.whMat.color.setHex(0xe8e0d4).multiplyScalar(0.18 + 0.74 * clamp(ctx.light ?? 1, 0, 1));   // whiskers are lit like the rest of it
    }
  }

  /** where its head is, in the world (for the name card); a point lifted above the skull */
  cat.headPos = (out) => { m.head.getWorldPosition(out); return out; };

  /** for the test tools: walk (run 0) or trot (run 1) to a point; hold a state where it is */
  cat.walkTo = (x, z, run = 0) => { cat.scripted = true; goTo(x, z, run); setState('walk', 99); };
  cat.hold = (state) => { cat.scripted = true; cat.target = null; cat.path = null; setState(state, 99); };
  cat.free = () => { cat.scripted = false; setState('idle', 1); };
  cat.parts = m;

  cat.update = (dt, time, ctx) => {
    const dP = Math.hypot(ctx.px - cat.x, ctx.pz - cat.z);
    cat.inside = !!ctx.indoor;
    if (cat.scripted) {
      if (cat.happy > 0) { cat.happy -= dt; if (cat.happy <= 0) setState('sit', 99); }
      if (cat.state === 'groom' && cat.timer < 1) cat.timer = 99;
    } else cat.timer -= dt;
    // the mind always hears what is around it; it only decides when the cat is not held by a test
    if (cat.brain) cat.brain(dt, ctx, dP, !!cat.scripted);
    move(dt, ctx);
    cat.y = groundY(ctx, cat.x, cat.z) + cat.perch;
    m.root.position.set(cat.x, cat.y, cat.z);
    m.root.rotation.y = cat.heading;
    cat.frame++;
    cat.acc = (cat.acc || 0) + dt;
    // the pose is worked out less often when it would not show: on low every other frame, and
    // when it is off screen and not close, every third (it keeps living; only the bones wait)
    const every = !cat.onScreen && dP > 3 ? 3 : opts.low ? 2 : 1;
    if (cat.frame % every) return;
    animate(cat.acc, time, ctx, dP);
    cat.acc = 0;
  };
  return cat;
}
