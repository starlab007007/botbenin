import ast
import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

class ZeroPushTests(unittest.TestCase):
    def test_no_periodic_or_remote_triggers(self):
        for path in ('waouh-guardian.yml','guardian-resilience.yml'):
            body=(ROOT/'.github/workflows'/path).read_text()
            self.assertIsNone(re.search(r'^\s*(schedule|repository_dispatch|workflow_run):',body,re.M),path)
            self.assertIn('contents: read',body)
            self.assertIsNone(re.search(r'\b(?:git\s+(?:commit|push)|gh\s+(?:pr|workflow|api))\b',body),path)
    def test_agent_only_fixed_docker_commands(self):
        tree=ast.parse((ROOT/'scripts/guardian/agent.py').read_text())
        for node in ast.walk(tree):
            if isinstance(node,ast.Call) and isinstance(node.func,ast.Attribute) and isinstance(node.func.value,ast.Name) and node.func.value.id=='subprocess':
                self.assertEqual(node.func.attr,'run')
                self.assertIsInstance(node.args[0],ast.List)
                self.assertEqual(node.args[0].elts[0].value,'docker')
                self.assertIn(node.args[0].elts[1].value,('inspect','restart'))
