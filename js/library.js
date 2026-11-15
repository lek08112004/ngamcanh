// The little shelf on the garden bench: seven books.
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

// The legend of the valley: an original tale written for Aurora Vale only (not drawn from, or
// retelling, any real myth). It is told by "the fire-keeper" and opens a page at a time as the
// visitor goes where the tale goes: the beds, the night sky, the weaving, the cabin. Two lines
// are the same threads `THREADS` in lore.js tells (uma ↔ cherry, lyr ↔ lavender), and the last
// page hands the tale over to the visitor's own camp diary. Unlocks read only things that do not
// go backwards (flowers pressed, stars met or woven), plus the cabin rest (chapter or diary line).
function taleBook(c) {
  const met = new Set([...c.seen, ...c.woven]);
  const rested = (c.done && c.done.has('rest')) || c.log.some((x) => x.startsWith('r:'));
  const threads = Object.entries(c.THREADS).filter(([k, t]) => c.pressed.has(t.flower) && met.has(k));
  const consName = (id) => (c.CONS.find((k) => k.id === id) || { name: id }).name;
  const cherry = c.flowerName(c.THREADS.uma.flower).toLowerCase();
  const lavender = c.flowerName(c.THREADS.lyr.flower).toLowerCase();
  const lines = c.log.map(c.logText).filter(([h]) => h);
  const last = lines[lines.length - 1];
  const nThreads = Object.keys(c.THREADS).length;

  const parts = [
    { h: 'Lời người giữ lửa', open: true,
      t: 'Ở trại này có một lệ cũ: ai thêm thanh củi cuối cùng trong ngày thì được gọi là người giữ lửa, và người giữ lửa phải kể tiếp sự tích của thung lũng. Không ai kể hết trong một lần. Mỗi người chỉ kể tới chỗ chính mình đã đi qua: ai chưa xuống luống hoa thì chưa được nghe chuyện hoa, ai chưa thức tới khuya thì chưa được nghe chuyện trời.\n\nTôi chép lại ở đây đúng như đã được nghe. Những trang còn dán kín là những đoạn bạn chưa tới. Cứ ở lại trại, rồi chúng sẽ mở.' },
    { h: 'Vòng núi ngồi quanh lửa', open: true,
      t: 'Thuở chưa có thung lũng, chỗ này là một cao nguyên đá phẳng lì, gió thổi quanh năm không gì cản. Dưới lớp đá, sâu lắm, có một bếp lửa của đất: không ai nhóm, không ai biết nó cháy từ bao giờ. Hơi ấm của nó chỉ đủ làm tan một vòng tuyết tròn trên mặt đá, rộng bằng một cánh đồng.\n\nNhững ngọn núi quanh vùng hồi ấy còn đứng rải rác, mỗi ngọn một nơi, lưng hứng gió. Có một mùa đông dài đến mức không ai nhớ nó bắt đầu từ lúc nào. Từng ngọn một xích lại gần vòng tuyết tan, như người đi đường đêm thấy ánh lửa thì tới ngồi ké. Khi ngọn cuối cùng ngồi xuống, chúng khép thành một vòng kín, vai kề vai, và gió không lọt vào được nữa.\n\nLửa được che gió thì cháy chậm lại và lún sâu dần, kéo mặt đá võng xuống thành một lòng chảo. Thung lũng bạn đang đứng chính là chỗ trũng ấy. Đứng giữa trại mà nhìn quanh, bạn sẽ thấy núi vẫn ngồi thành vòng, không ngọn nào quay lưng vào trong.' },
    { h: 'Con suối và những dải luống', open: c.pressed.size >= 1,
      lock: 'Người giữ lửa chỉ kể đoạn này cho ai đã mang được một cành hoa về lều. Cách mở: đứng lặng giữa một loài hoa đang nở để hái một cành, rồi mang về lều ép vào sổ.',
      t: 'Núi ngồi lâu bên lửa thì ấm vai, và tuyết trên vai núi tan ra. Nước tan không biết đi đâu, chỉ biết tìm về chỗ ấm, nên mọi dòng nước nhỏ trên các sườn đều chảy vào lòng chảo rồi gặp nhau thành một con suối. Đến giờ con suối vẫn chưa chịu chảy thẳng: nó uốn qua uốn lại giữa thung lũng như người đi tìm một chỗ ngồi ấm mà quên mất mình vừa ngồi ở đâu, có quãng còn loang rộng ra, nước gần như đứng lại.\n\nNhững dòng nước đầu tiên chảy xuống từ chỗ trại bây giờ để lại những vệt đất mềm, chạy uốn lượn về phía suối. Đất trong các vệt ấy giữ hơi ấm lâu hơn đất hai bên. Người đến sau không phải đào luống: luống đã có sẵn, chỉ việc gieo theo. Vì thế các luống hoa trước trại không chạy thẳng tắp mà uốn như nước chảy, đầu dưới gần suối thì ẩm, đầu trên gần trại thì khô.' },
    { h: 'Những người canh mùa', open: c.pressed.size >= 3,
      lock: `Đoạn này thuộc về những người đã cúi xuống nhiều loài hoa. Cách mở: ép ba loài hoa vào sổ (đã ép ${Math.min(c.pressed.size, 3)}/3).`,
      t: `Người đầu tiên ở lại thung lũng là một người đàn bà đi bán hạt giống, ai cũng gọi là bà Hạt. Bà dừng chân vì thấy giữa mùa đông mà đất ở đây vẫn ấm tay. Bà bảo đất này còn nhớ ngọn lửa cũ nên mùa nào cũng muốn thức, nhưng nó không biết thức một mình: hoa nở cả một lượt rồi tàn cả một lượt, để lại một mùa trơ trụi.\n\nBà Hạt chia hạt trong túi ra làm bốn phần, như người ta chia nhau canh một đêm dài bên lửa. Phần đầu bà gieo cho mùa xuân: tulip, thuỷ tiên, lan dạ hương. Phần thứ hai cho mùa hạ: oải hương, anh túc, hoa cánh bướm. Phần thứ ba cho mùa thu: cúc vàng, cúc hoạ mi. Phần cuối, ít hạt nhất, cho mùa đông: hoa trà, thạch nam và giọt tuyết, những loài chịu thức trong giá. Loài này đi ngủ thì loài kia dậy thay, nên chưa mùa nào thung lũng phải để trống.\n\nBa cây ${cherry} giữa vườn cũng do bà trồng, vào đúng buổi chập tối cán gáo Bắc Đẩu chỉ về phương đông. Bà bảo một cái đồng hồ của mùa xuân đã treo trên trời thì cũng nên có một cái nở trên cành.\n\nSổ hoa của bà Vân, người giữ vườn bây giờ, hôm nay đã có ${c.pressed.size} loài.` },
    { h: 'Hơi thở của đất', open: met.size >= 1,
      lock: 'Đoạn này chỉ được kể khi đã khuya. Cách mở: ở lại tới đêm và nhận ra một chòm sao (giữ nó giữa khung nhìn vài giây; phím C để có gợi ý).',
      t: 'Bếp lửa dưới đất đến giờ vẫn chưa tắt hẳn. Ban ngày hơi ấm của nó đi vào rễ hoa. Ban đêm, khi thung lũng lạnh xuống, nó thoát lên trời, như hơi thở thành khói trắng trong một sáng giá rét. Đó là cực quang: không phải lửa trên trời, mà là đất thở ra. Đêm nào cực quang xanh, người ta bảo đất đang ngủ yên; đêm nào nó ửng hồng là đất đang nhớ ngọn lửa ngày xưa.\n\nNhưng hơi thở ấy cũng có cái hại nhỏ của nó. Màn sáng lay qua lay lại mãi trên đầu, lâu ngày làm các chòm sao trên thung lũng lỏng dần ra, như những mũi khâu bị gió giật. Người trong thung lũng nhìn lên vẫn thấy sao, nhưng không còn chỉ ra được đâu là chiếc gáo, đâu là chiếc ngai, đâu là cây đàn.' },
    { h: 'Ông Kim và mũi khâu đầu tiên', open: c.woven.size >= 1,
      lock: 'Đoạn này người giữ lửa để dành cho ai đã tự tay khâu lại bầu trời. Cách mở: chuyển sang “Trò dệt sao” (phím M) và dệt trọn một chòm.',
      t: `Người khâu lại bầu trời là một ông thợ may đi ngang thung lũng. Tên thật của ông không ai nhớ, chỉ nhớ ông lúc nào cũng cài một cây kim trên ve áo, nên gọi là ông Kim. Ông ngồi bên lửa ba đêm liền nhìn lên, rồi bảo: sao không mất, chỉ là đường chỉ đã sờn. Khâu lại là được.\n\nÔng xin bà Hạt một cọng ${lavender} khô làm kim, vì nó thẳng, nhẹ và thơm, rồi đợi một đêm giữa hè, lúc ngôi sao trắng xanh sáng nhất đứng gần đỉnh đầu, để khâu chòm đầu tiên: cây đàn nhỏ hình bình hành nằm ngay dưới ngôi sao ấy. Người thung lũng bảo vì thế mà đến giờ Vega vẫn lên gần đỉnh đầu đúng vào những tối ${lavender} nở tím: kim với chỉ không nỡ xa nhau.\n\nMỗi khi khâu xong một chòm, ông thắt một cái nút ở đầu sợi chỉ cho khỏi tuột. Cái nút ấy sáng lên thành một ngôi sao nhỏ ngay phía trên chòm vừa khâu, và sáng mãi. Ông Kim để lại một câu mà người giữ lửa nào cũng nhắc: mỗi chòm sao được dệt trọn, thung lũng nhớ thêm được một mùa.\n\nTrên trời trại bây giờ có ${c.woven.size} cái nút như thế, mỗi nút là một chòm chính tay bạn dệt.` },
    { h: 'Căn nhà gỗ và cuốn sổ trên bàn', open: rested,
      lock: 'Đoạn này kể trong nhà, cạnh bếp sưởi. Cách mở: tới hiên nhà gỗ và vào nhà nghỉ (phím E).',
      t: 'Bà Hạt và ông Kim ở lại không phải vì nhau, chỉ vì cả hai cùng không muốn rời thung lũng. Ông Kim dựng căn nhà gỗ từ những thân cây đổ sau một trận tuyết, đẽo khấc ở bốn góc cho các khúc gỗ cài vào nhau, không cần một cái đinh. Bà Hạt đóng chiếc ghế dưới gốc anh đào và treo một ngọn đèn lồng trên cây cột bên cạnh, để ai đọc sách tới chập tối cũng không phải đứng dậy.\n\nVòng đá quanh đống lửa trại là hai người xếp chung, từng hòn một, theo đúng hình vòng núi: một thung lũng nhỏ cho một ngọn lửa nhỏ. Trên bàn trong nhà, ông Kim để sẵn một cuốn sổ mở và một cây bút, kèm một lời dặn: ai ngủ lại một đêm thì viết một dòng, và không ai được viết trang cuối.' },
    { h: 'Sợi chỉ giữa đất và trời', open: threads.length >= 1,
      lock: 'Đoạn này chỉ ai lần ra được một sợi chỉ mới nghe. Cách mở: ép một loài hoa, rồi nhận ra (hoặc dệt) chòm sao nối với nó. Sổ tay (J) chỉ đường cho từng chòm.',
      t: `Ông Kim khâu sao, bà Hạt gieo hoa, và hai người hay ngồi bên lửa cãi nhau xem loài hoa nào hợp với chòm sao nào. Cuối cùng họ thống nhất: chòm nào trên trời cũng phải có một loài dưới đất cùng thức với nó, để khi bên này quên thì bên kia nhắc. Người giữ lửa nói có ${['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'][nThreads] || nThreads} sợi chỉ như thế. Không ai nhìn thấy chúng; chỉ người vừa ép một loài hoa vừa tìm ra chòm sao của nó mới lần ra được.\n\nBạn đã lần ra ${threads.length}/${nThreads}: ${threads.map(([k, t]) => `${c.flowerName(t.flower).toLowerCase()} với chòm ${consName(k)}`).join('; ')}.` },
  ];
  const ended = parts.every((p) => p.open);
  parts.push({ h: 'Trang chưa ai viết', open: ended,
    lock: `Trang cuối chỉ được kể khi mọi trang trước đã mở (còn ${parts.filter((p) => !p.open).length} trang).`,
    t: `Cuốn sổ của ông Kim kín chữ từ lâu, rồi một cuốn nữa, rồi nhiều cuốn nữa. Không ai biết chúng giờ ở đâu; người ta chỉ biết lời dặn vẫn còn: ai ở lại trại thì viết tiếp, và không ai viết trang cuối.\n\nCuốn “Nhật ký trại” trên giá sách này là cuốn đang viết dở. Nó đã có ${lines.length} dòng của bạn.${last ? ` Dòng gần nhất ghi: “${last[0]}. ${last[1].replace(/\.$/, '')}.”` : ''}\n\nNgười giữ lửa bây giờ là bạn. Tối nay, lúc thêm thanh củi cuối cùng, nếu có ai ngồi cạnh, hãy kể cho họ tới đúng chỗ bạn đã đi qua, phần còn lại để họ tự tìm. Sự tích này chưa có đoạn kết, vì thung lũng vẫn còn đang nhớ.` });
  return parts.map((p) => (p.open ? { h: p.h, t: p.t } : { h: `${p.h} (chưa mở)`, t: p.lock }));
}

const VALE = [
  { id: 'legend', kind: 'vale', color: '#4a3a6a', ink: '#efe8fa', h: 0.92, title: 'Sự tích thung lũng Aurora', author: 'Những người giữ lửa', src: 'Sách của thế giới Aurora Vale: một truyền thuyết viết riêng cho thung lũng này, không dựa trên thần thoại có thật nào. Người kể là nhân vật trong truyện.', build: taleBook },
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
