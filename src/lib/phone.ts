// Utilitaires téléphone avec indicatifs pays (focus Afrique de l'Ouest, défaut Bénin)

export type Country = {
  code: string; // ISO 2
  name: string;
  dial: string; // ex: '+229'
  flag: string; // emoji
  length: number; // longueur attendue du numéro local (sans indicatif)
  groups?: number[]; // découpage formatage ex: [2,2,2,2]
  prefixes?: string[]; // préfixes opérateurs valides (premier chiffre attendu)
};

export const COUNTRIES: Country[] = [
  { code: 'BJ', name: 'Bénin', dial: '+229', flag: '🇧🇯', length: 8, groups: [2, 2, 2, 2], prefixes: ['9', '6', '5', '4'] },
  { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬', length: 8, groups: [2, 2, 2, 2] },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮', length: 10, groups: [2, 2, 2, 2, 2] },
  { code: 'SN', name: 'Sénégal', dial: '+221', flag: '🇸🇳', length: 9, groups: [3, 3, 3] },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫', length: 8, groups: [2, 2, 2, 2] },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', length: 10, groups: [3, 3, 4] },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭', length: 9, groups: [3, 3, 3] },
  { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱', length: 8, groups: [2, 2, 2, 2] },
  { code: 'NE', name: 'Niger', dial: '+227', flag: '🇳🇪', length: 8, groups: [2, 2, 2, 2] },
  { code: 'CM', name: 'Cameroun', dial: '+237', flag: '🇨🇲', length: 9, groups: [3, 3, 3] },
  { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦', length: 8, groups: [2, 2, 2, 2] },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', length: 9, groups: [1, 2, 2, 2, 2] },
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
  const v = value.trim();
  if (v.startsWith('+')) {
    const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find(c => v.startsWith(c.dial));
    if (match) return { country: match, local: v.slice(match.dial.length).replace(/\D/g, '') };
  }
  return { country: DEFAULT_COUNTRY, local: v.replace(/\D/g, '') };
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
  if (d.length !== country.length) return false;
  if (country.prefixes && !country.prefixes.includes(d[0])) return false;
  return true;
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
    if (local.length !== country.length) {
      return { e164: '', valid: false, reason: `${country.length} chiffres requis pour ${country.name}` };
    }
    if (country.prefixes) {
      return { e164: '', valid: false, reason: `Préfixe invalide (attendu : ${country.prefixes.join('/')})` };
    }
    return { e164: '', valid: false, reason: 'Format invalide' };
  }
  return { e164: toE164(local, country), valid: true };
}
