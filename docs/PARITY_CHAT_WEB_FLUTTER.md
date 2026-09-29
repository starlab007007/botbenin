# Parité du chat : Web (référence) ⇄ Flutter — état au 29/09/2026

Référence : `https://bot.bj/app/chat` (`src/app-mobile/screens/ChatListScreen.tsx` → `WaouhMatchChatList` →
`WaouhMatchChatWindow`). Comparaison faite sur le code de `prod` @ `f9b240e` + branche `claude/harmonisation-phase-0-1`.
Vérifié par lecture du code, analyse Dart et tests automatiques ; **pas encore sur téléphone**.

## Parcours, étape par étape
| # | Étape | Web (référence) | Flutter avant | Flutter maintenant |
|---|---|---|---|---|
| 1 | Liste : onglets | Échanges · Statuts · 24h · 📡 Radar | Discussions · Statuts · Radar | **Aligné** (mêmes libellés) |
| 2 | Recherche | « Rechercher échanges, statuts, radar… » (3 onglets) | 3 libellés différents | **Aligné** |
| 3 | Liste : archives, non-lus, ouverture par `chat/match/:key` | oui | oui | identique (déjà) |
| 4 | Ouverture : marquer les notifications lues | `waouh_notifications.opened = true` | `markMatchRead` | identique |
| 5 | Historique | `waouh-match-history` **toujours** | lecture directe de `waouh_messages` d'abord, fonction en repli | **Aligné** : fonction d'abord, lecture directe en repli hors ligne |
| 6 | Statut de l'article / clôture | `articleStatus` → composeur remplacé par « Cette conversation est clôturée — la vente a été finalisée. » (sold, closed, finalized, completed, vendu) | statut reçu mais **ignoré** : on pouvait écrire dans une vente finalisée | **Corrigé** : même règle, même texte |
| 7 | Envoi de texte | `waouh-channel-in-secure`, texte tel quel | idem + classification locale (oui/non/propose → `action`, `intent`, `commerce_action`) | **Aligné** : texte tel quel, plus de classification locale |
| 8 | Contenu de la requête d'envoi | `article_id`, `buyer_profile_id`, `counterpart_user_id`, `buyer/seller_user_id`, `thread_id`, `negotiation_id`, `deal_id`, `role`, `product_title`, `correlation_id` | manquaient `product_title` et `correlation_id` | **Aligné** (formule du `correlation_id` identique, testée) |
| 9 | Offre tapée (« je propose… ») | `waouh-commerce-action` (action `text`) → pending + Confirmer | idem | identique |
| 10 | « Poser une question » | mode question, `commerce_action: ask` | idem | identique |
| 11 | Boutons serveur (Accepter, Refuser, paiement, disponibilité, confirmation, annulation) | `waouh-commerce-action` (contrat v3) | **ancien chemin** `waouh-channel-in-secure` : le payload canonique `waouh:…` n'était pas reconnu | **Corrigé** : mêmes requêtes v3 que le Web (fixtures communes) |
| 12 | Contre-offre / prix suggéré / question | composeur pré-rempli | idem | identique |
| 13 | Seuls les derniers boutons valides sont actifs | `latestActionMessageId` | `liveLatestActionableMessageIndex` | équivalent |
| 14 | Frise en 7 étapes | `WaouhDealStepper` | `LiveDealStepper` | équivalent |
| 15 | Temps réel | INSERT sur `waouh_messages` filtré par `web_session_id` et `user_id`, sans polling | toute la table + rafraîchissement toutes les **4 s** | écoute conservée, rafraîchissement de sûreté ralenti à **15 s** (lecture serveur) |
| 16 | Erreur d'envoi | message temporaire retiré, texte restitué, toast | bulle « échec » avec Réessayer + file hors ligne | conservé (voir « écarts assumés ») |

## Corrections faites dans Flutter (branche `claude/harmonisation-phase-0-1`)
- `live_commerce_action_client.dart` : les payloads canoniques de la timeline sont convertis en requêtes `waouh-commerce-action`.
- `live_match_chat_v2.dart` : plus de classification locale du texte ; verrou de conversation clôturée (composeur, envoi, boutons).
- `live_match_history_service.dart` : `waouh-match-history` en premier ; lecture directe seulement en repli.
- `live_controller_extensions.dart` : statut de l'article mémorisé ; rafraîchissement de sûreté 4 s → 15 s.
- `live_thread_flow.dart` : `product_title`, `correlation_id` (`corr_<article8>_<rôle>_<interlocuteur8|any>`), statuts clos.
- `live_inbox_production.dart` : libellés des onglets et de la recherche.
- Version Flutter : **18.20.0+1786092821**.

## Contrôle automatique de parité
`docs/contracts/chat/parity-fixtures.json` : mêmes données rejouées par
`src/components/waouh/__tests__/waouhChatParity.test.ts` (Web, 3 tests) et
`flutter_waouh_app/test/live_web_parity_chat_test.dart` (Flutter, 6 tests) : `correlation_id`, boutons → requête v3,
composeur seul, statuts clos, métadonnées d'envoi. Si l'un des deux clients dérive, le test correspondant échoue.
Le test Flutter qui échouait déjà (`live_commerce_workflow_widget_test`, identifiant du bouton de paiement) est corrigé.

## Écarts restants (non corrigés)
| Écart | Web | Flutter | Proposition |
|---|---|---|---|
| Historique | 10 derniers messages + chargement par pages de 20 au défilement | jusqu'à 250 d'un coup, sans « charger plus » | ajouter la pagination `before` |
| Ouverture d'une Deal Room | le serveur fournit le `thread_id` | matches « provisoires », jusqu'à 40 reprises, composeur bloqué tant que le fil canonique n'est pas confirmé | **à garder** (règle métier : Deal Room active après thread canonique) ; supprimer les reprises quand la production confirme que le serveur renvoie toujours `thread_id` |
| Assemblage de la liste | `useWaouhMatchChats.ts` (client) | `LiveNotificationService._fetchMatches` (client) | une seule liste côté serveur (`waouh-chat-inbox`), derrière un interrupteur |
| Temps réel | filtres serveur (`web_session_id`, `user_id`) | filtre local + RLS | aligner les filtres |
| Habillage de la Deal Room | avatar Muse, badge de contactabilité, bulle d'amorce épinglée, « Résumé IA » repliable | bannière Deal Room + feuille d'intelligence | comparer sur téléphone, écran par écran |
| Pièces jointes dans la Deal Room | non (`attachments: []`) | photos possibles | décision produit |
| Envoi hors ligne | non | file d'attente + Réessayer | conserver (fonction mobile) |
| Garde-fous | `waouhChatSyncLock` (invariants v15) | aucun équivalent | étendre le test de parité |
