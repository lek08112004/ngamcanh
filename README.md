# Aurora Vale — Đêm cắm trại dưới cực quang

Một chuyến cắm trại yên bình ở phương Bắc, chạy hoàn toàn trong trình duyệt. **Buổi sáng**, sườn đồi là vườn tulip trồng theo luống màu dưới nắng sớm. **Ban đêm**, hoa khép cánh, Ngân Hà hiện ra và cực quang kéo màn. Đây là một thế giới nhỏ để đi bộ tự do: lều và lửa trại, nhà gỗ mái cỏ (có thể bước vào trong), luống tulip, vườn bách hoa đầy hoa quanh năm (hồng, oải hương, hướng dương, cúc, anh đào), dòng suối và những ngọn đồi có cột mốc để tìm tới. Quanh trại có Bơ — chú chó corgi của trại — và Choco, con mèo vện; mùa đông thêm hai người tuyết, Bấc bên đống lửa và Mầm bên ghế đọc sách. Ghế dưới gốc anh đào có một giá sách bảy cuốn để ngồi đọc. Có la bàn, sổ hành trình, một mạch truyện nhỏ “Một ngày ở trại”, sổ tay thiên văn kể chuyện từng chòm sao, một trò chơi nhỏ dệt chòm sao, và có thể rủ bạn bè vào đi cùng. Không có thua, không có giờ.

- 100% tĩnh, phía client: HTML + CSS + ES Modules, **không cần build**. Tiến trình lưu trong trình duyệt; một bản sao được giữ trên Supabase (người dùng ẩn danh, mỗi người chỉ đọc/ghi được dòng của mình), và trang vẫn chạy đầy đủ khi không có mạng.
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
| **Thanh nhanh** | Năm nút: Giờ & mùa (bảng nhỏ: thanh giờ, mùa, tua tới sáng / hoàng hôn / đêm), Sổ tay, Khám phá (`X`), Bạn bè, Tuỳ chỉnh (`B`). Góc trên phải: âm thanh (bảng nhỏ có âm lượng), toàn màn hình, ẩn giao diện |
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

Thời gian tự trôi từ lúc bạn mở trang, bắt đầu ở đúng giờ thật của bạn: bình minh, sáng, trưa, chiều, hoàng hôn rồi đêm, một vòng mười sáu phút, và mỗi bình minh là một mùa mới. Nút "Giờ & mùa" ở thanh nhanh mở một bảng nhỏ: thanh trượt giờ, nút cho thời gian đứng yên, hàng **Mùa** và ba nút tua tới buổi sáng, hoàng hôn, ban đêm (phím `N` tua tới buổi kế tiếp). Các mục này cũng nằm trong Tuỳ chỉnh → Thế giới.

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

### Nhà gỗ, con vật ở trại, và giá sách

