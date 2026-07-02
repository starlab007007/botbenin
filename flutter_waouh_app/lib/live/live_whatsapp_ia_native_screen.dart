import 'dart:async';

import 'package:flutter/material.dart';

import '../main.dart' as legacy;
import 'live_whatsapp_ia_agent_module.dart';
import 'live_whatsapp_ia_models.dart';
import 'live_whatsapp_ia_repository.dart';
import 'live_whatsapp_ia_sheets.dart';

/// Centre de contrôle unique des sessions WAHA et des Agents IA.
/// Aucun autre module de l’application n’est modifié par cet écran.
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

  late final LiveWhatsAppIaRepository _sessions =
      LiveWhatsAppIaRepository(legacy.supabase);
  late final LiveWhatsAppAiAgentRepository _agentsRepository =
      LiveWhatsAppAiAgentRepository(legacy.supabase);

  LiveWhatsAppDashboard? _dashboard;
  List<LiveWhatsAppAiAgent> _agents = const [];
  Timer? _poll;
  bool _loading = true;
  String? _error;
  String? _agentError;

  @override
  void initState() {
    super.initState();
    _refresh();
    _poll = Timer.periodic(const Duration(seconds: 12), (_) {
      _refresh(silent: true);
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
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
      final dashboard = await _sessions.load();
      List<LiveWhatsAppAiAgent> agents = _agents;
      String? agentError;
      try {
        agents = await _agentsRepository.listAgents();
      } catch (error) {
        agentError = '$error';
      }
      if (!mounted) return;
      setState(() {
        _dashboard = dashboard;
        _agents = agents;
        _agentError = agentError;
        if (!silent) _error = null;
      });
    } catch (error) {
      if (!mounted || silent) return;
      setState(() => _error = '$error');
    } finally {
      if (!silent && mounted) setState(() => _loading = false);
    }
  }

  Future<void> _createSession() async {
    final name = await showCreateWhatsAppSessionSheet(context);
    if (name == null || !mounted) return;
    try {
      final session = await _sessions.create(name);
      await _sessions.start(session.name);
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
      repository: _sessions,
      onConnected: () => _refresh(silent: true),
    );
    await _refresh(silent: true);
  }

  Future<void> _createAgent({String? sessionName}) async {
    final changed = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => LiveWhatsAppIaAgentWizard(
        repository: _agentsRepository,
        sessions: _dashboard?.sessions ?? const <LiveWhatsAppSession>[],
        initialSessionName: sessionName,
      ),
    ));
    if (changed == true) await _refresh();
  }

  Future<void> _openActions(LiveWhatsAppSession session) async {
    final action = await showWhatsAppSessionActionsSheet(context, session);
    if (!mounted || action == null) return;
    switch (action) {
      case LiveWhatsAppSessionAction.connect:
        await _connect(session);
        break;
      case LiveWhatsAppSessionAction.start:
        await _run(
          () => _sessions.start(session.name),
          'La ligne est démarrée. Préparation de la connexion en cours.',
        );
        break;
      case LiveWhatsAppSessionAction.stop:
        await _run(
          () => _sessions.stop(session.name),
          'Ligne WhatsApp arrêtée.',
        );
        break;
      case LiveWhatsAppSessionAction.test:
        await showWhatsAppTestMessageSheet(context, sessionName: session.name);
        break;
      case LiveWhatsAppSessionAction.linkBot:
        await showWhatsAppBotLinkSheet(context, sessionName: session.name);
        await _refresh(silent: true);
        break;
      case LiveWhatsAppSessionAction.webhook:
        await showWhatsAppWebhookSheet(context, sessionName: session.name);
        await _refresh(silent: true);
        break;
      case LiveWhatsAppSessionAction.delete:
        await _confirmDelete(session);
        break;
    }
  }

  Future<void> _run(Future<void> Function() operation, String success) async {
    try {
      await operation();
      await _refresh();
      _notice(success, success: true);
    } catch (error) {
      _notice('$error');
    }
  }

  Future<void> _confirmDelete(LiveWhatsAppSession session) async {
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
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFD94747),
            ),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _run(
        () => _sessions.delete(session.name),
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
    final connected = dashboard?.connectedCount ?? 0;
    final activeAgents = _agents.where((item) => item.isActive).length;
    final needsQr =
        sessions.where((item) => item.needsQr && !item.isWorking).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F8F6),
      body: SafeArea(
        child: RefreshIndicator(
          color: _green,
          onRefresh: () => _refresh(),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            slivers: [
              SliverToBoxAdapter(
                child: _header(
                  total: sessions.length,
                  connected: connected,
                  activeAgents: activeAgents,
                  needsQr: needsQr,
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 36),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _mission(sessions),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        _problem('Synchronisation impossible', _error!),
                      ],
                      if ((dashboard?.remoteError ?? '').trim().isNotEmpty) ...[
                        const SizedBox(height: 12),
                        _problem(
                          'WAHA demande votre attention',
                          dashboard!.remoteError!,
                        ),
                      ],
                      if ((_agentError ?? '').trim().isNotEmpty) ...[
                        const SizedBox(height: 12),
                        _problem('Agents IA indisponibles', _agentError!),
                      ],
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Sessions WhatsApp',
                              style: TextStyle(
                                color: _ink,
                                fontSize: 21,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          _counter(sessions.length),
                        ],
                      ),
                      const SizedBox(height: 10),
                      if (_loading && dashboard == null)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 54),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      else if (sessions.isEmpty)
                        _emptySessions()
                      else
                        ...sessions.map(_sessionCard),
                      LiveWhatsAppIaAgentsPanel(
                        agents: _agents,
                        sessions: sessions,
                        repository: _agentsRepository,
                        onChanged: () => _refresh(),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header({
    required int total,
    required int connected,
    required int activeAgents,
    required int needsQr,
  }) =>
      Container(
        padding: const EdgeInsets.fromLTRB(20, 18, 16, 21),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF063F38), Color(0xFF0C6D5E), Color(0xFF139276)],
          ),
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(31)),
        ),
        child: Column(children: [
          Row(children: [
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
                    'Sessions, Agents IA et conversations au même endroit.',
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
              color: Colors.white,
              onPressed: _loading ? null : () => _refresh(),
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
          ]),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(
                child: _headerMetric('$total', 'lignes', Icons.forum_outlined)),
            const SizedBox(width: 8),
            Expanded(
                child: _headerMetric(
                    '$connected', 'connectées', Icons.bolt_rounded)),
            const SizedBox(width: 8),
            Expanded(
                child: _headerMetric('$activeAgents', 'agents actifs',
                    Icons.smart_toy_outlined)),
          ]),
          if (needsQr > 0) ...[
            const SizedBox(height: 11),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0C2).withOpacity(.18),
                borderRadius: BorderRadius.circular(13),
                border:
                    Border.all(color: const Color(0xFFFFE8A5).withOpacity(.35)),
              ),
              child: Text(
                '$needsQr ligne${needsQr > 1 ? 's' : ''} attend${needsQr > 1 ? 'ent' : ''} un QR ou une reconnexion.',
                style: const TextStyle(
                  color: Color(0xFFFFF4CF),
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
          const SizedBox(height: 13),
          Row(children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: _createSession,
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Nouvelle ligne'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  backgroundColor: const Color(0xFF25D366),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(15),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _createAgent,
                icon: const Icon(Icons.smart_toy_outlined, size: 18),
                label: const Text('Nouvel agent'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  foregroundColor: Colors.white,
                  side: BorderSide(color: Colors.white.withOpacity(.42)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(15),
                  ),
                ),
              ),
            ),
          ]),
        ]),
      );

  Widget _headerMetric(String value, String label, IconData icon) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 9),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(.11),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: Colors.white.withOpacity(.12)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: const Color(0xFFB9FFDD), size: 17),
          const SizedBox(height: 5),
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
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFFD5F8EA),
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ]),
      );

  Widget _mission(List<LiveWhatsAppSession> sessions) {
    final session = _prioritySession(sessions);
    final activeAgent = session == null ? null : _agentFor(session.name);
    final connected = session?.isWorking == true;
    final title = session == null
        ? 'Votre première ligne intelligente'
        : !connected
            ? 'Connexion à terminer'
            : activeAgent == null
                ? 'Votre ligne est prête'
                : 'Votre Agent IA est opérationnel';
    final body = session == null
        ? 'Créez une ligne WAHA, connectez WhatsApp puis activez un Agent IA.'
        : !connected
            ? 'Ouvrez le QR Code ou utilisez un code de liaison pour activer « ${session!.name} ».'
            : activeAgent == null
                ? 'Créez, testez et activez un Agent IA sur « ${session!.name} ».'
                : '${activeAgent.personaName} répond sur « ${session.name} ». Vous pouvez suivre les conversations en direct.';
    final label = session == null
        ? 'Créer une ligne'
        : !connected
            ? 'Connecter WhatsApp'
            : activeAgent == null
                ? 'Créer un Agent IA'
                : 'Voir l’Agent IA';
    final action = session == null
        ? _createSession
        : !connected
            ? () => _connect(session)
            : activeAgent == null
                ? () => _createAgent(sessionName: session.name)
                : () async {
                    final changed = await Navigator.of(context).push<bool>(
                      MaterialPageRoute(
                        builder: (_) => LiveWhatsAppIaAgentDetailScreen(
                          repository: _agentsRepository,
                          agent: activeAgent,
                          sessions: sessions,
                        ),
                      ),
                    );
                    if (changed == true) await _refresh();
                  };
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(23),
        border: Border.all(color: const Color(0xFFDDEBE4)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0C102C23),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 39,
            height: 39,
            decoration: BoxDecoration(
              color: const Color(0xFFE4FAF0),
              borderRadius: BorderRadius.circular(13),
            ),
            child: const Icon(Icons.route_rounded, color: _green),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: _ink,
                fontSize: 16.5,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const _LivePill(),
        ]),
        const SizedBox(height: 9),
        Text(
          body,
          style: const TextStyle(
            color: Color(0xFF62756D),
            fontSize: 12.5,
            height: 1.32,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 14),
        _journeySteps(
          hasSession: session != null,
          connected: connected,
          agentActive: activeAgent != null,
        ),
        const SizedBox(height: 15),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: action,
            icon: Icon(
              session == null
                  ? Icons.add_rounded
                  : !connected
                      ? Icons.qr_code_rounded
                      : activeAgent == null
                          ? Icons.smart_toy_rounded
                          : Icons.insights_rounded,
            ),
            label: Text(label),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(47),
              backgroundColor: _green,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(15),
              ),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _journeySteps({
    required bool hasSession,
    required bool connected,
    required bool agentActive,
  }) =>
      Row(children: [
        _JourneyStep(
          number: '1',
          label: 'Ligne',
          done: hasSession,
          active: !hasSession,
        ),
        const _JourneyLine(),
        _JourneyStep(
          number: '2',
          label: 'WhatsApp',
          done: connected,
          active: hasSession && !connected,
        ),
        const _JourneyLine(),
        _JourneyStep(
          number: '3',
          label: 'Agent',
          done: agentActive,
          active: connected && !agentActive,
        ),
        const _JourneyLine(),
        const _JourneyStep(number: '4', label: 'Direct'),
      ]);

  Widget _sessionCard(LiveWhatsAppSession session) {
    final state = _sessionState(session.status);
    final connected = session.isWorking;
    final agent = _agentFor(session.name);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(21),
        child: InkWell(
          onTap: () => _openActions(session),
          borderRadius: BorderRadius.circular(21),
          child: Container(
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(21),
              border: Border.all(
                color: connected
                    ? const Color(0xFFC6ECD9)
                    : const Color(0xFFDFEAE5),
              ),
            ),
            child: Column(children: [
              Row(children: [
                Container(
                  width: 47,
                  height: 47,
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
                        session.displayPhone,
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
                _StatusPill(label: state.label, color: state.color),
              ]),
              const SizedBox(height: 12),
              _agentStrip(session: session, agent: agent),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: connected
                        ? () => showWhatsAppTestMessageSheet(
                              context,
                              sessionName: session.name,
                            )
                        : () => _connect(session),
                    icon: Icon(
                      connected ? Icons.send_rounded : Icons.qr_code_rounded,
                      size: 18,
                    ),
                    label: Text(connected ? 'Tester la ligne' : 'Connecter'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(45),
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
                  style: IconButton.styleFrom(
                    minimumSize: const Size(45, 45),
                    foregroundColor: _green,
                    backgroundColor: const Color(0xFFE9F6F0),
                  ),
                  icon: const Icon(Icons.tune_rounded),
                ),
              ]),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _agentStrip({
    required LiveWhatsAppSession session,
    required LiveWhatsAppAiAgent? agent,
  }) {
    if (!session.isWorking) {
      return _AgentStrip(
        icon: Icons.lock_outline_rounded,
        title: 'Agent IA en attente',
        subtitle: 'Connectez cette ligne avant d’activer un Agent IA.',
        action: null,
      );
    }
    if (agent == null) {
      return _AgentStrip(
        icon: Icons.smart_toy_outlined,
        title: 'Aucun Agent IA actif',
        subtitle: 'Créez, testez puis activez un agent sur cette ligne.',
        action: TextButton(
          onPressed: () => _createAgent(sessionName: session.name),
          child: const Text('Créer'),
        ),
      );
    }
    return _AgentStrip(
      icon: Icons.auto_awesome_rounded,
      title: '${agent.personaName} · Agent IA actif',
      subtitle:
          '${agent.messagesHandled} messages · ${agent.handoffs} handoffs',
      action: TextButton(
        onPressed: () async {
          final changed = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => LiveWhatsAppIaAgentDetailScreen(
                repository: _agentsRepository,
                agent: agent,
                sessions: _dashboard?.sessions ?? const <LiveWhatsAppSession>[],
              ),
            ),
          );
          if (changed == true) await _refresh();
        },
        child: const Text('Gérer'),
      ),
    );
  }

  Widget _emptySessions() => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(23),
          border: Border.all(color: const Color(0xFFDDEBE4)),
        ),
        child: Column(children: [
          Container(
            width: 67,
            height: 67,
            decoration: const BoxDecoration(
              color: Color(0xFFE6FAF0),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.forum_rounded, color: _green, size: 32),
          ),
          const SizedBox(height: 14),
          const Text(
            'Votre premier canal intelligent',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: _ink,
              fontSize: 18.5,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 7),
          const Text(
            'Connectez WhatsApp, créez votre Agent IA, puis suivez vos conversations clientes ici.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Color(0xFF62756D),
              fontSize: 12.5,
              height: 1.35,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: _createSession,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF25D366),
              foregroundColor: Colors.white,
            ),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Créer une ligne WhatsApp'),
          ),
        ]),
      );

  Widget _problem(String title, String message) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF8E7),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF0D69A)),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Icon(Icons.warning_amber_rounded, color: Color(0xFF9B6A00)),
          const SizedBox(width: 9),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
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
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF7A5B00),
                  padding: EdgeInsets.zero,
                ),
                icon: const Icon(Icons.refresh_rounded, size: 17),
                label: const Text('Réessayer'),
              ),
            ]),
          ),
        ]),
      );

  Widget _counter(int count) => Container(
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

  LiveWhatsAppSession? _prioritySession(List<LiveWhatsAppSession> sessions) {
    if (sessions.isEmpty) return null;
    for (final session in sessions) {
      if (!session.isWorking) return session;
    }
    for (final session in sessions) {
      if (_agentFor(session.name) == null) return session;
    }
    return sessions.first;
  }

  LiveWhatsAppAiAgent? _agentFor(String sessionName) {
    for (final agent in _agents) {
      if (agent.isActive && agent.wahaSessionName == sessionName) return agent;
    }
    return null;
  }
}

