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
  List<NexusOpportunityJourney> _journeys = const <NexusOpportunityJourney>[];
  bool _loading = false;
  bool _loadingJourneys = false;
  String? _error;
  String? _workingFabric;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_loadJourneys);
  }

  Future<void> _loadJourneys() async {
    if (legacy.supabase.auth.currentUser == null || _loadingJourneys) return;
    if (mounted) setState(() => _loadingJourneys = true);
    try {
      final rows = await _nexus.listOpportunities(limit: 12);
      if (mounted) setState(() => _journeys = rows);
    } catch (_) {
      // Search and deal remain usable even if the summary cannot refresh.
    } finally {
      if (mounted) setState(() => _loadingJourneys = false);
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

  Map<String, dynamic> _interestMeta(NexusDiscoveryItem item, {double? offer}) {
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
      if (offer != null) 'offer_price': offer,
      if (offer != null) 'initial_offer_amount': offer,
      'fabric_id': item.fabricId,
      'contactability_level': item.contactPolicy.level,
      'nexus_total_score': item.scores.total,
      'nexus_trust_score': item.scores.trust,
      'nexus_reasons': item.scores.reasons,
    };
    meta.removeWhere((_, value) => value == null || '$value'.trim().isEmpty);
    return meta;
  }

  Future<double?> _askInitialOffer(NexusDiscoveryItem item) async {
    final displayed = item.priceMin ?? item.priceMax;
    final controller = TextEditingController(
      text: displayed == null ? '' : displayed.round().toString(),
    );
    final value = await showModalBottomSheet<double>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.fromLTRB(
          18, 18, 18, 20 + MediaQuery.viewInsetsOf(sheetContext).bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Votre Avatar ouvre le Deal Room',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 6),
            Text(
              'Proposez votre prix pour « ' + item.title +
                  ' ». Ensuite Avatar suit la réponse, vous suggère les contre-offres et conduit le deal jusqu’à l’accord.',
              style: const TextStyle(
                color: WaouhPalette.muted,
                fontSize: 11.5,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              autofocus: true,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Votre offre',
                suffixText: 'FCFA',
                helperText: displayed == null
                    ? 'Saisissez le montant que vous souhaitez proposer.'
                    : 'Prix affiché : ' + displayed.round().toString() + ' FCFA',
              ),
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: () {
                final amount = double.tryParse(
                  controller.text.replaceAll(RegExp(r'[^0-9]'), ''),
                );
                if (amount == null || amount <= 0) return;
                Navigator.of(sheetContext).pop(amount);
              },
              icon: const Icon(Icons.handshake_outlined),
              label: const Text('Envoyer mon offre'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)),
            ),
          ],
        ),
      ),
    );
    controller.dispose();
    return value;
  }

  Future<void> _internalInterest(NexusDiscoveryItem item) async {
    final offer = await _askInitialOffer(item);
    if (offer == null || offer <= 0 || !mounted) return;

    final controller = context.read<LiveWaouhController>();
    final avatar = context.read<LiveAvatarController>();
    setState(() => _workingFabric = item.fabricId);
    avatar.setPersistentState(LiveAvatarPresenceState.negotiating);
    try {
      final interestResponse = await legacy.supabase.functions.invoke(
        'waouh-buyer-interest',
        body: <String, dynamic>{
          'article_id': item.articleId,
          'source': 'avatar_commerce',
          'offer_price': offer,
          'initial_offer_amount': offer,
        },
      );
      final data = interestResponse.data is Map
          ? Map<String, dynamic>.from(interestResponse.data as Map)
          : <String, dynamic>{};
      if (data['error'] != null) {
        throw StateError(data['error'].toString());
      }

      final text = 'Je propose ' + offer.round().toString() +
          ' FCFA pour « ' + item.title + ' ».';
      final rawMeta = _interestMeta(item, offer: offer)
        ..addAll({
          if (data['thread_id'] != null) 'thread_id': data['thread_id'],
          if (data['negotiation_id'] != null)
            'negotiation_id': data['negotiation_id'],
          'workflow_state': data['workflow_state'] ?? 'proposed',
          'commerce_contract': 'waouh_action_v2',
        });
      final meta = liveCanonicalInterestedMeta(
        text: text,
        meta: rawMeta,
        authUserId: legacy.supabase.auth.currentUser?.id,
      );
      final seed = liveBuildInterestedEntryMatch(text: text, requestMeta: meta);

      await controller.sendMain(text: text, meta: meta);
      LiveMatch? match = controller.takePendingMeet();
      match ??= await controller.resolvePreparedInterestedMeet(seed);
      if (match == null || (match.threadId ?? '').trim().isEmpty) {
        throw StateError(
          'Votre offre est enregistrée. Avatar finalise l’ouverture du Deal Room.',
        );
      }
      if (!mounted) return;
      avatar.showState(LiveAvatarPresenceState.found);
      context.push('/app/chat/match/' + Uri.encodeComponent(match.key),
          extra: match);
    } catch (e) {
      if (!mounted) return;
      avatar.showState(LiveAvatarPresenceState.waiting);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Avatar garde votre démarche active. ' + e.toString(),
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _workingFabric = null);
    }
  }

  Future<void> _showJourneyStatus(
    NexusDiscoveryItem item,
    NexusOpportunityJourney journey, {
    bool contactSent = false,
  }) async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (sheetContext) => Padding(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              contactSent
                  ? 'Avatar suit maintenant le contact'
                  : 'Avatar poursuit la recherche de contact',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 6),
            Text(
              item.title,
              style: const TextStyle(color: WaouhPalette.muted),
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: (journey.progress.clamp(0, 100)) / 100,
              minHeight: 8,
              borderRadius: BorderRadius.circular(99),
            ),
            const SizedBox(height: 8),
            Text(
              journey.progress.toString() + '% · ' +
                  journey.contactability + ' · ' + journey.stage,
              style: const TextStyle(
                color: WaouhPalette.blue,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              journey.lastMessage ??
                  'Votre démarche reste active dans WAOUH.',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              'Prochaine étape : ' + journey.nextAction,
              style: const TextStyle(
                color: WaouhPalette.muted,
                fontSize: 11.5,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: () => Navigator.of(sheetContext).pop(),
              icon: const Icon(Icons.check_circle_outline_rounded),
              label: const Text('Compris · Avatar continue'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _mediatedContact(NexusDiscoveryItem item) async {
    final avatar = context.read<LiveAvatarController>();
    setState(() => _workingFabric = item.fabricId);
    avatar.setPersistentState(LiveAvatarPresenceState.negotiating);
    try {
      var journey = await _nexus.startOpportunity(
        fabricId: item.fabricId,
        mode: widget.mode == LiveAvatarCommerceMode.sell ? 'sell' : 'buy',
      );
      var prepared = await _nexus.prepareContact(item.fabricId);

      if (!prepared.policy.canBlindMessage &&
          !prepared.policy.canAutoContact) {
        journey = await _nexus.enrichOpportunity(
          fabricId: item.fabricId,
          mode: widget.mode == LiveAvatarCommerceMode.sell ? 'sell' : 'buy',
        );
        prepared = await _nexus.prepareContact(item.fabricId);
      }

      if (!prepared.policy.canBlindMessage &&
          !prepared.policy.canAutoContact) {
        if (!mounted) return;
        avatar.showState(LiveAvatarPresenceState.watching);
        await _showJourneyStatus(item, journey);
        return;
      }

      final contactMessage = widget.mode == LiveAvatarCommerceMode.sell
          ? 'Bonjour, mon Avatar WAOUH accompagne un vendeur dont l’offre correspond à votre besoin « ' +
              item.title +
              ' ». Souhaitez-vous poursuivre la discussion dans WAOUH ?'
          : 'Bonjour, mon Avatar WAOUH accompagne un utilisateur intéressé par « ' +
              item.title +
              ' ». Est-ce toujours disponible ? Nous pouvons poursuivre dans WAOUH.';
      final result = await _nexus.sendContact(
        fabricId: item.fabricId,
        message: contactMessage,
      );
      if (result['journey'] is Map) {
        journey = NexusOpportunityJourney.fromJson(
          Map<String, dynamic>.from(result['journey'] as Map),
        );
      } else {
        journey = await _nexus.opportunityStatus(journeyId: journey.id);
      }
      if (!mounted) return;
      avatar.showState(LiveAvatarPresenceState.waiting);
      await _showJourneyStatus(item, journey, contactSent: true);
    } catch (e) {
      if (!mounted) return;
      avatar.showState(LiveAvatarPresenceState.watching);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'La démarche reste enregistrée dans WAOUH. Avatar réessaiera le chemin de contact. ' +
                e.toString(),
          ),
        ),
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

  String _journeyStageLabel(String stage) => switch (stage) {
        'discovered' => 'Trouvée',
        'enriching' => 'Vérification du contact',
        'contact_ready' => 'Contact prêt',
        'contacting' => 'Contact en cours',
        'waiting_reply' => 'En attente de réponse',
        'negotiating' => 'Négociation',
        'agreed' => 'Accord',
        'executing' => 'Exécution',
        'completed' => 'Terminé',
        'cancelled' => 'Annulé',
        _ => stage.replaceAll('_', ' '),
      };

  Future<void> _openJourneyDealRoom(NexusOpportunityJourney journey) async {
    final threadId = journey.threadId?.trim() ?? '';
    if (threadId.isEmpty) {
      await _showJourneyProgress(journey);
      return;
    }
    final controller = context.read<LiveWaouhController>();
    try {
      final matches = await controller.notifications.loadMatches(
        legacy.supabase.auth.currentUser?.id,
        force: true,
      );
      LiveMatch? match;
      for (final candidate in matches) {
        if ((candidate.threadId ?? '').trim() == threadId) {
          match = candidate;
          break;
        }
      }
      if (!mounted) return;
      if (match != null) {
        context.push(
          '/app/chat/match/' + Uri.encodeComponent(match.key),
          extra: match,
        );
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Le Deal Room est prêt. Avatar synchronise la conversation avant de l’ouvrir.',
          ),
        ),
      );
      context.go('/app/chat');
    } catch (_) {
      if (!mounted) return;
      context.go('/app/chat');
    }
  }

  Future<void> _showJourneyProgress(NexusOpportunityJourney journey) async {
    NexusOpportunityJourney current = journey;
    try {
      current = await _nexus.opportunityStatus(journeyId: journey.id);
      if (mounted) {
        setState(() {
          _journeys = _journeys
              .map((entry) => entry.id == current.id ? current : entry)
              .toList(growable: false);
        });
      }
    } catch (_) {}
    if (!mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (sheetContext) {
        final phones = current.maskedContact['phones'];
        final maskedPhones = phones is List
            ? phones.whereType<Map>().map((entry) {
                final last4 = '${entry['last4'] ?? ''}'.trim();
                final country = '${entry['country_code'] ?? ''}'.trim();
                final channel = '${entry['channel'] ?? 'contact'}'.trim();
                return last4.isEmpty
                    ? null
                    : '$channel · ${country.isEmpty ? '' : '$country '}•••• $last4';
              }).whereType<String>().toList(growable: false)
            : const <String>[];

        return Padding(
          padding: EdgeInsets.fromLTRB(
            18,
            18,
            18,
            22 + MediaQuery.viewInsetsOf(sheetContext).bottom,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Votre démarche WAOUH',
                  style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 5),
                Text(
                  current.subject ?? 'Opportunité suivie par Avatar',
                  style: const TextStyle(
                    color: WaouhPalette.muted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                LinearProgressIndicator(
                  value: current.progress.clamp(0, 100) / 100,
                  minHeight: 8,
                  borderRadius: BorderRadius.circular(99),
                ),
                const SizedBox(height: 8),
                Text(
                  '${current.progress}% · ${current.contactability} · ${_journeyStageLabel(current.stage)}',
                  style: const TextStyle(
                    color: WaouhPalette.blue,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 12),
                _InfoStrip(
                  icon: Icons.auto_awesome_rounded,
                  text: current.lastMessage ??
                      'Avatar continue automatiquement cette démarche.',
                  accent: const Color(0xFF7B61B7),
                ),
                const SizedBox(height: 7),
                _InfoStrip(
                  icon: Icons.arrow_forward_rounded,
                  text: 'Prochaine étape : ${current.nextAction}',
                  accent: const Color(0xFF159A69),
                ),
                if (maskedPhones.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  const Text(
                    'Contact vérifié / masqué',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: maskedPhones
                        .map((value) => Chip(
                              avatar: const Icon(Icons.shield_outlined, size: 16),
                              label: Text(value),
                            ))
                        .toList(),
                  ),
                ],
                if (current.timeline.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  const Text(
                    'Dernières étapes',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  ...current.timeline.reversed.take(4).map((event) {
                    final text = '${event['message'] ?? event['action'] ?? event['stage'] ?? ''}'.trim();
                    if (text.isEmpty) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.check_circle_outline_rounded,
                            size: 16,
                            color: Color(0xFF159A69),
                          ),
                          const SizedBox(width: 7),
                          Expanded(
                            child: Text(
                              text,
                              style: const TextStyle(
                                color: WaouhPalette.muted,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
                const SizedBox(height: 14),
                if (current.negotiating &&
                    (current.threadId ?? '').trim().isNotEmpty)
                  FilledButton.icon(
                    onPressed: () {
                      Navigator.of(sheetContext).pop();
                      Future<void>.microtask(
                        () => _openJourneyDealRoom(current),
                      );
                    },
                    icon: const Icon(Icons.handshake_outlined),
                    label: const Text('Continuer la négociation'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                    ),
                  )
                else
                  FilledButton.icon(
                    onPressed: () async {
                      Navigator.of(sheetContext).pop();
                      await _loadJourneys();
                    },
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Actualiser la progression'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _followOpportunity(NexusDiscoveryItem item) async {
    final targetController = TextEditingController(
      text: (item.priceMin ?? item.priceMax)?.round().toString() ?? '',
    );
    final target = await showModalBottomSheet<double?>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.fromLTRB(
          18,
          18,
          18,
          20 + MediaQuery.viewInsetsOf(sheetContext).bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Suivre prix et disponibilité',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 5),
            const Text(
              'Avatar surveille cette opportunité et vous avertit lorsqu’un changement mérite votre attention.',
              style: TextStyle(color: WaouhPalette.muted, fontSize: 11.5),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: targetController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Prix cible (optionnel)',
                suffixText: 'FCFA',
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () {
                final raw = targetController.text
                    .replaceAll(RegExp(r'[^0-9]'), '');
                Navigator.of(sheetContext).pop(
                  raw.isEmpty ? null : double.tryParse(raw),
                );
              },
              icon: const Icon(Icons.notifications_active_outlined),
              label: const Text('Activer le suivi'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
            ),
          ],
        ),
      ),
    );
    targetController.dispose();
    if (!mounted) return;
    try {
      await _nexus.createWatch(
        query: item.title,
        articleId: item.articleId,
        sourceUrl: item.sourceUrl,
        targetAmount: target,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Suivi activé. Avatar vous préviendra ici dès qu’un prix ou une disponibilité change.',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Le suivi n’a pas pu être activé : $e')),
      );
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
