import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Handshake,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Tag,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WaouhMuseAvatar } from "@/components/waouh/WaouhMuseAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  expressNexusInterest,
  getSellerOpportunities,
  notifyMatchingBuyers,
  searchNexus,
  type NexusSearchItem,
  type NexusSearchResponse,
  type NexusSellerGroup,
} from "@/lib/waouh/nexus";
import { cn } from "@/lib/utils";

type Intent = "buy" | "sell" | "ask";

const money = (value?: number | null) =>
  value == null ? "Prix à négocier" : new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " FCFA";

const pendingKey = "waouh_pending_open";

function intentFrom(value: string | null): Intent {
  if (value === "sell" || value === "ask") return value;
  return "buy";
}

function bufferDeal(detail: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(pendingKey);
    const list = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(list) ? list : [];
    next.push(detail);
    localStorage.setItem(pendingKey, JSON.stringify(next.slice(-10)));
  } catch {}
}

function InfoPanel({
  title,
  text,
  tone = "slate",
}: {
  title: string;
  text: string;
  tone?: "slate" | "mint" | "amber" | "blue";
}) {
  const styles = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    mint: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    amber: "border-amber-200 bg-amber-50/80 text-amber-900",
    blue: "border-blue-200 bg-blue-50/80 text-blue-900",
  };
  return (
    <div className={cn("rounded-2xl border px-3 py-2.5 text-[11px] leading-relaxed", styles[tone])}>
      <span className="font-black">{title} : </span>{text}
    </div>
  );
}

