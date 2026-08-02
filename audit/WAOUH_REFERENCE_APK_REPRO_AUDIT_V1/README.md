# WAOUH — Audit et reproduction de l’APK de référence

Ce paquet ne prétend pas reconstituer du code Dart depuis l’APK. Une compilation Flutter AOT supprime les noms, structures et informations nécessaires à une reconstruction source exacte.

Il fournit une méthode de preuve : restaurer les quatre fichiers de chat connus depuis la sauvegarde pré-V2, verrouiller l’environnement identifié dans l’APK, reconstruire, puis comparer l’APK candidat à la référence octet par octet et entrée par entrée.

## Identité de la référence

- SHA-256 APK : `d27b04e2a66d066db645475177005054a51e6dd701a1075173bd1d57d479e2c2`
- Taille : `33 576 508` octets
- Package : `bj.bot.waouhapp`
- Version : `1.3.0` (`versionCode 4`)
- SDK : min 24, target/compile 36
- AGP 8.11.1, Gradle 8.13, Kotlin 2.2.20, NDK r28c (28.2.13676358)
- Flutter déduit : 3.44.4, révision embarquée `a10d8ac38de835021c8d2f920dbf50a920ccc030`
- Signature : Android Debug, certificat SHA-256 `D82AD6A884F7219D1A1B626D87DFD50BF0F63D8710E0C6BF2C27957BAB82D521`

## Audit uniquement

```bash
cd "$HOME/Downloads/WAOUH_REFERENCE_APK_REPRO_AUDIT_V1"
bash restaurer_auditer_reconstruire_reference.sh \
  "$HOME/Downloads/WAOUH_BOTS_ROUTE_ONLY_20260726_200613" \
  "$HOME/Downloads/WAOUH_CHAT_UI_PREMIUM_V1_20260730_232304.apk" \
  "$HOME/Downloads/WAOUH_CHAT_UI_AVANT_PREMIUM_V2_20260731_004636"
```

## Restauration ciblée connue + build + comparaison

```bash
RESTORE=1 BUILD=1 \
bash restaurer_auditer_reconstruire_reference.sh \
  "$HOME/Downloads/WAOUH_BOTS_ROUTE_ONLY_20260726_200613" \
  "$HOME/Downloads/WAOUH_CHAT_UI_PREMIUM_V1_20260730_232304.apk" \
  "$HOME/Downloads/WAOUH_CHAT_UI_AVANT_PREMIUM_V2_20260731_004636"
```

La seule preuve absolue est :

```text
SUCCES ABSOLU: APK identiques octet par octet.
```

Si `libapp.so` diffère, le code source complet, le verrou de dépendances, les assets ou la version Flutter ne sont pas identiques. Un APK seul ne permet pas de retrouver la source exacte manquante; il faut alors la snapshot/commit complet ayant servi à la compilation.
