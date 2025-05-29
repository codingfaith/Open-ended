import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        quiz: resolve(__dirname, 'quiz.html'),
        about: resolve(__dirname, 'about.html'),
        contact: resolve(__dirname, 'contact.html'),
        auth: resolve(__dirname, 'auth.html'),
        dashboard: resolve(__dirname, 'dashboard.html')
      }
    }
  }
})