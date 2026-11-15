// Saisie intelligente du besoin (même règles que le web) : on devine ce qui peut l'être
// pour demander moins à l'utilisateur.

final RegExp _announcement = RegExp(
  r"(?<![\p{L}])(emploi|recrutement|recrute|stage|concours|appel d'offres|événement|evenement|formation|bourse|offre d'emploi)(?![\p{L}])",
  caseSensitive: false,
  unicode: true,
);
final RegExp _service = RegExp(
  r"(?<![\p{L}])(plombi\p{L}*|électricien|electricien|maçon|macon|mécanicien|mecanicien|coiffeu\p{L}*|menuisier|peintre|répar\p{L}*|repar\p{L}*|install\p{L}*|nettoyage|ménage|menage|livraison|cours|professeur|prof|traiteur|photograph\p{L}*|déménag\p{L}*|demenag\p{L}*|dépann\p{L}*|depann\p{L}*|coach|technicien|couturi\p{L}*|chauffeur|jardini\p{L}*|gardiennage|réservation|reservation)(?![\p{L}])",
  caseSensitive: false,
  unicode: true,
);
final RegExp _budget = RegExp(
  r"(\d{1,3}(?:[\s. ]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|mille)?\s*(?:f\s*cfa|fcfa|cfa|francs?|f)(?![\p{L}])",
  caseSensitive: false,
  unicode: true,
);

/// 'product' | 'service' | 'announcement'
String detectNeedKind(String text) {
  if (_announcement.hasMatch(text)) return 'announcement';
  if (_service.hasMatch(text)) return 'service';
  return 'product';
}

/// « 80 000 F », « 50k fcfa » → montant en F CFA, sinon null.
int? detectBudget(String text) {
  final m = _budget.firstMatch(text);
  if (m == null) return null;
  var n = double.tryParse(m.group(1)!.replaceAll(RegExp(r'[\s. ]'), '').replaceAll(',', '.'));
  if (n == null || !n.isFinite) return null;
  if (m.group(2) != null) n *= 1000;
  final value = n.round();
  return value >= 100 && value <= 1000000000 ? value : null;
}
