insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'waouh-diffusion-media',
  'waouh-diffusion-media',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "waouh diffusion media owner read" on storage.objects;
create policy "waouh diffusion media owner read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'waouh-diffusion-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role(auth.uid(),'admin')
    or public.has_role(auth.uid(),'super_admin')
  )
);

drop policy if exists "waouh diffusion media owner insert" on storage.objects;
create policy "waouh diffusion media owner insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'waouh-diffusion-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp'])
);

drop policy if exists "waouh diffusion media owner update" on storage.objects;
create policy "waouh diffusion media owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'waouh-diffusion-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'waouh-diffusion-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "waouh diffusion media owner delete" on storage.objects;
create policy "waouh diffusion media owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'waouh-diffusion-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
