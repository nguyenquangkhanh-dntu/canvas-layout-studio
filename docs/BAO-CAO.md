# Báo cáo hoàn thành - phiên bản 1.2

## Phiên bản 1.2.2 (03/11/2026): tùy chọn gạch chân liên kết

`npm run build` thành công; `npm test` 85/85 đạt (3 bài mới); `npm run test:e2e` 27/27 đạt (1 bài mới). Đã kiểm tra: Rich Text tắt gạch chân và giữ màu đoạn văn trong trình thiết kế, HTML cho Canvas (style inline) và HTML độc lập (biến CSS); Bảng, Chương trình học, Lịch học, Video dạng liên kết không còn gạch chân khi tắt; nhập HTML từ Canvas giữ lựa chọn này qua một vòng xuất rồi nhập lại.

## Phiên bản 1.2.1 (02/11/2026): Heading có liên kết

`npm run build` thành công; `npm test` 82/82 đạt (3 bài mới); `npm run test:e2e` 26/26 đạt (1 bài mới). Đã kiểm tra: tiêu đề có liên kết xuất cho Canvas thành `<h2><a ...>` giữ màu tiêu đề, trang ngoài mở tab mới, liên kết `javascript:` không được xuất, nhập lại giữ liên kết, trình thiết kế hiện gạch chân.

## Phiên bản 1.2.0 (01/11/2026): Nhập HTML từ Canvas, Bảng, Khối HTML, Tiến độ theo số tiết

| Lệnh | Kết quả |
| --- | --- |
| `npm run build` | Thành công, không lỗi |
| `npm test` (Vitest, 79 bài) | 79/79 đạt (27 bài mới) |
| `npm run test:e2e` (Playwright, 25 bài) | 25/25 đạt (5 bài mới, 1 bài cập nhật) |

Đã kiểm tra tự động:

- Nhập trang Canvas soạn tay (dán từ Word, đoạn trống, span lồng, bảng dữ liệu, bảng dàn trang, ảnh trong Files, video, code, nút, thẻ lạ): đúng thứ tự và loại module, script và liên kết `javascript:` bị chặn (script không chạy trong trình duyệt), báo cáo đúng số liệu, Hoàn tác lần nhập.
- Nhập lại bản xuất Canvas của mẫu "Tổng quan học phần" và "Bài học mẫu": dựng lại đúng loại module, tỉ lệ cột, callout, Lịch học mini, nội dung và ô nhấn mạnh của Chương trình học; không sinh Khối HTML nào.
- "Thử chuyển thành module": bảng dàn trang thành 2 cột Ảnh và Đoạn văn, Hoàn tác được.
- Khối HTML: lọc script, sự kiện, `javascript:`, CSS nguy hiểm, `position: fixed`, `url()` không phải https; bản Canvas qua bộ kiểm tra.
- Bảng: chọn ô, sửa, thêm hàng, dán từ Excel; bản Canvas sạch.
- Tiến độ theo số tiết: suy ra số tiết từ "Tiết 7-12", không tính trùng tiết nghiệm thu, tính hoặc không tính buổi hôm nay, tổng số tiết tự cộng, dữ liệu v2 tự nâng cấp lên v3, script HTML độc lập nhận dữ liệu số tiết; sửa số tiết trong mục Ngày học cập nhật Tiến độ ngay.
- Lịch học mini: "Lịch học - Tháng m/yyyy" một dòng (cả bản Canvas), Tách hai dòng, Chỉ tháng.

Chưa kiểm thử: dán bản xuất có class đánh dấu vào Canvas thật và nhập lại (làm theo mục 11 trong [KIEM-TRA-CANVAS.md](KIEM-TRA-CANVAS.md)); trang Canvas thật của trường có thể có cấu trúc mà bộ đoán chưa gặp, khi đó phần đó sẽ thành Khối HTML.

Hạn chế:

- Nhập trang soạn tay là đoán cấu trúc: định dạng trong ô bảng (đậm, nghiêng, màu) chỉ giữ chữ và liên kết; bảng có ô gộp giữ nguyên thành Khối HTML.
- Lịch học, Tiến độ khi nhập lại dùng dữ liệu khóa học của dự án hiện tại (HTML không chứa dữ liệu khóa học).
- Khối HTML không sửa trực quan được, chỉ sửa mã hoặc chuyển thành module.

# Phiên bản 1.1

## Phiên bản 1.1.0 (28/10/2026): nhóm Tiện ích

| Lệnh | Kết quả |
| --- | --- |
| `npm run build` | Thành công, không lỗi |
| `npm test` (Vitest, 52 bài) | 52/52 đạt (19 bài mới cho Tiện ích) |
| `npm run test:e2e` (Playwright, 18 bài) | 18/18 đạt (7 bài mới cho Tiện ích) |

