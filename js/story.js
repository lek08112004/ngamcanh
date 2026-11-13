// "Một ngày ở trại" — a quiet thread to follow through the valley, from waking on the hill
// to a wish under the aurora. Nothing here can be failed or missed: each page is a small
// thing worth doing, they can be done in any order, and the card only ever suggests the
// first one still open. Progress lives in the save file (store.js), like everything else.
import { store } from './store.js';

// id, title, what the card asks, what the journal remembers once it is done
export const CHAPTERS = [
  { id: 'walk', when: 'Sáng', title: 'Thức dậy trên đồi', ask: 'Đi một vòng quanh trại cho ấm người (W A S D, hoặc cần điều khiển).', memo: 'Cỏ còn ướt sương, bước nào cũng nghe sột soạt.' },
  { id: 'fire', when: 'Sáng', title: 'Giữ lửa', ask: 'Bấm vào đống lửa, hoặc phím Space, để thêm một thanh củi.', memo: 'Lửa bén củi mới, khói thơm mùi nhựa thông.' },
  { id: 'tulips', when: 'Sáng', title: 'Xuống luống tulip', ask: 'Đi theo la bàn xuống những dải màu phía bắc trại.', memo: 'Mỗi luống một màu, chạy thẳng hàng xuống thung lũng.' },
  { id: 'bloom', when: 'Sáng', title: 'Cúi xuống một bông hoa', ask: 'Đứng giữa luống hoa, kéo góc nhìn xuống một bông ở sát chân và nhìn nó vài giây.', memo: 'Sáu cánh khép thành chén, sương còn đọng trên cánh.' },
  { id: 'garden', when: 'Sáng', title: 'Vườn bách hoa', ask: 'Qua cổng hoa hồng ở phía đông trại.', memo: 'Hồng, oải hương, hướng dương, cúc, và ba cây anh đào.' },
  { id: 'bench', when: 'Sáng', title: 'Ngồi dưới anh đào', ask: 'Tìm chiếc ghế gỗ dưới cây anh đào giữa vườn và ngồi lại một lát.', memo: 'Cánh hoa rơi chậm, đậu cả lên vai.' },
  { id: 'stream', when: 'Trưa', title: 'Lội suối', ask: 'Xuống bờ suối trong thung lũng rồi bước hẳn xuống nước.', memo: 'Nước lạnh buốt, trong đến mức đếm được sỏi dưới đáy.' },
  { id: 'hill', when: 'Trưa', title: 'Lên cao nhìn lại', ask: 'Leo lên Đồi phía đông hoặc Đồi sau trại để nhìn cả thung lũng.', memo: 'Từ trên cao, trại chỉ còn là một chấm khói.' },
  { id: 'night', when: 'Tối', title: 'Chờ đêm xuống', ask: 'Khi đã đi đủ, chuyển sang ban đêm (phím N).', memo: 'Hoa khép cánh. Ngôi sao đầu tiên hiện ra phía bắc.' },
  { id: 'lamp', when: 'Tối', title: 'Tắt đèn lều', ask: 'Mở Tuỳ chỉnh và tắt “Đèn lều” để mắt quen với bóng tối.', memo: 'Vài phút sau, dải Ngân Hà rõ dần như ai vừa lau kính.' },
  { id: 'lie', when: 'Đêm', title: 'Nằm ngắm trời', ask: 'Ngước hẳn lên trời và cứ nhìn như thế một lúc.', memo: 'Cực quang kéo màn ngay trên đầu.' },
  { id: 'star', when: 'Đêm', title: 'Gọi tên một chòm sao', ask: 'Giữ một chòm sao ở giữa khung nhìn vài giây. Bật “Chòm sao” (phím C) nếu cần gợi ý.', memo: 'Nhận ra được một chòm, bầu trời bỗng có địa chỉ.' },
  { id: 'lore', when: 'Đêm', title: 'Nghe chuyện kể', ask: 'Mở Sổ tay (phím J) và đọc chuyện của một chòm sao.', memo: 'Chuyện cũ hàng nghìn năm, kể bên một đống lửa mới.' },
  { id: 'meteor', when: 'Đêm', title: 'Một điều ước', ask: 'Cứ nhìn trời. Sớm muộn sẽ có một vệt sao băng đi qua trước mắt.', memo: 'Nó tắt trước khi kịp nghĩ xong điều ước, nhưng vẫn tính.' },
  { id: 'photo', when: 'Đêm', title: 'Giữ lại một tấm', ask: 'Chọn một góc bạn thích và chụp ảnh (phím P).', memo: 'Một tấm ảnh để mang về.' },
];

