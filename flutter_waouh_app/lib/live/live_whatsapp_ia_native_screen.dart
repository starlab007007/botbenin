import 'dart:async';

import 'package:flutter/material.dart';

import '../main.dart' as legacy;
import 'live_whatsapp_ia_models.dart';
import 'live_whatsapp_ia_repository.dart';
import 'live_whatsapp_ia_sheets.dart';

/// WAOUH IA Studio — experience native de connexion et pilotage WhatsApp.
class LiveWhatsAppIaNativeScreen extends StatefulWidget {
  const LiveWhatsAppIaNativeScreen({super.key});

  @override
  State<LiveWhatsAppIaNativeScreen> createState() =>
      _LiveWhatsAppIaNativeScreenState();
}

class _LiveWhatsAppIaNativeScreenState
    extends State<LiveWhatsAppIaNativeScreen> {
  static const _green = Color(0xFF08756A);
  static const _ink = Color(0xFF16231F);
  late final LiveWhatsAppIaRepository _repository =
      LiveWhatsAppIaRepository(legacy.supabase);

  LiveWhatsAppDashboard? _dashboard;
  Timer? _statusPoll;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
    _statusPoll = Timer.periodic(const Duration(seconds: 12), (_) {
      _refresh(silent: true);
    });
  }

  @override
  void dispose() {
    _statusPoll?.cancel();
    super.dispose();
  }

  Future<void> _refresh({bool silent = false}) async {
    if (!silent && mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final result = await _repository.load();
      if (!mounted) return;
      setState(() {
        _dashboard = result;
        if (!silent) _error = null;
      });
    } catch (error) {
      if (!mounted || silent) return;
      setState(() => _error = '$error');
    } finally {
      if (!silent && mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    final name = await showCreateWhatsAppSessionSheet(context);
    if (name == null || !mounted) return;
    try {
      final session = await _repository.create(name);
      await _repository.start(session.name);
      await _refresh();
      if (!mounted) return;
      await _connect(session);
    } catch (error) {
      _notice('$error');
    }
  }

  Future<void> _connect(LiveWhatsAppSession session) async {
    await showWhatsAppConnectionSheet(
      context,
      sessionName: session.name,
      repository: _repository,
      onConnected: () => _refresh(silent: true),
    );
    await _refresh(silent: true);
  }

  Future<void> _linkBot(LiveWhatsAppSession session) async {
    await showWhatsAppBotLinkSheet(context, sessionName: session.name);
    await _refresh(silent: true);
  }

  Future<void> _test(LiveWhatsAppSession session) =>
      showWhatsAppTestMessageSheet(context, sessionName: session.name);

  Future<void> _openActions(LiveWhatsAppSession session) async {
    final action = await showWhatsAppSessionActionsSheet(context, session);
    if (!mounted || action == null) return;

    switch (action) {
      case LiveWhatsAppSessionAction.connect:
        await _connect(session);
        break;
      case LiveWhatsAppSessionAction.start:
        await _run(
          () => _repository.start(session.name),
          'Ligne démarrée. Préparation de la connexion en cours.',
        );
        break;
      case LiveWhatsAppSessionAction.stop:
        await _run(
            () => _repository.stop(session.name), 'Ligne WhatsApp arrêtée.');
        break;
      case LiveWhatsAppSessionAction.test:
        await _test(session);
        break;
      case LiveWhatsAppSessionAction.linkBot:
        await _linkBot(session);
        break;
      case LiveWhatsAppSessionAction.webhook:
        await showWhatsAppWebhookSheet(context, sessionName: session.name);
        await _refresh(silent: true);
        break;
      case LiveWhatsAppSessionAction.delete:
        await _delete(session);
        break;
    }
  }

  Future<void> _run(Future<void> Function() operation, String message) async {
    try {
      await operation();
      await _refresh();
      _notice(message, success: true);
    } catch (error) {
      _notice('$error');
    }
  }

  Future<void> _delete(LiveWhatsAppSession session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Supprimer cette ligne ?'),
        content: Text(
          '« ${session.name} » sera supprimée de WAHA et de votre espace WAOUH.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFD94747)),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _run(
        () => _repository.delete(session.name),
        'Ligne WhatsApp supprimée.',
      );
    }
  }

  void _notice(String text, {bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: success ? const Color(0xFF159B65) : _ink,
        content: Text(text.replaceFirst('LiveWhatsAppIaException: ', '')),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = _dashboard;
    final sessions = dashboard?.sessions ?? const <LiveWhatsAppSession>[];
    final mission = _mission(sessions);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F8F6),
      body: SafeArea(
        child: RefreshIndicator(
          color: _green,
          onRefresh: () => _refresh(),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            padding: EdgeInsets.zero,
            children: [
              _header(sessions.length, dashboard?.connectedCount ?? 0),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 36),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _journey(mission),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      _problem('Synchronisation impossible', _error!),
                    ],
                    if ((dashboard?.remoteError ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _problem(
                        'WAHA est momentanément indisponible',
                        dashboard!.remoteError!,
                      ),
                    ],
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Vos lignes IA',
                            style: TextStyle(
                              color: _ink,
                              fontSize: 21,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        _count(sessions.length),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if (_loading && dashboard == null)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 60),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (sessions.isEmpty)
                      _empty()
                    else
                      ...sessions.map(_lineCard),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header(int total, int connected) => Container(
        padding: const EdgeInsets.fromLTRB(20, 18, 16, 22),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF063F38), Color(0xFF0C6D5E), Color(0xFF139276)],
          ),
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(.14),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.auto_awesome_rounded,
                    color: Color(0xFFB8FFE3),
                  ),
                ),
                const SizedBox(width: 11),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'WhatsApp IA',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 21,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Vos conversations deviennent intelligentes.',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Color(0xFFD5F8EA),
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Synchroniser',
                  onPressed: _loading ? null : () => _refresh(),
                  color: Colors.white,
                  icon: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.sync_rounded),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                    child: _metric('$total', 'lignes', Icons.forum_outlined)),
                const SizedBox(width: 10),
                Expanded(
                    child:
                        _metric('$connected', 'actives', Icons.bolt_rounded)),
                const SizedBox(width: 10),
                FilledButton.icon(
                  onPressed: _create,
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: const Text('Ligne'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 52),
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    backgroundColor: const Color(0xFF25D366),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      );

  Widget _metric(String value, String label, IconData icon) => Container(
        height: 52,
        padding: const EdgeInsets.symmetric(horizontal: 11),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(.11),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFFB9FFDD), size: 19),
            const SizedBox(width: 7),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(
                    color: Color(0xFFD5F8EA),
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ],
        ),
      );

  Widget _journey(LiveWhatsAppSession? session) {
    final connected = session?.isWorking == true;
    final headline = session == null
        ? 'Votre première ligne IA'
        : connected
            ? 'Votre ligne est connectée'
            : 'Connexion à terminer';
    final body = session == null
        ? 'Créez une ligne, connectez WhatsApp, puis laissez un agent IA répondre.'
        : connected
            ? 'Passez à l’automatisation ou testez votre canal.'
            : 'Ouvrez le QR Code ou utilisez le code de liaison pour activer ${session!.name}.';
    final button = session == null
        ? 'Créer une ligne'
        : connected
            ? 'Lier un assistant IA'
            : 'Connecter WhatsApp';
    final action = session == null
        ? _create
        : connected
            ? () => _linkBot(session)
            : () => _connect(session);

    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFDDEBE4)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0E102C23),
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFE4FAF0),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: const Icon(
                  Icons.route_rounded,
                  color: _green,
                  size: 21,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  headline,
                  style: const TextStyle(
                    color: _ink,
                    fontSize: 16.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              _live(),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            body,
            style: const TextStyle(
              color: Color(0xFF62756D),
              height: 1.32,
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 17),
          _steps(session != null, connected),
          const SizedBox(height: 17),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: action,
                  icon: Icon(
                    session == null
                        ? Icons.add_rounded
                        : connected
                            ? Icons.smart_toy_rounded
                            : Icons.qr_code_rounded,
                    size: 18,
                  ),
                  label: Text(button),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    backgroundColor: _green,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                  ),
                ),
              ),
              if (connected) ...[
                const SizedBox(width: 9),
                IconButton.filledTonal(
                  tooltip: 'Tester la ligne',
                  onPressed: () => _test(session),
                  icon: const Icon(Icons.send_rounded),
                  style: IconButton.styleFrom(
                    minimumSize: const Size(48, 48),
                    foregroundColor: _green,
                    backgroundColor: const Color(0xFFE8F8F1),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _steps(bool hasSession, bool connected) => Row(
        children: [
          _step('1', 'Ligne', hasSession, !hasSession),
          const Expanded(
              child: Padding(
                  padding: EdgeInsets.only(bottom: 18), child: Divider())),
          _step('2', 'WhatsApp', connected, hasSession && !connected),
          const Expanded(
              child: Padding(
                  padding: EdgeInsets.only(bottom: 18), child: Divider())),
          _step('3', 'Assistant', false, connected),
          const Expanded(
              child: Padding(
                  padding: EdgeInsets.only(bottom: 18), child: Divider())),
          _step('4', 'Test', false, false),
        ],
      );

  Widget _step(String number, String label, bool done, bool active) {
    final color = done || active ? _green : const Color(0xFFA7B7B0);
    return Column(
      children: [
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: done || active ? color : const Color(0xFFF1F4F2),
            shape: BoxShape.circle,
          ),
          child: done
              ? const Icon(Icons.check_rounded, size: 15, color: Colors.white)
              : Text(
                  number,
                  style: TextStyle(
                    color: active ? Colors.white : color,
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                  ),
                ),
        ),
        const SizedBox(height: 5),
        Text(
          label,
          style: TextStyle(
            color: done || active
                ? const Color(0xFF355148)
                : const Color(0xFF8EA098),
            fontSize: 9.5,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }

  Widget _lineCard(LiveWhatsAppSession session) {
    final state = _status(session.status);
    final connected = session.isWorking;
    final phone = session.phone?.trim();
    final next = connected
        ? 'Canal prêt pour vos clients'
        : session.needsQr
            ? 'Action requise pour activer la ligne'
            : 'Vérifiez et relancez la session si besoin';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        child: InkWell(
          onTap: () => _openActions(session),
          borderRadius: BorderRadius.circular(22),
          child: Container(
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                color: connected
                    ? const Color(0xFFC6ECD9)
                    : const Color(0xFFDFEAE5),
              ),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: state.color.withOpacity(.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(state.icon, color: state.color, size: 24),
                    ),
                    const SizedBox(width: 11),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            session.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: _ink,
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            (phone == null || phone.isEmpty)
                                ? 'Aucun numéro lié'
                                : '+$phone',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF6B8279),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _statusPill(state.label, state.color),
                  ],
                ),
                const SizedBox(height: 13),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7FAF8),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        connected
                            ? Icons.auto_awesome_rounded
                            : Icons.info_outline_rounded,
                        color: connected ? _green : const Color(0xFF7C8D86),
                        size: 17,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          next,
                          style: const TextStyle(
                            color: Color(0xFF536A60),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: connected
                            ? () => _test(session)
                            : () => _connect(session),
                        icon: Icon(
                          connected
                              ? Icons.send_rounded
                              : Icons.qr_code_rounded,
                          size: 18,
                        ),
                        label: Text(
                          connected ? 'Tester la ligne' : 'Connecter',
                        ),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(46),
                          backgroundColor:
                              connected ? _green : const Color(0xFF128C7E),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filledTonal(
                      tooltip: 'Gérer la ligne',
                      onPressed: () => _openActions(session),
                      icon: const Icon(Icons.tune_rounded),
                      style: IconButton.styleFrom(
                        minimumSize: const Size(46, 46),
                        foregroundColor: _green,
                        backgroundColor: const Color(0xFFE9F6F0),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _empty() => Container(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(25),
          border: Border.all(color: const Color(0xFFDDEBE4)),
        ),
        child: Column(
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: Color(0xFFE6FAF0),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.forum_rounded, color: _green, size: 34),
            ),
            const SizedBox(height: 16),
            const Text(
              'Votre premier canal intelligent',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: _ink,
                fontSize: 19,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Connectez votre WhatsApp en moins de deux minutes, puis ajoutez un assistant IA à vos conversations.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF62756D),
                height: 1.35,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 19),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _create,
                icon: const Icon(Icons.add_rounded),
                label: const Text('Créer ma première ligne'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  backgroundColor: const Color(0xFF25D366),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(15),
                  ),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _problem(String title, String message) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF8E7),
          borderRadius: BorderRadius.circular(17),
          border: Border.all(color: const Color(0xFFF0D69A)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.warning_amber_rounded, color: Color(0xFF9B6A00)),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Color(0xFF654F1D),
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    message.replaceFirst('LiveWhatsAppIaException: ', ''),
                    style: const TextStyle(
                      color: Color(0xFF705E35),
                      fontSize: 12,
                      height: 1.3,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => _refresh(),
                    icon: const Icon(Icons.refresh_rounded, size: 17),
                    label: const Text('Réessayer'),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF7A5B00),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _count(int count) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFFE3F7EE),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(
          '$count',
          style: const TextStyle(
            color: _green,
            fontSize: 13,
            fontWeight: FontWeight.w900,
          ),
        ),
      );

  Widget _live() => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFFE4FAF0),
          borderRadius: BorderRadius.circular(99),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.circle, color: Color(0xFF1AAE71), size: 8),
            SizedBox(width: 5),
            Text(
              'EN DIRECT',
              style: TextStyle(
                color: _green,
                fontSize: 9.5,
                fontWeight: FontWeight.w900,
                letterSpacing: .5,
              ),
            ),
          ],
        ),
      );

  Widget _statusPill(String label, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: color.withOpacity(.12),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 10,
            fontWeight: FontWeight.w900,
          ),
        ),
      );

  LiveWhatsAppSession? _mission(List<LiveWhatsAppSession> sessions) {
    if (sessions.isEmpty) return null;
    for (final session in sessions) {
      if (!session.isWorking) return session;
    }
    return sessions.first;
  }
}

class _Status {
  const _Status(this.label, this.color, this.icon);

  final String label;
  final Color color;
  final IconData icon;
}

_Status _status(String raw) {
  switch (raw.toUpperCase()) {
    case 'WORKING':
    case 'CONNECTED':
      return const _Status(
        'Connectée',
        Color(0xFF159B65),
        Icons.check_circle_rounded,
      );
    case 'SCAN_QR_CODE':
      return const _Status(
        'QR requis',
        Color(0xFFE99B14),
        Icons.qr_code_rounded,
      );
    case 'STARTING':
      return const _Status(
        'Préparation',
        Color(0xFF2574C8),
        Icons.sync_rounded,
      );
    case 'FAILED':
      return const _Status(
        'À vérifier',
        Color(0xFFD94747),
        Icons.error_outline_rounded,
      );
    default:
      return const _Status(
        'En attente',
        Color(0xFF7D8C86),
        Icons.pause_circle_outline_rounded,
      );
  }
}
