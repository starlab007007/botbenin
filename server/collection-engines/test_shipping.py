import importlib.util
import os
import io
import json
from urllib.error import HTTPError
from pathlib import Path
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('shipping',Path(__file__).with_name('ship-token.py'))
shipping=importlib.util.module_from_spec(spec);spec.loader.exec_module(shipping)


provision_spec=importlib.util.spec_from_file_location('provision',Path(__file__).with_name('provision.py'))
provision=importlib.util.module_from_spec(provision_spec);provision_spec.loader.exec_module(provision)

class ProvisionTests(unittest.TestCase):
    def test_transient_544_recovers_without_logging_credentials(self):
        response=io.BytesIO(json.dumps([{'token':'a'*64}]).encode())
        error=HTTPError('https://example.invalid',544,'gateway timeout',{},None)
        with patch.dict(os.environ,{'SUPABASE_ACCESS_TOKEN':'fixture'}),patch.object(provision.urllib.request,'urlopen',side_effect=[error,response]) as call,patch.object(provision.time,'sleep') as sleep,patch('builtins.print') as log:
            self.assertEqual(provision.fetch_token(),'a'*64)
            self.assertEqual(call.call_count,2)
            sleep.assert_called_once_with(5)
            self.assertNotIn('a'*64,str(log.call_args_list))
            self.assertNotIn('fixture',str(log.call_args_list))

    def test_unauthorized_is_not_retried(self):
        error=HTTPError('https://example.invalid',401,'unauthorized',{},None)
        with patch.dict(os.environ,{'SUPABASE_ACCESS_TOKEN':'fixture'}),patch.object(provision.urllib.request,'urlopen',side_effect=error) as call,patch.object(provision.time,'sleep') as sleep:
            with self.assertRaisesRegex(RuntimeError,'HTTP 401'):provision.fetch_token()
            self.assertEqual(call.call_count,1)
            sleep.assert_not_called()

    def test_missing_token_is_rejected(self):
        with patch.dict(os.environ,{'SUPABASE_ACCESS_TOKEN':'fixture'}),patch.object(provision.urllib.request,'urlopen',return_value=io.BytesIO(b'[]')):
            with self.assertRaisesRegex(ValueError,'invalid runtime credential'):provision.fetch_token()

class ShippingTests(unittest.TestCase):
    def test_credential_uses_owner_scp_and_private_key_without_printing_its_content(self):
        env={'RUNTIME_HOST':'server.example','RUNTIME_USER':'debian','RUNTIME_PORT':'22','RUNTIME_SHA':'a'*40,'RUNTIME_SSH_KEY':'private-key-fixture'}
        calls=[]
        def run(args,**options):
            calls.append(args)
            key=Path(args[args.index('-i')+1]);self.assertEqual(key.stat().st_mode&0o777,0o600)
            self.assertTrue(options['capture_output']);self.assertTrue(options['check'])
        with patch.dict(os.environ,env),patch.object(shipping.subprocess,'run',side_effect=run):shipping.main()
        self.assertEqual(calls[1][0],'scp');self.assertIn('collection-runtime-token',calls[1])
        self.assertNotIn('private-key-fixture',' '.join(calls[1]))
        for bad in ['-bad','host\nvalue']:
            with patch.dict(os.environ,{**env,'RUNTIME_HOST':bad}),self.assertRaises(ValueError):shipping.main()


if __name__=='__main__':unittest.main(verbosity=2)
