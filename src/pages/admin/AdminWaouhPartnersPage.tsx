import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X } from 'lucide-react';

export default function AdminWaouhPartnersPage() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [p, s] = await Promise.all([
      supabase.from('waouh_partners' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('waouh_commission_settings' as any).select('*').eq('id', 1).single(),
    ]);
    setPartners((p.data as any) || []);
    setSettings(s.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateStatut = async (id: string, statut: string) => {
    const payload: any = { statut };
    if (statut === 'active') payload.date_activation = new Date().toISOString();
    const { error } = await supabase.from('waouh_partners' as any).update(payload).eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Statut mis à jour' }); load(); }
  };

  const saveSettings = async () => {
    const { error } = await supabase.from('waouh_commission_settings' as any).update({
      commission_plateforme_pct: Number(settings.commission_plateforme_pct),
      commission_partner_pct_sur_plateforme: Number(settings.commission_partner_pct_sur_plateforme),
      seuil_payout_fcfa: Number(settings.seuil_payout_fcfa),
    }).eq('id', 1);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else toast({ title: 'Paramètres enregistrés' });
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const effective = settings ? (settings.commission_plateforme_pct * settings.commission_partner_pct_sur_plateforme / 100).toFixed(2) : '0';

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-bold">Waouh Partners — Administration</h1>

      <Tabs defaultValue="partners">
        <TabsList>
          <TabsTrigger value="partners">Partenaires ({partners.length})</TabsTrigger>
          <TabsTrigger value="settings">Commission</TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Nom</TableHead><TableHead>Ville</TableHead><TableHead>Mobile Money</TableHead><TableHead>Statut</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {partners.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">{p.code_partenaire}</TableCell>
                      <TableCell>{p.nom}<div className="text-xs text-muted-foreground">{p.telephone}</div></TableCell>
                      <TableCell>{p.ville}</TableCell>
                      <TableCell>{p.mobile_money_operator} {p.mobile_money_number}</TableCell>
                      <TableCell><Badge variant={p.statut === 'active' ? 'default' : p.statut === 'rejected' ? 'destructive' : 'secondary'}>{p.statut}</Badge></TableCell>
                      <TableCell>
                        {p.statut === 'pending' && <>
                          <Button size="sm" variant="default" onClick={() => updateStatut(p.id, 'active')}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="destructive" className="ml-1" onClick={() => updateStatut(p.id, 'rejected')}><X className="h-4 w-4" /></Button>
                        </>}
                        {p.statut === 'active' && <Button size="sm" variant="outline" onClick={() => updateStatut(p.id, 'suspended')}>Suspendre</Button>}
                        {p.statut === 'suspended' && <Button size="sm" variant="default" onClick={() => updateStatut(p.id, 'active')}>Réactiver</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>Paramètres de commission</CardTitle><CardDescription>Commission effective partenaire : <strong>{effective}%</strong> du prix de vente</CardDescription></CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div><Label>Commission plateforme (%)</Label><Input type="number" step="0.1" value={settings?.commission_plateforme_pct || 0} onChange={e => setSettings({ ...settings, commission_plateforme_pct: e.target.value })} /></div>
              <div><Label>Part partenaire sur commission plateforme (%)</Label><Input type="number" step="1" value={settings?.commission_partner_pct_sur_plateforme || 0} onChange={e => setSettings({ ...settings, commission_partner_pct_sur_plateforme: e.target.value })} /></div>
              <div><Label>Seuil payout (FCFA)</Label><Input type="number" value={settings?.seuil_payout_fcfa || 0} onChange={e => setSettings({ ...settings, seuil_payout_fcfa: e.target.value })} /></div>
              <Button onClick={saveSettings}>Enregistrer</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
