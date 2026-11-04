import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { addFromLibrary, canvas, dragTo, freshEmpty, node, nodeIds, selectedId, trackErrors } from './helpers';

test.describe('Canvas LMS Layout Studio', () => {
  test('Khởi động với bài mẫu, không có lỗi', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(canvas(page)).toBeVisible();
    await expect(canvas(page)).toContainText('Web API');
    expect(errors).toEqual([]);
  });

  test('A - Thêm, xóa, nhân bản và đồng bộ với Cấu trúc', async ({ page }) => {
    await freshEmpty(page);
    await addFromLibrary(page, 'Container');
    const containerId = await selectedId(page);
    expect(containerId).toBeTruthy();
    // Container đang chọn -> module mới được thêm vào bên trong.
    await addFromLibrary(page, 'Heading');
    await addFromLibrary(page, 'Paragraph');
    await addFromLibrary(page, 'Image');
    const kids = await nodeIds(page, `[data-node-id="${containerId}"] > [data-node-id]`);
    expect(kids.length).toBe(3);

    await page.getByRole('tab', { name: 'Cấu trúc' }).click();
    await expect(page.locator('[data-layer-id]')).toHaveCount(4);
    // Chọn trong Layers -> Canvas đồng bộ.
    await page.locator(`[data-layer-id="${kids[0]}"]`).click();
    expect(await selectedId(page)).toBe(kids[0]);
    // Nhân bản (Ctrl+D) và xóa (Delete).
    await page.keyboard.press('Control+d');
    await expect(page.locator('[data-layer-id]')).toHaveCount(5);
    await page.keyboard.press('Delete');
    await expect(page.locator('[data-layer-id]')).toHaveCount(4);
    await expect(canvas(page).locator('[data-node-id]')).toHaveCount(4);
  });

  test('D - Kéo thả: thư viện vào trang, vào cột, giữa các cột, sắp xếp trong Layers', async ({ page }) => {
    await freshEmpty(page);
    await dragTo(page, page.getByRole('button', { name: /^2 cột:/ }), canvas(page).locator('[data-empty-slot="__root__"]'));
    await expect(canvas(page).locator('[data-module-type="columns"]')).toHaveCount(1);
    const cols = await nodeIds(page, '[data-module-type="column"]');
    expect(cols.length).toBe(2);

    // Thư viện -> cột 1.
    await dragTo(page, page.getByRole('button', { name: /^Heading:/ }), canvas(page).locator(`[data-empty-slot="${cols[0]}"]`));
    const headingId = (await nodeIds(page, `[data-node-id="${cols[0]}"] > [data-node-id]`))[0];
    expect(headingId).toBeTruthy();

    // Di chuyển module bằng tay nắm sang cột 2.
    await node(page, headingId).click();
    await dragTo(page, page.getByRole('button', { name: 'Kéo để di chuyển' }), canvas(page).locator(`[data-empty-slot="${cols[1]}"]`));
    expect(await nodeIds(page, `[data-node-id="${cols[1]}"] > [data-node-id]`)).toEqual([headingId]);
    expect(await nodeIds(page, `[data-node-id="${cols[0]}"] > [data-node-id]`)).toEqual([]);

    // Thả Paragraph phía dưới khối cột, rồi Spacer phía trên (sắp xếp thứ tự).
    const colsBox = canvas(page).locator('[data-module-type="columns"]');
    const box = (await colsBox.boundingBox())!;
    await dragTo(page, page.getByRole('button', { name: /^Paragraph:/ }), colsBox, { x: box.width / 2, y: box.height - 3 });
    await dragTo(page, page.getByRole('button', { name: /^Spacer:/ }), colsBox, { x: box.width / 2, y: 3 });
    const types = await canvas(page).locator(':scope > [data-node-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-module-type')));
    expect(types).toEqual(['spacer', 'columns', 'text']);

    // Kéo trong bảng Cấu trúc: đưa Paragraph lên đầu.
    await page.getByRole('tab', { name: 'Cấu trúc' }).click();
    const textId = await canvas(page).locator(':scope > [data-module-type="text"]').getAttribute('data-node-id');
    const spacerId = await canvas(page).locator(':scope > [data-module-type="spacer"]').getAttribute('data-node-id');
    await dragTo(page, page.locator(`[data-layer-id="${textId}"]`), page.locator(`[data-layer-id="${spacerId}"]`), { x: 60, y: 3 });
    const after = await canvas(page).locator(':scope > [data-node-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-module-type')));
    expect(after).toEqual(['text', 'spacer', 'columns']);
    // Không mất module nào sau chuỗi thao tác.
    await expect(canvas(page).locator('[data-node-id]')).toHaveCount(6);
  });

  test('B - Chỉnh style cập nhật ngay trên trang', async ({ page }) => {
    await freshEmpty(page);
    await addFromLibrary(page, 'Container');
    const id = (await selectedId(page))!;
    const el = node(page, id);
    const css = (prop: string) => el.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);

    await page.getByRole('button', { name: 'Màu nền' }).click();
    await page.getByLabel('Mã màu HEX hoặc RGBA').fill('#ffeecc');
    await page.keyboard.press('Escape');
    expect(await css('background-color')).toBe('rgb(255, 238, 204)');

    await page.getByRole('button', { name: 'Màu chữ' }).click();
    await page.getByLabel('Mã màu HEX hoặc RGBA').fill('#123456');
    await page.keyboard.press('Escape');
    expect(await css('color')).toBe('rgb(18, 52, 86)');

    await page.getByLabel('Kiểu viền').selectOption('dashed');
    await page.getByLabel('Độ dày').fill('3');
    expect(await css('border-top-style')).toBe('dashed');
    expect(await css('border-top-width')).toBe('3px');

    const radius = page.getByLabel('Bo góc (cả 4 góc)');
    await radius.fill('0');
    expect(await css('border-top-left-radius')).toBe('0px');
    await radius.fill('16');
    expect(await css('border-bottom-right-radius')).toBe('16px');
    await page.getByRole('button', { name: 'Chỉnh riêng từng góc' }).click();
    await page.getByLabel('Bo góc trên trái').fill('4');
    expect(await css('border-top-left-radius')).toBe('4px');
    expect(await css('border-top-right-radius')).toBe('16px');

    await page.getByRole('button', { name: 'Bóng đổ' }).click();
    await page.getByRole('button', { name: 'Vừa', exact: true }).click();
    expect(await css('box-shadow')).not.toBe('none');
    await page.getByRole('button', { name: 'Không', exact: true }).click();
    expect(await css('box-shadow')).toBe('none');

    await page.getByLabel('Đệm trong (padding) (cả 4 cạnh)').fill('40');
    expect(await css('padding-left')).toBe('40px');
    await page.getByLabel('Lề ngoài (margin) (cả 4 cạnh)').fill('12');
    expect(await css('margin-top')).toBe('12px');
  });

  test('C - Rich Text: tiếng Việt, định dạng một phần, danh sách, liên kết, lưu lại', async ({ page }) => {
    await freshEmpty(page);
    await addFromLibrary(page, 'Paragraph');
    const id = (await selectedId(page))!;
    const editor = node(page, id).locator('.ProseMirror');
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Xin chào các bạn sinh viên');
    await page.keyboard.press('Home');
    for (let i = 0; i < 8; i++) await page.keyboard.press('Shift+ArrowRight');
    await page.getByRole('button', { name: 'In đậm (Ctrl+B)' }).click();
    await expect(editor.locator('strong')).toHaveText('Xin chào');
    // Chỉ phần được chọn bị in đậm.
    await expect(editor).toContainText('các bạn sinh viên');
    expect(await editor.locator('strong').count()).toBe(1);

    await page.getByLabel('Màu chữ').first().fill('#b42318');
    await expect(editor.locator('span[style*="color"]')).toHaveCount(1);
    // Tiptap trả tiêu điểm về vùng chọn cũ ở khung hình kế tiếp; chờ xong rồi mới chọn chữ mới.
    await page.waitForTimeout(200);
    await editor.click();
    await page.keyboard.press('End');
    for (let i = 0; i < 9; i++) await page.keyboard.press('Shift+ArrowLeft');
    await page.getByRole('button', { name: 'Chèn liên kết' }).click();
    await page.getByLabel('Địa chỉ liên kết').fill('https://canvas.instructure.com');
    await page.keyboard.press('Enter');
    await expect(editor.locator('a[href="https://canvas.instructure.com"]')).toHaveText('sinh viên');

    await page.getByRole('button', { name: 'Danh sách gạch đầu dòng', exact: true }).click();
    await expect(editor.locator('ul li')).toHaveCount(1);

    // Bỏ chọn -> nội dung hiển thị tĩnh, lưu xong tải lại vẫn còn.
    await page.keyboard.press('Escape');
    await page.locator('[data-canvas-scroller]').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu' })).toBeVisible();
    await page.reload();
    const stat = node(page, id);
    await expect(stat.locator('strong')).toHaveText('Xin chào');
    await expect(stat.locator('a')).toHaveAttribute('href', 'https://canvas.instructure.com');
    await expect(stat).toContainText('các bạn');
  });

  test('E - Lưu, tải lại, xuất và nhập JSON', async ({ page }) => {
    await freshEmpty(page);
    await addFromLibrary(page, 'Container');
    await addFromLibrary(page, 'Heading');
    await page.getByLabel('Tên dự án').fill('Bài kiểm thử JSON');
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu' })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Tên dự án')).toHaveValue('Bài kiểm thử JSON');
    await expect(canvas(page).locator('[data-node-id]')).toHaveCount(2);

    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'JSON' }).click();
    const file = await (await dl).path();
    const json = JSON.parse(fs.readFileSync(file!, 'utf8'));
    expect(json.schema).toBe('canvas-layout-studio/project');
    expect(json.version).toBe(3);

    // Dự án mới rỗng rồi nhập lại tệp JSON.
    await page.getByRole('button', { name: 'Dự án mới' }).click();
    await page.getByRole('button', { name: 'Tạo dự án' }).click();
    await expect(canvas(page).locator('[data-node-id]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Mở dự án' }).click();
    await page.locator('input[type="file"][accept*="json"]').setInputFiles(file!);
    await expect(page.getByLabel('Tên dự án')).toHaveValue('Bài kiểm thử JSON');
    await expect(canvas(page).locator('[data-node-id]')).toHaveCount(2);
    const ids = await canvas(page).locator('[data-node-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-node-id')));
    expect(ids).toEqual([json.nodes[0].id, json.nodes[0].children[0].id]);
  });

  test('F - Undo và Redo từng thao tác', async ({ page }) => {
    await freshEmpty(page);
    await addFromLibrary(page, 'Heading');
    const h = (await selectedId(page))!;
    await page.locator('[data-canvas-scroller]').click({ position: { x: 5, y: 5 } });
    await addFromLibrary(page, 'Container');
    const c = (await selectedId(page))!;
    await page.getByRole('button', { name: 'Màu nền' }).click();
    await page.getByLabel('Mã màu HEX hoặc RGBA').fill('#ff0000');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Alt+ArrowUp'); // di chuyển container lên đầu
    expect(await nodeIds(page)).toEqual([c, h]);
    await page.keyboard.press('Delete');
    expect(await nodeIds(page)).toEqual([h]);

    const bg = () => node(page, c).evaluate((e) => getComputedStyle(e).backgroundColor);
    await page.keyboard.press('Control+z');
    expect(await nodeIds(page)).toEqual([c, h]);
    await page.keyboard.press('Control+z');
    expect(await nodeIds(page)).toEqual([h, c]);
    expect(await bg()).toBe('rgb(255, 0, 0)');
    await page.keyboard.press('Control+z');
    expect(await bg()).toBe('rgb(255, 255, 255)');
    await page.keyboard.press('Control+z');
    expect(await nodeIds(page)).toEqual([h]);
    await page.keyboard.press('Control+y');
    await page.keyboard.press('Control+y');
    expect(await bg()).toBe('rgb(255, 0, 0)');
    await page.keyboard.press('Control+y');
    await page.keyboard.press('Control+y');
    expect(await nodeIds(page)).toEqual([h]);
  });

  test('G - Xuất HTML cho Canvas, HTML độc lập và ZIP', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mở dự án' }).click();
    await page.getByRole('button', { name: 'Mở bài học mẫu' }).click();
    await expect(canvas(page)).toContainText('Web API');
    // Ẩn một module: không được xuất hiện trong bản xuất.
    await page.getByRole('tab', { name: 'Cấu trúc' }).click();
    const firstRow = page.locator('[data-layer-id]').filter({ hasText: 'Mục tiêu học tập' }).first();
    await firstRow.hover();
    await firstRow.getByRole('button', { name: 'Ẩn module' }).click();

    await page.getByRole('button', { name: 'Xuất HTML' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Không phát hiện vấn đề').or(dialog.getByText(/cảnh báo/))).toBeVisible();
    const dl = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Tải .html' }).click();
    const canvasHtml = fs.readFileSync((await (await dl).path())!, 'utf8');
    expect(canvasHtml).toContain('Web API');
    expect(canvasHtml).not.toContain('Mục tiêu học tập');
    expect(canvasHtml).not.toMatch(/<script|<style|<button|box-shadow|data-node-id|data-selected/);
    expect(canvasHtml).toContain('border-radius');

    await dialog.getByRole('tab', { name: 'HTML độc lập' }).click();
    const dl2 = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Tải HTML' }).click();
    const doc = fs.readFileSync((await (await dl2).path())!, 'utf8');
    expect(doc).toMatch(/^<!doctype html>/);
    expect(doc).toContain('.cls-layout-root');
    expect(doc).toMatch(/\.cls-layout-root \.c1 \{/);
    expect(doc).toContain('data-cls-copy');

    const dl3 = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Tải ZIP' }).click();
    const zip = await JSZip.loadAsync(fs.readFileSync((await (await dl3).path())!));
    expect(Object.keys(zip.files).sort()).toEqual(expect.arrayContaining(['index.html', 'styles.css']));

    // Mở HTML độc lập ở độ rộng điện thoại: 2 cột phải xếp dọc.
    const p2 = await page.context().newPage();
    await p2.setViewportSize({ width: 390, height: 800 });
    await p2.setContent(doc);
    const tops = await p2.locator('pre').evaluateAll((els) => els.slice(0, 2).map((e) => e.getBoundingClientRect().left));
    expect(tops.length).toBe(2);
    const colLefts = await p2.evaluate(() => {
      const code = document.querySelector('pre')!;
      const col = code.closest('div[class]')!.parentElement!;
      const sib = col.previousElementSibling ?? col.nextElementSibling!;
      return [col.getBoundingClientRect().top, sib.getBoundingClientRect().top];
    });
    expect(colLefts[0]).not.toBe(colLefts[1]);
    const overflow = await p2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(overflow).toBe(true);
    await p2.close();
  });

  test('H - Xuất PNG toàn trang và một module', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mở dự án' }).click();
    await page.getByRole('button', { name: 'Mở bài học mẫu' }).click();
    await page.getByRole('button', { name: 'PNG' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Độ phân giải').getByRole('button', { name: '1x' }).click();
    await dialog.getByRole('button', { name: 'Tạo ảnh PNG' }).click();
    await expect(dialog.getByAltText('Ảnh PNG vừa tạo')).toBeVisible({ timeout: 30000 });
    const dl = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Tải PNG' }).click();
    const buf = fs.readFileSync((await (await dl).path())!);
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    expect(w).toBe(1000);
    expect(h).toBeGreaterThan(1500);
    await dialog.getByRole('button', { name: 'Đóng' }).click();

    // Xuất riêng một module ở 2x.
    await canvas(page).getByText('Phân biệt PUT và PATCH').click();
    await page.getByRole('button', { name: 'Nâng cao' }).click();
    await page.getByRole('button', { name: 'Xuất PNG module này' }).click();
    await dialog.getByRole('button', { name: 'Tạo ảnh PNG' }).click();
    await expect(dialog.getByAltText('Ảnh PNG vừa tạo')).toBeVisible({ timeout: 30000 });
    const dl2 = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Tải PNG' }).click();
    const buf2 = fs.readFileSync((await (await dl2).path())!);
    const w2 = buf2.readUInt32BE(16), h2 = buf2.readUInt32BE(20);
    expect(w2).toBe(2000);
    expect(h2).toBeLessThan(800);
  });

  test('I - An toàn: nhập dữ liệu độc hại và JSON hỏng', async ({ page }) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cls-'));
    const dialogs: string[] = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
    await page.goto('/');
    await page.getByRole('button', { name: 'Mở dự án' }).click();

    const bad = path.join(tmp, 'hong.json');
    fs.writeFileSync(bad, '{ day khong phai json');
    await page.locator('input[type="file"][accept*="json"]').setInputFiles(bad);
    await expect(page.getByRole('alert')).toContainText('JSON hợp lệ');

    const evil = path.join(tmp, 'doc-hai.json');
    fs.writeFileSync(evil, JSON.stringify({
      schema: 'canvas-layout-studio/project', version: 1, name: 'Độc hại', page: {},
      nodes: [
        { id: 'x1', type: 'text', name: 't', props: { html: '<p>An toàn<img src=x onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">bấm</a></p>' }, style: { bg: 'red;background:url(javascript:alert(4))' } },
        { id: 'x2', type: 'button', name: 'b', props: { label: 'Nút', href: 'javascript:alert(5)' }, style: {} },
        { id: 'x3', type: 'image', name: 'i', props: { src: 'javascript:alert(6)' }, style: {} },
      ],
    }));
    await page.locator('input[type="file"][accept*="json"]').setInputFiles(evil);
    await expect(page.getByLabel('Tên dự án')).toHaveValue('Độc hại');
    await expect(canvas(page)).toContainText('An toàn');
    const html = await canvas(page).innerHTML();
    expect(html).not.toMatch(/onerror|<script|javascript:/i);

    // Dán HTML có script vào Rich Text.
    await node(page, 'x1').click();
    await node(page, 'x1').locator('.ProseMirror').click();
    await page.evaluate(() => {
      const el = document.querySelector('[data-node-id="x1"] .ProseMirror')!;
      const dt = new DataTransfer();
      dt.setData('text/html', '<p>Dán<img src=y onerror="alert(7)"><a href="javascript:alert(8)">x</a></p>');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(300);
    expect(await canvas(page).innerHTML()).not.toMatch(/onerror|javascript:/i);

    await page.getByRole('button', { name: 'Xuất HTML' }).click();
    // Bản xem trước trong iframe sandbox rỗng: không chạy được script.
    await expect(page.locator('iframe[sandbox=""]')).toHaveCount(1);
    const code = await page.evaluate(async () => {
      const dlg = document.querySelector('[role="dialog"]')!;
      (Array.from(dlg.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent === "HTML") as HTMLButtonElement).click();
      await new Promise((r) => setTimeout(r, 100));
      return dlg.querySelector('pre')!.textContent!;
    });
    expect(code).not.toMatch(/onerror|<script|javascript:/i);
    expect(code).toContain('href="#"');
    expect(dialogs).toEqual([]);
  });

  test('Responsive - cột xếp dọc trên điện thoại, không tràn ngang', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mở dự án' }).click();
    await page.getByRole('button', { name: 'Mở bài học mẫu' }).click();
    const colTops = () => canvas(page).locator('[data-module-type="column"]').evaluateAll((els) => els.slice(0, 2).map((e) => Math.round(e.getBoundingClientRect().top)));
    const [a, b] = await colTops();
    expect(a).toBe(b);
    await page.getByRole('button', { name: 'Điện thoại (390px)' }).click();
    const [c, d] = await colTops();
    expect(d).toBeGreaterThan(c);
    const overflow = await canvas(page).evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(overflow).toBe(true);
    // Chế độ xem trước dựng từ HTML xuất ra trong iframe sandbox.
    await page.getByRole('button', { name: 'Xem trước' }).click();
    await expect(page.frameLocator('iframe[title="Xem trước bài học"]').getByText('Web API: khái niệm')).toBeVisible();
  });
});
