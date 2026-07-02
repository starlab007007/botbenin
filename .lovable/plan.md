
## Diagnostic

Ton org Supabase a dépassé **8.63 GB / 5.5 GB** d'egress (bande passante sortante). Ce n'est **pas** un problème de stockage disque ni de nombre de projets — c'est le trafic sortant.

- `N'Dali Talent Cloud` est déjà **en pause** → il ne consomme rien. **Le supprimer ne changera rien** au quota.
- Tout l'egress vient de **Bot.Bj**. Le supprimer casserait bot.bj — mauvaise option.

### Sources d'egress identifiées (Bot.Bj)

1. **Realtime WebSocket** — dominant dans les logs (`/realtime/v1/websocket` = 598 connexions sur 30j). Chaque abonnement `postgres_changes` renvoie tous les payloads INSERT/UPDATE aux clients connectés → forte bande passante.
2. **Storage** — ~700 MB de fichiers servis publiquement, dont :
   - `waouh-media` : 262 MB (423 fichiers)
   - `waouh-uploads` : 131 MB
   - `video-assets` : 90 MB
   - `visual-assets` : 56 MB
   Chaque téléchargement = egress.
3. **Tables gonflées inutilement** (queries REST plus lourdes) :
   - `net._http_response` 120 MB (cache pg_net jamais purgé)
   - `cron.job_run_details` 73 MB (logs cron)
   - `waouh_trace_events` 63 MB (debug)
   - `whatsapp_messages` 35 MB, `video_frames` 31 MB, `access_logs` 4 MB

---

## Ce qu'il faut faire (par ordre d'impact)

### A. Actions immédiates pour tenir jusqu'au 14 juillet

1. **NE PAS supprimer N'Dali** (déjà en pause, aucun gain).
2. **Réduire massivement le Realtime** (impact #1 sur l'egress) :
   - Auditer tous les `supabase.channel(...).on('postgres_changes', ...)` et : (a) filtrer par `filter: 'user_id=eq.<id>'` pour n'écouter que les lignes pertinentes, (b) retirer les channels des composants qui restent montés en arrière-plan (dashboards admin, pages non actives).
   - Cibles prioritaires repérées dans le code : `useAiAgents`, `useGlobalChatSync`, listeners sur `waouh_messages`, `waouh_notifications`, `waouh_outbound_queue`.
   - Retirer `waouh_trace_events`, `access_logs`, `waouh_outbound_queue` de la publication `supabase_realtime` si présents.
3. **Purger les tables lourdes** via migration (gain : requêtes plus légères + moins d'egress DB) :
   - `DELETE FROM net._http_response WHERE created < now() - interval '2 days';`
   - `DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days';`
   - `TRUNCATE public.waouh_trace_events;` (debug uniquement)
   - `DELETE FROM public.access_logs WHERE created_at < now() - interval '7 days';`
   - Ajouter des jobs cron quotidiens pour maintenir ces tables petites.
4. **Storage : arrêter de servir les gros médias depuis Supabase**
   - Migrer les assets statiques (logo, images marketing, visuels UI) vers **Lovable Assets / CDN** (`lovable-assets create`) — ils ne consommeront plus d'egress Supabase.
   - Compresser les images utilisateur uploadées (WebP < 200 KB) côté client avant upload.
   - Ajouter `Cache-Control: public, max-age=31536000` sur les buckets publics pour que les CDN cachent.

### B. Ce qu'il NE faut PAS supprimer
- Aucune table métier (`waouh_users`, `waouh_messages`, `waouh_deals`, `waouh_partner_products`, etc.) : elles ne pèsent presque rien et sont critiques.
- Aucune edge function (10 invocations sur 7j → négligeable).

### C. Solution durable
- **Passer au plan Pro** (250 GB egress inclus) — seule vraie solution si le trafic bot.bj continue à croître. Le plan gratuit à 5.5 GB sera à nouveau atteint sous ~30 jours.

---

## Détails techniques (implémentation si tu approuves)

**Migration de purge + cron auto-nettoyage** :
```sql
-- Purge immédiate
DELETE FROM net._http_response WHERE created < now() - interval '2 days';
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days';
TRUNCATE public.waouh_trace_events;
DELETE FROM public.access_logs WHERE created_at < now() - interval '7 days';

-- Cron quotidien
SELECT cron.schedule('purge-logs-daily','0 3 * * *', $$
  DELETE FROM net._http_response WHERE created < now() - interval '2 days';
  DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days';
  DELETE FROM public.access_logs WHERE created_at < now() - interval '7 days';
  DELETE FROM public.waouh_trace_events WHERE created_at < now() - interval '1 day';
$$);

-- Retirer tables bruyantes du realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.waouh_trace_events;
ALTER PUBLICATION supabase_realtime DROP TABLE public.access_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.waouh_outbound_queue;
```

**Audit Realtime frontend** : ajouter des `filter:` ciblés sur chaque `.on('postgres_changes', ...)` et supprimer les abonnements globaux dans les hooks `useAiAgents`, `useGlobalChatSync`, `useWaouhInbox`, `useNotifications`.

**Migration assets** : script `lovable-assets create --file ...` pour les logos WAOUH et illustrations statiques déjà dans `waouh-media`.

---

## Réponse directe à ta question

> "Quelle table ou fonction dois-je supprimer ?"

Aucune table métier. Juste **purger** `net._http_response`, `cron.job_run_details`, `waouh_trace_events`, `access_logs` (contenu, pas la table).

> "Faut-il désactiver un projet ?"

Non — N'Dali est déjà en pause, ça n'aide pas. Le problème est le trafic de bot.bj.

Dis-moi si tu approuves — j'exécute la purge + le cron + le nettoyage Realtime dès que tu passes en build mode.
