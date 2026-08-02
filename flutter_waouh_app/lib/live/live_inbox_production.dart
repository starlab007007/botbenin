import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'brand_mark.dart';
import 'live_controller.dart';
import 'live_controller_match_actions.dart';
import 'live_models.dart';
import 'live_radar_models.dart';
import 'live_radar_service.dart';
import 'live_radar_map_screen.dart';
import 'live_status_screen.dart';
import 'live_widgets.dart';

class LiveInboxProductionScreen extends StatefulWidget {
  const LiveInboxProductionScreen({super.key});

  @override
  State<LiveInboxProductionScreen> createState() =>
      _LiveInboxProductionScreenState();
}

class _LiveInboxProductionScreenState extends State<LiveInboxProductionScreen> {
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
    final activeIds = statuses
        .where((item) => item.active)
        .map((item) => item.id)
        .where((id) => id.isNotEmpty)
        .toList();
    await context.read<LiveWaouhController>().session.markStatusesSeen(
          activeIds,
        );
    if (mounted) setState(() => _seenStatusIds.addAll(activeIds));
  }

  bool _matches(String text) {
    final query = _search.text.trim().toLowerCase();
    return query.isEmpty || text.toLowerCase().contains(query);
  }

  String _displayName(String fullName) {
    final words = fullName
        .trim()
        .split(RegExp(r'\s+'))
        .where((item) => item.isNotEmpty)
        .toList();
    if (words.length < 2)
      return fullName.trim().isEmpty ? 'WaouhApp' : fullName.trim();
    return '${words.first} ${words.last[0].toUpperCase()}.';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    final controller = context.read<LiveWaouhController>();
    final fullName = auth.profile?.fullName?.trim().isNotEmpty == true
        ? auth.profile!.fullName!
        : 'WaouhApp';
    return StreamBuilder<List<LiveStatus>>(
      stream: controller.statuses(),
      builder: (_, snapshot) {
        final statuses = (snapshot.data ?? const <LiveStatus>[])
            .where((item) => item.active)
            .toList();
        final newStatuses =
            statuses.where((item) => !_seenStatusIds.contains(item.id)).length;
        return Scaffold(
          backgroundColor: const Color(0xFFF8FBF9),
          appBar: _InboxAppBar(
            displayName: _displayName(fullName),
            imageUrl: auth.profile?.avatarUrl,
            onlineLabel: auth.signedIn ? 'WAOUH actif' : 'Mode invité',
            notificationCountStream: controller.notificationItems(),
            onProfile: () => context.go('/app/profile'),
            onNotifications: () => context.go('/app/notifications'),
            onNewChat: _newChat,
          ),
          body: Column(
            children: [
              _SearchBar(
                controller: _search,
                tab: _tab,
                onChanged: () => setState(() {}),
              ),
              _InboxTabs(
                value: _tab,
                statusCount: newStatuses,
                onChanged: (value) => _selectTab(value, statuses),
              ),
              Expanded(
                child: switch (_tab) {
                  1 => const _ProductionStatusFeed(),
                  2 => const LiveRadarMapScreen(),
                  _ => _ProductionDiscussionFeed(
                      archives: _archives,
                      matches: _matches,
                      onToggleArchives: () =>
                          setState(() => _archives = !_archives),
                      onNewChat: _newChat,
                      onOpenWaouh: _openWaouhWith,
                    ),
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

class _InboxAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _InboxAppBar({
    required this.displayName,
    required this.imageUrl,
    required this.onlineLabel,
    required this.notificationCountStream,
    required this.onProfile,
    required this.onNotifications,
    required this.onNewChat,
  });

  final String displayName;
  final String? imageUrl;
  final String onlineLabel;
  final Stream<List<LiveNotification>> notificationCountStream;
  final VoidCallback onProfile;
  final VoidCallback onNotifications;
  final VoidCallback onNewChat;

  @override
  Size get preferredSize => const Size.fromHeight(58);

  @override
  Widget build(BuildContext context) => AppBar(
        toolbarHeight: 58,
        automaticallyImplyLeading: false,
        leadingWidth: 52,
        leading: Center(
          child: _ProfileAvatar(
            name: displayName,
            imageUrl: imageUrl,
            onTap: onProfile,
          ),
        ),
        titleSpacing: 0,
        title: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              displayName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 18.5,
                fontWeight: FontWeight.w900,
                letterSpacing: -.25,
              ),
            ),
            const SizedBox(height: 1),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const _OnlineDot(),
                const SizedBox(width: 5),
                Text(
                  onlineLabel,
                  style: const TextStyle(
                    color: Color(0xFFC9F6E3),
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          StreamBuilder<List<LiveNotification>>(
            stream: notificationCountStream,
            builder: (_, snapshot) => _HeaderIcon(
              icon: Icons.notifications_none_rounded,
              count: (snapshot.data ?? const <LiveNotification>[])
                  .where((item) => !item.read)
                  .length,
              tooltip: 'Notifications',
              onTap: onNotifications,
            ),
          ),
          IconButton(
            onPressed: onNewChat,
            tooltip: 'Nouveau chat',
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.add_rounded, size: 25),
          ),
          const SizedBox(width: 2),
        ],
        flexibleSpace: const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF004F46), Color(0xFF08756A), Color(0xFF013E36)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
      );
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({
    required this.controller,
    required this.tab,
    required this.onChanged,
  });
  final TextEditingController controller;
  final int tab;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final hint = switch (tab) {
      1 => 'Rechercher un statut…',
      2 => 'Rechercher dans le Radar…',
      _ => 'Rechercher une discussion…',
    };
    return Container(
      color: const Color(0xFF08756A),
      padding: const EdgeInsets.fromLTRB(14, 3, 14, 8),
      child: TextField(
        controller: controller,
        onChanged: (_) => onChanged(),
        style: const TextStyle(color: Colors.white, fontSize: 14.5),
        decoration: InputDecoration(
          isDense: true,
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFFBEE1D8), fontSize: 14.5),
          prefixIcon: const Icon(
            Icons.search_rounded,
            size: 21,
            color: Color(0xFFD6F0E8),
          ),
          prefixIconConstraints:
              const BoxConstraints(minWidth: 42, minHeight: 42),
          suffixIcon: controller.text.isEmpty
              ? null
              : IconButton(
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(
                    Icons.close_rounded,
                    size: 20,
                    color: Color(0xFFD6F0E8),
                  ),
                  onPressed: () {
                    controller.clear();
                    onChanged();
                  },
                ),
          filled: true,
          fillColor: const Color(0xFF2A887D),
          contentPadding: const EdgeInsets.symmetric(vertical: 10),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: const BorderSide(color: Color(0xFFBFF7E4), width: 1.2),
          ),
        ),
      ),
    );
  }
}

