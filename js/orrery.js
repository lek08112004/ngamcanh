// "Đài mô phỏng": a model of the Sun, the eight planets, the Earth and the Moon. Labelled as a
// simulation everywhere: it is not something you could see through the telescope.
//
// Positions: the same methods as the telescope (astro.js): Standish's Keplerian elements for the
// planets (heliocentric, J2000 ecliptic), the Almanac's low-precision series for the Moon. The
// Earth's axis keeps its 23.44° tilt fixed in space, so the seasons come out of the geometry: the
// latitude where the Sun stands overhead is the Sun's declination. No gravity is simulated.
// Two scales: "Dễ quan sát" (sizes enlarged, distances compressed, both said on screen) and "Tỷ lệ
// thực" (1 AU = 100 units, true radii: the planets are far smaller than a pixel, so rings and
// labels mark where they are).
// It has its own scene and camera and is drawn by the game's renderer instead of the valley while
// open (main.js skips the valley), so there is one render loop and one WebGL context. Its clock is
// its own: the valley's WorldClock is held, not moved.
import * as THREE from 'three';
import { helio, moonPos, sunPos, BODY, PLANET_IDS, AU_KM, nightJD, julian } from './astro.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// ecliptic (x, y, z north) to three.js (y up)
const toThree = (p, s, out) => out.set(p.x * s, p.z * s, -p.y * s);
const SPEEDS = [[-365, '−1 năm/giây'], [-30, '−1 tháng/giây'], [-1, '−1 ngày/giây'], [1 / 24, '1 giờ/giây'], [1, '1 ngày/giây'], [7, '1 tuần/giây'], [30, '1 tháng/giây'], [365, '1 năm/giây']];
const TEXT = {
  sun: 'Ngôi sao ở tâm hệ. Bán kính khoảng 695.700 km, hơn 109 lần Trái Đất. Ở tỷ lệ dễ quan sát, Mặt Trời bị vẽ nhỏ đi rất nhiều.',
  mercury: 'Hành tinh gần Mặt Trời nhất và nhỏ nhất. Quỹ đạo lệch tâm rõ nhất trong tám hành tinh.',
  venus: 'Gần bằng Trái Đất về kích thước nhưng bị mây dày che kín; tự quay ngược chiều và rất chậm.',
  earth: 'Trục quay nghiêng 23,44° và giữ hướng cố định trong không gian khi đi quanh Mặt Trời: vì vậy có mùa. Bề mặt vẽ ở đây là minh hoạ (biển, mây, băng hai cực), không phải bản đồ các lục địa.',
  mars: 'Hành tinh đá đỏ, trục nghiêng gần giống Trái Đất (25,2°) nên cũng có mùa, mỗi mùa dài gần gấp đôi.',
  jupiter: 'Hành tinh lớn nhất, khí khổng lồ. Bốn vệ tinh Galileo của nó thấy được qua kính trên đồi.',
  saturn: 'Khí khổng lồ có vành băng nước. Ở tỷ lệ thực, vành vẫn rộng gần 140.000 km mà chỉ dày cỡ hàng chục mét tới vài trăm mét.',
  uranus: 'Băng khổng lồ nằm nghiêng gần 98°: gần như lăn trên quỹ đạo.',
  neptune: 'Hành tinh xa nhất, mất khoảng 165 năm cho một vòng quanh Mặt Trời.',
  moon: 'Vệ tinh duy nhất của Trái Đất. Pha Trăng là phần nửa được Mặt Trời chiếu sáng mà ta nhìn thấy từ Trái Đất, không phải bóng Trái Đất (trừ khi nguyệt thực).',
};

