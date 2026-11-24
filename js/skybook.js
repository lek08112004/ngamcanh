// The sky in the journal ("Bầu trời" tab): the observing log (telescope targets), the myth lines
// and their chapters, and the two cards of a myth chapter in the star game: a short lead when it
// begins, and when it is woven a page with a drawn figure, "Chuyện kể" and "Bầu trời thật".
// Knowledge is open: every chapter's tale and sky page can be read before it is woven; weaving it
// draws its figure and marks the chapter (once, saved as 'line:n' in sky.myth).
import { store } from './store.js';
import { MYTH_LINES, mythLine } from './myths.js';
import { TARGETS, SKY_NIGHTS } from './astro.js';
import { TARGET_INFO, SKY_SOURCES } from './skyinfo.js';
import { CONSTELLATIONS, MYTH_CONS } from './game.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const consDef = (id) => [...CONSTELLATIONS, ...MYTH_CONS].find((c) => c.id === id);
const SEASON = ['xuân', 'hạ', 'thu', 'đông'];

/* ---------------------------------------------------------------- the chapter silhouettes */
// Each is drawn in a box of half-size u round (cx, cy), y down: a soft gold fill and an outline,
// with thick round-capped strokes for limbs. Simple shapes, but each tells its chapter: a queen on
// a high-backed throne, a crowned king with a staff, a sea serpent over waves, a young woman
// chained to a rock, a winged sandal under a curved sword, a hunter with a raised club, a scorpion.
function drawEmblem(g, emblem, cx, cy, u, t) {
  g.save();
  g.translate(cx, cy);
  g.globalAlpha = Math.min(1, t * 1.4);
  const fill = 'rgba(233,201,138,0.18)', line = 'rgba(240,214,150,0.62)';
  g.fillStyle = fill; g.strokeStyle = line; g.lineWidth = Math.max(1.5, u * 0.025); g.lineJoin = 'round'; g.lineCap = 'round';
  const P = (pts, close = true) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * u, y * u) : g.moveTo(x * u, y * u))); if (close) g.closePath(); };
  const shape = (pts) => { P(pts); g.fill(); g.stroke(); };
  const limb = (pts, w = 0.07) => { const lw = g.lineWidth; g.lineWidth = w * u; g.strokeStyle = fill.replace('0.18', '0.55'); P(pts, false); g.stroke(); g.lineWidth = lw; g.strokeStyle = line; };
  const head = (x, y, r = 0.11) => { g.beginPath(); g.arc(x * u, y * u, r * u, 0, Math.PI * 2); g.fill(); g.stroke(); };
  if (emblem === 'throne') {
    shape([[-0.55, 0.85], [-0.55, -0.85], [-0.38, -0.95], [-0.3, -0.1], [0.45, -0.1], [0.45, 0.85], [0.35, 0.85], [0.35, 0.08], [-0.42, 0.08], [-0.42, 0.85]]);
    shape([[-0.25, -0.12], [-0.2, -0.55], [0.08, -0.55], [0.12, -0.12], [0.45, -0.05], [0.42, 0.12], [0.02, 0.1], [0.0, 0.6], [-0.12, 0.6], [-0.15, 0.08]]);
    head(-0.06, -0.7); limb([[0.06, -0.48], [0.35, -0.62], [0.5, -0.75]], 0.06);
    g.beginPath(); g.ellipse(0.56 * u, -0.8 * u, 0.08 * u, 0.11 * u, 0.3, 0, Math.PI * 2); g.stroke();   // her mirror
  } else if (emblem === 'crown') {
    shape([[-0.3, -0.45], [0.3, -0.45], [0.42, 0.9], [-0.42, 0.9]]);
    head(0, -0.62);
    shape([[-0.13, -0.74], [-0.13, -0.92], [-0.06, -0.82], [0, -0.96], [0.06, -0.82], [0.13, -0.92], [0.13, -0.74]]);
    limb([[0.3, -0.3], [0.52, 0.0]], 0.07); limb([[0.58, -0.75], [0.58, 0.9]], 0.035);
    limb([[-0.3, -0.3], [-0.45, 0.1]], 0.07);
  } else if (emblem === 'wave') {
    // the serpent: an arched neck and head, two humps, a fin
    P([[-0.95, 0.35], [-0.75, 0.05], [-0.5, 0.35], [-0.3, -0.05], [-0.05, 0.35], [0.15, -0.35], [0.3, -0.75], [0.55, -0.85], [0.75, -0.72], [0.62, -0.6], [0.42, -0.55], [0.35, -0.2], [0.28, 0.35]], false);
    g.lineWidth = 0.13 * u; g.strokeStyle = fill.replace('0.18', '0.5'); g.stroke(); g.lineWidth = Math.max(1.5, u * 0.025); g.strokeStyle = line; g.stroke();
    shape([[0.05, -0.1], [0.2, -0.5], [0.28, -0.12]]);
    g.beginPath(); g.arc(0.6 * u, -0.76 * u, 0.025 * u, 0, Math.PI * 2); g.fillStyle = line; g.fill(); g.fillStyle = fill;
    for (let k = 0; k < 3; k++) { const y = 0.45 + k * 0.18; P(Array.from({ length: 23 }, (_, i) => [-1 + i * 0.09, y + Math.sin(i * 0.9 + k) * 0.05]), false); g.stroke(); }
  } else if (emblem === 'chain') {
    shape([[-0.9, 0.9], [-0.7, 0.2], [-0.35, -0.1], [-0.2, 0.35], [-0.35, 0.9]]);          // the rock
    shape([[0.02, -0.4], [0.24, -0.4], [0.3, 0.85], [-0.04, 0.85]]);                           // her robe
    head(0.13, -0.56);
    limb([[0.04, -0.32], [-0.25, -0.62], [-0.45, -0.55]], 0.05); limb([[0.22, -0.32], [0.55, -0.62]], 0.05);
    for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse((-0.55 - k * 0.09) * u, (-0.52 + k * 0.08) * u, 0.05 * u, 0.03 * u, 0.6, 0, Math.PI * 2); g.stroke(); }
    for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse((0.65 + k * 0.08) * u, (-0.66 + k * 0.1) * u, 0.05 * u, 0.03 * u, -0.6, 0, Math.PI * 2); g.stroke(); }
  } else if (emblem === 'sandal') {
    shape([[-0.7, 0.75], [0.55, 0.72], [0.7, 0.62], [0.6, 0.5], [-0.25, 0.48], [-0.4, 0.2], [-0.62, 0.25]]);   // the sandal
    for (let k = 0; k < 3; k++) shape([[-0.55, 0.3 - k * 0.04], [-0.95 + k * 0.08, -0.15 - k * 0.12], [-0.6 + k * 0.05, 0.12 - k * 0.06]]);   // its wing
    P([[0.2, 0.3], [0.3, -0.5], [0.15, -0.85], [0.42, -0.62], [0.38, -0.2], [0.26, 0.3]]); g.fill(); g.stroke();   // the curved blade
    limb([[0.1, 0.32], [0.38, 0.28]], 0.06);
  } else if (emblem === 'bow') {
    shape([[-0.18, -0.35], [0.18, -0.35], [0.26, 0.2], [-0.26, 0.2]]);
    limb([[-0.12, 0.2], [-0.3, 0.88]], 0.09); limb([[0.12, 0.2], [0.32, 0.88]], 0.09);
    head(0, -0.52, 0.12);
    limb([[0.16, -0.3], [0.45, -0.55], [0.55, -0.9]], 0.07);
    limb([[0.5, -0.65], [0.72, -0.98]], 0.1);                                                    // the club
    limb([[-0.16, -0.3], [-0.5, -0.4]], 0.07);
    shape([[-0.5, -0.65], [-0.68, -0.4], [-0.58, -0.05], [-0.45, -0.2], [-0.42, -0.5]]);          // the pelt held out
    g.beginPath(); g.moveTo(-0.26 * u, 0.02 * u); g.lineTo(0.26 * u, 0.02 * u); g.stroke();          // his belt
  } else if (emblem === 'sting') {
    for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse((-0.35 + k * 0.17) * u, 0.3 * u, 0.12 * u, 0.13 * u, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
    P([[0.45, 0.3], [0.7, 0.1], [0.8, -0.25], [0.65, -0.55], [0.42, -0.6]], false); g.lineWidth = 0.1 * u; g.strokeStyle = fill.replace('0.18', '0.5'); g.stroke(); g.lineWidth = Math.max(1.5, u * 0.025); g.strokeStyle = line; g.stroke();
    shape([[0.42, -0.6], [0.3, -0.5], [0.36, -0.72]]);                                         // the sting
    for (const sgn of [-1, 1]) {
      limb([[-0.48, 0.3 + sgn * 0.05], [-0.7, 0.3 + sgn * 0.25], [-0.85, 0.3 + sgn * 0.15]], 0.05);
      shape([[-0.85, 0.3 + sgn * 0.15], [-1.0, 0.3 + sgn * 0.22], [-0.98, 0.3 + sgn * 0.05], [-0.88, 0.3 + sgn * 0.08]]);
      for (let k = 0; k < 3; k++) limb([[-0.25 + k * 0.17, 0.3 + sgn * 0.12], [-0.2 + k * 0.17, 0.3 + sgn * 0.36]], 0.025);
    }
  }
  g.restore();
}

