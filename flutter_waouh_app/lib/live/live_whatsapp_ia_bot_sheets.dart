import 'package:flutter/material.dart';

import '../main.dart' as legacy;
import 'live_whatsapp_ia_bot_service.dart';
import 'live_whatsapp_ia_models.dart';
import 'live_whatsapp_ia_sheets.dart';

Future<void> showNativeWhatsAppBotLinkSheet(
  BuildContext context, {
  required String sessionName,
}) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _BotSheet(sessionName: sessionName),
    );

Future<void> showNativeWhatsAppWebhookSheet(
  BuildContext context, {
  required String sessionName,
}) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _WebhookSheet(sessionName: sessionName),
    );

class _BotSheet extends StatefulWidget {
  const _BotSheet({required this.sessionName});
  final String sessionName;
  @override
  State<_BotSheet> createState() => _BotSheetState();
}

class _BotSheetState extends State<_BotSheet> {
  late final LiveWhatsAppIaBotService service = LiveWhatsAppIaBotService(legacy.supabase);
  late final Future<List<LiveWhatsAppBot>> items = service.listBots();
  String? selected;
  bool busy = false;

  Future<void> link(List<LiveWhatsAppBot> bots) async {
    LiveWhatsAppBot? bot;
    for (final item in bots) { if (item.id == selected) bot = item; }
    if (bot == null) return;
    setState(() => busy = true);
    try {
      await service.link(sessionName: widget.sessionName, bot: bot);
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Bot « ${bot.name} » lié.'), backgroundColor: const Color(0xFF159B65)));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally { if (mounted) setState(() => busy = false); }
  }

  @override
  Widget build(BuildContext context) => WhatsAppSheetFrame(
        title: 'Lier un bot',
        child: FutureBuilder<List<LiveWhatsAppBot>>(
          future: items,
          builder: (_, snapshot) {
            final bots = snapshot.data ?? const <LiveWhatsAppBot>[];
            if (snapshot.connectionState != ConnectionState.done) return const Padding(padding: EdgeInsets.all(28), child: Center(child: CircularProgressIndicator()));
            return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Le bot recevra les messages entrants de « ${widget.sessionName} ».', style: const TextStyle(color: Color(0xFF6B8279))),
              const SizedBox(height: 14),
              if (bots.isEmpty) const Text('Aucun bot disponible. Créez-en un depuis l’onglet Bots.', style: TextStyle(color: Color(0xFF6B8279))) else ...bots.map((bot) => Padding(padding: const EdgeInsets.only(bottom: 8), child: InkWell(onTap: () => setState(() => selected = bot.id), borderRadius: BorderRadius.circular(16), child: Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: selected == bot.id ? const Color(0xFFF0FFF7) : Colors.white, border: Border.all(color: selected == bot.id ? const Color(0xFF25D366) : const Color(0xFFDFEBE6), width: selected == bot.id ? 2 : 1), borderRadius: BorderRadius.circular(16)), child: Row(children: [const Icon(Icons.smart_toy_outlined, color: Color(0xFF08756A)), const SizedBox(width: 10), Expanded(child: Text(bot.name, style: const TextStyle(fontWeight: FontWeight.w900))), if (selected == bot.id) const Icon(Icons.check_circle_rounded, color: Color(0xFF25D366))]))))),
              const SizedBox(height: 14),
              SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: selected == null || busy ? null : () => link(bots), icon: busy ? const SizedBox(width: 17, height: 17, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.link_rounded), label: const Text('Lier le bot'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50), backgroundColor: const Color(0xFF08756A)))),
            ]);
          },
        ),
      );
}

class _WebhookSheet extends StatefulWidget {
  const _WebhookSheet({required this.sessionName});
  final String sessionName;
  @override
  State<_WebhookSheet> createState() => _WebhookSheetState();
}

class _WebhookSheetState extends State<_WebhookSheet> {
  final url = TextEditingController();
  late final LiveWhatsAppIaBotService service = LiveWhatsAppIaBotService(legacy.supabase);
  bool busy = false;
  @override
  void dispose() { url.dispose(); super.dispose(); }
  Future<void> save() async {
    setState(() => busy = true);
    try {
      await service.addWebhook(sessionName: widget.sessionName, value: url.text);
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Webhook ajouté.'), backgroundColor: Color(0xFF159B65)));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => WhatsAppSheetFrame(title: 'Configurer un webhook', child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('URL du webhook', style: TextStyle(fontWeight: FontWeight.w900)), const SizedBox(height: 8), TextField(controller: url, keyboardType: TextInputType.url, decoration: const InputDecoration(prefixIcon: Icon(Icons.webhook_outlined), hintText: 'https://exemple.com/webhook')), const SizedBox(height: 8), const Text('Cette URL recevra les événements de message, statut et session.', style: TextStyle(color: Color(0xFF6B8279), fontSize: 12.5)), const SizedBox(height: 20), SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: busy ? null : save, icon: busy ? const SizedBox(width: 17, height: 17, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.save_outlined), label: const Text('Ajouter le webhook'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50), backgroundColor: const Color(0xFF08756A))))]));
}
