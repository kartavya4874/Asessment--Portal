import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    // Increase chunk warning threshold
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor splits — cached independently from app code
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'react-hot-toast'],
          'vendor-utils': ['axios', 'date-fns'],
        },
      },
    },
    // Minification
    minify: 'esbuild',
    // Enable source maps only in dev
    sourcemap: false,
    // Target modern browsers for smaller output
    target: 'es2020',
  },
})
