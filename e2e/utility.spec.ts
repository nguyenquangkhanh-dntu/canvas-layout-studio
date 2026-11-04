import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { addFromLibrary, canvas, dragTo, freshEmpty, trackErrors } from './helpers';

test.describe('Nhóm Tiện ích', () => {
  test('Lịch học mini: kéo vào trang, sửa và ẩn tiêu đề, đổi cỡ', async ({ page }) => {
    const errors = trackErrors(page);
    await freshEmpty(page);
    await page.locator('[data-library-search]').fill('lịch học mini');
    await dragTo(page, page.getByRole('button', { name: /^Lịch học mini:/ }), canvas(page).locator('[data-empty-slot="__root__"]'));
    const mini = canvas(page).locator('[data-module-type="schedule"]');
    await expect(mini).toHaveCount(1);
    await expect(mini).not.toContainText('Xem lịch đầy đủ');
    await expect(mini.locator('table')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Mini', exact: true })).toHaveAttribute('aria-pressed', 'true');

    // Mặc định gộp một dòng: "Lịch học - Tháng m/yyyy". Sửa tiêu đề ở bảng thuộc tính.
    const head = mini.locator('strong').first();
    await expect(head).toHaveText(/^Lịch học - Tháng \d{1,2}\/\d{4}$/);
    const titleInput = page.getByLabel('Nội dung tiêu đề');
    await titleInput.fill('Lịch học 23DTH1');
    await expect(head).toHaveText(/^Lịch học 23DTH1 - Tháng /);
    // Tách hai dòng: tiêu đề nhỏ ở trên, dòng tháng chỉ còn tháng.
    await page.getByRole('button', { name: 'Tách hai dòng', exact: true }).click();
    await expect(head).toHaveText(/^Tháng \d/);
    await expect(mini).toContainText('Lịch học 23DTH1');
    // Chỉ tháng: ẩn tiêu đề.
    await page.getByRole('button', { name: 'Chỉ tháng', exact: true }).click();
    await expect(mini).not.toContainText('Lịch học 23DTH1');
    await page.getByRole('button', { name: 'Gộp một dòng', exact: true }).click();
    await expect(head).toHaveText(/^Lịch học 23DTH1 - Tháng /);

    // Đổi sang cỡ Đầy đủ: có tiêu đề cột "Tuần" và tên tháng đầy đủ.
    await page.getByRole('button', { name: 'Đầy đủ', exact: true }).click();
    await expect(mini.locator('th').first()).toHaveText('Tuần');
    expect(errors).toEqual([]);
  });

  test('Nhấp đúp vào ngày để thêm buổi học, Hoàn tác được', async ({ page }) => {
    await freshEmpty(page);
    await page.locator('[data-library-search]').fill('');
    await addFromLibrary(page, 'Lịch học');
    const cal = canvas(page).locator('[data-module-type="schedule"]');
    const day = cal.locator('td[data-cal-day$="-15"]');
    const key = await day.getAttribute('data-cal-day');
    await day.dblclick();
    const title = page.locator('#ss-title');
    await expect(title).toBeFocused();
    await expect(page.locator('#ss-date')).toHaveValue(key!);
    await title.fill('Buổi 1: Giới thiệu học phần');
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(day).toContainText('Buổi 1');
    await expect(day).toHaveAttribute('title', /Buổi 1: Giới thiệu học phần/);
    await page.locator('[data-canvas-scroller]').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+z');
    await expect(day).not.toContainText('Buổi 1');
  });

  test('Lịch học: nút chuyển tháng trong trình thiết kế', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mở dự án' }).click();
    await page.getByRole('button', { name: 'Mở mẫu Tổng quan học phần' }).click();
    const full = canvas(page).locator('[data-module-type="schedule"]').last();
    await full.click({ position: { x: 30, y: 30 } });
    const label = full.locator('strong').first();
    const before = await label.textContent();
    await full.locator('[data-cal-nav="1"]').click();
    await expect(label).not.toHaveText(before!);
    await full.locator('[data-cal-nav="-1"]').click();
    await expect(label).toHaveText(before!);
  });

  test('Chương trình học: chọn ô, sửa nội dung, nhấn mạnh, dán từ Excel', async ({ page }) => {
    await freshEmpty(page);
    await addFromLibrary(page, 'Chương trình học');
    const curr = canvas(page).locator('[data-module-type="curriculum"]');
    await curr.locator('[data-cur-r="1"][data-cur-c="2"]').click();
    await page.getByLabel('Nội dung', { exact: true }).fill('3.1. Controller & routing');
    const cell = curr.locator('[data-cur-r="1"][data-cur-c="2"]');
    await expect(cell).toHaveText('3.1. Controller & routing');
    await page.locator('label').filter({ hasText: 'Nhấn mạnh (viền đỏ' }).click();
    await expect(cell).toHaveCSS('border-top-color', 'rgb(180, 35, 24)');

    const paste = page.getByRole('button', { name: 'Dán từ Excel', exact: true });
    if ((await paste.getAttribute('aria-expanded')) !== 'true') await paste.click();
    await page.getByPlaceholder('Chọn vùng bảng trong Excel').fill('Tiết\tBuổi 1\tBuổi 2\tBuổi 3\tBuổi 4\nNgày\t26/08\t09/09\t16/09\t23/09\nTiết 7\tA\tB\tC\tD\nTiết 8\tE\tF\tNGHIỆM THU Checkpoint 1\tH');
    await page.getByRole('button', { name: 'Thay bằng dữ liệu đã dán' }).click();
    await expect(curr.locator('thead th')).toHaveCount(10);
    await expect(curr).toContainText('23/09');
    await expect(curr.locator('[data-cur-r="1"][data-cur-c="2"]')).toHaveCSS('color', 'rgb(180, 35, 24)');
  });

  test('Xuất HTML độc lập: chuyển tháng, tooltip, tiến độ chạy được', async ({ page, context }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mở dự án' }).click();
    await page.getByRole('button', { name: 'Mở mẫu Tổng quan học phần' }).click();
    await page.getByRole('button', { name: 'Xuất HTML' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'HTML độc lập' }).click();
    const dl = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Tải HTML' }).click();
    const doc = fs.readFileSync((await (await dl).path())!, 'utf8');

    const p2 = await context.newPage();
    const errors = trackErrors(p2);
    await p2.setContent(doc);
    const full = p2.locator('[data-cls-cal="full"]');
    const visible = () => full.locator('[data-cls-month]').evaluateAll((els) => els.filter((e) => (e as HTMLElement).style.display !== 'none').map((e) => e.getAttribute('data-cls-month')));
    const start = await visible();
    expect(start).toHaveLength(1);
    await full.locator('[data-cls-month]:visible [data-cls-nav="1"]').click();
    expect(await visible()).not.toEqual(start);
    // Tooltip có cấu trúc khi rê chuột lên ngày có buổi học.
    await full.locator('[data-cls-month]').evaluateAll((els) => els.forEach((e) => { (e as HTMLElement).style.display = e.getAttribute('data-cls-month') === '2026-09' ? '' : 'none'; }));
    await full.locator('td[data-cls-day="2026-09-16"]').hover();
    await expect(p2.getByRole('tooltip')).toContainText('Nghiệm thu Checkpoint 1');
    await expect(p2.locator('[data-p-pct]')).toHaveText(/\d+%/);
    expect(errors).toEqual([]);
  });

  test('Xuất HTML cho Canvas: tiện ích sạch theo bộ lọc Canvas', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mở dự án' }).click();
    await page.getByRole('button', { name: 'Mở mẫu Tổng quan học phần' }).click();
    await page.getByRole('button', { name: 'Xuất HTML' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('lỗi cần xử lý')).toHaveCount(0);
    const dl = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Tải .html' }).click();
    const html = fs.readFileSync((await (await dl).path())!, 'utf8');
    expect(html).not.toMatch(/<script|<style|<button|data-cls|data-cal|data-cur/);
    expect(html).toContain('NGHIỆM THU Checkpoint 1');
    expect(html).toContain('Tiến độ học phần');
    expect(html).not.toContain('Xem lịch đầy đủ');
  });

  test('Cài đặt trang có mục Khóa học dùng chung', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mở dự án' }).click();
    await page.getByRole('button', { name: 'Mở mẫu Tổng quan học phần' }).click();
    await page.locator('[data-canvas-scroller]').click({ position: { x: 5, y: 5 } });
    await expect(page.getByText('Khóa học (dùng cho Lịch học, Tiến độ, Chương trình học)')).toBeVisible();
    const term = page.getByRole('button', { name: 'Học kỳ', exact: true });
    if ((await term.getAttribute('aria-expanded')) !== 'true') await term.click();
    await page.getByLabel('Tổng số buổi').fill('10');
    await page.getByLabel('Tổng số buổi').press('Tab');
    await expect(canvas(page).locator('[data-module-type="progress"]')).toContainText('Buổi 7/10');
    await expect(page.locator('[data-canvas-root] [data-selected="true"]')).toHaveCount(0);
  });
});
