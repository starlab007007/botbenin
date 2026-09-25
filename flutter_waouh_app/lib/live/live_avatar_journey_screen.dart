import 'dart:math';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_controller.dart';
import 'live_nexus_service.dart';
import 'live_theme.dart';
import 'live_widgets.dart';

enum LiveAvatarJourneyMode {
  buy,
  sell,
  ask;

  static LiveAvatarJourneyMode parse(String value) => switch (value) {
        'sell' => LiveAvatarJourneyMode.sell,
        'ask' => LiveAvatarJourneyMode.ask,
        _ => LiveAvatarJourneyMode.buy,
      };

  String get label => switch (this) {
        LiveAvatarJourneyMode.buy => 'Acheter',
        LiveAvatarJourneyMode.sell => 'Vendre',
        LiveAvatarJourneyMode.ask => 'Demander',
      };

  String get subtitle => switch (this) {
        LiveAvatarJourneyMode.buy => 'Je cherche, compare et ouvre le bon deal.',
        LiveAvatarJourneyMode.sell => 'Je trouve les acheteurs sans exposer vos contacts.',
        LiveAvatarJourneyMode.ask => 'Je comprends votre objectif et choisis les bons moteurs.',
      };

  IconData get icon => switch (this) {
        LiveAvatarJourneyMode.buy => Icons.shopping_bag_outlined,
        LiveAvatarJourneyMode.sell => Icons.sell_outlined,
        LiveAvatarJourneyMode.ask => Icons.auto_awesome_rounded,
      };

  String get hint => switch (this) {
        LiveAvatarJourneyMode.buy =>
          'Ex. Je cherche un Samsung S25 fiable sous 450 000 FCFA à Cotonou',
        LiveAvatarJourneyMode.sell =>
          'Ex. Je vends 10 tonnes de soja et je cherche des acheteurs sérieux',
        LiveAvatarJourneyMode.ask =>
          'Ex. Trouve la meilleure solution pour acheter, vendre ou négocier',
      };
}

class LiveAvatarJourneyScreen extends StatefulWidget {
  const LiveAvatarJourneyScreen({super.key, required this.mode});

  final String mode;

  @override
  State<LiveAvatarJourneyScreen> createState() =>
      _LiveAvatarJourneyScreenState();
}

class _LiveAvatarJourneyScreenState extends State<LiveAvatarJourneyScreen> {
  late final LiveAvatarJourneyMode mode =
      LiveAvatarJourneyMode.parse(widget.mode);
  late final LiveNexusService nexus = LiveNexusService(legacy.supabase);

  final goal = TextEditingController();
  final city = TextEditingController();
  final budget = TextEditingController();

  NexusSearchResponse? catalogResult;
  NexusDiscoveryResponse? discoveryResult;
  bool busy = false;
  bool acting = false;
  String? error;
  String? activity;
  int stage = 0;

  @override
  void dispose() {
    goal.dispose();
    city.dispose();
    budget.dispose();
    super.dispose();
  }

  double? get budgetValue {
    final digits = budget.text.replaceAll(RegExp(r'[^0-9]'), '');
    return digits.isEmpty ? null : double.tryParse(digits);
  }

  String _idempotencyKey() =>
      'avatar-${mode.name}-${DateTime.now().microsecondsSinceEpoch}-${Random.secure().nextInt(1 << 24)}';

