-- Correctif du garde-fou 20260929065700_waouh_v3_canonical_thread_guard.
-- Défaut : `min(id)` sur une colonne uuid — PostgreSQL (15 en production comme 16) n'a pas d'agrégat min(uuid) :
-- « function min(uuid) does not exist ». Le trigger BEFORE INSERT faisait échouer tout message portant article_id et
-- user_id, sans thread_id ni contexte résolvable (meta.thread_id / negotiation_id / deal_id). Même comportement,
-- agrégat valide. CREATE OR REPLACE : le trigger existant est conservé.
create or replace function public.waouh_resolve_message_thread()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_thread uuid;
  v_count integer;
  v_meta_thread text;
  v_meta_neg text;
  v_meta_deal text;
begin
  if new.thread_id is not null then
    return new;
  end if;

  v_meta_thread := nullif(new.meta->>'thread_id','');
  if v_meta_thread is not null and v_meta_thread ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select id into v_thread from public.waouh_chat_threads where id=v_meta_thread::uuid limit 1;
  end if;

  if v_thread is null then
    v_meta_neg := nullif(coalesce(new.meta->>'negotiation_id',new.meta->>'negotiationId'),'');
    if v_meta_neg is not null and v_meta_neg ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      select thread_id into v_thread from public.waouh_negotiations where id=v_meta_neg::uuid limit 1;
    end if;
  end if;

  if v_thread is null then
    v_meta_deal := nullif(coalesce(new.meta->>'deal_id',new.meta->>'dealId'),'');
    if v_meta_deal is not null and v_meta_deal ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      select thread_id into v_thread from public.waouh_deals where id=v_meta_deal::uuid limit 1;
    end if;
  end if;

  if v_thread is null and new.article_id is not null and new.user_id is not null then
    select count(*), (array_agg(id order by id))[1]
      into v_count, v_thread
    from public.waouh_chat_threads
    where article_id=new.article_id
      and (buyer_user_id=new.user_id or seller_user_id=new.user_id)
      and status not in ('concluded','cancelled');
    if v_count <> 1 then v_thread := null; end if;
  end if;

  if v_thread is not null then
    new.thread_id := v_thread;
    new.article_id := coalesce(new.article_id,(select article_id from public.waouh_chat_threads where id=v_thread));
    new.meta := coalesce(new.meta,'{}'::jsonb) || jsonb_build_object(
      'thread_id',v_thread,
      'article_id',new.article_id,
      'thread_resolved_by','db_guard_v3'
    );
  elsif new.article_id is not null then
    new.meta := coalesce(new.meta,'{}'::jsonb) || jsonb_build_object(
      'thread_resolution','unresolved',
      'thread_resolution_reason','ambiguous_or_missing_context'
    );
  end if;
  return new;
end;
$$;
