import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { supabase } from '@/integrations/supabase/client';

export default function PartnerPayoutsPage() {
  const { partner } = useWaouhPartner();
  const [payouts, setPayouts] = useState<any[]>([]);

  useEffect(() => {
    if (!partner) return;
    supabase.from('waouh_partner_payouts' as any).select('*').eq('partner_id', partner.id).order('created_at', { ascending: false })
      .then(({ data }) => setPayouts((data as any) || []));
  }, [partner]);

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-bold">Mes versements</h1>
      <Card>
        <CardHeader><CardTitle>{payouts.length} versement(s)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Période</TableHead><TableHead>Montant</TableHead><TableHead>Nb ventes</TableHead><TableHead>Réf Mobile Money</TableHead><TableHead>Statut</TableHead><TableHead>Date paiement</TableHead></TableRow></TableHeader>
            <TableBody>
              {payouts.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{p.periode_debut} → {p.periode_fin}</TableCell>
                  <TableCell className="font-semibold">{Number(p.montant_total).toLocaleString()} F</TableCell>
                  <TableCell>{p.nb_ventes}</TableCell>
                  <TableCell>{p.mobile_money_ref || '-'}</TableCell>
                  <TableCell><Badge variant={p.statut === 'paid' ? 'default' : 'secondary'}>{p.statut}</Badge></TableCell>
                  <TableCell>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('fr') : '-'}</TableCell>
                </TableRow>
              ))}
              {payouts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun versement pour l'instant.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
