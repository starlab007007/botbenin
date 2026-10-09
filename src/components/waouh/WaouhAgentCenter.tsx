import { WaouhExternalExchangeDisclosure } from './WaouhExternalExchange';
import { userFacingErrorText } from "@/lib/userFacingError";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, BellRing, Bot, Loader2, MessageCircle, Plus, RefreshCw, ShieldCheck, Sparkles, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { invokeWaouhAgentic } from "@/lib/waouh/agenticClient";
import { listNexusConversationBus, type NexusConversationBusEvent } from "@/lib/waouh/nexus";
import {
  listFromAgenticData, normalizeAgenticBlocks, type AgentActivity, type AgenticAction,
  type AgentMission, type NonFinancialApproval, type PriceWatch, type SellerPolicy, type SignedOffer,
} from "@/lib/waouh/agenticContracts";
import { WaouhAgentBlocks } from "./WaouhAgentBlocks";

type CenterData = {
  missions: AgentMission[];
  watches: PriceWatch[];
  approvals: NonFinancialApproval[];
  activity: AgentActivity[];
  bus: NexusConversationBusEvent[];
  offers: SignedOffer[];
  policy: SellerPolicy | null;
};

const MISSION_TEMPLATES = [
  { label: "🏍️ Moto d’occasion", goal: "Trouve une moto d’occasion en bon état, compare les prix et contacte les meilleurs vendeurs", city: "" },
  { label: "📱 Smartphone", goal: "Compare des smartphones neufs au meilleur rapport qualité/prix et trouve le vendeur le plus fiable", city: "" },
  { label: "🏠 Logement à louer", goal: "Trouve un logement à louer correspondant à mon budget et organise une visite", city: "Cotonou" },
  { label: "🤝 Négocier un prix", goal: "Négocie le meilleur prix pour l’article que je t’indique, sans dépasser mon budget", city: "" },
];

const EMPTY: CenterData = { missions: [], watches: [], approvals: [], activity: [], bus: [], offers: [], policy: null };

const errorMessage = (error: unknown) => userFacingErrorText(error, "generic");
const amount = (value: string) => value.trim() ? Number(value.replace(/\s/g, "")) : undefined;

