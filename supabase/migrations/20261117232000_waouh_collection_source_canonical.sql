-- Group IDs were resolved from Facebook's own share-link redirects, including
-- the validated next= group URL on the login landing page. No login is bypassed.
update waouh_radar_sources s set config=s.config||jsonb_build_object(
  'canonical_url',resolved.canonical_url,'canonical_resolution','facebook_share_redirect'),scan_freq_min=4320
from (values
  ('1C3QQ9anab','https://www.facebook.com/groups/488555522301483/'),
  ('18mbeq41wG','https://www.facebook.com/groups/1782334119386636/'),
  ('1GniWJmVPE','https://www.facebook.com/groups/166338580504900/'),
  ('1D6L9C8jaM','https://www.facebook.com/groups/533861501250506/'),
  ('1B76mFTR3Y','https://www.facebook.com/groups/168720348290574/'),
  ('1EnAfmcbFk','https://www.facebook.com/groups/1330612040807679/'),
  ('1BDJQfuY3K','https://www.facebook.com/groups/430930706219967/'),
  ('1BEecDDiqA','https://www.facebook.com/groups/5398274373570327/')
) resolved(share_id,canonical_url)
where s.type='fb_group' and s.identifier like '%/share/g/'||resolved.share_id||'/%';
update waouh_radar_sources set scan_freq_min=4320 where type='fb_group' and active;
update waouh_collection_targets t set interval_minutes=s.scan_freq_min
from waouh_radar_sources s where t.radar_source_id=s.id and s.type='fb_group';
