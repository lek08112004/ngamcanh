// The little shelf on the garden bench: six books.
//
// Three kinds, kept apart on purpose (the owner set the rules):
//  - classic: the author died long ago and the text is in the public domain. The quotation is
//    the original wording, copied from the Project Gutenberg edition named in `src` (checked
//    word for word when it was added). The Vietnamese under it is a free rendering written for
//    this site ("chuyển ý"), not a published translation.
//  - notes: books still under copyright. Only the real title and author are named; the page is
//    a reading note in the voice of a fictional camp guest. Never copy, translate or summarise
//    such a book here.
//  - vale: books of the Aurora Vale world, written for the site, by people who live in the
//    story. They grow from what the visitor has done (flowers pressed, stars found, the diary).
//
// A page is { h: heading, t: text, q?: original quotation, ref?: where the quotation is from }.

const WALDEN = {
  id: 'walden', kind: 'classic', color: '#3f5a3a', ink: '#efe6cf', h: 1.0,
  title: 'Walden', author: 'Henry David Thoreau',
  src: 'Walden (1854). Nguyên văn theo bản Project Gutenberg, eBook #205.',
  pages: [
    { h: 'Về cuốn sách', t: 'Henry David Thoreau (1817–1862) dựng một căn nhà gỗ nhỏ bên hồ Walden, bang Massachusetts, và sống ở đó hai năm hai tháng, từ mùa hè năm 1845. Cuốn sách kể lại những ngày ấy được in năm 1854. Tác giả mất đã hơn một trăm sáu mươi năm, nên văn bản thuộc phạm vi công cộng.\n\nMỗi trang dưới đây chép nguyên văn tiếng Anh, kèm một đoạn chuyển ý tiếng Việt do người chép sổ viết lại. Đó không phải bản dịch chính thức.' },
    { h: 'Vì sao vào rừng', ref: 'Chương “Where I Lived, and What I Lived For”',
      q: 'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.',
      t: 'Tôi vào rừng vì muốn sống cho có chủ ý: chỉ đối mặt với những điều cốt yếu của đời sống, xem mình có học được điều nó dạy hay không, để đến lúc sắp chết không phải nhận ra rằng mình chưa từng sống.' },
    { h: 'Câu cá trên trời', ref: 'Chương “Where I Lived, and What I Lived For”',
      q: 'Time is but the stream I go a-fishing in. I drink at it; but while I drink I see the sandy bottom and detect how shallow it is. Its thin current slides away, but eternity remains. I would drink deeper; fish in the sky, whose bottom is pebbly with stars.',
      t: 'Thời gian chỉ là con suối tôi ra ngồi câu. Tôi uống nước ở đó; nhưng trong lúc uống, tôi thấy đáy cát và biết nó nông đến đâu. Dòng nước mỏng trôi đi, còn vĩnh hằng thì ở lại. Tôi muốn uống sâu hơn nữa: thả câu trên bầu trời, nơi lòng suối lát sỏi bằng những vì sao.' },
    { h: 'Một mình', ref: 'Chương “Solitude”',
      q: 'I love to be alone. I never found the companion that was so companionable as solitude.',
      t: 'Tôi thích ở một mình. Tôi chưa từng gặp người bạn đồng hành nào dễ chịu bằng sự cô tịch.' },
    { h: 'Ba chiếc ghế', ref: 'Chương “Visitors”',
      q: 'I had three chairs in my house; one for solitude, two for friendship, three for society.',
      t: 'Nhà tôi có ba chiếc ghế: một cho lúc một mình, hai cho tình bạn, ba cho chuyện trò đông người.' },
    { h: 'Con mắt của đất', ref: 'Chương “The Ponds”',
      q: 'A lake is the landscape’s most beautiful and expressive feature. It is earth’s eye; looking into which the beholder measures the depth of his own nature.',
      t: 'Hồ nước là nét đẹp nhất và có hồn nhất của một vùng đất. Nó là con mắt của đất; nhìn vào đó, người ta đo được độ sâu của chính lòng mình.' },
    { h: 'Thiên đường dưới chân', ref: 'Chương “The Pond in Winter”',
      q: 'Heaven is under our feet as well as over our heads.',
      t: 'Thiên đường ở dưới chân ta, cũng như ở trên đầu ta.' },
    { h: 'Liều thuốc hoang dã', ref: 'Chương “Spring”',
      q: 'We need the tonic of wildness,—to wade sometimes in marshes where the bittern and the meadow-hen lurk, and hear the booming of the snipe; […] We can never have enough of Nature.',
      t: 'Ta cần liều thuốc bổ của sự hoang dã: thỉnh thoảng lội qua những đầm lầy nơi cò lửa và gà nước ẩn mình, nghe tiếng chim dẽ giun rền vang; […] Thiên nhiên thì bao nhiêu cũng không bao giờ là đủ.' },
  ],
};

