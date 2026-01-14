import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // 使用 IPv4 地址，避免 IPv6 权限问题
    port: 5174, // 更换端口避免权限问题
    strictPort: false,
  },
  build: {
    outDir: "dist",
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      external: (id) => {
        // 不 externalize 项目内的模块
        if (id.startsWith('.') || id.startsWith('/')) return false;
        // externalize @heroui/spacer 如果找不到
        if (id === '@heroui/spacer') return false;
        return false;
      },
    },
  },
  resolve: {
    alias: {
      '@heroui/spacer': '@heroui/react',
    },
  },
});
