#!/usr/bin/env python3
"""Apply compatibility fixes required by current Flutter stable.

This script is intentionally idempotent. It addresses only two compile errors:
1) ThemeData.cardTheme now expects CardThemeData.
2) The WhatsApp IA action handler must use Dart switch statement `case` syntax.
"""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
main = root / "lib/main.dart"
whatsapp = root / "lib/live/live_whatsapp_ia_native_screen.dart"

main_text = main.read_text(encoding="utf-8")
if "cardTheme: CardTheme(" in main_text:
    main_text = main_text.replace("cardTheme: CardTheme(", "cardTheme: CardThemeData(", 1)
main.write_text(main_text, encoding="utf-8")

screen_text = whatsapp.read_text(encoding="utf-8")
replacement = r'''  Future<void> _openActions(LiveWhatsAppSession session) async {
    final action = await showWhatsAppSessionActionsSheet(context, session);
    if (!mounted || action == null) return;

    switch (action) {
      case LiveWhatsAppSessionAction.connect:
        await showWhatsAppConnectionSheet(
          context,
          sessionName: session.name,
          repository: _repository,
          onConnected: _refresh,
        );
        break;
      case LiveWhatsAppSessionAction.start:
        await _run(
          () => _repository.start(session.name),
          success: 'Session démarrée. Préparation du QR en cours.',
        );
        break;
      case LiveWhatsAppSessionAction.stop:
        await _run(
          () => _repository.stop(session.name),
          success: 'Session arrêtée.',
        );
        break;
      case LiveWhatsAppSessionAction.test:
        await showWhatsAppTestMessageSheet(
          context,
          sessionName: session.name,
        );
        break;
      case LiveWhatsAppSessionAction.linkBot:
        await showWhatsAppBotLinkSheet(
          context,
          sessionName: session.name,
        );
        break;
      case LiveWhatsAppSessionAction.webhook:
        await showWhatsAppWebhookSheet(
          context,
          sessionName: session.name,
        );
        break;
      case LiveWhatsAppSessionAction.delete:
        await _confirmDelete(session);
        break;
    }
  }

  Future<void> _run'''

pattern = r"  Future<void> _openActions\(LiveWhatsAppSession session\) async \{.*?\n  \}\n\n  Future<void> _run"
patched, count = re.subn(pattern, replacement, screen_text, count=1, flags=re.S)
if count != 1:
    raise SystemExit("WhatsApp action handler not found; source has not been changed.")
whatsapp.write_text(patched, encoding="utf-8")

print("Flutter build compatibility fixes applied.")