class _InboxTabs extends StatelessWidget {
  const _InboxTabs({
    required this.value,
    required this.statusCount,
    required this.onChanged,
  });
  final int value;
  final int statusCount;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(14, 9, 14, 7),
        child: Container(
          height: 46,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFF87A198)),
          ),
          child: Row(
            children: [
              Expanded(
                child: _InboxTabButton(
                  selected: value == 0,
                  label: 'Discussions',
                  icon: Icons.forum_outlined,
                  onTap: () => onChanged(0),
                ),
              ),
              const VerticalDivider(
                width: 1,
                thickness: 1,
                color: Color(0xFF87A198),
              ),
              Expanded(
                child: _InboxTabButton(
                  selected: value == 1,
                  label: 'Statuts',
                  icon: Icons.auto_awesome_outlined,
                  badge: statusCount,
                  onTap: () => onChanged(1),
                ),
              ),
              const VerticalDivider(
                width: 1,
                thickness: 1,
                color: Color(0xFF87A198),
              ),
              Expanded(
                child: _InboxTabButton(
                  selected: value == 2,
                  label: 'Radar',
                  icon: Icons.radar_rounded,
                  onTap: () => onChanged(2),
                ),
              ),
            ],
          ),
        ),
      );
}

class _InboxTabButton extends StatelessWidget {
  const _InboxTabButton({
    required this.selected,
    required this.label,
    required this.icon,
    required this.onTap,
    this.badge = 0,
  });
  final bool selected;
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) => Material(
        color: selected ? const Color(0xFFD7F1E9) : Colors.white,
        child: InkWell(
          onTap: onTap,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 5),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    selected ? Icons.check_rounded : icon,
                    size: 17,
                    color: selected
                        ? const Color(0xFF08756A)
                        : const Color(0xFF263530),
                  ),
                  const SizedBox(width: 3),
                  Flexible(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: selected
                            ? const Color(0xFF075E54)
                            : const Color(0xFF263530),
                      ),
                    ),
                  ),
                  if (badge > 0) ...[
                    const SizedBox(width: 4),
                    _CountBubble(value: badge, small: true),
                  ],
                ],
              ),
            ),
          ),
        ),
      );
}

class _ProductionDiscussionFeed extends StatelessWidget {
  const _ProductionDiscussionFeed({
    required this.archives,
    required this.matches,
    required this.onToggleArchives,
    required this.onNewChat,
    required this.onOpenWaouh,
  });

  final bool archives;
  final bool Function(String text) matches;
  final VoidCallback onToggleArchives;
  final VoidCallback onNewChat;
  final ValueChanged<String> onOpenWaouh;

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    return StreamBuilder<List<LiveMatch>>(
      stream: controller.matches(archived: false),
      builder: (_, currentMatchesSnapshot) => StreamBuilder<List<LiveMatch>>(
        stream: controller.matches(archived: true),
        builder: (_, archivedMatchesSnapshot) =>
            StreamBuilder<List<LiveConversation>>(
          stream: controller.conversations(archived: false),
          builder: (_, currentConversationsSnapshot) {
            final currentMatches =
                (currentMatchesSnapshot.data ?? const <LiveMatch>[])
                    .where(
                      (item) => matches(
                        '${item.title} ${item.city ?? ''} ${item.seedText ?? ''}',
                      ),
                    )
                    .toList();
            final archivedMatches =
                (archivedMatchesSnapshot.data ?? const <LiveMatch>[])
                    .where(
                      (item) => matches(
                        '${item.title} ${item.city ?? ''} ${item.seedText ?? ''}',
                      ),
                    )
                    .toList();
            final currentConversations = (currentConversationsSnapshot.data ??
                    const <LiveConversation>[])
                .where(
                  (item) => matches(
                    '${item.phoneNumber ?? ''} ${item.lastMessage ?? ''}',
                  ),
                )
                .toList();
            final items = archives ? archivedMatches : currentMatches;
            final unread = currentMatches.fold<int>(
              0,
              (sum, item) => sum + item.unreadCount,
            );
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
              children: [
                _WaouhAssistantCard(
                  onDiscuss: () => onOpenWaouh(''),
                  onBuy: () => onOpenWaouh('Je cherche '),
                  onSell: () => onOpenWaouh('Je vends : '),
                  onNegotiate: () => onOpenWaouh('Je souhaite négocier '),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            archives ? 'ARCHIVES' : 'CONVERSATIONS',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                              color: Color(0xFF667A73),
                              letterSpacing: .25,
                            ),
                          ),
                          if (!archives && unread > 0)
                            Text(
                              '$unread message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF08756A),
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                        ],
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: onToggleArchives,
                      icon: Icon(
                        archives
                            ? Icons.forum_outlined
                            : Icons.archive_outlined,
                        size: 17,
                      ),
                      label: Text(
                        archives
                            ? 'Actives'
                            : 'Archives (${archivedMatches.length})',
                      ),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 42),
                        foregroundColor: const Color(0xFF075E54),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                if (items.isNotEmpty)
                  ...items.map(
                    (item) => _MatchTile(match: item, archived: archives),
                  ),
                if (!archives && currentConversations.isNotEmpty)
                  ...currentConversations.map(
                    (item) => _ConversationTile(conversation: item),
                  ),
                if (items.isEmpty && (archives || currentConversations.isEmpty))
                  _DiscussionEmpty(archived: archives, onNewChat: onNewChat),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _WaouhAssistantCard extends StatelessWidget {
  const _WaouhAssistantCard({
    required this.onDiscuss,
    required this.onSell,
    required this.onBuy,
    required this.onNegotiate,
  });
  final VoidCallback onDiscuss;
  final VoidCallback onSell;
  final VoidCallback onBuy;
  final VoidCallback onNegotiate;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFEFFFF7),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFCBEBDD)),
        ),
        child: Column(
          children: [
            Row(
              children: [
                const BrandMark(size: 48, semanticLabel: 'WAOUH IA'),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'WAOUH',
                        style: TextStyle(
                            fontSize: 20, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          _OnlineDot(),
                          SizedBox(width: 6),
                          Text(
                            'En ligne',
                            style: TextStyle(
                              color: Color(0xFF08756A),
                              fontWeight: FontWeight.w900,
                              fontSize: 12.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Assistant IA',
                        maxLines: 2,
                        style: TextStyle(
                          color: Color(0xFF667A73),
                          fontSize: 12.5,
                          height: 1.25,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: onDiscuss,
                  icon: const Icon(Icons.chat_bubble_outline_rounded, size: 17),
                  label: const Text('Discuter'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF08756A),
                    minimumSize: const Size(0, 42),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _AssistantQuickAction(
                    label: 'Vendre',
                    icon: Icons.sell_outlined,
                    onTap: onSell,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _AssistantQuickAction(
                    label: 'Acheter',
                    icon: Icons.search_rounded,
                    onTap: onBuy,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _AssistantQuickAction(
                    label: 'Négocier',
                    icon: Icons.handshake_outlined,
                    onTap: onNegotiate,
                  ),
                ),
              ],
            ),
          ],
        ),
      );
}

class _AssistantQuickAction extends StatelessWidget {
  const _AssistantQuickAction({
    required this.label,
    required this.icon,
    required this.onTap,
  });
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 16),
        label: FittedBox(fit: BoxFit.scaleDown, child: Text(label)),
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFF075E54),
          side: const BorderSide(color: Color(0xFFBFE3D5)),
          backgroundColor: Colors.white,
          minimumSize: const Size(0, 42),
          padding: const EdgeInsets.symmetric(horizontal: 7),
          textStyle:
              const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5),
        ),
      );
}

