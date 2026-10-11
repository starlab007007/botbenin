import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../main.dart' as legacy;
import 'avatar/bot_character.dart' show botAvatarAsset;
import 'live_agent_type_picker.dart';
import 'live_theme.dart';

/// Onglet IA — parité Web `WaouhAiHubPage` : en-tête Bot, créer un agent,
/// types d'agents, outils IA. Peu de texte, accès en un geste.
class LiveIaFinalHubScreen extends StatefulWidget {
  const LiveIaFinalHubScreen({super.key, this.bots = false});

  /// `/app/bots` : même écran que l'onglet IA, titre « Mes agents » (parité Web).
  final bool bots;

  @override
  State<LiveIaFinalHubScreen> createState() => _LiveIaFinalHubScreenState();
}

class _AgentRow {
  const _AgentRow(this.id, this.name, this.status);
  final String id, name, status;
}

class _LiveIaFinalHubScreenState extends State<LiveIaFinalHubScreen> {
  List<_AgentRow> _agents = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (legacy.supabase.auth.currentUser == null) return;
    try {
      final rows = await legacy.supabase
          .from('waouh_ai_agents')
          .select('id,name,status')
          .order('created_at', ascending: false);
      if (!mounted) return;
      setState(() => _agents = [
            for (final r in (rows as List))
              _AgentRow('${r['id']}', '${r['name'] ?? 'Agent'}',
                  '${r['status'] ?? 'draft'}'),
          ]);
    } catch (_) {
      // La liste reste vide : la création fonctionne quand même.
    }
  }

  static const _templates = <(String, String, String)>[
    ('🛍️', 'Boutique / Commerce', 'Ami·e du magasin'),
    ('🍽️', 'Restaurant / Food', 'Serveur virtuel'),
    ('🩺', 'Santé / Bien-être', 'Assistant santé'),
    ('💼', 'Services / Freelance', 'Assistant pro'),
    ('🎓', 'Éducation / Formation', 'Assistant scolaire'),
    ('✨', 'Autre secteur', 'Assistant'),
  ];

  static const _statusLabel = <String, (String, Color)>{
    'active': ('Actif', Color(0xFF10B981)),
    'paused': ('En pause', Color(0xFFF59E0B)),
    'testing': ('Test', Color(0xFF3B82F6)),
    'training': ('Formation', Color(0xFF8B5CF6)),
    'draft': ('Brouillon', Color(0xFF94A3B8)),
  };

  static const _types = <_AgentType>[
    _AgentType('Conversationnel', 'Répond, vend, prend RDV',
        Icons.forum_rounded, [Color(0xFF10B981), Color(0xFF0D9488)],
        '/app/agents/new'),
    _AgentType('BI & analyse', 'Sheets, Excel, KPI', Icons.bar_chart_rounded,
        [Color(0xFF3B82F6), Color(0xFF4F46E5)], '/app/whatsapp/bi'),
    _AgentType('Stock', 'Alertes et réappro', Icons.inventory_2_rounded,
        [Color(0xFFF59E0B), Color(0xFFEA580C)], '/app/stock'),
    _AgentType('Présence QR', 'Pointage géolocalisé', Icons.place_rounded,
        [Color(0xFFD946EF), Color(0xFFEC4899)], '/app/presence'),
  ];

  static const _tools = <_Tool>[
    _Tool('AprèsBac IA', Icons.school_rounded, Color(0xFF2563EB),
        Color(0xFFEFF6FF), '/app/apresbac'),
    _Tool('FA IA', Icons.auto_awesome_rounded, Color(0xFF7C3AED),
        Color(0xFFF5F3FF), '/app/fa-ia'),
    _Tool('BI WAOUH', Icons.bar_chart_rounded, Color(0xFF0369A1),
        Color(0xFFF0F9FF), '/app/whatsapp/bi'),
    _Tool('Stock WAOUH', Icons.inventory_2_rounded, Color(0xFFB45309),
        Color(0xFFFFFBEB), '/app/stock'),
    _Tool('Présence QR', Icons.qr_code_2_rounded, Color(0xFF047857),
        Color(0xFFECFDF5), '/app/presence'),
    _Tool('Radar', Icons.radar_rounded, Color(0xFF0E7490), Color(0xFFECFEFF),
        '/app/radar-map'),
  ];

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final typeCols = width >= 720 ? 4 : 2;
    final toolCols = width >= 720 ? 6 : 3;
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: WaouhGradients.air),
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 110),
            children: [
              _Header(
                count: _agents.length,
                onCreate: () => context.push('/app/agents/new'),
                title: widget.bots ? 'Mes agents' : 'Agents IA',
              ),
              const SizedBox(height: 18),
              if (_agents.isNotEmpty) ...[
                const _SectionTitle('Mes agents'),
                SizedBox(
                  height: 104,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _agents.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                    itemBuilder: (_, i) {
                      final a = _agents[i];
                      final st = _statusLabel[a.status] ?? _statusLabel['draft']!;
                      return SizedBox(
                        width: 160,
                        child: Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(18),
                            onTap: () => context
                                .push('/app/whatsapp/agent/${a.id}/insights'),
                            child: Ink(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                    color: const Color(0xFFD9E6FF)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.smart_toy_rounded,
                                      color: WaouhPalette.blue, size: 22),
                                  const Spacer(),
                                  Text(a.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 13.5)),
                                  const SizedBox(height: 3),
                                  Row(children: [
                                    Icon(Icons.circle, size: 7, color: st.$2),
                                    const SizedBox(width: 5),
                                    Text(st.$1,
                                        style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: WaouhPalette.muted)),
                                  ]),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 18),
              ],
              const _SectionTitle('Choisir un type'),
              GridView.count(
                crossAxisCount: typeCols,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.25,
                children: [
                  for (final t in _types) _TypeCard(type: t),
                ],
              ),
              const SizedBox(height: 18),
              const _SectionTitle('Modèles prêts à l’emploi'),
              GridView.count(
                crossAxisCount: width >= 720 ? 6 : 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.35,
                children: [
                  for (final t in _templates)
                    Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: () => openLiveAgentWizard(context),
                        child: Ink(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(18),
                            border:
                                Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(t.$1, style: const TextStyle(fontSize: 24)),
                              const Spacer(),
                              Text(t.$2,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 12.5,
                                      height: 1.15)),
                              const SizedBox(height: 2),
                              Text(t.$3,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 10.5,
                                      color: WaouhPalette.muted)),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 18),
              const _SectionTitle('Outils IA'),
              GridView.count(
                crossAxisCount: toolCols,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: .92,
                children: [
                  for (final t in _tools) _ToolTile(tool: t),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.onCreate,
    required this.count,
    required this.title,
  });
  final String title;
  final VoidCallback onCreate;
  final int count;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: WaouhGradients.airHero,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: const Color(0xFFDCE7F8)),
          boxShadow: WaouhShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 62,
                  height: 62,
                  padding: const EdgeInsets.all(2.5),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(colors: [
                      Color(0xFF55DDF2),
                      Color(0xFF4F7FFF),
                      Color(0xFF8B7CFF),
                    ]),
                  ),
                  child: ClipOval(
                    child: Image.asset(botAvatarAsset, fit: BoxFit.cover),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: const TextStyle(
                              fontSize: 24, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(.92),
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(4),
                            topRight: Radius.circular(16),
                            bottomLeft: Radius.circular(16),
                            bottomRight: Radius.circular(16),
                          ),
                          border: Border.all(color: const Color(0xFFD9E6FF)),
                        ),
                        child: Text(
                            count > 0
                                ? '$count agent${count > 1 ? 's' : ''} à votre service.'
                                : 'Créons votre premier agent.',
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E3A8A))),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            SizedBox(
              height: 50,
              child: FilledButton.icon(
                onPressed: onCreate,
                icon: const Icon(Icons.add_rounded),
                label: const Text('Créer un agent',
                    style:
                        TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                style: FilledButton.styleFrom(
                  backgroundColor: WaouhPalette.blue,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18)),
                ),
              ),
            ),
          ],
        ),
      );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
      );
}