- **Vào nhà gỗ** (hiên nhà, nút "Vào nhà nghỉ · E"): một khoảng tối mờ dần rồi bạn đứng trong phòng — giường, bếp lò có lửa cháy qua cửa kính, bàn có sổ tay và nến, kệ, thảm, ghế bập bênh, ổ nằm của Bơ. Đi lại chậm hơn ngoài trời, không đi xuyên tường hay đồ đạc. Vào nhà đọc được một trang truyện, đồng hồ chuyển sang phần tiếp theo của ngày (qua đêm thì sang mùa mới nếu đồng hồ đang tự trôi). Thoát ra bằng nút "Rời nhà · E" cạnh cửa, hoặc phím `Esc`.
- **Bơ, chú chó corgi**: đi lại tự nhiên quanh trại (giữa lửa và nhà gỗ), tới chào khi bạn đến gần, có thể ngồi, nằm, đi theo một đoạn nếu bạn rời đi lúc nó đang ngồi cạnh. Ban đêm nó nằm cạnh lửa (hoặc hiên nhà nếu lửa tắt); vào nhà gỗ ban đêm nó cũng vào theo, ngủ trên ổ. Đến gần trong 2 m: nút "Vuốt ve corgi · E" — nó mừng, vẫy, có tiếng sủa/thở.
- **Choco, con mèo vện**: có tên nhỏ "🐾 Choco" lơ lửng trên đầu trong cảnh (gần thì rõ, xa thì mờ dần; không hiện khi bị nhà hay đồi che, khi Thiền, và không có trong ảnh chụp; tắt được bằng nút **Tên bạn nhỏ** trong Tuỳ chỉnh). Đứng gần còn có một dòng nhỏ theo đúng việc nó đang làm: *Đang ngủ*, *Lim dim*, *Tò mò*, *Muốn chơi*, *Muốn yên*.
  - **Một ngày của Choco**: sáng ngáp, vươn vai, cào trụ, phơi nắng, ra bát nước; trưa hè chui vào căn chòi nhỏ có rơm bên hông nhà gỗ (mùa đông thì nằm đó cả ngày); chiều đi một vòng quanh trại; chạng vạng tìm Bơ, chạm mũi chào rồi nằm cạnh; đêm ngủ bên lửa cạnh Bơ (mùa đông trên ổ rơm sau lưng Bấc; lửa tắt thì về chòi của nó). Đó là thói quen, không phải lịch cứng: mỗi lần mỗi khác.
  - **Làm gì với Choco**: đứng gần, bấm "Choco · E" mở sáu việc (phím `1`–`6`): **Vuốt ve**, **Chìa tay làm quen** (nó ngửi rồi có thể cọ người quanh chân bạn), **Gọi Choco** (đứng xa cũng gọi được: "Gọi Choco · E"), **Chớp mắt chậm** (nó chớp lại nếu đang thư thái và nhìn bạn), **Lăn cuộn len** (nó quan sát, rình, vồ rồi nằm liếm chân), **Ngồi cùng** (bạn ngồi xuống; đứng dậy bằng nút "Đứng dậy", `Esc` hoặc bước đi). Nút nào chưa làm được thì mờ đi kèm lý do. Khi menu mở bạn hơi cúi xuống và mắt tự hướng về Choco (trước đây con mèo nằm dưới mép màn hình lúc bạn đứng cạnh nó); nó đi lệch khỏi giữa khung thì góc nhìn nhẹ nhàng theo, kéo chuột thì trang nhường bạn. Vuốt ve Bơ cũng quay mắt về phía Bơ.
  - **Choco có quyền từ chối**: vuốt liên tục thì nó quay đầu, phẩy đuôi, rồi đi ra chỗ khác một lát; đang ngủ thì gọi hay vuốt cũng không làm nó dậy. Không có gì bị phạt, không có gì mất đi khi bạn vắng mặt.
  - **Quen dần**: càng làm nhiều việc khác nhau cùng nhau, Choco càng thân: ra chào khi bạn quay lại, cọ chân, có khi đi theo một quãng, tự đi dọc lối sỏi ra ghế đọc sách nằm dưới chân bạn, và vào những đêm yên thì chớp mắt chậm rồi cuộn tròn ngủ ngay cạnh. Bấm mãi một việc không làm nó thân nhanh hơn.
  - **Sổ tay** có mục **Choco**: vài dòng về nó với bạn lúc này (bằng lời, không có điểm số), những thói quen bạn đã tận mắt thấy, và bảy kỷ niệm (Lời chào, Một khoảng nắng, Một cuộc chơi, Bạn của Bơ, Chỗ của Choco, Đọc sách có bạn, Đêm yên), mỗi cái ghi một lần vào Nhật ký trại.
  - Vào nhà gỗ: Choco theo vào nếu đang ở quanh trại (đêm thì ngủ trong ổ mây riêng dưới kệ sách, có hôm chiếm chăn trên ghế bập bênh; ngày nằm trên thảm hay ngồi dưới cửa sổ); nếu nó đang ở tận vườn thì nó ở lại ngoài đó.
