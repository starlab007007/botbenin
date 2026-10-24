-- A changed group requires a fresh provider proposal. Member confirmations alone
-- cannot extend an earlier proposal to a different number of participants.
create function public.waouh_convergence_reset_pool_quote() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare changed_pool uuid;
begin
 changed_pool:=case when tg_op='DELETE' then old.pool_id else new.pool_id end;
 update public.waouh_convergence_pools
 set shared_cost=null,quote_scope=null,quote_expires_at=null,
     status=case when status='confirmed' then 'open' else status end
 where id=changed_pool;
 return null;
end $$;
revoke all on function public.waouh_convergence_reset_pool_quote() from public,anon,authenticated;
grant execute on function public.waouh_convergence_reset_pool_quote() to service_role;
create trigger waouh_convergence_members_need_new_quote
 after insert or delete on public.waouh_convergence_pool_members
 for each row execute function public.waouh_convergence_reset_pool_quote();
