import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // Listen on all addresses
    port: 5173,
    allowedHosts: [
      'felicita-savoriest-nonmeteorologically.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      'localhost'
    ],
  },
  plugins: [react()],
})
