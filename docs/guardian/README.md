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
- sonde extérieure lors d'une livraison volontaire ou d'un contrôle manuel; surveillance périodique hors GitHub à configurer ;
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

## GUARDIAN 2 — P0 indépendance API
La sonde publique read-only vérifie le contrat réel de waouh_module_policy sans jeton de service ni Vault. Elle enregistre uniquement le statut HTTP, la latence et une cause normalisée. Le VPS conserve un journal rotatif local et GitHub conserve un artefact même si la sonde échoue. Un résultat vide ou invalide ne peut pas devenir vert. Aucun redémarrage de PostgreSQL ni changement d'autorisation n'est déclenché par cette sonde. La régulation CRON et la reprise sont des étapes distinctes, à certifier avant activation automatique.

## Zero-Push / Zero-Recurring-CI
Aucun déclencheur schedule, repository_dispatch ou workflow_run dans les workflows GUARDIAN. Les seules entrées sont les modifications volontaires du code et workflow_dispatch. Les permissions GitHub restent contents: read; l'agent VPS ne reçoit aucun jeton GitHub et ne lance aucune commande Git ni workflow. Les observations restent dans le journal local rotatif et dans Supabase lorsqu'il répond. La certification externe d'une livraison reste ponctuelle. Une sonde externe indépendante doit être configurée pour conserver les autorisations de réparation qui exigent une observation extérieure fraîche; en son absence la réparation demeure bloquée, jamais contournée. Aucun achat de crédits ni appel IA payant par l'agent.

## Installation de la sonde extérieure périodique (hors GitHub)

Utiliser un hôte Linux systemd indépendant du VPS BOT.BJ et du projet Supabase, sous contrôle de l'exploitant. Ne pas installer sur le VPS surveillé. Aucun achat de crédits ni provisionnement automatique. Installer Python 3, Node.js et les dépendances système de Chromium sur cet hôte. Copier les fichiers `agent.py`, `resilience.py`, `external.py`, `browser.mjs`, `run-external.sh` de la révision validée dans `/opt/waouh-guardian-probe`, appartenant à root et non modifiables par le compte de service. Installer Playwright épinglé à 1.56.1 (comme dans la CI) et Chromium dans `/opt/waouh-guardian-probe/browsers`, en utilisant PLAYWRIGHT_BROWSERS_PATH. Créer un compte système sans connexion `waouh-guardian-probe` et un répertoire de configuration `/etc/waouh-guardian-probe` non accessible aux autres utilisateurs. Transférer uniquement la configuration dédiée `external.json` obtenue via le processus de provisionnement autorisé `provision.py external` depuis une station d'administration de confiance ; ne jamais transférer le PAT Supabase ni les clés service/host. Le fichier doit appartenir au compte de sonde, mode 0600, sans lien symbolique. Ne pas afficher son contenu dans les journaux ou dans Git.

Installer les deux unités systemd dans /etc/systemd/system, exécuter `systemd-analyze verify` sur les unités, puis `systemctl daemon-reload`, `systemctl start waouh-guardian-external.service` et contrôler son journal. Activer le timer uniquement après réussite de cette sonde initiale avec `systemctl enable --now waouh-guardian-external.timer`. Le timer déclenche une mesure toutes les cinq minutes, sans déploiement, activation de réparation, commande Docker ni jeton GitHub. Le processus échoue si le navigateur ne produit aucun résultat, si la configuration privée est absente ou si l'ingestion échoue. Vérifier plusieurs relevés extérieurs consécutifs en base, puis la résolution naturelle de OBSERVATION_STALE. Une indisponibilité de l'hôte indépendant doit continuer à bloquer les réparations nécessitant une observation extérieure. Arrêt réversible : `systemctl disable --now waouh-guardian-external.timer`. Ne pas modifier les seuils ni clôturer artificiellement un incident.

### Preuves de mise en service

Sur l’hôte indépendant, exécuter `bash scripts/guardian/verify-external-install.sh` depuis la révision approuvée. Ce contrôle en lecture seule exige un timer activé, un prochain déclenchement, le compte de service dédié et une exécution récente terminée avec succès. Le programme externe exige désormais un accusé d’ingestion `ok: true` du serveur. Le contrôle local ne suffit pas : vérifier également au moins trois relevés extérieurs successifs espacés d’environ cinq minutes dans Supabase et la résolution naturelle de l’incident `OBSERVATION_STALE`. Aucun secret ni accès Docker n’est nécessaire à la vérification locale. Ne pas exécuter sur le VPS surveillé.