class _AgentStrip extends StatelessWidget {
  const _AgentStrip({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.action,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFF7FAF8),
          borderRadius: BorderRadius.circular(13),
        ),
        child: Row(children: [
          Icon(icon, color: const Color(0xFF08756A), size: 19),
          const SizedBox(width: 8),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF355148),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(
                  color: Color(0xFF62756D),
                  fontSize: 11.5,
                  height: 1.2,
                ),
              ),
            ]),
          ),
          if (action != null) action!,
        ]),
      );
}

class _JourneyStep extends StatelessWidget {
  const _JourneyStep({
    required this.number,
    required this.label,
    this.done = false,
    this.active = false,
  });
  final String number;
  final String label;
  final bool done;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color =
        done || active ? const Color(0xFF08756A) : const Color(0xFFA7B7B0);
    return Column(children: [
      Container(
        width: 24,
        height: 24,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: done || active ? color : const Color(0xFFF1F4F2),
          shape: BoxShape.circle,
        ),
        child: done
            ? const Icon(Icons.check_rounded, color: Colors.white, size: 15)
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
    ]);
  }
}

class _JourneyLine extends StatelessWidget {
  const _JourneyLine();
  @override
  Widget build(BuildContext context) => const Expanded(
        child: Padding(
          padding: EdgeInsets.only(bottom: 18),
          child: Divider(color: Color(0xFFDCE8E2), thickness: 1.3),
        ),
      );
}

