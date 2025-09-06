
-- 1) Activer RLS et politiques sur whatsapp_accounts
alter table if exists public.whatsapp_accounts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'whatsapp_accounts_user_session_unique'
  ) then
    alter table public.whatsapp_accounts
      add constraint whatsapp_accounts_user_session_unique unique (user_id, session_name);
  end if;
end $$;

-- Supprimer d'éventuelles anciennes policies au besoin (optionnel et idempotent)
drop policy if exists "WA: users can view own accounts" on public.whatsapp_accounts;
drop policy if exists "WA: users can insert own accounts" on public.whatsapp_accounts;
drop policy if exists "WA: users can update own accounts" on public.whatsapp_accounts;
drop policy if exists "WA: users can delete own accounts" on public.whatsapp_accounts;

create policy "WA: users can view own accounts"
  on public.whatsapp_accounts
  for select
  using (user_id = auth.uid());

create policy "WA: users can insert own accounts"
  on public.whatsapp_accounts
  for insert
  with check (user_id = auth.uid());

create policy "WA: users can update own accounts"
  on public.whatsapp_accounts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "WA: users can delete own accounts"
  on public.whatsapp_accounts
  for delete
  using (user_id = auth.uid());

-- 2) Fonctions d’aide (SECURITY DEFINER) pour les policies des liens
create or replace function public.user_owns_whatsapp_account(acc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.whatsapp_accounts a
    where a.id = acc_id
      and a.user_id = auth.uid()
  );
$$;

create or replace function public.user_owns_bot(p_bot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bots b
    join public.bot_owners bo on b.owner_id = bo.id
    where b.id = p_bot_id
      and bo.user_id = auth.uid()
  );
$$;

-- 3) Activer RLS et policies sur whatsapp_bot_links
alter table if exists public.whatsapp_bot_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'whatsapp_bot_links_unique'
  ) then
    alter table public.whatsapp_bot_links
      add constraint whatsapp_bot_links_unique unique (whatsapp_account_id, bot_id);
  end if;
end $$;

drop policy if exists "WA Links: users can view own links" on public.whatsapp_bot_links;
drop policy if exists "WA Links: users can manage own links" on public.whatsapp_bot_links;
drop policy if exists "WA Links: users can insert own links" on public.whatsapp_bot_links;
drop policy if exists "WA Links: users can update own links" on public.whatsapp_bot_links;
drop policy if exists "WA Links: users can delete own links" on public.whatsapp_bot_links;

-- Lecture: appartenir au compte WhatsApp de l'utilisateur
create policy "WA Links: users can view own links"
  on public.whatsapp_bot_links
  for select
  using (
    public.user_owns_whatsapp_account(whatsapp_account_id)
  );

-- Insertion: le compte WhatsApp appartient à l'utilisateur ET le bot aussi
create policy "WA Links: users can insert own links"
  on public.whatsapp_bot_links
  for insert
  with check (
    public.user_owns_whatsapp_account(whatsapp_account_id)
    and public.user_owns_bot(bot_id)
  );

-- Mise à jour: mêmes conditions que lecture + check de cohérence
create policy "WA Links: users can update own links"
  on public.whatsapp_bot_links
  for update
  using (
    public.user_owns_whatsapp_account(whatsapp_account_id)
  )
  with check (
    public.user_owns_whatsapp_account(whatsapp_account_id)
    and public.user_owns_bot(bot_id)
  );

-- Suppression: appartenir au compte WhatsApp de l'utilisateur
create policy "WA Links: users can delete own links"
  on public.whatsapp_bot_links
  for delete
  using (
    public.user_owns_whatsapp_account(whatsapp_account_id)
  );
