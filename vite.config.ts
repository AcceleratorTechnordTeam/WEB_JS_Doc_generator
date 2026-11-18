import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Chemins relatifs : le site fonctionne sous n'importe quel sous-chemin
  // (GitHub Pages sert le projet sur https://<compte>.github.io/<repo>/).
  base: './',
  plugins: [react()],
})
