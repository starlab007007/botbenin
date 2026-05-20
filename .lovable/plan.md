
# Module de paiement — État & Plan d'intégration MTN

## 1. Ce qui est déjà intégré

### Backend (Edge Functions Supabase)
- `qosic-payment` (442 lignes) — Initie un paiement Qosic, mappe `MTN → mtn_momo`, `MOOV → moov_money`, `SBIN → sbin`. Gère Basic Auth, génération `transref` (≤20 chars), insertion en base, mode test, gestion erreurs SSL, timeout 30s.
- `qosic-check-status` — Polling du statut via `gettransactionstatus`, mappe `responsecode 00 → completed`, `01 → processing`, autres → `failed`. Supporte un check ciblé ou tous les `processing` > 30s.
- `qosic-webhook` — Réception callback Qosic.
- `mtn-momo-initiate` (71 lignes) — wrapper léger (probablement legacy/doublon).
- `waouh-payment` + `waouh-payment-handler` — Pipeline paiement marketplace WAOUH (escrow 3% commission).

### Frontend
- `MTNMomoPaymentModal.tsx` — Format `229XXXXXXXX`, appel `qosic-payment` avec `operator: 'MTN'`, suivi via `PaymentStatusTracker`.
- `MoovMoneyPaymentModal.tsx`, `SBINPaymentModal.tsx` — Analogues.
- `WaouhPaymentDialog.tsx` — Flow Mobile Money pour la marketplace (polling 6s, max 18 tentatives).
- `PaymentDiagnostic.tsx`, `PaymentTestPage.tsx`, `PaymentHistoryPage.tsx`, `PaymentStatusTracker`.

### Base de données
- Table `payment_transactions` avec : `order_id`, `user_id`, `amount`, `currency`, `phone_number`, `status` (pending/processing/completed/failed), `payment_method`, `operator`, `qosic_transaction_id`, `qosic_response`, `metadata`.
- Tables `waouh_transactions` + `waouh_partner_payouts` pour la marketplace.

### Secrets configurés
`QOSIC_USERNAME`, `QOSIC_PASSWORD`, `QOSIC_BASE_URL`, `QOSIC_MTN_CLIENT_ID`, `QOSIC_MOOV_CLIENT_ID`, `QOSIC_SBIN_CLIENT_ID`, `QOSIC_API_PASSWORD`, `QOSIC_CLIENT_ID`.

## 2. Ce qui n'est PAS intégré / problèmes connus

1. **Credentials staging non vérifiés** — Les valeurs actuelles des secrets `QOSIC_*` n'ont jamais été confirmées comme étant celles fournies aujourd'hui (`USR01` / `YG739G5XFVPYYV4ADJVW` / `MTNTEST`).
2. **`QOSIC_BASE_URL` probablement en HTTPS** alors que staging exige `http://staging.qosic.net:9010` (HTTP plein). À vérifier — la mémoire projet note une "HTTPS enforcement" qui peut bloquer le staging.
3. **Format téléphone strict `229XXXXXXXX`** dans `qosic-payment` (ligne 162). Le numéro de test fourni `2290191299191` fait 13 chiffres après `229` au lieu de 8 → la regex `^229\d{8}$` rejettera. À assouplir ou corriger le numéro.
4. **Mode test SSL** (`QOSIC_TEST_MODE`) simule un succès sans appel API → empêche tout vrai test. Doit rester `false`.
5. **Doublon `mtn-momo-initiate`** vs `qosic-payment` — source de confusion, à supprimer ou unifier.
6. **Webhook Qosic non documenté côté Qosic** — l'URL de callback `qosic-webhook` doit être déclarée chez Qosic (manuel).
7. **Pas de test E2E automatisé MTN** (un `waouh-e2e-test` existe pour WAOUH uniquement).
8. **Polling status côté frontend** déclenché manuellement via `PaymentStatusTracker`, pas de cron de réconciliation automatique.

## 3. Plan d'action

### Étape A — Mettre à jour / vérifier les secrets Qosic staging
Mettre à jour via le tooling secrets (l'utilisateur saisit les valeurs en clair) :
- `QOSIC_USERNAME` = `USR01`
- `QOSIC_PASSWORD` = `YG739G5XFVPYYV4ADJVW`
- `QOSIC_MTN_CLIENT_ID` = `MTNTEST`
- `QOSIC_BASE_URL` = `http://staging.qosic.net:9010`

### Étape B — Corriger la validation téléphone
Dans `supabase/functions/qosic-payment/index.ts` (ligne ~161-165), assouplir la regex pour accepter le format de test long :
```
if (!/^229\d{8,12}$/.test(cleanPhone)) { ... }
```
Et même chose côté frontend `MTNMomoPaymentModal.tsx` (ligne ~37).

### Étape C — Confirmer endpoint MTN
Vérifier que `endpointMap.MTN` (ligne 237) pointe bien sur `${baseUrl}/QosicBridge/user/requestpayment` (déjà OK), et que le payload utilise bien `clientid` minuscule (déjà OK).

### Étape D — Test de bout en bout
1. Désactiver `QOSIC_TEST_MODE` (ou ne pas le définir).
2. Appeler `qosic-payment` via `supabase--curl_edge_functions` :
   ```json
   { "amount": 100, "phoneNumber": "2290191299191", "operator": "MTN", "fullName": "Test User", "planName": "MTN-TEST" }
   ```
3. Lire les logs (`supabase--edge_function_logs qosic-payment`) pour confirmer `responsecode: "01"` et `serviceref` retourné.
4. Appeler `qosic-check-status` avec le `transref` retourné pour valider le passage `processing → completed`.
5. Vérifier la ligne en base `payment_transactions`.

### Étape E — Nettoyage
- Supprimer `mtn-momo-initiate` (doublon) après validation.
- Documenter le webhook callback à fournir à Qosic.

## 4. Détails techniques

**Mapping codes Qosic** :
| responsecode | Sens | DB status |
|---|---|---|
| 00 | Succès final | `completed` |
| 01 | En cours / initié | `processing` |
| autre | Échec | `failed` |

**Format `transref`** : ≤ 20 chars, actuel `PAY_{9 digits}_{5 chars}` = 19 chars ✅

**Headers Qosic** : `Authorization: Basic base64(USR01:YG739G5XFVPYYV4ADJVW)` + `Content-Type: application/json`.

**Endpoints staging** :
- Init : `http://staging.qosic.net:9010/QosicBridge/user/requestpayment`
- Status : `http://staging.qosic.net:9010/QosicBridge/user/gettransactionstatus`

## 5. Validation finale
Après approbation du plan, j'exécuterai A → D et fournirai les logs du test 100 FCFA sur `2290191299191`.