  Future<void> _run() async {
    final query = goal.text.trim();
    if (query.isEmpty || busy) return;

    final avatar = context.read<LiveAvatarController>();
    final waouh = context.read<LiveWaouhController>();

    setState(() {
      busy = true;
      error = null;
      activity = 'Votre Avatar comprend l’objectif…';
      stage = 1;
      catalogResult = null;
      discoveryResult = null;
    });
    avatar.setPersistentState(LiveAvatarPresenceState.thinking);

    final meta = <String, dynamic>{
      'intent': mode == LiveAvatarJourneyMode.buy
          ? 'buy'
          : mode == LiveAvatarJourneyMode.sell
              ? 'sell'
              : 'assistant',
      'source': 'avatar_journey',
      'origin_surface': 'avatar_journey',
      'idempotency_key': _idempotencyKey(),
      if (city.text.trim().isNotEmpty) 'city': city.text.trim(),
      if (budgetValue != null) 'budget_max': budgetValue,
    };

    try {
      await waouh.agentic.ensureSynchronizedMissionForRequest(
        query,
        meta,
        online: waouh.isOnline && legacy.supabase.auth.currentUser != null,
      );

      if (!mounted) return;
      setState(() {
        stage = 2;
        activity = mode == LiveAvatarJourneyMode.sell
            ? 'Je cherche des acheteurs et signaux de demande…'
            : 'Je cherche dans NEXUS, Radar, Partenaires et WAOUH…';
      });
      avatar.setPersistentState(LiveAvatarPresenceState.searching);

      if (mode == LiveAvatarJourneyMode.buy) {
        final result = await nexus.searchCatalog(
          query: query,
          city: city.text.trim().isEmpty ? null : city.text.trim(),
          budgetMax: budgetValue,
          limit: 18,
          persistIntent: true,
        );
        if (!mounted) return;
        setState(() {
          catalogResult = result;
          stage = 3;
          activity = result.results.isEmpty
              ? 'Je garde la mission active et poursuis la veille.'
              : 'J’ai comparé ${result.results.length} option(s).';
        });
      } else {
        final result = await nexus.search(
          query: query,
          findSellers: mode != LiveAvatarJourneyMode.sell,
          smartMode: mode == LiveAvatarJourneyMode.ask,
          city: city.text.trim().isEmpty ? null : city.text.trim(),
          budgetMax: budgetValue,
          limit: 20,
        );
        if (!mounted) return;
        setState(() {
          discoveryResult = result;
          stage = 3;
          activity = result.results.isEmpty
              ? 'Je garde la mission active et poursuis la recherche.'
              : 'J’ai classé ${result.results.length} opportunité(s).';
        });
      }
      avatar.setPersistentState(LiveAvatarPresenceState.comparing);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = e.toString();
        activity = 'Je n’ai pas pu terminer cette exploration.';
      });
      avatar.showState(LiveAvatarPresenceState.idle);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _interest(NexusSearchItem item) async {
    if (acting) return;
    final articleId = item.articleId?.trim();
    final catalogId = item.catalogId?.trim();
    if ((articleId == null || articleId.isEmpty) &&
        (catalogId == null || catalogId.isEmpty)) {
      setState(() => error =
          'Cette opportunité ne peut pas encore ouvrir un Deal Room WAOUH.');
      return;
    }

    final waouh = context.read<LiveWaouhController>();
    final avatar = context.read<LiveAvatarController>();
    final meta = <String, dynamic>{
      'action': 'interested',
      'intent': 'interested',
      'role': 'buyer',
      'source': 'avatar_journey',
      'origin_surface': 'avatar_journey',
      'idempotency_key': _idempotencyKey(),
      if (articleId != null && articleId.isNotEmpty) 'article_id': articleId,
      if (catalogId != null && catalogId.isNotEmpty) 'catalog_id': catalogId,
      'title': item.title,
      if (item.price != null) 'price': item.price,
      if (item.city?.trim().isNotEmpty == true) 'city': item.city,
      if (item.photos.isNotEmpty) 'photos': item.photos,
    };

    final seed = waouh.prepareInterestedMeet(text: 'Intéressé', meta: meta);
    setState(() {
      acting = true;
      error = null;
      stage = 4;
      activity = 'Je contacte le vendeur via WAOUH et prépare le Deal Room…';
    });
    avatar.setPersistentState(LiveAvatarPresenceState.negotiating);

    try {
      await waouh.sendMain(text: 'Intéressé', meta: meta);
      var resolved = waouh.preparedInterestedResolution(seed);
      resolved ??= await waouh.resolvePreparedInterestedMeet(seed);
      resolved ??= await waouh.repairPreparedInterestedMeet(seed);

      if (!mounted) return;
      if (resolved == null) {
        setState(() {
          activity =
              'Demande envoyée. Le fil sécurisé se prépare en arrière-plan.';
        });
        avatar.showState(LiveAvatarPresenceState.waiting);
        return;
      }

      avatar.showState(
        LiveAvatarPresenceState.found,
        duration: const Duration(seconds: 4),
      );
      context.push('/app/chat/match/${resolved.key}', extra: resolved);
    } catch (e) {
      if (!mounted) return;
      setState(() => error = e.toString());
      avatar.showState(LiveAvatarPresenceState.waiting);
    } finally {
      if (mounted) setState(() => acting = false);
    }
  }

