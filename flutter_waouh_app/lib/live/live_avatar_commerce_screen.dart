import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_commerce_action_client.dart';
import 'live_controller.dart';
import 'live_nexus_service.dart';
import 'live_models.dart';
import 'live_thread_flow.dart';
import 'live_theme.dart';
import 'live_widgets.dart';
import 'live_hot_labels.dart';

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
  List<Map<String, dynamic>> _conversationBus = const <Map<String, dynamic>>[];
  bool _loading = false;
  bool _loadingJourneys = false;
  bool _loadingBus = false;
  String? _error;
  String? _workingFabric;
  Map<String, dynamic>? _mandate;
  String _autonomyMode = 'semi_autonomous';
  int _maxContacts = 3;
  int _maxFollowups = 1;
  bool _allowSmsRcs = false;
  bool _mandateBusy = false;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      await _loadJourneys();
      await _loadMandate();
      await _loadConversationBus();
    });
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

  Future<void> _loadConversationBus() async {
    if (legacy.supabase.auth.currentUser == null || _loadingBus) return;
    if (mounted) setState(() => _loadingBus = true);
    try {
      final rows = await _nexus.conversationBus(limit: 30);
      if (mounted) setState(() => _conversationBus = rows);
    } catch (_) {
      // Le parcours principal reste disponible même si le journal multicanal ne charge pas.
    } finally {
      if (mounted) setState(() => _loadingBus = false);
    }
  }

  Future<void> _loadMandate() async {
    if (legacy.supabase.auth.currentUser == null) return;
    try {
      final data = await _nexus.listMandates();
      final rows = data['mandates'];
      if (rows is! List || !mounted) return;
      Map<String, dynamic>? current;
      for (final raw in rows) {
        if (raw is! Map) continue;
        final row = Map<String, dynamic>.from(raw);
        final status = '${row['status'] ?? ''}';
        if (status == 'active' || status == 'paused') {
          current = row;
          break;
        }
      }
      if (!mounted) return;
      setState(() {
        _mandate = current;
        if (current != null) {
          _autonomyMode = '${current['autonomy_mode'] ?? 'semi_autonomous'}';
          _maxContacts = int.tryParse('${current['max_contacts'] ?? 3}') ?? 3;
          _maxFollowups = int.tryParse('${current['max_followups'] ?? 1}') ?? 1;
          _allowSmsRcs = current['allow_sms_rcs'] == true;
        }
      });
    } catch (_) {}
  }

  Future<void> _createMandate() async {
    final query = _goal.text.trim();
    if (query.isEmpty || _mandateBusy) return;
    setState(() => _mandateBusy = true);
    try {
      final budget = double.tryParse(_budget.text.replaceAll(RegExp(r'[^0-9.]'), ''));
      final mode = switch (widget.mode) {
        LiveAvatarCommerceMode.sell => 'sell',
        LiveAvatarCommerceMode.ask => 'ask',
        LiveAvatarCommerceMode.buy => 'buy',
      };
      final data = await _nexus.createMandate(
        mode: mode,
        goal: query,
        autonomyMode: _autonomyMode,
        city: _city.text.trim().isEmpty ? null : _city.text.trim(),
        budgetMax: budget,
        maxContacts: _maxContacts,
        maxFollowups: _autonomyMode == 'assisted' ? 0 : _maxFollowups,
        allowSmsRcs: _allowSmsRcs,
        durationHours: 24,
        scanIntervalMinutes: 60,
      );
      final raw = data['mandate'];
      if (raw is Map && mounted) {
        setState(() => _mandate = Map<String, dynamic>.from(raw));
      }
      final rawResults = data['results'];
      if (rawResults is List && mounted) {
        final response = NexusDiscoveryResponse.fromJson(<String, dynamic>{
          'mode': _findSellers ? 'find_sellers' : 'find_buyers',
          'results': rawResults,
          'source_mix': const <String, dynamic>{},
          'refresh': const <String, dynamic>{},
        });
        setState(() => _response = response);
      }
      await _loadConversationBus();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mandat confié à Bot pendant 24 h.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Mandat non créé : $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _mandateBusy = false);
    }
  }

  Future<void> _toggleMandate() async {
    final current = _mandate;
    if (current == null || _mandateBusy) return;
    final id = '${current['id'] ?? ''}';
    if (id.isEmpty) return;
    setState(() => _mandateBusy = true);
    try {
      final next = '${current['status']}' == 'active' ? 'paused' : 'active';
      final data = await _nexus.updateMandate(id, status: next);
      final raw = data['mandate'];
      if (raw is Map && mounted) setState(() => _mandate = Map<String, dynamic>.from(raw));
    } finally {
      if (mounted) setState(() => _mandateBusy = false);
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

  Future<double?> _askInitialOffer(NexusDiscoveryItem item, {bool external = false}) async {
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
              // Vendeur externe : rien n'est envoyé ici, l'envoi se fait d'un tap dans la Deal Room.
              label: Text(external ? 'Préparer mon offre' : 'Envoyer mon offre'),
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
      await _loadJourneys();
      if (!mounted) return;
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

  /// Résultat Nexus externe : entrée directe en Deal Room (aucun message au vendeur tiers). Retourne
  /// `false` quand le serveur garde la fiche de contact (drapeau coupé) : l'appelant reprend l'ancien chemin.
  Future<bool> _externalDirectDeal(NexusDiscoveryItem item) async {
    final offer = await _askInitialOffer(item, external: true);
    if (offer == null || offer <= 0 || !mounted) return true;
    final controller = context.read<LiveWaouhController>();
    final avatar = context.read<LiveAvatarController>();
    setState(() => _workingFabric = item.fabricId);
    avatar.setPersistentState(LiveAvatarPresenceState.negotiating);
    try {
      final response = await controller.sendCommerceAction(
        liveExternalDealRequest(item.fabricId, amount: offer),
      );
      switch (liveExternalDealStatus(response)) {
        case LiveExternalDealStatus.fallback:
          return false;
        case LiveExternalDealStatus.refused:
          if (!mounted) return true;
          avatar.showState(LiveAvatarPresenceState.watching);
          final reply = response?['reply'];
          final detail = reply is Map ? '${reply['title'] ?? ''} · ${reply['detail'] ?? ''}' : 'Rien n’a été envoyé. Réessayez.';
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(detail)));
          return true;
        case LiveExternalDealStatus.opened:
          final articleId = '${response!['article_id']}';
          final threadId = '${response['thread_id']}';
          final match = LiveMatch(
            key: liveMatchKey(articleId, 'buyer', null, threadId),
            articleId: articleId,
            role: 'buyer',
            title: item.title,
            lastAt: DateTime.now(),
            threadId: threadId,
            negotiationId: response['negotiation_id']?.toString(),
            source: 'nexus_direct_deal',
            price: item.priceMin ?? item.priceMax,
            city: item.city,
          );
          if (!mounted) return true;
          avatar.showState(LiveAvatarPresenceState.found);
          await _loadJourneys();
          if (!mounted) return true;
          context.push('/app/chat/match/' + Uri.encodeComponent(match.key), extra: match);
          return true;
      }
    } catch (_) {
      if (!mounted) return true;
      avatar.showState(LiveAvatarPresenceState.watching);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Rien n’a été envoyé. Réessayez.')),
      );
      return true;
    } finally {
      if (mounted) setState(() => _workingFabric = null);
    }
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
          !prepared.policy.canAutoContact &&
          !prepared.policy.canUserConfirmContact) {
        journey = await _nexus.enrichOpportunity(
          fabricId: item.fabricId,
          mode: widget.mode == LiveAvatarCommerceMode.sell ? 'sell' : 'buy',
        );
        prepared = await _nexus.prepareContact(item.fabricId);
      }

      if (!prepared.policy.canBlindMessage &&
          !prepared.policy.canAutoContact &&
          !prepared.policy.canUserConfirmContact) {
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
      await _loadJourneys();
      await _loadConversationBus();
      if (!mounted) return;
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
      return;
    }

    if (widget.mode != LiveAvatarCommerceMode.sell &&
        liveIsDirectDealCandidate(
          fabricId: item.fabricId,
          intent: item.intent,
          actorType: item.actorType,
        ) &&
        await _externalDirectDeal(item)) {
      return;
    }

    if (item.contactPolicy.level == 'C4' ||
        item.contactPolicy.level == 'C5') {
      try {
        final journey = await _nexus.startOpportunity(
          fabricId: item.fabricId,
          mode: widget.mode == LiveAvatarCommerceMode.sell ? 'sell' : 'buy',
        );
        await _loadJourneys();
        if (!mounted) return;
        if (journey.negotiating &&
            (journey.threadId ?? '').trim().isNotEmpty) {
          await _openJourneyDealRoom(journey);
        } else {
          await _showJourneyProgress(journey);
        }
      } catch (_) {
        await _mediatedContact(item);
      }
      return;
    }

    await _mediatedContact(item);
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
                  '${current.progress}% · ${current.contactability}' +
                      ((current.readinessLevel ?? '').isEmpty ? '' : ' · ${current.readinessLevel}') +
                      ((current.actionabilityScore ?? 0) <= 0 ? '' : ' · Action ${current.actionabilityScore!.round()}%') +
                      ' · ${_journeyStageLabel(current.stage)}',
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

  Widget _mandateSurface() {
    final current = _mandate;
    if (current != null) {
      final status = '${current['status'] ?? 'active'}';
      final contacted = '${current['contacted_count'] ?? 0}';
      final replied = '${current['replied_count'] ?? 0}';
      final mode = '${current['autonomy_mode'] ?? 'semi_autonomous'}';
      final modeLabel = mode == 'assisted' ? 'Assisté' : mode == 'autonomous' ? 'Autonome' : 'Semi-auto';
      return Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: const Color(0xFFF8F4FF),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFE4D8FF)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(children: [
              Icon(Icons.bolt_rounded, color: Color(0xFF6D3FD1)),
              SizedBox(width: 7),
              Expanded(child: Text('Mandat Avatar · Opportunity OS', style: TextStyle(fontWeight: FontWeight.w900))),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: _MandateMetric(label: 'Contactés', value: contacted)),
              const SizedBox(width: 7),
              Expanded(child: _MandateMetric(label: 'Réponses', value: replied)),
              const SizedBox(width: 7),
              Expanded(child: _MandateMetric(label: 'Mode', value: modeLabel)),
            ]),
            const SizedBox(height: 9),
            Text('${current['goal'] ?? ''}', maxLines: 2, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: WaouhPalette.muted, fontWeight: FontWeight.w700)),
            const SizedBox(height: 9),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              dense: true,
              title: const Text('SMS/RCS consentis', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
              subtitle: const Text('Seulement si la contrepartie a déjà accepté ce canal.', style: TextStyle(fontSize: 9.5)),
              value: current['allow_sms_rcs'] == true,
              onChanged: _mandateBusy ? null : (value) async {
                setState(() => _mandateBusy = true);
                try {
                  final data = await _nexus.updateMandate(
                    '${current['id']}',
                    allowSmsRcs: value,
                  );
                  final raw = data['mandate'];
                  if (raw is Map && mounted) {
                    setState(() {
                      _mandate = Map<String, dynamic>.from(raw);
                      _allowSmsRcs = value;
                    });
                  }
                } finally {
                  if (mounted) setState(() => _mandateBusy = false);
                }
              },
            ),
            OutlinedButton.icon(
              onPressed: _mandateBusy ? null : _toggleMandate,
              icon: Icon(status == 'active' ? Icons.pause_rounded : Icons.play_arrow_rounded),
              label: Text(status == 'active' ? 'Mettre en pause' : 'Reprendre'),
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44)),
            ),
          ],
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F4FF),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE4D8FF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Confier cette mission à Bot', style: TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF382567))),
          const SizedBox(height: 4),
          const Text('Bot surveille NEXUS pendant 24 h et agit uniquement dans les limites que vous fixez.',
            style: TextStyle(fontSize: 10.5, color: WaouhPalette.muted)),
          const SizedBox(height: 9),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'assisted', label: Text('Assisté')),
              ButtonSegment(value: 'semi_autonomous', label: Text('Semi-auto')),
              ButtonSegment(value: 'autonomous', label: Text('Autonome')),
            ],
            selected: <String>{_autonomyMode},
            onSelectionChanged: (value) => setState(() {
              _autonomyMode = value.first;
              if (_autonomyMode == 'assisted') {
                _maxFollowups = 0;
              } else if (_maxFollowups == 0) {
                _maxFollowups = _autonomyMode == 'autonomous' ? 2 : 1;
              }
            }),
            showSelectedIcon: false,
          ),
          const SizedBox(height: 9),
          Row(children: [
            const Expanded(child: Text('Contacts maximum', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800))),
            DropdownButton<int>(
              value: _maxContacts,
              items: const [1,3,5,10,20].map((value) => DropdownMenuItem(value: value, child: Text('$value'))).toList(),
              onChanged: (value) { if (value != null) setState(() => _maxContacts = value); },
            ),
          ]),
          Row(children: [
            const Expanded(child: Text('Relances maximum · 24 h min.', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800))),
            DropdownButton<int>(
              value: _autonomyMode == 'assisted' ? 0 : _maxFollowups,
              items: const [0,1,2,3,5].map((value) => DropdownMenuItem(value: value, child: Text('$value'))).toList(),
              onChanged: _autonomyMode == 'assisted'
                  ? null
                  : (value) { if (value != null) setState(() => _maxFollowups = value); },
            ),
          ]),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: const Text('Autoriser SMS/RCS consentis', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
            subtitle: const Text(
              'Désactivé par défaut. Bot l’utilise uniquement pour un consentement Native Messaging déjà actif.',
              style: TextStyle(fontSize: 9.5, color: WaouhPalette.muted),
            ),
            value: _allowSmsRcs,
            onChanged: (value) => setState(() => _allowSmsRcs = value),
          ),
          FilledButton.icon(
            onPressed: _mandateBusy || _goal.text.trim().isEmpty ? null : _createMandate,
            icon: _mandateBusy
              ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.smart_toy_outlined),
            label: const Text('Confier à Bot pendant 24 h'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48), backgroundColor: const Color(0xFF6D3FD1)),
          ),
          const SizedBox(height: 5),
          const Text('Aucun paiement, changement de budget ou partage de contact privé sans règle explicite.',
            style: TextStyle(fontSize: 9.5, color: WaouhPalette.muted)),
        ],
      ),
    );
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
            if (_loadingJourneys || _journeys.isNotEmpty) ...[
              _ActiveJourneysPanel(
                journeys: _journeys,
                loading: _loadingJourneys,
                onRefresh: _loadJourneys,
                onOpen: (journey) => journey.negotiating &&
                        (journey.threadId ?? '').trim().isNotEmpty
                    ? _openJourneyDealRoom(journey)
                    : _showJourneyProgress(journey),
                stageLabel: _journeyStageLabel,
              ),
              const SizedBox(height: 12),
            ],
            if (_loadingBus || _conversationBus.isNotEmpty) ...[
              _ConversationBusPanel(
                events: _conversationBus,
                loading: _loadingBus,
                onRefresh: _loadConversationBus,
              ),
              const SizedBox(height: 12),
            ],
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
            const SizedBox(height: 12),
            _mandateSurface(),
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
                          onFollow: () => _followOpportunity(entry.value),
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

