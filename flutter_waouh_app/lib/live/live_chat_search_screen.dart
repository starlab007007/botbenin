import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../main.dart' as legacy;
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
  });

  final String goal;
  final DateTime startedAt;
  final String? city;
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
    final withPhone = rows.where((r) => _rowPhone(r) != null).toList();
    final contactable =
        rows.where((r) => '${r['fabric_id'] ?? ''}'.isNotEmpty || _rowPhone(r) != null).length;
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

  Future<void> _delegate(Map<String, dynamic> row) async {
    final fabricId = '${row['fabric_id'] ?? ''}'.trim();
    if (fabricId.isEmpty) return;
    final mode = _sell ? 'sell' : 'buy';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confier à Bot'),
        content: const Text(
            'Bot contacte ce profil et prépare la négociation. Vous validez l’accord final. Aucun paiement.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmer')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      String? article;
      if (mode == 'sell') {
        final data = await _service.ownedArticles();
        final raw = data['articles'];
        final list = raw is List ? raw.whereType<Map>().toList() : <Map>[];
        if (list.length != 1) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(list.isEmpty ? 'Publiez d’abord votre article.' : 'Choisissez d’abord l’article à vendre.'),
            ));
          }
          return;
        }
        article = list.first['id'].toString();
      }
      final data = await _service.createMandate(
        mode: mode,
        goal: _rowTitle(row),
        articleId: article,
        maxContacts: 1,
        allowPublicBusiness: true,
        allowBlindMessage: true,
      );
      final mandate = data['mandate'];
      await _service.startOpportunity(
        fabricId: fabricId,
        mode: mode,
        mandateId: mandate is Map ? '${mandate['id'] ?? ''}' : '',
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bot s’en occupe. Suivez-le dans Missions.')),
      );
      context.go('/app/missions');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Impossible de confier à Bot pour le moment. Réessayez.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final running = _reply == null || _queue.isNotEmpty;
    final revealed = !running && _reply != null;
    final reply = _reply;
    final rows = reply == null ? const <Map<String, dynamic>>[] : _resultRows(reply);
    final delegable = rows.where((r) => '${r['fabric_id'] ?? ''}'.trim().isNotEmpty).toList();
    return Scaffold(
      backgroundColor: const Color(0xFFF6F9FF),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: WaouhPalette.ink,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('RECHERCHE LIVE',
                style: TextStyle(
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
          LiveReasoningFeed(
            steps: _steps,
            running: running,
            summary: revealed ? _summary : null,
            onSkip: _skip,
            showActions: false,
          ),
          if (revealed && reply != null) ...[
            const SizedBox(height: 14),
            if (rows.isNotEmpty)
              const Padding(
                padding: EdgeInsets.only(left: 2, bottom: 6),
                child: Text('Résultats',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
              ),
            LiveMessageBubble(
              message: reply,
              onPayload: (payload) {
                Navigator.of(context).maybePop();
                widget.onPayload(payload);
              },
            ),
            if (delegable.isNotEmpty) ...[
              const SizedBox(height: 14),
              const Padding(
                padding: EdgeInsets.only(left: 2, bottom: 6),
                child: Text('Confier à Bot',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
              ),
              for (final row in delegable.take(10))
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
                              _rowPhone(row) ?? 'Contact via Bot',
                            ].join(' · '),
                            style: const TextStyle(
                                fontSize: 11, fontWeight: FontWeight.w700, color: WaouhPalette.muted),
                          ),
                        ],
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: () => _delegate(row),
                      icon: const Icon(Icons.smart_toy_rounded, size: 16),
                      label: const Text('Confier'),
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
