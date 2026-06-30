import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'brand_mark.dart';
import 'live_controller.dart';
import 'live_controller_match_actions.dart';
import 'live_models.dart';
import 'live_radar_screen.dart';
import 'live_status_screen.dart';

class LiveInboxScreenV2 extends StatefulWidget {
  const LiveInboxScreenV2({super.key});

  @override
  State<LiveInboxScreenV2> createState() => _LiveInboxScreenV2State();
}

class _LiveInboxScreenV2State extends State<LiveInboxScreenV2> {
  final _search = TextEditingController();
  final _seenStatusIds = <String>{};
  var _tab = 0;
  var _archives = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final controller = context.read<LiveWaouhController>();
      await controller.initialize();
      final seen = await controller.session.seenStatusIds();
      if (mounted) setState(() => _seenStatusIds.addAll(seen));
    });
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  bool _matches(String text) {
    final query = _search.text.trim().toLowerCase();
    return query.isEmpty || text.toLowerCase().contains(query);
  }

  Future<void> _newChat() async {
    await context.read<LiveWaouhController>().startNewChat();
    if (mounted) context.go('/app/chat/waouh');
  }

  Future<void> _openWaouhWith(String seed) async {
    final controller = context.read<LiveWaouhController>();
    await controller.startNewChat();
    controller.setComposerSeed(seed);
    if (mounted) context.go('/app/chat/waouh');
  }

  Future<void> _selectTab(int value, List<LiveStatus> statuses) async {
    if (value == _tab) return;
    setState(() => _tab = value);
    if (value != 1) return;
    final activeIds = statuses.where((item) => item.active).map((item) => item.id).where((id) => id.isNotEmpty).toList();
    await context.read<LiveWaouhController>().session.markStatusesSeen(activeIds);
    if (mounted) setState(() => _seenStatusIds.addAll(activeIds));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    final controller = context.read<LiveWaouhController>();
    return StreamBuilder<List<LiveStatus>>(
      stream: controller.statuses(),
      builder: (_, statusSnapshot) {
        final statuses = (statusSnapshot.data ?? const <LiveStatus>[]).where((item) => item.active).toList();
        final newStatusCount = statuses.where((item) => !_seenStatusIds.contains(item.id)).length;
        return Scaffold(
          appBar: _inboxAppBar(context, auth, controller),
          body: Column(children: [
            Container(
              color: legacy.WaouhColors.green,
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
              child: TextField(
                controller: _search,
                onChanged: (_) => setState(() {}),
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: _tab == 2 ? 'Rechercher dans le Radar...' : 'Rechercher discussions, statuts...',
                  hintStyle: TextStyle(color: Colors.white.withOpacity(.68)),
                  prefixIcon: const Icon(Icons.search_rounded, color: Colors.white70),
                  fillColor: Colors.white.withOpacity(.14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide.none),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide.none),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
              child: SegmentedButton<int>(
                segments: [
                  const ButtonSegment(value: 0, label: Text('Discussions')),
                  ButtonSegment(value: 1, label: _StatusTabLabel(count: newStatusCount)),
                  const ButtonSegment(value: 2, icon: Icon(Icons.radar_rounded, size: 17), label: Text('Radar')),
                ],
                selected: {_tab},
                onSelectionChanged: (value) => _selectTab(value.first, statuses),
              ),
            ),
            Expanded(
              child: switch (_tab) {
                1 => const LiveStatusFeed(),
                2 => const LiveRadarFeed(),
                _ => _DiscussionHistory(
                    archives: _archives,
                    matches: _matches,
                    onNewChat: _newChat,
                    onOpenWaouh: _openWaouhWith,
                    onToggleArchives: () => setState(() => _archives = !_archives),
                  ),
              },
            ),
          ]),
        );
      },
    );
  }

  PreferredSizeWidget _inboxAppBar(BuildContext context, legacy.AuthController auth, LiveWaouhController controller) {
    final profile = auth.profile;
    final displayName = profile?.fullName?.trim().isNotEmpty == true ? profile!.fullName! : 'WaouhApp';
    return AppBar(
      toolbarHeight: 92,
      automaticallyImplyLeading: false,
      leadingWidth: 68,
      leading: _ProfileAvatar(
        name: displayName,
        imageUrl: profile?.avatarUrl,
        onTap: () => context.go('/app/profile'),
      ),
      title: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text(displayName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
        Row(mainAxisSize: MainAxisSize.min, children: [
          const _OnlineDot(),
          const SizedBox(width: 6),
          Text(auth.signedIn ? 'WAOUH actif' : 'Mode invité', style: const TextStyle(color: Color(0xFFC9F6E3), fontSize: 13, fontWeight: FontWeight.w700)),
        ]),
      ]),
      actions: [
        StreamBuilder<List<LiveNotification>>(
          stream: controller.notificationItems(),
          builder: (_, snapshot) {
            final count = (snapshot.data ?? const <LiveNotification>[]).where((item) => !item.read).length;
            return _IconBadgeButton(
              count: count,
              tooltip: 'Notifications',
              icon: Icons.notifications_none_rounded,
              onPressed: () => context.go('/app/notifications'),
            );
          },
        ),
        IconButton(onPressed: _newChat, icon: const Icon(Icons.add_rounded), tooltip: 'Nouveau chat WAOUH'),
      ],
      flexibleSpace: const DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [legacy.WaouhColors.deep, legacy.WaouhColors.green, Color(0xFF031F1A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
      ),
    );
  }
}