/* ---------------------------------------------------------------- the drawn figure */
// The constellation's stars and lines (their real relative places) in gold on night-blue paper, and
// a simple emblem of the chapter (a throne, a crown, a wave, a chain, a winged sandal, a bow, a sting).
function drawFigure(canvas, consId, emblem, t = 1) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0d1626'); bg.addColorStop(1, '#1a2238');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const def = consDef(consId);
  if (!def) return;
  const ra0 = def.stars.reduce((s, p) => s + p[0], 0) / def.stars.length, de0 = def.stars.reduce((s, p) => s + p[1], 0) / def.stars.length;
  const pts = def.stars.map(([ra, de]) => [-(ra - ra0) * 15 * Math.cos(de0 * Math.PI / 180), de - de0]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
  const s = Math.min(W, H) * 0.62 / ext, mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  const P = ([x, y]) => [W * 0.42 + (x - mx) * s, H / 2 - (y - my) * s];
  // the chapter's figure, beside the stars (never over them): a silhouette in one drawing language
  drawEmblem(g, emblem, W * 0.8, H * 0.52, Math.min(W, H) * 0.36, t);
  // lines, drawn in as t goes from 0 to 1
  g.strokeStyle = `rgba(240,214,150,${0.75 * t})`; g.lineWidth = 1.6;
  def.edges.forEach(([a, b], i) => {
    const k = Math.min(1, Math.max(0, t * def.edges.length - i));
    if (k <= 0) return;
    const [x0, y0] = P(pts[a]), [x1, y1] = P(pts[b]);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); g.stroke();
  });
  for (const p of pts) {
    const [x, y] = P(p);
    const r = g.createRadialGradient(x, y, 0, x, y, 9); r.addColorStop(0, 'rgba(255,248,226,1)'); r.addColorStop(1, 'rgba(255,230,170,0)');
    g.fillStyle = r; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(233,214,170,0.6)'; g.font = '11px sans-serif';
  g.fillText('Hình nối các sao chỉ là cách vẽ: các ngôi sao không thật sự ở gần nhau trong không gian', 10, H - 10);
}

