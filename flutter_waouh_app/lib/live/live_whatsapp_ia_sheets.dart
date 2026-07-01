import 'package:flutter/material.dart';

import 'live_whatsapp_ia_models.dart';
import 'live_whatsapp_ia_repository.dart';

enum LiveWhatsAppSessionAction { connect, start, stop, linkBot, webhook, delete }

Future<String?> showCreateWhatsAppSessionSheet(BuildContext context) =>
    showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _CreateSheet(),
    );

Future<LiveWhatsAppSessionAction?> showWhatsAppSessionActionsSheet(
  BuildContext context,
  LiveWhatsAppSession session,
) =>
    showModalBottomSheet<LiveWhatsAppSessionAction>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _ActionSheet(session: session),
    );

Future<void> showWhatsAppConnectionSheet(
  BuildContext context, {
  required String sessionName,
  required LiveWhatsAppIaRepository repository,
  required Future<void> Function() onConnected,
}) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ConnectionPlaceholder(sessionName: sessionName),
    );

Future<void> showWhatsAppBotLinkSheet(
  BuildContext context, {
  required String sessionName,
}) => showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _InformationSheet(
        title: 'Lier un bot',
        message: 'La sélection du bot sera affichée ici pour la session $sessionName.',
      ),
    );

Future<void> showWhatsAppWebhookSheet(
  BuildContext context, {
  required String sessionName,
}) => showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _InformationSheet(
        title: 'Configurer un webhook',
        message: 'La configuration du webhook de $sessionName sera affichée ici.',
      ),
    );

class _Sheet extends StatelessWidget {
  const _Sheet({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .86),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const SizedBox(height: 10),
            Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: const Color(0xFFC9D8D2),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 16, 12),
              child: Row(children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ]),
            ),
            const Divider(height: 1),
            Flexible(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  20,
                  18,
                  20,
                  24 + MediaQuery.viewInsetsOf(context).bottom,
                ),
                child: child,
              ),
            ),
          ]),
        ),
      );
}

class _CreateSheet extends StatefulWidget {
  const _CreateSheet();

  @override
  State<_CreateSheet> createState() => _CreateSheetState();
}

class _CreateSheetState extends State<_CreateSheet> {
  late final TextEditingController _name = TextEditingController(
    text: 'session-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
  );

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _Sheet(
        title: 'Nouvelle session WhatsApp IA',
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Nom de la session', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          TextField(
            controller: _name,
            autofocus: true,
            decoration: const InputDecoration(
              hintText: 'ex. ma-boutique',
              prefixIcon: Icon(Icons.label_outline_rounded),
            ),
          ),
          const SizedBox(height: 9),
          const Text(
            'Lettres, chiffres, tirets et underscores uniquement.',
            style: TextStyle(color: Color(0xFF6B8279), fontSize: 12.5),
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFEAF9F2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Text(
              'Après création, le parcours de connexion vous propose QR code ou code à 8 chiffres.',
              style: TextStyle(color: Color(0xFF476C61), height: 1.35),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => Navigator.pop(context, _name.text),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Créer la session'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: const Color(0xFF25D366),
              ),
            ),
          ),
        ]),
      );
}

class _ActionSheet extends StatelessWidget {
  const _ActionSheet({required this.session});
  final LiveWhatsAppSession session;

  @override
  Widget build(BuildContext context) => _Sheet(
        title: session.name,
        child: Column(children: [
          _ActionRow(
            icon: Icons.qr_code_rounded,
            title: 'Connecter / afficher QR',
            onTap: () => Navigator.pop(context, LiveWhatsAppSessionAction.connect),
          ),
          if (!session.isWorking)
            _ActionRow(
              icon: Icons.play_arrow_rounded,
              title: 'Démarrer la session',
              onTap: () => Navigator.pop(context, LiveWhatsAppSessionAction.start),
            ),
          if (session.isWorking)
            _ActionRow(
              icon: Icons.stop_circle_outlined,
              title: 'Arrêter la session',
              onTap: () => Navigator.pop(context, LiveWhatsAppSessionAction.stop),
            ),
          _ActionRow(
            icon: Icons.smart_toy_outlined,
            title: 'Lier à un bot',
            onTap: () => Navigator.pop(context, LiveWhatsAppSessionAction.linkBot),
          ),
          _ActionRow(
            icon: Icons.webhook_outlined,
            title: 'Configurer un webhook',
            onTap: () => Navigator.pop(context, LiveWhatsAppSessionAction.webhook),
          ),
          _ActionRow(
            icon: Icons.delete_outline_rounded,
            title: 'Supprimer la session',
            danger: true,
            onTap: () => Navigator.pop(context, LiveWhatsAppSessionAction.delete),
          ),
        ]),
      );
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.icon,
    required this.title,
    required this.onTap,
    this.danger = false,
  });
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              border: Border.all(
                color: danger
                    ? const Color(0xFFF1C1C1)
                    : const Color(0xFFDFEBE6),
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(children: [
              Icon(
                icon,
                color: danger ? const Color(0xFFD94747) : const Color(0xFF08756A),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: danger ? const Color(0xFFD94747) : null,
                  ),
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: Color(0xFF6B8279)),
            ]),
          ),
        ),
      );
}

class _ConnectionPlaceholder extends StatelessWidget {
  const _ConnectionPlaceholder({required this.sessionName});
  final String sessionName;

  @override
  Widget build(BuildContext context) => _Sheet(
        title: 'Connecter WhatsApp IA',
        child: Text('Connexion de la session $sessionName.'),
      );
}

class _InformationSheet extends StatelessWidget {
  const _InformationSheet({required this.title, required this.message});
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => _Sheet(
        title: title,
        child: Text(message),
      );
}
