import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../main.dart' as legacy;
import 'live_chat_market_brief.dart';
import 'live_chat_goal_facts.dart';
import 'live_seller_brief.dart';
import 'live_waouh_flow_ui.dart';
import 'live_priority_facts.dart';
import 'live_deal_room.dart' show LiveDealRoomService, botRoomDefaultRules, roomError;
import 'live_guided_ask.dart';
import 'live_models.dart';
import 'live_product_data.dart' show liveProductPhotos;
import 'live_product_presentation.dart' show showLiveProductDetails;
import 'live_nexus_find_panel.dart' show LiveReasoningFeed;
import 'live_nexus_service.dart';
import 'live_reasoning.dart';
import 'live_theme.dart';
import 'live_widgets.dart';

/// Demande de recherche : achat, vente, demande, « trouver des acheteurs »…
bool liveIsChatSearchGoal(String text, Map<String, dynamic> meta) {
  if (meta['commerce_action'] != null || meta['button_payload'] != null) return false;
  final t = text.trim();
  if (t.length < 4) return false;
  if (RegExp(r'^\s*(annuler|question\s*\d|je\s+propose|je\s+suis\s+int[ée]ress|oui\b|non\b|ok\b|merci)',
          caseSensitive: false)
      .hasMatch(t)) {
    return false;
  }
  return RegExp(
          r'(cherche|chercher|recherche|rechercher|acheter|achète|achete|trouve|trouver|trouvez|vends?|vendre|acheteurs?|vendeurs?|besoin\s+d)',
          caseSensitive: false)
      .hasMatch(t);
}

List<Map<String, dynamic>> _resultRows(LiveMessage message) {
  for (final key in const ['results', 'products', 'matches', 'offers', 'items', 'articles']) {
    final value = message.meta[key];
    if (value is List && value.isNotEmpty) {
      return value
          .whereType<Map>()
          .map((row) => <String, dynamic>{for (final e in row.entries) e.key.toString(): e.value})
          .toList(growable: false);
    }
  }
  return const <Map<String, dynamic>>[];
}

String _rowTitle(Map<String, dynamic> row) {
  for (final key in const ['title', 'name', 'nom', 'subject', 'label']) {
    final v = '${row[key] ?? ''}'.trim();
    if (v.isNotEmpty) return v;
  }
  return 'Offre';
}

double? _rowPrice(Map<String, dynamic> row) {
  for (final key in const ['price', 'price_min', 'price_max']) {
    final v = row[key];
    final n = v is num ? v.toDouble() : double.tryParse('${v ?? ''}');
    if (n != null && n > 0) return n;
  }
  return null;
}

String? _rowPhone(Map<String, dynamic> row) {
  final pack = row['contact_pack'];
  if (pack is Map && pack['masked_contacts'] is List) {
    for (final entry in (pack['masked_contacts'] as List).whereType<Map>()) {
      final v = '${entry['last4'] ?? ''}'.trim();
      if (v.isNotEmpty) return maskPhone(v);
    }
  }
  final evidence = row['evidence'];
  if (evidence is Map) {
    final v = '${evidence['contact_last4'] ?? evidence['contact_phone_last4'] ?? ''}'.trim();
    if (v.isNotEmpty) return maskPhone(v);
  }
  return null;
}

/// Fenêtre « Recherche live » : le raisonnement progresse en direct, puis la réponse
/// s'affiche comme dans le chat, avec « Confier à Bot » sur chaque offre contactable.
class LiveChatSearchScreen extends StatefulWidget {
  const LiveChatSearchScreen({
    super.key,
    required this.goal,
    required this.startedAt,
    required this.messages,
    required this.onPayload,
    this.city,
    this.kind,
    this.budget,
  });

  final String goal;
  final DateTime startedAt;
  final String? city;

  /// Entrée guidée d'origine (acheter, service, prestation…) ; absente pour une phrase libre.
  final String? kind;
  final int? budget;
  final ValueListenable<List<LiveMessage>> messages;
  final ValueChanged<String> onPayload;

  @override
  State<LiveChatSearchScreen> createState() => _LiveChatSearchScreenState();
}

