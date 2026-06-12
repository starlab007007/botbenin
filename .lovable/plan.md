
# Cahier de recette bot.bj — Plan de livraison

## Objectif

Produire un cahier de recette officiel, exhaustif (200+ scénarios), couvrant les 4 profils (visiteur anonyme, mobile APK, acheteur/vendeur WAOUH, partenaire/admin), livré sous deux formes : page web consultable dans bot.bj + fichier `.docx` téléchargeable.

## Livrables

1. **Document Word** : `/mnt/documents/Cahier_Recette_bot_bj_v1.docx` généré via `docx-js`, prêt impression.
2. **Page web** : nouvelle route `/app/recette` (et alias public `/recette`) avec :
   - Sommaire ancré
   - Toutes les sections rendues en HTML imprimable
   - Boutons « Télécharger .docx » et « Imprimer / PDF navigateur »
3. **Composants/data** :
   - `src/data/recette/` : fichiers TS structurés (sections, modules, scénarios, matrices) — source unique partagée entre la page et le script de génération DOCX.
   - `src/pages/RecettePage.tsx` : rendu lecture.
   - `scripts/generate-recette-docx.mjs` : script Node générant le DOCX depuis la même data.

## Structure du document (conforme au brief)

1. Page de garde (titre, version 1.0, date 12/06/2026, MOA/MOE, statut)
2. Historique des versions
3. Acronymes & définitions (WAOUH, WAHA, NLLB, RLS, FCFA, MoMo, etc.)
4. Introduction (contexte bot.bj — agent IA WhatsApp + WAOUH marketplace + Radar + Partenaire + Mobile APK)
5. Périmètre (inclus / exclus)
6. Objectifs de la recette (11 axes)
7. Environnement de recette (URLs, navigateurs, devices, jeux de données, comptes)
8. Acteurs (tableau 7 rôles)
9. Stratégie de recette (15 types : fonctionnelle → restauration)
10. Niveaux de criticité (bloquante, majeure, mineure, cosmétique, évolution)
11. Critères d'entrée / sortie
12. **Matrice des droits** (Module × Fonctionnalité × 5 rôles + Observations, valeurs C/L/M/S/V/E/N/A)
13. **Scénarios détaillés par module** — 18 modules, 200+ scénarios formatés en tableau (ID, Module, Fonctionnalité, Objectif, Préconditions, Profil, Données, Étapes, Résultat attendu, Résultat obtenu, Statut, Criticité, Preuve, Commentaires)
14. Grille de suivi des anomalies
15. Modèle de fiche d'anomalie
16. Modèle de PV de recette
17. Critères de validation finale, réserves, recommandations pré-prod
18. Conclusion

## Couverture modulaire renforcée (focus chat & WAOUH)

Au-delà des 18 modules génériques du brief, le document détaillera spécifiquement :

- **Chat WAOUH visiteur anonyme** : header `x-waouh-session`, persistance localStorage, RGPD, reprise conversation, fallback hors-ligne.
- **Chat APK mobile** (`ChatScreen.tsx`) : auth Supabase, realtime `waouh_messages` filtré par `conversation_id`, envoi `waha-send-message`, marquage lu.
- **WaouhMatchChatWindow multi-fenêtres** (v12 locked) : matchKey par (article, acheteur), filtrage realtime `counterpart_user_id`, scénarios A/B/C (acheteur seul, vendeur seul, conversation croisée).
- **Pipeline WhatsApp** : queue `waouh_outbound_queue` avec retry exponentiel 5s→1h, dedup `meta->>'channel_message_id'`, rate-limit 10 msg/min/numéro, circuit breaker.
- **Radar IA** : signaux `waouh_radar_signals`, contacts, campagnes, matching.
- **Partenaire business** : payouts, produits, ventes, permissions.
- **Admin** : `user_roles` (security definer `has_role`), audit logs, dashboard santé.
- **Interopérabilité** : WAHA proxy, Qosic (Mobile Money), ElevenLabs (Kpakpato vocal), Hugging Face NLLB (Fon/Yoruba), Google Sheets KB.
- **Sécurité** : phases 1-4 déjà appliquées (RLS, search_path, dedup, indexes) à vérifier en recette.

## Répartition cible des scénarios (~210)

| Module | Scénarios |
|---|---|
| 1. Authentification | 15 |
| 2. Gestion utilisateurs | 12 |
| 3. Rôles & permissions | 10 |
| 4. Tableau de bord | 10 |
| 5. Données métier (articles WAOUH) | 14 |
| 6. Workflows négociation/deal | 12 |
| 7. Notifications (WA/email/in-app/push) | 14 |
| 8. Recherche & filtres | 10 |
| 9. Import données | 8 |
| 10. Export & rapports | 10 |
| 11. Paramétrage | 8 |
| 12. Journalisation & audit | 8 |
| 13. Documents & pièces jointes | 8 |
| 14. UI/UX & responsive | 12 |
| 15. Sécurité | 18 |
| 16. Performance & charge | 10 |
| 17. API & intégrations (WAHA, Qosic, ElevenLabs, NLLB, Google Sheets) | 14 |
| 18. Sauvegarde / disponibilité | 6 |
| **CHAT WAOUH dédié** (A/B/C, sync v12, multi-fenêtres) | 18 |
| **Mobile APK** (chat embedded, push, offline) | 10 |
| **Partenaire/Admin** | 10 |

Total ≈ **227 scénarios**.

## Détails techniques

- **DOCX** : `docx@^8` (déjà disponible via npm), Arial 11pt, US Letter, tableaux DXA, styles Heading1-3 surchargés, TOC auto, page numbers footer, en-tête « Cahier de recette — bot.bj ».
- **Page web** : route ajoutée dans le router principal + entrée discrète dans menu Admin (non visible utilisateur final). Composant `RecetteSection` réutilisable. Bouton download = fetch `/recette/Cahier_Recette_bot_bj_v1.docx` depuis `public/`.
- **Génération DOCX** : script copié sous `/tmp` puis exécuté ; sortie dans `/mnt/documents` + copie dans `public/recette/` pour téléchargement depuis l'app.
- **QA visuel** : conversion DOCX → PDF → images via LibreOffice, inspection de toutes les pages avant livraison.

## Étapes de build (après approbation)

1. Créer `src/data/recette/` (sections, 18 modules, 227 scénarios, matrice droits).
2. Créer `src/pages/RecettePage.tsx` + route dans `src/App.tsx`.
3. Créer `scripts/generate-recette-docx.mjs` consommant la même data.
4. Exécuter le script → `/mnt/documents/Cahier_Recette_bot_bj_v1.docx` + `public/recette/Cahier_Recette_bot_bj_v1.docx`.
5. QA visuel DOCX (LibreOffice → images).
6. Vérifier la page `/app/recette` dans le preview.
7. Présenter `<presentation-artifact>` pour le DOCX.

## Hors périmètre

- Pas de modification du code métier (chat, RLS, edge functions) — recette uniquement documentaire.
- Pas de mise en production automatique.
