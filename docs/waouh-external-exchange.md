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
