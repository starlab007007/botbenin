# Plan — Test E2E WhatsApp WAOUH (9 matrices)

## Objectif

Exécuter et documenter le parcours complet **« je vends un BIC à 10 000 FCFA avec photo »** vs **« je cherche un BIC »** dans 9 configurations :

| | Source annonce: Chat | Source: Partenaire | Source: Radar IA |
|---|---|---|---|
| **A** — Vendeur WA + Acheteur WA | A1 | A2 | A3 |
| **B** — Vendeur App + Acheteur WA | B1 | B2 | B3 |
| **C** — Vendeur WA + Acheteur App | C1 | C2 | C3 |

## Méthode d'exécution

Pas de test manuel WhatsApp réel (pas d'accès aux 2 téléphones depuis l'agent). À la place je simulerai chaque parcours **bout-en-bout via les edge functions réelles** déjà déployées, en lisant ensuite la DB et `waouh_outbound_queue` pour reconstituer ce que chaque côté a réellement reçu.

### Pour chaque cellule (9 cas), je vais :

1. **Préparer les acteurs** (DB)
   - Acheteur + vendeur dédiés (numéros de test E.164) dans `waouh_users`, avec ou sans `web_session_id` selon scénario.
   - Profil acheteur dans `waouh_buyer_profiles` (mot-clé « bic », prix max).

2. **Créer l'annonce** selon le cas
   - **Chat** → `waouh-sell-handler` (message vendeur « je vends un bic à 10000 », 1 photo).
   - **Partenaire** → insert `waouh_partner_products` + push dans `waouh_unified_catalog` (source=`partner`).
   - **Radar IA** → insert `waouh_external_listings` + `waouh_unified_catalog` (source=`radar`).

3. **Déclencher la rencontre acheteur**
   - WA acheteur → `waouh-channel-in` (« je cherche un bic ») → liste → `intéressé 1`.
   - App acheteur → bouton « Je suis intéressé » → `waouh-buyer-interest`.

4. **Jouer la négociation** : `je propose 7000` (acheteur) → contre-offre vendeur `8500` → `OUI` → accord.

5. **Collecter les preuves** pour le tableau :
   - `waouh_messages` (bulles in-app vues par chaque acteur)
   - `waouh_outbound_queue` (WhatsApp envoyés : status `sent`/`failed` + raison)
   - `waouh_notifications`, `waouh_negotiations`, `waouh_deals`, `waouh_interests`
   - Logs edge functions (`waouh-channel-in`, `waouh-notify-dispatch`, `waouh-outbound-dispatch`, `waouh-negotiation-router`)

### Format de chaque tableau (1 par cas)

```text
| # | Étape                          | Émetteur | Canal attendu | Message attendu                  | Reçu réel               | OK/KO |
|---|--------------------------------|----------|---------------|----------------------------------|-------------------------|-------|
| 1 | Publication annonce            | Vendeur  | WA/App        | ✅ Annonce publiée               | …                       |       |
| 2 | Recherche acheteur             | Acheteur | WA/App        | Liste résultats                  | …                       |       |
| 3 | Intérêt acheteur               | Acheteur | WA/App        | ✅ Demande envoyée               | …                       |       |
| 4 | 📩 Nouvel acheteur intéressé   | →Vendeur | WA/App        | template `match_seller`          | …                       |       |
| 5 | Contre-offre acheteur 7000     | Acheteur | WA/App        | ✅ envoyée + relai vendeur       | …                       |       |
| 6 | Contre-offre vendeur 8500      | Vendeur  | WA/App        | ✅ envoyée + relai acheteur      | …                       |       |
| 7 | OUI acheteur                   | Acheteur | WA/App        | accord ✅                         | …                       |       |
| 8 | Notif accord bilatérale        | Système  | WA + App      | template `deal_created`          | …                       |       |
```

À la fin : **synthèse globale 9-cellules** avec ✅/⚠️/❌ par cellule + bugs détectés (ex. LID non résolu, partenaire sans `seller_id`, dedupe trop agressif…).

## Pré-requis & risques connus

- Cas **partenaire** : `waouh_unified_catalog.source_ref_id` n'est pas un `waouh_users.id` → le dispatcher « match » sait notifier l'acheteur, mais l'intérêt acheteur sur un produit partenaire (B2/C2/A2) doit router vers le commerçant via `waouh_partner_businesses.contact_whatsapp`. À vérifier — possible trou fonctionnel.
- Cas **radar IA** : `waouh_external_listings` n'a souvent pas de numéro vendeur exploitable → on s'attend à un statut « no seller channel » → à documenter, pas à corriger ici.
- Cas A (100 % WhatsApp) : le verrou LID v1 (mem `whatsapp-end-to-end-flow`) doit tenir ; sinon je reporte le bug, je ne corrige pas en plan mode.
- Pas de WhatsApp réel : « Reçu réel » = ligne `waouh_outbound_queue` avec `status='sent'` + payload. C'est la même chose que ce que WAHA enverrait, mais sans confirmation visuelle côté téléphone.

## Livrable

Un seul document Markdown `docs/waouh-e2e-test-2026-06-09.md` contenant :
1. Méthode + identifiants des comptes de test créés
2. Les **9 tableaux** (un par cellule A1…C3)
3. Tableau de synthèse 3×3
4. Liste des bugs/observations à traiter ensuite (sans correctif appliqué)

Aucun code applicatif ni edge function ne sera modifié pendant ce test — uniquement des inserts/lectures DB et appels d'edge functions existantes.
