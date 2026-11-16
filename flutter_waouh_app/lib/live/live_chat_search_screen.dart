import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../main.dart' as legacy;
import 'live_chat_market_brief.dart';
import 'live_seller_brief.dart';
import 'live_deal_room.dart' show LiveDealRoomService, botRoomDefaultRules, confirmBotDelegation;
import 'live_guided_ask.dart';
import 'live_models.dart';
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
    _enqueue(planSteps(ReasonContext(query: widget.goal, city: widget.city)));
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
    final b = (widget.city ?? '').toLowerCase().trim();
    return a.isNotEmpty && b.isNotEmpty && (a.contains(b) || b.contains(a));
  }

  List<ReasonStep> _outcome(LiveMessage m, List<Map<String, dynamic>> rows) {
    final ctx = ReasonContext(query: widget.goal, city: widget.city);
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
    if (fabric == null || _delegating) return;
    setState(() => _delegating = true);
    try {
      final sale = await _saleArticle();
      final data = await LiveDealRoomService(legacy.supabase).call('open', {
        'fabric_id': fabric, 'confirmed': true, if (sale != null) 'sale_article_id': sale,
      });
      if (!mounted) return;
      final opportunity = widget.kind == 'opportunite' || row['result_kind'] == 'announcement' || row['intent'] == 'ANNOUNCE';
      context.push(Uri(path: '/app/chat/room', queryParameters: {
        'room_id': '${data['deal_room_id']}', if (!opportunity) 'propose': '1',
      }).toString());
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Échange indisponible. Connectez-vous et vérifiez la piste ou l’article à vendre.'),
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
        mode: _sell ? 'sell' : 'buy', goal: widget.goal, articleId: article, city: widget.city,
        budgetMax: _sell ? null : widget.budget?.toDouble(), autonomyMode: 'assisted',
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

  Future<void> _delegateAll(LiveChatBrief brief) async {
    if (_delegating || brief.delegable.isEmpty) return;
    final best = brief.delegable.first;
    final alternates = brief.delegable.skip(1).take(3).toList();
    final ok = await confirmBotDelegation(
      context,
      alternates: alternates.length,
      budgetMax: widget.budget,
    );
    if (!ok || !mounted) return;
    await _delegateFabric(
      best.delegateId ?? '',
      best.city,
      [for (final a in alternates) if (a.delegateId != null) <String, dynamic>{'fabric_id': a.delegateId, if (a.city.isNotEmpty) 'city': a.city}],
      confirmed: true,
    );
  }

  Future<void> _delegateFabric(String fabricId, String? fabricCity, List<Map<String, dynamic>> cascade, {bool confirmed = false}) async {
    if (_delegating || fabricId.trim().isEmpty) return;
    if (!confirmed) {
      final ok = await confirmBotDelegation(context, alternates: cascade.length, budgetMax: widget.budget, selling: _sell);
      if (!ok || !mounted) return;
    }
    setState(() => _delegating = true);
    try {
      final saleArticle = await _saleArticle();
      final api = LiveDealRoomService(legacy.supabase);
      final askedCity = (widget.city ?? '').trim();
      final city = askedCity.isNotEmpty ? askedCity : (fabricCity ?? '');
      final opened = await api.call('open', <String, dynamic>{
        'fabric_id': fabricId,
        if (saleArticle != null) 'sale_article_id': saleArticle,
        if (city.isNotEmpty) 'city': city,
        'budget_max': _sell ? null : widget.budget,
        'confirmed': false,
      });
      final id = '${opened['deal_room_id']}';
      final rules = <String, dynamic>{
        ...botRoomDefaultRules,
        'budget_max': _sell ? null : widget.budget,
        if (cascade.isNotEmpty) 'cascade_candidates': cascade,
        if (cascade.isNotEmpty) 'cascade_step': 1,
        if (cascade.isNotEmpty) 'cascade_max_steps': 1 + cascade.length,
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
        const SnackBar(content: Text('Bot s’en occupe. Vous confirmerez l’accord final.')),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Impossible de confier à Bot pour le moment. Réessayez.')),
        );
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
    final rows = reply == null ? const <Map<String, dynamic>>[] : _resultRows(reply);
    final canonicalRows = rows.where((row) => _roomFabric(row) != null).toList();
    final brief = revealed && rows.isNotEmpty && !_sell
        ? liveChatMarketBrief(rows, city: widget.city, budget: widget.budget)
        : null;
    // Vente : le prix demandé face au marché et les acheteurs qui correspondent vraiment.
    final priceReference = reply?.meta['price_reference'];
    final seller = revealed && (_sell || priceReference is Map)
        ? liveSellerBrief(
            rows,
            reference: priceReference is Map ? <String, dynamic>{for (final e in priceReference.entries) '${e.key}': e.value} : null,
            city: widget.city,
            query: widget.goal,
          )
        : null;
    final stage = liveSearchStage(hasReply: reply != null, revealed: revealed, results: rows.length);
    final kindLabel = liveGuidedKindLabels[widget.kind ?? ''];
    final status = running
        ? (reply == null ? 'BOT CHERCHE POUR VOUS' : 'BOT ANALYSE LES OFFRES')
        : 'RECHERCHE TERMINÉE';
    return Scaffold(
      backgroundColor: const Color(0xFFF6F9FF),
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
          LiveSearchChips(city: widget.city, budget: widget.budget),
          if ((widget.city ?? '').trim().isNotEmpty || widget.budget != null) const SizedBox(height: 10),
          LiveSearchStageBar(stage: stage),
          const SizedBox(height: 14),
          LiveReasoningFeed(
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
                city: widget.city,
                delegating: _delegating,
                delegated: _delegatedRoom != null,
                onDelegate: () => _delegateBuyers(seller.buyers),
                onFollow: () => context.push('/app/chat/room?room_id=${_delegatedRoom ?? ''}'),
              ),
              const SizedBox(height: 16),
            ],
            if (brief != null && brief.total > 0) ...[
              LiveChatMarketBriefCard(
                brief: brief,
                city: widget.city,
                budget: widget.budget,
                kind: widget.kind,
                delegating: _delegating,
                delegated: _delegatedRoom != null,
                onDelegate: () => _delegateAll(brief),
                onFollow: () => context.push('/app/chat/room?room_id=${_delegatedRoom ?? ''}'),
              ),
              const SizedBox(height: 16),
            ],
            if (rows.isNotEmpty)
              const Padding(
                padding: EdgeInsets.only(left: 2, bottom: 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Les offres',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                    SizedBox(height: 3),
                    Text(
                      'Choisissez une offre, écrivez au vendeur ou proposez votre prix : l’échange s’ouvre dans votre Chat.',
                      style: TextStyle(fontSize: 12, height: 1.4, color: WaouhPalette.muted),
                    ),
                  ],
                ),
              ),
            LiveMessageBubble(
              message: reply,
              actionsEnabled: canonicalRows.isEmpty,
              onPayload: (payload) {
                Navigator.of(context).maybePop();
                widget.onPayload(payload);
              },
            ),
            if (rows.isEmpty)
              OutlinedButton(onPressed: _delegating ? null : _watch, child: const Text('Activer la veille')),
            if (canonicalRows.isNotEmpty) ...[
              const SizedBox(height: 14),
              const Padding(
                padding: EdgeInsets.only(left: 2, bottom: 6),
                child: Text('Ouvrir un échange',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
              ),
              for (final row in canonicalRows)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFDCE7F8)),
                  ),
                  child: Row(children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_rowTitle(row),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                          const SizedBox(height: 2),
                          Text(
                            [
                              if (reasonMoney(_rowPrice(row)) != null) reasonMoney(_rowPrice(row))!,
                              _rowPhone(row) ?? (_contactAllowed(row) ? 'Contact via WAOUH' : 'Contact à vérifier'),
                            ].join(' · '),
                            style: const TextStyle(
                                fontSize: 11, fontWeight: FontWeight.w700, color: WaouhPalette.muted),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      children: [
                        TextButton(onPressed: _delegating ? null : () => _openManually(row), child: const Text('Ouvrir')),
                        if (_contactAllowed(row)) TextButton(
                          onPressed: _delegating ? null : () => _delegateFabric(_roomFabric(row)!, row['city']?.toString(), const []),
                          child: const Text('Confier à Bot'),
                        ),
                      ],
                    ),
                  ]),
                ),
            ],
          ],
        ],
      ),
    );
  }
}
