import { openCommerceDiscussion } from "@/lib/waouh/discussionNavigation";
import { WaouhOfferComparison } from "@/components/waouh/WaouhOfferComparison";
import { progressiveNexusDiscovery } from "@/lib/waouh/progressiveDiscovery";
import { WaouhDiscoveryCoverage, type DiscoveryRefresh } from "@/components/waouh/WaouhDiscoveryCoverage";
import "@/components/waouh/waouh-message-text.css";
import { WaouhJourneyProgress } from "@/components/waouh/WaouhJourneyProgress";
import { userFacingErrorText } from "@/lib/userFacingError";
import { useEffect, useMemo, useRef, useState } from "react";
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
  getNexusSources,
  type NexusSourceStatus,
  listNexusOwnedArticles,
  bindNexusJourneyArticle,
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
    title: "Acheter avec Bot",
    subtitle: "Bot compare les offres et prépare votre négociation.",
    cta: "Chercher pour moi",
    sellers: true,
  },
  vendre: {
    title: "Vendre avec Bot",
    subtitle: "Bot trouve des acheteurs. Vos coordonnées restent protégées.",
    cta: "Trouver des acheteurs",
    sellers: false,
  },
  demander: {
    title: "Trouver avec Bot",
    subtitle: "Un service, un emploi, un besoin : Bot cherche pour vous.",
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
    case "terms_required": return "Offre ou devis à préciser";
    case "deal_room_retry": return "Ouverture à reprendre";
    case "deal_room_opening": return "Ouverture de la Deal Room";
    case "person_contact_cooldown": return "Contact déjà sollicité";
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
  } as Record<string, string>)[journey.stage] || journey.stage.replace(/_/g, " ");
};

