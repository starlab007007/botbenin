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
    final action = item.smartActionUrl;
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
                        onTap: () => _open(controller, items[index]),
                        onAction: (action) async {
                          final item = items[index];
                          await controller.markNotificationRead(item.id);
                          if (!mounted) return;
                          if (item.isMatch || action.kind == 'commerce') {
                            await _open(controller, item);
                            return;
                          }
                          final route = action.route ?? item.smartActionUrl;
                          if (route != null && route.startsWith('/app/')) {
                            context.go(route);
                          } else {
                            await _open(controller, item);
                          }
                        },
                      ),
                    ),
            ),
          ]);
        },
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.item,
    required this.onTap,
    required this.onAction,
  });
  final LiveNotification item;
  final VoidCallback onTap;
  final ValueChanged<LiveSmartAction> onAction;

  @override
  Widget build(BuildContext context) {
    final photos = liveStringList(item.payload['photos']);
    final image =
        photos.isEmpty ? item.payload['image_url']?.toString() : photos.first;
    final label = item.isMatch
        ? 'Match produit'
        : (item.type ?? 'Information').replaceAll('_', ' ');
    final actions = item.smartActions.take(3).toList(growable: false);
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
                        child: Text(item.displayTitle,
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
                  if (item.displayBody.isNotEmpty)
                    Text(item.displayBody,
                        maxLines: 3, overflow: TextOverflow.ellipsis),
                  if (item.smart.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        _SmartMetaChip(
                          label: item.smartDomain,
                          emphasis: item.smartPriority == 'urgent' ||
                              item.smartPriority == 'high',
                        ),
                        if (liveText(item.smart['stage']).trim().isNotEmpty)
                          _SmartMetaChip(
                            label: liveText(item.smart['stage']).trim(),
                          ),
                      ],
                    ),
                  ],
                  if (actions.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 7,
                      runSpacing: 7,
                      children: [
                        for (var index = 0; index < actions.length; index++)
                          index == 0
                              ? FilledButton(
                                  onPressed: () => onAction(actions[index]),
                                  style: FilledButton.styleFrom(
                                    visualDensity: VisualDensity.compact,
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 8),
                                  ),
                                  child: Text(actions[index].label),
                                )
                              : OutlinedButton(
                                  onPressed: () => onAction(actions[index]),
                                  style: OutlinedButton.styleFrom(
                                    visualDensity: VisualDensity.compact,
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 8),
                                  ),
                                  child: Text(actions[index].label),
                                ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 6),
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


class _SmartMetaChip extends StatelessWidget {
  const _SmartMetaChip({required this.label, this.emphasis = false});
  final String label;
  final bool emphasis;

  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: BoxDecoration(
          color: emphasis
              ? const Color(0xFFFFF1DA)
              : const Color(0xFFF0F4F2),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: emphasis
                  ? const Color(0xFF9A5B00)
                  : const Color(0xFF52645D),
            ),
          ),
        ),
      );
}

String _stamp(DateTime date) {
  final local = date.toLocal();
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}
