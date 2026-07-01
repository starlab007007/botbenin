import 'package:flutter/material.dart';

import 'live_whatsapp_ia_models.dart';
import 'live_whatsapp_ia_repository.dart';

enum LiveWhatsAppSessionAction { connect, start, stop, linkBot, webhook, delete }

Future<String?> showCreateWhatsAppSessionSheet(BuildContext context) async => null;

Future<LiveWhatsAppSessionAction?> showWhatsAppSessionActionsSheet(
  BuildContext context,
  LiveWhatsAppSession session,
) async => null;

Future<void> showWhatsAppConnectionSheet(
  BuildContext context, {
  required String sessionName,
  required LiveWhatsAppIaRepository repository,
  required Future<void> Function() onConnected,
}) async {}

Future<void> showWhatsAppBotLinkSheet(
  BuildContext context, {
  required String sessionName,
}) async {}

Future<void> showWhatsAppWebhookSheet(
  BuildContext context, {
  required String sessionName,
}) async {}
