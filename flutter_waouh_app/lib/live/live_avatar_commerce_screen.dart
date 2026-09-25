import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_controller.dart';
import 'live_nexus_service.dart';
import 'live_thread_flow.dart';
import 'live_theme.dart';
import 'live_widgets.dart';

enum LiveAvatarCommerceMode { buy, sell, ask }

class LiveAvatarCommerceScreen extends StatefulWidget {
  const LiveAvatarCommerceScreen({super.key, required this.mode});
  final LiveAvatarCommerceMode mode;

  @override
  State<LiveAvatarCommerceScreen> createState() =>
      _LiveAvatarCommerceScreenState();
}

class _LiveAvatarCommerceScreenState extends State<LiveAvatarCommerceScreen> {
  late final LiveNexusService _nexus = LiveNexusService(legacy.supabase);
  final _goal = TextEditingController();
  final _city = TextEditingController();
  final _budget = TextEditingController();

  NexusDiscoveryResponse? _response;
  bool _loading = false;
  String? _error;
  String? _workingFabric;

  bool get _findSellers => widget.mode != LiveAvatarCommerceMode.sell;

  String get _title => switch (widget.mode) {
        LiveAvatarCommerceMode.buy => 'Acheter avec mon Avatar',
        LiveAvatarCommerceMode.sell => 'Vendre avec mon Avatar',
        LiveAvatarCommerceMode.ask => 'Demander à mon Avatar',
      };

  String get _hint => switch (widget.mode) {
        LiveAvatarCommerceMode.buy =>
          'Ex. Je cherche un Samsung S25 fiable à Cotonou',
        LiveAvatarCommerceMode.sell =>
          'Ex. Je vends 10 sacs de maïs, trouve des acheteurs sérieux',
        LiveAvatarCommerceMode.ask =>
          'Ex. Trouve un plombier disponible demain à Akpakpa',
      };

  String get _cta => switch (widget.mode) {
        LiveAvatarCommerceMode.buy => 'Chercher pour moi',
        LiveAvatarCommerceMode.sell => 'Trouver des acheteurs',
        LiveAvatarCommerceMode.ask => 'Explorer',
      };