- **Bấc** (mùa đông, sau đống lửa) và **Mầm** (mùa đông, cạnh ghế đọc sách dưới anh đào): hai người tuyết, mỗi người có vài lời chào riêng khi đến gần — nút "Chào Bấc · E" / "Chào Mầm · E". Chỉ xuất hiện khi tuyết đã rơi đủ dày trong mùa đông.
- **Giá sách** (ghế dưới gốc anh đào, nút "Ngồi đọc sách · E"): một giá hai tầng, bảy cuốn chia ba nhóm — *Walden* (Thoreau) và *Suy tưởng* (Marcus Aurelius) là trích dịch có đối chiếu nguyên bản tiếng Anh; *Ghi chú bên lửa trại* là một cuốn ghi lại cảm nhận khi đọc các sách khoa học phổ thông thật (Kahneman, Sagan, Hawking, Carson) — không chép lại nội dung sách đó; ba cuốn "riêng của thung lũng" — *Sự tích thung lũng Aurora* (truyền thuyết gốc, không dựa theo thần thoại có thật), *Sổ hoa của thung lũng*, *Trời đêm Aurora Vale* — và *Nhật ký trại*, tự viết theo những gì bạn đã làm. Đọc trang bằng phím mũi tên hoặc `A`/`D`; có nút Mục lục cho sách nhiều chương. Đứng dậy bằng "Gấp sách · E" hoặc `Backspace` về giá, `Esc` để rời hẳn.

### Những việc nhỏ cho thư thả

- **Pha trà bên lửa**: phía nam đống lửa, giữa hai khúc gỗ ngồi, có một chiếc ghế đẩu thấp, một khay gỗ với ấm đất và hai chén, và một ấm nước trên hòn đá phẳng cạnh vòng đá. Đứng gần bấm "Ngồi pha trà · E": bạn ngồi xuống, ấm nước nóng dần (tiếng reo lên cao dần, hơi nước bốc ở vòi), sôi thì rót ra chén (tiếng rót trà), chén bốc khói chừng một phút rưỡi rồi nguội. Trà theo mùa: anh đào, oải hương, hoa cúc, gừng. Bấm "Nhấp một ngụm · E": chén được nâng lên trước mắt, nghiêng về phía bạn, trà vơi một phần tư; bốn ngụm là cạn, trà nguội vẫn uống được. Chén cạn thì "Pha một ấm nữa · E". Lửa tắt thì nước không sôi; thêm củi (`Space`) rồi pha lại. Mỗi mùa ghi một dòng vào Nhật ký trại.
- **Ghế bập bênh bên lò sưởi** (trong nhà gỗ): đứng cạnh ghế bấm "Ngồi ghế bập bênh · E". Ghế tự đưa chậm, ván sàn kẽo kẹt khe khẽ, lửa trong lò tí tách; từ ghế bấm "Đọc sách bên lò · E" để mở giá sách ngay tại chỗ, có ánh lửa lò trên trang giấy. `Esc` đóng sách trước, bấm lần nữa thì đứng dậy. Nếu Choco đang ngủ trên ghế thì bạn để nó ngủ.
- **Ngồi và đứng dậy**: khi đang ngồi (pha trà, ghế bập bênh, "Ngồi cùng" với Choco), nút nhỏ **Đứng dậy · Esc** luôn hiện dưới nút hành động. Ba cách đứng dậy: bấm nút, `Esc`, hoặc bước đi. Đang đọc sách trên ghế bập bênh thì `Esc` gấp sách trước.
- Khi bạn ngồi, Choco tự quyết có lại gần hay không, như mọi khi.
- **Hướng dẫn chơi** nằm ngay trong game: mục đầu của Sổ tay, mở nhanh bằng phím `?`.
- Vào nhà, tiếng gió, suối và chim bên ngoài nhỏ và đục đi như qua một bức tường.

### Câu cá, Bách thư cá, kính thiên văn, thần thoại và Đài mô phỏng

