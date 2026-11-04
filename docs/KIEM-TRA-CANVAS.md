# Kiểm tra HTML trong Canvas LMS thật

Bộ xuất "HTML cho Canvas" dựa trên danh sách lọc trong mã nguồn Canvas
(`gems/canvas_sanitize/lib/canvas_sanitize/canvas_sanitize.rb`, nhánh master, tra cứu tháng 10/2026).
Mỗi trường có thể cấu hình khác (theme riêng, chính sách iframe, phiên bản Canvas), nên **chưa thể khẳng định tương thích tuyệt đối** cho đến khi bạn dán thử trên hệ thống của trường.

## Những gì Canvas giữ và bỏ (theo mã nguồn)

| Hạng mục | Canvas | Cách bộ xuất xử lý |
| --- | --- | --- |
| Thẻ `<style>`, `<script>`, `<link>` | Bỏ | Không dùng. Mọi style viết inline trên từng thẻ |
| `<section>`, `<header>`, `<button>`, `<svg>`, `<mark>`, `<s>` | Bỏ | Đổi sang `div`, `span`, `del`; nút sao chép code chỉ có ở bản độc lập; biểu tượng dùng emoji |
| `<aside>`, `<article>`, `<figure>`, `<figcaption>`, `<pre>`, `<iframe>` | Giữ | Dùng trực tiếp |
| `box-shadow` | Bỏ | Cảnh báo; tùy chọn thay bằng viền mảnh |
| `font-weight` | Bỏ | Chuyển sang thuộc tính rút gọn `font` (Canvas giữ) |
| `letter-spacing`, `object-fit`, `opacity`, `box-sizing` | Bỏ | Cảnh báo |
| `display:flex/grid`, `gap`, `flex`, `grid-template-columns`, `border-radius`, `background` (kể cả gradient) | Giữ | Dùng cho bố cục và responsive |
| Ảnh `data:` (base64) | Bỏ | Báo **lỗi**: cần tải ảnh lên Files và dùng URL |
| Liên kết `javascript:` | Bỏ | Bộ xuất đã thay bằng `#` |
| Media query | Không thể (không có `<style>`) | Cột dùng `flex-wrap` + độ rộng tối thiểu nên tự xếp dọc trên màn hình hẹp mà không cần media query |
| `<script>`, thuộc tính `data-*` (Tiện ích) | Bỏ | Lịch học trong Canvas không đổi tháng tại chỗ: lịch đầy đủ xuất mọi tháng có buổi học, ‹ › là liên kết `#` nhảy tháng; tooltip dùng thuộc tính `title`; Tiến độ là giá trị tại ngày xuất |
| `class` (từ bản 1.2: class đánh dấu `cls-m-...` trên mỗi module) | Giữ | Dùng để nhập lại trang từ Canvas về công cụ, nhận diện đúng từng module. Nếu trường lọc mất class, trang vẫn nhập được bằng cách đoán cấu trúc |
| Khối HTML (mã nhập từ Canvas) | Theo danh sách | Bộ xuất lọc lại theo danh sách thẻ, thuộc tính, CSS của Canvas; đổi `section`, `header` sang `div` |
| `position: sticky` (cột đầu Chương trình học) | Giữ theo danh sách | Nếu theme của trường bỏ, bảng vẫn cuộn ngang bình thường, chỉ không giữ cột đầu |

## Danh sách kiểm tra khi dán thử

Làm trên một trang **chưa xuất bản** (Unpublished) trong khóa học thử.

1. Dán HTML qua trình soạn HTML (`</>`), bấm Save, rồi mở lại chế độ HTML: so sánh xem Canvas đã bỏ thuộc tính nào.
2. Font và cỡ chữ: chữ tiếng Việt có dấu hiển thị đầy đủ; cỡ chữ thân bài 18px đúng như thiết kế.
3. Khoảng cách: lề giữa các khối, khoảng cách đoạn văn, danh sách.
4. Màu sắc: nền khối, viền trái của Callout, gradient ở đầu bài.
5. Bố cục cột: trên máy tính các cột nằm ngang; thu hẹp cửa sổ hoặc mở bằng ứng dụng Canvas Student trên điện thoại thì cột xếp dọc.
6. Ảnh: dùng URL từ Files của khóa học; kiểm tra alt text.
7. Video: iframe YouTube/Vimeo hiển thị (quản trị viên có thể chặn một số tên miền).
8. Liên kết: mở đúng trang, mở tab mới.
9. Theme của trường: nếu theme tùy chỉnh ghi đè màu tiêu đề hoặc khoảng cách đoạn, các style inline của bộ xuất thường vẫn thắng; nếu không, ghi lại khác biệt.
10. Tiện ích: nhấp ngày có buổi học trên Lịch học mở đúng bài giảng; liên kết ‹ › nhảy đúng tháng; rê chuột lên ngày có buổi thấy tooltip; ô Nghiệm thu của Chương trình học còn viền đỏ; bảng rộng cuộn ngang được trên điện thoại.
11. Nhập lại: sao chép HTML của trang vừa lưu trên Canvas, dùng "Nhập HTML từ Canvas" trong công cụ; báo cáo nên ghi "nhận diện chính xác" cho phần lớn module (nghĩa là Canvas đã giữ class đánh dấu).
12. Box sizing: trình thiết kế giả định `box-sizing: border-box`. Nếu khối có padding và độ rộng cố định trông rộng hơn trên Canvas, hãy dùng "Rộng tối đa" thay vì "Rộng" cố định.

## Nếu Canvas thay đổi hoặc bỏ thuộc tính

- Mở hộp thoại Xuất bản, thẻ "HTML cho Canvas": danh sách kiểm tra liệt kê đúng các thuộc tính sẽ bị bỏ, kèm module liên quan.
- Bật "Lọc Canvas" ở chế độ Xem trước để thấy trước kết quả sau khi lọc.
- Thay thế phổ biến: bóng đổ → viền mảnh; độ đậm → dùng tiêu đề hoặc in đậm trong văn bản; ảnh nhúng → URL ảnh trong Files.
- Nếu trường dùng bộ lọc chặt hơn, ghi lại thuộc tính bị bỏ; danh sách cho phép nằm ở `src/services/canvas-whitelist.ts` và có thể chỉnh để bộ kiểm tra cảnh báo đúng với hệ thống của bạn.
