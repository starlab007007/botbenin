import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  optimizeDeps: {
    include: ["recharts"]
  },

  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: [
      '@huggingface/transformers',
      '@ffmpeg/ffmpeg',
      '@ffmpeg/util',
    ],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    cssCodeSplit: true,
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: { safari10: true },
    } : undefined,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler') || id.includes('react-router')) return 'react';
          if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul')) return 'radix';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('leaflet') || id.includes('mapbox')) return 'maps';
          if (id.includes('@huggingface') || id.includes('onnxruntime')) return 'ai-hf';
          if (id.includes('@ffmpeg')) return 'ffmpeg';
          if (id.includes('pdfjs') || id.includes('jspdf') || id.includes('react-pdf')) return 'pdf';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('@tanstack')) return 'query';
          if (id.includes('framer-motion') || id.includes('/motion/')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('@11labs') || id.includes('@elevenlabs')) return 'elevenlabs';
          if (id.includes('jszip') || id.includes('crypto-js') || id.includes('dompurify')) return 'utils-heavy';
          if (id.includes('date-fns')) return 'date';
          if (id.includes('embla-carousel')) return 'carousel';
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'forms';
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff2?|ttf|otf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  base: '/',
  publicDir: 'public',
  preview: {
    port: 8080,
    strictPort: true,
  },
}));
