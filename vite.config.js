import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  base: '/candle-wish/',
  build: {
    outDir: 'dist',      // build into docs/ so Pages can serve it
    emptyOutDir: true
  },
  plugins: [tailwindcss(),react()],
})
