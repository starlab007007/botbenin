import 'dart:math';

const liveSaleConditions = <String, String>{
  'new': 'Neuf',
  'like_new': 'Comme neuf',
  'good': 'Bon état',
  'fair': 'Utilisé',
  'poor': 'À réparer',
};
String liveSaleId() {
  final r = Random.secure();
  final b = List.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  final h = b.map((v) => v.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

Map<String, dynamic> liveSalePlace(String value) {
  final p = value
      .split(',')
      .map((e) => e.trim())
      .where((e) => e.isNotEmpty)
      .toList();
  return {
    'city': p.isEmpty ? '' : p.last,
    'district': p.length > 1 ? p.take(p.length - 1).join(', ') : '',
    'location_label': value,
  };
}

String _fold(String v) {
  const a = {
    'à': 'a',
    'â': 'a',
    'é': 'e',
    'è': 'e',
    'ê': 'e',
    'ë': 'e',
    'î': 'i',
    'ï': 'i',
    'ô': 'o',
    'ù': 'u',
    'û': 'u',
    'ç': 'c',
  };
  return v.toLowerCase().split('').map((c) => a[c] ?? c).join();
}

Map<String, dynamic> liveSaleTextSuggestions(String value) {
  final n = _fold(value);
  final out = <String, dynamic>{};
  final states = <String, String>{
    r'\b(a reparer|en panne|ne fonctionne|defectueux)\b': 'poor',
    r'\b(comme neu[fv]e?|quasi neu[fv]e?|excellent etat)\b': 'like_new',
    r'\b(neuf|neuve|scelle|emballe)\b': 'new',
    r'\b(bon etat|reconditionne)\b': 'good',
    r'\b(occasion|usage|utilise|use)\b': 'fair',
  };
  for (final e in states.entries) {
    if (RegExp(e.key).hasMatch(n)) {
      out['condition'] = e.value;
      break;
    }
  }
  final m = RegExp(
    r'(\d[\d\s.,]*?)\s*(k|millions?|mille)?\s*(?:f\s*cfa|fcfa|xof|francs?|f\b)',
    caseSensitive: false,
  ).firstMatch(value);
  if (m != null) {
    var raw = m[1]!.trim();
    raw = RegExp(r'^\d{1,3}(?:[ .]\d{3})+$').hasMatch(raw)
        ? raw.replaceAll(RegExp(r'[ .]'), '')
        : raw.replaceAll(RegExp(r'\s'), '').replaceAll(',', '.');
    final factor = (m[2] ?? '').startsWith('million')
        ? 1000000
        : (m[2] ?? '').isNotEmpty
        ? 1000
        : 1;
    final amount = (double.tryParse(raw) ?? 0) * factor;
    if (amount > 0 && amount <= 1e12)
      out['price'] = {
        'value': amount.round(),
        'low': amount.round(),
        'high': amount.round(),
        'observations': 0,
      };
  }
  final q = RegExp(
    r'\b(\d+(?:[.,]\d+)?)\s*(tonnes?|kg|kilos?|sacs?|pieces?|unites?|litres?)\b',
  ).firstMatch(n);
  if (q != null) {
    out['quantity'] = double.tryParse(q[1]!.replaceAll(',', '.'));
    final u = q[2]!;
    out['unit'] = u.startsWith('tonne')
        ? 'tonne'
        : u.startsWith('sac')
        ? 'sac'
        : u.startsWith('litre')
        ? 'litre'
        : RegExp(r'kg|kilo').hasMatch(u)
        ? 'kg'
        : 'pièce';
  }
  final c = RegExp(
    r'\b(?:a|sur)\s+(Cotonou|Porto[- ]Novo|Abomey[- ]Calavi|Parakou|Bohicon|Ouidah|Djougou|Natitingou|Lokossa|Kandi)\b',
    caseSensitive: false,
  ).firstMatch(n);
  if (c != null) out['city'] = c[1];
  return out;
}

Map<String, dynamic> liveMergeSaleSuggestions(
  Map<String, dynamic> draft,
  Map<String, dynamic> s,
  Set<String> dirty,
) {
  final out = Map<String, dynamic>.from(draft);
  for (final key in ['title', 'condition', 'quantity', 'unit', 'city']) {
    if (!dirty.contains(key) &&
        s[key] != null &&
        (key != 'city' || '${draft['city'] ?? ''}'.isEmpty))
      out[key] = s[key];
  }
  if (!dirty.contains('price') && s['price'] is Map)
    out['price'] = (s['price'] as Map)['value'];
  return out;
}

Map<String, dynamic> liveNewSaleDraft([
  Map<String, dynamic> initial = const {},
]) => {
  'title': '',
  'price': null,
  'condition': null,
  'city': '',
  'district': '',
  'location_label': '',
  'photos': <String>[],
  'description': '',
  'quantity': null,
  'unit': '',
  'latitude': null,
  'longitude': null,
  ...initial,
  'request_id': initial['request_id'] ?? liveSaleId(),
};

class LivePublishedSale {
  LivePublishedSale(this.owner, this.draft, this.article);
  final String owner;
  final Map<String, dynamic> draft, article;
  String get articleId => '${article['article_id'] ?? article['id']}';
}

class LiveSaleHandoff {
  static final _items =
      <String, ({DateTime expires, LivePublishedSale sale})>{};
  static String path(LivePublishedSale sale) {
    _items.removeWhere((_, v) => v.expires.isBefore(DateTime.now()));
    final id = liveSaleId();
    _items[id] = (
      expires: DateTime.now().add(const Duration(hours: 1)),
      sale: sale,
    );
    return Uri(
      path: '/app/nexus',
      queryParameters: {
        'kind': 'vendre',
        'mode': 'find_buyers',
        'q': '${sale.article['title']}',
        'city': '${sale.draft['city']}',
        'article_id': sale.articleId,
        'sale_draft': id,
        'go': '1',
      },
    ).toString();
  }

  static LivePublishedSale? read(String? id, String? owner) {
    final item = _items[id];
    return item != null &&
            item.sale.owner == owner &&
            item.expires.isAfter(DateTime.now())
        ? item.sale
        : null;
  }
}
