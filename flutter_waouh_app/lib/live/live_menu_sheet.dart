import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import 'access_policy.dart';
import 'live_frontend_modules.dart';
import 'live_theme.dart';

/// Menu « tous les modules » — parité Web `WorkspaceMenuSheet` /
/// `erp/navigation.ts` (mêmes sections, mêmes libellés, même ordre).
class LiveMenuItem {
  const LiveMenuItem(this.label, this.route, this.icon,
      {this.external = false, this.moduleKey});
  final String label;
  final String route;
  final IconData icon;
  final bool external;
  /// Clé public.waouh_frontend_modules (parité src/erp/navigation.ts) :
  /// quand elle est renseignée, l'administrateur peut masquer ce module
  /// (voir /admin/modules). `null` = élément propre à Flutter ou en
  /// décalage avec le Web (ex. route différente) : toujours visible.
  final String? moduleKey;
}

class LiveMenuSection {
  const LiveMenuSection(this.title, this.items);
  final String title;
  final List<LiveMenuItem> items;
}

// moduleKey aligné sur src/erp/navigation.ts. Laissé à null pour les
// éléments propres à Flutter (Versements, Paiements) ou dont la route a
// dérivé du Web (Agents IA → /app/agents/new ici vs /app/whatsapp/select-agent
// côté Web) : non gérés par l'admin tant que cet écart n'est pas résolu.
const liveMenuSections = <LiveMenuSection>[
  LiveMenuSection('Communication', [
    LiveMenuItem('Chat Command Center', '/app/chat', Icons.forum_outlined,
        moduleKey: 'chat'),
    LiveMenuItem('Radar', '/app/radar-map', Icons.radar_rounded,
        moduleKey: 'radar'),
    LiveMenuItem('WhatsApp IA', '/app/whatsapp', Icons.groups_2_outlined,
        moduleKey: 'whatsapp'),
    LiveMenuItem('Diffusion', '/app/diffusion', Icons.campaign_outlined,
        moduleKey: 'diffusion'),
  ]),
  LiveMenuSection('Agents IA', [
    LiveMenuItem('Avatar', '/app/avatar', Icons.auto_awesome_rounded,
        moduleKey: 'avatar'),
    LiveMenuItem(
        'Missions & veille', '/app/missions', Icons.account_tree_outlined,
        moduleKey: 'missions'),
    LiveMenuItem('Bots', '/app/bots', Icons.smart_toy_outlined,
        moduleKey: 'bots'),
    LiveMenuItem('Agents IA', '/app/agents/new', Icons.auto_awesome_outlined),
    LiveMenuItem('Conversationnel', '/app/whatsapp/conversationnel',
        Icons.chat_outlined, moduleKey: 'conversationnel'),
    LiveMenuItem('BI WAOUH IA', '/app/whatsapp/bi', Icons.bar_chart_rounded,
        moduleKey: 'bi'),
    LiveMenuItem('Stock WAOUH IA', '/app/stock', Icons.inventory_2_outlined,
        moduleKey: 'stock'),
    LiveMenuItem('Présence QR', '/app/presence', Icons.qr_code_2_rounded,
        moduleKey: 'presence'),
    LiveMenuItem('PrivatAI (IA locale)', 'https://bot.bj/privatia', Icons.shield_outlined,
        external: true, moduleKey: 'privatia'),
  ]),
  LiveMenuSection('Commerce', [
    LiveMenuItem('Boutiques & magasins', '/app/partner/businesses',
        Icons.storefront_outlined, moduleKey: 'boutiques'),
    LiveMenuItem('Ventes', '/app/partner/sales', Icons.shopping_cart_outlined,
        moduleKey: 'ventes'),
    LiveMenuItem('Versements', '/app/partner/payouts', Icons.account_balance_wallet_outlined),
    LiveMenuItem('Paiements', '/app/partner/payments', Icons.receipt_long_outlined),
    LiveMenuItem('Partenaires', '/app/partner', Icons.handshake_outlined,
        moduleKey: 'partenaires'),
  ]),
  LiveMenuSection('Services IA', [
    LiveMenuItem('AprèsBac IA', '/app/apresbac', Icons.school_outlined,
        moduleKey: 'apresbac'),
    LiveMenuItem('FA IA', '/app/fa-ia', Icons.menu_book_outlined,
        moduleKey: 'fa_ia'),
  ]),
];

String _fold(String v) => v
    .toLowerCase()
    .replaceAll(RegExp('[éèêë]'), 'e')
    .replaceAll(RegExp('[àâä]'), 'a')
    .replaceAll(RegExp('[îï]'), 'i')
    .replaceAll(RegExp('[ôö]'), 'o')
    .replaceAll(RegExp('[ùûü]'), 'u')
    .replaceAll('ç', 'c');

