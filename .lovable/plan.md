
# Notifications multi-canal WAOUH (Chat / Partenaire / Radar IA)

## Problème

Quand l'acheteur dit *"intéressé N"*, `waouh-webhook` (branche `CONFIRM`, lignes 513-597) ne notifie que les annonces issues du **chat** (`pick.seller_id` → `waouh_users`). Les produits venant du **catalogue partenaire** (`vendeur_phone/vendeur_whatsapp`, `partner_id`, `business_id`) et du **radar IA** (`contact_phone` scrapé) sont listés et choisissables mais le vendeur ne reçoit jamais le message *"Nouvel acheteur intéressé"*. La suite de la négociation (contre-offre, OUI/NON, paiement) ne suit donc pas non plus sur WhatsApp pour ces deux sources.

De plus :
- `normalizeBeninPhone` produit `229XXXXXXXX` sans tester la double variante Bénin (`+229` court vs `+22901` long depuis la réforme 2021).
- `pushToOther` ne sait cibler que via `to_user_id` ; il n'a pas de chemin "numéro brut sans compte WAOUH".
- L'acheteur web (connecté avec un `phone_number` lié) ne reçoit pas systématiquement les messages WhatsApp en miroir et inversement.

## Objectif

Pour les **3 sources** (chat, partner, radar), à partir de *"intéressé N"* et jusqu'à clôture (`completed`, `cancelled`, `refused`) :

1. Identifier le numéro WhatsApp du vendeur selon la source.
2. Vérifier/normaliser ce numéro avec **double tentative Bénin** (`229XXXXXXXX` puis `22901XXXXXXXX`).
3. Envoyer la notif WhatsApp + le message web (si compte web associé existe).
4. Faire pareil côté acheteur (web + WhatsApp si numéro Bénin associé).
5. Propager **chaque message** de la négociation aux deux canaux des deux parties jusqu'à clôture.

## Plan d'implémentation

### Étape 1 — Helper de normalisation Bénin "double check" (`_shared/waouh-phone.ts`)

Nouveau module exportant :

- `normalizeBeninPhone(raw)` : version actuelle améliorée → renvoie toujours le format `229XXXXXXXXXX` (8 ou 10 chiffres locaux).
- `beninPhoneCandidates(raw)` : renvoie `[short, long]` — par ex `229XXXXXXXX` (8) et `22901XXXXXXXX` (10) — pour interroger la DB avec les deux variantes.
- `resolveWaouhUserByPhone(sb, raw)` : essaie `waouh_users` avec chaque candidat ; renvoie le 1ᵉʳ trouvé (id, web_session_id, phone_number).

Remplace les usages dispersés dans `waouh-webhook`, `waouh-outbound-dispatch`, `promoteRadarSeller`, `waouh-radar-wa-webhook`.

### Étape 2 — Extension de `pushToOther` (waouh-webhook L228-278)

Aujourd'hui : prend `to_user_id` obligatoire.

Nouvelle signature :
```
pushToOther({
  to_user_id?: string,
  to_phone?: string,              // numéro brut (sera normalisé + double-check)
  to_web_session_id?: string,
  source: "chat" | "partner" | "radar",
  ... payload/text/atts/meta inchangés
})
```

Logique :
1. Si `to_user_id` fourni → comportement actuel.
2. Sinon, normaliser `to_phone` via `beninPhoneCandidates` et chercher `waouh_users` ; si trouvé → utiliser son `id` + `web_session_id`.
3. Si aucun user → enqueue WhatsApp pur via `waouh_enqueue_outbound_v2` avec `p_to_user_id: null`, `p_to_phone: <canonique>`, `p_channel: "whatsapp"` (mode "vendeur invité").
4. Si `to_web_session_id` fourni en plus → également enqueue `channel: "web"` pour miroir.

### Étape 3 — Branche CONFIRM : router selon la source (L513-597)

Le `combinedMatches` (L479-483) tague déjà `source: "partner"` et les promotions radar. Étendre :

