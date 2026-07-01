import 'package:flutter/material.dart';

import '../main.dart' as legacy;
import 'live_theme.dart';
import 'live_whatsapp_ia_models.dart';
import 'live_whatsapp_ia_repository.dart';
import 'live_whatsapp_ia_sheets.dart';

class LiveWhatsAppIaNativeScreen extends StatefulWidget {
  const LiveWhatsAppIaNativeScreen({super.key});

  @override
  State<LiveWhatsAppIaNativeScreen> createState() =>
      _LiveWhatsAppIaNativeScreenState();
}

class _LiveWhatsAppIaNativeScreenState
    extends State<LiveWhatsAppIaNativeScreen> {
  late final LiveWhatsAppIaRepository _repository =
      LiveWhatsAppIaRepository(legacy.supabase);
  LiveWhatsAppDashboard? _dashboard;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final value = await _repository.load();
      if (mounted) setState(() => _dashboard = value);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    final created = await showCreateWhatsAppSessionSheet(context);
    if (created == null || !mounted) return;
    try {
      final session = await _repository.create(created);
      await _repository.start(session.name);
      await _refresh();
      if (mounted) {
        await showWhatsAppConnectionSheet(
          context,
          sessionName: session.name,
          repository: _repository,
          onConnected: _refresh,
        );
      }
    } catch (error) {
      _notice('$error');
    }
  }

  Future<void> _openActions(LiveWhatsAppSession session) async {
    final action = await showWhatsAppSessionActionsSheet(context, session);
    if (!mounted || action == null) return;
    switch (action) {
      LiveWhatsAppSessionAction.connect => showWhatsAppConnectionSheet(
          context,
          sessionName: session.name,
          repository: _repository,
          onConnected: _refresh,
        ),
      LiveWhatsAppSessionAction.start => _run(
          () => _repository.start(session.name),
          success: 'Session démarrée. Préparation du QR en cours.',
        ),
      LiveWhatsAppSessionAction.stop => _run(
          () => _repository.stop(session.name),
          success: 'Session arrêtée.',
        ),
      LiveWhatsAppSessionAction.linkBot => showWhatsAppBotLinkSheet(
          context,
          sessionName: session.name,
        ),
      LiveWhatsAppSessionAction.webhook => showWhatsAppWebhookSheet(
          context,
          sessionName: session.name,
        ),
      LiveWhatsAppSessionAction.delete => _confirmDelete(session),
    }
  }

  Future<void> _run(Future<void> Function() action, {required String success}) async {
    try {
      await action();
      await _refresh();
      _notice(success, success: true);
    } catch (error) {
      _notice('$error');
    }
  }

  Future<void> _confirmDelete(LiveWhatsAppSession session) async {
    final accepted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Supprimer la session ?'),
        content: Text(
          'La session « ${session.name} » sera supprimée de WAHA et de votre espace.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: WaouhPalette.red),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (accepted == true) {
      await _run(
        () => _repository.delete(session.name),
        success: 'Session supprimée.',
      );
    }
  }

  void _notice(String text, {bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: success ? WaouhPalette.green : WaouhPalette.ink,
        content: Text(text.replaceFirst('LiveWhatsAppIaException: ', '')),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = _dashboard;
    final sessions = dashboard?.sessions ?? const <LiveWhatsAppSession>[];
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(
        backgroundColor: const Color(0xFF075E54),
        foregroundColor: Colors.white,
        elevation: 0,
        titleSpacing: 18,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('WhatsApp IA', style: TextStyle(fontWeight: FontWeight.w900)),
            SizedBox(height: 1),
            Text('Sessions, QR et bots', style: TextStyle(fontSize: 11.5, color: Color(0xFFC9F6E6))),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Actualiser',
            onPressed: _loading ? null : _refresh,
            icon: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.refresh_rounded),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilledButton.icon(
              onPressed: _create,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Nouvelle'),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF25D366),
                foregroundColor: Colors.white,
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            _OverviewCard(
              sessions: sessions.length,
              connected: dashboard?.connectedCount ?? 0,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              _ErrorCard(message: _error!, onRetry: _refresh),
            ],
            if ((dashboard?.remoteError ?? '').isNotEmpty) ...[
              const SizedBox(height: 12),
              _ErrorCard(
                message: dashboard!.remoteError!,
                onRetry: _refresh,
                compact: true,
              ),
            ],
            const SizedBox(height: 20),
            Row(children: [
              const Expanded(
                child: Text(
                  'Mes sessions',
                  style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
                ),
              ),
              Text(
                '${sessions.length}',
                style: const TextStyle(
                  color: Color(0xFF08756A),
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ]),
            const SizedBox(height: 10),
            if (_loading && dashboard == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 54),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (sessions.isEmpty)
              _EmptySessions(onCreate: _create)
            else
              ...sessions.map(
                (session) => _SessionCard(
                  session: session,
                  onTap: () => _openActions(session),
                  onConnect: () => showWhatsAppConnectionSheet(
                    context,
                    sessionName: session.name,
                    repository: _repository,
                    onConnected: _refresh,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _OverviewCard extends StatelessWidget {
  const _OverviewCard({required this.sessions, required this.connected});

  final int sessions;
  final int connected;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            colors: [Color(0xFF075E54), Color(0xFF128C7E)],
          ),
          boxShadow: const [
            BoxShadow(color: Color(0x33075E54), blurRadius: 18, offset: Offset(0, 10)),
          ],
        ),
        child: Row(children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(.16),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.chat_rounded, color: Color(0xFF25D366), size: 32),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Centre de contrôle WAHA', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              Text(
                '$connected connectée${connected > 1 ? 's' : ''} sur $sessions session${sessions > 1 ? 's' : ''}',
                style: const TextStyle(color: Color(0xFFC9F6E6), fontWeight: FontWeight.w700),
              ),
            ]),
          ),
        ]),
      );
}

