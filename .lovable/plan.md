# Unification WAOUH — Base, Admin, Chat

Aujourd'hui le système est fragmenté :

- **/waouh** (admin chat-bot) lit `waouh_articles`, `waouh_buyer_profiles`, `waouh_transactions`, `waouh_users`
- **/admin/waouh/radar** (radar IA) lit `waouh_radar_signals`, `waouh_radar_profiles`, `waouh_radar_sources`, `waouh_external_listings`
- Les deux ne se parlent pas → un vendeur détecté sur Facebook n'apparaît jamais dans l'onglet "Annonces", un acheteur radar ne croise jamais les annonces du chat.
- **/admin/waouh** n'existe pas (404), les liens "retour" sont incohérents.
- Le chat `/waouh-chat` n'est pas plein écran sur mobile : header bot.bj + hero + cartes + asides poussent le chat hors-écran.

## 1 · Unification de la base de données (1 migration)

Objectif : **une seule source de vérité** pour vendeur / acheteur / annonce / transaction, avec le radar comme **canal d'ingestion** plutôt que silo parallèle.

Schéma cible (ajouts/liens, aucune table supprimée) :

```text
                       waouh_users  (compte canonique : phone unique)
                              ▲
                              │ user_id
            ┌─────────────────┼──────────────────┐
            │                 │                  │
   waouh_articles      waouh_buyer_profiles  waouh_transactions
        ▲                     ▲                  ▲
        │ origin_signal_id    │ origin_signal_id │
        │                     │                  │
   waouh_radar_signals ──► waouh_radar_profiles ──► waouh_users (joined_user_id)
        ▲
        │ source_id
   waouh_radar_sources
```

**Migration SQL :**

- `waouh_radar_profiles` : ajouter `waouh_user_id uuid REFERENCES waouh_users(id)` + trigger `radar_profile_link_user()` qui, à l'INSERT/UPDATE, fait un `UPSERT` dans `waouh_users` par `phone_number` et renseigne `waouh_user_id`. (Les profils radar deviennent de vrais utilisateurs WAOUH dès détection.)
- `waouh_radar_signals` : ajouter `waouh_user_id uuid` (rempli par le même trigger via le profil), `promoted_article_id uuid REFERENCES waouh_articles(id)`, `promoted_buyer_profile_id uuid REFERENCES waouh_buyer_profiles(id)`. Ces colonnes tracent qu'un signal radar a été "promu" en annonce/recherche officielle.
- `waouh_articles` : ajouter `origin text DEFAULT 'chat'` (`chat | radar | serpapi | apify | wa_group | manual`) + `origin_signal_id uuid REFERENCES waouh_radar_signals(id)`.
- `waouh_buyer_profiles` : ajouter `origin text DEFAULT 'chat'` + `origin_signal_id uuid`.
- `waouh_external_listings` : ajouter `promoted_article_id uuid REFERENCES waouh_articles(id)` + `seller_user_id uuid REFERENCES waouh_users(id)`.
- **Vue unifiée** `waouh_unified_offers` (UNION ALL article + radar SELL + external_listing avec colonnes communes : `id, title, price, city, category, contact, source, origin_kind, captured_at`) — utilisée par les chatbots et le matching.
- **Vue unifiée** `waouh_unified_demands` (UNION ALL `waouh_buyer_profiles` + radar BUY signals).
- **Fonction RPC** `waouh_promote_signal(signal_id)` : convertit un signal radar SELL → ligne dans `waouh_articles` (status=`active`, origin=`radar`), ou BUY → `waouh_buyer_profiles`. Sécurité : admin only via `has_role`.
- **Fonction RPC** `waouh_match_signal(signal_id)` : pour un SELL, matche les `waouh_buyer_profiles` (chat + radar) ; pour un BUY, matche `waouh_articles` + `waouh_external_listings`. Renvoie une liste, met à jour `waouh_radar_matches`.
- Index : `waouh_articles(origin)`, `waouh_radar_signals(waouh_user_id, status)`, `waouh_users(phone_number)` unique si pas déjà.
- RLS : inchangé pour les tables existantes ; nouvelles colonnes héritent. Les vues sont `SECURITY INVOKER`, accessibles aux admins.

**Édition des Edge Functions** pour utiliser la base unifiée :
- `waouh-buy-handler` / `waouh-sell-handler` / `waouh-negotiate-handler` / `waouh-notify-buyers` : remplacer les requêtes sur `waouh_articles` seul par la vue `waouh_unified_offers` ; matching acheteur ↔ vendeur via `waouh_match_signal`.
- `waouh-radar-process` : à la fin, appeler `waouh_match_signal` pour générer notifications cross-canal.
- `waouh-channel-in` : pas de changement de surface, mais bénéficie automatiquement des nouvelles sources.

## 2 · Unification de l'administration

**Routes (src/App.tsx) :**

| Avant | Après |
|---|---|
| `/waouh` → WaouhPage | `/admin/waouh` → WaouhPage (alias `/waouh` redirige vers `/admin/waouh`) |
| `/admin/waouh/radar` → WaouhRadarPage | **supprimée** — devient un onglet de WaouhPage |
| `/waouh/demo` → WaouhDemoPage | `/admin/waouh/demo` (alias `/waouh/demo` redirige) |
| `/waouh-chat` (public) | inchangé |

