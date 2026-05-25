
# Sync complète WaouhApp ↔ Web

Objectif : qu'après connexion (email ou OTP WhatsApp), l'utilisateur retrouve dans l'app mobile **exactement** les mêmes données que sur bot.bj (profil, bots, conversations, sessions WhatsApp, partenaire, diffusions), et que **tous les boutons** des 5 écrans fonctionnent réellement, avec en priorité le **démarrage d'un Waouh Chat**.

## 1. Profil partagé après connexion

- Hook `useMobileProfile()` qui lit `profiles` (table déjà utilisée par le web) via `user_id = auth.uid()`.
- Si la ligne n'existe pas (premier login OTP WhatsApp), création automatique avec `phone_number` + `display_name` par défaut.
- Affichage du nom + avatar dans le header de `ChatListScreen`, `BotsScreen`, `PartnerScreen` (au lieu du titre statique "WaouhApp").
- Ajout d'un écran `/app/profile` (accessible via tap sur l'avatar) : nom, téléphone, langue, bouton **Se déconnecter**.
- Garantie : la même ligne `profiles` est lue par le web → toute modification est instantanément visible des deux côtés.

## 2. Démarrage d'un Waouh Chat (priorité)

Le bouton `+` du header `ChatListScreen` est aujourd'hui inerte. À implémenter :

- Nouveau composant `NewChatSheet` (bottom sheet) avec 2 modes :
  1. **Nouveau numéro** : saisie d'un numéro (E.164, validation `lib/phone.ts`) + choix du canal (`web`, `whatsapp`).
  2. **Depuis contacts** (natif Capacitor déjà installé) : sélection rapide d'un contact.
- À la validation : `INSERT` dans `waouh_conversations` (user_id, phone_number, channel, last_message=null) → navigation immédiate vers `/app/chat/{id}`.
- Sur `ChatScreen`, premier message envoyé : si `channel='whatsapp'` → routage WAHA déjà câblé ; si `channel='web'` → simple insert (déjà ok).
- Indicateur de présence + statut "envoyé / livré / lu" via colonne `status` de `waouh_messages` (déjà présente côté realtime).

## 3. Activation des boutons existants

| Écran | Bouton actuellement inerte | Action à câbler |
|---|---|---|
| ChatList | `+` header | Ouvre `NewChatSheet` (§2) |
| ChatScreen | Trombone (Paperclip) | Sheet: photo (caméra), document (filesystem), localisation |
| ChatScreen | Header (tap sur nom) | Ouvre `ConversationInfoSheet` (numéro, canal, archiver, supprimer) |
| Bots | Carte bot (tap) | Navigation vers `/app/bots/:id` (détail + toggle actif/inactif + lien conversations) |
| WhatsApp | Carte session | Tap = actions (logout WAHA, renommer, voir messages) |
| Diffusion | "Importer contacts" / "Nouvelle campagne" | Importation déjà partielle → finaliser INSERT dans `waouh_campaigns` + envoi via `whatsapp-diffusion-send` |
| Partner | KPIs | Tap KPI = écran détail (ventes, payouts) déjà présents côté web → réutilisation des hooks `useWaouhPartner*` |
| Tab bar | — | Badge non-lus (count via `waouh_messages` realtime) sur l'onglet Chat |

## 4. Sync realtime web ↔ mobile

Vérification (et ajout si manquant) que les canaux Supabase Realtime sont activés sur :
- `waouh_conversations`, `waouh_messages` (déjà ok)
- `bots` (filtre `owner_id=eq.{user.id}`) → ajout dans `BotsScreen`
- `waha_sessions_data` → ajout dans `WhatsAppScreen`
- `waouh_partner_sales`, `waouh_partner_payouts` → ajout dans `PartnerScreen`

Résultat : créer un bot sur le web le fait apparaître instantanément sur le mobile, et inversement.

## 5. Garde d'authentification et bootstrap session

- `MobileShell` wrap dans un `<RequireMobileAuth>` qui redirige vers `/app/auth` si pas de session, sinon précharge en parallèle : profil + 50 dernières conversations + bots actifs + sessions WAHA → écran de skeleton 300 ms max puis app prête.
- Token JWT Supabase persisté via `@capacitor/preferences` (déjà installé) pour reconnexion silencieuse au démarrage natif.
- Bouton "Se déconnecter" appelle `supabase.auth.signOut()` + `Preferences.clear()`.

## 6. Détails techniques

- Fichiers créés :
  - `src/app-mobile/hooks/useMobileProfile.ts`
  - `src/app-mobile/hooks/useUnreadCount.ts`
  - `src/app-mobile/components/NewChatSheet.tsx`
  - `src/app-mobile/components/ConversationInfoSheet.tsx`
  - `src/app-mobile/components/AttachmentSheet.tsx`
  - `src/app-mobile/screens/ProfileScreen.tsx`
  - `src/app-mobile/screens/BotDetailScreen.tsx`
  - `src/app-mobile/guards/RequireMobileAuth.tsx`
- Fichiers édités : `MobileShell.tsx`, `BottomTabBar.tsx` (badge), les 5 screens, `App.tsx` (routes `/app/profile`, `/app/bots/:id`).
- Backend : aucune migration nécessaire — toutes les tables (`profiles`, `waouh_conversations`, `waouh_messages`, `bots`, `waha_sessions_data`, `waouh_partner_*`) existent déjà et sont partagées avec le web. RLS déjà en place sur `user_id`/`owner_id`.
- Edge functions : réutilisation de `waha-send-message`, `waha-connect`, `whatsapp-diffusion-send` (déjà déployées). Aucune nouvelle fonction.

## Critère d'acceptation

1. Login OTP WhatsApp → header affiche le nom du profil.
2. Tap `+` sur Chat → saisie numéro → conversation créée, visible aussi sur le web en < 1 s.
3. Envoi d'un message → réception côté web instantanée (et inversement).
4. Création d'un bot sur le web → apparaît sur l'app sans refresh.
5. Aucun bouton inerte sur les 5 écrans principaux.
