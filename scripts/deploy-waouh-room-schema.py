#!/usr/bin/env python3
"""Apply only reviewed room migrations, atomically, through the management API."""
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

project = 'mvynepqulhflxtyymtzs'
migrations = [
    ('20261104082300', 'waouh_unified_deal_rooms'),
    ('20261104105439', 'waouh_room_followup_resume_cooldown'),
    ('20261104111700', 'waouh_room_progressive_guidance'),
    ('20261106200000', 'waouh_opportunity_outcome'),
    ('20261106220000', 'waouh_room_external_owner'),
    ('20261116214500', 'waouh_room_outreach_recovery'),
    ('20261116214600', 'waouh_sale_deal_rooms'),
    ('20261116214700', 'waouh_article_contact_privacy'),
    ('20261116214800', 'waouh_room_delivery_confirmation'),
    ('20261117060957', 'waouh_waha_unsupported_endpoint_fallback'),
    ('20261117063000', 'waouh_room_catalog_contact_privacy'),
]
for version, name in migrations:
    sql = Path(f'supabase/migrations/{version}_{name}.sql').read_text()
    assert '$room_migration$' not in sql
    prerequisite = (
        "if to_regclass('public.waouh_deal_room_links') is not null then raise exception 'Untracked room schema; reconciliation required';end if;"
        if version == '20261104082300' else
        "if to_regclass('public.waouh_deal_room_links') is null then raise exception 'Room schema prerequisite missing';end if;"
    )
    query = f"""begin;
select pg_advisory_xact_lock(hashtextextended('waouh-unified-room-schema',0));
do $guard$ begin
 if not exists(select 1 from supabase_migrations.schema_migrations where version='{version}') then
  {prerequisite}
  if to_regprocedure('public.waouh_business_command(uuid,text,jsonb)') is null or to_regprocedure('public.waouh_module_policy(uuid)') is null then raise exception 'Business journey prerequisite missing';end if;
  execute $room_migration${sql}$room_migration$;
  insert into supabase_migrations.schema_migrations(version,name,statements)
  values('{version}','{name}',array[$room_migration${sql}$room_migration$]);
 end if;
end $guard$;
commit;"""
    request = Request(f'https://api.supabase.com/v1/projects/{project}/database/query',
        data=json.dumps({'query': query}).encode(), method='POST',
        headers={'Authorization': 'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'], 'Content-Type':'application/json'})
    with urlopen(request, timeout=120) as response:
        result=json.load(response)
        if isinstance(result,dict) and (result.get('error') or result.get('message')):
            raise RuntimeError('Schema application was not confirmed')
    print(f'Room migration {version} applied or already recorded.')
