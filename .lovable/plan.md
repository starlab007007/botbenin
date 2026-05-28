
# Photos + Contacts unifiés sur tout le cycle WAOUH

Objectif : qu'une annonce, une recherche, une notification de match et une notification "nouvel acheteur" portent **toujours les mêmes photos** et soient **toujours livrées sur le bon canal** (WhatsApp, App WAOUH, Radar IA, Partenaire), peu importe l'origine.

## 1. Modèle de contact unifié (source of truth)

Ajouter sur `waouh_articles` (vendeur) et `waouh_buyer_profiles` (acheteur) un bloc "identité de canal" normalisé :

- `source_channel` : `whatsapp` | `waouh_app` | `radar_ia` | `partner`
- `contact_whatsapp` : MSISDN normalisé Bénin (ex `22965653468`), nullable
- `contact_waouh_user_id` : `waouh_users.id` (déjà existant via `seller_id` / `user_id`)
- `partner_id` : `waouh_partners.id` (nullable)
- `radar_signal_id` : `origin_signal_id` (déjà présent, on le renomme côté résolution)

Règle de résolution du contact à utiliser pour notifier :
```text
1. source_channel == 'whatsapp'  → contact_whatsapp (extrait du webhook WAHA)
2. source_channel == 'partner'   → waouh_partners.whatsapp (lié à partner_id)
3. source_channel == 'radar_ia'  → contact_whatsapp du signal radar (s'il existe)
4. source_channel == 'waouh_app' → contact_waouh_user_id (in-app push + websocket)
Fallback : waouh_users du seller_id/user_id
```

Cette résolution est centralisée dans un helper Deno partagé `_shared/resolveContact.ts` réutilisé par `waouh-sell-handler`, `waouh-buy-handler`, `waouh-notify-buyers`, `waouh-channel-in`, `waouh-radar-process`, `waouh-partner-ai`.

## 2. Photos unifiées (même URL partout)

Aujourd'hui :
- `waouh-sell-handler` accepte `photos[]` mais ne rehoste rien quand l'origine est l'App.
- `waouh-channel-in` rehoste déjà les médias WhatsApp dans le bucket public `waouh-media` (helper `rehostMedia`).
- `waouh-notify-buyers` n'envoie **aucune photo** dans la notif.

Règle : **toute photo entrante est rehostée dans `waouh-media`** et l'URL publique stable est stockée dans `waouh_articles.photos[]` / `waouh_buyer_profiles.reference_photos[]` (nouvelle colonne nullable).

Ainsi :
- Annonce publiée App → photo upload Storage → URL publique → utilisée pour WhatsApp `sendImage` et carte in-app.
- Annonce publiée WhatsApp → rehost WAHA → même URL → utilisée pour la carte in-app.
- Recherche avec photo (radar / WhatsApp) → idem dans `reference_photos[]`.

## 3. Flux notifications uniformes

Centraliser l'envoi dans une nouvelle edge function `waouh-notify-dispatch` :
- Entrée : `{ kind: 'match' | 'new_buyer' | 'sale_published', article_id, buyer_profile_id?, recipient: 'seller'|'buyer' }`
- Charge l'entité, résout le contact via le helper §1, charge `photos[]`.
- Si `whatsapp` → `sendWahaImage` (1ʳᵉ photo en header + carrousel ≤4) + boutons WAOUH.
- Si `waouh_app` → insert `waouh_notifications` avec `photos[]` (nouvelle colonne) et `payload jsonb` pour la carte riche, push realtime.
- Si `partner` → idem WhatsApp via numéro partenaire.

Tous les appels existants (`waouh-sell-handler` → notify-buyers, `waouh-buy-handler` → seller match, `waouh-radar-process`, `waouh-channel-in` actions) passent désormais par `waouh-notify-dispatch`. Plus de double code d'envoi.

## 4. Schéma DB (migration)

