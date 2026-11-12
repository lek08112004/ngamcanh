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
      'Rigel (chân): sao siêu khổng lồ xanh, cách khoảng 860 năm ánh sáng, sáng gấp hàng chục nghìn lần Mặt Trời.',
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
      'Deneb (đuôi): một trong những ngôi sao phát sáng mạnh nhất mà mắt thường thấy được. Khoảng cách còn chưa chắc chắn, ước chừng 1.500–2.600 năm ánh sáng — xa hơn Vega cả trăm lần mà vẫn nằm trong nhóm 20 sao sáng nhất trời đêm.',
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
