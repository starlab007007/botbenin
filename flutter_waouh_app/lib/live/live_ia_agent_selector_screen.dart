import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_ia_premium_ui.dart';
import 'live_whatsapp_ia_agent_module.dart';

enum LiveIaAgentSelectionPurpose {
  insights,
  catalogue;

  static LiveIaAgentSelectionPurpose fromRouteParameter(String? value) {
    return value == 'catalogue'
        ? LiveIaAgentSelectionPurpose.catalogue
        : LiveIaAgentSelectionPurpose.insights;
  }

  String get title => this == LiveIaAgentSelectionPurpose.insights
      ? 'BI / Analyse'
      : 'Catalogue Agent';

  String get subtitle => this == LiveIaAgentSelectionPurpose.insights
      ? 'Choisissez l’Agent à analyser.'
      : 'Choisissez l’Agent à alimenter.';

  String get routeSuffix =>
      this == LiveIaAgentSelectionPurpose.insights ? 'insights' : 'catalogue';

  IconData get icon => this == LiveIaAgentSelectionPurpose.insights
      ? Icons.analytics_outlined
      : Icons.menu_book_outlined;

  Color get accent => this == LiveIaAgentSelectionPurpose.insights
      ? WaouhIaPalette.info
      : WaouhIaPalette.teal;
}

class LiveIaAgentSelectorScreen extends StatefulWidget {
  const LiveIaAgentSelectorScreen({
    super.key,
    required this.client,
    required this.purpose,
  });

  final SupabaseClient client;
  final LiveIaAgentSelectionPurpose purpose;

  @override
  State<LiveIaAgentSelectorScreen> createState() =>
      _LiveIaAgentSelectorScreenState();
}

class _LiveIaAgentSelectorScreenState extends State<LiveIaAgentSelectorScreen> {
  late final LiveWhatsAppAiAgentRepository _repository =
      LiveWhatsAppAiAgentRepository(widget.client);

  List<LiveWhatsAppAiAgent> _agents = const [];
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final agents = await _repository.listAgents();
      if (!mounted) {
        return;
      }
      setState(() {
        _agents = agents;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  void _open(LiveWhatsAppAiAgent agent) {
    final agentId = Uri.encodeComponent(agent.id);
    final name = Uri.encodeQueryComponent(agent.name);
    context.push(
      '/app/whatsapp/agent/$agentId/${widget.purpose.routeSuffix}?name=$name',
    );
  }

  @override
  Widget build(BuildContext context) {
    final purpose = widget.purpose;

    return WaouhIaThemeScope(
      child: Scaffold(
        appBar: AppBar(
          title: Text(purpose.title),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: IconButton.filledTonal(
                tooltip: 'Actualiser',
                onPressed: _loading ? null : _load,
                style: IconButton.styleFrom(
                  foregroundColor: purpose.accent,
                  backgroundColor: purpose.accent.withValues(alpha: 0.10),
                ),
                icon: const Icon(Icons.refresh_rounded),
              ),
            ),
          ],
        ),
        body: _loading
            ? const _SelectorSkeleton()
            : _error != null
            ? _SelectorFailure(error: _error!, onRetry: _load)
            : _agents.isEmpty
            ? _SelectorEmpty(
                purpose: purpose,
                onOpenStudio: () => context.go('/app/whatsapp/conversationnel'),
              )
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                  itemCount: _agents.length + 1,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, index) {
                    if (index == 0) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          WaouhIaSurface(
                            padding: const EdgeInsets.all(18),
                            color: purpose.accent.withValues(alpha: 0.07),
                            borderColor: purpose.accent.withValues(alpha: 0.19),
                            child: Row(
                              children: [
                                Container(
                                  width: 46,
                                  height: 46,
                                  decoration: BoxDecoration(
                                    color: purpose.accent.withValues(
                                      alpha: 0.12,
                                    ),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Icon(
                                    purpose.icon,
                                    color: purpose.accent,
                                  ),
                                ),
                                const SizedBox(width: 13),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        purpose.title,
                                        style: const TextStyle(
                                          color: WaouhIaPalette.ink,
                                          fontSize: 18,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        purpose.subtitle,
                                        style: const TextStyle(
                                          color: WaouhIaPalette.muted,
                                          fontSize: 13.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                          const WaouhIaSectionHeader(
                            title: 'Choisir un Agent',
                            subtitle:
                                'Vos Agents disponibles dans WhatsApp IA Studio.',
                          ),
                          const SizedBox(height: 12),
                        ],
                      );
                    }

                    final agent = _agents[index - 1];
                    return _AgentSelectionCard(
                      agent: agent,
                      accent: purpose.accent,
                      onTap: () => _open(agent),
                    );
                  },
                ),
              ),
      ),
    );
  }
}

