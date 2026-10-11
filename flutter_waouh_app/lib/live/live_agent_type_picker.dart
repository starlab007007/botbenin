import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'live_theme.dart';
import 'whatsapp_ia_studio_v21/smart_studio_wizard.dart';

/// Ouvre l'assistant de création d'agent (même assistant que le Studio).
Future<void> openLiveAgentWizard(BuildContext context) =>
    showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const SmartStudioWizardSheet(agentOnly: true),
    );

/// Parité Web `AgentTypePickerScreen` : « Créer un agent IA » → type d'agent.
class LiveAgentTypePickerScreen extends StatelessWidget {
  const LiveAgentTypePickerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = <_Item>[
      _Item('Conversationnel', 'Répond, vend, prend RDV', Icons.forum_rounded,
          const [Color(0xFF10B981), Color(0xFF0D9488)],
          () => openLiveAgentWizard(context)),
      _Item('BI & analyse', 'Sheets, Excel, KPI', Icons.bar_chart_rounded,
          const [Color(0xFF3B82F6), Color(0xFF4F46E5)],
          () => context.push('/app/whatsapp/bi')),
      _Item('Stock', 'Alertes et réappro', Icons.inventory_2_rounded,
          const [Color(0xFFF59E0B), Color(0xFFEA580C)],
          () => context.push('/app/stock')),
      _Item('Présence QR', 'Pointage géolocalisé', Icons.place_rounded,
          const [Color(0xFFD946EF), Color(0xFFEC4899)],
          () => context.push('/app/presence')),
    ];
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(title: const Text('Créer un agent IA')),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: WaouhGradients.air),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
          children: [
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Text('Choisissez le type d’agent',
                  style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: WaouhPalette.muted)),
            ),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.05,
              children: [for (final i in items) _Card(item: i)],
            ),
          ],
        ),
      ),
    );
  }
}

class _Item {
  const _Item(this.label, this.hint, this.icon, this.colors, this.onTap);
  final String label, hint;
  final IconData icon;
  final List<Color> colors;
  final VoidCallback onTap;
}

class _Card extends StatelessWidget {
  const _Card({required this.item});
  final _Item item;
  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(22),
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: item.onTap,
          child: Ink(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: item.colors),
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                    color: item.colors.last.withOpacity(.28),
                    blurRadius: 14,
                    offset: const Offset(0, 6)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(item.icon, color: Colors.white, size: 30),
                const Spacer(),
                Text(item.label,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 15)),
                const SizedBox(height: 2),
                Text(item.hint,
                    style: TextStyle(
                        color: Colors.white.withOpacity(.92),
                        fontWeight: FontWeight.w600,
                        fontSize: 11.5)),
              ],
            ),
          ),
        ),
      );
}
