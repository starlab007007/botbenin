/**
 * Raisonnement « live » de l'Avatar.
 *
 * Chaque phrase est construite UNIQUEMENT à partir de ce que NEXUS a réellement
 * renvoyé (sources, villes, prix, canaux de contact). Rien n'est inventé :
 * si une source n'a rien donné ou est indisponible, l'Avatar le dit.
 */
import type { NexusDiscoveryResult, NexusSearchResponse, NexusSmartDiscoveryPlan } from "./nexus";

export type ReasonTone = "think" | "search" | "found" | "zone" | "contact" | "next" | "warn";

export type ReasonEvidence = {
  key: string;
  title: string;
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
      text: `Je cherche « ${ctx.query.trim()} »${ctx.city ? ` à ${ctx.city}` : ""}.`,
      chips,
    },
    {
      id: "method",
      tone: "think",
      text: "Je compare prix, proximité, confiance et fraîcheur.",
      chips: ["1 Comprendre", "2 Chercher", "3 Comparer", "4 Proposer"],
    },
    {
      id: "plan",
      tone: "search",
      text: "Je lance la recherche.",
    },
  ];
}

const PRIORITY_LABEL: Record<string, string> = {
  price: "prix", proximity: "proximité", location: "proximité", trust: "confiance", freshness: "fraîcheur",
  relevance: "pertinence", contactability: "joignabilité", availability: "disponibilité", quality: "qualité",
};

/** Analyse de l'Avatar à partir du plan réellement renvoyé par NEXUS (rien d'inventé). */
export function methodSteps(plan: NexusSmartDiscoveryPlan | null | undefined): ReasonStep[] {
  if (!plan) return [];
  const steps: ReasonStep[] = [];
  const direction = plan.mode === "find_buyers" ? "Je cherche des acheteurs" : "Je cherche des vendeurs";
  steps.push({
    id: "analysis",
    tone: "think",
    text: `${direction} · compris à ${Math.round((plan.confidence ?? 0) * 100)} %.`,
  });
  const priorities = (plan.priorities ?? []).slice(0, 5).map((p) => PRIORITY_LABEL[p] ?? p.replace(/_/g, " "));
  if (priorities.length) {
    steps.push({
      id: "criteria",
      tone: "search",
      text: "Mes critères.",
      chips: priorities,
    });
  }
  if (plan.rationale?.trim()) {
    {
    const why = plan.rationale.trim();
    steps.push({ id: "rationale", tone: "think", text: why.length > 130 ? `${why.slice(0, 127).trimEnd()}…` : why });
  }
  }
  if ((plan.missing ?? []).length) {
    steps.push({
      id: "missing",
      tone: "warn",
      text: `À préciser : ${(plan.missing ?? []).slice(0, 3).join(", ")}.`,
    });
  }
  return steps;
}

