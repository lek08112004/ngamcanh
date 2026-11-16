// Bấc, the winter snowman, and the windbreak he keeps.
//
// An original character of this valley (not drawn from any film or book): three lumpy snowballs,
// pebble eyes and a pebble smile, a carrot for a nose, two forked twigs for arms, a knitted scarf
// and one of bà Vân's terracotta pots for a hat. He is named after the wind he stands against
// (gió bấc, the north wind), is proud of the job, counts snowflakes and loses count, and says he
// goes away in spring "to work as the stream". He is only there in winter.
//
// Beside him a low crescent of packed snow shelters a bed of straw, open toward the fire. On
// winter nights Bơ and Choco sleep there instead of by the fire (main.js hands their minds this
// place as `rest`; nothing in corgi.js or cat.js changed for it).
//
// He stands still, so he is in the sun's static shadow map like the cabin, not in movers.js. If
// he is ever made to move, his group must go in `movers.roots` instead.
// Everything is built here: geometry, vertex colours, and two small canvas-drawn textures.
import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

/** a snowball: a sphere pushed in and out a little, whiter on top, blue-grey in its hollows and underneath */
function snowball(r, seed, detail, sx = 1, sy = 0.93, sz = 1) {
  const g = new THREE.SphereGeometry(r, detail, Math.round(detail * 0.7));
  const pos = g.attributes.position, v = new THREE.Vector3(), n = new THREE.Vector3();
  const col = new Float32Array(pos.count * 3);
  const WHITE = new THREE.Color('#eef2f6'), BLUE = new THREE.Color('#aebccd'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.copy(v).normalize();
    const lump = Math.sin(n.x * 5.1 + seed) * Math.sin(n.y * 4.3 + seed * 1.7) * Math.sin(n.z * 4.7 + seed * 0.6)
      + 0.5 * Math.sin(n.x * 11.3 + n.y * 9.1 + seed * 2.3) * Math.sin(n.z * 10.2 + seed);
    v.addScaledVector(n, r * 0.045 * lump);
    v.set(v.x * sx, v.y * sy, v.z * sz);
    pos.setXYZ(i, v.x, v.y, v.z);
    c.copy(WHITE).lerp(BLUE, clamp(0.45 * smooth(0.25, -0.9, n.y) + 0.3 * smooth(0.2, -0.9, lump), 0, 1));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** the grain of packed snow, for the bump map: soft pocks and a fine speckle */
function snowGrain() {
  const n = 128, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const g = cv.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, n, n);
  let s = 31;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const x = r() * n, y = r() * n, rad = 2 + r() * 7, up = r() < 0.5;
    for (const [dx, dy] of [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n]]) {      // wrapped, so the tile repeats
      const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      gr.addColorStop(0, up ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)');
      gr.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

/** the scarf's knitting: rows of little V stitches, broad stripes of red and cream */
function knit() {
  const w = 64, h = 64, cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  for (let y = 0; y < h; y += 4) {
    const cream = Math.floor(y / 16) % 2 === 1;
    g.fillStyle = cream ? '#e9dcc0' : '#b3261e'; g.fillRect(0, y, w, 4);
    g.strokeStyle = cream ? 'rgba(120,96,60,0.55)' : 'rgba(70,8,6,0.6)';
    g.lineWidth = 1;
    for (let x = 0; x < w; x += 4) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 3.5); g.lineTo(x + 4, y); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** straw laid down for the animals: pale strokes every way over a darker ground */
function straw() {
  const n = 256, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const g = cv.getContext('2d');
  g.fillStyle = '#7d6535'; g.fillRect(0, 0, n, n);
  let s = 77;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = r() * n, y = r() * n, a = r() * Math.PI, l = 14 + r() * 34, k = r();
    g.strokeStyle = `rgba(${Math.round(170 + k * 60)},${Math.round(140 + k * 55)},${Math.round(70 + k * 40)},${0.55 + r() * 0.4})`;
    g.lineWidth = 1 + r() * 1.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * opts: { rich: bump-mapped snow and finer balls, ground(x, z), at: {x, z} where he stands,
 *         shelter: {x, z} the middle of the straw bed he guards }
 * returns { group, x, z, shelter, entry(x, z) -> where to walk to first, blocks: [[x, z, r]] (zero radius while he is away), snowable: materials
 *           that should take lying snow, setWinter(w), greet() -> a line of his, distanceTo(x, z) }
 */
export function createSnowman(opts) {
  const { ground, at, shelter } = opts;
  const rich = !!opts.rich, detail = rich ? 30 : 18;
  const group = new THREE.Group();
  group.name = 'snowman';
  const y0 = ground(at.x, at.z);
  group.position.set(at.x, y0, at.z);
  const snowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  if (rich) { snowMat.bumpMap = snowGrain(); snowMat.bumpScale = 1.6; }
  const stone = new THREE.MeshStandardMaterial({ color: 0x23211f, roughness: 0.55 });
  const twig = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.9 });
  const carrot = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const wool = new THREE.MeshStandardMaterial({ map: knit(), roughness: 0.95 });
  const clay = new THREE.MeshStandardMaterial({ color: 0xb5613c, roughness: 0.85 });
  const cone = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.9 });
  const green = new THREE.MeshStandardMaterial({ color: 0x2f5a34, roughness: 0.8 });
  const strawMat = new THREE.MeshStandardMaterial({ map: straw(), roughness: 1 });

  // he faces the straw bed and the fire beyond it
  const face = Math.atan2(shelter.x - at.x, shelter.z - at.z);
  const man = new THREE.Group();
  man.rotation.y = face + 0.18;
  group.add(man);
  const add = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  add(man, snowball(0.40, 1.3, detail, 1.04, 0.9, 1.0), snowMat, 0, 0.33, 0);
  add(man, snowball(0.29, 4.1, detail), snowMat, 0.01, 0.86, 0.0);
  const head = new THREE.Group();
  head.position.set(0, 1.27, 0.01);
  head.rotation.set(-0.05, 0.12, 0.06);                       // a cheerful tilt
  man.add(head);
  add(head, snowball(0.20, 7.7, detail, 1, 0.95, 1), snowMat, 0, 0, 0);
  // pebble eyes, a little uneven, and a wide pebble smile
  for (const [sx, s] of [[-1, 1.0], [1, 1.15]]) {
    const e = add(head, new THREE.SphereGeometry(0.024 * s, 12, 10), stone, sx * 0.072, 0.055, 0.176);
    e.scale.set(1, 1.2, 0.55);
  }
  for (let i = 0; i < 7; i++) {
    const t = (i - 3) / 3, a = t * 0.62;
    const p = add(head, new THREE.SphereGeometry(0.011 + (i % 2) * 0.002, 8, 6), stone, Math.sin(a) * 0.168, -0.085 + t * t * 0.052, Math.cos(a) * 0.168 + 0.012);
    p.scale.z = 0.6;
  }
  // the carrot: tapering, a little crooked, darker in its rings
  {
    const g = new THREE.ConeGeometry(0.032, 0.21, 12, 10).rotateX(Math.PI / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    const O = new THREE.Color('#e8761c'), D = new THREE.Color('#b94f0e');
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      pos.setY(i, pos.getY(i) + 0.9 * (z + 0.105) * (z + 0.105));                 // the tip turns up
      c.copy(O).lerp(D, 0.6 * smooth(0.55, 1, 0.5 + 0.5 * Math.sin(z * 190)));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    add(head, g, carrot, 0.004, -0.012, 0.285).rotation.set(-0.1, 0.08, 0);
  }
  // the hat: an upturned terracotta pot, askew, a sprig of evergreen stuck in its drain hole
  {
    const hat = new THREE.Group();
    hat.position.set(-0.02, 0.185, -0.01);
    hat.rotation.set(-0.12, 0, 0.2);
    head.add(hat);
    add(hat, new THREE.CylinderGeometry(0.082, 0.118, 0.15, 20), clay, 0, 0.075, 0);
    add(hat, new THREE.CylinderGeometry(0.128, 0.128, 0.032, 20), clay, 0, 0.012, 0);
    add(hat, new THREE.ConeGeometry(0.03, 0.11, 7), green, 0.01, 0.2, 0).rotation.z = -0.25;
    add(hat, new THREE.ConeGeometry(0.022, 0.08, 7), green, -0.02, 0.185, 0.01).rotation.z = 0.5;
  }
  // the scarf: a roll round the neck and one end hanging down the front
  {
    const ring = add(man, new THREE.TorusGeometry(0.185, 0.05, 10, 28), wool, 0, 1.085, 0.005);
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(1, 1, 0.75);
    wool.map.repeat.set(6, 1);
    const tailMat = wool.clone();
    tailMat.map = wool.map.clone(); tailMat.map.repeat.set(1, 2); tailMat.map.needsUpdate = true;
    const tail = add(man, new THREE.BoxGeometry(0.1, 0.34, 0.022, 1, 6, 1), tailMat, 0.12, 0.93, 0.262);
    tail.rotation.set(0.2, 0.1, -0.16);
    const pos = tail.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + 0.05 * Math.pow((0.17 - pos.getY(i)) / 0.34, 2));   // it follows the belly
    tail.geometry.computeVertexNormals();
    group.userData.scarf = [wool, tailMat];
  }
  // pine-cone buttons
  for (const [y, z] of [[0.97, 0.262], [0.86, 0.292], [0.75, 0.268]]) {
    add(man, new THREE.SphereGeometry(0.024, 8, 8), cone, 0.0, y, z).scale.set(1, 1.25, 0.7);
  }
  // twig arms: one up in a wave, one out, each with two fingers
  for (const [sx, lift] of [[-1, 0.95], [1, 0.3]]) {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.25, 0.93, 0.02);
    arm.rotation.set(0, 0, -sx * (Math.PI / 2 - lift));
    man.add(arm);
    add(arm, new THREE.CylinderGeometry(0.009, 0.017, 0.56, 6), twig, 0, 0.28, 0);
    for (const [a, l, at2] of [[0.6, 0.16, 0.42], [-0.7, 0.13, 0.5]]) {
      const f = add(arm, new THREE.CylinderGeometry(0.005, 0.008, l, 5).translate(0, l / 2, 0), twig, 0, at2, 0);
      f.rotation.set(a * 0.4, 0, a);
    }
  }

  // the windbreak: mounds of packed snow in a crescent behind the straw, he in the middle of it
  const blocks = [[at.x, at.z, 0.52]];
  const R = Math.hypot(shelter.x - at.x, shelter.z - at.z);
  const back = Math.atan2(at.x - shelter.x, at.z - shelter.z);          // from the bed toward him
  let k = 0;
  for (const da of [-1.12, -0.72, 0.72, 1.12]) {
    const a = back + da, wx = shelter.x + Math.sin(a) * R, wz = shelter.z + Math.cos(a) * R;
    // low and long, like snow shovelled into a bank, lower toward the ends
    const hgt = 0.44 - 0.12 * Math.abs(da) + 0.03 * Math.sin(k * 2.1);
    const m = add(group, snowball(0.3, 10 + k * 3.7, rich ? 20 : 12, 1.45, hgt / 0.3, 0.8), snowMat, wx - at.x, ground(wx, wz) - y0 + hgt * 0.3, wz - at.z);
    m.rotation.y = a + Math.PI / 2;
    blocks.push([wx, wz, 0.27]);
    k++;
  }
  // the straw bed, laid on the ground as it lies
  {
    const g = new THREE.CircleGeometry(0.82, 28).rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) * (1 + 0.06 * Math.sin(i * 2.4)), z = pos.getZ(i) * (1 + 0.06 * Math.cos(i * 1.7));
      pos.setXYZ(i, x, ground(shelter.x + x, shelter.z + z) - y0 + 0.022, z);
    }
    g.computeVertexNormals();
    add(group, g, strawMat, shelter.x - at.x, 0, shelter.z - at.z);
  }
  const radii = blocks.map((b) => b[2]);

  const LINES = [
    'Bấc: “Chào bạn! Tôi đứng đây chắn gió bấc cho Bơ với Choco. Nghề gia truyền đấy, tên tôi cũng từ đó mà ra.”',
    'Bấc: “Bạn đếm giúp tôi với: từ sáng tới giờ rơi bao nhiêu bông tuyết rồi? Tôi cứ đếm tới bảy là mũi lại ngứa.”',
    'Bấc: “Sang xuân tôi đi vắng ít lâu, xuống làm nước cho con suối. Gặp luống tulip thì chào hộ tôi một tiếng nhé.”',
    'Bấc: “Cái mũ này là chậu hoa bà Vân cho mượn. Hết đông tôi trả, năm nào cũng trả đúng hẹn, chỉ hơi ướt một tí.”',
    'Bấc: “Cực quang ở đây đẹp lắm. Tôi không có cổ nên ngửa mặt hơi khó, đêm nào trời trong bạn ngắm giùm phần tôi.”',
    'Bấc: “Ổ rơm sau lưng tôi là của Bơ với Choco. Đêm nào hai đứa cũng tranh nhau chỗ sát tôi nhất, tôi đứng im cho công bằng.”',
  ];
  const snowman = {
    group, name: 'Bấc', x: at.x, z: at.z, shelter, blocks, here: false, greeted: 0,
    snowable: [clay, cone, twig, ...group.userData.scarf],
    distanceTo: (x, z) => Math.hypot(x - at.x, z - at.z),
    /** the way in for something walking from (x, z): round the end of the bank on its own side, then the straw */
    entry(x, z) {
      const fx = (shelter.x - at.x) / R, fz = (shelter.z - at.z) / R;          // out of the crescent, toward the fire
      const dx = x - shelter.x, dz = z - shelter.z;
      if (dx * fx + dz * fz > 0.15 || Math.hypot(dx, dz) < 0.75) return shelter;
      const side = dx * fz - dz * fx > 0 ? 1 : -1;
      return { x: shelter.x + side * fz * 1.3 + fx * 0.9, z: shelter.z - side * fx * 1.3 + fz * 0.9 };   // (far enough out front that arriving near it counts as past the bank)
    },
    /** w: the winter weight 0..1. He is built up as winter settles and sinks away as it leaves. */
    setWinter(w) {
      const here = w > 0.5;
      group.visible = here;
      group.scale.y = 0.3 + 0.7 * smooth(0.5, 0.92, w);
      blocks.forEach((b, i) => { b[2] = here ? radii[i] : -9; });
      const changed = here !== snowman.here;
      snowman.here = here;
      return changed;
    },
    greet() { return LINES[snowman.greeted++ % LINES.length]; },
  };
  snowman.setWinter(0);
  return snowman;
}
