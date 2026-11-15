// Recherche guidée → moteur du Chat (parité Web `guidedAsk.ts` et `chatMarketBrief.ts`).
//
// Les entrées guidées (Acheter, Vendre, Trouver, Opportunité, Service, Prestation) ne lancent
// plus un parcours à part : elles écrivent une demande que le Chat envoie par son propre
// moteur. Recherche, fiches, intérêt et ouverture de l'échange sont ceux du Chat.
//
// Fichier sans dépendance d'interface : uniquement des fonctions pures, testées.

/// Demande guidée prête à partir dans le Chat.
class LiveGuidedAsk {
  const LiveGuidedAsk({
    required this.kind,
    required this.text,
    required this.goal,
    this.city = '',
    this.budget,
    this.force = true,
  });

  final String kind;

  /// Ouvre toujours l'écran de recherche du Chat. Faux pour un texte libre saisi à l'accueil :
  /// le Chat décide alors lui-même, comme pour toute phrase écrite dans le composeur.
  final bool force;

  /// Phrase envoyée au Chat. Vide pour « vendre » : le Chat ouvre sa fiche de vente.
  final String text;
  final String goal;
  final String city;
  final int? budget;

  Map<String, dynamic> toMap() => <String, dynamic>{
        'kind': kind,
        'text': text,
        'goal': goal,
        'city': city,
        'force': force,
        if (budget != null) 'budget': budget,
      };

  static LiveGuidedAsk? fromMap(Object? value) {
    if (value is! Map) return null;
    final kind = '${value['kind'] ?? ''}'.trim();
    if (kind.isEmpty) return null;
    final text = '${value['text'] ?? ''}'.trim();
    final goal = '${value['goal'] ?? ''}'.trim();
    return LiveGuidedAsk(
      kind: kind,
      text: text,
      goal: goal.isEmpty ? text : goal,
      city: '${value['city'] ?? ''}'.trim(),
      budget: liveGuidedBudget(value['budget']),
      force: value['force'] != false,
    );
  }
}

const Map<String, String> liveGuidedKindLabels = <String, String>{
  'acheter': 'Achat',
  'vendre': 'Vente',
  'trouver': 'Recherche',
  'demander': 'Demande',
  'opportunite': 'Opportunité',
  'service': 'Service',
  'prestation': 'Prestation',
};

int? liveGuidedBudget(Object? value) {
  if (value is num) return value > 0 ? value.round() : null;
  final digits = '${value ?? ''}'.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return null;
  final n = int.tryParse(digits);
  return n != null && n > 0 ? n : null;
}

/// « 300 000 » : milliers séparés par une espace, sans dépendance de formatage.
String liveGuidedThousands(num value) {
  final digits = value.round().abs().toString();
  final out = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) out.write(' ');
    out.write(digits[i]);
  }
  return value < 0 ? '-$out' : out.toString();
}

String liveBriefMoney(num? value) => value == null ? '—' : '${liveGuidedThousands(value)} F';

final RegExp _alreadyPhrased = RegExp(
  r"^\s*(je\s+(cherche|recherche|veux|voudrais|souhaite|vends)|j[’']ai\s+besoin|cherche|recherche|trouve|acheter|vendre)\b",
  caseSensitive: false,
);

/// Phrase naturelle comprise par le moteur du Chat, construite à partir du formulaire guidé.
String liveGuidedAskText({
  required String kind,
  required String q,
  String city = '',
  Object? budget,
  bool free = false,
}) {
  if (kind == 'vendre') return '';
  final query = q.trim().replaceAll(RegExp(r'\s+'), ' ');
  if (query.isEmpty) return '';
  if (free) return query;
  final zone = city.trim();
  final max = liveGuidedBudget(budget);
  String text;
  switch (kind) {
    case 'acheter':
      text = 'Je cherche à acheter $query';
      break;
    case 'demander':
      text = 'Je recherche : $query';
      break;
    case 'opportunite':
      text = 'Je cherche une opportunité : $query';
      break;
    case 'service':
      text = 'Je cherche un service : $query';
      break;
    case 'prestation':
      text = 'Je cherche un prestataire pour : $query';
      break;
    default:
      text = _alreadyPhrased.hasMatch(query) ? query : 'Je cherche $query';
  }
  if (zone.isNotEmpty && !text.toLowerCase().contains(zone.toLowerCase())) {
    text = '$text à $zone';
  }
  if (max != null && kind != 'opportunite') {
    text = '$text, budget maximum ${liveGuidedThousands(max)} FCFA';
  }
  return text;
}