export default function WaouhAvatarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [intent, setIntent] = useState<Intent>(() => intentFrom(params.get("intent")));
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState("");
  const [city, setCity] = useState("Cotonou");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<NexusSearchResponse | null>(null);
  const [sellerGroups, setSellerGroups] = useState<NexusSellerGroup[]>([]);
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [offer, setOffer] = useState("");

  const avatarName = String(user?.user_metadata?.avatar_name || user?.user_metadata?.first_name || "Avatar WAOUH");

  useEffect(() => {
    const next = intentFrom(params.get("intent"));
    setIntent(next);
  }, [params]);

  useEffect(() => {
    if (intent !== "sell" || !user) return;
    void loadSeller();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, user?.id]);

  const setMode = (next: Intent) => {
    setIntent(next);
    setResult(null);
    setSellerGroups([]);
    setOfferFor(null);
    const p = new URLSearchParams(params);
    p.set("intent", next);
    setParams(p, { replace: true });
  };

  const runSearch = async () => {
    const clean = query.trim();
    if (!clean || !user) {
      if (!user) toast({ title: "Connexion requise", description: "Connectez-vous pour lancer Avatar Commerce." });
      return;
    }
    setLoading(true);
    try {
      const data = await searchNexus({
        query: clean,
        budget_max: budget ? Number(budget) : undefined,
        city: city.trim() || undefined,
        limit: 12,
        persist_intent: true,
      });
      setResult(data);
    } catch (error) {
      toast({ title: "Recherche impossible", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadSeller = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getSellerOpportunities();
      setSellerGroups(data.articles);
    } catch (error) {
      toast({ title: "Analyse vendeur impossible", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openDeal = async (item: NexusSearchItem, proposed?: number) => {
    const key = item.article_id || item.catalog_id || item.title;
    setBusy(key);
    try {
      const deal = await expressNexusInterest(item);
      if (deal.skipped === "self") throw new Error("Vous ne pouvez pas négocier votre propre article.");
      if (!deal.article_id || !deal.thread_id) throw new Error("Le Deal Room est encore en préparation. Réessayez dans un instant.");

      if (proposed && proposed > 0) {
        const { error } = await supabase.functions.invoke("waouh-channel-in-secure", {
          body: {
            channel: "web",
            text: "Je propose " + Math.round(proposed) + " FCFA",
            meta: {
              source: "avatar_commerce",
              origin_surface: "avatar_commerce",
              action: "counter",
              intent: "counter",
              article_id: deal.article_id,
              thread_id: deal.thread_id,
              negotiation_id: deal.negotiation_id || null,
              counterpart_user_id: deal.seller_user_id || null,
              seller_user_id: deal.seller_user_id || null,
              buyer_user_id: deal.buyer_user_id || null,
              role: "buyer",
            },
          },
        });
        if (error) throw error;
      }

      bufferDeal({
        article_id: deal.article_id,
        counterpart_user_id: deal.seller_user_id || null,
        seller_user_id: deal.seller_user_id || null,
        buyer_user_id: deal.buyer_user_id || null,
        thread_id: deal.thread_id,
        negotiation_id: deal.negotiation_id || null,
        kind: "buyer",
        title: deal.title || item.title,
        price: deal.price ?? item.price ?? null,
        city: item.city || null,
        photo: item.photos?.[0] || null,
        source: "avatar_commerce",
        seed_text: proposed ? "Offre envoyée : " + Math.round(proposed) + " FCFA" : "Intérêt transmis au vendeur",
      });
      navigate("/app/chat/waouh");
    } catch (error) {
      toast({ title: "Mise en relation impossible", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const notifyBuyers = async (group: NexusSellerGroup) => {
    setBusy(group.article.id);
    try {
      const data = await notifyMatchingBuyers(group.article.id);
      toast({
        title: "Acheteurs notifiés via WAOUH",
        description: data.notified > 0
          ? String(data.notified) + " acheteur(s) compatible(s) ont reçu l'opportunité."
          : "Aucun nouvel acheteur à notifier pour le moment.",
      });
      await loadSeller();
    } catch (error) {
      toast({ title: "Notification impossible", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const marketLabel = useMemo(() => {
    if (!result?.market || result.market.sample_count < 1) return null;
    return String(result.market.sample_count) + " comparables · médiane " + money(result.market.median);
  }, [result]);

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_20%_0%,rgba(79,127,255,.10),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(139,124,255,.09),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_58%)]">
      <div className="mx-auto w-full max-w-6xl space-y-4 px-3 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <WaouhMuseAvatar mode={intent === "sell" ? "seller" : intent === "buy" ? "buyer" : "neutral"} phase={loading ? "searching" : "idle"} size="md" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight text-slate-950">{avatarName}</h1>
              <p className="truncate text-[11px] font-semibold text-slate-500">Votre Avatar · NEXUS · Signal Fabric · Radar · Partenaire</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-2xl" onClick={() => navigate("/app/missions")}>Missions</Button>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-4 shadow-[0_24px_60px_-40px_rgba(59,94,246,.4)] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[.16em] text-blue-600">Avatar Commerce</div>
              <h2 className="max-w-2xl text-2xl font-black leading-tight tracking-[-.035em] text-slate-950 sm:text-3xl">
                Un objectif. Votre Avatar analyse le marché et vous conduit jusqu’au Deal Room.
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
                Aucun contact privé n’est exposé. Les offres, contre-offres, validations, livraison et paiement restent dans le moteur WAOUH.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-[9px] font-bold text-slate-500">
              {[
                [Search, "Objectif"],
                [BarChart3, "Analyse"],
                [Sparkles, "Opportunité"],
                [Handshake, "Deal"],
              ].map(([Icon, label]) => (
                <div key={String(label)} className="rounded-2xl border border-white bg-white/80 p-2 shadow-sm">
                  <Icon className="mx-auto h-4 w-4 text-blue-600" />
                  <div className="mt-1">{String(label)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-3 rounded-2xl bg-slate-100 p-1">
          {([
            ["buy", ShoppingBag, "Acheter"],
            ["sell", Tag, "Vendre"],
            ["ask", Sparkles, "Demander"],
          ] as const).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition",
                intent === value ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {intent !== "sell" ? (
          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={intent === "ask" ? "Ex. Quel téléphone choisir avec 150 000 FCFA ?" : "Ex. Je cherche un iPhone 15 en bon état à Cotonou"}
              className="min-h-[86px] rounded-2xl"
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" placeholder="Budget max. FCFA" className="rounded-xl" />
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" className="rounded-xl" />
            </div>
            <Button onClick={() => void runSearch()} disabled={loading || !query.trim()} className="mt-3 h-11 w-full rounded-2xl bg-blue-600 font-black hover:bg-blue-700">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {intent === "ask" ? "Analyser avec mon Avatar" : "Chercher avec mon Avatar"}
            </Button>
          </section>
        ) : (
          <section className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <ShieldCheck className="h-6 w-6 shrink-0 text-blue-600" />
            <p className="flex-1 text-xs font-semibold leading-relaxed text-slate-500">
              Votre Avatar croise vos articles actifs avec les demandes BUY/RFQ. WAOUH notifie les profils compatibles sans révéler vos coordonnées.
            </p>
            <Button size="icon" variant="outline" className="rounded-xl" onClick={() => void loadSeller()} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </section>
        )}

        {intent !== "sell" && result && (
          <section className="space-y-3">
            {marketLabel && (
              <InfoPanel title="Marché réel WAOUH" text={marketLabel} tone="blue" />
            )}
            {result.explanation && <InfoPanel title="Lecture de votre Avatar" text={result.explanation} tone="blue" />}

            {result.results.map((item) => {
              const itemKey = item.article_id || item.catalog_id || item.title;
              const delta = item.price != null && result.market.median
                ? Math.round(((item.price - result.market.median) / result.market.median) * 100)
                : null;
              const marketText = result.market.sample_count > 0
                ? String(result.market.sample_count) + " comparables · médiane " + money(result.market.median) + (delta == null ? "" : " · " + (delta > 0 ? "+" : "") + String(delta) + "%")
                : "Échantillon marché insuffisant pour une comparaison fiable.";
              const details = [
                item.description,
                item.condition ? "État : " + item.condition : null,
                item.category ? "Catégorie : " + item.category : null,
              ].filter(Boolean).join(" · ");
              const analysis = "Match " + Math.round(item.scores.total_score) + "% · confiance " + Math.round(item.scores.trust_score) + "% · pertinence " + Math.round(item.scores.relevance_score) + "%.";
              const why = item.scores.reasons?.length ? item.scores.reasons.join(" · ") : item.advice || "Aucune recommandation suffisamment étayée.";

              return (
                <article key={itemKey} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                  {item.photos?.[0] && <img src={item.photos[0]} alt="" className="h-56 w-full bg-slate-50 object-contain" />}
                  <div className="space-y-2 p-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">Match {Math.round(item.scores.total_score)}%</span>
                      <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700">Confiance {Math.round(item.scores.trust_score)}%</span>
                      {item.seller?.verified && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">✓ Vérifié</span>}
                    </div>
                    <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                    <div className="text-xl font-black text-emerald-600">{money(item.price)}</div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500">
                      {item.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.city}</span>}
                      {item.seller?.display_name && <span>{item.seller.display_name}</span>}
                      {item.source && <span>{item.source}</span>}
                    </div>
                    {details && <InfoPanel title="Détails" text={details} />}
                    <InfoPanel title="Marché réel" text={marketText} tone="mint" />
                    <InfoPanel title="Analyse comparative" text={analysis} tone="blue" />
                    <InfoPanel title="Pourquoi votre Avatar le retient" text={why} tone="amber" />

                    {offerFor === itemKey ? (
                      <div className="flex gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-2">
                        <Input value={offer} onChange={(e) => setOffer(e.target.value)} inputMode="numeric" placeholder="Votre offre FCFA" className="bg-white" />
                        <Button
                          disabled={busy === itemKey || !Number(offer)}
                          onClick={() => void openDeal(item, Number(offer))}
                          className="rounded-xl"
                        >
                          Envoyer
                        </Button>
                        <Button variant="ghost" onClick={() => { setOfferFor(null); setOffer(""); }}>×</Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <Button disabled={busy === itemKey} onClick={() => void openDeal(item)} className="rounded-xl bg-blue-600 hover:bg-blue-700">
                          {busy === itemKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Intéressé"}
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={() => { setOfferFor(itemKey); setOffer(item.price ? String(Math.round(item.price)) : ""); }}>
                          Proposer un prix
                        </Button>
                      </div>
                    )}
                    <p className="text-[10px] font-semibold leading-relaxed text-slate-400">
                      Contact médié par WAOUH. La suite se déroule dans un Deal Room isolé jusqu’à livraison et paiement.
                    </p>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {intent === "sell" && (
          <section className="space-y-3">
            {sellerGroups.length === 0 && !loading && (
              <div className="rounded-[22px] border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
                Aucune demande compatible détectée. Votre Avatar peut continuer à surveiller via Missions & veille.
              </div>
            )}
            {sellerGroups.map((group) => (
              <article key={group.article.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {group.article.photos?.[0] && <img src={group.article.photos[0]} alt="" className="h-16 w-16 rounded-2xl bg-slate-50 object-contain" />}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-slate-950">{group.article.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{money(group.article.price)} · {group.matched_count} demande(s)</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {group.opportunities.slice(0, 4).map((buyer) => (
                    <div key={buyer.buyer_profile_id} className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3">
                      <Users className="h-4 w-4 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-xs font-bold text-slate-800">{buyer.query}</div>
                        <div className="mt-0.5 text-[10px] font-semibold text-slate-500">Match {Math.round(buyer.scores.total_score)}%{buyer.budget_max ? " · budget ≤ " + money(buyer.budget_max) : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button disabled={busy === group.article.id} onClick={() => void notifyBuyers(group)} className="mt-3 w-full rounded-xl bg-blue-600 hover:bg-blue-700">
                  {busy === group.article.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                  Notifier {group.matched_count} acheteur(s) via WAOUH
                </Button>
                <p className="mt-2 text-[10px] font-semibold text-slate-400">Chaque réponse intéressée crée son propre Deal Room. Aucun numéro privé n’est partagé directement.</p>
              </article>
            ))}
          </section>
        )}

        <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-950 p-3 text-white">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
          <p className="text-[11px] leading-relaxed">
            L’Avatar recherche et conseille. Les transitions sensibles restent déterministes : offre, contre-offre, acceptation, réservation, livraison, paiement et clôture sont gérés par Deal Graph.
          </p>
        </div>
      </div>
    </main>
  );
}