class _MatchTile extends StatelessWidget {
  const _MatchTile({required this.match, required this.archived});

  final LiveMatch match;
  final bool archived;

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    final unread = archived ? 0 : match.unreadCount;
    return Card(
      margin: const EdgeInsets.only(bottom: 9),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () async {
          await controller.markMatchRead(match);
          if (context.mounted) {
            context.go(
              '/app/chat/match/${Uri.encodeComponent(match.key)}',
              extra: match,
            );
          }
        },
        child: Padding(
          padding: const EdgeInsets.fromLTRB(11, 10, 8, 10),
          child: Row(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(13),
                    child: SizedBox(
                      width: 56,
                      height: 56,
                      child: _RemoteImage(
                        url: match.photo,
                        fallback: Icons.shopping_bag_outlined,
                      ),
                    ),
                  ),
                  if (unread > 0)
                    Positioned(
                      top: -6,
                      right: -6,
                      child: _CountBubble(value: unread, small: true),
                    ),
                ],
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            match.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              color:
                                  unread > 0 ? const Color(0xFF10211B) : null,
                            ),
                          ),
                        ),
                        if (unread > 0)
                          const Padding(
                            padding: EdgeInsets.only(left: 5),
                            child: Icon(
                              Icons.circle,
                              size: 9,
                              color: Color(0xFF22C98B),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      match.role == 'seller'
                          ? 'Acheteur intéressé'
                          : 'Nouvelle annonce correspondante',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF667A73),
                        fontSize: 12.5,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _compactTime(match.lastAt),
                      style: const TextStyle(
                        color: Color(0xFF667A73),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: archived ? 'Restaurer' : 'Archiver',
                onPressed: () => controller.archiveMatch(match, !archived),
                icon: Icon(
                  archived ? Icons.unarchive_outlined : Icons.archive_outlined,
                  color: const Color(0xFF667A73),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({required this.conversation});
  final LiveConversation conversation;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 9),
        child: ListTile(
          onTap: () => context.go('/app/chat/${conversation.id}'),
          leading: const CircleAvatar(
            backgroundColor: Color(0xFFE7F6F0),
            child: Icon(
              Icons.chat_bubble_outline_rounded,
              color: Color(0xFF08756A),
            ),
          ),
          title: Text(
            conversation.phoneNumber ?? 'Discussion WAOUH',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          subtitle: Text(
            conversation.lastMessage ?? 'Ouvrir la conversation',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          trailing: Text(
            _compactTime(conversation.updatedAt),
            style: const TextStyle(fontSize: 11, color: Color(0xFF667A73)),
          ),
        ),
      );
}

class _DiscussionEmpty extends StatelessWidget {
  const _DiscussionEmpty({required this.archived, required this.onNewChat});
  final bool archived;
  final VoidCallback onNewChat;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(top: 20),
        padding: const EdgeInsets.all(26),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFDCE8E3)),
          borderRadius: BorderRadius.circular(22),
        ),
        child: Column(
          children: [
            const Icon(Icons.forum_outlined,
                size: 48, color: Color(0xFF8AA19A)),
            const SizedBox(height: 12),
            Text(
              archived ? 'Aucune archive' : 'Aucune conversation',
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 6),
            Text(
              archived
                  ? 'Les discussions archivées apparaîtront ici.'
                  : 'Démarrez une recherche, une vente ou une négociation avec WAOUH.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF667A73), height: 1.35),
            ),
            if (!archived) ...[
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: onNewChat,
                icon: const Icon(Icons.add_rounded),
                label: const Text('Nouvelle discussion'),
              ),
            ],
          ],
        ),
      );
}

class _ProductionStatusFeed extends StatefulWidget {
  const _ProductionStatusFeed();

  @override
  State<_ProductionStatusFeed> createState() => _ProductionStatusFeedState();
}

class _ProductionStatusFeedState extends State<_ProductionStatusFeed> {
  String? _filter;

