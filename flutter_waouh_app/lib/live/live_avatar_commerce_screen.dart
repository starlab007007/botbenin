import 'dart:async';

import 'package:flutter/material.dart';
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

enum AvatarCommerceMode { buy, sell, ask }

extension AvatarCommerceModeX on AvatarCommerceMode {
  static AvatarCommerceMode fromRoute(String? value) => switch (value) {
        'sell' => AvatarCommerceMode.sell,
        'ask' => AvatarCommerceMode.ask,
        _ => AvatarCommerceMode.buy,
      };

  String get label => switch (this) {
        AvatarCommerceMode.buy => 'Acheter',
        AvatarCommerceMode.sell => 'Vendre',
        AvatarCommerceMode.ask => 'Demander',
      };

  IconData get icon => switch (this) {
        AvatarCommerceMode.buy => Icons.shopping_bag_outlined,
        AvatarCommerceMode.sell => Icons.sell_outlined,
        AvatarCommerceMode.ask => Icons.chat_bubble_outline_rounded,
      };

  Color get accent => switch (this) {
        AvatarCommerceMode.buy => const Color(0xFF4F7FFF),
        AvatarCommerceMode.sell => const Color(0xFFE18A27),
        AvatarCommerceMode.ask => const Color(0xFF8B7CFF),
      };

  bool get findSellers => this != AvatarCommerceMode.sell;
}

class LiveAvatarCommerceScreen extends StatefulWidget {
  const LiveAvatarCommerceScreen({
    super.key,
    required this.mode,
  });

  final AvatarCommerceMode mode;

  @override
  State<LiveAvatarCommerceScreen> createState() =>
      _LiveAvatarCommerceScreenState();
}

class _LiveAvatarCommerceScreenState extends State<LiveAvatarCommerceScreen> {
  final _goal = TextEditingController();
  final _budget = TextEditingController();
  final _city = TextEditingController();

  late final LiveNexusService _nexus;
  NexusDiscoveryResponse? _discovery;
  Map<String, dynamic>? _market;
  bool _loading = false;
  bool _publishing = false;
  String? _error;
  int _stage = 0;

