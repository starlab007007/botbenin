-- WAOUH Convergence. Existing deal/message/payment workflows are not modified.
-- Access is through an authenticated Edge Function; no client role can mutate
-- these tables or impersonate the other party to an agreement.
create table public.waouh_convergence_missions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 request_key text not null, kind text not null check(kind in ('product','service','announcement')),
 goal text not null check(length(goal) between 3 and 2000), city text not null check(length(city) between 2 and 120),
 landmark text, budget_max numeric check(budget_max>=0), deadline timestamptz,
 criteria jsonb not null default '[]' check(jsonb_typeof(criteria)='array'),
 status text not null default 'draft' check(status in ('draft','comparing','agreed','active','completed','cancelled')),
 selected_plan_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,request_key)
);
create index waouh_convergence_missions_owner_idx on public.waouh_convergence_missions(owner_id,created_at desc);
create table public.waouh_convergence_plans (
 id uuid primary key default gen_random_uuid(), mission_id uuid not null references public.waouh_convergence_missions(id) on delete cascade,
 title text not null check(length(title) between 2 and 200), rationale text, requirements jsonb not null default '[]',
 origin text not null default 'manual' check(origin in ('manual','ai')), created_at timestamptz not null default now()
);
create index waouh_convergence_plans_mission_idx on public.waouh_convergence_plans(mission_id);
alter table public.waouh_convergence_missions add constraint convergence_selected_plan_fk foreign key(selected_plan_id) references public.waouh_convergence_plans(id);
create index waouh_convergence_missions_selected_plan_idx on public.waouh_convergence_missions(selected_plan_id) where selected_plan_id is not null;
create table public.waouh_convergence_components (
 id uuid primary key default gen_random_uuid(), mission_id uuid not null references public.waouh_convergence_missions(id) on delete cascade,
 plan_id uuid not null references public.waouh_convergence_plans(id) on delete cascade,
 title text not null check(length(title) between 2 and 300), kind text not null check(kind in ('product','service','announcement')),
 source_ref text, source_url text, source_snapshot jsonb not null default '{}',
 amount numeric check(amount>=0), extra_cost numeric check(extra_cost>=0), unit text not null default 'forfait',
 scope text not null default '', exclusions text not null default '', availability text,
 provider_id uuid references auth.users(id), invite_hash text, invite_expires_at timestamptz,
 created_at timestamptz not null default now(), unique(plan_id,source_ref)
);
create index waouh_convergence_components_mission_idx on public.waouh_convergence_components(mission_id);
create index waouh_convergence_components_provider_idx on public.waouh_convergence_components(provider_id) where provider_id is not null;
create index waouh_convergence_components_invite_idx on public.waouh_convergence_components(invite_hash) where invite_hash is not null;
create table public.waouh_convergence_agreements (
 id uuid primary key default gen_random_uuid(), component_id uuid not null unique references public.waouh_convergence_components(id) on delete cascade,
 version integer not null default 1, terms jsonb not null,
 owner_accepted_at timestamptz, provider_accepted_at timestamptz,
 owner_completed_at timestamptz, provider_completed_at timestamptz,
 owner_note text, provider_note text,
 status text not null default 'proposed' check(status in ('proposed','accepted','completed','rejected')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.waouh_convergence_pools (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 topic text not null check(length(topic) between 3 and 300), city text not null, kind text not null check(kind in ('product','service','announcement')),
 deadline timestamptz not null, status text not null default 'open' check(status in ('open','confirmed','cancelled')),
 provider_id uuid references auth.users(id), invite_hash text, invite_expires_at timestamptz,
 quote_version integer not null default 0, shared_cost numeric check(shared_cost>=0), quote_scope text,
 quote_expires_at timestamptz, minimum_members integer not null default 2 check(minimum_members between 2 and 5),
 created_at timestamptz not null default now()
);
create index waouh_convergence_pools_discovery_idx on public.waouh_convergence_pools(city,kind,deadline) where status='open';
create index waouh_convergence_pools_owner_idx on public.waouh_convergence_pools(owner_id);
create index waouh_convergence_pools_provider_idx on public.waouh_convergence_pools(provider_id) where provider_id is not null;
create index waouh_convergence_pools_invite_idx on public.waouh_convergence_pools(invite_hash) where invite_hash is not null;
create table public.waouh_convergence_pool_members (
 pool_id uuid not null references public.waouh_convergence_pools(id) on delete cascade,
 owner_id uuid not null references auth.users(id), mission_id uuid not null references public.waouh_convergence_missions(id),
 accepted_version integer, joined_at timestamptz not null default now(), primary key(pool_id,owner_id)
);
create index waouh_convergence_pool_members_owner_idx on public.waouh_convergence_pool_members(owner_id);
create index waouh_convergence_pool_members_mission_idx on public.waouh_convergence_pool_members(mission_id);
create table public.waouh_convergence_events (
 id bigint generated always as identity primary key, actor_id uuid not null references auth.users(id),
 mission_id uuid references public.waouh_convergence_missions(id), event_type text not null,
 payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create index waouh_convergence_events_actor_idx on public.waouh_convergence_events(actor_id,event_type,created_at desc);
create index waouh_convergence_events_mission_idx on public.waouh_convergence_events(mission_id,created_at);

do $$ declare t text; begin
 foreach t in array array['missions','plans','components','agreements','pools','pool_members','events'] loop
  execute format('alter table public.waouh_convergence_%I enable row level security',t);
  execute format('revoke all on public.waouh_convergence_%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.waouh_convergence_%I to service_role',t);
 end loop;
end $$;
revoke all on sequence public.waouh_convergence_events_id_seq from public,anon,authenticated;
grant usage,select on sequence public.waouh_convergence_events_id_seq to service_role;

-- Private bundles: a provider sees only the components addressed to them.
create function public.waouh_convergence_bundle(p_actor uuid,p_id uuid) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare m public.waouh_convergence_missions; own boolean; plans jsonb; comps jsonb;
begin
 select * into m from public.waouh_convergence_missions where id=p_id;
 if not found then raise exception 'mission_not_found' using errcode='P0002'; end if;
 own:=m.owner_id=p_actor;
 if not own and not exists(select 1 from public.waouh_convergence_components where mission_id=p_id and provider_id=p_actor) then raise exception 'forbidden' using errcode='42501'; end if;
 select coalesce(jsonb_agg((case when own then to_jsonb(p) else to_jsonb(p)-'rationale'-'requirements' end) order by p.created_at),'[]') into plans from public.waouh_convergence_plans p
 where p.mission_id=p_id and (own or exists(select 1 from public.waouh_convergence_components c where c.plan_id=p.id and c.provider_id=p_actor));
 select coalesce(jsonb_agg((to_jsonb(c)-'invite_hash'-'invite_expires_at')||jsonb_build_object('agreement',to_jsonb(a)) order by c.created_at),'[]') into comps
 from public.waouh_convergence_components c left join public.waouh_convergence_agreements a on a.component_id=c.id
 where c.mission_id=p_id and (own or c.provider_id=p_actor);
 return jsonb_build_object('mission',case when own then to_jsonb(m) else to_jsonb(m)-'landmark'-'budget_max'-'request_key'-'owner_id' end,'is_owner',own,'plans',plans,'components',comps);
end $$;
revoke all on function public.waouh_convergence_bundle(uuid,uuid) from public,anon,authenticated;
grant execute on function public.waouh_convergence_bundle(uuid,uuid) to service_role;

-- All state transitions are atomic and serialized per mission / pool. p_actor
-- is supplied by the Edge Function after auth.getUser(), never by the client.
create function public.waouh_convergence_command(p_actor uuid,p_action text,p jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare m public.waouh_convergence_missions; c public.waouh_convergence_components; a public.waouh_convergence_agreements;
 g public.waouh_convergence_pools; mid uuid; cid uuid; pid uuid; token text; h text; own boolean; n integer; v integer; j jsonb; result jsonb;
begin
 if p_actor is null or jsonb_typeof(p)<>'object' then raise exception 'invalid_actor_or_payload' using errcode='22023'; end if;
 if p_action='list' then
  select coalesce(jsonb_agg(x order by x->>'created_at' desc),'[]') into j from (
   select to_jsonb(mm) as x from public.waouh_convergence_missions mm where mm.owner_id=p_actor
   union select to_jsonb(mm)-'landmark'-'budget_max'-'request_key'-'owner_id' as x from public.waouh_convergence_missions mm
   where mm.owner_id<>p_actor and exists(select 1 from public.waouh_convergence_components cc where cc.mission_id=mm.id and cc.provider_id=p_actor)
  ) s;
  return jsonb_build_object('missions',j);
 end if;
 if p_action='create' then
  if length(coalesce(p->>'goal','')) not between 3 and 2000 or length(coalesce(p->>'city','')) not between 2 and 120 or length(coalesce(p->>'request_key','')) not between 8 and 120 then raise exception 'invalid_mission' using errcode='22023'; end if;
  insert into public.waouh_convergence_missions(owner_id,request_key,kind,goal,city,landmark,budget_max,deadline,criteria)
   values(p_actor,p->>'request_key',p->>'kind',p->>'goal',p->>'city',left(p->>'landmark',300),nullif(p->>'budget_max','')::numeric,nullif(p->>'deadline','')::timestamptz,coalesce(p->'criteria','[]')) on conflict(owner_id,request_key) do nothing returning id into mid;
  if mid is null then select id into mid from public.waouh_convergence_missions where owner_id=p_actor and request_key=p->>'request_key';
  else insert into public.waouh_convergence_events(actor_id,mission_id,event_type) values(p_actor,mid,'mission_created'); end if;
  return public.waouh_convergence_bundle(p_actor,mid);
 end if;
 if p_action='redeem_invite' then
  if length(coalesce(p->>'token',''))<>64 then raise exception 'invalid_invitation' using errcode='22023'; end if;
  h:=encode(sha256(convert_to(p->>'token','UTF8')),'hex');
  select * into c from public.waouh_convergence_components where invite_hash=h and invite_expires_at>now();
  if found then
   select * into m from public.waouh_convergence_missions where id=c.mission_id for update;
   select * into c from public.waouh_convergence_components where id=c.id and invite_hash=h and invite_expires_at>now() for update;
   if not found then raise exception 'invitation_unavailable' using errcode='42501'; end if;
   if m.owner_id=p_actor or c.provider_id is not null or m.status in ('cancelled','completed') then raise exception 'invitation_unavailable' using errcode='42501'; end if;
   update public.waouh_convergence_components set provider_id=p_actor,invite_hash=null,invite_expires_at=null where id=c.id;
   return public.waouh_convergence_bundle(p_actor,m.id);
  end if;
  select * into g from public.waouh_convergence_pools where invite_hash=h and invite_expires_at>now() and status='open' for update;
  if not found or g.owner_id=p_actor or g.provider_id is not null or exists(select 1 from public.waouh_convergence_pool_members where pool_id=g.id and owner_id=p_actor) then raise exception 'invitation_unavailable' using errcode='42501'; end if;
  update public.waouh_convergence_pools set provider_id=p_actor,invite_hash=null,invite_expires_at=null where id=g.id;
  return jsonb_build_object('pool_id',g.id,'provider',true);
 end if;
 if p_action='pool_list' then
  select coalesce(jsonb_agg(x),'[]') into j from (select jsonb_build_object('id',gg.id,'topic',gg.topic,'city',gg.city,'kind',gg.kind,'deadline',gg.deadline,'status',gg.status,
    'member_count',(select count(*) from public.waouh_convergence_pool_members pm where pm.pool_id=gg.id),
    'provider_linked',gg.provider_id is not null,'is_owner',gg.owner_id=p_actor,'is_provider',gg.provider_id=p_actor,'joined',exists(select 1 from public.waouh_convergence_pool_members pm where pm.pool_id=gg.id and pm.owner_id=p_actor),
    'shared_cost',gg.shared_cost,'quote_scope',gg.quote_scope,'quote_version',gg.quote_version,'quote_expires_at',gg.quote_expires_at,'minimum_members',gg.minimum_members,
    'accepted_version',(select accepted_version from public.waouh_convergence_pool_members pm where pm.pool_id=gg.id and pm.owner_id=p_actor)) x
   from public.waouh_convergence_pools gg where
    (gg.owner_id=p_actor or gg.provider_id=p_actor or exists(select 1 from public.waouh_convergence_pool_members pm where pm.pool_id=gg.id and pm.owner_id=p_actor)
     or (gg.status='open' and gg.deadline>now() and lower(trim(gg.city))=lower(trim(p->>'city')) and gg.kind=coalesce(p->>'kind',gg.kind))) order by gg.created_at desc limit 50) s;
  return jsonb_build_object('pools',j);
 end if;
 if p_action like 'pool_%' then
  if p_action='pool_create' then
   select * into m from public.waouh_convergence_missions where id=(p->>'mission_id')::uuid and owner_id=p_actor and status not in ('cancelled','completed') for update;
   if not found or coalesce((p->>'consent')::boolean,false) is not true then raise exception 'explicit_consent_required' using errcode='42501'; end if;
   if (p->>'deadline')::timestamptz<=now() then raise exception 'future_deadline_required' using errcode='22023'; end if;
   insert into public.waouh_convergence_pools(owner_id,topic,city,kind,deadline) values(p_actor,p->>'topic',m.city,m.kind,(p->>'deadline')::timestamptz) returning id into pid;
   insert into public.waouh_convergence_pool_members(pool_id,owner_id,mission_id) values(pid,p_actor,m.id);
   return jsonb_build_object('pool_id',pid);
  end if;
  select * into g from public.waouh_convergence_pools where id=(p->>'pool_id')::uuid for update;
  if not found then raise exception 'pool_not_found' using errcode='P0002'; end if;
  if p_action='pool_join' then
   select * into m from public.waouh_convergence_missions where id=(p->>'mission_id')::uuid and owner_id=p_actor and status not in ('cancelled','completed');
   if not found or lower(trim(m.city))<>lower(trim(g.city)) or m.kind<>g.kind or not coalesce((p->>'consent')::boolean,false) then raise exception 'incompatible_or_consent_missing' using errcode='22023'; end if;
   if exists(select 1 from public.waouh_convergence_pool_members where pool_id=g.id and owner_id=p_actor) then return jsonb_build_object('pool_id',g.id); end if;
   select count(*) into n from public.waouh_convergence_pool_members where pool_id=g.id;
   if n>=5 or g.status<>'open' or g.deadline<=now() or g.provider_id=p_actor then raise exception 'pool_unavailable' using errcode='22023'; end if;
   insert into public.waouh_convergence_pool_members(pool_id,owner_id,mission_id) values(g.id,p_actor,m.id);
   update public.waouh_convergence_pools set quote_version=quote_version+1 where id=g.id;
   update public.waouh_convergence_pool_members set accepted_version=null where pool_id=g.id;
  elsif p_action='pool_leave' then
   if not exists(select 1 from public.waouh_convergence_pool_members where pool_id=g.id and owner_id=p_actor) then raise exception 'forbidden' using errcode='42501'; end if;
   delete from public.waouh_convergence_pool_members where pool_id=g.id and owner_id=p_actor;
   update public.waouh_convergence_pools set status=case when owner_id=p_actor or status='cancelled' then 'cancelled' else 'open' end,quote_version=quote_version+1 where id=g.id;
   update public.waouh_convergence_pool_members set accepted_version=null where pool_id=g.id;
  elsif p_action='pool_invite' then
   if g.owner_id<>p_actor or g.provider_id is not null or g.status<>'open' then raise exception 'forbidden' using errcode='42501'; end if;
   token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
   update public.waouh_convergence_pools set invite_hash=encode(sha256(convert_to(token,'UTF8')),'hex'),invite_expires_at=now()+interval '7 days' where id=g.id;
   return jsonb_build_object('token',token,'expires_in_days',7);
  elsif p_action='pool_quote' then
   if g.provider_id is distinct from p_actor or g.status<>'open' or g.deadline<=now() then raise exception 'forbidden' using errcode='42501'; end if;
   if length(coalesce(p->>'scope',''))<3 or p->>'expires_at' is null or (p->>'expires_at')::timestamptz<=now() or p->>'shared_cost' is null or (p->>'shared_cost')::numeric<0 or (p->>'shared_cost')::numeric>1e10 then raise exception 'invalid_quote' using errcode='22023'; end if;
   update public.waouh_convergence_pools set shared_cost=(p->>'shared_cost')::numeric,quote_scope=left(p->>'scope',2000),quote_expires_at=(p->>'expires_at')::timestamptz,
    minimum_members=coalesce((p->>'minimum_members')::integer,2),quote_version=quote_version+1 where id=g.id;
   update public.waouh_convergence_pool_members set accepted_version=null where pool_id=g.id;
  elsif p_action='pool_accept' then
   if not exists(select 1 from public.waouh_convergence_pool_members where pool_id=g.id and owner_id=p_actor) or g.provider_id is null or g.shared_cost is null or g.quote_expires_at<=now() or g.deadline<=now() or g.status<>'open' or (p->>'version')::integer is distinct from g.quote_version then raise exception 'quote_unavailable_or_changed' using errcode='22023'; end if;
   select count(*) into n from public.waouh_convergence_pool_members where pool_id=g.id;
   if n<g.minimum_members then raise exception 'not_enough_participants' using errcode='22023'; end if;
   update public.waouh_convergence_pool_members set accepted_version=g.quote_version where pool_id=g.id and owner_id=p_actor;
   if not exists(select 1 from public.waouh_convergence_pool_members where pool_id=g.id and accepted_version is distinct from g.quote_version) then
    update public.waouh_convergence_pools set status='confirmed' where id=g.id;
   end if;
  else raise exception 'unknown_action' using errcode='22023'; end if;
  insert into public.waouh_convergence_events(actor_id,event_type,payload) values(p_actor,p_action,jsonb_build_object('pool_id',g.id));
  return jsonb_build_object('pool_id',g.id);
 end if;
 if p_action='metrics' then
  own:=coalesce(public.is_admin(p_actor),false);
  return jsonb_build_object('scope',case when own then 'platform' else 'own' end,'target_missions',30,'target_professionals',15,
   'missions',(select count(*) from public.waouh_convergence_missions where own or owner_id=p_actor),
   'completed',(select count(*) from public.waouh_convergence_missions where (own or owner_id=p_actor) and status='completed'),
   'agreements_confirmed',(select count(*) from public.waouh_convergence_agreements ag join public.waouh_convergence_components cc on cc.id=ag.component_id join public.waouh_convergence_missions mm on mm.id=cc.mission_id where (own or mm.owner_id=p_actor) and ag.owner_accepted_at is not null and ag.provider_accepted_at is not null),
   'professionals',(select count(distinct cc.provider_id) from public.waouh_convergence_components cc join public.waouh_convergence_missions mm on mm.id=cc.mission_id where (own or mm.owner_id=p_actor) and cc.provider_id is not null),
   'quote_delay_seconds',(select percentile_cont(.5) within group(order by extract(epoch from ag.created_at-mm.created_at)) from public.waouh_convergence_agreements ag join public.waouh_convergence_components cc on cc.id=ag.component_id join public.waouh_convergence_missions mm on mm.id=cc.mission_id where own or mm.owner_id=p_actor),
   'terms_revised',(select count(*) from public.waouh_convergence_events where (own or actor_id=p_actor) and event_type='agreement_revised'),
   'ai_requests',(select count(*) from public.waouh_convergence_events where (own or actor_id=p_actor) and event_type='ai_requested'),
   'ai_input_tokens',(select coalesce(sum((payload->>'input_tokens')::bigint),0) from public.waouh_convergence_events where event_type='ai_usage' and (own or actor_id=p_actor)),
   'ai_output_tokens',(select coalesce(sum((payload->>'output_tokens')::bigint),0) from public.waouh_convergence_events where event_type='ai_usage' and (own or actor_id=p_actor)),
   'ai_latency_ms',(select round(avg((payload->>'latency_ms')::numeric)) from public.waouh_convergence_events where event_type='ai_usage' and (own or actor_id=p_actor)),
   'ai_cost_fcfa',null);
 end if;
 mid:=nullif(p->>'mission_id','')::uuid;
 if p ? 'component_id' then
  select * into c from public.waouh_convergence_components where id=(p->>'component_id')::uuid;
  mid:=c.mission_id;
 end if;
 select * into m from public.waouh_convergence_missions where id=mid for update;
 if not found then raise exception 'mission_not_found' using errcode='P0002'; end if;
 own:=m.owner_id=p_actor;
 if not own and not exists(select 1 from public.waouh_convergence_components where mission_id=mid and provider_id=p_actor) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_action='get' then return public.waouh_convergence_bundle(p_actor,mid); end if;
 if m.status in ('completed','cancelled') then raise exception 'mission_closed' using errcode='22023'; end if;
 if p_action in ('cancel','plan_add','plan_select','component_add','component_remove','invite','mission_update','ai_request','ai_plans','ai_usage') and not own then raise exception 'forbidden' using errcode='42501'; end if;
 if p_action='cancel' then
  update public.waouh_convergence_missions set status='cancelled',updated_at=now() where id=mid;
  for g in select gg.* from public.waouh_convergence_pools gg join public.waouh_convergence_pool_members pm on pm.pool_id=gg.id where pm.mission_id=mid order by gg.id for update of gg loop
   delete from public.waouh_convergence_pool_members where pool_id=g.id and mission_id=mid;
   update public.waouh_convergence_pools set status=case when owner_id=p_actor or status='cancelled' then 'cancelled' else 'open' end,quote_version=quote_version+1 where id=g.id;
   update public.waouh_convergence_pool_members set accepted_version=null where pool_id=g.id;
  end loop;
 elsif p_action='mission_update' then
  if nullif(p->>'budget_max','')::numeric < (select coalesce(sum((ag.terms->>'amount')::numeric),0) from public.waouh_convergence_agreements ag join public.waouh_convergence_components cc on cc.id=ag.component_id where cc.plan_id=m.selected_plan_id and ag.status<>'rejected') then raise exception 'budget_below_known_total' using errcode='22023'; end if;
  update public.waouh_convergence_missions set budget_max=nullif(p->>'budget_max','')::numeric,updated_at=now() where id=mid;
 elsif p_action='plan_add' or p_action='ai_plans' then
  if (select count(*) from public.waouh_convergence_plans where mission_id=mid)>=5 then raise exception 'five_plans_max' using errcode='22023'; end if;
  if p_action='plan_add' then
   insert into public.waouh_convergence_plans(mission_id,title,rationale) values(mid,p->>'title',left(p->>'rationale',3000));
  else
   if jsonb_typeof(p->'plans')<>'array' or jsonb_array_length(p->'plans')>3 then raise exception 'invalid_plans' using errcode='22023'; end if;
   for j in select value from jsonb_array_elements(p->'plans') loop
    exit when (select count(*) from public.waouh_convergence_plans where mission_id=mid)>=5;
    insert into public.waouh_convergence_plans(mission_id,title,rationale,requirements,origin) values(mid,left(j->>'title',200),left(j->>'rationale',3000),coalesce(j->'requirements','[]'),'ai');
   end loop;
  end if;
  update public.waouh_convergence_missions set status=case when status='draft' then 'comparing' else status end,updated_at=now() where id=mid;
 elsif p_action='ai_request' then
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text,17));
  if (select count(*) from public.waouh_convergence_events where actor_id=p_actor and event_type='ai_requested' and created_at>now()-interval '1 day')>=10 then raise exception 'daily_ai_limit' using errcode='54000'; end if;
  insert into public.waouh_convergence_events(actor_id,mission_id,event_type) values(p_actor,mid,'ai_requested');
 elsif p_action='ai_usage' then
  insert into public.waouh_convergence_events(actor_id,mission_id,event_type,payload) values(p_actor,mid,'ai_usage',jsonb_build_object('input_tokens',greatest(coalesce((p->>'input_tokens')::bigint,0),0),'output_tokens',greatest(coalesce((p->>'output_tokens')::bigint,0),0),'latency_ms',greatest(coalesce((p->>'latency_ms')::integer,0),0),'success',p->'success','model',left(p->>'model',100)));
  return '{}'::jsonb;
 elsif p_action='plan_select' then
  pid:=(p->>'plan_id')::uuid;
  if not exists(select 1 from public.waouh_convergence_plans where id=pid and mission_id=mid) then raise exception 'plan_not_found' using errcode='22023'; end if;
  if exists(select 1 from public.waouh_convergence_agreements ag join public.waouh_convergence_components cc on cc.id=ag.component_id where cc.mission_id=mid and (ag.owner_accepted_at is not null or ag.provider_accepted_at is not null)) then raise exception 'agreement_already_in_progress' using errcode='22023'; end if;
  update public.waouh_convergence_missions set selected_plan_id=pid,status='comparing',updated_at=now() where id=mid;
 elsif p_action='component_add' then
  pid:=(p->>'plan_id')::uuid;
  if not exists(select 1 from public.waouh_convergence_plans where id=pid and mission_id=mid) or (select count(*) from public.waouh_convergence_components where plan_id=pid)>=10 then raise exception 'invalid_plan_or_too_many_components' using errcode='22023'; end if;
  if pid=m.selected_plan_id and exists(select 1 from public.waouh_convergence_agreements ag join public.waouh_convergence_components cc on cc.id=ag.component_id where cc.plan_id=pid and (ag.owner_accepted_at is not null or ag.provider_accepted_at is not null)) then raise exception 'agreement_already_in_progress' using errcode='22023'; end if;
  insert into public.waouh_convergence_components(mission_id,plan_id,title,kind,source_ref,source_url,source_snapshot,amount,extra_cost,unit,scope,exclusions,availability)
   values(mid,pid,p->>'title',p->>'kind',p->>'source_ref',p->>'source_url',coalesce(p->'source_snapshot','{}'),nullif(p->>'amount','')::numeric,nullif(p->>'extra_cost','')::numeric,coalesce(nullif(p->>'unit',''),'forfait'),left(coalesce(p->>'scope',''),2000),left(coalesce(p->>'exclusions',''),2000),left(p->>'availability',300)) on conflict(plan_id,source_ref) do nothing;
 elsif p_action='component_remove' then
  if c.provider_id is not null or exists(select 1 from public.waouh_convergence_agreements where component_id=c.id) then raise exception 'component_has_commitments' using errcode='22023'; end if;
  delete from public.waouh_convergence_components where id=c.id;
 elsif p_action='invite' then
  if c.provider_id is not null then raise exception 'provider_already_linked' using errcode='22023'; end if;
  token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  update public.waouh_convergence_components set invite_hash=encode(sha256(convert_to(token,'UTF8')),'hex'),invite_expires_at=now()+interval '7 days' where id=c.id;
  return jsonb_build_object('token',token,'expires_in_days',7);
 elsif p_action like 'agreement_%' then
  if c.id is null or (not own and c.provider_id is distinct from p_actor) then raise exception 'forbidden' using errcode='42501'; end if;
  select * into a from public.waouh_convergence_agreements where component_id=c.id for update;
  if p_action='agreement_propose' then
   if a.status='completed' or a.owner_completed_at is not null or a.provider_completed_at is not null then raise exception 'agreement_completed' using errcode='22023'; end if;
   j:=p->'terms';
   if jsonb_typeof(j)<>'object' or length(coalesce(j->>'scope',''))<3 or length(coalesce(j->>'expected_result',''))<3 or (j->>'amount') is null or (j->>'amount')::numeric<0 or length(coalesce(j->>'deadline',''))<3 or length(coalesce(j->>'exclusions',''))<1 then raise exception 'incomplete_agreement' using errcode='22023'; end if;
   if (j->>'amount')::numeric>1e10 then raise exception 'amount_too_large' using errcode='22023'; end if;
   insert into public.waouh_convergence_agreements(component_id,terms) values(c.id,j) on conflict(component_id) do update set terms=excluded.terms,version=waouh_convergence_agreements.version+1,
    owner_accepted_at=null,provider_accepted_at=null,owner_completed_at=null,provider_completed_at=null,status='proposed',updated_at=now();
   if a.id is not null then insert into public.waouh_convergence_events(actor_id,mission_id,event_type) values(p_actor,mid,'agreement_revised'); end if;
  elsif p_action='agreement_accept' then
   if a.id is null or c.provider_id is null or c.provider_id=m.owner_id or (p->>'version')::integer is distinct from a.version or a.status not in ('proposed','accepted') or m.selected_plan_id is distinct from c.plan_id then raise exception 'agreement_unavailable_or_changed' using errcode='22023'; end if;
   if m.budget_max is not null and m.budget_max < (select coalesce(sum((ag.terms->>'amount')::numeric),0) from public.waouh_convergence_agreements ag join public.waouh_convergence_components cc on cc.id=ag.component_id where cc.plan_id=m.selected_plan_id and ag.status<>'rejected') then raise exception 'budget_exceeded' using errcode='22023'; end if;
   if own then update public.waouh_convergence_agreements set owner_accepted_at=coalesce(owner_accepted_at,now()),updated_at=now() where id=a.id;
   else update public.waouh_convergence_agreements set provider_accepted_at=coalesce(provider_accepted_at,now()),updated_at=now() where id=a.id; end if;
   update public.waouh_convergence_agreements set status='accepted' where id=a.id and owner_accepted_at is not null and provider_accepted_at is not null;
   update public.waouh_convergence_missions set status=case when exists(select 1 from public.waouh_convergence_agreements where id=a.id and status='accepted') then 'active' else 'agreed' end,updated_at=now() where id=mid;
  elsif p_action='agreement_complete' then
   if a.status not in ('accepted','completed') or (p->>'version')::integer is distinct from a.version then raise exception 'confirmed_agreement_required' using errcode='22023'; end if;
   if own then update public.waouh_convergence_agreements set owner_completed_at=coalesce(owner_completed_at,now()),owner_note=left(p->>'note',2000),updated_at=now() where id=a.id;
   else update public.waouh_convergence_agreements set provider_completed_at=coalesce(provider_completed_at,now()),provider_note=left(p->>'note',2000),updated_at=now() where id=a.id; end if;
   update public.waouh_convergence_agreements set status='completed' where id=a.id and owner_completed_at is not null and provider_completed_at is not null;
   if exists(select 1 from public.waouh_convergence_components where plan_id=m.selected_plan_id) and not exists(
     select 1 from public.waouh_convergence_components cc left join public.waouh_convergence_agreements ag on ag.component_id=cc.id where cc.plan_id=m.selected_plan_id and ag.status is distinct from 'completed') then
    update public.waouh_convergence_missions set status='completed',updated_at=now() where id=mid;
   end if;
  elsif p_action='agreement_reject' then
   if a.id is null or (p->>'version')::integer is distinct from a.version then raise exception 'agreement_unavailable_or_changed' using errcode='22023'; end if;
   if a.status='completed' or a.owner_completed_at is not null or a.provider_completed_at is not null then raise exception 'agreement_completed' using errcode='22023'; end if;
   update public.waouh_convergence_agreements set status='rejected',owner_accepted_at=null,provider_accepted_at=null,owner_completed_at=null,provider_completed_at=null,updated_at=now() where id=a.id;
  else raise exception 'unknown_action' using errcode='22023'; end if;
 else raise exception 'unknown_action' using errcode='22023'; end if;
 insert into public.waouh_convergence_events(actor_id,mission_id,event_type,payload) values(p_actor,mid,p_action,jsonb_build_object('component_id',c.id));
 return public.waouh_convergence_bundle(p_actor,mid);
end $$;
revoke all on function public.waouh_convergence_command(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.waouh_convergence_command(uuid,text,jsonb) to service_role;
