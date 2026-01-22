import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Use default Vite port (5173) to avoid conflict with Vercel dev (port 3000)
    port: 5173
  }
})
