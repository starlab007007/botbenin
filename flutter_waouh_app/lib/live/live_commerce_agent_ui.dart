import 'package:flutter/material.dart';

import 'live_models.dart';

enum LiveMuseMode { buyer, seller, neutral }
enum LiveMusePhase { idle, listening, searching, comparing, contacting, negotiating, success }

String liveContactLabel(String? level) {
  switch ((level ?? '').toUpperCase()) {
    case 'C4': return 'Agent connecté';
    case 'C3': return 'Contact autorisé';
    case 'C2': return 'Contact privé protégé';
    case 'C1': return 'Contact pro public';
    default: return 'Découverte uniquement';
  }
}

Color _contactTone(String? level) {
  switch ((level ?? '').toUpperCase()) {
    case 'C4':
    case 'C3': return const Color(0xFF08745D);
    case 'C2': return const Color(0xFF8B6500);
    case 'C1': return const Color(0xFF2368FF);
    default: return const Color(0xFF60746E);
  }
}

String? _contactFromMessages(List<LiveMessage> messages) {
  for (final message in messages.reversed) {
    final direct = message.meta['contactability_level'] ?? message.meta['contactability'];
    if (direct != null && '$direct'.trim().isNotEmpty) return '$direct';
    for (final key in const ['results', 'products', 'matches', 'offers']) {
      final value = message.meta[key];
      if (value is! List || value.isEmpty || value.first is! Map) continue;
      final row = value.first as Map;
      final level = row['contactability_level'] ?? row['contactability'];
      if (level != null && '$level'.trim().isNotEmpty) return '$level';
    }
  }
  return null;
}

List<Map<String, dynamic>> _rows(LiveMessage? message) {
  if (message == null) return const [];
  for (final key in const ['results', 'products', 'matches', 'offers', 'items', 'articles']) {
    final value = message.meta[key];
    if (value is List && value.isNotEmpty) {
      return value.whereType<Map>().map((row) => <String, dynamic>{
        for (final entry in row.entries) entry.key.toString(): entry.value,
      }).toList(growable: false);
    }
  }
  return const [];
}

LiveMuseMode _mode(String goal, String intent) {
  final value = goal.toLowerCase();
  final i = intent.toLowerCase();
  if (RegExp(r'\b(je\s+vends?|vendre|à\s+vendre|ecouler|écouler|acheteurs?|clients?|prospects?)\b', caseSensitive: false).hasMatch(value) ||
      i.contains('sell') || i.contains('match_seller') || i.contains('new_buyer')) {
    return LiveMuseMode.seller;
  }
  if (RegExp(r'\b(cherche|recherche|acheter|achete|achète|vendeur|offre)\b', caseSensitive: false).hasMatch(value) ||
      i.contains('buy') || i.contains('search') || i.contains('match_buyer')) {
    return LiveMuseMode.buyer;
  }
  return LiveMuseMode.neutral;
}

LiveMusePhase _phase(bool busy, String goal, String intent, int resultCount) {
  if (busy) {
    return RegExp(r'propose|contre|negoci|négoci|accepte|refus').hasMatch(goal.toLowerCase())
        ? LiveMusePhase.negotiating
        : LiveMusePhase.searching;
  }
  if (RegExp(r'negotiat|counter|deal_|decide|contact_exchange').hasMatch(intent.toLowerCase())) {
    return LiveMusePhase.negotiating;
  }
  if (resultCount > 0) return LiveMusePhase.comparing;
  if (goal.trim().isNotEmpty) return LiveMusePhase.listening;
  return LiveMusePhase.idle;
}

String _phaseLabel(LiveMusePhase phase) {
  switch (phase) {
    case LiveMusePhase.listening: return 'Comprend votre objectif';
    case LiveMusePhase.searching: return 'NEXUS cherche';
    case LiveMusePhase.comparing: return 'Signal Fabric compare';
    case LiveMusePhase.contacting: return 'Prépare le contact';
    case LiveMusePhase.negotiating: return 'Muse négocie';
    case LiveMusePhase.success: return 'Objectif atteint';
    case LiveMusePhase.idle: return 'Prêt';
  }
}

