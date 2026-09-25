
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_controller.dart';
import 'live_match_navigation.dart';
import 'live_models.dart';
import 'live_nexus_service.dart';
import 'live_theme.dart';
import 'live_widgets.dart';

enum AvatarCommerceIntent { buy, sell, ask }

AvatarCommerceIntent avatarCommerceIntentFrom(String? value) {
  switch ((value ?? '').toLowerCase()) {
    case 'sell':
    case 'vendre':
      return AvatarCommerceIntent.sell;
    case 'ask':
    case 'demander':
      return AvatarCommerceIntent.ask;
    default:
      return AvatarCommerceIntent.buy;
  }
}

class LiveAvatarCommerceScreen extends StatefulWidget {
  const LiveAvatarCommerceScreen({super.key, this.initialIntent});
  final String? initialIntent;

  @override
  State<LiveAvatarCommerceScreen> createState() =>
      _LiveAvatarCommerceScreenState();
}

class _LiveAvatarCommerceScreenState extends State<LiveAvatarCommerceScreen> {
  late AvatarCommerceIntent intent =
      avatarCommerceIntentFrom(widget.initialIntent);
  late final LiveNexusService nexus = LiveNexusService(legacy.supabase);

  final goal = TextEditingController();
  final budget = TextEditingController();
  final city = TextEditingController(text: 'Cotonou');

  NexusMarketplaceResponse? marketplace;
  List<NexusSellerOpportunityGroup> sellerGroups = const [];
  String? error;
  String? busyKey;
  bool loading = false;