  @override
  void dispose() {
    _goal.dispose();
    _city.dispose();
    _budget.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final query = _goal.text.trim();
    if (query.isEmpty) return;
    final avatar = context.read<LiveAvatarController>();
    setState(() {
      _loading = true;
      _error = null;
    });
    avatar.setPersistentState(LiveAvatarPresenceState.searching);
    try {
      final budget = double.tryParse(
        _budget.text.replaceAll(RegExp(r'[^0-9.]'), ''),
      );
      final result = await _nexus.search(
        query: query,
        findSellers: _findSellers,
        smartMode: widget.mode == LiveAvatarCommerceMode.ask,
        city: _city.text.trim().isEmpty ? null : _city.text.trim(),
        budgetMax: budget,
        refreshExternal: true,
        limit: 18,
      );
      if (!mounted) return;
      avatar.showState(
        result.results.isEmpty
            ? LiveAvatarPresenceState.watching
            : LiveAvatarPresenceState.found,
      );
      setState(() => _response = result);
    } catch (e) {
      if (!mounted) return;
      avatar.showState(LiveAvatarPresenceState.idle);
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Map<String, dynamic> _interestMeta(NexusDiscoveryItem item) {
    final meta = <String, dynamic>{
      'source': 'avatar_commerce',
      'origin_surface': 'flutter_avatar_commerce',
      'action': 'interested',
      'intent': 'interested',
      'thread_type': 'product_meet',
      'article_id': item.articleId,
      'seller_user_id': item.sellerUserId,
      'counterpart_user_id': item.sellerUserId,
      'title': item.title,
      'city': item.city,
      'price': item.priceMin == item.priceMax ? item.priceMin : item.priceMin,
      'fabric_id': item.fabricId,
      'contactability_level': item.contactPolicy.level,
      'nexus_total_score': item.scores.total,
      'nexus_trust_score': item.scores.trust,
      'nexus_reasons': item.scores.reasons,
    };
    meta.removeWhere((_, value) => value == null || '$value'.trim().isEmpty);
    return meta;
  }

  Future<void> _internalInterest(NexusDiscoveryItem item) async {
    final controller = context.read<LiveWaouhController>();
    final avatar = context.read<LiveAvatarController>();
    final text = 'Je suis intéressé par « ${item.title} ».';
    final meta = liveCanonicalInterestedMeta(
      text: text,
      meta: _interestMeta(item),
      authUserId: legacy.supabase.auth.currentUser?.id,
    );
    final seed = liveBuildInterestedEntryMatch(text: text, requestMeta: meta);

    setState(() => _workingFabric = item.fabricId);
    avatar.setPersistentState(LiveAvatarPresenceState.negotiating);
    try {
      await controller.sendMain(text: text, meta: meta);
      LiveMatch? match = controller.takePendingMeet();
      match ??= await controller.resolvePreparedInterestedMeet(seed);
      if (match == null || match.threadId?.trim().isEmpty != false) {
        throw StateError(
          'Le Deal Room est encore en cours de création. Réessayez dans quelques secondes.',
        );
      }
      if (!mounted) return;
      avatar.showState(LiveAvatarPresenceState.found);
      context.push('/app/chat/match/${Uri.encodeComponent(match.key)}',
          extra: match);
    } catch (e) {
      if (!mounted) return;
      avatar.showState(LiveAvatarPresenceState.idle);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e')),
      );
    } finally {
      if (mounted) setState(() => _workingFabric = null);
    }
  }

  Future<void> _mediatedContact(NexusDiscoveryItem item) async {
    final avatar = context.read<LiveAvatarController>();
    setState(() => _workingFabric = item.fabricId);
    avatar.setPersistentState(LiveAvatarPresenceState.negotiating);
    try {
      final prepared = await _nexus.prepareContact(item.fabricId);
      final policy = prepared.policy;
      if (!policy.canBlindMessage && !policy.canAutoContact) {
        throw StateError(
          'Cette opportunité est découverte mais son niveau ${policy.level} ne permet pas encore un contact médié.',
        );
      }
      final message = widget.mode == LiveAvatarCommerceMode.sell
          ? 'Bonjour, WAOUH accompagne un vendeur dont l’offre correspond à votre besoin « ${item.title} ». Souhaitez-vous poursuivre dans WAOUH ?'
          : 'Bonjour, WAOUH accompagne un utilisateur intéressé par « ${item.title} ». Souhaitez-vous poursuivre dans WAOUH ?';
      await _nexus.sendContact(fabricId: item.fabricId, message: message);
      if (!mounted) return;
      avatar.showState(LiveAvatarPresenceState.waiting);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${avatar.name} a envoyé une prise de contact médiée. Vos coordonnées restent protégées.',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      avatar.showState(LiveAvatarPresenceState.idle);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e')),
      );
    } finally {
      if (mounted) setState(() => _workingFabric = null);
    }
  }

  Future<void> _continue(NexusDiscoveryItem item) async {
    if (item.internalArticle) {
      await _internalInterest(item);
    } else {
      await _mediatedContact(item);
    }
  }

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    final results = _response?.results ?? const <NexusDiscoveryItem>[];
    final sources = _response?.sourceMix.entries
            .where((entry) => entry.value > 0)
            .map((entry) => entry.key)
            .toList() ??
        const <String>[];

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: LiveHeader(
        title: avatar.name,
        subtitle: _title,
        back: true,
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: WaouhGradients.air),
        child: ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 120),
          children: [
            _AvatarCommerceHero(
              avatar: avatar,
              title: _title,
              mode: widget.mode,
              loading: _loading,
            ),
            const SizedBox(height: 12),
            _GoalSurface(
              controller: _goal,
              city: _city,
              budget: _budget,
              hint: _hint,
              cta: _cta,
              loading: _loading,
              showBudget: widget.mode != LiveAvatarCommerceMode.ask,
              onSearch: _search,
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              _InfoStrip(
                icon: Icons.error_outline_rounded,
                text: _error!,
                accent: const Color(0xFFE05E68),
              ),
            ],
            if (_response != null) ...[
              const SizedBox(height: 14),
              _IntelligenceSummary(
                avatarName: avatar.name,
                response: _response!,
                sources: sources,
              ),
              const SizedBox(height: 12),
              if (results.isEmpty)
                _EmptyDiscovery(avatarName: avatar.name)
              else
                ...results.asMap().entries.map(
                      (entry) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _OpportunityCard(
                          rank: entry.key + 1,
                          item: entry.value,
                          busy: _workingFabric == entry.value.fabricId,
                          onContinue: () => _continue(entry.value),
                        ),
                      ),
                    ),
            ],
          ],
        ),
      ),
    );
  }
}

