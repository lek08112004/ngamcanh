# Aurora Vale — Đêm cắm trại dưới cực quang

Một chuyến cắm trại yên bình ở phương Bắc, chạy hoàn toàn trong trình duyệt. **Buổi sáng**, sườn đồi là vườn tulip trồng theo luống màu dưới nắng sớm. **Ban đêm**, hoa khép cánh, Ngân Hà hiện ra và cực quang kéo màn. Đây là một thế giới nhỏ để đi bộ tự do: lều và lửa trại, nhà gỗ mái cỏ, luống tulip, vườn bách hoa (hồng, oải hương, hướng dương, cúc, anh đào), dòng suối và những ngọn đồi có cột mốc để tìm tới. Có la bàn, sổ hành trình, sổ tay thiên văn kể chuyện từng chòm sao, một trò chơi nhỏ dệt chòm sao, và có thể rủ bạn bè vào đi cùng. Không có thua, không có giờ.

- 100% tĩnh, phía client: HTML + CSS + ES Modules, **không cần build, không cần backend**.
- Toàn bộ hình ảnh sinh bằng shader và hình học thủ tục — không có file ảnh nào.
- Toàn bộ âm thanh tổng hợp bằng Web Audio API — không có file âm thanh nào.
- Phụ thuộc duy nhất: Three.js `0.160.0`, nạp qua Import Map từ unpkg.

## Chạy thử trên máy

ES Modules không chạy được qua `file://`, nên cần một máy chủ tĩnh bất kỳ:

```bash
python -m http.server 8000     # hoặc: npx serve .
```

Mở <http://localhost:8000>.

## Đưa lên GitHub Pages

```bash
git init
git add .
git commit -m "Aurora Vale"
git branch -M main
git remote add origin https://github.com/<tên-tài-khoản>/<tên-repo>.git
git push -u origin main
```

Vào **Settings → Pages → Build and deployment**, chọn **Deploy from a branch**, nhánh `main`, thư mục `/ (root)` rồi **Save**. Khoảng một phút sau trang có tại `https://<tên-tài-khoản>.github.io/<tên-repo>/`. Mọi đường dẫn đều tương đối; file `.nojekyll` để Pages phục vụ nguyên trạng.

## Hai cách tận hưởng buổi tối

### Cắm trại và ngắm sao (chế độ chính)

| Thao tác | Kết quả |
| --- | --- |
| `W` `A` `S` `D` hoặc phím mũi tên | Đi bộ tự do theo hướng đang nhìn; giữ `Shift` để chạy. Trên điện thoại có cần điều khiển ở góc trái |
| **La bàn** (trên cùng) | Hướng đang nhìn, kèm mũi tên và khoảng cách tới điểm gần nhất bạn chưa đến |
| **Cột mốc** | 8 điểm để tìm tới: trại, vườn bách hoa, hiên nhà gỗ, luống tulip, bờ suối, ao lặng, đồi phía đông, đồi sau trại. Tới nơi là được ghi vào sổ hành trình |
| **Đi cùng bạn** | Mở phòng, gửi mã 6 ký tự cho bạn bè (tối đa 8 người). Mọi người thấy nhau đi lại, chung sáng/đêm, chung đống lửa; `G` để vẫy tay. Xem mục Quyền riêng tư |
| **Thanh nhanh / Tuỳ chỉnh** (`B`) | Thanh dưới đáy có các nút hay dùng; "Tuỳ chỉnh" mở bảng đầy đủ |
| **Thời điểm** (`N`) | Chuyển giữa Buổi sáng và Ban đêm; trời đổi dần trong vài giây, tulip mở cánh ban ngày và khép lại ban đêm. Lần đầu mở, trang chọn theo giờ trên máy bạn (6h–18h là buổi sáng) |
| **Chỗ ngồi** | Tới thẳng: Đồi trại, Bên lửa, Nằm ngắm trời, Giữa luống tulip, Cổng vườn hoa, Ghế dưới anh đào |
| **Đèn lều** | Bật/tắt đèn trong lều (tắt đi thì trời sao rõ hơn) |
| Kéo chuột / kéo ngón tay | Nhìn quanh đủ 360°, ngước lên tới gần thiên đỉnh |
| Cuộn chuột / chụm hai ngón | Phóng to như kính viễn vọng, hoặc mở rộng góc nhìn |
| **Sắc trời** | Năm sắc cực quang: Lục bảo, Hồng thạch, Băng lam, Bão từ, Tĩnh lặng (cực quang mờ, sao sáng hơn). "Tự đổi" chuyển sắc sau mỗi ~70 giây |
| **Thời gian trôi** | Tua nhanh đêm: cả bầu trời sao xoay quanh sao Bắc Cực, cực quang chuyển nhanh hơn |
| **Tự lia máy** | Máy quay tự chuyển chậm qua 6 góc: toàn cảnh, dọc Ngân Hà, bên lửa trại, ngả lưng nhìn trời, cửa sổ nhà gỗ, dòng suối |
| **Chòm sao** (`C`) | Bật/tắt lớp hình 7 chòm sao kèm nhãn tên (mặc định tắt, chỉ hiện ban đêm). Bấm vào nhãn để đọc về chòm đó |
| **Sổ tay sao** (`J`) | Sổ tay thiên văn: với mỗi chòm có nguồn gốc và truyền thuyết, những ngôi sao đáng chú ý, cách tìm trên trời và mùa quan sát |
| **Chụp ảnh** | Lưu khung hình hiện tại thành PNG đúng độ phân giải đang dựng |
| Nút con mắt / `H` | Chế độ Thiền: ẩn toàn bộ giao diện, máy quay tự lia |
| Bấm đống lửa / nút "+ củi" / `Space` | Thêm củi: lửa bùng lên, sáng ấm cả bãi cỏ, tiếng lách tách dày hơn |

