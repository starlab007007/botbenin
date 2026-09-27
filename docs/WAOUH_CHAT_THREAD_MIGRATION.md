# WAOUH Chat v2 — thread canonique, écrivain unique, réconciliation

Lot du 27/09/2026, construit sur `prod` @ `8c909bae` (26/09/2026 19:14).
Parcours concerné : Intérêt → Négociation → Accord → Préparation → Livreur → Livraison → Paiement.

## 1. En bref

- **Une conversation = un thread** (`waouh_chat_threads` : article × acheteur × vendeur × cycle). Chaque message de Deal Room porte ce thread, et rôle, contrepartie, article, négociation et deal en sont **dérivés côté serveur**.
- **Un seul écrivain** : `waouh_record_chat_message()` (SQL) / `recordChatMessage()` (TS), utilisé par les 5 chemins qui écrivent des messages entre acheteur et vendeur.
- **Une seule mécanique de décision** : le moteur principal (`waouh-webhook`) confie ses OUI/NON/contre-offres au routeur canonique (transition atomique) au lieu de les traiter lui-même.
- **Plus de silence** : toute issue (action refusée, erreur, bouton périmé) produit une réponse explicite, sur le web comme sur WhatsApp.
- **Détecter → réparer** : `waouh_reconcile_chat_integrity()` mesure et répare, avec un mode rapport par défaut et un bouton admin.
- **Tout est réversible sans redéploiement** : les changements d'architecture sont derrière l'interrupteur `chat_writer_v2`, livré **désactivé**.

## 2. Ce que l'audit a établi

| # | Constat (vérifié dans le code de prod) | Effet visible |
|---|---|---|
| 1 | 9 endroits écrivent dans `waouh_messages`, chacun avec sa propre règle de rattachement ; seuls 2 renseignent `thread_id`. | Fenêtres mélangées, messages absents. |
| 2 | L'historique **et** le temps réel filtrent la fenêtre vendeur sur `meta.counterpart_user_id`/`meta.buyer_user_id`, que les évènements de `waouh-deal-ops` ne portent pas. | Le vendeur ne voit jamais « livreur assigné / livré / paiement confirmé » dans la fenêtre produit. |
| 3 | `pushDealChatEvent` choisit la conversation par `.limit(1)` sans filtre ; la copie de `_shared/waouh-deal.ts` n'est importée nulle part (code mort). | Évènements rangés au hasard côté opérateur. |
| 4 | Sur WhatsApp, l'identifiant du bouton touché est perdu (on lit le libellé) ; « 💬 Contre-proposer » part vers le moteur général, ou son UUID est lu comme un prix (`…a123…` → offre de 123 FCFA). | Intentions qui ne correspondent pas, fausses contre-offres. |
| 5 | L'acheteur reçoit « ✅ Accepter le prix » sur l'écho de **sa propre offre**, et le routeur n'empêche pas d'accepter sa propre offre. | Deal créé et article réservé **sans l'accord du vendeur**. |
| 6 | `waouh-webhook` garde un second moteur de négociation : acceptation sans deal ni transaction, « contactez-le pour la remise » (contraire au parcours livreur), négociation « la plus récente » sans thread. | Accords sans deal (mesurés par le health-check), mauvaise négociation ciblée. |
| 7 | Une action refusée par `waouh-deal-ops` ou une erreur du routeur remonte en HTTP 500. | Aucune réponse sur WhatsApp, « Message non envoyé » sur le web. |
| 8 | Réponses de négociation reçues par WhatsApp enregistrées avec `article_id = NULL` et `buyer_user_id = contrepartie`. | Réponses invisibles dans la fenêtre web. |
| 9 | `aiIntent.test.ts` testait une **copie** du parseur, pas le code exécuté. | Tests verts sans protection réelle. |

Corrections apportées à l'audit initial après lecture complète :
- la colonne `waouh_messages.thread_id` **existe** en production (ajoutée hors migration, visible dans `src/integrations/supabase/types.ts`) : les insertions qui la renseignent n'échouaient pas ; le problème est que 7 écrivains sur 9 ne la renseignent pas ;
- le routeur répondait déjà quand l'intention était inconnue : les silences venaient des erreurs non gérées (constat 7) ;
- `waouh_conversations` est **conservée** : elle porte la conversation principale avec l'assistant. Seul son usage arbitraire pour les évènements de deal disparaît (via l'écrivain unique) ;
- la contrainte finale ne peut pas porter sur toute la table (voir §7).

