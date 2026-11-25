"""Export only the dedicated runtime credential for the existing VPS deployment."""
import json
import os
from pathlib import Path
import sys
import urllib.request

request=urllib.request.Request('https://api.supabase.com/v1/projects/mvynepqulhflxtyymtzs/database/query',
 data=json.dumps({'query':"select decrypted_secret as token from vault.decrypted_secrets where name='waouh_collection_engine_secret' limit 1"}).encode(),
 headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'})
with urllib.request.urlopen(request,timeout=30) as response: token=json.load(response)[0]['token']
if len(token)!=64 or not token.isalnum():raise ValueError('invalid runtime credential')
fd=os.open(Path(sys.argv[1]),os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
with os.fdopen(fd,'w') as output:output.write(token+'\n')
print('Dedicated collection runtime credential prepared')