class _LiveChatSearchScreenState extends State<LiveChatSearchScreen> {
  LiveChatGoalFacts get _goalFacts {
    final intelligence = _reply?.meta['intelligence'];
    final city = intelligence is Map && intelligence['city'] is String ? intelligence['city'] as String : null;
    final budget = intelligence is Map && intelligence['budget_max'] is num ? (intelligence['budget_max'] as num).toInt() : null;
    return LiveChatGoalFacts(widget.goal, city: widget.city ?? city, budget: widget.budget ?? budget, selling: _sell);
  }
  final List<ReasonStep> _steps = <ReasonStep>[];
  final List<ReasonStep> _queue = <ReasonStep>[];
  Timer? _reveal;
  Timer? _timeout;
  LiveMessage? _reply;
  ReasonSummary? _summary;
  late final LiveNexusService _service = LiveNexusService(legacy.supabase);
  bool _delegating = false;
  String? _delegatedRoom;

  bool get _sell => RegExp(r'(vends?|vendre|acheteurs?|clients?|prospects?)', caseSensitive: false)
      .hasMatch(widget.goal);

  @override
  void initState() {
    super.initState();
    _enqueue(planSteps(ReasonContext(query: widget.goal, city: _goalFacts.city)));
    widget.messages.addListener(_check);
    _timeout = Timer(const Duration(seconds: 70), () {
      if (_reply == null && mounted) {
        _enqueue(const [
          ReasonStep(
            id: 'late',
            tone: ReasonTone.warn,
            text: 'Plus long que prévu. La réponse arrivera dans le chat.',
          ),
        ]);
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _check());
  }

  @override
  void dispose() {
    widget.messages.removeListener(_check);
    _reveal?.cancel();
    _timeout?.cancel();
    super.dispose();
  }

  void _enqueue(List<ReasonStep> steps) {
    _queue.addAll(steps);
    _reveal ??= Timer.periodic(const Duration(milliseconds: 650), (_) => _tick());
    _tick();
  }

  void _tick() {
    if (!mounted) return;
    if (_queue.isEmpty) {
      _reveal?.cancel();
      _reveal = null;
      setState(() {});
      return;
    }
    setState(() => _steps.add(_queue.removeAt(0)));
  }

  void _skip() {
    if (_queue.isEmpty) return;
    setState(() {
      _steps.addAll(_queue);
      _queue.clear();
    });
    _reveal?.cancel();
    _reveal = null;
  }

  void _check() {
    if (_reply != null || !mounted) return;
    final since = widget.startedAt.subtract(const Duration(seconds: 2));
    for (final m in widget.messages.value) {
      if (m.outgoing || m.createdAt.isBefore(since)) continue;
      final rows = _resultRows(m);
      if (rows.isEmpty && m.text.trim().isEmpty) continue;
      _reply = m;
      _timeout?.cancel();
      _enqueue(_outcome(m, rows));
      break;
    }
  }

  bool _zone(String? city) {
    final a = (city ?? '').toLowerCase().trim();
    final b = (_goalFacts.city ?? '').toLowerCase().trim();
    return a.isNotEmpty && b.isNotEmpty && (a.contains(b) || b.contains(a));
  }

  List<ReasonStep> _outcome(LiveMessage m, List<Map<String, dynamic>> rows) {
    final ctx = ReasonContext(query: widget.goal, city: _goalFacts.city);
    if (rows.isEmpty) {
      _summary = const ReasonSummary(
        found: 0,
        inZone: 0,
        contactable: 0,
        bestPrice: null,
        nextSteps: ['Précisez votre besoin : je relance la recherche.'],
      );
      return [
        ReasonStep(
          id: 'none',
          tone: ReasonTone.warn,
          text: liveVisibleText(m.text).trim().isEmpty
              ? 'Aucune annonce assez proche pour le moment.'
              : liveVisibleText(m.text).trim(),
        ),
      ];
    }
    final prices = rows.map(_rowPrice).whereType<double>().toList();
    final inZone = rows.where((r) => _zone('${r['city'] ?? ''}')).length;
    final reachable = rows.where(_contactAllowed).toList();
    final withPhone = reachable.where((row) => _rowPhone(row) != null).toList();
    final contactable = reachable.length;
    final summary = ReasonSummary(
      found: rows.length,
      inZone: inZone,
      contactable: contactable,
      bestPrice: prices.isEmpty ? null : prices.reduce((a, b) => a < b ? a : b),
      nextSteps: [
        'Confiez une offre à Bot : il contacte et prépare la négociation.',
        rows.length < 4 ? 'Peu de résultats : activez une veille.' : 'Vous validez toujours l’accord final.',
      ],
    );
    _summary = summary;
    return [
      ReasonStep(
        id: 'found',
        tone: ReasonTone.found,
        text: '${rows.length} ${rows.length > 1 ? 'annonces trouvées' : 'annonce trouvée'}${inZone > 0 ? ' · $inZone dans votre zone' : ''}.',
      ),
      if (withPhone.isNotEmpty)
        ReasonStep(
          id: 'contact',
          tone: ReasonTone.contact,
          text: '${withPhone.length} contact${withPhone.length > 1 ? 's' : ''} joignable${withPhone.length > 1 ? 's' : ''} · numéros masqués.',
          evidence: [
            for (final r in withPhone.take(3))
              ReasonEvidence(
                title: _rowTitle(r),
                city: '${r['city'] ?? ''}'.trim().isEmpty ? null : '${r['city']}',
                inZone: _zone('${r['city'] ?? ''}'),
                price: reasonMoney(_rowPrice(r)),
                phone: _rowPhone(r),
              ),
          ],
        ),
      summaryStep(summary, ctx),
    ];
  }

  String? _roomFabric(Map<String, dynamic> row) {
    final fabric = '${row['fabric_id'] ?? ''}'.trim();
    if (fabric.isNotEmpty) return fabric;
    final uuid = RegExp(r'^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$', caseSensitive: false);
    final article = '${row['article_id'] ?? ''}'.trim();
    if (uuid.hasMatch(article)) return 'article:$article';
    final id = '${row['id'] ?? ''}'.trim();
    final source = '${row['source'] ?? 'waouh'}'.toLowerCase();
    if (const ['waouh', 'chat', 'waouh_app'].contains(source) && uuid.hasMatch(id)) return 'article:$id';
    final catalog = '${row['catalog_id'] ?? id}'.trim();
    return const ['partner', 'catalog'].contains(source) && uuid.hasMatch(catalog) ? 'catalog:$catalog' : null;
  }

  bool _isOwn(Map<String, dynamic> row) {
    final me = legacy.supabase.auth.currentUser?.id;
    if (me == null) return false;
    final evidence = row['evidence'];
    return [row['seller_id'], row['user_id'], row['owner_id'], row['seller_user_id'], if (evidence is Map) evidence['seller_id']]
        .any((v) => v != null && '$v' == me);
  }

  bool _contactAllowed(Map<String, dynamic> row) {
    final fabric = _roomFabric(row) ?? '';
    final policy = row['contact_policy'];
    final evidence = row['evidence'];
    return fabric.startsWith('article:') || fabric.startsWith('buyer:')
        || (policy is Map && policy['can_auto_contact'] == true)
        || (fabric.startsWith('catalog:') && (row['source'] == 'partner'
            || (evidence is Map && (evidence['source'] == 'partner' || evidence['has_contact'] == true))));
  }

  Future<String?> _saleArticle() async {
    if (!_sell) return null;
    final article = _reply?.articleId ?? _reply?.meta['article_id']?.toString();
    if (article != null && article.trim().isNotEmpty) return article;
    final response = await _service.ownedArticles();
    final rows = response['articles'];
    if (rows is List && rows.length == 1 && rows.first is Map) return (rows.first as Map)['id']?.toString();
    throw StateError('sale_article_required');
  }

  Future<void> _openManually(Map<String, dynamic> row) async {
    final fabric = _roomFabric(row);
    if (fabric == null || _delegating || _isOwn(row)) return;
    setState(() => _delegating = true);
    try {
      final sale = await _saleArticle();
      final data = await LiveDealRoomService(legacy.supabase).call('open', {
        'fabric_id': fabric, 'confirmed': true, if (sale != null) 'sale_article_id': sale,
      });
      if (!mounted) return;
      final roomId = data['deal_room_id'];
      if (roomId is! String || roomId.trim().isEmpty || roomId == 'null') {
        throw StateError('request_failed');
      }
      final opportunity = widget.kind == 'opportunite' || row['result_kind'] == 'announcement' || row['intent'] == 'ANNOUNCE';
      context.push(Uri(path: '/app/chat/room', queryParameters: {
        'room_id': roomId, if (!opportunity) 'propose': '1',
      }).toString());
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(roomError(error)),
        action: SnackBarAction(label: 'Réessayer', onPressed: () => _openManually(row)),
      ));
    } finally {
      if (mounted) setState(() => _delegating = false);
    }
  }

