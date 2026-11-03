import react from '@vitejs/plugin-react';
import { defineConfig, transformWithOxc } from 'vite';

// 컴포넌트 파일도 .js로 쓴다. Vite는 기본으로 .js 안의 JSX를 읽지 않으므로,
// src 아래 .js 파일의 JSX를 먼저 일반 JS로 바꿔 둔다.
function jsxInJs() {
  let isBuild = false;
  return {
    name: 'jsx-in-js',
    enforce: 'pre',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    async transform(code, id) {
      const [file] = id.split('?');
      if (!/[\\/]src[\\/].*\.js$/.test(file) || file.includes('node_modules')) return null;
      const result = await transformWithOxc(code, file, {
        lang: 'jsx',
        jsx: { runtime: 'automatic', development: !isBuild },
      });
      return { code: result.code, map: result.map };
    },
  };
}

export default defineConfig({
  plugins: [jsxInJs(), react()],
  optimizeDeps: {
    rolldownOptions: {
      moduleTypes: { '.js': 'jsx' },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
