// client/vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/', // Ensures paths work correctly on Netlify
  build: {
    outDir: 'dist', // Vite's default output folder
  }
})