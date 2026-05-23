import React from 'react';
import { useSupportRealtimeStats } from '@/hooks/useSupportRealtimeStats';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TicketIcon, Clock, CheckCircle2, ShieldCheck, AlertTriangle, Bot, TrendingUp } from 'lucide-react';
const ChartPlaceholder: React.FC<{ height?: number; label?: string }> = ({ height = 220, label = 'Graphique indisponible' }) => (
  <div className="flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md" style={{ height }}>{label}</div>
);
import { TicketCard } from './TicketCard';

const SEVERITY_COLORS = { critique: '#ef4444', majeure: '#f59e0b', mineure: '#3b82f6' };

export const AdminDashboard: React.FC = () => {
  const { stats, loading } = useSupportRealtimeStats();

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sevData = [
    { name: 'Critique', value: stats.bySeverity.critique, color: SEVERITY_COLORS.critique },
    { name: 'Majeure', value: stats.bySeverity.majeure, color: SEVERITY_COLORS.majeure },
    { name: 'Mineure', value: stats.bySeverity.mineure, color: SEVERITY_COLORS.mineure },
  ].filter((d) => d.value > 0);

  const moduleData = Object.entries(stats.byModule)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiCard icon={TicketIcon} label="Tickets ouverts" value={stats.open} color="text-blue-600 bg-blue-100" />
        <KpiCard icon={Clock} label="En cours N2" value={stats.inProgress} color="text-yellow-600 bg-yellow-100" />
        <KpiCard icon={CheckCircle2} label="Résolus 24h" value={stats.resolved24h} color="text-green-600 bg-green-100" />
        <KpiCard icon={ShieldCheck} label="SLA respecté" value={`${stats.slaRespected}%`} color="text-emerald-600 bg-emerald-100" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Tickets sur 7 jours</h3>
            <Badge variant="outline">{stats.total} total</Badge>
          </div>
          <ChartPlaceholder height={220} />
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Répartition par sévérité</h3>
          {sevData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Aucune donnée</div>
          ) : (
            <div className="space-y-2">
              {sevData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: d.color }} />{d.name}</span>
                  <span className="font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-semibold mb-3">Top modules concernés</h3>
          {moduleData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Aucune donnée</div>
          ) : (
            <div className="space-y-2">
              {moduleData.map((m) => {
                const max = moduleData[0]?.value || 1;
                return (
                  <div key={m.name} className="flex items-center gap-3 text-sm">
                    <span className="w-32 truncate">{m.name}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: `${(m.value / max) * 100}%` }} />
                    </div>
                    <span className="font-semibold w-8 text-right">{m.value}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Bot className="w-4 h-4 text-emerald-600" /> Performance Chatbot N1</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Résolution sans escalade</span>
                <span className="font-semibold">{stats.chatbotResolutionRate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${stats.chatbotResolutionRate}%` }} />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Le chatbot N1 prend en charge automatiquement les questions courantes basées sur le Guide SIGDSTS.
            </div>
            {stats.slaBreached > 0 && (
              <div className="flex items-center gap-2 text-sm bg-red-50 text-red-700 p-2 rounded-md border border-red-200">
                <AlertTriangle className="w-4 h-4" /> {stats.slaBreached} SLA dépassé(s)
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent tickets */}
      <div>
        <h3 className="font-semibold mb-3">File d'attente — Tickets récents</h3>
        {stats.recentTickets.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Aucun ticket pour le moment</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.recentTickets.map((t) => (
              <TicketCard key={t.id} ticket={t} basePath="/sigdsts/tickets" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ icon: React.ElementType; label: string; value: number | string; color: string }> = ({ icon: Icon, label, value, color }) => (
  <Card className="p-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  </Card>
);