class _AgentSelectionCard extends StatelessWidget {
  const _AgentSelectionCard({
    required this.agent,
    required this.accent,
    required this.onTap,
  });

  final LiveWhatsAppAiAgent agent;
  final Color accent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final active = agent.isActive;
    final stateColor = active ? WaouhIaPalette.success : WaouhIaPalette.muted;

    return WaouhIaSurface(
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      borderColor: active
          ? WaouhIaPalette.success.withValues(alpha: 0.24)
          : WaouhIaPalette.line,
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(17),
            ),
            child: Icon(
              active ? Icons.smart_toy_rounded : Icons.smart_toy_outlined,
              color: accent,
            ),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        agent.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: WaouhIaPalette.ink,
                          fontSize: 16.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    WaouhIaStatusPill(
                      label: active ? 'Actif' : agent.status,
                      color: stateColor,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  agent.personaName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: WaouhIaPalette.muted,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  active
                      ? 'Ouvrir ${agent.name}'
                      : 'Agent à finaliser avant activation',
                  style: TextStyle(
                    color: accent,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Icon(Icons.arrow_forward_rounded, color: accent),
        ],
      ),
    );
  }
}

class _SelectorEmpty extends StatelessWidget {
  const _SelectorEmpty({required this.purpose, required this.onOpenStudio});

  final LiveIaAgentSelectionPurpose purpose;
  final VoidCallback onOpenStudio;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: WaouhIaEmptyState(
          icon: purpose.icon,
          title: 'Aucun Agent IA',
          message:
              'Créez puis testez un Agent dans WhatsApp IA Studio avant de continuer.',
          action: FilledButton.icon(
            onPressed: onOpenStudio,
            icon: const Icon(Icons.forum_outlined),
            label: const Text('Ouvrir le Studio'),
          ),
        ),
      ),
    );
  }
}

class _SelectorFailure extends StatelessWidget {
  const _SelectorFailure({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: WaouhIaFeedbackCard(
          title: 'Chargement impossible',
          message: 'Impossible de récupérer vos Agents pour le moment.',
          color: WaouhIaPalette.danger,
          icon: Icons.cloud_off_rounded,
          actionLabel: 'Réessayer',
          onAction: onRetry,
          technicalDetails: '$error',
        ),
      ),
    );
  }
}

class _SelectorSkeleton extends StatelessWidget {
  const _SelectorSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: const [
        _SkeletonBlock(height: 98),
        SizedBox(height: 26),
        _SkeletonBlock(height: 22, width: 160),
        SizedBox(height: 14),
        _SkeletonBlock(height: 98),
        SizedBox(height: 12),
        _SkeletonBlock(height: 98),
      ],
    );
  }
}

class _SkeletonBlock extends StatelessWidget {
  const _SkeletonBlock({required this.height, this.width});

  final double height;
  final double? width;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        height: height,
        width: width,
        decoration: BoxDecoration(
          color: const Color(0xFFEAF0ED),
          borderRadius: BorderRadius.circular(18),
        ),
      ),
    );
  }
}
