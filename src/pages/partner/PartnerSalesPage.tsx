import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { supabase } from '@/integrations/supabase/client';

export default function PartnerSalesPage() {
  const { partner } = useWaouhPartner();
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    if (!partner) return;
    supabase.from('waouh_partner_sales' as any).select('*').eq('partner_id', partner.id).order('date_vente', { ascending: false })
      .then(({ data }) => setSales((data as any) || []));
  }, [partner]);

  const total = sales.reduce((s, x) => s + Number(x.commission_partner || 0), 0);

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mes ventes & commissions</h1>
        <p className="text-muted-foreground">Total commission cumulée : <strong>{total.toLocaleString()} FCFA</strong></p>
      </div>
      <Card>
        <CardHeader><CardTitle>{sales.length} vente(s)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Source</TableHead><TableHead>Acheteur</TableHead><TableHead>Vente</TableHead><TableHead>Commission</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {sales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.date_vente).toLocaleDateString('fr')}</TableCell>
                    <TableCell><Badge variant="outline">{s.source}</Badge></TableCell>
                    <TableCell>{s.buyer_phone || '-'}</TableCell>
                    <TableCell>{Number(s.montant_vente).toLocaleString()} F</TableCell>
                    <TableCell className="font-semibold">{Number(s.commission_partner).toLocaleString()} F</TableCell>
                    <TableCell><Badge variant={s.statut === 'paid' ? 'default' : 'secondary'}>{s.statut}</Badge></TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune vente attribuée pour l'instant.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
