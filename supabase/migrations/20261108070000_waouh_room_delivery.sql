-- Livraison dans la Deal Room : un accord « livraison » assigne un livreur ; la remise est validée par un code.
create table if not exists public.waouh_room_deliveries(
 room_id uuid primary key references public.waouh_deal_room_links(id) on delete cascade,
 agreement_version integer not null,
 status text not null default 'pending' check (status in ('pending','assigned','picked_up','delivered')),
 delivery_address text not null,
 delivery_fee numeric,
 pickup_city text,
 courier_id uuid references public.waouh_couriers(id),
 courier_name text,
 token_hash text unique,
 attempts integer not null default 0,
 assigned_at timestamptz,
 picked_up_at timestamptz,
 delivered_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now());
alter table public.waouh_room_deliveries enable row level security;
revoke all on public.waouh_room_deliveries from public,anon,authenticated;

create or replace function public.waouh_room_delivery_view(p_actor uuid,p_room uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.waouh_convergence_components;m public.waouh_convergence_missions;d public.waouh_room_deliveries;buyer boolean;
begin
 select * into c from public.waouh_convergence_components where id=p_room;
 select * into m from public.waouh_convergence_missions where id=c.mission_id;
 if c.id is null or (p_actor is distinct from m.owner_id and p_actor is distinct from c.provider_id) then raise exception 'forbidden' using errcode='42501';end if;
 select * into d from public.waouh_room_deliveries where room_id=p_room;
 if d.room_id is null then return jsonb_build_object('status','none');end if;
 buyer=case when m.criteria ? 'workflow:sale' then p_actor is distinct from m.owner_id else p_actor=m.owner_id end;
 return jsonb_build_object('status',d.status,'is_buyer',buyer,'courier_name',d.courier_name,'address',d.delivery_address,'fee',d.delivery_fee,
  'version',d.agreement_version,'assigned_at',d.assigned_at,'picked_up_at',d.picked_up_at,'delivered_at',d.delivered_at);
end $$;
revoke all on function public.waouh_room_delivery_view(uuid,uuid) from public,anon,authenticated;
grant execute on function public.waouh_room_delivery_view(uuid,uuid) to service_role;

-- Code vérifié : la réception est enregistrée pour l'acheteur et la remise pour le vendeur, comme une double confirmation.
create or replace function public.waouh_room_delivery_complete(p_room uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.waouh_convergence_components;m public.waouh_convergence_missions;buyer_actor uuid;seller_actor uuid;
begin
 select * into c from public.waouh_convergence_components where id=p_room;
 select * into m from public.waouh_convergence_missions where id=c.mission_id;
 if c.id is null then return false;end if;
 if m.criteria ? 'workflow:sale' then buyer_actor=c.provider_id;seller_actor=m.owner_id;else buyer_actor=m.owner_id;seller_actor=c.provider_id;end if;
 update public.waouh_room_deliveries set status='delivered',delivered_at=now(),updated_at=now() where room_id=p_room and status<>'delivered';
 if not found then return false;end if;
 perform public.waouh_room_command(buyer_actor,'receipt',jsonb_build_object('deal_room_id',p_room,'request_id',gen_random_uuid(),'text','Remis par le livreur, code vérifié.'));
 perform public.waouh_room_command(seller_actor,'receipt',jsonb_build_object('deal_room_id',p_room,'request_id',gen_random_uuid(),'text','Remis au livreur.'));
 return true;
end $$;
revoke all on function public.waouh_room_delivery_complete(uuid) from public,anon,authenticated;
grant execute on function public.waouh_room_delivery_complete(uuid) to service_role;
