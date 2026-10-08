"""Repair the verified central WAHA container; keep credentials and backups on its host."""
import datetime
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import urllib.request
import urllib.parse
import urllib.error

TARGET = 'devlikeapro/waha-plus:latest'
PHONES = {'22965653468', '2290165653468'}

def command(args, **kwargs):
    return subprocess.run(args,check=True,stderr=subprocess.PIPE,**kwargs)

def output(args):
    return command(args,stdout=subprocess.PIPE,text=True).stdout

def inspect(cid):
    return json.loads(output(['docker','inspect',cid]))[0]

def call(item,path,body=None):
    env = dict(v.split('=',1) for v in item['Config'].get('Env',[]) if '=' in v)
    addresses = [n.get('IPAddress') for n in item.get('NetworkSettings',{}).get('Networks',{}).values() if n.get('IPAddress')]
    for address in addresses:
        req = urllib.request.Request('http://'+address+':'+env.get('WHATSAPP_API_PORT','3000')+path,
            data=None if body is None else json.dumps(body).encode(),
            headers={'X-Api-Key':env.get('WAHA_API_KEY',''),'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req,timeout=12) as r:
                raw = r.read()
                return r.status,json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            raw = e.read()
            try: result=json.loads(raw)
            except Exception: result=None
            return e.code,result
        except Exception: continue
    return 0,None

def central(session):
    return str((session or {}).get('me',{}).get('id','')).split('@')[0] in PHONES

candidates=[]
for cid in output(['docker','ps','-q']).split():
    item=inspect(cid)
    if not item['Config'].get('Image','').startswith('devlikeapro/waha-plus'): continue
    status,session=call(item,'/api/sessions/WaouhApp')
    if status==200 and central(session): candidates.append((cid,item,session))
assert len(candidates)==1, 'Exactly one verified central WAHA container is required'
cid,item,session=candidates[0]
status,version=call(item,'/api/version')
assert status==200, 'Cannot inspect central WAHA version'
status,health=call(item,'/api/contacts?session=WaouhApp&contactId='+urllib.parse.quote(session['me']['id']))
if status==200:
    print('::notice title=Central WAHA server::Already operational; no container changed.')
    raise SystemExit(0)
assert version.get('version')=='2026.5.1', 'Unexpected provider version; repair requires a new diagnosis'
assert status==500, 'Unexpected provider failure; repair requires a new diagnosis'
engine=session.get('engine') or {}
assert isinstance(engine,dict) and engine.get('engine')=='WEBJS', 'This repair applies only to the diagnosed WEBJS engine'
labels=item['Config'].get('Labels') or {}
service=labels.get('com.docker.compose.service')
files=(labels.get('com.docker.compose.project.config_files') or '').split(',')
assert service and len(files)==1 and Path(files[0]).is_file(), 'Central compose configuration cannot be safely isolated'
config_path=Path(files[0]); original=config_path.read_bytes()
pattern=r'(?m)^(\s*image:\s*)[\"\']?devlikeapro/waha-plus(?::[^\s\"\'#]+|@[^\s\"\'#]+)?[\"\']?(\s*(?:#.*)?)$'
assert len(re.findall(pattern,original.decode()))==1, 'A unique WAHA image entry is required'
assert any(m.get('Destination')=='/app/.sessions' for m in item.get('Mounts',[])), 'Persistent WhatsApp session storage is required'
compose=['docker','compose','-f',str(config_path)]
configuration=json.loads(output(compose+['config','--format','json']))
assert configuration.get('services',{}).get(service,{}).get('image')==item['Config']['Image'], 'Compose service identity mismatch'
def free_gib():
    root=output(['docker','info','--format','{{.DockerRootDir}}']).strip() or '/'
    try: return shutil.disk_usage(root).free/2**30
    except OSError: return shutil.disk_usage('/').free/2**30
# Reclaim only unreferenced Docker data (dangling images, build cache); never volumes, sessions or running containers.
free_before=free_gib()
if free_before<3:
    for prune in (['docker','image','prune','-f'],['docker','builder','prune','-f','--filter','until=24h']):
        try: command(prune,stdout=subprocess.DEVNULL)
        except subprocess.CalledProcessError: pass
free_after=free_gib()
print('::notice title=Central WAHA host disk::free before=%.1f GiB; after safe cleanup=%.1f GiB' % (free_before,free_after))
assert free_after>=3, 'Host disk space is insufficient for the provider image; free at least 3 GiB on the VPS, then rerun'
# Pull through the authenticated registry transport and resolve its digest before any interruption.
try:
    command(['docker','pull',TARGET],stdout=subprocess.DEVNULL)
except subprocess.CalledProcessError as error:
    stderr=(error.stderr or b'').decode(errors='replace').lower()
    if 'denied' not in stderr and 'unauthorized' not in stderr: raise
    # Reuse existing root Docker registry authentication if the SSH account has sudo.
    command(['sudo','-n','docker','pull',TARGET],stdout=subprocess.DEVNULL)
new_image=json.loads(output(['docker','image','inspect',TARGET]))[0]
digest=next((d for d in new_image.get('RepoDigests',[]) if d.startswith('devlikeapro/waha-plus@sha256:')),None)
assert digest, 'Cannot pin the provider image digest'
assert new_image['Id'] != item['Image'], 'The registry latest image is still the installed defective build; a newer WAHA Plus image is required'
version_source=output(['docker','run','--rm','--entrypoint','cat',digest,'/app/dist/version.js'])
match=re.search(r"version:\s*['\"]([0-9]+\.[0-9]+\.[0-9]+)['\"]",version_source)
assert match, 'Cannot inspect the candidate provider version before changing the container'
candidate_version=match[1]
assert tuple(map(int,candidate_version.split('.'))) >= tuple(map(int,version['version'].split('.'))), 'Candidate provider version would downgrade the central instance'
print('::notice title=Central WAHA candidate::Registry image pinned by digest; candidate provider version=' + candidate_version)

stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup=Path.home()/'.local/share/waouh-waha-recovery'/stamp
backup.mkdir(parents=True,mode=0o700);os.chmod(backup,0o700)
config_backup=backup/'docker-compose.original';config_backup.write_bytes(original);os.chmod(config_backup,0o600)
old_image=item['Image'];rollback_tag='waouh-waha-rollback:'+stamp.lower()
command(['docker','tag',old_image,rollback_tag],stdout=subprocess.DEVNULL)
changed=False
try:
    command(['docker','stop','--time','30',cid],stdout=subprocess.DEVNULL)
    archive=backup/'sessions.tar.gz'
    with archive.open('wb') as target:
        os.chmod(archive,0o600)
        command(['docker','run','--rm','--volumes-from',cid+':ro','--entrypoint','tar',old_image,'-czf','-','-C','/app','.sessions'],stdout=target)
    assert archive.stat().st_size>0, 'WhatsApp session backup is empty'
    updated=re.sub(pattern,lambda m:m[1]+digest+m[2],original.decode())
    config_path.write_text(updated);changed=True
    command(compose+['up','-d','--no-deps',service],stdout=subprocess.DEVNULL)
    ready=False
    for attempt in range(24):
        time.sleep(5)
        new_cid=output(compose+['ps','-q',service]).strip()
        if not new_cid: continue
        live=inspect(new_cid)
        state,current=call(live,'/api/sessions/WaouhApp')
        if state!=200 or not current: continue
        if current.get('status')=='STOPPED':
            call(live,'/api/sessions/WaouhApp/start',{})
            continue
        if current.get('status')!='WORKING' or not central(current): continue
        api_status,_=call(live,'/api/contacts?session=WaouhApp&contactId='+urllib.parse.quote(current['me']['id']))
        if api_status!=200: continue
        v_status,current_version=call(live,'/api/version')
        if v_status==200 and current_version.get('version')==candidate_version:
            ready=True;break
    assert ready, 'Updated central WAHA engine did not pass the real conversation health check'
    print('::notice title=Central WAHA server repaired::Verified +229 65653468; provider ' + candidate_version + '; WhatsApp client API operational. Sessions and media retained; other WAHA installation unchanged.')
except BaseException:
    # Restore the exact compose definition and old image; the private auth backup remains available.
    if changed:
        config_path.write_bytes(original)
        command(['docker','tag',old_image,item['Config']['Image']],stdout=subprocess.DEVNULL)
        command(compose+['up','-d','--no-deps','--force-recreate',service],stdout=subprocess.DEVNULL)
    else:
        command(['docker','start',cid],stdout=subprocess.DEVNULL)
    print('::error title=Central WAHA repair::Provider upgrade did not pass verification. Original container configuration restored; private session backup retained on the host.')
    raise
