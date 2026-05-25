import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SmartCombobox } from '@/components/ui/smart-combobox';
import { PhoneInput } from '@/components/ui/phone-input';
import { BENIN_CITY_NAMES, MOMO_OPERATORS } from '@/data/beninLocations';
import { partnerEnrollmentSchema, flattenZodErrors } from '@/lib/validation/waouh';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { useWaouhPartnerStats } from '@/hooks/useWaouhPartnerStats';
import { PartnerActivityFeed } from '@/components/waouh/PartnerActivityFeed';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Package, TrendingUp, Wallet, Loader2, Activity, Bell } from 'lucide-react';

export default function PartnerDashboardPage() {
  const { partner, loading, apply, refresh } = useWaouhPartner();
  const { toast } = useToast();
  const { stats } = useWaouhPartnerStats(partner?.id);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nom: '', telephone: '', whatsapp: '', ville: '',
    mobile_money_number: '', mobile_money_operator: 'MTN',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Realtime sales notifications for the partner
  useEffect(() => {
    if (!partner) return;
    const ch = supabase.channel(`sales-${partner.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waouh_partner_sales', filter: `partner_id=eq.${partner.id}` }, (payload) => {
        const s: any = payload.new;
        toast({
          title: '🎉 Nouvelle vente !',
          description: `Vente de ${Number(s.montant_vente).toLocaleString()} F · commission ${Number(s.commission_partner).toLocaleString()} F`,
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [partner?.id, toast]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  if (!partner) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Devenir Waouh Partner</CardTitle>
            <CardDescription>Inscrivez-vous comme partenaire terrain et gagnez une commission sur chaque vente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nom complet *</Label>
              <Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                className={errors.nom ? 'border-destructive' : ''} />
              {errors.nom && <p className="text-xs text-destructive mt-1">{errors.nom}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Téléphone *</Label><PhoneInput value={form.telephone} onChange={v => setForm({ ...form, telephone: v })} invalid={!!errors.telephone} errorMessage={errors.telephone} /></div>
              <div><Label>WhatsApp</Label><PhoneInput value={form.whatsapp} onChange={v => setForm({ ...form, whatsapp: v })} invalid={!!errors.whatsapp} errorMessage={errors.whatsapp} /></div>
            </div>
            <div>
              <Label className="flex items-center gap-1"><span className="text-base leading-none">🇧🇯</span>Ville *</Label>
              <SmartCombobox value={form.ville} onChange={v => setForm({ ...form, ville: v })}
                options={BENIN_CITY_NAMES} placeholder="Sélectionner une ville"
                invalid={!!errors.ville} errorMessage={errors.ville} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Opérateur Mobile Money *</Label>
                <SmartCombobox value={form.mobile_money_operator} onChange={v => setForm({ ...form, mobile_money_operator: v })}
                  options={MOMO_OPERATORS.map(o => o.value)} allowCustom={false}
                  invalid={!!errors.mobile_money_operator} errorMessage={errors.mobile_money_operator} />
              </div>
              <div><Label>Numéro Mobile Money *</Label><PhoneInput value={form.mobile_money_number} onChange={v => setForm({ ...form, mobile_money_number: v })} invalid={!!errors.mobile_money_number} errorMessage={errors.mobile_money_number} /></div>
            </div>
            <Button
              disabled={submitting}
              onClick={async () => {
                const parsed = partnerEnrollmentSchema.safeParse(form);
                if (!parsed.success) {
                  setErrors(flattenZodErrors(parsed.error) as any);
                  toast({ title: 'Corrigez les champs en rouge', variant: 'destructive' });
                  return;
                }
                setErrors({});
                setSubmitting(true);
                try { await apply(parsed.data); toast({ title: 'Candidature envoyée', description: 'Vous serez notifié après validation admin.' }); await refresh(); }
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">Espace Waouh Partner</h1>
          <p className="text-muted-foreground">Code : <strong>{partner.code_partenaire}</strong> · {partner.nom}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={partner.statut === 'active' ? 'default' : 'secondary'}>{partner.statut}</Badge>
          <Badge variant="outline">{partner.niveau}</Badge>
          {partner.kyc_verified && <Badge className="bg-emerald-600">KYC vérifié</Badge>}
        </div>
      </div>

      {partner.statut !== 'active' && (
        <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="pt-6">Votre compte est en attente d'activation par un administrateur.</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<Building2 className="h-5 w-5" />} label="Entreprises" value={stats?.nb_businesses ?? 0} />
        <StatCard icon={<Package className="h-5 w-5" />} label="Produits" value={stats?.nb_products ?? 0} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="CA 24h" value={`${Number(stats?.ca_24h ?? 0).toLocaleString()} F`} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="CA 7j" value={`${Number(stats?.ca_7j ?? 0).toLocaleString()} F`} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Commission due" value={`${Number(stats?.commission_en_attente ?? 0).toLocaleString()} F`} />
        <StatCard icon={<Wallet className="h-5 w-5 text-emerald-600" />} label="Totale" value={`${Number(stats?.commission_totale ?? 0).toLocaleString()} F`} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/partner/businesses"><Card className="hover:bg-accent transition-colors cursor-pointer h-full"><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Mes entreprises</CardTitle><CardDescription>Voir, modifier, supprimer</CardDescription></CardHeader></Card></Link>
        <Link to="/partner/sales"><Card className="hover:bg-accent transition-colors cursor-pointer h-full"><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Mes ventes</CardTitle><CardDescription>Suivi temps réel + commissions</CardDescription></CardHeader></Card></Link>
        <Link to="/partner/payouts"><Card className="hover:bg-accent transition-colors cursor-pointer h-full"><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Mes versements</CardTitle><CardDescription>Historique des paiements</CardDescription></CardHeader></Card></Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Activité temps réel <Bell className="h-4 w-4 text-emerald-600" /></CardTitle>
          <CardDescription>Vos évènements (entreprises, produits, ventes) en direct</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PartnerActivityFeed partnerId={partner.id} height="h-[360px]" />
        </CardContent>
      </Card>
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
