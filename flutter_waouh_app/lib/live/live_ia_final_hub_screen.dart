import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class LiveIaFinalHubScreen extends StatelessWidget {
  const LiveIaFinalHubScreen({super.key});

  static const modules = <_IaEntry>[
    _IaEntry(
      title: 'AprèsBac IA',
      subtitle: 'Orientation, séries, filières et établissements',
      route: '/app/apresbac',
      icon: Icons.school_rounded,
    ),
    _IaEntry(
      title: 'FA IA',
      subtitle: 'Consultation, lancer, interprétation et journal',
      route: '/app/fa-ia',
      icon: Icons.auto_awesome_rounded,
    ),
    _IaEntry(
      title: 'Conversationnel',
      subtitle: 'Assistant et WhatsApp IA',
      route: '/app/whatsapp/conversationnel',
      icon: Icons.forum_rounded,
    ),
    _IaEntry(
      title: 'BI WAOUH IA',
      subtitle: 'Analyse décisionnelle et indicateurs',
      route: '/app/whatsapp/bi',
      icon: Icons.insights_rounded,
    ),
    _IaEntry(
      title: 'Stock WAOUH IA',
      subtitle: 'Import, analyse et recommandations',
      route: '/app/stock',
      icon: Icons.inventory_2_rounded,
    ),
    _IaEntry(
      title: 'Présence QR',
      subtitle: 'Sites, équipes, QR et pointage',
      route: '/app/presence',
      icon: Icons.qr_code_scanner_rounded,
    ),
    _IaEntry(
      title: 'Agents IA',
      subtitle: 'Créer et piloter les agents spécialisés',
      route: '/app/whatsapp/select-agent',
      icon: Icons.smart_toy_rounded,
    ),
    _IaEntry(
      title: 'Radar',
      subtitle: 'Recherche géolocalisée intelligente',
      route: '/app/radar-map',
      icon: Icons.radar_rounded,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final columns = width >= 760 ? 3 : 2;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        Icons.auto_awesome_rounded,
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'IA WAOUH',
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Choisissez votre module intelligent',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              sliver: SliverGrid(
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: width < 390 ? 0.92 : 1.04,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _IaCard(entry: modules[index]),
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

class _IaCard extends StatelessWidget {
  const _IaCard({required this.entry});

  final _IaEntry entry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: theme.colorScheme.surfaceContainerLow,
      borderRadius: BorderRadius.circular(22),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(entry.route),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  entry.icon,
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
              const Spacer(),
              Text(
                entry.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                entry.subtitle,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.25,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IaEntry {
  const _IaEntry({
    required this.title,
    required this.subtitle,
    required this.route,
    required this.icon,
  });

  final String title;
  final String subtitle;
  final String route;
  final IconData icon;
}
