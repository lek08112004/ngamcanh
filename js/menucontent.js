// What the menu's groups say, built from the real state of the game each time a group is shown.
// No invented progress: "Tiếp tục" only lists things the save holds; a suggestion says why it is
// suggested (the hour, the season) and can be put aside. "Dẫn đường" only sets the compass on a
// place (you walk there); "Tới chỗ ngồi" is the old seat jump and says so.
import { card, heading, grid, list, more, el } from './menu.js';
import { FISH, SPOTS as FISH_SPOTS, PARTS, partOf } from './fishdata.js';
import { MYTH_LINES } from './myths.js';
import { TARGETS } from './astro.js';

const SEASON = ['mùa xuân', 'mùa hạ', 'mùa thu', 'mùa đông'];

/** ctx: getters and the handlers main.js already has (see main.js "the menu") */
export function menuContent(ctx) {
  const dist = (x, z) => Math.round(Math.hypot(x - ctx.pos().x, z - ctx.pos().z));
  const guide = (name, x, z) => () => { ctx.setGuide(name, x, z); ctx.close(); ctx.toast(`La bàn chỉ tới ${name}, cách ${dist(x, z)} m`); };
  const frozen = () => ctx.winter() > 0.5;
  const night = () => ctx.dark();
  const st = ctx.store;
  let skipSuggest = false;

  /* ---------- what can be said about each activity right now ---------- */
  const fishState = () => frozen() ? 'Mùa đông: mặt nước đóng băng, bản này chưa có câu qua lỗ băng.' : `Đã câu được ${st.get('fish.seen', []).filter((id) => FISH.some((f) => f.id === id)).length}/${FISH.length} loài.`;
  const scopeState = () => night() ? 'Trời đã tối: ngắm được.' : 'Trời còn sáng: chỉ thấy Mặt Trăng và hành tinh sáng khi chạng vạng; quay lại sau hoàng hôn.';
  const nextChapter = () => {
    const done = st.get('sky.myth', []);
    for (const l of MYTH_LINES) { const i = l.chapters.findIndex((c, k) => !done.includes(`${l.id}:${k}`)); if (i >= 0) return { line: l, i }; }
    return null;
  };

  const build = {
    overview(sec) {
      sec.append(heading('Hôm nay bạn muốn làm gì?', `${ctx.timeText()} · ${SEASON[ctx.season()]}`));
      // a suggestion for this moment, with its reason
      if (!skipSuggest) {
        let s = null;
        if (night() && !frozen()) s = { t: 'Đêm nay trời tối hẳn: lên đồi sau trại ngắm kính thiên văn.', a: { label: 'Dẫn đường', run: guide('Kính thiên văn', ctx.scope.x, ctx.scope.z + 1.6) } };
        else if (night()) s = { t: 'Đêm đông dài: ngồi bên lửa, hoặc dệt một chương thần thoại.', a: { label: 'Dệt sao', run: () => { ctx.close(); ctx.weave(); } } };
        else if (!frozen() && (ctx.hour() < 9 || ctx.hour() > 16)) s = { t: `${ctx.hour() < 9 ? 'Sáng sớm' : 'Chiều muộn'}: lúc cá hồi và cá hồi cờ hay cắn câu ở ghềnh suối.`, a: { label: 'Dẫn đường', run: guide(FISH_SPOTS[0].name, ctx.fishSpots[0].x, ctx.fishSpots[0].z) } };
        else if (frozen()) s = { t: 'Tuyết đã phủ: ghé chào Bấc, người tuyết sau đống lửa.', a: { label: 'Dẫn đường', run: guide('Bấc', 2.2, -4.6) } };
        else s = { t: 'Trời sáng đẹp: dạo một vòng qua các vườn hoa.', a: { label: 'Dạo vườn', run: () => { ctx.close(); ctx.stroll(true); } } };
        const box = el('div', 'm-suggest');
        box.append(el('p', '', s.t));
        const go = el('button', 'm-btn primary', s.a.label); go.type = 'button'; go.addEventListener('click', s.a.run);
        const no = el('button', 'm-btn', 'Bỏ qua'); no.type = 'button'; no.addEventListener('click', () => { skipSuggest = true; box.remove(); });
        const row = el('div', 'm-actions'); row.append(go, no); box.append(row);
        sec.append(box);
      }
      sec.append(grid(
        card({ ic: 'walk', title: 'Dạo thung lũng', desc: 'Máy quay tự đi một vòng qua các vườn hoa; chạm phím bất kỳ để tự đi tiếp.', key: 'V', actions: [{ label: ctx.strolling() ? 'Dừng dạo' : 'Bắt đầu', primary: true, run: () => { ctx.close(); ctx.stroll(!ctx.strolling()); } }] }),
        card({ ic: 'fish', title: 'Câu cá', desc: 'Ba chỗ trên suối và ao, mười tám loài cá của vùng Lapland.', state: fishState(), warn: frozen(), actions: [{ label: 'Dẫn đường', primary: true, disabled: frozen() ? 'Mặt nước đang đóng băng' : '', run: () => ctx.menu.show('fish') }] }),
        card({ ic: 'scope', title: 'Kính thiên văn', desc: 'Trên đồi sau trại. Mặt Trăng, hành tinh, sao đôi, cụm sao.', state: scopeState(), actions: [{ label: 'Dẫn đường', primary: true, run: guide('Kính thiên văn', ctx.scope.x, ctx.scope.z + 1.6) }] }),
        card({ ic: 'weave', title: 'Dệt sao', desc: 'Dẫn đom đóm nối các ngôi sao thành chòm.', key: 'M', actions: [{ label: 'Bắt đầu', primary: true, run: () => { ctx.close(); ctx.weave(); } }] }),
        card({ ic: 'orbit', title: 'Đài mô phỏng', desc: 'Mô hình Mặt Trời, tám hành tinh, Trái Đất và Mặt Trăng. Là mô phỏng, không phải cảnh nhìn thật.', actions: [{ label: 'Mở', primary: true, run: () => { ctx.close(); ctx.orrery(); } }] }),
        card({ ic: 'book', title: 'Đọc sách', desc: 'Giá sách ở ghế dưới gốc anh đào, hoặc bên lò sưởi trong nhà gỗ.', actions: [{ label: 'Dẫn đường', primary: true, run: guide('Ghế dưới anh đào', ctx.bench.x, ctx.bench.z) }] }),
      ));
      // what you were doing, from the save only
      const cont = [];
      const book = ctx.lastBook();
      if (book) cont.push({ name: `Đang đọc: ${book.title}`, desc: `Trang ${book.page} · mở lại ở ghế dưới gốc anh đào`, actions: [{ label: 'Dẫn đường', run: guide('Ghế dưới anh đào', ctx.bench.x, ctx.bench.z) }] });
      const nx = nextChapter(), anyMyth = st.get('sky.myth', []).length;
      if (nx && anyMyth) cont.push({ name: `Thần thoại: ${nx.line.vi}`, desc: `Chương ${nx.i + 1}, ${nx.line.chapters[nx.i].title}`, actions: [{ label: 'Tiếp tục', run: () => { ctx.close(); ctx.myth(nx.line.id, nx.i); } }] });
      const seen = st.get('fish.seen', []).length;
      if (seen) cont.push({ name: 'Bách thư cá', desc: `${seen}/${FISH.length} loài đã câu được`, actions: [{ label: 'Mở', run: () => { ctx.close(); ctx.journal('fish'); } }] });
      const obs = st.get('sky.obs', []).length;
      if (obs) cont.push({ name: 'Sổ quan sát', desc: `${obs}/${TARGETS.length} mục tiêu đã ngắm`, actions: [{ label: 'Mở', run: () => { ctx.close(); ctx.journal('sky'); } }] });
      if (cont.length) sec.append(heading('Tiếp tục'), list(cont));
    },

    camp(sec) {
      sec.append(heading('Quanh trại', '"Dẫn đường" đặt la bàn lên chỗ đó, bạn tự đi tới. "Tới chỗ ngồi" đưa thẳng máy quay tới một chỗ ngồi đẹp.'));
      sec.append(grid(
        card({ ic: 'walk', title: 'Dạo vườn', desc: 'Máy quay thong thả đi qua luống hoa và vườn bách hoa.', key: 'V', actions: [{ label: ctx.strolling() ? 'Dừng' : 'Bắt đầu', primary: true, pressed: ctx.strolling(), run: () => { ctx.close(); ctx.stroll(!ctx.strolling()); } }] }),
        card({ ic: 'camera', title: 'Tự lia máy', desc: 'Máy quay lướt chậm qua sáu góc đẹp.', key: 'T', actions: [{ label: ctx.touring() ? 'Dừng' : 'Bắt đầu', primary: true, pressed: ctx.touring(), run: () => { ctx.close(); ctx.tour(!ctx.touring()); } }] }),
        card({ ic: 'home', title: 'Nhà gỗ', desc: 'Lên hiên bấm "Vào nhà nghỉ · E": nghỉ một lát, ghế bập bênh, lò sưởi.', actions: [{ label: 'Dẫn đường', primary: true, run: guide('Hiên nhà gỗ', ctx.porch.x, ctx.porch.z) }] }),
        card({ ic: 'lamp', title: 'Pha trà bên lửa', desc: 'Ghế đẩu phía nam đống lửa: đun nước, rót, nhấp từng ngụm.', actions: [{ label: 'Dẫn đường', primary: true, run: guide('Ghế đẩu pha trà', ctx.tea.x, ctx.tea.z + 0.8) }, { label: ctx.lampOn() ? 'Tắt đèn lều' : 'Bật đèn lều', run: () => { ctx.lamp(); ctx.menu.refresh(); } }] }),
      ));
      sec.append(heading('Các nơi trong thung lũng'), list(ctx.places().map((p) => ({ name: p.name, desc: `${p.note} · ${dist(p.x, p.z)} m${p.found ? ' · đã tới' : ''}`, actions: [{ label: 'Dẫn đường', run: guide(p.name, p.x, p.z) }] }))));
      sec.append(heading('Tới chỗ ngồi', 'Đưa máy quay tới chỗ ngồi ngay lập tức (như trước đây).'));
      const spots = el('div', 'm-chips');
      ctx.spots().forEach((s, i) => { const b = el('button', 'm-chip', s.name); b.type = 'button'; b.addEventListener('click', () => { ctx.close(); ctx.goSpot(i); }); spots.append(b); });
      sec.append(spots);
    },

    fish(sec) {
      sec.append(heading('Câu cá', fishState()));
      const part = partOf(ctx.hour());
      sec.append(list(ctx.fishSpots.map((s, i) => {
        const here = FISH.filter((f) => f.bite.spots[s.id]).sort((a, b) => b.bite.spots[s.id] * b.bite.part[part] - a.bite.spots[s.id] * a.bite.part[part]).slice(0, 3).map((f) => f.vi.toLowerCase());
        return { name: s.name, desc: `${FISH_SPOTS[i].note} ${PARTS[part]} hay gặp: ${here.join(', ')}. ${dist(s.x, s.z)} m.`, actions: [{ label: 'Dẫn đường', primary: true, disabled: frozen() ? 'Mặt nước đang đóng băng' : '', run: guide(s.name, s.x, s.z) }] };
      })));
      sec.append(grid(card({ ic: 'book', title: 'Bách thư cá', desc: 'Hai mươi sáu hồ sơ: mười tám loài sống ở đây và tám loài để tham khảo.', actions: [{ label: 'Mở Bách thư', primary: true, run: () => { ctx.close(); ctx.journal('fish'); } }] })));
      sec.append(heading('Kiểu chơi'), ctx.optFishRow());
      sec.append(more('Cách câu, từng bước',
        el('p', '', '1. Tới bờ nước, bấm "Câu cá" (phím E). 2. Kéo để đặt vòng sáng lên mặt nước, bấm "Quăng câu". 3. Phao rung khẽ là cá rỉa; chìm hẳn mới "Giật cần". 4. Giữ E (hoặc giữ nút) để thu dây; không cần bấm liên tục. 5. Ngắm cá rồi thả về nước. Esc hoặc bước đi để cất cần bất cứ lúc nào.'),
        el('p', '', 'Thư giãn: tự giật khi bạn lỡ nhịp, dây không đứt. Thủ công: có thanh độ căng, căng hay chùng quá lâu thì cá thoát. Cá thoát không làm mất gì.')));
    },

    sky(sec) {
      sec.append(heading('Bầu trời', 'Kính thiên văn cho thấy những gì mắt thật thấy qua thị kính. Đài mô phỏng là mô hình, không phải quan sát.'));
      sec.append(grid(
        card({ ic: 'scope', title: 'Kính thiên văn', desc: 'Mười một mục tiêu: Mặt Trăng, hành tinh, sao đôi, cụm sao, tinh vân, thiên hà.', state: scopeState(), actions: [{ label: 'Dẫn đường', primary: true, run: guide('Kính thiên văn', ctx.scope.x, ctx.scope.z + 1.6) }, { label: 'Sổ quan sát', run: () => { ctx.close(); ctx.journal('sky'); } }] }),
        card({ ic: 'weave', title: 'Dệt sao', desc: 'Trò dệt chòm sao bằng đom đóm. Tiến trình riêng, không đổi khi dệt thần thoại.', key: 'M', actions: [{ label: 'Bắt đầu', primary: true, run: () => { ctx.close(); ctx.weave(); } }, { label: ctx.consOn() ? 'Ẩn hình chòm sao' : 'Hiện hình chòm sao', run: () => { ctx.cons(); ctx.menu.refresh(); } }] }),
        card({ ic: 'orbit', title: 'Đài mô phỏng', desc: 'Xoay, phóng, tua thời gian; hiểu ngày đêm, mùa và pha Mặt Trăng.', actions: [{ label: 'Mở', primary: true, run: () => { ctx.close(); ctx.orrery(); } }] }),
      ));
      const done = st.get('sky.myth', []);
      sec.append(heading('Thần thoại', 'Mỗi chương dệt một chòm sao; xong chương thì mở trang Chuyện kể và Bầu trời thật.'));
      sec.append(list(MYTH_LINES.map((l) => {
        const n = l.chapters.filter((c, i) => done.includes(`${l.id}:${i}`)).length;
        const i = l.chapters.findIndex((c, k) => !done.includes(`${l.id}:${k}`));
        return { name: l.vi, desc: `${n}/${l.chapters.length} chương đã dệt${i >= 0 ? ` · tiếp theo: ${l.chapters[i].title}` : ''}`, actions: [{ label: i < 0 ? 'Dệt lại' : n ? 'Tiếp tục' : 'Bắt đầu', primary: true, run: () => { ctx.close(); ctx.myth(l.id, Math.max(0, i)); } }, { label: 'Đọc', run: () => { ctx.close(); ctx.journal('sky'); } }] };
      })));
      sec.append(heading('Kiểu ngắm và kiểu dệt'), ctx.optSkyRows());
    },

    book(sec) {
      sec.append(heading('Sổ tay', 'Mọi ghi chép nằm ở một nơi; menu chỉ dẫn tới đúng thẻ.'));
      const tabs = [['trip', 'Hành trình', 'Một ngày ở trại, nhật ký, Choco, sổ hoa, các nơi đã tới'], ['fish', 'Bách thư cá', 'Hai mươi sáu loài, tìm và lọc, mô hình xoay được'], ['sky', 'Bầu trời', 'Sổ quan sát, thần thoại, chuyện bảy chòm sao'], ['mine', 'Thung lũng của bạn', 'Tên thung lũng, góc ngắm yêu thích, trang trí'], ['guide', 'Hướng dẫn', 'Cách chơi từng hoạt động và mọi phím tắt'], ['data', 'Dữ liệu', 'Sao lưu ra file, khôi phục, xoá tiến trình']];
      sec.append(list(tabs.map(([id, name, desc]) => ({ name, desc, actions: [{ label: 'Mở', primary: id === 'trip', run: () => { ctx.close(); ctx.journal(id); } }] }))));
    },
  };

  /* ---------- what the search can find (names, groups, words without accents) ---------- */
  function items() {
    const it = [];
    const add = (name, group, desc, keys, label, run, extra = {}) => it.push({ name, group, desc, keys, label, run, ...extra });
    add('Dạo vườn', 'Quanh trại', 'Máy quay tự đi qua các vườn hoa', 'dao vuon di bo stroll V', ctx.strolling() ? 'Dừng' : 'Bắt đầu', () => ctx.stroll(!ctx.strolling()));
    add('Tự lia máy', 'Quanh trại', 'Lướt qua sáu góc đẹp', 'tour camera T', ctx.touring() ? 'Dừng' : 'Bắt đầu', () => ctx.tour(!ctx.touring()));
    add('Câu cá', 'Câu cá', 'Ba chỗ câu, cách chơi, Bách thư', 'ca cau fishing', 'Xem', () => {}, { sec: 'fish', open: true });
    for (const s of ctx.fishSpots) add(s.name, 'Câu cá', 'Chỗ câu cá trên suối và ao', 'ca cau suoi ao ghenh vuc', 'Dẫn đường', guide(s.name, s.x, s.z));
    add('Bách thư cá', 'Sổ tay', 'Hai mươi sáu loài cá', 'ca loai fish book bach thu', 'Mở', () => ctx.journal('fish'));
    add('Kính thiên văn', 'Bầu trời', 'Trên đồi sau trại; ngắm khi trời tối', 'kinh thien van telescope ngam sao trang', 'Dẫn đường', guide('Kính thiên văn', ctx.scope.x, ctx.scope.z + 1.6));
    add('Sổ quan sát', 'Bầu trời', 'Những gì đã ngắm qua kính', 'quan sat kinh', 'Mở', () => ctx.journal('sky'));
    add('Dệt sao', 'Bầu trời', 'Trò dệt chòm sao bằng đom đóm', 'det sao choi game M', 'Bắt đầu', () => ctx.weave());
    add('Hình chòm sao', 'Bầu trời', 'Hiện hoặc ẩn hình bảy chòm (ban đêm)', 'chom sao C', ctx.consOn() ? 'Ẩn' : 'Hiện', () => ctx.cons());
    for (const l of MYTH_LINES) add(l.vi, 'Bầu trời · thần thoại', 'Dệt từng chương, đọc chuyện và bầu trời thật', 'than thoai hy lap myth perseus orion', 'Tiếp tục', () => { const done = st.get('sky.myth', []); const i = l.chapters.findIndex((c, k) => !done.includes(`${l.id}:${k}`)); ctx.myth(l.id, Math.max(0, i)); });
    add('Đài mô phỏng', 'Bầu trời', 'Mô hình Hệ Mặt Trời', 'mo phong he mat troi hanh tinh trai dat orrery', 'Mở', () => ctx.orrery());
    add('Nhà gỗ', 'Quanh trại', 'Vào nhà nghỉ, ghế bập bênh, lò sưởi', 'nha go cabin nghi ghe bap benh', 'Dẫn đường', guide('Hiên nhà gỗ', ctx.porch.x, ctx.porch.z));
    add('Pha trà', 'Quanh trại', 'Ghế đẩu bên lửa trại', 'tra pha lua', 'Dẫn đường', guide('Ghế đẩu pha trà', ctx.tea.x, ctx.tea.z + 0.8));
    add('Đọc sách', 'Quanh trại', 'Giá sách ở ghế dưới gốc anh đào', 'sach doc ghe anh dao', 'Dẫn đường', guide('Ghế dưới anh đào', ctx.bench.x, ctx.bench.z));
    add('Đèn lều', 'Quanh trại', 'Bật hoặc tắt đèn trong lều', 'den leu lamp', ctx.lampOn() ? 'Tắt' : 'Bật', () => ctx.lamp(), { stay: true });
    for (const p of ctx.places()) add(p.name, 'Quanh trại · nơi chốn', p.note, 'noi dia diem', 'Dẫn đường', guide(p.name, p.x, p.z));
    ctx.spots().forEach((s, i) => add(s.name, 'Quanh trại · chỗ ngồi', 'Đưa máy quay tới chỗ ngồi ngay', 'cho ngoi', 'Tới chỗ ngồi', () => ctx.goSpot(i)));
    for (const [id, name, keys] of [['trip', 'Hành trình', 'nhat ky choco so hoa'], ['mine', 'Thung lũng của bạn', 'ten trang tri goc ngam'], ['guide', 'Hướng dẫn', 'huong dan phim tat cach choi help'], ['data', 'Dữ liệu và sao lưu', 'sao luu khoi phuc xoa du lieu export import']]) add(name, 'Sổ tay', 'Mở thẻ này trong Sổ tay', keys, 'Mở', () => ctx.journal(id));
    add('Chụp ảnh', 'Ghi lại', 'Lưu khung hình thành tệp PNG', 'chup anh photo P', 'Chụp', () => ctx.photo());
    add('Lưu góc đang nhìn', 'Ghi lại', 'Giữ chỗ đứng và hướng nhìn', 'goc ngam luu view K', 'Lưu', () => ctx.saveView());
    add('Đi cùng bạn', 'Bạn bè', 'Mở phòng, gửi mã cho bạn', 'ban be di cung party', 'Mở', () => ctx.friends());
    for (const [set, name, keys] of [['world', 'Giờ, mùa, sắc trời', 'gio mua sac troi thoi gian'], ['picture', 'Chất lượng hình ảnh', 'chat luong hinh anh xoa phong quang sang do hoa'], ['sound', 'Âm lượng', 'am thanh am luong tieng'], ['controls', 'Phím tắt và điều khiển', 'phim dieu khien'], ['help', 'Hỗ trợ', 'ho tro co chu chuyen dong ten ban nho'], ['data', 'Dữ liệu và đồng bộ', 'du lieu dong bo may telemetry']]) it.push({ name, group: 'Tuỳ chỉnh', desc: 'Mở nhóm này trong Tuỳ chỉnh', keys, label: 'Mở', sec: 'settings', set, open: true, run: () => {} });
    add('Toàn màn hình', 'Tiện ích', 'Bật hoặc tắt toàn màn hình', 'toan man hinh fullscreen F', 'Bật/tắt', () => ctx.fullscreen());
    add('Ẩn giao diện (Thiền)', 'Tiện ích', 'Ẩn mọi bảng, máy quay tự lia', 'an giao dien zen thien H', 'Bật', () => ctx.zen());
    return it;
  }
  return { build, items };
}
