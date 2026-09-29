// WAOUH — L'avatar guide : briefings courts (2 à 3 phrases), accueil à l'ouverture, points réguliers.
// Module PUR (aucun accès réseau) : composition, cadence, heures calmes. Testé par waouh-avatar-briefing-test.ts.
// Règles : jamais plus de 3 phrases courtes ; jamais d'envoi au tiers (l'avatar propose, l'utilisateur tape) ;
// aucune donnée d'un autre utilisateur ; aucun montant ni coordonnée dans le texte.

export type Cadence = "off" | "hourly" | "every_4h" | "daily" | "weekly";
export type Trigger = "open" | "manual" | "tick";
export type BriefingKind = "first" | "welcome" | "point" | "digest";

export interface AvatarPrefs {
  welcome: boolean;
  cadence: Cadence;
  quietStart: number;
  quietEnd: number;
}
export const DEFAULT_PREFS: AvatarPrefs = { welcome: true, cadence: "daily", quietStart: 21, quietEnd: 7 };
export const CADENCES: Cadence[] = ["off", "hourly", "every_4h", "daily", "weekly"];
export const CADENCE_HOURS: Record<Cadence, number | null> = { off: null, hourly: 1, every_4h: 4, daily: 24, weekly: 168 };
/** Écart minimal entre deux accueils (ouvertures rapprochées : pas de spam). */
export const OPEN_MIN_GAP_MIN = 30;
/** Au-delà de cet écart, l'ouverture commence par un vrai message de bienvenue. */
export const WELCOME_AFTER_H = 6;
/** Fuseau de référence (Bénin, UTC+1, sans heure d'été). */
export const TZ_OFFSET_MIN = 60;

const hour = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback;
};

/** Préférences depuis n'importe quelle source (ligne SQL, corps de requête) : valeurs inconnues → défauts. */
export function normalizePrefs(raw: unknown): AvatarPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    welcome: typeof r.welcome === "boolean" ? r.welcome : DEFAULT_PREFS.welcome,
    cadence: CADENCES.includes(r.cadence as Cadence) ? r.cadence as Cadence : DEFAULT_PREFS.cadence,
    quietStart: hour(r.quiet_start ?? r.quietStart, DEFAULT_PREFS.quietStart),
    quietEnd: hour(r.quiet_end ?? r.quietEnd, DEFAULT_PREFS.quietEnd),
  };
}

const validHour = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 23;

/**
 * Applique un patch de réglages : seuls les champs VALIDES remplacent l'existant, tout le reste est ignoré
 * (valeur inconnue, hors plage, mauvais type) — jamais une erreur, jamais un retour aux défauts par surprise.
 */
export function mergePrefs(current: AvatarPrefs, patch: unknown): AvatarPrefs {
  const p = (patch && typeof patch === "object" ? patch : {}) as Record<string, unknown>;
  const start = p.quiet_start ?? p.quietStart;
  const end = p.quiet_end ?? p.quietEnd;
  return {
    welcome: typeof p.welcome === "boolean" ? p.welcome : current.welcome,
    cadence: CADENCES.includes(p.cadence as Cadence) ? p.cadence as Cadence : current.cadence,
    quietStart: validHour(start) ? start : current.quietStart,
    quietEnd: validHour(end) ? end : current.quietEnd,
  };
}

/** Heure locale (0–23) d'un instant. */
export const localHour = (now: Date, offsetMin = TZ_OFFSET_MIN) => new Date(now.getTime() + offsetMin * 60_000).getUTCHours();

/** Heures calmes (ex. 21 → 7, à cheval sur minuit). start === end : aucune heure calme. */
export function inQuietHours(now: Date, prefs: Pick<AvatarPrefs, "quietStart" | "quietEnd">, offsetMin = TZ_OFFSET_MIN): boolean {
  const h = localHour(now, offsetMin);
  const { quietStart: s, quietEnd: e } = prefs;
  if (s === e) return false;
  return s < e ? h >= s && h < e : h >= s || h < e;
}

export interface BriefDecision { send: boolean; kind: BriefingKind | null; reason: string }

/**
 * Faut-il envoyer un point maintenant ?
 * - manual : toujours (l'utilisateur le demande).
 * - open : accueil si activé et ≥ 30 min depuis le dernier ; « bienvenue » complète après 6 h ou au tout premier.
 * - tick : point régulier hors heures calmes, à l'échéance de la cadence, seulement s'il y a du nouveau ou une action possible.
 */
