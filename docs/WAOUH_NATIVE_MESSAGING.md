# WAOUH Native Messaging

WAOUH Native Messaging ajoute un canal SMS/RCS au numéro WAOUH sans modifier le chat Flutter, ses routes ou son état. Le canal accepte du texte, des images et des réponses RCS, appelle le moteur WAOUH existant avec `channel: native_messaging`, puis rend la réponse en carte/carrousel RCS ou en liste numérotée SMS.

Le paiement est volontairement indisponible sur ce canal. Une demande de paiement reçoit une réponse contrôlée et aucune fonction de paiement n'est appelée. WhatsApp Business ne fait pas partie de ce module.

## Flux

1. Infobip envoie le message à `waouh-tel-ingress`.
2. La fonction vérifie la signature HMAC sur le corps brut et refuse entièrement les lots de plus de 25 événements.
3. Avant tout acquittement `202`, chaque événement canonique `waouh.tel.event.v1` est chiffré en AES-GCM et inséré dans une inbox durable dédupliquée. Seuls l'identifiant fournisseur, les empreintes HMAC et le contenu chiffré sont conservés à ce stade.
4. `waouh-tel-dispatch` revendique atomiquement les événements de l'inbox avec `FOR UPDATE SKIP LOCKED`. Il reprend aussi les erreurs planifiées et les verrous périmés, puis efface le payload chiffré après traitement.
5. Le numéro est normalisé, indexé par HMAC avec une clé distincte et chiffré en AES-GCM. Le numéro et le texte clairs ne sont jamais stockés dans les tables.
6. Les commandes, invitations et groupes virtuels sont traités avant le moteur. Pour un message RCS, WAOUH envoie en arrière-plan les événements Infobip `SEEN` et `TYPING_INDICATOR`.
7. Le moteur WAOUH renvoie un contrat `waouh.message.v1`. Les réponses sont persistées dans l'outbox.
8. Le même dispatcher revendique l'outbox avec `FOR UPDATE SKIP LOCKED`, vérifie le consentement du canal choisi, la capacité RCS et les quotas, puis utilise Infobip. Une erreur RCS retombe vers un SMS enrichi seulement si le consentement SMS est actif.
9. `waouh-tel-receipts` déduplique les reçus et n'autorise pas de régression `read -> delivered -> sent`.

## Fonctions Edge

| Fonction | Authentification | Rôle |
| --- | --- | --- |
| `waouh-native-messaging-settings` | JWT + rôle `admin` ou `super_admin` | Lire/enregistrer uniquement les paramètres publics |
| `waouh-tel-ingress` | Signature fournisseur obligatoire | Messages SMS/RCS entrants |
| `waouh-tel-receipts` | Signature fournisseur obligatoire | Livraison, lecture et échec |
| `waouh-tel-dispatch` | Bearer interne dédié exact | Worker inbox, outbox et reprises |
| `waouh-tel-open-messages` | Public, lecture seule | Numéro, nom et URI `sms:` Android/iOS; accepte `invite` et `room` |
| `waouh-tel-invite` | Bearer interne dédié exact | Créer/révoquer des invitations |
| `waouh-tel-command` | Bearer interne dédié exact | Exécuter une commande serveur |
| `waouh-tel-room` | Bearer interne dédié exact | Créer/rejoindre/quitter/publier dans un groupe virtuel |

`verify_jwt=false` sur les endpoints télécom permet aux fournisseurs de les appeler. Chaque endpoint concerné applique sa propre vérification stricte. Les paramètres d'administration restent en `verify_jwt=true`.

## Configuration

Appliquer d'abord la migration `20260924064816_waouh_native_messaging.sql`, puis déployer les huit fonctions Native Messaging et la version mise à jour du moteur `waouh-webhook`. Le moteur exige désormais le secret interne dédié pour les appels dont `source` ou `channel` vaut `native_messaging`, ou dont la session commence par `tel:`; les parcours Flutter/Web existants restent inchangés. Renseigner dans Supabase Edge Function Secrets :

```text
WAOUH_TEL_PHONE_ENCRYPTION_KEY=<secret aléatoire de 32 octets ou plus>
WAOUH_TEL_PHONE_HASH_KEY=<secret aléatoire distinct de 32 octets ou plus>
WAOUH_TEL_WEBHOOK_SECRET=<secret HMAC Infobip de 24 caractères ou plus>
WAOUH_TEL_INTERNAL_SECRET=<secret aléatoire dédié de 24 caractères ou plus>
WAOUH_TEL_INFOBIP_BASE_URL=https://<tenant>.api.infobip.com
WAOUH_TEL_INFOBIP_API_KEY=<clé API Infobip>
```

Variables facultatives :

