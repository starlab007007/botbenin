
# Refonte UI/UX `/app/chat` — v2 (sans Appels, Statuts en cartes WAOUH)

Périmètre : **présentation seulement**. Réutilise les composants chat existants (`WaouhWebChat`, `WaouhMatchChatWindow`, `WaouhUnifiedInbox`, `useWaouhInbox`, etc.). Aucun nouveau module fonctionnel sauf **Statuts 24h**. Le flux WAOUH Sync verrouillé n'est pas touché.

---

## 1. Mobile `/app/chat` — Onglets

Onglets sous le header existant (header inchangé) :

```text
┌──────────────────────────────────────┐
│ [<] WAOUH                🔔 ℹ️ + 👤  │  ← header existant
├──────────────────────────────────────┤
│  💬 Chats   ·   📌 Statuts           │  ← 2 onglets (PAS d'Appels)
├──────────────────────────────────────┤
│  contenu                             │
└──────────────────────────────────────┘
```

- **Chats** = `WaouhWebChat` actuel + tabs articles existants : **inchangé**.
- **Statuts** = nouveau, cartes (voir §3).

---

## 2. Web / Tablette `/app/chat` — Layout 3 panneaux

```text
≥1024px
┌────┬──────────────────┬────────────────────────────┬──────────────┐
│Rail│ Liste conv.      │ Conversation               │ Contexte     │
│64px│ 320px            │ flex-1                     │ 300px toggle │
│    │                  │                            │              │
│💬  │ 🔍 Recherche     │ Header sticky              │ Profil       │
│📌  │ ⟦Tous⟧⟦Non lus⟧  │ ── WaouhWebChat embed ──   │ + Article    │
│🔔  │ ⟦WhatsApp⟧⟦App⟧  │      (intact)              │ + Médias     │
│👤  │ Items virtuels   │                            │ + Recherche  │
└────┴──────────────────┴────────────────────────────┴──────────────┘
```

- Rail vertical : Chats / Statuts / Notifications (réutilise `WaouhNotificationsBell`) / Profil. **Pas d'icône Appels.**
- Liste = `useWaouhInbox` (existant) + chips de filtre + recherche sticky.
- État vide de la fenêtre = quick actions Vendre / Acheter / Négocier (récupérés de la page actuelle, simplement re-placés).
- Panneau droit en lecture seule branché sur tables existantes (`waouh_users`, `waouh_articles`, `waouh_messages.article_id`).

Tablette (768–1023) : `Rail | Liste | Conversation`, contexte en drawer.

Composants visuels à créer (chrome uniquement) :
- `ChatRail.tsx`, `ChatConversationList.tsx`, `ChatContextPanel.tsx`, `ChatShellWeb.tsx`.

---

## 3. Sous-module **Statuts 24h** — design carte (référence capture)

Style exact d'inspiration = ta capture jointe : carte verte avec **avatar carré arrondi à gauche**, **fil d'info à droite** (`WAOUH·CODE` + badge `Sync · HH:MM · N msg`), **titre produit**, **ligne `prix · ville · CTA`**.

### Anatomie d'une carte Statut

```text
┌──────────────────────────────────────────────────────────────┐
│ ┌────┐  WAOUH · ACH-22BE-F44   ⏱ Expire dans 18 h           │
│ │img │  Test 17                                             │
│ │ ◷  │  300 FCFA · Cotonou · 💬 Discuter · 🤝 Négocier      │
│ └────┘  [Urgent vente]  · 👁 12  · 📍 1.2 km                 │
└──────────────────────────────────────────────────────────────┘
   ^ teinte fond = type :
     • rouge sourd  → Urgence vente
     • vert sourd   → Urgence achat
     • ambre sourd  → Annonce/Promo
```

- Le badge `Sync · 19:38 · 0 msg` de la capture devient un **chip d'expiration** `⏱ Expire dans Xh` (même style visuel, fonction différente).
- CTA inline (`💬 Discuter`) ouvre la conversation existante via le flux verrouillé (`directMeta.article_id`) — **0 nouvelle logique de sync**.

### Disposition Mobile (onglet Statuts)

```text
┌──────────────────────────────────────┐
│ 🟢 Publier un statut · 24h           │  ← bouton plein largeur
├──────────────────────────────────────┤
│ FILTRES :                            │
│ ⟦Tous⟧ ⟦🔴 Vente⟧ ⟦🟢 Achat⟧ ⟦📣⟧   │
├──────────────────────────────────────┤
│ [carte verte WAOUH — capture]        │
│ [carte rouge — Urgent vente]         │
│ [carte verte — Recherche urgente]    │
│ [carte ambre — Promo flash]          │
├──────────────────────────────────────┤
│ Pull-to-refresh + scroll infini      │
└──────────────────────────────────────┘
```

### Disposition Web/Tablette

