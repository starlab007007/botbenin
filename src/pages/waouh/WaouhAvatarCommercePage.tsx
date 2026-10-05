import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  Handshake,
  Loader2,
  MapPin,
  Pause,
  Play,
  Zap,
  Radar,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getWaouhSessionId } from "@/app-mobile/hooks/useWaouhIdentity";
import { WaouhNexusContactSheet } from "@/components/waouh/WaouhNexusContactSheet";
import {
  globalNexusDiscovery,
  prepareNexusContact,
  sendNexusDiscoveryContact,
  createNexusMandate,
  listNexusMandates,
  listNexusOpportunityJourneys,
  updateNexusMandate,
  runNexusMandate,
  type NexusDiscoveryResult,
  type NexusAvatarMandate,
  type NexusOpportunityJourney,
} from "@/lib/waouh/nexus";

type Mode = "acheter" | "vendre" | "demander";

const modeCopy: Record<Mode, { title: string; subtitle: string; cta: string; sellers: boolean }> = {
  acheter: {
    title: "Acheter avec mon Avatar",
    subtitle: "Votre Avatar recherche, compare et ouvre un Deal Room seulement quand une vraie négociation commence.",
    cta: "Chercher pour moi",
    sellers: true,
  },
  vendre: {
    title: "Vendre avec mon Avatar",
    subtitle: "Votre Avatar cherche des acheteurs pertinents et protège vos coordonnées jusqu’au bon moment.",
    cta: "Trouver des acheteurs",
    sellers: false,
  },
  demander: {
    title: "Demander à mon Avatar",
    subtitle: "Service, prestation, emploi ou besoin libre : l’Avatar explore le marché et prépare la mise en relation.",
    cta: "Explorer",
    sellers: true,
  },
};

const evidenceText = (item: NexusDiscoveryResult, keys: string[]) => {
  const evidence = (item.evidence || {}) as Record<string, unknown>;
  for (const key of keys) {
    const value = evidence[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text && text !== "null") return text;
  }
  return "";
};

