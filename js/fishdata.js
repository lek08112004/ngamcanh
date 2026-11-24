// The fish of Aurora Vale, and a few more for reference. Data only (no three.js here).
//
// Where the valley's list comes from: Aurora Vale is invented, but its waters are modelled on a
// real place at the same latitude, Enontekiö in Finnish Lapland (about 68.4°N). The University of
// Oulu's "Northern nature" pages list eighteen fish species living in Enontekiö's waters, citing
// Järvinen & Lahti (2004, Suurtuntureiden luonto, p. 152). Those eighteen are the fish you can
// catch here (VALLEY). Eight more European or introduced species are kept as reference pages only
// (EXTRA): they are not in that list, and the game does not pretend they live in the pond.
//
// Sizes, weights, environment and IUCN status were read from each species' FishBase summary page
// (www.fishbase.se, read November 2026). "max" is FishBase's maximum length, with its measure
// (TL total, SL standard, FL fork length); "common" is its common length where it gives one.
// The text of each page here is our own short summary, not a copy of any source.
//
// What is a game rule and not biology: where in the valley a species bites (spots), the weights,
// the hours and seasons that favour it, and the size range a caught fish is drawn from (sizeRange,
// kept within FishBase's figures but smaller, for a small stream and pond). The UI marks these
// "Trong Aurora Vale".

export const FISH_SOURCES = {
  oulu: { title: 'University of Oulu, Northern nature: Fish (danh sách 18 loài ở Enontekiö, theo Järvinen & Lahti 2004)', url: 'https://www.oulu.fi/northnature/english/englanti/elaimetkal.html' },
  fishbase: { title: 'FishBase (Froese & Pauly, chủ biên), trang tóm tắt từng loài', url: 'https://www.fishbase.se' },
};
const fb = (genus, species) => `https://www.fishbase.se/summary/${genus}-${species}.html`;

/* ---------------------------------------------------------------- where you fish (game rules) */
// Three places on the existing water (see world.js streamX/streamW): the riffle where the stream
// runs shallow and quick, the slower pool above the pond, and the pond itself (the stream widening
// out). `stand` is where you stand on the bank, `face` where you look, `reach` the longest cast.
export const SPOTS = [
  { id: 'riffle', name: 'Ghềnh suối', note: 'Nước nông chảy xiết trên nền sỏi, lạnh và nhiều ôxy.', z: -60, side: 1, reach: 7 },
  { id: 'pool', name: 'Vực suối', note: 'Dòng chậm lại, sâu hơn, trước khi đổ vào ao.', z: -80, side: 1, reach: 8 },
  { id: 'pond', name: 'Ao lặng', note: 'Chỗ dòng suối loang rộng thành ao, mép có cỏ nước.', z: -97, side: 1, reach: 11 },
];

