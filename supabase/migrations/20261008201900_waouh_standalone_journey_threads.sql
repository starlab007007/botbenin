-- Standalone tracking follows an actual discussion, while unbound discovery stays unique.
-- Preserve mandate-scoped uniqueness and all existing journey rows.
alter table public.waouh_opportunity_journeys
 drop constraint if exists waouh_opportunity_journeys_owner_id_fabric_id_mode_key;
create unique index if not exists waouh_avatar_journey_scope_unique
 on public.waouh_opportunity_journeys(owner_id,fabric_id,mode,mandate_id)
 where mandate_id is not null;
drop index if exists public.waouh_avatar_standalone_scope_unique;
create unique index if not exists waouh_avatar_standalone_unbound_unique
 on public.waouh_opportunity_journeys(owner_id,fabric_id,mode)
 where mandate_id is null and thread_id is null;
create unique index if not exists waouh_avatar_standalone_thread_unique
 on public.waouh_opportunity_journeys(owner_id,fabric_id,mode,thread_id)
 where mandate_id is null and thread_id is not null;