- **Menu "Khám phá thung lũng"** (`X`, hoặc nút Khám phá; `B` mở thẳng Tuỳ chỉnh): một bảng bên phải (trên điện thoại là một tấm gần kín màn hình) với sáu nhóm: **Tổng quan** (gợi ý theo giờ và mùa, có lý do và nút Bỏ qua; các hoạt động chính; "Tiếp tục" chỉ hiện những gì có thật trong sổ: cuốn sách đang đọc, chương thần thoại kế tiếp, số loài cá đã câu, số mục tiêu đã ngắm), **Quanh trại** (dạo vườn, tự lia máy, nhà gỗ, pha trà, đèn lều, các nơi trong thung lũng và các chỗ ngồi), **Câu cá** (ba chỗ câu, loài hay gặp lúc này, kiểu chơi, cách câu từng bước; mùa đông nói vì sao chưa câu được), **Bầu trời** (kính, dệt sao, hình chòm sao, đài mô phỏng, hai tuyến thần thoại với nút Tiếp tục), **Sổ tay** (dẫn tới từng thẻ), **Tuỳ chỉnh** (Thế giới, Hình ảnh, Âm thanh, Điều khiển, Hỗ trợ, Dữ liệu; mỗi nhóm có "Khôi phục nhóm này", không đụng tới tiến trình). Ô tìm kiếm tìm theo tên, nhóm và từ khoá, gõ không dấu được ("ca" ra Câu cá, "kinh" ra Kính thiên văn). "Dẫn đường" chỉ đặt la bàn lên nơi đó; "Tới chỗ ngồi" vẫn đưa máy quay tới chỗ ngồi ngay như trước. Khi menu mở, phím đi bộ và nút trong cảnh tạm ngưng. Hỗ trợ có cỡ chữ giao diện (Vừa / Lớn / Rất lớn) cho máy này.
- **Câu cá** ở ba chỗ: Ghềnh suối, Vực suối, Ao lặng. Quăng (chỉ rơi được xuống nước, trong tầm), chờ phao rỉa rồi chìm, giật, giữ E để thu dây, ngắm cá rồi thả về nước. Kiểu Thư giãn hoặc Thủ công (có độ căng dây). Cá thoát không mất gì; không bán cá, không phần thưởng cày cuốc. Mùa đông nước đóng băng.
- **Bách thư cá**: 18 loài câu được trong thung lũng, đúng danh sách 18 loài sống ở vùng nước Enontekiö (Lapland, ~68°B) của Đại học Oulu (dẫn Järvinen & Lahti 2004), và 8 hồ sơ tham khảo không sống ở đây (ghi rõ vì sao). Kích thước, môi trường, tình trạng IUCN đọc từ FishBase. Mỗi loài có mô hình 3D dựng bằng mã (mười kiểu thân khác nhau), đặc điểm nhận dạng, phân bố, nguồn; chưa câu được thì hình là phác thảo nhưng chữ vẫn đọc được. Quy luật cá cắn câu ở đâu, lúc nào là quy ước của trò chơi, ghi "Trong Aurora Vale".
- **Kính thiên văn** trên đồi sau trại: kính khúc xạ 90 mm f/10, kính tìm 6×30, ba thị kính (36×, 90×, 150×), lấy nét, kiểu Hỗ trợ hoặc Tự ngắm. 11 mục tiêu: Mặt Trăng, Sao Mộc và bốn vệ tinh, Sao Thổ, Sao Hoả, Albireo, Mizar–Alcor, Tua Rua, Cụm sao đôi Perseus, M31, M42, M57. Bầu trời trong kính được **tính** (vị trí quan sát 68,4°B 23,6°Đ; mỗi mùa một đêm mô phỏng; giờ theo đồng hồ thung lũng), khác với bầu trời trang trí của thung lũng. Tinh vân và thiên hà là vệt xám như mắt thật thấy; "Minh hoạ tăng cường" mới thêm màu. Không có cách nào nhìn Mặt Trời.
- **Thần thoại**: hai tuyến Hy Lạp, Perseus và Andromeda (năm chương: Thiên Hậu, Tiên Vương, Kình Ngư, Tiên Nữ, Anh Tiên) và Orion và Bọ Cạp (hai chương). Mỗi chương dệt một chòm, có trang Chuyện kể (ghi dị bản, nguồn cổ điển) tách khỏi Bầu trời thật. Tiến trình trò dệt sao cũ không bị đụng tới.
- **Đài mô phỏng**: Mặt Trời, tám hành tinh, Trái Đất có trục nghiêng và Mặt Trăng; tua thời gian, theo dõi một thiên thể, hai cách hiển thị (Dễ quan sát / Tỷ lệ thực, có ghi rõ). Vị trí tính theo phần tử quỹ đạo của JPL (Standish), không phải lịch thiên văn chính xác. Thoát ra là về đúng chỗ cũ, đồng hồ thung lũng không đổi.

