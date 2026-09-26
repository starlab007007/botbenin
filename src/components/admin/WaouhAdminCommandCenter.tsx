import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  ExternalLink,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Network,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

type Severity = "critical" | "warning" | "info";

type ModuleControl = {
  module_key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  automation_enabled: boolean;
  maintenance_message?: string | null;
  updated_at?: string | null;
};

type CommandCenter = {
  generated_at: string;
  overall_status: "healthy" | "warning" | "critical";
  alerts: Array<{
    severity: Severity;
    code: string;
    title: string;
    detail: string;
    target?: string | null;
  }>;
  modules: ModuleControl[];
  recent_control_audit: any[];
  chat: {
    messages_24h: number;
    by_channel: Record<string, number>;
    by_direction: Record<string, number>;
    active_threads: number;
    avatar_messages_24h: number;
    muse_messages_24h: number;
  };
  nexus: {
    signal_fabric_total: number;
    external_signals_24h: number;
    external_with_photo_24h: number;
    external_with_whatsapp_24h: number;
    matches_24h: number;
    match_status_24h: Record<string, number>;
    connectors: Array<{
      provider: string;
      label: string;
      active: boolean;
      configured: boolean;
      usage_today: number;
      daily_quota: number;
      last_test_status?: string | null;
      last_sync_status?: string | null;
      last_sync_at?: string | null;
    }>;
    sources_total: number;
    sources_active: number;
    sources_never_scanned: number;
    radar_auto?: {
      auto_enabled?: boolean;
      pause_until?: string | null;
      max_total_per_day?: number;
      max_per_contact_per_day?: number;
    } | null;
  };
  negotiation: {
    total: number;
    by_state: Record<string, number>;
    stale_48h: number;
  };
  deals: {
    total: number;
    active: number;
    by_status: Record<string, number>;
    issues: number;
  };
  outbound: {
    pending_total: number;
    pending_stale_15m: number;
    sent_24h: number;
    failed_24h: number;
    by_status_24h: Record<string, number>;
  };
  agents: {
    missions_total: number;
    missions_by_status: Record<string, number>;
    mission_errors: number;
    steps_by_status: Record<string, number>;
    step_errors: number;
    approvals_pending: number;
    outbox_failed: number;
  };
  approvals: {
    diffusion_pending: number;
    agent_pending: number;
  };
  integrations: {
    whatsapp_active_sessions: number;
    whatsapp_accounts: any[];
    native_messaging?: {
      enabled?: boolean;
      provider?: string;
      sms_enabled?: boolean;
      rcs_enabled?: boolean;
    } | null;
  };
  traces: {
    errors_24h: number;
  };
};

type AdminStats = {
  command_center?: CommandCenter;
};

const moduleMeta: Record<string, { icon: any; detail: (cc: CommandCenter) => string; manage: string; automation?: boolean }> = {
  nexus: {
    icon: Network,
    detail: (cc) => `${cc.nexus.external_signals_24h} signaux/24h · ${cc.nexus.matches_24h} matchs`,
    manage: "/admin/waouh?tab=radar",
    automation: true,
  },
  avatar_commerce: {
    icon: Sparkles,
    detail: (cc) => `${cc.chat.avatar_messages_24h} événement(s) Avatar/24h`,
    manage: "/app/avatar-commerce",
  },
  chat_web: {
    icon: MessageCircle,
    detail: (cc) => `${cc.chat.by_channel?.web ?? 0} messages Web/24h · ${cc.chat.active_threads} fils actifs`,
    manage: "/admin/waouh/historique",
  },
  chat_whatsapp: {
    icon: MessagesSquare,
    detail: (cc) => `${cc.chat.by_channel?.whatsapp ?? 0} messages/24h · ${cc.integrations.whatsapp_active_sessions} session(s) active(s)`,
    manage: "/admin/waouh/whatsapp-ops",
  },
  muse_agents: {
    icon: Bot,
    detail: (cc) => `${cc.agents.missions_total} mission(s) · ${cc.agents.approvals_pending} approbation(s)`,
    manage: "/app/missions",
    automation: true,
  },
  negotiation: {
    icon: Workflow,
    detail: (cc) => `${cc.negotiation.by_state?.proposed ?? 0} proposée(s) · ${cc.negotiation.stale_48h} stagnante(s)`,
    manage: "/admin/waouh/historique",
  },
  deals: {
    icon: ShoppingBag,
    detail: (cc) => `${cc.deals.active} deal(s) actif(s) · ${cc.deals.issues} à arbitrer`,
    manage: "/admin/waouh/deals",
  },
  outbound: {
    icon: Send,
    detail: (cc) => `${cc.outbound.pending_total} pending · ${cc.outbound.failed_24h} échec(s)/24h`,
    manage: "/admin/waouh/historique",
    automation: true,
  },
};