const Map<String, String> _nexusKinds = <String, String>{
  'acheter': 'acheter',
  'purchase': 'acheter',
  'trouver': 'trouver',
  'demander': 'demander',
  'opportunite': 'opportunite',
  'opportunity': 'opportunite',
  'service': 'service',
  'prestation': 'prestation',
  'project': 'prestation',
};

/// Lien de recherche guidée (`/app/nexus?q=…&go=1`) → demande pour le Chat.
/// Retourne null quand le lien garde son écran : vente d'un article, outils, lien sans recherche.
LiveGuidedAsk? liveGuidedAskFromUri(Uri uri) {
  final p = uri.queryParameters;
  if (uri.path != '/app/nexus' || p['go'] != '1') return null;
  final q = (p['q'] ?? '').trim();
  if (q.isEmpty) return null;
  if (p.containsKey('tab') || p.containsKey('article_id') || p.containsKey('sale_draft')) return null;
  final mode = p['mode'];
  final rawKind = (p['kind'] ?? '').toLowerCase();
  if (mode == 'find_buyers' || mode == 'sell' || rawKind == 'vendre' || rawKind == 'sale') return null;
  final kind = _nexusKinds[rawKind] ?? (mode == 'find_sellers' ? 'acheter' : 'trouver');
  final city = (p['city'] ?? '').trim();
  final free = p['free'] == '1';
  final text = liveGuidedAskText(kind: kind, q: q, city: city, budget: p['budget'], free: free);
  if (text.isEmpty) return null;
  return LiveGuidedAsk(
    kind: kind,
    text: text,
    goal: q,
    city: city,
    budget: liveGuidedBudget(p['budget']),
    force: !free,
  );
}

// ───────────────────────── Analyse du marché ─────────────────────────

class LiveChatBriefRow {
  const LiveChatBriefRow({
    required this.row,
    required this.price,
    required this.vsMedianPct,
    required this.inZone,
    required this.withinBudget,
    required this.reachable,
    required this.delegateId,
    required this.rank,
  });

  final Map<String, dynamic> row;
  final double? price;

  /// Écart à la médiane, en % (négatif = moins cher).
  final int? vsMedianPct;
  final bool inZone;
  final bool? withinBudget;
  final bool reachable;

  /// Identifiant de l'offre que Bot peut prendre en charge, sinon null.
  final String? delegateId;
  final int rank;

  String get title => liveBriefTitle(row);
  String get city => '${row['city'] ?? ''}'.trim();
  int get index => (row['index'] is num) ? (row['index'] as num).round() : 0;
}

class LiveChatBrief {
  const LiveChatBrief({
    required this.total,
    required this.priced,
    required this.low,
    required this.median,
    required this.high,
    required this.inZone,
    required this.reachable,
    required this.overBudget,
    required this.advice,
    required this.pick,
    required this.pickReasons,
    required this.compare,
    required this.delegable,
  });

  final int total, priced, inZone, reachable, overBudget;
  final double? low, median, high;
  final String advice;
  final LiveChatBriefRow? pick;
  final List<String> pickReasons;
  final List<LiveChatBriefRow> compare;

  /// Offres que Bot peut prendre en charge, de la plus pertinente à la moins pertinente.
  final List<LiveChatBriefRow> delegable;
}

final RegExp _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  caseSensitive: false,
);

String liveBriefTitle(Map<String, dynamic> row) {
  for (final key in const <String>['title', 'name', 'nom', 'subject', 'label']) {
    final v = '${row[key] ?? ''}'.trim();
    if (v.isNotEmpty) return v;
  }
  return 'Offre';
}

double? liveBriefPrice(Map<String, dynamic> row) {
  for (final key in const <String>['price', 'price_min', 'price_max']) {
    final v = row[key];
    final n = v is num ? v.toDouble() : double.tryParse('${v ?? ''}');
    if (n != null && n > 0) return n;
  }
  return null;
}

String? liveBriefPhoto(Map<String, dynamic> row) {
  final photos = row['photos'];
  if (photos is List) {
    for (final p in photos) {
      final url = p is Map ? '${p['url'] ?? p['src'] ?? ''}'.trim() : '${p ?? ''}'.trim();
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
    }
  }
  return null;
}

bool _buyerRequest(Map<String, dynamic> row) {
  final evidence = row['evidence'];
  final e = evidence is Map ? evidence : const <dynamic, dynamic>{};
  final intent = '${row['intent'] ?? e['intent'] ?? ''}'.toUpperCase();
  final actor = '${row['actor_type'] ?? e['actor_type'] ?? ''}'.toLowerCase();
  return intent == 'BUY' || intent == 'RFQ' || actor == 'buyer';
}

