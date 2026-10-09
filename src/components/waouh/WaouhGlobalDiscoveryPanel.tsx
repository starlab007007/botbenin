import { WaouhOfferComparison } from "./WaouhOfferComparison";
import { WaouhJourneyProgress } from "./WaouhJourneyProgress";
import { progressiveNexusDiscovery } from "@/lib/waouh/progressiveDiscovery";
import { WaouhReasoningFeed, useReasoningFeed } from "./WaouhReasoningFeed";
import { buildSummary, externalSteps, planSteps, summaryStep, type ReasonSummary } from "@/lib/waouh/liveReasoning";
import { userFacingErrorText } from "@/lib/userFacingError";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, Camera, ExternalLink, Globe2, Loader2, MapPin, MessageCircle, Radar,
  Search, Send, Share2, Sparkles, Store, Upload, Users, Wifi, WifiOff, LockKeyhole,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { buildWaouhAuthRedirect } from "@/lib/waouhAccessPolicy";
import { supabase } from "@/integrations/supabase/client";
import {
  getNexusSources,
  ingestSharedCommerceSignal,
  createNexusMandate,
  prepareNexusContact,
  sendNexusDiscoveryContact,
  type NexusOpportunityJourney,
  type NexusDiscoveryMode,
  type NexusDiscoveryResult,
  type NexusDiscoverySource,
  type NexusResolvedDiscoveryMode,
  type NexusSmartDiscoveryPlan,
  type NexusSourceStatus,
} from "@/lib/waouh/nexus";
import { moneyXof } from "@/lib/waouh/agenticClient";
import { WaouhNexusContactSheet } from "./WaouhNexusContactSheet";

const sourceLabel = (key?: string | null) => {
  const value = String(key ?? "");
  const labels: Record<string, string> = {
    waouh_app: "WAOUH",
    partner: "Partenaire",
    whatsapp: "WhatsApp",
    share_to_waouh: "Partagé à WAOUH",
    radar_ia: "Radar IA",
    serpapi: "Web public",
    apify: "Web social",
    google_places: "Google Maps",
    facebook_business: "Facebook",
    instagram_business: "Instagram",
    tiktok_connected: "TikTok",
    telegram_public: "Telegram",
    benin_directory: "Annuaire Bénin",
    b2b_rfq: "B2B / RFQ",
    scout: "Scout terrain",
    voice: "Voix",
    sms_rcs: "SMS/RCS",
    ussd: "USSD",
  };
  return labels[value] ?? (value || "Source");
};

const stateLabel = (source: NexusDiscoverySource) => {
  if (source.operational_state === "live") return "Live";
  if (source.operational_state === "requires_config") return "À configurer";
  if (source.operational_state === "ingest_only") return "Partage / import";
  if (source.operational_state === "planned") return "Préparé";
  return "Désactivé";
};

const errorText = (error: unknown) => userFacingErrorText(error, "load");

type SharedSignalState = Awaited<ReturnType<typeof ingestSharedCommerceSignal>>;
type PreparedContactState = Awaited<ReturnType<typeof prepareNexusContact>> & { result: NexusDiscoveryResult };
type PreparedContactItem = PreparedContactState["contacts"][number];


