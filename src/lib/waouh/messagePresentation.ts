import { normalizeChatReply } from "@/lib/chatReply";

/** Normalize legacy WhatsApp formatting without changing stored messages. */
export function formatAssistantText(text: string): string {
  let inCode = false;
  return text.replace(/\r\n/g, "\n").split("\n").map(line => {
    if (/^\s*```/.test(line)) { inCode = !inCode; return line; }
    if (inCode) return line;
    // Known leaked copywriting scaffold from legacy search responses.
    line = line.replace(/🧠\s*(?:≤|<=)?\s*\d+\s*car,\s*FR,\s*factuel,\s*mentionne marge n[ée]go si pertinent/gi, "");
    return line.split(/(`[^`]*`)/g).map(part => {
      if (part.startsWith("`")) return part;
      return part
        .replace(/[━─]{3,}/g, "\n\n---\n\n")
        .replace(/(^|[\s])\*([^*\n]+)\*(?=$|[\s.,;:!?])/g, "$1**$2**");
    }).join("");
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** A conversation row is a summary, never a full transcript or raw payload. */
export function chatMessagePreview(value: string | null | undefined): string {
  if (!value) return "Nouvel échange";
  const reply = normalizeChatReply(value);
  if (reply.results.length) {
    const first = reply.results[0];
    const price = first.price ?? first.price_min;
    return `${reply.results.length} offre${reply.results.length > 1 ? "s" : ""} · ${first.title}${price != null ? ` · ${new Intl.NumberFormat("fr-FR").format(price)} FCFA` : ""}`;
  }
  const plain = (reply.text || value)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[━─_`*#]+/g, "")
    .replace(/\s+/g, " ").trim();
  return plain.length > 140 ? `${plain.slice(0, 137).trimEnd()}…` : plain;
}

export type LegacyOffer = { title: string; text: string };

/** Display-only cards: no invented product IDs, prices, or commerce actions. */
export function legacyOfferSections(text: string): LegacyOffer[] {
  const normalized = text.replace(/[━─]{3,}/g, "\n");
  const sections = normalized.split(/(?:^|\n)\s*\*?(?=\d+[.)]\s)/).filter(section => /^\d+[.)]\s/.test(section));
  if (!sections.length || !/FCFA|XOF/.test(text) || !/annonces? trouv|résultats?|sélection|offres?/i.test(text)) return [];
  return sections.map(section => {
    const clean = section.replace(/^\d+[.)]\s*/, "").trim();
    const [title, ...body] = clean.split(/\n|(?=[💰💵📍📊🧠])/u);
    return { title: title.replace(/^\*+|\*+$/g, "").trim(), text: body.join("\n").trim() };
  }).filter(section => section.title && section.text);
}
