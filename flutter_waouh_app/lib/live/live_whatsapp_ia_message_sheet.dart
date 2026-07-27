import 'package:flutter/material.dart';

import '../main.dart' as legacy;
import 'live_whatsapp_ia_gateway.dart';
import 'live_whatsapp_ia_sheets.dart';

Future<void> showNativeWhatsAppTestMessageSheet(
  BuildContext context, {
  required String sessionName,
}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TestMessageSheet(sessionName: sessionName),
    );

class _TestMessageSheet extends StatefulWidget {
  const _TestMessageSheet({required this.sessionName});
  final String sessionName;

  @override
  State<_TestMessageSheet> createState() => _TestMessageSheetState();
}

class _TestMessageSheetState extends State<_TestMessageSheet> {
  final recipient = TextEditingController();
  final message = TextEditingController(
    text: 'Bonjour ! Ceci est un message test depuis WAOUH IA.',
  );
  late final LiveWhatsAppIaGateway gateway =
      LiveWhatsAppIaGateway(legacy.supabase);
  bool busy = false;

  @override
  void dispose() {
    recipient.dispose();
    message.dispose();
    super.dispose();
  }

  Future<void> send() async {
    final digits = recipient.text.replaceAll(RegExp(r'[^0-9]'), '');
    final text = message.text.trim();
    if (digits.length < 8) {
      _notice('Numéro destinataire invalide.');
      return;
    }
    if (text.isEmpty) {
      _notice('Saisissez un message.');
      return;
    }
    setState(() => busy = true);
    try {
      await gateway.request(
        path: '/api/sendText',
        method: 'POST',
        body: {
          'session': widget.sessionName,
          'chatId': '$digits@c.us',
          'text': text,
        },
      );
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Message test envoyé.'),
          backgroundColor: Color(0xFF159B65),
        ),
      );
    } catch (error) {
      _notice('$error');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void _notice(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) => WhatsAppSheetFrame(
        title: 'Message test',
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Destinataire',
              style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          TextField(
            controller: recipient,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.phone_outlined),
              hintText: '+229 90 00 00 00',
            ),
          ),
          const SizedBox(height: 15),
          const Text('Message', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          TextField(
            controller: message,
            minLines: 4,
            maxLines: 6,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(alignLabelWithHint: true),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: busy ? null : send,
              icon: busy
                  ? const SizedBox(
                      width: 17,
                      height: 17,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send_rounded),
              label: const Text('Envoyer le message test'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: const Color(0xFF25D366),
              ),
            ),
          ),
        ]),
      );
}
