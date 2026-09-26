# WAOUH Admin Command Center

## Objectif

Le **WAOUH Command Center** est la couche de supervision centrale de WAOUH. Il ne remplace pas les consoles métier détaillées ; il les orchestre et donne à l’administrateur un point d’entrée unique pour voir l’état du système, détecter une anomalie, suspendre un module, suspendre son automatisation et ouvrir la console spécialisée.

Route principale : `/admin/waouh`, onglet **Centre de contrôle**.

## Modèle de contrôle

Chaque module contrôlable possède deux états persistants dans `waouh_admin_module_controls` :

- `enabled` : kill switch métier. Quand il est désactivé, l’entrée métier concernée est refusée côté serveur.
- `automation_enabled` : coupe uniquement les traitements autonomes pour les modules qui en ont besoin.

Chaque changement est enregistré dans `waouh_admin_control_audit` avec état avant/après, acteur et horodatage.

Les contrôles sont **server-side**. Le masquage UI n’est jamais considéré comme une mesure de contrôle suffisante.

## Matrice d’administration

| Module | Suivi central | Contrôle | Console détaillée |
| --- | --- | --- | --- |
| NEXUS | Signal Fabric, signaux externes, matchs, photos, WhatsApp, sources, connecteurs, quotas, scans | ON/OFF + automatisation ON/OFF | Radar IA / Sources / API |
| Avatar Commerce | activité des parcours Avatar et événements conversationnels | ON/OFF | Historique / traces |
| Chat Web/App | messages 24h, fils actifs, erreurs de chaîne | ON/OFF | Historique / Health Check |
| Chat WhatsApp | messages, sessions WAHA, files de sortie | ON/OFF | WhatsApp Ops |
| Muse / Agents IA | missions, étapes, erreurs, approbations, outbox | ON/OFF + automatisation ON/OFF | Missions / Agents |
| Négociation | états, propositions, contre-propositions, stagnation | ON/OFF | Historique / traces |
| Deal Room / Deal Graph | deals actifs, litiges, revue paiement, livraison | ON/OFF | Deal Ops |
| Outbound | pending, retard, envoyés, échecs | ON/OFF + automatisation ON/OFF + relance manuelle admin | Historique / Queue |
| Diffusion | campagnes en attente d’approbation | validation humaine | Diffusion approvals |
| SMS/RCS | provider, SMS/RCS, fallback, disponibilité | paramètres natifs | Native Messaging |
| Partenaires / Entreprises | activité, catalogue, ventes, vérification | consoles métier | Partners / Businesses |
| Données unifiées | qualité, vérification, nettoyage IA, contacts | édition / activation / vérification | Data Control |

## Alertes du Command Center

Les alertes prioritaires sont calculées côté serveur par `waouh-admin-stats`.

- **Critique** : échecs outbound sur 24 h, traces en erreur, deal en litige/revue paiement, quota API >= 95 %.
- **Attention** : queue pending depuis plus de 15 minutes, négociation ouverte depuis plus de 48 h, erreurs Agents IA, connecteur actif mal configuré ou en échec, source NEXUS dépassant deux fois sa fréquence de scan, quota API >= 80 %.
- **À traiter** : approbations Agents IA, approbations diffusion, source active jamais scannée.

Le statut global est :
- `healthy` : aucune alerte critique/attention ;
- `warning` : au moins une alerte attention ;
- `critical` : au moins une alerte critique.

## NEXUS

Le contrôle NEXUS couvre :
- `nexus.*` dans Agentic Core ;
- SerpAPI scout ;
- Apify Radar ;
- Firecrawl / site scraper ;
- Radar process / promotion / matching / outreach.

Quand **NEXUS est OFF**, les actions métier sont bloquées mais les actions de lecture de statut restent disponibles.

Quand **Automatisation NEXUS est OFF**, les collectes/synchronisations automatiques, autopilot et notifications automatiques sont suspendus.

La configuration détaillée reste dans Radar :
- clé/token ;
- activation ;
- quota journalier ;
- test ;
- dernière synchronisation ;
- fréquence de scan ;
- collecte manuelle ;
- liste des sources autorisées.

## Avatar Commerce

Le serveur détecte les parcours Avatar via `meta.source = avatar_commerce` / surfaces Avatar.

Quand Avatar Commerce est OFF, les nouvelles étapes du parcours sont rejetées côté serveur. Les données historiques restent lisibles.

Le suivi se fait par :
- activité Avatar 24 h ;
- messages / threads ;
- négociations créées ;
- deal_id / transaction_id ;
- traces corrélées.

## Chat Web/App et WhatsApp

Les entrées passent par la chaîne WAOUH contrôlée. Les canaux peuvent être coupés indépendamment :
- `chat_web` pour Web/App ;
- `chat_whatsapp` pour WhatsApp/WAHA.

À surveiller :
- messages inbound/outbound ;
- dernier webhook ;
- fils actifs ;
- messages orphelins ;
- négociations sans messages ;
- négociations sans traces ;
- sessions WAHA actives ;
- files outbound.

## Muse / Agents IA

À suivre :
- missions par statut ;
- étapes par statut ;
- `last_error` mission/étape ;
- approbations humaines pending ;
- agent outbox en erreur.

Quand le module est OFF, les nouvelles actions agentiques sont bloquées, mais lecture, pause, annulation et décision d’approbation restent possibles pour reprendre le contrôle.

Quand Automatisation est OFF, `mission.run` et `watch.observe` sont suspendus.

## Négociation

Le kill switch est appliqué au routeur de négociation. Les états principaux à suivre sont :
- proposed ;
- countered ;
- accepted ;
- closed.

Une négociation `proposed/countered` sans mise à jour depuis plus de 48 h remonte comme stagnante.

## Deal Graph

Le kill switch est appliqué dans `waouh-deal-ops`.

Le suivi porte sur :
- pending / pending_assignment ;
- assigned / picked_up / delivered ;
- payment_review ;
- disputed ;
- completed / cancelled ;
- statut paiement et commission.

Les états `disputed` et `payment_review` remontent comme anomalies prioritaires.

## Outbound

Le dispatcher possède deux niveaux :
- module OFF : aucun dispatch ;
- automatisation OFF : les workers automatiques sont suspendus, mais un administrateur peut lancer une relance manuelle depuis le Command Center.

À surveiller :
- pending total ;
- pending > 15 min ;
- sent / 24h ;
- failed / 24h ;
- attempts / last_error / circuit breaker.

## Consoles détaillées

- `/admin/waouh` : Command Center
- `/admin/waouh/radar` ou onglet Radar : NEXUS/Radar
- `/admin/waouh/whatsapp-ops` : WAHA/WhatsApp
- `/admin/waouh/native-messaging` : SMS/RCS
- `/admin/waouh/historique` : négociations, messages, traces, queue
- `/admin/waouh/health-check` : divergences techniques
- `/admin/waouh/deals` : Deal Ops
- `/admin/waouh/data-control` : base unifiée et qualité
- `/admin/waouh/diffusion-approvals` : validation humaine des diffusions
- `/admin/waouh/partners` : partenaires
- `/admin/waouh/businesses` : entreprises partenaires
- `/app/missions` : Muse / Missions / Agents IA

## Principe d’exploitation

Le Command Center est la couche L1 : état, alertes, kill switches et navigation. Les consoles spécialisées sont la couche L2 : diagnostic et action. Health Check / Historique / traces forment la couche L3 : preuve technique et audit.

La règle opérationnelle est : **détecter → isoler → suspendre l’automatisation si nécessaire → diagnostiquer dans la console détaillée → corriger → réactiver → vérifier les traces**.
