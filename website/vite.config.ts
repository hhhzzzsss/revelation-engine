import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';

// https://vite.dev/config/
export default defineConfig({
  base: '/revelationengine/',
  plugins: [react(), tailwindcss(), wasm()],
  worker: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    plugins: () => [wasm()],
  },
});
