import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths: the same build then works whether it's opened
  // directly as a local file, dropped in a sub-folder of a host, or served
  // from a domain root (Netlify, etc). Absolute "/assets/..." paths only
  // resolve correctly in that last case.
  base: './',
  plugins: [react()],
})
