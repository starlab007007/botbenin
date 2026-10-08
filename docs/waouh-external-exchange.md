# Échanges avec les contacts externes

Le même échange est accessible depuis NEXUS (préparation du contact), les démarches
Avatar, le suivi d'une discussion liée et le journal de l'assistant. Les panneaux
repliés n'interrogent pas le serveur. La discussion ouverte actualise ses messages
toutes les dix secondes et suspend ces lectures lorsque l'écran est masqué.

## Interlocuteur sans application

Le propriétaire crée un lien `/exchange#<jeton>` valable sept jours et révocable.
Le serveur conserve uniquement son hash dans la table des invitations. Le fragment
n'est pas transmis dans l'URL HTTP ; cette page ne déclenche pas Google Analytics.
Le lien autorise uniquement la lecture et les actions de la contrepartie dans cet
échange. Il ne donne accès ni au compte du propriétaire ni à ses autres démarches.
Le propriétaire doit le partager uniquement avec l'interlocuteur concerné.

L'invité peut répondre, proposer ses conditions, accepter une version précise de
l'accord et arrêter l'échange. Toute nouvelle proposition remplace la précédente.
Le serveur sérialise les modifications sur la démarche, refuse les versions
obsolètes, limite les requêtes et déduplique les répétitions d'une même action.

## Canaux et réponses

- **WhatsApp** : file d'envoi existante, contrôle des autorisations avant envoi,
  réponse rattachée à la démarche exacte. En cas de plusieurs échanges possibles,
  la référence `WA-XXXXXXXX` est requise ; aucun échange n'est choisi arbitrairement.
  Les messages initiaux et les relances contiennent aussi un lien invité.
- **SMS/RCS** : transport natif existant, fournisseur actif, consentement actif du
  destinataire ; RCS exige une capacité valide. Aucun consentement n'est créé à
  partir d'un numéro public. Les accusés natifs sont affichés séparément de l'envoi.
- **E-mail** : envoi via Resend lorsque `RESEND_API_KEY` et `WAOUH_EMAIL_FROM` sont
  configurés. L'expéditeur doit être autorisé chez Resend. La réponse se fait via
  le lien invité ; cette version ne collecte pas les réponses d'une boîte e-mail.
- **Lien invité** : publication dans l'échange, sans envoi externe. L'interface
  indique qu'il faut transmettre le lien à l'interlocuteur.

Un message en file, accepté par le fournisseur, envoyé, livré ou lu a un statut
distinct. Les accusés WhatsApp exigent un webhook authentifié : jeton associé à
la session, appel interne ou `WAHA_WEBHOOK_SECRET` dans `x-waouh-webhook-token`.
Le webhook WAHA doit recevoir `message.ack`. Sans cet accusé, le statut reste
« Envoyé ». Les accusés tardifs ne dégradent jamais « Lu » vers « Envoyé ».

## Avatar et accord

Les mandats gardent leurs limites de contacts, de relances et de budget. Un canal
indisponible n'est pas présenté comme utilisable. L'e-mail automatique exige une
approbation ; un repli après échec WhatsApp exige un canal autorisé et configuré.
Une réponse suspend les relances pour absence de réponse. Un STOP arrête les
messages et révoque les contacts concernés.

Pour les propositions invitées, l'Avatar autonome peut rédiger une contre-offre
dans sa limite explicite. Il ne confirme pas l'accord final à la place du
propriétaire : une approbation portant sur cette version des conditions est
nécessaire. Les parcours existants avec Deal Room conservent leurs contrôles.

L'accord contient le total en FCFA, la quantité, la livraison/réalisation et les
modalités de paiement. La réception est confirmée par l'acheteur ; le paiement
réalisé est déclaré par l'acheteur, puis le paiement reçu est confirmé par le
vendeur. La démarche est terminée après réception et paiement reçu. Ces boutons
enregistrent les déclarations des participants et ne déplacent aucun fonds.

## Validation

