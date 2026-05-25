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
    minify: mode === 'production' ? 'esbuild' : false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // ═══════════════════════════════════════════════════════════════════
          // RÈGLE ABSOLUE : tout module dont le nom commence par "react-"
          // est un wrapper React et DOIT vivre dans le chunk 'react'.
          // Cela garantit que React.createContext / React.useState etc.
          // sont déjà initialisés quand ces wrappers s'exécutent.
          //
          // CORRECTIONS appliquées ici vs version originale :
          //   • react-leaflet → n'est PLUS exclu  (fix bug leaflet v1)
          //   • react-pdf     → n'est PLUS exclu  (fix bug pdf  v2)
          // ═══════════════════════════════════════════════════════════════════
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/') ||
            id.includes('/node_modules/object-assign/') ||
            id.includes('/node_modules/use-sync-external-store/') ||
            id.includes('/node_modules/react-router') ||
            /\/node_modules\/react-[^/]+\//.test(id)
            // ↑ Tous les react-* sans AUCUNE exception :
            //   react-leaflet, react-pdf, react-query, react-hook-form…
            //   sont tous garantis d'avoir React disponible.
          ) return 'react';

          // ─── Librairies très lourdes sans dépendance React ─────────────────
          if (id.includes('@huggingface') || id.includes('onnxruntime')) return 'ai-hf';
          if (id.includes('@ffmpeg')) return 'ffmpeg';

          // ─── PDF : uniquement les moteurs de rendu pur JS ──────────────────
          // CORRECTION : react-pdf retiré d'ici (c'est un wrapper React, voir
          // bloc 'react' ci-dessus). Seuls pdfjs et jspdf restent ici.
          if (id.includes('pdfjs') || id.includes('jspdf')) return 'pdf';

          if (id.includes('/node_modules/mapbox-gl')) return 'mapbox';

          // ─── Leaflet : uniquement la lib vanilla JS ────────────────────────
          // CORRECTION (v1) : react-leaflet retiré d'ici (wrapper React).
          if (id.includes('/node_modules/leaflet') && !id.includes('react-leaflet')) return 'leaflet';

          if (
            id.includes('/node_modules/recharts') ||
            id.includes('/d3-') ||
            id.includes('victory-vendor')
          ) return 'charts';

          if (id.includes('xlsx')) return 'xlsx';

          // ─── Vendor catch-all ──────────────────────────────────────────────
          // radix, lucide-react, supabase, tanstack, etc.
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
