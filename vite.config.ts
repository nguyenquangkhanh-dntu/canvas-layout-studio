import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' để bản build chạy được khi mở từ thư mục con hoặc máy chủ tĩnh bất kỳ.
export default defineConfig({
  base: '/canvas-layout-studio/',
  plugins: [react()],
  // Trình soạn thảo (React + Tiptap) khoảng 900 KB chưa nén; phần xuất bản được tách và tải khi cần.
  build: { chunkSizeWarningLimit: 1000 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
