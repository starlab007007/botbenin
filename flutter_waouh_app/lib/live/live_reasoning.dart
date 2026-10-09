import 'live_nexus_service.dart';

/// Raisonnement « live » de Bot (même logique que le Web).
/// Chaque phrase vient UNIQUEMENT de ce que NEXUS a réellement renvoyé.
enum ReasonTone { think, search, found, zone, contact, next, warn }

class ReasonEvidence {
  const ReasonEvidence({
    required this.title,
    this.city,
    this.inZone = false,
    this.price,
    this.phone,
    this.channel,
    this.note,
  });

  final String title;
  final String? city;
  final bool inZone;
  final String? price;
  final String? phone;
  final String? channel;
  final String? note;
}

class ReasonStep {
  const ReasonStep({
    required this.id,
    required this.tone,
    required this.text,
    this.chips = const <String>[],
    this.evidence = const <ReasonEvidence>[],
  });

  final String id;
  final ReasonTone tone;
  final String text;
  final List<String> chips;
  final List<ReasonEvidence> evidence;
}

class ReasonContext {
  const ReasonContext({required this.query, this.city, this.budget});
  final String query;
  final String? city;
  final double? budget;
}

class ReasonSummary {
  const ReasonSummary({
    required this.found,
    required this.inZone,
    required this.contactable,
    required this.bestPrice,
    required this.nextSteps,
  });

  final int found;
  final int inZone;
  final int contactable;
  final double? bestPrice;
  final List<String> nextSteps;
}

const Map<String, String> _accents = <String, String>{
  'à': 'a', 'â': 'a', 'ä': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'î': 'i', 'ï': 'i', 'ô': 'o', 'ö': 'o', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ç': 'c',
};

String _fold(String? value) {
  final lower = (value ?? '').trim().toLowerCase();
  final buffer = StringBuffer();
  for (final rune in lower.runes) {
    final char = String.fromCharCode(rune);
    buffer.write(_accents[char] ?? char);
  }
  return buffer.toString();
}

bool sameZone(String? a, String? b) {
  final x = _fold(a);
  final y = _fold(b);
  return x.isNotEmpty && y.isNotEmpty && (x == y || x.contains(y) || y.contains(x));
}

/// « +229 •• •• 12 34 » à partir des 4 derniers chiffres ; null si inconnu.
String? maskPhone(String? last4) {
  final digits = (last4 ?? '').replaceAll(RegExp(r'\D'), '');
  if (digits.length < 2) return null;
  final tail = digits.length > 4 ? digits.substring(digits.length - 4) : digits;
  final padded = tail.padLeft(4, '•');
  return '+229 •• •• ${padded.substring(0, 2)} ${padded.substring(2)}';
}

String? reasonMoney(double? value, [String currency = 'XOF']) {
  if (value == null || value <= 0) return null;
  final digits = value.round().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(' ');
    buffer.write(digits[i]);
  }
  final unit = (currency == 'XOF' || currency.isEmpty) ? 'FCFA' : currency;
  return '$buffer $unit';
}

String reasonSourceLabel(String? source) {
  final value = (source ?? '').toLowerCase();
  if (value.contains('google_places') || value.contains('maps')) return 'Google Maps';
  if (value.contains('facebook')) return 'Facebook';
  if (value.contains('instagram')) return 'Instagram';
  if (value.contains('telegram')) return 'Telegram';
  if (value.contains('tiktok')) return 'TikTok';
  if (value.contains('serpapi') || value.contains('web_social')) return 'Web public';
  if (value.contains('apify')) return 'Apify';
  if (value.contains('sms') || value.contains('rcs')) return 'SMS/RCS';
  if (value.contains('partner')) return 'Partenaire';
  if (value.contains('radar')) return 'Radar IA';
  if (value.contains('whatsapp')) return 'WhatsApp';
  return 'WAOUH';
}

String _plural(int n, String one, String many) => '$n ${n > 1 ? many : one}';

List<ReasonStep> planSteps(ReasonContext ctx) {
  final chips = <String>[
    if ((ctx.city ?? '').trim().isNotEmpty) '📍 ${ctx.city!.trim()}',
    if (reasonMoney(ctx.budget) != null) '💰 ≤ ${reasonMoney(ctx.budget)}',
  ];
  final city = (ctx.city ?? '').trim();
  return <ReasonStep>[
    ReasonStep(
      id: 'understand',
      tone: ReasonTone.think,
      text:
          'Je comprends : vous cherchez « ${ctx.query.trim()} »${city.isNotEmpty ? ' près de $city' : ''}${ctx.budget != null ? ', dans votre budget' : ''}.',
      chips: chips,
    ),
    const ReasonStep(
      id: 'plan',
      tone: ReasonTone.search,
      text:
          'Je lance la recherche, partout où je peux trouver des offres et des contacts.',
    ),
  ];
}

