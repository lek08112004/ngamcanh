// What the observing log says about each telescope target. Our own short wording; the figures are
// from the pages named in `src` (read November 2026). `eye`: what a small telescope (the valley's
// 90 mm refractor) really shows; `fact`: the background. Nothing here is from memory without a
// source, except where `src` is the method used for the drawing.
const W = (t) => `https://en.wikipedia.org/wiki/${t}`;
export const TARGET_INFO = {
  moon: {
    eye: 'Ở 36× cả đĩa Trăng nằm gọn trong thị trường; ở 150× chỉ thấy một mảng. Chỗ đẹp nhất là dọc ranh giới sáng tối, nơi bóng của vách miệng hố đổ dài.',
    fact: 'Đường kính trung bình khoảng 3.474 km; bán trục lớn quỹ đạo khoảng 384.400 km. Các vùng tối ("biển") là đồng bằng dung nham cổ; Trăng luôn quay một mặt về phía Trái Đất.',
    src: [['Wikipedia: Moon', W('Moon')]],
    draw: 'Pha và phía được chiếu sáng tính từ vị trí Mặt Trời và Mặt Trăng (công thức độ chính xác thấp của Astronomical Almanac). Vị trí các biển lớn và vài miệng hố (Tycho, Copernicus, Plato…) đặt theo toạ độ trên Mặt Trăng; các hố nhỏ còn lại là minh hoạ.',
  },
  jupiter: {
    eye: 'Một đĩa nhỏ hơi dẹt với hai dải mây sẫm hai bên xích đạo, và bốn chấm sáng xếp gần như thẳng hàng: Io, Europa, Ganymede, Callisto. Vị trí của chúng đổi từng đêm.',
    fact: 'Galileo quan sát chúng vào tháng 12/1609 hoặc tháng 1/1610; lá thư ngày 7/1/1610 là lần đầu ông nhắc tới các vệ tinh của Sao Mộc. Vết Đỏ Lớn hiện rộng khoảng 1,3 lần đường kính Trái Đất (đo năm 2017) và rất khó thấy qua kính nhỏ.',
    src: [['Wikipedia: Galilean moons', W('Galilean_moons')], ['Wikipedia: Great Red Spot', W('Great_Red_Spot')], ['NASA NSSDCA Planetary Fact Sheet', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/']],
    draw: 'Vị trí hành tinh: các phần tử quỹ đạo của Standish (JPL). Vị trí bốn vệ tinh: phương pháp độ chính xác thấp của Meeus (chương 44), chỉ lệch đông tây.',
  },
  saturn: {
    eye: 'Một đĩa vàng nhạt với vành. Quanh năm 2025–2026 vành gần như nằm ngang mép nên trông như một sợi chỉ mảnh cắt qua hành tinh.',
    fact: 'Theo Wikipedia, lần mặt phẳng vành đi qua Trái Đất gần nhất là ngày 23/3/2025. Vành chủ yếu là băng nước.',
    src: [['Wikipedia: Rings of Saturn', W('Rings_of_Saturn')], ['Wikipedia: Saturn', W('Saturn')]],
    draw: 'Góc mở của vành tính theo Meeus (chương 45); hình đĩa và vành là minh hoạ.',
  },
  mars: {
    eye: 'Một đĩa nhỏ màu cam gạch. Chỉ khi gần xung đối (Trái Đất đi ngang qua giữa Mặt Trời và Sao Hoả) đĩa mới đủ lớn để thấy chỏm băng hay vùng sẫm.',
    fact: 'Bán kính trung bình 3.389,5 km; một năm Sao Hoả dài 687 ngày Trái Đất.',
    src: [['NASA NSSDCA Planetary Fact Sheet', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/']],
    draw: 'Kích thước biểu kiến tính từ khoảng cách (Standish, JPL); bề mặt là minh hoạ.',
  },
  albireo: {
    eye: 'Hai ngôi sao cách nhau khoảng 35″: một vàng hổ phách, một xanh lam. Một trong những cặp sao đẹp nhất cho kính nhỏ.',
    fact: 'Wikipedia ghi chưa biết hai sao có quay quanh nhau thật hay chỉ tình cờ nằm cùng hướng nhìn; khoảng cách đo được của chúng hơi khác nhau (khoảng 365 và 395 năm ánh sáng theo số liệu thiên trắc).',
    src: [['Wikipedia: Albireo', W('Albireo')]],
    draw: 'Vị trí, độ sáng và khoảng cách góc 35,3″ (góc vị trí 54°) theo Wikipedia.',
  },
  mizar: {
    eye: 'Mắt thường đã thấy Mizar có bạn đồng hành Alcor cách khoảng 12′. Qua kính, chính Mizar tách thành hai sao cách nhau 14,4″.',
    fact: 'Năm 1617 Benedetto Castelli nhờ Galileo quan sát Mizar và Galileo ghi chép lại; có thể đây là sao đôi đầu tiên người châu Âu biết qua kính thiên văn. Mizar A cũng là sao đôi quang phổ đầu tiên được phát hiện (quỹ đạo công bố năm 1890).',
    src: [['Wikipedia: Mizar', W('Mizar')], ['Wikipedia: Mizar and Alcor', W('Mizar_and_Alcor')]],
    draw: 'Khoảng cách 14,4″ theo Wikipedia; góc vị trí vẽ gần đúng.',
  },
  pleiades: {
    eye: 'Cụm sao rộng khoảng 2°, to hơn thị trường của mọi thị kính ở đây; đẹp nhất ở 36× hoặc ngay trong kính tìm. Mắt thường thấy sáu, bảy sao.',
    fact: 'Cách trung bình khoảng 444 năm ánh sáng, tuổi khoảng 125 triệu năm. Màn bụi xanh trong ảnh chụp nay được cho là một đám bụi không liên quan mà cụm đang đi ngang qua.',
    src: [['Wikipedia: Pleiades', W('Pleiades')]],
    draw: 'Chín sao sáng nhất (Alcyone, Atlas, Electra, Maia, Merope, Taygeta, Pleione, Celaeno, Asterope) đặt theo toạ độ Wikipedia; các sao mờ là minh hoạ.',
  },
  double: {
    eye: 'Hai đám sao dày đặc nằm cạnh nhau trong cùng một thị trường 36×.',
    fact: 'NGC 869 cách khoảng 7.460 và NGC 884 khoảng 7.640 năm ánh sáng; cả hai chỉ khoảng 14 triệu năm tuổi, rất trẻ so với Mặt Trời.',
    src: [['Wikipedia: NGC 869', W('NGC_869')], ['Wikipedia: NGC 884', W('NGC_884')]],
    draw: 'Tâm hai cụm theo Wikipedia; từng ngôi sao trong cụm là minh hoạ.',
  },
  m31: {
    eye: 'Qua thị kính chỉ là một vệt sáng mờ hình bầu dục với lõi sáng hơn; không có màu, không thấy cánh tay xoắn. Ảnh chụp màu là phơi sáng hàng giờ.',
    fact: 'Thiên hà lớn gần Ngân Hà nhất, cách khoảng 2,5 triệu năm ánh sáng: ánh sáng bạn thấy rời nó từ trước khi có loài người. Kích thước biểu kiến khoảng 3,2° × 1°. Mắt thường thấy được vào đêm không trăng.',
    src: [['Wikipedia: Andromeda Galaxy', W('Andromeda_Galaxy')]],
    draw: 'Kích thước theo Wikipedia; góc nghiêng vẽ gần đúng; độ sáng là minh hoạ.',
  },
  m42: {
    eye: 'Một màn sương xám nhạt hình quạt quanh bốn ngôi sao nhỏ xếp hình thang (Trapezium). Mắt người gần như không thấy màu đỏ hồng của ảnh chụp.',
    fact: 'Vùng hình thành sao khối lượng lớn gần Trái Đất nhất, cách khoảng 1.270 năm ánh sáng, rộng khoảng 1° trên trời. Từ 68° Bắc, nó chỉ lên cao chừng 16° vào mùa đông.',
    src: [['Wikipedia: Orion Nebula', W('Orion_Nebula')], ['Wikipedia: Trapezium Cluster', W('Trapezium_Cluster')]],
    draw: 'Kích thước theo Wikipedia; hình dạng, độ sáng và vị trí bốn sao Trapezium là minh hoạ.',
  },
  m57: {
    eye: 'Một vòng khói xám rất nhỏ, khoảng 1,5′ × 1′; cần 90× trở lên mới thấy rõ là vòng tròn.',
    fact: 'Tinh vân hành tinh cách khoảng 2.570 năm ánh sáng: vỏ khí một ngôi sao sắp tắt thổi ra trước khi thành sao lùn trắng. Không liên quan gì tới hành tinh.',
    src: [['Wikipedia: Ring Nebula', W('Ring_Nebula')]],
    draw: 'Kích thước theo Wikipedia; độ sáng là minh hoạ.',
  },
};
// The Pleiades' nine brightest (Wikipedia infoboxes, J2000): ra hours, dec degrees, V
export const PLEIADES = [
  ['Alcyone', 3.79141, 24.10514, 2.87], ['Atlas', 3.81937, 24.05342, 3.63], ['Electra', 3.74793, 24.11333, 3.70],
  ['Maia', 3.76378, 24.36775, 3.87], ['Merope', 3.77210, 23.94836, 4.18], ['Taygeta', 3.75347, 24.46728, 4.30],
  ['Pleione', 3.81978, 24.13671, 5.05], ['Celaeno', 3.74673, 24.28947, 5.45], ['Asterope', 3.76513, 24.55451, 5.76],
];
export const SKY_SOURCES = [
  ['Meeus, J. (1998), Astronomical Algorithms, 2nd ed. (sidereal time, Jupiter\'s moons, Saturn\'s rings)', ''],
  ['U.S. Naval Observatory / HMNAO, The Astronomical Almanac: low-precision formulae for the Sun and Moon', ''],
  ['Standish, E. M., Keplerian Elements for Approximate Positions of the Major Planets (JPL)', 'https://ssd.jpl.nasa.gov/planets/approx_pos.html'],
  ['NASA NSSDCA Planetary Fact Sheet', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/'],
];
