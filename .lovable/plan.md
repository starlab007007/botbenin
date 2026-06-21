
# Plan — Audit complet WAOUH Chat + Partenaire → docs, prompt nowa.dev, captures & diagrammes

Objectif : Se connecter sur https://bot.bj/app/chat (compte `songbianzime@gmail.com`), explorer chaque parcours, capturer chaque écran clé, croiser avec le code source, puis produire 4 livrables consolidés dans `/mnt/documents/`.

## 1. Reconnaissance code (lecture seule)

Lire en parallèle pour cartographier l'existant :

- `src/pages/ChatPage.tsx`, `src/pages/waouh/WaouhDemoPage.tsx`
- `src/components/waouh/` : `WaouhMatchChatList.tsx`, `WaouhMatchChatWindow.tsx`, `WaouhNotificationsBell.tsx`, `notificationActions.ts`, modals Vendre/Acheter/Négocier, modal Statut
- `src/hooks/` : `useWaouhMatchChats.ts`, `useWaouhMatchNotifications.ts`, `useWaouhInbox.ts`, `useWaouhAI.ts`, `useWaouhPartner.ts`, `useWaouhPartnerStats.ts`
- `src/app-mobile/screens/` : ChatListScreen, ChatScreen, PartnerBusinessesScreen, PartnerProductsScreen
- Edge functions : `waouh-channel-in`, `waouh-webhook`, `waouh-sell-handler`, `waouh-buy-handler`, `waouh-negotiate-handler`, `waouh-notify-dispatch`, `waouh-notify-buyers`, `waouh-match-history`, `waouh-outbound-dispatch`, `waouh-status-*`
- Schéma DB : `waouh_articles`, `waouh_buyer_profiles`, `waouh_negotiations`, `waouh_messages`, `waouh_notifications`, `waouh_outbound_queue`, `waouh_statuses`, `waouh_partners`, `waouh_partner_businesses`, `waouh_partner_products`, `waouh_deals`
- Mémoires verrouillées : `waouh-chat-sync-flow-locked-v12` (matchKey par counterpart, propagation `counterpart_user_id`)

## 2. Session live Playwright (lecture + screenshots, aucune publication)

Script unique `/tmp/browser/waouh-audit/run.py` (headless Chromium, viewport 1280×1800), credentials via env. Parcours capturés :

```text
1_login_auth           → /app/auth → email + password aaaaaaaa → submit
2_chat_main            → /app/chat (liste conversations + composer)
3_waouh_new_chat       → bouton "Nouveau chat WAOUH" → fenêtre principale
4_match_chat_list      → WaouhMatchChatList (onglets acheteur/vendeur, badges non-lus)
5_match_chat_window    → ouverture WaouhMatchChatWindow par (article, acheteur)
6_notif_bell           → cloche notifications (📩 Nouvel acheteur intéressé)
7_notif_open_to_chat   → clic notif → openNotificationTarget → fenêtre ouverte
8_modal_sell           → "Je vends" → modal payload (titre/prix/photos)
9_modal_buy            → "Je cherche" → modal payload (critères/budget)
10_modal_negotiate     → "Négocier" → modal contre-offre
11_statuses_publish    → "J'annonce" / publication statut vente
12_statuses_feed       → feed des statuts (vente/achat/annonces)
13_partner_onboarding  → /app/partner → demande partenaire
14_partner_business    → ajout entreprise
15_partner_products    → ajout produit (formulaire + liste)
16_partner_dashboard   → KPIs ventes/payouts
```

Pour chaque écran : screenshot + capture des payloads réseau (`waouh-*` POST bodies, `waouh_notifications` inserts, événements realtime). Logs console et `waouh:open-match-chat` / `waouh:focus-message` enregistrés via `page.on("console")` + interception `CustomEvent`.

## 3. Livrables produits dans `/mnt/documents/`

### A. Document technique Markdown
`/mnt/documents/waouh-chat-architecture.md` (≈ 30 sections)

