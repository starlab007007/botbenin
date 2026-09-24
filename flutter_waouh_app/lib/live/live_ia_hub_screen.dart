import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'live_ia_premium_ui.dart';

/// Visual home for the IA module. Routes and actions intentionally stay the
/// same; this screen only improves hierarchy and presentation.
class LiveIaHubScreen extends StatelessWidget {
  const LiveIaHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return WaouhIaThemeScope(
      child: Scaffold(
        appBar: AppBar(
          toolbarHeight: 76,
          title: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Hub Agents IA'),
              SizedBox(height: 3),
              Text(
                'WhatsApp, agents et opérations',
                style: TextStyle(
                  color: WaouhIaPalette.muted,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 10),
              child: IconButton.filledTonal(
                tooltip: 'Ouvrir WhatsApp IA Studio',
                onPressed: () => context.push('/app/whatsapp/conversationnel'),
                style: IconButton.styleFrom(
                  foregroundColor: WaouhIaPalette.primary,
                  backgroundColor: WaouhIaPalette.primarySoft,
                ),
                icon: const Icon(Icons.forum_outlined),
              ),
            ),
          ],
        ),
        body: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: _Hero(
                  onOpenStudio: () =>
                      context.push('/app/whatsapp/conversationnel'),
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 28)),
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: WaouhIaSectionHeader(
                  title: 'Modules',
                  subtitle: 'Choisissez une action',
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 14)),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
              sliver: SliverList.list(
                children: [
                  WaouhIaModuleCard(
                    icon: Icons.forum_outlined,
                    accent: WaouhIaPalette.primary,
                    title: 'WhatsApp IA Studio',
                    subtitle: 'Lignes · QR · tests',
                    actionLabel: 'Ouvrir le Studio',
                    onTap: () => context.push('/app/whatsapp/conversationnel'),
                  ),
                  const SizedBox(height: 14),
                  WaouhIaModuleCard(
                    icon: Icons.smart_toy_outlined,
                    accent: WaouhIaPalette.purple,
                    title: 'Agents IA',
                    subtitle: 'Créer · tester · activer',
                    actionLabel: 'Gérer les Agents',
                    onTap: () => context.push('/app/whatsapp/conversationnel'),
                  ),
                  const SizedBox(height: 14),
                  WaouhIaModuleCard(
                    icon: Icons.analytics_outlined,
                    accent: WaouhIaPalette.info,
                    title: 'BI / Analyse',
                    subtitle: 'Tendances · décisions',
                    actionLabel: 'Choisir un Agent',
                    onTap: () => context.push(
                      '/app/whatsapp/select-agent?purpose=insights',
                    ),
                  ),
                  const SizedBox(height: 14),
                  WaouhIaModuleCard(
                    icon: Icons.inventory_2_outlined,
                    accent: WaouhIaPalette.amber,
                    title: 'Gestion Stock',
                    subtitle: 'Seuils · mouvements',
                    actionLabel: 'Piloter le stock',
                    onTap: () => context.push('/app/stock'),
                  ),
                  const SizedBox(height: 14),
                  WaouhIaModuleCard(
                    icon: Icons.menu_book_outlined,
                    accent: WaouhIaPalette.teal,
                    title: 'Catalogue Agent',
                    subtitle: 'Produits · import IA',
                    actionLabel: 'Choisir un Agent',
                    onTap: () => context.push(
                      '/app/whatsapp/select-agent?purpose=catalogue',
                    ),
                  ),
                  const SizedBox(height: 14),
                  WaouhIaModuleCard(
                    icon: Icons.qr_code_2_rounded,
                    accent: WaouhIaPalette.danger,
                    title: 'Présence QR',
                    subtitle: 'Sites · QR · GPS',
                    actionLabel: 'Accéder',
                    onTap: () => context.push('/app/presence'),
                  ),
                  const SizedBox(height: 22),
                  const _PrivacyBanner(),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.onOpenStudio});

  final VoidCallback onOpenStudio;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [WaouhIaPalette.primaryDeep, WaouhIaPalette.primary],
        ),
        borderRadius: BorderRadius.circular(WaouhIaSpacing.radiusLarge),
        boxShadow: const [
          BoxShadow(
            color: Color(0x22045D52),
            blurRadius: 26,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              color: Color(0xFFC8FFE7),
              size: 27,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Pilotez votre activité\navec l’IA',
            style: TextStyle(
              color: Colors.white,
              fontSize: 29,
              height: 1.1,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Connectez WhatsApp, activez vos Agents et pilotez vos opérations.',
            style: TextStyle(
              color: Color(0xFFD8F8EA),
              height: 1.35,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: onOpenStudio,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: BorderSide(color: Colors.white.withValues(alpha: 0.34)),
              backgroundColor: Colors.white.withValues(alpha: 0.08),
            ),
            icon: const Icon(Icons.forum_outlined, size: 19),
            label: const Text('Ouvrir WhatsApp IA Studio'),
          ),
        ],
      ),
    );
  }
}

class _PrivacyBanner extends StatelessWidget {
  const _PrivacyBanner();

  @override
  Widget build(BuildContext context) {
    return const WaouhIaSurface(
      color: Color(0xFFF1FAF6),
      borderColor: Color(0xFFD5EEE3),
      padding: EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.shield_outlined, color: WaouhIaPalette.primary, size: 22),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Données sécurisées',
                  style: TextStyle(
                    color: WaouhIaPalette.ink,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'Vos sessions, Agents et opérations restent liés à votre compte.',
                  style: TextStyle(
                    color: WaouhIaPalette.muted,
                    fontSize: 13,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
