import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { invokeWaouhAgentic, moneyXof } from "@/lib/waouh/agenticClient";
import {
  expressNexusInterest,
  getNexusSummary,
  getSellerOpportunities,
  nexusBadgeLabel,
  nexusScoreLabel,
  nexusSourceLabel,
  notifyMatchingBuyers,
  saveNexusPreference,
  searchNexus,
  type NexusSearchResponse,
  type NexusSellerGroup,
  type NexusSummary,
} from "@/lib/waouh/nexus";

const err = (value: unknown) => value instanceof Error ? value.message : "Une erreur inattendue est survenue.";

const SUGGESTIONS = ["Samsung S25 neuf", "Moto Bajaj d’occasion", "Appartement à Calavi", "Climatiseur 12000 BTU"];

function Stat({ icon: Icon, value, label }: { icon: typeof Bot; value: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-start rounded-2xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm">
      <div className="flex w-full items-center justify-between">
        <Icon className="h-3.5 w-3.5 text-emerald-700" />
        <span className="text-lg font-black leading-none tracking-tight text-slate-900">{value}</span>
      </div>
      <div className="mt-1 w-full truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

export function WaouhNexusDashboard({ onAsk }: { onAsk?: (prompt: string) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("buy");
  const [summary, setSummary] = useState<NexusSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState("");
  const [city, setCity] = useState("Cotonou");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<NexusSearchResponse | null>(null);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerGroups, setSellerGroups] = useState<NexusSellerGroup[]>([]);
  const [sellerTotal, setSellerTotal] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const refreshSummary = async () => {
    if (!user) return;
    setSummaryLoading(true);
    try {
      setSummary(await getNexusSummary());
    } catch (error) {
      toast({ title: "NEXUS indisponible", description: err(error), variant: "destructive" });
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    void refreshSummary();
  }, [user?.id]);

  const marketText = useMemo(() => {
    const market = searchResult?.market;
    if (!market || market.sample_count === 0) return null;
    return `${market.sample_count} offres comparées · médiane ${moneyXof(market.median)}`;
  }, [searchResult]);

  const runSearch = async () => {
    const clean = query.trim();
    if (!clean) return;
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour que WAOUH mémorise et suive votre recherche." });
      return;
    }
    setSearching(true);
    try {
      const data = await searchNexus({
        query: clean,
        budget_max: budget ? Number(budget) : undefined,
        city: city.trim() || undefined,
        limit: 9,
        persist_intent: true,
      });
      setSearchResult(data);
      await refreshSummary();
    } catch (error) {
      toast({ title: "Recherche impossible", description: err(error), variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const addWatch = async () => {
    if (!searchResult) return;
    setBusy("watch");
    try {
      await invokeWaouhAgentic("watch.create", {
        query: searchResult.query,
        ...(budget ? { target_amount: Number(budget), currency: "XOF" } : {}),
        check_interval_minutes: 360,
      });
      toast({ title: "Veille activée", description: "WAOUH continuera à chercher même après votre départ." });
      await refreshSummary();
    } catch (error) {
      toast({ title: "Veille impossible", description: err(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const contactSeller = async (index: number) => {
    const item = searchResult?.results[index];
    if (!item) return;
    const key = `interest:${item.article_id ?? item.catalog_id}`;
    setBusy(key);
    try {
      await expressNexusInterest(item);
      toast({
        title: "Vendeur contacté",
        description: "Votre intérêt est enregistré et WAOUH a lancé le parcours de mise en relation.",
      });
      if (onAsk) onAsk(`Je veux négocier ${item.title}${item.price ? ` affiché à ${moneyXof(item.price)}` : ""}. Conseille-moi une offre raisonnable.`);
    } catch (error) {
      toast({ title: "Contact impossible", description: err(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const loadSeller = async () => {
    if (!user) return;
    setSellerLoading(true);
    try {
      const data = await getSellerOpportunities();
      setSellerGroups(data.articles);
      setSellerTotal(data.total_matches);
      await refreshSummary();
    } catch (error) {
      toast({ title: "Analyse vendeur impossible", description: err(error), variant: "destructive" });
    } finally {
      setSellerLoading(false);
    }
  };

  const notifyBuyers = async (articleId: string) => {
    setBusy(`notify:${articleId}`);
    try {
      const result = await notifyMatchingBuyers(articleId);
      toast({
        title: "Acheteurs compatibles notifiés",
        description: `${result.notified} profil(s) actif(s) ciblé(s).`,
      });
    } catch (error) {
      toast({ title: "Notification impossible", description: err(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const setProactiveMode = async () => {
    setBusy("preference");
    try {
      await saveNexusPreference({
        mode: "both",
        contact_mode: "approval",
        auto_negotiate: false,
        preferred_city: city.trim() || undefined,
        relevance_weight: 0.30,
        price_weight: 0.24,
        trust_weight: 0.18,
        location_weight: 0.10,
        freshness_weight: 0.10,
        availability_weight: 0.08,
      });
      toast({ title: "Copilote activé", description: "WAOUH privilégiera prix, confiance et proximité, avec validation avant les actions sensibles." });
      await refreshSummary();
    } catch (error) {
      toast({ title: "Réglage impossible", description: err(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (!user) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <BrainCircuit className="mx-auto h-9 w-9 text-emerald-600" />
        <h2 className="mt-2 font-black text-slate-900">Connexion requise</h2>
        <p className="mt-1 text-sm text-slate-500">Missions, veilles et opportunités sont liées à votre compte.</p>
        <Button asChild className="mt-4 rounded-xl"><a href="/auth">Se connecter</a></Button>
      </div>
    );
  }

  const results = searchResult?.results ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:grid-cols-6">
        <Stat icon={Bot} value={summary?.missions ?? 0} label="Missions" />
        <Stat icon={BellRing} value={summary?.watches ?? 0} label="Veilles" />
        <Stat icon={ShieldCheck} value={summary?.approvals ?? 0} label="À valider" />
        <Stat icon={Sparkles} value={summary?.offers ?? 0} label="Offres" />
        <Stat icon={Store} value={summary?.seller_articles ?? 0} label="Articles" />
        <Stat icon={Target} value={summary?.buyer_intents ?? 0} label="Recherches" />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <div className="flex items-center gap-2">
          <TabsList className="grid h-12 min-w-0 flex-1 grid-cols-3 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <TabsTrigger value="buy" className="min-h-[40px] gap-1.5 rounded-xl text-xs font-black data-[state=active]:bg-white data-[state=active]:shadow sm:text-sm"><Search className="h-4 w-4" />Trouver</TabsTrigger>
            <TabsTrigger value="sell" className="min-h-[40px] gap-1.5 rounded-xl text-xs font-black data-[state=active]:bg-white data-[state=active]:shadow sm:text-sm" onClick={() => { if (!sellerGroups.length) void loadSeller(); }}><Store className="h-4 w-4" />Vendre</TabsTrigger>
            <TabsTrigger value="brain" className="min-h-[40px] gap-1.5 rounded-xl text-xs font-black data-[state=active]:bg-white data-[state=active]:shadow sm:text-sm"><BrainCircuit className="h-4 w-4" />Copilote</TabsTrigger>
          </TabsList>
          <Button size="icon" variant="outline" className="h-12 w-12 shrink-0 rounded-2xl" aria-label="Actualiser" disabled={summaryLoading} onClick={() => void refreshSummary()}>
            <RefreshCw className={summaryLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>

        <TabsContent value="buy" className="mt-0 space-y-3 lg:grid lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-36px_rgba(15,23,42,.4)] lg:sticky lg:top-3">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><Sparkles className="h-4 w-4" /></div>
              <h3 className="text-sm font-black text-slate-900">Trouver pour moi</h3>
            </div>
            <Textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex. Samsung S25 256 Go neuf"
              className="min-h-[72px] resize-none rounded-2xl border-slate-200 bg-slate-50/60"
            />
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              {SUGGESTIONS.map((item) => (
                <button key={item} type="button" onClick={() => setQuery(item)} className="min-h-[34px] shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-bold text-emerald-900 active:scale-95">{item}</button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input value={budget} onChange={(event) => setBudget(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Budget FCFA" className="h-11 rounded-xl" />
              <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ville" className="h-11 rounded-xl" />
            </div>
            <Button className="mt-3 h-12 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 font-black text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700" disabled={searching || !query.trim()} onClick={() => void runSearch()}>
              {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Chercher et comparer
            </Button>
          </div>

          <div className="min-w-0 space-y-3">
            {!searchResult && !searching && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-6 text-center">
                <Search className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-500">Vos meilleures offres apparaîtront ici.</p>
              </div>
            )}
            {searching && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                {[0, 1, 2].map((n) => <div key={n} className="h-56 animate-pulse rounded-3xl bg-slate-100" />)}
              </div>
            )}
            {searchResult && !searching && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900">Meilleures options</h3>
                    <p className="truncate text-[11px] font-medium text-slate-500">{marketText ?? `${results.length} résultat(s)`}</p>
                  </div>
                  <Button size="sm" variant="outline" className="min-h-[40px] shrink-0 rounded-xl" disabled={busy === "watch"} onClick={() => void addWatch()}>
                    {busy === "watch" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <BellRing className="mr-1 h-3.5 w-3.5" />}
                    Surveiller
                  </Button>
                </div>
                {!results.length && (
                  <div className="rounded-3xl border border-dashed p-6 text-center text-sm text-slate-500">Rien d’assez proche. Activez la veille : WAOUH continue à chercher.</div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((item, index) => {
                    const image = item.photos?.find((url) => String(url).startsWith("https://") || String(url).startsWith("http://"));
                    const key = item.article_id ?? item.catalog_id ?? `${index}`;
                    const score = Math.max(0, Math.min(100, Math.round(item.scores.total_score)));
                    return (
                      <article key={key} className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,.45)]">
                        {image && <img src={image} alt="" className="h-32 w-full object-cover" loading="lazy" />}
                        <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {item.badges.slice(0, 2).map((badge) => <Badge key={badge} variant={badge === "recommended" ? "default" : "secondary"} className="text-[10px]">{nexusBadgeLabel(badge)}</Badge>)}
                            <Badge variant="outline" className="text-[10px]">{nexusSourceLabel(item.source)}</Badge>
                          </div>
                          <div>
                            <h4 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">{item.title}</h4>
                            <div className="mt-1 flex items-baseline justify-between gap-2">
                              <span className="text-lg font-black tracking-tight text-slate-950">{moneyXof(item.price, item.currency)}</span>
                              {item.city && <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500"><MapPin className="h-3 w-3" />{item.city}</span>}
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-500"><span>{nexusScoreLabel(item.scores.total_score)}</span><span>{score}%</span></div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-600" style={{ width: `${score}%` }} /></div>
                          </div>
                          {item.advice && <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">{item.advice}</p>}
                          <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                            <Button size="sm" className="min-h-[40px] rounded-xl" disabled={busy === `interest:${key}`} onClick={() => void contactSeller(index)}>
                              {busy === `interest:${key}` ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1 h-3.5 w-3.5" />}Intéressé
                            </Button>
                            <Button size="sm" variant="outline" className="min-h-[40px] rounded-xl" onClick={() => onAsk?.(`Analyse ${item.title} à ${moneyXof(item.price, item.currency)}. Est-ce un bon prix et que dois-je vérifier avant de négocier ?`)}>
                              <BrainCircuit className="mr-1 h-3.5 w-3.5" />Conseil IA
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sell" className="mt-0 space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Users className="h-4 w-4" /></div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900">Acheteurs compatibles</h3>
                <p className="truncate text-[11px] text-slate-500">Vos articles face aux demandes actives.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="min-h-[40px] shrink-0 rounded-xl" disabled={sellerLoading} onClick={() => void loadSeller()}>
              {sellerLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}Analyser
            </Button>
          </div>

          {!sellerLoading && sellerGroups.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm font-semibold text-slate-500">Aucune opportunité. Publiez un article puis analysez.</div>
          )}

          {sellerGroups.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">{sellerTotal} correspondance(s)</div>
              {sellerGroups.map((group) => (
                <div key={group.article.id} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold text-slate-900">{group.article.title}</h4>
                      <p className="text-xs text-slate-500">{moneyXof(group.article.price, group.article.currency)}{group.article.city ? ` · ${group.article.city}` : ""}</p>
                    </div>
                    <Button size="sm" className="min-h-[40px] shrink-0 rounded-xl" disabled={busy === `notify:${group.article.id}` || group.matched_count === 0} onClick={() => void notifyBuyers(group.article.id)}>
                      {busy === `notify:${group.article.id}` ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Target className="mr-1 h-3.5 w-3.5" />}Notifier
                    </Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {group.opportunities.map((opportunity) => (
                      <div key={opportunity.buyer_profile_id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{opportunity.query}</div>
                            <div className="mt-0.5 text-[11px] text-slate-500">{opportunity.budget_max ? `Budget ${moneyXof(opportunity.budget_max)} · ` : ""}{nexusSourceLabel(opportunity.source)}</div>
                          </div>
                          <Badge variant="secondary">{Math.round(opportunity.scores.total_score)}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="brain" className="mt-0">
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><BrainCircuit className="h-5 w-5" /></div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Copilote NEXUS</h3>
                <p className="text-[11px] text-slate-500">L’IA classe et surveille, vous décidez.</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { icon: CheckCircle2, color: "text-emerald-600", title: "Prix intelligent", text: "Médiane et écart marché." },
                { icon: ShieldCheck, color: "text-cyan-600", title: "Confiance", text: "Réputation et historique." },
                { icon: Target, color: "text-violet-600", title: "Matching continu", text: "Offres et demandes rapprochées." },
              ].map(({ icon: Icon, color, title, text }) => (
                <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <Icon className={`mb-1.5 h-4 w-4 ${color}`} />
                  <div className="text-sm font-bold text-slate-900">{title}</div>
                  <div className="text-[11px] text-slate-500">{text}</div>
                </div>
              ))}
            </div>
            <Button className="h-12 w-full rounded-2xl font-black sm:w-auto" disabled={busy === "preference"} onClick={() => void setProactiveMode()}>
              {busy === "preference" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Activer le réglage recommandé
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WaouhNexusDashboard;