  Future<void> _delegateBuyers(List<Map<String, dynamic>> buyers) async {
    final rows = buyers.where((row) => _roomFabric(row) != null && _contactAllowed(row)).take(4).toList();
    if (rows.isEmpty) return;
    await _delegateFabric(
      _roomFabric(rows.first)!,
      rows.first['city']?.toString(),
      [for (final row in rows.skip(1)) {'fabric_id': _roomFabric(row), 'city': row['city']?.toString()}],
    );
  }

  Future<void> _watch() async {
    if (_delegating) return;
    setState(() => _delegating = true);
    try {
      final article = await _saleArticle();
      final response = await _service.createMandate(
        mode: _sell ? 'sell' : 'buy', goal: widget.goal, articleId: article, city: _goalFacts.city,
        discoveryKind: _sell ? 'sale' : widget.kind == 'opportunite' ? 'opportunity' : widget.kind == 'service' ? 'service' : widget.kind == 'prestation' ? 'project' : null,
        budgetMax: _sell ? null : _goalFacts.budget?.toDouble(), autonomyMode: 'assisted',
        completionGoal: 'recommendations', maxFollowups: 0, allowWaouh: false, allowBlindMessage: false,
      );
      final mandate = response['mandate'];
      if (mounted && mandate is Map) context.push('/app/missions?mandate=${mandate['id']}');
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Veille non activée. Connectez-vous puis réessayez.'),
      ));
    } finally {
      if (mounted) setState(() => _delegating = false);
    }
  }

  Future<({num? limit, String? application, int hours})?> _confirmMandate(
    bool opportunity,
  ) {
    final initialLimit = _sell ? null : _goalFacts.budget;
    num? limit = initialLimit;
    var application = '';
    var hours = opportunity ? 72 : 168;
    return showModalBottomSheet<({num? limit, String? application, int hours})>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: (sheet) => StatefulBuilder(builder: (sheet, update) {
        final amount = limit;
        final summary = application.trim();
        final valid = opportunity
            ? summary.length >= 30 && summary.length <= 1800
            : amount != null && amount.isFinite && amount > 0 &&
                (_sell || initialLimit == null || amount <= initialLimit);
        final theme = Theme.of(sheet);
        return SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            24, 4, 24, 24 + MediaQuery.viewInsetsOf(sheet).bottom,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Confier la mission', style: theme.textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(opportunity
                  ? 'Bot transmet votre candidature et vous prévient de la réponse.'
                  : 'Bot négocie dans vos limites et vous prévient quand l’accord est à valider.'),
              const SizedBox(height: 20),
              TextFormField(
                initialValue: opportunity ? '' : initialLimit?.toString(),
                keyboardType: opportunity ? TextInputType.multiline : TextInputType.number,
                maxLines: opportunity ? 4 : 1,
                maxLength: opportunity ? 1800 : null,
                decoration: InputDecoration(
                  labelText: opportunity
                      ? 'Votre candidature'
                      : _sell ? 'Prix plancher privé (FCFA)' : 'Budget maximal (FCFA)',
                  helperText: opportunity ? '30 caractères minimum' : null,
                  border: const OutlineInputBorder(),
                ),
                onChanged: (value) => update(() {
                  if (opportunity) {
                    application = value;
                  } else {
                    limit = num.tryParse(value);
                  }
                }),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<int>(
                initialValue: hours,
                decoration: const InputDecoration(
                  labelText: 'Durée du mandat',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 24, child: Text('24 heures')),
                  DropdownMenuItem(value: 72, child: Text('3 jours')),
                  DropdownMenuItem(value: 168, child: Text('7 jours')),
                ],
                onChanged: (value) => update(() => hours = value ?? hours),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: valid ? () => Navigator.pop(sheet, (
                  limit: opportunity ? null : amount,
                  application: opportunity ? summary : null,
                  hours: hours,
                )) : null,
                child: const Text('Confirmer le mandat'),
              ),
            ],
          ),
        );
      }),
    );
  }

  Future<void> _delegateAll(LiveChatBrief brief) async {
    if (_delegating || brief.delegable.isEmpty || widget.kind == 'opportunite') return;
    if (brief.delegable.first.row['result_kind'] == 'announcement' || brief.delegable.first.row['intent'] == 'ANNOUNCE') return;
    final best = brief.delegable.first;
    if (_isOwn(best.row) || !_contactAllowed(best.row)) { await _watch(); return; }
    final alternates = brief.delegable.skip(1).where((a) => !_isOwn(a.row) && _contactAllowed(a.row) && a.row['result_kind'] != 'announcement' && a.row['intent'] != 'ANNOUNCE' && a.row['result_kind'] == best.row['result_kind']).take(3).toList();
    await _delegateFabric(
      best.delegateId ?? '',
      best.city,
      [for (final a in alternates) if (a.delegateId != null) <String, dynamic>{'fabric_id': a.delegateId, if (a.city.isNotEmpty) 'city': a.city}],
    );
  }

  Future<void> _delegateFabric(String fabricId, String? fabricCity, List<Map<String, dynamic>> cascade, {bool confirmed = false, bool opportunity = false}) async {
    if (_delegating || fabricId.trim().isEmpty) return;
    // Opportunité : Bot transmet lui-même la candidature, comme sur le Web.
    final isOpportunity = opportunity || widget.kind == 'opportunite';
    final mandate = await _confirmMandate(isOpportunity);
    if (!mounted || mandate == null || _delegating) return;
    final limit = mandate.limit;
    final application = mandate.application;
    setState(() => _delegating = true);
    try {
      final saleArticle = await _saleArticle();
      final api = LiveDealRoomService(legacy.supabase);
      final askedCity = (_goalFacts.city ?? '').trim();
      // Candidats dans l'ordre : on saute ses propres annonces (comme le Web le fait côté résultat).
      final candidates = <Map<String, dynamic>>[
        {'fabric_id': fabricId, 'city': fabricCity},
        ...cascade,
      ];
      Map<String, dynamic>? opened;
      var index = 0;
      Object? lastError;
      for (; index < candidates.length; index++) {
        final c = candidates[index];
        final city = askedCity.isNotEmpty ? askedCity : '${c['city'] ?? ''}';
        try {
          opened = await api.call('open', <String, dynamic>{
            'fabric_id': '${c['fabric_id']}',
            if (saleArticle != null) 'sale_article_id': saleArticle,
            if (city.isNotEmpty) 'city': city,
            'budget_max': _sell || isOpportunity ? null : limit,
            'confirmed': false,
          });
          break;
        } on StateError catch (e) {
          lastError = e;
          // Toute offre refusée (prix absent, vendeur injoignable, déjà prise…) : on passe à la suivante.
          if (e.message.startsWith('Connectez-vous') || e.message == 'Votre compte a changé.') rethrow;
        }
      }
      if (opened == null) throw StateError(lastError == null ? 'request_failed' : 'no_candidate');
      final rest = candidates.skip(index + 1).toList();
      final id = '${opened['deal_room_id']}';
      final rules = <String, dynamic>{
        ...botRoomDefaultRules,
        'duration_hours': mandate.hours,
        'strategy': isOpportunity ? 'opportunity' : _sell ? 'sell' : widget.kind == 'service' ? 'service' : widget.kind == 'prestation' ? 'job' : widget.kind == 'trouver' ? 'find' : 'buy',
        'budget_max': _sell || isOpportunity ? null : limit,
        if (application != null) 'application': <String, dynamic>{'summary': application},
        if (_sell) 'price_floor': limit,
        if (rest.isNotEmpty) 'cascade_candidates': rest,
        if (rest.isNotEmpty) 'cascade_step': 1,
        if (rest.isNotEmpty) 'cascade_max_steps': 1 + rest.length,
      };
      await api.call('delegate', <String, dynamic>{
        'deal_room_id': id,
        'mandate_revision': opened['mandate_revision'] ?? 0,
        'confirmed': true,
        'rules': rules,
      });
      if (!mounted) return;
      setState(() => _delegatedRoom = id);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isOpportunity ? 'Bot transmet votre candidature et vous prévient de la réponse.' : 'Bot s’en occupe. Vous confirmerez l’accord final.')),
      );
      // Comme sur le Web : la Deal Room s'ouvre directement.
      context.push('/app/chat/room?room_id=$id');
    } catch (e) {
      if (mounted) {
        final code = e is StateError ? e.message : '';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(code == 'no_candidate'
              ? 'Aucune offre disponible pour Bot. Essayez une autre recherche.'
              : code == 'request_failed' || code.isEmpty
              ? 'Impossible de confier à Bot pour le moment. Réessayez.'
              : roomError(StateError(code))),
        ));
      }
    } finally {
      if (mounted) setState(() => _delegating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final running = _reply == null || _queue.isNotEmpty;
    final revealed = !running && _reply != null;
    final reply = _reply;
    final rows = reply == null ? const <Map<String, dynamic>>[] : _resultRows(reply).where((row){final e=row['evidence'] is Map?row['evidence'] as Map:const {};final opportunity=widget.kind=='opportunite'||row['result_kind']=='announcement'||row['intent']=='ANNOUNCE';if(!opportunity)return true;final deadline=DateTime.tryParse('${e['deadline']??e['closing_date']??row['expires_at']??''}');return e['eligible']!=false&&e['eligibility_status']!='ineligible'&&(deadline==null||!deadline.add(const Duration(days:1)).isBefore(DateTime.now()));}).toList();
    final canonicalRows = rows.where((row) => _roomFabric(row) != null).toList();
    final brief = revealed && rows.isNotEmpty && !_sell
        ? liveChatMarketBrief(rows, city: _goalFacts.city, budget: _goalFacts.budget, kind:widget.kind)
        : null;
    // Vente : le prix demandé face au marché et les acheteurs qui correspondent vraiment.
    final priceReference = reply?.meta['price_reference'];
    final seller = revealed && (_sell || priceReference is Map)
        ? liveSellerBrief(
            rows,
            reference: priceReference is Map ? <String, dynamic>{for (final e in priceReference.entries) '${e.key}': e.value} : null,
            city: _goalFacts.city,
            query: widget.goal,
          )
        : null;
    final kindLabel = liveGuidedKindLabels[widget.kind ?? ''];
    final status = running
        ? (reply == null ? 'BOT CHERCHE POUR VOUS' : 'BOT ANALYSE LES OFFRES')
        : 'RECHERCHE TERMINÉE';
    final median = waouhMedian(canonicalRows.where((row) => row['result_kind'] != 'announcement' && row['result_kind'] != 'service' && row['intent'] != 'ANNOUNCE').map(_rowPrice));
    final recommended = brief?.pick;
    final primaryRows = !_sell && recommended != null ? canonicalRows.where((row) => !_isOwn(row) && _roomFabric(row) == recommended.delegateId).take(1).toList() : <Map<String,dynamic>>[];
    final otherRows = canonicalRows.where((row) => !primaryRows.contains(row)).toList();
    final botBar = revealed && !_sell && widget.kind != 'opportunite' && brief != null && brief.delegable.isNotEmpty && canonicalRows.isNotEmpty
        ? WaouhBotBar(
            count: brief.delegable.length > 4 ? 4 : brief.delegable.length,
            busy: _delegating,
            done: _delegatedRoom != null,
            onDelegate: () => _delegateAll(brief),
            onFollow: () => context.push('/app/chat/room?room_id=${_delegatedRoom ?? ''}'),
          )
        : null;
    String journey(Map<String,dynamic> row) => _sell ? 'sale' : widget.kind == 'opportunite' || row['result_kind'] == 'announcement' || row['intent'] == 'ANNOUNCE' ? 'opportunity' : widget.kind == 'prestation' ? 'project' : widget.kind == 'service' || row['result_kind'] == 'service' ? 'service' : 'purchase';
    String actionLabel(Map<String,dynamic> row) => !_contactAllowed(row)&&journey(row)!='opportunity'
        ? 'Ouvrir l’échange' : switch(journey(row)) { 'sale' => 'Contacter l’acheteur', 'opportunity' => _applicationSource(row) == null ? 'Postuler dans WAOUH' : 'Déposer sur le site de l’annonce', 'service' => 'Demander un devis', 'project' => 'Discuter du projet', _ => const ['trouver','demander'].contains(widget.kind) ? 'Voir la piste' : 'Intéressé' };
    Widget offerCard(Map<String,dynamic> row, {bool best=false}) => WaouhOfferCard(
                  title: _rowTitle(row),
                  priorityFacts: livePriorityFacts(row,journey(row),guided:widget.kind),
                  actionLabel: actionLabel(row),
                  botLabel: _sell ? 'Confier la vente' : 'Confier à Bot',
                  priceLabel: journey(row) == 'opportunity' ? 'Conditions à consulter' : reasonMoney(_rowPrice(row)),
                  showPriceTag: journey(row) == 'purchase',
                  tag: waouhPriceTag(_rowPrice(row), median),
                  photos: liveProductPhotos(row),
                  city: row['city']?.toString(),
                  verified: _contactAllowed(row),
                  contactLabel: _applicationSource(row)!=null&&journey(row)=='opportunity'
                      ? 'Portail de l’annonceur'
                      : !_contactAllowed(row)
                          ? 'Contact via WAOUH à confirmer'
                          : (_roomFabric(row)?.startsWith('article:')==true||_roomFabric(row)?.startsWith('buyer:')==true)
                              ? 'Échange WAOUH disponible' : 'Contact autorisé via WAOUH',
                  best: best,
                  own: _isOwn(row),
                  busy: _delegating,
                  onWant: () async {
                    final source = journey(row) == 'opportunity' ? _applicationSource(row) : null;
                    if (source == null) {
                      await _openManually(row);
                      return;
                    }
                    if (!await launchUrl(source, mode: LaunchMode.externalApplication) && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Le site de l’annonce n’a pas pu s’ouvrir.')),
                      );
                    }
                  },
                  onBot: _contactAllowed(row) && (journey(row)!='opportunity'||_applicationSource(row)==null) && (journey(row) == 'opportunity' || _sell || _goalFacts.budget==null || _rowPrice(row)==null || _rowPrice(row)!<=_goalFacts.budget!) ? () => _delegateFabric(_roomFabric(row)!, row['city']?.toString(), best ? [for(final alt in otherRows.where((alt)=>journey(alt)==journey(row)&&!_isOwn(alt)&&_contactAllowed(alt)&&(_goalFacts.budget==null||_rowPrice(alt)==null||_rowPrice(alt)!<=_goalFacts.budget!)).take(3)) {'fabric_id':_roomFabric(alt),'city':alt['city']?.toString()}] : const [], opportunity: journey(row) == 'opportunity') : null,
                  onDetails: () => showLiveProductDetails(context, row),
                );
    return Scaffold(
      backgroundColor: const Color(0xFFF6F9FF),
      bottomNavigationBar: primaryRows.isEmpty ? botBar : null,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: WaouhPalette.ink,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(kindLabel == null ? status : '${kindLabel.toUpperCase()} · $status',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 10,
                    letterSpacing: 1.6,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF2563EB))),
            Text(widget.goal,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          LiveSearchChips(city: _goalFacts.city, budget: _goalFacts.budget),
          if ((_goalFacts.city ?? '').trim().isNotEmpty || _goalFacts.budget != null) const SizedBox(height: 10),
          WaouhStepBar(step: revealed && rows.isNotEmpty ? 2 : 1),
          const SizedBox(height: 14),
          if (!revealed || rows.isEmpty) LiveReasoningFeed(
            steps: _steps,
            running: running,
            summary: revealed ? _summary : null,
            onSkip: _skip,
            showActions: false,
          ),
          if (revealed && reply != null) ...[
            const SizedBox(height: 14),
            if (seller != null) ...[
              LiveSellerBriefCard(
                brief: seller,
                city: _goalFacts.city,
                delegating: _delegating,
                delegated: _delegatedRoom != null,
                onDelegate: () => _delegateBuyers(seller.buyers),
                onFollow: () => context.push('/app/chat/room?room_id=${_delegatedRoom ?? ''}'),
              ),
              const SizedBox(height: 16),
            ],
            if (brief != null && brief.total > 0 && canonicalRows.isEmpty) ...[
              LiveChatMarketBriefCard(
                brief: brief,
                city: _goalFacts.city,
                budget: _goalFacts.budget,
                kind: widget.kind,
                delegating: _delegating,
                delegated: _delegatedRoom != null,
                onDelegate: () => _delegateAll(brief),
                onFollow: () => context.push('/app/chat/room?room_id=${_delegatedRoom ?? ''}'),
              ),
              const SizedBox(height: 16),
            ],
            if (canonicalRows.isEmpty) LiveMessageBubble(
              message: reply,
              actionsEnabled: true,
              onPayload: (payload) {
                Navigator.of(context).maybePop();
                widget.onPayload(payload);
              },
            ),
            if (rows.isEmpty)
              OutlinedButton(onPressed: _delegating ? null : _watch, child: const Text('Activer la veille')),
            if (canonicalRows.isNotEmpty) ...[
              const SizedBox(height: 14),
              for (final row in primaryRows) offerCard(row,best:true),
              if (widget.kind == 'opportunite' || (!_sell && primaryRows.isNotEmpty && !_contactAllowed(primaryRows.first))) FilledButton.icon(onPressed: _delegating ? null : _watch, icon: const Icon(Icons.notifications_none), label: Text(widget.kind == 'opportunite' ? 'Suivre l’opportunité' : 'Bot continue la recherche')),
              if (canonicalRows.length > 1) ExpansionTile(title: const Text('Comparer avec Bot'),children: [for(final row in canonicalRows.take(3)) ListTile(title:Text(_rowTitle(row),maxLines:2,overflow:TextOverflow.ellipsis),subtitle:Text(livePriorityFacts(row,journey(row),guided:widget.kind).entries.where((f)=>f.value!='À confirmer').take(3).map((f)=>'${f.key} : ${f.value}').join(' · ')),trailing:TextButton(onPressed:_delegating?null:()=>_openManually(row),child:const Text('Voir')))]),
              if (otherRows.isNotEmpty) ExpansionTile(title: Text(primaryRows.isEmpty ? 'Offres (${otherRows.length})' : 'Autres offres (${otherRows.length})'), initiallyExpanded: primaryRows.isEmpty, children: [for(final row in otherRows) offerCard(row)]),
            ],
          ],
        ],
      ),
    );
  }
}

String _seenAgo(DateTime date) {
  final h = DateTime.now().difference(date).inHours;
  if (h < 1) return 'Vu à l’instant';
  if (h < 24) return 'Vu il y a $h h';
  final d = h ~/ 24;
  return d < 31 ? 'Vu il y a $d j' : 'Vu le ${date.day}/${date.month}/${date.year}';
}

Uri? _applicationSource(Map row) {
  final source = row['source_url'] ?? (row['source'] is Map ? row['source']['url'] : null);
  final uri = source is String ? Uri.tryParse(source) : null;
  return uri != null && uri.host.isNotEmpty &&
      (uri.scheme == 'https' || uri.scheme == 'http') ? uri : null;
}

String _rowSource(Map row) {
  final url = '${row['source_url'] ?? (row['source'] is Map ? (row['source'] as Map)['url'] : '') ?? ''}';
  final host = Uri.tryParse(url)?.host.replaceFirst('www.', '') ?? '';
  if (host.isEmpty) return 'WAOUH';
  for (final e in const {'coinafrique': 'CoinAfrique', 'bambaad': 'BambaAd', 'afribaba': 'Afribaba', 'facebook': 'Facebook'}.entries) {
    if (host.contains(e.key)) return e.value;
  }
  return host;
}
