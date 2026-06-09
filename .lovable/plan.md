# Test E2E WhatsApp réel — Vendeur 0140299191 / Acheteur 0191299191

## Confirmation
Les numéros fournis sont **réels** (tes propres lignes WhatsApp). Le test enverra de vrais messages que tu pourras vérifier directement sur tes deux téléphones.

- **Vendeur** : `0140299191` → normalisé `22940299191` (canonique)
- **Acheteur** : `0191299191` → normalisé `22991299191` (canonique)

> Les deux variantes (`229XXXXXXXX` 8 chiffres et `22901XXXXXXXX` 10 chiffres) seront essayées par `beninPhoneCandidates()` pour matcher les `waouh_users` existants.

## Scénario (×3 sources)
Pour chacune des 3 annonces (A=Chat, B=Partenaire, C=Radar IA) :

| # | Action déclenchée | Vendeur reçoit | Acheteur reçoit |
|---|---|---|---|
| 1 | Publication annonce (téléphone 500 FCFA + photo) | ✅ Annonce publiée | — |
| 2 | Match buyers | — | ✅ Annonce trouvée |
| 3 | Acheteur envoie intérêt + offre 350 | ✅ Nouvel acheteur intéressé | ✅ Demande envoyée |
| 4 | Vendeur contre-offre 450 | ✅ Contre-offre transmise | ✅ Contre-offre reçue |
| 5 | Acheteur accepte → deal | ✅ Accord conclu (livreur) | ✅ Accord conclu (paiement livraison) |

**Total = 15 cellules × 3 sources = 30 messages WhatsApp réels envoyés sur tes 2 lignes.**

## Implémentation
1. **`supabase/functions/waouh-e2e-test/index.ts`** — ajout du mode `whatsapp_full` :
   - Paramètres : `seller_phone`, `buyer_phone`, `sources: ["chat","partner","radar"]`
   - Pour chaque source : seed article + buyer profile + déclenche les 5 étapes avec pause 2s entre chaque
   - Collecte par cellule : `article_id`, `negotiation_id`, `deal_id`, `waouh_messages.id`, `waouh_outbound_queue.id`, `trace_id`, `waha_message_id`, `delivery_status`, latence
   - Persist dans `waouh_e2e_test_runs` (status `ok`/`partial`/`fail`)

2. **Seed partenaire & radar** (si absents) :
   - Partenaire test "PartnerTest E2E" avec WhatsApp = vendeur
   - `waouh_external_listings` + `waouh_radar_signals` minimal avec photo + 500 FCFA + `contact_phone=vendeur`

3. **`src/components/admin/WaouhE2ETestsTab.tsx`** — nouveau bouton "▶️ Test E2E WhatsApp réel (Chat/Partenaire/Radar)" :
   - Champs `seller_phone` + `buyer_phone` pré-remplis avec tes numéros
   - Bandeau d'avertissement : "30 messages WhatsApp seront envoyés"
   - Tableau de résultats 3×5 + colonne détails par cellule (lien `/admin/waouh/historique?article_id=…`)
   - Export Markdown du rapport complet

## Fichiers modifiés
- `supabase/functions/waouh-e2e-test/index.ts` (~150 lignes ajoutées)
- `src/components/admin/WaouhE2ETestsTab.tsx` (~80 lignes ajoutées)
- `supabase/functions/_shared/waouh-e2e-helpers.ts` (nouveau, ~120 lignes — seed article/partner/radar)

## Tableau final attendu
```
                  │ 1.Publié │ 2.Match │ 3.Offre │ 4.Contre │ 5.Accord │
──────────────────┼──────────┼─────────┼─────────┼──────────┼──────────┤
A. Chat           │ V ✅     │ A ✅    │ V✅ A✅ │ V✅ A✅  │ V✅ A✅  │
B. Partenaire     │ V ✅     │ A ✅    │ V✅ A✅ │ V✅ A✅  │ V✅ A✅  │
C. Radar IA       │ V ✅     │ A ✅    │ V✅ A✅ │ V✅ A✅  │ V✅ A✅  │
```
Chaque ✅ inclut `waha_message_id` + ack `delivered/read` confirmé.

## Action
Je passe en build, j'implémente puis je lance le test depuis `/admin/waouh/whatsapp-ops` et te retourne le tableau de résultat rempli avec les preuves d'envoi.
