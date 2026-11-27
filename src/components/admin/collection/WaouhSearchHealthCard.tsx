import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Health = { by_kind: Record<string, { total: number; found: number; widened: number }>; sources_down: { label: string; last_success_at: string | null; failures: number }[]; sources_total: number };
const LABELS: Record<string, string> = { purchase: 'Acheter', sale: 'Vendre', service: 'Services', project: 'Prestations', opportunity: 'Opportunités' };

export default function WaouhSearchHealthCard() {
  const [data, setData] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    supabase.functions.invoke('waouh-admin-stats', { body: { action: 'search_health' } })
      .then(({ data, error }) => {
        if (error || !data?.ok || !data.by_kind || typeof data.by_kind !== 'object' || Array.isArray(data.by_kind)
          || !Array.isArray(data.sources_down) || typeof data.sources_total !== 'number') {
          setFailed(true);
          return;
        }
        setData(data);
      }, () => setFailed(true));
  }, []);
  if (failed) return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Indicateurs momentanément indisponibles. Réessayez plus tard.</CardContent></Card>;
  if (!data) return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Chargement des indicateurs…</CardContent></Card>;
  return (
    <div className="grid gap-4 lg:grid-cols-2 mb-4">
      <Card>
        <CardHeader><CardTitle>Recherches avec résultat</CardTitle><CardDescription>30 derniers jours, par parcours</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(data.by_kind).sort((a, b) => b[1].total - a[1].total).map(([k, v]) => {
            const pct = v.total ? Math.round((v.found / v.total) * 100) : 0;
            return <div key={k}><div className="flex justify-between text-sm"><span>{LABELS[k] ?? k}</span><span className="font-medium">{pct} % · {v.found}/{v.total}</span></div><Progress value={pct} className="h-2 mt-1" /></div>;
          })}
          {!Object.keys(data.by_kind).length && <p className="text-sm text-muted-foreground">Aucune recherche sur la période.</p>}
        </CardContent>
      </Card>
      <Card className={data.sources_down.length ? 'border-amber-400' : undefined}>
        <CardHeader><CardTitle className="flex items-center gap-2">{data.sources_down.length > 0 && <AlertTriangle className="h-5 w-5 text-amber-600" />}Sources en panne</CardTitle><CardDescription>{data.sources_down.length} sur {data.sources_total} sources actives</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {data.sources_down.slice(0, 12).map((s) => <div key={s.label} className="flex justify-between text-sm"><span>{s.label}</span><span className="text-muted-foreground">{s.last_success_at ? `OK le ${new Date(s.last_success_at).toLocaleDateString('fr-FR')}` : 'Jamais réussie'}</span></div>)}
          {!data.sources_down.length && <p className="text-sm text-muted-foreground">Toutes les sources répondent.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
