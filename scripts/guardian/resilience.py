"""Independent public API probe; no privileged credential, no business writes."""
import datetime
import json
import time
import urllib.request
import urllib.error

URL = 'https://mvynepqulhflxtyymtzs.supabase.co/rest/v1/rpc/waouh_module_policy'
PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8'

def probe(opener=urllib.request.urlopen):
    start=time.monotonic()
    status=0
    cause='TRANSPORT_UNAVAILABLE'
    try:
        req=urllib.request.Request(URL,data=b'{}',headers={'apikey':PUBLIC_KEY,'Authorization':'Bearer '+PUBLIC_KEY,'Content-Type':'application/json','Cache-Control':'no-cache'})
        with opener(req,timeout=8) as response:
            status=response.status
            raw=response.read(65537)
            rows=json.loads(raw) if len(raw)<=65536 else None
            valid=isinstance(rows,list) and bool(rows) and all(isinstance(row,dict) and isinstance(row.get('module_key'),str) and isinstance(row.get('access_enabled'),bool) for row in rows)
            cause='OK' if status==200 and valid else 'INVALID_POLICY_RESPONSE'
    except urllib.error.HTTPError as error:
        status=error.code
        error.close()
        cause='API_UNAVAILABLE' if status>=500 else 'API_REJECTED'
    except (OSError,ValueError,TypeError):
        pass
    latency=round((time.monotonic()-start)*1000)
    return {'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'component':'postgrest_module_policy','status':'healthy' if cause=='OK' and latency<5000 else 'degraded' if cause=='OK' else 'down','http_status':status,'latency_ms':latency,'cause':cause}

if __name__=='__main__':
    result=probe()
    print(json.dumps(result))
    raise SystemExit(0 if result['status']=='healthy' else 1)