`scripts/test-external-exchange.mjs` vérifie la migration PostgreSQL, l'isolation,
les expirations/révocations, les versions d'accord, les rôles et la clôture.
Il utilise PGlite (`PGLITE_MODULE` permet un emplacement d'installation externe).
Les tests Deno couvrent l'accès invité, les entrées et le choix des canaux ; les
tests React couvrent les contrôles affichés et les doubles clics.

Après publication, `scripts/verify-external-exchange-production.py` exerce le
serveur avec un compte temporaire : lien, réponse, proposition, accord, réception,
déclarations de paiement et révocation. Aucun transport externe ni paiement réel
n'est appelé. Le compte et les données de test sont supprimés dans `finally`.


## WhatsApp central et Avatar

La session WAHA centrale est `WaouhApp`, numéro `+229 65653468` (également reconnu sous la forme béninoise `+229 01 65 65 34 68`). Les envois externes NEXUS/Avatar restent sur cette session, y compris les réponses manuelles et les contre-offres. Le dispatcher vérifie l'identité connectée avant l'envoi ; une session indisponible laisse les messages en attente.

Le panneau WhatsApp appelle `central-connect` : il vérifie le numéro réel, conserve les autres réglages WAHA et remplace l'ancien webhook direct `waouh-channel-in` par `waha-webhook`. Le secret `WAHA_WEBHOOK_SECRET` est envoyé dans un en-tête WAHA dédié, jamais affiché. Les événements `message`, `message.any`, `message.ack`, `session.status` sont abonnés. Le webhook authentifie les entrées centrales puis relaie les messages avec l'identité serveur. Les doublons et les messages envoyés par le numéro central sont ignorés ; les groupes ne sont pas traités comme des interlocuteurs individuels.

Les réponses externes sont routées avant le chat général. La session, le numéro du contact, le message cité ou la référence `WA-xxxxxxxx` déterminent la mission. En cas d'ambiguïté, aucune négociation n'est choisie arbitrairement. Les réponses réveillent le worker ; les demandes de devis sont bornées, les contre-offres respectent le mandat et l'accord final reste explicite.

Depuis un WhatsApp déjà associé au compte WAOUH, `mes missions` affiche les étapes et les prochaines actions. Une demande naturelle peut créer un mandat avec les limites explicites existantes ; sans association au compte, la recherche reste disponible mais le mandat exige de relier le compte. Les missions créées sur WhatsApp reçoivent aussi leur progression sur ce canal.

Commandes des deux participants (la référence et la version sont celles du suivi) :

- `SUIVI WA-xxxxxxxx`
- `PROPOSER WA-xxxxxxxx 25000 FCFA | 1 | Livraison à Cotonou | Paiement après réception`
- `ACCEPTER WA-xxxxxxxx VERSION-yyyyyyyy`
- Vendeur : `EXPEDIE WA-xxxxxxxx VERSION-yyyyyyyy`, puis `PAIEMENT RECU WA-xxxxxxxx VERSION-yyyyyyyy`.
- Acheteur : `RECU WA-xxxxxxxx VERSION-yyyyyyyy`, puis `PAYE WA-xxxxxxxx VERSION-yyyyyyyy`.
- Propriétaire : `MESSAGE WA-xxxxxxxx Votre message`, ou `STOP WA-xxxxxxxx`.
- Contact externe : `STOP` arrête les sollicitations de cet expéditeur et révoque les invitations associées.

Un « oui » ou un prix seul ne confirme pas un accord. La version doit correspondre à l'offre actuelle ; les rôles sont contrôlés dans la même transaction SQL que sur le Web. Les confirmations de paiement sont des déclarations, jamais des transferts. Une mise à jour explicitement faite par le propriétaire sur WhatsApp est également mise en file pour le contact, avec échec de transmission distinct de l'enregistrement de l'accord.

`scripts/verify-waouh-central-whatsapp.py --connect` configure et vérifie le central après publication, sans envoyer de messages. `scripts/verify-external-exchange-production.py --whatsapp` vérifie les commandes sur un compte temporaire avec un numéro de fixture volontairement invalide et une ligne déjà lue, donc aucun transport externe n'est invoqué. La réception/envoi réel avec un interlocuteur exige un numéro de test externe autorisé ; le numéro central n'est pas utilisé comme son propre interlocuteur.
