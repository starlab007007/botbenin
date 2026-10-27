import 'live_nexus_service.dart';
import 'live_essential_offer_data.dart';
export 'live_mission_copy.dart';

String missionNormalize(dynamic v) => v is String
    ? essentialNormalize(v).replaceAll(RegExp(r'\s+'), ' ').trim()
    : '';
String _text(dynamic v) => v is String ? v.trim() : '';
double? _number(dynamic v) =>
    v is num && v.isFinite && v >= 0 ? v.toDouble() : null;
double? _positive(dynamic v) =>
    _number(v) != null && _number(v)! > 0 ? _number(v) : null;
String normalizeMissionKind(
  dynamic value, {
  String query = '',
  String mode = '',
}) {
  final s = missionNormalize(value);
  const aliases = {
    'acheter': 'purchase',
    'buy': 'purchase',
    'purchase': 'purchase',
    'vendre': 'sale',
    'sell': 'sale',
    'sale': 'sale',
    'opportunity': 'opportunity',
    'opportunite': 'opportunity',
    'opportunites': 'opportunity',
    'service': 'service',
    'services': 'service',
    'prestation': 'project',
    'prestations': 'project',
    'project': 'project',
  };
  if (aliases[s] != null) return aliases[s]!;
  if (mode == 'sell' || mode == 'find_buyers') return 'sale';
  final q = missionNormalize(query);
  if (RegExp(r'\bvendre\b|\bje vends\b').hasMatch(q)) return 'sale';
  if (RegExp(
    r'\b(emploi|recrutement|stage|bourse|subvention|formation|opportunite)|appel.{0,12}projet',
  ).hasMatch(q))
    return 'opportunity';
  if (RegExp(
    r'site (vitrine|web)|creation.{0,20}site|creer.{0,20}site|developpement|application mobile|livrable|prestation',
  ).hasMatch(q))
    return 'project';
  if (RegExp(
    r'plombier|plomberie|fuite|reparat|reparer|nettoyage|coiff|electricien|climatisation|depannage|traiteur',
  ).hasMatch(q))
    return 'service';
  return 'purchase';
}

Map<String, dynamic> normalizeMissionContext(
  dynamic value,
  String kind, {
  String query = '',
  double? floor,
}) {
  final raw = value is Map
          ? Map<String, dynamic>.from(value)
          : <String, dynamic>{},
      q = missionNormalize(query),
      days = RegExp(
        r'\b(\d{1,3})\s*(jours?|semaines?)\b',
      ).firstMatch(missionNormalize(query)),
      pages = RegExp(r'\b(\d{1,3})\s*pages?\b').firstMatch(q);
  final day =
      _positive(raw['max_days']) ??
      (days != null
          ? double.parse(days[1]!) * (days[2]!.startsWith('semaine') ? 7 : 1)
          : null);
  final requested = _positive(raw['price_floor']) ?? 0, bound = floor ?? 0;
  final brief = _text(raw['brief']), unit = _text(raw['unit']);
  return {
    'kind': kind,
    'brief': brief.length > 1500 ? brief.substring(0, 1500) : brief,
    'max_days': day == null ? null : day.floor().clamp(1, 365),
    'required_pages':
        _positive(raw['required_pages']) ??
        (pages != null ? double.parse(pages[1]!) : null),
    'quantity': _positive(raw['quantity']) == null
        ? null
        : _positive(raw['quantity'])!.floor().clamp(1, 100000),
    'unit': unit.length > 40 ? unit.substring(0, 40) : unit,
    'price_floor': requested > bound
        ? (requested > 0 ? requested : null)
        : (bound > 0 ? bound : null),
  };
}

DateTime? missionDeadline(NexusDiscoveryItem o) {
  final e = o.evidence;
  for (final raw in [e['deadline'], e['closing_date'], e['expires_at']]) {
    if (raw is String &&
        RegExp(
          r'^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$',
        ).hasMatch(raw)) {
      final day = raw.substring(0, 10),
          calendar = DateTime.tryParse('${raw.substring(0, 10)}T00:00:00Z');
      if (calendar == null ||
          calendar.toIso8601String().substring(0, 10) != day)
        continue;
      final parsed = DateTime.tryParse(
        raw.length == 10 ? '${raw}T23:59:59+01:00' : raw,
      );
      if (parsed != null) return parsed.toUtc();
    }
  }
  return null;
}

