import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'live_controller.dart';

class LiveOfflineBanner extends StatelessWidget {
  const LiveOfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    if (controller.isOnline && controller.pendingActions == 0) {
      return const SizedBox.shrink();
    }
    final offline = !controller.isOnline;
    final label = offline
        ? 'Hors connexion — vos actions sont conservees sur ce telephone.'
        : controller.syncing
            ? 'Synchronisation en cours…'
            : '${controller.pendingActions} action(s) en attente de synchronisation.';
    return Material(
      color: offline ? const Color(0xFF263238) : const Color(0xFF075E54),
      child: SafeArea(
        bottom: false,
        child: InkWell(
          onTap: controller.isOnline && controller.pendingActions > 0
              ? controller.syncPending
              : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Icon(offline ? Icons.cloud_off_rounded : Icons.sync_rounded, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w700))),
                if (controller.isOnline && controller.pendingActions > 0)
                  const Icon(Icons.chevron_right_rounded, color: Colors.white, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