export function WaouhAgentCenter({ compact = false, standalone = false }: { compact?: boolean; standalone?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("missions");
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [data, setData] = useState<CenterData>(EMPTY);
  const [missionGoal, setMissionGoal] = useState("");
  const [missionBudget, setMissionBudget] = useState("");
  const [missionCity, setMissionCity] = useState("");
  const [watchQuery, setWatchQuery] = useState("");
  const [watchTarget, setWatchTarget] = useState("");
  const [watchCadence, setWatchCadence] = useState("360");
  const [policyMode, setPolicyMode] = useState<"manual" | "assisted" | "automatic">("assisted");
  const [policyMin, setPolicyMin] = useState("");
  const [policyDiscount, setPolicyDiscount] = useState("10");
  const [policyZones, setPolicyZones] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const calls = await Promise.allSettled([
      invokeWaouhAgentic<{ missions?: AgentMission[] }>("mission.list", { limit: 30 }),
      invokeWaouhAgentic<{ watches?: PriceWatch[] }>("watch.list", { limit: 30 }),
      invokeWaouhAgentic<{ approvals?: NonFinancialApproval[] }>("approval.list", { status: "pending", limit: 30 }),
      invokeWaouhAgentic<{ entries?: AgentActivity[]; activity?: AgentActivity[]; activities?: AgentActivity[] }>("activity.list", { limit: 50 }),
      invokeWaouhAgentic<{ offers?: SignedOffer[] }>("offer.list", { limit: 30 }),
      invokeWaouhAgentic<{ policy?: SellerPolicy; policies?: SellerPolicy[] }>("seller_policy.get", {}),
      listNexusConversationBus({ limit: 60 }),
    ]);
    setLoading(false);
    setData((previous) => ({
      missions: calls[0].status === "fulfilled" ? listFromAgenticData<AgentMission>(calls[0].value, "missions") : previous.missions,
      watches: calls[1].status === "fulfilled" ? listFromAgenticData<PriceWatch>(calls[1].value, "watches") : previous.watches,
      approvals: calls[2].status === "fulfilled" ? listFromAgenticData<NonFinancialApproval>(calls[2].value, "approvals") : previous.approvals,
      activity: calls[3].status === "fulfilled" ? listFromAgenticData<AgentActivity>(calls[3].value, "activities", "entries", "activity") : previous.activity,
      bus: calls[6].status === "fulfilled" ? calls[6].value.events ?? [] : previous.bus,
      offers: calls[4].status === "fulfilled" ? listFromAgenticData<SignedOffer>(calls[4].value, "offers") : previous.offers,
      policy: calls[5].status === "fulfilled" ? calls[5].value.policy ?? calls[5].value.policies?.[0] ?? null : previous.policy,
    }));
  }, [user]);

  useEffect(() => { if ((open || standalone) && user) void refresh(); }, [open, standalone, user, refresh]);
  useEffect(() => {
    if (!data.policy) return;
    const rawMode = data.policy.mode;
    if (rawMode === "manual" || rawMode === "assisted" || rawMode === "automatic") setPolicyMode(rawMode);
    setPolicyMin(data.policy.min_price_amount == null ? "" : String(data.policy.min_price_amount));
    setPolicyDiscount(data.policy.max_discount_percent == null ? "10" : String(data.policy.max_discount_percent));
    setPolicyZones(data.policy.delivery_zones?.join(", ") || "");
  }, [data.policy]);

  const run = useCallback(async (action: AgenticAction, payload: Record<string, unknown>, success?: string) => {
    setBusyAction(action);
    try {
      await invokeWaouhAgentic(action, payload);
      if (success) toast({ title: success });
      await refresh();
      return true;
    } catch (error) {
      toast({ title: "Action impossible", description: errorMessage(error), variant: "destructive" });
      return false;
    } finally {
      setBusyAction(null);
    }
  }, [refresh, toast]);

  const createMission = async () => {
    const goal = missionGoal.trim();
    if (!goal) return;
    const budget = amount(missionBudget);
    const created = await run("mission.create", {
      goal,
      channel: "web",
      locale: "fr-BJ",
      constraints: { ...(budget !== undefined ? { budget_max_amount: budget, currency: "XOF" } : {}), ...(missionCity.trim() ? { city: missionCity.trim() } : {}) },
    }, "Mission créée");
    if (created) { setMissionGoal(""); setMissionBudget(""); }
  };

  const createWatch = async () => {
    const query = watchQuery.trim();
    if (!query) return;
    const created = await run("watch.create", {
      query,
      ...(amount(watchTarget) !== undefined ? { target_amount: amount(watchTarget), currency: "XOF" } : {}),
      check_interval_minutes: Math.max(60, Number(watchCadence) || 360),
    }, "Veille activée");
    if (created) { setWatchQuery(""); setWatchTarget(""); }
  };

  const savePolicy = async () => {
    await run("seller_policy.upsert", {
      mode: policyMode,
      ...(amount(policyMin) !== undefined ? { min_price_amount: amount(policyMin) } : {}),
      max_discount_percent: Math.min(100, Math.max(0, Number(policyDiscount) || 0)),
      allow_counteroffers: true,
      auto_expire_minutes: 1440,
      delivery_zones: policyZones.split(",").map((item) => item.trim()).filter(Boolean),
    }, "Politique vendeur enregistrée");
  };

  const blocks = useMemo(() => ({
    missions: normalizeAgenticBlocks(data.missions.map((mission) => ({ type: "mission_status", mission }))),
    watches: normalizeAgenticBlocks(data.watches.map((watch) => ({ type: "watch_status", watch }))),
    approvals: normalizeAgenticBlocks(data.approvals.map((approval) => ({ type: "approval", approval }))),
    activity: normalizeAgenticBlocks([{ type: "activity", entries: data.activity }]),
    offers: normalizeAgenticBlocks(data.offers.map((offer) => ({ type: "seller_offer", offer }))),
  }), [data]);

  const action = async (name: AgenticAction, payload: Record<string, unknown>) => { await run(name, payload, "Mise à jour enregistrée"); };
  const pendingCount = data.approvals.filter((approval) => approval.status === "pending").length;

  const busEventTitle = (event: NexusConversationBusEvent) => {
    switch (event.event_type) {
      case "nexus.external.message": return event.direction === "in" ? "Réponse externe reçue" : "Discussion externe";
      case "nexus.counterparty_reply": return "Réponse reçue";
      case "autonomy.external_contact_queued": return "Avatar a contacté une opportunité";
      case "autonomy.internal_contact_delivered": return "Contact WAOUH transmis";
      case "autonomy.followup_queued": return "Relance Avatar";
      case "nexus.contact.queued": return "Contact mis en file";
      case "avatar.mandate.created": return "Mandat Avatar activé";
      default: return event.event_type.replace(/[._]/g, " ");
    }
  };
  const busEventText = (event: NexusConversationBusEvent) => {
    const payload = event.payload || {};
    for (const key of ["reply_preview", "text", "subject", "message"]) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return event.fabric_id ? `Opportunité ${event.fabric_id}` : "Événement WAOUH";
  };
  const formatBusDate = (value: string) => {
    try {
      return new Intl.DateTimeFormat("fr-BJ", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
    } catch {
      return value;
    }
  };
  const activityCount = data.activity.length + data.bus.length;

  const activeMissionCount = data.missions.filter((mission) => !["completed", "cancelled", "failed"].includes(mission.status)).length;
  const activeWatchCount = data.watches.filter((watch) => ["active", "paused", "triggered"].includes(watch.status)).length;

if (standalone) {
    const triggeredWatches = data.watches.filter((watch) => watch.status === "triggered").length;
    const next = !user ? null
      : pendingCount > 0 ? { tone: "amber", title: `${pendingCount} action${pendingCount > 1 ? "s" : ""} attend${pendingCount > 1 ? "ent" : ""} votre validation`, hint: "L’Avatar est en pause tant que vous n’avez pas décidé.", cta: "Valider maintenant", go: () => setTab("approvals") }
      : triggeredWatches > 0 ? { tone: "emerald", title: `${triggeredWatches} veille${triggeredWatches > 1 ? "s ont" : " a"} déclenché une alerte`, hint: "Le prix ou la disponibilité a changé.", cta: "Voir les veilles", go: () => setTab("watches") }
      : activeMissionCount === 0 ? { tone: "cyan", title: "Lancez votre première mission", hint: "Dites ce que vous cherchez : WAOUH compare, contacte et négocie pour vous.", cta: "Créer une mission", go: () => { setTab("missions"); window.setTimeout(() => { const el = document.getElementById("mission-goal"); el?.scrollIntoView({ behavior: "smooth", block: "center" }); (el as HTMLTextAreaElement | null)?.focus({ preventScroll: true }); }, 80); } }
      : { tone: "emerald", title: `${activeMissionCount} mission${activeMissionCount > 1 ? "s" : ""} en cours — tout est sous contrôle`, hint: "Consultez le journal pour suivre chaque contact et relance.", cta: "Voir l’activité", go: () => setTab("activity") };
    const toneClass = next?.tone === "amber" ? "border-amber-300 bg-amber-50 text-amber-950" : next?.tone === "cyan" ? "border-cyan-200 bg-cyan-50 text-cyan-950" : "border-emerald-200 bg-emerald-50 text-emerald-950";
    return (
      <section className="h-full min-h-0 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_80%_0%,rgba(14,165,164,0.08),transparent_30%),linear-gradient(180deg,#f8fbfb_0%,#ffffff_38%)]">
        <div className="mx-auto w-full max-w-7xl space-y-3 p-3 pb-[calc(var(--shell-bottom,64px)+20px)] sm:space-y-4 sm:p-4 lg:p-5">
          <div className="relative overflow-hidden rounded-[24px] border border-emerald-200/70 bg-gradient-to-br from-[#062f2a] via-[#075f54] to-[#0f8d7d] p-4 text-white shadow-[0_24px_70px_-34px_rgba(5,95,86,.65)] sm:rounded-[28px] sm:p-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
            <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,.7fr)] lg:items-end">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-white/15 bg-white/12 text-white hover:bg-white/12"><Bot className="mr-1 h-3.5 w-3.5" />WAOUH One</Badge>
                  <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">Missions & veille</Badge>
                </div>
                <h1 className="text-xl font-black leading-[1.1] tracking-[-0.03em] sm:text-3xl">Vos objectifs continuent, même quand vous quittez le chat.</h1>
                <p className="mt-2 hidden max-w-2xl text-sm font-medium leading-relaxed text-emerald-50/85 sm:block">Lancez des missions, surveillez prix et disponibilité, validez les actions sensibles et pilotez les règles vendeur depuis un seul centre.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" className="min-h-[40px] rounded-xl bg-white text-emerald-900 hover:bg-emerald-50"><Link to="/app/muse"><Sparkles className="mr-2 h-4 w-4" />Ouvrir Muse</Link></Button>
                  <Button asChild size="sm" variant="outline" className="min-h-[40px] rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"><Link to="/app/chat/waouh">Retour au chat</Link></Button>
                  {user && <Button size="sm" variant="ghost" disabled={loading} onClick={() => void refresh()} className="min-h-[40px] rounded-xl text-white hover:bg-white/10 hover:text-white"><RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />Actualiser</Button>}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 rounded-[20px] border border-white/10 bg-black/10 p-2 backdrop-blur-sm sm:gap-2 sm:p-2.5 lg:grid-cols-2">
                {[
                  { label: "Missions", value: activeMissionCount, icon: Bot, go: "missions" },
                  { label: "Veilles", value: activeWatchCount, icon: BellRing, go: "watches" },
                  { label: "À valider", value: pendingCount, icon: ShieldCheck, go: "approvals" },
                  { label: "Activité", value: activityCount, icon: Activity, go: "activity" },
                ].map(({ label, value, icon: Icon, go }) => (
                  <button key={label} type="button" onClick={() => user && setTab(go)} className="rounded-2xl border border-white/10 bg-white/[0.07] p-2.5 text-left transition active:scale-95 sm:p-3">
                    <Icon className="h-4 w-4 text-emerald-100" />
                    <div className="mt-1.5 text-lg font-black sm:text-xl">{value}</div>
                    <div className="truncate text-[9px] font-bold uppercase tracking-wide text-white/60">{label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {next && (
              <div className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm ${toneClass}`} role="status">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-wider opacity-60">Prochaine meilleure action</div>
                  <div className="mt-0.5 text-sm font-black leading-snug">{next.title}</div>
                  <div className="mt-0.5 text-xs font-medium opacity-75">{next.hint}</div>
                </div>
                <Button size="sm" onClick={next.go} className="min-h-[44px] shrink-0 rounded-xl">{next.cta}</Button>
              </div>
            )}
            <div className={`rounded-2xl border border-emerald-200 bg-white p-3.5 shadow-sm ${next ? "" : "md:col-span-2"}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white"><MessageCircle className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900">Studio WhatsApp IA</div>
                  <div className="text-xs font-medium text-slate-500">Agents, conversations et BI de votre WhatsApp.</div>
                </div>
                <Button asChild size="sm" className="min-h-[44px] shrink-0 rounded-xl bg-[#25D366] text-white hover:bg-[#1fb857]"><Link to="/app/whatsapp">Ouvrir<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
              </div>
              <div className="mt-2.5 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                {[["Agents IA", "/app/whatsapp/select-agent"], ["Conversationnel", "/app/whatsapp/conversationnel"], ["BI WAOUH IA", "/app/whatsapp/bi"]].map(([label, to]) => (
                  <Link key={to} to={to} className="min-h-[36px] shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 text-[11px] font-bold leading-9 text-slate-700 active:scale-95">{label}</Link>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-2.5 shadow-[0_20px_55px_-38px_rgba(15,23,42,.35)] sm:rounded-[24px] sm:p-4">
{!user ? <div className="m-5 rounded-xl border bg-muted/30 p-5 text-center"><ShieldCheck className="mx-auto mb-2 h-8 w-8 text-cyan-600" /><h3 className="font-semibold">Connexion requise</h3><p className="mt-1 text-sm text-muted-foreground">Vos missions et règles vendeur sont privées et liées à votre compte.</p><Button asChild className="mt-4"><Link to="/auth">Se connecter</Link></Button></div> :
        <Tabs value={tab} onValueChange={setTab} className="p-0">
          <TabsList className="sticky top-0 z-10 flex h-auto w-full snap-x justify-start gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/95 p-1 backdrop-blur [scrollbar-width:none] sm:grid sm:grid-cols-5">
            <TabsTrigger value="missions" className="min-h-[44px] shrink-0 snap-start gap-1.5 rounded-xl px-3 py-2 text-xs font-black sm:px-2"><Bot className="h-3.5 w-3.5" />Missions{activeMissionCount > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">{activeMissionCount}</Badge>}</TabsTrigger>
            <TabsTrigger value="watches" className="min-h-[44px] shrink-0 snap-start gap-1.5 rounded-xl px-3 py-2 text-xs font-black sm:px-2"><BellRing className="h-3.5 w-3.5" />Veilles</TabsTrigger>
            <TabsTrigger value="approvals" className="min-h-[44px] shrink-0 snap-start gap-1.5 rounded-xl px-3 py-2 text-xs font-black sm:px-2"><ShieldCheck className="h-3.5 w-3.5" />Validations{pendingCount > 0 && <Badge className="ml-1 h-4 px-1 text-[9px]">{pendingCount}</Badge>}</TabsTrigger>
            <TabsTrigger value="seller" className="min-h-[44px] shrink-0 snap-start gap-1.5 rounded-xl px-3 py-2 text-xs font-black sm:px-2"><Store className="h-3.5 w-3.5" />Vendeur</TabsTrigger>
            <TabsTrigger value="activity" className="min-h-[44px] shrink-0 snap-start gap-1.5 rounded-xl px-3 py-2 text-xs font-black sm:px-2"><Activity className="h-3.5 w-3.5" />Activité</TabsTrigger>
          </TabsList>

          <TabsContent value="missions" className="mt-4 space-y-4 lg:grid lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0">
            <div id="mission-composer" className="rounded-2xl border bg-card p-3 shadow-sm lg:sticky lg:top-14"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4 text-cyan-600" />Nouvelle mission d’achat</h3><div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">{MISSION_TEMPLATES.map((template) => <button key={template.label} type="button" onClick={() => { setMissionGoal(template.goal); if (template.city) setMissionCity((current) => current || template.city); }} className="min-h-[36px] shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-bold text-emerald-900 active:scale-95">{template.label}</button>)}</div><div className="space-y-2"><Textarea id="mission-goal" value={missionGoal} onChange={(event) => setMissionGoal(event.target.value)} placeholder="Ex. Trouve une moto Bajaj d’occasion en bon état" className="min-h-20" /><div className="grid grid-cols-2 gap-2"><Input value={missionBudget} onChange={(event) => setMissionBudget(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Budget max. FCFA" /><Input value={missionCity} onChange={(event) => setMissionCity(event.target.value)} placeholder="Ville (optionnel)" /></div><Button className="w-full bg-cyan-600 text-white hover:bg-cyan-700" disabled={!missionGoal.trim() || !!busyAction} onClick={() => void createMission()}>{busyAction === "mission.create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}Lancer la mission</Button></div></div>
            <div className="min-w-0 space-y-3">{!blocks.missions.length && !loading && <Empty text="Aucune mission. Choisissez un modèle ci-dessus ou décrivez ce que WAOUH doit chercher et comparer." />}
            <WaouhAgentBlocks blocks={blocks.missions} onAction={action} busy={!!busyAction} /></div>
          </TabsContent>

          <TabsContent value="watches" className="mt-4 space-y-4 lg:grid lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0">
            <div className="rounded-2xl border bg-card p-3 shadow-sm lg:sticky lg:top-14"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4 text-cyan-600" />Nouvelle veille</h3><div className="space-y-2"><Input value={watchQuery} onChange={(event) => setWatchQuery(event.target.value)} placeholder="Article ou recherche à surveiller" /><div className="grid grid-cols-2 gap-2"><Input value={watchTarget} onChange={(event) => setWatchTarget(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Alerte sous… FCFA" /><select value={watchCadence} onChange={(event) => setWatchCadence(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="60">Chaque heure</option><option value="360">Toutes les 6 h</option><option value="1440">Chaque jour</option></select></div><Button className="w-full" disabled={!watchQuery.trim() || !!busyAction} onClick={() => void createWatch()}>{busyAction === "watch.create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}Activer la veille</Button></div></div>
            <div className="min-w-0 space-y-3">{!blocks.watches.length && !loading && <Empty text="Aucune veille active. WAOUH peut vous alerter quand le prix ou la disponibilité change." />}
            <WaouhAgentBlocks blocks={blocks.watches} onAction={action} busy={!!busyAction} /></div>
          </TabsContent>

          <TabsContent value="approvals" className="mt-4 space-y-3">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-900 dark:border-cyan-900 dark:bg-cyan-950/20 dark:text-cyan-100">Une validation est liée à une action précise de l’agent. Cet espace exclut volontairement toute autorisation financière.</div>
            {!blocks.approvals.length && !loading && <Empty text="Aucune action ne demande votre validation." />}
            <WaouhAgentBlocks blocks={blocks.approvals} onAction={action} busy={!!busyAction} />
          </TabsContent>

          <TabsContent value="seller" className="mt-4 space-y-4 lg:grid lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0">
            <div className="rounded-2xl border bg-card p-3 shadow-sm lg:sticky lg:top-14"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Store className="h-4 w-4 text-cyan-600" />Règles de l’agent vendeur</h3><div className="space-y-3"><div className="space-y-1"><Label>Mode de réponse</Label><select value={policyMode} onChange={(event) => setPolicyMode(event.target.value as typeof policyMode)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="manual">Manuel — proposer seulement</option><option value="assisted">Assisté — suggérer dans mes limites</option><option value="automatic">Automatique — répondre dans mes limites</option></select></div><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Prix plancher</Label><Input value={policyMin} onChange={(event) => setPolicyMin(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="FCFA" /></div><div className="space-y-1"><Label>Remise maximale</Label><Input value={policyDiscount} onChange={(event) => setPolicyDiscount(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="%" /></div></div><div className="space-y-1"><Label>Zones de livraison</Label><Input value={policyZones} onChange={(event) => setPolicyZones(event.target.value)} placeholder="Cotonou, Calavi, Porto-Novo" /></div><Button className="w-full" disabled={!!busyAction} onClick={() => void savePolicy()}>{busyAction === "seller_policy.upsert" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer les règles</Button></div></div>
            <div className="min-w-0 space-y-3"><h3 className="text-sm font-semibold">Offres structurées</h3>
            {!blocks.offers.length && !loading && <Empty text="Aucune offre en cours. Les offres créées pendant une négociation apparaîtront ici." />}
            <WaouhAgentBlocks blocks={blocks.offers} onAction={action} busy={!!busyAction} /></div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4 space-y-3">
            {!blocks.activity.length && data.bus.length === 0 && !loading && <Empty text="Le journal affichera les recherches, contacts, réponses, relances et décisions de l’Avatar." />}
            {data.bus.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Conversation Bus</h3>
                    <p className="text-[10px] font-medium text-slate-500">WAOUH · WhatsApp · NEXUS · Deal Room dans un seul journal.</p>
                  </div>
                  <Badge variant="outline">{data.bus.length}</Badge>
                </div>
                {data.bus.slice(0, 30).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900">{busEventTitle(event)}</div>
                        <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-600">{busEventText(event)}</div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[9px]">{event.channel}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold text-slate-500">
                      <span>{event.direction === "in" ? "Entrant" : event.direction === "out" ? "Sortant" : "Système"}</span>
                      <span>· {formatBusDate(event.created_at)}</span>
                      {event.fabric_id && <span className="max-w-[220px] truncate">· {event.fabric_id}</span>}
                      {event.thread_id && <span>· Deal Room lié</span>}
                    </div>
                    {event.journey_id && event.fabric_id?.startsWith("external:") && <WaouhExternalExchangeDisclosure journeyId={event.journey_id} />}
                  </div>
                ))}
              </div>
            )}
            <WaouhAgentBlocks blocks={blocks.activity} />
          </TabsContent>
        </Tabs>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" size={compact ? "icon" : "sm"} variant="ghost" className={compact ? "relative h-8 w-8" : "relative gap-1.5"} aria-label="Ouvrir les missions et veilles WAOUH">
          <Bot className="h-4 w-4" />{!compact && <span>Missions</span>}
          {pendingCount > 0 && <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center bg-amber-500 px-1 text-[9px] text-white">{pendingCount}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <div className="flex items-center justify-between gap-3 pr-7">
            <div><SheetTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-cyan-600" />WAOUH One · Missions & veille</SheetTitle><SheetDescription>Objectifs persistants, veilles, validations et règles vendeur — dans le même WAOUH. Aucune action de paiement.</SheetDescription></div>
            {user && <Button size="icon" variant="outline" disabled={loading} onClick={() => void refresh()} aria-label="Actualiser"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></Button>}
          </div>
        </SheetHeader>

        {!user ? <div className="m-5 rounded-xl border bg-muted/30 p-5 text-center"><ShieldCheck className="mx-auto mb-2 h-8 w-8 text-cyan-600" /><h3 className="font-semibold">Connexion requise</h3><p className="mt-1 text-sm text-muted-foreground">Vos missions et règles vendeur sont privées et liées à votre compte.</p><Button asChild className="mt-4"><Link to="/auth">Se connecter</Link></Button></div> :
        <Tabs value={tab} onValueChange={setTab} className="p-4">
          <TabsList className="flex h-auto w-full justify-start overflow-x-auto">
            <TabsTrigger value="missions" className="gap-1.5"><Bot className="h-3.5 w-3.5" />Missions</TabsTrigger>
            <TabsTrigger value="watches" className="gap-1.5"><BellRing className="h-3.5 w-3.5" />Veilles</TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Validations{pendingCount > 0 && <Badge className="ml-1 h-4 px-1 text-[9px]">{pendingCount}</Badge>}</TabsTrigger>
            <TabsTrigger value="seller" className="gap-1.5"><Store className="h-3.5 w-3.5" />Vendeur</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" />Activité</TabsTrigger>
          </TabsList>

          <TabsContent value="missions" className="space-y-4">
            <div className="rounded-xl border bg-card p-3 shadow-sm"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4 text-cyan-600" />Nouvelle mission d’achat</h3><div className="space-y-2"><Textarea value={missionGoal} onChange={(event) => setMissionGoal(event.target.value)} placeholder="Ex. Trouve une moto Bajaj d’occasion en bon état" className="min-h-20" /><div className="grid grid-cols-2 gap-2"><Input value={missionBudget} onChange={(event) => setMissionBudget(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Budget max. FCFA" /><Input value={missionCity} onChange={(event) => setMissionCity(event.target.value)} placeholder="Ville (optionnel)" /></div><Button className="w-full bg-cyan-600 text-white hover:bg-cyan-700" disabled={!missionGoal.trim() || !!busyAction} onClick={() => void createMission()}>{busyAction === "mission.create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}Lancer la mission</Button></div></div>
            {!blocks.missions.length && !loading && <Empty text="Aucune mission. Décrivez ce que WAOUH doit chercher et comparer." />}
            <WaouhAgentBlocks blocks={blocks.missions} onAction={action} busy={!!busyAction} />
          </TabsContent>

          <TabsContent value="watches" className="space-y-4">
            <div className="rounded-xl border bg-card p-3 shadow-sm"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4 text-cyan-600" />Nouvelle veille</h3><div className="space-y-2"><Input value={watchQuery} onChange={(event) => setWatchQuery(event.target.value)} placeholder="Article ou recherche à surveiller" /><div className="grid grid-cols-2 gap-2"><Input value={watchTarget} onChange={(event) => setWatchTarget(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Alerte sous… FCFA" /><select value={watchCadence} onChange={(event) => setWatchCadence(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="60">Chaque heure</option><option value="360">Toutes les 6 h</option><option value="1440">Chaque jour</option></select></div><Button className="w-full" disabled={!watchQuery.trim() || !!busyAction} onClick={() => void createWatch()}>{busyAction === "watch.create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}Activer la veille</Button></div></div>
            {!blocks.watches.length && !loading && <Empty text="Aucune veille active. WAOUH peut vous alerter quand le prix ou la disponibilité change." />}
            <WaouhAgentBlocks blocks={blocks.watches} onAction={action} busy={!!busyAction} />
          </TabsContent>

          <TabsContent value="approvals" className="space-y-3">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-900 dark:border-cyan-900 dark:bg-cyan-950/20 dark:text-cyan-100">Une validation est liée à une action précise de l’agent. Cet espace exclut volontairement toute autorisation financière.</div>
            {!blocks.approvals.length && !loading && <Empty text="Aucune action ne demande votre validation." />}
            <WaouhAgentBlocks blocks={blocks.approvals} onAction={action} busy={!!busyAction} />
          </TabsContent>

          <TabsContent value="seller" className="space-y-4">
            <div className="rounded-xl border bg-card p-3 shadow-sm"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Store className="h-4 w-4 text-cyan-600" />Règles de l’agent vendeur</h3><div className="space-y-3"><div className="space-y-1"><Label>Mode de réponse</Label><select value={policyMode} onChange={(event) => setPolicyMode(event.target.value as typeof policyMode)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="manual">Manuel — proposer seulement</option><option value="assisted">Assisté — suggérer dans mes limites</option><option value="automatic">Automatique — répondre dans mes limites</option></select></div><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Prix plancher</Label><Input value={policyMin} onChange={(event) => setPolicyMin(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="FCFA" /></div><div className="space-y-1"><Label>Remise maximale</Label><Input value={policyDiscount} onChange={(event) => setPolicyDiscount(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="%" /></div></div><div className="space-y-1"><Label>Zones de livraison</Label><Input value={policyZones} onChange={(event) => setPolicyZones(event.target.value)} placeholder="Cotonou, Calavi, Porto-Novo" /></div><Button className="w-full" disabled={!!busyAction} onClick={() => void savePolicy()}>{busyAction === "seller_policy.upsert" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer les règles</Button></div></div>
            <h3 className="text-sm font-semibold">Offres structurées</h3>
            {!blocks.offers.length && !loading && <Empty text="Aucune offre en cours. Les offres créées pendant une négociation apparaîtront ici." />}
            <WaouhAgentBlocks blocks={blocks.offers} onAction={action} busy={!!busyAction} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-3">
            {!blocks.activity.length && data.bus.length === 0 && !loading && <Empty text="Le journal affichera les recherches, contacts, réponses, relances et décisions de l’Avatar." />}
            {data.bus.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Conversation Bus</h3>
                    <p className="text-[10px] font-medium text-slate-500">WAOUH · WhatsApp · NEXUS · Deal Room dans un seul journal.</p>
                  </div>
                  <Badge variant="outline">{data.bus.length}</Badge>
                </div>
                {data.bus.slice(0, 30).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900">{busEventTitle(event)}</div>
                        <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-600">{busEventText(event)}</div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[9px]">{event.channel}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold text-slate-500">
                      <span>{event.direction === "in" ? "Entrant" : event.direction === "out" ? "Sortant" : "Système"}</span>
                      <span>· {formatBusDate(event.created_at)}</span>
                      {event.fabric_id && <span className="max-w-[220px] truncate">· {event.fabric_id}</span>}
                      {event.thread_id && <span>· Deal Room lié</span>}
                    </div>
                    {event.journey_id && event.fabric_id?.startsWith("external:") && <WaouhExternalExchangeDisclosure journeyId={event.journey_id} />}
                  </div>
                ))}
              </div>
            )}
            <WaouhAgentBlocks blocks={blocks.activity} />
          </TabsContent>
        </Tabs>}
      </SheetContent>
    </Sheet>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">{text}</div>;
}

export default WaouhAgentCenter;
