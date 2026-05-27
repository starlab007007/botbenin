## Objectif

Refondre l'écran mobile `/app/whatsapp` pour offrir, en 100% UI native Android (sans iframe, sans lien web, sans modal web), la totalité des fonctionnalités de la page web `/whatsapp-connect` (composant `SmartWhatsAppInterface` → `SimpleSessionManager`), branchée sur le même backend (table `whatsapp_accounts` + edge functions `waha-dashboard-proxy`, `waha-session-manager`, `waha-connect`, `waouh-waha-control`).

## Périmètre fonctionnel à porter (parité web ↔ mobile)

1. Liste des sessions WhatsApp de l'utilisateur (DB `whatsapp_accounts` + statut live WAHA fusionné)
2. Création d'une session (nom personnalisé)
3. Actions par session : Démarrer, Arrêter, Redémarrer, Supprimer, Rafraîchir
4. Affichage du QR code en plein écran natif (sheet) avec polling auto jusqu'à `WORKING`
5. Statut temps-réel (badge : STOPPED / STARTING / SCAN_QR / WORKING / FAILED) + dernier ping
6. Numéro WhatsApp connecté + nom du compte
7. Envoi d'un message test (numéro + texte)
8. Liaison à un bot (BotWebhookLinker) — sélection bot existant → webhook auto
9. Configuration du webhook personnalisé (URL + events)
10. Diagnostic rapide (health WAHA + permissions) condensé en carte
11. Sessions partagées admin (lecture seule) si présentes
12. Synchronisation : realtime Supabase sur `whatsapp_accounts` + refresh live WAHA toutes les 20 s

## Architecture mobile native

Nouveaux fichiers sous `src/app-mobile/` :

```text
src/app-mobile/
├── screens/whatsapp/
│   ├── WhatsAppHomeScreen.tsx         (remplace WhatsAppScreen.tsx, liste + entête)
│   ├── SessionDetailScreen.tsx        (push-screen actions + infos)
│   ├── CreateSessionSheet.tsx         (BottomSheet native)
│   ├── QrScanSheet.tsx                (sheet plein écran QR + polling)
│   ├── SendTestMessageSheet.tsx
│   ├── LinkBotSheet.tsx
│   └── WebhookConfigSheet.tsx
├── components/whatsapp/
│   ├── SessionCard.tsx                (carte native swipe-actions)
│   ├── StatusBadge.tsx
│   ├── ActionRow.tsx
│   └── DiagnosticCard.tsx
└── hooks/
    └── useMobileWhatsApp.ts           (wrapper unifié : DB + WAHA proxy)
```

Mutualisation : le hook `useMobileWhatsApp.ts` réutilise la même logique que `useWAHADashboard` et `useWhatsAppAccounts` (mêmes edge functions, mêmes tables) — pas de duplication backend, seulement une couche d'appels adaptée mobile (pas de toasts desktop, gestion d'erreurs Capacitor-friendly).

Routage : ajouter les sous-routes dans `AppMobile.tsx`
- `/app/whatsapp` → `WhatsAppHomeScreen`
- `/app/whatsapp/:sessionName` → `SessionDetailScreen`

## UI native Android (style)

- Header sticky vert WhatsApp (`hsl(165 91% 18%)`) déjà utilisé dans l'app
- Pull-to-refresh natif (overscroll) sur la liste
- BottomSheet (`Sheet` shadcn déjà natif tactile) avec `h-[92dvh]`, drag handle, safe-area
- Listes : cartes empilées, tap → push detail screen, swipe-left → actions
- Boutons d'action gros tactiles (min 44 px), feedback haptique via `@capacitor/haptics` quand dispo
- QR : sheet plein écran fond blanc, image centrée 280×280, bouton "Régénérer" + spinner polling
- Aucun iframe (`WAHADashboardIframe`, `WAHADashboardViewer` exclus), aucun `window.open`, aucun lien externe
- Champs (numéro, message test) avec composants natifs déjà créés (`PhoneBjInput`, `NativeSelectSheet`, textarea full-width)
- Safe-area : `paddingBottom: calc(env(safe-area-inset-bottom) + 5.5rem)` pour ne pas masquer la BottomTabBar
- Scroll : `overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]` sur toutes les zones défilantes

## Backend / intégrations

Aucune nouvelle table, aucune nouvelle edge function. Utilisation existante :
- Table `whatsapp_accounts` (RLS déjà en place)
- Edge functions : `waha-dashboard-proxy` (liste/statut live), `waha-session-manager` (CRUD session), `waha-connect` (QR), `waouh-waha-control` (webhook)
- Realtime Supabase channel sur `whatsapp_accounts` filtré par `user_id`
- Polling QR : 2 s tant que statut ≠ `WORKING` (max 90 s)

## Vérifications de fin

- Build mobile OK (`dist-mobile`)
- Aucune importation d'iframe / dashboard web dans les nouveaux fichiers
- Sessions créées sur mobile visibles sur web (même DB) et inversement
- QR scanné sur mobile → statut `WORKING` propagé partout via realtime
- Scroll fluide, sheets ne dépassent pas la safe-area, tabs toujours visibles

## Hors périmètre

- Pas de modification du backend
- Pas de modification de la page web `/whatsapp-connect`
- Pas de nouvel onglet de navigation