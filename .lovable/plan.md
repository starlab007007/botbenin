## Objectif

Le scénario **A** (Vendeur WA + Acheteur WA) est verrouillé et fonctionne pour les 3 sources (Chat A1, Partenaire A2, Radar IA A3) — validé par le mode `whatsapp_full` du E2E (3 runs OK, 24/24 envois).

On veut que **B** (Vendeur App + Acheteur WA) et **C** (Vendeur WA + Acheteur App) bénéficient des **mêmes garanties** :
1. annonce publiée → confirmation à la partie auteur,
2. mise en relation → notif à la contrepartie,
3. négociation bilatérale,
4. accord conclu (deal_created + deal_dispatch, **1 seule fois par partie**),
5. mêmes verrous d'idempotence et de dédup déjà en place pour A.

## Diagnostic des problèmes actuels

### Problèmes structurels identifiés

| # | Problème | Impact | Scénarios touchés |
|---|---|---|---|
| 1 | Mode `auto` du E2E (matrice 3×3) **n'exerce pas les vrais points d'entrée** : il insère directement dans `waouh_interests`/`waouh_negotiations`/`waouh_deals` et n'appelle ni `waouh-channel-in` (WA) ni le pipeline app. Conclusion "9/9 OK" trompeuse. | Aucune garantie réelle pour B/C | B1-B3, C1-C3 |
| 2 | Mode `whatsapp_full` n'a qu'**une seule combinaison de canaux** : seller+buyer en WhatsApp. Il varie la source d'annonce (chat/partner/radar) mais ne couvre pas les variantes de canaux B/C. | A2/A3 OK mais B/C non testés bout-en-bout | B*, C* |
| 3 | `resolveContact` (`_shared/waouhContact.ts`) **bascule en `whatsapp`** dès qu'un `contact_whatsapp` est présent sur la ligne, **même si `source_channel === "waouh_app"`** (l. 44-47). Pour B, si le vendeur App a un numéro renseigné, il recevra les notifs en WA et **pas** dans son chat in-app → silence dans l'app. | Le vendeur App perd les notifs in-app | B1-B3 |
| 4 | `pushSyncedEvent` insère un `waouh_messages` **uniquement si `web_session_id` ou `phone_number` existe** (l. 105). Si l'utilisateur App est authentifié via `auth_user_id` sans `web_session_id` actif au moment de l'évènement, le message tombe en `channel: "system"` et n'est pas affiché dans la `WaouhMatchChatWindow`. | Notifs deal absentes du chat in-app | B*, C* |
| 5 | Le router `waouh-negotiation-router` n'accepte que des inputs WhatsApp (texte parsé). Les boutons OUI/NON/contre-offre **côté app** passent par d'autres chemins (RPC directes sur `waouh_negotiations`) — ils **ne déclenchent pas** la branche idempotente `deal_already_accepted` ni le `suppress_direct_reply`. | Risque de doublons `deal_created`/`deal_dispatch` quand l'app accepte | B*, C* |
| 6 | `waouh-deal-dispatch` est appelé depuis le router WA, mais **pas systématiquement** depuis le chemin d'acceptation App. Sans hook DB, l'acheteur/vendeur App qui accepte ne déclenche pas la notif finale aux 2 parties. | "Vente conclue" / "Achat confirmé" manquants | B*, C* |
| 7 | `waouh-notify-dispatch` ignore le canal `waouh_app` pour l'envoi : seul l'enregistrement notif est inséré, jamais de poussée temps-réel vers la `WaouhMatchChatWindow` (pas de `pushSyncedEvent`). | UX silencieuse côté app | B*, C* |
| 8 | `deal_already_accepted` (verrouillé pour A en v2) n'est appliqué qu'au niveau du router WA. Une acceptation App parallèle peut **bypasser le `UNIQUE INDEX waouh_deals_unique_per_negotiation`** uniquement *après* tentative d'insert → mais le `deal_created` est déjà émis avant le 23505. | Doublon possible deal_created côté App | B*, C* |

## Plan de correction

### Étape 1 — Étendre la matrice E2E pour vraiment tester B et C
Modifier `supabase/functions/waouh-e2e-test/index.ts` mode `whatsapp_full` :
- Ajouter un paramètre `scenarios: ("A"|"B"|"C")[]`.
- Pour **B** : créer le vendeur **sans** `phone_number` (App only, `auth_user_id` simulé via `web_session_id`), garder l'acheteur en WA. L'article a `source_channel: "waouh_app"`.
- Pour **C** : créer l'acheteur en App only, le vendeur en WA.
- Au lieu d'envoyer 5 messages WAHA en dur, appeler les **vrais edge functions** : `waouh-buyer-interest`, `waouh-negotiate-handler`, `waouh-deal-dispatch`. Vérifier que :
  - les `waouh_messages` sont créés côté App pour la partie App,
  - la queue WhatsApp ne contient qu'une entrée par évènement pour la partie WA,
  - exactement 1 `deal_created` et 1 `deal_dispatch` par partie.

