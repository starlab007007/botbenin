# Checklist de publication Google Play — WaouhApp 1.3.0+4

## Statut actuel

**Ne pas publier en production tant que tous les points bloquants ci-dessous ne sont pas validés sur un AAB signé.**

## 1. Identité et package

- [x] Nom Android : `WaouhApp`.
- [x] Application ID : `bj.bot.waouhapp`.
- [x] `targetSdk = 36`, supérieur à l’exigence Play actuelle d’API 35 ou plus.
- [x] Version candidate : `1.3.0+4`.
- [x] Icône WAOUH définie dans l’application.
- [ ] Icône Play Store PNG 512 × 512 exportée depuis le logo officiel.
- [ ] Image de présentation PNG/JPEG 1 024 × 500 exportée et validée.

## 2. Signature et bundle

- [x] La configuration release refuse désormais le certificat de débogage.
- [ ] Créer une clé d’upload appartenant à WaouhApp et conserver sa sauvegarde chiffrée hors Git.
- [ ] Créer `android/key.properties` localement.
- [ ] Générer l’AAB avec `bash scripts/build_play_bundle.sh`.
- [ ] Vérifier que l’AAB est signé par la clé d’upload, puis l’importer dans le test interne.
- [ ] Activer Signature d’application Play dans Play Console.

## 3. Sécurité et confidentialité

- [ ] Déployer `public/privacy-waouhapp.html` et vérifier l’URL publique HTTPS.
- [ ] Créer et tester une adresse support réellement active avant d’afficher `support@bot.bj`.
- [ ] Mettre en production un mécanisme réellement fonctionnel de demande et traitement de suppression de compte.
- [ ] Compléter la déclaration Sécurité des données après revue de l’AAB, des Edge Functions et des prestataires.
- [ ] Vérifier que les clés Supabase sont limitées au rôle public et que les règles RLS protègent les tables.
- [ ] Corriger les contrôles d’accès de `waouh-history` et `waouh-operator-send` avant une exposition large.

## 4. Stabilité fonctionnelle

- [ ] Compiler sans erreur Dart ni erreur Gradle.
- [ ] Installer l’AAB depuis le test interne sur au moins deux appareils Android.
- [ ] Exécuter tout le protocole `CLOSED_TEST_QA.md`.
- [ ] Tester en particulier le couple vendeur/acheteur avec le même produit et le même prix.
- [ ] Vérifier les traces Supabase des messages, conversations, notifications et files sortantes.
- [ ] Déployer et tester les corrections WhatsApp OTP contenues dans `supabase/functions/`.
- [ ] Vérifier les permissions : caméra, images, localisation et notifications.

## 5. Fiche Play Store

- [x] Texte français préparé dans `STORE_LISTING_FR.md`.
- [ ] Renseigner catégorie, coordonnées, politique de confidentialité et e-mail d’assistance dans Play Console.
- [ ] Prendre au moins quatre captures réelles de la version testée selon `SCREENSHOT_CAPTURE_PLAN.md`.
- [ ] Importer uniquement les captures et visuels reflétant exactement l’AAB soumis.
- [ ] Terminer les questionnaires : contenu de l’application, classification, audience cible, accès à l’application et Sécurité des données.

## 6. Mise en ligne progressive

- [ ] Test interne : équipe produit et développeurs.
- [ ] Test fermé : utilisateurs représentatifs, retours consignés et défauts corrigés.
- [ ] Rapport de pré-lancement Play Console examiné et défauts critiques corrigés.
- [ ] Production : publication gérée, déploiement progressif de 5 % puis 20 %, 50 % et 100 % seulement si les indicateurs sont sains.
