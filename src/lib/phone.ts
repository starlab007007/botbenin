// Utilitaires téléphone avec indicatifs pays (focus Afrique de l'Ouest, défaut Bénin)

export type Country = {
  code: string; // ISO 2
  name: string;
  dial: string; // ex: '+229'
  flag: string; // emoji
  length: number; // longueur "nominale" du numéro local (utilisée pour le formatage)
  lengthMin?: number; // longueur minimale acceptée (par défaut = length)
  lengthMax?: number; // longueur maximale acceptée (par défaut = length)
  groups?: number[]; // découpage formatage ex: [2,2,2,2]
  prefixes?: string[]; // préfixes opérateurs valides (premier(s) chiffre(s))
};

// Liste mondiale (codes ISO + indicatifs). Les pays "stratégiques" pour la diffusion
// gardent des règles strictes (longueur/préfixe). Les autres acceptent une plage souple.
export const COUNTRIES: Country[] = [
  // ───────── Afrique de l'Ouest (règles strictes) ─────────
  { code: 'BJ', name: 'Bénin', dial: '+229', flag: '🇧🇯', length: 10, groups: [2, 2, 2, 2, 2], prefixes: ['01'] },
  { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬', length: 8, groups: [2, 2, 2, 2] },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮', length: 10, groups: [2, 2, 2, 2, 2] },
  { code: 'SN', name: 'Sénégal', dial: '+221', flag: '🇸🇳', length: 9, groups: [3, 3, 3] },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫', length: 8, groups: [2, 2, 2, 2] },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', length: 10, lengthMin: 10, lengthMax: 11, groups: [3, 3, 4] },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭', length: 9, groups: [3, 3, 3] },
  { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱', length: 8, groups: [2, 2, 2, 2] },
  { code: 'NE', name: 'Niger', dial: '+227', flag: '🇳🇪', length: 8, groups: [2, 2, 2, 2] },
  { code: 'CM', name: 'Cameroun', dial: '+237', flag: '🇨🇲', length: 9, groups: [3, 3, 3] },
  { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦', length: 8, groups: [2, 2, 2, 2] },

  // ───────── Europe ─────────
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', length: 9, groups: [1, 2, 2, 2, 2] },
  { code: 'BE', name: 'Belgique', dial: '+32', flag: '🇧🇪', length: 9, lengthMin: 8, lengthMax: 10 },
  { code: 'CH', name: 'Suisse', dial: '+41', flag: '🇨🇭', length: 9 },
  { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺', length: 9, lengthMin: 6, lengthMax: 11 },
  { code: 'DE', name: 'Allemagne', dial: '+49', flag: '🇩🇪', length: 11, lengthMin: 10, lengthMax: 12 },
  { code: 'IT', name: 'Italie', dial: '+39', flag: '🇮🇹', length: 10, lengthMin: 9, lengthMax: 11 },
  { code: 'ES', name: 'Espagne', dial: '+34', flag: '🇪🇸', length: 9 },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹', length: 9 },
  { code: 'GB', name: 'Royaume-Uni', dial: '+44', flag: '🇬🇧', length: 10, lengthMin: 9, lengthMax: 11 },
  { code: 'IE', name: 'Irlande', dial: '+353', flag: '🇮🇪', length: 9, lengthMin: 8, lengthMax: 10 },
  { code: 'NL', name: 'Pays-Bas', dial: '+31', flag: '🇳🇱', length: 9 },
  { code: 'AT', name: 'Autriche', dial: '+43', flag: '🇦🇹', length: 11, lengthMin: 9, lengthMax: 13 },
  { code: 'DK', name: 'Danemark', dial: '+45', flag: '🇩🇰', length: 8 },
  { code: 'SE', name: 'Suède', dial: '+46', flag: '🇸🇪', length: 9, lengthMin: 7, lengthMax: 10 },
  { code: 'NO', name: 'Norvège', dial: '+47', flag: '🇳🇴', length: 8 },
  { code: 'FI', name: 'Finlande', dial: '+358', flag: '🇫🇮', length: 9, lengthMin: 7, lengthMax: 11 },
  { code: 'PL', name: 'Pologne', dial: '+48', flag: '🇵🇱', length: 9 },
  { code: 'CZ', name: 'Tchéquie', dial: '+420', flag: '🇨🇿', length: 9 },
  { code: 'SK', name: 'Slovaquie', dial: '+421', flag: '🇸🇰', length: 9 },
  { code: 'HU', name: 'Hongrie', dial: '+36', flag: '🇭🇺', length: 9 },
  { code: 'RO', name: 'Roumanie', dial: '+40', flag: '🇷🇴', length: 9 },
  { code: 'BG', name: 'Bulgarie', dial: '+359', flag: '🇧🇬', length: 9 },
  { code: 'GR', name: 'Grèce', dial: '+30', flag: '🇬🇷', length: 10 },
  { code: 'HR', name: 'Croatie', dial: '+385', flag: '🇭🇷', length: 9, lengthMin: 8, lengthMax: 10 },
  { code: 'RS', name: 'Serbie', dial: '+381', flag: '🇷🇸', length: 9, lengthMin: 8, lengthMax: 10 },
  { code: 'SI', name: 'Slovénie', dial: '+386', flag: '🇸🇮', length: 8 },
  { code: 'EE', name: 'Estonie', dial: '+372', flag: '🇪🇪', length: 8, lengthMin: 7, lengthMax: 10 },
  { code: 'LV', name: 'Lettonie', dial: '+371', flag: '🇱🇻', length: 8 },
  { code: 'LT', name: 'Lituanie', dial: '+370', flag: '🇱🇹', length: 8 },
  { code: 'IS', name: 'Islande', dial: '+354', flag: '🇮🇸', length: 7, lengthMin: 7, lengthMax: 9 },
  { code: 'MT', name: 'Malte', dial: '+356', flag: '🇲🇹', length: 8 },
  { code: 'CY', name: 'Chypre', dial: '+357', flag: '🇨🇾', length: 8 },
  { code: 'AL', name: 'Albanie', dial: '+355', flag: '🇦🇱', length: 9 },
  { code: 'MK', name: 'Macédoine du Nord', dial: '+389', flag: '🇲🇰', length: 8 },
  { code: 'BA', name: 'Bosnie-Herzégovine', dial: '+387', flag: '🇧🇦', length: 8 },
  { code: 'ME', name: 'Monténégro', dial: '+382', flag: '🇲🇪', length: 8 },
  { code: 'MD', name: 'Moldavie', dial: '+373', flag: '🇲🇩', length: 8 },
  { code: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦', length: 9 },
  { code: 'BY', name: 'Biélorussie', dial: '+375', flag: '🇧🇾', length: 9 },
  { code: 'RU', name: 'Russie', dial: '+7', flag: '🇷🇺', length: 10 },

  // ───────── Amériques ─────────
  { code: 'US', name: 'États-Unis', dial: '+1', flag: '🇺🇸', length: 10 },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', length: 10 },
  { code: 'MX', name: 'Mexique', dial: '+52', flag: '🇲🇽', length: 10 },
  { code: 'BR', name: 'Brésil', dial: '+55', flag: '🇧🇷', length: 11, lengthMin: 10, lengthMax: 11 },
  { code: 'AR', name: 'Argentine', dial: '+54', flag: '🇦🇷', length: 10, lengthMin: 10, lengthMax: 11 },
  { code: 'CL', name: 'Chili', dial: '+56', flag: '🇨🇱', length: 9 },
  { code: 'CO', name: 'Colombie', dial: '+57', flag: '🇨🇴', length: 10 },
  { code: 'PE', name: 'Pérou', dial: '+51', flag: '🇵🇪', length: 9 },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪', length: 10 },
  { code: 'EC', name: 'Équateur', dial: '+593', flag: '🇪🇨', length: 9 },
  { code: 'BO', name: 'Bolivie', dial: '+591', flag: '🇧🇴', length: 8 },
  { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾', length: 9 },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾', length: 8, lengthMin: 8, lengthMax: 9 },
  { code: 'CU', name: 'Cuba', dial: '+53', flag: '🇨🇺', length: 8 },
  { code: 'HT', name: 'Haïti', dial: '+509', flag: '🇭🇹', length: 8 },
  { code: 'DO', name: 'Rép. Dominicaine', dial: '+1', flag: '🇩🇴', length: 10 },
  { code: 'JM', name: 'Jamaïque', dial: '+1', flag: '🇯🇲', length: 10 },
  { code: 'GP', name: 'Guadeloupe', dial: '+590', flag: '🇬🇵', length: 9 },
  { code: 'MQ', name: 'Martinique', dial: '+596', flag: '🇲🇶', length: 9 },
  { code: 'GF', name: 'Guyane fr.', dial: '+594', flag: '🇬🇫', length: 9 },
  { code: 'RE', name: 'Réunion', dial: '+262', flag: '🇷🇪', length: 9 },

  // ───────── Afrique ─────────
  { code: 'MA', name: 'Maroc', dial: '+212', flag: '🇲🇦', length: 9 },
  { code: 'DZ', name: 'Algérie', dial: '+213', flag: '🇩🇿', length: 9 },
  { code: 'TN', name: 'Tunisie', dial: '+216', flag: '🇹🇳', length: 8 },
  { code: 'LY', name: 'Libye', dial: '+218', flag: '🇱🇾', length: 9, lengthMin: 8, lengthMax: 10 },
  { code: 'EG', name: 'Égypte', dial: '+20', flag: '🇪🇬', length: 10 },
  { code: 'SD', name: 'Soudan', dial: '+249', flag: '🇸🇩', length: 9 },
  { code: 'SS', name: 'Soudan du Sud', dial: '+211', flag: '🇸🇸', length: 9 },
  { code: 'ET', name: 'Éthiopie', dial: '+251', flag: '🇪🇹', length: 9 },
  { code: 'ER', name: 'Érythrée', dial: '+291', flag: '🇪🇷', length: 7 },
  { code: 'DJ', name: 'Djibouti', dial: '+253', flag: '🇩🇯', length: 8 },
  { code: 'SO', name: 'Somalie', dial: '+252', flag: '🇸🇴', length: 8, lengthMin: 7, lengthMax: 9 },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪', length: 9 },
  { code: 'UG', name: 'Ouganda', dial: '+256', flag: '🇺🇬', length: 9 },
  { code: 'TZ', name: 'Tanzanie', dial: '+255', flag: '🇹🇿', length: 9 },
  { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼', length: 9 },
  { code: 'BI', name: 'Burundi', dial: '+257', flag: '🇧🇮', length: 8 },
  { code: 'CD', name: 'RD Congo', dial: '+243', flag: '🇨🇩', length: 9 },
  { code: 'CG', name: 'Congo', dial: '+242', flag: '🇨🇬', length: 9 },
  { code: 'CF', name: 'Centrafrique', dial: '+236', flag: '🇨🇫', length: 8 },
  { code: 'TD', name: 'Tchad', dial: '+235', flag: '🇹🇩', length: 8 },
  { code: 'AO', name: 'Angola', dial: '+244', flag: '🇦🇴', length: 9 },
  { code: 'GW', name: 'Guinée-Bissau', dial: '+245', flag: '🇬🇼', length: 9, lengthMin: 7, lengthMax: 9 },
  { code: 'GN', name: 'Guinée', dial: '+224', flag: '🇬🇳', length: 9 },
  { code: 'LR', name: 'Libéria', dial: '+231', flag: '🇱🇷', length: 8, lengthMin: 7, lengthMax: 9 },
  { code: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱', length: 8 },
  { code: 'MR', name: 'Mauritanie', dial: '+222', flag: '🇲🇷', length: 8 },
  { code: 'CV', name: 'Cap-Vert', dial: '+238', flag: '🇨🇻', length: 7 },
  { code: 'ST', name: 'Sao Tomé-et-Principe', dial: '+239', flag: '🇸🇹', length: 7 },
  { code: 'GQ', name: 'Guinée équatoriale', dial: '+240', flag: '🇬🇶', length: 9 },
  { code: 'GM', name: 'Gambie', dial: '+220', flag: '🇬🇲', length: 7 },
  { code: 'ZA', name: 'Afrique du Sud', dial: '+27', flag: '🇿🇦', length: 9 },
  { code: 'NA', name: 'Namibie', dial: '+264', flag: '🇳🇦', length: 9, lengthMin: 7, lengthMax: 10 },
  { code: 'BW', name: 'Botswana', dial: '+267', flag: '🇧🇼', length: 8, lengthMin: 7, lengthMax: 8 },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼', length: 9, lengthMin: 9, lengthMax: 10 },
  { code: 'ZM', name: 'Zambie', dial: '+260', flag: '🇿🇲', length: 9 },
  { code: 'MW', name: 'Malawi', dial: '+265', flag: '🇲🇼', length: 9 },
  { code: 'MZ', name: 'Mozambique', dial: '+258', flag: '🇲🇿', length: 9 },
  { code: 'MG', name: 'Madagascar', dial: '+261', flag: '🇲🇬', length: 9 },
  { code: 'MU', name: 'Maurice', dial: '+230', flag: '🇲🇺', length: 8 },
  { code: 'SC', name: 'Seychelles', dial: '+248', flag: '🇸🇨', length: 7 },
  { code: 'KM', name: 'Comores', dial: '+269', flag: '🇰🇲', length: 7 },
  { code: 'LS', name: 'Lesotho', dial: '+266', flag: '🇱🇸', length: 8 },
  { code: 'SZ', name: 'Eswatini', dial: '+268', flag: '🇸🇿', length: 8 },

  // ───────── Moyen-Orient ─────────
  { code: 'TR', name: 'Turquie', dial: '+90', flag: '🇹🇷', length: 10 },
  { code: 'IL', name: 'Israël', dial: '+972', flag: '🇮🇱', length: 9 },
  { code: 'PS', name: 'Palestine', dial: '+970', flag: '🇵🇸', length: 9 },
  { code: 'JO', name: 'Jordanie', dial: '+962', flag: '🇯🇴', length: 9 },
  { code: 'LB', name: 'Liban', dial: '+961', flag: '🇱🇧', length: 8, lengthMin: 7, lengthMax: 8 },
  { code: 'SY', name: 'Syrie', dial: '+963', flag: '🇸🇾', length: 9 },
  { code: 'IQ', name: 'Irak', dial: '+964', flag: '🇮🇶', length: 10 },
  { code: 'IR', name: 'Iran', dial: '+98', flag: '🇮🇷', length: 10 },
  { code: 'KW', name: 'Koweït', dial: '+965', flag: '🇰🇼', length: 8 },
  { code: 'SA', name: 'Arabie saoudite', dial: '+966', flag: '🇸🇦', length: 9 },
  { code: 'AE', name: 'Émirats A. U.', dial: '+971', flag: '🇦🇪', length: 9 },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦', length: 8 },
  { code: 'BH', name: 'Bahreïn', dial: '+973', flag: '🇧🇭', length: 8 },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲', length: 8 },
  { code: 'YE', name: 'Yémen', dial: '+967', flag: '🇾🇪', length: 9 },

  // ───────── Asie ─────────
  { code: 'CN', name: 'Chine', dial: '+86', flag: '🇨🇳', length: 11 },
  { code: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰', length: 8 },
  { code: 'MO', name: 'Macao', dial: '+853', flag: '🇲🇴', length: 8 },
  { code: 'TW', name: 'Taïwan', dial: '+886', flag: '🇹🇼', length: 9 },
  { code: 'JP', name: 'Japon', dial: '+81', flag: '🇯🇵', length: 10 },
  { code: 'KR', name: 'Corée du Sud', dial: '+82', flag: '🇰🇷', length: 10, lengthMin: 9, lengthMax: 11 },
  { code: 'KP', name: 'Corée du Nord', dial: '+850', flag: '🇰🇵', length: 10, lengthMin: 6, lengthMax: 15 },
  { code: 'IN', name: 'Inde', dial: '+91', flag: '🇮🇳', length: 10 },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰', length: 10 },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩', length: 10 },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰', length: 9 },
  { code: 'NP', name: 'Népal', dial: '+977', flag: '🇳🇵', length: 10 },
  { code: 'BT', name: 'Bhoutan', dial: '+975', flag: '🇧🇹', length: 8, lengthMin: 7, lengthMax: 8 },
  { code: 'MV', name: 'Maldives', dial: '+960', flag: '🇲🇻', length: 7 },
  { code: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫', length: 9 },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7', flag: '🇰🇿', length: 10 },
  { code: 'UZ', name: 'Ouzbékistan', dial: '+998', flag: '🇺🇿', length: 9 },
  { code: 'TM', name: 'Turkménistan', dial: '+993', flag: '🇹🇲', length: 8 },
  { code: 'KG', name: 'Kirghizistan', dial: '+996', flag: '🇰🇬', length: 9 },
  { code: 'TJ', name: 'Tadjikistan', dial: '+992', flag: '🇹🇯', length: 9 },
  { code: 'AM', name: 'Arménie', dial: '+374', flag: '🇦🇲', length: 8 },
  { code: 'GE', name: 'Géorgie', dial: '+995', flag: '🇬🇪', length: 9 },
  { code: 'AZ', name: 'Azerbaïdjan', dial: '+994', flag: '🇦🇿', length: 9 },
  { code: 'MN', name: 'Mongolie', dial: '+976', flag: '🇲🇳', length: 8 },
  { code: 'TH', name: 'Thaïlande', dial: '+66', flag: '🇹🇭', length: 9 },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳', length: 9, lengthMin: 9, lengthMax: 10 },
  { code: 'LA', name: 'Laos', dial: '+856', flag: '🇱🇦', length: 10, lengthMin: 8, lengthMax: 10 },
  { code: 'KH', name: 'Cambodge', dial: '+855', flag: '🇰🇭', length: 9, lengthMin: 8, lengthMax: 9 },
  { code: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲', length: 9, lengthMin: 7, lengthMax: 10 },
  { code: 'MY', name: 'Malaisie', dial: '+60', flag: '🇲🇾', length: 9, lengthMin: 9, lengthMax: 10 },
  { code: 'SG', name: 'Singapour', dial: '+65', flag: '🇸🇬', length: 8 },
  { code: 'ID', name: 'Indonésie', dial: '+62', flag: '🇮🇩', length: 10, lengthMin: 9, lengthMax: 12 },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭', length: 10 },
  { code: 'BN', name: 'Brunei', dial: '+673', flag: '🇧🇳', length: 7 },
  { code: 'TL', name: 'Timor oriental', dial: '+670', flag: '🇹🇱', length: 8, lengthMin: 7, lengthMax: 8 },

  // ───────── Océanie ─────────
  { code: 'AU', name: 'Australie', dial: '+61', flag: '🇦🇺', length: 9 },
  { code: 'NZ', name: 'Nouvelle-Zélande', dial: '+64', flag: '🇳🇿', length: 9, lengthMin: 8, lengthMax: 10 },
  { code: 'FJ', name: 'Fidji', dial: '+679', flag: '🇫🇯', length: 7 },
  { code: 'PG', name: 'Papouasie-N.-G.', dial: '+675', flag: '🇵🇬', length: 8, lengthMin: 7, lengthMax: 8 },
  { code: 'NC', name: 'Nouvelle-Calédonie', dial: '+687', flag: '🇳🇨', length: 6 },
  { code: 'PF', name: 'Polynésie fr.', dial: '+689', flag: '🇵🇫', length: 8, lengthMin: 6, lengthMax: 8 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Bénin

export function findCountryByDial(dial: string): Country | undefined {
  return COUNTRIES.find(c => c.dial === dial);
}
export function findCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function parsePhone(value: string | null | undefined): { country: Country; local: string } {
  if (!value) return { country: DEFAULT_COUNTRY, local: '' };
  const v = String(value).trim();
  if (v.startsWith('+')) {
    const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find(c => v.startsWith(c.dial));
    if (match) {
      let local = v.slice(match.dial.length).replace(/\D/g, '');
      // Bénin : ancien format 8 chiffres → préfixer 01
      if (match.code === 'BJ' && local.length === 8 && /^[4-9]/.test(local)) local = '01' + local;
      return { country: match, local };
    }
  }
  let local = v.replace(/\D/g, '');
  // Cas WhatsApp JID style: peut contenir l'indicatif 229 collé
  if (local.startsWith('229') && (local.length === 11 || local.length === 13)) {
    let rest = local.slice(3);
    if (rest.length === 8 && /^[4-9]/.test(rest)) rest = '01' + rest;
    return { country: DEFAULT_COUNTRY, local: rest };
  }
  if (local.length === 8 && /^[4-9]/.test(local)) local = '01' + local;
  return { country: DEFAULT_COUNTRY, local };
}

export function formatLocal(local: string, country: Country): string {
  const digits = local.replace(/\D/g, '').slice(0, country.length);
  const groups = country.groups || [digits.length];
  const out: string[] = [];
  let i = 0;
  for (const g of groups) {
    if (i >= digits.length) break;
    out.push(digits.slice(i, i + g));
    i += g;
  }
  return out.join(' ');
}

export function toE164(local: string, country: Country): string {
  const digits = local.replace(/\D/g, '');
  if (!digits) return '';
  return `${country.dial}${digits}`;
}

export function isValidPhone(local: string, country: Country): boolean {
  const d = local.replace(/\D/g, '');
  const min = country.lengthMin ?? country.length;
  const max = country.lengthMax ?? country.length;
  if (d.length < min || d.length > max) return false;
  if (country.prefixes) {
    if (!country.prefixes.some(p => d.startsWith(p))) return false;
  }
  return true;
}

/** Extrait un numéro depuis un JID WhatsApp (ex: 22901XXXXXXXX@s.whatsapp.net, 273091318042723@lid) */
export function jidToPhone(jid: string | null | undefined): string {
  if (!jid) return '';
  const raw = String(jid);
  const atIdx = raw.indexOf('@');
  const numPart = (atIdx >= 0 ? raw.slice(0, atIdx) : raw).replace(/\D/g, '');
  if (!numPart) return '';
  // Les LID ne sont pas des numéros téléphoniques réels — on ne tente la conversion
  // que si on reconnait un indicatif pays connu (sinon on renvoie '' pour fallback).
  if (raw.includes('@lid')) {
    // Heuristique : si commence par 229 et la suite fait 8/10 chiffres
    if (numPart.startsWith('229')) {
      const e = '+' + numPart;
      const p = parsePhone(e);
      if (isValidPhone(p.local, p.country)) return toE164(p.local, p.country);
    }
    return '';
  }
  const e164 = numPart.startsWith('+') ? numPart : '+' + numPart;
  const p = parsePhone(e164);
  if (isValidPhone(p.local, p.country)) return toE164(p.local, p.country);
  return '';
}

export function formatPhoneDisplay(value: string | null | undefined): string {
  if (!value) return '';
  const { country, local } = parsePhone(value);
  return `${country.flag} ${country.dial} ${formatLocal(local, country)}`;
}

/** Normalise un numéro pour stockage E.164, retourne { e164, valid, reason } */
export function normalizePhone(
  value: string | null | undefined,
  defaultCountryCode: string = 'BJ'
): { e164: string; valid: boolean; reason?: string } {
  if (!value || !String(value).trim()) {
    return { e164: '', valid: false, reason: 'Numéro requis' };
  }
  const defaultCountry = findCountryByCode(defaultCountryCode) || DEFAULT_COUNTRY;
  const v = String(value).trim();
  let country = defaultCountry;
  let local = v.replace(/\D/g, '');
  if (v.startsWith('+')) {
    const m = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find(c => v.startsWith(c.dial));
    if (m) {
      country = m;
      local = v.slice(m.dial.length).replace(/\D/g, '');
    }
  }
  if (!isValidPhone(local, country)) {
    const min = country.lengthMin ?? country.length;
    const max = country.lengthMax ?? country.length;
    if (local.length < min || local.length > max) {
      const range = min === max ? `${min}` : `${min}-${max}`;
      return { e164: '', valid: false, reason: `${range} chiffres requis pour ${country.name}` };
    }
    if (country.prefixes) {
      return { e164: '', valid: false, reason: `Préfixe invalide (attendu : ${country.prefixes.join('/')})` };
    }
    return { e164: '', valid: false, reason: 'Format invalide' };
  }
  return { e164: toE164(local, country), valid: true };
}

/**
 * Normalisation WhatsApp Bénin (réforme 2021).
 * Accepte: 8 chiffres (97XXXXXX), 10 chiffres (0197XXXXXX), avec/sans +229 / 00229 / 229.
 * Retourne le format canonique 10 chiffres `+22901XXXXXXXX` (préféré WhatsApp),
 * + variante 8 chiffres `+229XXXXXXXX` pour rétro-compatibilité.
 */
export function normalizeBeninWhatsApp(raw: string | null | undefined): {
  e164_10: string; // +22901XXXXXXXX (10 chiffres locaux)
  e164_8: string;  // +229XXXXXXXX (8 chiffres legacy, vide si non convertible)
  display: string; // affichage lisible
  valid: boolean;
  reason?: string;
} {
  if (!raw || !String(raw).trim()) {
    return { e164_10: '', e164_8: '', display: '', valid: false, reason: 'Numéro requis' };
  }
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return { e164_10: '', e164_8: '', display: '', valid: false, reason: 'Aucun chiffre' };

  // Strip 00 prefix
  if (digits.startsWith('00229')) digits = digits.slice(2);
  // Now strip country code if present
  let local = digits.startsWith('229') ? digits.slice(3) : digits;

  // Heuristiques:
  // - 10 chiffres commençant par 01 = nouveau format
  // - 8 chiffres commençant par opérateur valide [4-9] = ancien format → préfixer 01
  let local8 = '';
  let local10 = '';
  if (local.length === 10 && local.startsWith('01')) {
    local10 = local;
    local8 = local.slice(2);
  } else if (local.length === 8 && /^[4-9]/.test(local)) {
    local8 = local;
    local10 = '01' + local;
  } else {
    return { e164_10: '', e164_8: '', display: '', valid: false, reason: 'Format invalide (attendu : 8 ou 10 chiffres)' };
  }

  const e164_10 = `+229${local10}`;
  const e164_8 = `+229${local8}`;
  const display = `+229 ${local10.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}`;
  return { e164_10, e164_8, display, valid: true };
}
