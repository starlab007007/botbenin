# BOT / WAOUH GUARDIAN

Système de surveillance autonome : observer, confirmer, diagnostiquer à partir
d’indices vérifiables, intervenir dans un périmètre autorisé, vérifier le retour.

## Audit et couverture

La version 18.42 a corrigé le prévol bloquant la liste des utilisateurs, les
abonnements partagés qui faisaient tomber l’interface, et la reprise de publication.
Les contrôles techniques existants ne conservaient pas d’incidents durables ni de
vérification après réparation. GUARDIAN apporte :

- contrôles internes toutes les deux minutes : données, recherche publique sans
  collecte payante, accès utilisateurs, connexion WhatsApp, envois en attente,
  erreurs d’écrans et fraîcheur des observateurs ;
- sonde sur l’hôte toutes les minutes, indépendante du conteneur Web ;
- sonde extérieure toutes les cinq minutes (ordonnancement susceptible de retard) ;
- administration dédiée, incidents et actions persistants, notifications
  administrateur dédupliquées, maintenance et suspension des relances ;
- remontées Web/Flutter authentifiées et limitées, sans message, photo, adresse,
  requête utilisateur, jeton ou trace d’erreur complète.

## Réparation bornée

Seul le conteneur Web `react-app-botjs` peut être relancé. La panne locale ET
publique doit persister sur trois relevés et deux minutes, être confirmée depuis
l’extérieur, et avoir une référence saine antérieure. Une décision atomique
vérifie activation, maintenance, une tentative par incident, une heure entre
interventions et deux tentatives maximum sur 24 heures. L’hôte refuse un conteneur
inconnu, un arrêt propre, un manque de mémoire, un démarrage récent ou un
déploiement en cours. Les commandes et destinations sont fixes.

Un résultat perdu n’est jamais rejoué. Une relance réussie reste en vérification
jusqu’à deux relevés sains des observateurs requis. Une mesure ancienne ou absente
est inconnue, jamais verte. Aucun modèle ne peut exécuter du code, du SQL ou une
commande arbitraire. Aucun test ne doit arrêter la production.

## Intervention humaine

Les ventes, paiements, messages, autorisations et données métier ne sont jamais
réécrits ou rejoués. Les modules et tâches arrêtés volontairement restent arrêtés.
Les déconnexions WhatsApp et limites de collecte sont signalées sans reconnexion
aveugle ni achat de crédit. Le diagnostic distingue observations et causes
probables. L’activation exige des références saines, dont une sonde extérieure.

## Exploitation

Administration : `/admin/waouh/guardian`. L’hôte utilise un jeton dédié (stockage
0600 hors du site) et le verrou partagé `/home/debian/waouh-web-deploy.lock`.
Les observations sont conservées 14 jours, les événements clients 7 jours ; les
incidents et interventions restent consultables. Aucun contenu métier n’est purgé.
Les alertes intégrées nécessitent l’accès à l’application ; les échecs de la sonde
extérieure restent également visibles dans le contrôle de livraison indépendant.

## Continuité et escalade

Une sonde extérieure vérifie aussi la fraîcheur du dernier contrôle interne.
Un point d’accès qui répond sans contrôle interne récent ne suffit pas à établir
un état sain. Les incidents, aggravations et interventions sans résultat sont
notifiés une seule fois par état significatif. Après une maintenance, les alertes
restées en attente sont réévaluées. Une relance sans confirmation indépendante
du rétablissement pendant 20 minutes requiert une vérification humaine.

Le transfert de la configuration d’hôte utilise le même utilisateur que sa
création : le fichier reste privé (0600) et n’est pas rendu lisible pour un
conteneur de transfert. Les références de clé sont temporaires, la vérification
de clé hôte est active et les fichiers temporaires sont nettoyés.
