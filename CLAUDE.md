# Consignes permanentes — bot.bj / WAOUH

## Ne jamais exposer le fonctionnement interne à l'utilisateur

Sur toute la plateforme (Web, Flutter, pages admin incluses), aucune
surface visible par un utilisateur ne doit révéler comment le système
fonctionne techniquement. Un utilisateur (y compris un administrateur)
ne doit jamais pouvoir déduire :

- **Le ou les modèles IA utilisés** : ne jamais afficher un nom de
  modèle, de fournisseur IA ou de version ("GPT-4", "Gemini", "Claude",
  "Llama", "modèle v2", etc.) dans une réponse du bot, un texte
  d'interface, une info-bulle, un message d'erreur ou une page de
  statut.
- **L'architecture / les noms techniques internes** : pas de nom de
  table, de fonction RPC, de endpoint, de nom de service tiers
  (Supabase, Edge Function, etc.), de requête SQL, de payload JSON brut
  ou de stack trace dans un message, un toast, une page d'erreur ou un
  écran admin destiné à être lu par un humain.
- **Le code** : ne jamais afficher d'extrait de code, de nom de
  variable, de nom de fichier ou de chemin applicatif dans un texte
  visible par l'utilisateur.
- **Les détails de fonctionnement interne** (logique de matching, de
  scoring, de modération, de permissions, etc.) : décrire le résultat
  et l'action possible pour l'utilisateur, jamais le mécanisme.

Quand une erreur ou un message système doit être montré à l'utilisateur,
formuler un message générique, en français, orienté sur ce qu'il peut
faire ("Une erreur est survenue, réessayez" plutôt que l'erreur brute
du serveur ou de la base de données).

Cette règle s'applique à tout ce qui est construit ou modifié sur ce
dépôt à partir de maintenant : nouvelles pages, nouveaux écrans,
messages d'erreur, logs visibles, réponses du bot, pages d'administration.
Les logs techniques réels (console, `error.log`, outils d'observabilité
non visibles par l'utilisateur) ne sont pas concernés.
