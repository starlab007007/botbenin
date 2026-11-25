# Collecte WAOUH — reprise vérifiée le 25 novembre 2026

## Livré et vérifié

- Le worker commun prend aussi les tâches Web SerpAPI. L'ancien endpoint quotidien délègue à cette file et ne transforme plus les extraits de recherche en annonces avec un prix, un contact ou une miniature supposés.
- Les liens découverts sont routés uniquement vers un collecteur déjà autorisé. La page de l'annonce doit ensuite être lue et qualifiée. Les autres domaines ne sont pas activés automatiquement.
- Un index dont le format change, ou une page de détail temporairement indisponible, ne fait plus perdre les autres fiches qualifiées. Les résultats partiels et leurs raisons restent visibles.
- Les offres CoinAfrique explicitement vendues/fermées sont retirées des fiches actives. Les liens WhatsApp publiés dans le corps d'une annonce sont conservés ; ceux du pied de page sont exclus.
- Le collecteur CoinAfrique principal suit désormais les documents individuellement. 176 pages de détail ont été mises en revalidation ; un premier passage réel a actualisé trois fiches.
- Les anciennes fiches externes sans échéance reçoivent une fenêtre de fraîcheur de 30 jours, ou de 90 jours pour les profils d'entreprise. 256 fiches ont été archivées pour ancienneté, sans déclarer qu'elles sont vendues et sans effacer les faits d'origine. Aucune fiche externe active n'est restée sans échéance au contrôle.
- L'accès aux comptes fournisseurs a été vérifié : SerpAPI et Firecrawl répondent. Les anciens motifs de refus d'accès ont été levés ; les plafonds n'ont pas été augmentés. Le crédit inclus Apify reste très limité.
- La reprise SerpAPI a exécuté trois recherches dans la file commune : une a routé un lien vers la vérification du site, deux n'ont trouvé aucun lien routable. Les autres restent soumis au quota de veille existant ; aucun extrait n'a été publié directement comme fiche vérifiée.

## Annuaire

Les 50 entrées représentent 37 plateformes, avec quatre alias explicites et plusieurs rubriques du même site. L'audit réseau borné a observé 31 réponses HTTP 200, 3 réponses 404 et 16 réponses 503. Ces résultats ne prouvent ni une autorisation d'extraction, ni la présence d'annonces, ni un raccordement complet. Le relevé est enregistré séparément dans `test_report.reachability` pour conserver la distinction avec un vrai test d'extraction.

Le script reproductible est `scripts/audit-waouh-platform-reachability.py`. Les adresses, sources protégées et adaptateurs non validés restent à traiter individuellement. Un site répondant 200 n'est pas automatiquement activé.

## Validation et limites restantes

- 39 tests Deno de collecte, galeries, contacts, découverte, quotas et périmètre réussis.
- Tests SQL PGlite : fraîcheur, profils d'entreprise, conservation des faits, revalidation autorisée, idempotence, sélection des tâches Web, pauses et refroidissement fournisseur réussis.
- Les fonctions privées restent refusées aux rôles publics et authentifiés.
- Le déploiement Web et les contrats Convergence ont réussi. La validation Native Messaging a réussi et ses fonctions ont été publiées, mais son contrôle final WhatsApp reste en échec : la session centrale a été recréée depuis le panneau administrateur puis reste `STARTING`, sans QR.
- La connexion du compte acheteur et la création de recherches réelles sont confirmées. Le retour visuel des résultats, le parcours à deux comptes jusqu'à l'accord, le test WhatsApp et la recette Android ne sont pas encore validés.
- L’accès administrateur a été confirmé par le formulaire sécurisé. Aucun rôle supplémentaire n’a été attribué aux comptes de recette.
- Le diagnostic hôte en lecture seule confirme WAHA Plus 2026.9.2, moteur WEBJS, conteneur central actif sans redémarrage, 16,9 Gio libres. Les journaux sont classés sans être publiés : `TimeoutError`, `Waiting failed: 30000ms exceeded`, `WebjsClientCore.inject`, `waitForFunction`. Le blocage d’initialisation empêche la production du QR.
- Le problème ressemble à l’incident amont ouvert [WAHA #2379](https://github.com/devlikeapro/waha/issues/2379), également signalé sur 2026.10.1. Aucun changement global de moteur ni redémarrage des sessions des autres clients n’a été appliqué.
- L’interface ne promet plus l’arrivée du QR après une réinitialisation et explique l’absence de QR lors d’un chargement en attente.

Ne pas annoncer les 50 entrées comme 50 collecteurs opérationnels, ni présenter les recettes Web/Android/WhatsApp comme terminées.
