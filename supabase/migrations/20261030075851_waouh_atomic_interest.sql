-- One initial contact per owner/component across retries and devices.
create or replace function public.waouh_business_open(p_actor uuid,p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare c public.waouh_convergence_components; m public.waouh_convergence_missions; b jsonb; rid uuid; msg text;
begin
 select * into c from public.waouh_convergence_components where id=(p->>'component_id')::uuid;
 if c.id is null then raise exception 'forbidden' using errcode='42501';end if;
 select * into m from public.waouh_convergence_missions where id=c.mission_id for update;
 if m.owner_id is distinct from p_actor or (p->>'mission_id' is not null and (p->>'mission_id')::uuid<>m.id) then raise exception 'forbidden' using errcode='42501';end if;
 if m.status in ('completed','cancelled') then raise exception 'mission_closed';end if;
 if p->>'confirmed' is distinct from 'true' then raise exception 'explicit_confirmation_required' using errcode='42501';end if;
 b=public.waouh_business_command(p_actor,'business.contact',jsonb_build_object('component_id',c.id,'confirmed',true));
 if b->>'needs_invite'='true' then return b||jsonb_build_object('contact_state','contact_required');end if;
 -- Fixed server-side UUID; a changed browser request ID cannot duplicate the opener.
 rid=md5('waouh-interest:'||p_actor::text||':'||c.id::text)::uuid;
 if exists(select 1 from public.waouh_business_messages where actor_id=p_actor and request_id=rid) then
  return b||jsonb_build_object('contact_state','recorded');
 end if;
 msg=case c.kind when 'service' then 'Bonjour, je souhaite un devis pour cette prestation.' when 'announcement' then 'Bonjour, je souhaite connaître les modalités de cette opportunité.' else 'Bonjour, je suis intéressé. Cette offre est-elle disponible ?' end;
 b=public.waouh_business_command(p_actor,'business.message',jsonb_build_object('component_id',c.id,'request_id',rid,'text',msg));
 return b||jsonb_build_object('contact_state','recorded');
end $$;
revoke all on function public.waouh_business_open(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.waouh_business_open(uuid,jsonb) to service_role;
