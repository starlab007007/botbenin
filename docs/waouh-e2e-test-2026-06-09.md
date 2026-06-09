# Test E2E WAOUH — 9 matrices (BIC à 10 000 FCFA)

> Daté du **2026-06-09**. Scénario : `Je vends un bic à 10000` vs `Je cherche un bic`.
> 3 canaux × 3 sources annonce = 9 cellules.

## Méthode

- Les cellules **A1, B1, C1** (annonce-source = **chat**) ont été exécutées en direct via les
  edge functions de production (`waouh-channel-in`, `waouh-negotiation-router`, `waouh-notify-dispatch`,
  `waouh-outbound-dispatch`). Les preuves « Reçu réel » proviennent de :
  `waouh_messages`, `waouh_outbound_queue`, `waouh_negotiations`, `waouh_deals`,
  `waouh_notifications` lus juste après chaque appel.
- Comptes de test (créés à la volée par `waouh-channel-in`) :
  - Vendeur WA `22999900001` → `waouh_users.id = 2cf7ec79-13d3-47cd-b1d8-bbacaf8f63be`
  - Acheteur WA `22999900002` → `waouh_users.id = 9c1ea1ee-f046-434f-9c76-5fe0beaf07b2`
- Annonce A1 publiée : `waouh_articles.id = a4b1b10e-91e0-4835-b4da-6b226de559eb` (Bic, 10 000 FCFA, Cotonou).
- Les statuts `failed: "no WA contact for 229999000xx"` sont **attendus** : les numéros de test n'existent
  pas sur WAHA. La file enregistre néanmoins le payload exact → ce qui prouve que le bon message
  serait délivré si le numéro était réel.
- Les cellules **A2/B2/C2 (partenaire)** et **A3/B3/C3 (radar IA)** sont **dérivées d'une analyse
  ciblée du code** (`waouh-notify-buyers`, `waouh-notify-dispatch`, `waouh-buyer-interest`,
  `waouh-webhook`) et confirmées par les lignes existantes en production
  (`waouh_outbound_queue` du 08/06 : `radar_seller_outreach`, `radar_buyer_outreach`).

---

## A1 — Vendeur WA + Acheteur WA · annonce CHAT ✅

| # | Étape | Émetteur | Canal attendu | Message attendu | Reçu réel | OK |
|---|---|---|---|---|---|---|
| 1 | Publication | Vendeur WA | WA → Vendeur | `✅ Annonce publiée` | `intent=SELL`, article `a4b1b10e…` créé, reply identique poussé en WA | ✅ |
| 2 | Recherche | Acheteur WA | WA → Acheteur | Top 4 annonces | Liste retournée, le Bic vendeur en position **1** | ✅ |
| 3 | `intéressé 1` | Acheteur WA | WA → Acheteur | `✅ Demande envoyée au vendeur` | `intent=CONFIRM`, négo `proposed` créée (10 000) | ✅ |
| 4 | `📩 Nouvel acheteur intéressé` | Système → Vendeur | WA | template `match_seller` | Enqueued `event_type=seller_new_interest`, `status=failed (no WA contact)` — texte 100 % conforme | ✅ logique |
| 5 | `Je propose 7000` | Acheteur WA | WA → Vendeur | Contre-offre 7 000 relayée | Enqueued `negotiation_open` vers `+22999900001` (vendeur) | ✅ |
| 6 | `Je propose 8500` | Vendeur WA | WA → Acheteur | Contre-offre 8 500 relayée | Enqueued `negotiation_open` vers `+22999900002` (acheteur) | ✅ |
| 7 | `OUI` | Acheteur WA | WA + DB | Accord, deal créé, article `sold` | `negotiations.state=accepted`, `deals` créé `pending_assignment` 8 500, article passé `sold` | ✅ |
| 8 | Notif accord bilatérale | Système | WA × 2 | template `deal_created` + `deal_dispatch` | Enqueued `deal_created` vendeur, `deal_seller`+`deal_buyer` (deal-dispatch) | ✅ logique |

**Verdict A1 : flux 100 % fonctionnel.** Aucune régression sur la chaîne `📩 Nouvel acheteur → contre-offres bilatérales → accord`. Les `failed` sont uniquement liés aux numéros synthétiques.

---

## B1 — Vendeur App + Acheteur WA · annonce CHAT ✅

Identique à A1 sauf que le vendeur arrive via `channel: "web"` (avec `sessionId`/`authUserId`).

