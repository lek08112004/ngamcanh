// "Một ngày ở trại" — a quiet thread to follow through the valley, from waking on the hill
// to a wish under the aurora. Nothing here can be failed or missed: each page is a small
// thing worth doing, they can be done in any order, and the card only ever suggests the
// first one still open. Progress lives in localStorage, like everything else.
const SAVE_KEY = 'aurora-vale-story-v1';

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

export class Story {
  constructor() {
    this.done = new Set();
    this.seen = new Set();          // constellations recognised in the sky
    this.folded = false;
    this.onPage = () => {};         // (chapter, allDone) when a page is completed
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      for (const id of s.done || []) if (CHAPTERS.some((c) => c.id === id)) this.done.add(id);
      for (const id of s.seen || []) this.seen.add(String(id).slice(0, 8));
      this.folded = !!s.folded;
    } catch (e) { /* private mode */ }
  }

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ done: [...this.done], seen: [...this.seen], folded: this.folded })); } catch (e) { /* ignore */ }
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

  restart() {
    this.done.clear();
    this.save();
  }
}
