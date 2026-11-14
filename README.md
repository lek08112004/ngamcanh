# Aurora Vale — Đêm cắm trại dưới cực quang

Một chuyến cắm trại yên bình ở phương Bắc, chạy hoàn toàn trong trình duyệt. **Buổi sáng**, sườn đồi là vườn tulip trồng theo luống màu dưới nắng sớm. **Ban đêm**, hoa khép cánh, Ngân Hà hiện ra và cực quang kéo màn. Đây là một thế giới nhỏ để đi bộ tự do: lều và lửa trại, nhà gỗ mái cỏ, luống tulip, vườn bách hoa (hồng, oải hương, hướng dương, cúc, anh đào), dòng suối và những ngọn đồi có cột mốc để tìm tới. Có la bàn, sổ hành trình, một mạch truyện nhỏ “Một ngày ở trại”, sổ tay thiên văn kể chuyện từng chòm sao, một trò chơi nhỏ dệt chòm sao, và có thể rủ bạn bè vào đi cùng. Không có thua, không có giờ.

- 100% tĩnh, phía client: HTML + CSS + ES Modules, **không cần build, không cần backend**.
- Toàn bộ hình ảnh sinh bằng shader và hình học thủ tục — không có file ảnh nào.
- Toàn bộ âm thanh tổng hợp bằng Web Audio API — không có file âm thanh nào.
- Phụ thuộc: Three.js `0.160.0`, nạp qua Import Map từ unpkg; PeerJS chỉ được tải khi bạn bật “Đi cùng bạn”.

## Chạy thử trên máy

ES Modules không chạy được qua `file://`, nên cần một máy chủ tĩnh bất kỳ:

```bash
python -m http.server 8000     # hoặc: npx serve .
```

Mở <http://localhost:8000>.

## Bản đang chạy

<https://ngamcanh.pages.dev> — lưu trữ trên Cloudflare Pages (miễn phí). Trang nằm trên hạ tầng của Cloudflare, không liên quan tới máy hay địa chỉ IP của người phát hành.

Đưa bản mới lên sau khi sửa (cần `wrangler login` một lần):

```bash
npx wrangler pages deploy . --project-name ngamcanh --branch main
```

File `_headers` đặt vài header bảo mật cho Cloudflare Pages.

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

### Một ngày ở trại

Góc trên bên trái có một tấm thẻ nhỏ gợi ý việc tiếp theo. Mười lăm trang, từ sáng tới đêm: đi một vòng quanh trại, thêm củi, xuống luống tulip, cúi xem một bông hoa, sang vườn bách hoa, ngồi dưới anh đào, lội suối, lên đồi nhìn lại, chờ đêm xuống, tắt đèn lều, nằm ngắm trời, gọi tên một chòm sao, nghe chuyện kể, đón một vệt sao băng, chụp một tấm ảnh.

- Trang được lật khi bạn thật sự làm việc đó; làm theo thứ tự nào cũng được, bỏ qua cũng không sao.
- **Gọi tên chòm sao:** ban đêm, giữ một chòm sao ở giữa khung nhìn khoảng hai giây là trang ghi nhận bạn đã nhận ra nó (bật lớp “Chòm sao” nếu cần gợi ý). Cả bảy chòm đều ghi được, và được đánh dấu trong Sổ tay.
- Mọi trang đã lật nằm trong Sổ tay (`J`), kèm một dòng ghi nhớ. Ở đó cũng có nút bắt đầu lại một ngày mới.
- Thẻ thu gọn được bằng mũi tên ở góc thẻ. Tiến trình lưu trong `localStorage`.

### Bốn mùa và một ngày trôi liền mạch

Thời gian tự trôi từ lúc bạn mở trang, bắt đầu ở đúng giờ thật của bạn: bình minh, sáng, trưa, chiều, hoàng hôn rồi đêm, một vòng mười sáu phút, và mỗi bình minh là một mùa mới. Đồng hồ ở thanh nhanh cho biết giờ trong thung lũng; bấm vào nó (hoặc phím `N`) để tua tới buổi sáng, hoàng hôn hay ban đêm kế tiếp. Trong bảng Tuỳ chỉnh có thanh trượt giờ, nút cho thời gian đứng yên, và hàng **Mùa**.

| Mùa | Hoa chủ đạo | Thung lũng |
| --- | --- | --- |
| Xuân | **Tulip** và **thuỷ tiên vàng** thành luống trước trại | Anh đào nở, cỏ non |
| Hạ | **Hướng dương** cả ruộng trong vườn; oải hương tím xen **anh túc đỏ** trước trại | Lá anh đào xanh, cỏ sẫm |
| Thu | **Cúc hoạ mi**, **hoa cánh bướm** và **cúc vàng** trước trại | Lá anh đào đỏ cam, cỏ và rừng ngả vàng |
| Đông | **Hoa trà** đỏ giữa vườn, **hoa giọt tuyết** nhú qua tuyết trước trại | Tuyết phủ, tuyết rơi, cành trơ trụi |

