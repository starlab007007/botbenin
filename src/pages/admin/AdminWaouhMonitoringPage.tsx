import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PartnerActivityFeed } from '@/components/waouh/PartnerActivityFeed';
import { useAllPartnerStats } from '@/hooks/useWaouhPartnerStats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Activity, AlertTriangle, Bot, MessageCircle, Network, RefreshCw, Send, ShoppingBag, TrendingUp, Users, Wallet } from 'lucide-react';

type CommandCenter = any;

export default function AdminWaouhMonitoringPage() {
  const { rows, loading } = useAllPartnerStats();
  const [cc, setCc] = useState<CommandCenter | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(true);

  const loadTelemetry = useCallback(async (quiet = false) => {
    if (!quiet) setTelemetryLoading(true);
    const { data, error } = await supabase.functions.invoke('waouh-admin-stats', { body: {} });
    if (error || !(data as any)?.command_center) {
      if (!quiet) toast.error(error?.message || 'Télémétrie WAOUH indisponible');
    } else {
      setCc((data as any).command_center);
    }
    if (!quiet) setTelemetryLoading(false);
  }, []);

  useEffect(() => {
    void loadTelemetry();
    const timer = window.setInterval(() => void loadTelemetry(true), 30000);
    return () => window.clearInterval(timer);
  }, [loadTelemetry]);

  const totals = rows.reduce((acc, r) => ({
    actifs: acc.actifs + (r.statut === 'active' ? 1 : 0),
    ca: acc.ca + Number(r.ca_30j || 0),
    commission: acc.commission + Number(r.commission_en_attente || 0),
    ventes: acc.ventes + Number(r.nb_ventes_30j || 0),
  }), { actifs: 0, ca: 0, commission: 0, ventes: 0 });

  const activeModules = cc?.modules?.filter((module: any) => module.enabled).length ?? 0;
  const moduleTotal = cc?.modules?.length ?? 0;
  const issueCount = (cc?.alerts?.length ?? 0) + (cc?.traces?.errors_24h ?? 0);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Activity className="h-7 w-7 text-emerald-600" />Monitoring WAOUH — opérations</h1>
          <p className="text-muted-foreground">NEXUS, canaux, IA, négociation, deals, outbound, SMS/RCS et partenaires · actualisation 30 s</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadTelemetry()} disabled={telemetryLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${telemetryLoading ? 'animate-spin' : ''}`} />Actualiser
          </Button>
          <Button asChild size="sm"><Link to="/admin/waouh?tab=control">Centre de contrôle</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <KPI icon={<Activity className="h-5 w-5" />} label="Modules ON" value={`${activeModules}/${moduleTotal}`} />
        <KPI icon={<Network className="h-5 w-5" />} label="Signaux NEXUS /24h" value={cc?.nexus?.external_signals_24h ?? '—'} />
        <KPI icon={<MessageCircle className="h-5 w-5" />} label="Messages /24h" value={cc?.chat?.messages_24h ?? '—'} />
        <KPI icon={<Bot className="h-5 w-5" />} label="Approbations IA" value={cc?.agents?.approvals_pending ?? '—'} />
        <KPI icon={<ShoppingBag className="h-5 w-5" />} label="Deals actifs" value={cc?.deals?.active ?? '—'} />
        <KPI icon={<Send className="h-5 w-5" />} label="Outbound pending" value={cc?.outbound?.pending_total ?? '—'} />
        <KPI icon={<AlertTriangle className="h-5 w-5" />} label="Alertes / erreurs" value={issueCount} />
        <KPI icon={<Users className="h-5 w-5" />} label="Partenaires actifs" value={totals.actifs} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <OpsCard title="NEXUS / Contact Layer" status={cc?.overall_status} href="/admin/waouh?tab=radar">
          <Metric label="Signal Fabric" value={cc?.nexus?.signal_fabric_total} />
          <Metric label="Matchs /24h" value={cc?.nexus?.matches_24h} />
          <Metric label="Sources actives" value={`${cc?.nexus?.sources_active ?? 0}/${cc?.nexus?.sources_total ?? 0}`} />
          <Metric label="Sources en retard" value={cc?.nexus?.sources_overdue ?? 0} warn={(cc?.nexus?.sources_overdue ?? 0) > 0} />
          <div className="grid grid-cols-5 gap-1 pt-1">
            {['C0','C1','C2','C3','C4'].map((level) => <div key={level} className="rounded border p-1 text-center text-[10px]">{level}<div className="font-semibold">{cc?.nexus?.fabric_by_contactability?.[level] ?? 0}</div></div>)}
          </div>
        </OpsCard>

        <OpsCard title="Chat / WhatsApp / SMS-RCS" status={(cc?.integrations?.whatsapp_active_sessions ?? 0) > 0 ? 'healthy' : 'warning'} href="/admin/waouh/whatsapp-ops">
          <Metric label="Fils actifs" value={cc?.chat?.active_threads} />
          <Metric label="WhatsApp /24h" value={cc?.chat?.by_channel?.whatsapp ?? 0} />
          <Metric label="Sessions WAHA" value={cc?.integrations?.whatsapp_active_sessions ?? 0} />
          <Metric label="Native Messaging" value={cc?.integrations?.native_messaging?.enabled ? 'ON' : 'OFF'} />
          <Metric label="Provider SMS/RCS" value={cc?.integrations?.native_messaging?.provider ?? '—'} />
        </OpsCard>

        <OpsCard title="Muse / Agents / Négociation" status={(cc?.agents?.mission_errors ?? 0) + (cc?.agents?.step_errors ?? 0) > 0 ? 'warning' : 'healthy'} href="/admin/waouh?tab=control&module=muse_agents">
          <Metric label="Missions" value={cc?.agents?.missions_total} />
          <Metric label="Erreurs missions" value={cc?.agents?.mission_errors ?? 0} warn={(cc?.agents?.mission_errors ?? 0) > 0} />
          <Metric label="Approbations" value={cc?.agents?.approvals_pending ?? 0} warn={(cc?.agents?.approvals_pending ?? 0) > 0} />
          <Metric label="Négociations" value={cc?.negotiation?.total ?? 0} />
          <Metric label="Stagnation >48h" value={cc?.negotiation?.stale_48h ?? 0} warn={(cc?.negotiation?.stale_48h ?? 0) > 0} />
        </OpsCard>

        <OpsCard title="Deal Graph / Outbound" status={(cc?.deals?.issues ?? 0) + (cc?.outbound?.failed_24h ?? 0) > 0 ? 'warning' : 'healthy'} href="/admin/waouh/deals">
          <Metric label="Deals actifs" value={cc?.deals?.active ?? 0} />
          <Metric label="Deals à arbitrer" value={cc?.deals?.issues ?? 0} warn={(cc?.deals?.issues ?? 0) > 0} />
          <Metric label="Outbound pending" value={cc?.outbound?.pending_total ?? 0} />
          <Metric label="Retard >15 min" value={cc?.outbound?.pending_stale_15m ?? 0} warn={(cc?.outbound?.pending_stale_15m ?? 0) > 0} />
          <Metric label="Échecs /24h" value={cc?.outbound?.failed_24h ?? 0} warn={(cc?.outbound?.failed_24h ?? 0) > 0} />
        </OpsCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">État des moteurs administrables</CardTitle>
          <CardDescription>Vue synthétique des interrupteurs persistants. Les changements se font dans le Centre de contrôle.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {(cc?.modules ?? []).map((module: any) => (
            <Link key={module.module_key} to={`/admin/waouh?tab=control&module=${module.module_key}`} className="rounded-lg border p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{module.label}</span><Badge variant={module.enabled ? 'default' : 'destructive'}>{module.enabled ? 'ON' : 'OFF'}</Badge></div>
              <div className="text-[11px] text-muted-foreground mt-1">Auto : {module.automation_enabled ? 'ON' : 'OFF'}</div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={<Users className="h-5 w-5" />} label="Partenaires actifs" value={totals.actifs} />
        <KPI icon={<TrendingUp className="h-5 w-5" />} label="Ventes 30j" value={totals.ventes} />
        <KPI icon={<TrendingUp className="h-5 w-5" />} label="CA 30j" value={`${totals.ca.toLocaleString()} F`} />
        <KPI icon={<Wallet className="h-5 w-5" />} label="Commissions à payer" value={`${totals.commission.toLocaleString()} F`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Écosystème partenaires</CardTitle><CardDescription>Classement par chiffre d'affaires sur 30 jours</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>Partenaire</TableHead><TableHead>Statut</TableHead>
                  <TableHead className="text-right">Entreprises</TableHead><TableHead className="text-right">Produits</TableHead>
                  <TableHead className="text-right">Ventes 30j</TableHead><TableHead className="text-right">CA 30j</TableHead><TableHead className="text-right">Commission due</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {loading && <TableRow><TableCell colSpan={8} className="text-center py-8">Chargement…</TableCell></TableRow>}
                  {rows.map(r => (
                    <TableRow key={r.partner_id}>
                      <TableCell className="font-mono text-xs">{r.code_partenaire}</TableCell><TableCell>{r.nom}</TableCell>
                      <TableCell><Badge variant={r.statut === 'active' ? 'default' : 'secondary'}>{r.statut}</Badge></TableCell>
                      <TableCell className="text-right">{r.nb_businesses}</TableCell><TableCell className="text-right">{r.nb_products}</TableCell>
                      <TableCell className="text-right">{r.nb_ventes_30j}</TableCell><TableCell className="text-right font-semibold">{Number(r.ca_30j).toLocaleString()} F</TableCell>
                      <TableCell className="text-right text-amber-700">{Number(r.commission_en_attente).toLocaleString()} F</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Activité partenaires</CardTitle><CardDescription>Évènements en direct</CardDescription></CardHeader>
          <CardContent className="p-0"><PartnerActivityFeed height="h-[520px]" /></CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ icon, label, value }: any) {
  return <Card><CardContent className="pt-6"><div className="flex items-center gap-2 text-muted-foreground text-sm">{icon}{label}</div><div className="text-2xl font-bold mt-1">{value}</div></CardContent></Card>;
}

function Metric({ label, value, warn = false }: { label: string; value: any; warn?: boolean }) {
  return <div className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{label}</span><span className={warn ? 'font-semibold text-amber-700' : 'font-semibold'}>{value ?? '—'}</span></div>;
}

function OpsCard({ title, status, href, children }: { title: string; status?: string; href: string; children: ReactNode }) {
  const variant = status === 'critical' ? 'destructive' : status === 'healthy' ? 'default' : 'secondary';
  return (
    <Card>
      <CardHeader className="pb-2"><div className="flex items-center justify-between gap-2"><CardTitle className="text-sm">{title}</CardTitle><Badge variant={variant as any}>{status || 'n/a'}</Badge></div></CardHeader>
      <CardContent className="space-y-2">{children}<Button asChild variant="outline" size="sm" className="w-full mt-2"><Link to={href}>Ouvrir la console</Link></Button></CardContent>
    </Card>
  );
}
