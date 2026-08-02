import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class LiveBotsModulesHubScreen extends StatelessWidget {
  const LiveBotsModulesHubScreen({super.key});

  static const modules = <_SmartModule>[
    _SmartModule(
      title: 'AprèsBac IA',
      subtitle: 'Orientation intelligente, séries, filières et établissements.',
      route: '/app/apresbac',
      icon: Icons.school_rounded,
      accent: Color(0xFF2563EB),
      tags: ['Orientation', 'Filières'],
    ),
    _SmartModule(
      title: 'FA IA',
      subtitle: 'Consultation, lancer, interprétation et journal personnel.',
      route: '/app/fa-ia',
      icon: Icons.auto_awesome_rounded,
      accent: Color(0xFF7C3AED),
      tags: ['Consultation', 'Journal'],
    ),
    _SmartModule(
      title: 'Conversationnel',
      subtitle: 'Assistant intelligent et conversations WhatsApp enrichies.',
      route: '/app/whatsapp/conversationnel',
      icon: Icons.forum_rounded,
      accent: Color(0xFF0F766E),
      tags: ['Assistant', 'WhatsApp'],
    ),
    _SmartModule(
      title: 'BI WAOUH IA',
      subtitle: 'Analyse décisionnelle, indicateurs et lecture intelligente.',
      route: '/app/whatsapp/bi',
      icon: Icons.insights_rounded,
      accent: Color(0xFF0369A1),
      tags: ['Indicateurs', 'Décision'],
    ),
    _SmartModule(
      title: 'Stock WAOUH IA',
      subtitle:
          'Import, analyse des stocks et recommandations opérationnelles.',
      route: '/app/stock',
      icon: Icons.inventory_2_rounded,
      accent: Color(0xFFB45309),
      tags: ['Stock', 'Alertes'],
    ),
    _SmartModule(
      title: 'Présence QR',
      subtitle: 'Sites, équipes, QR et suivi fiable des pointages.',
      route: '/app/presence',
      icon: Icons.qr_code_scanner_rounded,
      accent: Color(0xFF047857),
      tags: ['QR', 'Équipes'],
    ),
    _SmartModule(
      title: 'Agents IA',
      subtitle: 'Créer, sélectionner et piloter des agents spécialisés.',
      route: '/app/whatsapp/select-agent',
      icon: Icons.smart_toy_rounded,
      accent: Color(0xFFBE123C),
      tags: ['Agents', 'Automatisation'],
    ),
    _SmartModule(
      title: 'Radar',
      subtitle: 'Recherche géolocalisée intelligente et signaux de proximité.',
      route: '/app/radar-map',
      icon: Icons.radar_rounded,
      accent: Color(0xFF0891B2),
      tags: ['Proximité', 'Temps réel'],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final columns = width >= 920
        ? 3
        : width >= 560
            ? 2
            : 1;
    final ratio = columns == 1 ? 2.15 : 1.05;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
              sliver: SliverToBoxAdapter(
                child: Container(
                  padding: const EdgeInsets.all(17),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF043F38), Color(0xFF08756A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: .14),
                          borderRadius: BorderRadius.circular(17),
                        ),
                        child: const Icon(
                          Icons.auto_awesome_rounded,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Bots WAOUH',
                              style: theme.textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 3),
                            const Text(
                              'Des modules intelligents adaptés à chaque besoin.',
                              style: TextStyle(
                                color: Color(0xFFD1F5E6),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
              sliver: SliverGrid(
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: ratio,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _SmartModuleCard(module: modules[index]),
                  childCount: modules.length,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SmartModuleCard extends StatelessWidget {
  const _SmartModuleCard({required this.module});
  final _SmartModule module;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(module.route),
        child: Ink(
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFDCE9E4)),
            borderRadius: BorderRadius.circular(22),
          ),
          child: Padding(
            padding: const EdgeInsets.all(15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: module.accent.withValues(alpha: .11),
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: Icon(module.icon, color: module.accent),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE9F8F1),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: const Text(
                        'SMART',
                        style: TextStyle(
                          color: Color(0xFF08756A),
                          fontSize: 9.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: .45,
                        ),
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Text(
                  module.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  module.subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    ...module.tags.map(
                      (tag) => Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF2F7F5),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            tag,
                            style: const TextStyle(
                              color: Color(0xFF52655E),
                              fontSize: 9.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const Spacer(),
                    Icon(
                      Icons.arrow_forward_rounded,
                      size: 19,
                      color: module.accent,
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
}

class _SmartModule {
  const _SmartModule({
    required this.title,
    required this.subtitle,
    required this.route,
    required this.icon,
    required this.accent,
    required this.tags,
  });

  final String title;
  final String subtitle;
  final String route;
  final IconData icon;
  final Color accent;
  final List<String> tags;
}
