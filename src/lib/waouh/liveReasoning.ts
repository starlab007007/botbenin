/**
 * Raisonnement « live » de l'Avatar.
 *
 * Chaque phrase est construite UNIQUEMENT à partir de ce que NEXUS a réellement
 * renvoyé (sources, villes, prix, canaux de contact). Rien n'est inventé :
 * si une source n'a rien donné ou est indisponible, l'Avatar le dit.
 */
import { nexusSourceLabel, type NexusDiscoveryResult, type NexusSearchResponse } from "./nexus";

export type ReasonTone = "think" | "search" | "found" | "zone" | "contact" | "next" | "warn";

export type ReasonEvidence = {
  key: string;
  title: string;
  source: string;
  city?: string | null;
  inZone?: boolean;
  price?: string | null;
  phone?: string | null;
  channel?: string | null;
  note?: string | null;
};

export type ReasonStep = {
  id: string;
  tone: ReasonTone;
  text: string;
  chips?: string[];
  evidence?: ReasonEvidence[];
};

export type ReasonContext = { query: string; city?: string; budget?: number | null };

export type ExternalDiscovery = {
  results: NexusDiscoveryResult[];
  source_mix?: Record<string, number>;
  refresh?: Record<string, { configured?: boolean; inserted?: number; reason?: string | null }>;
};

export type ReasonSummary = {
  found: number;
  internal: number;
  external: number;
  inZone: number;
  contactable: number;
  sources: string[];
  bestPrice: number | null;
  nextSteps: string[];
};

