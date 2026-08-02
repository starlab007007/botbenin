# WAOUH — État de préparation Google Play

## Validé par l’audit local du 2 août 2026

- Projet : `/Users/macbook/Downloads/WAOUH_REFERENCE_LOCAL_V1/flutter_waouh_app`
- Flutter stable 3.44.4 / Dart 3.12.2
- Application ID : `bj.bot.waouhapp`
- `compileSdk = 36`
- `targetSdk = 36`
- Version : `1.3.0+4`
- Analyse Flutter : aucune erreur bloquante (`ANALYZE_EXIT=0`)
- Tests : 35 tests réussis (`TEST_EXIT=0`)

## Appliqué par le paquet

- Icône Android WAOUH sur toutes les densités.
- Icône Google Play PNG 512 × 512.
- Nom Android `WAOUH`.
- Redirection par défaut après authentification vers l’onglet Bots (`/app/ia`).
- Conservation de la destination explicite `next` lorsqu’un utilisateur se connecte après une action protégée.
- Retrait des permissions larges de lecture de la galerie ; les sélecteurs système restent utilisés.
- Préparation des pages externes confidentialité et suppression de compte.

## Blocages avant envoi en production

1. Créer la clé d’upload WAOUH et `android/key.properties`.
2. Générer l’AAB Release signé.
3. Publier les deux pages HTML sur des URL HTTPS.
4. Vérifier que `support@bot.bj` est actif.
5. Google Play exige un chemin de confidentialité et de suppression depuis l’application. Ce point ne peut pas être rempli sous l’interdiction absolue de modifier l’UI existante.
6. Fournir à Google un compte de démonstration réutilisable qui ne dépend pas d’un OTP expirant.
7. Compléter Sécurité des données selon l’AAB final et les prestataires réellement actifs.
8. Importer de vraies captures de l’AAB testé.
9. Exécuter le test interne, puis le test fermé exigé selon le type et la date du compte développeur.
