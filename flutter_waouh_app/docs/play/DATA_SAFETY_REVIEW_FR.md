# Revue « Sécurité des données » — Google Play

Ce document est un support de revue avant remplissage de la déclaration dans Play Console. Il ne doit pas être copié sans vérifier la version AAB finale, les Edge Functions réellement déployées et les prestataires utilisés.

## Données visibles dans la version Flutter / backend WAOUH

| Catégorie Play Console | Donnée | Collectée quand | Finalité | Obligatoire ? |
|---|---|---|---|---|
| Informations personnelles | Nom, e-mail, numéro de téléphone | Création/connexion/profil, WhatsApp OTP | Authentification, profil, assistance | Nom/e-mail/téléphone selon méthode choisie |
| Contenu utilisateur | Messages, annonces, prix, descriptions | Chat, statuts, ventes/recherches | Messagerie, matching, affichage des annonces | Oui pour utiliser la fonction concernée |
| Photos et vidéos | Images jointes | Choix volontaire depuis caméra/galerie | Publication et messagerie | Non |
| Position | Localisation approximative ou précise | Choix explicite de l’utilisateur | Ville, contexte d’annonce, mise en relation locale | Non |
| Identifiants | ID de compte, ID de session | Utilisation de l’application | Session, sécurité, synchronisation | Oui pour les fonctions connectées |
| Informations sur l’application | Données techniques d’erreur et de session | Fonctionnement du service | Fiabilité, sécurité, diagnostic | Oui pour les fonctions connectées |

## Prestataires à confirmer

- Supabase : authentification, base de données, stockage de médias et Edge Functions.
- Google Sign-In : uniquement si la connexion Google reste activée dans l’AAB final.
- Service d’acheminement WhatsApp : uniquement lorsque la messagerie WhatsApp est proposée et activée.
- Firebase : ne le déclarer que si `firebase_core` / `firebase_messaging` est initialisé et utilisé dans l’AAB final. Sinon retirer les dépendances inutilisées avant soumission.

## Réponses à confirmer dans Play Console

1. L’application collecte-t-elle des données ? **Oui**.
2. Les données sont-elles chiffrées en transit ? **Oui**, sous réserve que toutes les URLs de production restent en HTTPS.
3. Les utilisateurs peuvent-ils demander la suppression de leur compte ? **À finaliser avant publication** : l’écran profil et le processus backend doivent fonctionner réellement, et l’URL de suppression doit être publique.
4. Les données sont-elles partagées ? Répondre après revue juridique des prestataires. Ne pas déclarer « non » si les données sont transmises à un opérateur de messagerie, à un prestataire d’hébergement ou à un partenaire au sens des définitions Play applicables.

## Blocage de publication

Ne finalisez pas cette déclaration avant d’avoir :

- exécuté une authentification e-mail, Google et WhatsApp OTP réelle ;
- vérifié l’envoi d’une photo, d’un message et d’une localisation ;
- listé les SDK réellement compilés dans l’AAB ;
- confirmé l’adresse publique de la politique de confidentialité ;
- mis en production un mécanisme de demande de suppression de compte.
