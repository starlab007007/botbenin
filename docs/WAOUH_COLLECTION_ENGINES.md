# Administration des moteurs de collecte WAOUH

Le panneau **Moteurs de collecte et d’extraction**, dans `/admin/waouh/data-control`, raccorde Cheerio, Crawlee, Playwright, Scrapy, Beautiful Soup et Crawl4AI à la file de collecte existante. Aucun nouveau domaine ni aucune nouvelle source ne sont activés par cette livraison.

## Utilisation

1. Cliquer sur **Vérifier l’installation** pour lire les versions du service réellement déployé.
2. Lancer **Tester** pour chaque moteur. Une page de démonstration contenant un produit fictif est traitée par l’outil installé ; le prix et le modèle doivent être conservés. Le test ne publie rien dans NEXUS.
3. Régler l’autorisation, le délai maximal (5 à 30 secondes) et la taille maximale du document (64 à 1 200 Ko).
4. Dans **Moteur utilisé par chaque source**, sélectionner un outil testé et disponible. Cheerio reste le moteur natif par défaut. Un moteur en pause bloque le traitement des sources qui lui sont affectées : il n’y a pas de bascule silencieuse vers un autre outil.
5. Consulter l’historique des passages et leurs codes d’erreur. Les documents, identifiants de connexion et coordonnées ne sont pas enregistrés dans cet historique.

Les flux RSS, catalogues JSON et annuaires JSON conservent leur lecture structurée directe. Les sources Facebook/Apify restent gérées par leur connecteur et leurs plafonds existants.

## Frontières d’exécution

La récupération réseau, les domaines autorisés, les règles robots, l’attribution et les autorisations de source restent sous le contrôle du worker Supabase existant. Il transmet le document HTML au moteur choisi, puis soumet le résultat aux mêmes extracteurs métiers et contrôles de publication. Une extraction réussie ne suffit pas à rendre une annonce valide ou actuelle.

- **Cheerio** : analyse HTML native dans le worker. La démonstration vérifie aussi son installation dans le service.
- **Crawlee** : cycle réel `BasicCrawler` sur le document fourni ; aucune seconde file de collecte externe ne remplace la file commune.
- **Scrapy** : spider réel avec une réponse HTML fournie par le worker et interception des téléchargements.
- **Beautiful Soup** : analyse et restitution du document HTML en Python.
- **Playwright** : rendu du document dans Chromium.
- **Crawl4AI** : mode `raw:` avec `process_in_browser=True`, alimenté exclusivement par le document fourni, puis restitution du HTML rendu ; aucun appel à un LLM.

Le service de moteurs est isolé avec `network_mode: none`, système de fichiers en lecture seule, limites de mémoire/processus et un seul traitement simultané. Nginx communique avec lui par un socket Unix partagé. Un secret dédié conservé dans Vault protège le protocole serveur à serveur ; il n’est jamais envoyé au navigateur administrateur.

**Limite du mode fourni :** les scripts intégrés au document peuvent s’exécuter dans Chromium, mais les fichiers JavaScript externes, requêtes API, images et autres ressources réseau sont bloqués. Les sites qui en dépendent nécessiteront un raccordement d’acquisition spécifique lors de l’étape de choix des sites. L’installation des outils ne vaut pas validation de ces sites.

## Livraison et tests

Le workflow Web construit une image dédiée avec dépendances Node et Python verrouillées, puis exécute les six outils sur une page fictive, sans réseau. La même image vérifiée est transférée au VPS avec l’image Web. Le navigateur Chromium est fourni par Debian ; Playwright utilise cet exécutable, sans téléchargement de modèle ni API payante.

Tests : `server/collection-engines/test_runtime.py`, `scripts/tests/waouh-collection-engines-db.mjs`, `supabase/functions/_shared/waouh-collection-engines-test.ts` et `src/components/admin/__tests__/collection-engines.test.tsx`.

Les nouveaux réglages et journaux sont accessibles uniquement via la passerelle administrateur. Les rôles publics ne peuvent ni lire les tables, ni accéder au secret. Le choix d’un moteur, les changements de limites et les pauses sont tracés dans le journal d’administration existant.
