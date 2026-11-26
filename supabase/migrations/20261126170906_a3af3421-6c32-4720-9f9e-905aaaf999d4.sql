create or replace function public.waouh_notify_agreement_to_validate()
returns trigger language plpgsql security definer set search_path=public as $$
declare r public.waouh_deal_room_links;
begin
  if new.provider_accepted_at is null or new.owner_accepted_at is not null or new.status not in ('proposed') then return new; end if;
  if tg_op='UPDATE' and old.provider_accepted_at is not null then return new; end if;
  select * into r from public.waouh_deal_room_links where id=new.component_id;
  if r.id is null or r.owner_id is null then return new; end if;
  insert into public.notifications(user_id,title,content,type,action_url,metadata)
  values (r.owner_id,'Accord à valider','Votre interlocuteur a accepté les conditions. Vérifiez et validez l''accord.',
    'agreement_to_validate','/app/chat/room?room_id='||r.id,
    jsonb_build_object('room_id',r.id,'agreement_id',new.id,'version',new.version,'bot',r.control_mode='bot'));
  return new;
end $$;
revoke all on function public.waouh_notify_agreement_to_validate() from public, anon, authenticated;
drop trigger if exists waouh_agreement_to_validate on public.waouh_convergence_agreements;
create trigger waouh_agreement_to_validate after insert or update of provider_accepted_at on public.waouh_convergence_agreements
for each row execute function public.waouh_notify_agreement_to_validate();