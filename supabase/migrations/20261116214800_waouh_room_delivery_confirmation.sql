-- Record assignment and queue the matching invitation in one transaction.
create or replace function public.waouh_room_assign_courier(p_room uuid, p_courier uuid, p_token_hash text, p_text text)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
 courier public.waouh_couriers;
 delivery public.waouh_room_deliveries;
begin
 select * into courier from public.waouh_couriers where id=p_courier and active;
 if courier.id is null or length(regexp_replace(coalesce(courier.phone_number,''),'[^0-9]','','g')) not between 8 and 15
    or p_token_hash !~ '^[0-9a-f]{64}$' or length(p_text) not between 8 and 3000 then return false; end if;
 update public.waouh_room_deliveries
 set status='assigned',courier_id=courier.id,courier_name=coalesce(courier.name,'Livreur'),
     token_hash=p_token_hash,assigned_at=now(),updated_at=now(),attempts=0
 where room_id=p_room and status='pending'
 returning * into delivery;
 if delivery.room_id is null then return false; end if;
 perform public.waouh_enqueue_outbound_v2(
   p_to_phone=>regexp_replace(courier.phone_number,'[^0-9]','','g'),p_to_user_id=>null,
   p_template=>'deal_room_guest_outreach',
   p_payload=>jsonb_build_object('waha_session','WaouhApp','text',p_text,'actions','[]'::jsonb,
    'room_id',p_room,'courier_id',p_courier,'courier_delivery',true,'agreement_version',delivery.agreement_version),
   p_channel=>'whatsapp',p_dedupe_key=>'dr-courier:'||p_room||':'||delivery.agreement_version,
   p_event_type=>'deal_room_courier');
 return true;
end;
$$;

create or replace function public.waouh_room_reject_delivery_code(p_room uuid)
returns void
language sql
set search_path = public, pg_temp
as $$
 update public.waouh_room_deliveries set attempts=attempts+1,updated_at=now()
 where room_id=p_room and status in ('assigned','picked_up') and attempts<5;
$$;

create or replace function public.waouh_room_delivery_complete(p_room uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
 c public.waouh_convergence_components;
 m public.waouh_convergence_missions;
 d public.waouh_room_deliveries;
 buyer_actor uuid;
 seller_actor uuid;
begin
 select * into d from public.waouh_room_deliveries where room_id=p_room for update;
 if d.status='delivered' then return true; end if;
 if d.room_id is null or d.status not in ('assigned','picked_up') or d.attempts>=5 then return false; end if;
 select * into c from public.waouh_convergence_components where id=p_room;
 select * into m from public.waouh_convergence_missions where id=c.mission_id;
 if c.id is null or c.provider_id is null or not exists (
   select 1 from public.waouh_convergence_agreements
   where component_id=p_room and version=d.agreement_version and status='accepted'
 ) then return false; end if;
 if m.criteria ? 'workflow:sale' then buyer_actor=c.provider_id; seller_actor=m.owner_id;
 else buyer_actor=m.owner_id; seller_actor=c.provider_id; end if;
 perform public.waouh_room_command(buyer_actor,'receipt',jsonb_build_object('deal_room_id',p_room,
   'request_id',gen_random_uuid(),'version',d.agreement_version,'text','Remis par le livreur, code vérifié.'));
 perform public.waouh_room_command(seller_actor,'receipt',jsonb_build_object('deal_room_id',p_room,
   'request_id',gen_random_uuid(),'version',d.agreement_version,'text','Remis au livreur.'));
 update public.waouh_room_deliveries set status='delivered',delivered_at=now(),updated_at=now() where room_id=p_room;
 return true;
end;
$$;

revoke all on function public.waouh_room_assign_courier(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.waouh_room_reject_delivery_code(uuid) from public,anon,authenticated;
grant execute on function public.waouh_room_assign_courier(uuid,uuid,text,text) to service_role;
grant execute on function public.waouh_room_reject_delivery_code(uuid) to service_role;