const MEDITATIONS = {
  id: 'meditations', kind: 'classic', color: '#6b3a2c', ink: '#f2e2c4', h: 0.9,
  title: 'Suy tưởng', author: 'Marcus Aurelius',
  src: 'Meditations, bản tiếng Anh của George Long (1862). Nguyên văn theo bản Project Gutenberg, eBook #15877.',
  pages: [
    { h: 'Về cuốn sách', t: 'Marcus Aurelius (121–180) là hoàng đế La Mã. Ông viết những ghi chép này bằng tiếng Hy Lạp, cho riêng mình, phần lớn trong những năm cầm quân ở biên giới sông Danube, và chưa bao giờ định in ra.\n\nNguyên văn dưới đây là bản tiếng Anh của George Long (1800–1879), in năm 1862, đã thuộc phạm vi công cộng. Số ghi ở mỗi trang là quyển và đoạn. Phần tiếng Việt là chuyển ý của người chép sổ, không phải bản dịch chính thức.' },
    { h: 'Nơi ẩn cư', ref: 'Quyển IV, đoạn 3',
      q: 'Men seek retreats for themselves, houses in the country, sea-shores, and mountains; and thou too art wont to desire such things very much. But this is altogether a mark of the most common sort of men, for it is in thy power whenever thou shalt choose to retire into thyself. For nowhere either with more quiet or more freedom from trouble does a man retire than into his own soul […]',
      t: 'Người ta tìm chốn ẩn cư cho mình: nhà ở thôn quê, bờ biển, núi non; và chính ngươi cũng hay ao ước những thứ ấy. Nhưng đó là thói thường của người đời, bởi lúc nào muốn, ngươi cũng có thể lui vào bên trong chính mình. Không nơi nào người ta lui về mà yên tĩnh và thảnh thơi hơn là tâm hồn mình […]' },
    { h: 'Dòng sông thời gian', ref: 'Quyển IV, đoạn 43',
      q: 'Time is like a river made up of the events which happen, and a violent stream; for as soon as a thing has been seen, it is carried away, and another comes in its place, and this will be carried away too.',
      t: 'Thời gian như một dòng sông làm bằng những sự việc xảy ra, và là một dòng chảy xiết: một điều vừa hiện ra đã bị cuốn đi, điều khác đến thế chỗ, rồi điều ấy cũng sẽ bị cuốn đi.' },
    { h: 'Đi cùng các vì sao', ref: 'Quyển VII, đoạn 47',
      q: 'Look round at the courses of the stars, as if thou wert going along with them; and constantly consider the changes of the elements into one another, for such thoughts purge away the filth of the terrene life.',
      t: 'Hãy ngắm đường đi của các vì sao như thể ngươi đang đi cùng chúng; và luôn nghĩ đến cách các nguyên tố biến đổi vào nhau, vì những ý nghĩ ấy gột sạch bụi bặm của đời sống trần gian.' },
    { h: 'Nhìn vào trong', ref: 'Quyển VII, đoạn 59',
      q: 'Look within. Within is the fountain of good, and it will ever bubble up, if thou wilt ever dig.',
      t: 'Hãy nhìn vào bên trong. Bên trong là mạch nguồn của điều tốt, và nó sẽ còn tuôn mãi, nếu ngươi còn chịu đào.' },
  ],
};

