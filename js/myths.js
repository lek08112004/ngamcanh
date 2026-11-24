// Two story lines for the star game, from Greek myth. Each chapter weaves one constellation.
// "Chuyện kể" (tale) is the myth, retold gently for a campfire, with the variant chosen named;
// "Bầu trời thật" (sky) is astronomy and never mixed into the tale. Not every constellation of the
// game is forced into a Greek story: Bắc Đẩu, Thiên Nga, Thiên Cầm and Sư Tử keep their own pages.
//
// Sources for the tales (classical texts, in translation): Apollodorus, Library 2.4.3; Ovid,
// Metamorphoses 4.663-5.249 and Fasti 5.493-544; pseudo-Eratosthenes, Catasterisms 15-17, 22, 32,
// 36; Hyginus, De Astronomia 2.9-2.12, 2.26, 2.34; Aratus, Phaenomena 634-646. Our retelling, not a
// translation. Sky facts: the figures used elsewhere in the game (astro.js, skyinfo.js) and the
// Wikipedia pages named in `src`.
const W = (t) => `https://en.wikipedia.org/wiki/${t}`;
export const MYTH_LINES = [
  {
    id: 'perseus', vi: 'Perseus và Andromeda',
    lead: 'Năm chòm sao nằm cạnh nhau quanh phía bắc bầu trời kể cùng một câu chuyện: một hoàng hậu kiêu ngạo, một vị vua bối rối, một con quái biển, một nàng công chúa và một chàng trai trở về từ chuyến đi xa.',
    variant: 'Theo bản của Apollodorus (Thư viện 2.4.3), có đối chiếu Ovid (Biến hình, quyển 4–5). Các bản khác nhau ở chi tiết: Ovid kể Perseus hạ quái vật bằng gươm.',
    src: [['Apollodorus, Library 2.4.3 (bản dịch Frazer, Theoi.com)', 'https://www.theoi.com/Text/Apollodorus2.html'], ['Ovid, Metamorphoses 4.663–5.249', 'https://www.theoi.com/Text/OvidMetamorphoses4.html'], ['Hyginus, De Astronomia 2.9–2.12', 'https://www.theoi.com/Text/HyginusAstronomica2.html']],
    chapters: [
      {
        cons: 'cas', title: 'Lời khoe của hoàng hậu', emblem: 'throne',
        lead: 'Cassiopeia, hoàng hậu xứ Aethiopia, nói rằng nàng còn đẹp hơn tất cả các Nereid, những nàng tiên biển.',
        tale: ['Cassiopeia là vợ vua Cepheus. Một ngày nàng tuyên bố mình đẹp hơn mọi Nereid, các con gái của thần biển Nereus. Các Nereid giận dữ, và Poseidon, chúa tể biển cả, đứng về phía họ.', 'Theo Hyginus, khi được đặt lên trời, Cassiopeia ngồi trên ngai, và vì lời khoe ấy mà khi bầu trời quay, có lúc nàng phải chúc đầu xuống.'],
        sky: ['Chữ W nằm đối diện Bắc Đẩu qua sao Bắc Cực. Từ vĩ độ 68° của thung lũng, Thiên Hậu không bao giờ lặn: suốt đêm nó xoay quanh cực, khi thì ngửa chữ M, khi thì chữ W, đúng như lời Hyginus.'],
        skysrc: [['Wikipedia: Cassiopeia (constellation)', W('Cassiopeia_(constellation)')]],
      },
      {
        cons: 'cep', title: 'Lời sấm của nhà vua', emblem: 'crown',
        lead: 'Biển dâng lên và một con quái vật xuất hiện. Vua Cepheus đi hỏi lời sấm.',
        tale: ['Poseidon dâng lũ tràn vào xứ sở và thả một con quái biển. Lời sấm của thần Ammon nói tai hoạ chỉ dứt nếu công chúa Andromeda bị dâng cho quái vật.', 'Bị dân chúng ép, Cepheus đành để con gái bị xích vào một mỏm đá ngoài bờ biển.'],
        sky: ['Hình ngôi nhà mái nhọn cạnh Thiên Hậu, cũng không bao giờ lặn ở thung lũng. Trong chòm này có δ Cephei, ngôi sao sáng lên tối đi đều đặn chừng 5 ngày 9 giờ; các sao "Cepheid" cùng kiểu đã trở thành thước đo khoảng cách tới các thiên hà.'],
        skysrc: [['Wikipedia: Delta Cephei', W('Delta_Cephei')], ['Wikipedia: Cepheid variable', W('Cepheid_variable')]],
      },
      {
        cons: 'cet', title: 'Con quái biển', emblem: 'wave',
        lead: 'Từ biển sâu, Ketos, con quái do Poseidon sai đến, bơi về phía mỏm đá.',
        tale: ['Người Hy Lạp gọi nó là Ketos (từ đó có tên chòm Cetus). Các bản kể không tả nó giống loài vật nào; tranh cổ thường vẽ một con rắn biển có đầu thú.'],
        sky: ['Kình Ngư là một chòm lớn nhưng mờ, nằm thấp ở phía nam. Từ 68°B, Diphda ở đuôi nó chỉ lên cao chừng 4° trên đường chân trời.', 'Trong chòm có Mira, "ngôi sao kỳ diệu": độ sáng thay đổi từ cấp 2 (dễ thấy) tới cấp 10 (phải dùng kính) trong chừng 11 tháng.'],
        skysrc: [['Wikipedia: Mira', W('Mira')], ['Wikipedia: Cetus', W('Cetus')]],
      },
      {
        cons: 'and', title: 'Nàng công chúa trên mỏm đá', emblem: 'chain',
        lead: 'Andromeda bị xích vào đá, nhìn ra biển chờ con quái.',
        tale: ['Ovid tả nàng đứng bất động đến mức nếu không có làn gió lay tóc và giọt nước mắt, người ta tưởng đó là một pho tượng.', 'Đúng lúc ấy, có người bay ngang qua bầu trời bằng đôi dép có cánh.'],
        sky: ['Hai dải sao toả ra từ Alpheratz, ngôi sao ở góc "hình vuông Pegasus". Cạnh Mirach là đốm mờ của thiên hà Andromeda (M31), cách khoảng 2,5 triệu năm ánh sáng: một trong những vật xa nhất mắt thường còn thấy được, vào đêm không trăng.'],
        skysrc: [['Wikipedia: Andromeda Galaxy', W('Andromeda_Galaxy')]],
      },
      {
        cons: 'per', title: 'Perseus trở về', emblem: 'sandal',
        lead: 'Perseus, vừa hoàn thành chuyến đi tìm Medusa, thấy Andromeda và hứa với nhà vua sẽ giải thoát nàng.',
        tale: ['Perseus xin Cepheus gả Andromeda cho mình nếu chàng hạ được quái vật. Chàng lao xuống, đánh bại con quái và cởi xích cho nàng (theo Ovid, bằng thanh gươm cong; có bản khác kể con quái hoá đá khi thấy đầu Medusa).', 'Theo các sách về chòm sao thời cổ, nữ thần Athena đặt cả gia đình lên trời để nhớ chiến công ấy: Cepheus, Cassiopeia, Andromeda, Perseus, và cả con quái biển.'],
        sky: ['Algol (β Persei) là "con mắt" trên chiếc đầu Perseus cầm theo. Tên Ả Rập của nó nghĩa là "đầu quỷ". Cứ 2 ngày 21 giờ nó lại tối đi vài giờ, vì một ngôi sao mờ hơn đi ngang qua trước nó.', 'Mỗi tháng Tám, mưa sao băng Anh Tiên (Perseid) trông như toả ra từ chòm này; đó là bụi của sao chổi Swift–Tuttle.'],
        skysrc: [['Wikipedia: Algol', W('Algol')], ['Wikipedia: Perseids', W('Perseids')]],
      },
    ],
    ending: 'Năm chòm sao của câu chuyện nằm gần nhau trên trời bắc. Ở thung lũng này, bốn chòm quay quanh cực suốt đêm; chỉ con quái biển là phải lẩn thấp ở phía nam.',
  },
  {
    id: 'orion', vi: 'Orion và Bọ Cạp',
    lead: 'Một người thợ săn khổng lồ, một lời khoe, và một con bọ cạp nhỏ. Hai chòm sao không bao giờ cùng ở trên trời.',
    variant: 'Theo bản của pseudo-Eratosthenes và Hyginus: Orion khoe sẽ giết hết muông thú, Đất Mẹ (Gaia) sai bọ cạp đến. Ovid (Lịch lễ hội 5) kể khác: Orion chết khi che chở nữ thần Leto. Aratus kể bọ cạp do nữ thần Artemis sai đến.',
    src: [['Hyginus, De Astronomia 2.26, 2.34', 'https://www.theoi.com/Text/HyginusAstronomica2.html'], ['Ovid, Fasti 5.493–544', 'https://www.theoi.com/Text/OvidFasti5.html'], ['Aratus, Phaenomena 634–646', 'https://www.theoi.com/Text/AratusPhaenomena.html']],
    chapters: [
      {
        cons: 'ori', title: 'Người thợ săn', emblem: 'bow',
        lead: 'Orion là người thợ săn to lớn nhất. Một hôm chàng khoe rằng không loài vật nào trên mặt đất thoát được tay mình.',
        tale: ['Orion đi săn cùng nữ thần săn bắn Artemis và mẹ nàng là Leto. Theo Hyginus, chàng khoe sẽ giết sạch mọi loài thú trên mặt đất.', 'Đất Mẹ nghe thấy và nổi giận: nếu không còn muông thú, đất cũng chẳng còn sự sống.'],
        sky: ['Betelgeuse đỏ cam ở vai và Rigel trắng xanh ở chân là hai ngôi sao khổng lồ ở rất xa nhau; ba sao thắt lưng chỉ trùng hướng nhìn. Dưới thắt lưng là tinh vân Lạp Hộ (M42), cách khoảng 1.270 năm ánh sáng, nơi sao đang hình thành.', 'Từ 68°B, Orion chỉ lên thấp ở phía nam vào những đêm mùa đông.'],
        skysrc: [['Wikipedia: Orion (constellation)', W('Orion_(constellation)')], ['Wikipedia: Orion Nebula', W('Orion_Nebula')]],
      },
      {
        cons: 'sco', title: 'Con bọ cạp', emblem: 'sting',
        lead: 'Một con bọ cạp nhỏ bò ra từ lòng đất.',
        tale: ['Con bọ cạp do Đất Mẹ sai đến đã chích Orion. Zeus đặt cả hai lên trời: người thợ săn để nhớ tài năng, con bọ cạp để nhắc rằng không ai nên khoe khoang như thế.', 'Người ta kể rằng họ được đặt ở hai đầu bầu trời, nên khi Bọ Cạp mọc lên thì Orion lặn xuống, như vẫn còn chạy trốn.'],
        sky: ['Orion (xích kinh khoảng 5,5 giờ) và Bọ Cạp (khoảng 16,5 giờ) cách nhau gần nửa vòng trời, nên đúng là hiếm khi cùng thấy.', 'Ở thung lũng này (68,4°B), Antares, trái tim đỏ của Bọ Cạp (xích vĩ −26,4°), không bao giờ mọc lên khỏi chân trời: một vật phải có xích vĩ trên khoảng −21,6° mới mọc được ở đây. Ở Aurora Vale, Orion được yên. Trong trò dệt sao, hình Bọ Cạp chỉ là hình xếp minh hoạ.'],
        skysrc: [['Wikipedia: Antares', W('Antares')], ['Wikipedia: Scorpius', W('Scorpius')]],
      },
    ],
    ending: 'Câu chuyện kết thúc bằng hai chòm sao ở hai phía bầu trời. Ở phương Bắc này, chỉ có một trong hai lên được trên trời.',
  },
];
export const mythLine = (id) => MYTH_LINES.find((l) => l.id === id);