  Future<void> _openComposer() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const LiveStatusComposerScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 2, 16, 8),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Statuts actifs · 24 h',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                ),
              ),
              FilledButton.icon(
                onPressed: _openComposer,
                icon: const Icon(Icons.add_a_photo_outlined, size: 17),
                label: const Text('Publier'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 40),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _StatusFilter(
                  label: 'Tous',
                  icon: Icons.apps_rounded,
                  selected: _filter == null,
                  onTap: () => setState(() => _filter = null),
                ),
                _StatusFilter(
                  label: 'Ventes',
                  icon: Icons.sell_outlined,
                  selected: _filter == 'sell',
                  onTap: () => setState(() => _filter = 'sell'),
                ),
                _StatusFilter(
                  label: 'Recherches',
                  icon: Icons.search_rounded,
                  selected: _filter == 'buy',
                  onTap: () => setState(() => _filter = 'buy'),
                ),
                _StatusFilter(
                  label: 'Annonces',
                  icon: Icons.campaign_outlined,
                  selected: _filter == 'announce',
                  onTap: () => setState(() => _filter = 'announce'),
                ),
              ],
            ),
          ),
        ),
        Expanded(
          child: StreamBuilder<List<LiveStatus>>(
            stream: controller.statuses(type: _filter),
            builder: (_, snapshot) {
              final statuses = snapshot.data ?? const <LiveStatus>[];
              if (snapshot.connectionState == ConnectionState.waiting &&
                  statuses.isEmpty)
                return const Center(child: CircularProgressIndicator());
              if (statuses.isEmpty)
                return _StatusEmpty(onPublish: _openComposer);
              return ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 26),
                itemCount: statuses.length,
                itemBuilder: (_, index) =>
                    _ProductionStatusCard(status: statuses[index]),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _StatusFilter extends StatelessWidget {
  const _StatusFilter({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => FilterChip(
        selected: selected,
        onSelected: (_) => onTap(),
        label: Text(label),
        avatar: Icon(
          icon,
          size: 16,
          color: selected ? Colors.white : const Color(0xFF667A73),
        ),
        selectedColor: const Color(0xFF08756A),
        backgroundColor: Colors.white,
        side: BorderSide(
          color: selected ? const Color(0xFF08756A) : const Color(0xFFD8E5E0),
        ),
        labelStyle: TextStyle(
          color: selected ? Colors.white : const Color(0xFF40514B),
          fontWeight: FontWeight.w800,
        ),
      );
}

class _StatusEmpty extends StatelessWidget {
  const _StatusEmpty({required this.onPublish});
  final VoidCallback onPublish;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 26),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFE1EAE6)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 76,
                  height: 76,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFF4D9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.auto_awesome_rounded,
                    color: Color(0xFFE59016),
                    size: 34,
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Aucun statut actif',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Publiez une vente urgente, une recherche ou une promotion visible pendant 24 heures.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF667A73), height: 1.4),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: onPublish,
                    icon: const Icon(Icons.add_a_photo_outlined),
                    label: const Text('Publier un statut'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class _ProductionStatusCard extends StatelessWidget {
  const _ProductionStatusCard({required this.status});
  final LiveStatus status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status.type) {
      'sell' => const Color(0xFFE6505A),
      'buy' => const Color(0xFF08756A),
      _ => const Color(0xFFE59016),
    };
    final label = switch (status.type) {
      'sell' => 'Vente',
      'buy' => 'Recherche',
      _ => 'Annonce',
    };
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => LiveStatusViewer(status: status)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(11),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: SizedBox(
                  width: 76,
                  height: 76,
                  child: _RemoteImage(
                    url: status.mediaUrls.isEmpty
                        ? null
                        : status.mediaUrls.first,
                    fallback: status.type == 'sell'
                        ? Icons.sell_outlined
                        : status.type == 'buy'
                            ? Icons.search_rounded
                            : Icons.campaign_outlined,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            status.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: color.withOpacity(.12),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            label,
                            style: TextStyle(
                              color: color,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if ((status.caption ?? '').trim().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 3),
                        child: Text(
                          status.caption!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFF667A73),
                            fontSize: 12.5,
                          ),
                        ),
                      ),
                    const SizedBox(height: 7),
                    Wrap(
                      spacing: 9,
                      runSpacing: 4,
                      children: [
                        if (status.price != null)
                          Text(
                            '${liveRadarMoney(status.price!)} F',
                            style: const TextStyle(
                              color: Color(0xFF08756A),
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                            ),
                          ),
                        if ((status.location ?? '').trim().isNotEmpty)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                size: 13,
                                color: Color(0xFF667A73),
                              ),
                              const SizedBox(width: 2),
                              ConstrainedBox(
                                constraints: const BoxConstraints(
                                  maxWidth: 110,
                                ),
                                child: Text(
                                  status.location!,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Color(0xFF667A73),
                                    fontSize: 11.5,
                                  ),
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductionRadarFeed extends StatefulWidget {
  const _ProductionRadarFeed();

  @override
  State<_ProductionRadarFeed> createState() => _ProductionRadarFeedState();
}

class _ProductionRadarFeedState extends State<_ProductionRadarFeed>
    with WidgetsBindingObserver {
  final _service = LiveRadarService(legacy.supabase);
  LiveRadarFilters _filters = const LiveRadarFilters(photoOnly: false);
  List<LiveRadarItem> _items = const [];
  bool _loading = true;
  bool _paused = false;
  bool _radarMode = true;
  bool _approximate = false;
  String _location = 'Position actuelle';
  String? _pauseReason;
  double _latitude = 6.36;
  double _longitude = 2.42;
  Timer? _pauseTimer;
  DateTime? _pauseDeadline;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _initialize());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pauseTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _pause('Le Radar est suspendu pour limiter la consommation.');
    }
    if (state == AppLifecycleState.resumed &&
        _paused &&
        (_pauseReason ?? '').startsWith('Le Radar')) {
      _scan(refreshLocation: true);
    }
  }

  Future<void> _initialize() async {
    await _resolveLocation();
    await _scan();
  }

  Future<void> _resolveLocation() async {
    final controller = context.read<LiveWaouhController>();
    await controller.useDeviceLocation();
    final position = controller.position;
    final city = (await controller.city).trim();
    if (!mounted) return;
    setState(() {
      if (position.available) {
        _latitude = position.latitude!;
        _longitude = position.longitude!;
        _approximate = false;
        _location = city.isEmpty || city.toLowerCase() == 'autour de vous'
            ? 'Position actuelle'
            : city;
      } else {
        _latitude = 6.36;
        _longitude = 2.42;
        _approximate = true;
        _location = city.isEmpty ? 'Cotonou' : city;
      }
    });
  }

  Future<void> _scan({bool refreshLocation = false}) async {
    _pauseTimer?.cancel();
    if (mounted)
      setState(() {
        _loading = true;
        _paused = false;
        _pauseReason = null;
        _pauseDeadline = null;
      });
    if (refreshLocation) await _resolveLocation();
    try {
      final items = await _service.scan(
        latitude: _latitude,
        longitude: _longitude,
        filters: _filters,
      );
      if (mounted) setState(() => _items = items);
      _armPause();
    } catch (_) {
      if (mounted) setState(() => _items = const []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _armPause() {
    _pauseTimer?.cancel();
    final delay = _filters.urgent ? 30000 : _filters.autoPauseMs;
    if (delay == null) return;
    final deadline = DateTime.now().add(Duration(milliseconds: delay));
    setState(() => _pauseDeadline = deadline);
    _pauseTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (DateTime.now().isAfter(deadline)) {
        _pause('Pause automatique après le scan.');
      } else {
        setState(() {});
      }
    });
  }

  void _pause(String reason) {
    _pauseTimer?.cancel();
    if (mounted)
      setState(() {
        _paused = true;
        _pauseReason = reason;
        _pauseDeadline = null;
      });
  }

  int get _secondsRemaining => _pauseDeadline == null
      ? 0
      : math.max(0, _pauseDeadline!.difference(DateTime.now()).inSeconds);

  Future<void> _filtersSheet() async {
    final next = await showModalBottomSheet<LiveRadarFilters>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RadarFiltersSheet(value: _filters),
    );
    if (next == null) return;
    setState(() => _filters = next);
    await _scan();
  }

  Future<void> _toggleUrgent() async {
    setState(() => _filters = _filters.copyWith(urgent: !_filters.urgent));
    await _scan(refreshLocation: true);
  }

  Future<void> _openResult(LiveRadarItem item) async {
    final action = await showModalBottomSheet<_RadarAction>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RadarResultSheet(item: item),
    );
    if (action == null) return;
    final intent = switch (action) {
      _RadarAction.interest =>
        'Je suis intéressé par « ${item.title} » à ${item.distanceLabel}.',
      _RadarAction.negotiate =>
        'Je souhaite négocier « ${item.title} » à ${item.distanceLabel}.',
      _RadarAction.buy =>
        'Je veux acheter « ${item.title} » à ${item.distanceLabel}.',
      _RadarAction.propose =>
        'Je vends un article correspondant à « ${item.title} » à ${item.distanceLabel}.',
    };
    final controller = context.read<LiveWaouhController>();
    controller.setComposerSeed(
      intent,
      meta: {
        'source': 'flutter_radar',
        'auto_send': true,
        'radar_item_id': item.id,
        'radar_source': item.source,
        'article_id': item.articleId,
        'title': item.title,
        'distance': item.distanceLabel,
        if (item.priceMin != null) 'price': item.priceMin,
        if (item.currency != null) 'devise': item.currency,
        'radar_intent': action.name,
        'role': item.type == LiveRadarItemType.buy ? 'seller' : 'buyer',
      },
    );
    _pause('Action Radar préparée pour « ${item.title} ».');
    if (!mounted) return;
    if (!context.read<legacy.AuthController>().signedIn) {
      context.go('/app/auth?next=${Uri.encodeComponent('/app/chat/waouh')}');
    } else {
      context.go('/app/chat/waouh');
    }
  }

  @override
  Widget build(BuildContext context) => Column(
        children: [
          _RadarToolbar(
            urgent: _filters.urgent,
            filterCount: _filters.activeCount,
            loading: _loading,
            radarMode: _radarMode,
            paused: _paused,
            location: _location,
            approximate: _approximate,
            radiusKm: _filters.maxRadiusKm,
            results: _items.length,
            secondsRemaining: _secondsRemaining,
            onUrgent: _toggleUrgent,
            onFilters: _filtersSheet,
            onRefresh: () => _scan(refreshLocation: true),
            onToggleMode: () => setState(() => _radarMode = !_radarMode),
          ),
          if (_paused)
            _RadarPausedBanner(
              reason: _pauseReason ?? 'Le scan est suspendu.',
              onResume: () => _scan(refreshLocation: true),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => _scan(refreshLocation: true),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 26),
                children: [
                  if (_loading && _items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 80),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else ...[
                    if (_radarMode) ...[
                      _RadarScope(
                        items: _items,
                        maxRadiusKm: _filters.maxRadiusKm,
                        active: !_paused && !_loading,
                        onTap: _openResult,
                      ),
                      const SizedBox(height: 14),
                    ],
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Résultats à proximité',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        Text(
                          '${_items.length}',
                          style: const TextStyle(
                            color: Color(0xFF08756A),
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if (_items.isEmpty)
                      _RadarEmpty(
                        onFilters: _filtersSheet,
                        onRefresh: () => _scan(refreshLocation: true),
                      )
                    else
                      _RadarResultGrid(items: _items, onTap: _openResult),
                  ],
                ],
              ),
            ),
          ),
        ],
      );
}

