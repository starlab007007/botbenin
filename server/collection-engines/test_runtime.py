import http.client
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from server import execute, versions

HTML='''<!doctype html><html><head><title>WAOUH fixture</title>
<script type="application/ld+json">{"@type":"Product","name":"Téléphone de test WAOUH","url":"/demo/telephone","model":"DEMO","offers":{"price":50000,"priceCurrency":"XOF"}}</script>
</head><body><h1>Document fourni</h1><script>document.body.dataset.rendered='yes'</script></body></html>'''


class RuntimeTests(unittest.TestCase):
    def test_real_adapters_preserve_listing_and_render_when_required(self):
        installed=versions()
        self.assertEqual(len(installed),6)
        for engine in installed:
            with self.subTest(engine=engine):
                data={'engine':engine,'html':HTML,'url':'https://bot.bj/demo/','timeout_seconds':30}
                try: result=execute(data)
                except ValueError:
                    command=['node','node-engine.mjs'] if engine in ('cheerio','crawlee') else [sys.executable,'engine.py']
                    debug=subprocess.run(command,input=json.dumps(data),text=True,capture_output=True,timeout=35)
                    self.fail(engine+': '+debug.stderr[-4000:])
                self.assertEqual(result['engine'],engine)
                self.assertIn('Téléphone de test WAOUH',result['html'])
                self.assertIn('application/ld+json',result['html'])
                self.assertIn('50000',result['html'])
                if engine in ('playwright','crawl4ai'):
                    self.assertIn('data-rendered="yes"',result['html'])

    def test_rejects_unknown_tools_and_unbounded_documents(self):
        for body in [{'engine':'sh','html':'x'}, {'engine':'cheerio','html':'x'*1_200_001},
                     {'engine':'cheerio','html':'x','url':'file:///etc/passwd'},
                     {'engine':'cheerio','html':'x','url':'https://bot.bj','timeout_seconds':1000}]:
            with self.assertRaises(ValueError): execute(body)

    def test_service_requires_credential_and_rejects_unknown_routes(self):
        with tempfile.TemporaryDirectory() as tmp:
            token=Path(tmp)/'token';token.write_text('a'*64)
            sock=Path(tmp)/'runner.sock'
            env={**os.environ,'ENGINE_TOKEN_FILE':str(token),'ENGINE_SOCKET':str(sock)}
            child=subprocess.Popen([sys.executable,str(Path(__file__).with_name('server.py'))],env=env)
            try:
                for _ in range(100):
                    if sock.exists():break
                    time.sleep(.05)
                def request(path,authorized):
                    conn=http.client.HTTPConnection('localhost',timeout=5)
                    conn.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);conn.sock.connect(str(sock))
                    headers={'Authorization':'Bearer '+'a'*64} if authorized else {}
                    conn.request('POST',path,'{}',headers)
                    response=conn.getresponse();body=json.loads(response.read());conn.close()
                    return response.status,body
                self.assertEqual(request('/health',False)[0],401)
                code,health=request('/health',True)
                self.assertEqual(code,200);self.assertEqual(len(health['versions']),6)
                self.assertEqual(request('/unknown',True)[0],404)
            finally:
                child.terminate();child.wait(timeout=5)


if __name__=='__main__': unittest.main(verbosity=2)