/* ---------------------------------------------------------------- the eighteen of the valley */
// shape: see fishmodel.js (fam = body family; the other numbers are proportions of total length)
// look: colours (hex) and the pattern drawn on the body's texture
// bite: game rules. spots: weight per spot; part: weights for dawn/day/dusk/night; season: spring,
// summer, autumn (the water is frozen in winter: there is no ice fishing in this version)
export const FISH = [
  {
    id: 'pike', vi: 'Cá chó phương Bắc', en: 'Northern pike', sci: 'Esox lucius', family: 'Esocidae · họ cá chó',
    url: fb('Esox', 'lucius'), max: '137 cm FL (đực); 150 cm TL (cái)', common: '40 cm TL (đực), 55 cm TL (cái)', weight: '28,4 kg', iucn: 'Ít quan ngại (LC, 2022)',
    env: 'Nước ngọt, nước lợ', habitat: ['pond', 'pool'],
    id_: ['Thân dài như mũi tên, mõm dẹt rộng như mỏ vịt.', 'Vây lưng và vây hậu môn lùi hẳn về gần đuôi, đối diện nhau.', 'Lưng xanh ô liu, hai bên có những đốm sáng hình hạt đậu xếp hàng.'],
    range: 'Rộng khắp vùng nước ngọt ôn đới và cận Bắc Cực của châu Âu, châu Á và Bắc Mỹ.',
    about: 'Kẻ săn mồi phục kích: nằm im giữa đám cỏ nước rồi lao ra bằng một cú quẫy đuôi. Cá lớn ăn chủ yếu cá khác, thỉnh thoảng cả ếch; FishBase ghi nhận cá chó lớn ăn cả đồng loại nhỏ hơn.',
    shape: { fam: 'pike', depth: 0.15, width: 0.12 }, look: { back: '#3d4a26', side: '#7d8a4a', belly: '#e9e2c4', fin: '#8a5a32', pat: 'pike' },
    bite: { spots: { pond: 3, pool: 0.6 }, part: [1.4, 0.8, 1.5, 0.3], season: [1, 0.8, 1.3] }, sizeRange: [30, 85],
  },
  {
    id: 'whitef', vi: 'Cá trắng châu Âu', en: 'European whitefish', sci: 'Coregonus lavaretus', family: 'Salmonidae · họ cá hồi (phân họ cá trắng)',
    url: fb('Coregonus', 'lavaretus'), max: '73 cm TL', common: '—', weight: '10 kg', iucn: 'Sắp nguy cấp (VU, 2023, toàn cầu)',
    env: 'Nước ngọt, nước lợ', habitat: ['pond', 'pool'],
    id_: ['Đầu nhỏ, miệng nhỏ nằm hơi dưới mõm.', 'Thân bạc, vảy lớn, có vây mỡ nhỏ trên lưng gần đuôi.', 'Đuôi chẻ sâu.'],
    range: 'Hồ và vùng cửa sông ở bắc và trung châu Âu; có rất nhiều dạng địa phương khác nhau.',
    about: 'Một loài cá hồi không có đốm, sống thành đàn. Ở hồ, nhiều quần thể ăn động vật phù du; ở nước lợ ăn giáp xác đáy. Đẻ trứng trên nền sỏi chỗ nước nông.',
    shape: { fam: 'coregonid', depth: 0.24, width: 0.11 }, look: { back: '#5d6f78', side: '#cfd6d8', belly: '#f2f2ee', fin: '#7a8186', pat: 'silver' },
    bite: { spots: { pond: 2, pool: 1 }, part: [1.2, 1, 1.2, 0.6], season: [0.8, 0.9, 1.4] }, sizeRange: [20, 45],
  },
  {
    id: 'cisco', vi: 'Cá trắng nhỏ (vendace)', en: 'Vendace, European cisco', sci: 'Coregonus albula', family: 'Salmonidae · họ cá hồi (phân họ cá trắng)',
    url: fb('Coregonus', 'albula'), max: '48 cm TL', common: '20 cm TL', weight: '1 kg', iucn: 'Ít quan ngại (LC, 2023)',
    env: 'Nước ngọt, nước lợ, biển', habitat: ['pond'],
    id_: ['Thân thon, bạc sáng, lưng xanh lục đậm.', 'Hàm dưới nhô ra trước hàm trên (miệng hướng lên).', 'Có vây mỡ, đuôi chẻ.'],
    range: 'Hồ sâu ở bắc châu Âu và lưu vực biển Baltic.',
    about: 'Bơi thành đàn ngoài vùng nước mở và ăn giáp xác phù du. Mùa thu kéo vào gần bờ đẻ trứng trên cát hoặc sỏi nông.',
    shape: { fam: 'coregonid', depth: 0.19, width: 0.09, upjaw: 1 }, look: { back: '#35584f', side: '#d8dfdc', belly: '#f6f6f2', fin: '#9aa3a2', pat: 'silver' },
    bite: { spots: { pond: 1.2 }, part: [0.8, 0.4, 1.2, 1.3], season: [0.3, 0.4, 2.2] }, sizeRange: [12, 25],
    note: 'Trong Aurora Vale: chỉ cắn câu ở ao, chủ yếu mùa thu khi vào gần bờ. Ngoài đời cá vendace hiếm khi ăn mồi câu.',
  },
  {
    id: 'trout', vi: 'Cá hồi nâu', en: 'Brown trout', sci: 'Salmo trutta', family: 'Salmonidae · họ cá hồi',
    url: fb('Salmo', 'trutta'), max: '140 cm SL', common: '72 cm TL', weight: '50 kg', iucn: 'Ít quan ngại (LC, 2022)',
    env: 'Nước ngọt, nước lợ, biển', habitat: ['riffle', 'pool'],
    id_: ['Đốm đen và đốm đỏ có quầng nhạt hai bên thân.', 'Vây mỡ thường viền cam hoặc đỏ.', 'Đuôi gần như cụt, không chẻ sâu.'],
    range: 'Gốc ở châu Âu, Bắc Phi và tây Á; đã được thả ra nhiều nơi khác trên thế giới.',
    about: 'Cùng một loài mà sống theo ba kiểu: ở suối (thường nhỏ), ở hồ, và di cư ra biển rồi trở về sông đẻ trứng. Cá nhỏ ăn côn trùng; cá lớn ăn thêm ốc, giáp xác và cá nhỏ.',
    shape: { fam: 'salmonid', depth: 0.23, width: 0.12 }, look: { back: '#5a4a26', side: '#b8964a', belly: '#efe4bf', fin: '#8b6b3a', pat: 'trout' },
    bite: { spots: { riffle: 2.4, pool: 2 }, part: [1.6, 0.7, 1.6, 0.5], season: [1.1, 0.8, 1.2] }, sizeRange: [16, 50],
  },
  {
    id: 'salmon', vi: 'Cá hồi Đại Tây Dương (cá con)', en: 'Atlantic salmon (parr)', sci: 'Salmo salar', family: 'Salmonidae · họ cá hồi',
    url: fb('Salmo', 'salar'), max: '150 cm TL (đực), 120 cm TL (cái)', common: '38 cm TL', weight: '46,8 kg', iucn: 'Sắp bị đe doạ (NT)',
    env: 'Nước ngọt, nước lợ, biển', habitat: ['riffle', 'pool'],
    id_: ['Cá con ("parr") có 8–11 vệt sẫm dọc thân như dấu ngón tay, xen đốm đỏ nhỏ.', 'Đuôi chẻ rõ hơn cá hồi nâu, cuống đuôi thon.', 'Vây ngực dài.'],
    range: 'Các sông đổ ra bắc Đại Tây Dương, biển Baltic và biển Barents.',
    about: 'Đẻ ở sông, cá con sống ở suối vài năm (ở Lapland thường 3–5 năm theo trang của Đại học Oulu) rồi xuôi ra biển lớn lên, sau đó tìm về đúng con sông đã sinh ra để đẻ trứng.',
    shape: { fam: 'salmonid', depth: 0.2, width: 0.11, fork: 0.6 }, look: { back: '#4a5040', side: '#b9b28d', belly: '#ece8d8', fin: '#7c7a62', pat: 'parr' },
    bite: { spots: { riffle: 2, pool: 1 }, part: [1.2, 1, 1.2, 0.4], season: [1, 1.2, 0.8] }, sizeRange: [8, 18],
    note: 'Trong Aurora Vale: chỉ gặp cá con sống ở suối; cá trưởng thành ở ngoài biển. Bắt được thì nhẹ tay thả lại.',
  },
  {
    id: 'char', vi: 'Cá hồi Bắc Cực', en: 'Arctic char', sci: 'Salvelinus alpinus', family: 'Salmonidae · họ cá hồi',
    url: fb('Salvelinus', 'alpinus'), max: '107 cm TL', common: '40 cm TL', weight: '15 kg', iucn: 'Ít quan ngại (LC, 2023)',
    env: 'Nước ngọt, nước lợ, biển', habitat: ['pond'],
    id_: ['Đốm nhạt màu kem hay hồng trên nền sẫm (khác cá hồi nâu: đốm đen).', 'Mép trước vây ngực, vây bụng và vây hậu môn có viền trắng.', 'Bụng đỏ cam rực vào mùa sinh sản.'],
    range: 'Vùng quanh Bắc Cực: hồ lạnh, sâu ở bắc châu Âu, châu Á và Bắc Mỹ; một số quần thể di cư ra biển.',
    about: 'Loài cá nước ngọt sống xa về phương Bắc nhất. Trang của Đại học Oulu ghi rằng ở những hồ cao nhất vùng núi Enontekiö hầu như chỉ còn cá hồi Bắc Cực (và cá hồi cờ) sống nổi.',
    shape: { fam: 'salmonid', depth: 0.22, width: 0.12, fork: 0.35 }, look: { back: '#2f3c3a', side: '#7b6f55', belly: '#d9603a', fin: '#b0553a', pat: 'char' },
    bite: { spots: { pond: 1 }, part: [1.4, 0.4, 1.4, 1], season: [1.2, 0.4, 1.5] }, sizeRange: [20, 48],
    note: 'Trong Aurora Vale: sống ở chỗ sâu và lạnh nhất của ao; ít khi cắn câu giữa trưa hè.',
  },
  {
    id: 'grayl', vi: 'Cá hồi cờ (grayling)', en: 'European grayling', sci: 'Thymallus thymallus', family: 'Salmonidae · họ cá hồi (phân họ cá hồi cờ)',
    url: fb('Thymallus', 'thymallus'), max: '60 cm TL', common: '30 cm TL', weight: '6,7 kg', iucn: 'Ít quan ngại (LC, 2023)',
    env: 'Nước ngọt, nước lợ', habitat: ['riffle', 'pool'],
    id_: ['Vây lưng cao và dài như cánh buồm, có đốm và viền đỏ tím.', 'Miệng nhỏ, thân xám bạc, vài đốm đen ở nửa trước thân.', 'Có vây mỡ, đuôi chẻ.'],
    range: 'Bắc và trung châu Âu, từ Anh tới dãy Ural.',
    about: 'Thích đoạn sông lạnh, nước chảy nhanh và giàu ôxy, sống thành đàn nhỏ. Ăn chủ yếu ấu trùng côn trùng, thêm giun và giáp xác.',
    shape: { fam: 'salmonid', depth: 0.21, width: 0.1, sail: 1, fork: 0.45 }, look: { back: '#3f4a52', side: '#a8b0b2', belly: '#ece9e2', fin: '#6d4a5a', pat: 'grayling' },
    bite: { spots: { riffle: 2.2, pool: 1.4 }, part: [1.3, 1, 1.3, 0.4], season: [0.8, 1.2, 1.2] }, sizeRange: [18, 42],
  },
  {
    id: 'roach', vi: 'Cá roach (cá mắt đỏ)', en: 'Roach', sci: 'Rutilus rutilus', family: 'Leuciscidae · họ cá chép đầm',
    url: fb('Rutilus', 'rutilus'), max: '50,2 cm TL', common: '25 cm TL', weight: '1,8 kg', iucn: 'Ít quan ngại (LC, 2024)',
    env: 'Nước ngọt, nước lợ', habitat: ['pond', 'pool'],
    id_: ['Mắt có tròng đỏ.', 'Vây bụng và vây hậu môn đỏ cam.', 'Mép trước vây lưng thẳng hàng với gốc vây bụng.'],
    range: 'Phần lớn châu Âu và tây Á.',
    about: 'Một trong những loài cá phổ biến nhất ở hồ và sông vùng thấp châu Âu. Ăn tạp: động vật đáy, phù du, thực vật và mùn; đẻ trứng bám vào cây cỏ ngập nước.',
    shape: { fam: 'cyprinid', depth: 0.3, width: 0.11, fork: 0.45 }, look: { back: '#3d5560', side: '#cfd7dc', belly: '#f2f0ea', fin: '#d4572e', pat: 'roach', eye: '#c62a1c' },
    bite: { spots: { pond: 2.2, pool: 1.2 }, part: [1, 1.2, 1.1, 0.4], season: [1.1, 1.2, 0.9] }, sizeRange: [10, 30],
  },
  {
    id: 'dace', vi: 'Cá dace', en: 'Common dace', sci: 'Leuciscus leuciscus', family: 'Leuciscidae · họ cá chép đầm',
    url: fb('Leuciscus', 'leuciscus'), max: '40 cm TL', common: '15 cm TL', weight: '1 kg', iucn: 'Ít quan ngại (LC, 2023)',
    env: 'Nước ngọt, nước lợ', habitat: ['pool', 'riffle'],
    id_: ['Thân thon, bạc sáng, đầu nhỏ, miệng nhỏ.', 'Mép ngoài vây hậu môn lõm vào (ở cá ide thì thẳng).', 'Vây nhạt màu vàng xám.'],
    range: 'Phần lớn châu Âu phía bắc dãy Alps và Pyrenees.',
    about: 'Bơi thành đàn sát mặt nước ở suối và sông, ăn động vật không xương sống nhỏ. Đẻ trứng sớm trên sỏi ở chỗ nước chảy nông.',
    shape: { fam: 'cyprinid', depth: 0.22, width: 0.1, fork: 0.5 }, look: { back: '#4e5e66', side: '#dfe4e2', belly: '#f6f5f0', fin: '#c7bf98', pat: 'silver' },
    bite: { spots: { pool: 1.8, riffle: 1 }, part: [1, 1.2, 1.1, 0.3], season: [1.2, 1.1, 0.8] }, sizeRange: [10, 25],
  },
  {
    id: 'ide', vi: 'Cá ide', en: 'Ide', sci: 'Leuciscus idus', family: 'Leuciscidae · họ cá chép đầm',
    url: fb('Leuciscus', 'idus'), max: '85 cm SL', common: '30 cm TL', weight: '4 kg', iucn: 'Ít quan ngại (LC, 2023)',
    env: 'Nước ngọt, nước lợ', habitat: ['pond', 'pool'],
    id_: ['Thân dày, đầu to và tù, lưng sẫm.', 'Hai bên bạc ánh đồng; vây bụng và vây hậu môn hơi đỏ.', 'Mép vây hậu môn thẳng.'],
    range: 'Châu Âu và Siberia, từ sông Rhine về phía đông.',
    about: 'Sống ở sông lớn vùng thấp và hồ nhiều dinh dưỡng; ngược lên các nhánh sông để đẻ trứng. Cá lớn ăn nhiều cá nhỏ. Dạng màu vàng cam ("orfe") được nuôi làm cá cảnh.',
    shape: { fam: 'cyprinid', depth: 0.27, width: 0.12, fork: 0.4, head: 1.1 }, look: { back: '#33403d', side: '#c4bd9a', belly: '#efebdc', fin: '#c46a46', pat: 'silver' },
    bite: { spots: { pond: 1.4, pool: 1.2 }, part: [1.2, 0.9, 1.3, 0.5], season: [1.2, 1, 0.9] }, sizeRange: [20, 50],
  },
  {
    id: 'minnow', vi: 'Cá tuế châu Âu', en: 'Eurasian minnow', sci: 'Phoxinus phoxinus', family: 'Leuciscidae · họ cá chép đầm',
    url: fb('Phoxinus', 'phoxinus'), max: '14 cm TL', common: '7 cm TL', weight: '—', iucn: 'Ít quan ngại (LC, 2024)',
    env: 'Nước ngọt, nước lợ', habitat: ['riffle', 'pool', 'pond'],
    id_: ['Rất nhỏ, mõm tròn, vảy li ti.', 'Một hàng mảng sẫm chạy dọc hai bên thân.', 'Cá đực mùa sinh sản có bụng đỏ và nốt sừng trên đầu.'],
    range: 'Phần lớn châu Âu và bắc Á.',
    about: 'Bơi thành đàn ở suối và hồ nước lạnh, giàu ôxy. Ăn tảo, mảnh thực vật, động vật nhỏ và côn trùng; đẻ trứng trên sỏi sạch.',
    shape: { fam: 'cyprinid', depth: 0.18, width: 0.1, fork: 0.25, snout: 'round' }, look: { back: '#47503a', side: '#a9a676', belly: '#e9d9b6', fin: '#a39a72', pat: 'minnow' },
    bite: { spots: { riffle: 1.6, pool: 1.2, pond: 0.8 }, part: [1, 1.2, 1, 0.3], season: [1.2, 1.2, 0.9] }, sizeRange: [4, 10],
  },
  {
    id: 'burbot', vi: 'Cá tuyết nước ngọt (burbot)', en: 'Burbot', sci: 'Lota lota', family: 'Lotidae · họ cá tuyết nước ngọt',
    url: fb('Lota', 'lota'), max: '152 cm TL', common: '40 cm TL', weight: '34 kg', iucn: 'Ít quan ngại (LC, 2022)',
    env: 'Nước ngọt, nước lợ', habitat: ['pond', 'pool'],
    id_: ['Một sợi râu duy nhất ở cằm.', 'Vây lưng thứ hai và vây hậu môn dài, thấp, chạy gần tới đuôi tròn.', 'Da trơn, vằn vện nâu vàng như đá cẩm thạch.'],
    range: 'Vùng nước ngọt lạnh quanh Bắc bán cầu, ở châu Âu, châu Á và Bắc Mỹ.',
    about: 'Thành viên duy nhất của họ cá tuyết sống hẳn trong nước ngọt. Hoạt động về đêm; cá nhỏ ăn động vật không xương sống, cá lớn ăn cá. Đẻ trứng giữa mùa đông, theo đàn.',
    shape: { fam: 'burbot', depth: 0.14, width: 0.11 }, look: { back: '#4a3f22', side: '#9a8550', belly: '#e2d8b0', fin: '#6b5a32', pat: 'marble' },
    bite: { spots: { pond: 1.4, pool: 0.8 }, part: [0.6, 0.1, 0.9, 2.6], season: [0.7, 0.4, 1.6] }, sizeRange: [25, 65],
    note: 'Trong Aurora Vale: gần như chỉ cắn câu lúc chạng vạng và ban đêm.',
  },
  {
    id: 'stick3', vi: 'Cá gai ba gai', en: 'Three-spined stickleback', sci: 'Gasterosteus aculeatus', family: 'Gasterosteidae · họ cá gai',
    url: fb('Gasterosteus', 'aculeatus'), max: '11 cm TL', common: '5,1 cm TL', weight: '—', iucn: 'Ít quan ngại (LC, 2022)',
    env: 'Nước ngọt, nước lợ, biển', habitat: ['pond'],
    id_: ['Ba gai trên lưng: hai gai lớn đứng riêng và một gai nhỏ sát vây lưng.', 'Hàng tấm xương dọc hai bên thân, cuống đuôi rất mảnh.', 'Cá đực mùa xuân có họng đỏ và mắt xanh.'],
    range: 'Ven biển và nước ngọt khắp Bắc bán cầu.',
    about: 'Nổi tiếng trong sinh học hành vi: cá đực làm tổ bằng mảnh cây, nhảy "điệu zíc zắc" mời cá cái rồi canh giữ trứng và cá con.',
    shape: { fam: 'stickle', depth: 0.22, width: 0.1, spines: 3 }, look: { back: '#3f5232', side: '#a7ac86', belly: '#d8563a', fin: '#b2b39a', pat: 'stickle' },
    bite: { spots: { pond: 1.2 }, part: [1, 1.2, 1, 0.3], season: [1.6, 1, 0.7] }, sizeRange: [3.5, 7],
  },
  {
    id: 'stick9', vi: 'Cá gai chín gai', en: 'Nine-spined stickleback', sci: 'Pungitius pungitius', family: 'Gasterosteidae · họ cá gai',
    url: fb('Pungitius', 'pungitius'), max: '9 cm TL', common: '6,5 cm', weight: '—', iucn: 'Ít quan ngại (LC, 2022)',
    env: 'Nước ngọt, nước lợ, biển', habitat: ['pond'],
    id_: ['Hàng 7–12 gai nhỏ, ngắn trên lưng.', 'Thân mảnh hơn cá gai ba gai, không có hàng tấm xương lớn.', 'Cá đực mùa sinh sản có họng và gai bụng đen.'],
    range: 'Nước ngọt và nước lợ phía bắc châu Âu, châu Á và Bắc Mỹ.',
    about: 'Thích hồ nông, ao và suối chậm nhiều cây cỏ; ăn động vật nhỏ và ấu trùng côn trùng. Cá đực làm tổ và canh trứng. FishBase lưu ý tên loài này hay bị dùng nhầm cho một loài gần (P. laevis) ở cực tây bắc châu Âu.',
    shape: { fam: 'stickle', depth: 0.17, width: 0.08, spines: 9 }, look: { back: '#3c4530', side: '#8a8a62', belly: '#c9c3a0', fin: '#9a9a80', pat: 'stickle9' },
    bite: { spots: { pond: 1 }, part: [1, 1.2, 1, 0.3], season: [1.4, 1, 0.8] }, sizeRange: [3, 6],
  },
  {
    id: 'perch', vi: 'Cá rô châu Âu', en: 'European perch', sci: 'Perca fluviatilis', family: 'Percidae · họ cá rô',
    url: fb('Perca', 'fluviatilis'), max: '60 cm SL', common: '25 cm TL', weight: '4,8 kg', iucn: 'Ít quan ngại (LC, 2022)',
    env: 'Nước ngọt, nước lợ', habitat: ['pond', 'pool'],
    id_: ['Năm tới bảy vạch sẫm dọc thân trên nền xanh vàng.', 'Hai vây lưng tách rời; vây trước có gai, cuối vây có một đốm đen.', 'Vây bụng và vây hậu môn đỏ cam.'],
    range: 'Phần lớn châu Âu và bắc Á; đã được đưa tới nhiều nơi khác.',
    about: 'Cá con ăn phù du, lớn dần thì ăn động vật đáy và tới khoảng 12 cm thì bắt đầu ăn cá. Trứng được đẻ thành dải dài như ruy băng quấn lên cành cây chìm.',
    shape: { fam: 'perch', depth: 0.3, width: 0.12, hump: 1 }, look: { back: '#38502c', side: '#a7a04c', belly: '#ece4c4', fin: '#d4592c', pat: 'perch' },
    bite: { spots: { pond: 2.6, pool: 1.2 }, part: [1.1, 1.3, 1.1, 0.2], season: [1, 1.2, 1] }, sizeRange: [10, 35],
  },
  {
    id: 'ruffe', vi: 'Cá rô gai (ruffe)', en: 'Ruffe', sci: 'Gymnocephalus cernua', family: 'Percidae · họ cá rô',
    url: fb('Gymnocephalus', 'cernua'), max: '29 cm TL', common: '12 cm TL', weight: '400 g', iucn: 'Ít quan ngại (LC, 2022)',
    env: 'Nước ngọt, nước lợ', habitat: ['pond'],
    id_: ['Hai vây lưng liền nhau thành một, phần trước có gai, có những hàng chấm nhỏ.', 'Mắt to, đầu có các hốc cảm giác lớn.', 'Thân nâu ô liu lốm đốm, da nhiều nhớt.'],
    range: 'Châu Âu phía bắc dãy Alps và Siberia; bị đưa nhầm vào Ngũ Đại Hồ Bắc Mỹ.',
    about: 'Sống gần đáy ở hồ nhiều dinh dưỡng, sông vùng thấp và cửa sông. Ăn phù du, ấu trùng côn trùng, giun và giáp xác nhỏ.',
    shape: { fam: 'perch', depth: 0.26, width: 0.12, fused: 1, eye: 1.4 }, look: { back: '#4a4426', side: '#a28e58', belly: '#e6dcb8', fin: '#9a8a5a', pat: 'ruffe' },
    bite: { spots: { pond: 1.4 }, part: [1, 1, 1.1, 0.6], season: [1, 1.1, 1] }, sizeRange: [7, 16],
  },
  {
    id: 'bullh', vi: 'Cá bống đầu bò', en: 'European bullhead (miller\'s thumb)', sci: 'Cottus gobio', family: 'Cottidae · họ cá đầu bò',
    url: fb('Cottus', 'gobio'), max: '18 cm TL', common: '10 cm TL', weight: '—', iucn: 'Ít quan ngại (LC, 2023)',
    env: 'Nước ngọt, nước lợ', habitat: ['riffle'],
    id_: ['Đầu to, rộng và dẹt; thân không có vảy.', 'Vây ngực rất lớn xoè như quạt.', 'Vây bụng ngắn, thường nhạt màu, không có vằn.'],
    range: 'Phần lớn châu Âu.',
    about: 'Nằm dưới đá ở suối lạnh chảy nhanh và ven hồ nhiều đá, ban đêm mới ra kiếm ăn động vật nhỏ ở đáy. Không có bóng hơi nên luôn ở sát đáy.',
    shape: { fam: 'cottid', depth: 0.18, width: 0.2 }, look: { back: '#4a3c28', side: '#8a7350', belly: '#ddd2b4', fin: '#6e5a3a', pat: 'sculpin' },
    bite: { spots: { riffle: 1.4 }, part: [0.9, 0.5, 1.2, 1.4], season: [1, 1, 1] }, sizeRange: [6, 13],
  },
  {
    id: 'abull', vi: 'Cá bống đầu bò núi', en: 'Alpine bullhead', sci: 'Alpinocottus poecilopus', family: 'Cottidae · họ cá đầu bò',
    url: fb('Cottus', 'poecilopus'), max: '15 cm SL', common: '11,8 cm TL', weight: '—', iucn: 'Ít quan ngại (LC, 2023)',
    env: 'Nước ngọt, nước lợ', habitat: ['riffle'],
    id_: ['Giống cá bống đầu bò nhưng vây bụng dài hơn, có vằn sẫm.', 'Thân mảnh hơn một chút, đốm lớn sẫm màu.', 'Không vảy, đầu dẹt.'],
    range: 'Lưu vực Baltic, nhiều nhất ở bắc Thuỵ Điển và Phần Lan khoảng 64–68°B; rải rác ở trung Âu. FishBase nay xếp loài vào chi Alpinocottus (trước là Cottus poecilopus).',
    about: 'Sống ở suối nhiều đá chảy nhanh và hồ nghèo dinh dưỡng. Ăn tảo, giáp xác, ấu trùng côn trùng, có khi cả trứng và cá bột.',
    shape: { fam: 'cottid', depth: 0.17, width: 0.18, longPelvic: 1 }, look: { back: '#3e3424', side: '#7d6a4c', belly: '#d8ccb0', fin: '#5a4a32', pat: 'sculpin2' },
    bite: { spots: { riffle: 1.2 }, part: [0.9, 0.5, 1.2, 1.4], season: [1, 1, 1] }, sizeRange: [6, 12],
  },
];