### Étape 2 — Unifier la délivrance App via `pushSyncedEvent`
- Dans `waouh-notify-dispatch`, remplacer la branche `else { channelUsed = "waouh_app" }` (l. 240) par un appel à `pushSyncedEvent` pour la partie App (insertion `waouh_messages` + miroir si web session).
- Dans `pushSyncedEvent`, durcir l'insertion `waouh_messages` : `channel = web_session_id ? "web" : (phone ? "whatsapp" : "app")` pour les utilisateurs App authentifiés sans session web active.

### Étape 3 — Corriger `resolveContact` pour respecter l'intention App
- Quand `source_channel === "waouh_app"` ET l'utilisateur a un `web_session_id` actif récent, **prioriser le canal app** et seulement *miroir* WA si numéro présent (au lieu de basculer entièrement en WA). Géré via un nouveau retour `channel: "waouh_app"` + `mirrorWhatsapp: phone`.
- `pushSyncedEvent` envoie alors aux deux supports comme pour A.

### Étape 4 — Acceptation App idempotente
- Créer un endpoint commun `waouh-negotiation-accept` (ou ajouter une branche au router) qui :
  - vérifie l'existence d'un deal pour la négociation (court-circuit `deal_already_accepted`),
  - catche `23505` sur insert deal,
  - appelle `waouh-deal-dispatch` **une seule fois**.
- Côté frontend (`WaouhMatchChatWindow`, `WaouhTransactionCard`), router les acceptations App vers cet endpoint au lieu d'updates RPC directes.

### Étape 5 — Verrouillage v5
- Mettre à jour `src/components/waouh/waouhChatSyncLock.ts` (v5) avec nouveaux invariants :
  - `appNotifyDispatchUsesSyncedEvent` (notify-dispatch contient `pushSyncedEvent`),
  - `appAcceptanceIdempotence` (endpoint accept contient `deal_already_accepted` + `23505`),
  - `resolveContactRespectsApp` (waouhContact.ts gère le cas `waouh_app` avec miroir).
- Étendre `whatsapp-end-to-end-flow.md` ou créer `mem://features/app-end-to-end-flow.md` documentant B et C.

### Étape 6 — Exécution E2E finale
Lancer le nouveau mode `whatsapp_full` étendu pour les **9 cellules** (A/B/C × chat/partner/radar) et publier le rapport dans `docs/waouh-e2e-test-2026-06-10.md` avec :
- nombre d'envois attendus vs reçus,
- nombre de `waouh_messages` créés par partie,
- contrôle de non-duplication `deal_created`/`deal_dispatch`.

## Détails techniques

```text
Pipeline cible unifié (B et C alignés sur A) :

  [Action partie X] ─► route handler (WA: channel-in / App: accept-endpoint)
        │                            │
        └────────► negotiation-router (branche idempotente commune)
                          │
                          ▼
                  pushSyncedEvent(seller) ──► waouh_messages + WA queue (si phone)
                  pushSyncedEvent(buyer)  ──► waouh_messages + WA queue (si phone)
                          │
                          ▼
                  waouh-deal-dispatch (1× par deal, lock pg_advisory)
```

Fichiers principaux à modifier :
- `supabase/functions/waouh-e2e-test/index.ts` (étendre matrice)
- `supabase/functions/_shared/waouhContact.ts` (canal App + miroir)
- `supabase/functions/_shared/waouh-sync.ts` (channel app)
- `supabase/functions/waouh-notify-dispatch/index.ts` (utiliser pushSyncedEvent)
- `supabase/functions/waouh-negotiation-router/index.ts` (factoriser accept idempotent)
- nouveau : `supabase/functions/waouh-negotiation-accept/index.ts` (entrée App)
- `src/components/waouh/WaouhMatchChatWindow.tsx` (router accept vers nouvel endpoint)
- `src/components/waouh/waouhChatSyncLock.ts` → v5
- `src/components/waouh/__tests__/waouh-chat-sync-flow.lock.test.ts` (nouveaux invariants)
- mémoire : `mem://features/whatsapp-end-to-end-flow.md` étendu OU nouveau `mem://features/app-end-to-end-flow.md`

## Points à confirmer avant exécution

1. **Acceptation App** : tu préfères un nouvel endpoint `waouh-negotiation-accept` (propre, testable) ou injecter la logique App dans le router existant (moins de surface) ?
2. **Téléphone du vendeur App** : si un vendeur App a aussi renseigné un WhatsApp, tu veux les notifs sur les **deux canaux** (app + WA en miroir) ou **uniquement dans l'app** ?
3. Lancer le E2E final sur **vrais numéros WA** (ceux de A) ou rester sur des numéros factices pour B/C (juste vérifier la queue) ?
