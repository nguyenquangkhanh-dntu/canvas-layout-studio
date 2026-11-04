# Hướng dẫn sử dụng Canvas LMS Layout Studio

## 1. Màn hình làm việc

| Vùng | Chức năng |
| --- | --- |
| Thanh công cụ (trên cùng) | Tên dự án, trạng thái lưu, Dự án mới, Mở, Lưu, Hoàn tác/Làm lại, chế độ Thiết kế/Xem trước, thiết bị (máy tính, tablet, điện thoại), thu phóng, xuất JSON/PNG/HTML, ẩn hiện hai bảng bên |
| Bảng trái, thẻ **Module** | Thư viện module theo nhóm, có ô tìm kiếm (gõ không dấu cũng được) |
| Bảng trái, thẻ **Cấu trúc** | Cây module của trang: chọn, đổi tên, kéo sắp xếp, ẩn/khóa, nhân bản, xóa |
| Giữa | Trang thiết kế, hiển thị gần đúng với bài học thật |
| Bảng phải, **Thuộc tính** | Chỉnh nội dung và style của module đang chọn; khi chưa chọn gì thì hiện cài đặt cho toàn trang |

## 2. Thêm module

- **Kéo** một module từ thư viện thả vào trang. Đường kẻ xanh cho biết vị trí thả; khung đỏ kèm lý do nghĩa là không thả được ở đó.
- Hoặc **nhấp** vào module trong thư viện (hoặc chọn rồi bấm Enter): module được thêm vào trong khối đang chọn, hoặc ngay sau module đang chọn.
- Nút **+** tròn dưới module đang chọn mở nhanh 8 module hay dùng.
- Thả vào khung nét đứt "Thả module vào đây" để đặt module vào bên trong Container, cột, Callout.

Nhóm module có sẵn:

- **Bố cục**: Container, Section, Row, 2/3/4 cột, Grid, Spacer, Divider.
- **Văn bản**: Heading, Paragraph, Rich Text, Quote, Callout, Bullet List, Numbered List, Checklist, Code Block, Bảng, Khối HTML (xem mục 11).
- **Đa phương tiện**: Image, Image with Caption, Figure, Video Embed (YouTube/Vimeo), Button.
- **Thành phần học liệu**: Mục tiêu học tập, Điểm cần nhớ, Ghi chú, Quan trọng, Cảnh báo, Ví dụ, Bài tập, Kiểm tra nhanh, Tóm tắt, Tài liệu tham khảo, Code Example.
- **Tiện ích**: Lịch học, Lịch học mini, Chương trình học, Tiến độ khóa học (xem mục 10).
- **Mẫu của tôi**: các module bạn đã lưu thành mẫu.

## 3. Chọn, di chuyển, sửa

- Nhấp vào module để chọn. Nhãn tên xuất hiện phía trên, thanh công cụ nhỏ bên phải có: tay nắm kéo, đưa lên, đưa xuống, chọn module cha, nhân bản, xóa.
- Với tiêu đề, chú thích, trích dẫn, code: chọn module rồi **nhấp lần nữa** vào chữ để gõ trực tiếp.
- **Heading có liên kết**: chọn Heading, dán địa chỉ vào ô **Liên kết** ở bảng Thuộc tính; cả dòng tiêu đề bấm được. Chọn cách mở (Tự động, Cùng tab, Tab mới) và bật/tắt gạch chân. Muốn chỉ một phần chữ là liên kết thì dùng Rich Text với kiểu đoạn H2, H3.
- **Gạch chân liên kết**: mọi module có liên kết (Heading, Rich Text, Bảng, Chương trình học, Lịch học, Video dạng liên kết) đều có công tắc "Gạch chân để người học biết bấm được" trong bảng Thuộc tính. Rich Text có thêm "Màu liên kết": Màu nhấn hoặc Theo màu đoạn văn. Canvas không cho "chỉ gạch chân khi rê chuột", nên chỉ chọn có hoặc không. Liên kết nằm giữa đoạn văn nên giữ gạch chân hoặc màu nhấn để người học nhận ra chỗ bấm được.
- Với khối văn bản (Paragraph, Rich Text, danh sách): chọn module là gõ được ngay. **Bôi đen một phần chữ** rồi dùng thanh định dạng phía trên trang: kiểu đoạn (H1 đến H6), font, cỡ chữ, đậm, nghiêng, gạch chân, gạch ngang, màu chữ, màu nền chữ, căn lề, danh sách, thụt vào/ra, giãn dòng, liên kết, xóa định dạng. Định dạng chỉ áp dụng cho phần được chọn.
- **Khóa** module (bảng Thuộc tính hoặc biểu tượng ổ khóa trong Cấu trúc) để tránh sửa, kéo hay xóa nhầm.
- **Ẩn** module: module vẫn nằm trong Cấu trúc và hiện mờ có sọc trên trang thiết kế, nhưng không có trong bản xem trước, HTML và PNG.