Future<void> showLiveMenuSheet(
  BuildContext context, {
  required bool signedIn,
  required String currentPath,
  int unreadChat = 0,
}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _MenuSheet(
        signedIn: signedIn,
        currentPath: currentPath,
        unreadChat: unreadChat,
      ),
    );

class _MenuSheet extends StatefulWidget {
  const _MenuSheet({
    required this.signedIn,
    required this.currentPath,
    required this.unreadChat,
  });
  final bool signedIn;
  final String currentPath;
  final int unreadChat;
  @override
  State<_MenuSheet> createState() => _MenuSheetState();
}

class _MenuSheetState extends State<_MenuSheet> {
  String _q = '';

  List<LiveMenuSection> _visibleBy(Set<String>? visibleKeys) {
    if (visibleKeys == null) return liveMenuSections;
    return [
      for (final s in liveMenuSections)
        LiveMenuSection(s.title, [
          for (final i in s.items)
            if (i.moduleKey == null || visibleKeys.contains(i.moduleKey)) i,
        ]),
    ].where((s) => s.items.isNotEmpty).toList();
  }

  List<LiveMenuSection> _filterBy(List<LiveMenuSection> sections) {
    final q = _fold(_q.trim());
    if (q.isEmpty) return sections;
    return [
      for (final s in sections)
        if (_fold(s.title).contains(q))
          s
        else
          LiveMenuSection(s.title, [
            for (final i in s.items)
              if (_fold(i.label).contains(q)) i,
          ]),
    ].where((s) => s.items.isNotEmpty).toList();
  }

  Future<void> _go(LiveMenuItem item) async {
    final nav = Navigator.of(context);
    final router = GoRouter.of(context);
    nav.pop();
    if (item.external) {
      await launchUrl(Uri.parse(item.route),
          mode: LaunchMode.externalApplication);
      return;
    }
    router.go(item.route);
  }

  @override
  Widget build(BuildContext context) {
    final here = widget.currentPath;
    final visibleKeys = context.watch<FrontendModulesController>().visibleKeys;
    final sections = _filterBy(_visibleBy(visibleKeys));
    return DraggableScrollableSheet(
      initialChildSize: .86,
      maxChildSize: .95,
      minChildSize: .5,
      expand: false,
      builder: (_, scroll) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: const Color(0xFFD1D9E6),
                  borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Espace de travail',
                      style: TextStyle(
                          fontSize: 19, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 10),
                  TextField(
                    onChanged: (v) => setState(() => _q = v),
                    decoration: InputDecoration(
                      hintText: 'Rechercher un module',
                      prefixIcon: const Icon(Icons.search_rounded),
                      filled: true,
                      fillColor: const Color(0xFFF4F7FC),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide.none),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                controller: scroll,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                children: [
                  if (sections.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                          child: Text('Aucun module trouvé.',
                              style: TextStyle(color: WaouhPalette.muted))),
                    ),
                  for (final s in sections) ...[
                    Padding(
                      padding: const EdgeInsets.fromLTRB(4, 12, 0, 6),
                      child: Text(s.title.toUpperCase(),
                          style: const TextStyle(
                              fontSize: 11,
                              letterSpacing: 1,
                              fontWeight: FontWeight.w900,
                              color: WaouhPalette.muted)),
                    ),
                    for (final i in s.items) _row(i, here),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(LiveMenuItem item, String here) {
    final locked =
        !widget.signedIn && !item.external && requiresWaouhAuthentication(item.route);
    final active = !item.external &&
        (here == item.route || here.startsWith('${item.route}/'));
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Material(
        color: active ? const Color(0xFFEAF1FF) : const Color(0xFFF6F8FC),
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => _go(item),
          child: Container(
            constraints: const BoxConstraints(minHeight: 48),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                Icon(item.icon,
                    size: 20,
                    color: active ? WaouhPalette.blue : const Color(0xFF475569)),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(item.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: active ? WaouhPalette.blue : null)),
                ),
                if (item.route == '/app/chat' && widget.unreadChat > 0)
                  _Badge(widget.unreadChat),
                if (locked)
                  const Icon(Icons.lock_outline_rounded,
                      size: 16, color: WaouhPalette.muted),
                if (item.external)
                  const Icon(Icons.open_in_new_rounded,
                      size: 16, color: WaouhPalette.muted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge(this.count);
  final int count;
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
            color: Colors.red, borderRadius: BorderRadius.circular(99)),
        child: Text(count > 99 ? '99+' : '$count',
            style: const TextStyle(
                color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900)),
      );
}
