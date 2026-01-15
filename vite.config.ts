import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // 使用相对路径，确保打包后的资源能正确加载
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
      output: {
        manualChunks: undefined,
      },
      onwarn(warning, warn) {
        // 忽略 @react-aria/live-announcer 的解析警告
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.id?.includes('@react-aria/live-announcer')) {
          return;
        }
        warn(warning);
      },
    },
  },
  resolve: {
    alias: {
      '@heroui/spacer': '@heroui/react',
      '@react-aria/live-announcer': path.resolve(__dirname, 'node_modules/@react-aria/live-announcer'),
    },
    dedupe: ['@react-aria/live-announcer'],
  },
  optimizeDeps: {
    include: ['@react-aria/live-announcer'],
    esbuildOptions: {
      conditions: ['import', 'module', 'browser', 'default'],
    },
  },
});