export function createSkyBook({ root, obsSum, mythSum, startChapter, openScopeGuide, progress }) {
  /* ---------- the chapter cards (in the star game) ---------- */
  const lead = el('div', 'myth-lead hidden'); lead.setAttribute('role', 'status');
  const done = el('div', 'myth-done hidden'); done.setAttribute('role', 'dialog'); done.setAttribute('aria-label', 'Chương thần thoại vừa dệt xong');
  document.body.append(lead, done);
  let leadTimer = 0;
  function showLead(lineId, ch) {
    const line = mythLine(lineId), c = line.chapters[ch];
    lead.innerHTML = '';
    lead.append(el('p', 'eyebrow', `${line.vi} · chương ${ch + 1}/${line.chapters.length}`), el('b', '', c.title), el('p', '', c.lead));
    const skip = el('button', 'chip', 'Ẩn'); skip.type = 'button'; skip.addEventListener('click', () => lead.classList.add('hidden'));
    lead.append(skip);
    lead.classList.remove('hidden');
    clearTimeout(leadTimer);
    leadTimer = setTimeout(() => lead.classList.add('hidden'), 9000);
  }
  /** the chapter is woven: record it (once) and show its page; returns whether it was new */
  function chapterDone(lineId, ch, { next, home }) {
    const key = `${lineId}:${ch}`, list = store.get('sky.myth', []);
    const first = !list.includes(key);
    if (first) store.set('sky.myth', [...list, key]);
    lead.classList.add('hidden');
    const line = mythLine(lineId), c = line.chapters[ch];
    done.innerHTML = '';
    const cv = el('canvas', 'myth-fig'); cv.width = 520; cv.height = 260;
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', `Hình chòm ${consDef(c.cons).name} và biểu tượng của chương`);
    const body = el('div', 'myth-body');
    body.append(el('p', 'eyebrow', `${line.vi} · chương ${ch + 1}/${line.chapters.length}${first ? ' · vừa mở' : ''}`), el('h3', '', c.title));
    // two tabs, never mixed: the myth, then the astronomy
    const tabs = el('div', 'myth-tabs'); tabs.setAttribute('role', 'tablist');
    const paneTale = el('div', 'myth-pane'), paneSky = el('div', 'myth-pane');
    paneTale.append(...c.tale.map((t) => el('p', '', t)), el('p', 'myth-variant', line.variant));
    paneSky.append(...c.sky.map((t) => el('p', '', t)));
    const mk = (label, pane) => { const b = el('button', 'myth-tab', label); b.type = 'button'; b.setAttribute('role', 'tab'); b.addEventListener('click', () => sel(b)); b.pane = pane; return b; };
    const bt = mk('Chuyện kể', paneTale), bs = mk('Bầu trời thật', paneSky);
    const sel = (b) => { for (const x of [bt, bs]) { const on = x === b; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; x.pane.hidden = !on; } };
    for (const b of [bt, bs]) b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const o = b === bt ? bs : bt; sel(o); o.focus(); } });
    tabs.append(bt, bs); sel(bt);
    body.append(tabs, paneTale, paneSky);
    markRead(lineId, ch);
    const last = ch === line.chapters.length - 1;
    if (last) body.append(el('p', 'myth-end', line.ending));
    const row = el('div', 'catch-row');
    if (!last) { const b = el('button', 'btn primary', 'Chương tiếp theo'); b.type = 'button'; b.addEventListener('click', () => { done.classList.add('hidden'); next(); }); row.append(b); }
    const h = el('button', 'chip', 'Về trại'); h.type = 'button'; h.addEventListener('click', () => { done.classList.add('hidden'); home(); });
    row.append(h);
    body.append(row);
    done.append(cv, body);
    done.classList.remove('hidden');
    // the figure draws itself in (or at once, with reduced motion)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = reduce ? 1 : 0;
    const step = () => { drawFigure(cv, c.cons, c.emblem, t); if (t < 1) { t = Math.min(1, t + 0.025); requestAnimationFrame(step); } };
    step();
    setTimeout(() => { const f = row.querySelector('button'); if (f) f.focus({ preventScroll: true }); }, 60);
    return first;
  }
  function markRead(lineId, ch) {
    const key = `${lineId}:${ch}`, r = store.get('sky.read', []);
    if (!r.includes(key)) store.set('sky.read', [...r, key]);
  }
  function hideCards() { lead.classList.add('hidden'); done.classList.add('hidden'); }

  /* ---------- the journal tab ---------- */
  function render() {
    // the observing log
    const obs = store.get('sky.obs', []), first = store.get('sky.first', []);
    obsSum.textContent = `Những gì bạn đã tận mắt ngắm qua kính thiên văn trên đồi sau trại: ${obs.length}/${TARGETS.length}. Bầu trời trong kính được tính cho một đêm mô phỏng mỗi mùa (${SKY_NIGHTS.map((n) => n.label).join(', ')}) tại 68,4°B 23,6°Đ, gần Enontekiö; trời "trang trí" của thung lũng thì không trùng với nó. Mọi trang đều đọc được ngay.`;
    root.innerHTML = '';
    const ul = el('ul', 'obs-list');
    for (const t of TARGETS) {
      const li = el('li', obs.includes(t.id) ? 'seen' : '');
      const det = el('details');
      const sum = el('summary');
      sum.append(el('b', '', `${obs.includes(t.id) ? '◆' : '◇'} ${t.vi}`), el('small', '', t.group));
      const info = TARGET_INFO[t.id];
      const rec = first.find((x) => x.startsWith(t.id + '|'));
      det.append(sum,
        el('p', '', rec ? `Bạn ngắm lần đầu vào đêm mùa ${SEASON[Number(rec.split('|')[1])]}, khoảng ${rec.split('|')[2]} giờ.` : 'Chưa ngắm. Đến kính trên đồi sau trại khi trời tối.'),
        el('p', '', `Qua kính: ${info.eye}`), el('p', '', info.fact), el('p', 'fb-small', `Cách vẽ trong kính: ${info.draw}`));
      const src = el('ul', 'fb-src');
      for (const [n, u] of info.src) { const l = el('li'); const a = el('a', '', n); a.href = u; a.target = '_blank'; a.rel = 'noopener'; l.append(a); src.append(l); }
      det.append(src);
      li.append(det); ul.append(li);
    }
    const go = el('button', 'chip', 'Dẫn tới kính thiên văn'); go.type = 'button'; go.addEventListener('click', openScopeGuide);
    const methods = el('details', 'obs-methods');
    methods.append(el('summary', '', 'Cách tính bầu trời trong kính (và giới hạn của nó)'));
    for (const [n, u] of SKY_SOURCES) { const p = el('p', 'fb-small'); if (u) { const a = el('a', '', n); a.href = u; a.target = '_blank'; a.rel = 'noopener'; p.append(a); } else p.textContent = n; methods.append(p); }
    methods.append(el('p', 'fb-small', 'Vị trí sao lấy theo kỷ nguyên J2000, bỏ qua tuế sai (khoảng 0,35° tới năm 2026). Mặt Trăng chính xác khoảng 0,3°, hành tinh vài phút cung. Sao mờ nền, sao trong lòng các cụm, hình tinh vân và hố nhỏ trên Mặt Trăng là minh hoạ. Chân trời trong kính coi như phẳng ở 2° (không tính núi).'));
    root.append(ul, go, methods);

    // the myth lines
    const myth = store.get('sky.myth', []);
    const total = MYTH_LINES.reduce((s, l) => s + l.chapters.length, 0);
    mythSum.textContent = `Hai tuyến truyện Hy Lạp, mỗi chương dệt một chòm sao: ${myth.length}/${total} chương đã dệt. Bấm "Dệt chương" để bắt đầu (trò dệt sao mở ở chế độ ${store.get('sky.weave', 'relax') === 'relax' ? 'Thư giãn: không giới hạn thời gian, có đường gợi ý' : 'Thử thách: luật như trò dệt sao thường'}). Đường nối các sao là cách vẽ, không có nghĩa các sao ở gần nhau.`;
    const box = document.getElementById('mythBook');
    box.innerHTML = '';
    const modeRow = el('div', 'chips');
    modeRow.setAttribute('role', 'group'); modeRow.setAttribute('aria-label', 'Cách dệt chương thần thoại');
    for (const [v, label] of [['relax', 'Thư giãn'], ['challenge', 'Thử thách']]) {
      const b = el('button', 'chip', label); b.type = 'button'; b.setAttribute('aria-pressed', String(store.get('sky.weave', 'relax') === v));
      b.addEventListener('click', () => { store.set('sky.weave', v); render(); });
      modeRow.append(b);
    }
    box.append(modeRow);
    for (const line of MYTH_LINES) {
      const sec = el('section', 'myth-line');
      sec.append(el('h4', '', line.vi), el('p', '', line.lead), el('p', 'fb-small', line.variant));
      const next = line.chapters.findIndex((c, i) => !myth.includes(`${line.id}:${i}`));
      const cont = el('button', 'btn primary myth-continue', next < 0 ? 'Dệt lại từ chương đầu' : next === 0 ? `Bắt đầu: ${line.chapters[0].title}` : `Tiếp tục: chương ${next + 1}, ${line.chapters[next].title}`);
      cont.type = 'button'; cont.addEventListener('click', () => startChapter(line.id, Math.max(0, next)));
      sec.append(cont);
      const ol = el('ol', 'myth-chapters');
      line.chapters.forEach((c, i) => {
        const key = `${line.id}:${i}`, woven = myth.includes(key), read = store.get('sky.read', []).includes(key);
        const half = progress ? progress(line.id, i, c.cons) : null;
        const li = el('li', woven ? 'woven' : '');
        const det = el('details');
        const sum = el('summary');
        const state = [woven ? 'đã dệt' : half ? `đang dệt dở ${half[0]}/${half[1]} sao` : 'chưa dệt', read ? 'đã đọc' : 'chưa đọc'].join(' · ');
        sum.append(el('b', '', `${woven ? '✦' : '✧'} Chương ${i + 1}. ${c.title}`), el('small', '', `chòm ${consDef(c.cons).name} · ${state}`));
        det.addEventListener('toggle', () => { if (det.open) markRead(line.id, i); });
        const play = el('button', 'chip', woven ? 'Dệt lại chương này' : half ? 'Dệt tiếp chương này' : 'Dệt chương này'); play.type = 'button';
        play.addEventListener('click', () => startChapter(line.id, i));
        det.append(sum, el('h5', '', 'Chuyện kể'), ...c.tale.map((t) => el('p', '', t)), el('h5', '', 'Bầu trời thật'), ...c.sky.map((t) => el('p', '', t)));
        const src = el('ul', 'fb-src');
        for (const [n, u] of c.skysrc) { const l = el('li'); const a = el('a', '', n); a.href = u; a.target = '_blank'; a.rel = 'noopener'; l.append(a); src.append(l); }
        det.append(src);
        li.append(det, play);
        ol.append(li);
      });
      const srcs = el('ul', 'fb-src');
      for (const [n, u] of line.src) { const l = el('li'); const a = el('a', '', n); a.href = u; a.target = '_blank'; a.rel = 'noopener'; l.append(a); srcs.append(l); }
      sec.append(ol, el('p', 'fb-small', 'Nguồn của chuyện kể (bản dịch tiếng Anh):'), srcs);
      box.append(sec);
    }
  }
  return { render, showLead, chapterDone, hideCards };
}