class LiveMissionFacts {
  const LiveMissionFacts({
    required this.scope,
    required this.conditions,
    required this.exclusions,
    required this.basis,
    required this.unit,
    required this.organization,
    required this.availability,
    required this.warranty,
    this.pages,
    this.duration,
    this.deadline,
    this.visit,
    this.diagnostic,
    this.visitTotal,
    this.revisions,
    this.minimumQuantity,
    this.quantity,
  });
  final String scope,
      conditions,
      exclusions,
      basis,
      unit,
      organization,
      availability,
      warranty;
  final double? pages,
      duration,
      visit,
      diagnostic,
      visitTotal,
      revisions,
      minimumQuantity,
      quantity;
  final DateTime? deadline;
}

LiveMissionFacts missionFacts(NexusDiscoveryItem o) {
  final e = o.evidence;
  String text(List<String> keys) {
    for (final k in keys) {
      final v = e[k],
          s = v is List ? v.whereType<String>().join(' · ') : _text(v);
      if (s.isNotEmpty) return s;
    }
    return '';
  }

  double? number(List<String> keys) {
    for (final k in keys) {
      final n = _number(e[k]);
      if (n != null) return n;
    }
    return null;
  }

  final scope = text(['scope', 'deliverables', 'perimetre', 'service_scope']),
      page = RegExp(
        r'\b(\d{1,3})\s*pages?\b',
      ).firstMatch(missionNormalize(scope));
  final basis = missionNormalize(
    text(['price_basis', 'unit', 'price_unit', 'unite']),
  );
  final visit =
          number(['visit_fee', 'callout_fee', 'deplacement_fee']) ??
          (RegExp('visite|deplacement').hasMatch(basis)
              ? _positive(o.priceMax) ?? _positive(o.priceMin)
              : null),
      diagnostic = e['diagnostic_included'] == true
          ? 0.0
          : number(['diagnostic_fee']);
  return LiveMissionFacts(
    scope: scope,
    pages:
        number(['pages', 'page_count']) ??
        (page != null ? double.parse(page[1]!) : null),
    duration: number(['delivery_days', 'duration_days', 'delai_jours']),
    conditions: text(['conditions', 'eligibility', 'eligibility_conditions']),
    deadline: missionDeadline(o),
    exclusions: text(['exclusions', 'extra_fees']),
    basis: basis,
    visit: visit,
    diagnostic: diagnostic,
    visitTotal: visit != null && diagnostic != null ? visit + diagnostic : null,
    warranty: text(['warranty', 'guarantee']),
    revisions: number(['revisions', 'revision_count']),
    minimumQuantity: number(['minimum_quantity', 'min_quantity']),
    quantity: number(['quantity', 'requested_quantity']),
    unit: text(['unit', 'price_unit', 'unite']),
    organization: text([
      'organization',
      'organizer',
      'provider_name',
      'seller_name',
    ]),
    availability: text(['availability', 'available_at', 'time_slot']),
  );
}

String missionEntity(NexusDiscoveryItem o) {
  final e = o.evidence,
      explicit = missionNormalize(e['offer_kind'] ?? e['kind']),
      known = essentialKind(o),
      hay = missionNormalize(
        [
          o.title,
          o.category,
          e['scope'],
          e['description'],
        ].whereType<String>().join(' '),
      );
  if (['product', 'article', 'catalog'].contains(explicit)) return 'product';
  if (known == 'announcement' ||
      [
        'announcement',
        'annonce',
        'opportunity',
        'job',
        'event',
        'formation',
      ].contains(explicit) ||
      RegExp(
        r'emploi|recrutement|appel.{0,12}projet|bourse|subvention|formation|opportunit',
      ).hasMatch(hay))
    return 'announcement';
  if (known == 'service' ||
      ['service', 'prestation', 'project'].contains(explicit) ||
      RegExp(
        r'plombier|plomberie|fuite|reparat|nettoyage|coiff|electricien|depannage|traiteur|site vitrine|creation web|developp|agence web|graphiste|photograph|coutur|mecanicien',
      ).hasMatch(hay))
    return 'service';
  return 'product';
}

