import 'live_nexus_service.dart';
import 'convergence/live_convergence_contract.dart';

String essentialNormalize(String? value) {
  var out = (value ?? '').trim().toLowerCase();
  for (final pair in {
    'à': 'a',
    'â': 'a',
    'ä': 'a',
    'é': 'e',
    'è': 'e',
    'ê': 'e',
    'ë': 'e',
    'î': 'i',
    'ï': 'i',
    'ô': 'o',
    'ö': 'o',
    'ù': 'u',
    'û': 'u',
    'ü': 'u',
    'ç': 'c',
  }.entries) {
    out = out.replaceAll(pair.key, pair.value);
  }
  return out;
}

String essentialText(dynamic value) => value is String ? value.trim() : '';
String essentialUnit(NexusDiscoveryItem r) =>
    essentialText(r.evidence['unit']).isNotEmpty
    ? essentialText(r.evidence['unit'])
    : essentialText(r.evidence['price_unit']).isNotEmpty
    ? essentialText(r.evidence['price_unit'])
    : essentialText(r.evidence['unite']);
Map<String, dynamic> essentialMap(NexusDiscoveryItem r) => {
  'category': r.category,
  'currency': r.currency,
  'model': r.evidence['model'],
  'evidence': r.evidence,
  'unit': essentialUnit(r),
};
String essentialKind(NexusDiscoveryItem r) =>
    liveConvergenceKind(essentialMap(r));
String essentialIdentity(NexusDiscoveryItem r) {
  final article = r.articleId ?? essentialText(r.evidence['article_id']);
  final catalog = r.catalogId ?? essentialText(r.evidence['catalog_id']);
  if (article.isNotEmpty) return 'article:$article';
  if (catalog.isNotEmpty) return 'catalog:$catalog';
  return r.fabricId;
}

List<NexusDiscoveryItem> essentialUnique(List<NexusDiscoveryItem> rows) {
  final seen = <String>{};
  return rows
      .where(
        (r) =>
            essentialIdentity(r).isNotEmpty && seen.add(essentialIdentity(r)),
      )
      .toList();
}

bool essentialPrimaryNeedsPrice(NexusDiscoveryItem r) =>
    essentialKind(r) == 'product';
String essentialHint(NexusDiscoveryItem r) => essentialKind(r) == 'announcement'
    ? 'Conditions à confirmer'
    : essentialUnit(r).isNotEmpty
    ? essentialUnit(r)
    : essentialKind(r) == 'service'
    ? 'Périmètre à confirmer'
    : 'Unité à confirmer';
String essentialPrice(NexusDiscoveryItem r) {
  String money(double n) {
    final digits = n.round().toString().replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]} ',
    );
    return '$digits ${r.currency == 'XOF' ? 'F CFA' : r.currency}';
  }

  final min = r.priceMin != null && r.priceMin! > 0 ? r.priceMin : null,
      max = r.priceMax != null && r.priceMax! > 0 ? r.priceMax : null;
  if (min == null && max == null) return 'Prix à demander';
  return min != null && max != null && min != max
      ? '${money(min)} – ${money(max)}'
      : money((min ?? max)!);
}

String essentialAdvice(NexusDiscoveryItem r) {
  if (r.priceMin == null && r.priceMax == null)
    return 'À préciser : prix et conditions.';
  if (essentialUnit(r).isEmpty && essentialKind(r) == 'product')
    return 'À confirmer : prix à l’unité ou au lot.';
  final supplied = essentialText(r.evidence['recommendation']).isNotEmpty
      ? essentialText(r.evidence['recommendation'])
      : essentialText(r.evidence['advice']);
  if (supplied.isNotEmpty &&
      !RegExp(
        r'ENRICH|NEXUS|C[0-5]|score|Opportunity OS|\d+%',
        caseSensitive: false,
      ).hasMatch(supplied))
    return supplied.length > 110
        ? '${supplied.substring(0, 107).trim()}…'
        : supplied;
  return essentialKind(r) == 'service'
      ? 'À confirmer : périmètre et créneau.'
      : essentialKind(r) == 'announcement'
      ? 'À vérifier : conditions et validité.'
      : 'À confirmer : disponibilité et livraison.';
}

List<Map<String, dynamic>> essentialReferences(NexusDiscoveryItem r) =>
    liveConvergenceReferences(essentialMap(r))
        .map(
          (ref) => {
            ...ref,
            'comparable':
                ref['comparable'] == true && essentialUnit(r).isNotEmpty,
          },
        )
        .toList();
double? essentialMedian(NexusDiscoveryItem r) {
  final prices =
      essentialReferences(r)
          .where((r) => r['comparable'] == true)
          .map((r) => (r['amount'] as num).toDouble())
          .toList()
        ..sort();
  if (prices.length < 2) return null;
  return prices.length.isOdd
      ? prices[prices.length ~/ 2]
      : (prices[prices.length ~/ 2 - 1] + prices[prices.length ~/ 2]) / 2;
}

String essentialMarketLabel(NexusDiscoveryItem r) => essentialMedian(r) == null
    ? 'Données insuffisantes'
    : '${essentialReferences(r).where((r) => r['comparable'] == true).length} références comparables';
bool essentialContactPossible(NexusDiscoveryItem r) =>
    ['C2', 'C3', 'C4', 'C5'].contains(r.contactPolicy.level);
String essentialJourneyAction(String stage, bool hasThread) => hasThread
    ? ['agreed', 'executing'].contains(stage)
          ? 'Voir l’accord'
          : 'Suivre la réponse'
    : ['discovered', 'enriching'].contains(stage)
    ? 'Compléter les informations'
    : 'Voir la démarche';
