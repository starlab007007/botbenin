# Plan — Contrôle Admin des Bots, Agents IA & Sessions WhatsApp

## Objectif
Depuis le Dashboard Admin, permettre à l'administrateur de voir, contrôler et suivre :
- Les **bots** classiques (`bots`)
- Les **agents IA** WAOUH : commerce/docs/site (`waouh_ai_agents`), BI (`waouh_bi_sources` + `waouh_bi_queries`), Stock (`waouh_stock_agents`), Présence QR (`waouh_attendance_sites` + `waouh_attendance_employees`)
- Les **sessions WhatsApp** (`waha_sessions_data`, `whatsapp_accounts`)

Chaque élément affiche : propriétaire (email), date de création, statut, métriques clés, avec actions Activer / Désactiver / Voir détails / Supprimer.

## Livrables

### 1. Nouvelle page `AdminBotsControlPage` (`/admin/bots-control`)
Une page à onglets (Tabs shadcn) :

- **Onglet 1 — Bots classiques** : table de `bots` (nom, owner, is_active, created_at, messages 24h) + toggle actif/inactif, suppression, lien vers analytics.
- **Onglet 2 — Agents IA WAOUH** : table de `waouh_ai_agents` (nom, type, owner, status, sessions) + toggle enabled, voir conversations récentes.
- **Onglet 3 — Agents BI** : liste `waouh_bi_sources` + nb requêtes, owner, dernier refresh, activer/désactiver.
- **Onglet 4 — Agents Stock** : liste `waouh_stock_agents` (owner, nb items, alertes actives), toggle actif, voir mouvements.
- **Onglet 5 — Agents Présence QR** : liste `waouh_attendance_sites` (nom, adresse, rayon, nb employés, check-ins 24h), toggle actif, régénérer QR.
- **Onglet 6 — Sessions WhatsApp** : liste `waha_sessions_data` + `whatsapp_accounts` (owner, phone, status WORKING/SCAN_QR/STOPPED, dernier heartbeat), actions Démarrer / Arrêter / Redémarrer / Logout (via edge functions `waha-connect` et `waha-*` existantes).

### 2. Composants réutilisables (`src/components/admin/bots-control/`)
- `BotsClassicTab.tsx`
- `AiAgentsTab.tsx`
- `BiAgentsTab.tsx`
- `StockAgentsTab.tsx`
- `AttendanceAgentsTab.tsx`
- `WhatsAppSessionsTab.tsx`
- `OwnerCell.tsx` (résolution user_id → email via `profiles`)
- `StatusToggle.tsx` (switch + confirmation)

### 3. Carte d'entrée sur le Dashboard Admin
Ajouter dans `AdminDashboardPage.tsx` une nouvelle carte "Contrôle Bots & Agents IA" (icône `Bot`, couleur cyan) pointant vers `/admin/bots-control`.

### 4. Route
Ajouter dans `App.tsx` :
```tsx
const AdminBotsControlPage = lazy(() => import("./pages/admin/AdminBotsControlPage"));
<Route path="/admin/bots-control" element={<AdminRoute><AdminBotsControlPage /></AdminRoute>} />
```

### 5. Backend — RLS admin
Vérifier que `has_role(auth.uid(), 'admin')` permet SELECT/UPDATE sur les tables listées. Ajouter, si manquant, des policies "Admins can manage all" en SQL migration (une seule migration, avec `GRANT` déjà existants — pas de nouvelles tables).

Tables à vérifier :
- `bots` — policy admin manage
- `waouh_ai_agents` — policy admin manage
- `waouh_bi_sources`, `waouh_bi_queries` — policy admin manage
- `waouh_stock_agents` — policy admin manage
- `waouh_attendance_sites`, `waouh_attendance_employees` — policy admin manage
- `waha_sessions_data`, `whatsapp_accounts` — policy admin manage

### 6. Actions de contrôle
- **Toggle actif** : `UPDATE ... SET is_active = !is_active`.
- **Suppression** : soft-delete quand possible (colonne `deleted_at` si présente), sinon DELETE avec confirmation.
- **Sessions WA** : appels aux edge functions existantes `waha-connect` (start/stop/logout) via `supabase.functions.invoke`.
- **Regénérer QR présence** : call à `waouh-attendance-qr` si existant, sinon simple `UPDATE` du token.

### 7. Journalisation
Chaque action admin insère une ligne dans `admin_logs` (table existante) avec `action`, `target_table`, `target_id`, `admin_id`, `details`.

## Détails techniques
- Utiliser `useAdminRole` pour garde côté client (déjà en place via `AdminRoute`).
- Requêtes paginées 50 lignes, recherche par nom/owner, filtres statut.
- Realtime : `supabase.channel` avec cleanup sur unmount pour chaque onglet actif.
- Résolution owner : jointure `profiles` (email, display_name) — une seule requête `in ('user_id', [...])` par table.
- Aucun changement sur les modules côté utilisateur (mobile/web), aucun impact sur le moteur de chat WAOUH (invariants v12 respectés).

## Test
1. Se connecter en admin, ouvrir `/admin/bots-control`.
2. Sur chaque onglet : voir la liste, filtrer, basculer un statut, vérifier persistance après refresh.
3. Sur onglet WhatsApp : arrêter puis redémarrer une session, vérifier le status via realtime.
4. Vérifier que `admin_logs` reçoit bien les entrées.
5. Se connecter en utilisateur non-admin → `/admin/bots-control` redirige (AdminRoute).
