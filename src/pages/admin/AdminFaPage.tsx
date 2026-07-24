import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Activity, Ban, CheckCircle2, Clock, Copy, Gauge, KeyRound, Plus, RefreshCcw,
  Server, ShieldCheck, Sparkles, TrendingUp, Users, Zap,
} from 'lucide-react';

type FaStats = {
  total_consultations: number;
  today_consultations: number;
  week_consultations: number;
  month_consultations: number;
  unique_devices: number;
  unique_users: number;
  free_consultations: number;
  coded_consultations: number;
  prompt_tokens: number;
  output_tokens: number;
  total_tokens: number;
  failed_consultations: number;
  last_consultation_at: string | null;
};

type FaCode = {
  id: string;
  code: string;
  max_uses: number;
  uses_count: number;
  remaining_uses: number;
  usage_percent: number;
  active: boolean;
  status: 'unused' | 'in_use' | 'exhausted' | 'expired' | 'inactive';
  expires_at: string | null;
  notes: string | null;
  first_used_at: string | null;
  last_used_at: string | null;
  exhausted_at: string | null;
  last_device_id: string | null;
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
  error: string | null;
  provider: string | null;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  quota_via: string | null;
  code_use_number: number | null;
  created_at: string;
};

type Settings = {
  free_daily_limit: number;
  code_uses: number;
  gemini_model: string;
  max_output_words: number;
};

type GeminiInfo = {
  configured: boolean;
  model: string;
  key_fingerprint: string | null;
  management_enabled: boolean;
};

type Overview = {
  stats: FaStats | null;
  codes: FaCode[];
  consultations: Consultation[];
  settings: Settings;
  gemini: GeminiInfo;
};

const emptyOverview: Overview = {
  stats: null,
  codes: [],
  consultations: [],
  settings: { free_daily_limit: 1, code_uses: 3, gemini_model: 'gemini-3.1-flash-lite', max_output_words: 300 },
  gemini: { configured: false, model: 'gemini-3.1-flash-lite', key_fingerprint: null, management_enabled: false },
};

const statusMeta: Record<FaCode['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  unused: { label: 'Non utilisé', variant: 'outline' },
  in_use: { label: 'En cours', variant: 'default' },
  exhausted: { label: 'Épuisé', variant: 'destructive' },
  expired: { label: 'Expiré', variant: 'destructive' },
  inactive: { label: 'Désactivé', variant: 'secondary' },
};

const fmt = (value?: string | null) => value ? new Date(value).toLocaleString('fr-FR') : '—';

