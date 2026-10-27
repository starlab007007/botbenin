import {WaouhAutomaticOffers} from './WaouhAutomaticOffers';
import {followAutomaticSearch,automaticMissionMessage,type AutomaticMission,type AutomaticSearch} from '@/lib/waouh/automaticMission';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {ArrowLeft,MoreHorizontal,ListChecks} from 'lucide-react';
import './minimal-premium.css';
import {loadAvatarAutonomy} from '@/lib/waouh/avatarAutonomy';
import { WaouhLiveMission,type MissionActivity } from './WaouhLiveMission';
import { WaouhEssentialOffers } from './WaouhEssentialOffers';
import { WaouhDelegateButton } from './WaouhDelegateButton';
import { WaouhOfferComparison } from "./WaouhOfferComparison";
import { WaouhCityField } from "./WaouhCityField";
import { WaouhSellPhotos, WaouhMyArticleCard } from "./WaouhSellPhotos";
import { WaouhJourneyProgress } from "./WaouhJourneyProgress";
import { progressiveNexusDiscovery } from "@/lib/waouh/progressiveDiscovery";
import { WaouhBotNextStep } from "./WaouhBotNextStep";
import { WaouhNexusResultCard } from "./WaouhNexusResultCard";
import { WaouhReasoningFeed, useReasoningFeed } from "./WaouhReasoningFeed";
import { buildSummary, externalSteps, methodSteps, planSteps, summaryStep, type ReasonSummary } from "@/lib/waouh/liveReasoning";
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
  listNexusOwnedArticles,
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


