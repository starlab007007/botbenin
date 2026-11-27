"""Regression for the actual chat hierarchy captured by Android CI."""
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

with tempfile.TemporaryDirectory() as output:
    os.environ["OUT_DIR"] = output
    spec = importlib.util.spec_from_file_location("android_smoke", Path(__file__).resolve().parents[1] / "android-emulator-smoke.py")
    smoke = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(smoke)


class SearchSubmissionTest(unittest.TestCase):
    def test_chat_uses_the_arrow_next_to_the_composer(self):
        root = ET.fromstring('''<hierarchy>
          <node text="" content-desc="Chercher" class="android.widget.Button" clickable="true" bounds="[630,714][899,840]"/>
          <node text="Je cherche un Samsung S10" class="android.widget.EditText" clickable="true" bounds="[168,880][899,1006]"/>
          <node text="" content-desc="" class="android.widget.Button" clickable="true" bounds="[912,880][1038,1006]"/>
        </hierarchy>''')
        field = smoke.find(root, "Samsung", "EditText")
        button = smoke.search_submit_button(root, field)
        self.assertEqual(button.get("bounds"), "[912,880][1038,1006]")
        self.assertNotIn("Chercher", smoke.label(button))

    def test_named_send_button_remains_supported(self):
        root = ET.fromstring('''<hierarchy><node text="Chercher" bounds="[10,20][100,80]"/>
          <node text="Envoyer le message" bounds="[900,1800][1030,1900]"/></hierarchy>''')
        self.assertEqual(smoke.label(smoke.search_submit_button(root, None)).strip(), "Envoyer le message")

    def test_does_not_guess_an_unrelated_or_disabled_control(self):
        for enabled, bounds in [("true", "[912,100][1038,200]"), ("false", "[912,880][1038,1006]")]:
            root = ET.fromstring(f'''<hierarchy>
              <node text="Samsung S10" class="android.widget.EditText" bounds="[168,880][899,1006]"/>
              <node clickable="true" enabled="{enabled}" bounds="{bounds}"/>
            </hierarchy>''')
            self.assertIsNone(smoke.search_submit_button(root, smoke.find(root, "Samsung", "EditText")))

    def test_notification_history_tab_matches_visible_label(self):
        root = ET.fromstring('<hierarchy><node text="Mon historique commercial"/><node text="Historique"/></hierarchy>')
        self.assertEqual(smoke.notification_history_tab(root).get("text"), "Historique")
        self.assertIsNone(smoke.notification_history_tab(ET.fromstring('<hierarchy><node text="Historique absent"/></hierarchy>')))

    def test_exchange_form_uses_labels_instead_of_field_order(self):
        root=ET.fromstring('<hierarchy><node text="Cotonou" class="EditText"/><node text="Produit" class="EditText"/></hierarchy>')
        product,city=smoke.search_form_fields(root)
        self.assertEqual(product.get("text"),"Produit")
        self.assertEqual(city.get("text"),"Cotonou")

    def test_results_below_reasoning_are_reached_by_scrolling(self):
        initial=ET.fromstring('<hierarchy><node text="Bilan"/><node scrollable="true" bounds="[0,100][1080,1900]"/></hierarchy>')
        cards=ET.fromstring('<hierarchy><node text="Samsung S10"/><node text="Confier à Bot"/></hierarchy>')
        with patch.object(smoke,"sh") as adb, patch.object(smoke,"dump",return_value=cards), patch.object(smoke.time,"sleep"):
            self.assertIs(smoke.scroll_to_offers(initial),cards)
            self.assertIn("swipe",adb.call_args.args)


class CertificationGateTest(unittest.TestCase):
    def complete(self):
        return [{"step": name, "ok": True} for name in (
            "installation", "lancement", "accueil_passe", "deal_room", "parcours_acheter",
            "resultats", "raisonnement_en_direct", "raisonnement_bilan", "missions", "chat",
            "notifications", "connexion", "notification_recovery", "notification_room_route",
            "notification_read_ack", "deal_room_recovery", "notification_history")]

    def test_complete_evidence_passes(self):
        self.assertEqual(smoke.certification_gaps(self.complete(), True, True, True), [])

    def test_empty_report_cannot_pass(self):
        self.assertIn("installation", smoke.certification_gaps([], True, True, True))
        self.assertIn("notification_read_ack", smoke.certification_gaps([], True, True, True))

    def test_recovery_requires_authentication_even_without_credentials(self):
        records = [s for s in self.complete() if s["step"] != "connexion"]
        self.assertIn("connexion", smoke.certification_gaps(records, False, True, True))

    def test_failed_required_step_and_missing_logs_fail_closed(self):
        records = self.complete()
        records.append({"step": "notification_history", "ok": False})
        gaps = smoke.certification_gaps(records, True, True, False)
        self.assertIn("notification_history", gaps)
        self.assertIn("logcat_indisponible", gaps)


if __name__ == "__main__":
    unittest.main()