class _RadarToolbar extends StatelessWidget {
  const _RadarToolbar({
    required this.urgent,
    required this.filterCount,
    required this.loading,
    required this.radarMode,
    required this.paused,
    required this.location,
    required this.approximate,
    required this.radiusKm,
    required this.results,
    required this.secondsRemaining,
    required this.onUrgent,
    required this.onFilters,
    required this.onRefresh,
    required this.onToggleMode,
  });

  final bool urgent;
  final int filterCount;
  final bool loading;
  final bool radarMode;
  final bool paused;
  final String location;
  final bool approximate;
  final int radiusKm;
  final int results;
  final int secondsRemaining;
  final VoidCallback onUrgent;
  final VoidCallback onFilters;
  final VoidCallback onRefresh;
  final VoidCallback onToggleMode;

  @override
  Widget build(BuildContext context) {
    final status = paused ? 'Pause' : (loading ? 'Scan...' : 'Live');
    final countdown =
        !paused && secondsRemaining > 0 ? '${secondsRemaining}s' : 'Auto';
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF062C28), Color(0xFF08756A), Color(0xFF111827)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33075E54),
            blurRadius: 24,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(.13),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.white.withOpacity(.14)),
                ),
                child: const Icon(
                  Icons.radar_rounded,
                  color: Color(0xFF38F2A1),
                  size: 30,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Radar WAOUH',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        height: 1.04,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Opportunités proches autour de $location${approximate ? ' · position estimée' : ''}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFFC8F8E4),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              Tooltip(
                message: radarMode ? 'Vue liste' : 'Vue radar',
                child: IconButton.filledTonal(
                  onPressed: onToggleMode,
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(.14),
                    foregroundColor: Colors.white,
                  ),
                  icon: Icon(
                    radarMode ? Icons.view_list_rounded : Icons.radar_rounded,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _RadarHeroMetric(label: 'Signaux', value: '$results'),
              const SizedBox(width: 8),
              _RadarHeroMetric(label: 'Portée', value: '$radiusKm km'),
              const SizedBox(width: 8),
              _RadarHeroMetric(label: status, value: countdown),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: onUrgent,
                icon: const Icon(Icons.sos_rounded, size: 18),
                label: const Text('Urgence'),
                style: FilledButton.styleFrom(
                  backgroundColor: urgent
                      ? const Color(0xFFE44B53)
                      : Colors.white.withOpacity(.15),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(0, 42),
                  padding: const EdgeInsets.symmetric(horizontal: 13),
                ),
              ),
              OutlinedButton.icon(
                onPressed: onFilters,
                icon: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const Icon(Icons.tune_rounded, size: 18),
                    if (filterCount > 0)
                      Positioned(
                        right: -9,
                        top: -8,
                        child: _CountBubble(value: filterCount, small: true),
                      ),
                  ],
                ),
                label: const Text('Filtres'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: BorderSide(color: Colors.white.withOpacity(.25)),
                  minimumSize: const Size(0, 42),
                  padding: const EdgeInsets.symmetric(horizontal: 13),
                ),
              ),
              OutlinedButton.icon(
                onPressed: loading ? null : onRefresh,
                icon: loading
                    ? const SizedBox(
                        width: 17,
                        height: 17,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Icon(
                        paused
                            ? Icons.play_arrow_rounded
                            : Icons.refresh_rounded,
                        size: 18,
                      ),
                label: Text(paused ? 'Relancer' : 'Scanner'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  disabledForegroundColor: Colors.white70,
                  side: BorderSide(color: Colors.white.withOpacity(.25)),
                  minimumSize: const Size(0, 42),
                  padding: const EdgeInsets.symmetric(horizontal: 13),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RadarHeroMetric extends StatelessWidget {
  const _RadarHeroMetric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(.12),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(.08)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFFBDEEDC),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      );
}

class _RadarPausedBanner extends StatelessWidget {
  const _RadarPausedBanner({required this.reason, required this.onResume});
  final String reason;
  final VoidCallback onResume;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFEAF9F2),
          border: Border.all(color: const Color(0xFFC8EAD9)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.pause_circle_outline_rounded,
              color: Color(0xFF08756A),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Radar en pause',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF075E54),
                    ),
                  ),
                  Text(
                    reason,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: Color(0xFF667A73),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            FilledButton.icon(
              onPressed: onResume,
              icon: const Icon(Icons.play_arrow_rounded, size: 17),
              label: const Text('Relancer'),
              style: FilledButton.styleFrom(
                minimumSize: const Size(0, 38),
                padding: const EdgeInsets.symmetric(horizontal: 10),
              ),
            ),
          ],
        ),
      );
}

