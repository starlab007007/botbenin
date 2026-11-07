import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import 'live_nexus_service.dart';
import 'live_offer_channels.dart';

class LiveMarketSource {
  const LiveMarketSource({required this.n, required this.title, required this.host, required this.url, required this.observedAt, required this.price, required this.city});
  final int n;
  final String title;
  final String host;
  final String? url;
  final String? observedAt;
  final double? price;
  final String? city;
}

class LiveMarketPoint {
  const LiveMarketPoint({required this.text, required this.cites});
  final String text;
  final List<int> cites;
}

class LiveMarketReference {
  const LiveMarketReference({required this.sources, required this.points, required this.advice});
  final List<LiveMarketSource> sources;
  final List<LiveMarketPoint> points;
  final LiveMarketPoint? advice;
}

LiveMarketPoint? _point(dynamic raw) {
  if (raw is! Map) return null;
  final text = '${raw['text'] ?? ''}'.trim();
  final cites = (raw['cites'] is List) ? (raw['cites'] as List).map((e) => int.tryParse('$e')).whereType<int>().toList() : <int>[];
  return text.isEmpty || cites.isEmpty ? null : LiveMarketPoint(text: text, cites: cites);
}

LiveMarketReference? parseLiveMarketReference(dynamic data) {
  if (data is! Map || data['ok'] != true || data['data'] is! Map) return null;
  final d = data['data'] as Map;
  final sources = <LiveMarketSource>[
    for (final s in (d['sources'] is List ? d['sources'] as List : const []))
      if (s is Map)
        LiveMarketSource(
          n: int.tryParse('${s['n']}') ?? 0,
          title: '${s['title'] ?? 'Offre'}',
          host: '${s['host'] ?? 'Source en ligne'}',
          url: (s['url'] is String && (s['url'] as String).startsWith('http')) ? s['url'] as String : null,
          observedAt: s['observed_at'] is String ? s['observed_at'] as String : null,
          price: s['price'] is num ? (s['price'] as num).toDouble() : null,
          city: s['city'] is String ? s['city'] as String : null,
        ),
  ].where((s) => s.n > 0).toList();
  final points = (d['points'] is List ? d['points'] as List : const []).map(_point).whereType<LiveMarketPoint>().toList();
  if (sources.isEmpty) return null;
  return LiveMarketReference(sources: sources, points: points, advice: _point(d['advice']));
}

Future<LiveMarketReference?> fetchLiveMarketReference(SupabaseClient client, {required String query, required String city, required List<String> fabricIds}) async {
  final ids = fabricIds.where((e) => e.isNotEmpty).toSet().take(24).toList();
  final token = client.auth.currentSession?.accessToken;
  if (ids.isEmpty || token == null) return null;
  try {
    final response = await client.functions
        .invoke('waouh-market-reference', body: {'query': query, 'city': city, 'fabric_ids': ids}, headers: {'Authorization': 'Bearer $token'})
        .timeout(const Duration(seconds: 14));
    return parseLiveMarketReference(response.data);
  } catch (_) {
    return null;
  }
}

String _date(String? iso) {
  final d = iso == null ? null : DateTime.tryParse(iso);
  if (d == null) return '';
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return '${d.day} ${months[d.month - 1]} ${d.year}';
}

/// Constats de l'avatar + liste « Sources vérifiables » (chaque constat renvoie à des sources numérotées).
class LiveMarketReferenceSection extends StatefulWidget {
  const LiveMarketReferenceSection({super.key, required this.client, required this.results, required this.city});
  final SupabaseClient client;
  final List<NexusDiscoveryItem> results;
  final String city;

  @override
  State<LiveMarketReferenceSection> createState() => _LiveMarketReferenceSectionState();
}

class _LiveMarketReferenceSectionState extends State<LiveMarketReferenceSection> {
  LiveMarketReference? reference;
  String loadedKey = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant LiveMarketReferenceSection old) {
    super.didUpdateWidget(old);
    _load();
  }

  Future<void> _load() async {
    final ids = widget.results.take(24).map((e) => e.fabricId).toList();
    final key = '${widget.city}|${ids.join(',')}';
    if (key == loadedKey) return;
    loadedKey = key;
    final value = await fetchLiveMarketReference(widget.client,
        query: widget.results.isEmpty ? '' : widget.results.first.title, city: widget.city, fabricIds: ids);
    if (mounted && key == loadedKey) setState(() => reference = value);
  }

  String _cites(LiveMarketPoint p) => p.cites.map((n) => '[$n]').join(' ');

  @override
  Widget build(BuildContext context) {
    final ref = reference;
    if (ref == null) return const SizedBox.shrink();
    return Column(key: const ValueKey('market-reference'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (ref.points.isNotEmpty) ...[
        const SizedBox(height: 10),
        for (final p in ref.points)
          Padding(
            padding: const EdgeInsets.only(bottom: 5),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Padding(padding: EdgeInsets.only(top: 6, right: 8), child: Icon(Icons.circle, size: 5, color: Color(0xFF5B6F6A))),
              Expanded(child: Text.rich(TextSpan(style: const TextStyle(fontSize: 12.5, color: Color(0xFF0F2A26), height: 1.4), children: [
                TextSpan(text: '${p.text} '),
                TextSpan(text: _cites(p), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0B5D4D))),
              ]))),
            ]),
          ),
      ],
      if (ref.advice != null)
        Padding(
          padding: const EdgeInsets.only(top: 2, bottom: 4),
          child: Text.rich(TextSpan(style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0B5D4D)), children: [
            TextSpan(text: '${ref.advice!.text} '),
            TextSpan(text: _cites(ref.advice!), style: const TextStyle(fontSize: 11)),
          ])),
        ),
      Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          key: const ValueKey('market-sources'),
          initiallyExpanded: true,
          tilePadding: EdgeInsets.zero,
          childrenPadding: EdgeInsets.zero,
          title: Text('Sources vérifiables (${ref.sources.length})', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F2A26))),
          children: [
            for (final s in ref.sources)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  SizedBox(width: 30, child: Text('[${s.n}]', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF5B6F6A)))),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(s.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F2A26))),
                    Text(
                      [s.host, if ((s.city ?? '').isNotEmpty) s.city!, s.price != null ? '${liveMoneyText(s.price!)} F' : 'prix non affiché', if (_date(s.observedAt).isNotEmpty) 'relevé le ${_date(s.observedAt)}'].join(' · '),
                      style: const TextStyle(fontSize: 11, color: Color(0xFF6B7C78)),
                    ),
                  ])),
                  if (s.url != null)
                    TextButton.icon(
                      onPressed: () => launchUrl(Uri.parse(s.url!), mode: LaunchMode.externalApplication),
                      icon: const Icon(Icons.open_in_new, size: 13),
                      label: const Text('Ouvrir'),
                      style: TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: const EdgeInsets.symmetric(horizontal: 8)),
                    )
                  else
                    const Padding(padding: EdgeInsets.only(top: 3), child: Text('Dans WAOUH', style: TextStyle(fontSize: 11, color: Color(0xFF6B7C78)))),
                ]),
              ),
            const Text('Les prix et dates viennent des annonces ci-dessus ; ouvrez la source pour les vérifier.', style: TextStyle(fontSize: 11, color: Color(0xFF6B7C78))),
          ],
        ),
      ),
    ]);
  }
}