- Vue d'ensemble : surfaces (web `/app/chat`, mobile Capacitor, WhatsApp WAHA)
- Cycle de vie message : composer → `waouh-channel-in` → `waouh-webhook` → handlers (sell/buy/negotiate/pay) → réponse + `waouh_outbound_queue` → realtime
- **Chat principal** : composition AI Elements, `useWaouhInbox`, affichage optimiste, fallback realtime
- **WaouhMatchChatList** : `matchKey(articleId, role, counterpartId)`, regroupement par (article, acheteur) côté vendeur / par article côté acheteur (v12), filtres, badges
- **WaouhMatchChatWindow** : ouverture multi-fenêtres, drop realtime si counterpart mismatch, propagation `counterpart_user_id`, charge `waouh-match-history`
- **Notifications** : table `waouh_notifications`, `useWaouhMatchNotifications`, `WaouhNotificationsBell`, événements `waouh:open-match-chat` / `waouh:focus-message`, deeplinks payment
- **Parcours vendeur** : modal "Je vends" → payload `{ phone, message, photos[], location, source_channel }` → `waouh-sell-handler` (extraction IA Gemini) → INSERT `waouh_articles` → `waouh-notify-buyers`
- **Parcours acheteur** : modal "Je cherche" → `waouh-buy-handler` → `waouh_buyer_profiles` + matching → liste numérotée
- **Mise en relation** : "intéressé Nº1" → `waouh_negotiations` + notification vendeur + ouverture fenêtre dédiée
- **Négociation** : modal "Négocier" → `waouh-negotiate-handler` (IA contre-offre) → update négo
- **Paiement** : "Je paye" → escrow Mobile Money (Qosic), `deal_payment_request`
- **Statuts** : `waouh_statuses` (Je vends / Je cherche / J'annonce), publication, feed, expiration
- **Module Partenaire** : `useWaouhPartner.apply` (création), `waouh_partner_businesses`, `waouh_partner_products`, `waouh_partner_sales`, `waouh_partner_payouts`, permissions, RLS, niveaux Bronze/Argent/Or/Platine
- Tableaux exhaustifs payloads (request/response) pour chaque edge function
- Sécurité : RLS, `counterpart_user_id` end-to-end, dedup queue WA

### B. Diagrammes Mermaid `.mmd`
- `/mnt/documents/waouh-sequence-vente.mmd` — séquence vendeur → acheteurs
- `/mnt/documents/waouh-sequence-achat-nego.mmd` — recherche → intérêt → négo → paiement
- `/mnt/documents/waouh-components.mmd` — composants front (ChatPage → MatchChatList → MatchChatWindow → NotificationsBell → modals)
- `/mnt/documents/waouh-partner.mmd` — flux partenaire (onboarding → business → produits → ventes → payout)

### C. Captures annotées
- PNGs sous `/mnt/documents/waouh-screenshots/01..16_*.png`
- Index `/mnt/documents/waouh-screenshots/README.md` reliant chaque capture à la section correspondante du doc

### D. Prompt nowa.dev clé-en-main
`/mnt/documents/nowa-prompt-waouh.md` (~6–8 k mots), structure :

1. Contexte produit & utilisateurs (FR + FCFA + Bénin)
2. Stack imposée (React/TS, Supabase, edge functions Deno, WAHA, Gemini)
3. Modèle de données complet (DDL résumé pour 12 tables clés)
4. Spécification fonctionnelle par module (Chat, MatchChatList multi-fenêtres v12, MatchChatWindow, Notifications, Statuts, Modals Vendre/Acheter/Négocier, Paiement, Partenaire)
5. Contrats payload exacts (JSON in/out) pour chaque edge function
6. Règles de matching `matchKey` + propagation `counterpart_user_id`
7. RLS + grants
8. UI/UX (mobile-first, `max-h-[100dvh]`, FR/Fon/Yoruba)
9. Critères d'acceptation testables
10. Diagrammes Mermaid embarqués

## 4. Détails techniques

- Réutiliser le harness Playwright décrit dans `<browser-use>` (viewport, secrets non loggés, screenshots sous `/tmp/browser/...`).
- Logger les payloads réseau via `page.on("request")` filtré sur `supabase.co/functions/v1/waouh-*` et `rest/v1/waouh_*`, dump JSON anonymisé dans `/tmp/browser/waouh-audit/payloads/`.
- Si la connexion échoue (2FA, captcha, OTP WhatsApp), basculer en analyse code-seule pour cette section et signaler dans le doc.
- Aucune publication d'annonce ni de statut réel (lecture pure : remplir les modals jusqu'à l'aperçu du payload, fermer sans submit).
- Aucun secret affiché dans les livrables.

## Hors périmètre

- Pas de modification de code applicatif.
- Pas de migration DB.
- Pas de refactor des fenêtres WAOUH (mémoire `waouh-chat-sync-flow-locked-v12` verrouillée).
- Pas de publication du site.