const NOTES = {
  id: 'notes', kind: 'notes', color: '#2f4a66', ink: '#e8eef4', h: 0.82,
  title: 'Ghi chú bên lửa trại', author: 'H., một người khách cũ của trại',
  src: 'Sổ tay của một nhân vật hư cấu. Các cuốn sách nhắc tới là sách thật, còn bản quyền: sổ chỉ ghi tên sách, tác giả và cảm nghĩ riêng của người đọc, không chép hay tóm tắt nội dung.',
  pages: [
    { h: 'Trang đầu', t: 'Tôi ở trại ba tuần cuối mùa hạ, mang theo một ba lô sách mà phần lớn chẳng đọc hết. Đây là mấy dòng tôi ghi lại mỗi tối bên đống lửa: không phải nhận xét sách, chỉ là những gì đọng lại trong tôi lúc gấp sách vào. Ai muốn biết sách nói gì thì hãy tìm đọc chính cuốn sách.\n\nH.' },
    { h: '“Tư duy nhanh và chậm” · Daniel Kahneman', t: 'Đọc dở cuốn này vào một chiều mưa, tôi ra hiên xem trời đã tạnh chưa và bắt gặp mình đang chắc mẩm tối nay mây sẽ kín, chỉ vì cả buổi sáng mây kín. Rồi mây tan, trời đêm ấy trong veo. Từ hôm đó, trước khi kết luận điều gì về trời, tôi tập đếm lại xem mình đã thật sự nhìn thấy những gì, và đoán bừa những gì.' },
    { h: '“Cosmos” · Carl Sagan', t: 'Mang cuốn này lên trại là một sai lầm dễ chịu: cứ đọc được vài trang tôi lại phải đặt xuống, ra ngoài ngửa cổ nhìn trời. Tôi không nhớ được mấy con số. Tôi chỉ nhớ cảm giác người viết mê bầu trời thật lòng, và cái mê ấy lây sang người đọc như hơi ấm từ đống lửa.' },
    { h: '“Lược sử thời gian” · Stephen Hawking', t: 'Có những chương tôi đọc hai lần vẫn chưa hiểu, và tôi để yên như vậy. Đêm đó nằm trên đồi, nhìn dải Ngân Hà vắt qua đầu, tôi nghĩ không hiểu hết cũng chẳng sao, miễn là vẫn còn muốn hỏi. Cuốn sách nằm trong ba lô suốt chuyến đi, gáy sờn vì bị lôi ra quá nhiều lần.' },
    { h: '“Mùa xuân im lặng” · Rachel Carson', t: 'Đọc xong cuốn này, sáng hôm sau tôi dậy thật sớm chỉ để nghe chim. Tiếng hót trong thung lũng dày đến mức trước giờ tôi chưa từng nghĩ nó có thể vắng đi. Tôi ghi tên năm loài mình nhận ra và kẹp tờ giấy vào cuối sổ, như kẹp một bông hoa ép.' },
    { h: 'Trang cuối', t: 'Sáng mai tôi xuống núi. Cuốn sổ này để lại trên ghế, ai ngồi đây thì cứ viết tiếp. Một cuốn sách hay không bắt người ta đọc nhanh hơn, mà khiến người ta muốn ngồi lâu hơn.' },
  ],
};

/* ---------- the books of the valley itself: they grow with what the visitor has done ---------- */
function flowerBook(c) {
  const pages = [{ h: 'Lời bà Vân', t: 'Tôi giữ khu vườn này đã nhiều năm. Mỗi mùa tôi ép một cành của từng loài vào cuốn sổ, kẹp giữa hai tờ giấy thấm, rồi viết bên cạnh những gì tôi biết về nó: nó từ đâu tới, người ta đã yêu nó, buôn nó, đặt tên cho nó ra sao.\n\nNhững trang còn trống là để dành cho bạn. Hái một cành ngoài luống, mang về lều ép vào sổ, trang của nó sẽ hiện ra.' }];
  const missing = [];
  for (const f of c.FLOWERS) {
    if (c.pressed.has(f.id)) {
      pages.push({ h: `${f.name}`, t: `${f.latin ? `${f.latin}. ` : ''}${f.note}` });
      f.tales.forEach((t, k) => pages.push({ h: `${f.name} · chuyện ${k + 1}/${f.tales.length}`, t }));
    } else if (c.inSeason.includes(f)) {
      pages.push({ h: `${f.name} (chưa ép)`, t: `${f.note}\n\nĐang nở: ${f.where.toLowerCase()}. Hái một cành rồi mang về lều ép vào sổ, chuyện của nó sẽ hiện ở trang này.` });
    } else missing.push(`${f.name.toLowerCase()} (mùa ${f.season.toLowerCase()})`);
  }
  if (missing.length) pages.push({ h: 'Những trang còn trống', t: `Còn chờ những mùa khác: ${missing.join(', ')}. Ở thung lũng này, mùa nào cũng có hoa để ép.` });
  pages.push({ h: 'Trang cuối của bà Vân', t: 'Hoa ép mất màu dần, năm này qua năm khác, cánh đỏ thành nâu, cánh tím thành xám. Tôi không tiếc. Cái còn lại trong sổ không phải màu hoa, mà là buổi sáng mình đã cúi xuống hái nó.' });
  return pages;
}

