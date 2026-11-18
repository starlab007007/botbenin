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


if __name__ == "__main__":
    unittest.main()
