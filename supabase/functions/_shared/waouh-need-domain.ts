// Domaine d'un besoin et d'une annonce : un emploi n'est pas un téléphone, un logement
// n'est pas une prestation. Sans cette distinction, une recherche d'emploi renvoie des
// produits « les plus proches », ce qui n'a aucun sens pour la personne.

export type NeedDomain = "job" | "property" | "vehicle" | "service" | "goods" | "unknown";

const DIACRITICS = /[̀-ͯ]/g;

export function foldText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD").replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Mots qui ne disent rien du besoin : ils ne peuvent jamais justifier un rapprochement. */
const EMPTY_WORDS = new Set([
  "le","la","les","un","une","des","de","du","d","a","au","aux","et","ou","pour","par","que","qui","quoi",
  "je","j","me","mon","ma","mes","nous","vous","votre","vos","il","elle","on","ce","cet","cette","ces",
  "cherche","recherche","recherches","chercher","trouve","trouver","veux","voudrais","souhaite","besoin",
  "vends","vend","vendre","vente","acheter","achat","acheteur","vendeur","propose","proposer","offre","offres",
  "disponible","dispo","prix","fcfa","f","cfa","franc","francs","en","avec","sur","dans","chez","vers","pres",
  "bon","bonne","tres","plus","moins","grand","petit","neuf","occasion","etat","urgent","urgente",
  "svp","please","merci","bonjour","salut","c","est","suis","ai","avoir","etre","fait","faire","ici","la",
  "qualite","bien","super","nouveau","nouvelle","meilleur","meilleure","autre","autres","tout","tous","toute",
  // Mots des gabarits de demande (« Je cherche une opportunité : … ») et noms de rubriques :
  // ils décrivent la forme de la demande, pas ce qui est cherché. Sans cela, une annonce
  // publiée dans un groupe « ventes, achats et opportunités d'affaires » paraissait pertinente
  // pour toute recherche d'opportunité.
  "opportunite","opportunites","affaires","annonce","annonces","article","articles",
  "produit","produits","chose","choses","truc","trucs","divers","general","generale",
  // Le pays et les repères de lieu ne disent rien de ce qui est cherché.
  "benin","afrique","ville","quartier","zone","pres","proche","autour","region",
]);

export function contentWords(value: unknown): string[] {
  return [...new Set(
    foldText(value).split(" ").filter((word) =>
      // Les chiffres distinguent les modèles (13 et 11 ne sont pas le même téléphone) : on les garde.
      (/\d/.test(word) || word.length > 2) && !EMPTY_WORDS.has(word)
    ),
  )];
}

const JOB = /\b(emploi|emplois|job|jobs|travail|boulot|poste|postes|recrut\w*|embauch\w*|stage|stagiaire|alternance|cv|candidat\w*|candidature|salaire|employe\w*|secretaire|comptable|assistant\w*|caissier\w*|serveur|serveuse|vendeuse|commercial\w*|agent|agents|operateur|ouvrier|manoeuvre|apprenti\w*|concours|offre d emploi|temps plein|mi temps)\b/;
const PROPERTY = /\b(maison|maisons|appartement\w*|appart|villa|villas|terrain|terrains|parcelle\w*|studio|studios|chambre|chambres|duplex|immeuble|boutique a louer|magasin a louer|location|louer|bail|loyer|logement|habitation|immobilier|hectare\w*)\b/;
const VEHICLE = /\b(voiture|voitures|auto|autos|vehicule\w*|moto|motos|scooter|tricycle|camion|camions|bus|minibus|taxi|berline|4x4|pick up|remorque|velo|velos)\b/;
const SERVICE = /\b(plombi\w*|electricien\w*|macon\w*|mecanicien\w*|coiffure|coiffeu\w*|menuisier\w*|peintre\w*|repar\w*|depann\w*|install\w*|nettoyage|menage|lessive|livraison|livreur|cours|professeur|repetiteur|traiteur|cuisinier\w*|photograph\w*|camerama\w*|demenag\w*|couturi\w*|tailleur|jardini\w*|gardiennage|securite|soudure|carrelage|climatis\w*|forage|massage|esthetique|manucure|tresse\w*|maquillage|gommage|soin|soins|formation|consultation|entretien|prestation\w*|service a domicile)\b/;

