

# Plan : Module Support Technique SIGDSTS — bot.bj/support

## Vue d'ensemble

Création d'un **module isolé et autonome** sur la route `/support`, dédié à la gestion des incidents, anomalies et demandes d'intervention selon le **circuit officiel SIGDSTS / ANTS** (3 niveaux : N1 Chatbot → N2 Support humain → N3 Escalade éditeur). Inclut un chatbot IA basé exclusivement sur le Guide SIGDSTS pour résoudre 70% des cas en N1, un système de tickets complet, un tableau de bord administrateur temps réel, et un suivi historique exhaustif.

## Architecture du circuit incidents (extrait des documents)

```text
┌─────────────────────────────────────────────────────────────┐
│  N1 — CHATBOT IA (résolution immédiate, 24/7)              │
│  Base : Guide_SIGDSTS_COMPLET.pdf + Section "Dépannage"    │
│  → Si résolu → ticket clos automatiquement                 │
│  → Si non résolu → escalade N2                             │
├─────────────────────────────────────────────────────────────┤
│  N2 — SUPPORT TECHNIQUE HUMAIN (Star Lab + Points Focaux)  │
│  Diagnostic, qualification incident, action corrective     │
│  SLA : Critique 2h | Majeure 4h | Mineure 1j ouvré         │
├─────────────────────────────────────────────────────────────┤
│  N3 — ESCALADE ÉDITEUR (bug logiciel / évolution)          │
│  Correction code, déploiement patch                        │
└─────────────────────────────────────────────────────────────┘
```

## Pages et routes

| Route | Accès | Rôle |
|---|---|---|
| `/support` | Public + Authentifié | Page d'accueil support : chatbot N1, FAQ, ouverture ticket |
| `/support/tickets` | Authentifié | Liste de mes tickets, statuts, historique |
| `/support/tickets/:id` | Authentifié + assigné | Détail ticket : conversation, pièces jointes, timeline |
| `/support/admin` | Admin uniquement | **Tableau de bord temps réel** : KPIs, file d'attente, monitoring |
| `/support/admin/tickets` | Admin | Tous les tickets, filtres, assignation, escalade |
| `/support/admin/knowledge` | Admin | Gestion base de connaissances du chatbot N1 |

## Composants principaux à créer

### 1. Page publique `/support` (`src/pages/SupportTechniquePage.tsx`)
- **Hero** : "Support SIGDSTS — Réponse immédiate 24/7"
- **Chatbot flottant N1** : conversationnel, basé sur le Guide. Boutons rapides : "Connexion impossible", "Problème prélèvement", "Erreur qualification biologique", "Problème distribution PSL"
- **3 cartes d'action** : Discuter avec l'IA · Ouvrir un ticket · Consulter la documentation
- **Indicateurs SLA visibles** : "Délai moyen actuel : 1h32" (live)
- **Catégories d'incidents** (issues du Guide) : Connexion, Module Donneur, Sélection Médicale, Prélèvement, Préparation PSL, Qualification Biologique, Tri/Validation, Distribution, Administration

### 2. Chatbot N1 (`src/components/support/SupportChatbot.tsx`)
- Interface de chat streaming (markdown rendu)
- **Edge function `support-chatbot-n1`** appelle Lovable AI Gateway (Gemini 2.5 Flash) avec le contenu du Guide injecté en system prompt + RAG
- Détection automatique : si l'IA n'a pas la réponse OU si l'utilisateur dit "ça ne marche pas / parler à un agent", propose **création automatique de ticket N2** avec résumé conversationnel pré-rempli
- Score de confiance affiché. Stockage des conversations dans `support_chat_sessions`

### 3. Formulaire de ticket (`src/components/support/TicketForm.tsx`)
Champs (alignés sur le Guide ch.15 "Soumission des demandes d'intervention") :
- **Catégorie** : Incident technique / Anomalie fonctionnelle / Demande d'évolution / Question
- **Sévérité** : Critique (bloquant) / Majeure / Mineure
- **Module concerné** : dropdown des 13 modules SIGDSTS
- **Site / Structure** : antenne ANTS, banque de sang, hôpital
- **Description** + capture d'écran (upload Supabase Storage)
- **Étapes de reproduction**
- **Profil utilisateur** : Médecin, IDE, Technicien labo, Admin, Point Focal

### 4. Espace utilisateur `/support/tickets` (`src/components/support/MyTicketsList.tsx`)
- Liste responsive (table desktop / cards mobile)
- Filtres : Statut (Ouvert/En cours/Résolu/Clos), Sévérité, Date
- Badge SLA temps restant (vert/orange/rouge)
- Vue détail avec **timeline** : création → assignation → diagnostic → résolution → clôture

### 5. **Tableau de bord administrateur** `/support/admin` (`src/components/support/AdminDashboard.tsx`)

Layout grid responsive avec **mise à jour temps réel** (Supabase Realtime) :

```text
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Tickets ouverts  │ En cours N2      │ Résolus 24h      │ SLA respecté %   │
│      24 ▲         │      12          │      47          │     94 %         │
├──────────────────┴──────────────────┴──────────────────┴──────────────────┤
│ Graphique : Tickets par jour (7j) — Line chart (recharts)                │
├──────────────────────────────────────────┬───────────────────────────────┤
│ Répartition par sévérité (PieChart)      │ Top modules problématiques   │
├──────────────────────────────────────────┼───────────────────────────────┤
│ File d'attente temps réel                │ Performance chatbot N1        │
│ (liste live, polling 5s + Realtime)      │ Taux résolution sans escalade │
├──────────────────────────────────────────┴───────────────────────────────┤
│ Carte des incidents par site (antennes ANTS) — heatmap                  │
└─────────────────────────────────────────────────────────────────────────┘
```