class _AvatarCommerceHero extends StatelessWidget {
  const _AvatarCommerceHero({
    required this.avatar,
    required this.title,
    required this.mode,
    required this.loading,
  });
  final LiveAvatarController avatar;
  final String title;
  final LiveAvatarCommerceMode mode;
  final bool loading;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: WaouhGradients.airHero,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: const Color(0xFFDCE7F8)),
        ),
        child: Row(
          children: [
            LiveAvatarVisual(
              preset: avatar.profile.preset,
              state: loading
                  ? LiveAvatarPresenceState.searching
                  : avatar.state,
              size: 74,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 3),
                  const Text(
                    'Un parcours guidé · recherche réelle · contact protégé · Deal Room',
                    style: TextStyle(
                      color: WaouhPalette.muted,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

class _GoalSurface extends StatelessWidget {
  const _GoalSurface({
    required this.controller,
    required this.city,
    required this.budget,
    required this.hint,
    required this.cta,
    required this.loading,
    required this.showBudget,
    required this.onSearch,
  });
  final TextEditingController controller;
  final TextEditingController city;
  final TextEditingController budget;
  final String hint;
  final String cta;
  final bool loading;
  final bool showBudget;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: WaouhPalette.line),
          boxShadow: WaouhShadows.card,
        ),
        child: Column(
          children: [
            TextField(
              controller: controller,
              minLines: 2,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: hint,
                prefixIcon: const Icon(Icons.auto_awesome_rounded),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: city,
                    decoration: const InputDecoration(
                      hintText: 'Ville (optionnel)',
                      prefixIcon: Icon(Icons.location_on_outlined, size: 18),
                    ),
                  ),
                ),
                if (showBudget) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: budget,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        hintText: 'Budget / prix FCFA',
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: loading ? null : onSearch,
              icon: loading
                  ? const SizedBox.square(
                      dimension: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.travel_explore_rounded),
              label: Text(cta),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
            ),
          ],
        ),
      );
}

class _IntelligenceSummary extends StatelessWidget {
  const _IntelligenceSummary({
    required this.avatarName,
    required this.response,
    required this.sources,
  });
  final String avatarName;
  final NexusDiscoveryResponse response;
  final List<String> sources;