```text
WAOUH_TEL_ENGINE_URL=<URL interne alternative du moteur>
WAOUH_TEL_CORS_ORIGINS=https://bot.bj,http://127.0.0.1:5173
WAOUH_TEL_INFOBIP_SMS_PATH=/sms/3/messages
WAOUH_TEL_INFOBIP_RCS_PATH=/rcs/2/messages
WAOUH_TEL_INFOBIP_RCS_EVENTS_PATH=/rcs/1/events
WAOUH_TEL_INFOBIP_CAPABILITY_PATH=/rcs/2/capability-check/query
```

Les identifiants Infobip restent dans les secrets Edge. La table `waouh_tel_settings` ne contient aucun token, mot de passe ou objet de métadonnées libre. Le provider `test` est un dry-run : il ne fait aucun appel externe.

Dans l'administration WAOUH, saisir le numéro en E.164, le nom public RCS, activer SMS/RCS puis le service. Le service ne peut pas être activé avec `provider=not_configured` ou sans transport actif.

Configurer les abonnements Infobip :

- messages SMS et RCS entrants vers `/functions/v1/waouh-tel-ingress` ;
- rapports de livraison et lecture vers `/functions/v1/waouh-tel-receipts` ;
- signature `HMAC_SHA_256` dans `X-Hub-Signature` sur le corps brut ;
- une clé API avec les droits d'envoi SMS/RCS et le sender RCS lancé.

## Worker de reprise

La file se redéclenche automatiquement lorsqu'un batch est plein. Pour garantir le drainage de l'inbox et les reprises différées après une erreur fournisseur, installer aussi le cron d'une minute. Stocker l'URL du dispatcher et le même secret interne dédié dans Vault, puis appeler l'installation :

```sql
select vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1/waouh-tel-dispatch',
  'waouh_tel_dispatch_url'
);
select vault.create_secret('<WAOUH_TEL_INTERNAL_SECRET>', 'waouh_tel_internal_secret');
select public.waouh_tel_install_dispatch_cron();
select public.waouh_tel_retry_worker_ready();
```

La dernière requête doit retourner `true`. Elle vérifie le cron actif et la présence des deux secrets Vault. Le secret service-role Supabase n'est jamais transporté comme bearer entre les fonctions; les secrets fournisseur restent exclusivement dans l'environnement Edge.

## Contrat public Open Messages

```http
GET /functions/v1/waouh-tel-open-messages?room=ABC123
GET /functions/v1/waouh-tel-open-messages?invite=CODE
```

```json
{
  "ok": true,
  "data": {
    "enabled": true,
    "phone_e164": "+22901XXXXXXXX",
    "phone_display": "+229 01 XX XX XX XX",
    "sender_name": "WAOUH",
    "sms_uri": "sms:+22901XXXXXXXX?body=REJOINDRE%20ABC123",
    "sms_uri_android": "sms:+22901XXXXXXXX?body=REJOINDRE%20ABC123",
    "sms_uri_ios": "sms:+22901XXXXXXXX&body=REJOINDRE%20ABC123",
    "default_message": "REJOINDRE ABC123"
  }
}
```

Sans invitation ou salle, le message par défaut est `BONJOUR WAOUH`. Avec `Accept: text/html` ou `format=html`, l'endpoint retourne une petite page de repli avec politique CSP.

## Commandes et limites

Commandes directes : `BONJOUR WAOUH`, `AIDE`, `STOP`, `REPRENDRE`, `STATUT`, `EFFACER`, puis `EFFACER CONFIRMER` dans les 15 minutes.

Groupes virtuels : `GROUPE <nom>`, `REJOINDRE <code>`, `QUITTER <code>` et `#<code> <message>`. `#<code> WAOUH <question>` invoque le moteur et diffuse sa réponse. Une salle accepte au plus 50 membres. Un membre est limité à 5 messages de groupe par minute et 20 par heure. Chaque destinataire reçoit au plus 60 messages sortants par heure. Un SMS est limité à 10 segments et un message de salle à 1 600 caractères.

`EFFACER CONFIRMER` exécute une seule fonction SQL transactionnelle. Elle anonymise les messages directs et de salle, retire les consentements, annule l'outbox, ferme les fils et supprime l'identité moteur dédiée. Une erreur annule toute la transaction et aucun succès n'est annoncé.

## Validation locale

```powershell
npx -y deno check --no-config `
  supabase/functions/waouh-tel-ingress/index.ts `
  supabase/functions/waouh-tel-dispatch/index.ts `
  supabase/functions/waouh-tel-receipts/index.ts `
  supabase/functions/waouh-tel-open-messages/index.ts `
  supabase/functions/waouh-tel-invite/index.ts `
  supabase/functions/waouh-tel-command/index.ts `
  supabase/functions/waouh-tel-room/index.ts

npx -y deno test --no-config supabase/functions/_shared/waouh-tel/*_test.ts
```

Le workflow `deploy-waouh-native-messaging.yml` vérifie aussi le TOML, la migration SQL et les fonctions avant toute migration ou tout déploiement.
