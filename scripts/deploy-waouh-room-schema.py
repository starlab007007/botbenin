#!/usr/bin/env python3
"""Apply only the reviewed room migration, atomically, through the management API."""
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

project = 'mvynepqulhflxtyymtzs'
version = '20261104082300'
sql = Path(f'supabase/migrations/{version}_waouh_unified_deal_rooms.sql').read_text()
assert '$room_migration$' not in sql
# Preserve the migration in history so a later CLI db push cannot replay it.
query = """begin;
select pg_advisory_xact_lock(hashtextextended('waouh-unified-room-schema',0));
do $guard$ begin
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261104082300') then
  if to_regclass('public.waouh_deal_room_links') is not null then raise exception 'Untracked room schema; reconciliation required';end if;
  if to_regprocedure('public.waouh_business_command(uuid,text,jsonb)') is null or to_regprocedure('public.waouh_module_policy(uuid)') is null then raise exception 'Business journey prerequisite missing';end if;
  execute $room_migration$""" + sql + """$room_migration$;
  insert into supabase_migrations.schema_migrations(version,name,statements)
  values('20261104082300','waouh_unified_deal_rooms',array[$room_migration$""" + sql + """$room_migration$]);
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
print('Unified room migration applied or already recorded.')