export default function AdminFaPage() {
  const [overview, setOverview] = useState<Overview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newCount, setNewCount] = useState(10);
  const [newUses, setNewUses] = useState(3);
  const [newExpiresDays, setNewExpiresDays] = useState<number | ''>('');
  const [newNotes, setNewNotes] = useState('');
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [newGeminiKey, setNewGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.1-flash-lite');
  const [geminiTest, setGeminiTest] = useState<any>(null);

  const invokeAdmin = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('fa-admin', { body });
    if (error) throw new Error(error.message || 'Erreur fa-admin');
    if (data?.error) throw new Error(data.message || data.detail || data.error);
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await invokeAdmin({ action: 'overview' });
      setOverview({ ...emptyOverview, ...data, settings: { ...emptyOverview.settings, ...(data.settings || {}) } });
      setNewUses(data.settings?.code_uses || 3);
      setGeminiModel(data.gemini?.model || data.settings?.gemini_model || 'gemini-3.1-flash-lite');
    } catch (error) {
      toast({ title: 'Erreur de chargement', description: String((error as Error).message), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createCodes = async () => {
    setBusy(true);
    try {
      const expiresAt = newExpiresDays ? new Date(Date.now() + Number(newExpiresDays) * 86400000).toISOString() : null;
      const data = await invokeAdmin({
        action: 'generate_codes', count: Math.min(Math.max(newCount, 1), 500), max_uses: newUses,
        expires_at: expiresAt, notes: newNotes,
      });
      toast({ title: 'Codes générés', description: `${data.count} code(s) disponible(s).` });
      setNewNotes('');
      await load();
    } catch (error) {
      toast({ title: 'Génération impossible', description: String((error as Error).message), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const codeAction = async (action: 'reset_code' | 'toggle_code', row: FaCode, active?: boolean) => {
    setBusy(true);
    try {
      await invokeAdmin({ action, code_id: row.id, active });
      await load();
    } catch (error) {
      toast({ title: 'Action impossible', description: String((error as Error).message), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const saveSettings = async () => {
    setBusy(true);
    try {
      const settings = await invokeAdmin({ action: 'update_settings', ...overview.settings, gemini_model: geminiModel });
      setOverview((current) => ({ ...current, settings: settings.settings }));
      toast({ title: 'Règles enregistrées' });
    } catch (error) {
      toast({ title: 'Enregistrement impossible', description: String((error as Error).message), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const testGemini = async () => {
    setBusy(true);
    setGeminiTest(null);
    try {
      const result = await invokeAdmin({ action: 'test_gemini', model: geminiModel });
      setGeminiTest(result);
      toast({ title: 'Gemini opérationnel', description: `${result.model} · ${result.latency_ms} ms` });
    } catch (error) {
      setGeminiTest({ ok: false, message: String((error as Error).message) });
      toast({ title: 'Test Gemini échoué', description: String((error as Error).message), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const updateGemini = async () => {
    if (!newGeminiKey.trim()) return toast({ title: 'Clé requise', description: 'Saisissez la nouvelle clé Gemini.', variant: 'destructive' });
    if (!confirm('Remplacer la clé Gemini utilisée par toutes les fonctions FA IA ?')) return;
    setBusy(true);
    try {
      const result = await invokeAdmin({ action: 'update_gemini', api_key: newGeminiKey.trim(), model: geminiModel });
      setNewGeminiKey('');
      setGeminiTest(result.test);
      toast({ title: 'Gemini mis à jour', description: result.message });
      await load();
    } catch (error) {
      toast({ title: 'Mise à jour impossible', description: String((error as Error).message), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value);
    toast({ title: 'Code copié', description: value });
  };

  const codeCounts = useMemo(() => overview.codes.reduce((acc, code) => {
    acc[code.status] = (acc[code.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>), [overview.codes]);

  const kpis = [
    ['Consultations', overview.stats?.total_consultations || 0, Activity],
    ["Aujourd’hui", overview.stats?.today_consultations || 0, Clock],
    ['7 jours', overview.stats?.week_consultations || 0, TrendingUp],
    ['30 jours', overview.stats?.month_consultations || 0, Gauge],
    ['Appareils', overview.stats?.unique_devices || 0, Users],
    ['Avec code', overview.stats?.coded_consultations || 0, KeyRound],
    ['Codes en cours', codeCounts.in_use || 0, Zap],
    ['Codes épuisés', codeCounts.exhausted || 0, Ban],
  ] as const;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">FA IA — Administration</h1>
          <p className="text-muted-foreground">Codes d’accès, quotas, Gemini, consultations et statistiques.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading || busy}><RefreshCcw className="h-4 w-4 mr-2" />Actualiser</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(([label, value, Icon]) => <Card key={label}><CardHeader className="pb-3"><Icon className="h-5 w-5 text-primary" /><CardTitle className="text-2xl">{value}</CardTitle><CardDescription>{label}</CardDescription></CardHeader></Card>)}
      </div>

      <Tabs defaultValue="codes" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="codes">Codes</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
          <TabsTrigger value="statistics">Statistiques</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="gemini">Gemini</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Générer des codes à 6 chiffres</CardTitle><CardDescription>Chaque code donne droit à trois consultations par défaut. L’administrateur peut en générer autant que nécessaire, par lots de 500.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div><Label>Nombre</Label><Input type="number" min={1} max={500} value={newCount} onChange={(e) => setNewCount(Number(e.target.value))} /></div>
              <div><Label>Consultations/code</Label><Input type="number" min={1} max={100} value={newUses} onChange={(e) => setNewUses(Number(e.target.value))} /></div>
              <div><Label>Expiration (jours)</Label><Input type="number" min={0} value={newExpiresDays} placeholder="Jamais" onChange={(e) => setNewExpiresDays(e.target.value === '' ? '' : Number(e.target.value))} /></div>
              <div><Label>Notes</Label><Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Motif ou bénéficiaire" /></div>
              <Button onClick={createCodes} disabled={busy}><Plus className="h-4 w-4 mr-2" />Générer</Button>
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>Suivi des codes ({overview.codes.length})</CardTitle><CardDescription>Le statut passe automatiquement de Non utilisé à En cours, puis Épuisé après la dernière consultation.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Statut</TableHead><TableHead>Usage</TableHead><TableHead>Première utilisation</TableHead><TableHead>Dernière utilisation</TableHead><TableHead>Appareil</TableHead><TableHead>Expire</TableHead><TableHead>Notes</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{overview.codes.map((code) => { const meta = statusMeta[code.status] || statusMeta.inactive; return <TableRow key={code.id}>
                <TableCell className="font-mono font-bold text-lg">{code.code}</TableCell><TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                <TableCell><div className="font-medium">{code.uses_count}/{code.max_uses}</div><div className="text-xs text-muted-foreground">{code.remaining_uses} restante(s)</div></TableCell>
                <TableCell className="whitespace-nowrap">{fmt(code.first_used_at)}</TableCell><TableCell className="whitespace-nowrap">{fmt(code.last_used_at)}</TableCell>
                <TableCell className="font-mono text-xs max-w-[120px] truncate">{code.last_device_id || '—'}</TableCell><TableCell>{fmt(code.expires_at)}</TableCell><TableCell className="max-w-[180px] truncate">{code.notes || '—'}</TableCell>
                <TableCell className="space-x-1 whitespace-nowrap"><Button size="icon" variant="ghost" onClick={() => copy(code.code)}><Copy className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => codeAction('reset_code', code)}>Réinitialiser</Button><Button size="sm" variant="outline" onClick={() => codeAction('toggle_code', code, !code.active)}>{code.active ? 'Désactiver' : 'Activer'}</Button></TableCell>
              </TableRow>; })}</TableBody></Table></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultations"><Card><CardHeader><CardTitle>Journal des consultations</CardTitle><CardDescription>Dernières consultations, usages des codes, modèle et consommation de tokens.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Signe</TableHead><TableHead>Thème</TableHead><TableHead>Accès</TableHead><TableHead>IA</TableHead><TableHead>Tokens</TableHead><TableHead>Statut</TableHead><TableHead /></TableRow></TableHeader><TableBody>
          {overview.consultations.map((row) => <TableRow key={row.id}><TableCell className="whitespace-nowrap">{fmt(row.created_at)}</TableCell><TableCell>{row.sign_name || '—'}</TableCell><TableCell>{row.category || '—'}</TableCell><TableCell>{row.code_value ? <Badge variant="outline" className="font-mono">{row.code_value}{row.code_use_number ? ` · ${row.code_use_number}` : ''}</Badge> : <Badge variant="secondary">Gratuit</Badge>}</TableCell><TableCell><div>{row.provider || '—'}</div><div className="text-xs text-muted-foreground">{row.model || '—'}</div></TableCell><TableCell>{(row.tokens_in || 0) + (row.tokens_out || 0)}</TableCell><TableCell><Badge variant={row.status === 'ok' ? 'default' : 'destructive'}>{row.status}</Badge></TableCell><TableCell><Button size="sm" variant="ghost" onClick={() => setSelected(row)}>Voir</Button></TableCell></TableRow>)}
          </TableBody></Table></CardContent></Card></TabsContent>

        <TabsContent value="statistics" className="grid md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle>Utilisation</CardTitle></CardHeader><CardContent className="space-y-3"><div>Consultations gratuites : <b>{overview.stats?.free_consultations || 0}</b></div><div>Consultations avec code : <b>{overview.stats?.coded_consultations || 0}</b></div><div>Utilisateurs connectés : <b>{overview.stats?.unique_users || 0}</b></div><div>Échecs enregistrés : <b>{overview.stats?.failed_consultations || 0}</b></div><div>Dernière consultation : <b>{fmt(overview.stats?.last_consultation_at)}</b></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Consommation IA</CardTitle><CardDescription>Les limites exactes du compte Google ne sont pas exposées par une simple clé API. Ces chiffres correspondent aux appels enregistrés par FA IA.</CardDescription></CardHeader><CardContent className="space-y-3"><div>Tokens d’entrée : <b>{overview.stats?.prompt_tokens || 0}</b></div><div>Tokens de sortie : <b>{overview.stats?.output_tokens || 0}</b></div><div>Total : <b>{overview.stats?.total_tokens || 0}</b></div></CardContent></Card>
          <Card className="md:col-span-2"><CardHeader><CardTitle>État des codes</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3"><div>Non utilisés <b>{codeCounts.unused || 0}</b></div><div>En cours <b>{codeCounts.in_use || 0}</b></div><div>Épuisés <b>{codeCounts.exhausted || 0}</b></div><div>Expirés <b>{codeCounts.expired || 0}</b></div><div>Désactivés <b>{codeCounts.inactive || 0}</b></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="rules"><Card><CardHeader><CardTitle>Règles de consultation</CardTitle><CardDescription>Principe recommandé : une consultation gratuite par jour, puis un code pour trois consultations supplémentaires.</CardDescription></CardHeader><CardContent className="grid md:grid-cols-2 gap-4"><div><Label>Consultations gratuites/jour</Label><Input type="number" min={0} max={20} value={overview.settings.free_daily_limit} onChange={(e) => setOverview((o) => ({ ...o, settings: { ...o.settings, free_daily_limit: Number(e.target.value) } }))} /><p className="text-xs text-muted-foreground mt-1">Quand cette limite est atteinte, l’utilisateur est invité à revenir le lendemain ou à saisir un code.</p></div><div><Label>Consultations par nouveau code</Label><Input type="number" min={1} max={100} value={overview.settings.code_uses} onChange={(e) => setOverview((o) => ({ ...o, settings: { ...o.settings, code_uses: Number(e.target.value) } }))} /><p className="text-xs text-muted-foreground mt-1">Après la dernière utilisation, le code est automatiquement marqué Épuisé et doit être renouvelé.</p></div><div><Label>Maximum de mots IA</Label><Input type="number" min={60} max={800} value={overview.settings.max_output_words} onChange={(e) => setOverview((o) => ({ ...o, settings: { ...o.settings, max_output_words: Number(e.target.value) } }))} /></div><div className="flex items-end"><Button onClick={saveSettings} disabled={busy}>Enregistrer les règles</Button></div></CardContent></Card></TabsContent>

        <TabsContent value="gemini" className="space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" />État de Gemini</CardTitle></CardHeader><CardContent className="grid md:grid-cols-4 gap-4"><div><Label>Configuration</Label><div className="mt-2"><Badge variant={overview.gemini.configured ? 'default' : 'destructive'}>{overview.gemini.configured ? 'Clé configurée' : 'Clé absente'}</Badge></div></div><div><Label>Modèle</Label><div className="mt-2 font-mono text-sm">{overview.gemini.model}</div></div><div><Label>Empreinte sécurisée</Label><div className="mt-2 font-mono text-sm">{overview.gemini.key_fingerprint || '—'}</div></div><div><Label>Gestion depuis l’UI</Label><div className="mt-2"><Badge variant={overview.gemini.management_enabled ? 'default' : 'secondary'}>{overview.gemini.management_enabled ? 'Activée' : 'À configurer'}</Badge></div></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Tester le service</CardTitle><CardDescription>Vérifie la clé active, le modèle, la latence et les erreurs Google telles que 404 ou 429.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex gap-3"><Input value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} placeholder="gemini-3.1-flash-lite" /><Button onClick={testGemini} disabled={busy}><Server className="h-4 w-4 mr-2" />Tester</Button></div>{geminiTest && <div className={`rounded-lg border p-4 ${geminiTest.ok ? 'bg-emerald-50' : 'bg-red-50'}`}><div className="font-semibold">{geminiTest.ok ? 'Service opérationnel' : 'Échec du test'}</div><div className="text-sm mt-1">{geminiTest.model || geminiModel} {geminiTest.latency_ms ? `· ${geminiTest.latency_ms} ms` : ''}</div><div className="text-sm text-muted-foreground mt-1">{geminiTest.message || ''}</div></div>}</CardContent></Card>
          <Card><CardHeader><CardTitle>Mettre à jour la clé Gemini</CardTitle><CardDescription>La clé actuelle n’est jamais affichée. La nouvelle clé est testée avant remplacement et reste uniquement dans les secrets Supabase.</CardDescription></CardHeader><CardContent className="space-y-4"><div><Label>Nouvelle clé API</Label><Input type="password" value={newGeminiKey} onChange={(e) => setNewGeminiKey(e.target.value)} placeholder="AIza…" autoComplete="new-password" /></div><div><Label>Modèle associé</Label><Input value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} /></div>{!overview.gemini.management_enabled && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">Ajoutez d’abord le secret serveur <code>SUPABASE_ACCESS_TOKEN</code> pour autoriser la mise à jour sécurisée des secrets depuis cette interface.</div>}<Button onClick={updateGemini} disabled={busy || !overview.gemini.management_enabled}><ShieldCheck className="h-4 w-4 mr-2" />Tester et remplacer la clé</Button></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Consultation — {selected?.sign_name || '—'}</DialogTitle><DialogDescription>{fmt(selected?.created_at)} · {selected?.category || '—'}</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Question</Label><div className="p-3 rounded bg-muted whitespace-pre-wrap">{selected?.question || '—'}</div></div><div><Label>Réponse IA</Label><div className="p-3 rounded bg-muted whitespace-pre-wrap">{selected?.answer || selected?.error || '—'}</div></div><div className="text-xs text-muted-foreground">Appareil : {selected?.device_id} · Code : {selected?.code_value || 'aucun'} · Modèle : {selected?.model || '—'}</div></div><DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>Fermer</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
