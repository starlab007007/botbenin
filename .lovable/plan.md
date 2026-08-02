# Parité Web ↔ Flutter (branche `codex`) — stabilisation et alignement backend

## Ce qui est déjà vérifié

- **Même backend distant** : l'app Flutter (`AppConstants.supabaseUrl`) et le web pointent tous deux sur le projet Supabase `mvynepqulhflxtyymtzs`, avec la même clé publiable. Il n'y a pas de « moteur distant » différent à raccorder.
- **Même moteur de chat / marketplace** : Flutter et web appellent les mêmes fonctions (`waouh-channel-in`, `waouh-history`, `waouh-match-history`, `waouh-operator-send`, `waouh-status-publish`, `waouh-agent-*`, `waha-dashboard-proxy`, `whatsapp-diffusion-enqueue`) et les mêmes tables (`waouh_articles`, `waouh_messages`, `waouh_conversations`, `waouh_notifications`, `waouh_unified_catalog`, `waouh_statuses`).

## Les écarts réels constatés

Trois modules du web écrivent dans des tables **différentes** de celles utilisées par Flutter : un utilisateur connecté voit donc des données différentes selon la plateforme.

| Module | Flutter (référence) | Web (actuel) | Données réelles |
|---|---|---|---|
| Présence au poste | `waouh_presence_sites` / `_members` / `_events` + fonctions `waouh-presence-checkin`, `waouh-presence-qr-create`, `waouh-presence-qr-preview` | `waouh_attendance_sites` / `_employees` / `_events` + `waouh-attendance-checkin` | 3 sites et 4 membres côté presence, 1 site et 1 employé côté attendance |
| Stock IA | `waouh_partner_products`, `waouh_partner_stock_movements`, `waouh_stock_reorder_requests`, RPC `waouh_stock_list_sources` | `waouh_stock_items`, `waouh_stock_agents`, `waouh_stock_movements` | 136 produits partenaires vs 3 items côté web |
| BI IA | `waouh_bi_sources` + `waouh_bi_source_rows` (lignes importées) | ne lit jamais `waouh_bi_source_rows` | 42 lignes importées invisibles sur le web |

Autres points à traiter :

- Les fonctions `waouh-presence-*` et `waouh-radar-nearby` existent bien côté serveur mais ne sont pas dans ce dépôt : le web doit les **appeler** sans les redéployer ni les écraser.
- Le Radar Flutter passe par `waouh-radar-nearby` + `waouh_unified_catalog`/`waouh_statuses` ; côté web le radar utilise ses propres tables `waouh_radar_*`.
- Partenaires (`waouh_partners`, `_sales`, `_payouts`) : déjà alignés, à revalider seulement.

## Ce qui sera fait

1. **Présence au poste — bascule sur le backend Flutter**
   - `AttendanceAgentWizard`, `AttendanceDashboard`, `PublicCheckinScreen` réécrits sur `waouh_presence_sites` / `_members` / `_events`.
   - Check-in et QR via `waouh-presence-checkin`, `waouh-presence-qr-create`, `waouh-presence-qr-preview` (mêmes payloads que le repository Dart), géofence et notification WhatsApp inchangées côté serveur.
   - Migration unique des rares lignes `waouh_attendance_*` vers les tables presence, puis les tables attendance ne sont plus lues (conservées, non supprimées).

2. **Stock IA — même source que Flutter**
   - Dashboard et wizard stock branchés sur `waouh_partner_products` + `waouh_partner_stock_movements`, alertes de réassort sur `waouh_stock_reorder_requests`, sources via la RPC `waouh_stock_list_sources`.
   - Le catalogue agent lit `waouh_ai_agent_products` / `waouh_ai_agent_partner_products` comme dans Flutter.

3. **BI IA — lignes importées visibles**
   - Lecture de `waouh_bi_source_rows` pour les tableaux et graphiques, `waouh_bi_sources` pour la liste des jeux de données, insights via `waouh-agent-insights` (même contrat que Flutter).

4. **Radar web aligné**
   - Le radar du centre de commande appelle `waouh-radar-nearby` et affiche `waouh_unified_catalog` + `waouh_statuses`, comme Flutter ; les tables `waouh_radar_*` restent pour l'administration.

5. **Identité et session unifiées**
   - Vérification que `profiles` / `waouh_users` sont lus et écrits de la même manière (téléphone `+229`, clé de session `waouh_web_session_id`) pour qu'un même compte affiche partout le même profil, les mêmes bots, conversations, notifications et ventes.

6. **Tests et validation**
   - Parcours de bout en bout en navigateur, connecté : chat/négociation, présence (création site → check-in QR), stock (mouvement → alerte), BI (import → graphe), WhatsApp, diffusion, partenaires.
   - Comparaison ligne à ligne des données renvoyées côté web et côté requêtes Supabase pour un même utilisateur.
   - Vérification console/réseau sans erreur, et exécution de la suite de tests existante (invariants de synchronisation du chat v13).

## Volet technique

- Aucune modification des fonctions `waouh-presence-*` et `waouh-radar-nearby` (hors dépôt, déployées) ; on se contente de les invoquer.
- Une seule migration SQL : reprise des données attendance → presence + index manquants ; aucune suppression de table.
- Les tables retenues sont celles qui portent déjà les données réelles, donc pas de perte côté Flutter.
- Le module chat verrouillé (isolation v13, `correlation_id`) n'est pas touché.
