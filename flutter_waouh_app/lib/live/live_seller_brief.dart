import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'live_need_domain.dart';

// Vue du vendeur après publication : son prix face aux annonces comparables et les
// acheteurs qui correspondent vraiment (mêmes règles que le web).

String liveSellerMoney(num? value) =>
    value == null ? 'À demander' : '${NumberFormat.decimalPattern('fr_FR').format(value.round())} F CFA';

num? _amount(Object? value) {
  if (value is num) return value.isFinite && value > 0 ? value : null;
  final parsed = double.tryParse('${value ?? ''}'.replaceAll(RegExp(r'[^0-9.\-]'), ''));
  return parsed != null && parsed.isFinite && parsed > 0 ? parsed : null;
}

class LiveSellerVerdict {
  const LiveSellerVerdict({
    required this.tone, required this.label, required this.advice,
    required this.asking, required this.median, required this.low, required this.high,
    required this.count, required this.position,
  });
  /// 'low' | 'fair' | 'high'
  final String tone, label, advice;
  final num asking, median, low, high;
  final int count, position;
}

/// Où se situe le prix demandé face aux annonces comparables.
LiveSellerVerdict? liveSellerPriceVerdict(Map<String, dynamic>? reference) {
  final asking = _amount(reference?['asking_price']);
  final median = _amount(reference?['median']);
  final count = (_amount(reference?['comparable_count']) ?? 0).toInt();
  if (asking == null || median == null || count < 2) return null;
  final low = _amount(reference?['low']) ?? (asking < median ? asking : median);
  final high = _amount(reference?['high']) ?? (asking > median ? asking : median);
  final gap = (asking - median) / median;
  final tone = gap <= -0.1 ? 'low' : (gap >= 0.1 ? 'high' : 'fair');
  final percent = (gap.abs() * 100).round();
  final label = tone == 'fair'
      ? 'Votre prix est dans le marché'
      : tone == 'low'
          ? 'Votre prix est $percent % sous le marché'
          : 'Votre prix est $percent % au-dessus du marché';
  final advice = tone == 'fair'
      ? 'Vous pouvez le laisser tel quel : il se compare bien aux autres annonces.'
      : tone == 'low'
          ? 'Vous vendrez sans doute vite, mais vous pouvez demander davantage.'
          : 'Attendez-vous à négocier, ou baissez un peu pour vendre plus vite.';
  final floor = low < asking ? low : asking;
  final ceiling = high > asking ? high : asking;
  final span = ceiling - floor;
  final position = span <= 0 ? 50 : (((asking - floor) / span) * 100).round();
  return LiveSellerVerdict(
    tone: tone, label: label, advice: advice,
    asking: asking, median: median, low: floor, high: ceiling,
    count: count, position: position.clamp(4, 96),
  );
}

class LiveSellerBrief {
  const LiveSellerBrief({required this.buyers, required this.reachable, required this.inZone, this.verdict, this.priceNote});
  final List<Map<String, dynamic>> buyers;
  final int reachable, inZone;
  final LiveSellerVerdict? verdict;
  final String? priceNote;
}

bool _reachable(Map<String, dynamic> row) =>
    const ['C2', 'C3', 'C4', 'C5'].contains('${row['contactability_level'] ?? 'C0'}');

bool _sameCity(Map<String, dynamic> row, String? city) {
  final a = '${row['city'] ?? ''}'.toLowerCase();
  final b = (city ?? '').toLowerCase();
  if (a.isEmpty || b.isEmpty) return false;
  return a.contains(b) || b.contains(a);
}

LiveSellerBrief liveSellerBrief(
  List<Map<String, dynamic>> results, {
  Map<String, dynamic>? reference,
  String? city,
  String? query,
}) {
  final buyers = (query ?? '').trim().isEmpty
      ? results
      : results.where((row) => liveMatchVerdict(query, row, place: city).acceptable).toList(growable: false);
  final verdict = liveSellerPriceVerdict(reference);
  final asking = _amount(reference?['asking_price']);
  final count = (_amount(reference?['comparable_count']) ?? 0).toInt();
  final priceNote = verdict != null
      ? null
      : asking == null
          ? 'Ajoutez un prix pour que je le compare au marché.'
          : count < 2
              ? 'Aucune annonce comparable publiée : votre prix ne peut pas encore être situé.'
              : null;
  return LiveSellerBrief(
    buyers: buyers,
    reachable: buyers.where(_reachable).length,
    inZone: buyers.where((row) => _sameCity(row, city)).length,
    verdict: verdict,
    priceNote: priceNote,
  );
}

/// Carte du vendeur : prix face au marché, acheteurs trouvés, prise en charge par Bot.
class LiveSellerBriefCard extends StatelessWidget {
  const LiveSellerBriefCard({
    super.key,
    required this.brief,
    this.city,
    this.delegating = false,
    this.delegated = false,
    this.onDelegate,
    this.onFollow,
  });
  final LiveSellerBrief brief;
  final String? city;
  final bool delegating, delegated;
  final VoidCallback? onDelegate, onFollow;

