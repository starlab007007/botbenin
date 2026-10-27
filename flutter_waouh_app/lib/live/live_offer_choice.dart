import 'live_nexus_service.dart';
import 'live_essential_offer_data.dart';

String choiceNormalize(dynamic value) => essentialNormalize(
  '${value ?? ''}',
).replaceAll(RegExp('[^a-z0-9]+'), ' ').trim();
double? choicePrice(NexusDiscoveryItem o) =>
    o.priceMax != null && o.priceMax!.isFinite && o.priceMax! > 0
    ? o.priceMax
    : o.priceMin != null && o.priceMin!.isFinite && o.priceMin! > 0
    ? o.priceMin
    : null;
bool choiceAvailable(NexusDiscoveryItem o) =>
    o.evidence['availability_confirmed'] == true ||
    o.evidence['in_stock'] == true ||
    o.evidence['availability'] == 'available';
bool choiceAvailabilityConfirmed(NexusDiscoveryItem o) =>
    o.evidence['availability_confirmed'] == true;
bool choicePriceConfirmed(NexusDiscoveryItem o) =>
    o.evidence['price_confirmed'] == true &&
    choicePrice(o) != null &&
    essentialUnit(o).isNotEmpty;
const _choiceStop = {
  'je',
  'j',
  'veux',
  'voudrais',
  'cherche',
  'recherche',
  'trouver',
  'acheter',
  'vendre',
  'pour',
  'un',
  'une',
  'des',
  'les',
  'le',
  'la',
  'de',
  'du',
  'd',
  'au',
  'aux',
  'a',
  'et',
  'en',
  'dans',
  'mon',
  'ma',
  'mes',
  'moi',
  'bon',
  'bonne',
  'fiable',
  'neuf',
  'occasion',
  'aujourd',
  'hui',
  'besoin',
  'max',
  'maximum',
  'budget',
  'fcfa',
  'xof',
  'service',
};
bool choiceMatches(
  NexusDiscoveryItem o, {
  String query = '',
  String city = '',
  double? budget,
  String mode = 'buy',
}) {
  final q = choiceNormalize(query),
      zone = choiceNormalize(city),
      e = o.evidence;
  final hay = choiceNormalize(
    [
      o.title,
      o.category,
      e['brand'],
      e['model'],
      e['description'],
    ].where((v) => v != null).join(' '),
  );
  final model = RegExp(
    r'\b(iphone|galaxy|samsung|pixel)\s*(s?\d{1,3})\b',
  ).firstMatch(q);
  if (model != null &&
      !RegExp('\\b${model[1]}\\s*${model[2]}\\b').hasMatch(hay))
    return false;
  final storage = RegExp(r'\b(\d{2,4})\s*(go|gb)\b').firstMatch(q),
      actual = RegExp(r'\b(\d{2,4})\s*(go|gb)\b').firstMatch(hay);
  if (storage != null && actual != null && storage[1] != actual[1])
    return false;
  final terms = q
      .split(' ')
      .where(
        (t) =>
            t.length > 2 &&
            !_choiceStop.contains(t) &&
            !RegExp(r'^\d+$').hasMatch(t) &&
            !zone.split(' ').contains(t),
      )
      .toList();
  if (terms.isNotEmpty &&
      !terms.any((t) => hay.split(' ').contains(t)) &&
      o.scores.relevance < 75)
    return false;
  if (e['availability'] == 'unavailable' ||
      e['in_stock'] == false ||
      e['status'] == 'sold')
    return false;
  if (zone.isNotEmpty &&
      choiceNormalize(o.city).isNotEmpty &&
      choiceNormalize(o.city) != zone)
    return false;
  if (o.currency.isNotEmpty && o.currency != 'XOF') return false;
  if (mode != 'sell' && budget != null && budget > 0) {
    if (o.priceMin != null && o.priceMin! > budget ||
        o.priceMax != null && o.priceMax! > budget)
      return false;
  }
  return true;
}

List<NexusDiscoveryItem> rankLiveOfferChoices(
  List<NexusDiscoveryItem> offers, {
  String query = '',
  String city = '',
  double? budget,
  String mode = 'buy',
  String priority = 'price',
}) {
  final seen = <String>{};
  final rows = offers
      .where(
        (o) =>
            o.fabricId.isNotEmpty &&
            seen.add(essentialIdentity(o)) &&
            choiceMatches(
              o,
              query: query,
              city: city,
              budget: budget,
              mode: mode,
            ),
      )
      .toList();
  rows.sort((a, b) {
    final ap = choicePrice(a), bp = choicePrice(b);
    final available =
        (choiceAvailable(b) ? 1 : 0) - (choiceAvailable(a) ? 1 : 0);
    if (priority == 'availability' && available != 0) return available;
    final confirmed =
        (choicePriceConfirmed(b) && choiceAvailabilityConfirmed(b) ? 1 : 0) -
        (choicePriceConfirmed(a) && choiceAvailabilityConfirmed(a) ? 1 : 0);
    if (confirmed != 0) return confirmed;
    if ((ap == null) != (bp == null)) return ap == null ? 1 : -1;
    if (ap != null && bp != null && ap != bp)
      return mode == 'sell' ? bp.compareTo(ap) : ap.compareTo(bp);
    if (available != 0) return available;
    return a.fabricId.compareTo(b.fabricId);
  });
  return rows;
}
