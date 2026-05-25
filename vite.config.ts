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
    sourcemap: false,
    cssCodeSplit: true,
    // esbuild minifier: plus sûr que terser sur les modules ESM complexes
    // (évite les TDZ "Cannot access 'a' before initialization" après mangling)
    minify: mode === 'production' ? 'esbuild' : false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // React core + tous les wrappers react-* dans le même chunk
          // pour éviter les cycles d'initialisation entre chunks.
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/') ||
            id.includes('/node_modules/object-assign/') ||
            id.includes('/node_modules/use-sync-external-store/') ||
            id.includes('/node_modules/react-router') ||
            (/\/node_modules\/react-[^/]+\//.test(id) && !id.includes('react-pdf') && !id.includes('react-leaflet'))
          ) return 'react';
          // Librairies très lourdes uniquement -> chunks isolés.
          if (id.includes('@huggingface') || id.includes('onnxruntime')) return 'ai-hf';
          if (id.includes('@ffmpeg')) return 'ffmpeg';
          if (id.includes('pdfjs') || id.includes('jspdf') || id.includes('react-pdf')) return 'pdf';
          if (id.includes('/node_modules/mapbox-gl')) return 'mapbox';
          if (id.includes('/node_modules/leaflet') || id.includes('react-leaflet')) return 'leaflet';
          if (id.includes('/node_modules/recharts') || id.includes('/d3-') || id.includes('victory-vendor')) return 'charts';
          if (id.includes('xlsx')) return 'xlsx';
          // Tout le reste (radix, lucide-react, supabase, tanstack, etc.)
          // -> un seul vendor pour éviter les cycles entre chunks.
          return 'vendor';
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