bool missionMatches(
  NexusDiscoveryItem o, {
  String kind = '',
  double? maxDays,
  double? requiredPages,
  double? quantity,
  String unit = '',
  double? priceFloor,
  DateTime? now,
}) {
  if (kind.isEmpty || kind == 'purchase') return true;
  final entity = missionEntity(o), e = o.evidence, f = missionFacts(o);
  if (kind == 'opportunity')
    return entity == 'announcement' &&
        e['eligible'] != false &&
        e['eligibility_status'] != 'ineligible' &&
        (f.deadline == null ||
            !f.deadline!.isBefore((now ?? DateTime.now()).toUtc()));
  if (kind == 'service' || kind == 'project') {
    if (entity != 'service') return false;
    if (kind == 'project' &&
        maxDays != null &&
        f.duration != null &&
        f.duration! > maxDays)
      return false;
    if (kind == 'project' &&
        requiredPages != null &&
        f.pages != null &&
        f.pages! < requiredPages)
      return false;
    return true;
  }
  final intent = o.intent.toUpperCase();
  if (intent.isNotEmpty &&
      intent != 'UNKNOWN' &&
      !['BUY', 'RFQ'].contains(intent))
    return false;
  final budget = _positive(o.priceMax) ?? _positive(o.priceMin);
  if (priceFloor != null && budget != null && budget < priceFloor) return false;
  if (quantity != null &&
      f.minimumQuantity != null &&
      missionNormalize(unit).isNotEmpty &&
      missionNormalize(unit) == missionNormalize(f.unit) &&
      f.minimumQuantity! > quantity)
    return false;
  return true;
}

int? compareMissionOffers(
  NexusDiscoveryItem a,
  NexusDiscoveryItem b, {
  String kind = '',
}) {
  if (kind.isEmpty || kind == 'purchase' || kind == 'sale') return null;
  final af = missionFacts(a), bf = missionFacts(b);
  if (kind == 'opportunity') {
    final completeness =
        (bf.conditions.isNotEmpty ? 1 : 0) +
        (bf.deadline != null ? 1 : 0) -
        (af.conditions.isNotEmpty ? 1 : 0) -
        (af.deadline != null ? 1 : 0);
    if (completeness != 0) return completeness;
    if (af.deadline != null &&
        bf.deadline != null &&
        af.deadline != bf.deadline)
      return af.deadline!.compareTo(bf.deadline!);
    return a.fabricId.compareTo(b.fabricId);
  }
  int known(LiveMissionFacts f) =>
      (f.scope.isNotEmpty ? 1 : 0) +
      (f.basis.isNotEmpty ? 1 : 0) +
      ((kind == 'project' ? f.duration != null : f.availability.isNotEmpty)
          ? 1
          : 0) +
      ((kind == 'project' ? f.pages != null : f.visitTotal != null) ? 1 : 0);
  final completeness = known(bf) - known(af);
  if (completeness != 0) return completeness;
  final ap = _positive(a.priceMax) ?? _positive(a.priceMin),
      bp = _positive(b.priceMax) ?? _positive(b.priceMin);
  if (af.basis.isNotEmpty &&
      af.basis == bf.basis &&
      af.scope.isNotEmpty &&
      missionNormalize(af.scope) == missionNormalize(bf.scope) &&
      ap != null &&
      bp != null &&
      ap != bp)
    return ap.compareTo(bp);
  return a.fabricId.compareTo(b.fabricId);
}

String missionNumber(double n) =>
    n == n.roundToDouble() ? n.round().toString() : n.toString();
String missionMoney(double n, [String currency = 'XOF']) =>
    '${n.round().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]} ')} ${currency == 'XOF' ? 'F CFA' : currency}';