### Trò dệt chòm sao (tuỳ chọn)

Bật bằng nút "Trò dệt sao" hoặc phím `M`. Di chuột (hoặc kéo ngón tay) để dẫn đom đóm.

- **Bụi sao** trôi trên trời. Nhặt được là có năng lượng để thắp sao (tối đa 9).
  - Vàng: bụi thường.
  - Lam (bụi băng): giữ nguyên chuỗi trong 8 giây.
  - Hồng: gọi **bão cực quang** 10 giây — điểm nhân đôi, bụi sao tự bay về phía đom đóm.
- **Thêm củi vào lửa**: tàn lửa bay lên hoá thành bụi sao. Hết bụi thì cứ ra lửa.
- **Thắp sao**: chạm đom đóm vào ngôi sao đang nhấp nháy, tốn 1 bụi sao. Thắp đủ thì chòm sao hoàn thành, cực quang đổi sang sắc mới.
- **Mạch dệt hoàn hảo**: nếu mỗi ngôi sao mới đều nối liền với một ngôi đã sáng (các sao ánh vàng), phần thưởng chòm sao ×1,5.
- **Sao băng**: chạm kịp một ngôi sao băng là được một điều ước — điểm thưởng và đầy túi bụi sao.
- **Chuỗi** giữ được 4,5 giây giữa hai lần ghi điểm; cứ 4 bậc thì hệ số điểm tăng 0,5 (tối đa ×5).
- Bảy chòm dùng toạ độ sao thật (xích kinh / xích vĩ): Bắc Đẩu, Thiên Hậu, Lạp Hộ, Thiên Nga, Thiên Cầm, Sư Tử, Thiên Yết. Xong cả bảy thì sang vòng trời mới với thưởng cao hơn.
- Chòm đã dệt được đánh dấu ✦ trong sổ tay. Tiến trình lưu trong `localStorage`. Trò chơi luôn diễn ra ban đêm.

### Phím tắt

`W A S D` đi bộ · `Shift` chạy · `M` đổi Ngắm sao / Trò dệt sao · `H` ẩn giao diện · `O` âm thanh · `B` bảng tuỳ chỉnh · `G` vẫy tay · `F` toàn màn hình · `N` sáng/đêm · `P` chụp ảnh · `J` sổ tay · `T` tự lia máy · `C` chòm sao · `1`–`5` sắc trời · `Space` thêm củi · `Enter` bắt đầu.

## Chất lượng hình ảnh

- Cực quang được lọc trơn bằng giải tích (rèm tự nới rộng theo khoảng cách giữa các lát dựng) nên không cần nhiễu hạt để che dải màu; hạt phim gần như bằng không.
- Dựng ở **độ phân giải gốc của màn hình** (Full HD trên màn Full HD, kể cả khi Windows đặt tỉ lệ 125–150%), tối đa pixel ratio 2, có khử răng cưa MSAA 4×.
- Khi máy không giữ được ~50 FPS, trang giảm theo thứ tự: số lát dựng cực quang → mật độ cỏ → cuối cùng mới tới độ phân giải, và trên máy tính không bao giờ xuống dưới độ phân giải gốc (tới pixel ratio 1,5).
- Muốn chỉnh tay, sửa bảng `Q` ở đầu `js/main.js` (`steps`, `grass`, `tulips`, `flowers`, `stars`, `flies`, `maxPR`, `minPR`, `msaa`).

## Cấu trúc

