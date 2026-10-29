import unittest
from unittest.mock import patch
import provision


class ProvisionTests(unittest.TestCase):
    def test_start_uses_supported_api_and_checks_activation(self):
        with patch.object(provision.sys, 'argv', ['provision.py', 'start']), patch.object(provision, 'query', side_effect=[[], [{'active': True}]]) as query:
            self.assertEqual(provision.main(), 0)
            statements = [c.args[0] for c in query.call_args_list]
            self.assertIn('cron.alter_job', statements[0])
            self.assertIn("jobname='waouh-guardian-observer'", statements[0])
            self.assertNotIn('update cron.job', statements[0])
            self.assertIn('select active', statements[1])

    def test_missing_or_inactive_observer_fails_closed(self):
        for result in [[], [{'active': False}]]:
            with patch.object(provision.sys, 'argv', ['provision.py', 'start']), patch.object(provision, 'query', side_effect=[[], result]):
                with self.assertRaises(ValueError):
                    provision.main()
