-- La fusion des vendeurs couvre aussi les comptes de réseaux sociaux (même identifiant = même vendeur).
do $$
declare d text;
begin
  select pg_get_functiondef('public.waouh_merge_duplicate_entities(integer)'::regprocedure) into d;
  d := replace(d, 'c.channel in (''phone'',''whatsapp'',''email'')', 'c.channel in (''phone'',''whatsapp'',''email'',''facebook'',''instagram'',''tiktok'',''telegram'')');
  if position('instagram' in d) = 0 then raise exception 'merge_patch_failed'; end if;
  execute d;
end $$;
select public.waouh_merge_duplicate_entities(50);
