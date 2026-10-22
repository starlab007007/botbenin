# WAOUH × WAHA — automatisation contrôlée (21 octobre 2026)

## Mandat
Autorisation permanente donnée par l'administrateur pour les opérations courantes de WAOUH. Pas d'approbation manuelle systématique. L'automatisation reste subordonnée au consentement des destinataires, à l'isolement des Deal Rooms et aux limites techniques.

## Production actuellement vérifiée
- Les fonctions critiques ont été déployées avec contrôle RPC de sortie.
- `waouh_waha_egress_policy.enabled=false` : verrou fermé après deux lectures WAHA ayant reçu HTTP 401 (clé API seule et clé + Basic Auth).
- Le coupe-circuit a enregistré l'incident ; plafond préparé 12 requêtes/minute et 600/jour.
- Les lots WhatsApp et les 5 tâches Cron suspendues **ne doivent pas être réactivés** tant que le statut serveur n'est pas validé en HTTP 200 avec l'identité WaouhApp.
- 18 notifications datées du 11/10 ont été marquées `failed` / `expired_during_waha_recovery_no_auto_replay` ; aucun rejeu implicite.

## Remise en service — ordre strict
1. Vérifier localement la valeur en clair configurée côté WAHA et dans `WAHA_API_KEY_PLAIN` Supabase ; ne publier aucune clé. Vérifier l'authentification reverse proxy/Basic éventuelle et les chemins `/api/sessions`.
2. Faire une unique lecture autorisée via `waouh-waha-readiness` après suppression du circuit (compte administrateur interne). Exiger HTTP 200, `WORKING`, et l'identité centrale correcte.
3. Ouvrir `waouh_waha_egress_policy.enabled=true`. Les opérations transactionnelles, réponses entrantes et lecture de statut sont préconfigurées. Conserver les quotas et l'arrêt automatique sur 401/403/429/5xx.
4. Valider les webhooks signés, la déduplication `message` / `message.any`, le routage article × interlocuteur et une seule réponse WhatsApp vers un numéro test autorisé.
5. Réactiver progressivement `waouh-outbound-dispatch-tick` puis `waouh-nexus-followup-hourly`. Ne jamais remettre les messages expirés en `pending`.
6. Valider puis réactiver `waouh-waha-contact-sync-30m` avec limites incrémentales.
7. Réactiver `waouh-radar-process-tick` et `waouh-opportunity-worker-10m` seulement si vérifications de consentement, quotas et anti-doublons réussies.
8. Pour campagnes: permettre explicitement `allow_campaigns` et `allow_cold_outreach` seulement pour des listes de destinataires consentants ; plafonner les lots, laisser une option de désinscription et tracer les retours.

## Points de vigilance
- Plusieurs fonctions non incluses dans cette PR peuvent encore avoir des appels WAHA directs ; vérifier et migrer les derniers chemins avant d'affirmer un verrou global.
- Le monitoring GitHub Actions `Monitor WhatsApp delivery` échoue sur la récupération d'identifiants Supabase ; il faut corriger ce contrôle indépendamment de l'API WAHA.
- L'état `SCAN_QR_CODE` de la table locale est ancien (15 octobre), pas un état réel confirmé.
- Aucun changement de clé secrète ni redémarrage Docker n'a été effectué.

## Éléments de contrôle
```sql
SELECT enabled,allow_status,allow_transactional,allow_inbound_reply,
       allow_contact_sync,allow_campaigns,allow_cold_outreach,
       paused_until,pause_reason,calls_per_minute,calls_per_day
FROM public.waouh_waha_egress_policy WHERE id=true;

SELECT scope,http_status,created_at FROM public.waouh_waha_egress_audit
ORDER BY id DESC LIMIT 10;

SELECT jobname,active FROM cron.job WHERE jobname IN
('waouh-outbound-dispatch-tick','waouh-waha-contact-sync-30m',
'waouh-opportunity-worker-10m','waouh-radar-process-tick','waouh-nexus-followup-hourly');
```
