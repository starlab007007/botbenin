
# Refonte du flux "Accord conclu" — livraison médiée

## Objectif
À l'acceptation d'une négociation, on **ne partage plus** les numéros entre acheteur et vendeur. Un **livreur WAOUH** est attribué et devient l'unique point de contact opérationnel. L'équipe WAOUH reçoit les deux contacts pour orchestrer la livraison.

## Nouveau parcours utilisateur

```
Acheteur dit "oui"
        │
        ▼
┌──────────────────────────┐
│  Négociation acceptée    │
│  (state = accepted)      │
└──────────────────────────┘
        │
        ├──► Création d'un "deal" (livraison)
        │
        ├──► Notif Vendeur :
        │    "✅ Vente conclue. Un livreur WAOUH vous
        │     contactera dans quelques minutes pour
        │     récupérer le colis. Ne partagez pas vos
        │     coordonnées avec l'acheteur."
        │
        ├──► Notif Acheteur :
        │    "🎉 Achat confirmé ! Vous recevrez sous peu
        │     une notification avec le délai estimé.
        │     Paiement à la livraison."
        │
        ├──► Notif Équipe WAOUH (canal interne) :
        │    Récap complet : article, prix, vendeur (nom+tél+adresse),
        │     acheteur (nom+tél+adresse), distance, deal_id.
        │
        └──► Notif Livreur assigné (si auto-attribution) :
             Mission, points de collecte/dépôt, contacts des 2 parties.
```

## Messages (wording proposé)

**Vendeur** (`replyToSeller`)
> 🎉 *Vente conclue !*
> 📦 {title} — 💰 {prix}
>
> 🛵 Un livreur WAOUH vous contactera dans quelques minutes au numéro associé à ce compte pour convenir de la collecte du colis.
>
> 🔒 *Confidentialité* : pour votre sécurité, le contact de l'acheteur n'est pas partagé. WAOUH coordonne la livraison.
>
> ⏱️ Préparez le colis dès maintenant.

**Acheteur** (`replyToBuyer`)
> 🎉 *Achat confirmé !*
> 📦 {title} — 💰 {prix}
>
> 🛵 Un livreur WAOUH a été assigné. Vous recevrez sous peu une notification avec le **délai estimé de livraison**.
> 💵 *Paiement à la livraison* (cash ou Mobile Money au livreur).
>
> 🔒 Le contact du vendeur n'est pas partagé : WAOUH s'occupe de tout.

**Équipe WAOUH** (canal WhatsApp interne / dashboard)
> 🆕 *Nouveau deal #{deal_id}*
> 📦 {title} — 💰 {prix} — 📍 {distance} km
> 👤 Vendeur : {nom} · {tel} · {ville/coord}
> 🛒 Acheteur : {nom} · {tel} · {ville/coord}
> ▶️ Assigner un livreur : {lien dashboard}

**Livreur** (à l'assignation, optionnel phase 1)
> 🛵 *Nouvelle mission #{deal_id}*
> Collecte : {vendeur, tel, adresse}
> Dépôt : {acheteur, tel, adresse}
> À encaisser : {prix} FCFA

## Changements techniques

### 1. Base de données (migration)
Nouvelle table `public.waouh_deals` :
- `negotiation_id`, `article_id`, `buyer_user_id`, `seller_user_id`, `courier_user_id` (nullable)
- `amount`, `status` (`pending_assignment` | `assigned` | `picked_up` | `delivered` | `cancelled`)
- `eta_minutes`, `pickup_address`, `dropoff_address`, `assigned_at`, `delivered_at`
- RLS : acheteur/vendeur voient leur deal ; livreur voit ses missions ; équipe (rôle `waouh_ops`) voit tout.
- GRANTs standards + `service_role`.

Nouveau secret : `WAOUH_OPS_WHATSAPP` (numéro/JID du canal équipe) et `WAOUH_OPS_USER_IDS` (optionnel pour notifs in-app).

### 2. Edge function `waouh-negotiation-router` (branche `intent.kind === "yes"`)
Remplacer le bloc actuel :
- **Supprimer** : `contactExchangeText(...)` envoyé à l'autre partie, et tout numéro dans les replies acheteur/vendeur.
- **Ajouter** :
  - Insert dans `waouh_deals` (status `pending_assignment`).
  - Appel à `waouh-deal-dispatch` (nouvelle fonction) avec `{ deal_id }`.
- Conserver les photos de l'article dans les deux notifs.
- Conserver la mise à jour `waouh_negotiations.state = accepted` mais retirer `contact_shared_at` (renommer en `deal_created_at` côté code uniquement, colonne DB inchangée pour éviter migration cassante).

### 3. Nouvelle edge function `waouh-deal-dispatch`
Entrée : `{ deal_id }`. Responsabilités :
1. Charger deal + acheteur + vendeur + article.
2. Envoyer notif vendeur (WhatsApp + in-app via `waouh-notify-dispatch` avec nouveau `kind = "deal_seller"`).
3. Envoyer notif acheteur (`kind = "deal_buyer"`).
4. Envoyer récap équipe :
   - WhatsApp à `WAOUH_OPS_WHATSAPP` (WAHA).
   - In-app : insertion `waouh_notifications` pour chaque `WAOUH_OPS_USER_IDS` avec `notification_type = "deal_ops"` et payload contenant les contacts.
5. (Phase 2) Si auto-attribution livreur activée : pick livreur dispo le plus proche → update `courier_user_id` + notif livreur.

### 4. Extensions `waouh-notify-dispatch`
Ajouter 3 nouveaux `kind` dans `buildText` :
- `deal_seller` → wording vendeur ci-dessus.
- `deal_buyer` → wording acheteur ci-dessus.
- `deal_ops` → récap équipe.

Aucun changement de signature : on passe `extra_text` ou on étend le switch.

### 5. Frontend (léger)
- `useWaouhMatchNotifications.ts` : ajouter les libellés/badges pour les 3 nouveaux types (`deal_seller`, `deal_buyer`, `deal_ops`).
- `WaouhNotificationsBell.tsx` : badge violet "Livraison" pour `deal_*`.
- Aucun changement de routing / chat — le chat reste ouvert sur la négo, mais sans numéros affichés.

### 6. Suppression des fuites de contact existantes
- `contactExchangeText` : conservée pour usage interne (équipe), **plus jamais** envoyée à buyer/seller.
- `useWaouhMatchNotifications.ts` ligne 9 : libellé `contact_exchange` → `"🎉 Accord conclu — livraison en cours d'organisation"`.

## Hors-scope phase 1 (à valider plus tard)
- UI dashboard équipe WAOUH pour assigner manuellement un livreur.
- Module livreur (app mobile dédiée, suivi GPS).
- Calcul automatique `eta_minutes` (utilisera la distance déjà calculée via `waouh_user_pair_distance_km` + vitesse moyenne).
- Encaissement par le livreur (intégration Mobile Money escrow).

## Critères de succès
- Après "oui" de l'acheteur : aucun numéro de téléphone n'apparaît dans les messages vendeur/acheteur (WhatsApp + in-app).
- Une ligne `waouh_deals` est créée avec `status = pending_assignment`.
- L'équipe WAOUH reçoit le récap complet avec les deux numéros.
- Les badges/notifications "Livraison" apparaissent côté acheteur et vendeur dans la cloche.