```sql
-- waouh_articles
ALTER TABLE waouh_articles
  ADD COLUMN source_channel text DEFAULT 'waouh_app',
  ADD COLUMN contact_whatsapp text,
  ADD COLUMN partner_id uuid REFERENCES waouh_partners(id);

-- waouh_buyer_profiles
ALTER TABLE waouh_buyer_profiles
  ADD COLUMN source_channel text DEFAULT 'waouh_app',
  ADD COLUMN contact_whatsapp text,
  ADD COLUMN reference_photos text[] DEFAULT '{}';

-- waouh_notifications : enrichissement carte
ALTER TABLE waouh_notifications
  ADD COLUMN photos text[] DEFAULT '{}',
  ADD COLUMN payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN channel text,           -- whatsapp|waouh_app|partner
  ADD COLUMN delivered_at timestamptz,
  ADD COLUMN delivery_status text;   -- queued|sent|delivered|failed

CREATE INDEX ON waouh_articles (contact_whatsapp);
CREATE INDEX ON waouh_buyer_profiles (contact_whatsapp);
```

Aucune nouvelle table → pas de GRANT à ajouter.

## 5. Code App (frontend)

- `useWaouhSell` / formulaire publication : envoyer explicitement `source_channel: 'waouh_app'` et `contact_waouh_user_id`.
- Carte notification (`/app/chat`, page WAOUH) : afficher `photos[]` venues de `waouh_notifications.photos`.
- Page partenaire : pré-remplir `contact_whatsapp` depuis `waouh_partners.whatsapp` lors d'une publication.

## 6. Tests E2E

Étendre `waouh-e2e-test` avec 4 scénarios :
1. Annonce App + photo → match acheteur WhatsApp (acheteur reçoit photo).
2. Annonce WhatsApp + photo → match acheteur App (carte in-app avec photo).
3. Annonce Radar IA + photo scrappée → match acheteur App + WhatsApp.
4. Annonce Partenaire → notif envoyée au numéro `waouh_partners.whatsapp`.

Chaque test vérifie : photos[] identiques côté annonce/recherche/notif, contact correctement résolu, `waouh_notifications.delivery_status='delivered'`.

## Détails techniques

- Helper `_shared/resolveContact.ts` exporté `resolveContact({articleOrProfile})` → `{ channel, whatsapp, waouhUserId, partnerId }`.
- `rehostMedia` actuel (`waouh-channel-in`) extrait dans `_shared/media.ts` et appelé aussi par `waouh-sell-handler` (cas upload App + cas radar/url externe).
- `waouh-notify-dispatch` remplace l'envoi inline dans `waouh-notify-buyers` (qui devient un simple "matcher" appelant le dispatch).
- Realtime in-app : table `waouh_notifications` déjà exposée ; le front s'abonne à `photos`/`payload` automatiquement.
- Compat ascendante : `source_channel` default `waouh_app` couvre les lignes existantes ; backfill SQL pour `whatsapp` quand `origin='whatsapp'` (champ déjà présent).

## Fichiers impactés

- Migration SQL (1 fichier, §4)
- `supabase/functions/_shared/resolveContact.ts` (nouveau)
- `supabase/functions/_shared/media.ts` (nouveau, extraction de `rehostMedia`)
- `supabase/functions/waouh-notify-dispatch/index.ts` (nouveau)
- `supabase/functions/waouh-sell-handler/index.ts` (rehost + source_channel + dispatch)
- `supabase/functions/waouh-buy-handler/index.ts` (rehost reference_photos + dispatch)
- `supabase/functions/waouh-notify-buyers/index.ts` (devient matcher pur)
- `supabase/functions/waouh-channel-in/index.ts` (utilise helper partagé)
- `supabase/functions/waouh-radar-process/index.ts` (set source_channel='radar_ia' + rehost)
- `supabase/functions/waouh-e2e-test/index.ts` (4 scénarios)
- Front : composant carte notification WAOUH + form publication App (2-3 fichiers `src/pages/waouh/*`)