- Hoa không rải lung tung: các luống trước trại được trồng lại theo mùa trên cùng những hàng thẳng; trong vườn là vòng hồng quanh cây anh đào, hai dải hồng bên cổng, khối oải hương, ruộng hướng dương, và cúc viền theo lối đi.
- **Hoàng hôn:** mặt trời xuống sau dãy núi tây bắc, trời cam tím, bóng đổ dài; khi mặt trời khuất sau núi, thung lũng chìm vào bóng râm còn đỉnh núi vẫn bắt nắng.
- **Sổ hoa:** mười hai loài. Gặp loài nào, Sổ tay mở thêm chuyện của loài đó; mỗi chòm sao cũng có chuyện riêng.
- Mùa đang chọn được ghi nhớ. Thử nhanh bằng địa chỉ: `?season=autumn&time=dusk` hoặc `?hour=17.5` (khi đó đồng hồ đứng yên).

### Dạo vườn và Sổ hoa

- **Dạo vườn** (nút trên thanh nhanh, hoặc phím `V`): máy quay tự thong thả đi một vòng qua luống tulip, cổng hoa hồng, vòng hồng, hàng oải hương và ruộng hướng dương, thỉnh thoảng dừng lại nhìn hoa. Bấm phím bất kỳ, kéo chuột hoặc cuộn là bạn tự đi tiếp từ đúng chỗ đang đứng.
- **Sổ hoa**: buổi sáng, đứng yên giữa một loài hoa vài giây là loài đó được ép vào Sổ tay kèm vài dòng về nó. Có bảy loài, mỗi loài nở vào mùa của nó: tulip và anh đào (xuân), hướng dương và oải hương (hạ), cúc hoạ mi (thu), hoa trà (đông), hoa hồng (xuân tới thu). Với anh đào, đứng dưới tán và ngước lên.
- Ban ngày có bướm bay trên các luống hoa và thỉnh thoảng đậu lại.

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

`W A S D` đi bộ · `Shift` chạy · `M` đổi Ngắm sao / Trò dệt sao · `V` dạo vườn · `H` ẩn giao diện · `O` âm thanh · `B` bảng tuỳ chỉnh · `G` vẫy tay · `F` toàn màn hình · `N` sáng/đêm · `P` chụp ảnh · `J` sổ tay · `T` tự lia máy · `C` chòm sao · `1`–`5` sắc trời · `Space` thêm củi · `Enter` bắt đầu.

## Chất lượng hình ảnh

- Cực quang được lọc trơn bằng giải tích (rèm tự nới rộng theo khoảng cách giữa các lát dựng) nên không cần nhiễu hạt để che dải màu; hạt phim gần như bằng không.
- **Ba mức chất lượng** (Thấp / Vừa / Cao), tự chọn theo máy: màn cảm ứng và máy dựng hình bằng phần mềm dùng mức Thấp, card tích hợp dùng mức Vừa, card rời dùng mức Cao. Đổi tay trong bảng Tuỳ chỉnh (trang tải lại), hoặc thêm `&q=low|medium|high` vào địa chỉ. Mức Thấp tắt khử răng cưa, bóng đổ, xoá phông, chi tiết nổi của mặt đất và mô hình hoa cận cảnh, giảm cỏ và hoa còn khoảng một phần tư.
- Ở chế độ Tự động, nếu khung hình tụt dưới ~48 FPS trang lần lượt bớt: lát dựng cực quang → xoá phông → mật độ cỏ → mật độ hoa → cuối cùng mới tới độ phân giải (trên máy tính không xuống dưới độ phân giải gốc).
- **Núi là địa hình 3D thật** bao quanh thung lũng. Pháp tuyến mượt, chỗ trũng và bóng nắng của cả dãy được tính một lần lúc tải trang rồi chỉ tra cứu, nên vách núi không lộ mặt đa giác. Vỉa đá, khe rãnh, vành rừng và tuyết đọng tự mờ đi khi nhỏ hơn một điểm ảnh, không lấp lánh ở xa.
- **Đồng cỏ** có ba lớp lá cỏ lồng nhau đi theo người (mịn và dày dưới chân, lớp chính, búi thưa ra tới chân đồi). Mặt đất và từng lá cỏ dùng chung một hàm màu nên không có đường ranh “hết cỏ”. Có đá lộ thiên, gân đất, luống đất giữa các hàng tulip và bờ sỏi ven suối.
- **Bóng nắng thật** từ nhà gỗ, lều, hàng rào, đá, cây và từng bông hoa (mức Vừa và Cao). Mặt trời buổi sáng đứng yên nên bản đồ bóng chỉ dựng một lần lúc tải trang, không tốn thêm gì mỗi khung hình. Cỏ không đổ bóng. Thêm bóng mây trôi trên đồng cỏ và sườn núi.
- **Hoa**: tulip là sáu cánh xếp chồng khép thành chén, có đốm nhạt ở gốc cánh, gân mảnh, ánh sa-tanh và hạt sương buổi sáng; hoa hồng mọc thành bụi, mỗi bông ba mươi cánh xếp xoắn ốc quanh một nụ cuộn; hướng dương có lá bắc, hai vòng cánh và đĩa hạt xếp theo hai họ đường xoắn ốc 21 và 34. Viền cánh được cắt theo từng điểm ảnh. Trong bán kính 7 m quanh bạn, tulip, hồng và hướng dương đổi sang mô hình cận cảnh nhiều chi tiết hơn (mức Vừa và Cao).
- **Ống kính tự lấy nét** vào chỗ bạn đang nhìn: nhìn ra thung lũng thì tiền cảnh mờ nhẹ cho có chiều sâu; cúi xuống một bông hoa thì chính bông hoa nét. Tắt bằng `&lens=0`; máy cảm ứng mặc định tắt.
- **Suối** phản chiếu trời theo góc nhìn, nhìn xuống thấy đáy sỏi đổi màu theo độ sâu, có vệt nắng và viền bọt.
- Nhà gỗ, lều và tảng đá dùng vân vẽ bằng canvas lúc tải trang (gỗ, vòng năm, đá xếp, vải bạt), không phải file ảnh.
- Dựng ở **độ phân giải gốc của màn hình**, tối đa pixel ratio 2, khử răng cưa MSAA 4× ở mức Cao.
- Muốn chỉnh tay, sửa bảng `TIERS` ở đầu `js/main.js`.

