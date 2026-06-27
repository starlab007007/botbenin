import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_controller.dart';
import 'live_controller_match_actions.dart';
import 'live_models.dart';
import 'live_status_screen.dart';
import 'live_widgets.dart';

class LiveInboxScreenV2 extends StatefulWidget {
  const LiveInboxScreenV2({super.key});

  @override
  State<LiveInboxScreenV2> createState() => _LiveInboxScreenV2State();
}

class _LiveInboxScreenV2State extends State<LiveInboxScreenV2> {
  final _search = TextEditingController();
  var _tab = 0;
  var _archives = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<LiveWaouhController>().initialize());
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

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    final controller = context.read<LiveWaouhController>();
    return Scaffold(
      appBar: LiveHeader(
        title: auth.profile?.fullName ?? 'WaouhApp',
        subtitle: auth.signedIn ? 'WAOUH actif' : 'Invite',
        actions: [
          StreamBuilder<List<LiveNotification>>(
            stream: controller.notificationItems(),
            builder: (_, snapshot) {
              final count = (snapshot.data ?? const <LiveNotification>[]).where((item) => !item.read).length;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  IconButton(onPressed: () => context.go('/app/notifications'), icon: const Icon(Icons.notifications_none_rounded)),
                  if (count > 0)
                    Positioned(
                      top: 4,
                      right: 4,
                      child: CircleAvatar(
                        radius: 9,
                        backgroundColor: legacy.WaouhColors.red,
                        child: Text('$count', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900)),
                      ),
                    ),
                ],
              );
            },
          ),
          IconButton(onPressed: _newChat, icon: const Icon(Icons.add_rounded), tooltip: 'Nouveau chat WAOUH'),
        ],
      ),
      body: Column(children: [
        Container(
          color: legacy.WaouhColors.green,
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
          child: TextField(
            controller: _search,
            onChanged: (_) => setState(() {}),
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Rechercher discussions, statuts...',
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
            segments: const [
              ButtonSegment(value: 0, label: Text('Discussions')),
              ButtonSegment(value: 1, label: Text('Statuts · 24h')),
            ],
            selected: {_tab},
            onSelectionChanged: (value) => setState(() => _tab = value.first),
          ),
        ),
        Expanded(
          child: _tab == 1
              ? const LiveStatusFeed()
              : _DiscussionHistory(
                  archives: _archives,
                  matches: _matches,
                  onNewChat: _newChat,
                  onToggleArchives: () => setState(() => _archives = !_archives),
                ),
        ),
      ]),
    );
  }
}

class _DiscussionHistory extends StatelessWidget {
  const _DiscussionHistory({
    required this.archives,
    required this.matches,
    required this.onNewChat,
    required this.onToggleArchives,
  });

  final bool archives;
  final bool Function(String text) matches;
  final VoidCallback onNewChat;
  final VoidCallback onToggleArchives;

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    return StreamBuilder<List<LiveMatch>>(
      stream: controller.matches(archived: archives),
      builder: (_, matchSnapshot) => StreamBuilder<List<LiveConversation>>(
        stream: controller.conversations(archived: archives),
        builder: (_, conversationSnapshot) {
          final productMatches = (matchSnapshot.data ?? const <LiveMatch>[])
              .where((item) => matches('${item.title} ${item.city ?? ''} ${item.seedText ?? ''} ${item.price ?? ''}'))
              .toList();
          final conversations = (conversationSnapshot.data ?? const <LiveConversation>[])
              .where((item) => matches('${item.phoneNumber ?? ''} ${item.lastMessage ?? ''}'))
              .toList();
          final empty = productMatches.isEmpty && conversations.isEmpty;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              _WaouhCard(onTap: () => context.go('/app/chat/waouh')),
              const SizedBox(height: 20),
              Row(children: [
                Expanded(child: Text(archives ? 'HISTORIQUE DES CONVERSATIONS' : 'CONVERSATIONS PRODUIT', style: const TextStyle(fontWeight: FontWeight.w900, color: legacy.WaouhColors.muted))),
                TextButton.icon(
                  onPressed: onToggleArchives,
                  icon: Icon(archives ? Icons.forum_outlined : Icons.archive_outlined, size: 18),
                  label: Text(archives ? 'Actives' : 'Archives'),
                ),
              ]),
              if (productMatches.isNotEmpty) ...productMatches.map((match) => _MatchRow(match: match, archived: archives)),
              if (conversations.isNotEmpty) ...conversations.map((conversation) => _ConversationRow(conversation: conversation, archived: archives)),
              if (empty) _EmptyConversations(archived: archives, onNewChat: onNewChat),
            ],
          );
        },
      ),
    );
  }
}

