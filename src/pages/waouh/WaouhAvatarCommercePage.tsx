import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Handshake,
  Loader2,
  MapPin,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  globalNexusDiscovery,
  startNexusJourney,
  contactNexusJourney,
  followNexusJourney,
  offerNexusJourney,
  listNexusJourneys,
  type NexusDiscoveryResult,
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

  const continueWith = async (item: NexusDiscoveryResult) => {
    setWorkingId(item.fabric_id);
    try {
      const evidence = (item.evidence || {}) as Record<string, unknown>;
      const articleId = String(
        (evidence.article_id as string | undefined) ||
          (item.source_key === "waouh_app" ? item.source_record_id || "" : "")
      ).trim();

      if (articleId) {
        const sellerUserId = String(
          (evidence.seller_user_id as string | undefined) ||
            (evidence.owner_user_id as string | undefined) ||
            (evidence.user_id as string | undefined) ||
            ""
        ).trim();
        const title = item.subject || item.raw_text || "Annonce";
        const price = item.price_min ?? item.price_max ?? null;
        const sessionId = getWaouhSessionId();
        const { data: authData } = await supabase.auth.getUser();
        const text = `Je suis intéressé par « ${title} ».`;
        const meta = {
          source: "avatar_commerce",
          origin_surface: "web_avatar_commerce",
          action: "interested",
          intent: "interested",
          commerce_action: "interest",
          thread_type: "product_meet",
          article_id: articleId,
          seller_user_id: sellerUserId || null,
          counterpart_user_id: sellerUserId || null,
          title,
          city: item.city ?? null,
          price,
          fabric_id: item.fabric_id,
          contactability_level: item.contact_policy.level,
          nexus_total_score: item.scores?.total_score ?? null,
          nexus_trust_score: item.scores?.trust_score ?? null,
          nexus_reasons: item.scores?.reasons ?? [],
        };

        const { data, error } = await supabase.functions.invoke("waouh-channel-in-secure", {
          headers: { "x-waouh-session": sessionId },
          body: {
            channel: "web",
            sessionId,
            text,
            authUserId: authData.user?.id ?? null,
            meta,
          },
        });
        if (error || data?.error) {
          throw new Error(error?.message || data?.message || data?.error || "Impossible de créer le Deal Room.");
        }

        const detail = {
          article_id: data?.article_id || articleId,
          counterpart_user_id: data?.counterpart_user_id || sellerUserId || null,
          seller_user_id: data?.seller_user_id || sellerUserId || null,
          buyer_user_id: data?.buyer_user_id || null,
          thread_id: data?.thread_id || null,
          negotiation_id: data?.negotiation_id || null,
          deal_id: data?.deal_id || null,
          kind: "buyer",
          title,
          price,
          city: item.city ?? null,
          seed_text: data?.reply || text,
          source: "avatar_commerce",
        };
        try {
          const raw = localStorage.getItem("waouh_pending_open");
          const items = raw ? JSON.parse(raw) : [];
          const list = Array.isArray(items) ? items : [];
          list.push(detail);
          localStorage.setItem("waouh_pending_open", JSON.stringify(list.slice(-10)));
        } catch {}

        navigate("/app/chat");
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail }));
        }, 60);
        toast({
          title: "Deal Room ouvert",
          description: "Le vendeur est notifié. Votre Avatar vous accompagne dans la négociation.",
        });
        return;
      }

      const prepared = await prepareNexusContact(item.fabric_id);
      if (!prepared.contact_policy.can_auto_contact && !prepared.contact_policy.can_blind_message) {
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
                    </div>
                  </div>
                  <div className="text-sm font-black text-blue-600">{Math.round(item.scores?.total_score || 0)}%</div>
                </div>

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

                <Button
                  onClick={() => void continueWith(item)}
                  disabled={workingId === item.fabric_id}
                  className="mt-3 h-11 w-full rounded-2xl"
                >
                  {workingId === item.fabric_id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : item.source_key === "waouh_app" ? (
                    <Handshake className="mr-2 h-4 w-4" />
                  ) : (
                    <Radar className="mr-2 h-4 w-4" />
                  )}
                  {item.source_key === "waouh_app" ? "Intéressé · ouvrir le Deal Room" : "Laisser mon Avatar poursuivre"}
                </Button>
                </div>
              </article>
            );
          })}
        </div>

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