  @override
  void initState() {
    super.initState();
    _nexus = LiveNexusService(legacy.supabase);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final city = await context.read<LiveWaouhController>().city;
      if (mounted && city.trim().isNotEmpty) {
        _city.text = city.trim();
      }
    });
  }

  @override
  void dispose() {
    _goal.dispose();
    _budget.dispose();
    _city.dispose();
    super.dispose();
  }

  double? get _amount {
    final digits = _budget.text.replaceAll(RegExp(r'[^0-9]'), '');
    return digits.isEmpty ? null : double.tryParse(digits);
  }

  String get _goalText => _goal.text.trim();

  Future<void> _launch() async {
    if (_goalText.length < 2 || _loading) return;
    final avatar = context.read<LiveAvatarController>();
    final controller = context.read<LiveWaouhController>();

    setState(() {
      _loading = true;
      _error = null;
      _stage = 1;
      _discovery = null;
      _market = null;
    });
    avatar.setPersistentState(LiveAvatarPresenceState.searching);

    try {
      if (widget.mode == AvatarCommerceMode.sell) {
        setState(() => _publishing = true);
        final price = _amount;
        final text = StringBuffer('Je vends : $_goalText');
        if (price != null) {
          text.write('\nPrix : ${price.round()} FCFA');
        }
        if (_city.text.trim().isNotEmpty) {
          text.write('\nVille : ${_city.text.trim()}');
        }
        await controller.sendMain(
          text: text.toString(),
          meta: <String, dynamic>{
            'intent': 'sell',
            'payload': 'sell',
            'source': 'avatar_commerce',
            'origin_surface': 'avatar_commerce',
            'avatar_led': true,
            'sale': <String, dynamic>{
              'title': _goalText,
              if (price != null) 'price': price.round(),
              'city': _city.text.trim(),
            },
          },
        );
        if (mounted) setState(() => _publishing = false);
      }

      final discovery = await _nexus.search(
        query: _goalText,
        findSellers: widget.mode.findSellers,
        smartMode: true,
        city: _city.text.trim().isEmpty ? null : _city.text.trim(),
        budgetMax:
            widget.mode == AvatarCommerceMode.sell ? null : _amount,
        refreshExternal: true,
        limit: 18,
      );

      Map<String, dynamic>? market;
      try {
        market = await _nexus.marketHistory(
          query: discovery.normalizedQuery?.trim().isNotEmpty == true
              ? discovery.normalizedQuery!
              : _goalText,
          city: _city.text.trim().isEmpty ? null : _city.text.trim(),
          limit: 30,
        );
      } catch (_) {
        market = null;
      }

      if (widget.mode == AvatarCommerceMode.buy) {
        unawaited(
          _nexus.createBuyerAutopilot(
            goal: _goalText,
            city: _city.text.trim().isEmpty ? null : _city.text.trim(),
            budgetMax: _amount,
          ).catchError((_) => <String, dynamic>{}),
        );
      }

      if (!mounted) return;
      avatar.setPersistentState(
        discovery.results.isEmpty
            ? LiveAvatarPresenceState.watching
            : LiveAvatarPresenceState.found,
      );
      setState(() {
        _discovery = discovery;
        _market = market;
        _stage = discovery.results.isEmpty ? 1 : 2;
      });
    } catch (error) {
      avatar.showState(LiveAvatarPresenceState.waiting);
      if (mounted) {
        setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _publishing = false;
        });
      }
    }
  }

  Future<void> _continueWith(NexusDiscoveryItem item) async {
    final avatar = context.read<LiveAvatarController>();
    final controller = context.read<LiveWaouhController>();
    avatar.setPersistentState(LiveAvatarPresenceState.found);
    setState(() => _error = null);

    final articleId = item.articleId;
    final sellerId = item.sellerId;

    if (articleId != null && articleId.isNotEmpty) {
      final midpoint = item.priceMin == null && item.priceMax == null
          ? null
          : ((item.priceMin ?? item.priceMax ?? 0) +
                  (item.priceMax ?? item.priceMin ?? 0)) /
              2;
      final text = widget.mode == AvatarCommerceMode.sell
          ? 'Je peux répondre à cette demande pour « ${item.title} ».'
          : 'Je suis intéressé par « ${item.title} ».';
      final meta = <String, dynamic>{
        'action': 'interested',
        'intent': 'interested',
        'source': 'avatar_commerce',
        'origin_surface': 'avatar_commerce',
        'avatar_led': true,
        'article_id': articleId,
        if (sellerId != null) 'seller_user_id': sellerId,
        if (sellerId != null) 'counterpart_user_id': sellerId,
        'role': 'buyer',
        'title': item.title,
        if (midpoint != null) 'price': midpoint.round(),
        if (item.city != null) 'city': item.city,
        if (item.photoUrls.isNotEmpty) 'photos': item.photoUrls,
        'fabric_id': item.fabricId,
        'contactability_level': item.contactPolicy.level,
        'scores': <String, dynamic>{
          'total_score': item.scores.total,
          'relevance_score': item.scores.relevance,
          'trust_score': item.scores.trust,
          'reasons': item.scores.reasons,
        },
      };
      final seed = controller.prepareInterestedMeet(text: text, meta: meta);
      unawaited(
        controller.sendMain(text: text, meta: meta).catchError((error) {
          if (mounted) {
            setState(() => _error = error.toString());
          }
        }),
      );
      if (!mounted) return;
      setState(() => _stage = 3);
      avatar.setPersistentState(LiveAvatarPresenceState.negotiating);
      await livePushMatchChat(context, seed);
      return;
    }

    try {
      final message = widget.mode == AvatarCommerceMode.sell
          ? 'Bonjour. Je peux répondre à votre demande concernant « ${item.title} ». WAOUH peut faciliter la mise en relation sans partager nos coordonnées directement.'
          : 'Bonjour. Je suis intéressé par « ${item.title} ». WAOUH peut faciliter la discussion et la négociation sans partager nos coordonnées directement.';
      final result = await _nexus.sendContact(
        fabricId: item.fabricId,
        message: message,
      );
      if (!mounted) return;
      setState(() => _stage = 3);
      avatar.showState(LiveAvatarPresenceState.done);
      final blind = result['blind'] == true;
      _notice(
        blind
            ? 'Votre Avatar a transmis la demande sous contrôle WAOUH.'
            : 'Votre Avatar a lancé le contact sécurisé.',
        success: true,
      );
    } catch (error) {
      avatar.showState(LiveAvatarPresenceState.waiting);
      if (mounted) {
        setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
      }
    }
  }

  void _notice(String message, {bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    final results = _discovery?.results ?? const <NexusDiscoveryItem>[];

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: LiveHeader(
        title: '${avatar.name} · ${widget.mode.label}',
        subtitle: 'Avatar Commerce · parcours agentique',
        back: true,
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: WaouhGradients.air),
        child: ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 120),
          children: [
            _CommerceHero(
              avatar: avatar,
              mode: widget.mode,
              loading: _loading,
            ),
            const SizedBox(height: 12),
            _JourneyRail(stage: _stage),
            const SizedBox(height: 14),
            _GoalComposer(
              mode: widget.mode,
              goal: _goal,
              budget: _budget,
              city: _city,
              loading: _loading,
              publishing: _publishing,
              onLaunch: _launch,
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              _ErrorPanel(text: _error!),
            ],
            if (_discovery != null) ...[
              const SizedBox(height: 14),
              _IntelligencePanel(
                response: _discovery!,
                market: _market,
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      results.isEmpty
                          ? 'L’Avatar poursuit'
                          : 'Opportunités classées',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  if (results.isNotEmpty)
                    Text(
                      '${results.length} trouvée${results.length > 1 ? 's' : ''}',
                      style: const TextStyle(
                        color: WaouhPalette.muted,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 9),
              if (results.isEmpty)
                _EmptyOpportunity(
                  avatarName: avatar.name,
                  onMissions: () =>
                      Navigator.of(context).maybePop(),
                )
              else
                ...results.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _OpportunityCard(
                      item: item,
                      mode: widget.mode,
                      onContinue: () => _continueWith(item),
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

class _CommerceHero extends StatelessWidget {
  const _CommerceHero({
    required this.avatar,
    required this.mode,
    required this.loading,
  });

  final LiveAvatarController avatar;
  final AvatarCommerceMode mode;
  final bool loading;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 13),
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
              size: 82,
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    switch (mode) {
                      AvatarCommerceMode.buy =>
                        'Dites ce que vous voulez. Je cherche.',
                      AvatarCommerceMode.sell =>
                        'Décrivez votre offre. Je trouve les acheteurs.',
                      AvatarCommerceMode.ask =>
                        'Décrivez le besoin. Je construis le parcours.',
                    },
                    style: const TextStyle(
                      color: WaouhPalette.ink,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      height: 1.15,
                    ),
                  ),
                  const SizedBox(height: 5),
                  const Text(
                    'NEXUS · Signal Fabric · Radar · Partenaires · Missions',
                    style: TextStyle(
                      color: WaouhPalette.muted,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

class _JourneyRail extends StatelessWidget {
  const _JourneyRail({required this.stage});
  final int stage;

  @override
  Widget build(BuildContext context) {
    const labels = ['Objectif', 'Intelligence', 'Opportunités', 'Deal'];
    return Row(
      children: [
        for (var i = 0; i < labels.length; i++) ...[
          Expanded(
            child: Column(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  height: 4,
                  decoration: BoxDecoration(
                    color: i <= stage
                        ? WaouhPalette.blue
                        : const Color(0xFFDCE4F1),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  labels[i],
                  style: TextStyle(
                    color:
                        i <= stage ? WaouhPalette.blue : WaouhPalette.muted,
                    fontSize: 8.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          if (i != labels.length - 1) const SizedBox(width: 5),
        ],
      ],
    );
  }
}

class _GoalComposer extends StatelessWidget {
  const _GoalComposer({
    required this.mode,
    required this.goal,
    required this.budget,
    required this.city,
    required this.loading,
    required this.publishing,
    required this.onLaunch,
  });

  final AvatarCommerceMode mode;
  final TextEditingController goal;
  final TextEditingController budget;
  final TextEditingController city;
  final bool loading;
  final bool publishing;
  final VoidCallback onLaunch;

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
              controller: goal,
              minLines: 2,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: switch (mode) {
                  AvatarCommerceMode.buy =>
                    'Ex. Je cherche un Samsung S25 fiable à Cotonou',
                  AvatarCommerceMode.sell =>
                    'Ex. Je vends 10 tonnes de soja à Parakou',
                  AvatarCommerceMode.ask =>
                    'Ex. Trouve-moi un réparateur sérieux pour mon climatiseur',
                },
                prefixIcon: Icon(mode.icon, color: mode.accent),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: budget,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: mode == AvatarCommerceMode.sell
                          ? 'Prix souhaité'
                          : 'Budget max.',
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
                      prefixIcon: Icon(Icons.location_on_outlined),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: loading ? null : onLaunch,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
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
                publishing
                    ? 'Je publie votre offre…'
                    : loading
                        ? 'L’Avatar explore le marché…'
                        : 'Lancer avec mon Avatar',
              ),
            ),
          ],
        ),
      );
}

class _IntelligencePanel extends StatelessWidget {
  const _IntelligencePanel({
    required this.response,
    required this.market,
  });

  final NexusDiscoveryResponse response;
  final Map<String, dynamic>? market;

  String _sourceMix() {
    if (response.sourceMix.isEmpty) return 'NEXUS';
    return response.sourceMix.entries
        .where((entry) => entry.value > 0)
        .take(4)
        .map((entry) => '${entry.key} ×${entry.value}')
        .join(' · ');
  }

  String _marketLine() {
    final points = market?['points'];
    if (points is! List || points.isEmpty) {
      return 'Pas encore d’échantillon marché vérifié pour cette recherche.';
    }
    final latest = points.first is Map
        ? Map<String, dynamic>.from(points.first as Map)
        : const <String, dynamic>{};
    String money(dynamic value) {
      final amount = value is num ? value.toDouble() : double.tryParse('$value');
      if (amount == null) return '';
      return '${amount.round()} FCFA';
    }

    final min = money(latest['min_amount']);
    final med = money(latest['median_amount']);
    final max = money(latest['max_amount']);
    final count = latest['sample_count'];
    return [
      if (min.isNotEmpty && max.isNotEmpty) 'Fourchette $min – $max',
      if (med.isNotEmpty) 'médiane $med',
      if (count != null) '$count observation(s)',
    ].join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final plan = response.intelligence;
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: const Color(0xFFF6F9FF),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFDCE7F8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.psychology_alt_rounded,
                  color: WaouhPalette.blue, size: 19),
              SizedBox(width: 7),
              Text(
                'Lecture du marché',
                style: TextStyle(
                  color: WaouhPalette.ink,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _IntelLine(
            icon: Icons.bar_chart_rounded,
            title: 'Marché réel',
            text: _marketLine(),
          ),
          _IntelLine(
            icon: Icons.hub_outlined,
            title: 'Sources',
            text: _sourceMix(),
          ),
          _IntelLine(
            icon: Icons.compare_arrows_rounded,
            title: 'Analyse',
            text: response.explanation ??
                plan?.rationale ??
                'Signal Fabric classe les opportunités par pertinence, confiance et prix.',
          ),
          if (plan?.priorities.isNotEmpty == true)
            _IntelLine(
              icon: Icons.auto_awesome_rounded,
              title: 'Priorités IA',
              text: plan!.priorities.take(4).join(' · '),
            ),
        ],
      ),
    );
  }
}

class _IntelLine extends StatelessWidget {
  const _IntelLine({
    required this.icon,
    required this.title,
    required this.text,
  });
  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 16, color: WaouhPalette.blue),
            const SizedBox(width: 7),
            Expanded(
              child: RichText(
                text: TextSpan(
                  style: const TextStyle(
                    color: WaouhPalette.muted,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    height: 1.3,
                  ),
                  children: [
                    TextSpan(
                      text: '$title · ',
                      style: const TextStyle(
                        color: WaouhPalette.ink,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    TextSpan(text: text),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
}

class _OpportunityCard extends StatelessWidget {
  const _OpportunityCard({
    required this.item,
    required this.mode,
    required this.onContinue,
  });

  final NexusDiscoveryItem item;
  final AvatarCommerceMode mode;
  final VoidCallback onContinue;

  String _price() {
    if (item.priceMin == null && item.priceMax == null) return 'Prix à confirmer';
    if (item.priceMin != null &&
        item.priceMax != null &&
        item.priceMin != item.priceMax) {
      return '${item.priceMin!.round()} – ${item.priceMax!.round()} FCFA';
    }
    return '${(item.priceMin ?? item.priceMax)!.round()} FCFA';
  }

  @override
  Widget build(BuildContext context) {
    final internal = item.articleId != null;
    return Container(
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
                width: 43,
                height: 43,
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F5FF),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  internal ? Icons.storefront_rounded : Icons.public_rounded,
                  color: WaouhPalette.blue,
                  size: 20,
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: WaouhPalette.ink,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      [
                        _price(),
                        if (item.city != null) item.city!,
                        item.sourceKey,
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
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF2FF),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  '${item.scores.total.round()}%',
                  style: const TextStyle(
                    color: WaouhPalette.blue,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          if (item.scores.reasons.isNotEmpty) ...[
            const SizedBox(height: 9),
            Text(
              item.scores.reasons.take(3).join(' · '),
              style: const TextStyle(
                color: WaouhPalette.muted,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F8FF),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  '${item.contactPolicy.level} · confiance ${item.scores.trust.round()}%',
                  style: const TextStyle(
                    color: WaouhPalette.muted,
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: onContinue,
                icon: Icon(
                  internal
                      ? Icons.handshake_outlined
                      : Icons.lock_outline_rounded,
                  size: 17,
                ),
                label: Text(
                  internal
                      ? 'Ouvrir le Deal'
                      : 'Avatar poursuit',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EmptyOpportunity extends StatelessWidget {
  const _EmptyOpportunity({
    required this.avatarName,
    required this.onMissions,
  });
  final String avatarName;
  final VoidCallback onMissions;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Row(
          children: [
            const Icon(Icons.radar_rounded,
                color: WaouhPalette.blue, size: 24),
            const SizedBox(width: 11),
            Expanded(
              child: Text(
                '$avatarName n’a pas trouvé de correspondance suffisamment fiable maintenant. La mission peut continuer en arrière-plan.',
                style: const TextStyle(
                  color: WaouhPalette.muted,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      );
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF1F2),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFFFD2D7)),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline_rounded,
                color: Color(0xFFE35D6A), size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  color: Color(0xFF99414A),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      );
}
