# Deal Room vivante : avatar, politique C0–C5 sans impasse, suivi (2026-09-29)

## Ce qui a été demandé, et ce qui a été décidé
Demande : politique de contactabilité corrigée, entrée directe en Deal Room « sans les autorisations », avatar qui note les points d'avancement, fait la synthèse après
« Envoyer mon offre », assure le suivi, évite tous les blocages, chat dynamique et premium.

**Décision de conception — le consentement du tiers n'est pas contourné.** Le vendeur externe n'a pas accepté d'être contacté : lui écrire sans voie autorisée serait du
démarchage non sollicité (risque légal et de réputation, et la plateforme s'appuie sur ces garde-fous). En revanche, *aucune autorisation n'est nécessaire pour entrer en
Deal Room* (côté acheteur, c'est le cas depuis l'étape précédente), et les blocages viennent des impasses, pas du consentement. Elles sont supprimées :

| Niveau | Avant (impasse après le tap) | Maintenant |
|---|---|---|
| C0 (aucun canal) | « contact_not_permitted » | Deal Room ouverte ; bouton **Garder en veille** ; si l'acheteur tape « Envoyer », l'avatar met en veille (aucun refus sec) |
| C1 (contact public pro) | « contact_not_found » si aucun contact public | Voie « envoi au tap » **seulement si** un contact public existe (vérifié avant d'afficher le bouton) ; sinon veille |
| C2 (médié) | idem | Relais validé par l'annonceur (jusqu'à 24 h) ou veille |
| C3 / C4 | idem | Contact vérifié / établi : envoi au tap |
| C5 | – | Négociation dans WAOUH |
| Invité sans jeton | refus | Voie « connexion requise », jamais d'envoi |

Module : `_shared/waouh-contact-path.ts` (pur, testé : chaque niveau × joignable/non/inconnu donne toujours une voie).

## L'avatar
- **Points d'avancement** (6) : Annonce vérifiée → Deal Room ouverte → Offre préparée → Offre transmise (ou « En veille · contact recherché ») → Suivi actif → Réponse du vendeur.
  Renvoyés par le serveur (`avatar.progress`, `meta.avatar_progress`), affichés en stepper Web et Flutter.
- **Synthèse à l'envoi** : offre vs prix affiché, écart en %, posture (proche / réaliste / ambitieuse), prix conseillé si offre très ambitieuse, voie de contact et délai attendu, prochain point de suivi.
- **Suivi** : `waouh-nexus-followup` (tick horaire, réservé à la clé service, inactif si `nexus_direct_deal` est coupé). Rappels à 24 h et 72 h, clôture proposée à 7 jours ; en veille,
  note « Vendeur joignable » quand une voie s'ouvre, clôture de veille à 14 jours ; annonce disparue → l'acheteur est prévenu.
  **L'avatar n'envoie jamais rien au tiers** : il écrit des notes avec boutons (**Relancer le vendeur**, **Envoyer mon offre**, **Modifier mon offre**) ; l'envoi reste un tap
  (test de garde : le module de suivi ne contient aucun appel d'envoi). Une relance manuelle est limitée à une par 24 h.
- **Aucun bouton qui échoue** : les boutons sont calculés selon la voie réelle (envoi, veille, relance due) et reflètent l'action qui vient d'aboutir (plus de « Envoyer mon offre »
  qui réapparaît juste après l'envoi).

## Bogues trouvés par le scénario réel
1. `waouh_negotiations.offer_price` n'existe pas : la requête échouait silencieusement et le message envoyé au vendeur externe **omettait le montant de l'offre** (présent depuis l'étape Nexus
   précédente). Corrigé, vérifié : « … à 130 000 FCFA ».
2. Un double tap sur « Envoyer mon offre » écrivait un second message « transmise », décalant le calcul des relances : maintenant « en attente de réponse », sans second envoi.

## Vérifications
- Deno 270, Vitest 229, Flutter 160.
- Projet de test, vraies fonctions (cœur agentique remplacé par un **double de test** `scripts/waouh-chat/test-project/stubs/`, jamais déployé en production) :
  `scenarios-avatar.mjs` 14/14 (stepper, envoi, synthèse −13 %, double tap, relance trop tôt, C0 → veille, relance après 24 h, voie qui s'ouvre → envoi), `scenarios-nexus.mjs` 13/13,
  `scenarios-hardening.mjs` 6/6. Le journal du double confirme : un seul envoi par offre, une seule relance, C0 jamais envoyé avant l'ouverture d'une voie.

## Limites (honnêtes)
- **Le tick de suivi n'a pas tourné pour de vrai** : il exige la clé service, que je n'ai pas (et n'irai pas chercher). Sa logique est couverte par 8 tests sur base simulée (rappels, veille,
  dédoublonnage, erreurs isolées) ; l'affichage des relances due se vérifie en réel via l'action (V7/V9). Planification : installer `waouh_schedule_nexus_followup()` (migration
  `20260929150000`) après création des secrets Vault `waouh_nexus_followup_url` et `waouh_service_key` — rien n'est planifié automatiquement.
- L'envoi réel vers un tiers reste à vérifier en production sur un signal C1–C4 avec compte de test (le double ne prouve que notre côté du contrat).
- La détection de « réponse du vendeur » ne voit que les réponses arrivées dans le fil ; une réponse WhatsApp hors WAOUH n'arrête pas les rappels (l'acheteur peut clore).
- Interface non exécutée visuellement (tests de rendu Web et Flutter seulement). Pas d'animation « immersive » au-delà du stepper pulsé et de la jauge : c'est un choix de sobriété, pas de démonstration visuelle.
