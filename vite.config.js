import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; other hosts use the root.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
});
