import json
import os
from pathlib import Path
import sys
import urllib.request
PROJECT='mvynepqulhflxtyymtzs'
def query(sql):
    r=urllib.request.Request('https://api.supabase.com/v1/projects/'+PROJECT+'/database/query',data=json.dumps({'query':sql}).encode(),headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'})
    with urllib.request.urlopen(r,timeout=30) as response: return json.load(response)
def main():
    actor=sys.argv[1]
    if actor not in ('host','external','activate'): raise ValueError('actor')
    if actor=='activate':
        ok=query('select public.waouh_guardian_activate() as activated;')[0].get('activated') is True
        print('GUARDIAN: '+('monitoring activated' if ok else 'healthy baselines incomplete'));return 0 if ok else 1
    token=query("select decrypted_secret as token from vault.decrypted_secrets where name='waouh_guardian_"+actor+"_secret' limit 1;")[0]['token']
    if len(token)!=64: raise ValueError('credential')
    fd=os.open(Path(sys.argv[2]),os.O_WRONLY|os.O_TRUNC|os.O_CREAT,0o600)
    with os.fdopen(fd,'w') as out: json.dump({'token':token},out)
    print('GUARDIAN: dedicated probe configured');return 0
if __name__=='__main__':
    try: sys.exit(main())
    except Exception: print('GUARDIAN: configuration unavailable',file=sys.stderr);sys.exit(1)