| Source | seller_id | Numéro vendeur cible | Comportement |
|---|---|---|---|
| chat (défaut) | présent | `seller.phone_number` | Comme aujourd'hui via `to_user_id`. |
| partner | absent | `pick.vendeur_whatsapp \|\| pick.vendeur_phone` (fallback : `partner_businesses.whatsapp_phone` via `business_id`) | `pushToOther({ to_phone, source: "partner" })`. Pas de `waouh_negotiations` lié à un `seller_user_id` → créer/upsert un `waouh_users` "vendor stub" à partir du numéro normalisé pour pouvoir attacher `seller_user_id`. |
| radar | éventuellement présent après `promoteRadarSeller` | `waouh_radar_signals.contact_phone` (ramené dans `combinedMatches`) | Idem partner : upsert user stub + `pushToOther({ to_phone, source: "radar" })`. |

Dans tous les cas la même `waouh_negotiation` + `waouh_transaction` est créée (le code existant fonctionne dès que `seller_user_id` est résolu).

### Étape 4 — Réponse vendeur & suite de conversation

Le webhook entrant WhatsApp (`waouh-channel-in` → `waouh-webhook`) reconnaît déjà *OUI / NON / "Je propose X"*. Pour que ça fonctionne pour un vendeur partner/radar qui n'avait pas de compte avant :

- L'upsert "vendor stub" de l'étape 3 donne un `waouh_users.id` rattaché au numéro WhatsApp ; donc dès qu'il répond, `waouh-channel-in` (L131-148) le retrouve par `phone_number` et la conversation suit le pipeline normal.
- Marquer ces users avec `meta: { stub_origin: "partner" | "radar" }` pour analytics.

### Étape 5 — Miroir Web ↔ WhatsApp pour les deux parties

Modifier `pushToOther` (et l'appel équivalent pour `pushToBuyer` côté acheteur lors des contre-offres L598-700) pour, à chaque événement de la négociation :

1. Résoudre vendeur ET acheteur (id, phone, web_session_id).
2. Pour chacun, enqueue en **double canal** dès qu'il a les deux références :
   - `p_channel: "whatsapp"` si `phone_number`
   - `p_channel: "web"` si `web_session_id`
3. Continuer jusqu'à ce que `waouh_negotiations.state ∈ ('completed','refused','cancelled')` ou `waouh_transactions.status ∈ ('completed','cancelled','failed')`.

L'outbound dispatcher actuel (`waouh-outbound-dispatch`) gère déjà le routage par `channel`, rien à changer côté dispatch.

### Étape 6 — Test E2E

Étendre `waouh-e2e-test` avec 3 scénarios :
1. Annonce chat → "intéressé 1" → vendeur reçoit WA + Web.
2. Annonce partner (mock business avec numéro `0191XXXXXX`) → vendeur partenaire reçoit WA (avec double-check `+229` / `+22901`).
3. Signal radar mock → vendeur scrapé reçoit WA, répond *OUI*, négocie, va jusqu'à `payment_pending`.

## Détails techniques

**Fichiers modifiés** :
- `supabase/functions/_shared/waouh-phone.ts` *(nouveau)*
- `supabase/functions/waouh-webhook/index.ts` — `pushToOther`, branche `CONFIRM`, branches `NEGOTIATE`/`ACCEPT`/`REFUSE`.
- `supabase/functions/waouh-channel-in/index.ts` — utiliser `resolveWaouhUserByPhone`.
- `supabase/functions/waouh-outbound-dispatch/index.ts` — utiliser `beninPhoneCandidates` au moment d'envoyer (sécurité supplémentaire).
- `supabase/functions/waouh-e2e-test/index.ts` — nouveaux cas.

**Table partner** : lookup `partner_businesses` par `business_id` quand `vendeur_whatsapp/phone` est absent de `partner_products`.

**Idempotence** : conserver les `dedupe_key` existants ; ajouter un préfixe `chat:`/`partner:`/`radar:` pour éviter qu'un même évènement parte deux fois sur le même canal.

**Schéma DB** : pas de migration nécessaire — `waouh_users` accepte déjà des users sans `auth.uid`, `waouh_outbound_queue` accepte `to_user_id` nullable.

## Hors scope

- Pas de modification de l'UI web chat (déjà multi-canal).
- Pas de refonte du dispatcher WAHA.
- Pas d'ajout de templates WhatsApp Business — on reste sur `sendText`/`sendImage` via WAHA.
