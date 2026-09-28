import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'live_commerce_agent_ui.dart';
import 'live_controller.dart';
import 'live_models.dart';

/// Enveloppe visuelle commune au chat principal et aux Deal Rooms Flutter.
///
/// Le Web /app/chat reste la référence. Ce fichier ne contient aucune logique
/// métier : il expose uniquement la navigation, les onglets et le chrome
/// premium autour du même moteur WAOUH.
class LiveWebParityChatHeader extends StatelessWidget
    implements PreferredSizeWidget {
  const LiveWebParityChatHeader({
    super.key,
    this.back = false,
    this.mode = LiveMuseMode.neutral,
    this.phase = LiveMusePhase.idle,
    this.subtitle = 'Muse · NEXUS · Signal · Deal Room',
    this.onNewGoal,
    this.onIntelligence,
    this.trailing = const <Widget>[],
  });

  final bool back;
  final LiveMuseMode mode;
  final LiveMusePhase phase;
  final String subtitle;
  final VoidCallback? onNewGoal;
  final VoidCallback? onIntelligence;
  final List<Widget> trailing;

  @override
  Size get preferredSize => const Size.fromHeight(54);

  @override
  Widget build(BuildContext context) => AppBar(
        automaticallyImplyLeading: false,
        toolbarHeight: 54,
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.white.withValues(alpha: .97),
        surfaceTintColor: Colors.transparent,
        leadingWidth: back ? 46 : 8,
        leading: back
            ? IconButton(
                tooltip: 'Retour',
                onPressed: () => context.canPop()
                    ? context.pop()
                    : context.go('/app/chat'),
                icon: const Icon(Icons.arrow_back_rounded, size: 21),
              )
            : null,
        titleSpacing: back ? 2 : 10,
        title: Row(
          children: [
            LiveMuseAvatar(mode: mode, phase: phase, size: 34),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Flexible(
                        child: Text(
                          'WAOUH One',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Color(0xFF0C241F),
                            fontSize: 15.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -.25,
                          ),
                        ),
                      ),
                      SizedBox(width: 6),
                      _LiveDot(),
                    ],
                  ),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF6A7D77),
                      fontSize: 9.7,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (onIntelligence != null)
            IconButton(
              tooltip: 'Intelligence WAOUH',
              onPressed: onIntelligence,
              icon: const Icon(Icons.hub_outlined, size: 20),
            ),
          if (onNewGoal != null)
            IconButton(
              tooltip: 'Nouvel objectif',
              onPressed: onNewGoal,
              icon: const Icon(Icons.add_comment_outlined, size: 20),
            ),
          IconButton(
            tooltip: 'Conversations',
            onPressed: () => context.push('/app/chat/inbox'),
            icon: const Icon(Icons.forum_outlined, size: 20),
          ),
          IconButton(
            tooltip: 'Notifications',
            onPressed: () => context.push('/app/notifications'),
            icon: const Icon(Icons.notifications_none_rounded, size: 20),
          ),
          ...trailing,
          const SizedBox(width: 2),
        ],
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: Color(0xFFE6ECE9)),
        ),
      );
}

class _LiveDot extends StatelessWidget {
  const _LiveDot();
  @override
  Widget build(BuildContext context) => Container(
        width: 6,
        height: 6,
        decoration: const BoxDecoration(
          color: Color(0xFF10B981),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(color: Color(0x5510B981), blurRadius: 6, spreadRadius: 1),
          ],
        ),
      );
}

/// Même principe que les onglets Web : WAOUH principal + Deal Rooms actives.
/// Le thread canonique reste fourni par le backend ; ce widget ne crée aucun
/// fil local.
class LiveWebParityChatTabs extends StatelessWidget {
  const LiveWebParityChatTabs({
    super.key,
    this.activeKey = 'main',
  });

  final String activeKey;

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    return StreamBuilder<List<LiveMatch>>(
      stream: controller.matches(archived: false),
      builder: (_, snapshot) {
        final matches = List<LiveMatch>.from(snapshot.data ?? const <LiveMatch>[])
          ..sort((a, b) => b.lastAt.compareTo(a.lastAt));
        final visible = matches.take(6).toList(growable: false);
        if (visible.isEmpty && activeKey == 'main') {
          return const SizedBox.shrink();
        }
        return Container(
          height: 42,
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: Color(0xFFEDF1EF))),
          ),
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(8, 5, 8, 5),
            children: [
              _ChatTab(
                label: 'WAOUH',
                icon: Icons.auto_awesome_rounded,
                active: activeKey == 'main',
                onTap: () => context.go('/app/chat'),
              ),
              ...visible.map(
                (match) => Padding(
                  padding: const EdgeInsets.only(left: 6),
                  child: _ChatTab(
                    label: match.title,
                    icon: match.role == 'seller'
                        ? Icons.shopping_bag_outlined
                        : Icons.shopping_cart_outlined,
                    active: activeKey == match.key,
                    unread: match.unread,
                    onTap: () => context.go(
                      '/app/chat/match/\${Uri.encodeComponent(match.key)}',
                      extra: match,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ChatTab extends StatelessWidget {
  const _ChatTab({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
    this.unread = false,
  });

  final String label;
  final IconData icon;
  final bool active;
  final bool unread;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: active ? const Color(0xFFEAF8F2) : const Color(0xFFF8FAF9),
        borderRadius: BorderRadius.circular(999),
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onTap,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 180),
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: active
                    ? const Color(0xFFB8E1D2)
                    : const Color(0xFFE4EAE7),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  size: 14,
                  color: active
                      ? const Color(0xFF08745D)
                      : const Color(0xFF71817B),
                ),
                const SizedBox(width: 5),
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: active
                          ? const Color(0xFF075C4C)
                          : const Color(0xFF51605B),
                      fontSize: 10.7,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                if (unread) ...[
                  const SizedBox(width: 5),
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: Color(0xFF2368FF),
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
}

class LiveWebParityComposerFrame extends StatelessWidget {
  const LiveWebParityComposerFrame({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        minimum: const EdgeInsets.fromLTRB(8, 3, 8, 8),
        child: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFDDE6E2)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF15372F).withValues(alpha: .10),
                blurRadius: 28,
                offset: const Offset(0, 10),
                spreadRadius: -10,
              ),
            ],
          ),
          child: child,
        ),
      );
}
