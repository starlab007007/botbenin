# Captures Google Play — WaouhApp

Les captures doivent être prises depuis l’AAB final installé par le canal de test interne ou fermé. Ne pas utiliser de maquettes, de données personnelles réelles, de barres de notifications encombrées ni d’écrans de chargement.

## Format cible

- Téléphone Android portrait : 1 080 × 1 920 px, PNG ou JPEG 24 bits, sans transparence.
- Conserver au moins quatre captures 9:16 de haute qualité.
- Utiliser des données de démonstration : produits fictifs, prix fictifs, photos dont vous possédez les droits.

## Liste des quatre captures prioritaires

| Fichier | Écran à afficher | Contenu de démonstration | Texte alternatif Play Console |
|---|---|---|---|
| `01_accueil_discussions.png` | Accueil Chat, onglet Discussions | Liste avec WAOUH, une conversation produit et la navigation | Discussions WAOUH et accès aux modules de l’application |
| `02_recherche_produit.png` | Chat WAOUH | Demande : « Je cherche une veste Zara à Cotonou » | Conversation WAOUH préparant une recherche de produit |
| `03_vente_photo_localisation.png` | Publication d’un statut Vente | Tomates, 200 FCFA, photo de démonstration et ville | Formulaire de vente avec photo, prix et localisation facultative |
| `04_conversation_produit.png` | Fenêtre de discussion liée à un produit | Conversation fictive entre vendeur et acheteur | Discussion liée à une annonce avec boutons de réponse |

## Captures facultatives

| Fichier | Écran |
|---|---|
| `05_statuts_24h.png` | Liste des statuts et compteur de validité |
| `06_notifications.png` | Centre de notifications avec un match produit |
| `07_profil_autorisations.png` | Profil, sans données sensibles réelles |
| `08_outils_ia.png` | Module IA s’il est stable et entièrement fonctionnel |

## Commande de capture depuis un téléphone USB

```bash
mkdir -p "$HOME/Desktop/WaouhApp-Play-Screenshots"
adb exec-out screencap -p > "$HOME/Desktop/WaouhApp-Play-Screenshots/01_accueil_discussions.png"
```

Prendre les captures une par une après avoir navigué manuellement à l’écran exact. Vérifier ensuite les dimensions :

```bash
sips -g pixelWidth -g pixelHeight "$HOME/Desktop/WaouhApp-Play-Screenshots/01_accueil_discussions.png"
```

## Contrôle avant import Play Console

- L’interface affichée existe dans l’AAB soumis.
- Aucune donnée personnelle, code OTP, adresse e-mail, numéro de téléphone ou secret n’est visible.
- Les photos sont autorisées et ne contiennent pas de marque tierce sans droit.
- Les trois premières captures montrent l’interface réelle, sans cadre de téléphone ajouté.
- La barre d’état ne montre pas de notifications privées.
