import 'dart:async';

import 'package:flutter/material.dart';

import '../main.dart' as legacy;
import 'avatar/bot_character.dart';
import 'live_city_field.dart';
import 'live_nexus_service.dart';
import 'live_reasoning.dart';
import 'live_theme.dart';

/// « Trouver pour moi » — même parcours que l'onglet NEXUS du Web :
/// décrire, chercher et comparer, surveiller, demander conseil à l'IA.
class LiveNexusFindPanel extends StatefulWidget {
  const LiveNexusFindPanel({
    super.key,
    required this.onExpression,
    required this.onSpeak,
    required this.onAsk,
  });

  final ValueChanged<BotExpression> onExpression;
  final ValueChanged<String> onSpeak;

  /// Ouvre un NOUVEAU chat avec ce texte (jamais dans l'historique en cours).
  final ValueChanged<String> onAsk;

  @override
  State<LiveNexusFindPanel> createState() => _LiveNexusFindPanelState();
}

class _LiveNexusFindPanelState extends State<LiveNexusFindPanel> {
  static const List<String> _suggestions = <String>[
    'Samsung S25 neuf',
    'Moto Bajaj d’occasion',
    'Appartement à Calavi',
    'Climatiseur 12000 BTU',
  ];

  late final LiveNexusService _service = LiveNexusService(legacy.supabase);
  final TextEditingController _query = TextEditingController();
  final TextEditingController _budget = TextEditingController();
  final TextEditingController _city = TextEditingController(text: 'Cotonou');
  bool _searching = false;
  bool _watching = false;
  String? _error;
  NexusDiscoveryResponse? _result;
  List<Map<String, dynamic>> _catalog = const <Map<String, dynamic>>[];
  final List<ReasonStep> _steps = <ReasonStep>[];
  final List<ReasonStep> _queue = <ReasonStep>[];
  Timer? _ticker;
  ReasonSummary? _summary;
  bool _searched = false;

  bool get _revealing => _queue.isNotEmpty;

  void _push(List<ReasonStep> steps) {
    if (steps.isEmpty || !mounted) return;
    _queue.addAll(steps);
    _ticker ??= Timer.periodic(const Duration(milliseconds: 650), (_) {
      if (!mounted) return;
      if (_queue.isEmpty) {
        _ticker?.cancel();
        _ticker = null;
        return;
      }
      final next = _queue.removeAt(0);
      setState(() => _steps.add(next));
      widget.onSpeak(next.text);
      if (_queue.isEmpty) {
        _ticker?.cancel();
        _ticker = null;
      }
    });
    setState(() {});
  }