```
index.html              Khung trang, import map, HUD kính mờ, khay ngắm cảnh, sổ tay
css/style.css           Giao diện đáp ứng, glassmorphism, các chế độ
js/main.js              Renderer, camera (nhìn quanh, zoom, tự lia), sắc trời, thời gian trôi,
                        sao băng, lửa trại, hậu kỳ, vòng lặp, nối UI
js/world.js             Địa hình, núi, nhà gỗ, hàng rào, đá, cỏ, hoa, đom đóm, khu trại
js/layout.js            Toạ độ các công trình (nhà, trại, vườn), dùng chung cho JS và shader
js/flora.js             Vườn bách hoa: hồng, oải hương, hướng dương, cúc, cổng hoa, anh đào, cột mốc
js/net.js               Đi cùng bạn: phòng ngang hàng qua WebRTC (PeerJS), chỉ chạy khi người dùng bật
js/lore.js              Nội dung sổ tay thiên văn (nguồn gốc, sao đáng chú ý, cách tìm)
js/game.js              Trò dệt chòm sao: bụi sao, bão, điều ước, mạch dệt, lưu tiến trình
js/audio.js             Bộ tổng hợp: gió, lửa lách tách, pad, chuông, hiệu ứng game
js/shaders/common.js    Hash, value noise, fbm, mặt nạ mây thấp
js/shaders/sky.js       Vòm trời: nền đêm, sao, mây, sao băng, xoay thiên cầu
js/shaders/milkyway.js  Dải Ngân Hà, dải bụi, tinh vân, lớp sao thủ tục
js/shaders/aurora.js    Cực quang thể tích, màu và nhịp điều khiển bằng uniform
js/shaders/terrain.js   Mặt đất, lối mòn, ánh đèn nhà, ánh lửa trại, lồng dòng suối
js/shaders/water.js     Mặt suối: gợn sóng, fresnel, phản chiếu trời và cực quang
js/shaders/grass.js     Cỏ instanced, hoa dại, đom đóm — gió thổi trong vertex shader
js/shaders/tulip.js     Hoa tulip instanced, mở cánh theo ánh sáng ngày
js/shaders/fire.js      Ngọn lửa trại và tàn lửa
js/shaders/mountains.js Các lớp núi phía chân trời
js/shaders/post.js      Film grain + vignette, sprite phát sáng của game
```

## Tham số URL để thử nghiệm

- `?auto=play` · `?auto=view` · `?auto=zen` — bỏ qua màn hình chào (âm thanh chỉ bật sau lần chạm đầu tiên, do chính sách trình duyệt).
- `&time=day|night` — buổi sáng hoặc ban đêm · `&spot=hill|fire|lie|tulip` — chỗ ngồi · `&cons=1` — bật lớp chòm sao.
- `&mood=emerald|rose|ice|storm|still` — chọn sắc trời.
- `&yaw=10&pitch=34&fov=40` — đặt góc nhìn ban đầu · `&t=120` — thời điểm của cực quang · `&sky=40` — góc xoay bầu trời (độ).

## Ghi chú

- Cần trình duyệt có WebGL 2 và Import Map (Chrome/Edge 89+, Firefox 108+, Safari 16.4+).
- Three.js tải từ CDN nên lần mở đầu tiên cần có mạng. Muốn chạy ngoại tuyến, tải `three.module.js` và thư mục `examples/jsm` về rồi sửa import map trong `index.html`.

## Quyền riêng tư

- Trang không có máy chủ riêng, không tài khoản, không cookie theo dõi, không phân tích truy cập.
- Kỷ lục, hành trình và tên hiển thị chỉ lưu trong `localStorage` của trình duyệt.
- Thư viện đồ hoạ tải từ unpkg.com. Như mọi trang web, máy chủ lưu trữ và CDN thấy địa chỉ IP của người truy cập.
- **Đi cùng bạn** chỉ hoạt động khi bạn bấm mở hoặc vào phòng. Khi đó trang tải PeerJS từ esm.sh và dùng máy chủ môi giới công cộng của PeerJS để các trình duyệt tìm nhau, rồi kết nối trực tiếp bằng WebRTC. Dữ liệu trao đổi: tên bạn nhập, vị trí và hướng nhìn trong thung lũng, vài sự kiện (vẫy tay, thêm củi, sáng/đêm). Người cùng phòng có thể biết địa chỉ IP của nhau, nên chỉ gửi mã phòng cho người bạn tin tưởng. Mọi dữ liệu nhận về đều được kiểm tra kiểu, giới hạn giá trị và lọc ký tự trước khi dùng.

## Về nội dung thiên văn

Các đoạn trong sổ tay là kiến thức phổ thông về thiên văn và thần thoại. Khoảng cách tới sao là số làm tròn; với các sao siêu khổng lồ (Betelgeuse, Deneb, Antares) sai số đo còn lớn. Vị trí các chòm trên màn hình được sắp cho vừa khung nhìn — hình dạng từng chòm đúng theo toạ độ thật, nhưng vị trí tương đối giữa các chòm thì không.
