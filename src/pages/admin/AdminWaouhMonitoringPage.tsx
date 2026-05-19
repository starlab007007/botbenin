import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PartnerActivityFeed } from '@/components/waouh/PartnerActivityFeed';
import { useAllPartnerStats } from '@/hooks/useWaouhPartnerStats';
import { Activity, TrendingUp, Users, Wallet } from 'lucide-react';

export default function AdminWaouhMonitoringPage() {
  const { rows, loading } = useAllPartnerStats();

  const totals = rows.reduce((acc, r) => ({
    actifs: acc.actifs + (r.statut === 'active' ? 1 : 0),
    ca: acc.ca + Number(r.ca_30j || 0),
    commission: acc.commission + Number(r.commission_en_attente || 0),
    ventes: acc.ventes + Number(r.nb_ventes_30j || 0),
  }), { actifs: 0, ca: 0, commission: 0, ventes: 0 });

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Activity className="h-7 w-7 text-emerald-600" />Monitoring Waouh Partners</h1>
        <p className="text-muted-foreground">Temps réel · {rows.length} partenaire(s)</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={<Users className="h-5 w-5" />} label="Partenaires actifs" value={totals.actifs} />
        <KPI icon={<TrendingUp className="h-5 w-5" />} label="Ventes 30j" value={totals.ventes} />
        <KPI icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} label="CA 30j" value={`${totals.ca.toLocaleString()} F`} />
        <KPI icon={<Wallet className="h-5 w-5 text-amber-600" />} label="Commissions à payer" value={`${totals.commission.toLocaleString()} F`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Classement partenaires (CA 30j)</CardTitle><CardDescription>Triés par chiffre d'affaires</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>Partenaire</TableHead><TableHead>Statut</TableHead>
                  <TableHead className="text-right">Entreprises</TableHead>
                  <TableHead className="text-right">Produits</TableHead>
                  <TableHead className="text-right">Ventes 30j</TableHead>
                  <TableHead className="text-right">CA 30j</TableHead>
                  <TableHead className="text-right">Commission due</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {loading && <TableRow><TableCell colSpan={8} className="text-center py-8">Chargement…</TableCell></TableRow>}
                  {rows.map(r => (
                    <TableRow key={r.partner_id}>
                      <TableCell className="font-mono text-xs">{r.code_partenaire}</TableCell>
                      <TableCell>{r.nom}</TableCell>
                      <TableCell><Badge variant={r.statut === 'active' ? 'default' : 'secondary'}>{r.statut}</Badge></TableCell>
                      <TableCell className="text-right">{r.nb_businesses}</TableCell>
                      <TableCell className="text-right">{r.nb_products}</TableCell>
                      <TableCell className="text-right">{r.nb_ventes_30j}</TableCell>
                      <TableCell className="text-right font-semibold">{Number(r.ca_30j).toLocaleString()} F</TableCell>
                      <TableCell className="text-right text-amber-700">{Number(r.commission_en_attente).toLocaleString()} F</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Activité globale</CardTitle><CardDescription>Tous évènements en direct</CardDescription></CardHeader>
          <CardContent className="p-0"><PartnerActivityFeed height="h-[520px]" /></CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ icon, label, value }: any) {
  return (
    <Card><CardContent className="pt-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}