class _RadarScope extends StatefulWidget {
  const _RadarScope({
    required this.items,
    required this.maxRadiusKm,
    required this.active,
    required this.onTap,
  });
  final List<LiveRadarItem> items;
  final int maxRadiusKm;
  final bool active;
  final ValueChanged<LiveRadarItem> onTap;

  @override
  State<_RadarScope> createState() => _RadarScopeState();
}

class _RadarScopeState extends State<_RadarScope>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animation = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 5),
  )..repeat();

  @override
  void dispose() {
    _animation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (_, constraints) {
          final side = math.min(constraints.maxWidth, 330.0);
          final center = side / 2;
          final radius = center - 13;
          return Center(
            child: SizedBox(
              width: side,
              height: side,
              child: Stack(
                children: [
                  CustomPaint(
                    size: Size.square(side),
                    painter: _RadarPainter(
                      animation: _animation,
                      maxRadiusKm: widget.maxRadiusKm,
                      active: widget.active,
                    ),
                  ),
                  ...widget.items.take(24).map((item) {
                    final ratio = math.sqrt(
                      (item.distanceKm / widget.maxRadiusKm).clamp(0.0, 1.0),
                    );
                    final pointRadius = math.max(27.0, radius * ratio);
                    final angle = (item.bearing - 90) * math.pi / 180;
                    final x = center + pointRadius * math.cos(angle);
                    final y = center + pointRadius * math.sin(angle);
                    return Positioned(
                      left: x - 20,
                      top: y - 20,
                      child: _RadarNode(
                        item: item,
                        onTap: () => widget.onTap(item),
                      ),
                    );
                  }),
                  Positioned(
                    bottom: 14,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(99),
                          border: Border.all(color: const Color(0xFFD8E5DF)),
                        ),
                        child: Text(
                          widget.active
                              ? 'Analyse autour de vous'
                              : 'Résultats enregistrés',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF075E54),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
}

class _RadarPainter extends CustomPainter {
  const _RadarPainter({
    required this.animation,
    required this.maxRadiusKm,
    required this.active,
  }) : super(repaint: animation);
  final Animation<double> animation;
  final int maxRadiusKm;
  final bool active;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 13;
    final bounds = Rect.fromCircle(center: center, radius: radius);
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..shader = const RadialGradient(
          colors: [Color(0xFF123F38), Color(0xFF062C28), Color(0xFF031A18)],
          stops: [.0, .62, 1],
        ).createShader(bounds),
    );
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = const Color(0x1A38F2A1)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );

    final grid = Paint()
      ..color = Colors.white.withOpacity(.14)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    for (final ring in liveRadarRings) {
      final ratio = math.sqrt(
        (math.min(ring.maxKm, maxRadiusKm) / maxRadiusKm).clamp(0.0, 1.0),
      );
      final ringRadius = math.max(22.0, radius * ratio).toDouble();
      canvas.drawCircle(
        center,
        ringRadius,
        grid..color = Color(ring.colorValue).withOpacity(.30),
      );
    }
    grid.color = Colors.white.withOpacity(.10);
    canvas.drawLine(
      Offset(center.dx, 12),
      Offset(center.dx, size.height - 12),
      grid,
    );
    canvas.drawLine(
      Offset(12, center.dy),
      Offset(size.width - 12, center.dy),
      grid,
    );

    if (active) {
      final angle = animation.value * math.pi * 2;
      final sweep = Path()
        ..moveTo(center.dx, center.dy)
        ..lineTo(
          center.dx + radius * math.cos(angle),
          center.dy + radius * math.sin(angle),
        )
        ..arcTo(
          Rect.fromCircle(center: center, radius: radius),
          angle,
          math.pi / 3.1,
          false,
        )
        ..close();
      canvas.drawPath(sweep, Paint()..color = const Color(0x7038F2A1));
      canvas.drawLine(
        center,
        center + Offset(math.cos(angle), math.sin(angle)) * radius,
        Paint()
          ..color = const Color(0xFF38F2A1)
          ..strokeWidth = 2,
      );
    }

    final pulse = 11 + animation.value * 16;
    canvas.drawCircle(
      center,
      pulse,
      Paint()
        ..color = const Color(0x5238F2A1)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
    canvas.drawCircle(center, 8, Paint()..color = const Color(0xFF38F2A1));
    canvas.drawCircle(center, 3, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant _RadarPainter oldDelegate) =>
      oldDelegate.maxRadiusKm != maxRadiusKm || oldDelegate.active != active;
}

class _RadarNode extends StatelessWidget {
  const _RadarNode({required this.item, required this.onTap});
  final LiveRadarItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkResponse(
        onTap: onTap,
        radius: 28,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Color(item.ring.colorValue), width: 2.5),
            boxShadow: const [
              BoxShadow(
                color: Color(0x33000000),
                blurRadius: 6,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: ClipOval(
            child: _RemoteImage(
              url: item.photoUrl,
              fallback: Icons.shopping_bag_outlined,
            ),
          ),
        ),
      );
}

class _RadarResultGrid extends StatelessWidget {
  const _RadarResultGrid({required this.items, required this.onTap});
  final List<LiveRadarItem> items;
  final ValueChanged<LiveRadarItem> onTap;

  @override
  Widget build(BuildContext context) => GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: math.min(items.length, 24),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: .79,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
        ),
        itemBuilder: (_, index) => _RadarResultCard(
            item: items[index], onTap: () => onTap(items[index])),
      );
}

class _RadarResultCard extends StatelessWidget {
  const _RadarResultCard({required this.item, required this.onTap});

  final LiveRadarItem item;
  final VoidCallback onTap;

  Color get _accent => switch (item.type) {
        LiveRadarItemType.sell => const Color(0xFF0A9E73),
        LiveRadarItemType.buy => const Color(0xFF2F6BFF),
        LiveRadarItemType.status => const Color(0xFFFF8A00),
      };

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFDDE9E4)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x12000000),
                blurRadius: 18,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      _RemoteImage(
                        url: item.photoUrl,
                        fallback: item.type == LiveRadarItemType.status
                            ? Icons.auto_awesome_rounded
                            : Icons.shopping_bag_outlined,
                      ),
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.transparent, Color(0xB0000000)],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                      Positioned(
                        left: 8,
                        top: 8,
                        child: _SignalPill(
                          label: item.distanceLabel,
                          color: Color(item.ring.colorValue),
                        ),
                      ),
                      Positioned(
                        right: 8,
                        top: 8,
                        child:
                            _SignalPill(label: item.typeLabel, color: _accent),
                      ),
                      Positioned(
                        left: 9,
                        right: 9,
                        bottom: 8,
                        child: Text(
                          item.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 13.5,
                            height: 1.05,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(10, 9, 10, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.priceLabel.isEmpty
                            ? (item.city ?? 'À proximité')
                            : item.priceLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w900,
                          color: _accent,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.location_on_outlined,
                            size: 13,
                            color: Color(0xFF667A73),
                          ),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              item.city ?? 'Autour de vous',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 10.8,
                                color: Color(0xFF667A73),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const Icon(
                            Icons.chevron_right_rounded,
                            size: 16,
                            color: Color(0xFF91A49D),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class _SignalPill extends StatelessWidget {
  const _SignalPill({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
        decoration: BoxDecoration(
          color: color.withOpacity(.92),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: Colors.white.withOpacity(.25)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 9.5,
            fontWeight: FontWeight.w900,
          ),
        ),
      );
}

class _RadarEmpty extends StatelessWidget {
  const _RadarEmpty({required this.onFilters, required this.onRefresh});
  final VoidCallback onFilters;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(top: 18),
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFE0EAE6)),
        ),
        child: Column(
          children: [
            const Icon(Icons.radar_rounded, size: 52, color: Color(0xFF8BA39B)),
            const SizedBox(height: 14),
            const Text(
              'Aucune opportunité trouvée',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 7),
            const Text(
              'Élargissez vos filtres ou actualisez votre position pour lancer un nouveau scan.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF667A73), height: 1.35),
            ),
            const SizedBox(height: 18),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              alignment: WrapAlignment.center,
              children: [
                OutlinedButton.icon(
                  onPressed: onFilters,
                  icon: const Icon(Icons.tune_rounded),
                  label: const Text('Filtres'),
                ),
                FilledButton.icon(
                  onPressed: onRefresh,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Actualiser'),
                ),
              ],
            ),
          ],
        ),
      );
}