class _SessionCard extends StatelessWidget {
  const _SessionCard({
    required this.session,
    required this.onTap,
    required this.onConnect,
  });

  final LiveWhatsAppSession session;
  final VoidCallback onTap;
  final VoidCallback onConnect;

  @override
  Widget build(BuildContext context) {
    final status = _status(session.status);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFDFEBE6)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(children: [
            Row(children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: status.color.withOpacity(.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(status.icon, color: status.color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(session.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 3),
                  Text(session.phone == null || session.phone!.isEmpty ? 'Aucun numéro lié' : '+${session.phone}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF6B8279), fontWeight: FontWeight.w600, fontSize: 12.5)),
                ]),
              ),
              _StatusPill(label: status.label, color: status.color),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              if (!session.isWorking)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onConnect,
                    icon: const Icon(Icons.qr_code_rounded, size: 18),
                    label: const Text('Connecter'),
                  ),
                )
              else
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onTap,
                    icon: const Icon(Icons.settings_outlined, size: 18),
                    label: const Text('Gérer la session'),
                    style: FilledButton.styleFrom(backgroundColor: const Color(0xFF08756A)),
                  ),
                ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                onPressed: onTap,
                icon: const Icon(Icons.more_horiz_rounded),
                tooltip: 'Actions',
              ),
            ]),
          ]),
        ),
      ),
    );
  }
}

class _EmptySessions extends StatelessWidget {
  const _EmptySessions({required this.onCreate});
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFDFEBE6)),
        ),
        child: Column(children: [
          const Icon(Icons.phone_android_rounded, color: Color(0xFF6B8279), size: 52),
          const SizedBox(height: 13),
          const Text('Aucune session WhatsApp IA', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
          const SizedBox(height: 7),
          const Text('Créez une session, scannez le QR code ou utilisez le code à 8 chiffres pour connecter votre compte.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF6B8279), height: 1.35)),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add_rounded),
            label: const Text('Créer ma première session'),
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366)),
          ),
        ]),
      );
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message, required this.onRetry, this.compact = false});
  final String message;
  final VoidCallback onRetry;
  final bool compact;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF7E7),
          border: Border.all(color: const Color(0xFFF0D69A)),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Icon(Icons.warning_amber_rounded, color: Color(0xFF9B6A00)),
          const SizedBox(width: 9),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(compact ? 'WAHA indisponible' : 'Chargement impossible', style: const TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 3),
            Text(message.replaceFirst('LiveWhatsAppIaException: ', ''), style: const TextStyle(color: Color(0xFF705E35), fontSize: 12.5, height: 1.3)),
            const SizedBox(height: 8),
            TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded, size: 18), label: const Text('Réessayer')),
          ])),
        ]),
      );
}

class _StatusInfo {
  const _StatusInfo(this.label, this.color, this.icon);
  final String label;
  final Color color;
  final IconData icon;
}

_StatusInfo _status(String raw) {
  switch (raw.toUpperCase()) {
    case 'WORKING':
    case 'CONNECTED':
      return const _StatusInfo('Connecté', Color(0xFF159B65), Icons.check_circle_rounded);
    case 'SCAN_QR_CODE':
      return const _StatusInfo('Scanner le QR', Color(0xFFE99B14), Icons.qr_code_rounded);
    case 'STARTING':
      return const _StatusInfo('Démarrage', Color(0xFF2574C8), Icons.sync_rounded);
    case 'FAILED':
      return const _StatusInfo('Échec', Color(0xFFD94747), Icons.error_outline_rounded);
    default:
      return const _StatusInfo('Arrêtée', Color(0xFF7D8C86), Icons.pause_circle_outline_rounded);
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.color});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(color: color.withOpacity(.12), borderRadius: BorderRadius.circular(99)),
        child: Text(label, style: TextStyle(color: color, fontSize: 10.5, fontWeight: FontWeight.w900)),
      );
}