function skyBook(c) {
  const pages = [{ h: 'Lời ông Khải', t: 'Tôi gác trời ở thung lũng này: đêm nào trời trong thì ngồi bên đống lửa, ghi lại chòm sao nào đã lên, sao nào sáng hơn đêm trước. Người ta hỏi tôi gác trời để làm gì. Tôi bảo trời không cần ai gác, chỉ là tôi cần nhìn lên.\n\nMỗi chòm bạn nhận ra hay tự tay dệt sẽ có trang của nó. Những chòm chưa gặp, tôi chỉ đường cho bạn tìm.' }];
  for (const k of c.CONS) {
    const L = c.LORE[k.id];
    const met = c.seen.has(k.id) || c.woven.has(k.id);
    if (!met) { pages.push({ h: `${k.name} (chưa gặp)`, t: `${L.season}.\n\nCách tìm: ${L.find}` }); continue; }
    for (const t of L.tale || []) pages.push({ h: `Chòm ${k.name}`, t });
    const th = c.THREADS[k.id];
    if (th && c.pressed.has(th.flower)) pages.push({ h: `Sợi chỉ: ${c.flowerName(th.flower)} ↔ ${k.name}`, t: th.text });
    else if (th) pages.push({ h: `Sợi chỉ còn thiếu`, t: `Chòm ${k.name} có một sợi chỉ nối xuống một loài hoa trong vườn. Ép được loài hoa ấy, trang này sẽ viết tiếp.` });
    if (c.woven.has(k.id)) pages.push({ h: `Chòm ${k.name} · điều chỉ người dệt mới biết`, t: L.deep });
  }
  pages.push({ h: 'Trang cuối của ông Khải', t: 'Ánh sao bạn thấy đêm nay đã rời ngôi sao từ trước khi bạn sinh ra, có khi từ trước khi có người đứng nhìn. Vậy mà nó vẫn tới đúng lúc bạn ngẩng lên. Tôi gọi đó là một cuộc hẹn.' });
  return pages;
}

function diaryBook(c) {
  const pages = [];
  const lines = c.log.map(c.logText).filter(([h]) => h);
  if (!lines.length) {
    pages.push({ h: 'Trang đầu', t: 'Cuốn nhật ký này còn trắng. Nó tự viết theo những gì bạn làm ở trại: nhóm lại lửa, ép một cành hoa, dệt xong một chòm sao, ngồi đọc sách dưới gốc anh đào, đi trọn một ngày. Quay lại đây sau, sẽ có trang để đọc.' });
    return pages;
  }
  pages.push({ h: 'Trang đầu', t: `Nhật ký trại của bạn: ${lines.length} dòng, ghi theo thứ tự từ ngày đầu tới hôm nay.` });
  for (let i = 0; i < lines.length; i += 4) {
    const chunk = lines.slice(i, i + 4);
    pages.push({ h: `Nhật ký · ${i + 1}–${i + chunk.length}`, t: chunk.map(([h, t]) => `${h}. ${t}`).join('\n\n') });
  }
  return pages;
}

const VALE = [
  { id: 'flowers', kind: 'vale', color: '#8a4a5e', ink: '#f6e6ea', h: 0.95, title: 'Sổ hoa của thung lũng', author: 'Bà Vân, người giữ vườn', src: 'Sách của thế giới Aurora Vale; người viết là nhân vật trong truyện.', build: flowerBook },
  { id: 'sky', kind: 'vale', color: '#1f2b4a', ink: '#e6e4f6', h: 1.04, title: 'Trời đêm Aurora Vale', author: 'Ông Khải, người gác trời', src: 'Sách của thế giới Aurora Vale; người viết là nhân vật trong truyện.', build: skyBook },
  { id: 'diary', kind: 'vale', color: '#7a6438', ink: '#f6eedc', h: 0.78, title: 'Nhật ký trại', author: 'Bạn', src: 'Tự viết theo những gì bạn làm ở trại.', build: diaryBook },
];

export const SHELF = [WALDEN, MEDITATIONS, NOTES, ...VALE];

/** the pages of one book, given what the visitor has done (see main.js for `ctx`) */
export function pagesOf(book, ctx) {
  const pages = book.build ? book.build(ctx) : book.pages;
  return pages.length ? pages : [{ h: 'Trang trắng', t: 'Cuốn sách này chưa có trang nào.' }];
}
