# Brouillon de revue Sécurité des données — WAOUH

À confirmer sur l’AAB final avant saisie dans Play Console.

## Données potentiellement collectées

- Informations personnelles : nom, e-mail, téléphone.
- Identifiants de compte et de session.
- Messages, annonces, descriptions, prix et autres contenus utilisateur.
- Photos ou documents choisis volontairement.
- Localisation approximative ou précise lorsque l’utilisateur l’autorise.
- Données techniques de diagnostic, de sécurité et de fonctionnement.

## Finalités

- Gestion du compte et authentification.
- Fonctionnalités de l’application.
- Communications et mise en relation.
- Prévention de la fraude, sécurité et conformité.
- Assistance et diagnostic.

## Prestataires à confirmer dans l’AAB final

- Supabase.
- Google Sign-In.
- Services WhatsApp lorsque ces fonctionnalités sont activées.
- Tout SDK de notification, d’analyse, de crash ou d’IA effectivement compilé et utilisé.

## Déclarations à ne pas finaliser sans contrôle

- « Données non partagées » : vérifier la définition Google Play et tous les prestataires.
- « Suppression disponible » : publier la page externe ET fournir le chemin depuis l’application.
- « Chiffrement en transit » : vérifier que tous les endpoints de production utilisent HTTPS.