  @override
  void initState() {
    super.initState();
    if (intent == AvatarCommerceIntent.sell) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadSeller());
    }
  }

  @override
  void dispose() {
    goal.dispose();
    budget.dispose();
    city.dispose();
    super.dispose();
  }

  String get label => switch (intent) {
        AvatarCommerceIntent.buy => 'Acheter',
        AvatarCommerceIntent.sell => 'Vendre',
        AvatarCommerceIntent.ask => 'Demander',
      };

  void _changeIntent(AvatarCommerceIntent value) {
    if (value == intent) return;
    setState(() {
      intent = value;
      marketplace = null;
      sellerGroups = const [];
      error = null;
    });
    if (value == AvatarCommerceIntent.sell) unawaited(_loadSeller());
  }

  double? _budgetValue() {
    final clean = budget.text.replaceAll(RegExp(r'[^0-9.]'), '');
    return double.tryParse(clean);
  }

  Future<void> _run() async {
    if (intent == AvatarCommerceIntent.sell) return _loadSeller();
    final query = goal.text.trim();
    if (query.length < 2 || loading) return;

    final avatar = context.read<LiveAvatarController>();
    avatar.setPersistentState(LiveAvatarPresenceState.searching);
    setState(() {
      loading = true;
      error = null;
      marketplace = null;
    });
    try {
      final result = await nexus.searchMarketplace(
        query: query,
        city: city.text.trim().isEmpty ? null : city.text.trim(),
        budgetMax: _budgetValue(),
        limit: 12,
        persistIntent: true,
      );
      if (!mounted) return;
      setState(() => marketplace = result);
      avatar.showState(
        result.results.isEmpty
            ? LiveAvatarPresenceState.watching
            : LiveAvatarPresenceState.found,
        duration: const Duration(seconds: 4),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => error = e.toString());
      avatar.showState(LiveAvatarPresenceState.idle);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _loadSeller() async {
    if (loading) return;
    final avatar = context.read<LiveAvatarController>();
    avatar.setPersistentState(LiveAvatarPresenceState.searching);
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final groups = await nexus.sellerOpportunities();
      if (!mounted) return;
      setState(() => sellerGroups = groups);
      avatar.showState(
        groups.isEmpty
            ? LiveAvatarPresenceState.watching
            : LiveAvatarPresenceState.found,
        duration: const Duration(seconds: 4),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => error = e.toString());
      avatar.showState(LiveAvatarPresenceState.idle);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  LiveMatch _matchFromInterest(
    NexusMarketplaceItem item,
    Map<String, dynamic> response,
  ) {
    final articleId = (response['article_id'] ?? item.articleId ?? '')
        .toString()
        .trim();
    final sellerId = (response['seller_user_id'] ?? '').toString().trim();
    final buyerId = (response['buyer_user_id'] ?? '').toString().trim();
    final threadId = (response['thread_id'] ?? '').toString().trim();
    final negotiationId =
        (response['negotiation_id'] ?? '').toString().trim();
    final title = (response['title'] ?? item.title).toString().trim();

    return LiveMatch(
      key: liveMatchKey(
        articleId,
        'buyer',
        sellerId.isEmpty ? null : sellerId,
        threadId.isEmpty ? null : threadId,
      ),
      articleId: articleId,
      role: 'buyer',
      title: title.isEmpty ? item.title : title,
      lastAt: DateTime.now(),
      counterpartUserId: sellerId.isEmpty ? null : sellerId,
      threadId: threadId.isEmpty ? null : threadId,
      buyerUserId: buyerId.isEmpty ? null : buyerId,
      sellerUserId: sellerId.isEmpty ? null : sellerId,
      negotiationId: negotiationId.isEmpty ? null : negotiationId,
      source: 'avatar_commerce',
      seedText: 'Je suis intéressé par « ${item.title} ».',
      price: item.price,
      city: item.city,
      photo: item.photos.isEmpty ? null : item.photos.first,
      photoUrls: item.photos,
    );
  }

  Future<void> _interest(
    NexusMarketplaceItem item, {
    double? proposedPrice,
  }) async {
    if (busyKey != null) return;
    final key = item.articleId ?? item.catalogId ?? item.title;
    final avatar = context.read<LiveAvatarController>();
    avatar.setPersistentState(LiveAvatarPresenceState.negotiating);
    setState(() {
      busyKey = key;
      error = null;
    });

    try {
      final response = await nexus.expressMarketplaceInterest(
        articleId: item.articleId,
        catalogId: item.catalogId,
      );
      if (response['skipped'] == 'self') {
        throw const NexusApiException(
          'Vous ne pouvez pas négocier votre propre article.',
        );
      }

      final match = _matchFromInterest(item, response);
      if (match.articleId.isEmpty || match.threadId?.isNotEmpty != true) {
        throw const NexusApiException(
          'WAOUH prépare encore le Deal Room. Réessayez dans un instant.',
        );
      }

      if (proposedPrice != null && proposedPrice > 0) {
        await context.read<LiveWaouhController>().sendMatch(
          match: match,
          text: 'Je propose ${proposedPrice.round()} FCFA',
          meta: const {
            'source': 'avatar_commerce',
            'origin_surface': 'avatar_commerce',
            'action': 'counter',
            'intent': 'counter',
          },
        );
      }

      if (!mounted) return;
      avatar.showState(
        LiveAvatarPresenceState.negotiating,
        duration: const Duration(seconds: 4),
      );
      await livePushMatchChat<void>(context, match);
    } catch (e) {
      if (!mounted) return;
      setState(() => error = e.toString());
      avatar.showState(LiveAvatarPresenceState.idle);
    } finally {
      if (mounted) setState(() => busyKey = null);
    }
  }

  Future<void> _offer(NexusMarketplaceItem item) async {
    final input = TextEditingController(
      text: item.price?.round().toString() ?? '',
    );
    final value = await showDialog<double>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Proposer votre prix'),
        content: TextField(
          controller: input,
          autofocus: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Votre offre',
            suffixText: 'FCFA',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              final clean =
                  input.text.replaceAll(RegExp(r'[^0-9.]'), '');
              final amount = double.tryParse(clean);
              if (amount != null && amount > 0) {
                Navigator.pop(dialogContext, amount);
              }
            },
            child: const Text('Envoyer'),
          ),
        ],
      ),
    );
    input.dispose();
    if (value != null && mounted) {
      await _interest(item, proposedPrice: value);
    }
  }

  Future<void> _notifyBuyers(NexusSellerOpportunityGroup group) async {
    if (busyKey != null) return;
    final avatar = context.read<LiveAvatarController>();
    avatar.setPersistentState(LiveAvatarPresenceState.searching);
    setState(() => busyKey = group.articleId);
    try {
      final result = await nexus.notifyMatchingBuyers(group.articleId);
      if (!mounted) return;
      final notified = _asNumber(result['notified']).round();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            notified > 0
                ? '$notified acheteur(s) compatible(s) notifié(s) via WAOUH.'
                : 'Aucun nouvel acheteur à notifier pour le moment.',
          ),
        ),
      );
      avatar.showState(
        notified > 0
            ? LiveAvatarPresenceState.done
            : LiveAvatarPresenceState.watching,
      );
      await _loadSeller();
    } catch (e) {
      if (!mounted) return;
      setState(() => error = e.toString());
      avatar.showState(LiveAvatarPresenceState.idle);
    } finally {
      if (mounted) setState(() => busyKey = null);
    }
  }

  double _asNumber(dynamic value) =>
      value is num ? value.toDouble() : double.tryParse('$value') ?? 0;

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    final hasResults =
        marketplace?.results.isNotEmpty == true || sellerGroups.isNotEmpty;

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: LiveHeader(
        title: '${avatar.name} · $label',
        subtitle: 'Avatar Commerce · parcours guidé',
        back: true,
        actions: [
          IconButton(
            tooltip: 'Missions',
            onPressed: () => context.push('/app/missions'),
            icon: const Icon(Icons.route_rounded),
          ),
        ],
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: WaouhGradients.air),
        child: ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 110),
          children: [
            _AvatarCommerceHero(
              avatar: avatar,
              intent: intent,
              loading: loading,
            ),
            const SizedBox(height: 12),
            _ProgressRail(hasResults: hasResults),
            const SizedBox(height: 12),
            _IntentTabs(intent: intent, onChanged: _changeIntent),
            const SizedBox(height: 12),
            if (intent == AvatarCommerceIntent.sell)
              _SellerIntro(loading: loading, onRefresh: _loadSeller)
            else
              _GoalPanel(
                intent: intent,
                goal: goal,
                budget: budget,
                city: city,
                loading: loading,
                onRun: _run,
              ),
            if (error != null) ...[
              const SizedBox(height: 9),
              _ErrorCard(text: error!),
            ],
            const SizedBox(height: 14),
            if (intent == AvatarCommerceIntent.sell)
              _SellerResults(
                groups: sellerGroups,
                busyKey: busyKey,
                onNotify: _notifyBuyers,
              )
            else if (marketplace != null)
              _MarketplaceResults(
                result: marketplace!,
                busyKey: busyKey,
                onInterest: (item) => _interest(item),
                onOffer: _offer,
              ),
          ],
        ),
      ),
    );
  }
}

