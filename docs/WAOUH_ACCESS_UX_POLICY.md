# WAOUH — Politique canonique d’accès, authentification et messages UI

## Principe produit

**Consulter sans compte, agir avec un compte.**

Un visiteur peut comprendre WAOUH, parcourir les surfaces de découverte et consulter les informations publiques sans créer de compte. Une authentification est demandée au moment où l’utilisateur veut créer, modifier, envoyer, négocier, suivre ou administrer une information personnelle ou métier.

## Matrice d’accès

| Surface / action | Invité | Authentifié | Admin |
| --- | --- | --- | --- |
| Accueil WAOUH / Chat d’entrée | Consultation | Oui | Oui |
| Avatar — accueil / démonstration | Consultation | Oui | Oui |
| NEXUS — découverte / comparaison / sources publiques | Consultation | Oui | Oui |
| NEXUS — partage, Scout, mandat, contact | Connexion requise | Oui | Oui |
| Radar — carte / signaux publics autorisés | Consultation | Oui | Oui |
| Pointage présence public (`/app/presence/checkin`) | Oui | Oui | Oui |
| AprèsBac IA / FA IA publics | Oui | Oui | Oui |
| Ouvrir une conversation personnelle | Connexion requise | Oui | Oui |
| Envoyer un message / intérêt / proposition | Connexion requise | Oui | Oui |
| Acheter / vendre / demander via Avatar | Connexion requise | Oui | Oui |
| Négociation / Deal Room | Connexion requise | Oui | Oui |
| Missions / veilles / validations Avatar | Connexion requise | Oui | Oui |
| Diffusion | Connexion requise | Oui selon droits | Oui |
| Bots / Agents IA / WhatsApp | Connexion requise | Oui selon droits | Oui |
| Partenaire / stock / présence interne | Connexion requise | Oui selon rôle | Oui |
| Profil / notifications | Connexion requise | Oui | Oui |
| Administration | Non | Non sans rôle admin | Oui |

## Parcours de connexion

1. L’utilisateur reste sur la surface publique tant qu’il consulte.
2. Une action privée déclenche la connexion avant toute écriture backend.
3. La destination et l’intention sont conservées dans `next`.
4. Après authentification, retour vers la destination demandée.
5. Les redirections externes et les boucles vers les écrans d’auth sont refusées.
6. Google, email et WhatsApp utilisent la même logique de retour.

## Déconnexion

- Déconnexion locale de l’appareil courant.
- Purge des caches de session WAOUH liés au compte.
- Retour vers `/app/chat`, qui reste utilisable en mode invité.
- Une erreur de déconnexion ne provoque pas de navigation mensongère : l’utilisateur reste sur place et reçoit un message lisible.

## Règle des messages d’erreur

Les erreurs détaillées restent dans les logs techniques. L’interface n’affiche jamais directement :

- `PostgrestError`, `FunctionException`, `AuthException` ;
- stack traces, SQLSTATE/PGRST, JWT, URL Supabase ;
- réponses JSON brutes ;
- noms de fonctions Edge ou détails d’infrastructure ;
- messages du fournisseur non destinés à l’utilisateur.

L’UI affiche une catégorie stable et actionnable :

- **Session expirée** → « Reconnectez-vous pour continuer. »
- **Réseau indisponible** → « Vérifiez votre connexion puis réessayez. »
- **Délai dépassé** → « Réessayez dans quelques instants. »
- **Non autorisé** → « Votre compte n’a pas accès à cette action. »
- **Élément introuvable** → « Ce contenu n’est plus disponible. »
- **Trop de tentatives** → « Patientez avant de réessayer. »
- **Service indisponible** → « Réessayez dans quelques instants. »
- **Enregistrement / envoi / upload / suppression** → message spécifique à l’action.

## Notifications

- Succès : confirmer l’action réellement terminée.
- Avertissement : expliquer l’état et la prochaine action.
- Erreur : message fonctionnel, jamais diagnostic système.
- Une opération asynchrone ne doit pas afficher « succès » tant que l’écriture métier n’est pas confirmée.
- Les notifications personnelles ne sont chargées qu’après authentification.

## Références code

Web :
- `src/lib/waouhAccessPolicy.ts`
- `src/lib/userFacingError.ts`
- `src/contexts/AuthContext.tsx`
- `src/app-mobile/guards/RequireMobileAuth.tsx`

Flutter :
- `flutter_waouh_app/lib/live/access_policy.dart`
- `flutter_waouh_app/lib/live/user_message.dart`
- `flutter_waouh_app/lib/main.dart`

Les tests de contrat sont intégrés aux workflows Web et Flutter.