  Future<void> _approach(NexusDiscoveryItem item) async {
    if (acting) return;
    final avatar = context.read<LiveAvatarController>();
    setState(() {
      acting = true;
      error = null;
      stage = 4;
      activity = 'Je vérifie le niveau de contact autorisé…';
    });
    avatar.setPersistentState(LiveAvatarPresenceState.thinking);

    try {
      final prepared = await nexus.prepareContact(item.fabricId);
      if (!prepared.policy.canBlindMessage &&
          !prepared.policy.canAutoContact) {
        if (!mounted) return;
        setState(() {
          activity =
              'Je garde cette opportunité sous surveillance : aucun contact privé automatique n’est autorisé.';
        });
        avatar.showState(LiveAvatarPresenceState.watching);
        return;
      }

      final message = mode == LiveAvatarJourneyMode.sell
          ? 'Bonjour, WAOUH vous transmet une offre correspondant à votre besoin. Souhaitez-vous poursuivre la discussion dans WAOUH ?'
          : 'Bonjour, WAOUH a identifié une opportunité compatible. Souhaitez-vous poursuivre la discussion dans WAOUH ?';

      await nexus.sendContact(fabricId: item.fabricId, message: message);
      if (!mounted) return;
      setState(() {
        activity =
            'Message transmis par WAOUH sans révéler vos coordonnées privées.';
      });
      avatar.showState(
        LiveAvatarPresenceState.done,
        duration: const Duration(seconds: 4),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => acting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    final results = catalogResult?.results ?? const <NexusSearchItem>[];
    final discovery =
        discoveryResult?.results ?? const <NexusDiscoveryItem>[];

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: LiveHeader(
        title: '${avatar.name} · ${mode.label}',
        subtitle: 'Parcours Avatar · indépendant du Chat',
        back: true,
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: WaouhGradients.air),
        child: ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
          children: [
            _JourneyHero(
              avatar: avatar,
              mode: mode,
              activity: activity,
              busy: busy || acting,
            ),
            const SizedBox(height: 14),
            _JourneyProgress(stage: stage),
            const SizedBox(height: 14),
            _JourneyGoalCard(
              mode: mode,
              goal: goal,
              city: city,
              budget: budget,
              busy: busy,
              onRun: _run,
            ),
            if (error != null) ...[
              const SizedBox(height: 10),
              _JourneyError(error!),
            ],
            if (results.isNotEmpty) ...[
              const SizedBox(height: 18),
              _SectionHeader(
                title: 'Options comparées',
                subtitle: '${results.length} résultat(s)',
              ),
              const SizedBox(height: 9),
              ...results.take(10).map(
                    (item) => _JourneyProductCard(
                      item: item,
                      acting: acting,
                      onInterest: () => _interest(item),
                    ),
                  ),
            ],
            if (discovery.isNotEmpty) ...[
              const SizedBox(height: 18),
              _SectionHeader(
                title: mode == LiveAvatarJourneyMode.sell
                    ? 'Acheteurs et demandes'
                    : 'Opportunités détectées',
                subtitle: '${discovery.length} signal(s)',
              ),
              const SizedBox(height: 9),
              ...discovery.take(10).map(
                    (item) => _JourneyDiscoveryCard(
                      item: item,
                      acting: acting,
                      onApproach: () => _approach(item),
                    ),
                  ),
            ],
            if (!busy &&
                stage >= 2 &&
                results.isEmpty &&
                discovery.isEmpty) ...[
              const SizedBox(height: 16),
              _JourneyEmpty(
                avatarName: avatar.name,
                onMissions: () => context.push('/app/missions'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _JourneyHero extends StatelessWidget {
  const _JourneyHero({
    required this.avatar,
    required this.mode,
    required this.activity,
    required this.busy,
  });

  final LiveAvatarController avatar;
  final LiveAvatarJourneyMode mode;
  final String? activity;
  final bool busy;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: WaouhGradients.airHero,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: const Color(0xFFDCE7F8)),
          boxShadow: WaouhShadows.card,
        ),
        child: Row(
          children: [
            LiveAvatarVisual(
              preset: avatar.profile.preset,
              state: busy
                  ? LiveAvatarPresenceState.searching
                  : avatar.state,
              size: 82,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    mode.subtitle,
                    style: const TextStyle(
                      color: WaouhPalette.ink,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    activity ?? 'Décrivez votre objectif. Je m’occupe du reste.',
                    style: const TextStyle(
                      color: WaouhPalette.muted,
                      fontSize: 10.5,
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

class _JourneyProgress extends StatelessWidget {
  const _JourneyProgress({required this.stage});
  final int stage;

  @override
  Widget build(BuildContext context) {
    const labels = ['Comprendre', 'Explorer', 'Comparer', 'Agir'];
    const icons = [
      Icons.psychology_alt_outlined,
      Icons.travel_explore_rounded,
      Icons.compare_arrows_rounded,
      Icons.handshake_outlined,
    ];
    return Row(
      children: [
        for (var i = 0; i < labels.length; i++) ...[
          Expanded(
            child: Column(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: stage >= i + 1
                        ? WaouhPalette.blue
                        : const Color(0xFFEAF0FA),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    icons[i],
                    size: 17,
                    color: stage >= i + 1
                        ? Colors.white
                        : WaouhPalette.muted,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  labels[i],
                  style: TextStyle(
                    color: stage >= i + 1
                        ? WaouhPalette.blue
                        : WaouhPalette.muted,
                    fontSize: 8.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          if (i != labels.length - 1)
            Container(
              width: 14,
              height: 1,
              margin: const EdgeInsets.only(bottom: 17),
              color: stage > i + 1
                  ? WaouhPalette.blue
                  : const Color(0xFFDDE5F1),
            ),
        ],
      ],
    );
  }
}

class _JourneyGoalCard extends StatelessWidget {
  const _JourneyGoalCard({
    required this.mode,
    required this.goal,
    required this.city,
    required this.budget,
    required this.busy,
    required this.onRun,
  });

  final LiveAvatarJourneyMode mode;
  final TextEditingController goal;
  final TextEditingController city;
  final TextEditingController budget;
  final bool busy;
  final VoidCallback onRun;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Column(
          children: [
            TextField(
              controller: goal,
              minLines: 2,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: mode.hint,
                prefixIcon: Icon(mode.icon),
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
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: budget,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: mode == LiveAvatarJourneyMode.sell
                          ? 'Prix cible'
                          : 'Budget max',
                      prefixIcon: const Icon(
                        Icons.payments_outlined,
                        size: 18,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: busy ? null : onRun,
              icon: busy
                  ? const SizedBox.square(
                      dimension: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.auto_awesome_rounded),
              label: Text(
                busy ? 'Avatar explore…' : 'Lancer avec mon Avatar',
              ),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
            ),
          ],
        ),
      );
}

class _JourneyProductCard extends StatelessWidget {
  const _JourneyProductCard({
    required this.item,
    required this.acting,
    required this.onInterest,
  });

  final NexusSearchItem item;
  final bool acting;
  final VoidCallback onInterest;

  String get price => item.price == null
      ? 'Prix à confirmer'
      : '${item.price!.round()} FCFA';

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 9),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: WaouhPalette.line),
          boxShadow: WaouhShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F5FF),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(
                    Icons.shopping_bag_outlined,
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
                      const SizedBox(height: 2),
                      Text(
                        [
                          price,
                          if (item.city?.trim().isNotEmpty == true) item.city!,
                          if (item.source?.trim().isNotEmpty == true)
                            item.source!,
                        ].join(' · '),
                        style: const TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF2FF),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    '${item.scores.total.round()}%',
                    style: const TextStyle(
                      color: WaouhPalette.blue,
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            if (item.advice.trim().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                item.advice,
                style: const TextStyle(
                  color: WaouhPalette.muted,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  height: 1.3,
                ),
              ),
            ],
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: acting ? null : onInterest,
              icon: const Icon(Icons.handshake_outlined, size: 18),
              label: const Text('Intéressé · ouvrir le Deal Room'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(44),
              ),
            ),
          ],
        ),
      );

}

class _JourneyDiscoveryCard extends StatelessWidget {
  const _JourneyDiscoveryCard({
    required this.item,
    required this.acting,
    required this.onApproach,
  });

  final NexusDiscoveryItem item;
  final bool acting;
  final VoidCallback onApproach;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 9),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.hub_outlined,
                  color: WaouhPalette.blue,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    item.title,
                    style: const TextStyle(
                      color: WaouhPalette.ink,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                ),
                Text(
                  '${item.scores.total.round()}%',
                  style: const TextStyle(
                    color: WaouhPalette.blue,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 7),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _JourneyPill(item.sourceKey),
                if (item.city?.trim().isNotEmpty == true)
                  _JourneyPill(item.city!),
                _JourneyPill(item.contactPolicy.label),
              ],
            ),
            if (item.scores.reasons.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                item.scores.reasons.take(3).join(' · '),
                style: const TextStyle(
                  color: WaouhPalette.muted,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  height: 1.3,
                ),
              ),
            ],
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: acting ? null : onApproach,
              icon: const Icon(Icons.lock_outline_rounded, size: 17),
              label: const Text('Approcher via Avatar · contacts protégés'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(44),
              ),
            ),
          ],
        ),
      );
}

class _JourneyPill extends StatelessWidget {
  const _JourneyPill(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0xFFF2F6FC),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(
          text,
          style: const TextStyle(
            color: WaouhPalette.muted,
            fontSize: 8.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.subtitle});
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          Text(
            subtitle,
            style: const TextStyle(
              color: WaouhPalette.blue,
              fontSize: 9.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      );
}

class _JourneyError extends StatelessWidget {
  const _JourneyError(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF1F3),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF4CBD1)),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.info_outline_rounded,
              color: Color(0xFFC65363),
              size: 19,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  color: Color(0xFF8B424C),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      );
}

class _JourneyEmpty extends StatelessWidget {
  const _JourneyEmpty({
    required this.avatarName,
    required this.onMissions,
  });

  final String avatarName;
  final VoidCallback onMissions;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF3F7FF),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.radar_rounded,
              color: WaouhPalette.blue,
              size: 22,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '$avatarName garde cette recherche active dans Missions & veille.',
                style: const TextStyle(
                  color: WaouhPalette.ink,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            TextButton(
              onPressed: onMissions,
              child: const Text('Voir'),
            ),
          ],
        ),
      );
}