const severityMeta: Record<Severity, { label: string; cls: string }> = {
  critical: { label: "Critique", cls: "bg-red-100 text-red-700 border-red-200" },
  warning: { label: "Attention", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  info: { label: "À traiter", cls: "bg-blue-100 text-blue-700 border-blue-200" },
};

export default function WaouhAdminCommandCenter() {
  const navigate = useNavigate();
  const [cc, setCc] = useState<CommandCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyModule, setBusyModule] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-admin-stats", { body: {} });
      if (error) throw error;
      const next = (data as AdminStats)?.command_center;
      if (!next) throw new Error("Télémétrie Command Center absente.");
      setCc(next);
    } catch (error: any) {
      toast.error(error?.message || "Impossible de charger le centre de contrôle.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => void load(true), 700);
  }, [load]);

  useEffect(() => {
    void load();
    const channel = supabase.channel(`waouh-admin-command-${Math.random().toString(36).slice(2, 8)}`);
    [
      "waouh_messages",
      "waouh_external_commerce_signals",
      "waouh_deals",
      "waouh_negotiations",
      "waouh_outbound_queue",
      "waouh_agent_approvals",
      "waouh_radar_api_configs",
      "waouh_admin_module_controls",
    ].forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    });
    channel.subscribe();
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [load, scheduleRefresh]);

  const toggleModule = async (
    module: ModuleControl,
    field: "enabled" | "automation_enabled",
    value: boolean,
  ) => {
    setBusyModule(module.module_key);
    const params: any = {
      p_module_key: module.module_key,
      p_enabled: field === "enabled" ? value : null,
      p_automation_enabled: field === "automation_enabled" ? value : null,
      p_maintenance_message: null,
      p_metadata: null,
    };
    const { error } = await supabase.rpc("waouh_admin_set_module_control" as any, params);
    setBusyModule(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${module.label} mis à jour`);
    await load(true);
  };

  const dispatchNow = async () => {
    setDispatching(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-outbound-dispatch", {
        body: { limit: 100, manual: true },
      });
      if (error) throw error;
      toast.success(`Dispatcher exécuté · ${Number((data as any)?.sent ?? 0)} envoyé(s)`);
      await load(true);
    } catch (error: any) {
      toast.error(error?.message || "Échec du dispatcher.");
    } finally {
      setDispatching(false);
    }
  };

  const overall = useMemo(() => {
    if (!cc) return { label: "Chargement", cls: "bg-muted text-muted-foreground", icon: Activity };
    if (cc.overall_status === "critical") return { label: "Action requise", cls: "bg-red-100 text-red-700 border-red-200", icon: ShieldAlert };
    if (cc.overall_status === "warning") return { label: "Sous surveillance", cls: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertTriangle };
    return { label: "Opérationnel", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 };
  }, [cc]);

  if (loading && !cc) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement du centre de contrôle…
        </div>
      </Card>
    );
  }

  if (!cc) return null;
  const OverallIcon = overall.icon;
  const critical = cc.alerts.filter((a) => a.severity === "critical").length;
  const warning = cc.alerts.filter((a) => a.severity === "warning").length;
  const connectorReady = cc.nexus.connectors.filter((c) => c.active && c.configured && c.last_test_status !== "ko").length;
  const connectorActive = cc.nexus.connectors.filter((c) => c.active).length;
  const photoPct = cc.nexus.external_signals_24h
    ? Math.round((cc.nexus.external_with_photo_24h / cc.nexus.external_signals_24h) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <Card className="border-slate-200">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-slate-700" />
                <h2 className="text-lg font-semibold">WAOUH Command Center</h2>
                <Badge variant="outline" className={overall.cls}>
                  <OverallIcon className="mr-1 h-3.5 w-3.5" /> {overall.label}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Supervision et contrôle centralisés de NEXUS, Avatar, Chat, Muse/Agents IA, négociation, Deal Graph et sorties multicanales.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                Actualiser
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/admin/waouh/health-check")}>
                <Activity className="mr-1 h-4 w-4" /> Health Check
              </Button>
              <Button size="sm" onClick={() => void dispatchNow()} disabled={dispatching}>
                {dispatching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Zap className="mr-1 h-4 w-4" />}
                Dispatcher maintenant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <MetricCard label="Critiques" value={critical} icon={ShieldAlert} attention={critical > 0} />
        <MetricCard label="Alertes" value={warning} icon={AlertTriangle} attention={warning > 0} />
        <MetricCard label="Messages 24h" value={cc.chat.messages_24h} icon={MessageCircle} />
        <MetricCard label="NEXUS 24h" value={cc.nexus.external_signals_24h} icon={Network} />
        <MetricCard label="Deals actifs" value={cc.deals.active} icon={ShoppingBag} attention={cc.deals.issues > 0} />
        <MetricCard label="Approbations" value={cc.approvals.agent_pending + cc.approvals.diffusion_pending} icon={Users} attention={cc.approvals.agent_pending + cc.approvals.diffusion_pending > 0} />
      </div>

      {cc.alerts.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Centre d’alertes</CardTitle>
            <CardDescription>Les anomalies les plus importantes sont remontées ici avant les tableaux détaillés.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {cc.alerts.slice(0, 10).map((alert) => {
              const meta = severityMeta[alert.severity];
              return (
                <Alert key={alert.code} className="py-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex flex-wrap items-center gap-2 text-sm">
                    {alert.title}
                    <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                  </AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>{alert.detail}</span>
                    {alert.target && (
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => navigate(alert.target!)}>
                        Ouvrir <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Alert className="border-emerald-200 bg-emerald-50/60">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Chaîne opérationnelle</AlertTitle>
          <AlertDescription>Aucune alerte prioritaire remontée par le Command Center.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contrôle des modules</CardTitle>
          <CardDescription>
            « Actif » coupe/réactive l’entrée métier. « Automatisation » autorise les actions autonomes du module. Chaque changement est audité.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {cc.modules.map((module) => {
              const meta = moduleMeta[module.module_key] || { icon: Radio, detail: () => "", manage: "/admin/waouh" };
              const Icon = meta.icon;
              return (
                <div key={module.module_key} className="rounded-xl border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="rounded-lg border p-2"><Icon className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{module.label}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{meta.detail(cc)}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={module.enabled ? "text-emerald-700 border-emerald-200" : "text-red-700 border-red-200"}>
                      {module.enabled ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  <div className={`mt-3 grid gap-2 text-xs ${meta.automation ? "grid-cols-2" : "grid-cols-1"}`}>
                    <label className="flex items-center justify-between gap-2 rounded-lg border px-2 py-2">
                      <span>Actif</span>
                      <Switch
                        checked={module.enabled}
                        disabled={busyModule === module.module_key}
                        onCheckedChange={(value) => void toggleModule(module, "enabled", value)}
                      />
                    </label>
                    {meta.automation && (
                      <label className="flex items-center justify-between gap-2 rounded-lg border px-2 py-2">
                        <span>Auto</span>
                        <Switch
                          checked={module.automation_enabled}
                          disabled={!module.enabled || busyModule === module.module_key}
                          onCheckedChange={(value) => void toggleModule(module, "automation_enabled", value)}
                        />
                      </label>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="mt-2 h-7 w-full text-xs" onClick={() => navigate(meta.manage)}>
                    Gérer le module <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Network className="h-4 w-4" /> NEXUS & sources</CardTitle>
            <CardDescription>Collecte, enrichissement et Signal Fabric.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Signal Fabric" value={cc.nexus.signal_fabric_total} />
            <Row label="Signaux externes / 24h" value={cc.nexus.external_signals_24h} />
            <Row label="Avec photo / 24h" value={`${cc.nexus.external_with_photo_24h} (${photoPct}%)`} />
            <Row label="WhatsApp détecté / 24h" value={cc.nexus.external_with_whatsapp_24h} />
            <Row label="Connecteurs prêts" value={`${connectorReady}/${connectorActive}`} />
            <Row label="Sources actives" value={`${cc.nexus.sources_active}/${cc.nexus.sources_total}`} />
            {connectorActive > 0 && <Progress value={Math.round((connectorReady / connectorActive) * 100)} className="h-2" />}
            <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/admin/waouh?tab=radar")}>
              Configurer NEXUS / Radar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="h-4 w-4" /> Chat, Avatar & Muse</CardTitle>
            <CardDescription>Activité conversationnelle et agentique.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Web / 24h" value={cc.chat.by_channel?.web ?? 0} />
            <Row label="WhatsApp / 24h" value={cc.chat.by_channel?.whatsapp ?? 0} />
            <Row label="App / 24h" value={(cc.chat.by_channel?.app ?? 0) + (cc.chat.by_channel?.flutter ?? 0)} />
            <Row label="Avatar / 24h" value={cc.chat.avatar_messages_24h} />
            <Row label="Muse / Missions / 24h" value={cc.chat.muse_messages_24h} />
            <Row label="Fils actifs" value={cc.chat.active_threads} />
            <Row label="Sessions WA actives" value={cc.integrations.whatsapp_active_sessions} />
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/admin/waouh/historique")}>Historique</Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/admin/waouh/whatsapp-ops")}>WhatsApp Ops</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Workflow className="h-4 w-4" /> Négociation & Deals</CardTitle>
            <CardDescription>Funnel commercial de l’intérêt à la conclusion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Négociations" value={cc.negotiation.total} />
            <Row label="Proposées" value={cc.negotiation.by_state?.proposed ?? 0} />
            <Row label="Contre-propositions" value={cc.negotiation.by_state?.countered ?? 0} />
            <Row label="Stagnantes > 48h" value={cc.negotiation.stale_48h} attention={cc.negotiation.stale_48h > 0} />
            <Row label="Deals actifs" value={cc.deals.active} />
            <Row label="Litige / revue paiement" value={cc.deals.issues} attention={cc.deals.issues > 0} />
            <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/admin/waouh/deals")}>Ouvrir Deal Ops</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Journal des contrôles administrateur</CardTitle>
          <CardDescription>Traçabilité des derniers changements de modules, avec état avant/après.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(cc.recent_control_audit ?? []).slice(0, 8).map((event: any) => {
            const beforeEnabled = event.before_state?.enabled;
            const afterEnabled = event.after_state?.enabled;
            const beforeAuto = event.before_state?.automation_enabled;
            const afterAuto = event.after_state?.automation_enabled;
            const changed: string[] = [];
            if (beforeEnabled !== afterEnabled) changed.push(`actif ${beforeEnabled ? "ON" : "OFF"} → ${afterEnabled ? "ON" : "OFF"}`);
            if (beforeAuto !== afterAuto) changed.push(`auto ${beforeAuto ? "ON" : "OFF"} → ${afterAuto ? "ON" : "OFF"}`);
            return (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
                <div>
                  <span className="font-semibold">{event.module_key}</span>
                  <span className="ml-2 text-muted-foreground">{changed.join(" · ") || event.action}</span>
                </div>
                <span className="text-muted-foreground">{new Date(event.created_at).toLocaleString("fr-FR")}</span>
              </div>
            );
          })}
          {!cc.recent_control_audit?.length && (
            <div className="py-3 text-center text-xs text-muted-foreground">Aucun changement de contrôle enregistré.</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Send className="h-4 w-4" /> Sorties & files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Pending total" value={cc.outbound.pending_total} attention={cc.outbound.pending_stale_15m > 0} />
            <Row label="Pending > 15 min" value={cc.outbound.pending_stale_15m} attention={cc.outbound.pending_stale_15m > 0} />
            <Row label="Envoyés / 24h" value={cc.outbound.sent_24h} />
            <Row label="Échecs / 24h" value={cc.outbound.failed_24h} attention={cc.outbound.failed_24h > 0} />
            <Button size="sm" className="w-full" onClick={() => void dispatchNow()} disabled={dispatching}>
              {dispatching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Zap className="mr-1 h-4 w-4" />}
              Relancer la file
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4" /> Agents IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Missions" value={cc.agents.missions_total} />
            <Row label="Missions en erreur" value={cc.agents.mission_errors} attention={cc.agents.mission_errors > 0} />
            <Row label="Étapes en erreur" value={cc.agents.step_errors} attention={cc.agents.step_errors > 0} />
            <Row label="Approbations humaines" value={cc.agents.approvals_pending} attention={cc.agents.approvals_pending > 0} />
            <Row label="Outbox en erreur" value={cc.agents.outbox_failed} attention={cc.agents.outbox_failed > 0} />
            <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/app/missions")}>Missions & Agents</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" /> Administration détaillée</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <QuickButton label="Données unifiées" onClick={() => navigate("/admin/waouh/data-control")} />
            <QuickButton label="Health Check" onClick={() => navigate("/admin/waouh/health-check")} />
            <QuickButton label="Historique" onClick={() => navigate("/admin/waouh/historique")} />
            <QuickButton label="Deals" onClick={() => navigate("/admin/waouh/deals")} />
            <QuickButton label="Diffusions" badge={cc.approvals.diffusion_pending} onClick={() => navigate("/admin/waouh/diffusion-approvals")} />
            <QuickButton label="Partenaires" onClick={() => navigate("/admin/waouh/partners")} />
            <QuickButton label="Native SMS/RCS" onClick={() => navigate("/admin/waouh/native-messaging")} />
            <QuickButton label="WhatsApp Ops" onClick={() => navigate("/admin/waouh/whatsapp-ops")} />
          </CardContent>
        </Card>
      </div>

      <div className="text-right text-[10px] text-muted-foreground">
        Snapshot : {new Date(cc.generated_at).toLocaleString("fr-FR")}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, attention = false }: { label: string; value: number | string; icon: any; attention?: boolean }) {
  return (
    <Card className={attention ? "border-amber-300" : ""}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
        <div className={`mt-1 text-xl font-bold ${attention ? "text-amber-700" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, attention = false }: { label: string; value: number | string; attention?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${attention ? "text-amber-700" : ""}`}>{value}</span>
    </div>
  );
}

function QuickButton({ label, onClick, badge }: { label: string; onClick: () => void; badge?: number }) {
  return (
    <Button variant="outline" size="sm" className="relative h-10 justify-start text-xs" onClick={onClick}>
      {label}
      {!!badge && <Badge className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]">{badge}</Badge>}
    </Button>
  );
}
