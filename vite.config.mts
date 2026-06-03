import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  base: '/game-rpg/',
  build: {
    assetsInlineLimit: 0,
  },
  plugins: [createHtmlPlugin()],
});
