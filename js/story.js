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
  { id: 'garden', when: 'Sáng', title: 'Vườn bách hoa', ask: 'Qua cổng hoa hồng ở phía đông trại.', memo: 'Mỗi mùa một vườn khác: hồng, oải hương, hướng dương, cúc, và ba cây anh đào.' },
  { id: 'bench', when: 'Sáng', title: 'Ngồi dưới anh đào', ask: 'Tìm chiếc ghế gỗ dưới cây anh đào giữa vườn và ngồi lại một lát.', memo: 'Cánh hoa rơi chậm, đậu cả lên vai.' },
  { id: 'press', when: 'Trưa', title: 'Ép hoa ở lều', ask: 'Đứng lặng giữa một loài hoa đang nở để hái một cành, rồi mang về lều: hoa chỉ được ép vào sổ khi về tới lều.', memo: 'Cánh hoa kẹp giữa hai trang giấy, đè dưới cuốn sách nặng nhất.' },
  { id: 'stream', when: 'Trưa', title: 'Lội suối', ask: 'Xuống bờ suối trong thung lũng rồi bước hẳn xuống nước.', memo: 'Nước lạnh buốt, trong đến mức đếm được sỏi dưới đáy.' },
  { id: 'hill', when: 'Trưa', title: 'Lên cao nhìn lại', ask: 'Leo lên Đồi phía đông hoặc Đồi sau trại để nhìn cả thung lũng.', memo: 'Từ trên cao, trại chỉ còn là một chấm khói.' },
  { id: 'rest', when: 'Chiều', title: 'Nghỉ trong nhà gỗ', ask: 'Tới hiên nhà gỗ và bấm “Vào nhà nghỉ” (phím E). Thời gian sẽ trôi tới quãng tiếp theo của ngày.', memo: 'Ấm trà, ô cửa sổ, và một trang sách đọc dở.' },
  { id: 'night', when: 'Tối', title: 'Chờ đêm xuống', ask: 'Ở lại cho tới khi trời tối. Thời gian tự trôi; muốn nhanh hơn thì bấm vào đồng hồ (phím N) để tua tới đêm.', memo: 'Hoa khép cánh. Ngôi sao đầu tiên hiện ra phía bắc.' },
  { id: 'kindle', when: 'Tối', title: 'Nhóm lại lửa', ask: 'Lửa trại tự tàn dần. Ôm củi ở đống củi cạnh lều, rồi tới gần đống lửa đã tắt và nhóm lại (Space, hoặc bấm vào lửa).', memo: 'Thổi vài hơi vào than, lửa bén lên từ một nhúm vỏ cây khô.' },
  { id: 'lamp', when: 'Tối', title: 'Tắt đèn lều', ask: 'Mở Tuỳ chỉnh và tắt “Đèn lều” để mắt quen với bóng tối.', memo: 'Vài phút sau, dải Ngân Hà rõ dần như ai vừa lau kính.' },
  { id: 'lie', when: 'Đêm', title: 'Nằm ngắm trời', ask: 'Ngước hẳn lên trời và cứ nhìn như thế một lúc.', memo: 'Cực quang kéo màn ngay trên đầu.' },
  { id: 'star', when: 'Đêm', title: 'Gọi tên một chòm sao', ask: 'Giữ một chòm sao ở giữa khung nhìn vài giây. Bật “Chòm sao” (phím C) nếu cần gợi ý.', memo: 'Nhận ra được một chòm, bầu trời bỗng có địa chỉ.' },
  { id: 'lore', when: 'Đêm', title: 'Nghe chuyện kể', ask: 'Mở Sổ tay (phím J) và đọc chuyện của một chòm sao.', memo: 'Chuyện cũ hàng nghìn năm, kể bên một đống lửa mới.' },
  { id: 'weave', when: 'Đêm', title: 'Dệt một chòm sao', ask: 'Chuyển sang “Trò dệt sao” (phím M) và tự tay dệt trọn một chòm. Một ngôi sao mới sẽ sáng lại trên trời trại.', memo: 'Sợi chỉ cuối cùng khép lại, cả chòm sao bừng lên một lúc.' },
  { id: 'meteor', when: 'Đêm', title: 'Một điều ước', ask: 'Cứ nhìn trời. Sớm muộn sẽ có một vệt sao băng đi qua trước mắt.', memo: 'Nó tắt trước khi kịp nghĩ xong điều ước, nhưng vẫn tính.' },
  { id: 'photo', when: 'Đêm', title: 'Giữ lại một tấm', ask: 'Chọn một góc bạn thích và chụp ảnh (phím P).', memo: 'Một tấm ảnh để mang về.' },
];