## Cấu trúc

```
index.html              Khung trang, import map, HUD kính mờ, thẻ “Một ngày ở trại”, khay ngắm cảnh, sổ tay
css/style.css           Giao diện đáp ứng, glassmorphism, các chế độ
js/main.js              Renderer, mức chất lượng, camera và đi bộ, sáng/đêm, sắc trời, sao băng, lửa trại,
                        la bàn, mạch truyện, bạn đồng hành, lấy nét, hậu kỳ, vòng lặp
js/world.js             Địa hình, núi và bản đồ ánh sáng nướng sẵn, nhà gỗ, hàng rào, đá, ba lớp cỏ, khu trại
js/layout.js            Toạ độ các công trình (nhà, trại, vườn), dùng chung cho JS và shader
js/flora.js             Luống tulip và vườn bách hoa: hồng, oải hương, hướng dương, cúc, cổng hoa, anh đào
js/story.js             Mười lăm trang của “Một ngày ở trại”, Sổ hoa
js/seasons.js           Lịch và đồng hồ: bốn mùa, giờ trong ngày, hoa nào mọc mùa nào
js/store.js             Lưu trữ: một tài liệu có phiên bản trong trình duyệt, sao lưu và khôi phục
js/net.js               Đi cùng bạn: phòng ngang hàng qua WebRTC (PeerJS), chỉ chạy khi người dùng bật
js/lore.js              Nội dung sổ tay thiên văn (nguồn gốc, sao đáng chú ý, cách tìm)
js/game.js              Trò dệt chòm sao: bụi sao, bão, điều ước, mạch dệt, lưu tiến trình
js/audio.js             Bộ tổng hợp: gió, lửa, pad, chuông, tiếng chim, bước chân, suối
js/shaders/common.js    Hash, value noise, fbm, mặt nạ mây thấp
js/shaders/sky.js       Vòm trời ngày và đêm, sao, mây, sao băng, xoay thiên cầu
js/shaders/milkyway.js  Dải Ngân Hà, dải bụi, tinh vân, lớp sao thủ tục
js/shaders/aurora.js    Cực quang thể tích, màu và nhịp điều khiển bằng uniform
js/shaders/terrain.js   Mặt đất, hàm màu đồng cỏ dùng chung, đá lộ thiên, luống đất, bờ suối
js/shaders/water.js     Mặt suối: gợn sóng, fresnel, đáy sỏi, vệt nắng
js/shaders/grass.js     Cỏ instanced nhiều lớp, đom đóm — gió thổi trong vertex shader
js/shaders/tulip.js     Shader hoa (cánh có UV, gân, ánh sáng xuyên cánh, sương) và thẻ chùm hoa/lá
js/shaders/light.js     Bóng nắng (shadow map tĩnh) và bóng mây dùng chung
js/shaders/fire.js      Ngọn lửa trại, tàn lửa, khói
js/shaders/mountains.js Núi: đá, rừng, tuyết, chi tiết theo khoảng cách
js/shaders/post.js      Chỉnh màu cuối, xoá phông, sprite phát sáng của game
tools/                  Công cụ cho người phát triển (không cần cho người chơi)
```