class _MandateMetric extends StatelessWidget {
  const _MandateMetric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 9),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE4D8FF)),
        ),
        child: Column(
          children: [
            Text(label,
                style: const TextStyle(
                  color: WaouhPalette.muted,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                )),
            const SizedBox(height: 2),
            Text(value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF6D3FD1),
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                )),
          ],
        ),
      );
}

class _ConversationBusPanel extends StatelessWidget {
  const _ConversationBusPanel({
    required this.events,
    required this.loading,
    required this.onRefresh,
  });

  final List<Map<String, dynamic>> events;
  final bool loading;
  final VoidCallback onRefresh;

  String _title(String type) => switch (type) {
        'nexus.counterparty_reply' => 'Réponse reçue',
        'autonomy.external_contact_queued' => 'Avatar a contacté une opportunité',
        'autonomy.internal_contact_delivered' => 'Contact WAOUH transmis',
        'autonomy.followup_queued' => 'Relance Avatar',
        'nexus.contact.queued' => 'Contact mis en file',
        'avatar.mandate.created' => 'Mandat Avatar activé',
        _ => type.replaceAll('.', ' ').replaceAll('_', ' '),
      };

  String _text(Map<String, dynamic> event) {
    final raw = event['payload'];
    final payload = raw is Map
        ? Map<String, dynamic>.from(raw)
        : const <String, dynamic>{};
    for (final key in const ['reply_preview', 'text', 'subject', 'message']) {
      final value = '${payload[key] ?? ''}'.trim();
      if (value.isNotEmpty) return value;
    }
    final fabric = '${event['fabric_id'] ?? ''}'.trim();
    return fabric.isEmpty ? 'Événement WAOUH' : 'Opportunité $fabric';
  }

