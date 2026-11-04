import { expect, test, type Page } from '@playwright/test';

/** Độ rộng của vùng thiết kế, bảng trái, bảng phải (0 nếu đang ẩn). */
async function widths(page: Page) {
  await page.locator('main[aria-label="Vùng thiết kế"]').waitFor();
  return page.evaluate(() => {
    const w = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      return el && !el.hidden ? Math.round(el.getBoundingClientRect().width) : 0;
    };
    const main = document.querySelector('main[aria-label="Vùng thiết kế"]')!.getBoundingClientRect();
    return {
      left: w('aside[aria-label="Thư viện và cấu trúc"]'),
      main: Math.round(main.width),
      mainX: Math.round(main.left),
      right: w('aside[aria-label="Thuộc tính"]'),
      page: window.innerWidth,
    };
  });
}

test.describe('Ẩn/hiện bảng bên', () => {
  test('ẩn bảng trái: vùng thiết kế chiếm chỗ, bảng Thuộc tính giữ 320px bên phải', async ({ page }) => {
    await page.goto('/');
    const before = await widths(page);
    expect(before).toMatchObject({ left: 280, right: 320 });

    await page.getByRole('button', { name: 'Ẩn bảng trái' }).click();
    await page.waitForTimeout(300);
    const a = await widths(page);
    expect(a.left).toBe(0);
    expect(a.right).toBe(320);
    expect(a.mainX).toBe(0);
    expect(a.main).toBe(a.page - 320);

    // Gợi ý của thanh định dạng nằm trong vùng thiết kế, không bị ép thành cột hẹp.
    const hint = page.getByText('Chọn một khối văn bản', { exact: false });
    expect((await hint.boundingBox())!.width).toBeGreaterThan(300);

    await page.getByRole('button', { name: 'Ẩn bảng thuộc tính' }).click();
    await page.waitForTimeout(300);
    const b = await widths(page);
    expect(b).toMatchObject({ left: 0, right: 0, mainX: 0, main: b.page });

    await page.getByRole('button', { name: 'Hiện bảng trái' }).click();
    await page.waitForTimeout(300);
    const c = await widths(page);
    expect(c).toMatchObject({ left: 280, right: 0, mainX: 280, main: c.page - 280 });

    await page.getByRole('button', { name: 'Hiện bảng thuộc tính' }).click();
    await page.waitForTimeout(300);
    expect(await widths(page)).toMatchObject({ left: 280, right: 320, mainX: 280, main: before.main });
  });

  test('ẩn bảng trái trong chế độ Xem trước', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ẩn bảng trái' }).click();
    await page.getByRole('button', { name: 'Xem trước' }).click();
    await page.waitForTimeout(300);
    const w = await widths(page);
    expect(w).toMatchObject({ left: 0, right: 0, mainX: 0, main: w.page });
    await page.getByRole('button', { name: 'Hiện bảng trái' }).click();
  });
});
