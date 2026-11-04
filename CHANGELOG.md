# Nhật ký thay đổi

## 1.2.2 (03/11/2026)

Thêm mới:

- Tùy chọn **"Gạch chân để người học biết bấm được"** cho mọi module có liên kết, giống Heading: Rich Text (áp cho mọi liên kết trong khối), Bảng và Chương trình học (liên kết trong ô), Lịch học (danh sách buổi học, dòng "Buổi tới"), Video (khi URL không phải YouTube/Vimeo và được xuất thành liên kết).
- Rich Text có thêm **Màu liên kết**: "Màu nhấn" của trang hoặc "Theo màu đoạn văn".
- Nhập HTML từ Canvas: liên kết không gạch chân, giữ màu chữ được chuyển thành tùy chọn tương ứng của khối.

## 1.2.1 (02/11/2026)

Thêm mới:

- **Heading có liên kết**: ô "Liên kết" trong bảng Thuộc tính của Heading, cả dòng tiêu đề bấm được; cách mở Tự động (trang trong Canvas cùng tab, trang ngoài tab mới), Cùng tab hoặc Tab mới; tùy chọn gạch chân. Tiêu đề giữ màu và cỡ chữ. Nhập HTML từ Canvas giữ lại liên kết của tiêu đề.

## 1.2.0 (01/11/2026)

Thêm mới:

- **Nhập HTML từ Canvas** (Mở dự án → Nhập HTML từ Canvas...): dán mã hoặc chọn tệp .html; chuẩn hóa mã (bỏ script, style Word, đoạn trống, span lồng, font riêng, đổi pt sang px); chuyển thành module hoặc giữ nguyên; thêm vào cuối, thay trang hoặc tạo dự án mới; báo cáo sau khi nhập và Hoàn tác lần nhập.
- Bản xuất mang **class đánh dấu** `cls-m-<loại>` trên mỗi module để nhập lại từ Canvas được chính xác.
- Module **Bảng** (bảng dữ liệu, dán từ Excel, thêm và xóa hàng cột quanh ô đang chọn, tô xen kẽ, chú thích).
- Module **Khối HTML** (mã HTML đã lọc theo danh sách Canvas, định dạng lại mã, "Thử chuyển thành module").
- **Tiến độ theo số tiết**: ô Số tiết cho từng buổi (tự điền từ "Tiết 7-11"), Tổng số tiết học phần, cờ "Tiến độ" cho từng loại buổi, công tắc "Tính buổi hôm nay là đã học", mục "Ngày học" nhập nhanh ngay trong bảng của Tiến độ (dùng chung với Lịch học).
- **Lịch học mini**: Kiểu tiêu đề "Gộp một dòng" (mặc định, "Lịch học - Tháng 11/2026"), "Tách hai dòng", "Chỉ tháng".
- Ảnh trong Files của Canvas (`/courses/...`) hiện khung giữ chỗ trong trình thiết kế.
- Tệp `samples/trang-canvas-mau.html` để thử tính năng nhập.

Thay đổi:

- Tệp dự án JSON lên **version 3** (số tiết, cờ tiến độ của loại buổi, tổng số tiết). Tệp version 1, 2 vẫn mở được và được nâng cấp tự động.
- Tiến độ "Theo buổi" tính theo cờ "Tiến độ" của loại buổi (mặc định vẫn là Buổi học và Thực hành) và mặc định tính cả buổi của hôm nay.

## 1.1.1 (28/10/2026)

Sửa lỗi:

- Nút "Ẩn bảng trái" làm vùng thiết kế bị ép vào cột rộng 0px (chữ chồng lên nhau, trang thiết kế biến mất) và bảng Thuộc tính tràn ra giữa màn hình. Nay mỗi vùng được gán cột cố định; thêm kiểm thử tự động cho mọi tổ hợp ẩn/hiện hai bảng bên.

## 1.1.0 (28/10/2026)

Thêm mới:

- Nhóm thư viện **Tiện ích** (ngay dưới "Thành phần học liệu"): Lịch học, Lịch học mini, Chương trình học, Tiến độ khóa học.
- **Dữ liệu khóa học dùng chung** cho cả dự án: học kỳ, buổi học (ngày, tiết, loại, tiêu đề, ghi chú, liên kết bài giảng), lịch lặp theo tuần, ngày nghỉ, loại buổi và màu. Sửa trong Cài đặt trang hoặc khi chọn một Lịch học.
- Lịch học 3 cỡ (Đầy đủ, Gọn, Mini), tiêu đề sửa được và ẩn/hiện được, tô màu ngày có buổi, tooltip, nhấp ngày mở bài giảng, nhấp đúp ngày để thêm buổi.
- Chương trình học dạng bảng Tiết × Buổi có hàng Ngày, ô nhấn mạnh viền đỏ, dán từ Excel, lấy ngày từ Lịch học, dạng danh sách.
- Tiến độ khóa học theo ngày, theo số buổi hoặc thủ công; dạng thanh hoặc ô theo tuần.
- Mẫu "Tổng quan học phần" trong hộp thoại Mở dự án và trong `samples/`.
- HTML độc lập kèm một script nhỏ cho lịch (chuyển tháng, tooltip, hôm nay, buổi tới) và tiến độ.

Thay đổi:

- Tệp dự án JSON lên **version 2** (thêm `course`). Tệp version 1 vẫn mở được và được nâng cấp tự động.
- Chế độ Xem trước cho phép script chạy trong iframe sandbox (không cùng nguồn gốc với ứng dụng) để thấy lịch hoạt động.

## 1.0.0 (25/10/2026)

Phiên bản đầu tiên.
