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
          // CORRECTION DÉFINITIVE v3
          // ───────────────────────────────────────────────────────────────────
          // Historique des crashes :
          //   v1 original  → react-leaflet dans chunk 'leaflet'  → createContext undefined
          //   v2           → react-pdf     dans chunk 'pdf'      → createContext undefined
          //   v3 (ici)     → radix/lucide  dans chunk 'vendor'   → forwardRef undefined
          //
          // Cause racine : isoler React dans son propre chunk 'react' est
          // dangereux. Rollup ne garantit PAS l'ordre d'exécution des chunks
          // frères. Toute lib React-dépendante dans un autre chunk peut crasher.
          //
          // Solution : SUPPRIMER le chunk 'react' personnalisé.
          // React + tous ses wrappers tombent dans 'vendor' → co-localisés →
          // order problem impossible par construction.
          // ═══════════════════════════════════════════════════════════════════

          // ─── Libs très lourdes SANS dépendance React → chunks isolés ───────
          // Ces libs sont du pur JS/WASM, elles n'ont pas besoin de React
          // et il est safe de les isoler.
          if (id.includes('@huggingface') || id.includes('onnxruntime')) return 'ai-hf';
          if (id.includes('@ffmpeg'))                                     return 'ffmpeg';
          if (id.includes('/node_modules/mapbox-gl'))                     return 'mapbox';

          // ─── Leaflet vanilla JS uniquement (sans react-leaflet) ─────────────
          // react-leaflet tombe dans vendor avec React → pas de risque d'ordre.
          if (id.includes('/node_modules/leaflet') && !id.includes('react-leaflet')) return 'leaflet';

          // ─── Moteurs PDF pur JS uniquement (sans react-pdf) ─────────────────
          // react-pdf tombe dans vendor avec React → pas de risque d'ordre.
          if (id.includes('pdfjs') || id.includes('jspdf')) return 'pdf';

          // ─── Charts / dataviz (recharts, d3, victory) ────────────────────────
          // recharts dépend de React mais il est importé dynamiquement dans
          // la plupart des apps. Si des crashes réapparaissent ici, déplacer
          // dans vendor également.
          if (
            id.includes('/node_modules/recharts') ||
            id.includes('/d3-') ||
            id.includes('victory-vendor')
          ) return 'charts';

          if (id.includes('xlsx')) return 'xlsx';

          // ─── Vendor catch-all ────────────────────────────────────────────────
          // Contient : React, react-dom, react-router, react-leaflet, react-pdf,
          // radix-ui, lucide-react, supabase, tanstack, react-hook-form, etc.
          // Tout est co-localisé → aucun problème d'ordre d'initialisation.
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
    chunkSizeWarningLimit: 2000,
  },
  base: '/',
  publicDir: 'public',
  preview: {
    port: 8080,
    strictPort: true,
  },
}));
