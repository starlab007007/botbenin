import 'package:flutter/material.dart';

/// Verdict prix partagé (mêmes seuils que le Web) :
/// jusqu'à -10 % sous la référence = bonne affaire, au-delà de +15 % = trop cher.
class LiveMarketVerdict {
  const LiveMarketVerdict(this.tone, this.label, this.gapPct);
  final String tone; // 'good' | 'fair' | 'high'
  final String label;
  final int gapPct;
}

LiveMarketVerdict? liveMarketVerdict(num? amount, num? reference) {
  if (amount == null || reference == null || amount <= 0 || reference <= 0) return null;
  final gap = (amount - reference) / reference;
  final pct = (gap * 100).round();
  if (gap <= -0.10) return LiveMarketVerdict('good', 'Bonne affaire', pct);
  if (gap > 0.15) return LiveMarketVerdict('high', 'Trop cher', pct);
  return LiveMarketVerdict('fair', 'Prix juste', pct);
}

class LiveMarketVerdictLine extends StatelessWidget {
  const LiveMarketVerdictLine({super.key, required this.verdict, required this.referenceLabel});
  final LiveMarketVerdict verdict;
  final String referenceLabel;
  @override
  Widget build(BuildContext context) {
    final color = verdict.tone == 'good' ? const Color(0xFF15803D) : verdict.tone == 'high' ? const Color(0xFFB91C1C) : const Color(0xFFB45309);
    final gap = verdict.gapPct == 0 ? 'au niveau du $referenceLabel' : '${verdict.gapPct.abs()} % ${verdict.gapPct < 0 ? 'sous' : 'au-dessus du'} $referenceLabel';
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: color.withValues(alpha: 0.25))),
      child: Row(children: [
        Icon(verdict.tone == 'good' ? Icons.trending_down : verdict.tone == 'high' ? Icons.trending_up : Icons.check_circle_outline, color: color, size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text.rich(TextSpan(children: [
          TextSpan(text: '${verdict.label} · ', style: TextStyle(fontWeight: FontWeight.w800, color: color)),
          TextSpan(text: gap, style: const TextStyle(fontSize: 13)),
        ]))),
      ]),
    );
  }
}

String _fcfa(num? n) => n == null ? '—' : '${n.round().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ' ')} F';

/// Repère marché d'un échange (même rendu que le Web) : verdict, jauge, conseil, provenance.
class LiveMarketVerdictCard extends StatelessWidget {
  const LiveMarketVerdictCard({super.key, required this.market, required this.amount, this.amountLabel = 'Prix affiché'});
  final Map market;
  final num? amount;
  final String amountLabel;
  @override
  Widget build(BuildContext context) {
    final median = num.tryParse('${market['median'] ?? ''}');
    if (median == null || median <= 0) return const SizedBox.shrink();
    final v = liveMarketVerdict(amount, median);
    final a = amount ?? median;
    final lowRaw = num.tryParse('${market['low'] ?? ''}') ?? median, highRaw = num.tryParse('${market['high'] ?? ''}') ?? median;
    final low = lowRaw < a ? lowRaw : a, high = highRaw > a ? highRaw : a;
    final pos = high > low ? (((a - low) / (high - low)) * 100).clamp(4, 96) : 50;
    final color = v?.tone == 'good' ? const Color(0xFF15803D) : v?.tone == 'high' ? const Color(0xFFB91C1C) : const Color(0xFF3F4756);
    final sources = (market['sources'] as List? ?? const []).map((e) => '$e').where((e) => e.isNotEmpty).toList();
    final count = market['count'];
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(18), border: Border.all(color: color.withValues(alpha: 0.22))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(child: Text(v?.label ?? 'Repère marché', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: color))),
          if (count != null) Text('$count comparable${(count is num && count > 1) ? 's' : ''}', style: const TextStyle(fontSize: 11, color: Colors.black45)),
        ]),
        if (v != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text('$amountLabel ${v.gapPct == 0 ? 'au niveau du marché' : '${v.gapPct.abs()} % ${v.gapPct < 0 ? 'sous' : 'au-dessus du'} marché'}', style: const TextStyle(fontSize: 12, color: Colors.black54))),
        const SizedBox(height: 12),
        LayoutBuilder(builder: (context, c) => SizedBox(height: 16, child: Stack(children: [
          Align(child: Container(height: 8, decoration: BoxDecoration(borderRadius: BorderRadius.circular(999), gradient: const LinearGradient(colors: [Color(0xFF9FD3BD), Color(0xFFE9E2B8), Color(0xFFEFB98C)])))),
          Positioned(left: ((c.maxWidth - 16) * pos / 100).clamp(0, c.maxWidth - 16).toDouble(), child: Container(width: 16, height: 16, decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF363346), border: Border.all(color: Colors.white, width: 3)))),
        ]))),
        const SizedBox(height: 6),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(_fcfa(low), style: const TextStyle(fontSize: 10.5, color: Colors.black45)),
          Text('Médiane ${_fcfa(median)}', style: const TextStyle(fontSize: 10.5, color: Colors.black45)),
          Text(_fcfa(high), style: const TextStyle(fontSize: 10.5, color: Colors.black45)),
        ]),
        if ('${market['advice'] ?? ''}'.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 10), child: Text('${market['advice']}', style: const TextStyle(fontSize: 12.5, height: 1.45))),
        if (sources.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text('Comparé avec : ${sources.join(', ')}', style: const TextStyle(fontSize: 11, color: Colors.black45))),
      ]),
    );
  }
}
