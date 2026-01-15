
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 关键配置：确保资源路径在 Electron 中是相对的（解决白屏问题）
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
