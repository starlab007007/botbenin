## Diagnostic résumé

Les bugs viennent principalement de 5 points :

1. **Messages directs non créés pour l’autre partie**
   - Aujourd’hui, une offre ou un intérêt crée surtout une entrée `waouh_outbound_queue`.
   - Cela déclenche éventuellement une notification, mais **n’insère pas toujours un vrai message dans le chatbot du vendeur/acheteur**.

2. **Notification web fragile**
   - Le bouton notification lit uniquement `waouh_outbound_queue` par `web_session_id`.
   - Si le destinataire n’a pas de `web_session_id`, ou si la notification vient de Radar IA avec seulement `to_user_id`, rien n’apparaît dans le chat web.
   - Au clic, la notification ne “ramène” pas encore vers le message/contexte exact dans le chatbot.

3. **Confusion numéro Mobile Money vs montant**
   - Le parseur prend le premier grand nombre du texte.
   - Dans `Je paye en Mobile Money MTN, mon numéro 0191299191`, le numéro est interprété comme une offre/montant, ce qui explique `19 129 919 FCFA`.

4. **Paiement qui boucle ou ne donne pas la main**
   - Le paiement exige un utilisateur authentifié alors que les transactions WAOUH sont souvent liées à un `waouh_user_id` web/session.
   - Certaines vérifications comparent encore `auth.uid()` avec l’id interne WAOUH.
   - Le polling n’affiche pas assez clairement les erreurs Qosic/session/autorisation et peut rester en attente.

5. **Négociation incomplète vendeur ↔ acheteur**
   - `waouh-negotiation-router` notifie surtout par outbound WhatsApp ancien format, sans `web_session_id`, sans message direct, et sans mise à jour cohérente transactionnelle.
   - Les réponses vendeur `OUI / NON / prix` ne sont pas propagées proprement à l’acheteur dans son chatbot + notification.

## Plan d’implémentation

### 1. Créer un vrai bus de messages WAOUH

Ajouter une logique serveur commune dans les Edge Functions pour chaque événement important :

- intérêt envoyé
- offre / contre-offre
- acceptation vendeur
- rejet vendeur
- demande de paiement
- paiement initié
- paiement confirmé
- paiement refusé
- fonds libérés
- match Radar IA

Pour chaque événement, le système devra faire **les deux actions** :

- insérer un message direct dans `waouh_messages` pour le destinataire s’il a un `web_session_id` ;
- créer une notification dans `waouh_outbound_queue` avec `web_session_id`, `to_user_id`, `to_phone`, `image_url`, `payload` complet.

Résultat attendu : vendeur et acheteur voient les mêmes événements dans le chatbot et dans la cloche de notification.

### 2. Corriger le routage acheteur/vendeur dans `waouh-webhook`

Modifier les flows :

- `intéressé N°X`
  - crée ou réutilise une négociation active ;
  - crée ou réutilise une transaction `payment_pending` ;
  - envoie au vendeur : message chatbot + notification + WhatsApp si disponible ;
  - répond à l’acheteur avec recap + carte de paiement.

- `Je propose X FCFA`
  - si l’utilisateur est acheteur : notifie le vendeur ;
  - si l’utilisateur est vendeur : notifie l’acheteur ;
  - met à jour `last_actor`, `last_offer_price`, transaction `amount`, `negotiated_price` ;
  - évite de créer une nouvelle transaction inutile.

- `OUI / j’accepte`
  - marque la négociation `accepted` ;
  - envoie à l’autre partie un message direct + notification ;
  - affiche la carte de paiement côté acheteur.

- `NON / je refuse`
  - ferme la négociation ;
  - informe l’autre partie directement dans le chat + notification.

### 3. Corriger la détection numéro Mobile Money vs prix

Ajouter des règles déterministes avant l’IA :

- si le texte contient `mon numéro`, `numero`, `numéro`, `momo`, `mobile money`, `MTN`, `Moov`, `SBIN`, alors extraire le numéro comme `payment_phone`, pas comme `amount` ;
- reconnaître les formats `229XXXXXXXX`, `01XXXXXXXX`, `XXXXXXXX` ;
- ne considérer un nombre comme prix que s’il est proche de `FCFA`, `CFA`, `je propose`, `offre`, `prix` ;
- si l’utilisateur écrit `Je paye ... numéro ...`, répondre avec la carte de paiement et préremplir le numéro dans la boîte de paiement si possible.

### 4. Réparer le paiement Mobile Money

Modifier `WaouhPaymentDialog` et `waouh-payment` :

