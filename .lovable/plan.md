# Audit base de données et nettoyage avant production

## Ce que l'audit a déjà trouvé (lecture seule)
- 247 comptes utilisateurs : on les garde tous.
- Une seule base pour tout (Web, Flutter, WhatsApp) : on la garde telle quelle.
- Chat : 9 369 messages, 427 fenêtres (383 fermées), 388 négociations, 148 ventes, 2 768 notifications.
- Données de test repérées : 105 articles au titre de test (« test », « audit », « e2e », « Bic »), 11 messages de test, 45 lancements de tests automatiques.
- File d'envoi WhatsApp : 1 521 échecs anciens, 18 messages en attente (numéro déconnecté).
- 13 759 visiteurs anonymes du chat Web sans compte.
- Restes lourds : copies d'anciennes tables vidées (anciens messages WhatsApp 35 Mo, vidéos 31 Mo).

## Étape 1 : rapport complet, sans rien changer
- Ajouter le rapport `docs/AUDIT_BASE_DONNEES_2026-10-19.md` : chaque table classée en **Garder** (comptes, profils, rôles, boutiques, partenaires, abonnements, paiements, AprèsBac, FA), **Chat à évaluer**, **Test à purger**, **Inutilisée**.
- Liste exacte des données de test : comptes de test, articles, fenêtres, négociations, ventes et notifications qui y sont liés.
- Chat : garder les vraies discussions entre vrais utilisateurs. Purger les messages de test, les relances techniques en double et les fenêtres fermées depuis plus de 90 jours sans vente.

## Étape 2 : sauvegarde avant de supprimer
- Export CSV des tables touchées dans vos Fichiers.

## Étape 3 : nettoyage, après votre accord sur la liste
Dans cet ordre : notifications → messages → fenêtres → négociations / ventes → intérêts → articles de test → lancements de tests. Puis :
- Vider les envois WhatsApp en échec de plus de 30 jours (garder les 18 en attente).
- Supprimer les visiteurs anonymes de plus de 60 jours qui n'ont aucun message.
- Retirer les photos de test du stockage.
- Libérer la place prise par les tables vidées.

## Étape 4 : contrôle après nettoyage
- Recompter : 247 comptes toujours présents, aucun message ni article orphelin, la vérification automatique du chat sans anomalie.
- Les tests du chat (244) passent toujours.

## Ce que je ne touche pas
Comptes, rôles, profils, paiements, abonnements, structure de la base, aucune suppression de table.

## Points à confirmer
- Les comptes de test (ex. comptes d'audit) : on garde seulement le compte, ou on supprime aussi ses données ?
- Les articles « Bic » : test ou vrais produits ?