  void _skip() {
    _ticker?.cancel();
    _ticker = null;
    setState(() {
      _steps.addAll(_queue);
      _queue.clear();
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _query.dispose();
    _budget.dispose();
    _city.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final text = _query.text.trim();
    if (text.isEmpty || _searching) return;
    FocusScope.of(context).unfocus();
    final city = _city.text.trim();
    final budget = double.tryParse(_budget.text.replaceAll(RegExp(r'\D'), ''));
    final ctx = ReasonContext(query: text, city: city, budget: budget);
    _ticker?.cancel();
    _ticker = null;
    setState(() {
      _searching = true;
      _searched = true;
      _error = null;
      _result = null;
      _catalog = const <Map<String, dynamic>>[];
      _summary = null;
      _steps.clear();
      _queue.clear();
    });
    widget.onExpression(BotExpression.think);
    _push(planSteps(ctx));

    final catalogCall = _service
        .catalogSearch(query: text, city: city, budgetMax: budget)
        .then<List<Map<String, dynamic>>?>((rows) {
      if (mounted) setState(() => _catalog = rows);
      _push(catalogSteps(rows, ctx));
      return rows;
    }).catchError((Object error) {
      _push(<ReasonStep>[
        ReasonStep(
          id: 'int-error',
          tone: ReasonTone.warn,
          text: 'Une partie de la recherche est indisponible : ${error is NexusApiException ? error.message : 'réessayez dans un instant'}.',
        ),
      ]);
      return null;
    });

    final externalCall = _service
        .search(
          query: text,
          findSellers: true,
          city: city,
          budgetMax: budget,
          limit: 12,
        )
        .timeout(const Duration(seconds: 35))
        .then<NexusDiscoveryResponse?>((response) {
      if (mounted) setState(() => _result = response);
      _push(<ReasonStep>[...methodSteps(response.intelligence), ...externalSteps(response, ctx)]);
      return response;
    }).catchError((Object _) {
      _push(<ReasonStep>[externalDownStep()]);
      return null;
    });

    widget.onExpression(BotExpression.work);
    final catalogRows = await catalogCall;
    final external = await externalCall;
    if (!mounted) return;
    final summary = buildSummary(catalogRows ?? const <Map<String, dynamic>>[], external, ctx);
    setState(() {
      _summary = summary;
      _searching = false;
      if (catalogRows == null && external == null) {
        _error = 'La recherche n’a pas abouti. Réessayez dans un instant.';
      }
    });
    _push(<ReasonStep>[summaryStep(summary, ctx)]);
    widget.onExpression(BotExpression.talk);
  }

  Future<void> _watch() async {
    final text = _query.text.trim();
    if (text.isEmpty || _watching) return;
    setState(() => _watching = true);
    try {
      final budget = double.tryParse(_budget.text.replaceAll(RegExp(r'\D'), ''));
      await _service.createWatch(query: text, targetAmount: budget);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veille activée. WAOUH continue à chercher.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error is NexusApiException
              ? error.message
              : 'Veille impossible pour le moment.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _watching = false);
    }
  }

  static String _money(double? value, String currency) {
    if (value == null || value <= 0) return 'Prix sur demande';
    final digits = value.round().toString();
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(' ');
      buffer.write(digits[i]);
    }
    final unit = (currency == 'XOF' || currency.isEmpty) ? 'FCFA' : currency;
    return '$buffer $unit';
  }

  @override
  Widget build(BuildContext context) {
    final results = _result?.results ?? const <NexusDiscoveryItem>[];
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 28),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
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
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      gradient: WaouhGradients.brand,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.auto_awesome_rounded,
                        color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Trouver pour moi',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: WaouhPalette.ink,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _query,
                minLines: 2,
                maxLines: 3,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _search(),
                decoration: const InputDecoration(
                  hintText: 'Ex. Samsung S25 256 Go neuf',
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 34,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _suggestions.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, index) => ActionChip(
                    label: Text(_suggestions[index],
                        style: const TextStyle(
                            fontSize: 11, fontWeight: FontWeight.w700)),
                    onPressed: () =>
                        setState(() => _query.text = _suggestions[index]),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _budget,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(hintText: 'Budget FCFA'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: LiveCityField(controller: _city),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _searching ? null : _search,
                  icon: _searching
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.search_rounded, size: 18),
                  label: const Text('Chercher et comparer'),
                ),
              ),
            ],
          ),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(_error!,
                style: const TextStyle(
                    color: WaouhPalette.red, fontWeight: FontWeight.w600)),
          ),
        if (!_searched)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 28),
            child: Center(
              child: Text(
                'Lancez une recherche : Bot vous explique tout en direct.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: WaouhPalette.muted, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        if (_steps.isNotEmpty) ...[
          const SizedBox(height: 12),
          LiveReasoningFeed(
            steps: _steps,
            running: _searching || _revealing,
            summary: _summary,
            onSkip: _skip,
            onWatch: _watching ? null : _watch,
            onAdvice: () => widget.onAsk(
                'Voici ma recherche : « ${_query.text.trim()} »${_city.text.trim().isNotEmpty ? ' à ${_city.text.trim()}' : ''}. Que me conseilles-tu pour la suite ?'),
          ),
        ],
        if (!_searching && !_revealing && (_catalog.isNotEmpty || results.isNotEmpty)) ...[
          const SizedBox(height: 14),
          const Text(
            'Meilleures options',
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: WaouhPalette.ink),
          ),
          const SizedBox(height: 8),
          for (final row in _catalog)
            _CatalogCard(row: row, onAsk: widget.onAsk),
          if (results.isNotEmpty) ...[
            const Padding(
              padding: EdgeInsets.fromLTRB(2, 6, 2, 2),
              child: Text(
                'Autres annonces trouvées · numéros masqués',
                style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: WaouhPalette.muted),
              ),
            ),
            for (final item in results)
              _ResultCard(
                item: item,
                inZone: sameZone(item.city, _city.text),
                onAsk: widget.onAsk,
              ),
          ],
        ],
      ],
    );
  }
}

class LiveReasoningFeed extends StatelessWidget {
  const LiveReasoningFeed({
    required this.steps,
    required this.running,
    required this.summary,
    required this.onSkip,
    this.onWatch,
    this.onAdvice,
    this.showActions = true,
  });

  final List<ReasonStep> steps;
  final bool running;
  final ReasonSummary? summary;
  final VoidCallback onSkip;
  final VoidCallback? onWatch;
  final VoidCallback? onAdvice;
  final bool showActions;