## Công cụ kiểm tra (cho người phát triển)

Chạy máy chủ tĩnh ở cổng 8765 rồi:

```bash
bash tools/shot.sh out.png "auto=zen&time=day&q=high" 1920,1080   # chụp ảnh qua Chrome headless
node tools/check.mjs walk     # bấm phím thật: đi, lách ngang, chạy, vướng tảng đá
node tools/check.mjs story    # các trang của “Một ngày ở trại”
node tools/check.mjs party    # hai trình duyệt gặp nhau trong một phòng (cần mạng)
node tools/check.mjs audio    # đo mức và phổ của từng lớp âm thanh
node tools/check.mjs fps      # đo khung hình trên card đồ hoạ
node tools/syntax.mjs         # kiểm tra cú pháp mọi module (hoặc: npm run check)
```

Cần Node 22 trở lên và Chrome; không phải cài thêm gói nào.

## Tham số URL để thử nghiệm

- `?auto=play` · `?auto=view` · `?auto=zen` — bỏ qua màn hình chào (âm thanh chỉ bật sau lần chạm đầu tiên, do chính sách trình duyệt).
- `&time=day|dusk|night` — buổi sáng, hoàng hôn hoặc ban đêm · `&season=spring|summer|autumn|winter` — mùa · `&spot=hill|fire|lie|tulip|garden|bench` — chỗ ngồi · `&cons=1` — bật lớp chòm sao.
- `&x=…&z=…&eye=…` — đứng ở bất kỳ đâu (mét; `eye` là độ cao mắt) · `&yaw=10&pitch=34&fov=40` — góc nhìn ban đầu.
- `&mood=emerald|rose|ice|storm|still` — sắc trời · `&t=120` — thời điểm của cực quang · `&sky=40` — góc xoay bầu trời (độ).
- `&q=low|medium|high` — mức chất lượng · `&lens=0` — tắt xoá phông.
- `&ghost=3` — thả vài bạn đồng hành giả để xem hình (không dùng mạng) · `&debug=1` — mở trạng thái trang cho công cụ kiểm tra.

## Ghi chú

- Cần trình duyệt có WebGL 2 và Import Map (Chrome/Edge 89+, Firefox 108+, Safari 16.4+).
- Three.js tải từ CDN nên lần mở đầu tiên cần có mạng. Muốn chạy ngoại tuyến, tải `three.module.js` và thư mục `examples/jsm` về rồi sửa import map trong `index.html`.

## Dữ liệu của bạn

Trang không có máy chủ nên “cơ sở dữ liệu” nằm ngay trong trình duyệt: một tài liệu JSON có phiên bản, lưu qua `js/store.js` (cài đặt, hành trình, các trang đã lật, sổ hoa, kỷ lục trò dệt sao). Cuối Sổ tay có ba nút: **Lưu ra file** (sao lưu), **Khôi phục từ file** (mang sang máy hoặc trình duyệt khác) và **Xoá tiến trình**. Dữ liệu đọc vào luôn được kiểm tra theo lược đồ; file lạ bị từ chối.

## Quyền riêng tư

- Trang không có máy chủ riêng, không tài khoản, không cookie theo dõi, không phân tích truy cập.
- Kỷ lục, hành trình, các trang đã lật và tên hiển thị chỉ lưu trong `localStorage` của trình duyệt.
- Thư viện đồ hoạ tải từ unpkg.com. Như mọi trang web, máy chủ lưu trữ và CDN thấy địa chỉ IP của người truy cập.
- **Đi cùng bạn** chỉ hoạt động khi bạn bấm mở hoặc vào phòng. Khi đó trang tải PeerJS từ esm.sh và dùng máy chủ môi giới công cộng của PeerJS để các trình duyệt tìm nhau, rồi kết nối trực tiếp bằng WebRTC. Dữ liệu trao đổi: tên bạn nhập, vị trí và hướng nhìn trong thung lũng, vài sự kiện (vẫy tay, thêm củi, sáng/đêm). Người cùng phòng có thể biết địa chỉ IP của nhau, nên chỉ gửi mã phòng cho người bạn tin tưởng. Mọi dữ liệu nhận về đều được kiểm tra kiểu, giới hạn giá trị và lọc ký tự trước khi dùng.

## Về nội dung thiên văn

Các đoạn trong sổ tay là kiến thức phổ thông về thiên văn và thần thoại, chưa được đối chiếu từng câu với nguồn. Khoảng cách tới sao là số làm tròn; với các sao siêu khổng lồ (Betelgeuse, Deneb, Antares) sai số đo còn lớn. Vị trí các chòm trên màn hình được sắp cho vừa khung nhìn — hình dạng từng chòm đúng theo toạ độ thật, nhưng vị trí tương đối giữa các chòm thì không.
