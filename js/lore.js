// Sổ tay thiên văn: nguồn gốc, các ngôi sao đáng chú ý và cách tìm từng chòm sao.
// Khoảng cách là số làm tròn theo các đo đạc hiện nay; với sao siêu khổng lồ
// (Betelgeuse, Deneb, Antares) sai số còn lớn.
export const LORE = {
  uma: {
    season: 'Thấy quanh năm ở bán cầu Bắc, cao nhất vào các buổi tối mùa xuân',
    origin: [
      'Bắc Đẩu không phải một chòm sao riêng mà là bảy ngôi sao sáng nhất của chòm Đại Hùng (Ursa Major — Gấu Lớn), một trong 48 chòm sao Ptolemy ghi lại trong cuốn Almagest thế kỷ II.',
      'Thần thoại Hy Lạp kể đó là nàng Callisto bị biến thành gấu rồi được Zeus đưa lên trời. Ở Đông Á, bảy sao này là "Bắc Đẩu thất tinh" — chiếc gáo múc nước. Người xưa nhìn hướng cán gáo lúc chập tối để đoán mùa: cán chỉ về đông là xuân, nam là hạ, tây là thu, bắc là đông.',
    ],
    stars: [
      'Dubhe và Merak ở miệng gáo là hai "sao chỉ đường": kéo dài đoạn nối chúng khoảng 5 lần sẽ gặp sao Bắc Cực.',
      'Mizar ở giữa cán gáo có bạn đồng hành mờ là Alcor. Nhìn tách được hai sao bằng mắt thường từng là một bài thử thị lực.',
      'Năm trong bảy ngôi sao (trừ Dubhe và Alkaid) cùng trôi về một hướng trong không gian — chúng thuộc Nhóm chuyển động Đại Hùng, cách ta khoảng 80 năm ánh sáng.',
    ],
    find: 'Nhìn về hướng bắc, tìm hình chiếc gáo lớn gồm bốn sao làm thân và ba sao làm cán. Đây là mốc dễ nhận nhất để định hướng các chòm sao khác.',
  },
  cas: {
    season: 'Thấy quanh năm ở vĩ độ Bắc trung bình, cao nhất vào các buổi tối mùa thu',
    origin: [
      'Cassiopeia là hoàng hậu xứ Aethiopia trong thần thoại Hy Lạp, mẹ của công chúa Andromeda. Vì khoe mình đẹp hơn các nữ thần biển, bà khiến thần Poseidon nổi giận; hình phạt là bị đặt lên trời trên chiếc ngai quay quanh thiên cực, nửa thời gian phải lộn ngược đầu.',
      'Chòm sao cũng nằm trong danh sách 48 chòm của Ptolemy.',
    ],
    stars: [
      'Năm ngôi sao sáng xếp thành chữ W (hoặc M, tuỳ thời điểm trong đêm): Caph, Schedar, Gamma Cassiopeiae, Ruchbah và Segin.',
      'Năm 1572, một "ngôi sao mới" sáng ngang sao Kim xuất hiện trong chòm này. Tycho Brahe đo đạc kỹ và chứng minh nó ở rất xa — một bằng chứng rằng bầu trời không bất biến. Ngày nay ta biết đó là một vụ nổ siêu tân tinh.',
      'Cassiopeia A, tàn dư của một siêu tân tinh khác, là một trong những nguồn sóng vô tuyến mạnh nhất bầu trời.',
    ],
    find: 'Cassiopeia nằm đối diện Bắc Đẩu qua sao Bắc Cực: khi Bắc Đẩu xuống thấp thì chữ W lên cao. Chòm sao nằm ngay trên dải Ngân Hà.',
  },
  ori: {
    season: 'Các buổi tối mùa đông; nằm trên xích đạo trời nên gần như cả thế giới đều thấy',
    origin: [
      'Orion là chàng thợ săn khổng lồ trong thần thoại Hy Lạp. Một dị bản kể chàng bị bọ cạp đốt chết, nên hai chòm Lạp Hộ và Thiên Yết được đặt ở hai phía bầu trời, không bao giờ cùng xuất hiện.',
      'Dân gian Việt Nam gọi ba sao thắt lưng cùng thanh kiếm là sao Cày, và nhìn nó để tính thời vụ.',
    ],
    stars: [
      'Betelgeuse (vai): sao siêu khổng lồ đỏ, cách ta chừng 500–700 năm ánh sáng, to đến mức nếu đặt vào chỗ Mặt Trời nó sẽ nuốt quỹ đạo sao Hoả. Nó đang ở cuối đời và sẽ nổ thành siêu tân tinh, nhưng "sắp" ở đây có thể là hàng trăm nghìn năm.',
      'Rigel (chân): sao siêu khổng lồ xanh, cách khoảng 860 năm ánh sáng. Tính cả phần bức xạ mắt không thấy, nó phát ra năng lượng gấp cỡ một trăm nghìn lần Mặt Trời.',
      'Ba sao thắt lưng: Alnitak, Alnilam, Mintaka. Ngay bên dưới là tinh vân Lạp Hộ (M42), một vườn ươm sao cách khoảng 1.300 năm ánh sáng, nhìn thấy bằng mắt thường như một đốm mờ.',
    ],
    find: 'Tìm ba ngôi sao sáng thẳng hàng sát nhau. Kéo dài thắt lưng về một phía sẽ gặp Sirius — sao sáng nhất trời đêm, về phía kia là Aldebaran đỏ cam của chòm Kim Ngưu.',
  },
  cyg: {
    season: 'Các buổi tối mùa hè và đầu thu',
    origin: [
      'Thiên Nga là con chim bay dọc dải Ngân Hà. Thần thoại Hy Lạp có nhiều cách giải thích: Zeus hoá thiên nga, hay nhạc sĩ Orpheus được đưa lên trời cạnh cây đàn lia của mình (chòm Thiên Cầm ngay bên cạnh).',
      'Phần thân và cánh tạo thành hình chữ thập nên chòm sao còn được gọi là Thập tự phương Bắc.',
    ],
    stars: [
      'Deneb (đuôi): một trong những ngôi sao phát sáng mạnh nhất mà mắt thường thấy được. Khoảng cách còn chưa chắc chắn, ước chừng 1.500–2.600 năm ánh sáng — xa hơn Vega từ 60 đến 100 lần mà vẫn nằm trong nhóm 20 sao sáng nhất trời đêm.',
      'Albireo (mỏ): qua kính nhỏ tách thành một cặp sao vàng cam và xanh lam, một trong những sao đôi đẹp nhất.',
      'Cygnus X-1: nguồn tia X phát hiện năm 1964, là vật thể đầu tiên được giới khoa học chấp nhận rộng rãi là lỗ đen.',
    ],
    find: 'Deneb cùng Vega (Thiên Cầm) và Altair (Thiên Ưng) tạo thành Tam giác mùa hè. Từ Deneb, thân chim kéo dài dọc Ngân Hà về phía Albireo.',
  },
  lyr: {
    season: 'Các buổi tối mùa hè',
    origin: [
      'Thiên Cầm là cây đàn lia của Orpheus, người có tiếng đàn làm cả đá cũng phải mủi lòng. Sau khi chàng mất, cây đàn được đưa lên trời.',
      'Ở Đông Á, sao Vega là Chức Nữ, còn Altair bên kia dải Ngân Hà là Ngưu Lang. Truyền thuyết kể mỗi năm họ chỉ gặp nhau một lần vào đêm mùng 7 tháng 7 âm lịch (Thất Tịch).',
    ],
    stars: [
      'Vega: sao sáng thứ năm trên trời đêm, cách chỉ 25 năm ánh sáng. Năm 1850 nó là ngôi sao đầu tiên (ngoài Mặt Trời) được chụp ảnh.',
      'Do trục Trái Đất đảo chậm theo chu kỳ khoảng 26.000 năm, Vega từng là sao Bắc Cực cách đây khoảng 14.000 năm và sẽ lại như vậy sau khoảng 12.000 năm nữa.',
      'Giữa Sheliak và Sulafat là tinh vân Chiếc Nhẫn (M57) — lớp khí một ngôi sao giống Mặt Trời thổi ra lúc cuối đời.',
    ],
    find: 'Tìm ngôi sao trắng xanh rất sáng gần đỉnh đầu vào tối mùa hè — đó là Vega. Bên cạnh là một hình bình hành nhỏ gồm bốn sao mờ hơn.',
  },
  leo: {
    season: 'Các buổi tối mùa xuân',
    origin: [
      'Sư Tử là con sư tử xứ Nemea có bộ da đao kiếm không xuyên thủng. Hạ nó là kỳ công đầu tiên trong mười hai kỳ công của Heracles.',
      'Đây là một trong những chòm sao được ghi nhận sớm nhất; người Lưỡng Hà đã coi nhóm sao này là sư tử từ hàng nghìn năm trước Công nguyên. Sư Tử thuộc 12 chòm sao hoàng đạo.',
    ],
    stars: [
      'Regulus ("vị vua nhỏ"): ngôi sao ở trái tim sư tử, cách khoảng 79 năm ánh sáng. Nó nằm gần đường hoàng đạo nên thỉnh thoảng bị Mặt Trăng che khuất.',
      'Chiếc lưỡi liềm ngược (hình dấu hỏi lật) phía trên Regulus là đầu và bờm; Denebola ở đầu kia là chóp đuôi.',
      'Mưa sao băng Leonids có điểm phát xạ trong chòm này, đạt đỉnh khoảng ngày 17 tháng 11 hằng năm.',
    ],
    find: 'Từ hai sao chỉ đường của Bắc Đẩu, đi ngược lại (về phía xa sao Bắc Cực) sẽ gặp Sư Tử. Tìm hình lưỡi liềm ngược với Regulus sáng ở chân.',
  },
  sco: {
    season: 'Các buổi tối mùa hè, thấp về phía nam nếu nhìn từ bán cầu Bắc',
    origin: [
      'Thiên Yết là con bọ cạp đã đốt chết thợ săn Orion. Hai chòm được đặt đối nhau trên bầu trời: bọ cạp mọc thì thợ săn lặn.',
      'Dân gian Việt Nam gọi chòm này là Thần Nông, nhìn nó để đoán mùa màng. Thiên Yết thuộc hoàng đạo, nhưng Mặt Trời chỉ đi qua nó chừng một tuần mỗi năm.',
    ],
    stars: [
      'Antares: sao siêu khổng lồ đỏ ở trái tim bọ cạp, cách khoảng 550 năm ánh sáng. Tên nó nghĩa là "đối thủ của sao Hoả" vì màu đỏ và độ sáng dễ lẫn với hành tinh này.',
      'Chiếc đuôi cong kết thúc ở Shaula và Lesath — cái ngòi của bọ cạp.',
      'Đuôi bọ cạp chỉ về vùng dày đặc nhất của Ngân Hà; tâm thiên hà nằm ngay bên cạnh, trong chòm Nhân Mã.',
    ],
    find: 'Tìm ngôi sao đỏ cam sáng ở thấp phía nam vào tối mùa hè. Ba sao xếp hàng dọc phía trước là càng, còn một chuỗi sao cong xuống rồi móc lên là đuôi.',
  },
};

