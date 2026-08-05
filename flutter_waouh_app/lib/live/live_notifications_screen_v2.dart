import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'live_controller.dart';
import 'live_match_navigation.dart';
import 'live_models.dart';
import 'live_widgets.dart';

class LiveNotificationsScreenV2 extends StatefulWidget {
  const LiveNotificationsScreenV2({super.key});

  @override
  State<LiveNotificationsScreenV2> createState() =>
      _LiveNotificationsScreenV2State();
}

class _LiveNotificationsScreenV2State extends State<LiveNotificationsScreenV2> {
  var _history = false;

  Future<void> _open(
      LiveWaouhController controller, LiveNotification item) async {
    await controller.markNotificationRead(item.id);
    if (!mounted) return;
    if (item.isMatch) {
      final match = controller.matchFromNotification(item);
      await livePushMatchChat(context, match);
      return;
    }
    if (item.conversationId != null && item.conversationId!.isNotEmpty) {
      context.go('/app/chat/${item.conversationId}');
      return;
    }
    final action = item.actionUrl;
    if (action != null && action.startsWith('/app/')) {
      context.go(action);
      return;
    }
    context.go('/app/chat');
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    return Scaffold(
      appBar: LiveHeader(
        title: 'Notifications',
        subtitle: 'WAOUH',
        back: true,
        actions: [
          TextButton.icon(
            onPressed: controller.markAllNotificationsRead,
            icon: const Icon(Icons.done_all_rounded,
                color: Colors.white, size: 19),
            label: const Text('Tout lire',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
      body: StreamBuilder<List<LiveNotification>>(
        stream: controller.notificationItems(),
        builder: (_, snapshot) {
          final all = snapshot.data ?? const <LiveNotification>[];
          final unreadCount = all.where((item) => !item.read).length;
          final items =
              all.where((item) => _history ? item.read : !item.read).toList();
          return Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
              child: SegmentedButton<bool>(
                segments: [
                  ButtonSegment(
                      value: false,
                      label: Text(
                          'Actives${unreadCount == 0 ? '' : '  $unreadCount'}')),
                  const ButtonSegment(value: true, label: Text('Historique')),
                ],
                selected: {_history},
                onSelectionChanged: (value) =>
                    setState(() => _history = value.first),
              ),
            ),
            Expanded(
              child: items.isEmpty
                  ? Center(
                      child: Text(_history
                          ? 'Aucune notification dans l’historique.'
                          : 'Aucune nouvelle notification.'))
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(14, 8, 14, 24),
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, index) => _NotificationTile(
                          item: items[index],
                          onTap: () => _open(controller, items[index])),
                    ),
            ),
          ]);
        },
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});
  final LiveNotification item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final photos = liveStringList(item.payload['photos']);
    final image =
        photos.isEmpty ? item.payload['image_url']?.toString() : photos.first;
    final label = item.isMatch
        ? 'Match produit'
        : (item.type ?? 'Information').replaceAll('_', ' ');
    return Card(
      color: item.read ? Colors.white : const Color(0xFFE7FFF2),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                width: 54,
                height: 54,
                child: image == null || image.isEmpty
                    ? ColoredBox(
                        color: const Color(0xFFEAF7F1),
                        child: Icon(item.isMatch
                            ? Icons.shopping_bag_outlined
                            : Icons.notifications_active_outlined))
                    : Image.network(image,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => ColoredBox(
                            color: const Color(0xFFEAF7F1),
                            child: Icon(item.isMatch
                                ? Icons.shopping_bag_outlined
                                : Icons.notifications_active_outlined))),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Row(children: [
                    Expanded(
                        child: Text(item.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontWeight: FontWeight.w900, fontSize: 16))),
                    if (!item.read)
                      const Icon(Icons.circle,
                          size: 11, color: Color(0xFF24E58F)),
                  ]),
                  const SizedBox(height: 3),
                  Chip(
                      label: Text(label), visualDensity: VisualDensity.compact),
                  if (item.body.isNotEmpty)
                    Text(item.body,
                        maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Text(_stamp(item.createdAt),
                      style: const TextStyle(
                          fontSize: 11, color: Color(0xFF6B7D76))),
                ])),
          ]),
        ),
      ),
    );
  }
}

String _stamp(DateTime date) {
  final local = date.toLocal();
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}