double? _num(dynamic value) =>
    value is num ? value.toDouble() : double.tryParse('${value ?? ''}');

List<ReasonStep> catalogSteps(List<Map<String, dynamic>> items, ReasonContext ctx) {
  if (items.isEmpty) {
    return const <ReasonStep>[
      ReasonStep(
        id: 'int-none',
        tone: ReasonTone.warn,
        text: 'Aucune offre publiée assez proche pour l’instant.',
      ),
    ];
  }
  final prices = items.map((i) => _num(i['price'])).whereType<double>().where((p) => p > 0).toList();
  final cheapest = prices.isEmpty ? null : prices.reduce((a, b) => a < b ? a : b);
  final steps = <ReasonStep>[
    ReasonStep(
      id: 'int-found',
      tone: ReasonTone.found,
      text: 'J’ai trouvé ${_plural(items.length, 'offre publiée', 'offres publiées')}.',
      chips: <String>[if (cheapest != null) 'Dès ${reasonMoney(cheapest)}'],
    ),
  ];
  final city = (ctx.city ?? '').trim();
  if (city.isNotEmpty) {
    final inZone = items.where((i) => sameZone('${i['city'] ?? ''}', city)).toList();
    steps.add(ReasonStep(
      id: 'int-zone',
      tone: ReasonTone.zone,
      text: inZone.isNotEmpty
          ? '${_plural(inZone.length, 'vendeur est', 'vendeurs sont')} dans votre zone ($city).'
          : 'Aucun vendeur du catalogue n’est à $city ; je garde les plus proches.',
      evidence: inZone
          .take(2)
          .map((i) => ReasonEvidence(
                title: '${i['title'] ?? 'Offre'}',
                city: '${i['city'] ?? ''}',
                inZone: true,
                price: reasonMoney(_num(i['price']), '${i['currency'] ?? 'XOF'}'),
              ))
          .toList(growable: false),
    ));
  }
  return steps;
}

ReasonStep externalDownStep() => const ReasonStep(
      id: 'ext-down',
      tone: ReasonTone.warn,
      text:
          'Une partie de la recherche n’a pas répondu pour le moment. Je continue avec ce que j’ai déjà trouvé ; une veille me permettra de réessayer.',
    );

ReasonEvidence _evidence(NexusDiscoveryItem item, bool inZone) {
  final masked = item.contactPack?.maskedContacts ?? const <Map<String, dynamic>>[];
  final channel = masked.isEmpty ? null : masked.first;
  return ReasonEvidence(
    title: item.title.isEmpty ? 'Annonce publique' : item.title,
    city: item.city,
    inZone: inZone,
    price: reasonMoney(item.priceMin ?? item.priceMax, item.currency),
    phone: channel == null ? null : maskPhone('${channel['last4'] ?? ''}'),
    channel: channel == null ? item.bestChannel : '${channel['channel'] ?? ''}',
    note: item.contactPolicy.label,
  );
}