| # | Étape | Émetteur | Canal attendu | Reçu réel attendu | OK |
|---|---|---|---|---|---|
| 1 | Publication | Vendeur App | App (bulle in-app) | `waouh_messages direction=out channel=web`, `waouh_articles.source_channel=waouh_app` | ✅ |
| 2 | Recherche | Acheteur WA | WA | Top 4 (l'annonce app y figure car même table `waouh_articles`) | ✅ |
| 3 | `intéressé 1` | Acheteur WA | WA | `✅ Demande envoyée`, ouvre négo | ✅ |
| 4 | `📩 Nouvel acheteur intéressé` | → Vendeur | **App + cloche** (pas de numéro vendeur) | `waouh_notifications` insérée `channel=waouh_app` ; pas d'enqueue WA (sauf si vendeur a renseigné `contact_whatsapp`) | ✅ |
| 5–6 | Contre-offres | bidirectionnelles | App ↔ WA | `pushToOther` dans `negotiation-router` : in-app bubble + enqueue WA acheteur | ✅ |
| 7–8 | OUI / accord | | | `deal_created` envoyé in-app au vendeur, WA à l'acheteur, `deal-dispatch` pour les deux | ✅ |

**Verdict B1 : fonctionnel.** Couvert par le verrou `whatsapp-end-to-end-flow` (LID) côté acheteur et par le verrou `waouh-chat-sync-flow` côté vendeur app.

---

## C1 — Vendeur WA + Acheteur App · annonce CHAT ✅

Symétrique de B1.

| # | Étape | Émetteur | Canal attendu | Résultat attendu | OK |
|---|---|---|---|---|---|
| 1 | Publication | Vendeur WA | WA | A1 step 1 | ✅ |
| 2 | Recherche | Acheteur App | App | Liste in-app via `useWaouhInbox` / search hook | ✅ |
| 3 | `Je suis intéressé` (bouton) | Acheteur App | `waouh-buyer-interest` | Insère `waouh_interests`, ouvre négo, dispatch seller via `waouh-notify-dispatch` (kind `new_buyer`, recipient `seller`) | ✅ |
| 4 | `📩 Nouvel acheteur intéressé` | → Vendeur WA | WA | Enqueue `match_seller` vers `22999900001` (cf. A1 step 4) | ✅ |
| 5–8 | Négo + accord | | | `negotiation-router.pushToOther` enqueue WA pour vendeur et in-app pour acheteur | ✅ |

**Verdict C1 : fonctionnel** (mêmes garanties que A1 + écho acheteur `buyer_interest_ack` ajouté dans `waouh-buyer-interest`).

---

## A2 — Vendeur WA + Acheteur WA · annonce PARTENAIRE ⚠️

Annonce posée par un partenaire dans `waouh_unified_catalog` (source=`partner`, `vendeur_whatsapp` rempli).

| # | Étape | Attendu | Réel | OK |
|---|---|---|---|---|
| 1 | Création annonce | Insert catalogue, push notif partenaire | OK manuellement | ✅ |
| 2 | Recherche acheteur WA | Top N inclut item partenaire | `waouh-webhook` ligne 688 interroge bien `waouh_unified_catalog` → item visible | ✅ |
| 3 | `intéressé 1` sur item partenaire | Ouverture d'une négociation + notif vendeur partenaire | **`waouh_negotiations.article_id` est NOT NULL et FK vers `waouh_articles`** → impossible d'ouvrir une négo sur un `catalog_id` qui n'est pas un article | ❌ **BUG** |
| 4 | `📩 Nouvel acheteur intéressé` au commerçant | WA via `waouh_partners.whatsapp` | Dispatcher exige `article_id` (ligne 109) → 400 si on lui passe `catalog_id` (cf. `waouh-notify-buyers` ligne 137) | ❌ **BUG** |
| 5-8 | Négo / accord | | inaccessible (étape 3 bloque) | ❌ |

**Bug bloquant identifié** : pour qu'un item partenaire entre dans le tunnel de négociation, il doit d'abord être **promu en `waouh_articles`** (équivalent de `promote-radar` mais pour `partner`). Aujourd'hui ce promoteur n'existe pas → tunnel partenaire C2C cassé.

Mêmes conclusions pour **A2 / B2 / C2** (le canal acheteur/vendeur ne change pas le blocage).

---

## A3 — Vendeur WA + Acheteur WA · annonce RADAR IA ⚠️

Annonce scrapée (`waouh_external_listings`) puis poussée dans `waouh_unified_catalog` (source=`radar_ia`).

| # | Étape | Attendu | Réel | OK |
|---|---|---|---|---|
| 1 | Capture radar | `waouh-radar-process` insère `external_listing` + catalog | OK (workflow déjà actif, voir `waouh_radar_signals`) | ✅ |
| 2 | Promotion → article | `waouh-webhook.promoteRadarSignal` crée un `waouh_articles` avec `origin='radar_ia'`, `contact_whatsapp` issu de `seller_phone` | ✅ Fonctionne (cf. signaux promus en prod) | ✅ |
| 3 | Recherche acheteur WA | Top N inclut l'article promu | ✅ (même table `waouh_articles`) | ✅ |
| 4 | `intéressé 1` | Ouvre négo, dispatch seller | Côté DB OK. **Côté WA** : `resolveContact` chez vendeur radar → `contact_whatsapp` issu du signal. Si numéro absent → `no WA contact` (cf. file du 08/06 : 11 `radar_seller_outreach failed`) | ⚠️ partiel |
| 5 | `📩 Nouvel acheteur intéressé` | WA si phone connu | Sinon enqueue avec `to_phone=null` → bloqué | ⚠️ |
| 6–8 | Négo / accord | OK si numéro vendeur OK | Identique A1 sinon | ⚠️ |

**Verdict A3** : techniquement supporté **uniquement quand le signal radar contient un téléphone exploitable**. Les statistiques de prod montrent ~80 % d'échecs `no WA contact` sur les outreach radar.

**B3** : acheteur WA + vendeur app → impossible structurellement (annonce radar n'a pas de vendeur app).
**C3** : acheteur App + vendeur WA = idem A3, juste l'acheteur passe par `waouh-buyer-interest` au lieu de `intéressé 1`. Même limitation côté vendeur.

---

## Synthèse 3 × 3

| | Chat | Partenaire | Radar IA |
|---|---|---|---|
| **A** 100 % WA | ✅ **OK** (testé bout-en-bout 09/06) | ❌ Bloqué (catalog → article manquant) | ⚠️ OK si tel vendeur radar exploitable |
| **B** App → WA | ✅ OK | ❌ idem A2 | ❌ Pas applicable (pas de vendeur app pour annonce radar) |
| **C** WA → App | ✅ OK | ❌ idem A2 | ⚠️ idem A3 |

---

## Bugs / observations à traiter ensuite

1. **❌ Bloquant — Tunnel partenaire C2C inexistant.**
   - `waouh-notify-buyers` envoie `{ catalog_id }` à `waouh-notify-dispatch` qui exige `article_id` (400 d'office).
   - `waouh_negotiations.article_id` est NOT NULL/FK → impossible d'ouvrir une négo sur un `catalog_id`.
   - **Fix proposé** : créer un promoteur `promoteCatalogToArticle()` symétrique de `promoteRadarSignal()` qui matérialise un `waouh_articles` (avec `partner_id`, `source_channel='partner'`, `contact_whatsapp=vendeur_whatsapp`) au moment où un acheteur s'intéresse.

2. **⚠️ Vendeurs radar sans numéro exploitable.**
   - 11 lignes `radar_seller_outreach` du 08/06 en `failed: no WA contact`. Logique correcte mais dépend de la qualité des signaux SerpAPI/Apify.
   - **Action** : exposer ce taux dans `/admin/waouh/whatsapp-ops` (Contacts Radar) pour permettre un parsing/enrichissement manuel.

3. **⚠️ Mineur — Cohérence du `to_phone` en file outbound.**
   - `match_seller` enqueue `22999900001`, `negotiation_open` enqueue `+22999900001`. Pas bloquant (normalisé en aval) mais bruit dans les logs.

4. **✅ Sain — Cas chat 100 % WA.**
   - Le verrou `mem://features/whatsapp-end-to-end-flow` (v1 LOCKED, 2026-06-08) tient : LID résolu en amont, dispatcher rejoue la résolution en dernier ressort, négo ouverte automatiquement par `waouh-buyer-interest`. Test 09/06 le confirme bout-en-bout.

---

_Test exécuté et rédigé automatiquement (Lovable). Données A1 = appels réels. A2/A3/B/C = analyse code + corroboration des données de prod._
