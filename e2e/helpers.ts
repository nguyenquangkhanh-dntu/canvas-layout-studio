import { expect, type Locator, type Page } from '@playwright/test';

export const canvas = (page: Page) => page.locator('[data-canvas-root]');
export const node = (page: Page, id: string) => page.locator(`[data-canvas-root] [data-node-id="${id}"]`);

/** Mở ứng dụng với bộ nhớ trình duyệt trống và trang rỗng. */
export async function freshEmpty(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((res) => {
      const r = indexedDB.deleteDatabase('canvas-layout-studio');
      r.onsuccess = r.onerror = r.onblocked = () => res();
    });
  });
  await page.goto('/');
  await expect(canvas(page)).toBeVisible();
  // Tạo dự án trống.
  await page.getByRole('button', { name: 'Dự án mới' }).click();
  await page.getByRole('button', { name: 'Tạo dự án' }).click();
  await expect(canvas(page).locator('[data-empty-slot="__root__"]')).toBeVisible();
  // Thu phóng 100% để số đo CSS khớp chính xác.
  await page.getByTitle('Về 100%').click();
}

/** Kéo bằng chuột thật (dnd-kit cần pointer events có di chuyển). */
export async function dragTo(page: Page, from: Locator, to: Locator, pos?: { x: number; y: number }) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 3 });
  const tx = b.x + (pos ? pos.x : b.width / 2);
  const ty = b.y + (pos ? pos.y : b.height / 2);
  await page.mouse.move(tx, ty, { steps: 12 });
  await page.waitForTimeout(120);
  await page.mouse.move(tx + 1, ty + 1, { steps: 2 });
  await page.waitForTimeout(120);
  await page.mouse.up();
}

export async function nodeIds(page: Page, selector = '[data-canvas-root] > [data-node-id]'): Promise<string[]> {
  return page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('data-node-id')!));
}

export async function addFromLibrary(page: Page, label: string) {
  await page.locator('[data-library-search]').fill('');
  await page.getByRole('button', { name: new RegExp(`^${label}:`) }).click();
}

export async function selectedId(page: Page): Promise<string | null> {
  return page.locator('[data-canvas-root] [data-selected="true"]').first().getAttribute('data-node-id').catch(() => null);
}

export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}