// Chuyện thật về từng chòm sao: những lần bầu trời làm thay đổi hiểu biết của con người.
// Năm tháng và con số là những gì thường được ghi lại; chưa đối chiếu với nguồn gốc.
const TALES = {
  uma: [
    'Mizar, ngôi sao ở giữa cán gáo, giữ ba cái “đầu tiên” của thiên văn học. Đầu thế kỷ 17 nó là sao đôi đầu tiên được tách ra qua kính thiên văn. Năm 1857 nó là sao đôi đầu tiên được chụp ảnh. Năm 1889 người ta phát hiện mỗi nửa của nó lại là một cặp sao quay quanh nhau sát đến mức chỉ quang phổ mới tách được.',
    'Chiếc gáo không ở yên. Năm ngôi sao giữa trôi cùng nhau, còn hai sao ở hai đầu đi hướng khác, nên khoảng năm mươi nghìn năm nữa hình chiếc gáo sẽ méo hẳn đi. Người tiền sử đã nhìn một chiếc gáo khác với chiếc ta thấy đêm nay.',
  ],
  cas: [
    'Nếu bạn đứng trên một hành tinh quanh Alpha Centauri, hệ sao gần ta nhất, và nhìn về phía này, bạn sẽ thấy chòm Cassiopeia có thêm một ngôi sao sáng ở cuối chữ W. Ngôi sao thừa ra ấy là Mặt Trời của chúng ta.',
    'Ánh sáng từ vụ nổ sao tạo ra Cassiopeia A lẽ ra tới Trái Đất vào khoảng năm 1680, nhưng không ai chắc chắn đã ghi lại một ngôi sao mới nào. Bụi dày đã che gần hết ánh sáng, và phải đến khi có kính thiên văn vô tuyến người ta mới tìm ra tàn dư của nó.',
  ],
  ori: [
    'Cuối năm 2019, Betelgeuse bỗng mờ đi nhanh chóng; đến tháng 2 năm 2020 nó chỉ còn sáng chừng hai phần năm bình thường, mắt thường cũng nhận ra vai chàng thợ săn tối hẳn. Nhiều người chờ một vụ nổ siêu tân tinh. Về sau các ảnh chụp cho thấy ngôi sao đã phun ra một khối khí khổng lồ; khối khí nguội đi thành bụi và che mất một phần bề mặt. Vài tháng sau Betelgeuse sáng trở lại.',
    'Trong tinh vân Lạp Hộ, kính Hubble chụp được những đĩa bụi quanh các ngôi sao non: những hệ hành tinh đang hình thành. Nhìn đốm mờ dưới ba sao thắt lưng là nhìn nơi các mặt trời mới ra đời.',
  ],
  cyg: [
    'Năm 1838, Friedrich Bessel đo được khoảng cách tới 61 Cygni, một ngôi sao mờ trong chòm này, bằng cách theo dõi nó xê dịch chút xíu khi Trái Đất đi nửa vòng quanh Mặt Trời. Kết quả là hơn mười năm ánh sáng. Đó là lần đầu tiên loài người biết một ngôi sao xa đến mức nào, và vũ trụ bỗng rộng ra gấp nhiều lần so với hình dung trước đó.',
    'Năm 1974, Stephen Hawking cá với Kip Thorne rằng Cygnus X-1 không phải lỗ đen, dù cả đời ông nghiên cứu lỗ đen. Ông nói đó là một kiểu bảo hiểm: nếu lỗ đen không tồn tại thì ít ra ông cũng thắng cược. Năm 1990, khi bằng chứng đã quá rõ, Hawking nhận thua.',
  ],
  lyr: [
    'Vega từng là sao Bắc Cực. Trục Trái Đất đảo như con quay, một vòng mất khoảng hai mươi sáu nghìn năm, nên điểm cực trời dịch dần giữa các vì sao. Khoảng mười bốn nghìn năm trước, Vega là ngôi sao đứng gần cực bắc, và chừng mười hai nghìn năm nữa nó sẽ trở lại vị trí ấy.',
    'Đêm 16 tháng 7 năm 1850, tại đài thiên văn Harvard, Vega trở thành ngôi sao đầu tiên (không kể Mặt Trời) được chụp ảnh, trên một tấm bạc phơi sáng hơn một phút rưỡi. Về sau các nhà thiên văn còn lấy Vega làm mốc số không để đo độ sáng của mọi ngôi sao khác.',
  ],
  leo: [
    'Đêm 12 rạng 13 tháng 11 năm 1833, bầu trời Bắc Mỹ đổ sao băng dày đến mức người ta ước tính hàng chục nghìn vệt mỗi giờ. Nhiều người bị đánh thức vì trời sáng, và tưởng ngày tận thế đã đến. Những người quan sát kỹ nhận ra mọi vệt sáng đều toả ra từ một điểm trong chòm Sư Tử. Từ đêm ấy, sao băng không còn bị coi là hiện tượng thời tiết mà là bụi từ ngoài không gian.',
    'Về sau người ta tìm ra nguồn của trận mưa ấy: sao chổi Tempel–Tuttle, cứ khoảng 33 năm lại quay về và rắc thêm bụi dọc đường đi. Mỗi tháng 11, Trái Đất băng qua dải bụi đó, và mưa sao băng Leonid lại xuất hiện.',
  ],
  sco: [
    'Tên Antares nghĩa là “đối thủ của sao Hoả”: ngôi sao đỏ này nằm gần đường đi của các hành tinh, và mỗi lần sao Hoả đi ngang qua, hai đốm đỏ đứng cạnh nhau như đang so màu.',
    'Năm 1962, một tên lửa nhỏ mang máy đếm tia X bay lên trong vài phút để tìm tia X từ Mặt Trăng. Nó không thấy gì từ Mặt Trăng, nhưng bắt được một nguồn tia X cực mạnh trong chòm Thiên Yết, về sau gọi là Scorpius X-1. Đó là nguồn tia X đầu tiên được tìm thấy ngoài hệ Mặt Trời, và là lúc ngành thiên văn tia X ra đời; người dẫn đầu nhóm, Riccardo Giacconi, nhận giải Nobel năm 2002.',
  ],
};
for (const [id, tale] of Object.entries(TALES)) LORE[id].tale = tale;