enum _RadarAction { interest, negotiate, buy, propose }

class _RadarResultSheet extends StatelessWidget {
  const _RadarResultSheet({required this.item});
  final LiveRadarItem item;

  void _select(BuildContext context, String payload) {
    final action = payload.toLowerCase();
    Navigator.pop(
      context,
      action.startsWith('negocier')
          ? _RadarAction.negotiate
          : action.startsWith('proposer') || action.startsWith('contacter')
              ? _RadarAction.propose
              : action.startsWith('acheter')
                  ? _RadarAction.buy
                  : _RadarAction.interest,
    );
  }

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * .88,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 22),
            child: Column(children: [
              Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFC9D8D2),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(height: 12),
              LiveSmartProductPreview(
                product: item.toSmartProductMap(),
                onPayload: (payload) => _select(context, payload),
              ),
            ]),
          ),
        ),
      );
}

class _LegacyRadarResultSheet extends StatelessWidget {
  const _LegacyRadarResultSheet({required this.item});
  final LiveRadarItem item;

  Color get _accent => switch (item.type) {
        LiveRadarItemType.sell => const Color(0xFF0A9E73),
        LiveRadarItemType.buy => const Color(0xFF2F6BFF),
        LiveRadarItemType.status => const Color(0xFFFF8A00),
      };

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * .88,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    margin: const EdgeInsets.only(top: 10, bottom: 10),
                    width: 44,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFC9D8D2),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(18),
                  ),
                  child: SizedBox(
                    height: 235,
                    width: double.infinity,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        _RemoteImage(
                          url: item.photoUrl,
                          fallback: Icons.shopping_bag_outlined,
                        ),
                        const DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Colors.transparent, Color(0xD0061411)],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                          ),
                        ),
                        Positioned(
                          left: 16,
                          top: 14,
                          child: _SignalPill(
                            label: item.distanceLabel,
                            color: Color(item.ring.colorValue),
                          ),
                        ),
                        Positioned(
                          right: 16,
                          top: 14,
                          child: _SignalPill(
                              label: item.typeLabel, color: _accent),
                        ),
                        Positioned(
                          left: 18,
                          right: 18,
                          bottom: 18,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.w900,
                                  height: 1.06,
                                ),
                              ),
                              if (item.priceLabel.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 7),
                                  child: Text(
                                    item.priceLabel,
                                    style: const TextStyle(
                                      color: Color(0xFF38F2A1),
                                      fontSize: 18,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if ((item.description ?? '').trim().isNotEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF6FAF8),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFE0EAE6)),
                          ),
                          child: Text(
                            item.description!,
                            maxLines: 5,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF465A53),
                              height: 1.38,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 12,
                        runSpacing: 8,
                        children: [
                          _SheetMeta(
                            icon: Icons.location_on_outlined,
                            text:
                                '${item.city ?? 'À proximité'} · ${item.distanceLabel}',
                          ),
                          _SheetMeta(
                            icon: Icons.schedule_outlined,
                            text:
                                'Mis à jour il y a ${liveRadarFreshness(item.freshnessMs)}',
                          ),
                          if (item.sellerName != null &&
                              item.sellerName!.isNotEmpty)
                            _SheetMeta(
                              icon: Icons.person_outline_rounded,
                              text: item.sellerName!,
                            ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () =>
                                  Navigator.pop(context, _RadarAction.interest),
                              icon: const Icon(
                                Icons.chat_bubble_outline_rounded,
                                size: 17,
                              ),
                              label: const Text('Intéressé'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => Navigator.pop(
                                  context, _RadarAction.negotiate),
                              icon: const Icon(Icons.handshake_outlined,
                                  size: 17),
                              label: const Text('Négocier'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: () =>
                                  Navigator.pop(context, _RadarAction.buy),
                              icon:
                                  const Icon(Icons.flash_on_rounded, size: 17),
                              label: const Text('Acheter'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class _SheetMeta extends StatelessWidget {
  const _SheetMeta({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF667A73)),
          const SizedBox(width: 4),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 210),
            child: Text(
              text,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11.5, color: Color(0xFF667A73)),
            ),
          ),
        ],
      );
}

