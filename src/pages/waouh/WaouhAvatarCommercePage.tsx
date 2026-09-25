import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Bot,
  CheckCircle2,
  GitCompareArrows,
  Handshake,
  Loader2,
  LockKeyhole,
  MapPin,
  Radar,
  Search,
  Sell,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  globalNexusDiscovery,
  getNexusMarketHistory,
  sendNexusDiscoveryContact,
  type NexusDiscoveryResult,
} from "@/lib/waouh/nexus";
import { cn } from "@/lib/utils";

type Mode = "buy" | "sell" | "ask";

const modeConfig: Record<Mode, {
  title: string;
  subtitle: string;
  placeholder: string;
  icon: React.ElementType;
}> = {
  buy: {
    title: "Acheter",
    subtitle: "Votre Avatar cherche, compare et prépare le Deal",
    placeholder: "Ex. Je cherche un Samsung S25 fiable à Cotonou",
    icon: ShoppingBag,
  },
  sell: {
    title: "Vendre",
    subtitle: "Votre Avatar publie puis cherche les acheteurs compatibles",
    placeholder: "Ex. Je vends 10 tonnes de soja à Parakou",
    icon: Sell,
  },
  ask: {
    title: "Demander",
    subtitle: "Décrivez le besoin, l’Avatar construit le parcours",
    placeholder: "Ex. Trouve-moi un réparateur sérieux pour mon climatiseur",
    icon: Bot,
  },
};

function sessionId() {
  const key = "waouh_avatar_commerce_session";
  const current = localStorage.getItem(key);
  if (current) return current;
  const value = crypto.randomUUID();
  localStorage.setItem(key, value);
  return value;
}

function money(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "Prix à confirmer";
  return new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " FCFA";
}

function evidence(result: NexusDiscoveryResult) {
  return result.evidence && typeof result.evidence === "object"
    ? result.evidence as Record<string, any>
    : {};
}

function internalArticleId(result: NexusDiscoveryResult): string | null {
  const row = evidence(result);
  const id = row.article_id || (result.fabric_id?.startsWith("article:") ? result.fabric_id.slice(8) : null);
  return id ? String(id) : null;
}

function sellerId(result: NexusDiscoveryResult): string | null {
  const id = evidence(result).seller_id;
  return id ? String(id) : null;
}

function priceLabel(result: NexusDiscoveryResult) {
  if (result.price_min != null && result.price_max != null && result.price_min !== result.price_max) {
    return `${money(result.price_min)} – ${money(result.price_max)}`;
  }
  return money(result.price_min ?? result.price_max);
}