export default function WaouhAvatarCommercePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const rawMode = (useParams().mode || "demander") as Mode;
  const mode: Mode = rawMode in modeCopy ? rawMode : "demander";
  const copy = modeCopy[mode];

  const [ownedArticles, setOwnedArticles] = useState<Array<{ id: string; title: string; price: number }>>([]);
  const [selectedArticle, setSelectedArticle] = useState("");
  const [priceFloor, setPriceFloor] = useState("");
  useEffect(() => { if (mode === "vendre") void listNexusOwnedArticles().then(data => setOwnedArticles(data.articles)).catch(() => {}); }, [mode]);

  const [goal, setGoal] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [refreshCoverage, setRefreshCoverage] = useState<DiscoveryRefresh>({});
  const [results, setResults] = useState<NexusDiscoveryResult[]>([]);
  const [channelHealth, setChannelHealth] = useState<NexusSourceStatus["channels"]>({});
  useEffect(() => { void getNexusSources().then(data => setChannelHealth(data.channels || {})).catch(() => {}); }, []);
  const [sourceMix, setSourceMix] = useState<Record<string, number>>({});
  const [rationale, setRationale] = useState("");
  const [offerItem, setOfferItem] = useState<NexusDiscoveryResult | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [autonomyMode, setAutonomyMode] = useState<"assisted" | "semi_autonomous" | "autonomous">("semi_autonomous");
  const [maxContacts, setMaxContacts] = useState(3);
  const [maxFollowups, setMaxFollowups] = useState(1);
  const [allowSmsRcs, setAllowSmsRcs] = useState(false);
  const [allowWhatsapp, setAllowWhatsapp] = useState(false);
  const [allowBusiness, setAllowBusiness] = useState(false);
  const [allowMediation, setAllowMediation] = useState(true);
  const [completionGoal, setCompletionGoal] = useState<"transaction" | "agreement" | "recommendations">("agreement");
  const [durationHours, setDurationHours] = useState(72);
  const [quantity, setQuantity] = useState(1);
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [acceptanceTerms, setAcceptanceTerms] = useState("");
  const [mandates, setMandates] = useState<NexusAvatarMandate[]>([]);
  const [newMission, setNewMission] = useState(false);
  const [mandateBusy, setMandateBusy] = useState(false);
  const [activeMandate, setActiveMandate] = useState<NexusAvatarMandate | null>(null);
  const [journeys, setJourneys] = useState<NexusOpportunityJourney[]>([]);
  const [journeysBusy, setJourneysBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void listNexusMandates()
      .then((data) => {
        if (!alive) return;
        const current = (data.mandates || []).find((m) => (m.status === "active" || m.status === "paused") && m.mode === (mode === "vendre" ? "sell" : mode === "demander" ? "ask" : "buy")) || null;
        setMandates(data.mandates || []);
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
  }, [mode]);

  useEffect(() => {
    let alive = true;
    let loading = false;
    const refresh = async () => {
      if (loading || document.visibilityState === "hidden") return;
      loading = true;
      try {
        const [data, missions] = await Promise.all([
          listNexusOpportunityJourneys({ limit: 50, include_completed: true }), listNexusMandates(),
        ]);
        if (!alive) return;
        setJourneys(data.journeys || []);
        setMandates(missions.mandates || []);
        if (activeMandate?.id) setActiveMandate(missions.mandates.find(m => m.id === activeMandate.id) || null);
      } catch { /* Existing results remain visible; manual refresh is available. */ }
      finally { loading = false; if (alive) setJourneysBusy(false); }
    };
    setJourneysBusy(true);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [activeMandate?.id]);

  const refreshJourneys = async () => {
    setJourneysBusy(true);
    try {
      const data = await listNexusOpportunityJourneys({ limit: 50, include_completed: true });
      setJourneys(data.journeys || []);
    } finally { setJourneysBusy(false); }
  };

  const sources = useMemo(
    () => Object.entries(sourceMix).filter(([, count]) => Number(count) > 0),
    [sourceMix]
  );

  const searchVersion = useRef(0);
  useEffect(() => {
    searchVersion.current += 1;
    setResults([]); setSourceMix({}); setRefreshCoverage({}); setRationale(""); setSearchCompleted(false); setBusy(false);
    return () => { searchVersion.current += 1; };
  }, [mode]);

  const search = async () => {
    const query = goal.trim();
    if (!query || busy) return;
    const version = ++searchVersion.current;
    setBusy(true);
    try {
      const response = await progressiveNexusDiscovery({
        query,
        mode: mode === "vendre" ? "find_buyers" : mode === "demander" ? "auto" : "find_sellers",
        city: city.trim() || undefined,
        budget_max: Number(budget) || undefined,
        limit: 18,
        refresh_external: true,
        smart: true,
      }, indexed => {
        if (version !== searchVersion.current) return;
        setResults(indexed.results || []);
        setSourceMix(indexed.source_mix || {});
        setRefreshCoverage({});
        setSearchCompleted(true);
      });
      if (version !== searchVersion.current) return;
      setResults(response.results || []);
      setRefreshCoverage(response.refresh || {});
      setSearchCompleted(true);
      setSourceMix(response.source_mix || {});
      setRationale(response.intelligence?.rationale || response.explanation || "");
    } catch (error: any) {
      if (version !== searchVersion.current) return;
      toast({
        title: "Recherche indisponible",
        description: userFacingErrorText(error, "load"),
        variant: "destructive",
      });
    } finally {
      if (version === searchVersion.current) setBusy(false);
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
        article_id: mode === "vendre" ? selectedArticle : undefined,
        price_floor: mode === "vendre" ? Number(priceFloor) || undefined : undefined,
        autonomy_mode: autonomyMode,
        city: city.trim() || undefined,
        budget_max: Number(budget) || undefined,
        max_contacts: maxContacts,
        max_followups: autonomyMode === "assisted" ? 0 : maxFollowups,
        duration_hours: durationHours,
        completion_goal: completionGoal,
        quantity, delivery_terms: deliveryTerms, acceptance_terms: acceptanceTerms,
        scan_interval_minutes: 60,
        min_match_score: 70,
        min_actionability_score: 65,
        allow_waouh: true,
        allow_whatsapp: allowWhatsapp,
        allow_public_business: allowBusiness,
        allow_blind_message: allowMediation,
        allow_sms_rcs: allowSmsRcs,
        origin_surface: "web_avatar_commerce",
      });
      setNewMission(false);
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
          : `Bot surveille pendant ${durationHours} h et peut agir dans les limites fixées · ${response.actionable_count} opportunité(s) déjà actionnable(s).`,
      });
    } catch (error: any) {
      toast({ title: "Mandat non créé", description: userFacingErrorText(error, "save"), variant: "destructive" });
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
      toast({ title: "Relance impossible", description: userFacingErrorText(error, "send"), variant: "destructive" });
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
        await refreshJourneys().catch(() => {});
        openCommerceDiscussion(detail, navigate);
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

      const sent = await sendNexusDiscoveryContact({
        fabric_id: item.fabric_id,
        mode: mode === "vendre" ? "sell" : mode === "demander" ? "ask" : "buy",
        message,
        confirmed: true,
      });
      if (sent.journey) setJourneys(previous => [sent.journey!, ...previous.filter(j => j.id !== sent.journey!.id)]);

      toast({
        title: "Votre Avatar poursuit",
        description: "La prise de contact est médiée par WAOUH ; les coordonnées privées ne sont pas révélées directement.",
      });
    } catch (error: any) {
      toast({
        title: "Impossible de poursuivre",
        description: userFacingErrorText(error, "send"),
        variant: "destructive",
      });
    } finally {
      setWorkingId(null);
    }
  };

  const [articleJourney, setArticleJourney] = useState<NexusOpportunityJourney | null>(null);
  const openJourney = (journey: NexusOpportunityJourney) => {
    if (journey.last_action === "article_selection_required" && journey.mode === "sell") {
      void listNexusOwnedArticles().then(data => { setOwnedArticles(data.articles); setArticleJourney(journey); });
      return;
    }
    const threadId = String(journey.thread_id || "").trim();
    if (!threadId) {
      toast({
        title: journeyBusinessPhase(journey),
        description: journey.last_message || "Avatar poursuit cette démarche.",
      });
      return;
    }
    const detail = {
      article_id: journey.article_id || null,
      thread_id: threadId,
      negotiation_id: journey.negotiation_id || null,
      deal_id: journey.deal_id || null,
      kind: journey.mode === "sell" ? "seller" : "buyer",
      title: journey.subject || "Démarche WAOUH",
      source: "avatar_opportunity",
    };
    openCommerceDiscussion(detail, navigate);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(79,127,255,.10),transparent_32%),linear-gradient(180deg,#f7faff_0%,#ffffff_52%)]">
      <Dialog open={!!articleJourney} onOpenChange={() => setArticleJourney(null)}>
        <DialogContent><DialogHeader><DialogTitle>Choisir l’article à proposer</DialogTitle></DialogHeader>
          {ownedArticles.length === 0 && <p>Publiez d’abord un article dans WAOUH.</p>}
          {ownedArticles.map(article => <Button key={article.id} variant="outline" onClick={() => {
            if (!articleJourney) return;
            void bindNexusJourneyArticle(articleJourney.id, article.id).then(() => { setArticleJourney(null); void refreshJourneys(); })
              .catch(() => toast({ title: "La mise en relation nécessite une vérification", variant: "destructive" }));
          }}>{article.title} · {article.price} FCFA</Button>)}
        </DialogContent>
      </Dialog>

      <div className="mx-auto w-full max-w-5xl space-y-3 px-3 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate("/app/avatar")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/15">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-slate-950">{copy.title}</h1>
            <p className="truncate text-[11px] font-semibold text-slate-500">Recherche · Comparaison · Contact protégé</p>
          </div>
        </div>

        <section className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-3 py-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600" />
          <div className="min-w-0">
            <p className="text-xs leading-relaxed text-slate-600">{copy.subtitle}</p>
            <p className="mt-1 text-[11px] font-medium text-blue-700">Contact protégé · Paiement après livraison</p>
          </div>
        </section>

        <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <Textarea
            aria-label="Votre besoin"
            rows={2}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={
              mode === "acheter"
                ? "Quel produit cherchez-vous ?"
                : mode === "vendre"
                  ? "Que souhaitez-vous vendre ?"
                  : "De quoi avez-vous besoin ?"
            }
            className="min-h-[64px] resize-y rounded-xl"
          />
          <details className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-slate-600">Préciser · Ville et budget</summary><div className="grid grid-cols-2 gap-2">
            <Input value={city} onChange={(e) => setCity(e.target.value)} aria-label="Ville (facultative)" placeholder="Ville" className="rounded-xl" />
            <Input value={budget} onChange={(e) => setBudget(e.target.value)} aria-label="Budget ou prix en FCFA" placeholder="Budget FCFA" inputMode="numeric" className="rounded-xl" />
          </div></details>
          <Button onClick={() => void search()} disabled={busy || !goal.trim()} className="mt-2 h-11 w-full rounded-xl">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {copy.cta}
          </Button>
        </section>

        <section className="rounded-[20px] border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-cyan-50/70 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-950">Mission automatique</div>
              <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
                Bot cherche pendant 72 h, dans vos limites.
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <select aria-label="Mission suivie" className="min-w-0 flex-1 rounded-xl border p-2 text-xs" value={newMission ? "" : activeMandate?.id || ""} onChange={e => { setActiveMandate(mandates.find(m => m.id === e.target.value) || null); setNewMission(!e.target.value); }}>
              <option value="">Nouvelle mission</option>
              {mandates.filter(m => m.mode === (mode === "vendre" ? "sell" : mode === "demander" ? "ask" : "buy")).map(m => <option key={m.id} value={m.id}>{m.goal.slice(0, 55)} · {m.status}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={() => { setNewMission(true); setActiveMandate(null); }}>Nouvelle</Button>
          </div>
          {activeMandate && !newMission ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white p-3 text-center">
                  <div className="text-[9px] font-bold uppercase text-slate-400">Sollicitations</div>
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
              {activeMandate.metrics && <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">{[['queued','En file'],['sent','Envoyés'],['delivered','Livrés'],['agreed','Accords'],['completed','Terminés']].map(([key,label]) => <span key={key}>{label} : {activeMandate.metrics?.[key] || 0}</span>)}</div>}
              <div className="rounded-2xl border border-violet-100 bg-white p-3">
                <div className="text-xs font-black text-slate-900">{activeMandate.goal}</div>
                <div className="mt-1 text-[10px] text-slate-500">
                  Objectif : {activeMandate.metadata?.completion_goal === "recommendations" ? "Recommandations" : activeMandate.metadata?.completion_goal === "transaction" ? "Exécution complète" : "Accord confirmé"} · Jusqu’à {activeMandate.max_contacts} contacts · expire {new Date(activeMandate.expires_at).toLocaleString("fr-FR")}
                </div>
              </div>
              <details className="rounded-xl border bg-white p-3 text-xs"><summary>Autorisations et échéance</summary>
                <div className="mt-2 space-y-2">
                {([['allow_whatsapp','WhatsApp vérifié'],['allow_public_business','Contacts professionnels publics'],['allow_blind_message','Mise en relation médiée']] as const).map(([key,label]) => <label key={key} className="flex items-center justify-between gap-2">{label}<input type="checkbox" checked={activeMandate[key]} disabled={mandateBusy || !['active','paused'].includes(activeMandate.status)} onChange={async e => { const value = e.target.checked; setMandateBusy(true); try { const response = await updateNexusMandate(activeMandate.id, { [key]: value }); setActiveMandate(response.mandate); } catch(error) { toast({title:'Modification impossible', description:userFacingErrorText(error,'save'), variant:'destructive'}); } finally { setMandateBusy(false); } }} /></label>)}
                <Button size="sm" variant="outline" disabled={mandateBusy || !!activeMandate.metadata?.agreement_reached_at || ['completed','cancelled'].includes(activeMandate.status)} onClick={async () => { setMandateBusy(true); try { const response = await updateNexusMandate(activeMandate.id, { duration_hours: 72, status: 'active' }); setActiveMandate(response.mandate); } finally { setMandateBusy(false); } }}>Prolonger de 3 jours à partir de maintenant</Button>
                <Button size="sm" variant="outline" disabled={mandateBusy || !['active','paused'].includes(activeMandate.status)} onClick={async () => { setMandateBusy(true); try { const response = await updateNexusMandate(activeMandate.id, { status: 'cancelled' }); setActiveMandate(response.mandate); } finally { setMandateBusy(false); } }}>Arrêter la mission</Button>
                </div>
              </details>
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
                <Button variant="outline" disabled={mandateBusy || !["active", "paused"].includes(activeMandate.status) || !!activeMandate.metadata?.agreement_reached_at} onClick={() => void toggleMandate()} className="rounded-xl">
                  {activeMandate.status === "active" ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {activeMandate.status === "active" ? "Mettre en pause" : "Reprendre"}
                </Button>
                <Button disabled={mandateBusy || activeMandate.status !== "active" || !!activeMandate.metadata?.agreement_reached_at} onClick={() => void runMandateNow()} className="rounded-xl">
                  {mandateBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
                  Chercher maintenant
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <details open={mode === "vendre"} className="avatar-mission-settings rounded-xl border border-violet-100 bg-white/70 px-3">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-xs font-semibold">
                  <span>Réglages de la mission</span>
                  <span className="text-violet-700">{autonomyMode === "assisted" ? "Assisté" : autonomyMode === "autonomous" ? "Autonome" : "Semi-auto"} · {maxContacts} contacts</span>
                </summary>
                <div className="space-y-3 pb-3">
              {mode === "vendre" && <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="avatar-sale-article">Article à vendre</label>
                <select id="avatar-sale-article" value={selectedArticle} onChange={e => setSelectedArticle(e.target.value)} className="w-full rounded-xl border p-3">
                  <option value="">Choisir une annonce active</option>
                  {ownedArticles.map(a => <option key={a.id} value={a.id}>{a.title} · {a.price} FCFA</option>)}
                </select>
                <Input type="number" min="1" value={priceFloor} onChange={e => setPriceFloor(e.target.value)} placeholder="Prix minimum autorisé (FCFA)" aria-label="Prix minimum autorisé" />
                {!ownedArticles.length && <p className="text-sm">Publiez votre article avant de lancer une mission de vente.</p>}
              </div>}
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">Résultat attendu<select aria-label="Résultat attendu" className="mt-1 w-full rounded-xl border p-2" value={completionGoal} onChange={e => setCompletionGoal(e.target.value as typeof completionGoal)}>
                  <option value="recommendations">Recommandations</option><option value="agreement">Accord confirmé</option><option value="transaction">Exécution complète</option>
                </select></label>
                <label className="text-xs">Durée<select aria-label="Durée du mandat" className="mt-1 w-full rounded-xl border p-2" value={durationHours} onChange={e => setDurationHours(Number(e.target.value))}>{[24,72,168,720].map(h => <option key={h} value={h}>{h / 24} jour(s)</option>)}</select></label>
              </div>
              <details className="rounded-xl border bg-white p-3 text-xs"><summary className="cursor-pointer font-semibold">Canaux et conditions</summary>
                <div className="mt-2 space-y-2">
                  <p>WAOUH interne activé. Un canal autorisé reste soumis à sa disponibilité et au consentement.</p>
                  <div className="flex flex-wrap gap-2">{Object.entries(channelHealth || {}).map(([key, health]) => <span key={key}>{health.label} : {health.status === 'available' ? 'disponible' : health.status === 'configured' ? 'configuré, livraison à vérifier' : health.status === 'last_sync_ok' ? 'dernière synchro réussie' : health.status === 'degraded' ? 'synchro en échec' : 'indisponible'}</span>)}</div>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={allowWhatsapp} onChange={e => setAllowWhatsapp(e.target.checked)} /> WhatsApp vérifié</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={allowBusiness} onChange={e => setAllowBusiness(e.target.checked)} /> Contacts professionnels publics</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={allowMediation} onChange={e => setAllowMediation(e.target.checked)} /> Demandes de mise en relation</label>
                  <Input type="number" min={1} max={100000} value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))} aria-label="Quantité" placeholder="Quantité" />
                  <Input value={deliveryTerms} maxLength={1000} onChange={e => setDeliveryTerms(e.target.value)} aria-label="Livraison et délai" placeholder="Lieu, délai, frais de livraison…" />
                  <Input value={acceptanceTerms} maxLength={1000} onChange={e => setAcceptanceTerms(e.target.value)} aria-label="Critères d’acceptation" placeholder="Qualité, livrables, garanties…" />
                </div>
              </details>
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
                      aria-pressed={autonomyMode === value}
                      className={`min-h-11 rounded-xl border p-2 text-left transition ${autonomyMode === value ? "border-violet-500 bg-violet-50 ring-1 ring-violet-200" : "border-slate-200 bg-white"}`}
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
                    aria-label="Contacts maximum"
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
                    aria-label="Relances maximum"
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
                    Désactivé par défaut. Uniquement avec le consentement du destinataire.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowSmsRcs}
                  onChange={(e) => setAllowSmsRcs(e.target.checked)}
                  className="h-5 w-5 accent-violet-600"
                />
              </label>
                </div>
              </details>
              <Button
                className="h-11 w-full rounded-xl bg-violet-600 hover:bg-violet-700"
                disabled={mandateBusy || !goal.trim() || (mode === "vendre" && !selectedArticle)}
                onClick={() => void createMandate()}
              >
                {mandateBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                Activer la mission · {durationHours} h
              </Button>
              <p className="text-center text-[10px] font-semibold text-slate-500">
                Vous validez l’accord final. Le paiement reste séparé.
              </p>
            </div>
          )}
        </section>

        {(journeysBusy || journeys.length > 0) && (
          <section className="rounded-[20px] border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-blue-600" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-950">Mes démarches · même Deal Room</div>
                <div className="text-[10px] font-semibold text-slate-500">Intérêt → négociation → accord → préparation → livreur → livraison → paiement.</div>
              </div>
              <Button variant="ghost" size="sm" disabled={journeysBusy} onClick={() => void refreshJourneys()} className="rounded-xl">
                {journeysBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualiser"}
              </Button>
            </div>
            {journeys.length > 0 && (
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {journeys.slice(0, 20).map((journey) => (
                  <article key={journey.id} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <h3 className="mb-2 truncate text-sm font-bold">{journey.subject || "Démarche WAOUH"}</h3>
                    <WaouhJourneyProgress journey={journey} />
                    <div className="mt-2">
                      {journey.thread_id || journey.last_action === "article_selection_required" ?
                        <Button variant="outline" className="min-h-11 w-full" onClick={() => openJourney(journey)}>{journey.thread_id ? "Ouvrir la discussion" : "Choisir mon article"}</Button> :
                        journey.stage !== "completed" && journey.stage !== "cancelled" && <WaouhNexusContactSheet fabricId={journey.fabric_id} title={journey.subject || "Opportunité"} sourceUrl={journey.source_url} mode={journey.mode} journeyId={journey.id} />}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {busy && searchCompleted && <p role="status" className="text-xs text-blue-700">Offres indexées affichées · exploration des autres sources en cours…</p>}
        {searchCompleted && <WaouhDiscoveryCoverage refresh={refreshCoverage} count={results.length} />}

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
          <WaouhOfferComparison results={results} />
          {results.map((item, index) => {
            const intelligence = avatarMarketIntelligence(item);
            const photos = evidencePhotos(item);
            return (
              <article key={item.fabric_id} className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
                {photos.length > 0 && (
                  <div className="h-32 w-full overflow-hidden bg-slate-100 sm:h-40">
                    <img src={photos[0]} alt={item.subject || "Opportunité WAOUH"} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 font-black text-blue-600">#{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-950">{item.subject || item.raw_text || "Opportunité WAOUH"}</h3>
                    {(item.price_min != null || item.price_max != null) && <p className="mt-1 text-base font-semibold text-emerald-700">{Math.round(item.price_min ?? item.price_max ?? 0).toLocaleString("fr-FR")} FCFA</p>}
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span>{sourceLabel(item.source_key)}</span>
                      {item.city && <span>· {item.city}</span>}
                      <span>· {item.contact_policy.level}</span>
                      {(item.readiness_level || item.contact_pack?.readiness_level) && <span>· {item.readiness_level || item.contact_pack?.readiness_level}</span>}
                      {item.actionability_score != null && <span>· Action {Math.round(item.actionability_score)}%</span>}
                    </div>
                  </div>
                  {item.scores?.total_score != null && <div className="shrink-0 text-xs font-semibold text-blue-600">{Math.round(item.scores.total_score)}%</div>}
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

                <details className="waouh-message-details mt-2 rounded-xl border border-slate-200 px-3">
                  <summary>Détails et analyse</summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {[
                    ["Détails", intelligence.details, "bg-slate-50 text-slate-800"],
                    ["Marché réel", intelligence.market, "bg-emerald-50/70 text-emerald-950"],
                    ["Analyse comparative", intelligence.comparison, "bg-blue-50/70 text-blue-950"],
                    ["Pourquoi WAOUH recommande", intelligence.recommendation, "bg-amber-50/80 text-amber-950"],
                  ].map(([label, value, tone]) => (
                    <div key={label} className={`rounded-2xl p-3 ${tone}`}>
                      <div className="text-[9px] font-bold uppercase tracking-wide opacity-65">{label}</div>
                      <div className="mt-1 text-xs font-normal leading-relaxed">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-[10px] font-semibold text-slate-600">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
                  La mise en relation reste médiée par WAOUH selon le niveau {item.contact_policy.level}. Les coordonnées privées ne sont pas révélées directement.
                </div>
                </details>

                {canonicalDealCandidate(item) ? (
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
                    Préparer mon offre
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
              <DialogTitle>Proposer un prix</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bot transmet votre offre et suit la réponse.
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
                aria-label="Votre proposition en FCFA"
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
                Envoyer mon offre
              </Button>
              <p className="text-xs font-semibold text-emerald-700">
                La réponse, l’accord et l’exécution seront suivis dans cette discussion.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {!busy && goal && results.length === 0 && (
          <div className="rounded-[20px] border border-slate-200 bg-white p-6 text-center">
            <MapPin className="mx-auto h-8 w-8 text-blue-500" />
            <div className="mt-2 text-sm font-black text-slate-950">Pas encore de correspondance assez fiable</div>
            <p className="mt-1 text-xs font-semibold text-slate-500">Élargissez la zone ou laissez une mission/veille active.</p>
          </div>
        )}
      </div>
    </main>
  );
}
