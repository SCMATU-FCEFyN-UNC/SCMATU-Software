//import { defineConfig } from 'vite'
import { defineConfig } from "vitest/config"; 
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
  base: './',
  build: {
    			outDir: 'dist-react',
  			},
  server: {
    host: 'localhost',
    port: 5123,
    strictPort: true
  }
})
