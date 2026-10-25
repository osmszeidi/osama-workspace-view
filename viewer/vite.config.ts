import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: __dirname,
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src/renderer/src'),
      '@shared': resolve(__dirname, '../src/shared')
    }
  },
  css: { postcss: resolve(__dirname, '..') },
  publicDir: resolve(__dirname, 'public'),
  build: { outDir: resolve(__dirname, '../dist'), emptyOutDir: true, assetsInlineLimit: 0 }
})