// Sợi chỉ giữa mặt đất và bầu trời: mỗi chòm sao nối với một loài hoa trong thung lũng, vì
// chúng cùng mùa, hoặc vì một cái tên chung. Sợi chỉ chỉ hiện ra trong Sổ tay khi bạn đã ép
// loài hoa ấy và đã nhận ra (hoặc dệt) chòm sao ấy. Các mốc thời gian là thường được ghi lại,
// chưa đối chiếu nguồn.
export const THREADS = {
  uma: { flower: 'cherry', text: 'Sách cổ Trung Hoa chép: chập tối mà cán gáo Bắc Đẩu chỉ về phương đông thì cả thiên hạ đã vào xuân. Cũng là lúc ba cây anh đào trong vườn trổ hoa: một cái đồng hồ của mùa xuân treo trên trời, một cái nở trên cành.' },
  cas: { flower: 'mum', text: 'Cassiopeia ngồi trên một chiếc ngai, còn ngai của Thiên hoàng Nhật Bản được gọi là Ngai Hoa cúc. Chữ W lên cao nhất vào những tối mùa thu, đúng mùa cúc vàng nở trước trại: hai chiếc ngai, một bằng sao, một bằng hoa.' },
  ori: { flower: 'snowdrop', text: 'Những tối Lạp Hộ đứng cao nhất phía nam là tháng một, tháng hai, cũng là lúc hoa giọt tuyết nhú qua lớp đất đóng băng. Chàng thợ săn và chiếc chuông trắng nhỏ là hai thứ đi qua được những đêm dài nhất năm.' },
  cyg: { flower: 'cosmos', text: 'Cavanilles đặt tên hoa cánh bướm theo chữ Hy Lạp “kosmos”: trật tự, hài hoà; về sau chính chữ ấy được dùng để gọi vũ trụ. Thiên Nga bay dọc dải Ngân Hà vào những tối cuối hạ, đầu thu, đúng mùa hoa cánh bướm nở.' },
  lyr: { flower: 'lavender', text: 'Vega đứng gần đỉnh đầu vào những tối giữa hè, khi oải hương nở tím. Ở Đông Á, Vega là Chức Nữ; đêm Thất Tịch nàng gặp Ngưu Lang, đêm mùng bảy tháng bảy âm lịch, thường rơi vào tháng tám, khi những cánh đồng oải hương đã vào mùa gặt.' },
  leo: { flower: 'sunflower', text: 'Từ khoảng giữa tháng tám tới giữa tháng chín, Mặt Trời đi qua chòm Sư Tử. Đó cũng là lúc ruộng hướng dương chín đĩa hạt: những bông hoa quay theo Mặt Trời, còn Mặt Trời khi ấy đang nằm giữa lòng con sư tử.' },
  sco: { flower: 'poppy', text: 'Antares nghĩa là “đối thủ của sao Hoả”, vì sắc đỏ của nó. Ngôi sao lên cao nhất vào những tối đầu hè, mùa anh túc đỏ nở: hai thứ đỏ nhất của mùa hạ, một dưới đất, một trên trời.' },
};
// Điều chỉ người dệt mới biết: một chuyện nữa cho mỗi chòm, mở ra khi bạn tự tay dệt trọn nó.
// Viết từ hiểu biết chung, chưa đối chiếu nguồn.
const DEEP = {
  uma: 'Ở Mỹ thế kỷ 19, người nô lệ gọi Bắc Đẩu là “cái gáo uống nước” và đi theo hướng nó chỉ để trốn lên phương Bắc. Bài hát “Follow the Drinking Gourd” được kể là mang lời chỉ đường ấy, dù các nhà sử học vẫn còn tranh luận bài hát có thật được dùng như vậy hay không.',
  cas: 'Sao Bắc Cực nằm gần như giữa Bắc Đẩu và Cassiopeia. Đêm nào mây che mất chiếc gáo, chữ W bên kia vẫn chỉ được hướng bắc: người đi biển và đi rừng ở phương Bắc học cả hai cách tìm.',
  ori: 'Màu của một ngôi sao là nhiệt độ của nó. Betelgeuse đỏ cam vì bề mặt chỉ khoảng 3.500 độ; Rigel xanh trắng vì nóng chừng 12.000 độ. Nhìn hai vai và chân chàng thợ săn là nhìn hai đầu của thang nhiệt độ các vì sao.',
  cyg: 'Từ năm 2009 tới 2013, kính thiên văn Kepler nhìn không chớp mắt vào một mảng trời giữa Thiên Nga và Thiên Cầm, theo dõi hơn trăm năm mươi nghìn ngôi sao để bắt những lần ánh sáng chúng mờ đi một chút khi có hành tinh đi ngang. Từ mảnh trời nhỏ ấy, người ta tìm ra hàng nghìn thế giới quanh những mặt trời khác.',
  lyr: 'Mưa sao băng Lyrids, quanh ngày 22 tháng tư, toả ra từ gần Vega. Đây là một trong những trận mưa sao băng được ghi chép lâu đời nhất: sử sách Trung Hoa được cho là đã chép lại nó từ năm 687 trước Công nguyên.',
  leo: 'Regulus quay rất nhanh, một vòng chưa tới mười sáu giờ (Mặt Trời mất gần một tháng). Nó quay nhanh đến mức phình bẹt ra ở xích đạo; chỉ nhanh thêm một chút nữa là nó tự văng vỡ.',
  sco: 'Người Polynesia nhìn chiếc đuôi cong của Thiên Yết mà thấy lưỡi câu của Māui, người anh hùng đã câu những hòn đảo từ đáy biển lên. Những người đi biển vượt Thái Bình Dương bằng thuyền buồm đã dùng các chòm sao như thế để giữ hướng.',
};
for (const [id, text] of Object.entries(DEEP)) LORE[id].deep = text;
/** the constellation tied to a flower, or '' */
export const starOfFlower = (fid) => (Object.entries(THREADS).find(([, t]) => t.flower === fid) || [''])[0];
// What each season's evening sky offers first (the camp card and the compass suggest it).
export const SEASON_SKY = [['uma', 'leo'], ['lyr', 'sco', 'cyg'], ['cas', 'cyg'], ['ori', 'cas']];
