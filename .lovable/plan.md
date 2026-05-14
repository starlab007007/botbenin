
# WAOUH — Plan d'implémentation en 3 sprints

## Décisions validées

- **IA** : Lovable AI Gateway (Gemini 2.5 Flash par défaut, Gemini 2.5 Pro pour vision/négociation, GPT-5 en fallback). Aucune clé Anthropic requise.
- **Paiements MoMo** : réutilisation de l'intégration Qosic existante (MTN + Moov BJ). Stripe ajouté pour cartes internationales au sprint 3.
- **Sidebar** : ajout d'une 6ᵉ entrée WAOUH (icône `ShoppingBag`, couleur cyan `#00D4FF`, badge « NOUVEAU » animé). La règle « 5 modules core » est étendue à 6 — la mémoire projet sera mise à jour.
- **Cache prix / sessions** : pas d'Upstash Redis externe — utilisation d'une table `waouh_cache` Postgres avec TTL (suffisant pour MVP, migration Redis possible plus tard si besoin de débit).
- **Comparateur prix concurrents** : SerpAPI (sprint 3, secret `SERPAPI_KEY` à fournir). En sprint 1-2, la comparaison utilise une heuristique IA basée sur la description.

---

## Sprint 1 — Fondations + Dashboard + Démo (livré maintenant)

### 1.1 Base de données Supabase

Activation de PostGIS et création de 7 tables + RLS :

- `waouh_users` — profil utilisateur WhatsApp (téléphone, géoloc PostGIS, ville, réputation, compteurs)
- `waouh_articles` — annonces (vendeur, titre, catégorie, marque, modèle, état, prix, photos, géoloc PostGIS, rayon, statut, prix marché min/max, expiration 7j). Index GIST sur la géoloc.
- `waouh_buyer_profiles` — profils de recherche acheteurs (critères, budget, géoloc, rayon, IDs déjà notifiés)
- `waouh_transactions` — transactions avec escrow (montant, commission 3 %, méthode, statut Qosic/Stripe, confirmations bilatérales)
- `waouh_conversations` — contexte conversationnel WhatsApp (état, JSON contexte, dernière intention)
- `waouh_notifications` — log anti-spam des notifications envoyées
- `waouh_ratings` — avis bilatéraux après transaction
- `waouh_cache` — cache clé/valeur avec `expires_at` (remplace Redis)

**Sécurité** : RLS sur toutes les tables. Annonces actives lisibles publiquement. Transactions visibles uniquement par vendeur, acheteur, ou admin (via `has_role(auth.uid(), 'admin')`). Les écritures se font via Edge Functions en service role. Trigger anti-spam : max 10 annonces/jour/téléphone.

### 1.2 Edge Functions (squelette + IA fonctionnelle)

8 fonctions créées, **toutes opérationnelles en mode démo** via le Lovable AI Gateway :

| Fonction | Rôle sprint 1 |
|---|---|
| `waouh-webhook` | Endpoint POST/GET. En sprint 1, accepte payloads simulés depuis `/waouh/demo`. Vérifie signature `X-Hub-Signature-256` (préparé pour sprint 2). |
| `waouh-sell-handler` | IA Gemini extrait fiche produit depuis texte libre (titre, catégorie, marque, modèle, état, prix, description). Vision pour photos. Insère dans `waouh_articles`. |
| `waouh-buy-handler` | IA extrait critères, requête PostGIS `ST_DWithin` avec expansion auto du rayon ×3, génère tableau comparatif WhatsApp. |
| `waouh-negotiate-handler` | Logique 3 tours (≥ plancher = accept, 85-99 % = compromis, < 85 % = refus poli, 3 tours = médiation). |
| `waouh-payment-handler` | Sprint 1 : crée transaction `pending`. Sprint 3 : branche Qosic/Stripe. |
| `waouh-notify-buyers` | Requête PostGIS croisée profils ↔ annonce. IA personnalise message. Lots de 20. |
| `waouh-price-compare` | Sprint 1 : estimation IA. Sprint 3 : SerpAPI + cache `waouh_cache` 30 min. |
| `waouh-admin-stats` | KPIs dashboard (annonces, volume, commissions, top catégories, densité villes, courbe 30j). |

### 1.3 Frontend bot.bj

**Sidebar** (`Sidebar.tsx` + `MobileSidebar.tsx`) — ajout entrée WAOUH avec badge animé, mise à jour mémoire `core-modules-navigation` (6 modules au lieu de 5).

**Route `/waouh`** avec layout à 5 onglets (`Tabs` shadcn) :

```text
┌─ Dashboard ─┬─ Annonces ─┬─ Acheteurs ─┬─ Transactions ─┬─ Paramètres ─┐
```

- **Dashboard** : 4 cartes KPI, courbe Recharts publications/ventes 30j, barres top 5 catégories, carte SVG Bénin avec densité (Cotonou/Porto-Novo/Parakou/Abomey), feed temps réel via Supabase Realtime sur `waouh_articles` et `waouh_transactions`.
- **Annonces** : table paginée avec filtres (catégorie/statut/recherche/dates), modale détail avec carousel photos + historique négo + bouton « Contacter sur WhatsApp Web » (`https://wa.me/...`).
- **Acheteurs** : liste profils actifs, bouton « Notifier maintenant » qui invoque `waouh-notify-buyers`.
- **Transactions** : table + timeline visuelle (publication → intérêt → négo → paiement → escrow → réception → libération). Bouton médiation pour `disputed`.
- **Paramètres** : 5 sections (WhatsApp config + test, IA modèle/température/instructions, Commercial 3 %/7j/30km, Paiements toggles + délai escrow 24h, Notifications fréquence/anti-spam). Stockage dans table `waouh_settings` (key/value).

