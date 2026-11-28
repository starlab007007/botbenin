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

    def test_install_verifier_requires_fresh_success_and_active_timer(self):
        verifier=ROOT/'verify-external-install.sh'
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp)
            systemctl=base/'systemctl'
            systemctl.write_text("""#!/bin/sh
case "$1" in
is-enabled|is-active) test "${MODE:-}" != inactive ;;
show)
  case "$4" in
    Unit) echo waouh-guardian-external.service ;;
    User) echo waouh-guardian-probe ;;
    Result) if [ "$MODE" = failed ]; then echo exit-code; else echo success; fi ;;
    ExecMainExitTimestampMonotonic) if [ "$MODE" = stale ]; then echo 1; else echo 999000000; fi ;;
    NextElapseUSecMonotonic) if [ "$MODE" = unscheduled ]; then echo 0; else echo 21min; fi ;;
    *) exit 2 ;;
  esac ;;
*) exit 2 ;;
esac
""")
            systemctl.chmod(0o700)
            python=base/'python3'
            python.write_text('#!/bin/sh\necho 1000000000\n')
            python.chmod(0o700)
            for mode in ('healthy','inactive','failed','stale','unscheduled'):
                with self.subTest(mode=mode):
                    result=subprocess.run(['bash',str(verifier)],env=dict(os.environ,PATH=str(base)+':'+os.environ['PATH'],MODE=mode),capture_output=True,text=True)
                    self.assertEqual(result.returncode==0,mode=='healthy',result.stderr)