class _LivePill extends StatelessWidget {
  const _LivePill();
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFFE4FAF0),
          borderRadius: BorderRadius.circular(99),
        ),
        child: const Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.circle, color: Color(0xFF1AAE71), size: 8),
          SizedBox(width: 5),
          Text(
            'EN DIRECT',
            style: TextStyle(
              color: Color(0xFF08756A),
              fontSize: 9.5,
              fontWeight: FontWeight.w900,
              letterSpacing: .5,
            ),
          ),
        ]),
      );
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.color});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
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
}

class _SessionState {
  const _SessionState(this.label, this.color, this.icon);
  final String label;
  final Color color;
  final IconData icon;
}

_SessionState _sessionState(String raw) {
  switch (raw.toUpperCase()) {
    case 'WORKING':
    case 'CONNECTED':
      return const _SessionState(
        'Connectée',
        Color(0xFF159B65),
        Icons.check_circle_rounded,
      );
    case 'SCAN_QR_CODE':
      return const _SessionState(
        'QR requis',
        Color(0xFFE99B14),
        Icons.qr_code_rounded,
      );
    case 'STARTING':
      return const _SessionState(
        'Préparation',
        Color(0xFF2574C8),
        Icons.sync_rounded,
      );
    case 'FAILED':
      return const _SessionState(
        'À vérifier',
        Color(0xFFD94747),
        Icons.error_outline_rounded,
      );
    default:
      return const _SessionState(
        'En attente',
        Color(0xFF7D8C86),
        Icons.pause_circle_outline_rounded,
      );
  }
}
