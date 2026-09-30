# Plan d’implémentation UI — Bot / Web responsive / Flutter

Date : 30/09/2026  
Branche : `chatgpt/ui-bot-avatar-responsive-20260930`  
Base : `prod@0ca81b06a36a1412f748b5d68aa2c3ec729fbce9`

## Contraintes verrouillées
- UI/UX uniquement : aucune migration, Edge Function, RPC ou contrat Supabase modifié.
- Nom de l’avatar par défaut : **Bot**.
- Bot conduit visuellement la discussion mais ne change pas la logique métier ni la décision utilisateur.
- Web desktop, Web mobile/tablette et Flutter utilisent la même hiérarchie visuelle.

## 1. Accueil Flutter — écran Conversations
Objectif : réduire l’encombrement et placer Bot au premier plan.

Checklist :
- [x] Hero Bot sous Recherche / Échanges / Statuts / Radar.
- [x] Avatar, présence, rôle « Votre Avatar IA » et phrase courte.
- [x] CTA Démarrer / Chercher / Négocier.
- [x] Missions compactes dans le hero.
- [x] WAOUH One conservé en second niveau avec identité produit distincte.
- [x] Parcours WAOUH et listes existantes conservés.

Fichier : `flutter_waouh_app/lib/live/live_inbox_production.dart`.

## 2. Flutter — Avatar
Checklist :
- [x] Valeur par défaut Ayo → Bot.
- [x] Fallback et exemple de saisie harmonisés.

Fichiers :
- `flutter_waouh_app/lib/live/avatar/live_avatar_controller.dart`
- `flutter_waouh_app/lib/live/live_avatar_screen.dart`

## 3. Flutter — Deal Room / discussions
Checklist :
- [x] Bandeau « Bot conduit cette discussion » sous la fiche Deal Room.
- [x] Accès au conseil IA existant sans nouveau backend.
- [x] Libellés Avatar statiques harmonisés sur Bot.

Fichiers :
- `flutter_waouh_app/lib/live/live_match_chat_v2.dart`
- `flutter_waouh_app/lib/live/live_widgets.dart`

## 4. Web mobile / tablette — accueil Chat
Objectif : remplacer la présentation ancienne par la même hiérarchie que Flutter.

Checklist :
- [x] Header clair premium et recherche responsive.
- [x] Échanges / Statuts / Radar sous forme de segmented control.
- [x] Hero Bot principal avec Avatar IA et CTA.
- [x] WAOUH One en second niveau.
- [x] Conversations rendues sous forme de cartes plus aérées.
- [x] Layout compatible stack / drawer / pinned existants.

Fichier : `src/app-mobile/screens/ChatListScreen.tsx`.

## 5. Web desktop — Deal Room
Objectif : donner la priorité aux messages et éviter les photos plein écran dans le fil.

Checklist :
- [x] Bot visible comme guide de négociation.
- [x] Résumé IA existant conservé.
- [x] Hauteur des fiches produit compactes plafonnée.
- [x] Hauteur des pièces jointes plafonnée selon breakpoint.
- [x] Libellé assistant WAOUH → Bot dans le fil.

Fichiers :
- `src/components/waouh/WaouhMatchChatWindow.tsx`
- `src/components/waouh/WaouhProductCard.tsx`

## 6. Web — Avatar et shell partagé
Checklist :
- [x] Profil par défaut Ayo → Bot.
- [x] Hero Avatar desktop et libellés de navigation harmonisés.
- [x] Onglets, dock d’intelligence et Chat principal utilisent Bot comme nom visible.
- [x] Fond partagé des chats aligné sur WAOUH AIR.

Fichiers :
- `src/pages/waouh/WaouhAvatarHomePage.tsx`
- `src/erp/WebErpShell.tsx`
- `src/erp/CenterCanvas.tsx`
- `src/components/waouh/WaouhChatTabs.tsx`
- `src/components/waouh/WaouhUnifiedIntelligenceDock.tsx`
- `src/components/waouh/WaouhWebChat.tsx`
- `src/app-mobile/screens/WaouhChatScreen.tsx`
- `src/app-mobile/theme/chat-bg.css`

## 7. Version / QA / livraison
Checklist :
- [x] Version Flutter → `18.22.0+1790797740`.
- [x] Plateforme → `2026.09.30.18`.
- [ ] CI Web/Edge UI.
- [ ] CI Flutter / analyse / tests.
- [ ] PR squash vers `prod`.
- [ ] Déploiement Web.
- [ ] APK arm64 release et SHA-256.

## Non-modifié
- `supabase/functions/**`
- `supabase/migrations/**`
- schéma de données
- règles de thread / négociation / paiement / livraison
- contrats d’API