class _AgentType {
  const _AgentType(this.label, this.hint, this.icon, this.colors, this.route);
  final String label, hint, route;
  final IconData icon;
  final List<Color> colors;
}

class _TypeCard extends StatelessWidget {
  const _TypeCard({required this.type});
  final _AgentType type;
  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(22),
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: () => type.route == '/app/agents/new'
              ? openLiveAgentWizard(context)
              : context.push(type.route),
          child: Ink(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: type.colors),
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                    color: type.colors.last.withOpacity(.28),
                    blurRadius: 14,
                    offset: const Offset(0, 6)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(type.icon, color: Colors.white, size: 26),
                const Spacer(),
                Text(type.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 14)),
                const SizedBox(height: 2),
                Text(type.hint,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: Colors.white.withOpacity(.92),
                        fontWeight: FontWeight.w600,
                        fontSize: 11)),
              ],
            ),
          ),
        ),
      );
}

class _Tool {
  const _Tool(this.title, this.icon, this.color, this.bg, this.route);
  final String title, route;
  final IconData icon;
  final Color color, bg;
}

class _ToolTile extends StatelessWidget {
  const _ToolTile({required this.tool});
  final _Tool tool;
  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => context.push(tool.route),
          child: Ink(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                      color: tool.bg, borderRadius: BorderRadius.circular(16)),
                  child: Icon(tool.icon, color: tool.color, size: 22),
                ),
                const SizedBox(height: 8),
                Text(tool.title,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1E293B))),
              ],
            ),
          ),
        ),
      );
}