**WaouhPage (refonte des onglets) :**

```text
┌─ Vue d'ensemble ──────── KPIs unifiés (chat + radar) ─┐
│  + nouveau KPI "Signaux radar 24h" et "Profils radar" │
├─ Annonces ────────────── articles + external_listings │
│  (filtre origin: chat/radar/serpapi/apify/manual)     │
├─ Acheteurs ───────────── buyer_profiles + radar BUY   │
├─ Transactions ────────── inchangé                     │
├─ Radar IA ◀── nouveau ── (composant <RadarTab/>       │
│  contenu actuel de WaouhRadarPage : Signaux, Sources, │
│  Profils, boutons "Promouvoir vers annonce/acheteur") │
├─ WhatsApp (WAHA) ─────── inchangé                     │
└─ Paramètres ──────────── inchangé                     │
```

- Extraire le contenu de `src/pages/admin/WaouhRadarPage.tsx` en composant `src/components/waouh/WaouhRadarTab.tsx` (mêmes états, même realtime, même UI).
- Ajouter dans la liste signaux deux boutons : **"Promouvoir → annonce"** (RPC `waouh_promote_signal`) et **"Matcher maintenant"** (RPC `waouh_match_signal`).
- L'onglet "Annonces" gagne un filtre `origin` et un badge couleur par origine.
- L'onglet "Acheteurs" affiche aussi les BUY radar avec badge.
- Garder `WaouhRadarPage.tsx` comme simple `<Navigate to="/admin/waouh?tab=radar" replace />` pour ne pas casser les liens existants.

**Header WaouhPage :** ajouter bouton **« ← Retour Dashboard »** (vers `/dashboard`) à gauche du titre. Le bouton « Ouvrir le chat public » reste, plus visible (variant outline blanc).

## 3 · UX mobile-first sur /waouh-chat

Refonte de `src/pages/waouh/WaouhChatPage.tsx` :

- **Mobile (< md)** : layout plein écran, pas de scroll body.
  ```text
  [Header compact 48px : ← logo + badge IA + bouton "≡"]
  [Chat WaouhWebChat — flex-1 h-[calc(100dvh-48px)]]
  ```
  Hero, quick-actions, exemples et asides sont **masqués sur mobile** et accessibles via un drawer/Sheet déclenché par le bouton "≡" (icône `Info`).
- **Desktop (≥ lg)** : conserve le layout actuel hero + grille 2/3 chat + 1/3 aides.
- `WaouhWebChat` en mode `embedded` reçoit un nouveau prop `fullscreen?: boolean` qui :
  - retire `rounded-lg`, `border`, `max-h-[100dvh]`
  - utilise `h-[100dvh]` au lieu de `h-[70vh]`
  - garde la safe-area bottom (`pb-[env(safe-area-inset-bottom)]`) pour iOS
  - input fixe, scroll messages = seul scroll de la page.
- Ajouter `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (déjà présent dans index.html à vérifier).
- Bouton **« ← »** dans le header chat retourne :
  - vers `/admin/waouh` si `user` admin
  - vers `/` sinon
- Réduire le texte du `Card` "exemples" → 2 lignes max sur mobile (déplacé dans le drawer).

## 4 · Détails techniques

- **Aucune suppression de table** ; uniquement ajouts de colonnes nullables, FKs, vues, RPC, triggers.
- Triggers utilisent `SECURITY DEFINER` + `SET search_path = public` (convention projet).
- Realtime activé pour `waouh_radar_signals` (déjà OK) et ajouté pour la vue ? → non, on s'abonne aux tables sources.
- TypeScript : `src/integrations/supabase/types.ts` se régénère après migration ; pas d'édition manuelle.
- Vérifications post-déploiement :
  1. `/waouh` charge l'admin avec onglet Radar visible
  2. `/admin/waouh/radar` redirige vers `/admin/waouh?tab=radar`
  3. Promouvoir un signal SELL crée une ligne dans Annonces avec badge "radar"
  4. `/waouh-chat` sur viewport 375×812 : chat occupe 100dvh, input visible, scroll fluide

## Fichiers impactés

**Migration :**
- `supabase/migrations/<ts>_waouh_unified.sql`

**Edge Functions modifiées :**
- `supabase/functions/waouh-buy-handler/index.ts`
- `supabase/functions/waouh-sell-handler/index.ts`
- `supabase/functions/waouh-notify-buyers/index.ts`
- `supabase/functions/waouh-radar-process/index.ts`

**Frontend :**
- `src/App.tsx` (routes + redirects)
- `src/pages/waouh/WaouhPage.tsx` (nouvel onglet Radar, KPIs unifiés, filtre origin, bouton retour)
- `src/pages/admin/WaouhRadarPage.tsx` (devient un `<Navigate>`)
- `src/components/waouh/WaouhRadarTab.tsx` (nouveau, extrait)
- `src/pages/waouh/WaouhChatPage.tsx` (mobile fullscreen + drawer aides)
- `src/components/waouh/WaouhWebChat.tsx` (prop `fullscreen`)
