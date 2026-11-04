import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { addFromLibrary, canvas, freshEmpty, trackErrors } from './helpers';

const CANVAS_PAGE = `
<p><span style="font-size: 18pt;"><strong>Bài 3: Controller và routing</strong></span></p>
<p>&nbsp;</p>
<p class="MsoNormal" style="mso-line-height-alt: 12pt;"><span><span>Sau bài này sinh viên có thể</span></span> <a href="javascript:alert(1)">xem</a>.</p>
<h2>Mục tiêu</h2>
<ul><li>Hiểu attribute routing</li><li>Dùng model binding</li></ul>
<table><thead><tr><th>Tuần</th><th>Nội dung</th></tr></thead><tbody><tr><td>3</td><td>Lab 3</td></tr></tbody></table>
<table><tr><td width="200"><img src="/courses/1234/files/5678/preview" alt="Sơ đồ routing"></td><td><p>Request đi qua middleware.</p><p>Rồi tới controller.</p></td></tr></table>
<script>window.__pwned = true</script>
`;

test.describe('Nhập HTML từ Canvas', () => {
  test('dán mã, xem báo cáo, hoàn tác lần nhập', async ({ page }) => {
    const errors = trackErrors(page);
    await freshEmpty(page);
    await page.getByRole('button', { name: 'Nhập HTML từ Canvas' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Mã HTML từ Canvas').fill(CANVAS_PAGE);
    await dialog.getByRole('button', { name: 'Nhập', exact: true }).click();
    await expect(dialog).toContainText('Đã nhập xong');
    await expect(dialog).toContainText('Bảng × 1');
    await expect(dialog).toContainText('Bố cục nhiều cột dựng bằng bảng dàn trang');
    await expect(dialog).toContainText('liên kết javascript: đã bị chặn');

    const root = canvas(page);
    await expect(root.locator('h2', { hasText: 'Bài 3: Controller và routing' })).toBeVisible();
    await expect(root.locator('[data-module-type="table"]')).toContainText('Lab 3');
    await expect(root.locator('[data-module-type="html"]')).toContainText('Ảnh từ Files của Canvas');
    expect(await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned)).toBeUndefined();

    await dialog.getByRole('button', { name: 'Hoàn tác lần nhập' }).click();
    await expect(root.locator('[data-empty-slot="__root__"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Khối HTML: thử chuyển bảng dàn trang thành 2 cột', async ({ page }) => {
    await freshEmpty(page);
    await page.getByRole('button', { name: 'Nhập HTML từ Canvas' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Mã HTML từ Canvas').fill(CANVAS_PAGE);
    await dialog.getByRole('button', { name: 'Nhập', exact: true }).click();
    await dialog.getByRole('button', { name: 'Xem các Khối HTML' }).click();
    await expect(page.getByLabel('Mã HTML', { exact: true })).toHaveValue(/courses\/1234\/files/);
    await page.getByRole('button', { name: 'Thử chuyển thành module' }).click();
    const cols = canvas(page).locator('[data-module-type="columns"]');
    await expect(cols).toHaveCount(1);
    await expect(cols.locator('[data-module-type="image"]')).toContainText('Ảnh từ Files của Canvas');
    await expect(cols.locator('[data-module-type="text"]')).toContainText('Rồi tới controller.');
    await expect(canvas(page).locator('[data-module-type="html"]')).toHaveCount(0);
    await page.locator('[data-canvas-scroller]').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+z');
    await expect(canvas(page).locator('[data-module-type="html"]')).toHaveCount(1);
  });

  test('chế độ giữ nguyên thành một Khối HTML, tạo dự án mới', async ({ page }) => {
    await freshEmpty(page);
    await page.getByRole('button', { name: 'Mở dự án' }).click();
    await page.getByRole('button', { name: 'Nhập HTML từ Canvas...' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Mã HTML từ Canvas').fill(CANVAS_PAGE);
    await dialog.getByLabel('Giữ nguyên thành một Khối HTML').check();
    await dialog.getByLabel('Tạo dự án mới').check();
    await dialog.getByRole('button', { name: 'Nhập', exact: true }).click();
    await expect(dialog).toContainText('Đã tạo dự án mới');
    await dialog.getByRole('button', { name: 'Xong' }).click();
    await expect(canvas(page).locator('[data-module-type]')).toHaveCount(1);
    await expect(page.getByLabel('Tên dự án')).toHaveValue('Bài 3: Controller và routing');
  });
});

test.describe('Module Bảng', () => {
  test('chọn ô, sửa nội dung, thêm hàng, dán từ Excel', async ({ page }) => {
    await freshEmpty(page);
    await addFromLibrary(page, 'Bảng');
    const t = canvas(page).locator('[data-module-type="table"]');
    await t.locator('[data-tb-r="1"][data-tb-c="1"]').click();
    await page.getByLabel('Nội dung', { exact: true }).fill('Giới thiệu Web API');
    await expect(t.locator('[data-tb-r="1"][data-tb-c="1"]')).toHaveText('Giới thiệu Web API');
    await page.getByRole('button', { name: 'Thêm hàng phía dưới' }).click();
    await expect(t.locator('tbody tr')).toHaveCount(3);
    const paste = page.getByRole('button', { name: 'Dán từ Excel', exact: true });
    if ((await paste.getAttribute('aria-expanded')) !== 'true') await paste.click();
    await page.getByPlaceholder('Chọn vùng bảng trong Excel').fill('Mã\tTên\tSố tín chỉ\nPM70205\tLập trình Web API\t3\nPM70101\tCơ sở dữ liệu\t3');
    await page.getByRole('button', { name: 'Thay bằng dữ liệu đã dán' }).click();
    await expect(t.locator('thead th')).toHaveText(['Mã', 'Tên', 'Số tín chỉ']);
    await expect(t.locator('tbody tr')).toHaveCount(2);
  });
});

test.describe('Tiến độ theo số tiết', () => {
  test('nhập số tiết trong mục Ngày học, Lịch học cập nhật theo', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Mở dự án' }).click();
    await page.getByRole('button', { name: 'Mở mẫu Tổng quan học phần' }).click();
    const prog = canvas(page).locator('[data-module-type="progress"]');
    await prog.click();
    await expect(page.getByRole('button', { name: 'Theo số tiết' })).toHaveAttribute('aria-pressed', 'true');
    await expect(prog).toContainText('/90 tiết');
    const days = page.locator('[data-days]');
    const first = days.getByLabel('Số tiết').first();
    await first.fill('3');
    await expect(prog).toContainText(/Đã học \d+\/90 tiết/);
    const before = await days.getByLabel('Ngày học').count();
    await page.getByRole('button', { name: 'Thêm ngày' }).click();
    await expect(days.getByLabel('Ngày học')).toHaveCount(before + 1);
    // Ngày mới cũng có trên Lịch học (dữ liệu dùng chung): tổng mục trong học kỳ tăng.
    await page.locator('[data-canvas-scroller]').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+z');
    await expect(days).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe('Heading có liên kết', () => {
  test('gắn liên kết cho tiêu đề, xuất HTML cho Canvas có thẻ a', async ({ page }) => {
    await freshEmpty(page);
    await addFromLibrary(page, 'Heading');
    const h = canvas(page).locator('[data-module-type="heading"]');
    await expect(page.getByLabel('Mở liên kết')).toHaveCount(0);
    await page.getByLabel('Liên kết', { exact: true }).fill('https://lms.example.edu.vn/courses/1234/pages/buoi-03');
    await expect(h).toHaveCSS('text-decoration-line', 'underline');
    await expect(page.getByLabel('Mở liên kết')).toBeVisible();
    await page.getByRole('button', { name: 'Xuất HTML' }).click();
    const dl = page.waitForEvent('download');
    await page.getByRole('dialog').getByRole('button', { name: 'Tải .html' }).click();
    const html = fs.readFileSync((await (await dl).path())!, 'utf8');
    expect(html).toMatch(/<h2[^>]*>\s*<a href="https:\/\/lms\.example\.edu\.vn\/courses\/1234\/pages\/buoi-03" style="color: inherit; text-decoration: underline">Tiêu đề<\/a>/);
  });
});

test.describe('Gạch chân liên kết', () => {
  test('Rich Text: tắt gạch chân và giữ màu chữ cho liên kết', async ({ page }) => {
    await freshEmpty(page);
    await page.getByRole('button', { name: 'Nhập HTML từ Canvas' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Mã HTML từ Canvas').fill('<p><a href="/courses/1/pages/bai-01">01 - Kỹ năng gõ phím</a></p>');
    await dialog.getByRole('button', { name: 'Nhập', exact: true }).click();
    await dialog.getByRole('button', { name: 'Xong' }).click();
    const link = canvas(page).locator('[data-module-type="text"] a');
    await expect(link).toHaveCSS('text-decoration-line', 'underline');
    await page.locator('label').filter({ hasText: 'Gạch chân để người học biết bấm được' }).click();
    await expect(link).toHaveCSS('text-decoration-line', 'none');
    await page.getByRole('button', { name: 'Theo màu đoạn văn', exact: true }).click();
    const color = await canvas(page).locator('[data-module-type="text"] p').evaluate((el) => getComputedStyle(el).color);
    await expect(link).toHaveCSS('color', color);
  });
});