const evidencePhotos = (item: NexusDiscoveryResult) => {
  const evidence = (item.evidence || {}) as Record<string, unknown>;
  const values: unknown[] = [];
  if (Array.isArray(evidence.photos)) values.push(...evidence.photos);
  values.push(evidence.image_url, evidence.photo, evidence.thumbnail);
  return [...new Set(values
    .map((value) => String(value || "").trim())
    .filter((value) => /^https?:\/\//i.test(value)))].slice(0, 4);
};

const avatarMarketIntelligence = (item: NexusDiscoveryResult) => {
  const explicitMarket = evidenceText(item, ["market_comparison", "market_line", "marche_reel", "market_analysis"]);
  const explicitComparison = evidenceText(item, ["comparative_analysis", "analyse_comparative", "deal_label"]);
  const explicitRecommendation = evidenceText(item, ["recommendation", "recommandation", "advice", "conseil", "ai_note"]);
  const details = evidenceText(item, ["details", "description", "summary", "raw_text"]);
  const reasons = item.scores?.reasons || [];
  const source = sourceLabel(item.source_key);
  const priceFacts = [
    item.price_min != null || item.price_max != null
      ? `prix observé ${Math.round(item.price_min ?? item.price_max ?? 0)}${item.price_max != null && item.price_min != null && item.price_max !== item.price_min ? `–${Math.round(item.price_max)}` : ""} FCFA`
      : null,
    item.scores?.price_score != null ? `score prix ${Math.round(item.scores.price_score)}%` : null,
    `source ${source}`,
  ].filter(Boolean).join(" · ");
  const comparison = [
    item.scores?.total_score != null ? `match ${Math.round(item.scores.total_score)}%` : null,
    item.scores?.relevance_score != null ? `pertinence ${Math.round(item.scores.relevance_score)}%` : null,
    item.scores?.trust_score != null ? `confiance ${Math.round(item.scores.trust_score)}%` : null,
    `contact ${item.contact_policy.level}`,
  ].filter(Boolean).join(" · ");
  return {
    details: details || [item.category, item.city].filter(Boolean).join(" · ") || "Aucun détail complémentaire n’est fourni par la source.",
    market: explicitMarket || priceFacts,
    comparison: explicitComparison || `Signal Fabric · ${comparison}`,
    recommendation:
      explicitRecommendation ||
      reasons.slice(0, 3).join(" · ") ||
      "Vérifier disponibilité, état et conditions avant l’accord.",
  };
};

const sourceLabel = (key?: string | null) => {
  const value = String(key || "").toLowerCase();
  if (value.includes("partner")) return "Partenaire";
  if (value.includes("radar")) return "Radar";
  if (value.includes("whatsapp")) return "WhatsApp";
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("google")) return "Google";
  if (value.includes("agent")) return "Agent IA";
  return "NEXUS";
};

const canonicalDealCandidate = (item: NexusDiscoveryResult) => {
  const source = String(item.source_key || "").toLowerCase();
  const canonicalSource = ["waouh_app", "partner", "whatsapp"].includes(source);
  if (!canonicalSource) return false;
  return item.fabric_id.startsWith("article:") || item.fabric_id.startsWith("catalog:");
};

const journeyBusinessPhase = (journey: NexusOpportunityJourney) => {
  switch (String(journey.last_action || "")) {
    case "payment_completed": return "Terminé";
    case "delivery_completed": return "Paiement";
    case "courier_picked_up": return "Livraison";
    case "courier_assigned": return "Livreur";
    case "preparation_ready_for_courier": return "Préparation";
    case "seller_confirmed": return "Confirmation vendeur";
    case "agreement_reached":
    case "canonical_agreement": return "Accord";
    case "canonical_counterparty_counterproposal":
    case "counterparty_reply_received": return "Négociation";
  }
  return ({
    discovered: "Trouvée",
    enriching: "Vérification",
    contact_ready: "Contact prêt",
    contacting: "Contact en cours",
    waiting_reply: "Réponse attendue",
    negotiating: "Négociation",
    agreed: "Accord",
    executing: "Exécution",
    completed: "Terminé",
    cancelled: "Annulé",
  } as Record<string, string>)[journey.stage] || journey.stage.replaceAll("_", " ");
};

export default function WaouhAvatarCommercePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const rawMode = (useParams().mode || "demander") as Mode;
  const mode: Mode = rawMode in modeCopy ? rawMode : "demander";
  const copy = modeCopy[mode];

  const [goal, setGoal] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [results, setResults] = useState<NexusDiscoveryResult[]>([]);
  const [sourceMix, setSourceMix] = useState<Record<string, number>>({});
  const [rationale, setRationale] = useState("");
  const [offerItem, setOfferItem] = useState<NexusDiscoveryResult | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [autonomyMode, setAutonomyMode] = useState<"assisted" | "semi_autonomous" | "autonomous">("semi_autonomous");
  const [maxContacts, setMaxContacts] = useState(3);
  const [maxFollowups, setMaxFollowups] = useState(1);
  const [allowSmsRcs, setAllowSmsRcs] = useState(false);
  const [mandateBusy, setMandateBusy] = useState(false);
  const [activeMandate, setActiveMandate] = useState<NexusAvatarMandate | null>(null);
  const [journeys, setJourneys] = useState<NexusOpportunityJourney[]>([]);
  const [journeysBusy, setJourneysBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void listNexusMandates()
      .then((data) => {
        if (!alive) return;
        const current = (data.mandates || []).find((m) => m.status === "active" || m.status === "paused") || null;
        setActiveMandate(current);
        if (current) {
          setAutonomyMode(current.autonomy_mode);
          setMaxContacts(current.max_contacts || 3);
          setMaxFollowups(current.max_followups ?? 1);
          setAllowSmsRcs(current.allow_sms_rcs === true);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    setJourneysBusy(true);
    void listNexusOpportunityJourneys({ limit: 12 })
      .then((data) => {
        if (alive) setJourneys(data.journeys || []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setJourneysBusy(false);
      });
    return () => { alive = false; };
  }, []);

  const refreshJourneys = async () => {
    setJourneysBusy(true);
    try {
      const data = await listNexusOpportunityJourneys({ limit: 12 });
      setJourneys(data.journeys || []);
    } finally {
      setJourneysBusy(false);
    }
  };

  const sources = useMemo(
    () => Object.entries(sourceMix).filter(([, count]) => Number(count) > 0),
    [sourceMix]
  );

  const search = async () => {
    const query = goal.trim();
    if (!query) return;
    setBusy(true);
    try {
      const response = await globalNexusDiscovery({
        query,
        mode: mode === "vendre" ? "find_buyers" : mode === "demander" ? "auto" : "find_sellers",
        city: city.trim() || undefined,
        budget_max: Number(budget) || undefined,
        limit: 18,
        refresh_external: true,
        smart: true,
      });
      setResults(response.results || []);
      setSourceMix(response.source_mix || {});
      setRationale(response.intelligence?.rationale || response.explanation || "");
    } catch (error: any) {
      toast({
        title: "Recherche indisponible",
        description: error?.message || String(error),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const createMandate = async () => {
    const query = goal.trim();
    if (!query || mandateBusy) return;
    setMandateBusy(true);
    try {
      const response = await createNexusMandate({
        mode: mode === "vendre" ? "sell" : mode === "demander" ? "ask" : "buy",
        goal: query,
        autonomy_mode: autonomyMode,
        city: city.trim() || undefined,
        budget_max: Number(budget) || undefined,
        max_contacts: maxContacts,
        max_followups: autonomyMode === "assisted" ? 0 : maxFollowups,
        duration_hours: 24,
        scan_interval_minutes: 60,
        min_match_score: 70,
        min_actionability_score: 65,
        allow_waouh: true,
        allow_whatsapp: true,
        allow_public_business: true,
        allow_blind_message: true,
        allow_sms_rcs: allowSmsRcs,
        origin_surface: "web_avatar_commerce",
      });
      setActiveMandate(response.mandate);
      if (response.results?.length) {
        setResults(response.results);
        const mix = response.results.reduce<Record<string, number>>((acc, row) => {
          acc[row.source_key] = (acc[row.source_key] || 0) + 1;
          return acc;
        }, {});
        setSourceMix(mix);
      }
      toast({
        title: "Mandat confié à Bot",
        description: autonomyMode === "assisted"
          ? "Bot surveille et prépare ; vous validez chaque contact."
          : `Bot surveille pendant 24 h et peut agir dans les limites fixées · ${response.actionable_count} opportunité(s) déjà actionnable(s).`,
      });
    } catch (error: any) {
      toast({ title: "Mandat non créé", description: error?.message || String(error), variant: "destructive" });
    } finally {
      setMandateBusy(false);
    }
  };

  const toggleMandate = async () => {
    if (!activeMandate || mandateBusy) return;
    setMandateBusy(true);
    try {
      const status = activeMandate.status === "active" ? "paused" : "active";
      const response = await updateNexusMandate(activeMandate.id, { status });
      setActiveMandate(response.mandate);
      toast({ title: status === "active" ? "Mandat repris" : "Mandat en pause" });
    } finally {
      setMandateBusy(false);
    }
  };

  const runMandateNow = async () => {
    if (!activeMandate || mandateBusy) return;
    setMandateBusy(true);
    try {
      const response = await runNexusMandate(activeMandate.id);
      setActiveMandate(response.mandate);
      if (response.results?.length) setResults(response.results);
      toast({ title: "Bot a relancé la recherche", description: `${response.actionable_count} opportunité(s) actionnable(s).` });
    } catch (error: any) {
      toast({ title: "Relance impossible", description: error?.message || String(error), variant: "destructive" });
    } finally {
      setMandateBusy(false);
    }
  };

  const continueWith = async (item: NexusDiscoveryResult, initialOffer?: number) => {
    setWorkingId(item.fabric_id);
    try {
      const evidence = (item.evidence || {}) as Record<string, unknown>;
      const articleId = String(
        (evidence.article_id as string | undefined) ||
          (item.fabric_id.startsWith("article:") ? item.fabric_id.slice("article:".length) : "")
      ).trim();
      const catalogId = String(
        (evidence.catalog_id as string | undefined) ||
          (item.fabric_id.startsWith("catalog:") ? item.fabric_id.slice("catalog:".length) : "")
      ).trim();

      if (canonicalDealCandidate(item) && (articleId || catalogId)) {
        const title = item.subject || item.raw_text || "Annonce";
        const price = item.price_min ?? item.price_max ?? null;
        const sessionId = getWaouhSessionId();
        const { data, error } = await supabase.functions.invoke("waouh-buyer-interest", {
          headers: { "x-waouh-session": sessionId },
          body: {
            ...(articleId ? { article_id: articleId } : {}),
            ...(catalogId ? { catalog_id: catalogId } : {}),
            source: "avatar_commerce",
            ...(initialOffer && initialOffer > 0 ? { offer_price: initialOffer } : {}),
          },
        });
        if (error || data?.error) {
          throw new Error(error?.message || data?.details || data?.error || "Impossible de créer le Deal Room.");
        }
        if (data?.skipped === "self") {
          toast({ title: "Votre propre offre", description: "WAOUH ne crée pas de négociation avec votre propre annonce." });
          return;
        }
        const resolvedArticleId = String(data?.article_id || articleId || "").trim();
        const threadId = String(data?.thread_id || "").trim();
        if (!resolvedArticleId || !threadId) {
          throw new Error("Le writer canonique n’a pas renvoyé article_id + thread_id.");
        }

        const detail = {
          article_id: resolvedArticleId,
          thread_id: threadId,
          negotiation_id: data?.negotiation_id || null,
          deal_id: null,
          kind: "buyer",
          title,
          price,
          city: item.city ?? null,
          seed_text: initialOffer && initialOffer > 0
            ? `Je propose ${Math.round(initialOffer).toLocaleString("fr-FR")} FCFA pour « ${title} ».`
            : `Je suis intéressé par « ${title} ».`,
          source: "avatar_commerce",
        };
        try {
          const raw = localStorage.getItem("waouh_pending_open");
          const items = raw ? JSON.parse(raw) : [];
          const list = Array.isArray(items) ? items : [];
          list.push(detail);
          localStorage.setItem("waouh_pending_open", JSON.stringify(list.slice(-10)));
        } catch {}

        await refreshJourneys().catch(() => {});
        navigate("/app/chat");
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail }));
        }, 60);
        toast({
          title: "Deal Room ouvert",
          description: "Même article, même thread : votre Avatar suit maintenant la négociation jusqu’à la clôture.",
        });
        return;
      }

      const prepared = await prepareNexusContact(item.fabric_id);
      if (!prepared.contact_policy.can_auto_contact &&
          !prepared.contact_policy.can_blind_message &&
          !prepared.contact_policy.can_user_confirm_contact) {
        throw new Error(
          `Le niveau ${prepared.contact_policy.level} autorise la découverte, mais pas encore un contact médié.`
        );
      }

      const message =
        mode === "vendre"
          ? `Bonjour, WAOUH accompagne un vendeur dont l’offre correspond à votre besoin « ${item.subject || goal} ». Souhaitez-vous poursuivre dans WAOUH ?`
          : `Bonjour, WAOUH accompagne un utilisateur intéressé par « ${item.subject || goal} ». Souhaitez-vous poursuivre dans WAOUH ?`;

      await sendNexusDiscoveryContact({
        fabric_id: item.fabric_id,
        message,
        confirmed: true,
      });

      toast({
        title: "Votre Avatar poursuit",
        description: "La prise de contact est médiée par WAOUH ; les coordonnées privées ne sont pas révélées directement.",
      });
    } catch (error: any) {
      toast({
        title: "Impossible de poursuivre",
        description: error?.message || String(error),
        variant: "destructive",
      });
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(79,127,255,.10),transparent_32%),linear-gradient(180deg,#f7faff_0%,#ffffff_52%)]">
      <div className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate("/app/avatar")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/15">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-slate-950">{copy.title}</h1>
            <p className="truncate text-[11px] font-semibold text-slate-500">Avatar · NEXUS · Signal Fabric · Contact Layer</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-4 shadow-[0_20px_60px_-40px_rgba(40,80,160,.45)] sm:p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-xl shadow-blue-500/15">
              <Bot className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black tracking-tight text-slate-950">{copy.title}</h2>
              <p className="mt-1 max-w-2xl text-xs font-semibold leading-relaxed text-slate-500">{copy.subtitle}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="rounded-full bg-white">Contact protégé</Badge>
                <Badge variant="secondary" className="rounded-full bg-white">Deal Graph</Badge>
                <Badge variant="secondary" className="rounded-full bg-white">Paiement après livraison</Badge>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={
              mode === "acheter"
                ? "Ex. Je cherche un Samsung S25 fiable à Cotonou"
                : mode === "vendre"
                  ? "Ex. Je vends 10 sacs de maïs, trouve des acheteurs sérieux"
                  : "Ex. Trouve un plombier disponible demain à Akpakpa"
            }
            className="min-h-24 rounded-2xl"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville (optionnel)" className="rounded-xl" />
            <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget / prix FCFA" inputMode="numeric" className="rounded-xl" />
          </div>
          <Button onClick={() => void search()} disabled={busy || !goal.trim()} className="mt-3 h-12 w-full rounded-2xl">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {copy.cta}
          </Button>
        </section>

        <section className="rounded-[24px] border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-cyan-50/70 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-950">Mandat Avatar · Opportunity OS</div>
              <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
                Autorisez Bot une seule fois : il surveille NEXUS, prépare les contacts, agit dans vos limites et revient quand une vraie réponse arrive.
              </p>
            </div>
          </div>

          {activeMandate ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white p-3 text-center">
                  <div className="text-[9px] font-bold uppercase text-slate-400">Contactés</div>
                  <div className="mt-1 text-xl font-black text-violet-700">{activeMandate.contacted_count}</div>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center">
                  <div className="text-[9px] font-bold uppercase text-slate-400">Réponses</div>
                  <div className="mt-1 text-xl font-black text-emerald-700">{activeMandate.replied_count}</div>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center">
                  <div className="text-[9px] font-bold uppercase text-slate-400">Mode</div>
                  <div className="mt-1 text-[11px] font-black text-slate-900">
                    {activeMandate.autonomy_mode === "assisted" ? "Assisté" : activeMandate.autonomy_mode === "autonomous" ? "Autonome" : "Semi-auto"}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-violet-100 bg-white p-3">
                <div className="text-xs font-black text-slate-900">{activeMandate.goal}</div>
                <div className="mt-1 text-[10px] text-slate-500">
                  Jusqu’à {activeMandate.max_contacts} contacts · expire {new Date(activeMandate.expires_at).toLocaleString("fr-FR")}
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white p-3">
                <div>
                  <div className="text-xs font-black text-slate-900">SMS/RCS consentis</div>
                  <div className="text-[10px] text-slate-500">Uniquement les numéros ayant déjà un consentement Native Messaging actif.</div>
                </div>
                <input
                  type="checkbox"
                  checked={activeMandate.allow_sms_rcs === true}
                  disabled={mandateBusy}
                  onChange={async (e) => {
                    const value = e.target.checked;
                    setMandateBusy(true);
                    try {
                      const response = await updateNexusMandate(activeMandate.id, { allow_sms_rcs: value });
                      setActiveMandate(response.mandate);
                      setAllowSmsRcs(value);
                    } finally {
                      setMandateBusy(false);
                    }
                  }}
                  className="h-5 w-5 accent-violet-600"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" disabled={mandateBusy} onClick={() => void toggleMandate()} className="rounded-xl">
                  {activeMandate.status === "active" ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {activeMandate.status === "active" ? "Mettre en pause" : "Reprendre"}
                </Button>
                <Button disabled={mandateBusy || activeMandate.status !== "active"} onClick={() => void runMandateNow()} className="rounded-xl">
                  {mandateBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
                  Chercher maintenant
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-500">Mode d’autonomie</div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["assisted", "Assisté", "Vous validez"],
                    ["semi_autonomous", "Semi-auto", "Recommandé"],
                    ["autonomous", "Autonome", "Dans le mandat"],
                  ] as const).map(([value, label, note]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAutonomyMode(value);
                        if (value === "assisted") setMaxFollowups(0);
                        else if (maxFollowups === 0) setMaxFollowups(value === "autonomous" ? 2 : 1);
                      }}
                      className={`rounded-2xl border p-2.5 text-left transition ${autonomyMode === value ? "border-violet-500 bg-violet-50 ring-1 ring-violet-200" : "border-slate-200 bg-white"}`}
                    >
                      <div className="text-[11px] font-black text-slate-900">{label}</div>
                      <div className="mt-0.5 text-[9px] font-semibold text-slate-400">{note}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                  <div>
                    <div className="text-xs font-black">Contacts maximum</div>
                    <div className="text-[10px] text-slate-500">Plafond cumulé du mandat.</div>
                  </div>
                  <select
                    value={maxContacts}
                    onChange={(e) => setMaxContacts(Number(e.target.value))}
                    className="h-10 rounded-xl border bg-white px-3 text-sm font-bold"
                  >
                    {[1, 3, 5, 10, 20].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                  <div>
                    <div className="text-xs font-black">Relances maximum</div>
                    <div className="text-[10px] text-slate-500">Au moins 24 h entre deux relances.</div>
                  </div>
                  <select
                    value={autonomyMode === "assisted" ? 0 : maxFollowups}
                    disabled={autonomyMode === "assisted"}
                    onChange={(e) => setMaxFollowups(Number(e.target.value))}
                    className="h-10 rounded-xl border bg-white px-3 text-sm font-bold disabled:opacity-60"
                  >
                    {[0, 1, 2, 3, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div>
                  <div className="text-xs font-black text-slate-900">Autoriser SMS/RCS consentis</div>
                  <div className="text-[10px] text-slate-500">
                    Désactivé par défaut. Bot l’utilise seulement si la contrepartie a déjà accepté ce canal.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowSmsRcs}
                  onChange={(e) => setAllowSmsRcs(e.target.checked)}
                  className="h-5 w-5 accent-violet-600"
                />
              </label>
              <Button
                className="h-12 w-full rounded-2xl bg-violet-600 hover:bg-violet-700"
                disabled={mandateBusy || !goal.trim()}
                onClick={() => void createMandate()}
              >
                {mandateBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                Confier cette mission à Bot pendant 24 h
              </Button>
              <p className="text-center text-[10px] font-semibold text-slate-500">
                Aucun paiement, changement de budget ou révélation de contact privé n’est autorisé par ce mandat.
              </p>
            </div>
          )}
        </section>

        {(rationale || sources.length > 0) && (
          <section className="rounded-[22px] border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex items-center gap-2 text-xs font-black text-slate-950">
              <Sparkles className="h-4 w-4 text-blue-600" /> Votre Avatar a étudié le marché
            </div>
            {rationale && <p className="mt-2 text-[11px] font-semibold text-slate-600">{rationale}</p>}
            {sources.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sources.slice(0, 8).map(([source, count]) => (
                  <Badge key={source} variant="outline" className="rounded-full bg-white text-[10px]">
                    {sourceLabel(source)} · {count}
                  </Badge>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="space-y-3">
          {results.map((item, index) => {
            const reasons = item.scores?.reasons || [];
            const intelligence = avatarMarketIntelligence(item);
            const photos = evidencePhotos(item);
            return (
              <article key={item.fabric_id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                {photos.length > 0 && (
                  <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                    <img src={photos[0]} alt={item.subject || "Opportunité WAOUH"} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 font-black text-blue-600">#{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-slate-950">{item.subject || item.raw_text || "Opportunité WAOUH"}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span>{sourceLabel(item.source_key)}</span>
                      {item.city && <span>· {item.city}</span>}
                      <span>· {item.contact_policy.level}</span>
                      {(item.readiness_level || item.contact_pack?.readiness_level) && <span>· {item.readiness_level || item.contact_pack?.readiness_level}</span>}
                      {item.actionability_score != null && <span>· Action {Math.round(item.actionability_score)}%</span>}
                    </div>
                  </div>
                  <div className="text-sm font-black text-blue-600">{Math.round(item.scores?.total_score || 0)}%</div>
                </div>

                {(item.next_best_action || item.contact_pack?.next_best_action) && (
                  <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
                    <div className="text-[9px] font-black uppercase text-violet-700">Action recommandée par Bot</div>
                    <div className="mt-1 text-xs font-black text-violet-950">
                      {(item.next_best_action || item.contact_pack?.next_best_action) === "CONTACT_NOW" ? "Contacter maintenant" :
                       (item.next_best_action || item.contact_pack?.next_best_action) === "OPEN_DEAL_ROOM" ? "Ouvrir le Deal Room" :
                       (item.next_best_action || item.contact_pack?.next_best_action) === "WAIT_REPLY" ? "Attendre la réponse" :
                       (item.next_best_action || item.contact_pack?.next_best_action) === "NEGOTIATE" ? "Négocier" :
                       "Enrichir le contact"}
                      {(item.best_channel || item.contact_pack?.best_channel) ? ` · ${item.best_channel || item.contact_pack?.best_channel}` : ""}
                    </div>
                  </div>
                )}

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    ["Détails", intelligence.details, "bg-slate-50 text-slate-800"],
                    ["Marché réel", intelligence.market, "bg-emerald-50/70 text-emerald-950"],
                    ["Analyse comparative", intelligence.comparison, "bg-blue-50/70 text-blue-950"],
                    ["Pourquoi WAOUH recommande", intelligence.recommendation, "bg-amber-50/80 text-amber-950"],
                  ].map(([label, value, tone]) => (
                    <div key={label} className={`rounded-2xl p-3 ${tone}`}>
                      <div className="text-[9px] font-bold uppercase tracking-wide opacity-65">{label}</div>
                      <div className="mt-1 text-xs font-bold leading-relaxed">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-[10px] font-semibold text-slate-600">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
                  La mise en relation reste médiée par WAOUH selon le niveau {item.contact_policy.level}. Les coordonnées privées ne sont pas révélées directement.
                </div>

                {item.source_key === "waouh_app" ? (
                  <Button
                    onClick={() => {
                      setOfferItem(item);
                      const displayed = item.price_min ?? item.price_max;
                      setOfferAmount(displayed != null ? String(Math.round(displayed)) : "");
                    }}
                    disabled={workingId === item.fabric_id}
                    className="mt-3 h-11 w-full rounded-2xl"
                  >
                    {workingId === item.fabric_id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Handshake className="mr-2 h-4 w-4" />
                    )}
                    Je suis intéressé
                  </Button>
                ) : (
                  <div className="mt-3 [&_button]:h-11 [&_button]:w-full [&_button]:rounded-2xl">
                    <WaouhNexusContactSheet
                      fabricId={item.fabric_id}
                      title={item.subject || item.raw_text || "Opportunité WAOUH"}
                      sourceUrl={item.source_url}
                      contactabilityLevel={item.contact_policy.level}
                      mode={mode === "vendre" ? "sell" : mode === "demander" ? "ask" : "buy"}
                    />
                  </div>
                )}
                </div>
              </article>
            );
          })}
        </div>

        <Dialog open={!!offerItem} onOpenChange={(open) => !open && setOfferItem(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Votre Avatar ouvre la négociation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Proposez votre prix. WAOUH transmet l’offre, suit la réponse et vous guide jusqu’à l’accord puis l’exécution du deal.
              </p>
              {offerItem && (
                <div className="rounded-2xl border bg-slate-50 p-3">
                  <div className="font-semibold">{offerItem.subject || offerItem.raw_text || "Opportunité"}</div>
                  {(offerItem.price_min != null || offerItem.price_max != null) && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Prix observé : {Math.round(offerItem.price_min ?? offerItem.price_max ?? 0).toLocaleString("fr-FR")} FCFA
                    </div>
                  )}
                </div>
              )}
              <Input
                value={offerAmount}
                onChange={(event) => setOfferAmount(event.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="Votre proposition en FCFA"
              />
              <Button
                className="h-12 w-full rounded-2xl"
                disabled={!offerItem || Number(offerAmount) <= 0 || workingId === offerItem?.fabric_id}
                onClick={() => {
                  if (!offerItem) return;
                  const item = offerItem;
                  const amount = Number(offerAmount);
                  setOfferItem(null);
                  void continueWith(item, amount);
                }}
              >
                <Handshake className="mr-2 h-4 w-4" />
                Envoyer mon offre et ouvrir le Deal Room
              </Button>
              <p className="text-xs font-semibold text-emerald-700">
                Votre Avatar reste actif jusqu’à la conclusion de l’accord.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {!busy && goal && results.length === 0 && (
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 text-center">
            <MapPin className="mx-auto h-8 w-8 text-blue-500" />
            <div className="mt-2 text-sm font-black text-slate-950">Pas encore de correspondance assez fiable</div>
            <p className="mt-1 text-xs font-semibold text-slate-500">Élargissez la zone ou laissez une mission/veille active.</p>
          </div>
        )}
      </div>
    </main>
  );
}