String _phaseDetail(LiveMusePhase phase) {
  switch (phase) {
    case LiveMusePhase.searching: return 'Sources · marché · signaux · confiance';
    case LiveMusePhase.comparing: return 'Pertinence · prix · proximité · fraîcheur · contact';
    case LiveMusePhase.negotiating: return 'Une négociation active · actions sous votre contrôle';
    case LiveMusePhase.contacting: return 'Contact Layer C0–C4';
    case LiveMusePhase.listening: return 'WAOUH transforme votre demande en objectif';
    case LiveMusePhase.success: return 'Mission terminée · veille disponible';
    case LiveMusePhase.idle: return 'Dites ce que vous voulez acheter ou vendre';
  }
}

class LiveMuseAvatar extends StatefulWidget {
  const LiveMuseAvatar({
    super.key,
    this.mode = LiveMuseMode.neutral,
    this.phase = LiveMusePhase.idle,
    this.size = 44,
  });

  final LiveMuseMode mode;
  final LiveMusePhase phase;
  final double size;

  @override
  State<LiveMuseAvatar> createState() => _LiveMuseAvatarState();
}

class _LiveMuseAvatarState extends State<LiveMuseAvatar> with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  );

  bool get active => const {
    LiveMusePhase.searching,
    LiveMusePhase.comparing,
    LiveMusePhase.contacting,
    LiveMusePhase.negotiating,
  }.contains(widget.phase);

  Color get tone => widget.mode == LiveMuseMode.seller
      ? const Color(0xFF8B6500)
      : widget.mode == LiveMuseMode.buyer
          ? const Color(0xFF2368FF)
          : const Color(0xFF08745D);

  IconData get modeIcon => widget.mode == LiveMuseMode.seller
      ? Icons.shopping_bag_outlined
      : widget.mode == LiveMuseMode.buyer
          ? Icons.search_rounded
          : Icons.auto_awesome_rounded;

  @override
  void initState() {
    super.initState();
    if (active) controller.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(covariant LiveMuseAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (active && !controller.isAnimating) controller.repeat(reverse: true);
    if (!active && controller.isAnimating) {
      controller.stop();
      controller.value = 0;
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (_, __) => Transform.scale(
      scale: active ? 1 + controller.value * .05 : 1,
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [
                    tone.withValues(alpha: .13),
                    Colors.white,
                    const Color(0xFFE9F8F2),
                  ]),
                  borderRadius: BorderRadius.circular(widget.size * .34),
                  border: Border.all(color: tone.withValues(alpha: .25)),
                  boxShadow: [
                    BoxShadow(color: tone.withValues(alpha: .09), blurRadius: 12, offset: const Offset(0, 4)),
                  ],
                ),
                child: Icon(Icons.smart_toy_outlined, color: tone, size: widget.size * .46),
              ),
            ),
            Positioned(
              right: -1,
              bottom: -1,
              child: Container(
                width: widget.size * .36,
                height: widget.size * .36,
                decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                child: Icon(modeIcon, color: tone, size: widget.size * .2),
              ),
            ),
            Positioned(
              left: widget.size * .16,
              top: widget.size * .14,
              child: Container(
                width: widget.size * .09,
                height: widget.size * .09,
                decoration: const BoxDecoration(color: Color(0xFF1DBB82), shape: BoxShape.circle),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class LiveContactabilityBadge extends StatelessWidget {
  const LiveContactabilityBadge({super.key, required this.level, this.showCode = false});
  final String? level;
  final bool showCode;

  @override
  Widget build(BuildContext context) {
    final code = (level ?? 'C0').toUpperCase();
    final tone = _contactTone(code);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tone.withValues(alpha: .24)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.shield_outlined, size: 12, color: tone),
        const SizedBox(width: 4),
        Text(
          showCode ? '${code} · ${liveContactLabel(code)}' : liveContactLabel(code),
          style: TextStyle(color: tone, fontSize: 9.5, fontWeight: FontWeight.w800),
        ),
      ]),
    );
  }
}

class LiveCommerceAgentBar extends StatelessWidget {
  const LiveCommerceAgentBar({
    super.key,
    required this.messages,
    this.busy = false,
    this.compact = false,
  });