- Bandeau **au-dessus** de la liste de conversations : **rangée horizontale de cartes** (mêmes cartes WAOUH, format compact 280×88).
- Clic → ouvre un **modal split** : carte agrandie à gauche, fenêtre de chat à droite (réutilise `WaouhMatchChatWindow`).
- Bouton `+ Publier` en tête de rangée.

---

## 4. Innovations uniques, simples et pratiques

Toutes branchées sur composants existants — pas de surface fonctionnelle nouvelle au-delà des Statuts.

### a) **Mode "Marché" (toggle dans le rail)**
Bouton 🛒 qui réorganise la liste de gauche par **article négocié** plutôt que par contact. Réutilise `waouh_messages.article_id` déjà présent. Vue commerciale immédiate : « voici les 5 articles sur lesquels je discute en ce moment, et qui s'y intéresse ».

### b) **Compteur urgence "À répondre"**
Pastille en haut de la liste : *« 3 acheteurs attendent depuis +2h »*. Calculée client-side depuis `useWaouhInbox` (dernier message `direction='in'` sans réponse `out`). Clic → filtre instantané.

### c) **Bulles de prix dans le fil**
Quand `waouh_messages.meta` contient un prix FCFA, on le rend en **chip surligné** dans la bulle (ex. `💰 300 000 FCFA`). Détection regex côté rendu, zéro changement DB.

### d) **Réponses rapides commerciales contextuelles**
Au-dessus du composer (web et mobile) : 3-4 chips dynamiques selon le dernier message reçu (« Toujours dispo ? », « Prix négociable », « OK pour Cotonou », « Mobile Money MTN »). Insère le texte dans le composer, l'envoi reste l'envoi normal.

### e) **Long-press sur un Statut → "Booster en chat"**
Sur mobile, long-press d'une carte Statut → ouvre un sheet "Envoyer ce statut à mes 5 dernières conversations". Réutilise insert standard dans `waouh_messages` avec `article_id` du statut. Diffusion ciblée sans cron, sans nouveau module.

### f) **Vue "Aujourd'hui" en haut de la liste**
Section repliable affichant uniquement les conversations actives **depuis ce matin** + résumé compteur (`12 messages · 4 contacts · 2 affaires en cours`). Donne un sentiment de "tableau de bord commercial" sans en être un.

### g) **Mini-trace négociation dans la bulle**
Quand un message vient de `waouh-negotiation-router` (`deal_created` / `negotiation_open` / `negotiation_closed`), petite frise sous la bulle : `💬 Discussion → 🤝 Offre 280 k → ✅ Accord 290 k`. Lecture seule depuis `waouh_messages.meta` existant.

### h) **Mode "Focus conversation"**
Bouton ☾ qui masque rail + liste + contexte → la fenêtre de chat occupe tout l'écran. Sortie au clic ou à l'`Esc`. Idéal en négociation longue.

---

## 5. Garanties

- ❌ Aucune modif de `WaouhWebChat`, `WaouhMatchChatWindow`, `waouh-webhook`, `waouh-negotiation-router`, `waouh_messages`, hooks de sync.
- ❌ Pas d'onglet Appels, pas d'anneaux WhatsApp Status.
- ✅ Style Statuts = **cartes WAOUH** exactement dans l'esprit de la capture jointe.
- ✅ Toutes les "innovations" §4 = composition visuelle au-dessus de données déjà disponibles.

---

## 6. Données Statuts (seul ajout backend)

Table `waouh_statuses` (id, user_id, type ∈ {sell|buy|announce}, media_url, title, price_fcfa, location, article_id?, caption, expires_at, created_at) + RLS + GRANTs (`authenticated`/`service_role`) + bucket Storage `waouh-statuses` + edge function `waouh-statuses-purge` (cron quotidien).

Hook `useStatuses()` → liste realtime + `publishStatus()`.

---

## 7. Étapes d'implémentation

1. Tokens chat + Statuts dans `index.css` (HSL).
2. Migration `waouh_statuses` + bucket + edge `waouh-statuses-purge`.
3. `StatusCard.tsx` (style capture), `StatusComposer.tsx`, `useStatuses.ts`.
4. Mobile : tabs `Chats | Statuts` dans `WaouhChatScreen` (Chats inchangé).
5. Web : `ChatRail`, `ChatConversationList`, `ChatContextPanel`, `ChatShellWeb` + branchement dans `WaouhChatPage`.
6. Innovations §4 a→h en couches successives (chacune isolée, non-bloquante).
7. QA visuel mobile / tablette / desktop.

---

## Questions avant build

1. **Ordre de livraison** :
   - A. Statuts (cartes) d'abord — résultat visible vite.
   - B. Refonte 3 panneaux web d'abord.
   - C. Les deux en parallèle, innovations §4 ensuite.
2. **Innovations §4 à embarquer dans la v1** — coche 2 à 4 lettres parmi a/b/c/d/e/f/g/h.
3. **Génère 3 directions visuelles rendues (HTML preview)** de la carte Statut + bandeau web avant de coder ? oui / non.
