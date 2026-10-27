import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../main.dart' as legacy;
import 'agentic/live_agentic_models.dart';
import 'agentic/live_agentic_workspace.dart';
import 'avatar/bot_character.dart';
import 'convergence/live_convergence_screen.dart';
import 'live_avatar_autonomy.dart';
import 'live_controller.dart';
import 'live_nexus_service.dart';
import 'live_mission_domain.dart';

class LiveMinimalMissionTile extends StatelessWidget {
  const LiveMinimalMissionTile({
    super.key,
    required this.title,
    required this.line,
    required this.status,
    required this.onTap,
    this.decision = false,
  });
  final String title, line, status;
  final VoidCallback onTap;
  final bool decision;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(21),
        side: const BorderSide(color: avatarPremiumLine),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: !decision
              ? Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F3FA),
                        borderRadius: BorderRadius.circular(13),
                      ),
                      child: const Icon(
                        Icons.route_outlined,
                        size: 19,
                        color: avatarPremiumMuted,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 7),
                          Text(
                            line,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              color: avatarPremiumMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right,
                      size: 16,
                      color: avatarPremiumMuted,
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: decision
                            ? const Color(0xFFFFF5E5)
                            : const Color(0xFFE9F7F1),
                        borderRadius: BorderRadius.circular(7),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(
                          fontSize: 11,
                          color: decision
                              ? const Color(0xFF956016)
                              : const Color(0xFF087C68),
                        ),
                      ),
                    ),
                    const SizedBox(height: 17),
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -.3,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      line,
                      style: const TextStyle(
                        fontSize: 12,
                        color: avatarPremiumMuted,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            decision ? 'Voir la décision' : 'Voir le suivi',
                            style: const TextStyle(
                              fontSize: 12,
                              color: avatarPremiumBlue,
                            ),
                          ),
                        ),
                        const Icon(
                          Icons.north_east,
                          size: 15,
                          color: avatarPremiumBlue,
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

class LiveMissionsScreen extends StatefulWidget {
  const LiveMissionsScreen({
    super.key,
    this.initialMandate,
    this.showAdvanced = false,
  });
  final String? initialMandate;
  final bool showAdvanced;
  @override
  State<LiveMissionsScreen> createState() => _LiveMissionsScreenState();
}

class _LiveMissionsScreenState extends State<LiveMissionsScreen>
    with WidgetsBindingObserver {
  late final LiveNexusService _service;
  StreamSubscription<dynamic>? _auth;
  Timer? _timer;
  String? _account;
  int _version = 0;
  List<Map<String, dynamic>> _mandates = [];
  List<NexusOpportunityJourney> _journeys = [];
  bool _loading = false, _archive = false, _paused = false;
  bool _openedInitial = false;
  String? _error;
  static const _finished = {'completed', 'cancelled', 'expired', 'failed'};
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _service = LiveNexusService(legacy.supabase);
    _account = legacy.supabase.auth.currentUser?.id;
    _auth = legacy.supabase.auth.onAuthStateChange.listen((event) {
      final next = legacy.supabase.auth.currentUser?.id;
      if (next != _account && mounted) {
        _version++;
        setState(() {
          _account = next;
          _mandates = [];
          _journeys = [];
          _paused = false;
          _loading = false;
        });
        _load();
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _load();
        final id = _account;
        if (id != null)
          context.read<LiveWaouhController>().agentic.initialize(id);
      }
    });
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed)
        _load();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _load();
  }

  @override
  void dispose() {
    _version++;
    _timer?.cancel();
    _auth?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _load() async {
    if (_loading || !mounted) return;
    final account = legacy.supabase.auth.currentUser?.id;
    if (account == null) return;
    final v = ++_version;
    setState(() => _loading = true);
    try {
      final data = await _service.listMandates();
      final journeys = await _service.listOpportunities(
        includeCompleted: true,
        limit: 100,
      );
      final rules = await loadLiveAvatarAutonomy();
      if (!mounted ||
          v != _version ||
          account != legacy.supabase.auth.currentUser?.id)
        return;
      setState(() {
        final rows = data['mandates'];
        _mandates = rows is List
            ? rows
                  .whereType<Map>()
                  .map((r) => Map<String, dynamic>.from(r))
                  .toList()
            : [];
        _journeys = journeys;
        _paused = rules['paused'] == true;
        _error = null;
      });
      if (!_openedInitial) {
        _openedInitial = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          if (widget.showAdvanced) {
            _advanced();
            return;
          }
          final rows = _mandates
              .where((m) => m['id'] == widget.initialMandate)
              .toList();
          if (rows.isNotEmpty) _open(rows.first);
        });
      }
    } catch (_) {
      if (mounted && v == _version)
        setState(() => _error = 'Suivi indisponible. Réessayez.');
    } finally {
      if (mounted && v == _version) setState(() => _loading = false);
    }
  }

  void _resumeMission(WaouhMission mission) {
    final c = context.read<LiveWaouhController>();
    final prompt = c.agentic.resumeMission(mission.id);
    if (prompt.isEmpty) return;
    c.setComposerSeed(
      prompt,
      meta: {
        'mission_id': mission.id,
        'action': 'resume_mission',
        'intent': 'search',
        'schema': 'waouh.message.v1',
      },
    );
    context.go('/app/chat/waouh');
  }

  Future<void> _newNeed() async {
    final input = TextEditingController();
    final need = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
          22,
          0,
          22,
          24 + MediaQuery.viewInsetsOf(ctx).bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Confier un besoin',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: input,
              autofocus: true,
              maxLength: 1000,
              decoration: const InputDecoration(
                labelText: 'Votre besoin',
                hintText: 'Un produit, un service, une annonce…',
              ),
              onSubmitted: (v) {
                if (v.trim().isNotEmpty) Navigator.pop(ctx, v.trim());
              },
            ),
            const SizedBox(height: 12),
            const Text(
              'Bot recherche, compare et suit selon vos règles.',
              style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: () {
                if (input.text.trim().isNotEmpty)
                  Navigator.pop(ctx, input.text.trim());
              },
              icon: const Icon(Icons.auto_awesome_outlined, size: 16),
              label: const Text('Confier à Bot'),
            ),
          ],
        ),
      ),
    );
    input.dispose();
    if (need != null && mounted)
      context.push(
        '/app/nexus?${Uri(queryParameters: {'q': need, 'go': '1', 'mode': 'auto', 'kind': 'trouver', 'follow': '1'}).query}',
      );
  }

  Future<void> _advanced() async {
    if (legacy.supabase.auth.currentUser == null) {
      context.go('/app/auth?next=/app/missions');
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (ctx) => Scaffold(
          backgroundColor: avatarPremiumBg,
          appBar: AppBar(title: const Text('Suivi détaillé')),
          body: LiveAgenticWorkspace(
            controller: context.read<LiveWaouhController>().agentic,
            onResumeMission: _resumeMission,
            standalone: true,
          ),
        ),
      ),
    );
    if (mounted) _load();
  }

  bool _decision(Map<String, dynamic> m) => _journeys.any(
    (j) =>
        j.mandateId == m['id'] &&
        j.lastAction == 'owner_approval_requested' &&
        !_finished.contains(j.stage),
  );
  Future<void> _open(Map<String, dynamic> mission) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (ctx) => StatefulBuilder(
        builder: (sheet, update) {
          var row = _mandates.firstWhere(
            (m) => m['id'] == mission['id'],
            orElse: () => mission,
          );
          final meta = row['metadata'] is Map
              ? row['metadata'] as Map
              : const {};
          final watch = meta['discovery_kind'] == 'opportunity';
          final selection = meta['latest_selection'] is List
              ? (meta['latest_selection'] as List).whereType<Map>().toList()
              : <Map>[];
          final related = _journeys
              .where((j) => j.mandateId == row['id'])
              .toList();
          return ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(ctx).height * .82,
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(22, 0, 22, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '${row['goal'] ?? 'Ma mission'}',
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${row['city'] ?? 'Zone à préciser'}${row['budget_max'] != null ? ' · ${row['budget_max']} F max' : ''}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: avatarPremiumMuted,
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (watch) ...[
                    Text(
                      liveAutomaticMissionMessage(row),
                      style: const TextStyle(
                        fontSize: 12,
                        color: avatarPremiumMuted,
                      ),
                    ),
                    for (final selected in selection)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          '${selected['subject'] ?? 'Piste repérée'}',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        subtitle: Text(_watchDeadline(selected['deadline'])),
                      ),
                  ],
                  TextButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      context.push(
                        '/app/nexus?${Uri(
                          queryParameters: {
                            'q': '${row['goal'] ?? ''}',
                            'city': '${row['city'] ?? ''}',
                            'kind': normalizeMissionKind(meta['discovery_kind'], query: '${row['goal'] ?? ''}', mode: '${row['mode'] ?? ''}'),
                          },
                        ).query}',
                      );
                    },
                    child: const Text('Nouvelle recherche'),
                  ),
                  if (related.isEmpty && !watch)
                    const Text(
                      'Bot cherche les bonnes pistes dans vos limites.',
                      style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
                    ),
                  for (final j in related)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            j.subject ?? 'Opportunité',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 7),
                          Text(
                            {
                                  'discovered': 'Piste repérée',
                                  'enriching': 'Vérification en cours',
                                  'contact_ready': 'Contact prêt',
                                  'contacting': 'Contact en cours',
                                  'waiting_reply': 'Réponse attendue',
                                  'negotiating': 'Échange en cours',
                                  'agreed': 'Accord à examiner',
                                  'executing': 'Réalisation en cours',
                                  'completed': 'Terminée',
                                  'cancelled': 'Arrêtée',
                                }[j.stage] ??
                                'Suivi en cours',
                            style: const TextStyle(
                              fontSize: 12,
                              color: avatarPremiumMuted,
                            ),
                          ),
                          if (j.lastMessage?.isNotEmpty == true)
                            Padding(
                              padding: const EdgeInsets.only(top: 7),
                              child: Text(
                                j.lastMessage!,
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          if (j.threadId != null)
                            TextButton(
                              onPressed: () {
                                Navigator.pop(ctx);
                                context.push('/app/chat/${j.threadId}');
                              },
                              child: const Text('Ouvrir l’échange'),
                            ),
                        ],
                      ),
                    ),
                  if (_decision(row))
                    FilledButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _advanced();
                      },
                      child: const Text('Examiner la décision'),
                    ),
                  if (!_finished.contains('${row['status']}'))
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              try {
                                final next = row['status'] == 'paused'
                                    ? 'active'
                                    : 'paused';
                                final r = await _service.updateMandate(
                                  '${row['id']}',
                                  status: next,
                                );
                                if (!mounted || !sheet.mounted) return;
                                setState(() {
                                  final m = r['mandate'];
                                  if (m is Map)
                                    _mandates = _mandates
                                        .map(
                                          (v) => v['id'] == row['id']
                                              ? Map<String, dynamic>.from(m)
                                              : v,
                                        )
                                        .toList();
                                });
                                update(() {});
                              } catch (_) {
                                if (sheet.mounted)
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Modification impossible. Réessayez.',
                                      ),
                                    ),
                                  );
                              }
                            },
                            icon: Icon(
                              row['status'] == 'paused'
                                  ? Icons.play_arrow_outlined
                                  : Icons.pause,
                              size: 16,
                            ),
                            label: Text(
                              row['status'] == 'paused' ? 'Reprendre' : 'Pause',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () async {
                              final yes = await showDialog<bool>(
                                context: ctx,
                                builder: (c) => AlertDialog(
                                  title: const Text('Arrêter cette mission ?'),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.pop(c, false),
                                      child: const Text('Annuler'),
                                    ),
                                    FilledButton(
                                      onPressed: () => Navigator.pop(c, true),
                                      child: const Text('Arrêter'),
                                    ),
                                  ],
                                ),
                              );
                              if (yes != true) return;
                              try {
                                await _service.updateMandate(
                                  '${row['id']}',
                                  status: 'cancelled',
                                );
                                if (ctx.mounted) Navigator.pop(ctx);
                              } catch (_) {
                                if (mounted)
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Modification impossible. Réessayez.',
                                      ),
                                    ),
                                  );
                              }
                            },
                            child: const Text('Arrêter'),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final signedIn = context.watch<legacy.AuthController>().signedIn;
    final agentic = context.watch<LiveWaouhController>().agentic;
    final current =
        _mandates
            .where(
              (m) => _archive
                  ? _finished.contains('${m['status']}')
                  : !_finished.contains('${m['status']}'),
            )
            .toList()
          ..sort(
            (a, b) => _decision(a) == _decision(b)
                ? '${b['created_at']}'.compareTo('${a['created_at']}')
                : _decision(a)
                ? -1
                : 1,
          );
    final linked = _mandates
        .map(
          (m) => m['metadata'] is Map
              ? (m['metadata'] as Map)['legacy_mission_id']
              : null,
        )
        .toSet();
    final legacyRows = agentic.missions
        .where(
          (m) => !linked.contains(m.id) && (_archive ? !m.active : m.active),
        )
        .toList();
    final archived =
        _mandates.where((m) => _finished.contains('${m['status']}')).length +
        agentic.missions
            .where((m) => !m.active && !linked.contains(m.id))
            .length;
    return Scaffold(
      backgroundColor: avatarPremiumBg,
      appBar: AppBar(
        backgroundColor: avatarPremiumBg,
        automaticallyImplyLeading: false,
        title: const Text(
          'Missions',
          style: TextStyle(
            fontSize: 23,
            fontWeight: FontWeight.w700,
            letterSpacing: -.7,
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Autres outils de mission',
            onSelected: (v) {
              if (v == 'advanced') _advanced();
              if (v == 'organize') openLiveConvergence(context);
              if (v == 'avatar') context.push('/app/avatar');
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'advanced',
                child: Text('Suivi détaillé'),
              ),
              const PopupMenuItem(
                value: 'organize',
                child: Text('Organiser un besoin'),
              ),
              const PopupMenuItem(value: 'avatar', child: Text('Mon avatar')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(22, 12, 22, 32),
          children: [
            Material(
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: const BorderSide(color: avatarPremiumLine),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: _newNeed,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 10, 10),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Quel est votre besoin ?',
                          style: TextStyle(
                            fontSize: 13,
                            color: avatarPremiumMuted,
                          ),
                        ),
                      ),
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: avatarPremiumBlue,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.north_east,
                          color: Colors.white,
                          size: 17,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 26),
            if (agentic.pendingApprovalCount > 0 && !_archive)
              LiveMinimalMissionTile(
                title:
                    '${agentic.pendingApprovalCount} décision${agentic.pendingApprovalCount > 1 ? 's' : ''} à examiner',
                line: 'Votre accord est attendu.',
                status: 'À valider',
                decision: true,
                onTap: _advanced,
              ),
            Row(
              children: [
                Expanded(
                  child: Text(
                    _archive ? 'Terminées' : 'En cours',
                    style: const TextStyle(
                      fontSize: 12,
                      color: avatarPremiumMuted,
                    ),
                  ),
                ),
                Text(
                  '${current.length + legacyRows.length}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: avatarPremiumMuted,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 13),
            if (_loading && current.isEmpty && legacyRows.isEmpty)
              const Center(child: CircularProgressIndicator()),
            for (final m in current)
              LiveMinimalMissionTile(
                title: '${m['goal'] ?? 'Ma mission'}',
                line: _paused || m['status'] == 'paused'
                    ? 'Bot attend la reprise.'
                    : _decision(m)
                    ? 'Votre accord est attendu.'
                    : ((m['replied_count'] as num?) ?? 0) > 0
                    ? '${m['replied_count']} réponses reçues'
                    : ((m['contacted_count'] as num?) ?? 0) > 0
                    ? '${m['contacted_count']} contacts sollicités'
                    : liveAutomaticMissionMessage(m),
                status: _paused || m['status'] == 'paused'
                    ? 'En pause'
                    : _decision(m)
                    ? 'À valider'
                    : _finished.contains('${m['status']}')
                    ? 'Terminée'
                    : 'En cours',
                decision: _decision(m),
                onTap: () => _open(m),
              ),
            for (final m in legacyRows)
              LiveMinimalMissionTile(
                title: m.title,
                line: m.summary ?? 'Voir le suivi de Bot',
                status: m.active ? 'En cours' : 'Terminée',
                onTap: _advanced,
              ),
            if (!_loading && current.isEmpty && legacyRows.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 30),
                child: Column(
                  children: [
                    const BotCharacter(size: 48, animated: false),
                    const SizedBox(height: 16),
                    Text(
                      _archive
                          ? 'Aucune mission terminée'
                          : signedIn
                          ? 'Votre prochaine mission commence ici'
                          : 'Confiez un besoin à Bot',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Décrivez votre besoin en une phrase.',
                      style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
                    ),
                    if (!signedIn)
                      TextButton(
                        onPressed: () =>
                            context.go('/app/auth?next=/app/missions'),
                        child: const Text('Se connecter'),
                      ),
                  ],
                ),
              ),
            if (signedIn)
              TextButton(
                onPressed: () => setState(() => _archive = !_archive),
                style: TextButton.styleFrom(
                  foregroundColor: avatarPremiumMuted,
                  padding: const EdgeInsets.symmetric(
                    vertical: 16,
                    horizontal: 0,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _archive ? 'En cours' : 'Terminées',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                    if (!_archive)
                      Text('$archived', style: const TextStyle(fontSize: 12)),
                    const SizedBox(width: 8),
                    const Icon(Icons.chevron_right, size: 16),
                  ],
                ),
              ),
            const SizedBox(height: 25),
            Row(
              children: [
                const BotCharacter(size: 24, animated: false),
                const SizedBox(width: 9),
                Text(
                  _paused ? 'Bot est en pause.' : 'Bot s’occupe de la suite.',
                  style: const TextStyle(
                    fontSize: 11,
                    color: avatarPremiumMuted,
                  ),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(
                _error!,
                style: const TextStyle(fontSize: 12, color: Colors.red),
              ),
              TextButton(onPressed: _load, child: const Text('Réessayer')),
            ],
          ],
        ),
      ),
    );
  }
}

String _watchDeadline(dynamic raw) {
  final d = raw is num
      ? DateTime.fromMillisecondsSinceEpoch(raw.toInt(), isUtc: true)
      : DateTime.tryParse('$raw');
  if (d == null) return 'Échéance à préciser';
  final day = d.toUtc().add(const Duration(hours: 1));
  return 'Échéance annoncée · ${day.day}/${day.month}/${day.year}';
}
