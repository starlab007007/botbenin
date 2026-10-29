import hashlib
from pathlib import Path
import unittest
from unittest.mock import patch
import migrate

class MigrationTests(unittest.TestCase):
    def test_installed_digest_is_checked_and_never_reapplied(self):
        version,name,installed=migrate.MIGRATIONS[0]
        digest=hashlib.md5((Path('supabase/migrations')/(version+'_'+name+'.sql')).read_bytes()).hexdigest()
        with patch.object(migrate,'query',return_value=[{'installed':True,'digest':digest}]) as query:
            migrate.apply(version,name,installed)
            self.assertEqual(query.call_count,1)
        for state in [{'installed':True,'digest':'changed'},{'installed':False,'digest':digest}]:
            with patch.object(migrate,'query',return_value=[state]) as query:
                with self.assertRaises(ValueError):migrate.apply(version,name,installed)
                self.assertEqual(query.call_count,1)