export function WaouhGlobalDiscoveryPanel() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const requireAuth = (next = "/app/nexus"): boolean => {
    if (user) return true;
    navigate(buildWaouhAuthRedirect(next));
    return false;
  };
  const shareImageInput = useRef<HTMLInputElement>(null);
  const searchVersion = useRef(0);
  useEffect(() => () => { searchVersion.current += 1; }, []);
  const [urlParams] = useSearchParams();
  const urlMode = urlParams.get("mode");
  const [mode, setMode] = useState<NexusDiscoveryMode>(
    urlMode === "find_sellers" || urlMode === "find_buyers" ? urlMode : "auto",
  );
  const autoStarted = useRef(false);
  const [resolvedMode, setResolvedMode] = useState<NexusResolvedDiscoveryMode>("find_sellers");
  const [intelligence, setIntelligence] = useState<NexusSmartDiscoveryPlan | null>(null);
  const [query, setQuery] = useState(() => urlParams.get("q") || "");
  const [city, setCity] = useState(() => urlParams.get("city") || "");
  const [budget, setBudget] = useState(() => (urlParams.get("budget") || "").replace(/\D/g, ""));
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<NexusDiscoveryResult[]>([]);
  const [sourceMix, setSourceMix] = useState<Record<string, number>>({});
  const [refreshState, setRefreshState] = useState<Record<string, {
    configured?: boolean;
    inserted?: number;
    reason?: string | null;
    surfaces?: Record<string, number>;
  }>>({});
  const [sources, setSources] = useState<NexusSourceStatus | null>(null);
  const [shareText, setShareText] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareOrigin, setShareOrigin] = useState("whatsapp");
  const [shareImageUrl, setShareImageUrl] = useState("");
  const [shareImageName, setShareImageName] = useState("");
  const [sharedSignal, setSharedSignal] = useState<SharedSignalState | null>(null);
  const [contact, setContact] = useState<PreparedContactState | null>(null);
  const [contactJourney, setContactJourney] = useState<NexusOpportunityJourney | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [mandateBusy, setMandateBusy] = useState(false);
  const feed = useReasoningFeed();
  const [reasonSummary, setReasonSummary] = useState<ReasonSummary | null>(null);

  const liveSources = useMemo(
    () => (sources?.registry ?? []).filter((source) => source.operational_state === "live"),
    [sources],
  );

  const loadSources = async () => {
    try {
      setSources(await getNexusSources());
    } catch {
      // Non-blocking: discovery itself can still work.
    }
  };

  useEffect(() => { void loadSources(); }, []);

  const searchEverywhere = async () => {
    if (!query.trim() || busy) return;
    const version = ++searchVersion.current;
    setBusy(true);
    setResults([]);
    setIntelligence(null);
    setRefreshState({});
    setSourceMix({});
    setContact(null);
    setContactJourney(null);
    const ctx = { query: query.trim(), city: city.trim() || undefined, budget: Number(budget) || null };
    feed.reset();
    setReasonSummary(null);
    feed.push(planSteps(ctx));
    try {
      const response = await progressiveNexusDiscovery({
        query: query.trim(),
        mode,
        city: city.trim() || undefined,
        budget_max: mode !== "find_buyers" && budget ? Number(budget) : undefined,
        limit: 24,
        refresh_external: !!user,
        smart: !!user,
      }, indexed => {
        if (version !== searchVersion.current) return;
        setResults(indexed.results);
        setSourceMix(indexed.source_mix);
        setResolvedMode(indexed.mode);
        setRefreshState({});
      });
      if (version !== searchVersion.current) return;
      setResults(response.results);
      setSourceMix(response.source_mix);
      setRefreshState(response.refresh ?? {});
      setResolvedMode(response.mode);
      setIntelligence(response.intelligence ?? null);
      {
        const found = { results: response.results, source_mix: response.source_mix, refresh: (response.refresh ?? {}) as any };
        const summary = buildSummary(null, found, ctx);
        setReasonSummary(summary);
        feed.push([...externalSteps(found, ctx), summaryStep(summary, ctx)]);
      }
      if (mode === "auto" && response.intelligence?.city && !city.trim()) {
        setCity(response.intelligence.city);
      }
      if (mode === "auto" && response.mode === "find_sellers" && !budget && response.intelligence?.budget_max) {
        setBudget(String(Math.round(response.intelligence.budget_max)));
      }
      if (!response.results.length) {
        toast({
          title: response.mode === "find_sellers"
            ? "Aucun vendeur assez proche pour l’instant"
            : "Aucun acheteur assez proche pour l’instant",
          description: "Confiez la recherche à Bot : il continue pour vous.",
        });
      }
      void loadSources();
    } catch (error) {
      if (version !== searchVersion.current) return;
      toast({ title: "Recherche impossible", description: errorText(error), variant: "destructive" });
    } finally {
      if (version === searchVersion.current) setBusy(false);
    }
  };

  useEffect(() => {
    if (autoStarted.current || urlParams.get("go") !== "1" || !query.trim()) return;
    autoStarted.current = true;
    void searchEverywhere();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const delegateSearchToBot = async () => {
    if (!query.trim() || mandateBusy) return;
    if (!requireAuth("/app/missions")) return;
    setMandateBusy(true);
    try {
      const response = await createNexusMandate({
        mode: resolvedMode === "find_buyers" ? "sell" : "buy",
        goal: query.trim(),
        autonomy_mode: "semi_autonomous",
        city: city.trim() || undefined,
        budget_max: resolvedMode === "find_sellers" && budget ? Number(budget) : undefined,
        max_contacts: 3,
        max_followups: 1,
        duration_hours: 24,
        scan_interval_minutes: 60,
        min_match_score: 70,
        min_actionability_score: 65,
        origin_surface: "global_discovery",
      });
      if (response.results?.length) setResults(response.results);
      toast({
        title: "Recherche confiée à Bot pour 24 h",
        description: `Maximum 3 prises de contact · ${response.actionable_count} opportunité(s) immédiatement actionnable(s).`,
      });
    } catch (error) {
      toast({ title: "Mission non créée", description: errorText(error), variant: "destructive" });
    } finally {
      setMandateBusy(false);
    }
  };

  const uploadSharedImage = async (file: File) => {
    if (!requireAuth("/app/nexus")) return;
    setBusy(true);
    try {
      const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `nexus/${user.id}/shared/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("waouh-uploads").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("waouh-uploads").getPublicUrl(path);
      setShareImageUrl(data.publicUrl);
      setShareImageName(file.name);
      toast({ title: "Image prête", description: "WAOUH Vision pourra extraire produit, prix, lieu et coordonnées visibles." });
    } catch (error) {
      toast({ title: "Import impossible", description: errorText(error), variant: "destructive" });
    } finally {
      setBusy(false);
      if (shareImageInput.current) shareImageInput.current.value = "";
    }
  };

  const ingestShare = async () => {
    if (!shareText.trim() && !shareImageUrl && !shareUrl.trim()) return;
    if (!requireAuth("/app/nexus")) return;
    setBusy(true);
    try {
      const response = await ingestSharedCommerceSignal({
        raw_text: shareText.trim() || undefined,
        image_url: shareImageUrl || undefined,
        source_url: shareUrl.trim() || undefined,
        origin_surface: shareOrigin,
        source_key: shareOrigin === "b2b" ? "b2b_rfq" : "share_to_waouh",
      });
      setSharedSignal(response);
      toast({
        title: "Signal compris par WAOUH",
        description: `${response.signal.intent} · ${response.signal.product_name ?? response.signal.category ?? "contenu commercial"}`,
      });
      setShareText("");
      setShareUrl("");
      setShareImageUrl("");
      setShareImageName("");
      void loadSources();
    } catch (error) {
      toast({ title: "Analyse impossible", description: errorText(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const prepareContact = async (result: NexusDiscoveryResult) => {
    if (!requireAuth("/app/nexus")) return;
    setBusy(true);
    try {
      const prepared = await prepareNexusContact(result.fabric_id);
      setContact({ ...prepared, result });
      setContactJourney(null);
      const product = result.subject ?? result.category ?? query;
      setContactMessage(`Bonjour, je vous contacte via WAOUH au sujet de « ${product} ». Est-ce toujours disponible / pertinent pour vous ?`);
      if (!prepared.contact_policy.can_reveal) {
        toast({ title: prepared.contact_policy.label, description: prepared.note });
      }
    } catch (error) {
      toast({ title: "Contact indisponible", description: errorText(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openUserInitiatedContact = (channel: string, value: string) => {
    if (!requireAuth("/app/nexus")) return;
    if (channel === "phone" || channel === "whatsapp") {
      const digits = value.replace(/\D/g, "");
      if (channel === "whatsapp") window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
      else window.location.href = `tel:+${digits}`;
      return;
    }
    if (/^https?:/i.test(value)) window.open(value, "_blank", "noopener,noreferrer");
    if (channel === "email") window.location.href = `mailto:${value}`;
  };

  const sendWithWaouh = async () => {
    if (!contact?.fabric_id || !contactMessage.trim()) return;
    if (!requireAuth("/app/nexus")) return;
    setBusy(true);
    try {
      const sent = await sendNexusDiscoveryContact({
        fabric_id: contact.fabric_id,
        mode: resolvedMode === "find_buyers" ? "sell" : "buy",
        message: contactMessage.trim(),
        confirmed: true,
      });
      setContactJourney(sent.journey || null);
      toast({
        title: "Contact WAOUH mis en file",
        description: sent.blind
          ? "Proposition transmise dans WAOUH sans révéler les coordonnées privées."
          : `${sent.channel} · contact …${sent.phone_last4 ?? ""}`,
      });
    } catch (error) {
      toast({ title: "Envoi non autorisé ou indisponible", description: errorText(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-[28px] border-blue-100 shadow-[0_24px_60px_-40px_rgba(37,99,235,.5)]">
      <CardContent className="space-y-4 p-3 sm:p-5">
        <Tabs defaultValue="hunt">
          <TabsList className="grid h-11 grid-cols-3 rounded-2xl bg-blue-50/70 p-1">
            <TabsTrigger value="hunt" className="gap-1 rounded-xl text-xs font-bold"><Search className="h-3.5 w-3.5" />Chercher</TabsTrigger>
            <TabsTrigger value="share" className="gap-1 rounded-xl text-xs font-bold"><Share2 className="h-3.5 w-3.5" />Partager</TabsTrigger>
            <TabsTrigger value="sources" className="gap-1 rounded-xl text-xs font-bold"><Radar className="h-3.5 w-3.5" />Réseau</TabsTrigger>
          </TabsList>

          <TabsContent value="hunt" className="space-y-3">
            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-violet-50/60 p-3 sm:p-4">
              <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="Intention">
                {([
                  ["auto", "IA", Sparkles],
                  ["find_sellers", "Acheter", Store],
                  ["find_buyers", "Vendre", Users],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    disabled={busy}
                    onClick={() => { setMode(value as NexusDiscoveryMode); setIntelligence(null); }}
                    className={`flex min-h-11 items-center justify-center gap-1.5 rounded-2xl text-xs font-black transition ${mode === value ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25" : "border border-blue-100 bg-white text-slate-600"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void searchEverywhere()}
                  aria-label="Votre besoin"
                  className="h-12 rounded-2xl border-blue-100 bg-white"
                  placeholder={mode === "find_buyers" ? "Que vendez-vous ?" : mode === "find_sellers" ? "Que cherchez-vous ?" : "Achat, vente, service… dites-le"}
                />
              </div>

              {!query.trim() ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(mode === "find_buyers"
                    ? ["10 tonnes de soja", "Mon téléphone", "50 sacs de ciment"]
                    : mode === "find_sellers"
                      ? ["Samsung S25 Cotonou", "Climatiseur 1,5 CV", "Moto d’occasion"]
                      : ["Un S25 fiable à Cotonou", "Vendre 10 tonnes de soja", "Plombier à Porto-Novo"]
                  ).map((chip) => (
                    <button key={chip} type="button" onClick={() => setQuery(chip)} className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-bold text-blue-700 shadow-sm active:scale-95">{chip}</button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-500" />
                    <Input aria-label="Ville ou zone" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ville" className="h-11 rounded-2xl border-blue-100 bg-white pl-8" />
                  </div>
                  {mode !== "find_buyers" ? (
                    <Input aria-label="Budget maximum en FCFA" value={budget} onChange={(event) => setBudget(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Budget FCFA" className="h-11 rounded-2xl border-blue-100 bg-white" />
                  ) : (
                    <div className="flex items-center rounded-2xl border border-dashed border-blue-100 bg-white/60 px-3 text-[11px] font-semibold text-slate-500">Bot cherche les acheteurs</div>
                  )}
                </div>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <Button className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 font-black text-white shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700" onClick={() => void searchEverywhere()} disabled={!query.trim() || busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Rechercher
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-2xl border-violet-200 bg-white font-bold text-violet-800 hover:bg-violet-50"
                  disabled={!query.trim() || mandateBusy}
                  onClick={() => void delegateSearchToBot()}
                >
                  {mandateBusy
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : user
                      ? <Sparkles className="mr-2 h-4 w-4" />
                      : <LockKeyhole className="mr-2 h-4 w-4" />}
                  {user ? "Confier à Bot · 24 h" : "Connexion pour confier à Bot"}
                </Button>
              </div>
            </div>

            <WaouhReasoningFeed
              steps={feed.shown}
              running={busy}
              pending={feed.pending}
              summary={reasonSummary}
              onSkip={feed.skip}
            />

            {results.length > 0 && (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">
                    {resolvedMode === "find_sellers" ? "Meilleures offres" : "Meilleurs acheteurs"}
                  </div>
                </div>
                <Badge variant="outline" className="border-blue-200 text-blue-700">{results.length}</Badge>
              </div>
            )}

            <div className="grid gap-2 lg:grid-cols-2">
              <WaouhOfferComparison results={results} />
              {results.map((result) => (
                <div key={result.fabric_id} className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{result.subject ?? result.category ?? "Signal commercial"}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                        {result.city && <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{result.city}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{Math.round(result.scores.total_score)}%</div>
                      <div className="text-[9px] text-muted-foreground">match</div>
                    </div>
                  </div>

                  {(result.price_min != null || result.price_max != null) && (
                    <div className="mt-2 text-sm font-semibold">
                      {result.price_min != null && result.price_max != null && result.price_min !== result.price_max
                        ? `${moneyXof(result.price_min)} – ${moneyXof(result.price_max)}`
                        : moneyXof(result.price_min ?? result.price_max)}
                    </div>
                  )}

                  <details className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center text-xs font-bold text-blue-700">Analyse de Bot</summary><div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">confiance {Math.round(result.scores.trust_score)}%</Badge>
                    {result.actionability_score != null && (
                      <Badge variant="outline" className="border-violet-200 text-violet-800">prêt à {Math.round(result.actionability_score)}%</Badge>
                    )}
                    {result.scores.reasons.slice(0, 2).map((reason) => <Badge key={reason} variant="outline">{reason}</Badge>)}
                  </div></details>

                  {(result.next_best_action || result.contact_pack?.next_best_action) && (
                    <div className="mt-2 rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] font-semibold text-violet-900">
                      Conseil de Bot : {(result.next_best_action || result.contact_pack?.next_best_action) === "CONTACT_NOW"
                        ? "contacter maintenant"
                        : (result.next_best_action || result.contact_pack?.next_best_action) === "OPEN_DEAL_ROOM"
                          ? "ouvrir le Deal Room"
                          : (result.next_best_action || result.contact_pack?.next_best_action) === "WAIT_REPLY"
                            ? "attendre la réponse"
                            : (result.next_best_action || result.contact_pack?.next_best_action) === "NEGOTIATE"
                              ? "négocier"
                              : "enrichir le contact"}
                      {(result.best_channel || result.contact_pack?.best_channel) ? ` · ${result.best_channel || result.contact_pack?.best_channel}` : ""}
                    </div>
                  )}
                  <div className="mt-3 [&_button]:h-11 [&_button]:w-full [&_button]:rounded-2xl">
                    <WaouhNexusContactSheet
                      fabricId={result.fabric_id}
                      title={result.subject ?? result.category ?? "Opportunité WAOUH"}
                      sourceUrl={result.source_url}
                      contactabilityLevel={result.contact_policy.level}
                      mode={resolvedMode === "find_buyers" ? "sell" : "buy"}
                    />
                  </div>
                </div>
              ))}
            </div>

            {contact && (
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{contact.actor_name ?? contact.result?.subject ?? "Contact"}</div>
                    <div className="text-[11px] text-muted-foreground">{contact.contact_policy.label}</div>
                  </div>
                  {contact.source_url && (
                    <Button size="sm" variant="ghost" onClick={() => window.open(contact.source_url, "_blank", "noopener,noreferrer")}>
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />Voir la source
                    </Button>
                  )}
                </div>
                {contact.note && <p className="mt-2 text-xs text-muted-foreground">{contact.note}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {(contact.contacts ?? []).map((item: PreparedContactItem) => (
                    <Button key={item.id} size="sm" variant="outline" onClick={() => openUserInitiatedContact(item.channel, item.value)}>
                      {item.channel === "email" ? "Email" : item.channel === "whatsapp" ? "WhatsApp" : "Appeler"} {item.value_last4 ? `…${item.value_last4}` : ""}
                    </Button>
                  ))}
                </div>
                {contactJourney && <div className="mt-3 space-y-2"><WaouhJourneyProgress journey={contactJourney} /><WaouhNexusContactSheet fabricId={contactJourney.fabric_id} journeyId={contactJourney.id} title={contactJourney.subject || "Opportunité"} mode={contactJourney.mode} sourceUrl={contactJourney.source_url} /></div>}
                {!contactJourney && (contact.contact_policy.can_auto_contact ||
                  contact.contact_policy.can_blind_message ||
                  contact.contact_policy.can_user_confirm_contact) && (
                  <div className="mt-3 space-y-2">
                    <Textarea value={contactMessage} onChange={(event) => setContactMessage(event.target.value)} rows={3} />
                    <Button size="sm" disabled={busy || !contactMessage.trim()} onClick={() => void sendWithWaouh()}>
                      <Send className="mr-1 h-3.5 w-3.5" />
                      {contact.contact_policy.level === "C1"
                        ? "Bot contacte ce professionnel"
                        : contact.contact_policy.can_blind_message
                          ? "Transmettre sans révéler les contacts"
                          : "WAOUH contacte maintenant"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="share" className="space-y-3">
            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><Share2 className="h-4 w-4" />Partagez une annonce, Bot la comprend</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
              <Select value={shareOrigin} onValueChange={setShareOrigin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="web">Site / annonce Web</SelectItem>
                  <SelectItem value="b2b">B2B / RFQ</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
              <Input value={shareUrl} onChange={(event) => setShareUrl(event.target.value)} placeholder="Lien source (optionnel)" />
            </div>
            <input
              ref={shareImageInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadSharedImage(file);
              }}
            />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Textarea
                value={shareText}
                onChange={(event) => setShareText(event.target.value)}
                rows={5}
                placeholder="Collez le message ou ajoutez une photo"
              />
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-20 gap-2 sm:w-36 sm:flex-col"
                disabled={busy}
                onClick={() => {
                  if (requireAuth("/app/nexus")) shareImageInput.current?.click();
                }}
              >
                {shareImageUrl ? <Camera className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                <span className="text-xs">{shareImageUrl ? "Changer l’image" : "Capture / photo"}</span>
              </Button>
            </div>
            {shareImageUrl && (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                <span className="truncate">📷 {shareImageName || "Image à analyser"}</span>
                <Button size="sm" variant="ghost" onClick={() => { setShareImageUrl(""); setShareImageName(""); }}>Retirer</Button>
              </div>
            )}
            <Button className="w-full" disabled={(!shareText.trim() && !shareImageUrl && !shareUrl.trim()) || busy} onClick={() => void ingestShare()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              Analyser avec Bot
            </Button>
            {sharedSignal && (
              <div className="rounded-xl border p-3 text-xs">
                <div className="font-semibold">{sharedSignal.signal.intent} · {sharedSignal.signal.product_name ?? sharedSignal.signal.category ?? "Signal"}</div>
                <div className="mt-1 text-muted-foreground">
                  Compris à {Math.round((sharedSignal.signal.confidence ?? 0) * 100)}%
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sources" className="space-y-2">
            {(sources?.registry ?? []).map((source) => (
              <div key={source.source_key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold">{source.label}</div>
                    <Badge variant={source.operational_state === "live" ? "secondary" : "outline"}>{stateLabel(source)}</Badge>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {source.family} · {source.connector_mode} · BUY {source.supports_buy ? "✓" : "—"} · SELL {source.supports_sell ? "✓" : "—"} · contact {source.default_contactability}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {source.supports_business && <Building2 className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-semibold">{source.signal_count}</span>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default WaouhGlobalDiscoveryPanel;
