// The one menu ("Khám phá thung lũng"): a panel on the right (a sheet on phones) with six groups
// (Tổng quan, Quanh trại, Câu cá, Bầu trời, Sổ tay, Tuỳ chỉnh), a search over what you can do, and
// two small popovers on the HUD (Giờ & mùa, Âm lượng).
//
// It owns no game logic: main.js hands it the handlers that already exist (start fishing, set a
// compass guide, open the journal at a tab, start a myth chapter...) and getters for the real state
// (season, hour, what has been caught, observed, woven, read). Existing controls (the time slider,
// season chips, quality and effect chips, volume, the activity options) are *moved* into it, not
// copied, so their ids and listeners stay as they were.
// Content is built when a group is shown, never per frame; nothing runs while it is closed.
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

/* ---------------------------------------------------------------- icons (inline SVG, one stroke style) */
const PATHS = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  tent: '<path d="M3 19 12 5l9 14z"/><path d="M12 5v14"/><path d="M9.5 19 12 14l2.5 5"/>',
  fish: '<path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3z"/><circle cx="8" cy="11" r=".9" fill="currentColor"/>',
  star: '<path d="m12 3 2.4 5.6 6 .5-4.6 4 1.4 5.9L12 16l-5.2 3 1.4-5.9-4.6-4 6-.5z"/>',
  book: '<path d="M4 5c3-1 6-1 8 1v13c-2-2-5-2-8-1z"/><path d="M20 5c-3-1-6-1-8 1v13c2-2 5-2 8-1z"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  camera: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  friends: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/><circle cx="17" cy="8" r="2.4"/><path d="M15.5 13.3c2.3-.3 4.3 1 5 3.7"/>',
  clock: '<path d="M4 17h16"/><path d="M7 17a5 5 0 0 1 10 0"/><path d="M12 6v2M5.5 9.5l1.4 1.4M18.5 9.5l-1.4 1.4"/>',
  scope: '<path d="m4 14 11-6 2 3.5-11 6z"/><path d="m15 8 3-1.5 1.5 2.6-3 1.6"/><path d="M9 15.5 7 20M10.5 14.7 13 20"/>',
  weave: '<circle cx="5" cy="17" r="1.6"/><circle cx="11" cy="7" r="1.6"/><circle cx="19" cy="11" r="1.6"/><circle cx="15" cy="19" r="1.6"/><path d="m6 15.6 4-7M12.5 7.6l5 2.6M18.2 12.4l-2.4 5.2"/>',
  orbit: '<circle cx="12" cy="12" r="2.6"/><ellipse cx="12" cy="12" rx="9.5" ry="4.2"/><circle cx="20.5" cy="10" r="1.2" fill="currentColor"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="m9 21 2.4-6.5L14 16v5M8 11l3-4 3.5 3 3 1"/><path d="m11.4 14.5.6-4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="m9 6 6 6-6 6"/>',
  mountain: '<path d="m3 19 6.5-11 4 6.5 2.5-3.5L21 19z"/>',
  sound: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="m16.5 9.5 5 5M21.5 9.5l-5 5"/>',
  lamp: '<path d="M9 18h6M10 21h4"/><path d="M8 13a5 5 0 1 1 8 0c-1 1-1.5 2-1.5 3h-5c0-1-.5-2-1.5-3z"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17 18z"/>',
  disk: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 4v5h8V4M8 20v-6h8v6"/>',
};
export function icon(name, cls = 'ic') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] || ''}</svg>`;
}

/* ---------------------------------------------------------------- the menu */
export const SECTIONS = [
  ['overview', 'Tổng quan', 'home'], ['camp', 'Quanh trại', 'tent'], ['fish', 'Câu cá', 'fish'],
  ['sky', 'Bầu trời', 'star'], ['book', 'Sổ tay', 'book'], ['settings', 'Tuỳ chỉnh', 'sliders'],
];
export const SETTINGS = [
  ['world', 'Thế giới', 'Giờ, mùa và bầu trời của thung lũng. Thay đổi ở đây là thay đổi cảnh, không đụng tới tiến trình.'],
  ['picture', 'Hình ảnh', 'Chất lượng và hiệu ứng cho máy này. Không đi theo bản sao lưu.'],
  ['sound', 'Âm thanh', 'Một âm lượng chung cho mọi tiếng: gió, lửa, suối, chim, bạn nhỏ, câu cá.'],
  ['controls', 'Điều khiển', 'Phím và thao tác. Các phím này chưa đổi được.'],
  ['help', 'Hỗ trợ', 'Cỡ chữ, chuyển động và kiểu chơi dễ cho từng hoạt động.'],
  ['data', 'Dữ liệu', 'Tiến trình nằm trên máy này; có thể sao lưu ra file. Bản sao trên mây (nếu có) chỉ là bản phụ.'],
];

/**
 * cfg: {
 *   root, quick: { time, journal, explore, friends, more }, hosts: { [settingsGroup]: [nodes...] },
 *   build: { overview(sec), camp(sec), fish(sec), sky(sec), book(sec) }   // each fills its <section>
 *   items(): [{ name, group, sec, desc, keys, label, run, guide }]       // what the search finds
 *   onOpen(), onClose(), status(): string                                  // the footer's save line
 *   photo(), friends()
 * }
 */
export function createMenu(cfg) {
  const root = cfg.root;
  root.innerHTML = '';
  root.className = 'menu hidden';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'menuTitle');
  const scrim = el('div', 'menu-scrim');
  const panel = el('div', 'menu-panel');
  // header
  const head = el('header', 'menu-head');
  head.innerHTML = `<span class="menu-logo">${icon('compass', 'ic big')}</span><div><h2 id="menuTitle">Khám phá thung lũng</h2><p>Mọi việc có thể làm, ở một nơi</p></div>`;
  const close = el('button', 'menu-close'); close.type = 'button'; close.setAttribute('aria-label', 'Đóng menu (Esc)'); close.innerHTML = icon('close');
  head.append(close);
  // body: the groups on the left, the content on the right
  const body = el('div', 'menu-body');
  const nav = el('nav', 'menu-nav'); nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-orientation', 'vertical'); nav.setAttribute('aria-label', 'Nhóm');
  const main = el('div', 'menu-main');
  const searchRow = el('div', 'menu-search');
  searchRow.innerHTML = icon('search');
  const search = el('input'); search.type = 'search'; search.placeholder = 'Tìm hoạt động, địa điểm, cài đặt…'; search.setAttribute('aria-label', 'Tìm trong menu'); search.autocomplete = 'off'; search.spellcheck = false;
  const clear = el('button', 'menu-clear'); clear.type = 'button'; clear.setAttribute('aria-label', 'Xoá tìm kiếm'); clear.innerHTML = icon('close'); clear.hidden = true;
  searchRow.append(search, clear);
  const results = el('div', 'menu-results'); results.hidden = true; results.setAttribute('aria-live', 'polite');
  main.append(searchRow, results);
  const tabs = {}, panes = {};
  for (const [id, name, ic] of SECTIONS) {
    const b = el('button', 'menu-tab'); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = `mtab-${id}`; b.dataset.sec = id;
    b.innerHTML = `${icon(ic)}<span>${name}</span>`;
    b.setAttribute('aria-controls', `mpane-${id}`);
    nav.append(b); tabs[id] = b;
    const p = el('section', 'menu-pane'); p.id = `mpane-${id}`; p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', b.id); p.hidden = true;
    main.append(p); panes[id] = p;
  }
  // settings: a second row of groups, and the hosts the existing controls are moved into
  const setNav = el('div', 'menu-subnav'); setNav.setAttribute('role', 'tablist'); setNav.setAttribute('aria-label', 'Nhóm tuỳ chỉnh');
  const setPanes = {}, setTabs = {};
  for (const [id, name, desc] of SETTINGS) {
    const b = el('button', 'menu-subtab', name); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.set = id; b.id = `mset-${id}`;
    setNav.append(b); setTabs[id] = b;
    const p = el('div', 'menu-setpane'); p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', b.id); p.hidden = true;
    const h = el('div', 'menu-sethead');
    h.append(el('h3', '', name), el('p', '', desc));
    p.append(h);
    const box = el('div', 'menu-setbox'); p.append(box); p.box = box;
    setPanes[id] = p;
  }
  panes.settings.append(setNav, ...Object.values(setPanes));
  body.append(nav, main);
  // footer: photo, friends, where your progress is
  const foot = el('footer', 'menu-foot');
  const bPhoto = el('button', 'menu-footbtn'); bPhoto.type = 'button'; bPhoto.innerHTML = `${icon('camera')}<span>Chụp ảnh</span>`; bPhoto.title = 'Lưu khung hình thành tệp PNG (P)';
  const bFriends = el('button', 'menu-footbtn'); bFriends.type = 'button'; bFriends.innerHTML = `${icon('friends')}<span>Đi cùng bạn</span>`;
  const saved = el('span', 'menu-saved'); saved.setAttribute('role', 'status');
  foot.append(bPhoto, bFriends, saved);
  panel.append(head, body, foot);
  root.append(scrim, panel);

  /* ---------- the existing controls move into the settings groups (ids and listeners kept) ---------- */
  const hostAll = () => { for (const [id, nodes] of Object.entries(cfg.hosts)) for (const n of nodes) if (n && n.parentElement !== setPanes[id].box) setPanes[id].box.append(n); };
  hostAll();

  /* ---------- state ---------- */
  let cur = 'overview', curSet = 'world', ret = null, open = false;
  function show(id) {
    cur = id;
    for (const [k, b] of Object.entries(tabs)) { const on = k === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; panes[k].hidden = !on || !!search.value; }
    // a group's content is built when shown and dropped when another is shown (settings keeps its moved controls)
    for (const [k, p] of Object.entries(panes)) if (k !== id && k !== 'settings' && p.firstChild) p.innerHTML = '';
    if (id === 'settings') { hostAll(); showSet(curSet); }
    else if (cfg.build[id]) { panes[id].innerHTML = ''; cfg.build[id](panes[id], api); }
    main.scrollTop = 0;
  }
  function showSet(id) {
    curSet = id;
    for (const [k, b] of Object.entries(setTabs)) { const on = k === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; setPanes[k].hidden = !on; }
  }
  function openMenu(id = cur, set) {
    if (set) curSet = set;
    if (!open) {
      ret = document.activeElement;
      open = true;
      root.classList.remove('hidden');
      document.body.classList.add('menu-open');
      cfg.onOpen && cfg.onOpen();
    }
    saved.textContent = cfg.status ? cfg.status() : '';
    show(id);
    requestAnimationFrame(() => { try { tabs[id].focus({ preventScroll: true }); } catch (e) { /* ignore */ } });
  }
  function closeMenu() {
    if (!open) return;
    open = false;
    root.classList.add('hidden');
    document.body.classList.remove('menu-open');
    if (cur !== 'settings') panes[cur].innerHTML = '';
    if (search.value) { search.value = ''; doSearch(); }
    cfg.onClose && cfg.onClose();
    if (ret && ret.isConnected) { try { ret.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    ret = null;
  }

  /* ---------- search: names, groups, words; without accents; never the books' text ---------- */
  function doSearch() {
    const q = norm(search.value.trim());
    clear.hidden = !search.value;
    results.innerHTML = '';
    if (!q) { results.hidden = true; panes[cur].hidden = false; return; }
    panes[cur].hidden = true; results.hidden = false;
    const words = q.split(/\s+/);
    // names that start with the words first, then names that contain them, then the rest
    const rank = (it) => { const n = norm(it.name); return n.startsWith(q) ? 0 : n.split(/\s+/).some((w) => w.startsWith(words[0])) ? 1 : n.includes(q) ? 2 : 3; };
    const found = cfg.items().filter((it) => { const hay = norm(`${it.name} ${it.group} ${it.desc} ${it.keys || ''}`); return words.every((w) => hay.includes(w)); })
      .sort((a, b) => rank(a) - rank(b));
    if (!found.length) {
      const e = el('div', 'menu-empty');
      e.append(el('p', '', `Không tìm thấy “${search.value}”. Thử một từ khác, ví dụ “cá”, “kính”, “trà”, “âm lượng”.`));
      const c = el('button', 'm-btn', 'Xoá tìm kiếm'); c.type = 'button'; c.addEventListener('click', () => { search.value = ''; doSearch(); search.focus(); });
      e.append(c); results.append(e); return;
    }
    const ul = el('ul', 'menu-reslist');
    for (const it of found.slice(0, 30)) {
      const li = el('li', 'menu-res');
      const t = el('div', 'menu-restext');
      t.append(el('b', '', it.name), el('small', '', it.group), el('p', '', it.desc));
      const go = el('button', 'm-btn', it.label); go.type = 'button';
      go.addEventListener('click', () => { if (it.sec && it.open) { search.value = ''; doSearch(); show(it.sec); if (it.set) showSet(it.set); return; } it.run(); if (!it.stay) closeMenu(); });
      li.append(t, go); ul.append(li);
    }
    results.append(ul);
  }
  search.addEventListener('input', doSearch);
  clear.addEventListener('click', () => { search.value = ''; doSearch(); search.focus(); });

  /* ---------- wiring ---------- */
  close.addEventListener('click', closeMenu);
  scrim.addEventListener('click', closeMenu);
  bPhoto.addEventListener('click', () => { closeMenu(); cfg.photo(); });
  bFriends.addEventListener('click', () => { closeMenu(); cfg.friends(); });
  for (const b of Object.values(tabs)) b.addEventListener('click', () => { search.value = ''; doSearch(); show(b.dataset.sec); });
  for (const b of Object.values(setTabs)) b.addEventListener('click', () => showSet(b.dataset.set));
  const arrows = (list, vertical, onPick) => list.forEach((b, i) => b.addEventListener('keydown', (e) => {
    const next = vertical ? ['ArrowDown', 'ArrowRight'] : ['ArrowRight', 'ArrowDown'], prev = vertical ? ['ArrowUp', 'ArrowLeft'] : ['ArrowLeft', 'ArrowUp'];
    let j = -1;
    if (next.includes(e.key)) j = (i + 1) % list.length; else if (prev.includes(e.key)) j = (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = list.length - 1;
    if (j >= 0) { e.preventDefault(); onPick(list[j]); list[j].focus(); }
  }));
  arrows(Object.values(tabs), true, (b) => { search.value = ''; doSearch(); show(b.dataset.sec); });
  arrows(Object.values(setTabs), false, (b) => showSet(b.dataset.set));
  // Tab stays inside the dialog
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...panel.querySelectorAll('button, input, select, a[href], [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  const api = {
    get open() { return open; },
    get section() { return cur; },
    openMenu, closeMenu, show, showSet, refresh() { if (open && cur !== 'settings') show(cur); },
    focusSearch() { search.focus(); },
  };
  return api;
}

/* ---------------------------------------------------------------- small helpers for the content */
/** a card for an activity: icon, title, one line, a state line, and up to two buttons */
export function card({ ic, title, desc, state, warn, actions = [], key }) {
  const c = el('div', 'm-card' + (warn ? ' warn' : ''));
  const top = el('div', 'm-cardtop');
  top.innerHTML = icon(ic, 'ic m-cardic');
  const tx = el('div', 'm-cardtx');
  const h = el('b', '', title);
  if (key) { const k = el('kbd', '', key); h.append(' ', k); }
  tx.append(h, el('p', '', desc));
  if (state) tx.append(el('p', 'm-state', state));
  top.append(tx);
  c.append(top);
  if (actions.length) {
    const row = el('div', 'm-actions');
    for (const a of actions) {
      const b = el('button', a.primary ? 'm-btn primary' : 'm-btn', a.label); b.type = 'button';
      if (a.disabled) { b.disabled = true; b.title = a.disabled; }
      if (a.pressed !== undefined) b.setAttribute('aria-pressed', String(a.pressed));
      b.addEventListener('click', a.run);
      row.append(b);
    }
    c.append(row);
  }
  return c;
}
export function heading(text, sub) {
  const d = el('div', 'm-head');
  d.append(el('h3', '', text));
  if (sub) d.append(el('p', '', sub));
  return d;
}
export function grid(...cards) { const g = el('div', 'm-grid'); g.append(...cards); return g; }
export function list(rows) {
  const ul = el('ul', 'm-list');
  for (const r of rows) {
    const li = el('li');
    const t = el('div', 'm-listtx');
    t.append(el('b', '', r.name));
    if (r.desc) t.append(el('small', '', r.desc));
    li.append(t);
    for (const a of r.actions || []) { const b = el('button', 'm-btn' + (a.primary ? ' primary' : ''), a.label); b.type = 'button'; if (a.disabled) { b.disabled = true; b.title = a.disabled; } b.addEventListener('click', a.run); li.append(b); }
    ul.append(li);
  }
  return ul;
}
export function more(summary, ...nodes) { const d = el('details', 'm-more'); d.append(el('summary', '', summary), ...nodes); return d; }
export { el };

/* ---------------------------------------------------------------- the HUD popovers */
/** a small panel anchored above or below a button; closes on Esc, outside click or the button */
export function popover(anchor, id, label, fill) {
  const pop = el('div', 'm-pop hidden');
  pop.id = id; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', label);
  document.body.append(pop);
  let on = false;
  const place = () => {
    const r = anchor.getBoundingClientRect(), w = Math.min(340, innerWidth - 24);
    pop.style.width = `${w}px`;
    const left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2));
    pop.style.left = `${left}px`;
    if (r.top > innerHeight / 2) { pop.style.top = ''; pop.style.bottom = `${innerHeight - r.top + 10}px`; } else { pop.style.bottom = ''; pop.style.top = `${r.bottom + 10}px`; }
  };
  const outside = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) toggle(false); };
  function toggle(v = !on) {
    if (v === on) return;
    on = v;
    pop.classList.toggle('hidden', !on);
    anchor.setAttribute('aria-expanded', String(on));
    if (on) { fill(pop); place(); document.addEventListener('pointerdown', outside, true); requestAnimationFrame(() => { const f = pop.querySelector('button, input'); if (f) f.focus({ preventScroll: true }); }); }
    else { document.removeEventListener('pointerdown', outside, true); try { anchor.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  anchor.setAttribute('aria-haspopup', 'dialog');
  anchor.setAttribute('aria-expanded', 'false');
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); toggle(false); } });
  addEventListener('resize', () => { if (on) place(); });
  return { toggle, get open() { return on; }, el: pop };
}