List<ReasonStep> externalSteps(NexusDiscoveryResponse response, ReasonContext ctx) {
  final results = response.results;
  if (results.isEmpty) {
    return <ReasonStep>[
      ReasonStep(
        id: 'ext-none',
        tone: ReasonTone.warn,
        text: 'Je n’ai trouvé aucune annonce publique exploitable en plus.',
      ),
    ];
  }
  final city = (ctx.city ?? '').trim();
  final steps = <ReasonStep>[
    ReasonStep(
      id: 'ext-found',
      tone: ReasonTone.found,
      text:
          'J’ai aussi repéré ${_plural(results.length, 'annonce pertinente', 'annonces pertinentes')} en ligne.',
    ),
  ];
  if (city.isNotEmpty) {
    final inZone = results.where((i) => sameZone(i.city, city)).toList();
    steps.add(ReasonStep(
      id: 'ext-zone',
      tone: ReasonTone.zone,
      text: inZone.isNotEmpty
          ? 'J’ai trouvé ${_plural(inZone.length, 'vendeur', 'vendeurs')} à $city. Je continue de chercher autour.'
          : 'Aucun autre résultat à $city pour l’instant ; je regarde les villes voisines.',
      evidence: inZone.take(3).map((i) => _evidence(i, true)).toList(growable: false),
    ));
  }
  final contactable = results
      .where((i) => (i.contactPack?.maskedContacts.isNotEmpty ?? false) || i.contactPolicy.canReveal)
      .toList();
  if (contactable.isNotEmpty) {
    final withPhone = contactable.any((i) =>
        (i.contactPack?.maskedContacts ?? const <Map<String, dynamic>>[])
            .any((c) => maskPhone('${c['last4'] ?? ''}') != null));
    steps.add(ReasonStep(
      id: 'ext-contact',
      tone: ReasonTone.contact,
      text:
          '${_plural(contactable.length, 'contact est joignable', 'contacts sont joignables')}${withPhone ? ' ; les numéros restent masqués (seuls les 4 derniers chiffres sont visibles)' : ''}.',
      evidence: contactable.take(3).map((i) => _evidence(i, sameZone(i.city, city))).toList(growable: false),
    ));
  }
  final interested = results.where((i) {
    final intent = i.intent.toUpperCase();
    return intent == 'BUY' || intent == 'RFQ';
  }).toList();
  if (interested.isNotEmpty) {
    steps.add(ReasonStep(
      id: 'ext-interest',
      tone: ReasonTone.found,
      text:
          '${_plural(interested.length, 'personne exprime', 'personnes expriment')} un besoin similaire : de quoi croiser offre et demande.',
      evidence: interested.take(2).map((i) => _evidence(i, sameZone(i.city, city))).toList(growable: false),
    ));
  }
  return steps;
}

ReasonSummary buildSummary(
  List<Map<String, dynamic>> catalog,
  NexusDiscoveryResponse? external,
  ReasonContext ctx,
) {
  final ext = external?.results ?? const <NexusDiscoveryItem>[];
  final city = (ctx.city ?? '').trim();
  final prices = <double>[
    ...catalog.map((i) => _num(i['price'])).whereType<double>(),
    ...ext.map((e) => e.priceMin ?? e.priceMax).whereType<double>(),
  ].where((p) => p > 0).toList();
  final inZone = catalog.where((i) => sameZone('${i['city'] ?? ''}', city)).length +
      ext.where((e) => sameZone(e.city, city)).length;
  final contactable = ext.where((e) => e.contactPack?.maskedContacts.isNotEmpty ?? false).length +
      catalog.where((i) => '${i['article_id'] ?? ''}'.isNotEmpty).length;

  int act(String action) =>
      ext.where((e) => (e.nextBestAction ?? e.contactPack?.nextBestAction) == action).length;
  final now = act('CONTACT_NOW') + act('REQUEST_APPROVAL');
  final next = <String>[
    if (now > 0)
      'Je peux contacter ${_plural(now, 'vendeur', 'vendeurs')}, mais seulement avec votre accord.'
    else if (contactable > 0)
      'Choisissez une offre : je prépare le contact et la négociation.',
    if (act('ENRICH') > 0)
      'Je poursuis pour compléter les coordonnées de ${_plural(act('ENRICH'), 'annonce', 'annonces')}.',
    if (catalog.length + ext.length < 4)
      'Peu de résultats : activez une veille, je continue à chercher pour vous.'
    else
      'Activez une veille pour être alerté si le prix baisse.',
  ];
  return ReasonSummary(
    found: catalog.length + ext.length,
    inZone: inZone,
    contactable: contactable,
    bestPrice: prices.isEmpty ? null : prices.reduce((a, b) => a < b ? a : b),
    nextSteps: next.take(3).toList(growable: false),
  );
}

ReasonStep summaryStep(ReasonSummary summary, ReasonContext ctx) {
  if (summary.found == 0) {
    return const ReasonStep(
      id: 'summary',
      tone: ReasonTone.next,
      text:
          'Point de recherche : rien d’assez proche pour le moment. Je vous propose de lancer une veille, je continuerai pour vous.',
    );
  }
  final city = (ctx.city ?? '').trim();
  final best = reasonMoney(summary.bestPrice);
  return ReasonStep(
    id: 'summary',
    tone: ReasonTone.next,
    text:
        'Point de recherche : ${_plural(summary.found, 'résultat', 'résultats')}${city.isNotEmpty ? ', dont ${summary.inZone} à $city' : ''}${best != null ? ', meilleur prix $best' : ''}.',
  );
}