const fold = (value?: string | null) =>
  String(value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export const sameZone = (a?: string | null, b?: string | null) => {
  const x = fold(a);
  const y = fold(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

/** « +229 •• •• 12 34 » à partir des 4 derniers chiffres ; null si inconnu. */
export function maskPhone(last4?: string | null): string | null {
  const digits = String(last4 ?? "").replace(/\D/g, "").slice(-4);
  if (digits.length < 2) return null;
  const padded = digits.padStart(4, "•");
  return `+229 •• •• ${padded.slice(0, 2)} ${padded.slice(2)}`;
}

const money = (value: number | null | undefined, currency = "XOF") => {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return null;
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${Math.round(value)} ${currency}`;
  }
};

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function planSteps(ctx: ReasonContext): ReasonStep[] {
  const chips = [ctx.city ? `📍 ${ctx.city}` : null, ctx.budget ? `💰 ≤ ${money(ctx.budget)}` : null].filter(Boolean) as string[];
  return [
    {
      id: "understand",
      tone: "think",
      text: `Je comprends : vous cherchez « ${ctx.query.trim()} »${ctx.city ? ` près de ${ctx.city}` : ""}${ctx.budget ? `, dans votre budget` : ""}.`,
      chips,
    },
    {
      id: "plan",
      tone: "search",
      text: "Je lance deux recherches en parallèle : le catalogue WAOUH, puis les sources externes (cartes, réseaux, web public).",
    },
  ];
}

export function internalSteps(response: NexusSearchResponse, ctx: ReasonContext): ReasonStep[] {
  const items = response.results ?? [];
  if (!items.length) {
    return [{ id: "int-none", tone: "warn", text: "Catalogue WAOUH : aucune offre assez proche pour l’instant." }];
  }
  const inZone = items.filter((item) => sameZone(item.city, ctx.city));
  const prices = items.map((item) => item.price).filter((p): p is number => typeof p === "number" && p > 0);
  const cheapest = prices.length ? Math.min(...prices) : null;
  const steps: ReasonStep[] = [
    {
      id: "int-found",
      tone: "found",
      text: `Catalogue WAOUH : ${plural(items.length, "offre trouvée", "offres trouvées")}${
        response.market?.median ? `, prix médian ${money(response.market.median)}` : ""
      }.`,
      chips: [cheapest ? `Dès ${money(cheapest)}` : null].filter(Boolean) as string[],
    },
  ];
  if (ctx.city) {
    steps.push({
      id: "int-zone",
      tone: "zone",
      text: inZone.length
        ? `${plural(inZone.length, "vendeur est", "vendeurs sont")} dans votre zone (${ctx.city}).`
        : `Aucun vendeur du catalogue n’est à ${ctx.city} ; je garde les plus proches.`,
      evidence: inZone.slice(0, 2).map((item) => ({
        key: `int-${item.article_id ?? item.catalog_id ?? item.title}`,
        title: item.title,
        source: "WAOUH",
        city: item.city,
        inZone: true,
        price: money(item.price, item.currency),
        note: item.seller?.verified ? "Vendeur vérifié" : null,
      })),
    });
  }
  return steps;
}

export function externalUnavailableStep(): ReasonStep {
  return {
    id: "ext-down",
    tone: "warn",
    text: "Les sources externes ne répondent pas pour le moment. Je continue avec le catalogue WAOUH et je pourrai réessayer via une veille.",
  };
}

export function externalSteps(response: ExternalDiscovery, ctx: ReasonContext): ReasonStep[] {
  const results = response.results ?? [];
  const mix = Object.entries(response.source_mix ?? {}).filter(([, count]) => count > 0);
  const refreshed = Object.entries(response.refresh ?? {}).filter(([, info]) => (info?.inserted ?? 0) > 0);
  const steps: ReasonStep[] = [];

  const sourceNames = Array.from(new Set([...mix.map(([k]) => nexusSourceLabel(k)), ...refreshed.map(([k]) => nexusSourceLabel(k))]));
  if (!results.length) {
    steps.push({
      id: "ext-none",
      tone: "warn",
      text: sourceNames.length
        ? `Sources externes (${sourceNames.join(", ")}) : rien d’exploitable pour cette recherche.`
        : "Sources externes : aucune annonce publique trouvée pour cette recherche.",
    });
    return steps;
  }

  steps.push({
    id: "ext-found",
    tone: "found",
    text: `Sources externes : ${plural(results.length, "signal pertinent", "signaux pertinents")}${
      sourceNames.length ? ` via ${sourceNames.join(", ")}` : ""
    }.`,
    chips: mix.slice(0, 4).map(([key, count]) => `${nexusSourceLabel(key)} · ${count}`),
  });

  const inZone = results.filter((item) => sameZone(item.city, ctx.city));
  if (ctx.city) {
    steps.push({
      id: "ext-zone",
      tone: "zone",
      text: inZone.length
        ? `J’ai trouvé ${plural(inZone.length, "vendeur", "vendeurs")} à ${ctx.city}. Je continue de chercher autour.`
        : `Aucun résultat externe à ${ctx.city} pour l’instant ; je regarde les villes voisines.`,
      evidence: inZone.slice(0, 3).map((item) => evidenceFromDiscovery(item, true)),
    });
  }

  const contactable = results.filter((item) => (item.contact_pack?.masked_contacts?.length ?? 0) > 0 || item.contact_policy?.can_reveal);
  const withPhone = contactable.filter((item) => item.contact_pack?.masked_contacts?.some((c) => !!maskPhone(c.last4)));
  if (contactable.length) {
    steps.push({
      id: "ext-contact",
      tone: "contact",
      text: `${plural(contactable.length, "contact est joignable", "contacts sont joignables")}${
        withPhone.length ? ` ; les numéros restent masqués (seuls les 4 derniers chiffres sont visibles)` : ""
      }.`,
      evidence: contactable.slice(0, 3).map((item) => evidenceFromDiscovery(item, sameZone(item.city, ctx.city))),
    });
  }

  const interested = results.filter((item) => ["BUY", "RFQ"].includes(String(item.intent).toUpperCase()));
  if (interested.length) {
    steps.push({
      id: "ext-interest",
      tone: "found",
      text: `${plural(interested.length, "personne exprime", "personnes expriment")} un besoin similaire : de quoi croiser offre et demande.`,
      evidence: interested.slice(0, 2).map((item) => evidenceFromDiscovery(item, sameZone(item.city, ctx.city))),
    });
  }
  return steps;
}

function evidenceFromDiscovery(item: NexusDiscoveryResult, inZone: boolean): ReasonEvidence {
  const channel = item.contact_pack?.masked_contacts?.[0];
  return {
    key: `ext-${item.fabric_id}`,
    title: item.subject || item.raw_text?.slice(0, 70) || "Annonce publique",
    source: nexusSourceLabel(item.source_key),
    city: item.city,
    inZone,
    price: money(item.price_min ?? item.price_max, item.currency || "XOF"),
    phone: channel ? maskPhone(channel.last4) : null,
    channel: channel?.channel ?? item.best_channel ?? null,
    note: item.contact_policy?.label ?? null,
  };
}

export function buildSummary(
  internal: NexusSearchResponse | null,
  external: ExternalDiscovery | null,
  ctx: ReasonContext,
): ReasonSummary {
  const int = internal?.results ?? [];
  const ext = external?.results ?? [];
  const prices = [
    ...int.map((i) => i.price),
    ...ext.map((e) => e.price_min ?? e.price_max),
  ].filter((p): p is number => typeof p === "number" && p > 0);
  const inZone = int.filter((i) => sameZone(i.city, ctx.city)).length + ext.filter((e) => sameZone(e.city, ctx.city)).length;
  const contactable = ext.filter((e) => (e.contact_pack?.masked_contacts?.length ?? 0) > 0).length + int.filter((i) => !!i.article_id).length;
  const sources = Array.from(new Set([
    ...(int.length ? ["WAOUH"] : []),
    ...Object.entries(external?.source_mix ?? {}).filter(([, n]) => n > 0).map(([k]) => nexusSourceLabel(k)),
  ]));

  const next: string[] = [];
  const act = (a: string) => ext.filter((e) => e.next_best_action === a || e.contact_pack?.next_best_action === a).length;
  if (act("CONTACT_NOW") + act("REQUEST_APPROVAL") > 0) next.push(`Je peux contacter ${plural(act("CONTACT_NOW") + act("REQUEST_APPROVAL"), "vendeur", "vendeurs")}, mais seulement avec votre accord.`);
  else if (contactable > 0) next.push("Choisissez une offre : je prépare le contact et la négociation.");
  if (act("ENRICH") > 0) next.push(`Je poursuis pour compléter les coordonnées de ${plural(act("ENRICH"), "annonce", "annonces")}.`);
  if (int.length + ext.length < 4) next.push("Peu de résultats : activez une veille, je continue à chercher pour vous.");
  else next.push("Activez une veille pour être alerté si le prix baisse.");

  return {
    found: int.length + ext.length,
    internal: int.length,
    external: ext.length,
    inZone,
    contactable,
    sources,
    bestPrice: prices.length ? Math.min(...prices) : null,
    nextSteps: next.slice(0, 3),
  };
}

export function summaryStep(summary: ReasonSummary, ctx: ReasonContext): ReasonStep {
  if (!summary.found) {
    return { id: "summary", tone: "next", text: "Point de recherche : rien d’assez proche pour le moment. Je vous propose de lancer une veille, je continuerai pour vous." };
  }
  const best = money(summary.bestPrice);
  return {
    id: "summary",
    tone: "next",
    text: `Point de recherche : ${plural(summary.found, "résultat", "résultats")}${ctx.city ? `, dont ${summary.inZone} à ${ctx.city}` : ""}${best ? `, meilleur prix ${best}` : ""}.`,
  };
}
