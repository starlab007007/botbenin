import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_controller.dart';
import 'live_nexus_service.dart';
import 'live_models.dart';
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
  final Map<String, NexusOpportunityJourney> _journeys =
      <String, NexusOpportunityJourney>{};

  String get _modeKey => switch (widget.mode) {
        LiveAvatarCommerceMode.buy => 'buy',
        LiveAvatarCommerceMode.sell => 'sell',
        LiveAvatarCommerceMode.ask => 'ask',
      };

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_loadJourneys);
  }

  Future<void> _loadJourneys() async {
    try {
      final items = await _nexus.journeys();
      if (!mounted) return;
      setState(() {
        for (final item in items) {
          if (item.mode == _modeKey) _journeys[item.fabricId] = item;
        }
      });
    } catch (_) {
      // Fail-soft: la découverte reste utilisable même si l'historique tarde.
    }
  }

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


  double? get _enteredAmount {
    final value = _budget.text.replaceAll(RegExp(r'[^0-9.]'), '');
    return double.tryParse(value);
  }

  Future<NexusOpportunityJourney> _ensureJourney(
    NexusDiscoveryItem item,
  ) async {
    final existing = _journeys[item.fabricId];
    if (existing != null) return existing;
    final journey = await _nexus.startJourney(
      fabricId: item.fabricId,
      mode: _modeKey,
      title: item.title,
      city: item.city ?? (_city.text.trim().isEmpty ? null : _city.text.trim()),
      goal: _goal.text.trim().isEmpty ? item.title : _goal.text.trim(),
      askingPrice: widget.mode == LiveAvatarCommerceMode.sell
          ? _enteredAmount
          : null,
    );
    if (mounted) {
      setState(() => _journeys[item.fabricId] = journey);
    }
    return journey;
  }

  Future<void> _refreshJourney(
    NexusDiscoveryItem item,
    NexusOpportunityJourney journey,
  ) async {
    final fresh = await _nexus.journeyStatus(journey.id);
    if (!mounted) return;
    setState(() => _journeys[item.fabricId] = fresh);
  }

  Future<void> _followJourney(NexusDiscoveryItem item) async {
    final avatar = context.read<LiveAvatarController>();
    setState(() => _workingFabric = item.fabricId);
    try {
      var journey = await _ensureJourney(item);
      journey = await _nexus.followJourney(
        journeyId: journey.id,
        targetAmount: widget.mode == LiveAvatarCommerceMode.buy
            ? _enteredAmount
            : null,
      );
      if (!mounted) return;
      setState(() => _journeys[item.fabricId] = journey);
      avatar.showState(LiveAvatarPresenceState.watching);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '✓ Suivi actif. ${avatar.name} surveille le prix, la disponibilité et la prochaine action.',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e')),
      );
    } finally {
      if (mounted) setState(() => _workingFabric = null);
    }
  }

  Future<void> _continue(NexusDiscoveryItem item) async {
    final avatar = context.read<LiveAvatarController>();
    setState(() => _workingFabric = item.fabricId);
    avatar.setPersistentState(LiveAvatarPresenceState.negotiating);
    try {
      var journey = await _ensureJourney(item);

      if (journey.readyToNegotiate &&
          (journey.articleId ?? '').isNotEmpty &&
          (journey.threadId ?? '').isNotEmpty) {
        if (!mounted) return;
        await _showOfferSheet(item, journey);
        return;
      }

      journey = await _nexus.contactJourney(
        journeyId: journey.id,
        message: widget.mode == LiveAvatarCommerceMode.sell
            ? 'Bonjour, mon Avatar WAOUH a identifié votre besoin « ${item.title} ». Je souhaite vous faire une proposition et poursuivre dans WAOUH.'
            : 'Bonjour, mon Avatar WAOUH m’accompagne au sujet de « ${item.title} ». Êtes-vous disponible pour poursuivre et négocier dans WAOUH ?',
      );
      if (!mounted) return;
      setState(() => _journeys[item.fabricId] = journey);
      avatar.showState(
        journey.readyToNegotiate
            ? LiveAvatarPresenceState.found
            : LiveAvatarPresenceState.waiting,
      );

      if (journey.readyToNegotiate &&
          (journey.articleId ?? '').isNotEmpty &&
          (journey.threadId ?? '').isNotEmpty) {
        await _showOfferSheet(item, journey);
      } else {
        await _showJourneySheet(item, journey);
      }
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

  Future<void> _showJourneySheet(
    NexusDiscoveryItem item,
    NexusOpportunityJourney journey,
  ) async {
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _JourneySheet(
        avatarName: context.read<LiveAvatarController>().name,
        item: item,
        journey: journey,
        onRefresh: () async {
          Navigator.of(sheetContext).pop();
          await _refreshJourney(item, journey);
          if (!mounted) return;
          final fresh = _journeys[item.fabricId];
          if (fresh != null) {
            if (fresh.readyToNegotiate &&
                (fresh.articleId ?? '').isNotEmpty &&
                (fresh.threadId ?? '').isNotEmpty) {
              await _showOfferSheet(item, fresh);
            } else {
              await _showJourneySheet(item, fresh);
            }
          }
        },
        onNegotiate: journey.readyToNegotiate
            ? () {
                Navigator.of(sheetContext).pop();
                Future<void>.microtask(() => _showOfferSheet(item, journey));
              }
            : null,
      ),
    );
  }

  Future<void> _showOfferSheet(
    NexusDiscoveryItem item,
    NexusOpportunityJourney journey,
  ) async {
    if (!mounted) return;
    final listed = item.priceMin ?? item.priceMax ?? journey.proposedAmount;
    final controller = TextEditingController(
      text: listed == null || listed <= 0 ? '' : listed.round().toString(),
    );
    final suggestions = <int>{
      if (listed != null && listed > 0) listed.round(),
      if (listed != null && listed > 0) (listed * .95).round(),
      if (listed != null && listed > 0) (listed * .90).round(),
      if (_enteredAmount != null && _enteredAmount! > 0)
        _enteredAmount!.round(),
    }.where((value) => value > 0).toList()
      ..sort();

    final amount = await showModalBottomSheet<double>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
        ),
        child: Container(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.handshake_outlined, color: WaouhPalette.blue),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Proposer un prix',
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                        color: WaouhPalette.ink,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Ayo ouvre le Deal Room et reste avec vous jusqu’à l’accord. La contrepartie peut accepter, contre-proposer ou refuser.',
                style: TextStyle(
                  color: WaouhPalette.muted,
                  fontSize: 12,
                  height: 1.35,
                ),
              ),
              if (listed != null && listed > 0) ...[
                const SizedBox(height: 12),
                Text(
                  'Prix observé : ${listed.round()} FCFA',
                  style: const TextStyle(
                    color: Color(0xFF159A69),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
              if (suggestions.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(
                  spacing: 7,
                  runSpacing: 7,
                  children: suggestions
                      .map(
                        (value) => ActionChip(
                          label: Text('$value FCFA'),
                          onPressed: () => controller.text = '$value',
                        ),
                      )
                      .toList(),
                ),
              ],
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                autofocus: listed == null || listed <= 0,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Votre proposition',
                  suffixText: 'FCFA',
                  prefixIcon: Icon(Icons.payments_outlined),
                ),
              ),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: () {
                  final value = double.tryParse(
                    controller.text.replaceAll(RegExp(r'[^0-9.]'), ''),
                  );
                  if (value != null && value > 0) {
                    Navigator.of(sheetContext).pop(value);
                  }
                },
                icon: const Icon(Icons.send_rounded),
                label: const Text('Envoyer mon offre avec Ayo'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    controller.dispose();
    if (amount == null || !mounted) return;

    final avatar = context.read<LiveAvatarController>();
    avatar.setPersistentState(LiveAvatarPresenceState.negotiating);
    setState(() => _workingFabric = item.fabricId);
    try {
      final result = await _nexus.offerJourney(
        journeyId: journey.id,
        amount: amount,
      );
      final journeyRaw = result['journey'];
      if (journeyRaw is! Map) {
        throw StateError('WAOUH n’a pas retourné l’état de la démarche.');
      }
      final next = NexusOpportunityJourney.fromJson(
        Map<String, dynamic>.from(journeyRaw),
      );
      if (!mounted) return;
      setState(() => _journeys[item.fabricId] = next);
      avatar.showState(LiveAvatarPresenceState.negotiating);

      if ((next.articleId ?? '').isNotEmpty &&
          (next.threadId ?? '').isNotEmpty) {
        final role = widget.mode == LiveAvatarCommerceMode.sell
            ? 'seller'
            : 'buyer';
        final match = LiveMatch(
          key: liveMatchKey(
            next.articleId!,
            role,
            next.targetWaouhUserId,
            next.threadId,
          ),
          articleId: next.articleId!,
          role: role,
          title: item.title,
          lastAt: DateTime.now(),
          counterpartUserId: next.targetWaouhUserId,
          threadId: next.threadId,
          source: 'avatar_opportunity',
          negotiationId: next.negotiationId,
          dealId: next.dealId,
          seedText: next.avatarMessage,
          price: amount,
          city: item.city,
          photo: item.photoUrls.isEmpty ? null : item.photoUrls.first,
          photoUrls: item.photoUrls,
        );
        context.push(
          '/app/chat/match/${Uri.encodeComponent(match.key)}',
          extra: match,
        );
      } else {
        await _showJourneySheet(item, next);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e')),
      );
    } finally {
      if (mounted) setState(() => _workingFabric = null);
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
                          journey: _journeys[entry.value.fabricId],
                          onContinue: () => _continue(entry.value),
                          onFollow: () => _followJourney(entry.value),
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
    required this.onFollow,
    this.journey,
  });
  final int rank;
  final NexusDiscoveryItem item;
  final bool busy;
  final NexusOpportunityJourney? journey;
  final VoidCallback onContinue;
  final VoidCallback onFollow;

  String get _primaryLabel {
    final current = journey;
    if (current != null) {
      if (current.state == 'enriching') return 'Voir la recherche de contact';
      if (current.state == 'contacting') return 'Voir la mise en relation';
      if (current.state == 'waiting_response') return 'Voir le suivi du contact';
      if (current.readyToNegotiate) return 'Négocier avec mon Avatar';
    }
    if (item.internalArticle) return 'Je suis intéressé · proposer un prix';
    switch (item.contactPolicy.level) {
      case 'C0':
        return 'Trouver un moyen de contacter';
      case 'C1':
        return 'Contacter avec WAOUH';
      case 'C2':
        return 'Transmettre via WAOUH';
      case 'C3':
        return 'Envoyer avec mon Avatar';
      case 'C4':
        return 'Poursuivre le contact';
      case 'C5':
        return 'Négocier';
      default:
        return 'Continuer avec mon Avatar';
    }
  }

  IconData get _primaryIcon {
    final current = journey;
    if (current?.waiting == true) return Icons.route_rounded;
    if (current?.readyToNegotiate == true || item.internalArticle) {
      return Icons.handshake_outlined;
    }
    if (item.contactPolicy.level == 'C0') return Icons.manage_search_rounded;
    return Icons.send_rounded;
  }

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
            if (item.photoUrls.isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: AspectRatio(
                  aspectRatio: 16 / 10,
                  child: Image.network(
                    item.photoUrls.first,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: const Color(0xFFF2F5FA),
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.image_not_supported_outlined,
                        color: WaouhPalette.muted,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],
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
              icon: Icons.description_outlined,
              text: item.detailsSummary.isEmpty
                  ? 'Aucun détail complémentaire n’est fourni par la source.'
                  : item.detailsSummary,
              accent: const Color(0xFF61718D),
            ),
            const SizedBox(height: 7),
            _InfoStrip(
              icon: Icons.bar_chart_rounded,
              text: item.marketSummary,
              accent: const Color(0xFF159A69),
            ),
            const SizedBox(height: 7),
            _InfoStrip(
              icon: Icons.compare_arrows_rounded,
              text: item.comparativeSummary,
              accent: const Color(0xFF42658B),
            ),
            const SizedBox(height: 7),
            _InfoStrip(
              icon: Icons.auto_awesome_rounded,
              text: item.recommendationSummary,
              accent: const Color(0xFF8B6500),
            ),
            const SizedBox(height: 7),
            _InfoStrip(
              icon: item.internalArticle
                  ? Icons.lock_person_outlined
                  : Icons.shield_outlined,
              text: item.internalArticle
                  ? 'WAOUH ouvrira un Deal Room privé. Les contacts ne sont pas révélés directement.'
                  : 'Contact médié par NEXUS selon la politique ${item.contactPolicy.level}.',
              accent: WaouhPalette.blue,
            ),
            if (journey != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F8FF),
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: const Color(0xFFDCE7F8)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.route_rounded,
                            size: 17, color: WaouhPalette.blue),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Démarche WAOUH · ${journey!.progress}%',
                            style: const TextStyle(
                              color: WaouhPalette.ink,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEAF2FF),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            journey!.contactabilityLevel,
                            style: const TextStyle(
                              color: WaouhPalette.blue,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 7),
                    LinearProgressIndicator(
                      value: (journey!.progress / 100).clamp(0, 1),
                      minHeight: 5,
                      backgroundColor: const Color(0xFFE8EEF7),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    if ((journey!.avatarMessage ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 7),
                      Text(
                        journey!.avatarMessage!,
                        style: const TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w600,
                          height: 1.3,
                        ),
                      ),
                    ],
                    if ((journey!.contactLast4 ?? '').isNotEmpty) ...[
                      const SizedBox(height: 5),
                      Text(
                        '${journey!.contactChannel ?? 'Contact'} · +229 •••• ${journey!.contactLast4}',
                        style: const TextStyle(
                          color: Color(0xFF159A69),
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                    if ((journey!.nextAction ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 5),
                      Text(
                        'Prochaine étape : ${journey!.nextAction}',
                        style: const TextStyle(
                          color: WaouhPalette.ink,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: busy ? null : onContinue,
              icon: busy
                  ? const SizedBox.square(
                      dimension: 15,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(_primaryIcon),
              label: Text(_primaryLabel),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(47),
              ),
            ),
            const SizedBox(height: 7),
            OutlinedButton.icon(
              onPressed: busy ? null : onFollow,
              icon: Icon(
                journey?.state == 'enriching' || journey?.waiting == true
                    ? Icons.notifications_active_outlined
                    : Icons.notifications_none_rounded,
              ),
              label: Text(
                journey?.state == 'enriching'
                    ? 'Suivi actif · Ayo continue'
                    : 'Suivre prix / disponibilité',
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(45),
              ),
            ),
          ],
        ),
      );

}


class _JourneySheet extends StatelessWidget {
  const _JourneySheet({
    required this.avatarName,
    required this.item,
    required this.journey,
    required this.onRefresh,
    this.onNegotiate,
  });

  final String avatarName;
  final NexusDiscoveryItem item;
  final NexusOpportunityJourney journey;
  final Future<void> Function() onRefresh;
  final VoidCallback? onNegotiate;

  String get _stateLabel => switch (journey.state) {
        'enriching' => 'Recherche du meilleur contact',
        'contact_ready' => 'Contact prêt',
        'contacting' => 'Mise en relation en cours',
        'waiting_response' => 'En attente de réponse',
        'ready_to_negotiate' => 'Prêt à négocier',
        'negotiating' => 'Négociation en cours',
        'agreed' => 'Accord trouvé',
        'executing' => 'Exécution du deal',
        'completed' => 'Terminé',
        _ => 'Démarche active',
      };

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * .82,
          ),
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 22),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
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
                      color: const Color(0xFFD8DEE8),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F5FF),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.auto_awesome_rounded,
                          color: WaouhPalette.blue),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$avatarName vous accompagne',
                            style: const TextStyle(
                              color: WaouhPalette.ink,
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            _stateLabel,
                            style: const TextStyle(
                              color: WaouhPalette.blue,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${journey.progress}%',
                      style: const TextStyle(
                        color: WaouhPalette.blue,
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  item.title,
                  style: const TextStyle(
                    color: WaouhPalette.ink,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10),
                LinearProgressIndicator(
                  value: (journey.progress / 100).clamp(0, 1),
                  minHeight: 7,
                  borderRadius: BorderRadius.circular(99),
                  backgroundColor: const Color(0xFFE8EEF7),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: journey.timeline
                      .map(
                        (step) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 5),
                          decoration: BoxDecoration(
                            color: step.current
                                ? const Color(0xFFEAF2FF)
                                : step.done
                                    ? const Color(0xFFEAF8F2)
                                    : const Color(0xFFF4F6F9),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                step.done
                                    ? Icons.check_circle_rounded
                                    : step.current
                                        ? Icons.radio_button_checked_rounded
                                        : Icons.radio_button_unchecked_rounded,
                                size: 13,
                                color: step.done
                                    ? const Color(0xFF159A69)
                                    : step.current
                                        ? WaouhPalette.blue
                                        : WaouhPalette.muted,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                step.label,
                                style: const TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: WaouhPalette.ink,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 14),
                _InfoStrip(
                  icon: Icons.psychology_alt_rounded,
                  text: journey.avatarMessage ??
                      '$avatarName poursuit cette démarche dans WAOUH.',
                  accent: WaouhPalette.blue,
                ),
                if ((journey.contactChannel ?? '').isNotEmpty ||
                    (journey.contactLast4 ?? '').isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _InfoStrip(
                    icon: Icons.verified_user_outlined,
                    text: [
                      'Contact ${journey.contactabilityLevel}',
                      if ((journey.contactChannel ?? '').isNotEmpty)
                        journey.contactChannel!,
                      if ((journey.contactLast4 ?? '').isNotEmpty)
                        '+229 •••• ${journey.contactLast4}',
                    ].join(' · '),
                    accent: const Color(0xFF159A69),
                  ),
                ],
                const SizedBox(height: 8),
                _InfoStrip(
                  icon: Icons.flag_outlined,
                  text: 'Prochaine étape : ${journey.nextAction ?? 'Ayo continue le parcours'}',
                  accent: const Color(0xFF8B6500),
                ),
                const SizedBox(height: 14),
                if (onNegotiate != null)
                  FilledButton.icon(
                    onPressed: onNegotiate,
                    icon: const Icon(Icons.handshake_outlined),
                    label: const Text('Proposer un prix · ouvrir le Deal Room'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                    ),
                  )
                else
                  FilledButton.icon(
                    onPressed: () => onRefresh(),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Actualiser avec Ayo'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                    ),
                  ),
                const SizedBox(height: 8),
                const Text(
                  'Vous pouvez fermer cet écran : WAOUH conserve la démarche et la prochaine action.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: WaouhPalette.muted,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
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