  @override
  Widget build(BuildContext context) {
    final verdict = brief.verdict;
    final buyers = brief.buyers;
    if (verdict == null && buyers.isEmpty && brief.priceNote == null) return const SizedBox.shrink();
    const jade = Color(0xFF087E70);
    final toneColor = verdict == null
        ? jade
        : verdict.tone == 'high'
            ? const Color(0xFFA5601A)
            : verdict.tone == 'low'
                ? jade
                : const Color(0xFF3F4756);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Image.asset('assets/bot/bot_avatar.png', width: 38),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Votre annonce est en ligne', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                Text(
                  buyers.isEmpty
                      ? 'Je cherche des acheteurs pour vous'
                      : '${buyers.length} acheteur${buyers.length > 1 ? 's' : ''} possible${buyers.length > 1 ? 's' : ''}',
                  style: const TextStyle(fontSize: 12, color: Colors.black54),
                ),
              ]),
            ),
          ]),
          if (verdict != null) ...[
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: Text(verdict.label, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: toneColor))),
              Text('${verdict.count} comparable${verdict.count > 1 ? 's' : ''}', style: const TextStyle(fontSize: 11, color: Colors.black45)),
            ]),
            const SizedBox(height: 7),
            LayoutBuilder(
              builder: (context, constraints) => Semantics(
                label: '${verdict.label}. Votre prix ${liveSellerMoney(verdict.asking)}, médiane ${liveSellerMoney(verdict.median)}.',
                child: SizedBox(
                  height: 16,
                  child: Stack(children: [
                    Align(
                      alignment: Alignment.center,
                      child: Container(
                        height: 8,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(999),
                          gradient: const LinearGradient(colors: [Color(0xFF9FD3BD), Color(0xFFE9E2B8), Color(0xFFEFB98C)]),
                        ),
                      ),
                    ),
                    Positioned(
                      left: ((constraints.maxWidth - 16) * verdict.position / 100).clamp(0, constraints.maxWidth - 16),
                      child: Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFF363346),
                          border: Border.all(color: Colors.white, width: 3),
                        ),
                      ),
                    ),
                  ]),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(liveSellerMoney(verdict.low), style: const TextStyle(fontSize: 10.5, color: Colors.black45)),
              Text('Médiane ${liveSellerMoney(verdict.median)}', style: const TextStyle(fontSize: 10.5, color: Colors.black45)),
              Text(liveSellerMoney(verdict.high), style: const TextStyle(fontSize: 10.5, color: Colors.black45)),
            ]),
            const SizedBox(height: 8),
            Text(verdict.advice, style: const TextStyle(fontSize: 12.5, height: 1.5, color: Colors.black87)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(color: jade.withValues(alpha: 0.07), borderRadius: BorderRadius.circular(14)),
              child: Row(children: [
                const Icon(Icons.sell_outlined, size: 18, color: jade),
                const SizedBox(width: 8),
                Expanded(child: Text('Prix conseillé : ${liveSellerMoney((verdict.median / 100).round() * 100)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: jade))),
                Text('${liveSellerMoney(verdict.low)} – ${liveSellerMoney(verdict.high)}', style: const TextStyle(fontSize: 10.5, color: Colors.black45)),
              ]),
            ),
          ],
          if (brief.priceNote != null) ...[
            const SizedBox(height: 10),
            Text(brief.priceNote!, style: const TextStyle(fontSize: 12.5, height: 1.5, color: Colors.black54)),
          ],
          if (buyers.isNotEmpty) ...[
            const Divider(height: 22),
            Row(children: [
              _Stat(label: 'Acheteurs', value: '${buyers.length}'),
              _Stat(label: 'Joignables', value: '${brief.reachable}/${buyers.length}'),
              _Stat(label: 'Votre zone', value: (city ?? '').trim().isEmpty ? '—' : '${brief.inZone}/${buyers.length}'),
            ]),
            const SizedBox(height: 10),
            if (delegated)
              OutlinedButton.icon(
                onPressed: onFollow,
                icon: const Icon(Icons.timeline_outlined, size: 18),
                label: const Text('Bot s’en occupe · Suivre'),
              )
            else
              FilledButton.icon(
                onPressed: delegating ? null : onDelegate,
                icon: delegating
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.handshake_outlined, size: 18),
                label: Text(buyers.length > 1
                    ? 'Confier la vente à Bot · ${buyers.length > 4 ? 4 : buyers.length} acheteurs'
                    : 'Confier la vente à Bot'),
              ),
          ] else
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                'Votre annonce reste visible. Dites-moi « Bot, occupe-t’en » et je cherche des acheteurs en continu, puis je vous préviens.',
                style: const TextStyle(fontSize: 12.5, height: 1.5, color: Colors.black54),
              ),
            ),
        ]),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label, value;
  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.black45)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        ]),
      );
}
