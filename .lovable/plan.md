## Objectif

Permettre à l'utilisateur, sur `/app/whatsapp`, de créer une session WAHA en choisissant entre **deux méthodes d'appairage** :
1. **QR Code** (existant)
2. **Code d'appairage à 8 chiffres** (nouveau) — saisi sur le téléphone (WhatsApp → Appareils liés → Lier avec numéro de téléphone)

Le tout connecté au même backend WAHA (`https://waha.bot.bj`) avec les mêmes credentials.

---

## UI proposée

Sur la page WhatsApp IA mobile (`WhatsAppScreen.tsx`) et desktop (`SimpleSessionManager.tsx`) :

- Bouton **« Connecter WhatsApp »** ouvre un **Sheet/Dialog** avec un sélecteur à deux onglets :

```text
┌─────────────────────────────────────┐
│ Connecter WhatsApp                  │
├─────────────────────────────────────┤
│  [ QR Code ]  [ Code à 8 chiffres ] │
├─────────────────────────────────────┤
│  Onglet 1 (QR) :                    │
│    [Image QR 256x256]               │
│    "Scannez depuis WhatsApp →       │
│     Appareils liés"                 │
│    Expire dans 04:32                │
│                                     │
│  Onglet 2 (Code) :                  │
│    Input: +229 90 00 00 00          │
│    [ Obtenir le code ]              │
│    → Affiche : ABCD-1234            │
│    "Sur votre téléphone :           │
│     Appareils liés → Lier avec      │
│     numéro de téléphone"            │
│    Expire dans 04:32                │
├─────────────────────────────────────┤
│  Statut : ⏳ En attente / ✅ Connecté│
└─────────────────────────────────────┘
```

- Polling du statut toutes les 3s via `waha-connect/status/{sessionName}` jusqu'à `connected` ou expiration.
- Toast succès + fermeture auto + refresh de la liste des sessions.

---

## Détails techniques

### 1. Backend — edge function `waha-connect`

Ajouter une 3ᵉ action `pair-code` :

- Route : `POST /waha-connect/pair-code`
- Body : `{ sessionName, phoneNumber }` (E.164 sans `+`, ex: `22990000000`)
- Logique :
  1. Démarrer la session si elle n'existe pas (réutiliser `startWAHASession`).
  2. Appeler WAHA : `POST {wahaUrl}/api/{sessionName}/auth/request-code` avec `{ phoneNumber }` et headers `X-Api-Key` ou `Basic`.
  3. Retourner `{ session, code, expires_in: 300 }` (WAHA renvoie le code 8 chiffres au format `XXXX-XXXX` ou `XXXXXXXX` selon version — normaliser en `XXXX-XXXX` côté serveur).
- Réutilise les mêmes secrets `WAHA_API_KEY` / `WAHA_USERNAME` / `WAHA_PASSWORD` — aucun nouveau secret.

`handleStart` et `handleStatus` restent inchangés.

### 2. Frontend

**Nouveau composant** `src/components/whatsapp/PairCodeFlow.tsx` :
- Input téléphone (normalisation +229 …) + bouton « Obtenir le code »
- Appelle `supabase.functions.invoke('waha-connect', { body: { action: 'pair-code', sessionName, phoneNumber } })`
- Affiche le code en gros (mono, espacé), compteur d'expiration, lance le polling status

**Refactor léger** `src/components/whatsapp/QRConnectionFlow.tsx` (existant) : extraire la logique de polling status dans un hook partagé `useWahaPairingStatus(sessionName)` pour réutilisation.

**Nouveau composant** `src/components/whatsapp/ConnectMethodTabs.tsx` :
- Tabs Shadcn : « QR Code » | « Code à 8 chiffres »
- Onglet 1 → réutilise `QRConnectionFlow`
- Onglet 2 → `PairCodeFlow`
- Génère un `sessionName` unique (`user_{uid8}_{timestamp}`) partagé entre les deux onglets pour éviter les doublons.

**Intégration mobile** `dist-mobile` / `src/app-mobile/screens/WhatsAppScreen.tsx` :
- Remplacer le bouton actuel « Générer un QR Code » par « Connecter WhatsApp » qui ouvre un Sheet contenant `<ConnectMethodTabs />`.

**Intégration desktop** `SimpleSessionManager.tsx` :
- Lors de « Nouvelle session », ouvrir le même Dialog avec `<ConnectMethodTabs />` au lieu du flux QR-only.

### 3. Wiring `waha-connect` côté client

Le routing actuel est par URL path (`/start`, `/status`). Pour rester compatible avec `supabase.functions.invoke` (qui ne passe pas de path), basculer sur un dispatcher unique :
- Lire `action` dans le body (`start` | `status` | `pair-code`) avec fallback sur la lecture par path pour ne rien casser des appels existants.

### 4. Persistance

Aucun changement de schéma. À la création, insérer dans `whatsapp_accounts` `{ user_id, session_name, status: 'pending', auth_method: 'qr' | 'pair_code' }` — la colonne `status` existe déjà ; `auth_method` est métadonnée optionnelle (skip si la colonne n'existe pas, on log juste).

---

## Tests de validation

1. **QR** : créer session → QR s'affiche → scanner → status passe à `connected` en < 30 s → session apparaît dans la liste avec numéro de téléphone.
2. **Pair Code** : saisir +22990000000 → bouton → code `ABCD-1234` affiché → saisir sur téléphone → status `connected` → session listée.
3. **Erreurs** : numéro invalide, WAHA indisponible, expiration du code (→ bouton « Régénérer »).
4. **Edge function logs** : vérifier les appels `request-code` vers WAHA dans les logs.

---

## Fichiers à modifier / créer

- `supabase/functions/waha-connect/index.ts` (ajout `pair-code` + dispatcher body)
- `src/components/whatsapp/PairCodeFlow.tsx` *(nouveau)*
- `src/components/whatsapp/ConnectMethodTabs.tsx` *(nouveau)*
- `src/components/whatsapp/QRConnectionFlow.tsx` (extraction hook)
- `src/hooks/useWahaPairingStatus.ts` *(nouveau)*
- `src/components/whatsapp/SimpleSessionManager.tsx` (utiliser nouveau dialog)
- `src/app-mobile/screens/WhatsAppScreen.tsx` (bouton → Sheet ConnectMethodTabs)