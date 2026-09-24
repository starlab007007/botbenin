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
import { Card, CardContent } from "@/components/ui/card";
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

function Stat({ icon: Icon, value, label }: { icon: typeof Bot; value: number; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-background/80 px-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-base font-semibold leading-none">{value}</div>
        <div className="mt-1 truncate text-[11px] text-muted-foreground">{label}</div>
      </div>
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
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <BrainCircuit className="h-9 w-9 text-cyan-600" />
          <div>
            <h2 className="font-semibold">WAOUH NEXUS</h2>
            <p className="mt-1 text-sm text-muted-foreground">Connectez-vous pour activer les missions, veilles, comparaisons et opportunités personnalisées.</p>
          </div>
          <Button asChild><a href="/auth">Se connecter</a></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <Stat icon={Bot} value={summary?.missions ?? 0} label="Missions" />
        <Stat icon={BellRing} value={summary?.watches ?? 0} label="Veilles" />
        <Stat icon={ShieldCheck} value={summary?.approvals ?? 0} label="À valider" />
        <Stat icon={Sparkles} value={summary?.offers ?? 0} label="Offres" />
        <Stat icon={Store} value={summary?.seller_articles ?? 0} label="Mes articles" />
        <Stat icon={Target} value={summary?.buyer_intents ?? 0} label="Mes recherches" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-2 rounded-2xl border bg-card p-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid h-auto grid-cols-3">
            <TabsTrigger value="buy" className="gap-1.5"><Search className="h-4 w-4" />Trouver</TabsTrigger>
            <TabsTrigger value="sell" className="gap-1.5" onClick={() => { if (!sellerGroups.length) void loadSeller(); }}><Store className="h-4 w-4" />Vendre</TabsTrigger>
            <TabsTrigger value="brain" className="gap-1.5"><BrainCircuit className="h-4 w-4" />Copilote</TabsTrigger>
          </TabsList>
          <Button size="sm" variant="ghost" disabled={summaryLoading} onClick={() => void refreshSummary()}>
            <RefreshCw className={summaryLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />Actualiser
          </Button>
        </div>

        <TabsContent value="buy" className="space-y-3">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold">Trouver pour moi</h3>
                  <p className="text-xs text-muted-foreground">Dites simplement ce que vous voulez. WAOUH compare et conseille.</p>
                </div>
              </div>
              <Textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ex. Samsung S25 256 Go neuf, fiable et pas cher"
                className="min-h-20 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input value={budget} onChange={(event) => setBudget(event.target.value.replace(/\\D/g, ""))} inputMode="numeric" placeholder="Budget max. FCFA" />
                <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ville" />
              </div>
              <Button className="w-full bg-cyan-600 text-white hover:bg-cyan-700" disabled={searching || !query.trim()} onClick={() => void runSearch()}>
                {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                WAOUH cherche et compare
              </Button>
            </CardContent>
          </Card>

          {searchResult && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Meilleures options</h3>
                  <p className="text-xs text-muted-foreground">{marketText ?? searchResult.explanation}</p>
                </div>
                <Button size="sm" variant="outline" disabled={busy === "watch"} onClick={() => void addWatch()}>
                  {busy === "watch" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <BellRing className="mr-1 h-3.5 w-3.5" />}
                  Surveiller
                </Button>
              </div>

              {!searchResult.results.length && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Aucune offre assez proche. Activez la veille : WAOUH continuera à chercher.
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-3">
                {searchResult.results.map((item, index) => {
                  const image = item.photos?.find((url) => String(url).startsWith("https://") || String(url).startsWith("http://"));
                  const key = item.article_id ?? item.catalog_id ?? `${index}`;
                  return (
                    <Card key={key} className="overflow-hidden">
                      {image && <img src={image} alt="" className="h-36 w-full object-cover" loading="lazy" />}
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-wrap gap-1">
                          {item.badges.map((badge) => <Badge key={badge} variant={badge === "recommended" ? "default" : "secondary"}>{nexusBadgeLabel(badge)}</Badge>)}
                          <Badge variant="outline">{nexusSourceLabel(item.source)}</Badge>
                        </div>
                        <div>
                          <h4 className="line-clamp-2 font-semibold">{item.title}</h4>
                          <div className="mt-1 text-xl font-bold">{moneyXof(item.price, item.currency)}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            {item.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.city}</span>}
                            <span>{nexusScoreLabel(item.scores.total_score)} · {Math.round(item.scores.total_score)}%</span>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">{item.advice}</p>
                        <div className="flex flex-wrap gap-1">
                          {item.scores.reasons.slice(0, 3).map((reason) => (
                            <span key={reason} className="rounded-full bg-muted px-2 py-1 text-[10px]">{reason}</span>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            disabled={busy === `interest:${key}`}
                            onClick={() => void contactSeller(index)}
                          >
                            {busy === `interest:${key}` ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1 h-3.5 w-3.5" />}
                            Intéressé
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAsk?.(`Analyse ${item.title} à ${moneyXof(item.price, item.currency)}. Est-ce un bon prix et que dois-je vérifier avant de négocier ?`)}
                          >
                            <BrainCircuit className="mr-1 h-3.5 w-3.5" />Conseil IA
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sell" className="space-y-3">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-cyan-600" />Acheteurs compatibles</h3>
                <p className="mt-1 text-xs text-muted-foreground">WAOUH rapproche vos articles des demandes actives sans exposer les contacts.</p>
              </div>
              <Button size="sm" variant="outline" disabled={sellerLoading} onClick={() => void loadSeller()}>
                {sellerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Analyser mes articles
              </Button>
            </CardContent>
          </Card>

          {!sellerLoading && sellerGroups.length === 0 && (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucune opportunité chargée. Publiez un article ou lancez l’analyse.
            </div>
          )}

          {sellerGroups.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium">{sellerTotal} correspondance(s) acheteur trouvée(s)</div>
              {sellerGroups.map((group) => (
                <Card key={group.article.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="font-semibold">{group.article.title}</h4>
                        <p className="text-sm text-muted-foreground">{moneyXof(group.article.price, group.article.currency)}{group.article.city ? ` · ${group.article.city}` : ""}</p>
                      </div>
                      <Button
                        size="sm"
                        disabled={busy === `notify:${group.article.id}` || group.matched_count === 0}
                        onClick={() => void notifyBuyers(group.article.id)}
                      >
                        {busy === `notify:${group.article.id}` ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Target className="mr-1 h-3.5 w-3.5" />}
                        Notifier les compatibles
                      </Button>
                    </div>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {group.opportunities.map((opportunity) => (
                        <div key={opportunity.buyer_profile_id} className="rounded-xl border bg-muted/20 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium">{opportunity.query}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {opportunity.budget_max ? `Budget max ${moneyXof(opportunity.budget_max)} · ` : ""}
                                {nexusSourceLabel(opportunity.source)}
                              </div>
                            </div>
                            <Badge variant="secondary">{Math.round(opportunity.scores.total_score)}%</Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {opportunity.scores.reasons.slice(0, 3).map((reason) => (
                              <span key={reason} className="rounded-full bg-background px-2 py-1 text-[10px]">{reason}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="brain">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Copilote NEXUS</h3>
                  <p className="text-xs text-muted-foreground">L’IA classe, compare et surveille. Vous gardez la décision finale.</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border p-3">
                  <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-600" />
                  <div className="text-sm font-medium">Prix intelligent</div>
                  <div className="mt-1 text-xs text-muted-foreground">Médiane, moins cher et écart marché.</div>
                </div>
                <div className="rounded-xl border p-3">
                  <ShieldCheck className="mb-2 h-4 w-4 text-cyan-600" />
                  <div className="text-sm font-medium">Confiance</div>
                  <div className="mt-1 text-xs text-muted-foreground">Réputation, vérification et historique vendeur.</div>
                </div>
                <div className="rounded-xl border p-3">
                  <Target className="mb-2 h-4 w-4 text-violet-600" />
                  <div className="text-sm font-medium">Matching continu</div>
                  <div className="mt-1 text-xs text-muted-foreground">Offres et demandes se rapprochent automatiquement.</div>
                </div>
              </div>
              <Button disabled={busy === "preference"} onClick={() => void setProactiveMode()}>
                {busy === "preference" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Activer le réglage recommandé
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WaouhNexusDashboard;