"""Apply only the reviewed additive GUARDIAN migration, atomically and once."""
import hashlib
from pathlib import Path
import sys
import json
import re
import urllib.error
from provision import query
MIGRATIONS=[
    ('20261029014011','waouh_guardian',"to_regclass('public.waouh_guardian_settings') is not null"),
    ('20261029081414','waouh_guardian_autonomy',"exists(select 1 from information_schema.columns where table_schema='public' and table_name='waouh_guardian_incidents' and column_name='notified_states')"),
]
def literal(value): return "'"+value.replace("'","''")+"'"
def apply(version,name,installed):
    sql=(Path('supabase/migrations')/(version+'_'+name+'.sql')).read_text()
    print('GUARDIAN migration: preflight')
    state=query("select "+installed+" as installed,(select md5(statements[1]) from supabase_migrations.schema_migrations where version='"+version+"') as digest;")[0]
    if state['installed']:
        if state['digest']!=hashlib.md5(sql.encode()).hexdigest(): raise ValueError('schema history differs')
        print('GUARDIAN: migration already applied');return
    if state['digest']: raise ValueError('inconsistent history')
    print('GUARDIAN migration: applying reviewed SQL')
    query('begin;\n'+sql+'\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('+literal(version)+','+literal(name)+',array['+literal(sql)+']);\ncommit;')
    print('GUARDIAN migration: verifying schema')
    check=query('select count(*) as n from public.waouh_guardian_components;')[0]
    if check['n']!=16 or query('select '+installed+' as installed;')[0]['installed'] is not True: raise ValueError('schema verification')
    print('GUARDIAN: additive migration verified '+hashlib.sha256(sql.encode()).hexdigest()[:12])
def main():
    for migration in MIGRATIONS: apply(*migration)
if __name__=='__main__':
    try: main()
    except urllib.error.HTTPError as error:
        try:
            body=json.loads(error.read())
            message=str(body.get('message') or body.get('error') or 'request rejected')
            message=re.sub(r'[A-Za-z0-9_.-]{48,}', '[redacted]', message)
            print('GUARDIAN migration HTTP '+str(error.code)+': '+message[:600],file=sys.stderr)
        except Exception: print('GUARDIAN migration HTTP '+str(error.code),file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        print('GUARDIAN migration: '+type(error).__name__,file=sys.stderr)
        sys.exit(1)
