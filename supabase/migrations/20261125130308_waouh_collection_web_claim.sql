-- Web discovery uses the same lease and pause checks as the site and feed workers.
create or replace function public.waouh_collection_claim_targeted(p_handlers text[])
returns jsonb language plpgsql set search_path='' as $$
declare job_id uuid;
begin
 select j.id into job_id
 from public.waouh_collection_jobs j
 join public.waouh_collection_targets t on t.id=j.target_id and t.enabled
 join public.waouh_collection_policies p on p.provider=j.provider and not p.paused
 where j.handler=any(p_handlers) and j.handler in ('feed','site','apify','web')
  and not j.inline and (p.cooldown_until is null or p.cooldown_until<=now())
  and ((j.status='queued' and j.not_before<=now()) or (j.status='running' and j.lease_until<=now()))
 order by j.priority desc,j.created_at,j.id
 for update of j skip locked limit 1;
 if job_id is null then return null;end if;
 return public.waouh_collection_claim(job_id);
end;$$;
revoke all on function public.waouh_collection_claim_targeted(text[]) from public,anon,authenticated;
grant execute on function public.waouh_collection_claim_targeted(text[]) to service_role;
