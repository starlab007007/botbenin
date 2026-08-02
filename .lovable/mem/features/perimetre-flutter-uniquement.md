---
name: Périmètre Flutter uniquement (web)
description: Le web n'expose aux utilisateurs que les modules de l'app Flutter (branche codex) ; les modules web historiques restent réservés aux administrateurs
type: constraint
---
Modules autorisés côté utilisateur (parité Flutter `codex`) : Auth (email + OTP WhatsApp), Chat/WAOUH (`/app/chat`, `/app/chat/waouh`, `/app/chat/:id`), Notifications, Bots (`/app/bots` + agents BI, Stock, Présence QR), WhatsApp IA, Diffusion, Partenaire (businesses/produits/ventes/payouts), Profil.

Tout autre module web (dashboard legacy, Kpakpato, vidéo/marketing, prospects/CRM, knowledge bases, visual creator, support, account, tests, Après BAC, recette, docs architecture) est enveloppé dans `FlutterParityGate` (`src/routes/FlutterParityGate.tsx`) : accessible uniquement aux administrateurs, sinon redirection vers `/app/chat`. Ne pas supprimer ce code.

`/admin/*` et les produits publics autonomes (SIGDSTS, /fa, /documentation, pages SEO) restent accessibles.

UI : bottom nav 5 onglets Flutter sur mobile, `WebErpShell` conservé sur desktop (rail = mêmes modules Flutter, incluant Présence QR).
