import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_controller.dart';
import 'live_models.dart';
import 'live_status_screen.dart';
import 'live_widgets.dart';

class LiveInboxScreen extends StatefulWidget {
  const LiveInboxScreen({super.key});

  @override
  State<LiveInboxScreen> createState() => _LiveInboxScreenState();
}

class _LiveInboxScreenState extends State<LiveInboxScreen> {
  int tab = 0;
  bool showArchive = false;
  final search = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<LiveWaouhController>().initialize());
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    return Scaffold(
      appBar: LiveHeader(
        title: auth.profile?.fullName ?? 'WaouhApp',
        subtitle: auth.signedIn ? 'WAOUH actif' : 'Invite',
        actions: [
          IconButton(onPressed: () => context.go('/app/notifications'), icon: const Icon(Icons.notifications_none_rounded)),
          IconButton(onPressed: () async {
            await context.read<LiveWaouhController>().startNewChat();
            if (context.mounted) context.go('/app/chat/waouh');
          }, icon: const Icon(Icons.add_rounded)),
        ],
      ),
      body: Column(children: [
        Container(
          color: legacy.WaouhColors.green,
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
          child: TextField(
            controller: search,
            onChanged: (_) => setState(() {}),
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Rechercher discussions, statuts...',
              hintStyle: TextStyle(color: Colors.white.withOpacity(.68)),
              prefixIcon: const Icon(Icons.search, color: Colors.white70),
              fillColor: Colors.white.withOpacity(.14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
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
            selected: {tab},
            onSelectionChanged: (selection) => setState(() => tab = selection.first),
          ),
        ),
        Expanded(child: tab == 0 ? _LiveDiscussionList(search: search.text, archive: showArchive, onToggleArchive: () => setState(() => showArchive = !showArchive)) : const LiveStatusFeed()),
      ]),
    );
  }
}

class _LiveDiscussionList extends StatelessWidget {
  const _LiveDiscussionList({required this.search, required this.archive, required this.onToggleArchive});
  final String search;
  final bool archive;
  final VoidCallback onToggleArchive;

  bool _matches(String value) => search.trim().isEmpty || value.toLowerCase().contains(search.trim().toLowerCase());

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    final auth = context.watch<legacy.AuthController>();
    return StreamBuilder<List<LiveMatch>>(
      stream: controller.matches(archived: archive),
      builder: (_, matchSnapshot) => StreamBuilder<List<LiveConversation>>(
        stream: controller.conversations(archived: archive),
        builder: (_, conversationSnapshot) {
          final matches = (matchSnapshot.data ?? const <LiveMatch>[]).where((item) => _matches('${item.title} ${item.city ?? ''} ${item.price ?? ''}')).toList();
          final conversations = (conversationSnapshot.data ?? const <LiveConversation>[]).where((item) => _matches('${item.phoneNumber ?? ''} ${item.lastMessage ?? ''}')).toList();
          return ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 24), children: [
            Card(
              color: const Color(0xFFECFFF5),
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () async {
                  if (!auth.signedIn && (await controller.session.guestMessageCount) >= 10) {
                    if (context.mounted) context.go('/app/auth?next=%2Fapp%2Fchat%2Fwaouh');
                    return;
                  }
                  if (context.mounted) context.go('/app/chat/waouh');
                },
                child: const Padding(
                  padding: EdgeInsets.all(16),
                  child: Row(children: [
                    CircleAvatar(radius: 28, backgroundColor: legacy.WaouhColors.jade, child: Icon(Icons.shopping_bag_outlined, color: Colors.white)),
                    SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [Text('WAOUH', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)), SizedBox(width: 8), Chip(label: Text('IA'), visualDensity: VisualDensity.compact)]),
                      Text('Achetez · Vendez · Negociez par message', style: TextStyle(color: legacy.WaouhColors.muted, fontWeight: FontWeight.w700)),
                    ])),
                  ]),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(children: [
              const Expanded(child: Text('CONVERSATIONS PRODUIT', style: TextStyle(fontWeight: FontWeight.w900, color: legacy.WaouhColors.muted))),
              TextButton(onPressed: onToggleArchive, child: Text(archive ? 'Actives' : 'Archives')),
            ]),
            if (matches.isEmpty && conversations.isEmpty)
              Card(child: Padding(padding: const EdgeInsets.all(28), child: Column(children: const [
                Icon(Icons.forum_outlined, size: 48, color: legacy.WaouhColors.muted),
                SizedBox(height: 12),
                Text('Aucune autre conversation', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
                SizedBox(height: 8),
                Text('Envoyez un message a WAOUH et le Monde achete.', textAlign: TextAlign.center),
              ]))),
            ...matches.map((match) => Card(
              child: ListTile(
                leading: match.photo == null ? const CircleAvatar(child: Icon(Icons.shopping_bag_outlined)) : CircleAvatar(backgroundImage: NetworkImage(match.photo!)),
                title: Text(match.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text('${match.role == 'seller' ? 'Acheteur interesse' : 'Match produit'}${match.city == null ? '' : ' · ${match.city}'}'),
                trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [if (match.unread) const Icon(Icons.circle, color: legacy.WaouhColors.neon, size: 12), Text('${match.lastAt.toLocal().hour.toString().padLeft(2, '0')}:${match.lastAt.toLocal().minute.toString().padLeft(2, '0')}', style: const TextStyle(fontSize: 11))]),
                onTap: () => context.go('/app/chat/match/${Uri.encodeComponent(match.key)}', extra: match),
              ),
            )),
            ...conversations.map((conversation) => Dismissible(
              key: ValueKey(conversation.id),
              direction: archive ? DismissDirection.none : DismissDirection.endToStart,
              background: Container(alignment: Alignment.centerRight, padding: const EdgeInsets.only(right: 20), color: legacy.WaouhColors.muted, child: const Icon(Icons.archive_outlined, color: Colors.white)),
              confirmDismiss: (_) async { await controller.archiveConversation(conversation.id); return false; },
              child: Card(child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.chat_bubble_outline)),
                title: Text(conversation.phoneNumber ?? 'Discussion WAOUH'),
                subtitle: Text(conversation.lastMessage ?? 'Ouvrir la conversation', maxLines: 1, overflow: TextOverflow.ellipsis),
                onTap: () => context.go('/app/chat/${conversation.id}'),
              )),
            )),
          ]);
        },
      ),
    );
  }
}
