import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('ship_host',Path(__file__).with_name('ship-host.py'));ship=importlib.util.module_from_spec(spec);spec.loader.exec_module(ship)
class ShippingTests(unittest.TestCase):
    def test_private_key_and_verified_fixed_destination(self):
        commands=[];keys=[]
        def run(argv,**kwargs):
            commands.append(argv);key=Path(argv[argv.index('-i')+1]);keys.append(key)
            self.assertEqual(key.stat().st_mode&0o777,0o600)
            self.assertIn('StrictHostKeyChecking=accept-new',argv)
            self.assertTrue(kwargs['check']);self.assertTrue(kwargs['capture_output'])
        with patch.dict(os.environ,{'GUARDIAN_HOST':'example.invalid','GUARDIAN_USER':'debian','GUARDIAN_PORT':'22','GUARDIAN_SSH_KEY':'fake'}),patch.object(ship.subprocess,'run',side_effect=run):ship.main()
        self.assertEqual(len(commands),5)
        self.assertEqual(commands[-1][-1],'rm -f /home/debian/waouh-guardian-install/guardian-config.json')
        self.assertTrue(all(not k.exists() for k in keys))
