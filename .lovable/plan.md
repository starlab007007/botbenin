## Diagnostic

Le problème ne vient pas d’un seul bug isolé. Le parcours WhatsApp est actuellement trop mélangé avec le web chat et dépend de plusieurs fonctions qui peuvent envoyer ou créer des notifications en parallèle.

Aujourd’hui le flux ressemble à ceci :

```text
WAHA
  -> waouh-channel-in
    -> waouh-webhook ou waouh-negotiation-router
      -> waouh_outbound_queue
        -> waouh-outbound-dispatch
          -> WAHA
```

### Causes principales des bugs observés

1. Les notifications sont parfois envoyées directement, parfois via la file `waouh_outbound_queue`.
2. Le même événement peut passer par plusieurs chemins : réponse immédiate WhatsApp, notification vendeur, notification acheteur, dispatch fire-and-forget.
3. La fonction `waouh_enqueue_outbound_v2` actuelle ne protège pas assez contre les doublons.
4. Les logs montrent des notifications échouées avec :
   - `no phone`
   - `WAHA 404 Cannot POST /api/WaouhApp/sendText`
   - `WAHA 422 Session status is not as expected`
5. Les messages WAHA de type `@lid` et `status@broadcast` doivent être mieux filtrés, car ils polluent parfois le parcours.
6. Les erreurs WAHA/Qosic/API externes peuvent faire échouer une étape sans mécanisme de reprise propre.
7. Les notifications post-paiement peuvent être envoyées plusieurs fois si `status` ou `confirm_received` est relancé.

## Recommandation

Je recommande de ne pas simplement patcher le parcours actuel.

La meilleure solution est de garder le même moteur métier commun, mais de créer un parcours WhatsApp séparé en orchestration.

Autrement dit :

```text
Moteur métier commun
  - articles
  - négociation
  - paiement
  - contact/geoloc

Orchestrateur Web Chat
  - rendu web
  - cartes interactives web
  - realtime

Orchestrateur WhatsApp WAHA
  - déduplication WAHA
  - session WAHA
  - boutons WAHA
  - file outbound fiable
  - retry/fallback
```

On ne duplique pas toute la logique métier. On sépare seulement la couche canal WhatsApp, parce que WhatsApp a des contraintes différentes : boutons limités à 3, session WAHA instable, media séparés, `@lid`, événements dupliqués, retry nécessaire.

## Plan proposé

### 1. Créer une couche WhatsApp stable

Ajouter un orchestrateur dédié au parcours WAHA :

```text
waouh-whatsapp-orchestrator
```

Son rôle :

- recevoir les messages normalisés venant de `waouh-channel-in`
- décider du scénario : vendeur, acheteur, négociation, paiement, réception
- appeler le moteur commun existant seulement pour la logique métier
- retourner une seule réponse structurée : texte, photos, boutons, transaction, événement

### 2. Transformer `waouh-channel-in` en simple normalisateur

`waouh-channel-in` ne doit plus contenir trop de logique de parcours.

Il devra seulement :

- filtrer `status@broadcast`, groupes, self messages
- normaliser le téléphone
- gérer les médias entrants
- dédupliquer l’événement WAHA
- envoyer vers l’orchestrateur WhatsApp
- envoyer une seule réponse finale à WAHA

### 3. Renforcer la file outbound

Modifier la structure de `waouh_outbound_queue` pour ajouter une vraie idempotence métier.

Champs/contraintes à ajouter :

- `dedupe_key`
- `event_type`
- `locked_at`
- `next_attempt_at`
- `provider_message_id`

Objectif : empêcher les doublons de type :

```text
même destinataire + même transaction + même événement = un seul message envoyé
```

Exemples d’événements :

- `seller_new_interest`
- `buyer_interest_confirmed`
- `negotiation_counter_offer`
- `negotiation_accepted`
- `payment_confirmed_buyer`
- `payment_confirmed_seller`
- `contact_exchange_buyer`
- `contact_exchange_seller`

### 4. Corriger le dispatch WAHA

`waouh-outbound-dispatch` doit devenir plus robuste :