Đã kiểm tra tự động: kéo Lịch học mini vào trang, sửa và ẩn tiêu đề, đổi cỡ; nhấp đúp ngày để thêm buổi học và Hoàn tác; nút chuyển tháng trong trình thiết kế; chọn và sửa ô Chương trình học, nhấn mạnh, dán từ Excel; HTML độc lập chuyển tháng, tooltip, tiến độ chạy không lỗi; HTML cho Canvas của tiện ích không có `<script>`, `<style>`, `<button>`, `data-*` và qua bộ kiểm tra Canvas; dự án v1 tự nâng cấp lên v2; dữ liệu khóa học được làm sạch khi nhập (ngày sai, màu chèn CSS, liên kết `javascript:`).

Chưa kiểm thử: dán tiện ích vào Canvas LMS thật (làm theo mục 10 trong [KIEM-TRA-CANVAS.md](KIEM-TRA-CANVAS.md)).

Hạn chế của Tiện ích:

- Trong Canvas, Lịch học không đổi tháng tại chỗ và không biết "hôm nay" (Canvas không chạy script); Tiến độ là giá trị tại ngày xuất, cần xuất lại để cập nhật.
- Tooltip trong Canvas là tooltip mặc định của trình duyệt, không có trên màn hình cảm ứng.
- Dữ liệu khóa học là một bộ cho mỗi dự án; muốn dùng cho nhiều lớp thì nhân bản dự án hoặc xuất/nhập JSON.

# Phiên bản 1.0

## Kết quả kiểm thử 1.0 (đã chạy thật)

Môi trường: Node 22.23, Chromium 153 headless (Linux), ngày 25/10/2026.

| Lệnh | Kết quả |
| --- | --- |
| `npm run build` (TypeScript strict + Vite) | Thành công, không lỗi |
| `npm test` (Vitest, 33 bài) | 33/33 đạt |
| `npm run test:e2e` (Playwright, 11 bài trên trình duyệt thật) | 11/11 đạt, chạy lại 5 lần liên tiếp đều đạt |

Đối chiếu bộ tiêu chí nghiệm thu trong yêu cầu:

| Bộ test | Nội dung đã kiểm tra tự động | Trạng thái |
| --- | --- | --- |
| A. Thêm và xóa | Thêm Container, Heading, Text, Image; xóa; nhân bản; Canvas và Cấu trúc đồng bộ | Đạt |
| B. Style | Màu nền, màu chữ, viền nét đứt 3px, bo góc 0px và 16px, từng góc riêng, bật/tắt bóng đổ, padding, margin; đo bằng `getComputedStyle` | Đạt |
| C. Rich Text | Gõ tiếng Việt có dấu, bôi đen một phần rồi in đậm (chỉ phần đó), đổi màu, chèn liên kết, tạo danh sách, tải lại trang vẫn còn | Đạt |
| D. Kéo thả | Thư viện vào trang, vào cột, giữa hai cột, trên/dưới module, sắp xếp trong bảng Cấu trúc, không mất module | Đạt |
| E. Lưu và phục hồi | Tự lưu, tải lại trang, xuất JSON, nhập lại JSON, so khớp ID từng module | Đạt |
| F. Undo/Redo | Thêm, đổi màu, di chuyển, xóa; hoàn tác và làm lại từng bước, đúng thứ tự | Đạt |
| G. Xuất HTML | HTML Canvas không có `<script>`, `<style>`, `<button>`, `box-shadow`, thông tin nội bộ; module ẩn không xuất; HTML độc lập đầy đủ; ZIP có `index.html`, `styles.css`; bản độc lập ở 390px xếp cột dọc, không tràn ngang | Đạt |
| H. Xuất PNG | Toàn trang 1x (rộng đúng 1000px), một module 2x (rộng 2000px), tệp PNG hợp lệ | Đạt |
| I. An toàn | JSON hỏng báo lỗi; JSON chứa `<script>`, `onerror`, `javascript:`, CSS chèn qua giá trị màu đều bị làm sạch; dán HTML độc vào Rich Text bị làm sạch; không hộp thoại `alert` nào bật lên; xem trước trong iframe sandbox | Đạt |
| Responsive | Cột ngang trên máy tính, xếp dọc trên điện thoại, không tràn ngang; chế độ Xem trước dựng từ HTML xuất | Đạt |

Kiểm thử đơn vị bổ sung: toàn bộ module trong thư viện xuất ra HTML Canvas sạch theo bộ kiểm tra; `font-weight` được chuyển sang `font`; khoảng trắng trong `<pre>` giữ nguyên; quy tắc thả (không thả vào chính nó, cột chỉ trong Columns); giảm số cột không mất nội dung; gộp lịch sử khi gõ liên tục; preset toàn trang không đổi nội dung; lưu/khôi phục IndexedDB.