## 4. Bảng Thuộc tính

Các nhóm có thể thu gọn:

- **Thông tin**: tên nội bộ (không xuất ra bài học), loại, ID, hiện/ẩn, khóa.
- **Nội dung**: trường riêng của từng loại module (tiêu đề khối và cấp tiêu đề, số cột và tỷ lệ cột, ảnh và alt text, URL video, nhãn và liên kết nút, các mục checklist, ngôn ngữ và mã nguồn...).
- **Phong cách**: áp dụng mẫu giao diện cho module, lưu và dùng lại preset của bạn, sao chép style, đặt lại mặc định.
- **Bố cục**: rộng, cao, rộng/cao tối thiểu và tối đa (px, %, rem, auto), căn khối trái/giữa/phải.
- **Chữ**: font, cỡ, độ đậm, kiểu, giãn dòng, giãn chữ, khoảng cách đoạn, căn chữ, màu chữ.
- **Nền**: màu nền (bảng màu, mã HEX/RGBA, màu gợi ý, trong suốt) hoặc gradient.
- **Viền và bo góc**: kiểu, độ dày, màu viền; vạch trái (Callout/Container); bo góc chung hoặc từng góc. Đặt 0 px là bỏ bo góc thật sự.
- **Bóng đổ**: Không, Nhẹ, Vừa, Mạnh, Tùy chỉnh (lệch X, Y, độ nhòe, độ lan, màu).
- **Khoảng cách**: đệm trong và lề ngoài cho từng cạnh hoặc liên kết 4 cạnh, khoảng cách giữa các module con.
- **Nâng cao**: lưu module thành mẫu, xuất PNG riêng module, chọn module cha.

Ô số để trống nghĩa là "không thiết lập" (kế thừa). Biểu tượng cọ vẽ và bảng ghim ở đầu bảng là Sao chép style / Dán style (chỉ dán phong cách, giữ kích thước của module đích).

**Cột (Columns)**: chọn 2, 3 hoặc 4 cột; tỷ lệ dạng `1:2`; "Rộng cột tối thiểu" quyết định khi nào các cột tự xuống hàng trên màn hình hẹp. Giảm số cột không làm mất nội dung: module của cột bị bỏ được dồn sang cột cuối.

**Ảnh**: chọn từ máy (ảnh lớn được tự thu nhỏ còn tối đa 1600px) hoặc dán URL. Ảnh nhúng từ máy dùng tốt cho PNG và HTML độc lập, nhưng **Canvas xóa ảnh nhúng** khi lưu trang. Với bài trên Canvas: tải ảnh lên mục Files của khóa học, mở ảnh, sao chép địa chỉ ảnh và dán vào ô "URL ảnh".

## 5. Mẫu giao diện

Khi chưa chọn module, bảng phải hiện 7 mẫu cho toàn trang: Minimal, Academic, Modern, Professional, Soft Color, Dark, Technical. "Áp dụng cho toàn trang" đổi font, màu chữ, màu nhấn, màu tiêu đề và phong cách của mọi Container; nội dung giữ nguyên. Có thể Hoàn tác nếu không ưng.

## 6. Lưu dự án

- Dự án **tự lưu** trong trình duyệt sau mỗi thay đổi (chip trạng thái: Chưa lưu, Đang lưu..., Đã lưu, Lỗi lưu). Ctrl+S để lưu ngay.
- **Mở dự án**: danh sách dự án đã lưu trong trình duyệt này, mở tệp JSON, mở bài học mẫu, hoặc mở mẫu "Tổng quan học phần" (dùng các Tiện ích).
- **Dự án mới**: dự án hiện tại được lưu trước, mở lại được bất cứ lúc nào.
- **JSON** (thanh công cụ): xuất tệp dự án để sao lưu hoặc chuyển sang máy khác. Dữ liệu trong trình duyệt sẽ mất nếu xóa dữ liệu duyệt web, nên hãy xuất JSON định kỳ.

## 7. Xuất bản

Nút **Xuất HTML** mở hộp thoại Xuất bản với 3 thẻ:

