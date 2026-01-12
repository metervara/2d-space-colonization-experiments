import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'SpaceColonization',
      fileName: (format) => format === 'es' ? 'index.js' : 'index.cjs',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      // Don't bundle these - they should be peer deps or user installed
      external: [],
    },
    sourcemap: true,
    minify: false
  }
});
