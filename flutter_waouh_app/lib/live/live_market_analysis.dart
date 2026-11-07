import 'package:flutter/material.dart';

import 'live_nexus_service.dart';
import 'live_offer_channels.dart';

class LiveMarketRow {
  const LiveMarketRow({
    required this.item,
    required this.price,
    required this.vsMedianPct,
    required this.channels,
    required this.rank,
  });
  final NexusDiscoveryItem item;
  final double? price;

  /// Écart à la médiane du marché, en % (négatif = moins cher).
  final int? vsMedianPct;
  final List<LiveOfferChannel> channels;
  final int rank;
}

class LiveMarketAnalysis {
  const LiveMarketAnalysis({
    required this.total,
    required this.priced,
    required this.low,
    required this.median,
    required this.high,
    required this.inZone,
    required this.contactable,
    required this.byChannel,
    required this.pick,
    required this.pickReason,
    required this.compare,
    required this.advice,
  });
  final int total;
  final int priced;
  final double? low;
  final double? median;
  final double? high;
  final int inZone;
  final int contactable;
  final Map<LiveOfferChannel, int> byChannel;
  final LiveMarketRow? pick;
  final String pickReason;
  final List<LiveMarketRow> compare;
  final String advice;
}

double? _priceOf(NexusDiscoveryItem item) {
  final p = item.priceMin ?? item.priceMax;
  return (p != null && p > 0) ? p : null;
}

bool _sameZone(String? a, String? b) =>
    a != null && b != null && a.trim().isNotEmpty && a.trim().toLowerCase() == b.trim().toLowerCase();

String _money(double? n) => n == null ? '—' : '${liveMoneyText(n)} F';

/// Analyse du marché des offres reçues et choix de l'avatar (même calcul que le web).
LiveMarketAnalysis analyzeLiveMarket(List<NexusDiscoveryItem> results, {String? city}) {
  final prices = results.map(_priceOf).whereType<double>().toList()..sort();
  final low = prices.isEmpty ? null : prices.first;
  final high = prices.isEmpty ? null : prices.last;
  double? median;
  if (prices.isNotEmpty) {
    final mid = prices.length ~/ 2;
    median = prices.length.isOdd ? prices[mid] : ((prices[mid - 1] + prices[mid]) / 2).roundToDouble();
  }
  final byChannel = {for (final c in LiveOfferChannel.values) c: 0};
  final rows = <LiveMarketRow>[];
  var contactable = 0;
  var inZone = 0;
  for (final item in results) {
    final channels = liveOfferChannels(item);
    for (final c in channels) {
      byChannel[c] = (byChannel[c] ?? 0) + 1;
    }
    if (channels.isNotEmpty) contactable++;
    final zone = _sameZone(item.city, city);
    if (zone) inZone++;
    final price = _priceOf(item);
    final vs = (price != null && median != null && median > 0) ? (((price - median) / median) * 100).round() : null;
    final priceScore = (price == null || median == null || high == null || low == null)
        ? 25.0
        : (100 - ((price - low) / (high - low < 1 ? 1 : high - low)) * 70).clamp(0, 100).toDouble();
    final zoneScore = zone ? 100.0 : 40.0;
    final trust = item.scores.trust.clamp(0, 100).toDouble();
    final channelScore = channels.contains(LiveOfferChannel.waouh)
        ? 100.0
        : channels.contains(LiveOfferChannel.whatsapp)
            ? 80.0
            : channels.isNotEmpty
                ? 60.0
                : 0.0;
    final relevance = item.scores.total.clamp(0, 100).toDouble();
    final rank = (priceScore * .3 + zoneScore * .15 + trust * .15 + channelScore * .2 + relevance * .2).round();
    rows.add(LiveMarketRow(item: item, price: price, vsMedianPct: vs, channels: channels, rank: rank));
  }
  final candidates = rows.where((r) => r.channels.isNotEmpty).toList()..sort((a, b) => b.rank.compareTo(a.rank));
  final compare = candidates.take(3).toList(growable: false);
  final best = compare.isEmpty ? null : compare.first;
  var reason = '';
  if (best != null) {
    final parts = <String>[];
    if (best.price != null) {
      final vs = best.vsMedianPct;
      parts.add(vs != null && vs < 0
          ? '${_money(best.price)}, ${vs.abs()} % sous la médiane'
          : vs != null && vs > 0
              ? '${_money(best.price)}, $vs % au-dessus de la médiane'
              : _money(best.price));
    }
    if (_sameZone(best.item.city, city)) parts.add('dans votre zone');
    parts.add('joignable par ${liveChannelName(best.channels.first)}');
    reason = parts.join(' · ');
  }
  final advice = results.isEmpty
      ? 'Aucune offre pour l’instant.'
      : contactable == 0
          ? 'Aucune offre n’a de contact exploitable : ouvrez les annonces d’origine ou activez une veille.'
          : prices.length < 3
              ? 'Peu de prix à comparer : gardez une marge de négociation prudente.'
              : median != null
                  ? 'Visez autour de ${_money((median * 0.9).roundToDouble())} : c’est 10 % sous la médiane du marché.'
                  : 'Comparez les offres avant de proposer un prix.';
  return LiveMarketAnalysis(
    total: results.length,
    priced: prices.length,
    low: low,
    median: median,
    high: high,
    inZone: inZone,
    contactable: contactable,
    byChannel: byChannel,
    pick: best,
    pickReason: reason,
    compare: compare,
    advice: advice,
  );
}

