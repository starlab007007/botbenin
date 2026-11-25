# Raccordements NEXUS : bilan et marche à suivre

## Bilan (lu dans la base aujourd'hui)

- 46 rubriques dans l'annuaire, réparties sur 37 sites.
- **Aucune n'a réussi son essai complet.** C'est pour ça que le compteur affiche 0/46.
- Seules les 3 rubriques CoinAfrique sont reliées à un collecteur. Un de leurs essais a échoué.
- Afribaba : 4 rubriques, aucune reliée, un essai échoué.
- Aucun site n'est encore marqué « autorisé ». Le statut de chacun :
  - **À l'étude (12 sites)** : CoinAfrique, Afribaba, GoAfrica, BambaAd, Niosso, E-Bénin, BJemploi, Obeynet, BazarAfrique, Banabaana, Ahiyoyo.
  - **Non vérifiés (16 sites)** : sites d'immobilier, d'emploi et annuaires (PagesJaunes, BéninAnnuaire, Jumia House…).
  - **Partenariat obligatoire (9 sites)** : Facebook, Instagram, TikTok, LinkedIn, Indeed, Glassdoor, Google, WhatsApp Business, Classi4u.

Les 9 sites de la dernière catégorie ne peuvent pas être lus de façon fiable sans accord ou accès officiel. Ils resteront en attente.

## Comment procéder : par vagues, pas les 46 d'un coup

Chaque rubrique suit les 5 étapes que vous avez décrites : accès, collecte, extraction, enregistrement, affichage dans NEXUS avec la source.

**Vague 1 – CoinAfrique (3 rubriques)**
1. Choisir un seul mode de lecture. Aujourd'hui il y a un collecteur direct, alors que l'annuaire prévoit Apify. Je propose de garder le direct, qui marche déjà, et d'aligner l'annuaire dessus.
2. Remplir la mention de la source et l'autorisation, puis passer le site en « autorisé ».
3. Lancer l'essai de chaque rubrique. Si un essai échoue, corriger la lecture du prix, de la ville, des photos et des contacts.
4. Relier les rubriques, vérifier que les fiches arrivent dans la base et se mettent à jour.
5. Chercher dans NEXUS et vérifier que les résultats montrent bien « CoinAfrique ».

**Vague 2 – petites annonces généralistes (8 sites)**
Afribaba, BambaAd, Niosso, E-Bénin, Obeynet, BazarAfrique, Banabaana, Ahiyoyo. Le lecteur de petites annonces existe déjà pour la plupart d'entre eux. Il faut corriger l'échec d'Afribaba, puis suivre les mêmes étapes que pour CoinAfrique.

**Vague 3 – emploi, immobilier, annuaires (17 sites)**
Il faut d'abord vérifier que chaque site est accessible et que ses conditions permettent la collecte. Ensuite, on utilise la lecture des pages produit standard ou un lecteur dédié par famille de sites.

**Vague 4 – réseaux sociaux et grandes plateformes (9 sites)**
Il n'y a pas de collecte automatique possible. Il faut un partenariat ou un accès officiel, ou passer par Apify si vous l'acceptez. Dans l'annuaire, ces rubriques resteront marquées « partenaire requis ».

À la fin de chaque vague, je vous donne un compte rendu : rubriques validées, nombre de fiches collectées, exemple de recherche NEXUS.

## Ce dont j'ai besoin de vous
- Votre accord sur l'ordre des vagues.
- Si vous voulez Apify, il faut le connecter. Je vous proposerai la carte de connexion le moment venu.
- Pour chaque site, la confirmation qu'on a le droit de collecter ses annonces : référence et mention de la source.

WhatsApp n'est pas concerné : c'est un raccordement séparé, à reconnecter par code QR.

## Détails techniques
- Tables : `waouh_collection_platforms` (access_state, transport, adapter_key), `waouh_collection_entries` (target_id, test_status, test_config_hash).
- Validation = essai à blanc `passed` avec un hash de configuration correspondant, puis `waouh_collection_connect_entry`.
- Vague 1 : mettre `transport='direct'` pour bj.coinafrique.com, compléter rights_reference et attribution, puis lancer l'essai et le raccordement.
- Ajouter un test pour chaque adaptateur corrigé dans `_shared/waouh-collection`.
