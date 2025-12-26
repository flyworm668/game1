import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 注意：如果你要部署到 GitHub Pages 的 /tree/ 子路径，请取消下面这行的注释
  // base: '/tree/', 
});