function planetTex(id) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const base = BODY[id].color;
  g.fillStyle = base; g.fillRect(0, 0, 256, 128);
  let s = id.length * 97;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  if (id === 'jupiter' || id === 'saturn') {
    for (let y = 0; y < 128; y += 3) { g.fillStyle = `rgba(${id === 'jupiter' ? '120,80,50' : '150,120,70'},${0.08 + 0.25 * Math.abs(Math.sin(y * 0.19 + rnd()))})`; g.fillRect(0, y, 256, 3); }
    if (id === 'jupiter') { g.fillStyle = 'rgba(190,90,60,0.7)'; g.beginPath(); g.ellipse(170, 80, 14, 7, 0, 0, Math.PI * 2); g.fill(); }
  } else if (id === 'earth') {
    // illustration: ocean, two ice caps, cloud bands. NOT a map of the continents.
    g.fillStyle = '#1f4e8a'; g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 256, 10); g.fillRect(0, 118, 256, 10);
    for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + 0.25 * rnd()})`; g.beginPath(); g.ellipse(rnd() * 256, 18 + rnd() * 92, 6 + rnd() * 18, 2 + rnd() * 4, 0, 0, Math.PI * 2); g.fill(); }
  } else {
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(0,0,0,${0.05 + 0.1 * rnd()})`; g.beginPath(); g.arc(rnd() * 256, rnd() * 128, 2 + rnd() * 10, 0, Math.PI * 2); g.fill(); }
    if (id === 'mars') { g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, 256, 6); g.fillRect(0, 123, 256, 5); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createOrrery({ renderer, store, audio }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030509);
  const cam = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 20000);
  scene.add(new THREE.AmbientLight(0x404858, 0.35));
  const sunLight = new THREE.PointLight(0xfff4e0, 3.2, 0, 0);
  scene.add(sunLight);
  // a faint backdrop of stars (decoration: random, not a catalogue)
  {
    const n = 1500, pos = new Float32Array(n * 3);
    let s = 3; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u); pos.set([r * Math.cos(a) * 9000, u * 9000, r * Math.sin(a) * 9000], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9aa4b8, size: 1.4, sizeAttenuation: false })));
  }
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  scene.add(sun);
  const bodies = {};
  for (const id of PLANET_IDS) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), new THREE.MeshStandardMaterial({ map: planetTex(id), roughness: 0.9 }));
    const tilt = new THREE.Group(); tilt.add(m); scene.add(tilt);
    bodies[id] = { mesh: m, tilt, orbit: null, pos: new THREE.Vector3() };
    if (id === 'saturn') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.24, 2.27, 64), new THREE.MeshStandardMaterial({ color: 0xd9c89a, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }));
      ring.rotation.x = -Math.PI / 2; m.add(ring);
    }
  }
  // the Earth's axis: fixed in space, pointing at the celestial pole (ecliptic latitude 66.56°, longitude 90°)
  const POLE = new THREE.Vector3(); toThree({ x: 0, y: Math.sin(23.44 * DEG), z: Math.cos(23.44 * DEG) }, 1, POLE);
  const axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.6, 0), new THREE.Vector3(0, 1.6, 0)]), new THREE.LineBasicMaterial({ color: 0xffe2a0 }));
  bodies.earth.mesh.add(axisLine);
  bodies.earth.tilt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), POLE);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshStandardMaterial({ color: 0xcfcbc0, roughness: 1 }));
  scene.add(moon);
  // orbits (one sampled loop each, from the same elements)
  for (const id of PLANET_IDS) {
    const pts = [];
    const period = { mercury: 88, venus: 224.7, earth: 365.26, mars: 687, jupiter: 4333, saturn: 10759, uranus: 30687, neptune: 60190 }[id];
    for (let i = 0; i <= 160; i++) pts.push(helio(id, 2461000 + period * i / 160));
    const g = new THREE.BufferGeometry().setFromPoints(pts.map(() => new THREE.Vector3()));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x5a6478, transparent: true, opacity: 0.6 }));
    line.userData.pts = pts;
    scene.add(line);
    bodies[id].orbit = line;
  }
  // the direction each planet goes: a small arrow ahead of it on its orbit
  const arrows = {};
  for (const id of PLANET_IDS) { const a = new THREE.Mesh(new THREE.ConeGeometry(1, 2.4, 8), new THREE.MeshBasicMaterial({ color: 0xe9c98a })); scene.add(a); arrows[id] = a; }

  /* ---------- DOM ---------- */
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const wrap = el('div', 'orrery hidden'); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'Đài mô phỏng Hệ Mặt Trời');
  const head = el('div', 'orr-head');
  const tag = el('p', 'orr-tag', 'MÔ PHỎNG · không phải cảnh nhìn qua kính');
  const date = el('b', 'orr-date');
  const scaleNote = el('p', 'orr-note');
  head.append(tag, date, scaleNote);
  const labels = el('div', 'orr-labels');
  const side = el('div', 'orr-side');
  const info = el('div', 'orr-info');
  const ctrl = el('div', 'orr-ctrl');
  const bPlay = el('button', 'chip', 'Tạm dừng'); bPlay.type = 'button';
  const speed = el('select', 'scope-select'); speed.setAttribute('aria-label', 'Tốc độ thời gian');
  SPEEDS.forEach(([v, l], i) => { const o = el('option', '', l); o.value = String(i); speed.append(o); });
  speed.value = '4';
  const bReset = el('button', 'chip', 'Về mặc định'); bReset.type = 'button';
  const bScale = el('button', 'chip', 'Tỷ lệ thực'); bScale.type = 'button'; bScale.setAttribute('aria-pressed', 'false');
  const bExit = el('button', 'btn', 'Rời mô phỏng · Esc'); bExit.type = 'button';
  ctrl.append(bPlay, speed, bReset, bScale, bExit);
  const pick = el('div', 'orr-pick'); pick.setAttribute('role', 'group'); pick.setAttribute('aria-label', 'Theo dõi thiên thể');
  for (const id of ['sun', ...PLANET_IDS, 'moon']) { const b = el('button', 'chip', BODY[id].vi); b.type = 'button'; b.dataset.id = id; pick.append(b); }
  const fold = el('button', 'chip orr-fold', 'Thông tin'); fold.type = 'button'; fold.setAttribute('aria-expanded', 'false');
  fold.addEventListener('click', () => { const on = !side.classList.contains('open'); side.classList.toggle('open', on); fold.setAttribute('aria-expanded', String(on)); });
  side.append(ctrl, pick, fold, info);
  wrap.append(labels, head, side);
  document.body.append(wrap);
  const labelEls = {};
  for (const id of ['sun', ...PLANET_IDS, 'moon']) { const l = el('button', 'orr-label', BODY[id].vi); l.type = 'button'; l.dataset.id = id; labels.append(l); labelEls[id] = l; }

  const S = { active: false, jd0: 0, jd: 0, speed: 1, play: true, real: false, follow: 'earth', yaw: 0.6, pitch: 0.5, dist: 30, drag: null, ret: null };
  const scaleOf = () => (S.real ? { au: 100, size: (r) => r / AU_KM * 100, sun: 695700 / AU_KM * 100, moonD: (km) => km / AU_KM * 100, moonR: 1737.4 / AU_KM * 100 } : {
    au: 0, size: (r) => 0.12 + 0.3 * Math.pow(r / 6371, 0.35), sun: 1.3, moonD: () => 1.1, moonR: 0.14,
  });
  const place = (p, out) => {
    if (S.real) return toThree(p, 100, out);
    const r = Math.hypot(p.x, p.y, p.z), k = 6 * Math.pow(r, 0.45) / Math.max(r, 1e-6);
    return toThree(p, k, out);
  };
  function select(id) {
    S.follow = id;
    for (const b of pick.children) b.setAttribute('aria-pressed', String(b.dataset.id === id));
    S.dist = id === 'sun' ? (S.real ? 3200 : 70) : S.real ? (id === 'moon' ? 0.02 : Math.max(0.03, scaleOf().size(BODY[id].r) * 14)) : 6;
    showInfo();
  }
  function showInfo() {
    const id = S.follow, b = BODY[id];
    info.innerHTML = '';
    info.append(el('h3', '', b.vi), el('p', '', TEXT[id]));
    const facts = [];
    if (b.r) facts.push(`Bán kính trung bình: ${b.r.toLocaleString('vi-VN')} km`);
    if (b.a) facts.push(`Bán trục lớn: ${String(b.a).replace('.', ',')} AU`);
    if (b.period) facts.push(`Một vòng quanh Mặt Trời: ${b.period}`);
    if (b.day) facts.push(`Một ngày: ${b.day}`);
    if (b.tilt !== undefined) facts.push(`Trục nghiêng: ${String(b.tilt).replace('.', ',')}°`);
    if (b.moons !== undefined) facts.push(`Vệ tinh: ${b.moons}`);
    if (facts.length) { const ul = el('ul'); for (const f of facts) ul.append(el('li', '', f)); info.append(ul); }
    if (id === 'earth' || id === 'moon') info.append(seasonLine = el('p', 'orr-live'));
    else seasonLine = null;
    const src = el('p', 'orr-src'); src.append('Số liệu: ');
    const a = el('a', '', 'NASA NSSDCA Planetary Fact Sheet'); a.href = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/'; a.target = '_blank'; a.rel = 'noopener';
    src.append(a, '. Vị trí: Standish (JPL) và Astronomical Almanac, độ chính xác vài phút cung; không phải lịch thiên văn chính xác từng ngày.');
    info.append(src);
  }
  let seasonLine = null;
  function updateScaleNote() {
    scaleNote.textContent = S.real
      ? 'Tỷ lệ thực: khoảng cách và kích thước cùng một tỷ lệ (1 AU = 100 đơn vị). Hành tinh nhỏ hơn một điểm ảnh; vòng tròn và nhãn chỉ để đánh dấu chỗ. Cuộn lại gần để thấy kích thước thật.'
      : 'Dễ quan sát: kích thước hành tinh phóng to rất nhiều và khoảng cách bị thu nhỏ (không cùng tỷ lệ). Mặt Trăng được đặt gần Trái Đất hơn thật.';
    bScale.setAttribute('aria-pressed', String(S.real));
  }
  bPlay.addEventListener('click', () => { S.play = !S.play; bPlay.textContent = S.play ? 'Tạm dừng' : 'Chạy tiếp'; });
  speed.addEventListener('change', () => { S.speed = SPEEDS[Number(speed.value)][0]; });
  bReset.addEventListener('click', () => { S.jd = S.jd0; S.speed = 1; speed.value = '4'; S.play = true; bPlay.textContent = 'Tạm dừng'; S.real = false; updateScaleNote(); S.yaw = 0.6; S.pitch = 0.5; select('earth'); });
  bScale.addEventListener('click', () => { S.real = !S.real; updateScaleNote(); select(S.follow); });
  bExit.addEventListener('click', () => api.close());
  pick.addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) select(b.dataset.id); });
  labels.addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) select(b.dataset.id); });
  const cvs = renderer.domElement;
  const touches = new Map();
  let pinch = 0;
  const onDown = (e) => { if (!S.active || e.target !== cvs) return; touches.set(e.pointerId, [e.clientX, e.clientY]); S.drag = touches.size === 1 ? [e.clientX, e.clientY] : null; pinch = 0; };
  const onMove = (e) => {
    if (!S.active || !touches.has(e.pointerId)) return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) {
      const [a, b] = [...touches.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) S.dist = clamp(S.dist * pinch / d, S.real ? 0.002 : 2, S.real ? 8000 : 400);
      pinch = d; return;
    }
    if (!S.drag) return;
    S.yaw -= (e.clientX - S.drag[0]) * 0.006; S.pitch = clamp(S.pitch + (e.clientY - S.drag[1]) * 0.006, -1.45, 1.45); S.drag = [e.clientX, e.clientY];
  };
  const onUp = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = 0; if (!touches.size) S.drag = null; };
  const onWheel = (e) => { if (!S.active) return; e.preventDefault(); S.dist = clamp(S.dist * (e.deltaY > 0 ? 1.12 : 0.89), S.real ? 0.002 : 2, S.real ? 8000 : 400); };
  addEventListener('pointerdown', onDown, true); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  cvs.addEventListener('wheel', onWheel, { passive: false });

  const _p = new THREE.Vector3(), _e = new THREE.Vector3(), _t = new THREE.Vector3(), _q = new THREE.Vector3();
  const api = {
    get active() { return S.active; },
    state: S,
    open(season, hour) {
      S.active = true;
      S.jd0 = S.jd = nightJD(season, hour);
      wrap.classList.remove('hidden');
      document.body.classList.add('orrery-on');
      updateScaleNote(); select('earth');
      setTimeout(() => { const b = pick.querySelector('[data-id="earth"]'); if (b) b.focus({ preventScroll: true }); }, 60);
    },
    close() {
      if (!S.active) return;
      S.active = false;
      wrap.classList.add('hidden');
      document.body.classList.remove('orrery-on');
    },
    key(e) { if (e.key === 'Escape') { api.close(); return true; } if (e.key === ' ') { bPlay.click(); e.preventDefault(); return true; } return false; },
    /** advance and draw (instead of the valley) */
    render(dt) {
      if (!S.active) return;
      if (S.play) S.jd += S.speed * dt;
      const sc = scaleOf();
      sun.scale.setScalar(sc.sun);
      for (const id of PLANET_IDS) {
        const B = bodies[id];
        place(helio(id, S.jd), B.pos);
        B.tilt.position.copy(B.pos);
        B.mesh.scale.setScalar(sc.size(BODY[id].r));
        const o = B.orbit, pa = o.geometry.attributes.position;
        o.userData.pts.forEach((p, i) => { place(p, _p); pa.setXYZ(i, _p.x, _p.y, _p.z); });
        pa.needsUpdate = true;
        // the arrow: a little way along the orbit ahead of the planet
        place(helio(id, S.jd + 6 * Math.sqrt(BODY[id].a ** 3)), _q);
        const ar = arrows[id];
        ar.position.copy(_q);
        ar.lookAt(_q.clone().add(_q.clone().sub(B.pos)));
        ar.rotateX(Math.PI / 2);
        ar.scale.setScalar(S.real ? Math.max(0.002, S.dist * 0.004) : 0.05);
        if (id !== 'earth' && id !== 'saturn') B.mesh.rotation.y += dt * 0.3;
      }
      // the Earth turns once a sidereal day of simulated time (texture is an illustration)
      bodies.earth.mesh.rotation.y = ((S.jd % 1) * 2 * Math.PI) * 1.0027379;
      const saturn = bodies.saturn.tilt; saturn.rotation.set(26.73 * DEG, 0, 0);
      // the Moon, from the Earth, by the Almanac's series
      const m = moonPos(S.jd);
      const md = S.real ? sc.moonD(m.dist) : sc.moonD();
      _t.set(Math.cos(m.lat * DEG) * Math.cos(m.lon * DEG), Math.cos(m.lat * DEG) * Math.sin(m.lon * DEG), Math.sin(m.lat * DEG));
      toThree(_t, md, _p);
      moon.position.copy(bodies.earth.pos).add(_p);
      moon.scale.setScalar(sc.moonR);
      // camera: orbit round the followed body
      const tgt = S.follow === 'sun' ? _e.set(0, 0, 0) : S.follow === 'moon' ? _e.copy(moon.position) : _e.copy(bodies[S.follow].pos);
      cam.position.set(tgt.x + S.dist * Math.cos(S.pitch) * Math.sin(S.yaw), tgt.y + S.dist * Math.sin(S.pitch), tgt.z + S.dist * Math.cos(S.pitch) * Math.cos(S.yaw));
      cam.near = Math.max(0.0001, S.dist * 0.01); cam.far = Math.max(2000, S.dist * 400);
      cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
      cam.lookAt(tgt);
      const prevTone = renderer.toneMapping;
      renderer.setRenderTarget(null);
      renderer.render(scene, cam);
      renderer.toneMapping = prevTone;
      // labels (DOM): projected each frame, ~10 of them
      const W = innerWidth, H = innerHeight;
      // labels: the one you follow first, then the Sun and the planets by size; one that would sit on
      // a label already placed (within ~30 px) is left out, so they never pile into a heap
      const placed = [];
      const order = [S.follow, 'sun', 'jupiter', 'saturn', 'earth', 'uranus', 'neptune', 'venus', 'mars', 'mercury', 'moon'].filter((v, i, a) => a.indexOf(v) === i);
      for (const id of order) {
        const p = id === 'sun' ? sun.position : id === 'moon' ? moon.position : bodies[id].pos;
        _q.copy(p).project(cam);
        const x = (_q.x + 1) / 2 * W, y = (1 - _q.y) / 2 * H;
        const l = labelEls[id];
        const hb = head.getBoundingClientRect(), sb = side.getBoundingClientRect();
        let on = _q.z < 1 && x > -40 && x < W + 40 && y > -20 && y < H + 20
          && !(y < hb.bottom + 6 && x < hb.right) && !(x > sb.left - 10 && y > sb.top - 10 && y < sb.bottom && x < sb.right);
        if (on && id !== S.follow) on = !placed.some(([px, py]) => Math.abs(px - x) < 70 && Math.abs(py - y) < 26);
        l.style.display = on ? '' : 'none';
        l.classList.toggle('real', S.real);
        l.classList.toggle('sel', id === S.follow);
        if (on) { placed.push([x, y]); l.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`; }
      }
      // the date (UTC) and, for the Earth and the Moon, what the geometry says now
      const d = jdToDate(S.jd);
      date.textContent = `${d} (giờ quốc tế) · ${SPEEDS.find((s) => s[0] === S.speed)[1]}${S.play ? '' : ' · đang dừng'}`;
      if (seasonLine) {
        const sp = sunPos(S.jd), dec = sp.dec;
        const phase = m.illum < 0.03 ? 'trăng non' : m.illum > 0.97 ? 'trăng tròn' : `${m.waxing ? 'trăng đang tròn dần' : 'trăng đang khuyết dần'}, sáng ${Math.round(m.illum * 100)}%`;
        seasonLine.textContent = S.follow === 'earth'
          ? `Lúc này Mặt Trời chiếu thẳng đứng ở vĩ độ ${Math.abs(dec).toFixed(1).replace('.', ',')}°${dec >= 0 ? ' Bắc' : ' Nam'}: bán cầu ${dec >= 0 ? 'bắc' : 'nam'} nhận nắng gần thẳng đứng hơn và ngày dài hơn, nên ${dec >= 0 ? 'đang là nửa năm ấm của bán cầu bắc' : 'đang là nửa năm lạnh của bán cầu bắc'}. Ở 68,4°B, ${dec > 21.6 ? 'Mặt Trời không lặn (ngày địa cực)' : dec < -21.6 ? 'Mặt Trời không mọc (đêm địa cực)' : 'Mặt Trời vẫn mọc và lặn mỗi ngày'}.`
          : `Pha: ${phase}. Góc giữa Mặt Trăng và Mặt Trời nhìn từ Trái Đất: ${Math.round(m.elong)}°.`;
      }
    },
  };
  function jdToDate(jd) {
    const z = Math.floor(jd + 0.5), f = jd + 0.5 - z;
    let a = z;
    if (z >= 2299161) { const al = Math.floor((z - 1867216.25) / 36524.25); a = z + 1 + al - Math.floor(al / 4); }
    const b = a + 1524, c = Math.floor((b - 122.1) / 365.25), dd = Math.floor(365.25 * c), e = Math.floor((b - dd) / 30.6001);
    const day = b - dd - Math.floor(30.6001 * e), month = e < 14 ? e - 1 : e - 13, year = month > 2 ? c - 4716 : c - 4715;
    const h = Math.floor(f * 24), mi = Math.floor((f * 24 - h) * 60);
    return `${day}/${month}/${year} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
  }
  void julian; void store; void audio;
  return api;
}