  final List<LiveMessage> messages;
  final bool busy;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    LiveMessage? userMessage;
    LiveMessage? assistantMessage;
    for (final message in messages.reversed) {
      if (userMessage == null && message.outgoing) userMessage = message;
      if (assistantMessage == null && !message.outgoing) assistantMessage = message;
      if (userMessage != null && assistantMessage != null) break;
    }
    final goal = userMessage?.text == '(image)' ? '' : (userMessage?.text.trim() ?? '');
    final intent = '${assistantMessage?.meta['intent'] ?? ''}';
    final rows = _rows(assistantMessage);
    final mode = _mode(goal, intent);
    final phase = _phase(busy, goal, intent, rows.length);
    final contact = _contactFromMessages(messages);
    final sources = <String>{};
    final sourceMix = assistantMessage?.meta['source_mix'];
    if (sourceMix is Map) {
      for (final key in sourceMix.keys) {
        final source = key.toString().trim();
        if (source.isNotEmpty) sources.add(source);
      }
    }
    for (final row in rows) {
      final source = '${row['source'] ?? row['source_key'] ?? ''}'.trim();
      if (source.isNotEmpty) sources.add(source);
    }
    final role = mode == LiveMuseMode.buyer
        ? 'Muse acheteur'
        : mode == LiveMuseMode.seller
            ? 'Muse vendeur'
            : 'Muse commerce';

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(12, compact ? 7 : 9, 12, compact ? 7 : 9),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Colors.white, Color(0xFFF0FAF6), Color(0xFFF1FAFC)]),
        border: Border(bottom: BorderSide(color: Color(0xFFDCEFE8))),
      ),
      child: Row(children: [
        LiveMuseAvatar(mode: mode, phase: phase, size: compact ? 38 : 44),
        const SizedBox(width: 9),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(spacing: 6, runSpacing: 5, crossAxisAlignment: WrapCrossAlignment.center, children: [
              Text(role, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF15372F))),
              _AgentPill(text: _phaseLabel(phase), icon: Icons.auto_awesome_rounded, tone: const Color(0xFF08745D)),
              if (rows.isNotEmpty)
                _AgentPill(
                  text: '${rows.length} correspondance${rows.length > 1 ? 's' : ''}',
                  icon: Icons.grid_view_rounded,
                  tone: const Color(0xFF2368FF),
                ),
              if (contact != null) LiveContactabilityBadge(level: contact),
            ]),
            const SizedBox(height: 3),
            Text(
              goal.isNotEmpty ? goal : _phaseDetail(phase),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Color(0xFF52675F), fontSize: 10.8, fontWeight: FontWeight.w600),
            ),
            if (!compact) ...[
              const SizedBox(height: 5),
              Row(children: [
                _FlowChip(label: 'Compris', active: phase != LiveMusePhase.idle),
                const _FlowArrow(),
                _FlowChip(label: 'NEXUS', active: const {LiveMusePhase.searching, LiveMusePhase.comparing, LiveMusePhase.contacting, LiveMusePhase.negotiating, LiveMusePhase.success}.contains(phase)),
                const _FlowArrow(),
                _FlowChip(label: 'Compare', active: const {LiveMusePhase.comparing, LiveMusePhase.contacting, LiveMusePhase.negotiating, LiveMusePhase.success}.contains(phase)),
                const _FlowArrow(),
                _FlowChip(label: 'Contact', active: const {LiveMusePhase.contacting, LiveMusePhase.negotiating, LiveMusePhase.success}.contains(phase)),
              ]),
            ],
          ]),
        ),
        if (sources.isNotEmpty && !compact)
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 105),
            child: Text(
              sources.take(3).join(' · '),
              textAlign: TextAlign.right,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Color(0xFF78958A), fontSize: 9.5, fontWeight: FontWeight.w700),
            ),
          ),
      ]),
    );
  }
}


class LiveSmartComposerBar extends StatelessWidget {
  const LiveSmartComposerBar({
    super.key,
    required this.messages,
    required this.onPrompt,
    required this.onSell,
    required this.onMuse,
    this.busy = false,
  });

  final List<LiveMessage> messages;
  final ValueChanged<String> onPrompt;
  final VoidCallback onSell;
  final VoidCallback onMuse;
  final bool busy;

