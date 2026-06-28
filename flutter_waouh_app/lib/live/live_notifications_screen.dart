import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'live_controller.dart';
import 'live_models.dart';
import 'live_widgets.dart';

class LiveNotificationsScreen extends StatelessWidget {
  const LiveNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    return Scaffold(
      appBar: LiveHeader(
        title: 'Notifications',
        subtitle: 'WAOUH',
        back: true,
        actions: [IconButton(onPressed: controller.markAllNotificationsRead, icon: const Icon(Icons.done_all_rounded), tooltip: 'Tout marquer comme lu')],
      ),
      body: StreamBuilder<List<LiveNotification>>(
        stream: controller.notificationItems(),
        builder: (_, snapshot) {
          final items = snapshot.data ?? const <LiveNotification>[];
          if (items.isEmpty) return const Center(child: Text('Aucune notification pour le moment.'));
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, index) {
              final item = items[index];
              return Card(
                color: item.read ? Colors.white : const Color(0xFFE7FFF2),
                child: ListTile(
                  leading: Icon(item.isMatch ? Icons.shopping_bag_outlined : Icons.notifications_active_outlined),
                  title: Text(item.title, style: const TextStyle(fontWeight: FontWeight.w900)),
                  subtitle: Text(item.body.isEmpty ? 'Ouvrir' : item.body, maxLines: 3, overflow: TextOverflow.ellipsis),
                  trailing: item.read ? null : const Icon(Icons.circle, color: Color(0xFF24E58F), size: 12),
                  onTap: () async {
                    await controller.markNotificationRead(item.id);
                    if (!context.mounted) return;
                    if (item.isMatch) {
                      final match = controller.matchFromNotification(item);
                      context.go('/app/chat/match/${Uri.encodeComponent(match.key)}', extra: match);
                    } else if (item.conversationId != null && item.conversationId!.isNotEmpty) {
                      context.go('/app/chat/${item.conversationId}');
                    } else if (item.actionUrl != null && item.actionUrl!.startsWith('/app/')) {
                      context.go(item.actionUrl!);
                    } else {
                      context.go('/app/chat');
                    }
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}
