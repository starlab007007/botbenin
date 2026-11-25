# Audit « Confier à Bot » de bout en bout

## Constat (données réelles, 30 derniers jours)
- Le robot tourne bien : la tâche qui fait avancer Bot passe toutes les 10 minutes, 144 réussites sur 24 h.
- 11 confiances à Bot enregistrées, 9 actions de Bot. La dernière date du 15/11 : **Bot n'a rien fait depuis 10 jours.**
- Aucune négociation n'est actuellement confiée à Bot. Les 8 dernières sont en pause, car leur mandat a expiré (3 à 7 jours). C'est normal, mais rien ne prévient l'utilisateur ni ne propose de relancer.
- 5 négociations récentes attendent un vendeur « à joindre » : le message part par WhatsApp, et le numéro WAOUH est déconnecté. **Bot ne peut donc pas contacter les vendeurs externes.**
- Les corrections récentes (sauter son propre article, ouvrir la Deal Room) n'ont encore servi à aucune vraie confiance à Bot.

## Ce que je vais faire
1. **Test réel avec votre compte de test** : chercher un article d'un autre vendeur, « Confier à Bot », puis lancer Bot tout de suite au lieu d'attendre 10 minutes. Vérifier que Bot envoie le premier message et le prix, qu'il respecte le plafond et que la Deal Room s'ouvre. J'irai jusqu'à « Accord à confirmer ». L'accord final demande le vendeur.
2. **Mandat expiré** : quand Bot se met en pause pour cette raison, l'utilisateur reçoit une notification « Bot a terminé sans accord » avec le bouton « Relancer Bot ». La Deal Room l'affiche aussi clairement.
3. **Vendeur injoignable** : quand WhatsApp est coupé, Bot passe automatiquement à l'offre suivante joignable dans l'appli, sans rester bloqué, et le dit à l'utilisateur.
4. **Contre-offre** : Bot s'appuie sur le nouveau repère marché pour accepter ou proposer, toujours sous votre plafond.
5. Un rapport court : ce qui marche, ce qui bloque, avec les preuves.

## Ce qui reste hors de ma portée
- Reconnecter le numéro WhatsApp « WaouhApp » : c'est à vous de le faire, en scannant le code QR.
- Confirmer l'accord côté vendeur : il faut un deuxième compte.

## Détails techniques
- Avancement de Bot : fonction `waouh_room_tick`, appelée par `waouh-opportunity-worker` (toutes les 10 min) et par `waouh-deal-room` lors d'une lecture.
- Tables : `waouh_deal_room_links` (mode, `next_run_at`, `expires_at`), `waouh_room_events`.
- Point 2 : notifier lors de la mise en pause pour expiration, dans `waouh_room_tick` (migration) et en direct dans l'application.
- Point 3 : faire passer `seller_pending` plus de N min ou un échec d'envoi à la piste suivante (`cascade_step`).
- Point 4 : utiliser la médiane mise en cache dans `waouh-deal-room` comme borne pour la proposition de Bot.
- Tests : ajouter des tests sur la relance après expiration et le passage à l'offre suivante. Les tests chat existants doivent rester au vert.