bool _hasContact(Map<String, dynamic> row) {
  final pack = row['contact_pack'];
  if (pack is Map) {
    for (final key in const <String>['masked_contacts', 'available_channels']) {
      final list = pack[key];
      if (list is List) {
        for (final entry in list) {
          if (entry is Map && '${entry['last4'] ?? ''}'.trim().isNotEmpty) return true;
        }
      }
    }
  }
  final evidence = row['evidence'];
  if (evidence is Map) {
    final v = '${evidence['contact_last4'] ?? evidence['contact_phone_last4'] ?? ''}'.trim();
    if (v.isNotEmpty) return true;
  }
  return false;
}

/// Identifiant de l'offre pour la prise en charge par Bot. Une fiche sans référence directe
/// n'est confiée que si son identité est sûre (annonce WAOUH ou catalogue partenaire).
String? liveBriefDelegateId(Map<String, dynamic> row) {
  if (_buyerRequest(row)) return null;
  final fabric = '${row['fabric_id'] ?? ''}'.trim();
  if (fabric.isNotEmpty) return fabric;
  final rawSource = '${row['source'] ?? ''}'.trim().toLowerCase();
  final source = rawSource.isEmpty ? 'waouh' : rawSource;
  final id = '${row['id'] ?? ''}'.trim();
  final article = '${row['article_id'] ?? ''}'.trim();
  if (_uuid.hasMatch(article)) return 'article:$article';
  if (const <String>['waouh', 'chat', 'waouh_app'].contains(source) && _uuid.hasMatch(id)) {
    return 'article:$id';
  }
  if (source == 'partner' || source == 'catalog') {
    final rawCatalog = '${row['catalog_id'] ?? ''}'.trim();
    final catalog = rawCatalog.isEmpty ? id : rawCatalog;
    if (_uuid.hasMatch(catalog)) return 'catalog:$catalog';
  }
  return null;
}

String _fold(String? value) {
  var s = (value ?? '').trim().toLowerCase();
  const from = 'àâäéèêëîïôöùûüç';
  const to = 'aaaeeeeiioouuuc';
  for (var i = 0; i < from.length; i++) {
    s = s.replaceAll(from[i], to[i]);
  }
  return s;
}

bool liveBriefSameZone(String? a, String? b) {
  final x = _fold(a), y = _fold(b);
  return x.isNotEmpty && y.isNotEmpty && (x == y || x.contains(y) || y.contains(x));
}

double? _median(List<double> values) {
  if (values.isEmpty) return null;
  final sorted = List<double>.from(values)..sort();
  final mid = sorted.length ~/ 2;
  return sorted.length.isOdd ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2).roundToDouble();
}

class _Scored {
  _Scored(this.row, this.order, this.score);
  final LiveChatBriefRow row;
  final int order;
  final double score;
}