**Chưa kiểm thử**: dán vào một trang Canvas LMS thật (môi trường xây dựng không có tài khoản Canvas). Bộ xuất được đối chiếu với mã nguồn bộ lọc của Canvas, nhưng cần làm theo [KIEM-TRA-CANVAS.md](KIEM-TRA-CANVAS.md) trên hệ thống của trường trước khi dùng cho sinh viên. Cũng chưa thử trên Firefox, Safari và trên Windows (chỉ chạy Chromium trên Linux).

## Chức năng đã hoàn thành

Toàn bộ 14 mục của phạm vi phiên bản đầu tiên, cùng một số mục mở rộng:

- Giao diện ba vùng, thu gọn được hai bảng bên; tiếng Việt toàn bộ.
- Kéo thả từ thư viện, di chuyển bằng tay nắm hoặc bảng Cấu trúc, chỉ báo vị trí thả và lý do khi không thả được, tự cuộn khi kéo gần mép.
- 15 loại module, 33 mục thư viện (gồm 10 thành phần học liệu), tìm kiếm không dấu, nhấp để thêm, nút "+" thêm nhanh.
- Container, Section, Row, Columns 2/3/4 với tỷ lệ cột, Grid tự co giãn.
- Heading chỉnh trực tiếp; Rich Text (Tiptap) với định dạng một phần văn bản.
- Image (tải từ máy, tự thu nhỏ, URL, alt, chú thích, object-fit), Figure, Video YouTube/Vimeo, Button.
- Style: kích thước, căn khối, nền/gradient, chữ, viền, bo góc từng góc, 5 mức bóng đổ, padding/margin từng cạnh, gap.
- 7 mẫu giao diện áp dụng cho module hoặc toàn trang; preset của người dùng; sao chép/dán style; đặt lại.
- Bảng Cấu trúc: cây, mở/thu, đổi tên, kéo sắp xếp, khóa, ẩn, nhân bản, xóa, điều hướng bàn phím.
- Undo/Redo 150 bước, gộp thao tác gõ; sao chép/cắt/dán module; mẫu module tái sử dụng.
- Tự lưu IndexedDB (dự phòng localStorage), danh sách dự án, nhập/xuất JSON có schema và version, kiểm tra và làm sạch khi nhập.
- Xuất HTML Canvas (inline, theo danh sách lọc của Canvas) có bộ kiểm tra độc lập; HTML độc lập; ZIP; PNG 1x/2x/3x theo phạm vi.
- Xem trước theo 3 thiết bị, thu phóng, chế độ "Lọc Canvas".

## Hạn chế đã biết

- **Canvas bỏ một số hiệu ứng**: bóng đổ, giãn chữ, object-fit, nút sao chép code chỉ còn ở HTML độc lập và PNG. Ảnh nhúng phải chuyển sang URL trong Files.
- **Không có media query trong bản Canvas** (Canvas cấm `<style>`): responsive dựa vào `flex-wrap`, đủ cho cột và lưới, nhưng không chỉnh riêng cỡ chữ hay khoảng cách theo thiết bị.
- Chưa có thuộc tính riêng theo từng thiết bị (responsive visibility, cỡ chữ mobile).
- Kéo thả bằng bàn phím chưa có; thay thế bằng Alt + ↑/↓, nhấp để thêm và nút trong bảng Cấu trúc.
- Chưa có chọn nhiều module cùng lúc; mẫu lưu theo một module (chọn Container để lưu cả nhóm).
- Code Block chưa tô màu cú pháp.
- Kiểm tra nhanh (Knowledge Check) là khối trình bày câu hỏi và đáp án, không chấm điểm.
- Video nhúng không chụp được trong PNG (hiện khung trống, có cảnh báo). Ảnh từ máy chủ không cho phép CORS cũng để trống trong PNG.
- Chưa có nhiều trang trong một dự án, đồng bộ đám mây, cộng tác, tích hợp Canvas API (ngoài phạm vi phiên bản 1).
- Dữ liệu chỉ nằm trong trình duyệt đang dùng; cần xuất JSON để sao lưu.

## Gợi ý cho phiên bản tiếp theo

1. Kiểm thử với Canvas của trường, cập nhật `canvas-whitelist.ts` nếu cần.
2. Tô màu cú pháp cho Code Block bằng `<span style="color">` (Canvas cho phép).
3. Thuộc tính theo thiết bị cho bản HTML độc lập (media query).
4. Thư viện mẫu bài học dựng sẵn (bài lý thuyết, bài thực hành, đề cương tuần).
5. Tải HTML trực tiếp lên Canvas qua Canvas API (cần token của giảng viên).
