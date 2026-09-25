import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Handshake,
  Loader2,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getWaouhSessionId } from "@/app-mobile/hooks/useWaouhIdentity";
import { normalizeChatReply, type ChatReply } from "@/lib/chatReply";
import { cn } from "@/lib/utils";

type Intent = "buy" | "sell" | "ask";
type Offer = ReturnType<typeof normalizeOffers>[number];

const number = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

function normalizeOffers(reply: ChatReply) {
  return reply.results.map((result) => ({
    ...result,
    article_id: result.id,
    seller_user_id: result.seller_id ?? result.counterpart_user_id ?? null,
  }));
}

function fmt(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "Prix à négocier";
  return new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " FCFA";
}

const PENDING_OPEN_KEY = "waouh_pending_open";

function dispatchDealRoom(detail: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(PENDING_OPEN_KEY);
    const current = raw ? JSON.parse(raw) : [];
    const key = `art_${detail.article_id ?? "none"}_buyer_${detail.counterpart_user_id ?? "any"}`;
    const filtered = Array.isArray(current)
      ? current.filter((entry: any) =>
          `art_${entry?.article_id ?? "none"}_${entry?.kind === "seller" ? "seller" : "buyer"}_${entry?.counterpart_user_id ?? "any"}` !== key)
      : [];
    filtered.push(detail);
    localStorage.setItem(PENDING_OPEN_KEY, JSON.stringify(filtered.slice(-10)));
  } catch {}
  window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail }));
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail }));
  }, 120);
}

