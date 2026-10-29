import datetime as dt
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import uuid
spec=importlib.util.spec_from_file_location('agent',Path(__file__).with_name('agent.py'));a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
CLOCK=dt.datetime(2026,10,29,tzinfo=dt.timezone.utc)
STATE={'Status':'running','Running':True,'StartedAt':'2026-10-28T00:00:00Z'}
class Tests(unittest.TestCase):
 def test_safe_states(self):
  self.assertTrue(a.restart_safe(STATE,True,CLOCK))
  for change in [{'OOMKilled':True},{'Paused':True},{'Restarting':True},{'Dead':True},{'Status':'exited','Running':False,'ExitCode':0},{'StartedAt':CLOCK.isoformat()},{'StartedAt':'invalid'}]: self.assertFalse(a.restart_safe({**STATE,**change},True,CLOCK))
  self.assertFalse(a.restart_safe(STATE,False,CLOCK))
 def exercise(self,grant=True,healthy=False,pending=False,control_down=False):
  commands,calls=[],[]
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp)
   if pending:(root/'pending.json').write_text(json.dumps({'action_id':str(uuid.uuid4())}))
   def api(url,data=None,token=None,**kw):
    if control_down:raise TimeoutError()
    calls.append(data)
    if data['action']=='guardian.claim':return{'granted':grant,'action_id':str(uuid.uuid4()),'expires_at':(dt.datetime.now(dt.timezone.utc)+dt.timedelta(minutes=2)).isoformat()}
    return{'ok':True}
   def sample(url,component):return{'component':component,'status':'healthy' if healthy or commands else 'down','cause':'OK','observed_at':a.now()}
   with patch.object(a,'request_json',api),patch.object(a,'sample',sample),patch.object(a,'inspect',return_value=(STATE,True)),patch.object(a,'DEPLOY_LOCK',str(root/'deploy.lock')),patch.object(a.time,'sleep'),patch.object(a.subprocess,'run',side_effect=lambda argv,**kw:commands.append(argv)):
    if control_down:self.assertRaises(TimeoutError,a.cycle,{'token':'fake'},root)
    else:a.cycle({'token':'fake'},root)
  return commands,calls
 def test_fixed_verified_repair(self):
  commands,calls=self.exercise();self.assertEqual(commands,[['docker','restart','--time','10','react-app-botjs']]);self.assertEqual(calls[-1]['status'],'succeeded')
 def test_denial_and_healthy_and_control_failure(self):
  for kw in [{'grant':False},{'healthy':True},{'control_down':True}]:self.assertEqual(self.exercise(**kw)[0],[])
 def test_lost_result_never_replays(self):
  commands,calls=self.exercise(pending=True,grant=False);self.assertEqual(commands,[]);self.assertEqual(calls[0]['reason'],'RESULT_MISSING')
if __name__=='__main__':unittest.main()
