## Objectif
Corriger le crash/écran figé du chat WAOUH en APK natif, et fournir les correctifs Android manifeste + release.

## 1. Fix critique source (BUG #1) — code applicatif

Fichier: `src/components/waouh/WaouhWebChat.tsx` (ligne 67)

```ts
// AVANT
const [open, setOpen] = useState(embedded);
// APRÈS
const [open, setOpen] = useState(embedded || fullscreen);
```

Effet: en mode natif (`fullscreen=true`), l'effet de chargement des messages + l'abonnement Realtime `waouh_messages` s'exécutent dès le montage. Plus d'écran vide.

Rebuild du bundle mobile (`dist-mobile/`) via `npm run build:mobile` (déjà câblé) pour que `npx cap sync android` embarque le correctif.

## 2. Fix Android manifest (BUG #2) — hors source JS

Le dossier `android/` n'est pas dans le repo (généré localement par `npx cap add android`). Je vais:

- Ajouter un fichier `mobile/android-manifest-patch.xml` (référence des permissions à insérer)
- Ajouter une note `MOBILE_BUILD.md` à la racine documentant la procédure exacte
- Optionnel: ajouter un petit script `scripts/patch-android-manifest.mjs` qui injecte automatiquement les `<uses-permission>` manquants dans `android/app/src/main/AndroidManifest.xml` après `npx cap add android` / `cap sync`

Permissions à ajouter avant `<application>`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## 3. Release / debuggable (BUG #3)

Documenter dans `MOBILE_BUILD.md`:
- Compiler avec `./gradlew assembleRelease` (et non `assembleDebug`)
- Vérifier que `buildTypes.release { debuggable false; minifyEnabled true }` dans `android/app/build.gradle`
- Signer l'APK avec un keystore release

## Fichiers touchés
- `src/components/waouh/WaouhWebChat.tsx` — fix `useState`
- `MOBILE_BUILD.md` — procédure manifest + release (nouveau)
- `scripts/patch-android-manifest.mjs` — patcher automatique (nouveau, optionnel)
- `dist-mobile/*` — régénéré via build mobile

## Procédure utilisateur après le merge
```bash
git pull
npm install
npm run build:mobile
npx cap sync android
node scripts/patch-android-manifest.mjs   # injecte les permissions
cd android && ./gradlew assembleRelease
```

## Hors périmètre
- Pas de changement de logique chat/notifications (déjà refait dans la session précédente)
- Pas de refonte UI