Actions admin : assigner ticket, changer statut, escalader N3, fusionner doublons, ajouter note interne, exporter CSV.

### 6. Gestion KB chatbot `/support/admin/knowledge` (`src/components/support/KnowledgeManager.tsx`)
- Upload du Guide PDF (déjà parsé), ajout d'articles complémentaires (FAQ, fiches réflexes)
- Stockés dans `support_knowledge_articles`. Le chatbot N1 les utilise via recherche sémantique simple (LIKE/full-text) ou injection directe en context.

## Schéma base de données (5 nouvelles tables)

```sql
-- Tickets de support
support_tickets (
  id uuid PK, ticket_number text unique (SUP-2026-00001),
  user_id uuid, assigned_to uuid nullable,
  category text, severity text, status text,
  module text, site text, profile text,
  title text, description text, reproduction_steps text,
  attachments jsonb,
  sla_due_at timestamptz, resolved_at timestamptz, closed_at timestamptz,
  origin text -- 'chatbot_escalation' | 'manual'
)

-- Messages/timeline d'un ticket
support_ticket_messages (
  id, ticket_id FK, author_id, author_role,
  message text, attachments jsonb, is_internal_note bool, created_at
)

-- Sessions chatbot N1
support_chat_sessions (
  id, user_id nullable, messages jsonb,
  resolved bool, escalated_ticket_id FK nullable,
  confidence_score numeric, created_at
)

-- Base de connaissances chatbot
support_knowledge_articles (
  id, title, content text, module text,
  category text, source text, is_active bool, created_at
)

-- Logs SLA & monitoring
support_sla_events (
  id, ticket_id FK, event_type text,
  threshold_minutes int, breached bool, occurred_at
)
```

**RLS** : 
- Utilisateurs : voient uniquement leurs propres tickets (`user_id = auth.uid()`)
- Agents support (rôle `support_agent`) : voient tickets qui leur sont assignés
- Admins (`has_role(uid, 'admin')`) : voient tout
- Rôles ajoutés à l'enum `app_role` : `support_agent`

## Edge Functions (3)

1. **`support-chatbot-n1`** : Streaming SSE, system prompt = Guide SIGDSTS + articles KB, retourne réponse + score confiance + flag `needs_escalation`
2. **`support-create-ticket`** : Génère ticket_number, calcule `sla_due_at` selon sévérité (2h/4h/1j), envoie notification email aux admins via fonction existante
3. **`support-sla-monitor`** : Cron qui scrute les tickets approchant SLA et marque `breached`, déclenche notification

## Détails techniques

- **Realtime** : `supabase.channel('support_tickets').on('postgres_changes', ...)` pour le dashboard admin
- **Charts** : `recharts` (déjà présent dans le projet)
- **Markdown** : `react-markdown` pour les réponses chatbot
- **File upload** : bucket Supabase Storage `support-attachments` (privé, RLS par user_id)
- **Génération ticket_number** : trigger Postgres `SUP-YYYY-XXXXX` avec sequence
- **SLA** : trigger BEFORE INSERT calcule `sla_due_at = now() + interval` selon sévérité (Critique=2h, Majeure=4h, Mineure=1j ouvré)
- **Notifications** : intégration avec hook existant `useNotifications`
- **Mobile-first** : breakpoints sm/md/lg, dashboard admin = grid responsive `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- **Sidebar** : ajout entrée "Support Technique" avec icône `LifeBuoy` pointant vers `/support`
- **Navigation publique** : lien footer + accès direct depuis page d'accueil
- **Le chatbot N1 utilise Lovable AI** (gratuit, déjà intégré) — modèle `google/gemini-2.5-flash`

## Fichiers à créer / modifier

**Nouveaux fichiers :**
- `src/pages/SupportTechniquePage.tsx`
- `src/pages/SupportTicketsPage.tsx`
- `src/pages/SupportTicketDetailPage.tsx`
- `src/pages/admin/SupportAdminDashboardPage.tsx`
- `src/pages/admin/SupportAdminTicketsPage.tsx`
- `src/pages/admin/SupportKnowledgePage.tsx`
- `src/components/support/SupportChatbot.tsx`
- `src/components/support/TicketForm.tsx`
- `src/components/support/TicketCard.tsx`
- `src/components/support/TicketTimeline.tsx`
- `src/components/support/MyTicketsList.tsx`
- `src/components/support/AdminDashboard.tsx`
- `src/components/support/SLABadge.tsx`
- `src/components/support/KnowledgeManager.tsx`
- `src/hooks/useSupportTickets.ts`
- `src/hooks/useSupportChatbot.ts`
- `src/hooks/useSupportRealtimeStats.ts`
- `supabase/functions/support-chatbot-n1/index.ts`
- `supabase/functions/support-create-ticket/index.ts`
- `supabase/functions/support-sla-monitor/index.ts`

**Modifiés :**
- `src/App.tsx` : ajout des 6 routes
- `src/components/Sidebar.tsx` : entrée "Support Technique"
- Migration DB : 5 tables + RLS + trigger ticket_number + trigger SLA + ajout rôle `support_agent` à l'enum

## Résultat attendu

- Page `/support` accessible publiquement avec chatbot N1 fonctionnel basé sur le Guide SIGDSTS
- Création de tickets fluide avec SLA automatique selon sévérité
- Espace utilisateur pour suivre ses tickets en temps réel
- **Dashboard admin temps réel** avec 4 KPIs principaux + 4 graphiques + file d'attente live
- Isolation stricte par utilisateur via RLS, accès admin via `has_role`
- 100% responsive (mobile/tablette/desktop)
- Chatbot résout les cas N1 sans intervention humaine, escalade automatique vers N2 si nécessaire

