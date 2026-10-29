import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import external

class ExternalTests(unittest.TestCase):
    def test_stale_internal_control_is_not_healthy(self):
        for fresh in (True,False,None):
            calls=[]
            with tempfile.TemporaryDirectory() as tmp:
                config=Path(tmp)/'config';config.write_text(json.dumps({'token':'test'}))
                render=Path(tmp)/'render';render.write_text(json.dumps({'ok':True}))
                def request(url,data=None,*args,**kwargs):
                    calls.append(data)
                    return {'ok':True,'monitoring_fresh':fresh}
                with patch.object(external.sys,'argv',['external',str(config),str(render)]),patch.object(external,'sample',return_value={'component':'web_public','status':'healthy'}),patch.object(external,'request_json',request):
                    self.assertEqual(external.main(),0 if fresh is True else 1)
                runtime=next(p for p in calls[-1]['observations'] if p['component']=='runtime')
                self.assertEqual(runtime['status'],'healthy' if fresh is True else 'degraded')