1. **HTML cho Canvas**: sao chép hoặc tải HTML; danh sách kiểm tra cho biết lỗi (ví dụ ảnh nhúng) và cảnh báo (thuộc tính Canvas sẽ bỏ). Bật "Thay bóng đổ bằng viền mảnh" để giữ cảm giác tách khối khi Canvas bỏ bóng đổ.
2. **HTML độc lập**: tải một tệp HTML, tải ZIP, sao chép HTML hoặc CSS. Có xem trước theo 3 kích thước màn hình và xem mã.
3. **Ảnh PNG**: chọn phạm vi (toàn trang, section chứa module đang chọn, module đang chọn), độ rộng, độ phân giải, nền (trắng, màu trang, trong suốt, tùy chọn), lề. Bấm "Tạo ảnh PNG" để xem trước, rồi "Tải PNG".

Chế độ **Xem trước** trên thanh công cụ hiển thị trang dựng từ chính HTML xuất ra; bật "Lọc Canvas" để thấy trang sau khi Canvas lọc bỏ các thuộc tính không hỗ trợ.

## 8. Dán vào Canvas LMS

1. Trong khóa học, mở Page (hoặc Assignment/Discussion) cần chỉnh, bấm **Edit**.
2. Trong trình soạn thảo, bấm biểu tượng **&lt;/&gt;** (HTML Editor) ở góc dưới bên phải.
3. Dán HTML đã sao chép (thay nội dung cũ nếu cần), bấm **Save**.
4. Xem lại trên máy tính và ứng dụng Canvas Student.

Xem thêm [KIEM-TRA-CANVAS.md](KIEM-TRA-CANVAS.md).

## 9. Phím tắt

| Phím | Tác dụng |
| --- | --- |
| Ctrl + S | Lưu |
| Ctrl + Z / Ctrl + Y (hoặc Ctrl + Shift + Z) | Hoàn tác / Làm lại |
| Ctrl + C, Ctrl + X, Ctrl + V | Sao chép, cắt, dán module |
| Ctrl + D | Nhân bản |
| Delete | Xóa module đang chọn |
| Alt + ↑ / Alt + ↓ | Đưa module lên / xuống |
| Esc | Bỏ chọn |
| F2 (trong Cấu trúc) | Đổi tên |
| ↑ ↓ ← → (trong Cấu trúc) | Di chuyển giữa các dòng, mở/thu nhánh |

Trên macOS dùng Cmd thay cho Ctrl.

## 10. Tiện ích: Lịch học, Chương trình học, Tiến độ

Nhóm **Tiện ích** trong thư viện có 4 module. Cách nhanh nhất để làm quen: Mở dự án → **Mở mẫu Tổng quan học phần**.

### Dữ liệu khóa học dùng chung

Các tiện ích cùng đọc một bộ dữ liệu của dự án. Sửa ở một nơi, mọi tiện ích cập nhật theo. Mở bằng cách bỏ chọn module (nhấp vào vùng xám) rồi xem mục **Khóa học** trong bảng phải, hoặc chọn một Lịch học.

- **Học kỳ**: ngày bắt đầu, ngày kết thúc, tổng số buổi (dùng cho Tiến độ).
- **Buổi học**: mỗi buổi có ngày, giờ hoặc tiết, loại, tiêu đề, nhãn ngắn trong ô, ghi chú tooltip, liên kết bài giảng và cách mở (tự động: trang trong Canvas mở cùng tab, trang ngoài mở tab mới).
- **Tạo lịch lặp**: chọn thứ trong tuần và khoảng ngày, công cụ tạo các buổi và bỏ qua ngày nghỉ.
- **Ngày nghỉ**: hiện gạch ngang trên lịch, có tên ngày nghỉ trong tooltip.
- **Loại buổi và màu**: Buổi học, Thực hành, Nghiệm thu/kiểm tra, Hạn nộp (đổi tên, đổi màu, thêm loại).

Mẹo: trên trang thiết kế, **nhấp đúp vào một ngày** của Lịch học để thêm buổi học vào ngày đó.

### Lịch học và Lịch học mini

