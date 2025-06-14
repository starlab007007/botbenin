
-- Créer le bucket de stockage "public-media" et le rendre public
insert into storage.buckets (id, name, public)
values ('public-media', 'public-media', true);

-- Autoriser tous les utilisateurs à uploader, lister, télécharger et supprimer dans ce bucket (accès très permissif pour démonstration/prototype)
-- Télécharger/lister les fichiers:
create policy "Allow public read on public-media"
on storage.objects
for select
using (bucket_id = 'public-media');

-- Uploader des fichiers:
create policy "Allow public upload on public-media"
on storage.objects
for insert
with check (bucket_id = 'public-media');

-- Supprimer des fichiers:
create policy "Allow public delete on public-media"
on storage.objects
for delete
using (bucket_id = 'public-media');