- ne jamais perdre silencieusement une notification
- gérer `WAHA 422 session not ready` comme retry, pas comme échec définitif immédiat
- gérer `WAHA 404 endpoint` avec fallback contrôlé
- ne pas envoyer de fallback texte numéroté si l’utilisateur doit voir des boutons interactifs, sauf si WAHA ne supporte vraiment pas les boutons
- marquer précisément : `pending`, `sending`, `sent`, `retry`, `failed`
- journaliser l’erreur sans casser tout le batch

### 5. Séparer les templates WhatsApp des textes Web

Créer une source de vérité pour WhatsApp :

```text
waouh-whatsapp-templates
```

Elle devra formater :

- annonce publiée vendeur
- top 5 acheteur
- nouvel acheteur intéressé
- contre-offre
- accord accepté
- paiement prêt
- paiement confirmé
- échange contact/géoloc

Chaque template retournera :

```text
text
attachments
buttons
idempotency key
```

### 6. Stabiliser vendeur de bout en bout

Parcours vendeur cible :

```text
1. Le vendeur envoie texte + 0/1/2 photos
2. WAOUH publie l’annonce
3. WAOUH répond avec annonce publiée + prix marché + note IA + boutons vendeur
4. Si acheteur intéressé, vendeur reçoit une seule notification avec photo + prix + boutons Accepter / Contre-offre / Refuser
5. Si paiement confirmé, vendeur reçoit contact + géoloc acheteur
6. Si réception confirmée, vendeur reçoit confirmation finale
```

Garanties :

- maximum 2 photos sur publication WhatsApp
- pas de notification double
- pas de notification sans téléphone valide
- message vendeur et message acheteur séparés

### 7. Stabiliser acheteur de bout en bout

Parcours acheteur cible :

```text
1. L’acheteur cherche un produit
2. WAOUH répond avec Top 5 aligné + photos + prix marché + boutons pour 3 premiers choix
3. L’acheteur choisit un article
4. Le vendeur est notifié une seule fois
5. L’acheteur reçoit confirmation de demande envoyée
6. En cas d’accord, l’acheteur reçoit carte paiement + boutons MTN/Moov
7. Après paiement, l’acheteur reçoit contact + géoloc vendeur
8. Après livraison, l’acheteur confirme réception
```

### 8. Rendre le paiement idempotent

Corriger `waouh-payment` pour éviter les doubles notifications post-paiement :

- si transaction déjà `paid`, ne pas renvoyer les contacts une deuxième fois
- stocker ou vérifier un événement `contact_exchange_sent`
- envoyer les contacts seulement une fois par transaction
- ne jamais retourner une erreur brute 500 pour les erreurs externes fallbackables

### 9. Ajouter un diagnostic opérationnel

Ajouter des logs structurés utiles :

```text
waouh_flow_id
waouh_event_id
user_role: buyer/seller
transaction_id
notification_event
queue_id
waha_status
```

Cela permettra de savoir exactement :

- qui devait recevoir quoi
- si le message a été mis en file
- si WAHA l’a accepté
- pourquoi il a échoué

### 10. Tests bout en bout à couvrir

Créer ou exécuter des tests edge functions sur ces scénarios :

- vendeur publie avec 2 photos
- acheteur cherche et reçoit Top 5
- acheteur choisit `intéressé 1`
- vendeur reçoit une seule notification
- vendeur accepte
- acheteur reçoit paiement
- paiement demo confirmé
- contacts/géoloc échangés une seule fois
- confirmation réception
- session WAHA indisponible : message reste en retry

## Conclusion

Ma recommandation : séparer le parcours WhatsApp au niveau orchestration, pas au niveau métier.

C’est le meilleur compromis :

- moins de bugs WhatsApp
- pas de duplication inutile du moteur WAOUH
- web chat reste propre
- WhatsApp devient fiable avec idempotence, retry et logs
- les boutons WAHA sont gérés selon les contraintes réelles de WAHA

Si tu valides, j’implémente cette stabilisation en priorité dans cet ordre : base de données idempotence, orchestrateur WhatsApp, dispatch robuste, paiement idempotent, puis tests bout en bout.