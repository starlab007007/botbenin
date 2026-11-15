// Saisie intelligente du besoin : on devine ce qui peut l'être pour demander moins à l'utilisateur.
export type NeedKind = 'product' | 'service' | 'announcement';

const L = '(?<![\\p{L}])';
const R = '(?![\\p{L}])';
const SERVICE = new RegExp(`${L}(plombi\\p{L}*|électricien|electricien|maçon|macon|mécanicien|mecanicien|coiffeu\\p{L}*|menuisier|peintre|répar\\p{L}*|repar\\p{L}*|install\\p{L}*|nettoyage|ménage|menage|livraison|cours|professeur|prof|traiteur|photograph\\p{L}*|déménag\\p{L}*|demenag\\p{L}*|dépann\\p{L}*|depann\\p{L}*|coach|technicien|couturi\\p{L}*|chauffeur|jardini\\p{L}*|gardiennage|réservation|reservation)${R}`, 'iu');
const ANNOUNCEMENT = new RegExp(`${L}(emploi|recrutement|recrute|stage|concours|appel d'offres|événement|evenement|formation|bourse|offre d'emploi)${R}`, 'iu');

export function detectNeedKind(text: string): NeedKind {
  const value = String(text ?? '');
  if (ANNOUNCEMENT.test(value)) return 'announcement';
  if (SERVICE.test(value)) return 'service';
  return 'product';
}

/** « 80 000 F », « 50k fcfa », « 120000 cfa » → montant en F CFA, sinon null. */
export function detectBudget(text: string): number | null {
  const match = String(text ?? '').match(/(\d{1,3}(?:[\s. ]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|mille)?\s*(?:f\s*cfa|fcfa|cfa|francs?|f)(?![\p{L}])/iu);
  if (!match) return null;
  let n = Number(match[1].replace(/[\s. ]/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  if (match[2]) n *= 1000;
  n = Math.round(n);
  return n >= 100 && n <= 1e9 ? n : null;
}

/** Dernière ville connue sur cet appareil (sans demander la position à nouveau). */
export function savedCity(): string {
  try {
    const city = JSON.parse(localStorage.getItem('waouh_geo_v1') || 'null')?.city;
    return typeof city === 'string' ? city.trim().slice(0, 80) : '';
  } catch {
    return '';
  }
}
