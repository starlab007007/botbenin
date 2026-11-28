import unittest
from waouh_readiness_evidence import REQUIRED_STEPS, channel_evidence_ok

class ReadinessEvidenceTests(unittest.TestCase):
    def payload(self):
        return {"ok": True, "mode": "parcours", "results": [
            {"parcours": "A", "status": "ok", "steps": [
                {"step": name, "status": "ok"} for name in sorted(REQUIRED_STEPS)
            ]}
        ]}

    def test_complete(self):
        self.assertTrue(channel_evidence_ok(200, self.payload(), "A"))

    def test_empty_missing_wrong_and_partial(self):
        for change in ("empty", "missing", "wrong", "partial", "failed", "duplicate", "malformed", "false_ok"):
            with self.subTest(change=change):
                p = self.payload()
                if change == "empty": p["results"] = []
                elif change == "missing": p["results"][0]["steps"].pop()
                elif change == "wrong": p["results"][0]["parcours"] = "B"
                elif change == "partial": p["results"][0]["status"] = "partial"
                elif change == "failed": p["results"][0]["steps"][0]["status"] = "fail"
                elif change == "duplicate": p["results"][0]["steps"].append(p["results"][0]["steps"][0])
                elif change == "malformed": p["results"][0]["steps"] = [None]
                elif change == "false_ok": p["ok"] = False
                self.assertFalse(channel_evidence_ok(200, p, "A"))

    def test_http_failure(self):
        self.assertFalse(channel_evidence_ok(503, self.payload(), "A"))
