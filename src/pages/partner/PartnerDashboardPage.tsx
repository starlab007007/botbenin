import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Package, TrendingUp, Wallet, Loader2 } from 'lucide-react';

export default function PartnerDashboardPage() {
  const { partner, loading, apply, refresh } = useWaouhPartner();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nom: '', telephone: '', whatsapp: '', ville: '',
    mobile_money_number: '', mobile_money_operator: 'MTN'
  });
  const [stats, setStats] = useState({ businesses: 0, products: 0, sales_count: 0, commission_due: 0, commission_paid: 0 });

  useEffect(() => {
    if (!partner) return;
    (async () => {
      const [b, p, s] = await Promise.all([
        supabase.from('waouh_partner_businesses' as any).select('id', { count: 'exact', head: true }).eq('partner_id', partner.id),
        supabase.from('waouh_partner_products' as any).select('id', { count: 'exact', head: true }).eq('partner_id', partner.id),
        supabase.from('waouh_partner_sales' as any).select('commission_partner, statut').eq('partner_id', partner.id),
      ]);
      const sales = (s.data as any[]) || [];
      setStats({
        businesses: b.count || 0,
        products: p.count || 0,
        sales_count: sales.length,
        commission_due: sales.filter(x => x.statut !== 'paid').reduce((sum, x) => sum + Number(x.commission_partner || 0), 0),
        commission_paid: sales.filter(x => x.statut === 'paid').reduce((sum, x) => sum + Number(x.commission_partner || 0), 0),
      });
    })();
  }, [partner]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  if (!partner) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Devenir Waouh Partner</CardTitle>
            <CardDescription>
              Inscrivez-vous comme partenaire terrain et gagnez une commission sur chaque vente issue des entreprises que vous enrôlez.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nom complet *</Label><Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Téléphone</Label><Input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
            </div>
            <div><Label>Ville</Label><Input value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Opérateur Mobile Money</Label>
                <Select value={form.mobile_money_operator} onValueChange={v => setForm({ ...form, mobile_money_operator: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN</SelectItem>
                    <SelectItem value="Moov">Moov</SelectItem>
                    <SelectItem value="Wave">Wave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Numéro Mobile Money</Label><Input value={form.mobile_money_number} onChange={e => setForm({ ...form, mobile_money_number: e.target.value })} /></div>
            </div>
            <Button
              disabled={submitting || !form.nom}
              onClick={async () => {
                setSubmitting(true);
                try { await apply(form); toast({ title: 'Candidature envoyée', description: 'Vous serez notifié après validation admin.' }); await refresh(); }
                catch (e: any) { toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); }
                finally { setSubmitting(false); }
              }}
            >
              {submitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Soumettre la candidature
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Espace Waouh Partner</h1>
          <p className="text-muted-foreground">Code : <strong>{partner.code_partenaire}</strong> · {partner.nom}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={partner.statut === 'active' ? 'default' : 'secondary'}>{partner.statut}</Badge>
          <Badge variant="outline">{partner.niveau}</Badge>
        </div>
      </div>

      {partner.statut !== 'active' && (
        <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="pt-6">
            Votre compte est en attente d'activation par un administrateur. Vous pouvez déjà préparer vos données.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={<Building2 className="h-5 w-5" />} label="Entreprises" value={stats.businesses} />
        <StatCard icon={<Package className="h-5 w-5" />} label="Produits" value={stats.products} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Ventes" value={stats.sales_count} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Commission due" value={`${stats.commission_due.toLocaleString()} F`} />
        <StatCard icon={<Wallet className="h-5 w-5 text-green-600" />} label="Payée" value={`${stats.commission_paid.toLocaleString()} F`} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/partner/businesses"><Card className="hover:bg-accent transition-colors cursor-pointer"><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Mes entreprises</CardTitle><CardDescription>Enrôler et gérer les commerces</CardDescription></CardHeader></Card></Link>
        <Link to="/partner/sales"><Card className="hover:bg-accent transition-colors cursor-pointer"><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Mes ventes</CardTitle><CardDescription>Suivre les ventes et commissions</CardDescription></CardHeader></Card></Link>
        <Link to="/partner/payouts"><Card className="hover:bg-accent transition-colors cursor-pointer"><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Mes versements</CardTitle><CardDescription>Historique des paiements</CardDescription></CardHeader></Card></Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}