class _RadarFiltersSheet extends StatefulWidget {
  const _RadarFiltersSheet({required this.value});
  final LiveRadarFilters value;

  @override
  State<_RadarFiltersSheet> createState() => _RadarFiltersSheetState();
}

class _RadarFiltersSheetState extends State<_RadarFiltersSheet> {
  late LiveRadarFilters _value = widget.value;
  late final _category = TextEditingController(text: _value.category ?? '');
  late final _priceMin = TextEditingController(
    text: _value.priceMin?.toString() ?? '',
  );
  late final _priceMax = TextEditingController(
    text: _value.priceMax?.toString() ?? '',
  );

  @override
  void dispose() {
    _category.dispose();
    _priceMin.dispose();
    _priceMax.dispose();
    super.dispose();
  }

  void _toggleType(LiveRadarItemType type) {
    final types = [..._value.types];
    types.contains(type) ? types.remove(type) : types.add(type);
    setState(() => _value = _value.copyWith(types: types));
  }

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * .85,
          ),
          padding: EdgeInsets.fromLTRB(
            18,
            10,
            18,
            18 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFC9D8D2),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Filtres du Radar',
                  style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 16),
                const Text('Type',
                    style: TextStyle(fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: LiveRadarItemType.values
                      .map(
                        (type) => FilterChip(
                          label: Text(type.label),
                          selected: _value.types.contains(type),
                          onSelected: (_) => _toggleType(type),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _category,
                  decoration: const InputDecoration(
                    labelText: 'Catégorie',
                    hintText: 'Ex. Électronique',
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _priceMin,
                        keyboardType: TextInputType.number,
                        decoration:
                            const InputDecoration(labelText: 'Prix min'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _priceMax,
                        keyboardType: TextInputType.number,
                        decoration:
                            const InputDecoration(labelText: 'Prix max'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _value.photoOnly,
                  onChanged: (value) => setState(
                      () => _value = _value.copyWith(photoOnly: value)),
                  title: const Text('Avec photo uniquement'),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _value.verifiedOnly,
                  onChanged: (value) => setState(
                      () => _value = _value.copyWith(verifiedOnly: value)),
                  title: const Text('Vendeurs vérifiés uniquement'),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () {
                      final min = num.tryParse(
                        _priceMin.text
                            .trim()
                            .replaceAll(' ', '')
                            .replaceAll(',', '.'),
                      );
                      final max = num.tryParse(
                        _priceMax.text
                            .trim()
                            .replaceAll(' ', '')
                            .replaceAll(',', '.'),
                      );
                      final category = _category.text.trim();
                      Navigator.pop(
                        context,
                        _value.copyWith(
                          category: category,
                          clearCategory: category.isEmpty,
                          priceMin: min,
                          clearPriceMin: min == null,
                          priceMax: max,
                          clearPriceMax: max == null,
                        ),
                      );
                    },
                    child: const Text('Appliquer les filtres'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class _ProfileAvatar extends StatelessWidget {
  const _ProfileAvatar({
    required this.name,
    required this.imageUrl,
    required this.onTap,
  });
  final String name;
  final String? imageUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final initials = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((item) => item.isNotEmpty)
        .take(2)
        .map((item) => item[0])
        .join()
        .toUpperCase();
    return InkResponse(
      onTap: onTap,
      radius: 19,
      child: CircleAvatar(
        radius: 23,
        backgroundColor: const Color(0xFF0CA4B5),
        backgroundImage: imageUrl == null || imageUrl!.isEmpty
            ? null
            : NetworkImage(imageUrl!),
        child: imageUrl == null || imageUrl!.isEmpty
            ? Text(
                initials.isEmpty ? 'W' : initials,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              )
            : null,
      ),
    );
  }
}

class _HeaderIcon extends StatelessWidget {
  const _HeaderIcon({
    required this.icon,
    required this.count,
    required this.tooltip,
    required this.onTap,
  });
  final IconData icon;
  final int count;
  final String tooltip;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Stack(
        clipBehavior: Clip.none,
        children: [
          IconButton(
            onPressed: onTap,
            tooltip: tooltip,
            iconSize: 23,
            visualDensity: VisualDensity.compact,
            icon: Icon(icon),
          ),
          if (count > 0)
            Positioned(
              top: 2,
              right: 2,
              child: _CountBubble(value: count, small: true),
            ),
        ],
      );
}

class _CountBubble extends StatelessWidget {
  const _CountBubble({required this.value, this.small = false});
  final int value;
  final bool small;
  @override
  Widget build(BuildContext context) => Container(
        constraints: BoxConstraints(
          minWidth: small ? 18 : 22,
          minHeight: small ? 18 : 22,
        ),
        padding: EdgeInsets.symmetric(horizontal: small ? 4 : 6),
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          color: Color(0xFFE44B53),
          shape: BoxShape.circle,
        ),
        child: Text(
          value > 99 ? '99+' : '$value',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: small ? 10 : 11,
          ),
        ),
      );
}

class _OnlineDot extends StatelessWidget {
  const _OnlineDot();
  @override
  Widget build(BuildContext context) => Container(
        width: 8,
        height: 8,
        decoration: const BoxDecoration(
          color: Color(0xFF22D98C),
          shape: BoxShape.circle,
        ),
      );
}

class _RemoteImage extends StatelessWidget {
  const _RemoteImage({required this.url, required this.fallback});
  final String? url;
  final IconData fallback;
  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty)
      return ColoredBox(
        color: const Color(0xFFE8F4EF),
        child: Center(
          child: Icon(fallback, color: const Color(0xFF08756A), size: 28),
        ),
      );
    return Image.network(
      url!,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => ColoredBox(
        color: const Color(0xFFE8F4EF),
        child: Center(
          child: Icon(fallback, color: const Color(0xFF08756A), size: 28),
        ),
      ),
    );
  }
}

String _compactTime(DateTime value) {
  final local = value.toLocal();
  final diff = DateTime.now().difference(local);
  if (diff.inMinutes < 1) return 'Maintenant';
  if (diff.inMinutes < 60) return '${diff.inMinutes} min';
  if (local.day == DateTime.now().day &&
      local.month == DateTime.now().month &&
      local.year == DateTime.now().year)
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}';
}

class _DistancePill extends StatelessWidget {
  const _DistancePill({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(.14),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color.withOpacity(.45)),
        ),
        child: Text(
          label,
          style: TextStyle(
              color: color, fontSize: 12, fontWeight: FontWeight.w900),
        ),
      );
}