class _AvatarCommerceHero extends StatelessWidget {
  const _AvatarCommerceHero({
    required this.avatar,
    required this.intent,
    required this.loading,
  });

  final LiveAvatarController avatar;
  final AvatarCommerceIntent intent;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final text = switch (intent) {
      AvatarCommerceIntent.buy =>
        'Je cherche, compare et sécurise la mise en relation.',
      AvatarCommerceIntent.sell =>
        'Je repère les demandes compatibles sans exposer vos coordonnées.',
      AvatarCommerceIntent.ask =>
        'Je réponds avec les données réelles WAOUH et le marché disponible.',
    };

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: WaouhGradients.airHero,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: const Color(0xFFDCE7F8)),
        boxShadow: WaouhShadows.card,
      ),
      child: Row(
        children: [
          LiveAvatarVisual(
            preset: avatar.profile.preset,
            state: loading
                ? LiveAvatarPresenceState.searching
                : avatar.state,
            size: 68,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  avatar.name,
                  style: const TextStyle(
                    color: WaouhPalette.ink,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  text,
                  style: const TextStyle(
                    color: WaouhPalette.muted,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 7),
                const Wrap(
                  spacing: 5,
                  runSpacing: 5,
                  children: [
                    _Pill('NEXUS'),
                    _Pill('Signal'),
                    _Pill('Radar'),
                    _Pill('Partenaire'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill(this.label);
  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white70,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: WaouhPalette.blue,
            fontSize: 8.5,
            fontWeight: FontWeight.w800,
          ),
        ),
      );
}

class _ProgressRail extends StatelessWidget {
  const _ProgressRail({required this.hasResults});
  final bool hasResults;

  @override
  Widget build(BuildContext context) {
    final labels = ['Objectif', 'Analyse', 'Opportunité', 'Deal'];
    final icons = [
      Icons.flag_outlined,
      Icons.psychology_alt_outlined,
      Icons.auto_awesome_outlined,
      Icons.handshake_outlined,
    ];
    return Row(
      children: List.generate(labels.length, (index) {
        final active = index == 0 || (hasResults && index < 3);
        return Expanded(
          child: Column(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: active
                      ? const Color(0xFFEAF2FF)
                      : const Color(0xFFF4F7FC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: active
                        ? const Color(0xFFBFD1FF)
                        : WaouhPalette.line,
                  ),
                ),
                child: Icon(
                  icons[index],
                  size: 17,
                  color: active ? WaouhPalette.blue : WaouhPalette.muted,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                labels[index],
                style: TextStyle(
                  color: active ? WaouhPalette.ink : WaouhPalette.muted,
                  fontSize: 8.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}

class _IntentTabs extends StatelessWidget {
  const _IntentTabs({
    required this.intent,
    required this.onChanged,
  });

  final AvatarCommerceIntent intent;
  final ValueChanged<AvatarCommerceIntent> onChanged;

  @override
  Widget build(BuildContext context) {
    final values = [
      (AvatarCommerceIntent.buy, Icons.shopping_bag_outlined, 'Acheter'),
      (AvatarCommerceIntent.sell, Icons.sell_outlined, 'Vendre'),
      (AvatarCommerceIntent.ask, Icons.auto_awesome_outlined, 'Demander'),
    ];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F4FB),
        borderRadius: BorderRadius.circular(17),
      ),
      child: Row(
        children: values.map((entry) {
          final selected = entry.$1 == intent;
          return Expanded(
            child: Material(
              color: selected ? Colors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(13),
              child: InkWell(
                borderRadius: BorderRadius.circular(13),
                onTap: () => onChanged(entry.$1),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    vertical: 9,
                    horizontal: 4,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        entry.$2,
                        size: 16,
                        color: selected
                            ? WaouhPalette.blue
                            : WaouhPalette.muted,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        entry.$3,
                        style: TextStyle(
                          color: selected
                              ? WaouhPalette.blue
                              : WaouhPalette.muted,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _GoalPanel extends StatelessWidget {
  const _GoalPanel({
    required this.intent,
    required this.goal,
    required this.budget,
    required this.city,
    required this.loading,
    required this.onRun,
  });

  final AvatarCommerceIntent intent;
  final TextEditingController goal;
  final TextEditingController budget;
  final TextEditingController city;
  final bool loading;
  final VoidCallback onRun;

  @override
  Widget build(BuildContext context) {
    final hint = intent == AvatarCommerceIntent.ask
        ? 'Ex. Quel téléphone choisir avec 150 000 FCFA ?'
        : 'Ex. iPhone 15, bon état, à Cotonou';

    return Container(
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
            controller: goal,
            minLines: 2,
            maxLines: 4,
            onSubmitted: (_) => onRun(),
            decoration: InputDecoration(
              hintText: hint,
              prefixIcon: Icon(
                intent == AvatarCommerceIntent.ask
                    ? Icons.auto_awesome_rounded
                    : Icons.search_rounded,
                color: WaouhPalette.blue,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: budget,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    hintText: 'Budget max.',
                    suffixText: 'FCFA',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: city,
                  decoration: const InputDecoration(
                    hintText: 'Ville',
                    prefixIcon: Icon(Icons.place_outlined, size: 18),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: loading ? null : onRun,
            icon: loading
                ? const SizedBox.square(
                    dimension: 17,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.auto_awesome_rounded),
            label: Text(
              intent == AvatarCommerceIntent.ask
                  ? 'Analyser avec mon Avatar'
                  : 'Chercher avec mon Avatar',
            ),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
            ),
          ),
        ],
      ),
    );
  }
}

class _SellerIntro extends StatelessWidget {
  const _SellerIntro({
    required this.loading,
    required this.onRefresh,
  });

  final bool loading;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Row(
          children: [
            const Expanded(
              child: Text(
                'Votre Avatar croise vos articles avec les demandes BUY/RFQ. Les contacts restent protégés par WAOUH.',
                style: TextStyle(
                  color: WaouhPalette.muted,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
            ),
            IconButton.filledTonal(
              onPressed: loading ? null : onRefresh,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
      );
}

class _MarketplaceResults extends StatelessWidget {
  const _MarketplaceResults({
    required this.result,
    required this.busyKey,
    required this.onInterest,
    required this.onOffer,
  });

  final NexusMarketplaceResponse result;
  final String? busyKey;
  final ValueChanged<NexusMarketplaceItem> onInterest;
  final ValueChanged<NexusMarketplaceItem> onOffer;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (result.market.sampleCount > 0)
            _MarketCard(market: result.market),
          if (result.explanation?.trim().isNotEmpty == true) ...[
            const SizedBox(height: 8),
            _InfoPanel(
              icon: Icons.psychology_alt_outlined,
              title: 'Lecture de votre Avatar',
              text: result.explanation!,
              accent: WaouhPalette.blue,
              background: const Color(0xFFF0F5FF),
            ),
          ],
          const SizedBox(height: 12),
          Text(
            '${result.results.length} opportunité(s) étudiée(s)',
            style: const TextStyle(
              color: WaouhPalette.ink,
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          if (result.results.isEmpty)
            const _EmptyCard(
              'Aucune offre suffisamment pertinente. Activez une Mission ou une veille pour laisser votre Avatar poursuivre.',
            )
          else
            for (final item in result.results) ...[
              _MarketplaceItemCard(
                item: item,
                market: result.market,
                busy: busyKey ==
                    (item.articleId ?? item.catalogId ?? item.title),
                onInterest: () => onInterest(item),
                onOffer: () => onOffer(item),
              ),
              const SizedBox(height: 9),
            ],
        ],
      );
}

class _MarketCard extends StatelessWidget {
  const _MarketCard({required this.market});
  final NexusMarketSnapshot market;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFEAF8FF), Color(0xFFF1F4FF)],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFD8E6F8)),
        ),
        child: Row(
          children: [
            const Icon(Icons.insights_rounded,
                color: WaouhPalette.blue, size: 20),
            const SizedBox(width: 9),
            Expanded(
              child: Text(
                'Marché réel · ${market.sampleCount} comparables · médiane ${_money(market.median)}',
                style: const TextStyle(
                  color: WaouhPalette.ink,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      );
}

class _MarketplaceItemCard extends StatelessWidget {
  const _MarketplaceItemCard({
    required this.item,
    required this.market,
    required this.busy,
    required this.onInterest,
    required this.onOffer,
  });

  final NexusMarketplaceItem item;
  final NexusMarketSnapshot market;
  final bool busy;
  final VoidCallback onInterest;
  final VoidCallback onOffer;

  @override
  Widget build(BuildContext context) {
    final score = item.scores.total.round();
    final trust = item.scores.trust.round();
    final medianDelta = item.price != null && market.median != null
        ? ((item.price! - market.median!) / market.median! * 100).round()
        : null;
    final details = <String>[
      if (item.description?.trim().isNotEmpty == true) item.description!.trim(),
      if (item.condition?.trim().isNotEmpty == true)
        'État : ${item.condition}',
      if (item.category?.trim().isNotEmpty == true)
        'Catégorie : ${item.category}',
    ];
    final marketText = market.sampleCount == 0
        ? 'Données comparables insuffisantes.'
        : '${market.sampleCount} comparables · médiane ${_money(market.median)}'
            '${medianDelta == null ? '' : ' · ${medianDelta > 0 ? '+' : ''}$medianDelta% vs médiane'}';
    final analysis =
        'Match $score% · confiance $trust% · pertinence ${item.scores.relevance.round()}%.';
    final recommendation = item.scores.reasons.isNotEmpty
        ? item.scores.reasons.join(' · ')
        : item.advice.trim().isNotEmpty
            ? item.advice
            : 'Aucune recommandation suffisamment étayée.';

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFDCE6F4)),
        boxShadow: WaouhShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (item.photos.isNotEmpty)
            SizedBox(
              height: 180,
              width: double.infinity,
              child: Image.network(
                item.photos.first,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const _ImageFallback(),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(13),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 5,
                  runSpacing: 5,
                  children: [
                    _Pill('Match $score%'),
                    _Pill('Confiance $trust%'),
                    if (item.seller?.verified == true) const _Pill('✓ Vérifié'),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  item.title,
                  style: const TextStyle(
                    color: WaouhPalette.ink,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _money(item.price),
                  style: const TextStyle(
                    color: Color(0xFF149C7A),
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    if (item.city != null) item.city!,
                    if (item.seller?.name != null) item.seller!.name!,
                    if (item.source != null) item.source!,
                  ].join(' · '),
                  style: const TextStyle(
                    color: WaouhPalette.muted,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 9),
                if (details.isNotEmpty) ...[
                  _InfoPanel(
                    icon: Icons.description_outlined,
                    title: 'Détails',
                    text: details.join(' · '),
                  ),
                  const SizedBox(height: 7),
                ],
                _InfoPanel(
                  icon: Icons.bar_chart_rounded,
                  title: 'Marché réel',
                  text: marketText,
                  accent: const Color(0xFF15977C),
                  background: const Color(0xFFECF9F5),
                ),
                const SizedBox(height: 7),
                _InfoPanel(
                  icon: Icons.compare_arrows_rounded,
                  title: 'Analyse comparative',
                  text: analysis,
                  accent: const Color(0xFF47658F),
                  background: const Color(0xFFF1F5FC),
                ),
                const SizedBox(height: 7),
                _InfoPanel(
                  icon: Icons.auto_awesome_outlined,
                  title: 'Pourquoi votre Avatar le retient',
                  text: recommendation,
                  accent: const Color(0xFF8C6A0B),
                  background: const Color(0xFFFFF8E7),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton(
                        onPressed: busy ? null : onInterest,
                        child: busy
                            ? const SizedBox.square(
                                dimension: 17,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Intéressé'),
                      ),
                    ),
                    const SizedBox(width: 7),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: busy ? null : onOffer,
                        child: const Text('Proposer prix'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Contact médié par WAOUH. La suite se déroule dans un Deal Room isolé jusqu’à livraison et paiement.',
                  style: TextStyle(
                    color: WaouhPalette.muted,
                    fontSize: 8.7,
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
}

class _InfoPanel extends StatelessWidget {
  const _InfoPanel({
    required this.icon,
    required this.title,
    required this.text,
    this.accent = WaouhPalette.ink,
    this.background = const Color(0xFFF7F9FC),
  });

  final IconData icon;
  final String title;
  final String text;
  final Color accent;
  final Color background;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: accent.withValues(alpha: .18)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: accent),
            const SizedBox(width: 8),
            Expanded(
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '$title : ',
                      style: TextStyle(
                        color: accent,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    TextSpan(
                      text: text,
                      style: const TextStyle(
                        color: WaouhPalette.muted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                style: const TextStyle(fontSize: 10.5, height: 1.35),
              ),
            ),
          ],
        ),
      );
}

class _SellerResults extends StatelessWidget {
  const _SellerResults({
    required this.groups,
    required this.busyKey,
    required this.onNotify,
  });

  final List<NexusSellerOpportunityGroup> groups;
  final String? busyKey;
  final ValueChanged<NexusSellerOpportunityGroup> onNotify;

  @override
  Widget build(BuildContext context) {
    if (groups.isEmpty) {
      return const _EmptyCard(
        'Aucune demande compatible détectée pour vos articles actifs. Votre Avatar peut continuer à surveiller.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Acheteurs compatibles',
          style: TextStyle(
            color: WaouhPalette.ink,
            fontSize: 14,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        for (final group in groups) ...[
          Container(
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
                Text(
                  group.title,
                  style: const TextStyle(
                    color: WaouhPalette.ink,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    if (group.price != null) _money(group.price),
                    if (group.city != null) group.city!,
                    '${group.matchedCount} demande(s)',
                  ].join(' · '),
                  style: const TextStyle(
                    color: WaouhPalette.muted,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                for (final buyer in group.opportunities.take(4))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 5),
                    child: Container(
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF6F9FF),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.person_search_outlined,
                            color: WaouhPalette.blue,
                            size: 18,
                          ),
                          const SizedBox(width: 7),
                          Expanded(
                            child: Text(
                              '${buyer.query} · Match ${buyer.scores.total.round()}%'
                              '${buyer.budgetMax == null ? '' : ' · budget ≤ ${buyer.budgetMax!.round()} FCFA'}',
                              style: const TextStyle(
                                color: WaouhPalette.ink,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                FilledButton.icon(
                  onPressed: busyKey == group.articleId
                      ? null
                      : () => onNotify(group),
                  icon: const Icon(Icons.campaign_outlined, size: 18),
                  label: Text(
                    'Notifier ${group.matchedCount} acheteur(s)',
                  ),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(44),
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'WAOUH transmet sans exposer les coordonnées. Chaque réponse crée un Deal Room séparé.',
                  style: TextStyle(
                    color: WaouhPalette.muted,
                    fontSize: 8.7,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 9),
        ],
      ],
    );
  }
}

class _ImageFallback extends StatelessWidget {
  const _ImageFallback();

  @override
  Widget build(BuildContext context) => Container(
        height: 90,
        color: const Color(0xFFF3F6FB),
        alignment: Alignment.center,
        child: const Icon(
          Icons.image_not_supported_outlined,
          color: WaouhPalette.muted,
        ),
      );
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: WaouhPalette.muted,
            fontSize: 10.5,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(11),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF2F3),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: const Color(0xFFFFD7DB)),
        ),
        child: Text(
          text,
          style: const TextStyle(
            color: Color(0xFF8E3D47),
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
}

String _money(double? value) {
  if (value == null) return 'Prix à négocier';
  final digits = value.round().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(' ');
    buffer.write(digits[i]);
  }
  return '${buffer.toString()} FCFA';
}