### Thung lũng của bạn

Mục đầu tiên của Sổ tay (`J`):
- **Tên thung lũng**: đặt tên tuỳ thích (tối đa 32 ký tự); tên hiện ở tiêu đề tab và đầu Sổ tay.
- **Góc ngắm yêu thích**: đứng ở chỗ bạn thích, nhìn về phía bạn thích, bấm `K` (hoặc nút trong Sổ tay). Giữ được sáu góc, mỗi góc mang tên chỗ gần nhất; bấm vào để tới đó (màn hình tối nhẹ trong giây lát), bấm "Bỏ" để xoá.
- **Trang trí**: hai chỗ cố định, mỗi chỗ vài kiểu. Hiên nhà gỗ: để trống, dây cờ vải dưới mái, hoặc ba chiếc đèn lồng giấy đỏ tự sáng khi trời tối. Trước cửa lều: để trống, tấm thảm dệt sọc, hoặc hai chậu hoa hai bên cửa. Đồ trang trí có bóng đổ như mọi thứ khác.
- **Đặt lại phần riêng**: bấm hai lần trong 4 giây; chỉ xoá tên thung lũng, góc ngắm, trang trí và những "lần đầu". Nhật ký, sổ hoa, Choco và mọi tiến trình khác giữ nguyên.

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

`W A S D` đi bộ · `Shift` chạy · `M` đổi Ngắm sao / Trò dệt sao · `V` dạo vườn · `H` ẩn giao diện · `O` tắt/bật tiếng · `G` vẫy tay · `F` toàn màn hình · `N` sáng/đêm · `P` chụp ảnh · `J` sổ tay · `T` tự lia máy · `C` chòm sao · `1`–`5` sắc trời · `Space` thêm củi · `E` hành động tại chỗ (vào nhà, vuốt ve Bơ, mở việc với Choco, gọi Choco, chào người tuyết, ngồi đọc, pha trà, ngồi ghế bập bênh, đứng dậy) · `K` lưu góc ngắm · `?` hướng dẫn chơi · `X` menu Khám phá · `B` Tuỳ chỉnh · `1`–`6` khi đang mở việc với Choco · `Esc` thoát việc đang làm · `Enter` bắt đầu. Khi đang đọc sách: `←`/`→` hoặc `A`/`D` lật trang, `Backspace` về giá sách.

## Chất lượng hình ảnh