## 3. Ce qui change, fichier par fichier

Légende : **A** = toujours actif dès le déploiement (correctif ciblé) · **V2** = actif seulement quand `chat_writer_v2` est activé.

| Fichier | Changement | Mode |
|---|---|---|
| `supabase/migrations/20260927120000_…_thread_base.sql` | Filets défensifs (no-op en prod), index, interrupteurs `chat_writer_v2` (OFF) et `chat_reconcile` (rapport), `waouh_same_person()`, écrivain `waouh_record_chat_message()`, accès réservé à `service_role`. | — |
| `supabase/migrations/20260927120500_…_backfill.sql` | Installe le backfill et la vue de suivi, **sans exécuter automatiquement le backfill**. L'historique est traité ensuite par lots audités et uniquement sans ambiguïté. | — |
| `supabase/migrations/20260927121000_waouh_chat_reconcile.sql` | `waouh_reconcile_chat_integrity(mode, taux)` + tick pg_cron 15 min en mode `auto`. | — |
| `supabase/deferred/20260927130000_…_constraint.sql` | Phase 6, **hors** `migrations/` : à exécuter à la main (§7). | — |
| `_shared/waouh-chat-writer.ts` (+ test) | Enveloppe TS, interrupteur **fermé par défaut** (cache 30 s), résolution de thread sûre. | — |
| `_shared/waouh-commands.ts` (+ test) | Registre unique des boutons (générateurs + alias historiques), identifiant WAHA, libellé → identifiant, `parseDealCommand` (déplacé depuis channel-in). | A |
| `_shared/waouh-negotiation-intent.ts` (+ test) | Parseur de négociation testé : UUID jamais lu comme prix, « ok pour 7500 » = offre, bornes 100 à 100 000 000, sortie IA validée, `canAcceptOffer`. | A |
| `_shared/waouh-commerce-states.ts` (+ test) | Machine à états déclarée ; transitions opérateur **identiques** à l'historique (test d'équivalence). | A |
| `_shared/waouh-sync.ts` | `pushSyncedEvent` : champ `threadId` (déjà envoyé par buyer-interest, jusqu'ici ignoré) ; ligne via l'écrivain unique. | V2 |
| `waouh-deal-ops` | Évènements de livraison/paiement rattachés au thread du deal. Transitions via la machine à états ; boutons via le registre. | V2 / A |
| `waouh-negotiation-router` | Parseur partagé ; refus d'accepter sa propre offre ; invitation à saisir un montant ; erreur technique = réponse (409) au lieu de 500. `pushToOther` via l'écrivain unique. | A / V2 |
| `waouh-channel-in` | Identifiant de bouton WhatsApp (et libellé → identifiant) ; un bouton n'agit que sur **sa** négociation ; action refusée ou erreur = réponse ; réponses à l'acteur via l'écrivain unique. | A / V2 |
| `waouh-webhook` | OUI/NON/contre-offre délégués au routeur canonique quand la négociation a un thread ; plusieurs négociations ouvertes = on demande laquelle ; `pushToOther` via l'écrivain unique. | V2 |
| `waouh-buyer-interest` | Plus de boutons de décision pour l'acheteur sur sa propre offre ; 2 erreurs de typage préexistantes corrigées. | A |
| `waouh-match-history` | Le thread demandé fait foi (règle déjà appliquée par Flutter) ; un cycle ouvert prime sur un cycle clos. | A |
| `waouh-health-check` | Inchangé : aucune télémétrie d'intégrité supplémentaire n'est exposée publiquement. | — |
| `waouh_admin_reconcile_chat()` (RPC) | Réconciliation à la demande, **admin uniquement**, sans consommer de nouveau slot Edge Function. | — |
| `src/components/waouh/WaouhMatchChatWindow.tsx` | Temps réel : le thread canonique fait foi (parité Flutter), resynchronisation si un autre cycle arrive. | A |
| `src/pages/admin/AdminWaouhHealthCheckPage.tsx` | Carte « Réconciliation du chat » : Analyser / Réparer maintenant. | A |
| `src/components/admin/WaouhAdminCommandCenter.tsx` | Les 2 nouveaux modules, avec bascule d'automatisation. | A |
| `src/components/waouh/waouhChatSyncLock.ts` (+ test) | Verrou du flux passé en v14 : remplace l'invariant `23505` (retiré le 26/09 par `c4790f66` sans mise à jour du verrou — test déjà rouge en prod) et ajoute les invariants de ce lot. | — |
| `supabase/config.toml` | `waouh-chat-reconcile` : `verify_jwt = false` (contrôle admin dans la fonction), comme les autres fonctions WAOUH. | — |

**Volontairement non modifiés** : Flutter (`flutter_waouh_app/`) — il applique déjà la règle « thread d'abord » (`liveMessageBelongsToMatch`) et bénéficie directement des lignes correctement renseignées et de `waouh-match-history` ; `waouh-outbound-dispatch` (robuste) ; écrivains hors Deal Room : signal radar (avant tout thread), console opérateur, fonction de test e2e, miroir partenaire, conversation principale avec l'assistant.

## 4. Activation (ordre recommandé)

1. **Appliquer le lot** sur une branche partie de `prod` (voir `README` du paquet), relire le diff, ouvrir une PR, fusionner.
2. **Déployer** : `SUPABASE_PROJECT_REF=… ./scripts/waouh-chat/deploy.sh` (plan) puis `--apply`.
   État après déploiement : correctifs **A** actifs, chemin **V2** inactif, réconciliation en **rapport**.
3. **Mesurer (J0)** : Admin › Health Check › « Réconciliation du chat » › *Analyser*. La carte appelle directement le RPC `waouh_admin_reconcile_chat()` avec contrôle de rôle admin ; aucune télémétrie v2 supplémentaire n’est exposée par `waouh-health-check`. Noter les compteurs.
4. **Backfill historique optionnel et contrôlé** : lancer d’abord `scripts/waouh-chat/backfill.sh` (rapport uniquement). Après validation, utiliser `WAOUH_BACKFILL_BATCH_SIZE=100 WAOUH_BACKFILL_MAX_BATCHES=1 scripts/waouh-chat/backfill.sh --apply`, puis augmenter progressivement si les compteurs restent cohérents.
5. **Activer l'écrivain unique** : Command Center › « Chat — écrivain unique (v2) » › activer le module **et** l'automatisation.
   Effet en moins de 30 s (cache par instance). Tester un parcours complet sur un article de test :
   intérêt → contre-offre (web et WhatsApp) → accord → confirmation vendeur → choix de paiement → livreur → livré → payé.
   Vérifier côté **vendeur** que les étapes de livraison et de paiement apparaissent dans la fenêtre du produit.
6. **Observer 48 h** : messages de Deal Room écrits sans thread (replis sur l'ancien chemin) :
   ```sql
   select count(*) from public.waouh_messages
   where thread_id is null and created_at > now() - interval '48 hours'
     and ((meta->>'deal_id') is not null or (meta->>'negotiation_id') is not null);
   ```
   Doit tendre vers 0 (hors négociations historiques sans thread, que R2 rattache).
7. **Activer la réparation automatique** : Command Center › « Chat — réconciliation automatique » › automatisation.
   Pour la règle R6 (accord sans deal), renseigner le taux de commission dans les métadonnées du module
   (`{"commission_rate": 0.05}` — même valeur que `WAOUH_COMMISSION_RATE`) ; sans taux, R6 reste en rapport.
8. **Phase 6** (facultative, après 48 h propres) : §7.

## 5. Retour arrière

| Niveau | Action | Délai |
|---|---|---|
| Écrivain unique / routage unifié | Command Center › désactiver « Chat — écrivain unique (v2) ». Tous les appelants reprennent l'ancien chemin, inchangé. | ≤ 30 s |
| Réparations automatiques | Command Center › couper l'automatisation « Chat — réconciliation automatique » (retour en rapport) ou le module (arrêt). | immédiat |
| Correctifs toujours actifs (A) | Redéployer la version précédente de la fonction concernée (`supabase functions deploy` depuis `prod` @ `8c909bae`). | minutes |
| Base de données | Rien à défaire en urgence : les migrations sont additives et inactives. Si besoin : `drop function waouh_record_chat_message(...)`, `waouh_reconcile_chat_integrity(...)`, `select cron.unschedule('waouh-chat-reconcile-tick')`. | — |
| Phase 6 | `alter table public.waouh_messages drop constraint if exists waouh_messages_dealroom_thread_ck;` | immédiat |

## 6. Réconciliation — règles

| Règle | Détecte | Répare (mode apply) |
|---|---|---|
| R1 | Messages de Deal Room sans thread, rattachables sans ambiguïté | Rattache (même règle que le backfill) |
| R2 | Négociations ouvertes sans thread, un seul thread actif exact | Rattache négociation ↔ thread |
| R3 | Deals sans thread alors que la négociation en a un | Rattache |
| R4 | Thread qui ne connaît pas son deal actif | Rattache **uniquement s'il existe exactement un deal non annulé** ; plusieurs deals restent en rapport |
| R5 | Thread « actif » alors que le deal est terminé/annulé | Clôt le thread (libère la relation) |
| R6 | Accord (7 j) sans deal | Rejoue `waouh_accept_negotiation_atomic` (idempotente, refuse d'elle-même un article vendu/réservé) — **seulement avec un taux de commission explicite** |
| Info | Livreur attendu > 2 h, file WhatsApp en échec / en attente > 15 min | Rapport seul |

Chaque réparation est journalisée dans `waouh_commerce_events` (`chat_reconcile_*`).

## 7. Phase 6 — contrainte (différée)

Le plan initial prévoyait `thread_id NOT NULL` sur toute la table : c'est incorrect, car la conversation principale avec l'assistant, les signaux radar et la console opérateur écrivent légitimement sans thread. La règle livrée est : **un message qui porte un deal ou une négociation doit porter son thread**, posée `NOT VALID` (nouvelles lignes uniquement). Le fichier `supabase/deferred/20260927130000_waouh_chat_thread_constraint.sql` refuse de s'appliquer si `chat_writer_v2` n'est pas actif ou s'il y a eu une écriture Deal Room sans thread dans les 48 h.

## 8. Vérifications effectuées avant livraison

| Vérification | Résultat |
|---|---|
| Tests Deno (nouveaux : registre, parseur, machine à états, écrivain ; existants : signal fabric, nexus) | 134 réussis, 0 échec |
| Contrôle de types Deno des 11 fonctions modifiées/nouvelles | 11/11 OK (`waouh-buyer-interest` échouait déjà en prod : corrigé) |
| Banc SQL local (forme prod + vraies migrations `admin_command_center` et `commerce_e2e_v3`, nos migrations appliquées **deux fois**) | 17 scénarios OK : écrivain (rôles, identités multiples, erreurs, métadonnées non falsifiables, accès réservé), backfill sûr, réconciliation (rapport sans écriture, auto, apply, R6 explicite et idempotente), phase 6 (2 refus pour la bonne raison, puis contrainte ciblée) |
| TypeScript web (`tsc -p tsconfig.app.json`) | 15 erreurs, **identiques** à prod (aucune dans les fichiers modifiés) |
| ESLint des fichiers web modifiés | 49 problèmes, **identiques** à prod (aucun nouveau) |
| Vitest (suite complète) | prod : 154 OK / 1 échec (verrou) → lot : **172 OK / 0 échec** |
| Build de production (`npm run build`) | OK |

Rejouer : `PSQL="psql -h localhost -U postgres" ./scripts/waouh-chat/verify/run-sql-tests.sh` (Postgres **local** uniquement).

## 9. Limites connues et points ouverts

- **Non testé de bout en bout sur l'infrastructure réelle** (WAHA, Supabase de production) : à faire à l'étape 4 de l'activation, sur un article de test.
- **Formes WAHA** : l'identifiant de bouton est lu dans `selectedButtonId`, `_data.selectedButtonId`, `button.id`, `buttonReply.id`, `interactive.button_reply.id`, `listResponse…selectedRowId` ; à défaut, le libellé est rapproché des 30 derniers messages à boutons (7 jours). Un moteur WAHA qui n'envoie ni l'un ni l'autre reste sur l'ancien comportement.
- La branche « bouton de négociation périmé » de `waouh-channel-in` est couverte par relecture, pas par un test automatisé (`index.ts` non importable).
- Constats préexistants **hors périmètre**, non modifiés : `waouh-health-check` n'a aucun contrôle d'accès (métriques et identifiants lisibles publiquement) ; `package-lock.json` désynchronisé de `package.json` ; scénario « router » de `waouh-e2e-test` appelé sans thread (refusé depuis l'exigence de thread) ; `_shared/waouh-deal.ts` inutilisé.
