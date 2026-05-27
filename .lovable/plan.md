## Contexte

Aujourd'hui, le composant `WhatsAppDiffusionV2` lit les sessions depuis la table `whatsapp_accounts` filtrée par `user_id = auth.uid()`. Chaque utilisateur ne voit donc que **ses propres** sessions WAHA. Le worker (`whatsapp-diffusion-worker`) récupère ensuite `session_name` + `phone_number` dans cette même table pour appeler WAHA (`/api/sendText`, `sendImage`, etc.) via `WAHA_BASE_URL` + `WAHA_API_KEY`.

La session « WaouhApp » créée dans `WaouhWhatsAppPanel` est en réalité une session **globale partagée** côté WAHA (le nom est codé en dur dans le panneau), mais elle n'est **pas enregistrée** comme ligne dans `whatsapp_accounts` → elle n'apparaît donc dans aucun sélecteur de campagne.

## Comment fonctionnera une session WAHA liée à la diffusion

```text
Compte utilisateur          whatsapp_accounts            Serveur WAHA
  (auth.uid)        ──►   { id, session_name,    ──►   Session WhatsApp
                            phone_number,                (QR scanné)
                            status }
                                                       │
Campagne ─► session_id ──► session_name ───► POST /api/sendText
                                                       │
                                              Téléphone WhatsApp
                                              (envoi réel)
```

- Une **session WAHA** = un téléphone WhatsApp scanné une fois via QR.
- Une ligne dans `whatsapp_accounts` = le pont entre l'utilisateur Lovable et cette session WAHA (porte le `session_name`).
- Au lancement d'une campagne, le worker prend `campaign.session_id` → lit `session_name` → l'utilise dans tous les appels `POST {WAHA_BASE_URL}/api/sendText {session, chatId, text}`.
- L'anti-ban (throttle/h, délais 25-75 s, heures actives) s'applique **par session** : on ne dépasse pas le quota d'un même numéro.

## Ce qui change

### 1. Rattacher la session « WaouhApp » au compte admin Bot Bj
Insertion d'une ligne dans `whatsapp_accounts` :
- `user_id` = UUID de `bot.bjdata@gmail.com` (récupéré via `auth.users`)
- `session_name = 'WaouhApp'`, `phone_number` = à renseigner par l'admin, `status = 'connected'`
- Marquée `is_admin_shared = true` (nouvelle colonne booléenne) pour la rendre visible à tous les utilisateurs comme session partagée.

### 2. Sélecteur de sessions enrichi dans la diffusion
Le hook `useWaDiffusion` (ou un nouveau `useDiffusionSessions`) chargera :
- Les sessions personnelles : `whatsapp_accounts where user_id = me`
- + Les sessions partagées admin : `where is_admin_shared = true`

Affichage groupé dans le `Select` de `NewCampaignDialog` :
```text
── Mes sessions ──
  Pro 01 6X XX XX XX  ✅
── Partagées (Bot Bj) ──
  WaouhApp 01 4X XX XX XX  ✅
```

### 3. Création / configuration de session depuis la page Diffusion
Ajout d'un **4ᵉ onglet** « Sessions WAHA » dans `WhatsAppDiffusionV2` avec :
- Liste des sessions accessibles (mêmes que le sélecteur, badges statut)
- Bouton **« + Nouvelle session »** → dialogue qui :
  1. demande un nom (ex. « Diffusion-Promo ») + numéro Bénin (normalisé 10 chiffres)
  2. appelle `waouh-waha-control` action `session-create` puis `session-start`
  3. crée la ligne `whatsapp_accounts` correspondante
  4. affiche le **QR** inline (réutilise la logique de `WaouhWhatsAppPanel`)
- Bouton **« Configurer »** sur chaque ligne → édition `session_name`, `phone_number`, redémarrage/arrêt, regénération QR, suppression.

### 4. Flux UX lors de la création d'une campagne
Dans `NewCampaignDialog`, si l'utilisateur n'a **aucune** session disponible :
- Bloc d'appel à l'action : *« Vous n'avez pas encore de session WhatsApp. »*
- Bouton **« Créer une session »** (ouvre le même dialogue que l'onglet Sessions)
- Bouton **« Utiliser la session partagée WaouhApp »** (si disponible)

S'il en a déjà → le `Select` actuel est conservé, avec groupes Mes / Partagées.

## Détails techniques

- **Migration SQL** :
  - `ALTER TABLE whatsapp_accounts ADD COLUMN is_admin_shared boolean NOT NULL DEFAULT false;`
  - Policy RLS additionnelle : `SELECT` autorisé aussi quand `is_admin_shared = true`.
  - Seul un admin (table `user_roles` role `admin`) peut `UPDATE`/`INSERT` une ligne avec `is_admin_shared = true`.
  - Insertion de la ligne WaouhApp pour l'utilisateur `bot.bjdata@gmail.com` (via `insert tool`, pas migration).

- **Frontend** :
  - Nouveau hook `useDiffusionSessions.ts` retournant `{ mine: [], shared: [] }`.
  - Nouveau composant `WaDiffusionSessionsTab.tsx` (liste + actions).
  - Nouveau composant `WaSessionDialog.tsx` (création/édition avec QR).
  - Mise à jour `WhatsAppDiffusionV2.tsx` : 4 onglets (Contacts, Campagnes, Sessions, Stats) + groupes dans le sélecteur de `NewCampaignDialog`.

- **Edge function** : aucune nouvelle ; on réutilise `waouh-waha-control` (actions `session-create`, `session-start`, `session-stop`, `get-qr`, `session-status`, `set-webhook`).

- **Worker** : aucune modification — il lit déjà `session_name` depuis `whatsapp_accounts`, donc compatible avec sessions perso et partagées.

## Hors scope

- Pas de changement du moteur d'envoi, de l'anti-ban, ni de la logique IA-variants.
- Pas de modification du mode « legacy webhook » (déjà supprimé).
