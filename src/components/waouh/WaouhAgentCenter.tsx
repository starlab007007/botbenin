import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BellRing, Bot, Loader2, Plus, RefreshCw, ShieldCheck, Store } from "lucide-react";
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
  offers: SignedOffer[];
  policy: SellerPolicy | null;
};

const EMPTY: CenterData = { missions: [], watches: [], approvals: [], activity: [], offers: [], policy: null };

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
const amount = (value: string) => value.trim() ? Number(value.replace(/\s/g, "")) : undefined;

export function WaouhAgentCenter({ compact = false }: { compact?: boolean }) {
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
    ]);
    setLoading(false);
    setData((previous) => ({
      missions: calls[0].status === "fulfilled" ? listFromAgenticData<AgentMission>(calls[0].value, "missions") : previous.missions,
      watches: calls[1].status === "fulfilled" ? listFromAgenticData<PriceWatch>(calls[1].value, "watches") : previous.watches,
      approvals: calls[2].status === "fulfilled" ? listFromAgenticData<NonFinancialApproval>(calls[2].value, "approvals") : previous.approvals,
      activity: calls[3].status === "fulfilled" ? listFromAgenticData<AgentActivity>(calls[3].value, "activities", "entries", "activity") : previous.activity,
      offers: calls[4].status === "fulfilled" ? listFromAgenticData<SignedOffer>(calls[4].value, "offers") : previous.offers,
      policy: calls[5].status === "fulfilled" ? calls[5].value.policy ?? calls[5].value.policies?.[0] ?? null : previous.policy,
    }));
  }, [user]);

  useEffect(() => { if (open && user) void refresh(); }, [open, user, refresh]);
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
            {!blocks.activity.length && !loading && <Empty text="Le journal affichera les recherches, comparaisons, alertes et décisions de l’agent." />}
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