export default function WaouhAvatarCommercePage() {
  const params = useParams();
  const navigate = useNavigate();
  const mode = (["buy", "sell", "ask"].includes(String(params.mode))
    ? params.mode
    : "buy") as Mode;
  const config = modeConfig[mode];
  const Icon = config.icon;

  const [goal, setGoal] = useState("");
  const [amount, setAmount] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [contacting, setContacting] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Awaited<ReturnType<typeof globalNexusDiscovery>> | null>(null);
  const [market, setMarket] = useState<Awaited<ReturnType<typeof getNexusMarketHistory>> | null>(null);

  const marketText = useMemo(() => {
    const point = market?.points?.[0];
    if (!point) return "Aucun échantillon marché vérifié disponible pour cette recherche.";
    const bits = [
      point.min_amount != null && point.max_amount != null
        ? `Fourchette ${money(point.min_amount)} – ${money(point.max_amount)}`
        : null,
      point.median_amount != null ? `médiane ${money(point.median_amount)}` : null,
      point.sample_count ? `${point.sample_count} observation(s)` : null,
      point.source_mix && Object.keys(point.source_mix).length
        ? `sources ${Object.keys(point.source_mix).slice(0, 4).join(", ")}`
        : null,
    ].filter(Boolean);
    return bits.length ? bits.join(" · ") : "Aucun échantillon marché vérifié disponible.";
  }, [market]);

  const publishSellerGoal = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const sid = sessionId();
    const price = Number(amount.replace(/\D/g, "")) || null;
    const text = [
      `Je vends : ${goal.trim()}`,
      price ? `Prix : ${price} FCFA` : null,
      city.trim() ? `Ville : ${city.trim()}` : null,
    ].filter(Boolean).join("\n");
    const { error } = await supabase.functions.invoke("waouh-channel-in-secure", {
      headers: { "x-waouh-session": sid },
      body: {
        channel: "web",
        sessionId: sid,
        text,
        city: city.trim() || null,
        authUserId: auth.user?.id ?? null,
        meta: {
          intent: "sell",
          payload: "sell",
          source: "avatar_commerce_web",
          origin_surface: "avatar_commerce",
          avatar_led: true,
          sale: {
            title: goal.trim(),
            price,
            city: city.trim() || null,
          },
        },
      },
    });
    if (error) throw error;
  };

  const launch = async () => {
    if (goal.trim().length < 2 || loading) return;
    setLoading(true);
    setStage(1);
    setResult(null);
    setMarket(null);
    try {
      if (mode === "sell") await publishSellerGoal();
      const budget = Number(amount.replace(/\D/g, "")) || undefined;
      const discovery = await globalNexusDiscovery({
        query: goal.trim(),
        mode: mode === "sell" ? "find_buyers" : mode === "buy" ? "find_sellers" : "auto",
        city: city.trim() || undefined,
        budget_max: mode === "sell" ? undefined : budget,
        limit: 18,
        refresh_external: true,
        smart: true,
      });
      setResult(discovery);
      setStage(discovery.results.length ? 2 : 1);
      getNexusMarketHistory(discovery.normalized_query || goal.trim(), city.trim() || undefined)
        .then(setMarket)
        .catch(() => setMarket(null));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de lancer l’Avatar Commerce.");
    } finally {
      setLoading(false);
    }
  };

  const openInternalDeal = async (item: NexusDiscoveryResult) => {
    const articleId = internalArticleId(item);
    const counterpart = sellerId(item);
    if (!articleId) return;
    setContacting(item.fabric_id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const sid = sessionId();
      const text = `Je suis intéressé par « ${item.subject || item.category || "cette offre"} ».`;
      const { data, error } = await supabase.functions.invoke("waouh-channel-in-secure", {
        headers: { "x-waouh-session": sid },
        body: {
          channel: "web",
          sessionId: sid,
          text,
          city: item.city || city.trim() || null,
          authUserId: auth.user?.id ?? null,
          meta: {
            action: "interested",
            intent: "interested",
            source: "avatar_commerce_web",
            origin_surface: "avatar_commerce",
            avatar_led: true,
            article_id: articleId,
            seller_user_id: counterpart,
            counterpart_user_id: counterpart,
            role: "buyer",
            title: item.subject || item.category || "Annonce",
            price: item.price_min ?? item.price_max ?? null,
            city: item.city ?? null,
            fabric_id: item.fabric_id,
            contactability_level: item.contact_policy.level,
            scores: item.scores,
          },
        },
      });
      if (error) throw error;
      const threadId = data?.thread_id ?? null;
      setStage(3);
      window.dispatchEvent(new CustomEvent("waouh:open-match-chat", {
        detail: {
          article_id: articleId,
          counterpart_user_id: data?.counterpart_user_id ?? counterpart,
          thread_id: threadId,
          negotiation_id: data?.negotiation_id ?? null,
          deal_id: data?.deal_id ?? null,
          seller_user_id: data?.seller_user_id ?? counterpart,
          buyer_user_id: data?.buyer_user_id ?? null,
          kind: "buyer",
          title: item.subject || item.category || "Annonce",
          price: item.price_min ?? item.price_max ?? null,
          city: item.city ?? null,
          source: "avatar_commerce",
        },
      }));
      navigate("/app/chat/waouh");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deal Room indisponible.");
    } finally {
      setContacting(null);
    }
  };

  const letAvatarContact = async (item: NexusDiscoveryResult) => {
    setContacting(item.fabric_id);
    try {
      await sendNexusDiscoveryContact({
        fabric_id: item.fabric_id,
        confirmed: true,
        message: mode === "sell"
          ? `Bonjour. Je peux répondre à votre demande concernant « ${item.subject || item.category || goal} ». WAOUH peut faciliter la discussion sans partager directement nos coordonnées.`
          : `Bonjour. Je suis intéressé par « ${item.subject || item.category || goal} ». WAOUH peut faciliter la discussion sans partager directement nos coordonnées.`,
      });
      setStage(3);
      toast.success("Votre Avatar a lancé le contact sécurisé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Contact impossible.");
    } finally {
      setContacting(null);
    }
  };

  return (
    <main className="min-h-full overflow-y-auto bg-[radial-gradient(circle_at_75%_0%,rgba(79,127,255,.13),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#ffffff_55%,#faf8ff_100%)]">
      <div className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:px-5">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate("/app/avatar")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/15">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black tracking-tight text-slate-950">Avatar · {config.title}</h1>
            <p className="truncate text-[11px] font-semibold text-slate-500">{config.subtitle}</p>
          </div>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-4 shadow-[0_22px_60px_-40px_rgba(59,130,246,.45)] sm:p-5">
          <div className="flex items-start gap-4">
            <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-blue-100 to-cyan-50 shadow-lg">
              <Bot className={cn("h-9 w-9 text-blue-600", loading && "animate-pulse")} />
              <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-blue-600 text-white">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black leading-tight text-slate-950">
                {loading ? "J’explore le marché pour vous…" : "Dites l’objectif. Je m’occupe du reste."}
              </h2>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                NEXUS · Signal Fabric · Radar · Partenaires · Missions · Contact Layer
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-4 gap-2">
          {["Objectif", "Intelligence", "Opportunités", "Deal"].map((label, index) => (
            <div key={label}>
              <div className={cn("h-1 rounded-full", index <= stage ? "bg-blue-500" : "bg-slate-200")} />
              <div className={cn("mt-1 text-center text-[9px] font-bold", index <= stage ? "text-blue-600" : "text-slate-400")}>{label}</div>
            </div>
          ))}
        </div>

        <section className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={config.placeholder} className="min-h-24 resize-none rounded-2xl text-sm" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={mode === "sell" ? "Prix souhaité (FCFA)" : "Budget max. (FCFA)"} className="h-11 rounded-xl" />
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville (optionnel)" className="h-11 rounded-xl" />
          </div>
          <Button disabled={loading || goal.trim().length < 2} onClick={launch} className="h-12 w-full rounded-2xl bg-blue-600 font-black hover:bg-blue-700">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />L’Avatar explore…</> : <><Sparkles className="mr-2 h-4 w-4" />Lancer avec mon Avatar</>}
          </Button>
        </section>

        {result && (
          <>
            <section className="rounded-[24px] border border-blue-100 bg-blue-50/45 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950"><BarChart3 className="h-4 w-4 text-blue-600" />Lecture du marché</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Intel icon={BarChart3} title="Marché réel" text={marketText} />
                <Intel icon={Radar} title="Sources" text={Object.entries(result.source_mix || {}).map(([k,v]) => `${k} ×${v}`).slice(0,4).join(" · ") || "NEXUS"} />
                <Intel icon={GitCompareArrows} title="Analyse" text={result.explanation || result.intelligence?.rationale || "Signal Fabric classe les opportunités."} />
                <Intel icon={Sparkles} title="Priorités IA" text={result.intelligence?.priorities?.slice(0,4).join(" · ") || "Pertinence · confiance · prix · proximité"} />
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-base font-black text-slate-950">{result.results.length ? "Opportunités classées" : "L’Avatar poursuit"}</h2>
                {result.results.length > 0 && <span className="text-[10px] font-bold text-slate-500">{result.results.length} trouvée(s)</span>}
              </div>
              {result.results.length === 0 ? (
                <div className="rounded-[22px] border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">
                  Aucune correspondance suffisamment fiable maintenant. Les Missions & veilles peuvent poursuivre la recherche en arrière-plan.
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {result.results.map((item) => {
                    const articleId = internalArticleId(item);
                    const busy = contacting === item.fabric_id;
                    return (
                      <article key={item.fabric_id} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                            {articleId ? <Store className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 text-sm font-black text-slate-950">{item.subject || item.category || "Opportunité commerciale"}</h3>
                            <div className="mt-1 text-[10px] font-semibold text-slate-500">{priceLabel(item)}{item.city ? ` · ${item.city}` : ""} · {item.source_key}</div>
                          </div>
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{Math.round(item.scores.total_score)}%</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">Confiance {Math.round(item.scores.trust_score)}%</span>
                          <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">{item.contact_policy.level} · {item.contact_policy.label}</span>
                        </div>
                        {item.scores.reasons?.length > 0 && <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-600">{item.scores.reasons.slice(0,3).join(" · ")}</p>}
                        <Button disabled={busy} onClick={() => articleId ? openInternalDeal(item) : letAvatarContact(item)} className="mt-4 w-full rounded-xl">
                          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : articleId ? <Handshake className="mr-2 h-4 w-4" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
                          {articleId ? "Ouvrir le Deal Room" : "Laisser l’Avatar poursuivre"}
                        </Button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2 text-[10px] font-semibold text-slate-500">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
          L’Avatar peut chercher et préparer. Les actions sensibles, le Deal, la livraison et le paiement restent déterministes et traçables.
        </div>
      </div>
    </main>
  );
}

function Intel({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white bg-white/75 p-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div className="text-[11px] leading-relaxed text-slate-600"><span className="font-black text-slate-900">{title} · </span>{text}</div>
      </div>
    </div>
  );
}