  static IconData _icon(ReasonTone tone) => switch (tone) {
        ReasonTone.think => Icons.psychology_alt_outlined,
        ReasonTone.search => Icons.radar_rounded,
        ReasonTone.found => Icons.check_circle_outline_rounded,
        ReasonTone.zone => Icons.place_outlined,
        ReasonTone.contact => Icons.phone_in_talk_outlined,
        ReasonTone.next => Icons.arrow_forward_rounded,
        ReasonTone.warn => Icons.warning_amber_rounded,
      };

  static String _label(ReasonTone tone) => switch (tone) {
        ReasonTone.think => 'ANALYSE',
        ReasonTone.search => 'RECHERCHE',
        ReasonTone.found => 'TROUVÉ',
        ReasonTone.zone => 'ZONE',
        ReasonTone.contact => 'CONTACT',
        ReasonTone.next => 'BILAN',
        ReasonTone.warn => 'INFO',
      };

  static Color _color(ReasonTone tone) => switch (tone) {
        ReasonTone.think => const Color(0xFF7C3AED),
        ReasonTone.search => const Color(0xFF2563EB),
        ReasonTone.found => const Color(0xFF059669),
        ReasonTone.zone => const Color(0xFF0284C7),
        ReasonTone.contact => const Color(0xFF4F46E5),
        ReasonTone.next => const Color(0xFF2563EB),
        ReasonTone.warn => const Color(0xFFD97706),
      };

  @override
  Widget build(BuildContext context) {
    final summary = this.summary;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFDDE8F9)),
        boxShadow: WaouhShadows.card,
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  running ? 'Bot réfléchit…' : 'Mon raisonnement',
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: WaouhPalette.ink),
                ),
              ),
              if (running)
                TextButton.icon(
                  onPressed: onSkip,
                  icon: const Icon(Icons.skip_next_rounded, size: 16),
                  label: const Text('Passer'),
                ),
            ],
          ),
          const SizedBox(height: 6),
          for (final step in steps)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 26,
                    height: 26,
                    decoration: BoxDecoration(
                      color: _color(step.tone).withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(_icon(step.tone), size: 15, color: _color(step.tone)),
                  ),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
                      decoration: BoxDecoration(
                        gradient: step.tone == ReasonTone.next
                            ? const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF4F46E5)])
                            : null,
                        color: step.tone == ReasonTone.next ? null : const Color(0xFFF7FAFF),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE3ECFA)),
                      ),
                      child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _label(step.tone),
                          style: TextStyle(
                            fontSize: 9,
                            letterSpacing: 1.2,
                            fontWeight: FontWeight.w900,
                            color: step.tone == ReasonTone.next
                                ? const Color(0xFFDBEAFE)
                                : const Color(0xFF94A3B8),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          step.text,
                          style: TextStyle(
                            fontSize: 13,
                            height: 1.3,
                            fontWeight: FontWeight.w800,
                            color: step.tone == ReasonTone.next
                                ? Colors.white
                                : WaouhPalette.ink,
                          ),
                        ),
                        if (step.chips.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 5),
                            child: Wrap(
                              spacing: 5,
                              runSpacing: 4,
                              children: [
                                for (final chip in step.chips)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1F5FB),
                                      borderRadius: BorderRadius.circular(99),
                                    ),
                                    child: Text(chip,
                                        style: const TextStyle(
                                            fontSize: 10.5,
                                            fontWeight: FontWeight.w700,
                                            color: WaouhPalette.muted)),
                                  ),
                              ],
                            ),
                          ),
                        for (final item in step.evidence)
                          _EvidenceTile(item: item),
                      ],
                    ),
                    ),
                  ),
                ],
              ),
            ),
          if (running)
            const Padding(
              padding: EdgeInsets.only(left: 4),
              child: Text('je continue…',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: WaouhPalette.muted)),
            ),
          if (!running && summary != null) ...[
            const Divider(height: 22),
            Row(
              children: [
                _Metric(label: 'Trouvés', value: '${summary.found}'),
                const SizedBox(width: 6),
                _Metric(label: 'Zone', value: '${summary.inZone}'),
                const SizedBox(width: 6),
                _Metric(label: 'Joignables', value: '${summary.contactable}'),
                const SizedBox(width: 6),
                _Metric(label: 'Meilleur prix', value: reasonMoney(summary.bestPrice)?.replaceAll(' FCFA', '') ?? '—'),
              ],
            ),
            if (summary.nextSteps.isNotEmpty) ...[
              const SizedBox(height: 10),
              const Text('PROCHAINES ÉTAPES',
                  style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                      color: WaouhPalette.muted)),
              const SizedBox(height: 4),
              for (final text in summary.nextSteps)
                Padding(
                  padding: const EdgeInsets.only(bottom: 3),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.arrow_forward_rounded,
                          size: 14, color: WaouhPalette.blue),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(text,
                            style: const TextStyle(
                                fontSize: 12, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ),
                ),
            ],
            if (showActions) const SizedBox(height: 8),
            if (showActions) Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onWatch,
                    icon: const Icon(Icons.notifications_active_outlined, size: 16),
                    label: const Text('Surveiller'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onAdvice,
                    icon: const Icon(Icons.psychology_alt_outlined, size: 16),
                    label: const Text('Conseil de Bot'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFFF6F9FE),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2EAF5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value,
                  style: const TextStyle(
                      fontSize: 17, fontWeight: FontWeight.w900)),
              Text(label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      color: WaouhPalette.muted)),
            ],
          ),
        ),
      );
}