export function WaouhGlobalDiscoveryPanel({onTools}:{onTools?:()=>void}={}) {
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
  const [kind,setKind]=useState(urlParams.get('kind')|| (urlMode==='find_buyers'?'vendre':urlMode==='find_sellers'?'acheter':'trouver'));
  const autoStarted = useRef(false);
  const [resolvedMode, setResolvedMode] = useState<NexusResolvedDiscoveryMode>("find_sellers");
  const [intelligence, setIntelligence] = useState<NexusSmartDiscoveryPlan | null>(null);
  const [query, setQuery] = useState(() => urlParams.get("q") || "");
  const [city, setCity] = useState(() => urlParams.get("city") || "");
  const [budget, setBudget] = useState(() => (urlParams.get("budget") || "").replace(/\D/g, ""));
  const [busy, setBusy] = useState(false);
  const [paused,setPaused]=useState(false),[started,setStarted]=useState(false),[refreshing,setRefreshing]=useState(false),[liveError,setLiveError]=useState('');
  const [events,setEvents]=useState<MissionActivity[]>([]);
  const eventId=useRef(0);
  const record=(text:string)=>setEvents(items=>[...items,{id:++eventId.current,at:new Date().toISOString(),text}]);
  const [articleOpen,setArticleOpen]=useState(false),[articleLoading,setArticleLoading]=useState(false),[articles,setArticles]=useState<Array<{id:string;title:string;price:number}>>([]),[articleError,setArticleError]=useState('');
  const chooseArticle=async()=>{setArticleOpen(true);setArticleLoading(true);setArticleError('');try{setArticles((await listNexusOwnedArticles()).articles??[]);}catch{setArticleError('Chargement impossible. Réessayez.');}finally{setArticleLoading(false);}};
  const [lastSearch,setLastSearch]=useState<AutomaticSearch|null>(null),[completeSearch,setCompleteSearch]=useState<AutomaticSearch|null>(null);
  const [automatic,setAutomatic]=useState<AutomaticMission|null>(null),[automaticBusy,setAutomaticBusy]=useState(false),[automaticError,setAutomaticError]=useState(''),[automaticRetry,setAutomaticRetry]=useState(0),[activityOpen,setActivityOpen]=useState(false);
  useEffect(()=>{let active=true;setAutomatic(null);setAutomaticError('');setAutomaticBusy(false);if(!user||!completeSearch)return;setAutomaticBusy(true);followAutomaticSearch(user.id,completeSearch).then(r=>{if(active){setAutomatic(r);if(r.mandate)record(r.mandate.status==='paused'?'Le suivi de cette mission est en pause.':'Le suivi de Bot est enregistré.');}}).catch(()=>{if(active)setAutomaticError('Suivi indisponible. Réessayez.');}).finally(()=>{if(active)setAutomaticBusy(false);});return()=>{active=false;};},[completeSearch,user?.id,automaticRetry]);
  const [sellPhotos, setSellPhotos] = useState<string[]>([]);
  const [sellNotes, setSellNotes] = useState("");
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
    if(!query.trim()||busy)return;
    const version=++searchVersion.current;
    setBusy(true);setStarted(true);setPaused(false);setRefreshing(false);setLiveError('');setCompleteSearch(null);setResults([]);setContact(null);setContactJourney(null);
    setEvents([{id:++eventId.current,at:new Date().toISOString(),text:'Recherche lancée selon votre besoin.'}]);
    let preferred:Awaited<ReturnType<typeof loadAvatarAutonomy>>|null=null;
    try{
      if(user){try{preferred=await loadAvatarAutonomy();}catch{/* Public discovery remains available; the authenticated follow-up rechecks its own rules. */}}
      if(version!==searchVersion.current)return;
      const requestedBudget=Number(budget)||null;
      const capped=preferred?.budget_max&&requestedBudget?Math.min(preferred.budget_max,requestedBudget):requestedBudget??preferred?.budget_max??null;
      const zone=city.trim()||preferred?.city||'';
      const request:AutomaticSearch={goal:query.trim(),city:zone||undefined,budget_max:mode!=='find_buyers'&&capped?capped:undefined,mode:mode==='find_buyers'?'sell':'buy'};
      setLastSearch(request);
      const response=await progressiveNexusDiscovery({query:request.goal,mode,city:zone||undefined,budget_max:request.budget_max,limit:24,refresh_external:!!user,smart:!!user},indexed=>{
        if(version!==searchVersion.current)return;
        setResults(indexed.results);setResolvedMode(indexed.mode);setRefreshing(!!user);
        record(indexed.results.length?`${indexed.results.length} premières offres reçues.`:'Recherche de nouvelles pistes.');
      });
      if(version!==searchVersion.current)return;
      setResults(response.results);setResolvedMode(response.mode);setSourceMix(response.source_mix);setRefreshState(response.refresh??{});setIntelligence(response.intelligence??null);
      const smartBudget=response.intelligence?.budget_max??undefined;
      const final:AutomaticSearch={...request,mode:response.mode==='find_buyers'?'sell':kind==='demander'?'ask':'buy',city:zone||response.intelligence?.city||undefined,budget_max:response.mode==='find_buyers'?undefined:request.budget_max??(preferred?.budget_max&&smartBudget?Math.min(preferred.budget_max,smartBudget):smartBudget)};
      setLastSearch(final);setCompleteSearch(final);
      if(!city.trim()&&final.city)setCity(final.city);
      if(!budget&&final.budget_max)setBudget(String(Math.round(final.budget_max)));
      record(response.results.length?`${response.results.length} offres reçues. Comparaison mise à jour.`:'Aucune piste compatible pour le moment.');
      void loadSources();
    }catch(error){if(version!==searchVersion.current)return;setLiveError('Recherche interrompue. Réessayez.');record('Recherche interrompue. Les premières pistes restent accessibles.');}
    finally{if(version===searchVersion.current)setBusy(false);}
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
      const rules=await loadAvatarAutonomy();
      const response = await createNexusMandate({
        mode: resolvedMode === "find_buyers" ? "sell" : "buy",
        goal: query.trim(),
        autonomy_mode: rules.mode,
        city: city.trim() || undefined,
        budget_max: resolvedMode === "find_sellers" && budget ? Number(budget) : undefined,
        photos: resolvedMode === "find_buyers" && sellPhotos.length ? sellPhotos : undefined,
        article_notes: resolvedMode === "find_buyers" && sellNotes.trim() ? sellNotes.trim() : undefined,
        max_contacts: rules.max_contacts,
        max_followups: rules.max_followups,
        duration_hours: rules.duration_hours,
        scan_interval_minutes: rules.scan_interval_minutes,
        allow_whatsapp:rules.allow_whatsapp,
        min_match_score: 70,
        min_actionability_score: 65,
        origin_surface: "global_discovery",
      });
      if (response.results?.length) setResults(response.results);
      toast({
        title: "Votre recherche est confiée à Bot",
        description: `Jusqu’à ${response.mandate.max_contacts} contacts, selon vos autorisations. Suivi disponible dans Missions.`,
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
    <Card className="wap wap-mission wmn border-0 bg-transparent shadow-none">
      <CardContent className="space-y-3 p-0">
        <Tabs defaultValue="hunt">


          <TabsContent value="hunt" className="space-y-3">
            <div className="wap-scenarios" hidden={started} role="group" aria-label="Mon parcours">{[['acheter','Acheter'],['vendre','Vendre'],['trouver','Trouver'],['demander','Demander']].map(([value,label])=><button type="button" key={value} aria-pressed={kind===value} disabled={busy} onClick={()=>{setKind(value);setMode(value==='vendre'?'find_buyers':value==='acheter'?'find_sellers':'auto');setResults([]);setStarted(false);}}>{label}</button>)}</div>
            <header className="wmn-head"><button type="button" className="wmn-icon" aria-label="Retour aux missions" onClick={()=>navigate('/app/missions')}><ArrowLeft/></button><div className="wmn-grow"><h1 className="!text-[19px]">{started?lastSearch?.goal||query:'Ma recherche'}</h1>{started&&<p className="wmn-meta mt-1">{lastSearch?.city||city||'Zone à préciser'}{lastSearch?.budget_max?` · ${moneyXof(lastSearch.budget_max)} max`:''}</p>}</div><button type="button" className="wmn-icon" aria-label="Mes outils de recherche" onClick={onTools}><MoreHorizontal/></button></header>
            <details className="wap-mobile-editor" open={!started}><summary>Modifier mon besoin</summary><div className="rounded-3xl border border-blue-100 bg-white p-3 sm:p-4">
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
                  <WaouhCityField value={city} onChange={setCity} ariaLabel="Ville ou zone" placeholder="Ville ou quartier" />
                  {mode !== "find_buyers" ? (
                    <Input aria-label="Budget maximum en FCFA" value={budget} onChange={(event) => setBudget(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Budget FCFA" className="h-11 rounded-2xl border-blue-100 bg-white" />
                  ) : (
                    <div className="flex items-center rounded-2xl border border-dashed border-blue-100 bg-white/60 px-3 text-[11px] font-semibold text-slate-500">Bot cherche les acheteurs</div>
                  )}
                </div>
              )}

              {mode === "find_buyers" && query.trim() && (
                <div className="mt-3 space-y-3">
                  <WaouhSellPhotos photos={sellPhotos} onPhotos={setSellPhotos} notes={sellNotes} onNotes={setSellNotes} />
                  {(sellPhotos.length > 0 || sellNotes.trim()) && (
                    <WaouhMyArticleCard title={query.trim()} city={city} photos={sellPhotos} notes={sellNotes} />
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
                  {user ? "Confier à Bot" : "Connexion pour confier à Bot"}
                </Button>
              </div>
            </div></details>
            {started&&<><button type="button" className="wmn-text" onClick={()=>setActivityOpen(true)}><ListChecks size={15}/>{busy?'Recherche en cours…':'Activité de Bot'}</button><Sheet open={activityOpen} onOpenChange={setActivityOpen}><SheetContent side="bottom" className="wmn-sheet" aria-describedby="wmn-search-log"><SheetTitle>Le travail de Bot</SheetTitle><SheetDescription id="wmn-search-log" className="sr-only">Étapes réelles de cette recherche.</SheetDescription><WaouhLiveMission busy={busy} paused={paused} count={results.length} refreshing={refreshing} error={liveError} events={events} onPause={()=>{searchVersion.current++;setBusy(false);setPaused(true);setCompleteSearch(null);record('Recherche mise en pause.');}} onResume={()=>void searchEverywhere()}/></SheetContent></Sheet></>}
            {liveError&&<p role="alert" className="wmn-error">{liveError}<button type="button" className="wmn-text" onClick={()=>void searchEverywhere()}>Réessayer</button></p>}
            {started&&!busy&&results.length===0&&<div className="wmn-screen-empty"><h2>{paused?'Recherche en pause':'Aucune piste pour le moment'}</h2><p>{automatic?.mandate?'Bot poursuit le suivi dans vos limites.':'Ajustez votre besoin ou relancez la recherche.'}</p><button type="button" className="wmn-primary" onClick={()=>automatic?.mandate?navigate(`/app/missions?mandate=${automatic.mandate.id}`):void searchEverywhere()}>{automatic?.mandate?'Suivre Bot':'Réessayer'}</button></div>}
            {results.length>0&&<WaouhAutomaticOffers results={results} criteria={{query:lastSearch?.goal||query,city:lastSearch?.city||city,budget:automatic?.mandate?.budget_max??lastSearch?.budget_max??(Number(budget)||null),mode:lastSearch?.mode||'buy'}} tracking={automaticError||(automatic?.skipped==='paused'?'Bot est en pause.':automatic?.skipped==='article_required'?'Sélectionnez l’article à vendre pour activer le suivi.':automatic?.skipped==='approval_required'?'Votre mode actuel demande une validation des actions.':automatic?.mandate?automaticMissionMessage(automatic.mandate):undefined)} actionLabel={busy?'Recherche en cours…':automaticBusy?'Préparation du suivi…':automatic?.mandate?'Suivre Bot':automaticError?'Réessayer le suivi':automatic?.skipped==='paused'?'Réactiver Bot':automatic?.skipped==='approval_required'?'Choisir cette piste':automatic?.skipped==='article_required'?'Choisir mon article':user?'Confier cette recherche':'Connexion pour le suivi'} onAction={()=>{if(busy)return; if(automatic?.mandate)navigate(`/app/missions?mandate=${automatic.mandate.id}`);else if(!user)requireAuth(window.location.pathname+window.location.search);else if(automatic?.skipped==='paused')navigate('/app/avatar');else if(automatic?.skipped==='article_required'){void chooseArticle();}else if(automatic?.skipped==='approval_required'){navigate('/app/missions?view=suivi');}else setAutomaticRetry(v=>v+1);}} manualChoice={automatic?.skipped==='approval_required'} onPriorityChange={value=>setCompleteSearch(current=>current?{...current,comparison_priority:value}:null)} renderActions={result=><><WaouhDelegateButton result={result} mode={resolvedMode==='find_buyers'?'sell':'buy'}/><WaouhNexusContactSheet fabricId={result.fabric_id} title={result.subject||'Offre'} sourceUrl={result.source_url} contactabilityLevel={result.contact_policy.level} mode={resolvedMode==='find_buyers'?'sell':'buy'}/></>}/>}

            <Sheet open={articleOpen} onOpenChange={setArticleOpen}><SheetContent side="bottom" className="wmn-sheet" aria-describedby="wmn-sale-article"><SheetTitle>Mon article à vendre</SheetTitle><SheetDescription id="wmn-sale-article">Choisissez l’article concerné par cette mission.</SheetDescription><div className="wmn">{articleLoading?<p role="status">Chargement…</p>:articles.map(a=><button type="button" className="wmn-setting" key={a.id} onClick={()=>{setCompleteSearch(current=>current?{...current,article_id:a.id}:null);setArticleOpen(false);}}><span className="wmn-grow"><strong>{a.title}</strong><small>{a.price>0?moneyXof(a.price):'Prix à préciser'}</small></span></button>)}{!articleLoading&&!articles.length&&!articleError&&<p className="wmn-description">Publiez d’abord votre article dans votre espace de vente.</p>}{articleError&&<p className="wmn-error" role="alert">{articleError}</p>}</div></SheetContent></Sheet>

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
          <details className="wap-mobile-editor"><summary>Autres actions</summary><TabsList className="grid h-11 grid-cols-3 rounded-2xl bg-blue-50/70 p-1">
            <TabsTrigger value="hunt" className="gap-1 rounded-xl text-xs font-bold"><Search className="h-3.5 w-3.5" />Chercher</TabsTrigger>
            <TabsTrigger value="share" className="gap-1 rounded-xl text-xs font-bold"><Share2 className="h-3.5 w-3.5" />Partager</TabsTrigger>
            <TabsTrigger value="sources" className="gap-1 rounded-xl text-xs font-bold"><Radar className="h-3.5 w-3.5" />Réseau</TabsTrigger>
          </TabsList></details>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default WaouhGlobalDiscoveryPanel;
