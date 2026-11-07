// Extraction stricte des contacts publiés dans une annonce (texte ou page).
// Objectif : trouver le vrai numéro du vendeur sans jamais prendre un prix, une surface ou une référence pour un téléphone.
// Module pur (aucune dépendance Deno) : testable partout.

export type ExtractedContacts = {
  /** Numéros au format +229XXXXXXXXXX, annoncés WhatsApp (lien wa.me, mot WhatsApp à proximité). */
  whatsapp: string[];
  /** Autres numéros de téléphone valides. */
  phones: string[];
  emails: string[];
};

const CONTACT_WORDS = /(?:whats?\s?app|wa\.me|\bwa\b|tel(?:ephone|éphone)?|t[ée]l\b|appel(?:er|ez)?|contact(?:ez|er)?|joindre|num[ée]ro|📞|☎|📱|call)/i;
const PRICE_AFTER = /^\s*(?:f\s?cfa|fcfa|f\b|cfa|xof|francs?|frs?\b|€|\$|m2|m²|km|go\b|gb\b|mo\b|ans?\b|%|pcs|pièces|unités)/i;

/** Un numéro béninois valide, au format E.164, ou null. */
export function beninPhone(raw: string): string | null {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("229")) digits = digits.slice(3);
  // Depuis 2024 : 01 + 8 chiffres. Ancien format : 8 chiffres.
  if (digits.length === 10 && digits.startsWith("01")) digits = digits.slice(2);
  if (digits.length !== 8) return null;
  // Préfixes en service : fixes 2x, mobiles 4x–6x et 9x (7x, 8x, 3x, 1x, 0x non attribués).
  if (!/^(?:2[0-9]|4[0-9]|5[0-9]|6[0-9]|9[0-9])/.test(digits)) return null;
  // Suites triviales (00000000, 12121212…) : fausses pistes.
  if (/^(\d)\1{7}$/.test(digits)) return null;
  return `+22901${digits}`;
}

function nearWhatsApp(text: string, start: number, end: number) {
  // Seul le texte qui suit le dernier chiffre précédent compte : le mot WhatsApp d'un autre numéro ne déteint pas.
  const before = text.slice(Math.max(0, start - 30), start).replace(/^[\s\S]*\d/, "");
  const after = text.slice(end, end + 14).replace(/\d[\s\S]*$/, "");
  return /whats?\s?app|wa\.me|\bwa\b|💬/i.test(before + " " + after);
}

export function extractContacts(input: string): ExtractedContacts {
  const text = String(input ?? "").replace(/ | /g, " ");
  const whatsapp = new Set<string>();
  const phones = new Set<string>();
  const emails = new Set<string>();

  // 1. Liens explicites : on leur fait confiance.
  for (const m of text.matchAll(/(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?[^\s"')]*?phone=|whatsapp:\/\/send\?[^\s"')]*?phone=)\+?(\d{8,15})/gi)) {
    const p = beninPhone(m[1]);
    if (p) whatsapp.add(p);
  }
  for (const m of text.matchAll(/tel:\+?([\d%20\s.-]{8,20})/gi)) {
    const p = beninPhone(decodeURIComponent(m[1]));
    if (p) phones.add(p);
  }

  // 2. Numéros dans le texte : groupés par paires, ou préfixés +229 / 00229, ou précédés d'un mot de contact.
  const candidate = /(?:(?:\+|00)\s?229[\s.-]?)?(?:\(?0?1\)?[\s.-]?)?(?:\d{2}[\s.-]?){4}(?!\d)|(?:(?:\+|00)\s?229[\s.-]?)\d{8,10}(?!\d)|(?<![\d.,])\d{8,10}(?![\d.,])/g;
  for (const m of text.matchAll(candidate)) {
    const found = m[0];
    const start = m.index ?? 0;
    const end = start + found.length;
    const digits = found.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 13) continue;
    const prefixed = /^(?:\+|00)\s?229/.test(found.trim());
    const grouped = /^\s*(?:\(?0?1\)?[\s.-])?\d{2}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2}\s*$/.test(found);
    const before = text.slice(Math.max(0, start - 30), start);
    const labelled = CONTACT_WORDS.test(before);
    if (!prefixed && !grouped && !labelled) continue;
    if (PRICE_AFTER.test(text.slice(end, end + 12)) && !prefixed && !labelled) continue;
    // Un prix s'écrit par blocs de trois chiffres.
    if (/^\d{1,3}([ .]\d{3}){2,}$/.test(found.trim()) && !prefixed) continue;
    const p = beninPhone(found);
    if (!p) continue;
    (nearWhatsApp(text, start, end) ? whatsapp : phones).add(p);
  }

  for (const m of text.matchAll(/mailto:([^\s"'?<>]+)/gi)) emails.add(m[1].toLowerCase());
  for (const m of text.matchAll(/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi)) {
    const e = m[0].toLowerCase();
    if (!/\.(png|jpe?g|gif|webp|svg)$/.test(e) && !/^(?:noreply|no-reply|support|example)@/.test(e)) emails.add(e);
  }

  // Un numéro WhatsApp n'est pas listé deux fois.
  for (const p of whatsapp) phones.delete(p);
  return { whatsapp: [...whatsapp].slice(0, 3), phones: [...phones].slice(0, 3), emails: [...emails].slice(0, 3) };
}

/** Pages qu'on ne peut pas lire sans connexion : on s'appuie sur l'extrait du moteur de recherche. */
export function pageNeedsRenderer(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return /(?:^|\.)(?:facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|t\.me)$/.test(host);
  } catch {
    return false;
  }
}