**Route `/waouh/demo`** — split-screen :
- Gauche : simulateur chat WhatsApp (bulles vertes/blanches, animation typing).
- Droite : logs temps réel des appels IA et Edge Functions (JSON formaté).
- 4 boutons scénarios prédéfinis : Vente, Recherche, Négociation, Paiement MoMo (mock Qosic).

### 1.4 Design system

Tokens cyan/vert/orange/violet/jaune ajoutés dans `index.css` et `tailwind.config.ts` en HSL :
```text
--waouh-primary, --waouh-success, --waouh-warning, --waouh-ai, --waouh-payment
```
Utilisés via classes sémantiques (`bg-waouh-primary`, etc.). Cartes fond `#0C0F1C`, bordure `#1C2340`. Effet glow sur métriques actives.

---

## Sprint 2 — WhatsApp Business Cloud réel

À déclencher après validation du sprint 1. Tu fourniras :
- `WHATSAPP_TOKEN` (token permanent app Meta)
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN` (que tu choisis)
- `WHATSAPP_APP_SECRET` (pour vérifier signature webhook)

Travaux :
- Branchement `waouh-webhook` sur l'API Meta réelle (challenge GET + signature HMAC SHA-256).
- Envoi messages outbound via `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages` (text, template, interactive buttons, image).
- Gestion uploads photo (download depuis Meta media API, push vers Supabase Storage bucket `waouh-products`).
- Géolocalisation : demande de partage de position WhatsApp interactif au premier message.
- Indicateur de connexion vert/rouge dans header bot.bj quand `/waouh*`.

---

## Sprint 3 — Paiements + comparateur prix + matching proactif

Travaux :
- **Qosic MoMo** : extension du flow Qosic existant pour escrow (capture différée simulée côté DB — Qosic ne supporte pas escrow natif, on séquestrera les fonds sur un compte technique avec libération manuelle/automatique J+24h via cron Edge Function).
- **Stripe** : `enable_stripe_payments` (intégration native Lovable). PaymentIntent `manual_capture`, webhook `payment_intent.succeeded` → libération.
- **SerpAPI** : secret `SERPAPI_KEY`, intégration `waouh-price-compare` avec cache 30 min.
- **Cron matching proactif** : Edge Function planifiée toutes les 15 min pour repasser les nouvelles annonces des dernières 24h sur les profils acheteurs créés après publication.
- **Page médiation admin** pour transactions `disputed`.

---

## Détails techniques (référence)

### Stack

- React 18 + TypeScript + Tailwind + shadcn/ui + Lucide + Recharts
- Supabase Postgres + PostGIS + Edge Functions (Deno) + Realtime + Storage
- Lovable AI Gateway (`google/gemini-2.5-flash`, `google/gemini-2.5-pro` pour vision)
- Qosic (sprint 3) + Stripe natif Lovable (sprint 3) + SerpAPI (sprint 3)

### Arborescence ajoutée

```text
src/
  pages/waouh/
    WaouhPage.tsx              # layout + 5 onglets
    WaouhDashboardTab.tsx
    WaouhArticlesTab.tsx
    WaouhBuyersTab.tsx
    WaouhTransactionsTab.tsx
    WaouhSettingsTab.tsx
    WaouhDemoPage.tsx          # /waouh/demo
  components/waouh/
    KpiCard.tsx, BeninDensityMap.tsx, ActivityFeed.tsx,
    ArticleDetailModal.tsx, TransactionTimeline.tsx,
    WhatsAppSimulator.tsx, AILogsPanel.tsx
  hooks/
    useWaouhStats.ts, useWaouhRealtime.ts, useWaouhSettings.ts
supabase/functions/
  waouh-webhook/, waouh-sell-handler/, waouh-buy-handler/,
  waouh-negotiate-handler/, waouh-payment-handler/,
  waouh-notify-buyers/, waouh-price-compare/, waouh-admin-stats/
supabase/migrations/
  *_waouh_init.sql              # PostGIS + 8 tables + RLS + triggers
```

### Sécurité

- RLS partout, écritures via Edge Functions service-role uniquement.
- Validation Zod sur tous les inputs Edge Functions.
- Rate limit 10 annonces/jour/téléphone (trigger SQL).
- Signature HMAC SHA-256 vérifiée sur webhooks Meta et Stripe (sprints 2-3).
- Service role key jamais exposée côté client.
- Admin dashboard protégé par `has_role(auth.uid(), 'admin')`.

### Mémoires projet à mettre à jour après sprint 1

- `core-modules-navigation` : passer de 5 à 6 modules visibles.
- Nouvelle mémoire `modules/waouh` : description module + tables + edge functions.

---

## Ce qui sera livré à la fin du sprint 1

1. Migration SQL PostGIS + 8 tables + RLS + triggers anti-spam.
2. 8 Edge Functions déployées, toutes appelables et fonctionnelles via le Lovable AI Gateway.
3. Sidebar bot.bj enrichie avec entrée WAOUH animée.
4. `/waouh` complet (5 onglets, données réelles depuis la DB).
5. `/waouh/demo` permettant de jouer une vente, une recherche, une négociation et un paiement de bout en bout sans WhatsApp réel.
6. Design system étendu (tokens HSL).
7. Mémoires projet mises à jour.

Aucun secret externe à fournir pour le sprint 1. Tout fonctionne immédiatement avec `LOVABLE_API_KEY` (déjà présent).