- Cực quang được lọc trơn bằng giải tích (rèm tự nới rộng theo khoảng cách giữa các lát dựng) nên không cần nhiễu hạt để che dải màu; hạt phim gần như bằng không.
- **Ba mức chất lượng** (Thấp / Vừa / Cao), tự chọn theo máy: màn cảm ứng và máy dựng hình bằng phần mềm dùng mức Thấp, card tích hợp dùng mức Vừa, card rời dùng mức Cao. Đổi tay trong bảng Tuỳ chỉnh (trang tải lại), hoặc thêm `&q=low|medium|high` vào địa chỉ. Mức Thấp tắt khử răng cưa, bóng đổ, xoá phông, chi tiết nổi của mặt đất và mô hình hoa cận cảnh, giảm cỏ và hoa còn khoảng một phần tư.
- Ở chế độ Tự động, trang đo khung hình theo từng quãng 2 giây và quyết định theo trung vị của ba quãng gần nhất; khi chậm thì lần lượt bớt: lát dựng cực quang → xoá phông → mật độ cỏ → mật độ hoa → cuối cùng mới tới độ phân giải (trên máy tính không xuống dưới độ phân giải gốc). Mỗi lần đổi nghỉ 6 giây; khi máy dư sức thì trả lại từng bậc, và bậc nào vừa trả lại đã phải bớt ngay thì không thử lại trong lần chơi đó. Không có gì trong đó được lưu: lần sau lại bắt đầu từ đầy đủ.
- **Ưu tiên** (bảng Tuỳ chỉnh, chỉ khi Chất lượng là Tự động): **Mượt** (giữ khoảng 52 khung/giây, được bớt tới độ phân giải), **Cân bằng** (mặc định, khoảng 42), **Đẹp** (chỉ bớt lát cực quang và xoá phông, không bao giờ bớt cỏ, hoa hay độ phân giải). Cùng hàng có ba công tắc: **Xoá phông**, **Quầng sáng** (bloom quanh lửa, đèn, cực quang) và **Máy quay trôi nhẹ** (chuyển động thở chậm của máy quay; luôn tắt nếu máy đặt giảm chuyển động). Các lựa chọn này thuộc về máy đang dùng, không đi theo bản sao lưu hay bản trên mạng.
- Những thứ dùng lần đầu (vào nhà, ra khỏi nhà, mùa đông) không còn làm trang đứng hình: shader của chúng được dựng sẵn ở nền ngay sau khi trang hiện lên.
- Nếu card đồ hoạ làm rơi trang (driver khởi động lại, quá nhiều tab), trang hiện thông báo và tự tải lại khi card sẵn sàng; tiến trình đã lưu sẵn.
- **Núi là địa hình 3D thật** bao quanh thung lũng. Pháp tuyến mượt, chỗ trũng và bóng nắng của cả dãy được tính một lần lúc tải trang rồi chỉ tra cứu, nên vách núi không lộ mặt đa giác. Vỉa đá, khe rãnh, vành rừng và tuyết đọng tự mờ đi khi nhỏ hơn một điểm ảnh, không lấp lánh ở xa.
- **Đồng cỏ** có ba lớp lá cỏ lồng nhau đi theo người (mịn và dày dưới chân, lớp chính, búi thưa ra tới chân đồi). Mặt đất và từng lá cỏ dùng chung một hàm màu nên không có đường ranh “hết cỏ”. Có đá lộ thiên, gân đất, luống đất giữa các hàng tulip và bờ sỏi ven suối.
- **Bóng nắng thật** từ nhà gỗ, lều, hàng rào, đá, cây và từng bông hoa (mức Vừa và Cao). Mặt trời buổi sáng đứng yên nên bản đồ bóng chỉ dựng một lần lúc tải trang, không tốn thêm gì mỗi khung hình. Cỏ không đổ bóng. Thêm bóng mây trôi trên đồng cỏ và sườn núi.
- **Hoa**: tulip là sáu cánh xếp chồng khép thành chén, có đốm nhạt ở gốc cánh, gân mảnh, ánh sa-tanh và hạt sương buổi sáng; hoa hồng mọc thành bụi, mỗi bông ba mươi cánh xếp xoắn ốc quanh một nụ cuộn; hướng dương có lá bắc, hai vòng cánh và đĩa hạt xếp theo hai họ đường xoắn ốc 21 và 34. Viền cánh được cắt theo từng điểm ảnh. Trong bán kính 7 m quanh bạn, tulip, hồng và hướng dương đổi sang mô hình cận cảnh nhiều chi tiết hơn (mức Vừa và Cao).
- **Ống kính tự lấy nét** vào chỗ bạn đang nhìn: nhìn ra thung lũng thì tiền cảnh mờ nhẹ cho có chiều sâu; cúi xuống một bông hoa thì chính bông hoa nét. Điểm nét chỉ đổi khi chỗ mới giữ yên 0,3 giây và đi chậm theo tỉ lệ, nên không "săn nét" khi tia nhìn lướt qua mép luống hoa. Khi nhìn gần (khẩu độ đóng) bước xoá phông được bỏ hẳn cho đỡ tốn. Tắt bằng nút **Xoá phông** hoặc `&lens=0`; máy cảm ứng mặc định tắt.
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
js/flora.js             Luống tulip, vườn bách hoa (hồng, oải hương, hướng dương, cúc, cổng hoa, anh đào), lối đi hoa quanh ghế
js/story.js             Mười lăm trang của “Một ngày ở trại”, Sổ hoa
js/seasons.js           Lịch và đồng hồ: bốn mùa, giờ trong ngày, hoa nào mọc mùa nào
js/library.js           Bảy cuốn sách trên giá (giá bên ghế dưới anh đào): nội dung, nhóm, cách mở khoá từng trang
js/cabinroom.js         Nội thất nhà gỗ: bếp lò, giường, bàn, kệ, thảm, ghế bập bênh — lớp dựng hình riêng khi bước vào
js/corgi.js             Bơ, chú chó corgi: mô hình, các kiểu dáng đứng/ngồi/nằm/đi theo, vuốt ve
js/cat.js               Thân của Choco: mô hình xương, lông vằn, các tư thế, dáng đi, tránh vật cản
js/catmind.js           Đầu óc của Choco: nhịp ngày, lựa chọn có lý do, phản ứng với bạn, quen dần và kỷ niệm
js/catprops.js          Đồ của Choco: chòi rơm, trụ cào, bát nước cạnh nhà gỗ; cuộn len
js/pastimes.js          Pha trà bên lửa (ghế đẩu, khay, ấm, hơi nước) và đồ trang trí chọn được cho hiên nhà, trước lều
js/nametag.js           Tên "Choco" nhỏ lơ lửng trên đầu nó trong cảnh
js/snowman.js           Bấc và Mầm, hai người tuyết mùa đông, lời chào riêng của mỗi người
js/movers.js            Bản đồ bóng riêng cho những thứ đang di chuyển (Bơ, bạn đồng hành)
js/store.js             Lưu trữ: một tài liệu có phiên bản trong trình duyệt, sao lưu và khôi phục
js/cloud.js             Bản sao tiến trình trên Supabase, và dòng hiệu năng ẩn danh (chỉ khi người chơi bật)
js/boot.js              Điểm vào của trang: xem nhanh bản trên mây rồi nạp main.js
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
node tools/check.mjs cat      # Choco: bảng tên, phản ứng, từ chối, lưu trữ, vào/ra nhà
node tools/check.mjs world    # save cũ, đặt lại phần riêng, pha trà, ghế bập bênh, trang trí, góc ngắm, thang chất lượng, mất WebGL
node tools/perf.mjs 3         # thời gian khung (trung bình, trung vị, p95, p99) của chín cảnh, xen kẽ bản cũ (:8766) và bản mới (:8765)
node tools/hitch.mjs          # khựng khi làm một việc lần đầu (vào nhà, mùa đông...)
node tools/costs.mjs          # chi phí từng phần hình (cỏ, hoa, trời, hậu kỳ...) bằng cách tắt từng phần
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
- `&ghost=3` — thả vài bạn đồng hành giả để xem hình (không dùng mạng) · `&room=1` — bắt đầu luôn trong nhà gỗ · `&dog=run` — Bơ đi lại liên tục để xem dáng đi · `&debug=1` — mở trạng thái trang cho công cụ kiểm tra.