export default function WaouhAvatarPage({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sessionId = useMemo(() => getWaouhSessionId(), []);
  const [intent, setIntent] = useState<Intent>("buy");
  const [goal, setGoal] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [interestIndex, setInterestIndex] = useState<number | null>(null);
  const [reply, setReply] = useState<ChatReply | null>(null);
  const [sourceMix, setSourceMix] = useState<Record<string, number>>({});
  const [intelligence, setIntelligence] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const offers = useMemo(() => (reply ? normalizeOffers(reply) : []), [reply]);

  const search = async () => {
    const text = goal.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setReply(null);
    try {
      const prompt =
        intent === "sell"
          ? `Je veux vendre. ${text}`
          : intent === "ask"
            ? text
            : `Je veux acheter. ${text}`;
      const { data, error: invokeError } = await supabase.functions.invoke("waouh-channel-in-secure", {
        headers: { "x-waouh-session": sessionId },
        body: {
          channel: "web_avatar",
          sessionId,
          text: prompt,
          attachments: [],
          authUserId: user?.id ?? null,
          city: city.trim() || null,
          meta: {
            source: "avatar_journey",
            intent,
            city: city.trim() || null,
            budget_max: number(budget),
          },
        },
      });
      if (invokeError) throw invokeError;
      if (!data || data.ok === false || data.success === false || data.error) {
        throw new Error(String(data?.error || data?.reply || "Recherche indisponible."));
      }
      setReply(normalizeChatReply(data));
      setSourceMix((data.source_mix ?? data.meta?.source_mix ?? {}) as Record<string, number>);
      setIntelligence((data.intelligence ?? data.meta?.intelligence ?? null) as Record<string, any> | null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const expressInterest = async (offer: Offer) => {
    if (interestIndex != null) return;
    setInterestIndex(offer.index);
    setError(null);
    try {
      const sellerId = offer.seller_id ?? offer.counterpart_user_id ?? null;
      const { data, error: invokeError } = await supabase.functions.invoke("waouh-channel-in-secure", {
        headers: { "x-waouh-session": sessionId },
        body: {
          channel: "web_avatar",
          sessionId,
          text: `intéressé ${offer.index}`,
          attachments: [],
          authUserId: user?.id ?? null,
          city: city.trim() || null,
          meta: {
            source: "avatar_journey",
            origin_surface: "web_avatar_journey",
            intent: "interested",
            article_id: offer.id,
            seller_user_id: sellerId,
            counterpart_user_id: sellerId,
            fabric_id: offer.fabric_id ?? null,
            title: offer.title,
            price: offer.price ?? offer.price_min ?? offer.price_max ?? null,
            city: offer.city ?? city.trim() || null,
          },
        },
      });
      if (invokeError) throw invokeError;
      if (!data || data.ok === false || data.error) {
        throw new Error(String(data?.reply || data?.error || "Impossible d’ouvrir le Deal Room."));
      }
      const articleId = String(data.article_id || offer.id || "");
      const counterpart = String(data.seller_user_id || data.counterpart_user_id || sellerId || "") || null;
      dispatchDealRoom({
        article_id: articleId,
        counterpart_user_id: counterpart,
        seller_user_id: counterpart,
        buyer_user_id: data.buyer_user_id ?? null,
        kind: "buyer",
        title: offer.title,
        price: offer.price ?? offer.price_min ?? offer.price_max ?? null,
        city: offer.city ?? city || null,
        photo: offer.photos?.[0] ?? null,
        source: "avatar_journey",
        thread_id: data.thread_id ?? null,
        negotiation_id: data.negotiation_id ?? null,
        deal_id: data.deal_id ?? null,
        transaction_id: data.transaction_id ?? null,
        seed_text: data.reply ?? null,
      });
      navigate("/app/chat/waouh");
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setInterestIndex(null);
    }
  };

  const labels = {
    buy: {
      title: "Acheter avec votre Avatar",
      subtitle: "Décrivez le besoin. L’Avatar explore, compare et prépare le Deal Room.",
      placeholder: "Ex. Une moto Bajaj fiable à moins de 700 000 FCFA",
    },
    sell: {
      title: "Vendre avec votre Avatar",
      subtitle: "Décrivez l’offre. L’Avatar cherche et qualifie les acheteurs.",
      placeholder: "Ex. Je vends un iPhone 15 Pro en très bon état",
    },
    ask: {
      title: "Demander à votre Avatar",
      subtitle: "Un objectif, un parcours guidé. L’Avatar organise les moteurs WAOUH.",
      placeholder: "Ex. Je cherche un prestataire fiable pour une livraison à Calavi",
    },
  }[intent];

  return (
    <main className={cn("bg-[radial-gradient(circle_at_75%_0%,rgba(79,127,255,.10),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#fff_56%)]", embedded ? "h-full min-h-0 overflow-y-auto" : "min-h-screen")}>
      {!embedded && (
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
            <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-blue-500/15">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-950">WAOUH Avatar</div>
              <div className="truncate text-[11px] font-semibold text-slate-500">NEXUS · Signal Fabric · Deal Graph</div>
            </div>
          </div>
        </header>
      )}

      <section className="mx-auto w-full max-w-6xl space-y-4 px-3 py-4 sm:px-4">
        <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5 shadow-[0_24px_70px_-42px_rgba(59,130,246,.5)]">
          <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
            <div className="relative mx-auto grid h-28 w-28 place-items-center rounded-full bg-white shadow-xl ring-1 ring-blue-100">
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-100 via-cyan-50 to-violet-100" />
              <Sparkles className={cn("relative h-10 w-10 text-blue-600", busy && "animate-pulse")} />
            </div>
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700">AVATAR JOURNEY</span>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-700">Deal Graph</span>
              </div>
              <h1 className="text-2xl font-black tracking-[-.03em] text-slate-950 sm:text-3xl">{labels.title}</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">{labels.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {([
            ["buy", ShoppingBag, "Acheter"],
            ["sell", BriefcaseBusiness, "Vendre"],
            ["ask", Target, "Demander"],
          ] as const).map(([value, Icon, label]) => (
            <button key={value} type="button" onClick={() => { setIntent(value); setReply(null); setError(null); }} className={cn("flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition", intent === value ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50")}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={labels.placeholder} className="min-h-[104px] resize-none rounded-2xl border-slate-200 text-sm" />
          <div className={cn("grid gap-2", intent === "buy" ? "sm:grid-cols-2" : "sm:grid-cols-1")}>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville / zone — Cotonou, Calavi…" className="h-11 rounded-xl" />
            {intent === "buy" && <Input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" placeholder="Budget maximum FCFA" className="h-11 rounded-xl" />}
          </div>
          <Button onClick={() => void search()} disabled={busy || !goal.trim()} className="h-12 rounded-2xl bg-blue-600 font-black hover:bg-blue-700">
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Votre Avatar explore le marché…</> : <><Sparkles className="mr-2 h-4 w-4" />{intent === "sell" ? "Trouver les acheteurs" : intent === "ask" ? "Laisser l’Avatar organiser" : "Trouver les meilleures offres"}</>}
          </Button>
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

        {reply && (
          <>
            <div className="rounded-[22px] border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-blue-600 shadow-sm"><Sparkles className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-slate-950">Votre Avatar a analysé le marché</div>
                  {reply.text && <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">{reply.text}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(sourceMix).slice(0, 6).map(([key, value]) => <span key={key} className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-blue-700">{key} · {value}</span>)}
                    {intelligence?.confidence != null && <span className="rounded-full bg-violet-100 px-2 py-1 text-[9px] font-bold text-violet-700">Confiance {Math.round(Number(intelligence.confidence) * 100)}%</span>}
                  </div>
                </div>
              </div>
            </div>

            {offers.length ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-black text-slate-950">{intent === "sell" ? "Acheteurs qualifiés" : "Opportunités recommandées"}</h2>
                  <span className="text-[10px] font-bold text-slate-500">{offers.length} résultat{offers.length > 1 ? "s" : ""}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {offers.slice(0, 8).map((offer) => (
                    <article key={`${offer.id}-${offer.index}`} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                      {offer.photos?.[0] && <div className="flex h-48 items-center justify-center bg-slate-50"><img src={offer.photos[0]} alt="" className="h-full w-full object-contain" /></div>}
                      <div className="space-y-2 p-4">
                        <div className="text-sm font-black text-slate-950">{offer.title}</div>
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{fmt(offer.price ?? offer.price_min ?? offer.price_max)}</span>
                          {offer.city && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-blue-700"><MapPin className="h-3 w-3" />{offer.city}</span>}
                          {offer.source && <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">{offer.source}</span>}
                        </div>
                        {offer.reasons?.length ? <p className="text-[11px] leading-relaxed text-slate-600">{offer.reasons.slice(0, 3).join(" · ")}</p> : null}
                        {intent !== "ask" && (
                          <Button disabled={interestIndex != null || !offer.id} onClick={() => void expressInterest(offer)} className="h-10 w-full rounded-xl bg-blue-600 text-xs font-black hover:bg-blue-700">
                            {interestIndex === offer.index ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Création du Deal Room…</> : <><Handshake className="mr-2 h-3.5 w-3.5" />Intéressé · ouvrir le Deal Room</>}
                          </Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">Aucune opportunité suffisamment qualifiée pour le moment. Vous pouvez créer une mission/veille depuis Missions.</div>
            )}
          </>
        )}

        <div className="grid grid-cols-4 gap-2 text-center text-[9px] font-black text-slate-500">
          {[
            [Search, "Objectif"],
            [Sparkles, "Recherche"],
            [Target, "Sélection"],
            [Handshake, "Deal Room"],
          ].map(([Icon, label], index) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 bg-white px-2 py-2">
              <Icon className="mx-auto mb-1 h-4 w-4 text-blue-600" />
              {String(label)}
              {index < 3 && <ArrowRight className="sr-only h-3 w-3" />}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
