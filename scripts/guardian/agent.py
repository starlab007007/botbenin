#!/usr/bin/env python3
"""Read-only host probes plus one fixed, server-authorized container restart."""
import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request
import uuid
CONTAINER='react-app-botjs'
PUBLIC='https://bot.bj/waouh-release.json'
ORIGIN='http://127.0.0.1:8084/waouh-release.json'
CONTROL='https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-health-check'
DEPLOY_LOCK='/home/debian/waouh-web-deploy.lock'
def now(): return dt.datetime.now(dt.timezone.utc).isoformat()
def request_json(url,data=None,token=None,timeout=8):
    headers={'Cache-Control':'no-cache','Content-Type':'application/json'}
    if token: headers['X-Guardian-Probe']=token
    req=urllib.request.Request(url,data=None if data is None else json.dumps(data).encode(),headers=headers)
    with urllib.request.urlopen(req,timeout=timeout) as response:
        raw=response.read(65537)
        if len(raw)>65536: raise ValueError('oversized')
        return json.loads(raw)
def sample(url,component):
    start=time.monotonic();status,cause='healthy','OK'
    try:
        d=request_json(url+'?guardian='+str(time.time_ns()))
        if d.get('schema')!='waouh.release.v1' or not isinstance(d.get('version'),str): status,cause='down','INVALID_RESPONSE'
    except Exception: status,cause='down','HTTP_UNAVAILABLE'
    return {'component':component,'status':status,'cause':cause,'observed_at':now(),'latency_ms':min(120000,round((time.monotonic()-start)*1000))}
def inspect():
    r=subprocess.run(['docker','inspect','--format','{{json .State}}',CONTAINER],capture_output=True,text=True,timeout=5,check=True)
    label=subprocess.run(['docker','inspect','--format','{{index .Config.Labels "io.botbj.release"}}',CONTAINER],capture_output=True,text=True,timeout=5,check=True)
    return json.loads(r.stdout),label.stdout.strip()=='true'
def restart_safe(state,known,clock=None):
    if not known or any(state.get(k) for k in ['OOMKilled','Restarting','Paused','Dead']): return False
    try:
        started=dt.datetime.fromisoformat(state['StartedAt'].replace('Z','+00:00'))
        if ((clock or dt.datetime.now(dt.timezone.utc))-started).total_seconds()<300: return False
    except (KeyError,ValueError,TypeError): return False
    return (state.get('Status')=='running' and state.get('Running') is True) or (state.get('Status')=='exited' and isinstance(state.get('ExitCode'),int) and state['ExitCode']!=0)
def atomic_write(path,data):
    temp=path.with_suffix('.tmp');fd=os.open(temp,os.O_CREAT|os.O_TRUNC|os.O_WRONLY,0o600)
    with os.fdopen(fd,'w') as out: json.dump(data,out)
    os.replace(temp,path)
def cycle(config,root):
    api=lambda action,**kw: request_json(CONTROL,{'action':'guardian.'+action,**kw},config['token'])
    pending_file=root/'pending.json'
    if pending_file.exists():
        p=json.loads(pending_file.read_text());api('finish',action_id=p['action_id'],status=p.get('status','failed'),reason=p.get('reason','RESULT_MISSING'));pending_file.unlink()
    public=sample(PUBLIC,'web_public');origin=sample(ORIGIN,'web_origin')
    try: state,known=inspect();safe=restart_safe(state,known);host_ok=True
    except Exception: safe,host_ok=False,False
    origin['details']={'restart_safe':safe}
    api('ingest',report_id=str(uuid.uuid4()),observations=[public,origin,{'component':'host_monitor','status':'healthy' if host_ok else 'degraded','cause':'OK' if host_ok else 'HOST_UNAVAILABLE','observed_at':now()}])
    if not safe or origin['status']!='down' or public['status']!='down': return
    with open(DEPLOY_LOCK,'a') as deployment:
        try: fcntl.flock(deployment,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError: return
        state,known=inspect()
        if not restart_safe(state,known): return
        d=api('claim',request_id=str(uuid.uuid4()))
        if d.get('granted') is not True: return
        p={'action_id':str(uuid.UUID(d['action_id']))};atomic_write(pending_file,p)
        deadline=dt.datetime.fromisoformat(d['expires_at'].replace('Z','+00:00'))
        if deadline<=dt.datetime.now(dt.timezone.utc): p.update(status='not_executed',reason='CONDITIONS_CHANGED')
        else:
            try:
                state,known=inspect()
                if not restart_safe(state,known) or sample(ORIGIN,'web_origin')['status']!='down' or sample(PUBLIC,'web_public')['status']!='down': p.update(status='not_executed',reason='CONDITIONS_CHANGED')
                else:
                    # No input can change this argv, target or timeout.
                    subprocess.run(['docker','restart','--time','10',CONTAINER],check=True,capture_output=True,timeout=30)
                    time.sleep(8);after=[sample(ORIGIN,'web_origin'),sample(PUBLIC,'web_public')];healthy=all(x['status']=='healthy' for x in after)
                    p.update(status='succeeded' if healthy else 'failed',reason='VERIFIED' if healthy else 'VERIFY_FAILED');api('ingest',report_id=str(uuid.uuid4()),observations=after)
            except Exception: p.update(status='failed',reason='RESTART_FAILED')
        atomic_write(pending_file,p);api('finish',**p);pending_file.unlink()
def main():
    root=Path(__file__).resolve().parent
    with open(root/'agent.lock','a') as lock:
        try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError: return 0
        try: cycle(json.loads((root/'config.json').read_text()),root)
        except Exception: print('GUARDIAN observation unavailable',file=sys.stderr);return 1
    return 0
if __name__=='__main__': sys.exit(main())