## Ghi chú

- Cần trình duyệt có WebGL 2 và Import Map (Chrome/Edge 89+, Firefox 108+, Safari 16.4+).
- Three.js tải từ CDN nên lần mở đầu tiên cần có mạng. Muốn chạy ngoại tuyến, tải `three.module.js` và thư mục `examples/jsm` về rồi sửa import map trong `index.html`.

## Dữ liệu của bạn

“Cơ sở dữ liệu” chính nằm ngay trong trình duyệt: một tài liệu JSON có phiên bản, lưu qua `js/store.js` (cài đặt, hành trình, các trang đã lật, sổ hoa, kỷ lục trò dệt sao, Choco, phần “Thung lũng của bạn”). Cuối Sổ tay có ba nút: **Lưu ra file** (sao lưu, không kèm phiên đăng nhập), **Khôi phục từ file** (mang sang máy hoặc trình duyệt khác; các tuỳ chọn hình ảnh của máy đang dùng được giữ nguyên) và **Xoá tiến trình**; phần riêng có nút **Đặt lại phần riêng** của nó. Dữ liệu đọc vào luôn được kiểm tra theo lược đồ; file lạ bị từ chối.

Ngoài ra trang giữ một bản sao tiến trình trên Supabase, dưới một **tài khoản ẩn danh gắn với chính trình duyệt này**. Đó chưa phải đồng bộ giữa nhiều máy: xoá dữ liệu trang web là mất đường vào bản sao đó, và một máy khác là một tài khoản khác. Muốn mang sang máy khác, dùng Lưu ra file / Khôi phục từ file. Đồng bộ thật giữa nhiều máy, và việc chỉ cho đúng người đọc những cuốn sách riêng, cần một trang đăng nhập mà dự án chưa có (cần cấu hình đăng nhập trên dự án Supabase của chủ trang, ngoài repo).

