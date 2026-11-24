// What you see and press while fishing (fishing.js does the work): a small status card with the
// tension of the line, the choice between relaxed and manual play, and the card of the fish you
// have just landed. The catch is written into the save here, once, when 'landed' fires (never
// when a fish is drawn), so a fish that slips off is not recorded and pressing again records nothing.
import { store } from './store.js';
import { SPOTS, PARTS, partOf, SEASON_VI } from './fishdata.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

export function createFishUI({ fishing, toast, note, openBook, getClock }) {
  /* ---------- DOM ---------- */
  const hud = el('div', 'fish-hud hidden');
  hud.setAttribute('role', 'status');
  hud.setAttribute('aria-live', 'polite');
  const head = el('div', 'fish-head');
  const where = el('b', 'fish-where');
  const modes = el('div', 'fish-modes');
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', 'Cách câu');
  const mRelax = el('button', 'chip', 'Thư giãn'); mRelax.type = 'button'; mRelax.title = 'Tự giật khi bạn lỡ nhịp, tự nhả dây khi cá vùng chạy, dây không bao giờ đứt';
  const mManual = el('button', 'chip', 'Thủ công'); mManual.type = 'button'; mManual.title = 'Bạn tự giật, tự giữ nhịp thu dây và để ý độ căng';
  modes.append(mRelax, mManual);
  head.append(where, modes);
  const line = el('p', 'fish-line');
  const meter = el('div', 'fish-meter');
  meter.setAttribute('aria-hidden', 'true');
  const fill = el('i'); const mark = el('em');
  meter.append(fill, mark);
  const keys = el('p', 'fish-keys');
  hud.append(head, line, meter, keys);

  const card = el('div', 'catch-card hidden');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Cá vừa câu được');
  const cTag = el('p', 'eyebrow');
  const cName = el('h3');
  const cSci = el('p', 'catch-sci');
  const cSize = el('p', 'catch-size');
  const cNote = el('p', 'catch-note');
  const cRow = el('div', 'catch-row');
  const bBook = el('button', 'chip', 'Xem trong Bách thư'); bBook.type = 'button';
  const bFree = el('button', 'btn primary', 'Thả về nước · E'); bFree.type = 'button';
  cRow.append(bBook, bFree);
  card.append(cTag, cName, cSci, cSize, cNote, cRow);
  document.body.append(hud, card);

  /* ---------- the save ---------- */
  const seen = new Set(store.get('fish.seen', []));
  const setMode = (m) => {
    store.set('fish.mode', m);
    fishing.setMode(m);
    mRelax.setAttribute('aria-pressed', String(m === 'relaxed'));
    mManual.setAttribute('aria-pressed', String(m === 'manual'));
    meter.classList.toggle('hidden', m !== 'manual');
  };
  mRelax.addEventListener('click', () => setMode('relaxed'));
  mManual.addEventListener('click', () => setMode('manual'));
  bFree.addEventListener('click', () => fishing.release());
  let lastId = '';
  bBook.addEventListener('click', () => openBook(lastId));

  function record({ fish, cm, spot }) {
    const { season, hour } = getClock();
    const first = !seen.has(fish.id);
    seen.add(fish.id);
    store.set('fish.seen', [...seen]);
    store.set('fish.count', store.get('fish.count', 0) + 1);
    if (first) {
      const f = store.get('fish.first', []);
      if (!f.some((x) => x.startsWith(fish.id + '|'))) store.set('fish.first', [...f, `${fish.id}|${spot.id}|${season}|${partOf(hour)}|${cm}`]);
      note(`a:${fish.id}`);
    }
    const best = store.get('fish.best', []);
    const old = best.find((x) => x.startsWith(fish.id + ':'));
    const oldCm = old ? Number(old.split(':')[1]) : 0;
    if (cm > oldCm) store.set('fish.best', [...best.filter((x) => x !== old), `${fish.id}:${cm}`]);
    return { first, record: !first && cm > oldCm, oldCm };
  }

  /* ---------- what happens ---------- */
  fishing.on((ev, d) => {
    if (ev === 'nibble') toast('Phao rung khẽ: có cá đang rỉa mồi. Chờ phao chìm hẳn');
    if (ev === 'bite') toast(fishing.state.mode === 'relaxed' ? 'Phao chìm! Bấm E (hoặc nút) để giật cần' : 'Phao chìm! Giật ngay (E)');
    if (ev === 'late') toast('Cá nhả mồi rồi. Không sao, phao vẫn ở đó, chờ con khác');
    if (ev === 'early') { /* the reason is shown by the caller */ }
    if (ev === 'hooked') toast(d.auto ? 'Cá đã mắc câu (tự giật). Giữ E hoặc giữ nút để thu dây' : 'Dính rồi! Giữ E hoặc giữ nút để thu dây');
    if (ev === 'lost') toast(d.why === 'snap' ? 'Căng quá, lưỡi câu tuột khỏi miệng cá. Cá bơi đi, không mất gì cả' : 'Dây chùng lâu quá, cá giũ được lưỡi câu. Quăng lại nhé');
    if (ev === 'landed') {
      const r = record(d);
      lastId = d.fish.id;
      cTag.textContent = r.first ? 'Loài mới · đã ghi vào Bách thư' : r.record ? `Con lớn nhất từng câu (trước: ${r.oldCm} cm)` : 'Đã có trong Bách thư';
      cName.textContent = d.fish.vi;
      cSci.textContent = d.fish.sci;
      cSize.textContent = `Dài khoảng ${String(d.cm).replace('.', ',')} cm · ${d.spot.name}`;
      cNote.textContent = d.fish.id_[0];
      card.classList.remove('hidden');
      setTimeout(() => { try { bFree.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 50);
    }
    if (ev === 'state') {
      if (d !== 'landed') card.classList.add('hidden');
      hud.classList.toggle('hidden', d === 'off' || d === 'landed');
    }
  });

  let lastLine = '', lastKeys = '';
  return {
    seen,
    /** fishing starts at a spot */
    begin(spot) {
      const { season, hour } = getClock();
      where.textContent = `${spot.name} · ${PARTS[partOf(hour)].toLowerCase()} ${SEASON_VI[season].toLowerCase()}`;
      fishing.begin(spot, { mode: store.get('fish.mode', 'relaxed'), season, hour, seen });
      setMode(store.get('fish.mode', 'relaxed'));
    },
    /** the action button's label for this moment ('' = none) and what it does */
    action() {
      const st = fishing.state.state;
      if (st === 'aim') return ['fcast', fishing.state.aimOk ? 'Quăng câu · E' : fishing.state.aimWhy || 'Nhìn xuống mặt nước'];
      if (st === 'wait') return ['fstrike', 'Giật cần · E'];
      if (st === 'hooked') return ['freel', 'Giữ E để thu dây'];
      if (st === 'landed') return ['frelease', 'Thả cá về nước · E'];
      return ['', ''];
    },
    update() {
      const S = fishing.state;
      if (S.state === 'off') return;
      let text = '';
      if (S.state === 'aim') text = S.aimOk ? 'Vòng sáng trên mặt nước là chỗ phao sẽ rơi. Kéo để nhìn chỗ khác' : S.aimWhy;
      else if (S.state === 'cast') text = 'Dây vút ra…';
      else if (S.state === 'wait') text = S.bit ? 'Phao chìm rồi!' : 'Chờ phao. Rung khẽ là cá rỉa, chìm hẳn mới giật';
      else if (S.state === 'hooked') text = S.run > 0 ? (S.mode === 'relaxed' ? 'Cá đang vùng chạy, để nó mệt' : 'Cá vùng chạy: nhả tay cho dây ra') : 'Cá đang nghỉ: thu dây đều tay';
      else if (S.state === 'landed') text = 'Ngắm cá một chút rồi thả nó về nước';
      else if (S.state === 'release' || S.state === 'retrieve') text = 'Thu dây về…';
      if (text !== lastLine) { lastLine = text; line.textContent = text; }
      const k = S.state === 'hooked' ? 'Giữ E / giữ nút: thu dây · Esc: thu cần' : S.state === 'aim' ? 'E: quăng · W A S D: đi chỗ khác · Esc: cất cần' : 'Esc: thu cần';
      if (k !== lastKeys) { lastKeys = k; keys.textContent = k; }
      const show = S.state === 'hooked' && S.mode === 'manual';
      meter.style.visibility = show ? 'visible' : 'hidden';
      if (show) {
        fill.style.transform = `scaleX(${Math.min(1.15, S.tension) / 1.15})`;
        meter.classList.toggle('hot', S.tension > 0.95);
      }
    },
    hideCard() { card.classList.add('hidden'); },
  };
}
export { SPOTS };
