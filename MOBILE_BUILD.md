# Build APK — WaouhApp

## Procédure complète

```bash
git pull
npm install
npm run build:mobile
npx cap add android        # première fois seulement
npx cap sync android
node scripts/patch-android-manifest.mjs
cd android && ./gradlew assembleRelease
```

L'APK signé se trouve dans `android/app/build/outputs/apk/release/`.

## Permissions injectées par le script

- `CAMERA` — bouton Photo dans le chat WAOUH
- `READ_MEDIA_IMAGES` (API 33+) / `READ_EXTERNAL_STORAGE` (<33) — galerie
- `WRITE_EXTERNAL_STORAGE` (<=28) — sauvegarde fichiers
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` — géolocalisation des annonces

Le script force aussi `android:debuggable="false"`.

## Release signé

Dans `android/app/build.gradle`, vérifier :

```gradle
android {
  buildTypes {
    release {
      minifyEnabled true
      debuggable false
      signingConfig signingConfigs.release
    }
  }
}
```

Créer un keystore (une seule fois) :

```bash
keytool -genkey -v -keystore waouh-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias waouh
```

Et ajouter dans `android/key.properties` :

```
storePassword=...
keyPassword=...
keyAlias=waouh
storeFile=../waouh-release.jks
```

## Correctifs livrés dans cette release

1. **Chat WAOUH vide** : `useState(embedded || fullscreen)` dans `WaouhWebChat.tsx` — les messages et le Realtime se chargent dès l'ouverture en mode natif.
2. **Permissions Android** : injectées via `scripts/patch-android-manifest.mjs`.
3. **Mode debug** : forcé à `false`.
