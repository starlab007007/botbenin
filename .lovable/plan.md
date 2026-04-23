## Diagnostic

Le module SIGDSTS est monté sur `/sigdsts/*` dans `src/App.tsx`, mais **plusieurs composants utilisent encore l'ancien préfixe `/support/*`**, ce qui provoque des 404 (et la page `SupportPage` legacy s'ouvre quand on tombe sur `/support`).

### Liens incorrects identifiés

| Fichier | Ligne | Lien actuel (KO) | Devrait être |
|---|---|---|---|
| `SupportTechniquePage.tsx` | 30 | `<link rel="canonical" href="https://bot.bj/support" />` | `https://bot.bj/sigdsts` |
| `SupportTechniquePage.tsx` | 79 | `href="/support/tickets"` (carte "Mes tickets") | `/sigdsts/tickets` |
| `TicketCard.tsx` | 13 | `basePath = '/support/tickets'` (défaut) | `/sigdsts/tickets` |
| `SupportAdminTicketsPage.tsx` | 69 | `basePath="/support/admin/tickets"` | `/sigdsts/admin/tickets` |
| `SupportTicketDetailPage.tsx` | 37 | `to="/support/tickets"` (404 ticket) | `/sigdsts/tickets` |
| `SupportTicketDetailPage.tsx` | 76 | `to={isAdmin ? '/support/admin/tickets' : '/support/tickets'}` | `/sigdsts/admin/tickets` / `/sigdsts/tickets` |
| `SupportAdminDashboardPage.tsx` | 20 | `to="/support/admin/tickets"` | `/sigdsts/admin/tickets` |
| `SupportAdminDashboardPage.tsx` | 23 | `to="/support/admin/knowledge"` | `/sigdsts/admin/knowledge` |
| `TicketForm.tsx` | 54 | `navigate(/support/tickets/${ticket.id})` après création | `/sigdsts/tickets/${ticket.id}` |

C'est ce dernier qui explique pourquoi **après création d'un ticket** l'utilisateur est redirigé vers une page inexistante (`/support/tickets/:id`) au lieu du détail du ticket.

## Corrections à appliquer

1. **`src/components/support/TicketForm.tsx`** — remplacer la redirection post-création par `/sigdsts/tickets/${ticket.id}`.
2. **`src/components/support/TicketCard.tsx`** — `basePath` par défaut → `/sigdsts/tickets`.
3. **`src/pages/SupportTechniquePage.tsx`** — `href="/sigdsts/tickets"` + canonical `https://bot.bj/sigdsts`.
4. **`src/pages/SupportTicketsPage.tsx`** — déjà OK (utilise `TicketCard` par défaut), vérifier qu'aucun lien dur n'existe.
5. **`src/pages/SupportTicketDetailPage.tsx`** — boutons "Retour" → `/sigdsts/tickets` et `/sigdsts/admin/tickets`.
6. **`src/pages/admin/SupportAdminDashboardPage.tsx`** — liens vers tickets et knowledge sous `/sigdsts/admin/...`.
7. **`src/pages/admin/SupportAdminTicketsPage.tsx`** — `basePath="/sigdsts/admin/tickets"`.

## Améliorations UX bonus (légères)

- Sur la page **détail ticket admin**, ajouter un bouton « Assigner à moi » qui appelle `assignTicket(ticket.id, user.id)` (déjà disponible dans `useSupportTickets`) pour que l'admin puisse facilement prendre en charge un ticket et le passer en `en_cours`.
- Sur la page **détail ticket utilisateur**, afficher un bandeau « Statut : En cours / Résolu » bien visible en haut + un bouton « Rouvrir » si statut = `resolu` (qui rappelle le support en passant `status='ouvert'` via l'edge function existante ou un message au lieu — pour rester simple : ajouter un message qui réveille le ticket côté admin via un toast).
- Ajouter un lien retour discret en haut de `/sigdsts` vers `/dashboard` (« ← Retour à la plateforme ») pour que l'utilisateur puisse sortir du module isolé.

## Résultat attendu

- `/sigdsts` → page d'accueil support (chatbot + actions)
- `/sigdsts/tickets` → mes tickets (utilisateur)
- `/sigdsts/tickets/:id` → détail ticket (utilisateur ou admin)
- `/sigdsts/admin` → dashboard admin
- `/sigdsts/admin/tickets` → tous les tickets (admin)
- `/sigdsts/admin/tickets/:id` → ⚠️ cette route n'existe pas séparément, le détail admin réutilise `/sigdsts/tickets/:id` (les actions admin s'y affichent automatiquement via `useAdminRole`). C'est déjà le comportement attendu.

Aucune modification de base de données ni d'edge function n'est requise — uniquement des corrections de routes côté client.