export function internalSteps(response: NexusSearchResponse, ctx: ReasonContext): ReasonStep[] {
  const items = response.results ?? [];
  if (!items.length) {
    return [{ id: "int-none", tone: "warn", text: "Rien d’assez proche au catalogue." }];
  }
  const inZone = items.filter((item) => sameZone(item.city, ctx.city));
  const prices = items.map((item) => item.price).filter((p): p is number => typeof p === "number" && p > 0);
  const cheapest = prices.length ? Math.min(...prices) : null;
  const steps: ReasonStep[] = [
    {
      id: "int-found",
      tone: "found",
      text: `${plural(items.length, "offre", "offres")} au catalogue${
        response.market?.median ? ` · médiane ${money(response.market.median)}` : ""
      }.`,
      chips: [cheapest ? `Dès ${money(cheapest)}` : null].filter(Boolean) as string[],
    },
  ];
  if (ctx.city) {
    steps.push({
      id: "int-zone",
      tone: "zone",
      text: inZone.length
        ? `${plural(inZone.length, "vendeur", "vendeurs")} à ${ctx.city}.`
        : `Aucun à ${ctx.city} : je prends les plus proches.`,
      evidence: inZone.slice(0, 2).map((item) => ({
        key: `int-${item.article_id ?? item.catalog_id ?? item.title}`,
        title: item.title,
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
    text: "Une partie n’a pas répondu. Je continue.",
  };
}

export function externalSteps(response: ExternalDiscovery, ctx: ReasonContext): ReasonStep[] {
  const results = response.results ?? [];
  const steps: ReasonStep[] = [];

  if (!results.length) {
    steps.push({
      id: "ext-none",
      tone: "warn",
      text: "Rien de plus en ligne.",
    });
    return steps;
  }

  steps.push({
    id: "ext-found",
    tone: "found",
    text: `${plural(results.length, "annonce", "annonces")} en ligne.`,
  });

  const inZone = results.filter((item) => sameZone(item.city, ctx.city));
  if (ctx.city) {
    steps.push({
      id: "ext-zone",
      tone: "zone",
      text: inZone.length
        ? `${plural(inZone.length, "vendeur", "vendeurs")} à ${ctx.city}. Je regarde autour.`
        : `Rien de plus à ${ctx.city} : je regarde autour.`,
      evidence: inZone.slice(0, 3).map((item) => evidenceFromDiscovery(item, true)),
    });
  }

  const contactable = results.filter((item) => (item.contact_pack?.masked_contacts?.length ?? 0) > 0 || item.contact_policy?.can_reveal);
  const withPhone = contactable.filter((item) => item.contact_pack?.masked_contacts?.some((c) => !!maskPhone(c.last4)));
  if (contactable.length) {
    steps.push({
      id: "ext-contact",
      tone: "contact",
      text: `${plural(contactable.length, "contact joignable", "contacts joignables")}${withPhone.length ? " · numéros masqués" : ""}.`,
      evidence: contactable.slice(0, 3).map((item) => evidenceFromDiscovery(item, sameZone(item.city, ctx.city))),
    });
  }

  const interested = results.filter((item) => ["BUY", "RFQ"].includes(String(item.intent).toUpperCase()));
  if (interested.length) {
    steps.push({
      id: "ext-interest",
      tone: "found",
      text: `${plural(interested.length, "personne cherche", "personnes cherchent")} la même chose.`,
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

  const next: string[] = [];
  const act = (a: string) => ext.filter((e) => e.next_best_action === a || e.contact_pack?.next_best_action === a).length;
  if (act("CONTACT_NOW") + act("REQUEST_APPROVAL") > 0) next.push(`Je peux contacter ${plural(act("CONTACT_NOW") + act("REQUEST_APPROVAL"), "vendeur", "vendeurs")}, avec votre accord.`);
  else if (contactable > 0) next.push("Choisissez une offre : je prépare le contact.");
  if (act("ENRICH") > 0) next.push(`Je complète ${plural(act("ENRICH"), "annonce", "annonces")}.`);
  if (int.length + ext.length < 4) next.push("Peu de résultats : activez une veille.");
  else next.push("Veille : alerte si le prix baisse.");

  return {
    found: int.length + ext.length,
    internal: int.length,
    external: ext.length,
    inZone,
    contactable,
    bestPrice: prices.length ? Math.min(...prices) : null,
    nextSteps: next.slice(0, 3),
  };
}

export function summaryStep(summary: ReasonSummary, ctx: ReasonContext): ReasonStep {
  if (!summary.found) {
    return { id: "summary", tone: "next", text: "Bilan : rien d’assez proche. Je peux surveiller pour vous." };
  }
  const best = money(summary.bestPrice);
  return {
    id: "summary",
    tone: "next",
    text: `Bilan : ${plural(summary.found, "résultat", "résultats")}${ctx.city ? ` · ${summary.inZone} à ${ctx.city}` : ""}${best ? ` · dès ${best}` : ""}.`,
  };
}
