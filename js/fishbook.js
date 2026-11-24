// "Bách thư cá": the fish book in the journal. A list (filters, search, a small picture of each
// species) and a page per species (a model you can turn, what tells it apart, where it lives, its
// size, a short note, the sources, and what you yourself have caught).
//
// Pictures: one shared offscreen render target on the game's own renderer (no second WebGL
// context). Each species is drawn once into it and read back into an <img> (cached). The model
// on a species page is drawn the same way, only while you turn it or it turns slowly by itself,
// at most ~30 times a second, and never while the page is hidden.
// Before you have caught a valley fish its picture is a sepia sketch (CSS), but everything
// written about it is open from the start: the book never locks knowledge behind play.
import * as THREE from 'three';
import { FISH, EXTRA, ALL_FISH, SPOTS, PARTS, SEASON_VI, FISH_SOURCES } from './fishdata.js';
import { buildFish, SWIM } from './fishmodel.js';
import { store } from './store.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const spotName = (id) => (SPOTS.find((s) => s.id === id) || { name: id }).name;

export function createFishBook(root, renderer) {
  /* ---------- the little studio ---------- */
  const studio = new THREE.Scene();
  studio.add(new THREE.HemisphereLight(0xf4f1e8, 0x6a5a40, 1.7));
  const key = new THREE.DirectionalLight(0xfff2dc, 2.6); key.position.set(0.5, 1.2, 1.0); studio.add(key);
  const rim = new THREE.DirectionalLight(0xbfd6ff, 1.2); rim.position.set(-1, 0.4, -0.8); studio.add(rim);
  const cam = new THREE.PerspectiveCamera(24, 2, 0.05, 20);
  let rt = null, rtW = 0, rtH = 0, buf = null;
  const ensure = (w, h) => {
    if (rt && rtW === w && rtH === h) return;
    if (rt) rt.dispose();
    rt = new THREE.WebGLRenderTarget(w, h, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    rtW = w; rtH = h; buf = new Uint8Array(w * h * 4);
  };
  const models = new Map();
  const modelOf = (f) => { if (!models.has(f.id)) models.set(f.id, buildFish(f, 1)); return models.get(f.id); };
  /** draw one fish into a 2D canvas (yaw/pitch in radians, dist = camera distance in fish lengths) */
  function draw(f, canvas, yaw, pitch, dist) {
    const w = canvas.width, h = canvas.height;
    ensure(w, h);
    const m = modelOf(f);
    studio.add(m);
    const swimOn = SWIM.uSwimOn.value; SWIM.uSwimOn.value = swimAmp;
    m.rotation.set(0, 0, 0);
    m.rotation.y = yaw; m.rotation.x = pitch;
    cam.aspect = w / h; cam.updateProjectionMatrix();
    cam.position.set(0, 0.02, dist); cam.lookAt(0, 0, 0);
    const prevT = renderer.getRenderTarget(), prevTone = renderer.toneMapping, prevClear = renderer.getClearAlpha();
    const prevColor = renderer.getClearColor(new THREE.Color());
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.clear();
    renderer.render(studio, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    renderer.setRenderTarget(prevT);
    renderer.toneMapping = prevTone;
    renderer.setClearColor(prevColor, prevClear);
    studio.remove(m);
    SWIM.uSwimOn.value = swimOn;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
  }
  let swimAmp = 0;               // thumbnails are drawn still; the species page sets it while it turns
  const thumbs = new Map();
  function thumb(f) {
    if (thumbs.has(f.id)) return thumbs.get(f.id);
    const c = document.createElement('canvas'); c.width = 240; c.height = 120;
    draw(f, c, -0.18, 0.08, f.shape.fam === 'eel' ? 2.5 : 1.45);
    const url = c.toDataURL('image/png');
    thumbs.set(f.id, url);
    return url;
  }

  /* ---------- state ---------- */
  const ui = { filter: 'all', place: 'all', q: '', open: '' };
  let viewer = null;          // the turning model on a species page

  const seenSet = () => new Set(store.get('fish.seen', []));
  const firstOf = (id) => { const r = store.get('fish.first', []).find((x) => x.startsWith(id + '|')); if (!r) return null; const [, spot, season, part, cm] = r.split('|'); return { spot, season: Number(season), part: Number(part), cm: Number(cm) }; };
  const bestOf = (id) => { const r = store.get('fish.best', []).find((x) => x.startsWith(id + ':')); return r ? Number(r.split(':')[1]) : 0; };
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

  /* ---------- the list ---------- */
  function renderList() {
    stopViewer();
    root.innerHTML = '';
    const seen = seenSet();
    const sum = el('p', 'journal-sum');
    sum.textContent = `${FISH.length} loài sống ở suối và ao của thung lũng (câu được), theo danh sách cá vùng Enontekiö, Lapland; thêm ${EXTRA.length} hồ sơ tham khảo không có ở đây. Bạn đã câu được ${[...seen].filter((id) => FISH.some((f) => f.id === id)).length}/${FISH.length} loài. Mọi trang đều đọc được ngay; câu được cá thì hình phác thảo thành hình màu và sổ ghi lại nơi, mùa, kích thước.`;
    const bar = el('div', 'fb-bar');
    const search = el('input', 'name-input fb-search');
    search.type = 'search'; search.placeholder = 'Tìm theo tên…'; search.value = ui.q;
    search.setAttribute('aria-label', 'Tìm loài cá theo tên');
    const chips = (name, opts, cur, set) => {
      const g = el('div', 'chips fb-chips'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', name);
      for (const [v, label] of opts) { const b = el('button', 'chip', label); b.type = 'button'; b.setAttribute('aria-pressed', String(cur === v)); b.addEventListener('click', () => { set(v); renderList(); }); g.append(b); }
      return g;
    };
    bar.append(search,
      chips('Trạng thái', [['all', 'Tất cả'], ['seen', 'Đã gặp'], ['unseen', 'Chưa gặp']], ui.filter, (v) => { ui.filter = v; }),
      chips('Nơi sống', [['all', 'Mọi nơi'], ...SPOTS.map((s) => [s.id, s.name]), ['extra', 'Hồ sơ mở rộng']], ui.place, (v) => { ui.place = v; }));
    const grid = el('ul', 'fb-grid');
    const empty = el('div', 'fb-empty hidden');
    const clear = el('button', 'chip', 'Xoá bộ lọc'); clear.type = 'button';
    clear.addEventListener('click', () => { ui.filter = 'all'; ui.place = 'all'; ui.q = ''; renderList(); });
    empty.append(el('p', '', 'Không có loài nào khớp. Thử bỏ bớt bộ lọc hoặc gõ tên khác (gõ không dấu cũng được, ví dụ "hoi", "ro", "Salmo").'), clear);
    root.append(sum, bar, grid, empty);
    const fill = () => {
      grid.innerHTML = '';
      const q = norm(ui.q.trim());
      let n = 0;
      for (const f of ALL_FISH) {
        const extra = EXTRA.includes(f);
        if (ui.place === 'extra' && !extra) continue;
        if (ui.place !== 'all' && ui.place !== 'extra' && (extra || !f.habitat.includes(ui.place))) continue;
        const caught = seen.has(f.id);
        if (ui.filter === 'seen' && !caught) continue;
        if (ui.filter === 'unseen' && (caught || extra)) continue;
        if (q && !norm(`${f.vi} ${f.en} ${f.sci}`).includes(q)) continue;
        n++;
        const li = el('li');
        const b = el('button', 'fb-tile' + (extra ? ' extra' : caught ? ' caught' : ' sketch'));
        b.type = 'button';
        const img = el('img'); img.alt = ''; img.src = thumb(f); img.width = 240; img.height = 120;
        const nm = el('b', '', f.vi);
        const tag = el('small', '', extra ? 'Hồ sơ mở rộng' : caught ? `Đã câu · lớn nhất ${String(bestOf(f.id)).replace('.', ',')} cm` : 'Chưa gặp');
        b.append(img, nm, tag);
        b.addEventListener('click', () => { const sc = root.closest('.journal-card'); ui.scroll = sc ? sc.scrollTop : 0; openSpecies(f.id); });
        li.append(b); grid.append(li);
      }
      empty.classList.toggle('hidden', n > 0);
    };
    search.addEventListener('input', () => { ui.q = search.value; fill(); });
    fill();
    if (ui.scroll) { const sc = root.closest('.journal-card'); if (sc) requestAnimationFrame(() => { sc.scrollTop = ui.scroll; ui.scroll = 0; }); }
  }

  /* ---------- a species page ---------- */
  function openSpecies(id) {
    const f = ALL_FISH.find((x) => x.id === id);
    if (!f) { renderList(); return; }
    ui.open = id;
    stopViewer();
    root.innerHTML = '';
    const extra = EXTRA.includes(f);
    const caught = seenSet().has(f.id);
    const back = el('button', 'chip fb-back', '← Tất cả các loài'); back.type = 'button';
    back.addEventListener('click', () => { ui.open = ''; renderList(); });
    const head = el('header', 'fb-head');
    const h = el('h3', '', f.vi);
    const sci = el('p', 'fb-sci'); sci.append(el('i', '', f.sci), document.createTextNode(` · ${f.en}`));
    const fam = el('p', 'fb-fam', f.family);
    const st = el('span', 'fb-status ' + (extra ? 'extra' : 'valley'), extra ? 'Hồ sơ mở rộng · không sống trong thung lũng' : 'Sống trong thung lũng · câu được');
    head.append(h, sci, fam, st);
    // the model
    const stage = el('div', 'fb-stage' + (!extra && !caught ? ' sketch' : ''));
    const cv = el('canvas'); cv.width = 640; cv.height = 300;
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', `Mô hình ba chiều của ${f.vi}${!extra && !caught ? ' (phác thảo, chưa câu được)' : ''}`);
    const hint = el('p', 'fb-hint', !extra && !caught ? 'Phác thảo · câu được loài này để xem màu thật. Kéo để xoay, cuộn để phóng' : 'Kéo để xoay · cuộn hoặc chụm hai ngón để phóng · mô hình dựng bằng mã, không phải ảnh chụp');
    const tools = el('div', 'fb-tools');
    const bPause = el('button', 'chip', 'Tạm dừng bơi'); bPause.type = 'button'; bPause.setAttribute('aria-pressed', 'false');
    const bReset = el('button', 'chip', 'Đặt lại góc nhìn'); bReset.type = 'button';
    tools.append(bPause, bReset);
    stage.append(cv, tools, hint);
    // the text
    const sec = (title, ...nodes) => { const s = el('section', 'fb-sec'); s.append(el('h4', '', title), ...nodes); return s; };
    const ul = (items) => { const u = el('ul'); for (const t of items) u.append(el('li', '', t)); return u; };
    const rows = [
      sec('Nhận dạng', ul(f.id_)),
      sec('Sinh cảnh và phân bố ngoài đời', el('p', '', f.range), el('p', 'fb-small', `Môi trường (FishBase): ${f.env}.`)),
      sec('Kích thước', el('p', '', `Dài tối đa ghi nhận: ${f.max}. Chiều dài thường gặp: ${f.common}. Nặng tối đa ghi nhận: ${f.weight}.`), el('p', 'fb-small', 'Theo FishBase. TL: dài toàn thân; SL: dài chuẩn (không tính vây đuôi); FL: dài tới chẽ đuôi. Kỷ lục là con lớn nhất từng ghi nhận, không phải cỡ thường thấy.')),
      sec('Đôi điều', el('p', '', f.about)),
    ];
    if (extra) rows.push(sec('Vì sao không có trong thung lũng', el('p', '', f.why)));
    else {
      const places = f.habitat.map(spotName).join(', ');
      const pk = f.bite.part.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 2).map(([, i]) => PARTS[i].toLowerCase()).join(' và ');
      const sk = f.bite.season.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0])[0][1];
      rows.push(sec('Trong Aurora Vale', el('p', '', `Gặp ở: ${places}. Hay cắn câu lúc ${pk}, nhiều nhất vào mùa ${SEASON_VI[sk].toLowerCase()}. Cỡ câu được trong trò chơi: ${f.sizeRange[0]}–${f.sizeRange[1]} cm.`), el('p', 'fb-small', (f.note ? f.note + ' ' : '') + 'Đây là quy ước của trò chơi, không phải kết luận sinh học. Mùa đông mặt nước đóng băng và bản này chưa có câu qua lỗ băng.')));
      const first = firstOf(f.id), best = bestOf(f.id);
      rows.push(sec('Sổ của bạn', el('p', '', first ? `Lần đầu câu được ở ${spotName(first.spot)}, ${PARTS[first.part].toLowerCase()} mùa ${SEASON_VI[first.season].toLowerCase()}, dài ${String(first.cm).replace('.', ',')} cm. Con lớn nhất: ${String(best).replace('.', ',')} cm. Mỗi con đều đã được thả về nước.` : 'Chưa câu được. Ra bờ suối hoặc ao lặng, bấm "Câu cá".')));
    }
    rows.push(sec('Nguồn', (() => {
      const u = el('ul', 'fb-src');
      const link = (t, url) => { const li = el('li'); const a = el('a', '', t); a.href = url; a.target = '_blank'; a.rel = 'noopener'; li.append(a); return li; };
      u.append(link(`FishBase: ${f.sci}`, f.url));
      if (!extra) u.append(link(FISH_SOURCES.oulu.title, FISH_SOURCES.oulu.url));
      u.append(el('li', 'fb-small', `Sách Đỏ IUCN, đánh giá toàn cầu (năm đánh giá trong ngoặc), theo trang FishBase tra tháng 11/2026: ${f.iucn}. Chưa đối chiếu trực tiếp trên trang IUCN. Một quần thể địa phương có thể được xếp khác. Độ hiếm trong trò chơi không liên quan tới tình trạng bảo tồn ngoài đời.`));
      return u;
    })()));
    root.append(back, head, stage, ...rows);
    const v = startViewer(f, cv, stage);
    bPause.addEventListener('click', () => { v.paused = !v.paused; bPause.setAttribute('aria-pressed', String(v.paused)); bPause.textContent = v.paused ? 'Cho cá bơi tiếp' : 'Tạm dừng bơi'; v.dirty = true; });
    bReset.addEventListener('click', () => { v.yaw = -0.5; v.pitch = 0.12; v.dist = v.dist0; v.auto = true; v.dirty = true; });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { v.paused = true; bPause.disabled = true; bPause.title = 'Máy đang đặt giảm chuyển động'; }
    try { back.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    root.scrollIntoView({ block: 'start' });
  }

  /* ---------- the turning model ---------- */
  function startViewer(f, cv, stage) {
    const d0 = f.shape.fam === 'eel' ? 2.4 : 1.5;
    const v = { f, cv, yaw: -0.5, pitch: 0.12, dist: d0, dist0: d0, auto: true, dirty: true, raf: 0, last: 0, drag: null, paused: false };
    viewer = v;
    const minD = 0.7, maxD = 3.2;
    cv.addEventListener('pointerdown', (e) => { v.drag = [e.clientX, e.clientY]; v.auto = false; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
    cv.addEventListener('pointermove', (e) => {
      if (!v.drag) return;
      v.yaw += (e.clientX - v.drag[0]) * 0.01;
      v.pitch = Math.max(-0.9, Math.min(0.9, v.pitch + (e.clientY - v.drag[1]) * 0.008));
      v.drag = [e.clientX, e.clientY]; v.dirty = true;
    });
    const up = () => { v.drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); v.dist = Math.max(minD, Math.min(maxD, v.dist * (e.deltaY > 0 ? 1.1 : 0.9))); v.dirty = true; v.auto = false; }, { passive: false });
    // two fingers: pinch to zoom
    const touches = new Map();
    cv.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2) return;
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (touches.has('d')) { v.dist = Math.max(minD, Math.min(maxD, v.dist * touches.get('d') / d)); v.dirty = true; }
      touches.set('d', d);
    }, { passive: true });
    cv.addEventListener('touchend', () => touches.clear());
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = (now) => {
      if (viewer !== v) return;
      v.raf = requestAnimationFrame(tick);
      if (!cv.isConnected || stage.offsetParent === null) return;       // hidden: draw nothing
      if (now - v.last < 33) return;
      const dt = Math.min(0.1, (now - v.last) / 1000); v.last = now;
      if (v.auto && !reduce && !v.paused) { v.yaw += dt * 0.35; v.dirty = true; }
      // the fish swims gently in place (its body bends); paused or reduced motion: held still
      swimAmp = v.paused || reduce ? 0 : 0.55;
      if (swimAmp) { SWIM.uSwimT.value = now / 1000; v.dirty = true; }
      if (!v.dirty) return;
      v.dirty = false;
      draw(f, cv, v.yaw, v.pitch, v.dist);
    };
    v.raf = requestAnimationFrame(tick);
    return v;
  }
  function stopViewer() { if (viewer) { cancelAnimationFrame(viewer.raf); viewer = null; } }

  return {
    /** show the book (the list, or a species page if one is open or asked for) */
    show(id) { if (id) openSpecies(id); else if (ui.open) openSpecies(ui.open); else renderList(); },
    hide() { stopViewer(); },
    openSpecies,
    renderList,
    get viewing() { return viewer ? viewer.f.id : ''; },
  };
}