class _WaouhCard extends StatelessWidget {
  const _WaouhCard({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    color: const Color(0xFFECFFF5),
    child: InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: const Padding(
        padding: EdgeInsets.all(16),
        child: Row(children: [
          CircleAvatar(radius: 28, backgroundColor: legacy.WaouhColors.jade, child: Icon(Icons.shopping_bag_outlined, color: Colors.white)),
          SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Text('WAOUH', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)), SizedBox(width: 8), Chip(label: Text('IA'), visualDensity: VisualDensity.compact)]),
            Text('Achetez · Vendez · Négociez par message', style: TextStyle(color: legacy.WaouhColors.muted, fontWeight: FontWeight.w700)),
          ])),
          Text('Toujours actif', style: TextStyle(color: legacy.WaouhColors.muted, fontSize: 12)),
        ]),
      ),
    ),
  );
}

class _MatchRow extends StatelessWidget {
  const _MatchRow({required this.match, required this.archived});
  final LiveMatch match;
  final bool archived;

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    final when = '${match.lastAt.toLocal().day.toString().padLeft(2, '0')} ${_month(match.lastAt.toLocal().month)}, ${match.lastAt.toLocal().hour.toString().padLeft(2, '0')}:${match.lastAt.toLocal().minute.toString().padLeft(2, '0')}';
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: () async {
          await controller.markMatchRead(match);
          if (context.mounted) context.go('/app/chat/match/${Uri.encodeComponent(match.key)}', extra: match);
        },
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: SizedBox(
            height: 50,
            width: 50,
            child: match.photo == null
                ? const ColoredBox(color: Color(0xFFEAF7F1), child: Icon(Icons.shopping_bag_outlined))
                : Image.network(match.photo!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const ColoredBox(color: Color(0xFFEAF7F1), child: Icon(Icons.shopping_bag_outlined))),
          ),
        ),
        title: Row(children: [
          Expanded(child: Text(match.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900))),
          if (match.unread && !archived) const Icon(Icons.circle, color: Color(0xFF24E58F), size: 11),
        ]),
        subtitle: Text('${match.role == 'seller' ? 'Acheteur intéressé' : 'Nouvelle annonce correspondante'}${match.city == null ? '' : ' · ${match.city}'}\n$when', maxLines: 2, overflow: TextOverflow.ellipsis),
        isThreeLine: true,
        trailing: IconButton(
          tooltip: archived ? 'Restaurer' : 'Archiver',
          onPressed: () => controller.archiveMatch(match, !archived),
          icon: Icon(archived ? Icons.unarchive_outlined : Icons.archive_outlined),
        ),
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
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: legacy.WaouhColors.muted,
        child: const Icon(Icons.archive_outlined, color: Colors.white),
      ),
      confirmDismiss: (_) async { await controller.archiveConversation(conversation.id); return false; },
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          onTap: () => context.go('/app/chat/${conversation.id}'),
          leading: const CircleAvatar(child: Icon(Icons.chat_bubble_outline)),
          title: Text(conversation.phoneNumber ?? 'Discussion WAOUH'),
          subtitle: Text(conversation.lastMessage ?? 'Ouvrir la conversation', maxLines: 1, overflow: TextOverflow.ellipsis),
          trailing: archived ? const Icon(Icons.archive_outlined, color: legacy.WaouhColors.muted) : null,
        ),
      ),
    );
  }
}

class _EmptyConversations extends StatelessWidget {
  const _EmptyConversations({required this.archived, required this.onNewChat});
  final bool archived;
  final VoidCallback onNewChat;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(children: [
        const Icon(Icons.forum_outlined, size: 48, color: legacy.WaouhColors.muted),
        const SizedBox(height: 12),
        Text(archived ? 'Aucune conversation archivée' : 'Aucune autre conversation', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
        const SizedBox(height: 8),
        Text(archived ? 'Les discussions archivées apparaîtront ici.' : 'Envoyez un message à WAOUH et le Monde achète.', textAlign: TextAlign.center),
        if (!archived) ...[
          const SizedBox(height: 18),
          FilledButton.icon(onPressed: onNewChat, icon: const Icon(Icons.add), label: const Text('Nouveau chat WAOUH')),
        ],
      ]),
    ),
  );
}

String _month(int month) => const ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'][month - 1];
