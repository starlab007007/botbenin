import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent

class ExternalRunnerTests(unittest.TestCase):
    def test_timer_is_independent_and_bounded(self):
        timer = (ROOT / 'waouh-guardian-external.timer').read_text()
        service = (ROOT / 'waouh-guardian-external.service').read_text()
        self.assertIn('OnUnitActiveSec=5min', timer)
        self.assertIn('TimeoutStartSec=120', service)
        self.assertIn('User=waouh-guardian-probe', service)
        self.assertIn('NoNewPrivileges=yes', service)
        self.assertNotIn('provision.py', service)
        self.assertNotIn('git ', service)

    def test_missing_or_insecure_credentials_fail_closed(self):
        script = ROOT / 'run-external.sh'
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'external.json'
            for mode in (None, 0o644):
                if mode is not None:
                    p.write_text('{}')
                    p.chmod(mode)
                result = subprocess.run(['bash', str(script), str(p)], capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('configuration unavailable', result.stderr)

    def test_browser_failure_never_reports_healthy(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            cfg = base / 'external.json'
            cfg.write_text('{}')
            cfg.chmod(0o600)
            node = base / 'node'
            node.write_text('#!/bin/sh\nexit 7\n')
            node.chmod(0o700)
            python = base / 'python3'
            python.write_text('#!/bin/sh\ntouch "$CALLED"\n')
            python.chmod(0o700)
            called = base / 'called'
            env = dict(os.environ, PATH=str(base)+':'+os.environ['PATH'], CALLED=str(called))
            result = subprocess.run(['bash', str(ROOT / 'run-external.sh'), str(cfg)], env=env, capture_output=True)
            self.assertEqual(result.returncode, 7)
            self.assertFalse(called.exists())
