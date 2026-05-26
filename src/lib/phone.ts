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
  // Bénin : depuis 2021, numéros à 10 chiffres commençant par 01
  { code: 'BJ', name: 'Bénin', dial: '+229', flag: '🇧🇯', length: 10, groups: [2, 2, 2, 2, 2], prefixes: ['01'] },
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
  if (d.length !== country.length) return false;
  if (country.prefixes) {
    // Préfixe peut être de 1 ou plusieurs caractères
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
