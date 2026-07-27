import 'dart:async';

import 'package:flutter/material.dart';

import 'smart_studio_wizard.dart';
import 'studio_compat_service.dart';

class LiveWhatsAppIaNativeScreen extends StatefulWidget {
  const LiveWhatsAppIaNativeScreen({super.key});

  @override
  State<LiveWhatsAppIaNativeScreen> createState() =>
      _LiveWhatsAppIaNativeScreenState();
}

class _LiveWhatsAppIaNativeScreenState
    extends State<LiveWhatsAppIaNativeScreen> {
  static const _background = Color(0xFFF4FAF8);
  static const _primary = Color(0xFF0B7F72);
  static const _primaryDark = Color(0xFF075F57);
  static const _mint = Color(0xFFDFF5F0);
  static const _line = Color(0xFFDCEBE7);
  static const _ink = Color(0xFF17211F);
  static const _muted = Color(0xFF667874);

  final WhatsAppIaStudioV20Service _service = WhatsAppIaStudioV20Service();

  List<StudioSession> _sessions = <StudioSession>[];
  List<StudioAgent> _agents = <StudioAgent>[];

  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  int _selectedTab = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(
      const Duration(seconds: 20),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!mounted) return;

    setState(() {
      if (silent) {
        _refreshing = true;
      } else {
        _loading = true;
      }
      _error = null;
    });

    try {
      final values = await Future.wait<dynamic>([
        _service.loadSessions(),
        _service.loadAgents(),
      ]);

      if (!mounted) return;

      setState(() {
        _sessions = values[0] as List<StudioSession>;
        _agents = values[1] as List<StudioAgent>;
        _loading = false;
        _refreshing = false;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _loading = false;
        _refreshing = false;
        _error = '$error'
            .replaceFirst('Bad state: ', '')
            .replaceFirst('StateError: ', '')
            .replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _openLineWizard() async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const SmartStudioWizardSheet(
        agentOnly: false,
      ),
    );

    if (changed == true) {
      await _load();
    }
  }

  Future<void> _openAgentWizard() async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const SmartStudioWizardSheet(
        agentOnly: true,
      ),
    );

    if (changed == true) {
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final connected = _sessions.where((item) => item.isConnected).length;
    final active = _agents.where((item) => item.isActive).length;

    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          color: _primary,
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
            children: [
              _header(),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _metric(
                      Icons.qr_code_2_rounded,
                      '${_sessions.length}',
                      'Lignes',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _metric(
                      Icons.link_rounded,
                      '$connected',
                      'Connectées',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _metric(
                      Icons.smart_toy_rounded,
                      '$active',
                      'Agents actifs',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _openLineWizard,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(54),
                        backgroundColor: _primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(17),
                        ),
                      ),
                      icon: const Icon(Icons.add_link_rounded),
                      label: const Text(
                        'Nouvelle ligne',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 9),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _openAgentWizard,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(54),
                        backgroundColor: _mint,
                        foregroundColor: _primaryDark,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(17),
                        ),
                      ),
                      icon: const Icon(
                        Icons.smart_toy_outlined,
                      ),
                      label: const Text(
                        'Nouvel agent',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _nextStep(
                connected: connected,
              ),
              const SizedBox(height: 16),
              _tabs(),
              const SizedBox(height: 12),
              if (_loading)
                const SizedBox(
                  height: 190,
                  child: Center(
                    child: CircularProgressIndicator(
                      color: _primary,
                    ),
                  ),
                )
              else if (_error != null)
                _errorPanel()
              else if (_selectedTab == 0)
                _sessionsPanel()
              else
                _agentsPanel(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 15, 8, 15),
      decoration: BoxDecoration(
        color: _primary,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x20075F57),
            blurRadius: 22,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: const Color(0xFFBDF1E6),
              borderRadius: BorderRadius.circular(15),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              color: _primaryDark,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'WhatsApp IA Studio',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 21,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.4,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'Créez, connectez et testez vos agents',
                  style: TextStyle(
                    color: Color(0xFFD6F5EE),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 8,
              vertical: 6,
            ),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.13),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'Gemini Flash',
              style: TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          IconButton(
            onPressed: _refreshing ? null : () => _load(silent: true),
            color: Colors.white,
            icon: _refreshing
                ? const SizedBox.square(
                    dimension: 19,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
    );
  }

  Widget _metric(
    IconData icon,
    String value,
    String label,
  ) {
    return Container(
      height: 78,
      padding: const EdgeInsets.symmetric(
        horizontal: 8,
        vertical: 10,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(19),
        border: Border.all(color: _line),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 19,
            color: _primary,
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: const TextStyle(
              color: _ink,
              fontSize: 20,
              height: 1,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: _muted,
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _nextStep({
    required int connected,
  }) {
    late final String title;
    late final String message;
    late final String button;
    late final VoidCallback action;

    if (_sessions.isEmpty) {
      title = 'Créez votre première ligne';
      message = 'Connexion WhatsApp par QR ou code WAHA.';
      button = 'Créer';
      action = _openLineWizard;
    } else if (connected == 0) {
      title = 'Connectez votre ligne WhatsApp';
      message = 'Ouvrez le parcours et choisissez QR ou code.';
      button = 'Connecter';
      action = _openLineWizard;
    } else if (_agents.isEmpty) {
      title = 'Créez votre premier agent';
      message = 'Secteur, données, test Gemini et activation.';
      button = 'Créer';
      action = _openAgentWizard;
    } else {
      title = 'Votre studio est prêt';
      message = 'Créez un autre agent ou une nouvelle ligne.';
      button = 'Nouvel agent';
      action = _openAgentWizard;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(21),
        border: Border.all(color: _line),
      ),
      child: Row(
        children: [
          Container(
            width: 43,
            height: 43,
            decoration: BoxDecoration(
              color: _mint,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.route_rounded,
              color: _primary,
            ),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: _ink,
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  message,
                  style: const TextStyle(
                    color: _muted,
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: action,
            child: Text(button),
          ),
        ],
      ),
    );
  }

  Widget _tabs() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F2EF),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: _tabButton(
              label: 'Lignes WhatsApp',
              icon: Icons.qr_code_2_rounded,
              index: 0,
            ),
          ),
          Expanded(
            child: _tabButton(
              label: 'Agents IA',
              icon: Icons.smart_toy_rounded,
              index: 1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabButton({
    required String label,
    required IconData icon,
    required int index,
  }) {
    final selected = _selectedTab == index;

    return Material(
      color: selected ? Colors.white : Colors.transparent,
      borderRadius: BorderRadius.circular(13),
      child: InkWell(
        onTap: () {
          setState(() => _selectedTab = index);
        },
        borderRadius: BorderRadius.circular(13),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 11),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 18,
                color: selected ? _primary : _muted,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: selected ? _ink : _muted,
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sessionsPanel() {
    if (_sessions.isEmpty) {
      return _emptyPanel(
        icon: Icons.qr_code_2_rounded,
        title: 'Aucune ligne WhatsApp',
        message: 'Créez une ligne puis connectez-la par QR ou code.',
        button: 'Créer une ligne',
        action: _openLineWizard,
      );
    }

    return Column(
      children: [
        for (final session in _sessions) ...[
          _itemCard(
            icon: session.isConnected
                ? Icons.check_circle_rounded
                : Icons.qr_code_2_rounded,
            title: session.sessionName,
            subtitle: session.isConnected
                ? 'WhatsApp connecté'
                : 'Connexion à terminer',
            status: session.isConnected ? 'Connectée' : 'À connecter',
            active: session.isConnected,
            onTap: _openLineWizard,
          ),
          const SizedBox(height: 9),
        ],
      ],
    );
  }

  Widget _agentsPanel() {
    if (_agents.isEmpty) {
      return _emptyPanel(
        icon: Icons.smart_toy_outlined,
        title: 'Aucun agent IA',
        message: 'Créez un agent depuis un site, des documents, '
            'un catalogue ou des connaissances.',
        button: 'Créer un agent',
        action: _openAgentWizard,
      );
    }

    return Column(
      children: [
        for (final agent in _agents) ...[
          _itemCard(
            icon: Icons.smart_toy_rounded,
            title: agent.name,
            subtitle:
                '${agent.personaName} · ${agent.sessionName ?? 'non connecté'}',
            status: agent.isActive ? 'Actif' : agent.status,
            active: agent.isActive,
            onTap: _openAgentWizard,
          ),
          const SizedBox(height: 9),
        ],
      ],
    );
  }

  Widget _itemCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required String status,
    required bool active,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(19),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(19),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(19),
            border: Border.all(color: _line),
          ),
          child: Row(
            children: [
              Container(
                width: 43,
                height: 43,
                decoration: BoxDecoration(
                  color: active ? _mint : const Color(0xFFF0F3F2),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  icon,
                  color: active ? _primary : _muted,
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _ink,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _muted,
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: active ? _mint : const Color(0xFFF1F4F3),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: active ? _primaryDark : _muted,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 2),
              const Icon(
                Icons.chevron_right_rounded,
                color: Color(0xFF8A9A96),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _emptyPanel({
    required IconData icon,
    required String title,
    required String message,
    required String button,
    required VoidCallback action,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(22, 28, 22, 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _line),
      ),
      child: Column(
        children: [
          Container(
            width: 61,
            height: 61,
            decoration: const BoxDecoration(
              color: _mint,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 29,
              color: _primary,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: _ink,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: _muted,
              fontSize: 12.5,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 15),
          FilledButton(
            onPressed: action,
            style: FilledButton.styleFrom(
              backgroundColor: _primary,
            ),
            child: Text(button),
          ),
        ],
      ),
    );
  }

  Widget _errorPanel() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF5F3),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: Color(0xFFB5473C),
          ),
          const SizedBox(height: 8),
          Text(
            _error!,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: _load,
            child: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }
}