/** Domaine lu dans un texte libre. « unknown » quand rien ne le dit clairement. */
export function needDomain(value: unknown): NeedDomain {
  const text = ` ${foldText(value)} `;
  if (!text.trim()) return "unknown";
  if (JOB.test(text)) return "job";
  if (PROPERTY.test(text)) return "property";
  if (VEHICLE.test(text)) return "vehicle";
  if (SERVICE.test(text)) return "service";
  return "unknown";
}

/** Domaine d'une annonce : son texte d'abord, sa catégorie ensuite. */
export function signalDomain(signal: {
  subject?: unknown; raw_text?: unknown; category?: unknown; brand?: unknown; model?: unknown;
}): NeedDomain {
  const fromText = needDomain([signal.subject, signal.raw_text].filter(Boolean).join(" "));
  if (fromText !== "unknown") return fromText;
  const fromCategory = needDomain(signal.category);
  if (fromCategory !== "unknown") return fromCategory;
  // Une marque ou un modèle annoncés désignent un bien matériel.
  return signal.brand || signal.model ? "goods" : "unknown";
}

/**
 * Deux domaines connus et différents ne se rapprochent jamais. Un domaine inconnu
 * n'interdit rien : c'est la pertinence du texte qui tranche alors.
 */
export function domainsCompatible(need: NeedDomain, candidate: NeedDomain): boolean {
  if (need === "unknown" || candidate === "unknown") return true;
  if (need === candidate) return true;
  // Une prestation et un bien restent distincts, mais un besoin non typé reste ouvert.
  return false;
}

/**
 * Deux mots désignent la même chose quand ils partagent leur racine : « plombier » et
 * « plomberie », « réparation » et « réparer ». Les mots courts doivent être identiques.
 */
export function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const shortest = Math.min(a.length, b.length);
  if (shortest < 5) return false;
  return a.slice(0, 5) === b.slice(0, 5);
}

/** Mots du besoin réellement présents dans l'annonce. */
export function sharedWords(need: unknown, candidateText: unknown): string[] {
  const candidateWords = foldText(candidateText).split(" ").filter(Boolean);
  return contentWords(need).filter((word) => candidateWords.some((other) => sameWord(word, other)));
}

export type MatchVerdict = {
  domain: NeedDomain;
  candidateDomain: NeedDomain;
  shared: string[];
  /** Part des mots du besoin retrouvés, de 0 à 100. */
  coverage: number;
  /** true quand l'annonce peut honnêtement être proposée pour ce besoin. */
  acceptable: boolean;
  /** true quand elle répond précisément au besoin. */
  exact: boolean;
};

/**
 * Décide si une annonce peut être proposée pour un besoin. Règle : même domaine,
 * et au moins un mot du besoin réellement présent. Rien d'autre ne vaut rapprochement.
 */
export function matchVerdict(need: unknown, candidate: {
  subject?: unknown; raw_text?: unknown; category?: unknown; brand?: unknown; model?: unknown; city?: unknown;
}, options: { place?: unknown } = {}): MatchVerdict {
  const domain = needDomain(need);
  const candidateDomain = signalDomain(candidate);
  // La ville est déjà prise en compte à part : qu'elle figure dans la demande et dans
  // l'annonce ne prouve rien sur ce qui est cherché. Sans cela, toute annonce de la ville
  // paraissait répondre à n'importe quelle demande faite depuis cette ville.
  const placeWords = new Set([
    ...contentWords(options.place),
    ...contentWords(candidate.city),
  ]);
  const words = contentWords(need).filter((word) => !placeWords.has(word));
  const shared = sharedWords(need, [candidate.subject, candidate.raw_text, candidate.category, candidate.brand, candidate.model].filter(Boolean).join(" "));
  const coverage = words.length ? Math.round((shared.length / words.length) * 100) : 0;
  const compatible = domainsCompatible(domain, candidateDomain);
  // Un besoin sans mot propre (« je cherche ») ne permet aucun rapprochement sérieux.
  const acceptable = compatible && (words.length === 0 ? false : shared.length > 0);
  // Un modèle demandé (iPhone 13) n'est pas satisfait par un autre (iPhone 11) :
  // tant qu'un chiffre du besoin manque, l'offre reste « proche », jamais « exacte ».
  const numbers = words.filter((word) => /\d/.test(word));
  const numbersMatched = numbers.every((word) => shared.includes(word));
  return { domain, candidateDomain, shared, coverage, acceptable, exact: acceptable && numbersMatched && coverage >= 60 };
}