## Quyền riêng tư

- Không cookie theo dõi, không phân tích truy cập. Không có tài khoản có tên: bản sao trên Supabase gắn với một mã ẩn danh của trình duyệt, mỗi người chỉ đọc/ghi được dòng của mình.
- Tiến trình và tên hiển thị lưu trong `localStorage` của trình duyệt, cộng bản sao ẩn danh nói trên. Dòng hiệu năng (mức chất lượng, số khung hình trung bình, tên card đồ hoạ, ngày/đêm, mùa) chỉ gửi khi bạn tự bật trong Tuỳ chỉnh.
- Thư viện đồ hoạ tải từ unpkg.com. Như mọi trang web, máy chủ lưu trữ và CDN thấy địa chỉ IP của người truy cập.
- **Đi cùng bạn** chỉ hoạt động khi bạn bấm mở hoặc vào phòng. Khi đó trang tải PeerJS từ esm.sh và dùng máy chủ môi giới công cộng của PeerJS để các trình duyệt tìm nhau, rồi kết nối trực tiếp bằng WebRTC. Dữ liệu trao đổi: tên bạn nhập, vị trí và hướng nhìn trong thung lũng, vài sự kiện (vẫy tay, thêm củi, sáng/đêm). Người cùng phòng có thể biết địa chỉ IP của nhau, nên chỉ gửi mã phòng cho người bạn tin tưởng. Mọi dữ liệu nhận về đều được kiểm tra kiểu, giới hạn giá trị và lọc ký tự trước khi dùng.

## Về nội dung thiên văn

Các đoạn trong sổ tay là kiến thức phổ thông về thiên văn và thần thoại, chưa được đối chiếu từng câu với nguồn. Khoảng cách tới sao là số làm tròn; với các sao siêu khổng lồ (Betelgeuse, Deneb, Antares) sai số đo còn lớn. Vị trí các chòm trên màn hình được sắp cho vừa khung nhìn — hình dạng từng chòm đúng theo toạ độ thật, nhưng vị trí tương đối giữa các chòm thì không.
