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
    select count(*), min(id)
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

drop trigger if exists trg_waouh_resolve_message_thread on public.waouh_messages;
create trigger trg_waouh_resolve_message_thread
before insert or update of article_id,thread_id,meta,user_id
on public.waouh_messages
for each row execute function public.waouh_resolve_message_thread();

comment on function public.waouh_resolve_message_thread() is
'WAOUH V3 guard: resolves canonical thread from explicit metadata, negotiation/deal, or unambiguous article+participant; never guesses across multiple active threads.';
