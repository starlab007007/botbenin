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