class _DiscussionHistory extends StatelessWidget {
  const _DiscussionHistory({
    required this.archives,
    required this.matches,
    required this.onNewChat,
    required this.onOpenWaouh,
    required this.onToggleArchives,
  });

  final bool archives;
  final bool Function(String text) matches;
  final VoidCallback onNewChat;
  final ValueChanged<String> onOpenWaouh;
  final VoidCallback onToggleArchives;

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    return StreamBuilder<List<LiveMatch>>(
      stream: controller.matches(archived: false),
      builder: (_, activeMatchSnapshot) => StreamBuilder<List<LiveMatch>>(
        stream: controller.matches(archived: true),
        builder: (_, archivedMatchSnapshot) => StreamBuilder<List<LiveConversation>>(
          stream: controller.conversations(archived: false),
          builder: (_, activeConversationSnapshot) => StreamBuilder<List<LiveConversation>>(
            stream: controller.conversations(archived: true),
            builder: (_, archivedConversationSnapshot) {
              final activeMatches = (activeMatchSnapshot.data ?? const <LiveMatch>[]).where((item) => matches('${item.title} ${item.city ?? ''} ${item.seedText ?? ''} ${item.price ?? ''}')).toList();
              final archivedMatches = (archivedMatchSnapshot.data ?? const <LiveMatch>[]).where((item) => matches('${item.title} ${item.city ?? ''} ${item.seedText ?? ''} ${item.price ?? ''}')).toList();
              final activeConversations = (activeConversationSnapshot.data ?? const <LiveConversation>[]).where((item) => matches('${item.phoneNumber ?? ''} ${item.lastMessage ?? ''}')).toList();
              final archivedConversations = (archivedConversationSnapshot.data ?? const <LiveConversation>[]).where((item) => matches('${item.phoneNumber ?? ''} ${item.lastMessage ?? ''}')).toList();
              final currentMatches = archives ? archivedMatches : activeMatches;
              final currentConversations = archives ? archivedConversations : activeConversations;
              final activeTotal = activeMatches.length + activeConversations.length;
              final archivedTotal = archivedMatches.length + archivedConversations.length;
              final unreadTotal = activeMatches.fold<int>(0, (total, item) => total + item.unreadCount);
              final empty = currentMatches.isEmpty && currentConversations.isEmpty;

              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                children: [
                  _WaouhCard(onDiscuss: () => onOpenWaouh(''), onSell: () => onOpenWaouh('Je vends : '), onBuy: () => onOpenWaouh('Je cherche '), onNegotiate: () => onOpenWaouh('Je propose  FCFA pour ')),
                  const SizedBox(height: 18),
                  Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(archives ? 'ARCHIVES' : 'CONVERSATIONS PRODUIT', style: const TextStyle(fontWeight: FontWeight.w900, color: legacy.WaouhColors.muted)),
                      if (!archives && unreadTotal > 0) Text('$unreadTotal message${unreadTotal > 1 ? 's' : ''} non lu${unreadTotal > 1 ? 's' : ''}', style: const TextStyle(fontSize: 12, color: legacy.WaouhColors.jade, fontWeight: FontWeight.w800)),
                    ])),
                    OutlinedButton.icon(onPressed: onToggleArchives, icon: Icon(archives ? Icons.forum_outlined : Icons.archive_outlined, size: 18), label: Text(archives ? 'Actives ($activeTotal)' : 'Archives ($archivedTotal)')),
                  ]),
                  const SizedBox(height: 8),
                  if (currentMatches.isNotEmpty) ...currentMatches.map((match) => _MatchRow(match: match, archived: archives)),
                  if (currentConversations.isNotEmpty) ...currentConversations.map((conversation) => _ConversationRow(conversation: conversation, archived: archives)),
                  if (empty) _EmptyConversations(archived: archives, onNewChat: onNewChat),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _WaouhCard extends StatelessWidget {
  const _WaouhCard({required this.onDiscuss, required this.onSell, required this.onBuy, required this.onNegotiate});
  final VoidCallback onDiscuss;
  final VoidCallback onSell;
  final VoidCallback onBuy;
  final VoidCallback onNegotiate;

  @override
  Widget build(BuildContext context) => Card(
    color: const Color(0xFFECFFF5),
    clipBehavior: Clip.antiAlias,
    child: Padding(
      padding: const EdgeInsets.fromLTRB(14, 13, 12, 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const BrandMark(size: 46, semanticLabel: 'WAOUH IA'),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: const [Text('WAOUH', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)), SizedBox(width: 7), _OnlineDot(), SizedBox(width: 5), Text('En ligne', style: TextStyle(fontSize: 12.5, color: legacy.WaouhColors.jade, fontWeight: FontWeight.w800))]),
            const SizedBox(height: 2),
            const Text('Assistant IA pour acheter, vendre et négocier.', style: TextStyle(color: legacy.WaouhColors.muted, fontSize: 12.5, fontWeight: FontWeight.w600)),
          ])),
          FilledButton.icon(onPressed: onDiscuss, icon: const Icon(Icons.chat_bubble_outline_rounded, size: 17), label: const Text('Discuter'), style: FilledButton.styleFrom(minimumSize: const Size(0, 40), padding: const EdgeInsets.symmetric(horizontal: 12))),
        ]),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [
          _IntentChip(label: 'Vendre', icon: Icons.sell_outlined, onTap: onSell),
          _IntentChip(label: 'Acheter', icon: Icons.search_rounded, onTap: onBuy),
          _IntentChip(label: 'Négocier', icon: Icons.handshake_outlined, onTap: onNegotiate),
        ]),
      ]),
    ),
  );
}

