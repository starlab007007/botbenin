import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPhoneDisplay } from '@/lib/phone';
import { PartnerPermissionsMatrix } from '@/components/waouh/PartnerPermissionsMatrix';
import { PartnerActivityFeed } from '@/components/waouh/PartnerActivityFeed';
import { useWaouhPartnerStats } from '@/hooks/useWaouhPartnerStats';
import { Loader2, MoreHorizontal, Eye, Search, ShieldCheck } from 'lucide-react';

const NIVEAUX = ['Bronze', 'Argent', 'Or', 'Platine'];

export default function AdminWaouhPartnersPage() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [detailId, setDetailId] = useState<string | null>(null);

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

  const updatePartner = async (id: string, payload: any, action: string) => {
    const { error } = await supabase.from('waouh_partners' as any).update(payload).eq('id', id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    await supabase.from('waouh_partner_audit_log' as any).insert({ partner_id: id, action, payload });
    toast({ title: '✅ ' + action });
    load();
  };

  const updateStatut = (id: string, statut: string) => {
    const payload: any = { statut };
    if (statut === 'active') payload.date_activation = new Date().toISOString();
    updatePartner(id, payload, `statut_${statut}`);
  };
  const setKyc = (id: string, v: boolean) => updatePartner(id, { kyc_verified: v }, v ? 'kyc_verified' : 'kyc_revoked');
  const setNiveau = (id: string, niveau: string) => updatePartner(id, { niveau }, `niveau_${niveau}`);

  const saveSettings = async () => {
    const { error } = await supabase.from('waouh_commission_settings' as any).update({
      commission_plateforme_pct: Number(settings.commission_plateforme_pct),
      commission_partner_pct_sur_plateforme: Number(settings.commission_partner_pct_sur_plateforme),
      seuil_payout_fcfa: Number(settings.seuil_payout_fcfa),
    }).eq('id', 1);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else toast({ title: 'Paramètres enregistrés' });
  };

  const filtered = partners.filter(p => {
    if (filterStatut !== 'all' && p.statut !== filterStatut) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.nom?.toLowerCase().includes(s) || p.code_partenaire?.toLowerCase().includes(s) || p.ville?.toLowerCase().includes(s) || p.telephone?.includes(s);
    }
    return true;
  });

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const effective = settings ? (settings.commission_plateforme_pct * settings.commission_partner_pct_sur_plateforme / 100).toFixed(2) : '0';
  const detail = partners.find(p => p.id === detailId);

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-bold">Waouh Partners — Administration</h1>

      <Tabs defaultValue="partners">
        <TabsList>
          <TabsTrigger value="partners">Partenaires ({partners.length})</TabsTrigger>
          <TabsTrigger value="settings">Commission</TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Rechercher nom, code, ville, téléphone…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="suspended">Suspendus</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>Nom</TableHead><TableHead>Ville</TableHead>
                  <TableHead>Téléphone</TableHead><TableHead>Mobile Money</TableHead>
                  <TableHead>Niveau</TableHead><TableHead>KYC</TableHead><TableHead>Statut</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code_partenaire}</TableCell>
                      <TableCell>{p.nom}</TableCell>
                      <TableCell>{p.ville}</TableCell>
                      <TableCell className="text-xs">{formatPhoneDisplay(p.telephone)}</TableCell>
                      <TableCell className="text-xs">{p.mobile_money_operator} {formatPhoneDisplay(p.mobile_money_number)}</TableCell>
                      <TableCell>
                        <Select value={p.niveau || 'Bronze'} onValueChange={(v) => setNiveau(p.id, v)}>
                          <SelectTrigger className="h-7 w-[100px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{NIVEAUX.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{p.kyc_verified ? <Badge className="bg-emerald-600">OK</Badge> : <Badge variant="outline">Non</Badge>}</TableCell>
                      <TableCell>
                        <Badge variant={p.statut === 'active' ? 'default' : p.statut === 'rejected' ? 'destructive' : 'secondary'}>{p.statut}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setDetailId(p.id)}><Eye className="h-4 w-4" /></Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="sm" variant="outline"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Statut</DropdownMenuLabel>
                              {p.statut !== 'active' && <DropdownMenuItem onClick={() => updateStatut(p.id, 'active')}>Activer</DropdownMenuItem>}
                              {p.statut !== 'suspended' && <DropdownMenuItem onClick={() => updateStatut(p.id, 'suspended')}>Suspendre</DropdownMenuItem>}
                              {p.statut !== 'rejected' && <DropdownMenuItem onClick={() => updateStatut(p.id, 'rejected')} className="text-destructive">Rejeter</DropdownMenuItem>}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setKyc(p.id, !p.kyc_verified)}>
                                <ShieldCheck className="h-4 w-4 mr-2" />{p.kyc_verified ? 'Révoquer KYC' : 'Vérifier KYC'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Aucun partenaire</TableCell></TableRow>}
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

      {/* Drawer détail partenaire 360° */}
      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {detail && <PartnerDetailContent partner={detail} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PartnerDetailContent({ partner }: { partner: any }) {
  const { stats } = useWaouhPartnerStats(partner.id);
  return (
    <>
      <SheetHeader>
        <SheetTitle>{partner.nom} <span className="text-sm font-mono text-muted-foreground">({partner.code_partenaire})</span></SheetTitle>
        <SheetDescription>{partner.ville} · {partner.statut} · {partner.niveau}</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Entreprises</div><div className="text-xl font-bold">{stats?.nb_businesses ?? 0}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Produits</div><div className="text-xl font-bold">{stats?.nb_products ?? 0}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">CA 30j</div><div className="text-xl font-bold">{Number(stats?.ca_30j ?? 0).toLocaleString()} F</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Commission totale</div><div className="text-xl font-bold">{Number(stats?.commission_totale ?? 0).toLocaleString()} F</div></CardContent></Card>
        </div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Contacts</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>📞 {formatPhoneDisplay(partner.telephone)}</div>
            {partner.whatsapp && <div>💬 {formatPhoneDisplay(partner.whatsapp)}</div>}
            {partner.email && <div>✉️ {partner.email}</div>}
            <div>💳 {partner.mobile_money_operator} · {formatPhoneDisplay(partner.mobile_money_number)}</div>
          </CardContent>
        </Card>

        <PartnerPermissionsMatrix partnerId={partner.id} />

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Activité temps réel</CardTitle></CardHeader>
          <CardContent className="p-0"><PartnerActivityFeed partnerId={partner.id} height="h-[280px]" /></CardContent>
        </Card>
      </div>
    </>
  );
}