export function shouldBrief(input: {
  prefs: AvatarPrefs;
  lastBriefingAt: Date | null;
  now: Date;
  trigger: Trigger;
  digestChanged: boolean;
  hasActionable: boolean;
}): BriefDecision {
  const { prefs, lastBriefingAt, now, trigger } = input;
  const gapH = lastBriefingAt ? (now.getTime() - lastBriefingAt.getTime()) / 3600_000 : Infinity;
  if (trigger === "manual") return { send: true, kind: lastBriefingAt ? "point" : "first", reason: "manual" };
  if (trigger === "open") {
    if (!prefs.welcome) return { send: false, kind: null, reason: "welcome_off" };
    if (gapH * 60 < OPEN_MIN_GAP_MIN) return { send: false, kind: null, reason: "too_soon" };
    if (!lastBriefingAt) return { send: true, kind: "first", reason: "first_open" };
    return { send: true, kind: gapH >= WELCOME_AFTER_H ? "welcome" : "point", reason: "open" };
  }
  const interval = CADENCE_HOURS[prefs.cadence];
  if (interval == null) return { send: false, kind: null, reason: "cadence_off" };
  if (inQuietHours(now, prefs)) return { send: false, kind: null, reason: "quiet_hours" };
  if (gapH < interval) return { send: false, kind: null, reason: "not_due" };
  if (!input.digestChanged && !input.hasActionable) return { send: false, kind: null, reason: "nothing_new" };
  return { send: true, kind: "digest", reason: "scheduled" };
}

/** Prochain point régulier estimé (pour l'affichage « prochain point dans … »), null si aucun. */
export function nextBriefingAt(prefs: AvatarPrefs, lastBriefingAt: Date | null, now: Date): Date | null {
  const interval = CADENCE_HOURS[prefs.cadence];
  if (interval == null) return null;
  let at = new Date((lastBriefingAt ?? now).getTime() + interval * 3600_000);
  if (at.getTime() < now.getTime()) at = new Date(now.getTime() + 60_000);
  // Repousse hors des heures calmes (par pas d'une heure, au plus 24 pas).
  for (let i = 0; i < 24 && inQuietHours(at, prefs); i++) at = new Date(at.getTime() + 3600_000);
  return at;
}

// ---------------------------------------------------------------------------
// Activité et composition
// ---------------------------------------------------------------------------
export interface ThreadRef { threadId: string; articleId: string | null; negotiationId: string | null }

export interface Activity {
  displayName: string | null;
  /** Vendeur : offres reçues en attente de sa décision. */
  offersToAnswer: Array<ThreadRef & { title: string }>;
  /** Acheteur : offres à un vendeur WAOUH sans réponse (heures depuis la dernière activité). */
  waitingOnSeller: Array<ThreadRef & { title: string; hours: number }>;
  /** Vendeurs externes : offres transmises par l'avatar. */
  transmitted: Array<ThreadRef & { title: string; hours: number; nudgeDue: boolean }>;
  /** Vendeurs externes : offres en veille (voie de contact recherchée). */
  watching: Array<ThreadRef & { title: string; reachable: boolean }>;
  /** Commandes en cours (accord conclu, livraison). */
  dealsInProgress: Array<ThreadRef & { title: string; role: "buyer" | "seller"; status: string }>;
  completedRecent: number;
}

export const emptyActivity = (displayName: string | null = null): Activity => ({
  displayName, offersToAnswer: [], waitingOnSeller: [], transmitted: [], watching: [], dealsInProgress: [], completedRecent: 0,
});

export interface BriefingItem { label: string; detail: string; tone: "ok" | "warn" | "info" }
export interface BriefingSection { key: "activities" | "watch" | "contacts" | "next"; title: string; items: BriefingItem[] }
export interface BriefingAction {
  id: string;
  label: string;
  article_id?: string | null;
  thread_id?: string | null;
  negotiation_id?: string | null;
  /** Rôle de l'utilisateur dans le fil (ouvrir la bonne fenêtre : acheteur ou vendeur). */
  role?: "buyer" | "seller";
  /** Titre de l'annonce, pour la fenêtre qui s'ouvre. */
  title?: string;
}

export interface Briefing {
  kind: BriefingKind;
  greeting: string;
  sentences: string[];
  sections: BriefingSection[];
  actions: BriefingAction[];
  tip: string;
  digest: string;
  hasActionable: boolean;
  generatedAt: string;
}