  List<({String label, String value, IconData icon})> _items() {
    LiveMessage? userMessage;
    LiveMessage? assistantMessage;
    for (final message in messages.reversed) {
      if (userMessage == null && message.outgoing) userMessage = message;
      if (assistantMessage == null && !message.outgoing) assistantMessage = message;
      if (userMessage != null && assistantMessage != null) break;
    }
    final goal = userMessage?.text == '(image)' ? '' : (userMessage?.text.trim() ?? '');
    final intent = '${assistantMessage?.meta['intent'] ?? ''}';
    final rows = _rows(assistantMessage);
    final mode = _mode(goal, intent);
    final phase = _phase(busy, goal, intent, rows.length);

    if (phase == LiveMusePhase.searching) {
      return const [
        (label: 'NEXUS cherche…', value: '', icon: Icons.auto_awesome_rounded),
        (label: 'Préciser ma zone', value: 'Prends en compte ma zone pour mieux classer les résultats.', icon: Icons.my_location_outlined),
      ];
    }
    if (phase == LiveMusePhase.negotiating) {
      return const [
        (label: 'Résumer', value: "Résume-moi la négociation en cours et l'écart restant.", icon: Icons.summarize_outlined),
        (label: 'Comparer marché', value: 'Compare cette négociation avec le prix du marché avant que je décide.', icon: Icons.compare_arrows_rounded),
        (label: 'Mes options', value: 'Quelles sont mes options maintenant, sans prendre de décision à ma place ?', icon: Icons.auto_awesome_rounded),
      ];
    }
    if (rows.isNotEmpty && mode == LiveMuseMode.seller) {
      return const [
        (label: 'Meilleurs acheteurs', value: 'Montre-moi les acheteurs les plus compatibles et explique pourquoi.', icon: Icons.groups_2_outlined),
        (label: 'Préparer une offre', value: "Prépare une proposition commerciale pour le meilleur acheteur, sans l'envoyer.", icon: Icons.handshake_outlined),
        (label: 'Continuer', value: "Continue à chercher d'autres acheteurs fiables pour cette offre.", icon: Icons.travel_explore_rounded),
      ];
    }
    if (rows.isNotEmpty && mode == LiveMuseMode.buyer) {
      return const [
        (label: 'Comparer top 3', value: 'Compare les trois meilleures options sur prix, confiance, distance et contact.', icon: Icons.compare_arrows_rounded),
        (label: 'Préparer négociation', value: "Prépare une stratégie de négociation pour la meilleure offre, sans envoyer de message.", icon: Icons.handshake_outlined),
        (label: 'Continuer', value: 'Continue à chercher de meilleures offres pour ce besoin.', icon: Icons.travel_explore_rounded),
      ];
    }
    if (mode == LiveMuseMode.seller) {
      return const [
        (label: 'Trouver acheteurs', value: 'Trouve des acheteurs fiables pour ce que je veux vendre.', icon: Icons.groups_2_outlined),
        (label: 'Optimiser annonce', value: "Aide-moi à améliorer mon offre pour attirer plus d'acheteurs.", icon: Icons.auto_awesome_rounded),
      ];
    }
    if (mode == LiveMuseMode.buyer) {
      return const [
        (label: 'Autour de moi', value: 'Trouve les meilleures offres autour de moi pour ce besoin.', icon: Icons.my_location_outlined),
        (label: 'Comparer marché', value: 'Compare les prix du marché pour ce que je cherche.', icon: Icons.compare_arrows_rounded),
      ];
    }
    return const [
      (label: 'Acheter', value: 'Je cherche ', icon: Icons.search_rounded),
      (label: 'Vendre', value: '__SELL__', icon: Icons.shopping_bag_outlined),
      (label: 'Autour de moi', value: 'Trouve-moi les meilleures offres autour de moi pour ', icon: Icons.my_location_outlined),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final items = _items().take(3).toList(growable: false);
    return Container(
      height: 54,
      color: Colors.white,
      child: Row(children: [
        Expanded(
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(10, 8, 6, 8),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 7),
            itemBuilder: (_, index) {
              final item = items[index];
              final inert = item.value.isEmpty;
              return ActionChip(
                avatar: Icon(item.icon, size: 17),
                label: Text(item.label),
                onPressed: busy || inert
                    ? null
                    : () => item.value == '__SELL__' ? onSell() : onPrompt(item.value),
                side: BorderSide(
                  color: inert ? const Color(0xFFCBEBDD) : const Color(0xFFDCE8E3),
                ),
                backgroundColor: inert ? const Color(0xFFEFFFF7) : Colors.white,
                labelStyle: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 11.5,
                  color: inert ? const Color(0xFF08745D) : const Color(0xFF365048),
                ),
              );
            },
          ),
        ),
        IconButton(
          tooltip: 'Ouvrir Muse',
          onPressed: onMuse,
          icon: const Icon(Icons.psychology_alt_outlined),
        ),
        const SizedBox(width: 3),
      ]),
    );
  }
}

