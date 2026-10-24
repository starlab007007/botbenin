# WAOUH Convergence · 18.32.0

## Lots livrés

1. **Fiches éclairées Web et Flutter.** Dix résultats restent accessibles par pages de cinq ou ensemble. Comparaison de deux à cinq offres, tri du prix sans modifier les identifiants métier, photos agrandissables, avis fourni, informations manquantes. Produits, services et annonces ont des libellés adaptés.
2. **Marché documenté.** Cinq références distinctes au maximum par offre, URL publique sûre, montant connu, provenance et date si disponibles. Les sources déjà renvoyées ont priorité ; à défaut, d'autres annonces de la recherche peuvent servir de repères. Une médiane exige au moins deux références explicitement comparables avec même modèle, unité et devise ; les références dérivées exigent aussi le même état du produit. Aucun prix de démonstration n'est injecté. Les services et annonces ne reçoivent pas une médiane artificielle. Cet échantillon ne représente pas tout le marché béninois.
3. **Besoin orienté résultat.** Nature, ville, repère privé, plafond facultatif, échéance, conditions de réussite, brouillon lié au compte. Trois pistes IA maximum par appel, cinq chemins au total, création manuelle disponible. L'IA ne crée ni fournisseur, ni disponibilité, ni prix.
4. **Solutions composées.** Jusqu'à dix parties par chemin : produit, intervenant, prestation ou annonce. Montants et frais inconnus restent inconnus. Un professionnel ne reçoit que les parties qui lui sont adressées ; le repère privé et le budget du demandeur sont retirés de sa vue.
5. **Accord et résultat.** Invitation privée valable sept jours, usage unique, compte professionnel authentifié. Prix total frais inclus, périmètre, exclusions, délai et résultat attendu obligatoires. Deux confirmations indépendantes de la même version. Une révision annule les accords de cette partie ; un résultat déjà confirmé ne peut plus être réécrit. Le dépassement du plafond bloque l'accord jusqu'à ajustement explicite. Résultat terminé seulement après confirmation des deux parties pour toutes les parties retenues.
6. **Ensemble.** Groupes volontaires de cinq maximum, même ville/nature, sujet public choisi et échéance. Proposition chiffrée du professionnel invité, répartition égale explicitement affichée, accord de tous sur la version courante. Toute arrivée, sortie ou modification invalide les confirmations. Pas d'économie promise ni de débit automatique.
7. **Pilote mesuré.** Vue personnelle ; vue globale réservée à l'administrateur. Besoins créés, résultats confirmés, accords bilatéraux, professionnels reliés, délai médian de proposition d’accord, révisions et appels IA. Tokens réellement retournés par le modèle et latence enregistrés dans les événements ; coût monétaire affiché comme non mesuré tant qu'aucun tarif de facturation n'est configuré.

## Accès

Web : **Missions → Organiser mon besoin**, ou **Autres actions → Organiser ce besoin** depuis une offre. Flutter : mêmes entrées. Un professionnel choisit **Invitation**, se connecte puis colle le code transmis volontairement par le demandeur. Aucun message ou invitation n'est envoyé par ce module.

Les boutons et commandes commerciales existants (Je le veux, Je le veux à…, Proposer un prix, Lancer la démarche, Confier à Bot, Suivre la réponse, transmission de l'offre au vendeur, Annuler) restent dans leurs parcours et discussions dédiés. Convergence ne simule ni paiement, ni réponse, ni disponibilité. Les annonces utilisent une préparation de réponse plutôt qu'une négociation d'achat.

## Pilotage terrain à réaliser

Objectif initial : 30 besoins réels et 15 professionnels volontaires, recrutés avec leur accord par l'équipe. Répartir les cas entre produits, services et annonces ; inclure une intervention urgente et une solution composée. Observer compréhension, première proposition, accord, réalisation, refus et abandon. Relever les informations manquantes et les désaccords sur le périmètre. Ne compter comme réussi qu'un résultat confirmé dans l'application. Les compteurs de production commencent avec les usages réels ; aucun recrutement, envoi externe ou résultat terrain n'est fabriqué par le déploiement.

## Sécurité et validation

Toutes les nouvelles tables ont RLS et aucun droit direct `anon`/`authenticated`. Deux RPC invoker sont exécutables seulement par `service_role`. L'Edge vérifie le JWT avec `auth.getUser`, dérive l'acteur de la session et rejette les actions internes demandées par un client. Verrou par besoin/groupe pour transitions atomiques, invitations stockées hachées, versions obligatoires, quota IA de dix appels/jour/compte et requête bornée avec annulation après vingt secondes. Aucun secret client, aucun jeton d'accès dans la documentation.

- `node scripts/tests/waouh-convergence-db.mjs` : PostgreSQL embarqué, droits, isolation, versions, plafond, réalisation bilatérale et groupes.
- `npx vitest run src/components/waouh/__tests__ src/lib/waouh/__tests__` : contrats et interactions de recherche, commandes canoniques.
- `npm run build` : bundle de production.
- `flutter test test/live_convergence_contract_test.dart` : mêmes fixtures que Web ; suite de parcours et compilation APK dans la CI Flutter.
- `deno check --config supabase/functions/waouh-convergence/deno.json supabase/functions/waouh-convergence/index.ts` : contrôle Edge dans la CI.

La migration est additive. Pour retirer l'interface, revenir au commit précédent côté Web/Flutter et conserver les données Convergence ; ne pas supprimer les tables contenant des accords. Le workflow Convergence redéploie uniquement sa fonction après validation sur `prod` ; il n'applique pas automatiquement toutes les migrations historiques.

La migration locale porte la version `20261024095753`, identique à celle enregistrée lors de son application par le connecteur Supabase. Le fichier initial a été créé avec la CLI puis aligné sur cet identifiant de migration appliquée.