export const HELP_TIPS = [
  "Dites « Je cherche… » : je compare les offres et j'ouvre la négociation pour vous.",
  "Dites « Je vends… » : je publie, je trie les acheteurs et je vous propose les bonnes réponses.",
  "Je peux garder une offre en veille et vous prévenir dès qu'un vendeur devient joignable.",
  "Je peux suivre vos livraisons et vous prévenir à chaque étape.",
  "Je vous propose un prix réaliste avant chaque offre, pour éviter les refus.",
  "Vous choisissez quand je fais le point : à l'ouverture, chaque jour ou chaque semaine.",
] as const;

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
export const shortName = (title: string, max = 28) => {
  const t = String(title || "").replace(/[*_~`«»"]/g, "").replace(/\s+/g, " ").trim() || "l'annonce";
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
};
const hoursLabel = (h: number) => (h < 1 ? "moins d'1 h" : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} jours`);
const firstName = (name: string | null) => {
  const n = String(name ?? "").trim().split(/\s+/)[0] ?? "";
  return n && !n.includes("@") && !/^\d+$/.test(n) && n.length <= 24 ? n : "";
};
const dayIndex = (now: Date) => Math.floor((now.getTime() + TZ_OFFSET_MIN * 60_000) / 86_400_000);

/** Stable : mêmes activités → même empreinte (sert à ne pas répéter un point sans nouveauté). */
export function activityDigest(a: Activity): string {
  const part = (p: string, items: Array<{ threadId: string }>, extra?: (i: any) => string) =>
    `${p}:${items.map((i) => `${i.threadId}${extra ? extra(i) : ""}`).sort().join(",")}`;
  return [
    part("a", a.offersToAnswer), part("w", a.waitingOnSeller), part("t", a.transmitted, (i) => (i.nudgeDue ? "!" : "")),
    part("v", a.watching, (i) => (i.reachable ? "+" : "")), part("d", a.dealsInProgress, (i) => `@${i.status}`), `c:${a.completedRecent}`,
  ].join("|");
}

export function composeBriefing(input: { activity: Activity; kind: BriefingKind; now: Date }): Briefing {
  const { activity: a, kind, now } = input;
  const hello = (() => { const h = localHour(now); return h >= 18 || h < 5 ? "Bonsoir" : "Bonjour"; })();
  const name = firstName(a.displayName);
  const nudge = a.transmitted.filter((t) => t.nudgeDue);
  const reachable = a.watching.filter((w) => w.reachable);
  const total = a.offersToAnswer.length + a.waitingOnSeller.length + a.transmitted.length + a.watching.length + a.dealsInProgress.length;

  // --- Phrase 1 : accueil / cadrage
  const s1 = kind === "first"
    ? `Bienvenue${name ? ` ${name}` : ""}, je suis votre avatar : je cherche, je négocie et je suis vos offres pour vous.`
    : kind === "welcome"
    ? `${hello}${name ? ` ${name}` : ""}, content de vous retrouver.`
    : kind === "digest"
    ? "Petit point de votre avatar."
    : "Voici mon point.";

  // --- Phrase 2 : le point (les faits les plus utiles d'abord, 3 au plus)
  const facts: string[] = [];
  if (a.offersToAnswer.length) facts.push(plural(a.offersToAnswer.length, "offre à traiter", "offres à traiter"));
  if (nudge.length) facts.push(`${plural(nudge.length, "offre sans réponse", "offres sans réponse")} depuis plus de 24 h`);
  if (reachable.length) facts.push(plural(reachable.length, "vendeur devenu joignable", "vendeurs devenus joignables"));
  if (a.dealsInProgress.length) facts.push(plural(a.dealsInProgress.length, "commande en cours", "commandes en cours"));
  const stillWatching = a.watching.length - reachable.length;
  if (stillWatching > 0) facts.push(plural(stillWatching, "veille active", "veilles actives"));
  const waiting = a.transmitted.length - nudge.length + a.waitingOnSeller.length;
  if (waiting > 0) facts.push(plural(waiting, "offre en attente de réponse", "offres en attente de réponse"));
  if (!facts.length && a.completedRecent) facts.push(plural(a.completedRecent, "vente conclue cette semaine", "ventes conclues cette semaine"));
  const s2 = facts.length ? `${facts.slice(0, 3).join(", ")}.` : "Rien en cours pour l'instant.";

  // --- Phrase 3 : prochaine étape ou aide
  const tip = HELP_TIPS[((dayIndex(now) % HELP_TIPS.length) + HELP_TIPS.length) % HELP_TIPS.length];
  let s3: string;
  if (kind === "first") s3 = "Dites « Je cherche… » ou « Je vends… », et je m'occupe du reste ; vous réglez mes points quand vous voulez.";
  else if (nudge.length) s3 = `Prochaine étape : relancer le vendeur de « ${shortName(nudge[0].title)} », d'un tap.`;
  else if (reachable.length) s3 = `Prochaine étape : envoyer votre offre pour « ${shortName(reachable[0].title)} », une voie vient de s'ouvrir.`;
  else if (a.offersToAnswer.length) s3 = "Prochaine étape : répondre aux offres reçues, je vous suggère un prix.";
  else if (a.dealsInProgress.length) s3 = `Je suis « ${shortName(a.dealsInProgress[0].title)} » et je vous préviens à chaque étape.`;
  else if (a.watching.length) s3 = "Je surveille les voies de contact et je vous préviens dès qu'une s'ouvre.";
  else if (total > 0) s3 = "Je surveille les réponses et je vous préviens dès qu'il y a du nouveau.";
  else s3 = tip;

  // --- Sections de la carte
  const sections: BriefingSection[] = [];
  const doing: BriefingItem[] = [
    ...a.transmitted.slice(0, 2).map((t): BriefingItem => ({ label: shortName(t.title), detail: `Offre transmise · il y a ${hoursLabel(t.hours)}`, tone: t.nudgeDue ? "warn" : "info" })),
    ...a.waitingOnSeller.slice(0, 2).map((t): BriefingItem => ({ label: shortName(t.title), detail: `Offre en attente · il y a ${hoursLabel(t.hours)}`, tone: "info" })),
    ...a.dealsInProgress.slice(0, 2).map((d): BriefingItem => ({ label: shortName(d.title), detail: d.role === "seller" ? "Commande à préparer" : "Commande en cours", tone: "ok" })),
    ...a.offersToAnswer.slice(0, 2).map((o): BriefingItem => ({ label: shortName(o.title), detail: "Offre reçue à traiter", tone: "warn" })),
  ].slice(0, 3);
  if (doing.length) sections.push({ key: "activities", title: "Ce que je fais", items: doing });
  if (a.watching.length) {
    sections.push({
      key: "watch", title: "Mes veilles",
      items: a.watching.slice(0, 3).map((w): BriefingItem => ({ label: shortName(w.title), detail: w.reachable ? "Voie de contact ouverte" : "Contact recherché", tone: w.reachable ? "ok" : "info" })),
    });
  }
  if (a.transmitted.length) {
    sections.push({
      key: "contacts", title: "Contacts",
      items: a.transmitted.slice(0, 3).map((t): BriefingItem => ({ label: shortName(t.title), detail: t.nudgeDue ? "Relance possible maintenant" : "Réponse attendue", tone: t.nudgeDue ? "warn" : "info" })),
    });
  }
  const next: BriefingItem[] = [];
  if (nudge.length) next.push({ label: "Relancer", detail: shortName(nudge[0].title), tone: "warn" });
  if (reachable.length) next.push({ label: "Envoyer l'offre", detail: shortName(reachable[0].title), tone: "ok" });
  if (a.offersToAnswer.length) next.push({ label: "Répondre", detail: plural(a.offersToAnswer.length, "offre reçue", "offres reçues"), tone: "warn" });
  if (a.dealsInProgress.length) next.push({ label: "Suivre", detail: shortName(a.dealsInProgress[0].title), tone: "ok" });
  if (!next.length) next.push({ label: "Prochain point", detail: "Dès qu'il y a du nouveau", tone: "info" });
  sections.push({ key: "next", title: "Prochaines étapes", items: next.slice(0, 3) });

  // --- Boutons (3 au plus, le plus utile d'abord)
  const actions: BriefingAction[] = [];
  const ref = (r: ThreadRef & { title: string; role?: "buyer" | "seller" }) => ({
    article_id: r.articleId, thread_id: r.threadId, negotiation_id: r.negotiationId, role: r.role ?? ("buyer" as const), title: shortName(r.title, 60),
  });
  if (nudge[0]?.negotiationId) actions.push({ id: `relancer:${nudge[0].negotiationId}`, label: "Relancer le vendeur", ...ref(nudge[0]) });
  if (reachable[0]?.negotiationId) actions.push({ id: `envoyer-offre:${reachable[0].negotiationId}`, label: "Envoyer mon offre", ...ref(reachable[0]) });
  if (a.offersToAnswer[0]) actions.push({ id: `ouvrir-deal:${a.offersToAnswer[0].threadId}?role=seller`, label: "Répondre aux offres", ...ref({ ...a.offersToAnswer[0], role: "seller" }) });
  if (a.dealsInProgress[0]) actions.push({ id: `ouvrir-deal:${a.dealsInProgress[0].threadId}`, label: "Suivre ma commande", ...ref(a.dealsInProgress[0]) });
  if (!actions.length) {
    actions.push({ id: "aide:acheter", label: "Chercher un produit" }, { id: "aide:vendre", label: "Vendre un article" });
  }
  if (actions.length < 3) actions.push({ id: "avatar:reglages", label: "Régler mes points" });

  return {
    kind,
    greeting: s1,
    sentences: [s1, s2, s3],
    sections,
    actions: actions.slice(0, 3),
    tip,
    digest: activityDigest(a),
    hasActionable: nudge.length > 0 || reachable.length > 0 || a.offersToAnswer.length > 0,
    generatedAt: now.toISOString(),
  };
}

/** Texte brut d'un point (notifications, aperçu de conversation) : les 3 phrases. */
export const briefingText = (b: Pick<Briefing, "sentences">) => b.sentences.join(" ");
