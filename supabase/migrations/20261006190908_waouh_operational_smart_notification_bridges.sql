-- WAOUH operational Smart Notification bridges.
-- Verified production definitions after migration 20261006190908.
-- Unifies Partner, Stock and Diffusion lifecycle events in waouh_notifications.

CREATE OR REPLACE FUNCTION public.waouh_pick_notification_identity(p_auth_user_id uuid)
 RETURNS TABLE(user_id uuid, web_session_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $
  select u.id, u.web_session_id
  from public.waouh_users u
  where p_auth_user_id is not null
    and u.auth_user_id = p_auth_user_id
  order by (u.web_session_id is not null) desc, u.updated_at desc nulls last, u.created_at desc
  limit 1
$

CREATE OR REPLACE FUNCTION public.waouh_notify_partner_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $
declare
  v_auth uuid;
  v_uid uuid;
  v_session text;
  v_type text;
  v_status text := lower(coalesce(new.statut,'recorded'));
begin
  if tg_op='UPDATE' and new.statut is not distinct from old.statut then
    return new;
  end if;

  select p.user_id into v_auth
  from public.waouh_partners p
  where p.id=new.partner_id;

  select x.user_id,x.web_session_id into v_uid,v_session
  from public.waouh_pick_notification_identity(v_auth) x;

  if v_uid is null then return new; end if;
  v_type := case when tg_op='INSERT' then 'partner_sale_recorded' else 'partner_sale_'||v_status end;

  insert into public.waouh_notifications(
    user_id, notification_type, channel, web_session_id, dedupe_key, payload
  ) values (
    v_uid, v_type, 'waouh_app', v_session,
    'op:partner_sale:'||new.id::text||':'||v_status,
    jsonb_build_object(
      'title', case when tg_op='INSERT' then 'Nouvelle vente partenaire' else 'Vente mise à jour' end,
      'detail', trim(to_char(coalesce(new.montant_vente,0),'FM999G999G999G990'))||' FCFA · statut '||v_status,
      'text', case when tg_op='INSERT' then 'Une vente vient d’être attribuée à votre espace partenaire.' else 'Le statut de votre vente a changé.' end,
      'partner_id', new.partner_id,
      'sale_id', new.id,
      'transaction_id', new.transaction_id,
      'amount', new.montant_vente,
      'commission_partner', new.commission_partner,
      'status', v_status,
      'target_route','/app/partner/sales',
      'actions', jsonb_build_array(jsonb_build_object(
        'id','open_context','label','Voir la vente','kind','navigate',
        'route','/app/partner/sales','priority',1,
        'requires_auth',true,'requires_confirmation',false,
        'payload',jsonb_build_object('route','/app/partner/sales')
      )),
      'correlation_id','partner-sale:'||new.id::text||':'||v_status
    )
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$

CREATE OR REPLACE FUNCTION public.waouh_notify_partner_payout()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $
declare
  v_auth uuid;
  v_uid uuid;
  v_session text;
  v_status text := lower(coalesce(new.statut,'pending'));
begin
  if tg_op='UPDATE' and new.statut is not distinct from old.statut then return new; end if;

  select p.user_id into v_auth from public.waouh_partners p where p.id=new.partner_id;
  select x.user_id,x.web_session_id into v_uid,v_session
  from public.waouh_pick_notification_identity(v_auth) x;
  if v_uid is null then return new; end if;

  insert into public.waouh_notifications(
    user_id, notification_type, channel, web_session_id, dedupe_key, payload
  ) values (
    v_uid, 'partner_payout_'||v_status, 'waouh_app', v_session,
    'op:partner_payout:'||new.id::text||':'||v_status,
    jsonb_build_object(
      'title', case when v_status in ('paid','paye','payé') then 'Versement partenaire effectué' else 'Versement partenaire '||v_status end,
      'detail', trim(to_char(coalesce(new.montant_total,0),'FM999G999G999G990'))||' FCFA · '||coalesce(new.nb_ventes,0)||' vente(s)',
      'text','Le statut de votre versement partenaire a changé.',
      'partner_id',new.partner_id,
      'payout_id',new.id,
      'amount',new.montant_total,
      'status',v_status,
      'target_route','/app/partner/payouts',
      'actions',jsonb_build_array(jsonb_build_object(
        'id','open_context','label','Voir le versement','kind','navigate',
        'route','/app/partner/payouts','priority',1,
        'requires_auth',true,'requires_confirmation',false,
        'payload',jsonb_build_object('route','/app/partner/payouts')
      )),
      'correlation_id','partner-payout:'||new.id::text||':'||v_status
    )
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$

CREATE OR REPLACE FUNCTION public.waouh_notify_stock_reorder()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $
declare
  v_uid uuid;
  v_session text;
  v_status text := lower(coalesce(new.status,'pending'));
  v_product_name text;
begin
  if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;

  select x.user_id,x.web_session_id into v_uid,v_session
  from public.waouh_pick_notification_identity(new.user_id) x;
  if v_uid is null then return new; end if;

  select p.nom into v_product_name
  from public.waouh_partner_products p where p.id=new.product_id;

  insert into public.waouh_notifications(
    user_id, notification_type, channel, web_session_id, dedupe_key, payload
  ) values (
    v_uid, 'stock_reorder_'||v_status, 'waouh_app', v_session,
    'op:stock_reorder:'||new.id::text||':'||v_status,
    jsonb_build_object(
      'title',case when tg_op='INSERT' then 'Réapprovisionnement demandé' else 'Réapprovisionnement '||v_status end,
      'detail',coalesce(v_product_name,'Produit')||' · quantité '||new.quantity_requested::text,
      'text','Votre demande de réapprovisionnement est suivie dans WAOUH.',
      'stock_item_id',new.product_id,
      'reorder_request_id',new.id,
      'quantity',new.quantity_requested,
      'status',v_status,
      'target_route','/app/stock',
      'actions',jsonb_build_array(jsonb_build_object(
        'id','open_context','label','Voir le stock','kind','navigate',
        'route','/app/stock','priority',1,
        'requires_auth',true,'requires_confirmation',false,
        'payload',jsonb_build_object('route','/app/stock')
      )),
      'correlation_id','stock-reorder:'||new.id::text||':'||v_status
    )
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$

CREATE OR REPLACE FUNCTION public.waouh_notify_diffusion_campaign()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $
declare
  v_uid uuid;
  v_session text;
  v_status text := lower(coalesce(new.status,'draft'));
begin
  if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;

  select x.user_id,x.web_session_id into v_uid,v_session
  from public.waouh_pick_notification_identity(new.user_id) x;
  if v_uid is null then return new; end if;

  insert into public.waouh_notifications(
    user_id, notification_type, channel, web_session_id, dedupe_key, payload
  ) values (
    v_uid, 'diffusion_campaign_'||v_status, 'waouh_app', v_session,
    'op:diffusion_campaign:'||new.id::text||':'||v_status,
    jsonb_build_object(
      'title',case
        when v_status in ('completed','done','sent') then 'Diffusion terminée'
        when v_status in ('running','sending','active') then 'Diffusion en cours'
        when v_status in ('failed','error') then 'Diffusion à vérifier'
        else 'Diffusion '||v_status end,
      'detail',coalesce(nullif(new.name,''),'Campagne WAOUH'),
      'text','Le statut de votre diffusion a changé.',
      'campaign_id',new.id,
      'status',v_status,
      'stats',coalesce(new.stats,'{}'::jsonb),
      'target_route','/app/diffusion',
      'actions',jsonb_build_array(jsonb_build_object(
        'id','open_context','label','Suivre la diffusion','kind','navigate',
        'route','/app/diffusion','priority',1,
        'requires_auth',true,'requires_confirmation',false,
        'payload',jsonb_build_object('route','/app/diffusion')
      )),
      'correlation_id','diffusion:'||new.id::text||':'||v_status
    )
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$

CREATE OR REPLACE FUNCTION public.waouh_notify_diffusion_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $
declare
  v_uid uuid;
  v_session text;
  v_status text := lower(coalesce(new.status,'pending'));
begin
  if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;
  select x.user_id,x.web_session_id into v_uid,v_session
  from public.waouh_pick_notification_identity(new.requested_by) x;
  if v_uid is null then return new; end if;

  insert into public.waouh_notifications(
    user_id, notification_type, channel, web_session_id, dedupe_key, payload
  ) values (
    v_uid, 'diffusion_approval_'||v_status, 'waouh_app', v_session,
    'op:diffusion_approval:'||new.id::text||':'||v_status,
    jsonb_build_object(
      'title',case
        when v_status='approved' then 'Diffusion approuvée'
        when v_status='rejected' then 'Diffusion à corriger'
        else 'Validation de diffusion '||v_status end,
      'detail',coalesce(new.reason,'Quota demandé : '||coalesce(new.quota_requested,0)::text),
      'text','Votre demande de validation Diffusion a été mise à jour.',
      'approval_id',new.id,
      'campaign_id',new.campaign_id,
      'status',v_status,
      'target_route','/app/diffusion',
      'actions',jsonb_build_array(jsonb_build_object(
        'id','open_context','label','Voir la diffusion','kind','navigate',
        'route','/app/diffusion','priority',1,
        'requires_auth',true,'requires_confirmation',false,
        'payload',jsonb_build_object('route','/app/diffusion')
      )),
      'correlation_id','diffusion-approval:'||new.id::text||':'||v_status
    )
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$


revoke all on function public.waouh_pick_notification_identity(uuid) from public, anon, authenticated;
revoke all on function public.waouh_notify_partner_sale() from public, anon, authenticated;
revoke all on function public.waouh_notify_partner_payout() from public, anon, authenticated;
revoke all on function public.waouh_notify_stock_reorder() from public, anon, authenticated;
revoke all on function public.waouh_notify_diffusion_campaign() from public, anon, authenticated;
revoke all on function public.waouh_notify_diffusion_approval() from public, anon, authenticated;

drop trigger if exists trg_waouh_notify_partner_sale on public.waouh_partner_sales;
create trigger trg_waouh_notify_partner_sale
after insert or update of statut on public.waouh_partner_sales
for each row execute function public.waouh_notify_partner_sale();

drop trigger if exists trg_waouh_notify_partner_payout on public.waouh_partner_payouts;
create trigger trg_waouh_notify_partner_payout
after insert or update of statut on public.waouh_partner_payouts
for each row execute function public.waouh_notify_partner_payout();

drop trigger if exists trg_waouh_notify_stock_reorder on public.waouh_stock_reorder_requests;
create trigger trg_waouh_notify_stock_reorder
after insert or update of status on public.waouh_stock_reorder_requests
for each row execute function public.waouh_notify_stock_reorder();

drop trigger if exists trg_waouh_notify_diffusion_campaign on public.wa_campaigns;
create trigger trg_waouh_notify_diffusion_campaign
after insert or update of status on public.wa_campaigns
for each row execute function public.waouh_notify_diffusion_campaign();

drop trigger if exists trg_waouh_notify_diffusion_approval on public.waouh_diffusion_approvals;
create trigger trg_waouh_notify_diffusion_approval
after insert or update of status on public.waouh_diffusion_approvals
for each row execute function public.waouh_notify_diffusion_approval();