- Cỡ **Đầy đủ** (nhãn trong ô, cột số tuần, danh sách buổi học), **Gọn** (chấm màu) và **Mini** (vòng tròn tô màu, hợp cột bên rộng 220 đến 320px). Đổi cỡ bất cứ lúc nào trong bảng phải.
- Tiêu đề lịch sửa được (bảng phải hoặc nhấp vào tiêu đề trên trang) và ẩn/hiện được.
- Lịch học mini có **Kiểu tiêu đề**: *Gộp một dòng* (mặc định, hiện "Lịch học - Tháng 11/2026" để sinh viên nhìn là biết ngay), *Tách hai dòng* (tiêu đề nhỏ ở trên, tháng ở dưới) hoặc *Chỉ tháng*.
- Tháng hiển thị: **Tự động** (tháng hiện tại nếu đang trong học kỳ, không thì tháng có buổi đầu) hoặc một tháng cố định. Nút ‹ › trên trang thiết kế dùng để xem tháng khác.
- Tùy chọn: tuần bắt đầu Thứ Hai/Chủ Nhật, kiểu đánh dấu ngày (tô nền, chỉ nhãn, viền), chú thích màu, dòng "Buổi tới", làm mờ buổi đã qua, danh sách buổi học.

Khác biệt giữa các bản xuất:

| | HTML độc lập | HTML cho Canvas | PNG |
| --- | --- | --- | --- |
| Chuyển tháng | Nút ‹ › đổi tháng ngay | Lịch đầy đủ: mọi tháng có buổi học xếp dọc, ‹ › là liên kết nhảy tới tháng. Lịch mini: một tháng | Tháng đang hiển thị |
| Tooltip | Hộp tooltip có màu loại buổi | Tooltip mặc định của trình duyệt (rê chuột chờ khoảng 1 giây) | Không |
| Hôm nay, buổi tới | Tính theo ngày người học mở trang | Không có (Canvas không chạy script) | Theo ngày xuất |
| Nhấp ngày có buổi | Mở bài giảng | Mở bài giảng | Không |

### Chương trình học

Bảng nội dung theo buổi (cột) và tiết (hàng), giống bảng kế hoạch giảng dạy.

- Nhấp một ô trên trang để sửa nội dung, liên kết, và bật **Nhấn mạnh** (viền đỏ, dùng cho Nghiệm thu, Kiểm tra). Nhấp tiêu đề cột để sửa tên buổi, ngày, liên kết.
- **Hàng và cột**: thêm buổi, thêm hàng, đổi tên hàng, xóa, đổi thứ tự cột.
- **Dán từ Excel**: chọn vùng bảng trong Excel, Ctrl+C, dán vào ô rồi bấm "Thay bằng dữ liệu đã dán". Hàng thứ hai bắt đầu bằng "Ngày" được nhận là hàng ngày; ô có chữ NGHIỆM THU, KIỂM TRA, THI tự được nhấn mạnh.
- **Ngày theo Lịch học**: điền hàng ngày từ các buổi học trong dữ liệu khóa học.
- Hiển thị: dạng bảng hoặc danh sách theo buổi, viết hoa tiêu đề, tô màu nhạt theo buổi, giữ cột đầu khi cuộn ngang, màu tiêu đề, độ rộng cột.

Bảng rộng hơn trang sẽ cuộn ngang (cả trong Canvas). Trong ảnh PNG không cuộn được nên bảng tự co vừa khung, chữ nhỏ lại và xuống dòng; muốn ảnh rõ hơn thì xuất riêng module hoặc tăng "Độ rộng" ảnh.

### Tiến độ khóa học

- Tính theo **ngày** (tuần hiện tại trên tổng số tuần của học kỳ), theo **số buổi đã học** trên tổng số buổi, theo **số tiết đã học** trên tổng số tiết học phần, hoặc **thủ công** (nhập phần trăm).
- **Theo số tiết** (từ bản 1.2): mỗi buổi có ô **Số tiết** (tự điền khi ô giờ ghi "Tiết 7-11", sửa được). Ngày có 3 tiết và ngày có 5 tiết được tính đúng tỉ lệ. Đặt **Tổng số tiết học phần** (ví dụ 60); để trống thì cộng từ các buổi đã nhập. Dòng nhắc cho biết còn bao nhiêu tiết chưa có ngày.
- Mục **Ngày học** trong bảng phải của Tiến độ: nhập nhanh ngày, số tiết, loại buổi; "Thêm ngày" lấy ngày sau buổi cuối 7 ngày. Đây là dữ liệu dùng chung, nên Lịch học và Lịch học mini cập nhật theo.
- Mỗi **loại buổi** có ô "Tiến độ" (Cài đặt trang, mục Loại buổi học): Buổi học và Thực hành được tính; Nghiệm thu và Hạn nộp mặc định không tính, nên ngày có cả buổi học và checkpoint không bị cộng trùng tiết.
- Công tắc **Tính buổi hôm nay là đã học** (mặc định bật): tắt nếu muốn chỉ tính từ ngày hôm sau.
- Kiểu thanh hoặc ô theo tuần; cỡ thường hoặc nhỏ; mốc nghiệm thu; màu.
- Bản HTML độc lập tự tính lại theo ngày người học mở trang. Bản Canvas và PNG là ảnh chụp tại ngày xuất, có dòng "Cập nhật ngày ..."; hãy xuất lại và dán vào Canvas khi muốn cập nhật.

