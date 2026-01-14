import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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
