import unittest
import io
import json
import urllib.error
from resilience import probe

class Response(io.BytesIO):
    status=200

class ResilienceTests(unittest.TestCase):
    def test_valid_policy(self):
        self.assertEqual(probe(lambda *a,**k:Response(json.dumps([{'module_key':'chat','access_enabled':True}]).encode()))['status'],'healthy')
    def test_empty_policy_not_green(self):
        self.assertEqual(probe(lambda *a,**k:Response(b'[]'))['status'],'down')
    def test_503(self):
        def fail(*a,**k):
            raise urllib.error.HTTPError('https://example.invalid',503,'unavailable',{},None)
        result=probe(fail)
        self.assertEqual(result['http_status'],503)
        self.assertEqual(result['cause'],'API_UNAVAILABLE')
    def test_transport(self):
        def fail(*a,**k):raise TimeoutError()
        self.assertEqual(probe(fail)['status'],'down')