class LiveDealRoomBanner extends StatelessWidget {
  const LiveDealRoomBanner({
    super.key,
    required this.match,
    this.messages = const [],
    this.pending = false,
  });

  final LiveMatch match;
  final List<LiveMessage> messages;
  final bool pending;

  @override
  Widget build(BuildContext context) {
    final contact = _contactFromMessages(messages);
    final mode = match.role == 'seller' ? LiveMuseMode.seller : LiveMuseMode.buyer;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 9),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Colors.white, Color(0xFFF0FAF6), Color(0xFFF2FAFC)]),
        border: Border(bottom: BorderSide(color: Color(0xFFDCEFE8))),
      ),
      child: Row(children: [
        LiveMuseAvatar(mode: mode, phase: pending ? LiveMusePhase.searching : LiveMusePhase.negotiating, size: 40),
        const SizedBox(width: 8),
        if (match.photo != null && match.photo!.trim().isNotEmpty) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(11),
            child: Image.network(
              match.photo!,
              width: 46,
              height: 46,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _DealFallback(mode: mode),
            ),
          ),
          const SizedBox(width: 8),
        ],
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(spacing: 5, runSpacing: 4, children: [
              const _AgentPill(text: 'WAOUH Deal Room', icon: Icons.auto_awesome_rounded, tone: Color(0xFF08745D)),
              if (contact != null) LiveContactabilityBadge(level: contact, showCode: true),
            ]),
            const SizedBox(height: 3),
            Text(match.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF15372F), fontSize: 13)),
            Text(
              [
                if (match.price != null) '${match.price} FCFA',
                if (match.city?.trim().isNotEmpty == true) match.city!,
                match.participantLabel,
              ].join(' · '),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Color(0xFF60746E), fontSize: 10.5, fontWeight: FontWeight.w600),
            ),
          ]),
        ),
        const Icon(Icons.shield_outlined, size: 18, color: Color(0xFF08745D)),
      ]),
    );
  }
}

class _DealFallback extends StatelessWidget {
  const _DealFallback({required this.mode});
  final LiveMuseMode mode;
  @override
  Widget build(BuildContext context) => Container(
    width: 46,
    height: 46,
    decoration: BoxDecoration(color: const Color(0xFFEAF8F2), borderRadius: BorderRadius.circular(11)),
    child: Icon(mode == LiveMuseMode.seller ? Icons.shopping_bag_outlined : Icons.shopping_cart_outlined, color: const Color(0xFF08745D)),
  );
}

class _AgentPill extends StatelessWidget {
  const _AgentPill({required this.text, required this.icon, required this.tone});
  final String text;
  final IconData icon;
  final Color tone;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
    decoration: BoxDecoration(
      color: tone.withValues(alpha: .08),
      borderRadius: BorderRadius.circular(999),
      border: Border.all(color: tone.withValues(alpha: .18)),
    ),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 11, color: tone),
      const SizedBox(width: 4),
      Text(text, style: TextStyle(color: tone, fontSize: 9.5, fontWeight: FontWeight.w800)),
    ]),
  );
}

class _FlowChip extends StatelessWidget {
  const _FlowChip({required this.label, required this.active});
  final String label;
  final bool active;
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 4),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: active ? const Color(0xFFE9F8F2) : Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: active ? const Color(0xFFB8E1D2) : const Color(0xFFE4ECE9)),
      ),
      child: Text(label, maxLines: 1, style: TextStyle(fontSize: 8.7, fontWeight: FontWeight.w800, color: active ? const Color(0xFF08745D) : const Color(0xFF9AABA4))),
    ),
  );
}

class _FlowArrow extends StatelessWidget {
  const _FlowArrow();
  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.symmetric(horizontal: 2),
    child: Icon(Icons.chevron_right_rounded, size: 13, color: Color(0xFFC2CEC9)),
  );
}