String missionDate(DateTime date, {bool short = false}) {
  final local = date.toUtc().add(const Duration(hours: 1));
  const months = [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ];
  return short
      ? '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}'
      : '${local.day} ${months[local.month - 1]}';
}

Map<String, String> missionOfferView(NexusDiscoveryItem o, String kind) {
  final f = missionFacts(o),
      price = essentialPrice(o),
      deadline = f.deadline == null ? null : missionDate(f.deadline!);
  if (kind == 'opportunity')
    return {
      'value': f.conditions.isNotEmpty
          ? 'Dossier à préparer'
          : 'Conditions à préciser',
      'meta':
          '${o.city ?? 'Zone à confirmer'} · ${deadline != null ? 'Échéance annoncée : $deadline' : 'Échéance non renseignée'}',
      'line': f.conditions.isNotEmpty
          ? f.conditions
          : 'Admissibilité à confirmer',
      'tag': f.conditions.isNotEmpty
          ? 'Conditions annoncées disponibles'
          : 'Conditions à compléter',
      'cover': f.organization.isNotEmpty ? f.organization : 'Publication',
      'coverType': o.category ?? 'Opportunité',
    };
  if (kind == 'service')
    return {
      'value': f.visitTotal != null
          ? missionMoney(f.visitTotal!, o.currency)
          : f.visit != null
          ? missionMoney(f.visit!, o.currency)
          : price,
      'meta': f.visitTotal != null
          ? 'Visite + diagnostic annoncés'
          : f.visit != null
          ? 'Déplacement annoncé'
          : f.unit.isNotEmpty
          ? 'Tarif annoncé · ${f.unit}'
          : 'Tarif et périmètre à préciser',
      'line': f.visit != null
          ? 'Prix de l’intervention à confirmer'
          : f.scope.isNotEmpty
          ? f.scope
          : 'Périmètre et frais à préciser',
      'tag': f.visitTotal != null
          ? 'Frais de visite renseignés'
          : f.scope.isNotEmpty
          ? 'Périmètre annoncé'
          : 'Conditions à compléter',
      'cover': f.scope.isNotEmpty ? f.scope : 'Intervention',
      'coverType': o.category ?? 'Service',
    };
  if (kind == 'project')
    return {
      'value': price,
      'meta':
          '${f.pages != null ? '${missionNumber(f.pages!)} pages annoncées' : 'Livrables à préciser'} · ${f.duration != null ? '${missionNumber(f.duration!)} jours annoncés' : 'Délai à préciser'}',
      'line': f.exclusions.isNotEmpty
          ? f.exclusions
          : 'Frais et éléments inclus à préciser',
      'tag': f.scope.isNotEmpty && f.duration != null
          ? 'Livrables et délai renseignés'
          : 'Périmètre à compléter',
      'cover': f.scope.isNotEmpty ? f.scope : 'Prestation',
      'coverType': o.category ?? 'Proposition',
    };
  if (kind == 'sale')
    return {
      'value': price == 'Prix à demander' ? 'Budget à préciser' : price,
      'meta':
          '${f.quantity != null ? '${missionNumber(f.quantity!)} ${f.unit.isNotEmpty ? f.unit : 'unité(s)'} recherchée(s)' : 'Quantité à préciser'} · ${o.city ?? 'Zone à confirmer'}',
      'line': 'Budget annoncé · offre ferme à confirmer',
      'tag': 'Demande à qualifier',
      'cover': 'Acheteur potentiel',
      'coverType': 'Demande annoncée',
    };
  return {
    'value': price,
    'meta': o.city ?? 'Zone à confirmer',
    'line': 'Frais et prix final à préciser',
    'tag': 'Prix annoncé · conditions à vérifier',
    'cover': o.title,
    'coverType': o.category ?? 'Produit',
  };
}

class LiveDomainDecision {
  const LiveDomainDecision(
    this.verdict,
    this.reason,
    this.advantages,
    this.pending,
  );
  final String verdict, reason;
  final List<String> advantages, pending;
}