class _EvidenceTile extends StatelessWidget {
  const _EvidenceTile({required this.item});
  final ReasonEvidence item;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(top: 6),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFE),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2EAF5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w800)),
                ),
                if (item.price != null)
                  Text(item.price!,
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w900)),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              [
                if ((item.city ?? '').isNotEmpty)
                  item.inZone ? '${item.city} · dans votre zone' : item.city!,
                if ((item.note ?? '').isNotEmpty) item.note!,
              ].join(' · '),
              style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  color: WaouhPalette.muted),
            ),
            if (item.phone != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  '${item.phone}${(item.channel ?? '').isNotEmpty ? '  ·  ${item.channel}' : ''}',
                  style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4),
                ),
              ),
          ],
        ),
      );
}

class _CatalogCard extends StatelessWidget {
  const _CatalogCard({required this.row, required this.onAsk});
  final Map<String, dynamic> row;
  final ValueChanged<String> onAsk;

  @override
  Widget build(BuildContext context) {
    final title = '${row['title'] ?? 'Offre'}';
    final price = reasonMoney(
        row['price'] is num ? (row['price'] as num).toDouble() : null,
        '${row['currency'] ?? 'XOF'}');
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: WaouhPalette.line),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13.5, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  [
                    price ?? 'Prix sur demande',
                    if ('${row['city'] ?? ''}'.isNotEmpty) '${row['city']}',
                  ].join(' · '),
                  style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: WaouhPalette.muted),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => onAsk(
                'Analyse $title${price != null ? ' à $price' : ''}. Est-ce un bon prix et que dois-je vérifier avant de négocier ?'),
            child: const Text('Conseil IA'),
          ),
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.item, required this.onAsk, this.inZone = false});

  final NexusDiscoveryItem item;
  final bool inZone;
  final ValueChanged<String> onAsk;

  @override
  Widget build(BuildContext context) {
    final photos = item.photoUrls;
    final score = item.scores.total.clamp(0, 100).toDouble();
    final price = _LiveNexusFindPanelState._money(item.priceMin, item.currency);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: WaouhPalette.line),
        boxShadow: WaouhShadows.card,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (photos.isNotEmpty)
            Image.network(
              photos.first,
              height: 130,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
            ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: WaouhPalette.ink),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        price,
                        style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: WaouhPalette.ink),
                      ),
                    ),
                    if ((item.city ?? '').isNotEmpty)
                      Text(item.city!,
                          style: const TextStyle(
                              fontSize: 11, color: WaouhPalette.muted)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    if (inZone) 'dans votre zone',
                    item.contactPolicy.label,
                  ].join(' · '),
                  style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: WaouhPalette.muted),
                ),
                if (_maskedPhone(item) != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      _maskedPhone(item)!,
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4),
                    ),
                  ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: score / 100,
                    minHeight: 6,
                    backgroundColor: const Color(0xFFEAF0F8),
                    color: WaouhPalette.blue,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'Pertinence ${score.round()}%',
                  style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: WaouhPalette.muted),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () => onAsk(
                            'Je suis intéressé par ${item.title} ($price). Aide-moi à contacter le vendeur et à négocier.'),
                        icon: const Icon(Icons.bolt_rounded, size: 16),
                        label: const Text('Intéressé'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => onAsk(
                            'Analyse ${item.title} à $price. Est-ce un bon prix et que dois-je vérifier avant de négocier ?'),
                        icon: const Icon(Icons.psychology_alt_outlined, size: 16),
                        label: const Text('Conseil IA'),
                      ),
                    ),
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

String? _maskedPhone(NexusDiscoveryItem item) {
  final masked = item.contactPack?.maskedContacts ?? const <Map<String, dynamic>>[];
  for (final channel in masked) {
    final phone = maskPhone('${channel['last4'] ?? ''}');
    if (phone != null) return phone;
  }
  return null;
}
