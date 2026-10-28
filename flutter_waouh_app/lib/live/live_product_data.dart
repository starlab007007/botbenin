const productPhotoLimit = 4;
Map<String, dynamic> productMap(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : {};
String productText(dynamic value) => value is String ? value.trim() : '';
List<String> liveProductPhotos(dynamic value) {
  final p = productMap(value), e = productMap(p['evidence']);
  final values = [
    p['primary_photo_url'],
    e['primary_photo_url'],
    p['photos'],
    p['photo_urls'],
    p['images'],
    e['photos'],
    e['photo_urls'],
    e['images'],
    p['image_url'],
    e['image_url'],
    p['image'],
    p['photo'],
    e['photo'],
    e['thumbnail'],
    p['media'],
  ];
  final out = <String>[];
  for (final raw in values.expand((v) => v is List ? v : [v])) {
    final item = productMap(raw);
    final url = productText(raw).isNotEmpty
        ? productText(raw)
        : productText(item['url'] ?? item['src'] ?? item['public_url']);
    if (!RegExp(r'^https?://', caseSensitive: false).hasMatch(url) ||
        out.contains(url))
      continue;
    out.add(url);
    if (out.length == productPhotoLimit) break;
  }
  return out;
}

double? productAmount(List<dynamic> values) {
  for (final v in values) {
    final n = v is num
        ? v.toDouble()
        : double.tryParse(
            '$v'.replaceAll(RegExp(r'\s'), '').replaceAll(',', '.'),
          );
    if (n != null && n.isFinite && n > 0) return n;
  }
  return null;
}

class LiveProductData {
  LiveProductData(dynamic value) {
    final original = productMap(value), meta = productMap(original['metadata']);
    raw = meta['product_snapshot'] is Map
        ? productMap(meta['product_snapshot'])
        : original;
    final e = productMap(raw['evidence']);
    title = productText(
      raw['title'] ?? raw['subject'] ?? raw['nom'] ?? raw['name'],
    );
    photos = liveProductPhotos(raw);
    description = productText(
      raw['description'] ?? e['description'] ?? raw['raw_text'],
    );
    city = productText(raw['city'] ?? raw['ville']);
    currency = productText(raw['currency'] ?? raw['devise']);
    if (currency.isEmpty) currency = 'XOF';
    min = productAmount([
      raw['price_min'],
      raw['prix_min'],
      raw['price_amount'],
      raw['price'],
      raw['prix'],
    ]);
    max = productAmount([
      raw['price_max'],
      raw['prix_max'],
      raw['price_amount'],
      raw['price'],
      raw['prix'],
    ]);
    attributes = {};
    for (final pair in {
      'Marque': raw['brand'] ?? e['brand'],
      'Modèle': raw['model'] ?? e['model'],
      'État': raw['condition'] ?? e['condition'],
      'Capacité': raw['storage'] ?? e['storage'] ?? e['capacity'],
      'Couleur': raw['color'] ?? e['color'],
      'Unité': raw['unit'] ?? raw['unite'] ?? e['unit'] ?? e['price_unit'],
      'Garantie annoncée': raw['warranty'] ?? e['warranty'],
      'Livraison': raw['delivery'] ?? e['delivery'],
    }.entries) {
      final text = productText(pair.value);
      if (text.isNotEmpty) attributes[pair.key] = text;
    }
    for (final a
        in raw['attributes'] is List ? raw['attributes'] as List : []) {
      final item = productMap(a),
          label = productText(productMap(a)['label']),
          text = productText(productMap(a)['value']);
      if (item.isNotEmpty && label.isNotEmpty && text.isNotEmpty)
        attributes.putIfAbsent(label, () => text);
    }
  }
  late Map<String, dynamic> raw;
  late String title, description, city, currency;
  late List<String> photos;
  late Map<String, String> attributes;
  late double? min, max;
  String money(double n) =>
      '${n.round().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]} ')} ${currency == 'XOF' ? 'F CFA' : currency}';
  String get price => min != null && max != null && min != max
      ? '${money(min!)} – ${money(max!)}'
      : min != null || max != null
      ? money((min ?? max)!)
      : 'Prix à préciser';
}