/* ---------------------------------------------------------------- reference pages only */
// Not in the Enontekiö list. Kept so the book can show other fish of Finland and Europe (and two
// North American chars stocked into some Lapland lakes, which the Oulu page mentions), clearly
// marked as not living in the valley.
export const EXTRA = [
  {
    id: 'laketr', vi: 'Cá hồi hồ Bắc Mỹ', en: 'Lake trout', sci: 'Salvelinus namaycush', family: 'Salmonidae · họ cá hồi',
    url: fb('Salvelinus', 'namaycush'), max: '150 cm TL', common: '50 cm TL', weight: '32,7 kg', iucn: 'Ít quan ngại (LC, 2020)',
    env: 'Nước ngọt', why: 'Gốc ở Bắc Mỹ. Trang của Đại học Oulu ghi loài này được thả vào một số hồ ở Lapland, ví dụ hồ Inari.',
    id_: ['Đuôi chẻ rất sâu.', 'Đốm nhạt dày đặc trên nền xám xanh, cả trên đầu và vây.'],
    range: 'Hồ lạnh và sâu ở Canada và bắc Hoa Kỳ.',
    about: 'Một loài cá hồi chấm (chi Salvelinus) sống đơn độc ở hồ lạnh; ăn động vật không xương sống và cá, có quần thể ăn phù du. Đẻ trứng vào ban đêm.',
    shape: { fam: 'salmonid', depth: 0.21, width: 0.11, fork: 0.9 }, look: { back: '#3d4a4e', side: '#8e9a94', belly: '#e8e6dc', fin: '#7a8282', pat: 'laketr' },
  },
  {
    id: 'brookt', vi: 'Cá hồi suối Bắc Mỹ', en: 'Brook trout', sci: 'Salvelinus fontinalis', family: 'Salmonidae · họ cá hồi',
    url: fb('Salvelinus', 'fontinalis'), max: '86 cm SL', common: '26,4 cm TL', weight: '8 kg', iucn: 'Ít quan ngại (LC, 2021)',
    env: 'Nước ngọt, nước lợ, biển', why: 'Gốc ở đông Bắc Mỹ, được nuôi thả ở Phần Lan (trang của Đại học Oulu có nhắc); không có trong danh sách cá tự nhiên của Enontekiö.',
    id_: ['Vằn ngoằn ngoèo như giun trên lưng.', 'Đốm đỏ có quầng xanh hai bên thân.', 'Vây dưới có viền trắng rồi một vệt đen.'],
    range: 'Suối, sông và hồ trong, mát ở đông Bắc Mỹ.',
    about: 'Thật ra là một loài cá hồi chấm (Salvelinus), họ hàng gần cá hồi Bắc Cực hơn là cá hồi nâu. Ăn giun, giáp xác, côn trùng, cá và cả lưỡng cư.',
    shape: { fam: 'salmonid', depth: 0.23, width: 0.12, fork: 0.15 }, look: { back: '#2f3a2a', side: '#6d6a48', belly: '#d8763a', fin: '#c0603a', pat: 'brook' },
  },
  {
    id: 'zander', vi: 'Cá zander', en: 'Zander, pikeperch', sci: 'Sander lucioperca', family: 'Percidae · họ cá rô',
    url: fb('Sander', 'lucioperca'), max: '100 cm SL', common: '50 cm TL', weight: '20 kg', iucn: 'Ít quan ngại (LC, 2022)',
    env: 'Nước ngọt, nước lợ', why: 'Sống ở sông lớn nước đục và hồ giàu dinh dưỡng phía nam; không có trong danh sách của Enontekiö.',
    id_: ['Thân dài kiểu cá chó nhưng hai vây lưng tách rời như cá rô.', 'Răng nanh lớn, mắt sáng như thuỷ tinh.', 'Những vệt sẫm ngang lưng, vây lưng có hàng chấm.'],
    range: 'Trung và đông châu Âu, lưu vực biển Baltic, biển Đen, biển Caspi.',
    about: 'Kẻ săn đàn cá nhỏ ở vùng nước mở, đục; mắt thích nghi với ánh sáng yếu. Đẻ trứng vào mùa xuân.',
    shape: { fam: 'perch', depth: 0.2, width: 0.11, long: 1 }, look: { back: '#4a5048', side: '#a8aa98', belly: '#ecebe2', fin: '#8a8a78', pat: 'zander' },
  },
  {
    id: 'bream', vi: 'Cá bream (cá vền châu Âu)', en: 'Common bream', sci: 'Abramis brama', family: 'Leuciscidae · họ cá chép đầm',
    url: fb('Abramis', 'brama'), max: '82 cm TL', common: '25 cm TL', weight: '6 kg', iucn: 'Ít quan ngại (LC, 2023)',
    env: 'Nước ngọt, nước lợ', why: 'Ưa hồ và sông vùng thấp ấm hơn; không có trong danh sách của Enontekiö.',
    id_: ['Thân rất cao và dẹt hai bên, lưng gù.', 'Vây hậu môn rất dài.', 'Cá lớn màu đồng; miệng thò ra được như cái ống.'],
    range: 'Phần lớn châu Âu và tây Á.',
    about: 'Đi thành đàn, sục bùn đáy tìm ấu trùng côn trùng, giáp xác nhỏ, ốc và thực vật. Đẻ trứng ở vùng nước có nhiều cây cỏ.',
    shape: { fam: 'cyprinid', depth: 0.4, width: 0.08, fork: 0.5, longAnal: 1, hump: 1 }, look: { back: '#5a5034', side: '#c2a66a', belly: '#efe4c6', fin: '#7a6c52', pat: 'bronze' },
  },
  {
    id: 'tench', vi: 'Cá tinca (tench)', en: 'Tench', sci: 'Tinca tinca', family: 'Tincidae · họ cá tinca',
    url: fb('Tinca', 'tinca'), max: '70 cm SL', common: '20 cm TL', weight: '7,5 kg', iucn: 'Ít quan ngại (LC, 2022)',
    env: 'Nước ngọt, nước lợ', why: 'Sống ở hồ nông nhiều cây ở phía nam; không có trong danh sách của Enontekiö.',
    id_: ['Thân dày, vảy rất nhỏ nằm sâu trong lớp da nhớt, trông trơn láng.', 'Màu xanh ô liu, mắt đỏ, hai râu nhỏ ở khoé miệng.', 'Các vây tròn, đuôi gần như cụt.'],
    range: 'Phần lớn châu Âu và Siberia; đã được đưa tới nhiều nơi.',
    about: 'Sống ở hồ nông, kênh và nhánh sông nhiều cây cỏ; ăn mùn, động vật đáy và thực vật, cá lớn ăn nhiều ốc.',
    shape: { fam: 'cyprinid', depth: 0.27, width: 0.14, fork: 0.02, roundFins: 1 }, look: { back: '#3c4c24', side: '#7a8a3c', belly: '#d4c488', fin: '#56602e', pat: 'tench', eye: '#b8301e' },
  },
  {
    id: 'crucian', vi: 'Cá diếc châu Âu', en: 'Crucian carp', sci: 'Carassius carassius', family: 'Cyprinidae · họ cá chép',
    url: fb('Carassius', 'carassius'), max: '64 cm TL', common: '15 cm TL', weight: '3 kg', iucn: 'Ít quan ngại (LC, 2023)',
    env: 'Nước ngọt, nước lợ', why: 'Ưa ao nông nhiều cây; không có trong danh sách của Enontekiö.',
    id_: ['Thân cao, tròn, màu đồng vàng.', 'Vây lưng dài, mép ngoài lồi; không có râu.', 'Cá non thường có đốm đen ở gốc đuôi.'],
    range: 'Phần lớn châu Âu, từ Anh tới sông Lena.',
    about: 'Nổi tiếng chịu được nước thiếu ôxy, kể cả mùa đông dưới băng. Kiếm ăn chủ yếu về đêm: phù du, động vật đáy, thực vật, mùn.',
    shape: { fam: 'cyprinid', depth: 0.38, width: 0.12, fork: 0.15, longDorsal: 1 }, look: { back: '#6a5a26', side: '#cfa848', belly: '#efdcaa', fin: '#9a7a3a', pat: 'bronze' },
  },
  {
    id: 'eel', vi: 'Cá chình châu Âu', en: 'European eel', sci: 'Anguilla anguilla', family: 'Anguillidae · họ cá chình',
    url: fb('Anguilla', 'anguilla'), max: '122 cm TL (đực), 133 cm TL (cái)', common: '35 cm TL (đực), 50 cm TL (cái)', weight: '6,6 kg', iucn: 'Cực kỳ nguy cấp (CR, 2018)',
    env: 'Biển, nước lợ, nước ngọt (di cư xuôi biển đẻ trứng)', why: 'Không có trong danh sách của Enontekiö. Là loài cực kỳ nguy cấp: không có chỗ trong một trò chơi câu.',
    id_: ['Thân dài như rắn.', 'Vây lưng, vây đuôi và vây hậu môn nối liền thành một dải.', 'Vây ngực nhỏ, không có vây bụng.'],
    range: 'Sông, hồ và ven biển châu Âu và Bắc Phi; trưởng thành di cư ra biển Sargasso, nơi được cho là chúng đẻ trứng.',
    about: 'Lớn lên nhiều năm ở sông, hồ và ven biển, ăn gần như mọi động vật dưới nước, rồi bơi hàng nghìn km ra biển Sargasso. Nơi đẻ trứng là suy luận từ ấu trùng; chưa ai thấy chúng đẻ ngoài tự nhiên.',
    shape: { fam: 'eel', depth: 0.07, width: 0.06 }, look: { back: '#3a3a22', side: '#8a7d3e', belly: '#d9cc8e', fin: '#4a4426', pat: 'eel' },
  },
  {
    id: 'smelt', vi: 'Cá ốt-me (smelt)', en: 'European smelt', sci: 'Osmerus eperlanus', family: 'Osmeridae · họ cá ốt-me',
    url: fb('Osmerus', 'eperlanus'), max: '45 cm TL', common: '16,5 cm TL', weight: '178 g', iucn: 'Ít quan ngại (LC, 2022)',
    env: 'Biển, nước lợ, nước ngọt', why: 'Sống ven biển và trong hồ lớn; không có trong danh sách của Enontekiö.',
    id_: ['Thân mảnh, gần như trong suốt, có dải bạc dọc thân.', 'Miệng rộng, hàm dưới nhô, có răng.', 'Có vây mỡ như họ cá hồi.'],
    range: 'Ven biển và cửa sông tây bắc châu Âu, biển Baltic, cùng nhiều hồ lớn trong đất liền.',
    about: 'Bơi ở tầng nước giữa gần bờ, ăn tôm và giáp xác nhỏ, cá lớn ăn cá nhỏ. Ngược lên sông và nhánh hồ để đẻ trứng.',
    shape: { fam: 'smelt', depth: 0.16, width: 0.08 }, look: { back: '#7c9494', side: '#dde6e2', belly: '#f2f4f0', fin: '#c8d0cc', pat: 'smelt' },
  },
];

