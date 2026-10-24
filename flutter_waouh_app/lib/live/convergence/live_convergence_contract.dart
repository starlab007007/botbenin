const liveConvergenceLimit = 5;
Map<String, dynamic> convergenceMap(dynamic v) => v is Map ? v.map((k, v) => MapEntry(k.toString(), v)) : <String, dynamic>{};
double? convergenceAmount(dynamic v) {
  if (v is! num && v is! String) return null;
  if (v is String && !RegExp(r'^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$',caseSensitive:false).hasMatch(v.trim())) return null;
  final n = double.tryParse(v.toString());
  return n != null && n.isFinite && n >= 0 ? n : null;
}
String liveConvergenceKind(Map<String, dynamic> r) {
  final e = convergenceMap(r['evidence']);
  final explicit = '${r['offer_kind'] ?? r['kind'] ?? e['offer_kind'] ?? ''}'.toLowerCase();
  if (['service', 'prestation'].contains(explicit)) return 'service';
  if (['announcement', 'annonce', 'job', 'event', 'formation'].contains(explicit)) return 'announcement';
  if (['product', 'article', 'catalog'].contains(explicit)) return 'product';
  final category = '${r['category'] ?? e['category'] ?? ''}'.toLowerCase();
  if (RegExp(r'emploi|recrutement|formation|événement|evenement|annonce|opportunit').hasMatch(category)) return 'announcement';
  return RegExp(r'service|prestation|réparation|reparation|plomberie|nettoyage|coiffure|location').hasMatch(category) ? 'service' : 'product';
}
List<Map<String, dynamic>> liveConvergenceReferences(Map<String, dynamic> r) {
  final e = convergenceMap(r['evidence']);
  final raw = r['market_references'] ?? e['market_references'] ?? r['price_references'] ?? e['price_references'];
  if (raw is! List) return [];
  final seen = <String>{}, out = <Map<String, dynamic>>[];
  final expected = '${r['model'] ?? e['model'] ?? ''}'.trim().toLowerCase();
  final unit = '${r['unit'] ?? e['unit'] ?? 'forfait'}'.trim().toLowerCase();
  final currency = '${r['currency'] ?? 'XOF'}'.toUpperCase();
  for (final v in raw) {
    final x = convergenceMap(v), url = Uri.tryParse('${convergenceMap(v)['url'] ?? convergenceMap(v)['source_url'] ?? ''}');
    final price = convergenceAmount(x['amount'] ?? x['price']);
    if (url == null || !['https', 'http'].contains(url.scheme) || url.host.isEmpty || price == null || !seen.add(url.toString())) continue;
    final model = '${x['model'] ?? ''}'.trim().toLowerCase(), otherUnit = '${x['unit'] ?? 'forfait'}'.trim().toLowerCase();
    final cur = '${x['currency'] ?? 'XOF'}'.toUpperCase();
    out.add({'title': x['title'] ?? 'Référence publique', 'seller': x['seller'] ?? x['source'] ?? url.host, 'amount': price, 'url': url.toString(), 'observed_at': x['observed_at'], 'comparable': x['comparable'] == true && expected.isNotEmpty && model == expected && otherUnit == unit && cur == currency, 'model': model, 'unit': otherUnit, 'currency': cur});
    if (out.length == liveConvergenceLimit) break;
  }
  return out;
}
List<String> liveConvergenceMissing(Map<String, dynamic> r) {
  final e = convergenceMap(r['evidence']), kind = liveConvergenceKind(r), out = <String>[];
  bool absent(dynamic v) => v == null || v.toString().trim().isEmpty;
  if (kind != 'announcement' && convergenceAmount(r['price'] ?? r['price_min']) == null) out.add('Prix à préciser');
  if (kind == 'product') {
    if (absent(r['availability'] ?? e['availability'])) out.add('Stock à confirmer');
    if (convergenceAmount(r['delivery_fee'] ?? e['delivery_fee']) == null) out.add('Livraison à préciser');
  }
  if (kind == 'service') {
    if (absent(r['scope'] ?? e['scope'])) out.add('Périmètre de prestation à préciser');
    if (absent(r['availability'] ?? e['availability'])) out.add('Créneau à confirmer');
    if (absent(r['exclusions'] ?? e['exclusions'])) out.add('Frais et exclusions à préciser');
  }
  if (kind == 'announcement') {
    if (absent(r['expires_at'] ?? e['expires_at'])) out.add('Validité à confirmer');
    if (absent(r['conditions'] ?? e['conditions'])) out.add('Conditions à préciser');
  }
  return out;
}
Map<String, dynamic> liveConvergenceTotal(List<Map<String, dynamic>> parts) {
  var total = 0.0, complete = parts.isNotEmpty;
  for (final p in parts) {
    final a = convergenceAmount(p['amount']), b = convergenceAmount(p['extra_cost']);
    total += (a ?? 0) + (b ?? 0); complete = complete && a != null && b != null;
  }
  return {'known': total, 'complete': complete, 'count': parts.length};
}

List<Map<String,dynamic>> liveConvergenceWithReferences(List<Map<String,dynamic>> rows) => rows.map((r) {
  if(liveConvergenceReferences(r).isNotEmpty)return r;
  final e=convergenceMap(r['evidence']);
  final model='${r['model'] ?? e['model'] ?? ''}'.trim().toLowerCase(),category='${r['category'] ?? e['category'] ?? ''}'.trim().toLowerCase(),condition='${r['condition'] ?? ''}'.trim().toLowerCase();
  final kind=liveConvergenceKind(r);
  return {...r,'market_reference_scope':'search_results','market_references':rows.where((x)=>!identical(x,r)&&liveConvergenceKind(x)==kind&&(model.isNotEmpty?'${x['model'] ?? convergenceMap(x['evidence'])['model'] ?? ''}'.trim().toLowerCase()==model:category.isNotEmpty&&'${x['category'] ?? convergenceMap(x['evidence'])['category'] ?? ''}'.trim().toLowerCase()==category)).map((x)=>{'title':x['title'],'seller':x['seller_label'] ?? x['source'],'price':x['price'] ?? x['price_min'],'source_url':x['source_url'],'observed_at':x['last_verified_at'] ?? x['observed_at'],'model':x['model'] ?? convergenceMap(x['evidence'])['model'],'unit':x['unit'] ?? convergenceMap(x['evidence'])['unit'] ?? 'forfait','currency':x['currency'] ?? 'XOF','comparable':kind=='product'&&model.isNotEmpty&&condition.isNotEmpty&&'${x['condition'] ?? ''}'.trim().toLowerCase()==condition}).toList()};
}).toList();
