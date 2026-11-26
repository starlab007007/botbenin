# Audit : offres trouvées sur Internet → message WhatsApp → accord

## Objectif
Vérifier, outil par outil, comment une offre trouvée hors de WAOUH (réseaux sociaux, sites web, recherche Internet, annuaires) est collectée, affichée, transmise au vendeur par WhatsApp quand son numéro est connu, puis menée jusqu'à l'accord et la clôture. Faire un vrai test de bout en bout, identifier les points faibles et proposer des corrections.

## Constat de départ (données réelles)
- Les offres collectées viennent de plusieurs sources. Ces sources sont surtout les annonces internes, les sites commerciaux, les recherches Internet, Facebook, les commerces partenaires, les annuaires de lieux et les appels d'offres publics.
- Beaucoup de ces offres n'ont **aucun moyen de contact** (niveau le plus bas). Elles ne peuvent donc pas mener à un message WhatsApp.
- La file des messages sortants sur 30 jours compte **149 messages en échec** (le dernier le 15/11), **90 messages en attente** (dont certains d'aujourd'hui) et seulement **93 envoyés**. Il faut comprendre pourquoi les messages restent bloqués.
- Les échanges ouverts sur des offres extérieures finissent rarement par un accord : 29 attendent encore un livreur, 16 sont annulés et 2 sont contestés.

## Étapes
1. **Carte des outils** : pour chaque source, noter comment elle collecte (fréquence, dernière collecte réussie, volume, présence de photos, de prix et de contact). Vérifier aussi qu'aucune source n'est dite « raccordée » sans collecte réelle.
2. **Recherche du contact** : vérifier comment un numéro WhatsApp est trouvé pour une offre (fiche, page du site, annuaire), dans quelle proportion, et si les numéros sont valides.
3. **Présentation** : vérifier que les offres extérieures s'affichent avec photo, prix, ville et provenance, et que les offres sans contact sont signalées honnêtement.
4. **Envoi de l'intérêt** : rejouer « Intéressé » et « Confier à Bot » sur une offre extérieure. Vérifier que la Deal Room s'ouvre et qu'un message part vers le vendeur, en respectant les limites d'envoi et le consentement.
5. **Diagnostic de la file d'envoi** : classer les causes des échecs et des attentes (numéro invalide, envoi bloqué par les règles, WhatsApp déconnecté, relances).
6. **Réponse du vendeur** : quand le vendeur répond sur WhatsApp, vérifier que sa réponse arrive dans la bonne Deal Room, puis que l'offre, l'accord, la réception et la clôture fonctionnent.
7. **Test de bout en bout** : créer une offre extérieure de test liée au numéro WhatsApp que vous fournirez, la chercher avec le compte acheteur, cliquer « Intéressé », recevoir le message sur le téléphone, y répondre, puis conclure l'accord et clore la vente. Le test se fait sur le Web (ordinateur, tablette, téléphone), avec une capture à chaque étape.
8. **Corrections** : corriger les défauts bloquants trouvés (messages bloqués, réponse qui n'arrive pas dans la Deal Room, offres sans contact présentées comme joignables). Ensuite, rejouer le test.
9. **Rapport** : ajouter au rapport de certification un tableau étape par étape, avec la source, le verdict et la preuve, plus la liste des propositions classées par priorité.

## Ce dont j'ai besoin de votre part
- Un numéro WhatsApp de test qui jouera le vendeur extérieur, et quelqu'un qui pourra répondre au message pendant le test.
- Votre accord pour envoyer un vrai message à ce numéro.

## Limites
- Je ne contacterai aucun vrai vendeur pendant le test : uniquement le numéro que vous me donnerez.
- Si WhatsApp est déconnecté côté plateforme, l'étape d'envoi sera notée « bloquée » et je dirai comment la reconnecter.
- L'application Android ne pourra pas être lancée ici. Elle utilise le même serveur, mais il faudra la vérifier sur un téléphone.

## Détails techniques
- Sources : collecte des sites, des réseaux sociaux et des annuaires, avec suivi de leur état (dernière collecte, volume).
- Contacts : la recherche du contact et la base des contacts trouvés.
- Envoi : la file des messages sortants et les règles qui limitent les envois.
- Réception : le traitement des messages WhatsApp entrants, pour retrouver la bonne Deal Room.
- Ouverture d'un échange sur une offre extérieure : la même action « ouvrir un échange » que pour les autres offres.
- Requêtes de diagnostic en lecture seule pour l'audit ; le test crée des données marquées « test », que je supprimerai à la fin si vous le voulez.
