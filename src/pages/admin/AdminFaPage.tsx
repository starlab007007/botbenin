import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Activity, KeyRound, Users, TrendingUp, Ban, CheckCircle2, Clock, Copy, Plus, Trash2, RefreshCcw,
} from 'lucide-react';

type Kpis = {
  total_consultations: number;
  today_consultations: number;
  week_consultations: number;
  unique_devices: number;
  unique_users: number;
  consultations_with_code: number;
  consultations_free: number;
  codes_active: number;
  codes_exhausted: number;
  codes_expired: number;
  codes_total: number;
};

type FaCode = {
  id: string;
  code: string;
  max_uses: number;
  uses_count: number;
  active: boolean;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
};

type Consultation = {
  id: string;
  code_value: string | null;
  device_id: string;
  user_id: string | null;
  sign_name: string | null;
  category: string | null;
  question: string | null;
  answer: string | null;
  status: string;
  created_at: string;
};

type Settings = { free_daily_limit: number; code_uses: number };

const gen6 = () => String(Math.floor(100000 + Math.random() * 900000));

export default function AdminFaPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [codes, setCodes] = useState<FaCode[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [settings, setSettings] = useState<Settings>({ free_daily_limit: 1, code_uses: 3 });
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(1);
  const [newUses, setNewUses] = useState(3);
  const [newExpiresDays, setNewExpiresDays] = useState<number | ''>('');
  const [newNotes, setNewNotes] = useState('');
  const [selected, setSelected] = useState<Consultation | null>(null);

  const load = async () => {
    setLoading(true);
    const [k, c, cs, se] = await Promise.all([
      supabase.from('v_fa_kpis' as any).select('*').maybeSingle(),
      supabase.from('fa_access_codes' as any).select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('fa_consultations' as any).select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('fa_settings' as any).select('free_daily_limit, code_uses').eq('id', 1).maybeSingle(),
    ]);
    if (k.data) setKpis(k.data as any);
    if (c.data) setCodes(c.data as any);
    if (cs.data) setConsultations(cs.data as any);
    if (se.data) setSettings(se.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createCodes = async () => {
    const rows = Array.from({ length: Math.max(1, Math.min(50, newCount)) }).map(() => ({
      code: gen6(),
      max_uses: Math.max(1, newUses),
      notes: newNotes || null,
      expires_at: newExpiresDays ? new Date(Date.now() + Number(newExpiresDays) * 86400000).toISOString() : null,
    }));
    const { error } = await supabase.from('fa_access_codes' as any).insert(rows);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: 'Codes générés', description: `${rows.length} code(s) créé(s).` });
    setNewNotes(''); setNewExpiresDays('');
    load();
  };

  const toggleActive = async (row: FaCode) => {
    const { error } = await supabase.from('fa_access_codes' as any).update({ active: !row.active }).eq('id', row.id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    load();
  };
  const deleteCode = async (row: FaCode) => {
    if (!confirm(`Supprimer le code ${row.code} ?`)) return;
    const { error } = await supabase.from('fa_access_codes' as any).delete().eq('id', row.id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    load();
  };
  const resetUses = async (row: FaCode) => {
    const { error } = await supabase.from('fa_access_codes' as any).update({ uses_count: 0, active: true }).eq('id', row.id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    load();
  };
  const saveSettings = async () => {
    const { error } = await supabase.from('fa_settings' as any).update({
      free_daily_limit: Math.max(0, Number(settings.free_daily_limit) || 0),
      code_uses: Math.max(1, Number(settings.code_uses) || 3),
    }).eq('id', 1);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: 'Réglages enregistrés' });
  };
  const copy = (v: string) => { navigator.clipboard?.writeText(v); toast({ title: 'Copié', description: v }); };

  const kpiCards = useMemo(() => ([
    { icon: Activity, color: 'text-blue-500', label: 'Consultations totales', value: kpis?.total_consultations ?? 0 },
    { icon: Clock, color: 'text-orange-500', label: "Aujourd'hui", value: kpis?.today_consultations ?? 0 },
    { icon: TrendingUp, color: 'text-emerald-500', label: '7 derniers jours', value: kpis?.week_consultations ?? 0 },
    { icon: Users, color: 'text-indigo-500', label: 'Appareils uniques', value: kpis?.unique_devices ?? 0 },
    { icon: Users, color: 'text-purple-500', label: 'Utilisateurs connectés', value: kpis?.unique_users ?? 0 },
    { icon: KeyRound, color: 'text-cyan-500', label: 'Avec code', value: kpis?.consultations_with_code ?? 0 },
    { icon: CheckCircle2, color: 'text-green-500', label: 'Codes actifs', value: kpis?.codes_active ?? 0 },
    { icon: Ban, color: 'text-red-500', label: 'Codes épuisés', value: kpis?.codes_exhausted ?? 0 },
  ]), [kpis]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">FA IA — Administration</h1>
          <p className="text-muted-foreground">Suivi des consultations bot.bj/fa, codes d'accès et règles de quota.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((k, i) => {
          const Icon = k.icon;
          return (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${k.color}`} />
                </div>
                <CardTitle className="text-2xl mt-1">{k.value}</CardTitle>
                <CardDescription>{k.label}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="codes">
        <TabsList>
          <TabsTrigger value="codes">Codes d'accès</TabsTrigger>
          <TabsTrigger value="consult">Consultations</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Générer de nouveaux codes</CardTitle>
              <CardDescription>Chaque code à 6 chiffres autorise par défaut 3 consultations.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <Label>Nombre</Label>
                <Input type="number" min={1} max={50} value={newCount} onChange={(e) => setNewCount(Number(e.target.value))} />
              </div>
              <div>
                <Label>Utilisations / code</Label>
                <Input type="number" min={1} value={newUses} onChange={(e) => setNewUses(Number(e.target.value))} />
              </div>
              <div>
                <Label>Expire dans (jours)</Label>
                <Input type="number" min={0} value={newExpiresDays} onChange={(e) => setNewExpiresDays(e.target.value === '' ? '' : Number(e.target.value))} placeholder="jamais" />
              </div>
              <div className="md:col-span-1">
                <Label>Notes</Label>
                <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="ex: distribuer au marché" />
              </div>
              <Button onClick={createCodes}><Plus className="h-4 w-4 mr-1" /> Générer</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Codes ({codes.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expire</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Créé</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((c) => {
                    const exhausted = c.uses_count >= c.max_uses;
                    const expired = c.expires_at && new Date(c.expires_at) < new Date();
                    const state = !c.active ? 'Désactivé' : expired ? 'Expiré' : exhausted ? 'Épuisé' : 'Actif';
                    const variant: any = state === 'Actif' ? 'default' : state === 'Désactivé' ? 'secondary' : 'destructive';
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-bold text-lg">{c.code}</TableCell>
                        <TableCell>{c.uses_count} / {c.max_uses}</TableCell>
                        <TableCell><Badge variant={variant}>{state}</Badge></TableCell>
                        <TableCell>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('fr-FR') : '—'}</TableCell>
                        <TableCell className="max-w-xs truncate">{c.notes || '—'}</TableCell>
                        <TableCell>{new Date(c.created_at).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => copy(c.code)}><Copy className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => resetUses(c)} title="Réinitialiser"><RefreshCcw className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => toggleActive(c)}>{c.active ? 'Désactiver' : 'Activer'}</Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteCode(c)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!codes.length && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Aucun code généré</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consult">
          <Card>
            <CardHeader>
              <CardTitle>Journal des consultations (200 dernières)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Signe</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Appareil</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultations.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">{new Date(row.created_at).toLocaleString('fr-FR')}</TableCell>
                      <TableCell>{row.sign_name || '—'}</TableCell>
                      <TableCell>{row.category || '—'}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.question || '—'}</TableCell>
                      <TableCell>{row.code_value ? <Badge variant="outline" className="font-mono">{row.code_value}</Badge> : <Badge variant="secondary">Gratuit</Badge>}</TableCell>
                      <TableCell>{row.user_id ? <Badge>Auth</Badge> : <Badge variant="outline">Anonyme</Badge>}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">{row.device_id}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => setSelected(row)}>Voir</Button></TableCell>
                    </TableRow>
                  ))}
                  {!consultations.length && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Aucune consultation</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Consultation — {selected?.sign_name || '—'}</DialogTitle>
                <DialogDescription>
                  {selected ? new Date(selected.created_at).toLocaleString('fr-FR') : ''}
                  {' · '}{selected?.category || '—'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Question</div>
                  <div className="p-3 rounded bg-muted whitespace-pre-wrap">{selected?.question || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Réponse IA</div>
                  <div className="p-3 rounded bg-muted whitespace-pre-wrap">{selected?.answer || '—'}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Device : <span className="font-mono">{selected?.device_id}</span> · Code : {selected?.code_value || 'aucun'}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Fermer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Règles de consultation</CardTitle>
              <CardDescription>Ces règles s'appliquent à toutes les consultations FA IA.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Consultations gratuites par jour (par appareil / utilisateur)</Label>
                <Input type="number" min={0} value={settings.free_daily_limit}
                  onChange={(e) => setSettings({ ...settings, free_daily_limit: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground mt-1">Sans code : nombre de consultations autorisées par jour.</p>
              </div>
              <div>
                <Label>Utilisations par code (défaut à la génération)</Label>
                <Input type="number" min={1} value={settings.code_uses}
                  onChange={(e) => setSettings({ ...settings, code_uses: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground mt-1">Chaque code permet ce nombre de consultations.</p>
              </div>
              <div className="md:col-span-2">
                <Button onClick={saveSettings}>Enregistrer les règles</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