## 11. Nhập HTML từ Canvas

Dùng khi đã có sẵn trang trên Canvas và muốn sửa tiếp trong công cụ.

1. Trên Canvas: mở trang, bấm **Edit**, bấm biểu tượng **&lt;/&gt;** (HTML Editor), chọn tất cả (Ctrl+A) và sao chép (Ctrl+C).
2. Trong công cụ: **Mở dự án** → **Nhập HTML từ Canvas...** (hoặc nút "Nhập HTML từ Canvas" trên trang trống).
3. Dán mã vào ô, hoặc chuyển sang thẻ **Chọn tệp .html** (tệp trang trong gói Export Course Content của Canvas, thư mục `wiki_content`).
4. Chọn **Cách nhập**: *Chuyển thành module* (khuyên dùng) hoặc *Giữ nguyên thành một Khối HTML*. Chọn **Vị trí**: thêm vào cuối trang, thay toàn bộ trang, hoặc tạo dự án mới. Nên để bật **Dọn mã thừa**.
5. Bấm **Nhập**. Hộp **Đã nhập xong** cho biết bao nhiêu module sửa được, phần nào giữ nguyên thành Khối HTML (kèm lý do) và các cảnh báo. Không ưng thì bấm **Hoàn tác lần nhập**.

Công cụ làm gì với mã:

- **Chuẩn hóa**: sửa thẻ đóng mở sai; bỏ script, style, form, sự kiện onclick, liên kết `javascript:`; bỏ style và class của Word (`mso-...`, `MsoNormal`), đoạn trống (`&nbsp;`), thẻ span lồng vô nghĩa, font chữ riêng (dùng font của trang); đổi cỡ chữ `pt` sang `px`.
- **Trang do chính công cụ xuất ra** (từ bản 1.2): mỗi module mang một class đánh dấu (Canvas giữ class) nên được dựng lại đúng loại: cột, callout, Chương trình học, Lịch học... Lịch học và Tiến độ dùng dữ liệu khóa học của dự án hiện tại; muốn đúng ngày học thì mở tệp JSON gốc.
- **Trang soạn tay**: tiêu đề (kể cả đoạn chữ đậm cỡ lớn gõ tay) thành Heading; đoạn văn, danh sách thành Rich Text; ảnh, video YouTube/Vimeo, code, đường kẻ, nút bấm thành module tương ứng; khối có nền hoặc viền thành Container giữ màu, viền, khoảng cách; bảng dữ liệu thành module **Bảng**.
- **Phần chưa nhận diện được** (bảng dàn trang, bảng có ô gộp, khung nhúng lạ...) giữ nguyên trong module **Khối HTML**, không mất nội dung.

Ảnh dạng `/courses/.../files/...` là ảnh trong Files của Canvas, cần đăng nhập Canvas mới xem được, nên trong công cụ hiện khung giữ chỗ. Khi xuất HTML cho Canvas và dán lại, ảnh vẫn hiện bình thường.

### Module Bảng

- Nhấp một ô trên trang để sửa nội dung (Enter để xuống dòng trong ô) và liên kết; các nút mũi tên thêm hàng hoặc cột quanh ô đang chọn; xóa hàng, xóa cột.
- **Dán từ Excel**: chọn vùng bảng trong Excel, Ctrl+C, dán vào ô rồi bấm "Thay bằng dữ liệu đã dán".
- Hiển thị: hàng đầu là tiêu đề, cột đầu in đậm, tô xen kẽ, gọn, đường kẻ giữa các hàng hoặc mọi ô, màu tiêu đề, chú thích bảng. Bảng rộng sẽ cuộn ngang trên điện thoại.

### Module Khối HTML

- Sửa mã trong ô **Mã HTML**; **Định dạng lại mã** thụt lề cho dễ đọc.
- **Thử chuyển thành module**: tách mã thành Tiêu đề, Đoạn văn, Ảnh, Bảng...; bảng dàn trang 2 đến 4 ô thành các cột. Không ưng thì Hoàn tác (Ctrl+Z).
- Mã luôn được lọc theo danh sách thẻ, thuộc tính và CSS mà Canvas cho phép khi hiển thị và khi xuất. Trong trình thiết kế, khung nhúng (iframe) hiện khung giữ chỗ; xem đầy đủ ở chế độ Xem trước.
