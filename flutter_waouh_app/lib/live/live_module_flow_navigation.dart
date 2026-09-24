import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class LiveModuleFlowNavigation extends StatelessWidget {
  const LiveModuleFlowNavigation({
    super.key,
    required this.currentPath,
  });

  final String currentPath;

  static const green = Color(0xFF075E54);
  static const ink = Color(0xFF10211C);
  static const muted = Color(0xFF66736F);
  static const line = Color(0xFFDDE9E5);

  static const steps = <_FlowStep>[
    _FlowStep(
      route: '/app/whatsapp/bi',
      label: 'BI / Analyse',
      shortLabel: 'BI',
      icon: Icons.analytics_outlined,
    ),
    _FlowStep(
      route: '/app/stock',
      label: 'Gestion Stock',
      shortLabel: 'Stock',
      icon: Icons.inventory_2_outlined,
    ),
    _FlowStep(
      route: '/app/presence',
      label: 'Présence QR',
      shortLabel: 'Présence',
      icon: Icons.qr_code_scanner_rounded,
    ),
  ];

  int get currentIndex {
    final index = steps.indexWhere(
      (step) =>
          currentPath == step.route || currentPath.startsWith('${step.route}/'),
    );
    return index < 0 ? 0 : index;
  }

  @override
  Widget build(BuildContext context) {
    final index = currentIndex;
    final current = steps[index];
    final previousRoute = index == 0 ? '/app/bots' : steps[index - 1].route;
    final nextRoute =
        index == steps.length - 1 ? '/app/bots' : steps[index + 1].route;
    final previousLabel = index == 0 ? 'Modules' : steps[index - 1].shortLabel;
    final nextLabel =
        index == steps.length - 1 ? 'Modules' : steps[index + 1].shortLabel;

    return Material(
      color: Colors.white,
      surfaceTintColor: Colors.transparent,
      child: Container(
        height: 58,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: const BoxDecoration(
          border: Border(
            bottom: BorderSide(color: line),
          ),
        ),
        child: Row(
          children: [
            _FlowButton(
              tooltip: 'Précédent : $previousLabel',
              icon: Icons.arrow_back_ios_new_rounded,
              label: previousLabel,
              onTap: () => context.go(previousRoute),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => context.go('/app/bots'),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 7,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(current.icon, color: green, size: 19),
                      const SizedBox(width: 7),
                      Flexible(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              current.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: ink,
                                fontWeight: FontWeight.w900,
                                fontSize: 12.5,
                              ),
                            ),
                            Text(
                              '${index + 1} / ${steps.length} · Tous les modules',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: muted,
                                fontSize: 9.5,
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
            const SizedBox(width: 6),
            _FlowButton(
              tooltip: 'Suivant : $nextLabel',
              icon: Icons.arrow_forward_ios_rounded,
              label: nextLabel,
              trailingIcon: true,
              onTap: () => context.go(nextRoute),
            ),
          ],
        ),
      ),
    );
  }
}

class _FlowButton extends StatelessWidget {
  const _FlowButton({
    required this.tooltip,
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailingIcon = false,
  });

  final String tooltip;
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool trailingIcon;

  @override
  Widget build(BuildContext context) {
    final text = Text(
      label,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: const TextStyle(
        color: LiveModuleFlowNavigation.green,
        fontSize: 10.5,
        fontWeight: FontWeight.w800,
      ),
    );
    final arrow = Icon(
      icon,
      size: 14,
      color: LiveModuleFlowNavigation.green,
    );

    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        child: Container(
          constraints: const BoxConstraints(minWidth: 74),
          padding: const EdgeInsets.symmetric(
            horizontal: 9,
            vertical: 9,
          ),
          decoration: BoxDecoration(
            color: const Color(0xFFF2F8F6),
            borderRadius: BorderRadius.circular(15),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: trailingIcon
                ? [
                    Flexible(child: text),
                    const SizedBox(width: 4),
                    arrow,
                  ]
                : [
                    arrow,
                    const SizedBox(width: 4),
                    Flexible(child: text),
                  ],
          ),
        ),
      ),
    );
  }
}

class _FlowStep {
  const _FlowStep({
    required this.route,
    required this.label,
    required this.shortLabel,
    required this.icon,
  });

  final String route;
  final String label;
  final String shortLabel;
  final IconData icon;
}
