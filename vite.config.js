import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  base: '/Candle-Wish/',
  build: {
     outDir: 'docs',      // build into docs/ so Pages can serve it
     emptyOutDir: true
   },
  plugins: [tailwindcss(),react()],
})