class _IntentChip extends StatelessWidget {
  const _IntentChip({required this.label, required this.icon, required this.onTap});
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => ActionChip(avatar: Icon(icon, size: 16, color: legacy.WaouhColors.jade), label: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)), onPressed: onTap, side: const BorderSide(color: Color(0xFFBFE9D7)), backgroundColor: Colors.white);
}

class _MatchRow extends StatelessWidget {
  const _MatchRow({required this.match, required this.archived});
  final LiveMatch match;
  final bool archived;
  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    final when = _relativeMatchTime(match.lastAt);
    final unread = archived ? 0 : match.unreadCount;
    return Card(
      margin: const EdgeInsets.only(bottom: 9),
      child: ListTile(
        contentPadding: const EdgeInsets.fromLTRB(12, 8, 6, 8),
        onTap: () async { await controller.markMatchRead(match); if (context.mounted) context.go('/app/chat/match/${Uri.encodeComponent(match.key)}', extra: match); },
        leading: Stack(clipBehavior: Clip.none, children: [
          ClipRRect(borderRadius: BorderRadius.circular(12), child: SizedBox(height: 54, width: 54, child: match.photo == null ? const ColoredBox(color: Color(0xFFEAF7F1), child: Icon(Icons.shopping_bag_outlined)) : Image.network(match.photo!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const ColoredBox(color: Color(0xFFEAF7F1), child: Icon(Icons.shopping_bag_outlined))))),
          if (unread > 0) Positioned(top: -6, right: -6, child: _CountBubble(count: unread, small: true)),
        ]),
        title: Row(children: [Expanded(child: Text(match.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontWeight: FontWeight.w900, color: unread > 0 ? legacy.WaouhColors.ink : null))), if (unread > 0) const Icon(Icons.circle, color: Color(0xFF24E58F), size: 10)]),
        subtitle: Text('${match.role == 'seller' ? 'Acheteur intéressé' : 'Nouvelle annonce correspondante'}${match.city == null ? '' : ' · ${match.city}'}\n$when', maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontWeight: unread > 0 ? FontWeight.w700 : FontWeight.w400)),
        isThreeLine: true,
        trailing: IconButton(tooltip: archived ? 'Restaurer' : 'Archiver', onPressed: () => controller.archiveMatch(match, !archived), icon: Icon(archived ? Icons.unarchive_outlined : Icons.archive_outlined)),
      ),
    );
  }
}

