import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('shipping',Path(__file__).with_name('ship-token.py'))
shipping=importlib.util.module_from_spec(spec);spec.loader.exec_module(shipping)


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