LiveDomainDecision domainOfferDecision(
  NexusDiscoveryItem o,
  List<NexusDiscoveryItem> rows,
  String kind, {
  double? priceFloor,
}) {
  final f = missionFacts(o),
      first = rows.isNotEmpty && rows.first.fabricId == o.fabricId,
      bf = rows.isNotEmpty ? missionFacts(rows.first) : null;
  final advantages = <String>[if (o.city != null) 'Zone annoncée : ${o.city}.'],
      pending = <String>[];
  var verdict = first
          ? 'La piste que je vous propose de vérifier en premier.'
          : 'Une alternative à compléter avant de décider.',
      reason = '';
  String concise(String s) =>
      s.length > 180 ? '${s.substring(0, 177).trim()}…' : s;
  if (kind == 'opportunity') {
    reason =
        'Je rapproche les conditions annoncées de votre besoin. Le profil requis, les pièces et la publication d’origine restent à vérifier avant toute candidature.';
    if (f.conditions.isNotEmpty)
      advantages.add('Conditions annoncées : ${concise(f.conditions)}');
    if (f.deadline != null)
      advantages.add(
        'Échéance annoncée : ${missionDate(f.deadline!, short: true)}.',
      );
    pending.addAll([
      'Admissibilité de votre profil à confirmer.',
      'Publication et pièces du dossier à vérifier.',
    ]);
  } else if (kind == 'service') {
    reason = f.visitTotal != null
        ? 'Cette offre distingue les frais de visite et de diagnostic. Ce montant ne constitue pas le prix total de l’intervention.'
        : 'Le tarif annoncé ne suffit pas à établir le coût de l’intervention. Je demande un devis sur un périmètre précis.';
    if (f.scope.isNotEmpty)
      advantages.add('Périmètre annoncé : ${concise(f.scope)}.');
    if (f.availability.isNotEmpty)
      advantages.add('Disponibilité annoncée : ${f.availability}.');
    pending.addAll([
      'Créneau, déplacement et diagnostic à confirmer.',
      'Pièces, frais et prix de l’intervention à chiffrer.',
    ]);
  } else if (kind == 'project') {
    reason =
        'Je compare les livrables et le délai avant le seul montant affiché. Les frais récurrents et les conditions écrites restent à préciser.';
    if (!first &&
        bf != null &&
        (f.scope.isEmpty ||
            missionNormalize(f.scope) != missionNormalize(bf.scope)))
      reason =
          'Les périmètres annoncés sont différents ou incomplets. Je demande un devis sur les mêmes livrables pour comparer utilement.';
    if (f.scope.isNotEmpty)
      advantages.add('Livrables annoncés : ${concise(f.scope)}.');
    if (f.duration != null)
      advantages.add('Délai annoncé : ${missionNumber(f.duration!)} jours.');
    if (f.revisions != null)
      advantages.add('Révisions annoncées : ${missionNumber(f.revisions!)}.');
    pending.addAll([
      'Périmètre, révisions et coût complet à confirmer.',
      'Frais récurrents, acompte et échéancier à demander.',
    ]);
  } else {
    verdict = first
        ? 'La demande que je propose de qualifier en premier.'
        : 'Une autre demande à qualifier.';
    reason =
        'Je vérifie l’intérêt pour votre article précis et le montant réellement proposé. Un budget annoncé ne constitue pas une offre ferme.';
    final budget = _positive(o.priceMax) ?? _positive(o.priceMin);
    if (priceFloor != null && budget != null && budget >= priceFloor)
      advantages.add('Budget annoncé au-dessus de votre prix plancher.');
    if (f.quantity != null)
      advantages.add(
        'Quantité annoncée : ${missionNumber(f.quantity!)} ${f.unit.isNotEmpty ? f.unit : 'unité(s)'}.',
      );
    pending.addAll([
      'Intérêt pour votre article à confirmer.',
      'Offre ferme et modalités de retrait à préciser.',
    ]);
  }
  return LiveDomainDecision(verdict, reason, advantages, pending);
}
