"""Production verification through the same gateway used by administrators.

Only the fixed non-publishing demonstration is run. No source is assigned or
enabled. Never print credentials or response bodies containing project keys.
"""
import json
import os
import time
import urllib.error
import urllib.request

project='mvynepqulhflxtyymtzs'
def request(url,body,headers,timeout=45):
    req=urllib.request.Request(url,data=None if body is None else json.dumps(body).encode(),headers=headers)
    try:
        with urllib.request.urlopen(req,timeout=timeout) as response:return response.status,json.load(response)
    except urllib.error.HTTPError as error:return error.code,None
management={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'}
status,keys=request('https://api.supabase.com/v1/projects/'+project+'/api-keys',None,management)
assert status==200,'Project credential lookup unavailable'
service=next(row['api_key'] for row in keys if row['name']=='service_role')
headers={'Authorization':'Bearer '+service,'apikey':service,'Content-Type':'application/json'}
url='https://'+project+'.supabase.co/functions/v1/waouh-radar-site-scraper'
for attempt in range(24):
    status,overview=request(url,{'action':'collection.engine.overview'},headers)
    if status==200 and overview and len(overview.get('engines',[]))==6:break
    time.sleep(10)
assert status==200 and overview and len(overview.get('engines',[]))==6,'Engine administrator gateway unavailable'
status,health=request(url,{'action':'collection.engine.check'},headers)
assert status==200 and health and health.get('available') is True,'Installed engine runtime unavailable'
for engine in overview['engines']:
    key=engine['engine_key']
    status,result=request(url,{'action':'collection.engine.test','engine_key':key},headers)
    assert status==200 and result and result.get('passed') is True and result.get('published')==0,'Engine demo failed: '+key
    print('Verified production engine: '+key+'; demo passed; published=0')
status,_=request(url,{'action':'collection.engine.check'},{'Content-Type':'application/json'})
assert status in (401,403),'Unauthenticated engine administration must be denied'
print('Production collection engine administration and six real non-publishing demos verified')