/// Repères de prix, zone, vendeurs joignables, choix de Bot et comparaison, calculés à partir
/// des seules fiches reçues. Une information absente reste « à confirmer ».
LiveChatBrief liveChatMarketBrief(List<Map<String, dynamic>> rows, {String? city, int? budget}) {
  // Les demandes d'acheteurs (recherche pour vendre) ne sont pas des offres à comparer.
  final pool = rows.where((r) => !_buyerRequest(r)).toList();
  final prices = pool.map(liveBriefPrice).whereType<double>().toList();
  final double? low = prices.isEmpty ? null : prices.reduce((a, b) => a < b ? a : b);
  final double? high = prices.isEmpty ? null : prices.reduce((a, b) => a > b ? a : b);
  final median = _median(prices);
  final max = budget != null && budget > 0 ? budget : null;

  final scored = <_Scored>[];
  for (var i = 0; i < pool.length; i++) {
    final row = pool[i];
    final price = liveBriefPrice(row);
    final delegateId = liveBriefDelegateId(row);
    final inZone = liveBriefSameZone('${row['city'] ?? ''}', city);
    final bool? within = max != null && price != null ? price <= max : null;
    final reachable = delegateId != null || _hasContact(row);
    final int? gapPct = price != null && median != null && median > 0
        ? (((price - median) / median) * 100).round()
        : null;
    var score = 0.0;
    if (within == true) score += 30;
    if (within == false) score -= 40;
    if (inZone) score += 22;
    if (reachable) score += 18;
    if (delegateId != null) score += 6;
    if (liveBriefPhoto(row) != null) score += 8;
    if (price == null) {
      score -= 12;
    } else if (median != null && median > 0) {
      final gap = (price - median) / median;
      // Un prix très inférieur au marché n'est pas un avantage : il demande une vérification.
      if (gap < -0.5) {
        score -= 6;
      } else {
        final bonus = -gap * 30;
        score += bonus > 15 ? 15 : (bonus < -15 ? -15 : bonus);
      }
    }
    scored.add(_Scored(
      LiveChatBriefRow(
        row: row,
        price: price,
        vsMedianPct: gapPct,
        inZone: inZone,
        withinBudget: within,
        reachable: reachable,
        delegateId: delegateId,
        rank: 0,
      ),
      i,
      score,
    ));
  }
  // À pertinence égale, l'ordre reçu du moteur est conservé.
  scored.sort((a, b) {
    final byScore = b.score.compareTo(a.score);
    return byScore != 0 ? byScore : a.order.compareTo(b.order);
  });
  final ranked = <LiveChatBriefRow>[];
  for (var i = 0; i < scored.length; i++) {
    final r = scored[i].row;
    ranked.add(LiveChatBriefRow(
      row: r.row,
      price: r.price,
      vsMedianPct: r.vsMedianPct,
      inZone: r.inZone,
      withinBudget: r.withinBudget,
      reachable: r.reachable,
      delegateId: r.delegateId,
      rank: i + 1,
    ));
  }

  final inZoneCount = ranked.where((r) => r.inZone).length;
  final reachableCount = ranked.where((r) => r.reachable).length;
  final overBudget = ranked.where((r) => r.withinBudget == false).length;

  final top = ranked.isEmpty ? null : ranked.first;
  final reasons = <String>[];
  if (top != null) {
    final price = top.price;
    if (top.withinBudget == true && max != null && price != null) {
      reasons.add(price < max ? '${liveBriefMoney(max - price)} sous votre budget' : 'Dans votre budget');
    }
    if (top.inZone && (city ?? '').trim().isNotEmpty) reasons.add('Dans votre zone · ${top.city}');
    final gap = top.vsMedianPct;
    if (gap != null && gap < -50) {
      reasons.add('Prix très inférieur aux autres offres : à vérifier avant tout accord');
    } else if (gap != null && gap <= -3) {
      reasons.add('${gap.abs()} % sous le prix médian');
    } else if (gap != null && gap.abs() < 3 && ranked.length > 1) {
      reasons.add('Au prix médian des offres comparées');
    }
    if (top.reachable) reasons.add('Vendeur joignable');
    if (liveBriefPhoto(top.row) != null) reasons.add('Photos fournies');
    if (reasons.isEmpty) reasons.add('L’offre la plus proche de votre demande');
  }

  String advice;
  if (ranked.isEmpty) {
    advice = 'Aucune offre à comparer pour le moment.';
  } else if (low != null && high != null && median != null && prices.length > 1 && low != high) {
    advice =
        'Les prix annoncés vont de ${liveBriefMoney(low)} à ${liveBriefMoney(high)}, avec un prix médian de ${liveBriefMoney(median)}.';
    if (max != null) {
      advice += overBudget > 0
          ? ' $overBudget offre${overBudget > 1 ? 's dépassent' : ' dépasse'} votre budget de ${liveBriefMoney(max)}.'
          : ' Toutes les offres chiffrées tiennent dans votre budget de ${liveBriefMoney(max)}.';
    }
  } else if (low != null) {
    if (ranked.length == 1) {
      advice = 'Une offre trouvée, annoncée à ${liveBriefMoney(low)}. Le prix reste à confirmer avec le vendeur.';
    } else if (prices.length > 1) {
      advice = 'Les offres chiffrées sont toutes annoncées à ${liveBriefMoney(low)}.';
    } else {
      advice = 'Une seule offre annonce un prix : ${liveBriefMoney(low)}. Les autres sont à demander.';
    }
  } else {
    advice = 'Aucun prix n’est annoncé sur ces offres : il sera demandé au vendeur.';
  }

  return LiveChatBrief(
    total: ranked.length,
    priced: prices.length,
    low: low,
    median: median,
    high: high,
    inZone: inZoneCount,
    reachable: reachableCount,
    overBudget: overBudget,
    advice: advice,
    pick: top,
    pickReasons: reasons.take(3).toList(),
    compare: ranked.take(3).toList(),
    delegable: ranked.where((r) => r.delegateId != null && r.withinBudget != false).toList(),
  );
}

/// Étapes du parcours : Demande, Recherche, Analyse, Offres, Échange.
const List<String> liveSearchStages = <String>['Demande', 'Recherche', 'Analyse', 'Offres', 'Échange'];

int liveSearchStage({required bool hasReply, required bool revealed, required int results}) {
  if (!hasReply) return 1;
  if (!revealed) return 2;
  return results > 0 ? 3 : 2;
}
