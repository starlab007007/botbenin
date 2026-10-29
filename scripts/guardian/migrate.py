"""Apply only the reviewed additive GUARDIAN migration, atomically and once."""
import hashlib
from pathlib import Path
import sys
from provision import query
VERSION='20261029014011'
NAME='waouh_guardian'
PATH=Path('supabase/migrations')/(VERSION+'_'+NAME+'.sql')
def literal(value): return "'"+value.replace("'","''")+"'"
def main():
    sql=PATH.read_text()
    state=query("select to_regclass('public.waouh_guardian_settings') is not null as installed,(select md5(statements[1]) from supabase_migrations.schema_migrations where version='"+VERSION+"') as digest;")[0]
    if state['installed']:
        if state['digest']!=hashlib.md5(sql.encode()).hexdigest(): raise ValueError('schema history differs')
        print('GUARDIAN: migration already applied');return
    if state['digest']: raise ValueError('inconsistent history')
    query('begin;\n'+sql+'\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('+literal(VERSION)+','+literal(NAME)+',array['+literal(sql)+']);\ncommit;')
    check=query('select count(*) as n from public.waouh_guardian_components;')[0]
    if check['n']!=16: raise ValueError('schema verification')
    print('GUARDIAN: additive migration verified '+hashlib.sha256(sql.encode()).hexdigest()[:12])
if __name__=='__main__':
    try: main()
    except Exception: print('GUARDIAN: migration not confirmed',file=sys.stderr);sys.exit(1)