/// Carte « Analyse du marché » : repères de prix, choix de l'avatar, comparaison, « Confier à l'avatar ».
class LiveMarketAnalysisCard extends StatelessWidget {
  const LiveMarketAnalysisCard({
    super.key,
    required this.results,
    required this.city,
    required this.nexus,
    required this.onInterested,
    required this.onDelegate,
    this.handled = false,
    this.busy = false,
  });
  final List<NexusDiscoveryItem> results;
  final String city;
  final LiveNexusService nexus;
  final ValueChanged<NexusDiscoveryItem> onInterested;
  final ValueChanged<NexusDiscoveryItem> onDelegate;
  final bool handled;
  final bool busy;

  static const _ink = Color(0xFF0F2A26);
  static const _muted = Color(0xFF5B6F6A);
  static const _green = Color(0xFF0F9F81);

  Widget _stat(String label, String value, String sub) => Expanded(
    child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 3),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE3EEE9))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 11, color: _muted, fontWeight: FontWeight.w600)),
        const SizedBox(height: 3),
        Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: _ink)),
        const SizedBox(height: 1),
        Text(sub, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, color: Color(0xFF6B7C78))),
      ]),
    ),
  );

  @override
  Widget build(BuildContext context) {
    if (results.isEmpty) return const SizedBox.shrink();
    final a = analyzeLiveMarket(results, city: city);
    final channelText = [
      for (final c in LiveOfferChannel.values)
        if ((a.byChannel[c] ?? 0) > 0) '${a.byChannel[c]} ${liveChannelName(c)}',
    ].join(' · ');
    final pick = a.pick;
    return Container(
      key: const ValueKey('market-analysis'),
      margin: const EdgeInsets.symmetric(vertical: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD7E6DF)),
        gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Colors.white, Color(0xFFF1FAF6), Color(0xFFEEF8FB)]),
        boxShadow: const [BoxShadow(color: Color(0x140F3D34), blurRadius: 24, offset: Offset(0, 8))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Image.asset('assets/bot/bot_avatar.png', width: 34, height: 34),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Analyse du marché', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: _ink)),
            Text('Par votre avatar · ${a.total} offre${a.total > 1 ? 's' : ''} comparée${a.total > 1 ? 's' : ''}', style: const TextStyle(fontSize: 12, color: _muted)),
          ])),
        ]),
        const SizedBox(height: 12),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _stat('Prix', _money(a.low), 'à ${_money(a.high)} · médiane ${_money(a.median)}'),
          _stat('Joignables', '${a.contactable}/${a.total}', channelText.isEmpty ? 'aucun contact' : channelText),
          _stat('Votre zone', '${a.inZone}', city.trim().isEmpty ? 'toutes zones' : city),
        ]),
        const SizedBox(height: 10),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Icon(Icons.auto_awesome, size: 14, color: Color(0xFF0B5D4D)),
          const SizedBox(width: 6),
          Expanded(child: Text(a.advice, style: const TextStyle(fontSize: 12.5, color: Color(0xFF0B5D4D), fontWeight: FontWeight.w600))),
        ]),
        if (pick != null) ...[
          const SizedBox(height: 12),
          Container(
            key: const ValueKey('market-pick'),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: _green, width: 1.5)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                  decoration: BoxDecoration(color: _green, borderRadius: BorderRadius.circular(99)),
                  child: const Text('CHOIX DE L’AVATAR', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: .6)),
                ),
              ),
              const SizedBox(height: 6),
              Row(children: [
                Expanded(child: Text(pick.item.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _ink))),
                Text(_money(pick.price), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0B5D4D))),
              ]),
              const SizedBox(height: 4),
              Text(a.pickReason, style: const TextStyle(fontSize: 12.5, color: Color(0xFF4A5D58))),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: FilledButton(
                  key: const ValueKey('market-interested'),
                  onPressed: busy ? null : () => onInterested(pick.item),
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(46), backgroundColor: _green, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: const Text('Intéressé', style: TextStyle(fontWeight: FontWeight.w800)),
                )),
                const SizedBox(width: 8),
                Expanded(child: OutlinedButton(
                  key: const ValueKey('market-delegate'),
                  onPressed: busy ? null : () => onDelegate(pick.item),
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: const Text('Confier à l’avatar', style: TextStyle(fontWeight: FontWeight.w800)),
                )),
              ]),
              LiveDirectContactBar(item: pick.item, nexus: nexus),
              if (handled)
                Container(
                  margin: const EdgeInsets.only(top: 12),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: const Color(0xFFE8F8EE), borderRadius: BorderRadius.circular(12)),
                  child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Icon(Icons.check_circle, size: 16, color: Color(0xFF0A6B35)),
                    SizedBox(width: 7),
                    Expanded(child: Text('Bot a pris en charge votre démarche, de bout en bout. Vous êtes prévenu à chaque étape et vous gardez la main.', style: TextStyle(fontSize: 12.5, color: Color(0xFF0A6B35), fontWeight: FontWeight.w600))),
                  ]),
                ),
            ]),
          ),
        ] else ...[
          const SizedBox(height: 10),
          const Text('Aucune offre avec un contact exploitable. Ouvrez les annonces d’origine ou laissez l’avatar surveiller les nouvelles offres.', style: TextStyle(fontSize: 13, color: _muted)),
        ],
        if (a.compare.length > 1) ...[
          const SizedBox(height: 12),
          for (var i = 0; i < a.compare.length; i++)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: i == 0 ? _green : const Color(0xFFE3EEE9))),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(a.compare[i].item.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _ink)),
                  Text('${a.compare[i].item.city ?? 'Zone à préciser'} · ${a.compare[i].channels.map(liveChannelName).join(', ')}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: Color(0xFF6B7C78))),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text(_money(a.compare[i].price), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: _ink)),
                  if (a.compare[i].vsMedianPct != null)
                    Text('${a.compare[i].vsMedianPct! > 0 ? '+' : ''}${a.compare[i].vsMedianPct} %', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: a.compare[i].vsMedianPct! <= 0 ? const Color(0xFF0A7A4A) : const Color(0xFFB45309))),
                ]),
                const SizedBox(width: 8),
                TextButton(onPressed: busy ? null : () => onInterested(a.compare[i].item), child: Text(i == 0 ? 'Retenu' : 'Choisir')),
              ]),
            ),
        ],
      ]),
    );
  }
}