// The flower book: stand quietly among a kind of flower by day and it is pressed into the journal.
// `season` is when each one is at its best; the season's signature flower is marked in seasons.js.
export const FLOWERS = [
  { id: 'tulip', season: 'Xuân', name: 'Tulip', latin: 'Tulipa', where: 'Các luống trước trại, mùa xuân', note: 'Sáu cánh khép thành chén; mở ra khi nắng ấm và khép lại lúc chiều tối hay trời lạnh. Mọc từ củ, mỗi củ một hoa.' },
  { id: 'cherry', season: 'Xuân', name: 'Anh đào', latin: 'Prunus', where: 'Ba cây trong vườn, mùa xuân (đứng dưới tán và ngước lên)', note: 'Nở trước khi ra lá và chỉ giữ hoa chừng một hai tuần. Hè lá xanh, thu lá đỏ, đông trơ cành.' },
  { id: 'sunflower', season: 'Hạ', name: 'Hướng dương', latin: 'Helianthus annuus', where: 'Ruộng hoa phía bắc vườn, mùa hạ', note: 'Mỗi “bông” là cả nghìn hoa nhỏ xếp thành hai họ đường xoắn ốc ngược chiều. Cây non quay theo mặt trời; hoa đã nở thì đứng yên, thường hướng về phía đông.' },
  { id: 'lavender', season: 'Hạ', name: 'Oải hương', latin: 'Lavandula', where: 'Các luống trước trại và khối tím phía nam vườn, mùa hạ', note: 'Hoa nhỏ mọc thành bông trên cuống dài. Mùi thơm nằm trong tinh dầu ở đài hoa, nên hoa khô vẫn giữ hương.' },
  { id: 'rose', season: 'Xuân – Thu', name: 'Hoa hồng', latin: 'Rosa', where: 'Vòng hoa quanh cây anh đào giữa vườn', note: 'Mọc thành bụi, mỗi bụi nhiều cành. Hồng vườn có hàng chục cánh xếp xoắn quanh nụ; hồng dại chỉ có năm cánh.' },
  { id: 'daisy', season: 'Thu', name: 'Cúc hoạ mi', latin: 'Leucanthemum', where: 'Các luống trước trại, mùa thu', note: 'Cánh trắng, nhuỵ vàng. Giống hướng dương, mỗi bông là một cụm hoa: vành cánh bên ngoài và đĩa hoa li ti ở giữa.' },
  { id: 'camellia', season: 'Đông', name: 'Hoa trà', latin: 'Camellia japonica', where: 'Vòng hoa giữa vườn, mùa đông', note: 'Nở giữa mùa lạnh, lá dày bóng xanh quanh năm. Hoa không rụng từng cánh mà rụng nguyên bông.' },
];

export class Story {
  constructor() {
    this.done = new Set();
    this.seen = new Set();          // constellations recognised in the sky
    this.flowers = new Set();       // kinds of flower pressed into the book
    this.folded = false;
    this.onPage = () => {};         // (chapter, allDone) when a page is completed
    for (const id of store.get('story.done', [])) if (CHAPTERS.some((c) => c.id === id)) this.done.add(id);
    for (const id of store.get('story.seen', [])) this.seen.add(id);
    for (const id of store.get('story.flowers', [])) if (FLOWERS.some((f) => f.id === id)) this.flowers.add(id);
    this.folded = store.get('story.folded', false);
  }

  save() {
    store.patch('story', { done: this.done, seen: this.seen, flowers: this.flowers, folded: this.folded });
  }

  get total() { return CHAPTERS.length; }
  get count() { return this.done.size; }
  get finished() { return this.done.size >= CHAPTERS.length; }
  /** the first page still open, or null when the day is complete */
  get current() { return CHAPTERS.find((c) => !this.done.has(c.id)) || null; }

  /** mark a page done; safe to call again and again */
  mark(id) {
    if (this.done.has(id)) return false;
    const ch = CHAPTERS.find((c) => c.id === id);
    if (!ch) return false;
    this.done.add(id);
    this.save();
    this.onPage(ch, this.finished);
    return true;
  }

  /** remember a constellation picked out in the sky; true the first time */
  spot(id) {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    this.save();
    return true;
  }

  /** press a kind of flower into the book; returns its entry the first time */
  press(id) {
    if (this.flowers.has(id)) return null;
    const f = FLOWERS.find((x) => x.id === id);
    if (!f) return null;
    this.flowers.add(id);
    this.save();
    return f;
  }

  restart() {
    this.done.clear();
    this.save();
  }
}
