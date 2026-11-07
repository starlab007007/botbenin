-- Annonce externe sans contact joignable : l'acheteur peut déjà écrire et proposer.
-- Le vendeur est rattaché en « attente » ; tout lui est transmis dès qu'un contact est trouvé.
create or replace function public.waouh_room_attach_pending_guest(p_room uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.waouh_convergence_components;own uuid;
begin
 select * into c from public.waouh_convergence_components where id=p_room for update;
 if c.id is null or c.provider_id is not null or coalesce(c.source_ref,'') not like 'external:%' then return false;end if;
 select owner_id into own from public.waouh_deal_room_links where id=p_room;
 update public.waouh_convergence_components set provider_id=public.waouh_room_guest_actor() where id=c.id;
 insert into public.waouh_room_events(room_id,actor_id,actor_kind,event_type,payload) values(p_room,own,'system','seller_pending','{}');
 return true;
end $$;
revoke all on function public.waouh_room_attach_pending_guest(uuid) from public,anon,authenticated;
grant execute on function public.waouh_room_attach_pending_guest(uuid) to service_role;
