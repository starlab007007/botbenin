## Objectif

Produire un APK Android Capacitor qui n'embarque **que** l'app `src/app-mobile/*` (et ses dépendances partagées dans `src/components`, `src/hooks`, `src/integrations`, `src/contexts`, `src/lib`), sans le site web marketing/admin (HomePage, Dashboard, Modules, Admin, WAOUH web, etc.).

Le build web actuel (`bun run build` → `dist/`) reste intact pour bot.bj. On ajoute un build parallèle `build:mobile` → `dist-mobile/` que Capacitor utilisera comme `webDir`.

## Architecture cible

```text
src/
├── main.tsx              ← entry WEB (existant, inchangé)
├── App.tsx               ← routeur WEB complet (inchangé)
├── main.mobile.tsx       ← NOUVEAU entry mobile
├── AppMobile.tsx         ← NOUVEAU routeur mobile (uniquement routes /app/*)
└── app-mobile/           ← inchangé, source de vérité APK

index.html                ← WEB (inchangé)
index.mobile.html         ← NOUVEAU, charge /src/main.mobile.tsx

vite.config.ts            ← branche sur MOBILE_BUILD env
                              - input = index.mobile.html
                              - outDir = dist-mobile
                              - manualChunks simplifiés (pas de pdf/ffmpeg/mapbox/leaflet)

capacitor.config.ts       ← webDir: 'dist-mobile' (au lieu de 'dist')

package.json              ← scripts:
                              - "build:mobile": "MOBILE_BUILD=1 vite build"
                              - "cap:sync":   "npm run build:mobile && cap sync android"
                              - "cap:open":   "cap open android"
```

## AppMobile.tsx — routeur mobile minimal

Reprend uniquement les providers nécessaires (`QueryClientProvider`, `AuthProvider`, `UserProvider`, `LanguageProvider`, `TooltipProvider`, `Toaster`, `Sonner`, `BrowserRouter`) et déclare seulement les routes `/app/*` déjà présentes dans `App.tsx` lignes 288-310 environ (auth, shell, chat, bots, partner, profile). Toute URL inconnue redirige vers `/app/chat`. Pas de `HomePage`, `DashboardPage`, modules, admin, WAOUH web, blog, FAQ, pricing, etc.

Avantage : tree-shaking automatique — les pages web ne sont jamais importées, donc absentes du bundle APK.

## index.mobile.html

Copie minimaliste de `index.html` :
- garde viewport, theme-color, manifest, polices
- supprime tout le SEO marketing (OG, JSON-LD, GTM, GA, hreflang, sitemap hints)
- charge `<script type="module" src="/src/main.mobile.tsx">`

## vite.config.ts — branchement conditionnel

```ts
const isMobile = process.env.MOBILE_BUILD === '1';

return {
  build: {
    outDir: isMobile ? 'dist-mobile' : 'dist',
    rollupOptions: {
      input: isMobile
        ? path.resolve(__dirname, 'index.mobile.html')
        : path.resolve(__dirname, 'index.html'),
      output: { /* manualChunks allégé en mode mobile */ },
    },
  },
};
```

En mode mobile : `manualChunks` retire `ai-hf`, `ffmpeg`, `mapbox`, `leaflet`, `pdf`, `charts`, `xlsx` (non utilisés par app-mobile) — tout reste dans `vendor`.

## capacitor.config.ts

- `webDir: 'dist-mobile'`
- `server.url` retiré (déjà conditionné `isDev` mais on confirme : APK release = no server.url)
- StatusBar/SplashScreen inchangés

## Pages partagées conservées

`src/app-mobile/*` continue d'importer librement `@/components/ui/*`, `@/hooks/*`, `@/integrations/supabase/client`, `@/contexts/*`, `@/lib/*`. Aucun refactor. Le tree-shaking de Rollup garantit que seuls les modules réellement atteints depuis `AppMobile.tsx` sont inclus.

## Étapes d'implémentation

1. Créer `src/AppMobile.tsx` (routeur réduit, copie ciblée des routes /app/* de App.tsx)
2. Créer `src/main.mobile.tsx` (rend `<AppMobile />`)
3. Créer `index.mobile.html` à la racine
4. Modifier `vite.config.ts` (input + outDir + manualChunks conditionnés)
5. Modifier `capacitor.config.ts` (`webDir: 'dist-mobile'`)
6. Ajouter scripts `build:mobile`, `cap:sync`, `cap:open` dans `package.json`
7. Vérifier qu'aucune route /app n'importe accidentellement une page web (`rg "from.*pages/(?!waouh)" src/app-mobile`)

## Pour générer l'APK (instructions utilisateur, exécutées en local)

```bash
git pull
npm install
npm run build:mobile         # produit dist-mobile/
npx cap sync android
npx cap open android         # Android Studio → Build → Build APK(s)
```

ou en CLI :
```bash
cd android && ./gradlew assembleDebug
# APK : android/app/build/outputs/apk/debug/app-debug.apk
```

## Hors-périmètre

- Pas de refactor des composants partagés
- Pas de modification des routes web
- Pas de pipeline CI/CD APK (peut être ajouté plus tard via GitHub Actions)
- Pas de signing release/Play Store (debug APK suffit pour test ; signing à configurer séparément)
