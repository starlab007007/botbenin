# Audit minutieux — WAOUH_CHAT_UI_PREMIUM_V1_20260730_232304.apk

## Verdict

L’APK est un build Flutter AOT optimisé, signé avec la clé Android Debug du Mac. Il correspond à l’UI ancienne/pré-V2 : la chaîne `WAOUH prepare la reponse...` est présente, tandis que les marqueurs Premium V2/V3 sont absents.

Une restauration exacte du **code source complet** depuis cet APK n’est pas techniquement possible. Le fichier `libapp.so` contient du code machine AOT dépouillé, pas les fichiers Dart originaux. La voie fiable est de restaurer un snapshot source complet daté d’avant la compilation, puis de prouver la reproduction par égalité SHA-256 de l’APK.

## Empreintes critiques

| Élément | Valeur |
|---|---|
| APK SHA-256 | `d27b04e2a66d066db645475177005054a51e6dd701a1075173bd1d57d479e2c2` |
| Taille | `33 576 508` octets |
| Entrées ZIP | `517` |
| Manifest SHA-256 | `11e300baf07d2f12f1e518c680ed57f16dc4a9b8c1200444ab94fb31f58704ad` |
| resources.arsc | `74ebc9d71a471aa73a1cb060662fec2dadb1ccdfea8999d8c56cfcfabe8aed6f` |
| classes.dex | `4dc2a00c6d084d52ef723176372607ac834fbd5de6cd0adca58ba687e0154756` |
| classes2.dex | `2328f854201ed46b013d9c2517770f9b8c59f5cc6c244fa5fc46382f15aefd66` |
| libapp.so | `8fb9e6f6c3df165aa790e9a3c151a003dd6b899b634a232032e84850a626d322` |
| libapp Build ID | `b7188509213916dc1ab80642921b994c` |
| libflutter.so | `bc65ea22533619373528334ecab818f8220f2f1136cd09c44fb141d7377f93b2` |
| libflutter Build ID | `84dd18c3fc231f412f2e51607770c9d085a248b6` |

## Identité Android

- package : `bj.bot.waouhapp`
- application : `WaouhApp`
- versionName : `1.3.0`
- versionCode : `4`
- minSdk : `24`
- targetSdk / compileSdk : `36`
- activité : `bj.bot.waouhapp.MainActivity`

## Chaîne de build

- Android Gradle Plugin : `8.11.1`
- Gradle : `8.13`
- Kotlin Gradle Plugin : `2.2.20`
- NDK : `r28c`, révision `28.2.13676358`
- Flutter déduit : `3.44.4`
- révision Flutter embarquée : `a10d8ac38de835021c8d2f920dbf50a920ccc030`

## Signature

- schéma : APK Signature Scheme v2
- sujet/émetteur : `C=US, O=Android, CN=Android Debug`
- RSA 2048, SHA256withRSA
- certificat SHA-256 : `D82AD6A884F7219D1A1B626D87DFD50BF0F63D8710E0C6BF2C27957BAB82D521`
- certificat valide du 21 février 2026 au 14 février 2056

## UI statiquement confirmée

Présents :

- `Assistant de recherche et de vente`
- `WAOUH prepare la reponse...`
- `Discussion produit`
- `Conversation produit`
- `Vendre`, `Acheter`, `Negocier`
- `/app/chat`, `/app/chat/waouh`, `/app/chat/match/:key`

Absents :

- `WAOUH recherche et organise les résultats…`
- `WAOUH analyse et organise les résultats…`
- `Assistant IA · Premium V3`
- composant `LivePremiumMessageContent`

## Limite fondamentale

L’égalité visuelle ne suffit pas à prouver l’égalité du code. L’unique critère final demandé — « exactement le même APK » — est l’égalité SHA-256 du fichier complet. Toute différence de source, dépendance, Flutter Engine, plugin Android, clé de signature ou packaging change l’empreinte.
