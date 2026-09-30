-- Avatar guide : l'avatar écrit dans le chat ; WhatsApp = réglages distincts (évènements d'offre : actif, bilans : coupé).
alter table public.waouh_avatar_prefs add column if not exists notify_events boolean not null default true;
alter table public.waouh_avatar_prefs add column if not exists notify_digest boolean not null default false;
grant update (notify_events, notify_digest) on public.waouh_avatar_prefs to authenticated;
