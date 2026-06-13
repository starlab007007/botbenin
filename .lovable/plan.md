## Diagnostic — pourquoi le logo n'apparaît pas

1. **`public/favicon.ico` est en réalité un PNG renommé** (363 KB, déclaré `type="image/x-icon"` dans le manifest). Plusieurs navigateurs (et Android lors de l'install PWA) le rejettent silencieusement.
2. **`public/manifest.json` référence `/icon-192.png` et `/icon-512.png` qui n'existent pas** → installation PWA / icône Home-Screen tombe en fallback générique.
3. **`<meta property="og:image">` annonce 1200×1200** alors que le PNG WAOUH n'a pas ces dimensions → certains scrapers ignorent.
4. Le composant `BotBjLogo` affiche un texte `BOT.BJ` en bleu **à côté** de l'icône. L'utilisateur veut le logo WAOUH partout — il faut probablement masquer/remplacer le label texte.
5. Les caches navigateur + Service Worker (`public/sw.js`) servent toujours l'ancien favicon → besoin d'un bust de cache (renommer le fichier ou query string `?v=2`).

## Diagnostic — pas d'offline réel

- `public/sw.js` actuel ne met **rien** en cache (commenté volontairement). Donc dès qu'Internet coupe : écran blanc, plus rien ne marche.
- Les messages WAOUH sont stockés uniquement dans Supabase + un cache mémoire React (`useWaouhMatchChats.getCached`) → perdus à chaque refresh hors-ligne.
- Aucun indicateur visuel "hors ligne" global. Aucun toast quand la connexion revient.

## Plan d'action

### A. Logo & icônes (corrige la visibilité)

1. Supprimer le `favicon.ico` actuel (PNG mal nommé) et le remplacer par **un vrai `.ico` multi-tailles** OU servir directement le PNG avec `type="image/png"` dans tous les liens.
2. Générer `public/icon-192.png` et `public/icon-512.png` (redimensionnement du logo WAOUH) — requis par le manifest et le splash PWA.
3. Mettre à jour `public/manifest.json` : types MIME corrects, ajout `icon-192/512`, `theme_color: "#075E54"` (vert WAOUH), `background_color` cohérent.
4. Mettre à jour `index.html` et `index.mobile.html` : références `?v=2` pour invalider les caches, balise `<link rel="apple-touch-icon" sizes="180x180">`.
5. `BotBjLogo.tsx` : agrandir l'icône, retirer (ou rendre optionnel via prop) le texte bleu `BOT.BJ` puisque le logo WAOUH contient déjà le branding.
6. Mettre à jour `capacitor.config.ts` / `scripts/patch-android-manifest.mjs` si nécessaire pour que l'APK régénérée embarque bien le nouveau drawable.

### B. Mode offline type WhatsApp

1. **Service Worker — stratégie en couches** (réécriture de `public/sw.js`, sans `vite-plugin-pwa` pour éviter conflits préview Lovable) :
   - `install` : précache du shell (`/`, `/app/chat`, `index.html`, logo, manifest).
   - `fetch` :
     - HTML/navigation → **NetworkFirst** avec fallback cache + page offline.
     - Assets hashés `/assets/*` → **CacheFirst**.
     - Images / fonts → **StaleWhileRevalidate**.
     - API Supabase / fonctions edge → **NetworkOnly** (jamais cacher des écritures).
   - Garde-fou : ne s'enregistre **pas** dans la preview Lovable (`id-preview--`, `lovableproject.com`, iframe, `?sw=off`).
2. **Persistance des messages (IndexedDB)** via un petit wrapper `src/services/offline/messageCache.ts` :
   - Cache des derniers messages WAOUH par `match_id` et par session, déjà chargés.
   - `useWaouhMatchChats` et le composant `WaouhWebChat` lisent **d'abord** IndexedDB puis Supabase (pattern "stale-while-revalidate").
   - File d'attente locale (`pending_messages`) pour les envois hors ligne → rejouée à la reconnexion via un hook `useOutboxSync`.
3. **Hook global `useOnlineStatus`** (`src/hooks/useOnlineStatus.ts`) basé sur `navigator.onLine` + ping périodique d'une edge function légère.
4. **Composant `OfflineBanner`** monté dans `MobileShell` et le layout web :
   - Bandeau jaune persistant "📡 Hors ligne — vos messages seront envoyés à la reconnexion".
   - Toast vert "✅ Connexion rétablie — synchronisation en cours" au retour.
5. **Messages d'erreur contextualisés** dans les actions critiques (envoi message, chargement bot, paiement Qosic, OTP WhatsApp) : si offline détecté, afficher un message clair en français au lieu d'une erreur réseau brute.
6. **Page `/offline.html`** servie en dernier recours par le SW si même le shell n'est pas en cache.

### C. Validation

- Build, puis dans le preview : DevTools → Network → "Offline" → recharger `/app/chat` → vérifier que la liste, les bulles et les onglets s'affichent.
- Vérifier que le favicon et l'icône Home-Screen sont bien le logo WAOUH.
- Sur APK : tester avoir ouvert l'app une fois en ligne, activer mode avion → l'app reste utilisable.

## Détails techniques (référence)

- IndexedDB via wrapper minimal (pas de lib), 2 stores : `messages` et `outbox`.
- SW : pas de `vite-plugin-pwa` (incompatible avec workflow Lovable preview) — SW manuel avec garde de hostname.
- Cache versionné `waouh-shell-v1` ; bump du suffixe à chaque release pour purger.
- Ne pas cacher les requêtes `POST/PUT/DELETE`, ni les routes `/~oauth`, ni les fonctions edge Supabase contenant des paiements.
- Notification push existante (`push` handler) **préservée**.

## Hors périmètre

- Pas de modification des règles RLS ni du flow chat sync v12 (verrouillé).
- Pas de migration `vite-plugin-pwa` (resterait le SW manuel maîtrisé).
- Pas de refonte UI hors logo et bandeau offline.