  String _date(dynamic value) {
    final parsed = DateTime.tryParse('${value ?? ''}');
    if (parsed == null) return '';
    final local = parsed.toLocal();
    String two(int number) => number.toString().padLeft(2, '0');
    return '${two(local.day)}/${two(local.month)} ${two(local.hour)}:${two(local.minute)}';
  }

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: const Color(0xFFF7FAFC),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFDCE7F0)),
          boxShadow: WaouhShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.hub_outlined, color: Color(0xFF0F7B6C)),
              const SizedBox(width: 7),
              const Expanded(
                child: Text(
                  'Activité multicanale',
                  style: TextStyle(
                    color: WaouhPalette.ink,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Actualiser',
                onPressed: loading ? null : onRefresh,
                icon: loading
                    ? const SizedBox.square(
                        dimension: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.refresh_rounded),
              ),
            ]),
            const Text(
              'WAOUH · WhatsApp · NEXUS · Deal Room dans un seul journal.',
              style: TextStyle(
                color: WaouhPalette.muted,
                fontSize: 10.5,
                height: 1.3,
              ),
            ),
            if (events.isNotEmpty) ...[
              const SizedBox(height: 9),
              ...events.take(8).map((event) {
                final type = '${event['event_type'] ?? 'event'}';
                final channel = '${event['channel'] ?? 'waouh'}';
                final direction = '${event['direction'] ?? 'system'}';
                final threadId = '${event['thread_id'] ?? ''}'.trim();
                final date = _date(event['created_at']);
                final directionLabel = direction == 'in'
                    ? 'Entrant'
                    : direction == 'out'
                        ? 'Sortant'
                        : 'Système';
                return Container(
                  margin: const EdgeInsets.only(bottom: 7),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: const Color(0xFFE7EDF2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Expanded(
                          child: Text(
                            _title(type),
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        Text(
                          channel,
                          style: const TextStyle(
                            color: Color(0xFF0F7B6C),
                            fontSize: 9.5,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ]),
                      const SizedBox(height: 3),
                      Text(
                        _text(event),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 10.5,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$directionLabel'
                        '${date.isEmpty ? '' : ' · $date'}'
                        '${threadId.isEmpty ? '' : ' · Deal Room lié'}',
                        style: const TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ],
        ),
      );
}

class _ActiveJourneysPanel extends StatelessWidget {
  const _ActiveJourneysPanel({
    required this.journeys,
    required this.loading,
    required this.onRefresh,
    required this.onOpen,
    required this.stageLabel,
  });

  final List<NexusOpportunityJourney> journeys;
  final bool loading;
  final VoidCallback onRefresh;
  final ValueChanged<NexusOpportunityJourney> onOpen;
  final String Function(String) stageLabel;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FBFF),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFDCE7F8)),
          boxShadow: WaouhShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.route_rounded, color: WaouhPalette.blue),
                const SizedBox(width: 7),
                const Expanded(
                  child: Text(
                    'Mes démarches',
                    style: TextStyle(
                      color: WaouhPalette.ink,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Actualiser',
                  onPressed: loading ? null : onRefresh,
                  icon: loading
                      ? const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh_rounded),
                ),
              ],
            ),
            const Text(
              'Avatar conserve chaque opportunité jusqu’à la réponse, la négociation, l’accord et l’exécution.',
              style: TextStyle(
                color: WaouhPalette.muted,
                fontSize: 11,
                height: 1.35,
              ),
            ),
            if (journeys.isNotEmpty) ...[
              const SizedBox(height: 9),
              ...journeys.take(4).map(
                (journey) => Padding(
                  padding: const EdgeInsets.only(bottom: 7),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => onOpen(journey),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: WaouhPalette.line),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  journey.subject ?? 'Démarche WAOUH',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: WaouhPalette.ink,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${journey.progress}%',
                                style: const TextStyle(
                                  color: WaouhPalette.blue,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 5),
                          LinearProgressIndicator(
                            value: journey.progress.clamp(0, 100) / 100,
                            minHeight: 5,
                            borderRadius: BorderRadius.circular(99),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${journey.contactability} · ${stageLabel(journey.stage)} · ${journey.nextAction}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: WaouhPalette.muted,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      );
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
                      fontSize: 11,
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
                  fontSize: 10.5,
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
                fontSize: 11,
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

String _nextBestActionLabel(String? value) => switch ((value ?? '').toUpperCase()) {
      'CONTACT_NOW' => 'contacter maintenant',
      'OPEN_DEAL_ROOM' => 'ouvrir le Deal Room',
      'REQUEST_APPROVAL' => 'valider le contact',
      'WAIT_REPLY' => 'attendre la réponse',
      'FOLLOW_UP' => 'relancer',
      'NEGOTIATE' => 'négocier',
      'EXECUTE' => 'exécuter l’accord',
      'COMPLETE' => 'terminé',
      'DROP_LOW_QUALITY' => 'priorité faible',
      _ => 'enrichir le contact',
    };

class _OpportunityCard extends StatelessWidget {
  const _OpportunityCard({
    required this.rank,
    required this.item,
    required this.busy,
    required this.onContinue,
    required this.onFollow,
  });
  final int rank;
  final NexusDiscoveryItem item;
  final bool busy;
  final VoidCallback onContinue;
  final VoidCallback onFollow;

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
                          if ((item.readinessLevel ?? item.contactPack?.readiness)?.isNotEmpty == true)
                            item.readinessLevel ?? item.contactPack!.readiness,
                          if (item.actionabilityScore != null || item.contactPack != null)
                            'Action ${(item.actionabilityScore ?? item.contactPack!.actionabilityScore).round()}%',
                        ].join(' · '),
                        style: const TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 10.5,
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
            if (item.actionabilityScore != null || item.contactPack != null) ...[
              const SizedBox(height: 7),
              _ScoreBar(
                label: 'Actionnable',
                value: item.actionabilityScore ?? item.contactPack!.actionabilityScore,
              ),
            ],
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
            if (item.nextBestAction != null || item.contactPack != null) ...[
              _InfoStrip(
                icon: Icons.bolt_rounded,
                text: 'Bot recommande : ' + _nextBestActionLabel(item.nextBestAction ?? item.contactPack!.nextBestAction) +
                    ((item.bestChannel ?? item.contactPack?.bestChannel)?.isNotEmpty == true
                        ? ' · canal ' + (item.bestChannel ?? item.contactPack!.bestChannel!)
                        : ''),
                accent: const Color(0xFF6D3FD1),
              ),
              const SizedBox(height: 7),
            ],
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
                  : Icon(
                      item.internalArticle
                          ? Icons.handshake_outlined
                          : item.contactPolicy.level == 'C0'
                              ? Icons.travel_explore_rounded
                              : item.contactPolicy.level == 'C5'
                                  ? Icons.handshake_rounded
                                  : Icons.send_rounded,
                    ),
              label: Text(
                item.internalArticle
                    ? 'Je suis intéressé · proposer un prix'
                    : item.contactPolicy.level == 'C5'
                        ? 'Continuer vers l’accord'
                        : liveContactabilityActionLabel(item.contactPolicy.level),
              ),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
            ),
            const SizedBox(height: 7),
            OutlinedButton.icon(
              onPressed: busy ? null : onFollow,
              icon: const Icon(Icons.notifications_active_outlined),
              label: const Text('Suivre prix / disponibilité'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(44),
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
                  fontSize: 10.5,
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
                fontSize: 11,
              ),
            ),
          ],
        ),
      );
}
