# Protocole de test fermé — WaouhApp 1.3.0

## Objectif

Valider l’installation, l’ouverture, l’authentification, les parcours Chat/Statut/Match, la synchronisation et les permissions avant tout passage en production.

## Comptes de test

Créer au minimum deux comptes de test sans données personnelles réelles :

- `vendeur-test` : publie une vente de tomates à 200 FCFA avec une photo de démonstration.
- `acheteur-test` : recherche des tomates à Cotonou avec un budget de 200 FCFA.

Ne pas utiliser des mots de passe par défaut partagés. Utiliser des mots de passe uniques ou des comptes WhatsApp de test.

## Cas de test obligatoires

| ID | Parcours | Résultat attendu |
|---|---|---|
| A01 | Installation depuis le canal interne | L’app s’installe, ouvre WaouhApp et ne montre jamais « Flutter Demo Home Page ». |
| A02 | Lancement à froid puis retour depuis arrière-plan | Pas de crash, état de session cohérent. |
| A03 | Inscription / connexion e-mail | Compte créé ou connecté, profil visible. |
| A04 | Google Sign-In | Tester seulement si configuré avec les identifiants Android de production. |
| A05 | WhatsApp OTP | Le code est réellement reçu ; code expiré, faux code et renvoi sont gérés sans message technique. |
| C01 | Vendeur : « Je vends tomates 200 FCFA » avec photo | Annonce ou conversation créée, média stocké et affiché. |
| C02 | Acheteur : « Je cherche tomates 200 FCFA » | Réponse WAOUH reçue et contexte produit cohérent. |
| C03 | Notification de mise en relation | Le vendeur ou l’acheteur ciblé voit une notification et l’ouverture mène à la bonne discussion produit. |
| C04 | Fenêtre de match | Texte, photo, boutons payload et historique sont visibles après réouverture. |
| C05 | Archive de discussion | La discussion quitte la liste active et apparaît dans les archives si cette vue est proposée. |
| S01 | Statut Vente avec prix, photo et localisation | Statut publié, photo visible, expiration 24 h correcte. |
| S02 | Réponse à un statut | Le chat s’ouvre avec le bon contexte produit/statut. |
| O01 | Mode avion après ouverture | Les éléments récemment chargés restent visibles ; aucune perte de brouillon. |
| O02 | Message créé hors ligne puis réseau rétabli | L’action est marquée en attente puis synchronisée une seule fois. |
| P01 | Refus caméra | L’application reste utilisable et explique simplement l’action alternative. |
| P02 | Refus localisation | L’utilisateur peut continuer sans GPS. |
| P03 | Refus notifications | Le centre de notifications interne reste accessible. |
| D01 | Demande de suppression de compte | Le parcours est disponible, clair et réellement traité par le backend avant production. |

## Matériel minimal

- Un téléphone Android récent avec Google Play Services.
- Un téléphone Android sous une version plus ancienne compatible avec minSdk 23.
- Réseau Wi‑Fi, puis données mobiles, puis mode avion.
- Deux comptes utilisateurs distincts.

## Critères de sortie du test fermé

- Aucun crash bloquant dans les parcours A01 à D01.
- Aucun code OTP ou erreur backend brute affiché à l’utilisateur.
- Les messages et notifications de test ont une trace dans Supabase.
- Les images et la localisation sont demandées seulement au moment utile.
- Tous les défauts critiques et majeurs sont corrigés, retestés et consignés.

## Publication

Pour les comptes Play personnels créés après le 13 novembre 2023, maintenir au moins 12 testeurs inscrits au test fermé pendant 14 jours consécutifs avant de demander l’accès à la production. Consigner leurs retours et les corrections réalisées.