export const ALL_FISH = [...FISH, ...EXTRA];
export const fishById = (id) => ALL_FISH.find((f) => f.id === id);
export const PARTS = ['Bình minh', 'Ban ngày', 'Chạng vạng', 'Ban đêm'];
export const SEASON_VI = ['Xuân', 'Hạ', 'Thu', 'Đông'];

/** which part of the day an hour belongs to, for the bite tables: 0 dawn, 1 day, 2 dusk, 3 night */
export function partOf(hour) {
  if (hour >= 4.5 && hour < 7.5) return 0;
  if (hour >= 7.5 && hour < 17) return 1;
  if (hour >= 17 && hour < 21) return 2;
  return 3;
}

/**
 * pick the fish that takes the bait (game rules). recent: ids of the last few fish, which weigh a
 * little less (so a session wanders through the list) and unseen ones a little more; never a
 * guarantee. Returns { fish, cm } with cm inside the species' sizeRange, skewed toward the small end.
 */
export function drawFish(spotId, season, hour, rnd, recent = [], seen = new Set()) {
  const part = partOf(hour);
  const pool = [];
  let total = 0;
  for (const f of FISH) {
    const s = f.bite.spots[spotId];
    if (!s) continue;
    let w = s * f.bite.part[part] * (f.bite.season[Math.min(season, 2)] || 0);
    const k = recent.indexOf(f.id);
    if (k >= 0) w *= 0.45 + 0.15 * k;          // the most recent weighs least
    if (!seen.has(f.id)) w *= 1.2;
    if (w <= 0) continue;
    pool.push([f, w]); total += w;
  }
  if (!pool.length) return null;
  let r = rnd() * total, fish = pool[pool.length - 1][0];
  for (const [f, w] of pool) { r -= w; if (r <= 0) { fish = f; break; } }
  const [lo, hi] = fish.sizeRange;
  const t = Math.pow(rnd(), 1.6);             // most fish are smallish, a few are big
  const cm = Math.round((lo + (hi - lo) * t) * 10) / 10;
  return { fish, cm };
}
