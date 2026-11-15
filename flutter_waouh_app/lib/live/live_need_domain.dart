// Domaine d'un besoin et d'une annonce (mêmes règles que le web) : un emploi n'est pas
// un téléphone, un logement n'est pas une prestation. Sans cette distinction, une
// recherche sans réponse renvoie n'importe quoi sous le nom de « plus proche ».

const _diacritics = {
  'à': 'a', 'â': 'a', 'ä': 'a', 'á': 'a', 'ã': 'a', 'å': 'a',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'î': 'i', 'ï': 'i', 'í': 'i',
  'ô': 'o', 'ö': 'o', 'ó': 'o', 'õ': 'o',
  'ù': 'u', 'û': 'u', 'ü': 'u', 'ú': 'u',
  'ç': 'c', 'ñ': 'n', 'ÿ': 'y',
};

String liveFoldText(Object? value) {
  final lower = '${value ?? ''}'.toLowerCase();
  final buffer = StringBuffer();
  for (final rune in lower.runes) {
    final ch = String.fromCharCode(rune);
    buffer.write(_diacritics[ch] ?? ch);
  }
  return buffer
      .toString()
      .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
      .trim();
}

const _emptyWords = {
  'le','la','les','un','une','des','de','du','d','a','au','aux','et','ou','pour','par','que','qui','quoi',
  'je','j','me','mon','ma','mes','nous','vous','votre','vos','il','elle','on','ce','cet','cette','ces',
  'cherche','recherche','recherches','chercher','trouve','trouver','veux','voudrais','souhaite','besoin',
  'vends','vend','vendre','vente','acheter','achat','acheteur','vendeur','propose','proposer','offre','offres',
  'disponible','dispo','prix','fcfa','f','cfa','franc','francs','en','avec','sur','dans','chez','vers','pres',
  'bon','bonne','tres','plus','moins','grand','petit','neuf','occasion','etat','urgent','urgente',
  'svp','please','merci','bonjour','salut','c','est','suis','ai','avoir','etre','fait','faire','ici',
  'qualite','bien','super','nouveau','nouvelle','meilleur','meilleure','autre','autres','tout','tous','toute',
};

List<String> liveContentWords(Object? value) {
  final seen = <String>{};
  for (final word in liveFoldText(value).split(' ')) {
    if (word.isEmpty) continue;
    final hasDigit = RegExp(r'\d').hasMatch(word);
    if ((hasDigit || word.length > 2) && !_emptyWords.contains(word)) seen.add(word);
  }
  return seen.toList(growable: false);
}

final _job = RegExp(
    r'\b(emploi|emplois|job|jobs|travail|boulot|poste|postes|recrut\w*|embauch\w*|stage|stagiaire|alternance|cv|candidat\w*|candidature|salaire|employe\w*|secretaire|comptable|assistant\w*|caissier\w*|serveur|serveuse|vendeuse|commercial\w*|agent|agents|operateur|ouvrier|manoeuvre|apprenti\w*|concours|temps plein|mi temps)\b');
final _property = RegExp(
    r'\b(maison|maisons|appartement\w*|appart|villa|villas|terrain|terrains|parcelle\w*|studio|studios|chambre|chambres|duplex|immeuble|location|louer|bail|loyer|logement|habitation|immobilier|hectare\w*)\b');
final _vehicle = RegExp(
    r'\b(voiture|voitures|auto|autos|vehicule\w*|moto|motos|scooter|tricycle|camion|camions|bus|minibus|taxi|berline|4x4|pick up|remorque|velo|velos)\b');
final _service = RegExp(
    r'\b(plombi\w*|electricien\w*|macon\w*|mecanicien\w*|coiffure|coiffeu\w*|menuisier\w*|peintre\w*|repar\w*|depann\w*|install\w*|nettoyage|menage|lessive|livraison|livreur|cours|professeur|repetiteur|traiteur|cuisinier\w*|photograph\w*|camerama\w*|demenag\w*|couturi\w*|tailleur|jardini\w*|gardiennage|securite|soudure|carrelage|climatis\w*|forage|massage|esthetique|manucure|tresse\w*|maquillage|gommage|soin|soins|formation|consultation|entretien|prestation\w*)\b');

/// 'job' | 'property' | 'vehicle' | 'service' | 'unknown'
String liveNeedDomain(Object? value) {
  final text = ' ${liveFoldText(value)} ';
  if (text.trim().isEmpty) return 'unknown';
  if (_job.hasMatch(text)) return 'job';
  if (_property.hasMatch(text)) return 'property';
  if (_vehicle.hasMatch(text)) return 'vehicle';
  if (_service.hasMatch(text)) return 'service';
  return 'unknown';
}

/// Domaine d'une annonce : son texte d'abord, sa catégorie ensuite.
String liveSignalDomain(Map<String, dynamic> signal) {
  final fromText = liveNeedDomain(
      [signal['subject'], signal['title'], signal['raw_text'], signal['description']].where((x) => x != null).join(' '));
  if (fromText != 'unknown') return fromText;
  final fromCategory = liveNeedDomain(signal['category']);
  if (fromCategory != 'unknown') return fromCategory;
  return signal['brand'] != null || signal['model'] != null ? 'goods' : 'unknown';
}

/// Deux mots désignent la même chose quand ils partagent leur racine (plombier / plomberie).
bool liveSameWord(String a, String b) {
  if (a == b) return true;
  final shortest = a.length < b.length ? a.length : b.length;
  if (shortest < 5) return false;
  return a.substring(0, 5) == b.substring(0, 5);
}

class LiveMatchVerdict {
  const LiveMatchVerdict({required this.acceptable, required this.exact, required this.coverage});
  final bool acceptable, exact;
  final int coverage;
}

/// Une annonce n'est proposée que si elle est du même domaine que le besoin et
/// qu'elle reprend au moins un mot réel de ce besoin.
LiveMatchVerdict liveMatchVerdict(Object? need, Map<String, dynamic> candidate) {
  final domain = liveNeedDomain(need);
  final candidateDomain = liveSignalDomain(candidate);
  final compatible = domain == 'unknown' || candidateDomain == 'unknown' || domain == candidateDomain;
  final words = liveContentWords(need);
  final candidateWords = liveFoldText([
    candidate['subject'], candidate['title'], candidate['raw_text'], candidate['description'],
    candidate['category'], candidate['brand'], candidate['model'],
  ].where((x) => x != null).join(' ')).split(' ').where((w) => w.isNotEmpty).toList();
  final shared = words.where((word) => candidateWords.any((other) => liveSameWord(word, other))).toList();
  final coverage = words.isEmpty ? 0 : ((shared.length / words.length) * 100).round();
  final acceptable = compatible && words.isNotEmpty && shared.isNotEmpty;
  // Un modèle demandé (iPhone 13) n'est pas satisfait par un autre (iPhone 11).
  final numbers = words.where((w) => RegExp(r'\d').hasMatch(w));
  final numbersMatched = numbers.every(shared.contains);
  return LiveMatchVerdict(
    acceptable: acceptable,
    exact: acceptable && numbersMatched && coverage >= 60,
    coverage: coverage,
  );
}