// The flower book: stand quietly among a kind of flower by day to pick a sprig; carry it back
// to the tent and it is pressed into the journal.
// `season` is when each one is at its best. `note` is what you see when you look closely;
// `tales` are true stories about the plant (history and science as generally reported:
// years and figures are the commonly cited ones and were not checked against sources here).
export const FLOWERS = [
  {
    id: 'tulip', season: 'Xuân', name: 'Tulip', latin: 'Tulipa', where: 'Các luống trước trại, mùa xuân',
    note: 'Sáu cánh khép thành chén; mở ra khi nắng ấm và khép lại lúc chiều tối hay trời lạnh. Mọc từ củ, mỗi củ một hoa.',
    tales: [
      'Tulip không phải hoa của Hà Lan. Nó mọc hoang trên các sườn núi Trung Á, được người Ottoman đem về trồng trong vườn hoàng cung, và chỉ tới Hà Lan vào cuối thế kỷ 16. Cái tên được cho là bắt nguồn từ chữ Ba Tư chỉ chiếc khăn xếp, vì bông hoa giống một chiếc khăn quấn đầu.',
      'Mùa đông 1636–1637, người Hà Lan mua bán củ tulip như cổ phiếu. Một củ giống quý được ghi lại với giá ngang một căn nhà bên kênh Amsterdam. Tháng 2 năm 1637 thị trường sụp chỉ trong vài ngày: đây là vụ “bong bóng” đầu cơ nổi tiếng nhất trong sách kinh tế.',
      'Những bông đắt nhất thời đó có cánh vằn như ngọn lửa. Ba trăm năm sau người ta mới biết những vệt vằn ấy là do một loại virus lây qua rệp gây ra. Chính căn bệnh làm cây yếu đi đã tạo nên bông hoa được săn lùng nhất.',
    ],
  },
  {
    id: 'muscari', season: 'Xuân', name: 'Lan dạ hương', latin: 'Muscari', where: 'Viền các luống trước trại, mùa xuân (những bông tím xanh thấp sát đất)',
    note: 'Còn gọi là dạ lan chùm nho. Mỗi cuống là một chùm chuông nhỏ khép miệng, xanh lam đậm, xếp sít nhau như chùm nho lộn ngược; những chuông trên cùng nhạt màu và không bao giờ mở.',
    tales: [
      'Năm 1960, trong hang Shanidar ở Iraq, nhà khảo cổ Ralph Solecki tìm thấy bộ xương một người Neanderthal nằm giữa những lớp đất đầy phấn hoa, trong đó có phấn của lan dạ hương. Ông cho rằng người chết đã được chôn trên một lớp hoa, và gọi đó là “mộ hoa”. Về sau nhiều nhà khoa học nghi ngờ: phấn hoa có thể do loài gặm nhấm hay ong mang vào hang. Cuộc tranh luận chưa ngã ngũ.',
      'Những chiếc chuông trên cùng của mỗi chùm thường nhạt màu và không có khả năng sinh sản. Người ta cho rằng chúng làm nhiệm vụ như tấm biển quảng cáo, giúp ong nhìn thấy chùm hoa từ xa.',
      'Tên Muscari được cho là đến từ một chữ chỉ xạ hương, vì vài loài trong chi có mùi thơm ngọt như vậy.',
    ],
  },
  {
    id: 'daffodil', season: 'Xuân', name: 'Thuỷ tiên vàng', latin: 'Narcissus', where: 'Những khóm vàng ở cuối dốc, chỗ đất ẩm gần suối, mùa xuân',
    note: 'Sáu cánh xoè phía sau một chiếc “kèn” loe miệng. Hoa không ngửa lên trời mà quay ngang, hơi cúi.',
    tales: [
      'Tên khoa học lấy từ chàng Narcissus trong thần thoại Hy Lạp, người mê bóng mình dưới nước đến chết. Bông hoa cúi đầu bên bờ nước được cho là chàng trai ấy.',
      'Cả cây đều độc; củ từng bị nấu nhầm vì giống củ hành. Nhưng cũng từ họ cây này người ta lấy được galantamine, một hoạt chất dùng trong điều trị bệnh Alzheimer. Ở xứ Wales có những cánh đồng thuỷ tiên trồng riêng để chiết thuốc.',
      'Ở Hà Nội có thú chơi thuỷ tiên ngày Tết: người chơi gọt củ từ nhiều tuần trước, canh nước và nắng từng ngày để hoa nở đúng đêm giao thừa.',
    ],
  },
  {
    id: 'cherry', season: 'Xuân', name: 'Anh đào', latin: 'Prunus', where: 'Ba cây trong vườn, mùa xuân (đứng dưới tán và ngước lên)',
    note: 'Nở trước khi ra lá và chỉ giữ hoa chừng một hai tuần. Hè lá xanh, thu lá đỏ, đông trơ cành.',
    tales: [
      'Giống anh đào phổ biến nhất ở Nhật, Somei Yoshino, được nhân bằng cách ghép cành, nên hàng triệu cây gần như là bản sao của nhau. Vì thế cây trong cùng một vùng nở và rụng gần như cùng lúc, và người Nhật có bản tin dự báo “mặt trận hoa anh đào” dịch dần từ nam ra bắc mỗi mùa xuân.',
      'Ngày hoa nở rộ ở Kyoto được chép trong nhật ký cung đình và chùa chiền suốt hơn một nghìn năm, từ thế kỷ 9. Các nhà khí hậu dùng chính chuỗi ghi chép ấy để xem mùa xuân đã đến sớm dần ra sao; năm 2021 hoa nở rộ sớm nhất trong toàn bộ chuỗi số liệu.',
      'Năm 1912 thành phố Tokyo tặng Washington hơn ba nghìn cây anh đào. Lô cây gửi lần đầu, hai năm trước đó, đã phải đốt bỏ vì nhiễm sâu bệnh.',
    ],
  },
  {
    id: 'rose', season: 'Xuân – Thu', name: 'Hoa hồng', latin: 'Rosa', where: 'Vòng hoa quanh cây anh đào giữa vườn',
    note: 'Mọc thành bụi, mỗi bụi nhiều cành. Hồng vườn có hàng chục cánh xếp xoắn quanh nụ; hồng dại chỉ có năm cánh.',
    tales: [
      'Hoa hồng già hơn loài người rất nhiều: hoá thạch lá hồng tìm thấy ở Bắc Mỹ có tuổi khoảng 35 triệu năm.',
      'Ở thung lũng hoa hồng Bulgaria, người ta hái hoa từ lúc tờ mờ sáng, trước khi nắng làm tinh dầu bay hơi. Cần chừng ba đến bốn tấn cánh hoa mới cất được một ki-lô-gam tinh dầu.',
      'Giống hồng vàng viền hồng nổi tiếng nhất thế kỷ 20 do Francis Meilland lai tạo ở Pháp. Ông gửi cành giống ra nước ngoài ngay trước khi chiến tranh lan tới. Năm 1945 giống hoa được đặt tên là “Peace” (Hoà bình), và mỗi đoàn đại biểu dự hội nghị thành lập Liên Hợp Quốc được tặng một bông.',
    ],
  },
  {
    id: 'sunflower', season: 'Hạ', name: 'Hướng dương', latin: 'Helianthus annuus', where: 'Ruộng hoa phía bắc vườn, mùa hạ',
    note: 'Mỗi “bông” là cả nghìn hoa nhỏ xếp thành hai họ đường xoắn ốc ngược chiều. Cây non quay theo mặt trời; hoa đã nở thì đứng yên, thường hướng về phía đông.',
    tales: [
      'Đếm các đường xoắn trên đĩa hạt, bạn hầu như luôn được hai số liền nhau trong dãy Fibonacci: 34 và 55, hoặc 55 và 89. Mỗi hạt mới mọc lệch hạt trước khoảng 137,5 độ, “góc vàng”, và đó là cách xếp được nhiều hạt nhất vào một cái đĩa tròn.',
      'Cây non quay theo mặt trời vì hai bên thân lớn nhanh chậm khác nhau theo nhịp ngày đêm: ban ngày phía đông dài nhanh hơn, ban đêm phía tây. Khi hoa nở, thân ngừng lớn và hoa dừng lại hướng đông. Hoa hướng đông ấm lên sớm hơn vào buổi sáng, và ong tìm đến nhiều hơn.',
      'Hướng dương là cây của châu Mỹ, được người bản địa Bắc Mỹ thuần hoá từ hàng nghìn năm trước. Sau thảm hoạ Chernobyl, người ta thả hướng dương trên bè nổi để rễ cây hút bớt chất phóng xạ khỏi nước ao.',
    ],
  },
  {
    id: 'lavender', season: 'Hạ', name: 'Oải hương', latin: 'Lavandula', where: 'Viền các luống trước trại và khối tím phía nam vườn, mùa hạ',
    note: 'Hoa nhỏ mọc thành bông trên cuống dài. Mùi thơm nằm trong tinh dầu ở đài hoa, nên hoa khô vẫn giữ hương.',
    tales: [
      'Tên gọi thường được giải thích từ chữ La-tinh “lavare”, nghĩa là tắm rửa: người La Mã thả oải hương vào nước tắm và ướp quần áo bằng nó.',
      'Chữ “aromatherapy” (liệu pháp hương thơm) do nhà hoá học Pháp René-Maurice Gattefossé đặt ra năm 1937. Ông kể rằng sau một vụ nổ trong phòng thí nghiệm làm bỏng tay, ông đã dùng tinh dầu oải hương để chữa vết thương, và từ đó dành cả đời nghiên cứu tinh dầu.',
      'Phần lớn những cánh đồng tím ở Provence thực ra trồng lavandin, một cây lai cho nhiều dầu hơn. Oải hương “thật” mọc ở vùng núi cao hơn, bông nhỏ và mùi dịu hơn.',
    ],
  },
  {
    id: 'poppy', season: 'Hạ', name: 'Anh túc đỏ', latin: 'Papaver rhoeas', where: 'Những khóm đỏ giữa các luống phía trên dốc, gần trại, chỗ nắng khô, mùa hạ',
    note: 'Bốn cánh mỏng như giấy lụa quanh một tâm sẫm màu. Nụ cúi gục, đến lúc nở mới ngẩng lên. Đây là anh túc đồng, không phải cây thuốc phiện.',
    tales: [
      'Hạt anh túc đồng có thể ngủ trong đất hàng chục năm và chỉ nảy mầm khi đất bị xới lên gặp ánh sáng. Vì vậy sau những trận pháo kích ở Flanders trong Thế chiến thứ nhất, các bãi chiến trường bị cày nát bỗng đỏ rực hoa.',
      'Mùa xuân 1915, bác sĩ quân y Canada John McCrae viết bài thơ “In Flanders Fields” về những bông hoa ấy mọc giữa các hàng thánh giá. Từ năm 1921, anh túc đỏ thành biểu tượng tưởng niệm người lính ngã xuống ở nhiều nước.',
      'Một cây có thể cho hàng chục nghìn hạt, mỗi hạt nhỏ hơn một milimét.',
    ],
  },
  {
    id: 'daisy', season: 'Thu', name: 'Cúc hoạ mi', latin: 'Leucanthemum', where: 'Những khóm trắng giữa các luống phía trên dốc, mùa thu',
    note: 'Cánh trắng, nhuỵ vàng. Giống hướng dương, mỗi bông là một cụm hoa: vành cánh bên ngoài và đĩa hoa li ti ở giữa.',
    tales: [
      'Ở Hà Nội, cúc hoạ mi chỉ có một mùa rất ngắn vào lúc giao mùa cuối thu sang đông, chừng vài tuần. Hoa theo những chiếc xe đạp từ các làng hoa ven sông Hồng vào phố, và người ta bảo thấy cúc hoạ mi là biết mùa đông đã về.',
      'Tên tiếng Anh “daisy” vốn là “day’s eye”, con mắt của ban ngày: giống cúc dại châu Âu khép cánh khi trời tối và mở ra lúc bình minh.',
      'Trò bứt từng cánh hoa để đoán “yêu, không yêu” được chơi với hoa cúc ở châu Âu từ nhiều thế kỷ trước.',
    ],
  },
  {
    id: 'cosmos', season: 'Hạ – Thu', name: 'Hoa cánh bướm', latin: 'Cosmos bipinnatus', where: 'Những khóm cao giữa các luống ở cuối dốc, cuối hạ sang thu',
    note: 'Còn gọi là sao nhái. Tám “cánh” rộng quanh một nhuỵ vàng, trên thân mảnh và lá xẻ nhỏ như sợi chỉ. Thân cao và yếu nên lúc nào cũng nghiêng ngả theo gió.',
    tales: [
      'Quê của nó là các cao nguyên Mexico. Cuối thế kỷ 18, hạt giống được gửi về vườn thực vật Madrid, và nhà thực vật học Antonio José Cavanilles đặt tên chi là Cosmos, từ chữ Hy Lạp “kosmos”: trật tự, hài hoà, vì các cánh hoa xếp đều đặn. Cũng chính chữ ấy về sau được dùng để gọi vũ trụ.',
      'Tám “cánh” ấy thực ra là tám bông hoa riêng. Mỗi “cánh” là một hoa hình lưỡi, còn chấm vàng ở giữa là hàng chục hoa hình ống li ti: hoa cánh bướm cùng họ với cúc và hướng dương.',
      'Ở Hàn Quốc và Nhật Bản, hoa cánh bướm được gieo dọc các con đường quê và là hình ảnh quen thuộc nhất của mùa thu.',
    ],
  },
  {
    id: 'mum', season: 'Thu', name: 'Cúc vàng', latin: 'Chrysanthemum', where: 'Những bụi thấp vàng và nâu đồng viền các luống, mùa thu',
    note: 'Mọc thành bụi thấp, mỗi cành một bông tròn gồm nhiều lớp cánh nhỏ xếp tầng.',
    tales: [
      'Cúc được trồng ở Trung Quốc từ hơn hai nghìn năm trước và là một trong “tứ quân tử” cùng mai, lan, trúc. Nhà thơ Đào Uyên Minh thế kỷ 4–5 bỏ quan về quê trồng cúc, để lại câu thơ được chép mãi: “Hái cúc dưới giậu đông, thư thái thấy núi Nam.”',
      'Cúc là cây “ngày ngắn”: nó chỉ làm nụ khi đêm đủ dài. Người trồng hoa lợi dụng điều đó bằng cách thắp đèn cho cả cánh đồng vào ban đêm để cây tưởng vẫn còn mùa hè và nở chậm lại cho kịp Tết. Vì thế những làng hoa ở Đà Lạt hay Tây Tựu sáng rực cả đêm.',
      'Ở Nhật, ngai vàng của Thiên hoàng được gọi là Ngai Hoa cúc, và quốc huy hoàng gia là một bông cúc mười sáu cánh.',
    ],
  },
  {
    id: 'camellia', season: 'Đông', name: 'Hoa trà', latin: 'Camellia japonica', where: 'Vòng hoa giữa vườn, mùa đông',
    note: 'Nở giữa mùa lạnh, lá dày bóng xanh quanh năm. Hoa không rụng từng cánh mà rụng nguyên bông.',
    tales: [
      'Chén trà bạn uống cũng là một loài hoa trà: cây chè có tên khoa học Camellia sinensis, họ hàng gần của những bông hoa này.',
      'Carl Linnaeus đặt tên chi Camellia để tưởng nhớ Georg Kamel, một tu sĩ dòng Tên làm thuốc và nghiên cứu cây cỏ ở Philippines. Rất có thể ông Kamel chưa từng nhìn thấy một bông hoa trà nào.',
      'Tiểu thuyết “Trà hoa nữ” của Alexandre Dumas con (1848) kể về một cô gái Paris luôn mang hoa trà bên mình; Verdi dựng nó thành vở opera La Traviata. Còn ở Nhật, tương truyền các võ sĩ không thích hoa trà vì bông hoa rụng cả đoá, gợi cảnh rơi đầu.',
    ],
  },
  {
    id: 'snowdrop', season: 'Đông', name: 'Hoa giọt tuyết', latin: 'Galanthus nivalis', where: 'Những khóm trên các luống phủ tuyết ở cuối dốc, chỗ đất ẩm, mùa đông',
    note: 'Cao chưa đầy một gang tay. Mỗi cuống treo một chiếc chuông trắng cúi xuống, ba cánh ngoài dài che ba cánh trong ngắn có vệt xanh.',
    tales: [
      'Tên khoa học nghĩa là “hoa sữa của tuyết”. Nó nở khi đất còn đóng băng: đầu lá cứng lại như mũi dùi để xuyên qua lớp đất lạnh, và nhựa cây có chất chống đông giúp nó sống qua những đêm băng giá.',
      'Hoạt chất galantamine, nay dùng trong điều trị Alzheimer, được các nhà khoa học Đông Âu tách ra từ hoa giọt tuyết vào thập niên 1950.',
      'Ở Anh có cả một giới sưu tầm mê hoa giọt tuyết, gọi là “galanthophile”. Năm 2015, một củ giống hiếm có vệt vàng tên “Golden Fleece” được bán đấu giá hơn một nghìn bảng Anh.',
    ],
  },
  {
    id: 'heather', season: 'Đông', name: 'Thạch nam mùa đông', latin: 'Erica carnea', where: 'Những bụi hồng thấp trên các luống phía trên dốc, mùa đông',
    note: 'Bụi thấp, cành cứng như dây thép, lá kim li ti. Hoa hình chiếc bình nhỏ, hồng hay trắng, nở dọc đầu cành ngay giữa mùa đông, nhiều khi ló lên qua lớp tuyết.',
    tales: [
      'Thạch nam mùa đông mọc hoang trên các sườn núi đá vôi ở dãy Alps. Nó nở từ cuối đông, có khi khi tuyết còn chưa tan, nên là một trong những nguồn mật hiếm hoi cho những con ong ra khỏi tổ sớm nhất năm.',
      'Họ hàng gần của nó, cây thạch nam phủ kín các đồi hoang Scotland, có tên chi là Calluna, từ một chữ Hy Lạp nghĩa là quét dọn: người ta bó cành của nó làm chổi. Thạch nam còn được dùng lợp mái, độn đệm và nhuộm len.',
      'Mật ong thạch nam Scotland đặc như thạch: để yên thì đông lại, khuấy lên lại chảy. Người nuôi ong phải dùng dụng cụ riêng để lấy mật ra khỏi tầng sáp.',
    ],
  },
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
    this.satchel = new Set();       // picked, not yet pressed: they are pressed at the tent
    for (const id of store.get('story.satchel', [])) if (FLOWERS.some((f) => f.id === id) && !this.flowers.has(id)) this.satchel.add(id);
    this.log = store.get('story.log', []);       // the camp diary, oldest first (see logText in main.js)
    this.folded = store.get('story.folded', false);
  }

  save() {
    if (this.log.length > 60) this.log = this.log.slice(-60);
    store.patch('story', { done: this.done, seen: this.seen, flowers: this.flowers, satchel: this.satchel, log: this.log, folded: this.folded });
  }

  /** write a line in the camp diary (once per id); returns true if it is new */
  note(id) {
    if (this.log.includes(id)) return false;
    this.log.push(id);
    this.save();
    return true;
  }

  /** pick a sprig of a flower to carry back to the tent; returns its entry the first time */
  pick(id) {
    if (this.flowers.has(id) || this.satchel.has(id)) return null;
    const f = FLOWERS.find((x) => x.id === id);
    if (!f) return null;
    this.satchel.add(id);
    this.save();
    return f;
  }

  /** back at the tent: press everything in the satchel; returns the entries pressed */
  pressAll() {
    const out = [];
    for (const id of this.satchel) {
      const f = this.press(id);
      if (f) out.push(f);
    }
    this.satchel.clear();
    this.save();
    return out;
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
    if (this.done.size >= CHAPTERS.length) this.note(`d:${this.log.filter((x) => x.startsWith('d:')).length + 1}`);
    this.done.clear();
    this.save();
  }
}