- permettre l’initialisation avec `transaction_id` + `web_session_id` si l’acheteur n’est pas encore authentifié, ou afficher une demande de connexion claire avant paiement ;
- corriger les contrôles d’autorisation pour comparer avec `waouh_users.auth_user_id` / `waouh_users.web_session_id`, pas seulement `auth.uid()` ;
- ajouter un bouton “Réessayer” et “Fermer” pendant/à la fin du polling ;
- afficher l’erreur réelle si Qosic refuse ou si la session n’est pas prête ;
- au succès, envoyer automatiquement :
  - message direct à l’acheteur ;
  - notification à l’acheteur ;
  - message direct au vendeur ;
  - notification au vendeur.

### 5. Rendre la cloche de notification actionnable

Modifier `WaouhNotificationsBell` et `useWaouhMatchNotifications` :

- écouter à la fois `web_session_id` et, quand possible, `to_user_id` ;
- stocker dans chaque notification `message_id`, `transaction_id`, `article_id`, `negotiation_id` ;
- au clic sur une notification :
  - fermer le popover ;
  - ouvrir/ramener le chatbot ;
  - charger le message associé ;
  - scroller vers la carte transaction ou le message concerné ;
  - marquer comme lu.

### 6. Connecter Radar IA au chat WAOUH

Adapter les triggers/RPC Radar existants :

- quand un signal Radar est promu en annonce ou besoin acheteur, conserver `contact_phone`, `waouh_user_id`, `promoted_article_id`, `promoted_buyer_profile_id` ;
- quand un match Radar est créé :
  - créer une notification ;
  - créer un message direct si l’utilisateur est connu en web/session ;
  - envoyer WhatsApp si un téléphone existe ;
  - inclure photo/URL/source si disponible ;
- pour les contacts extraits automatiquement, s’assurer qu’un `waouh_user` est créé/lié afin que les négociations puissent ensuite fonctionner.

### 7. Sécuriser les politiques minimales nécessaires

Prévoir une migration Supabase pour :

- ajouter les champs manquants dans `waouh_outbound_queue` si nécessaire : `message_id`, `transaction_id`, `negotiation_id`, `article_id`, `read_at` ;
- ajouter des index pour les notifications web ;
- corriger les politiques RLS trop larges : actuellement certaines politiques lisent toutes les lignes avec `web_session_id IS NOT NULL`, ce qui est pratique mais trop permissif ;
- conserver l’accès public uniquement à une session précise via les Edge Functions ou un filtre côté données plus sûr.

### 8. Tests de bout en bout à valider

Scénarios à tester après correction :

```text
Scénario A — annonce + intérêt
Vendeur publie annonce avec photo
Acheteur cherche le produit
Acheteur clique/écrit intéressé N°1
Vendeur reçoit message direct + notification + photo
Acheteur reçoit confirmation + carte paiement
```

```text
Scénario B — négociation
Acheteur propose 10 000 FCFA
Vendeur reçoit message direct + notification
Vendeur répond OUI
Acheteur reçoit message direct + notification + carte paiement active
```

```text
Scénario C — numéro Mobile Money
Acheteur écrit : Je paye en Mobile Money MTN, mon numéro 0191299191
Le système comprend numéro = 0191299191, montant = montant transaction existant
Aucune transaction à 19 129 919 FCFA n’est créée
```

```text
Scénario D — paiement
Acheteur clique Payer maintenant
Sélection MTN/Moov
Validation téléphone
Statut transaction passe à paid
Acheteur et vendeur reçoivent message direct + notification
```

```text
Scénario E — Radar IA
Radar extrait une annonce/contact
Signal promu
Match automatique
Utilisateur cible reçoit notification + message chatbot
Le contact peut répondre et entrer dans la négociation
```

## Fichiers concernés

- `supabase/functions/waouh-webhook/index.ts`
- `supabase/functions/waouh-channel-in/index.ts`
- `supabase/functions/waouh-negotiation-router/index.ts`
- `supabase/functions/waouh-payment/index.ts`
- `supabase/functions/waouh-outbound-dispatch/index.ts`
- `src/components/waouh/WaouhWebChat.tsx`
- `src/components/waouh/WaouhNotificationsBell.tsx`
- `src/hooks/useWaouhMatchNotifications.ts`
- `src/components/waouh/WaouhPaymentDialog.tsx`
- Migration Supabase pour les champs notification/contexte nécessaires

## Résultat attendu

Après correction, WAOUH aura un flux complet : chercher, matcher, notifier, contacter, négocier, accepter/refuser, payer et suivre la transaction, avec synchronisation entre chatbot web, notifications, WhatsApp et Radar IA.