  @override
  Widget build(BuildContext context) {
    final plan = response.intelligence;
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: const Color(0xFFF2F6FF),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFDCE7F8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.psychology_alt_rounded,
                  color: WaouhPalette.blue, size: 20),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  '$avatarName a étudié le marché',
                  style: const TextStyle(
                    color: WaouhPalette.ink,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                '${response.results.length} opportunité(s)',
                style: const TextStyle(
                  color: WaouhPalette.blue,
                  fontSize: 9.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          if ((plan?.rationale ?? response.explanation ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              plan?.rationale ?? response.explanation ?? '',
              style: const TextStyle(
                color: WaouhPalette.muted,
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          if (sources.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 5,
              runSpacing: 5,
              children: sources
                  .take(6)
                  .map((source) => _SourceChip(label: source))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }
}

class _SourceChip extends StatelessWidget {
  const _SourceChip({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: WaouhPalette.muted,
            fontSize: 8.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
}

class _OpportunityCard extends StatelessWidget {
  const _OpportunityCard({
    required this.rank,
    required this.item,
    required this.busy,
    required this.onContinue,
  });
  final int rank;
  final NexusDiscoveryItem item;
  final bool busy;
  final VoidCallback onContinue;

  String get _price {
    if (item.priceMin == null && item.priceMax == null) return 'Prix non publié';
    if (item.priceMin != null &&
        item.priceMax != null &&
        item.priceMin != item.priceMax) {
      return '${item.priceMin!.round()} – ${item.priceMax!.round()} FCFA';
    }
    return '${(item.priceMin ?? item.priceMax)!.round()} FCFA';
  }

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: WaouhPalette.line),
          boxShadow: WaouhShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 38,
                  height: 38,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F5FF),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Text(
                    '#$rank',
                    style: const TextStyle(
                      color: WaouhPalette.blue,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: const TextStyle(
                          color: WaouhPalette.ink,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        [
                          item.sourceLabel,
                          if ((item.city ?? '').isNotEmpty) item.city!,
                          item.contactPolicy.level,
                        ].join(' · '),
                        style: const TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '${item.scores.total.round()}%',
                  style: const TextStyle(
                    color: WaouhPalette.blue,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              _price,
              style: const TextStyle(
                color: Color(0xFF159A69),
                fontSize: 19,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _ScoreBar(label: 'Pertinence', value: item.scores.relevance)),
                const SizedBox(width: 7),
                Expanded(child: _ScoreBar(label: 'Confiance', value: item.scores.trust)),
              ],
            ),
            if (item.scores.reasons.isNotEmpty) ...[
              const SizedBox(height: 9),
              Wrap(
                spacing: 5,
                runSpacing: 5,
                children: item.scores.reasons
                    .take(3)
                    .map((reason) => _SourceChip(label: reason))
                    .toList(),
              ),
            ],
            const SizedBox(height: 10),
            _InfoStrip(
              icon: item.internalArticle
                  ? Icons.lock_person_outlined
                  : Icons.shield_outlined,
              text: item.internalArticle
                  ? 'WAOUH ouvrira un Deal Room privé. Les contacts ne sont pas révélés directement.'
                  : 'Contact médié par NEXUS selon la politique ${item.contactPolicy.level}.',
              accent: WaouhPalette.blue,
            ),
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: busy ? null : onContinue,
              icon: busy
                  ? const SizedBox.square(
                      dimension: 15,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(item.internalArticle
                      ? Icons.handshake_outlined
                      : Icons.send_rounded),
              label: Text(item.internalArticle
                  ? 'Intéressé · ouvrir le Deal Room'
                  : 'Laisser mon Avatar contacter'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(45),
              ),
            ),
          ],
        ),
      );

}

class _ScoreBar extends StatelessWidget {
  const _ScoreBar({required this.label, required this.value});
  final String label;
  final double value;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$label ${value.round()}%',
            style: const TextStyle(
              color: WaouhPalette.muted,
              fontSize: 8.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: (value / 100).clamp(0, 1),
              minHeight: 5,
              backgroundColor: const Color(0xFFEAF0F8),
            ),
          ),
        ],
      );
}

class _InfoStrip extends StatelessWidget {
  const _InfoStrip({
    required this.icon,
    required this.text,
    required this.accent,
  });
  final IconData icon;
  final String text;
  final Color accent;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
          color: accent.withValues(alpha: .06),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Icon(icon, color: accent, size: 17),
            const SizedBox(width: 7),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  color: WaouhPalette.muted,
                  fontSize: 9.5,
                  fontWeight: FontWeight.w600,
                  height: 1.25,
                ),
              ),
            ),
          ],
        ),
      );
}

class _EmptyDiscovery extends StatelessWidget {
  const _EmptyDiscovery({required this.avatarName});
  final String avatarName;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Column(
          children: [
            const Icon(Icons.radar_rounded,
                color: WaouhPalette.blue, size: 34),
            const SizedBox(height: 8),
            Text(
              '$avatarName n’a pas encore trouvé de correspondance assez fiable.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: WaouhPalette.ink,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Vous pouvez élargir la zone ou laisser une mission/veille active.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: WaouhPalette.muted,
                fontSize: 10,
              ),
            ),
          ],
        ),
      );
}