class _ConversationRow extends StatelessWidget {
  const _ConversationRow({required this.conversation, required this.archived});
  final LiveConversation conversation;
  final bool archived;
  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    return Dismissible(
      key: ValueKey(conversation.id),
      direction: archived ? DismissDirection.none : DismissDirection.endToStart,
      background: Container(alignment: Alignment.centerRight, padding: const EdgeInsets.only(right: 20), color: legacy.WaouhColors.muted, child: const Icon(Icons.archive_outlined, color: Colors.white)),
      confirmDismiss: (_) async { await controller.archiveConversation(conversation.id); return false; },
      child: Card(margin: const EdgeInsets.only(bottom: 9), child: ListTile(
        contentPadding: const EdgeInsets.fromLTRB(12, 8, 10, 8),
        onTap: () => context.go('/app/chat/${conversation.id}'),
        leading: const CircleAvatar(backgroundColor: Color(0xFFEAF7F1), child: Icon(Icons.chat_bubble_outline, color: legacy.WaouhColors.jade)),
        title: Text(conversation.phoneNumber ?? 'Discussion WAOUH', style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(conversation.lastMessage ?? 'Ouvrir la conversation', maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: archived ? const Icon(Icons.archive_outlined, color: legacy.WaouhColors.muted) : Text(_relativeMatchTime(conversation.updatedAt), style: const TextStyle(fontSize: 11, color: legacy.WaouhColors.muted)),
      )),
    );
  }
}

class _EmptyConversations extends StatelessWidget {
  const _EmptyConversations({required this.archived, required this.onNewChat});
  final bool archived;
  final VoidCallback onNewChat;
  @override
  Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.all(28), child: Column(children: [
    const Icon(Icons.forum_outlined, size: 48, color: legacy.WaouhColors.muted),
    const SizedBox(height: 12),
    Text(archived ? 'Aucune conversation archivée' : 'Aucune autre conversation', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
    const SizedBox(height: 8),
    Text(archived ? 'Les discussions archivées apparaîtront ici.' : 'Utilisez WAOUH pour commencer une recherche, une vente ou une négociation.', textAlign: TextAlign.center),
    if (!archived) ...[const SizedBox(height: 18), FilledButton.icon(onPressed: onNewChat, icon: const Icon(Icons.add), label: const Text('Nouveau chat WAOUH'))],
  ])));
}

class _ProfileAvatar extends StatelessWidget {
  const _ProfileAvatar({required this.name, this.imageUrl, required this.onTap});
  final String name;
  final String? imageUrl;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final initials = name.trim().split(RegExp(r'\s+')).where((part) => part.isNotEmpty).take(2).map((part) => part[0]).join().toUpperCase();
    final fallback = CircleAvatar(radius: 21, backgroundColor: const Color(0xFFE3FFF0), child: Text(initials.isEmpty ? 'W' : initials, style: const TextStyle(color: legacy.WaouhColors.jade, fontWeight: FontWeight.w900)));
    return Center(child: InkResponse(onTap: onTap, radius: 28, child: imageUrl == null || imageUrl!.isEmpty ? fallback : CircleAvatar(radius: 21, backgroundImage: NetworkImage(imageUrl!), onBackgroundImageError: (_, __) {}, child: null)));
  }
}

class _StatusTabLabel extends StatelessWidget {
  const _StatusTabLabel({required this.count});
  final int count;
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [const Text('Statuts · 24h'), if (count > 0) ...[const SizedBox(width: 6), _CountBubble(count: count, small: true)]]);
}

class _IconBadgeButton extends StatelessWidget {
  const _IconBadgeButton({required this.count, required this.tooltip, required this.icon, required this.onPressed});
  final int count;
  final String tooltip;
  final IconData icon;
  final VoidCallback onPressed;
  @override
  Widget build(BuildContext context) => Stack(clipBehavior: Clip.none, children: [IconButton(onPressed: onPressed, icon: Icon(icon), tooltip: tooltip), if (count > 0) Positioned(top: 4, right: 4, child: _CountBubble(count: count, small: true))]);
}

class _CountBubble extends StatelessWidget {
  const _CountBubble({required this.count, this.small = false});
  final int count;
  final bool small;
  @override
  Widget build(BuildContext context) {
    final label = count > 99 ? '99+' : '$count';
    return Container(constraints: BoxConstraints(minWidth: small ? 18 : 22, minHeight: small ? 18 : 22), padding: EdgeInsets.symmetric(horizontal: small ? 4 : 6), alignment: Alignment.center, decoration: const BoxDecoration(color: legacy.WaouhColors.red, shape: BoxShape.circle), child: Text(label, style: TextStyle(color: Colors.white, fontSize: small ? 10 : 11, fontWeight: FontWeight.w900)));
  }
}

class _OnlineDot extends StatelessWidget {
  const _OnlineDot();
  @override
  Widget build(BuildContext context) => Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFF24E58F), shape: BoxShape.circle));
}

String _relativeMatchTime(DateTime date) {
  final now = DateTime.now();
  final local = date.toLocal();
  final difference = now.difference(local);
  if (difference.inMinutes < 1) return 'Maintenant';
  if (difference.inMinutes < 60) return '${difference.inMinutes} min';
  if (local.year == now.year && local.month == now.month && local.day == now.day) return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}';
}
