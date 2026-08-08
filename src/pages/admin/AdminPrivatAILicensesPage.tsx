import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Ban, CheckCircle2, Clock3, Copy, KeyRound, Laptop, Plus, RefreshCcw, RotateCcw, ShieldCheck, Users } from 'lucide-react';

type Settings = {
  trial_days: number;
  default_validity_days: number;
  default_max_devices: number;
  online_check_hours: number;
};

type License = {
  id: string;
  code: string;
  customer_name: string | null;
  customer_email: string | null;
  notes: string | null;
  validity_days: number;
  activation_mode: 'first_use' | 'fixed';
  fixed_expires_at: string | null;
  first_activated_at: string | null;
  expires_at: string | null;
  max_devices: number;
  active: boolean;
  last_validated_at: string | null;
  created_at: string;
  status: 'unused' | 'active' | 'expired' | 'inactive';
  active_devices: number;
};

type Device = {
  id: string;
  license_id: string;
  device_hash: string;
  device_label: string | null;
  platform: string | null;
  app_version: string | null;
  first_activated_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

type Trial = {
  id: string;
  device_hash: string;
  device_label: string | null;
  platform: string | null;
  app_version: string | null;
  started_at: string;
  expires_at: string;
  last_seen_at: string;
};

type Overview = {
  settings: Settings;
  licenses: License[];
  devices: Device[];
  trials: Trial[];
  events: Array<{ id: string; license_id: string | null; device_hash: string | null; event_type: string; detail: unknown; created_at: string }>;
  stats: {
    total_licenses: number;
    active_licenses: number;
    unused_licenses: number;
    expired_licenses: number;
    inactive_licenses: number;
    active_devices: number;
    total_trials: number;
    active_trials: number;
  };
};

const emptyOverview: Overview = {
  settings: { trial_days: 7, default_validity_days: 30, default_max_devices: 1, online_check_hours: 24 },
  licenses: [],
  devices: [],
  trials: [],
  events: [],
  stats: { total_licenses: 0, active_licenses: 0, unused_licenses: 0, expired_licenses: 0, inactive_licenses: 0, active_devices: 0, total_trials: 0, active_trials: 0 },
};

const fmt = (value?: string | null) => value ? new Date(value).toLocaleString('fr-FR') : '—';
const shortDevice = (value?: string | null) => value ? `${value.slice(0, 10)}…${value.slice(-6)}` : '—';

const statusMeta: Record<License['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  unused: { label: 'Non utilisée', variant: 'outline' },
  active: { label: 'Active', variant: 'default' },
  expired: { label: 'Expirée', variant: 'destructive' },
  inactive: { label: 'Désactivée', variant: 'secondary' },
};

export default function AdminPrivatAILicensesPage() {
  const [overview, setOverview] = useState<Overview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(1);
  const [validityDays, setValidityDays] = useState(30);
  const [maxDevices, setMaxDevices] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const invokeAdmin = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('privatai-license-admin', { body });
    if (error) {
      let detail = error.message || 'Erreur du service de licences';
      try {
        const context = (error as any)?.context;
        if (context instanceof Response) {
          const raw = await context.clone().text();
          try {
            const parsed = JSON.parse(raw);
            detail = parsed?.message || parsed?.detail || parsed?.error || raw || detail;
          } catch { detail = raw || detail; }
        }
      } catch { /* conserver le message initial */ }
      throw new Error(detail);
    }
    if (data?.error) throw new Error(data.message || data.detail || data.error);
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await invokeAdmin({ action: 'overview' });
      setOverview({ ...emptyOverview, ...data, settings: { ...emptyOverview.settings, ...(data.settings || {}) } });
      setValidityDays(data.settings?.default_validity_days || 30);
      setMaxDevices(data.settings?.default_max_devices || 1);
    } catch (error) {
      toast({ title: 'Chargement impossible', description: String((error as Error).message), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const data = await invokeAdmin({
        action: 'generate_licenses',
        count: Math.min(Math.max(count, 1), 100),
        validity_days: Math.min(Math.max(validityDays, 1), 3650),
        max_devices: Math.min(Math.max(maxDevices, 1), 100),
        activation_mode: 'first_use',
        customer_name: customerName,
        customer_email: customerEmail,
        notes,
      });
      const codes = (data.generated || []).map((x: License) => x.code);
      setGeneratedCodes(codes);
      toast({ title: 'Licence générée', description: `${codes.length} code(s) prêt(s) à être partagé(s).` });
      await load();
    } catch (error) {
      toast({ title: 'Génération impossible', description: String((error as Error).message), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const copy = async (value: string) => {
    await navigator.clipboard?.writeText(value);
    toast({ title: 'Code copié', description: value });
  };

  const licenseAction = async (action: 'toggle_license' | 'reset_license', row: License, active?: boolean) => {
    if (action === 'reset_license' && !confirm(`Réinitialiser ${row.code} et libérer tous ses appareils ?`)) return;
    setBusy(true);
    try {
      await invokeAdmin({ action, license_id: row.id, active });
      await load();
    } catch (error) {
      toast({ title: 'Action impossible', description: String((error as Error).message), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const revokeDevice = async (row: Device) => {
    setBusy(true);
    try {
      await invokeAdmin({ action: 'revoke_device', device_id: row.id, revoked: !row.revoked_at });
      await load();
    } catch (error) {
      toast({ title: 'Action impossible', description: String((error as Error).message), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const saveSettings = async () => {
    setBusy(true);
    try {
      const data = await invokeAdmin({ action: 'update_settings', ...overview.settings });
      setOverview((current) => ({ ...current, settings: data.settings }));
      toast({ title: 'Paramètres enregistrés', description: `Essai gratuit : ${data.settings.trial_days} jour(s).` });
    } catch (error) {
      toast({ title: 'Enregistrement impossible', description: String((error as Error).message), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const licenseById = useMemo(() => new Map(overview.licenses.map((x) => [x.id, x])), [overview.licenses]);
  const kpis = [
    ['Licences actives', overview.stats.active_licenses, ShieldCheck],
    ['Licences non utilisées', overview.stats.unused_licenses, KeyRound],
    ['Appareils actifs', overview.stats.active_devices, Laptop],
    ['Essais actifs', overview.stats.active_trials, Clock3],
  ] as const;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">PrivatAI — Licences</h1>
          <p className="text-muted-foreground">Essai gratuit, génération des codes, durée de validité, appareils et révocation.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading || busy}><RefreshCcw className="h-4 w-4 mr-2" />Actualiser</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(([label, value, Icon]) => (
          <Card key={label}><CardHeader className="pb-3"><Icon className="h-5 w-5 text-primary" /><CardTitle className="text-2xl">{value}</CardTitle><CardDescription>{label}</CardDescription></CardHeader></Card>
        ))}
      </div>

      <Tabs defaultValue="licenses" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="licenses">Licences</TabsTrigger>
          <TabsTrigger value="devices">Appareils</TabsTrigger>
          <TabsTrigger value="trials">Essais 7 jours</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
          <TabsTrigger value="events">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="licenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Générer une licence</CardTitle>
              <CardDescription>La durée commence à la première activation. Le code peut être partagé directement au client.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
              <div><Label>Nombre</Label><Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
              <div><Label>Validité (jours)</Label><Input type="number" min={1} max={3650} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} /></div>
              <div><Label>Appareils max.</Label><Input type="number" min={1} max={100} value={maxDevices} onChange={(e) => setMaxDevices(Number(e.target.value))} /></div>
              <div><Label>Bénéficiaire</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nom / organisation" /></div>
              <div><Label>E-mail</Label><Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="facultatif" /></div>
              <Button onClick={generate} disabled={busy}><Plus className="h-4 w-4 mr-2" />Générer</Button>
              <div className="md:col-span-3 lg:col-span-6"><Label>Notes administrateur</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contrat, commande, client, référence…" /></div>
            </CardContent>
          </Card>

          {generatedCodes.length > 0 && (
            <Card className="border-emerald-300 bg-emerald-50/40">
              <CardHeader><CardTitle className="text-emerald-800">Code(s) généré(s)</CardTitle><CardDescription>Copiez puis transmettez le code au bénéficiaire.</CardDescription></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {generatedCodes.map((code) => <Button key={code} variant="outline" className="font-mono" onClick={() => copy(code)}><Copy className="h-4 w-4 mr-2" />{code}</Button>)}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Licences ({overview.licenses.length})</CardTitle><CardDescription>Une licence désactivée ou expirée est refusée lors du prochain contrôle en ligne.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Client</TableHead><TableHead>Statut</TableHead><TableHead>Durée</TableHead><TableHead>Activation</TableHead><TableHead>Expiration</TableHead><TableHead>Appareils</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>{overview.licenses.map((row) => { const meta = statusMeta[row.status]; return (
                  <TableRow key={row.id}>
                    <TableCell><button className="font-mono font-semibold hover:underline" onClick={() => copy(row.code)}>{row.code}</button></TableCell>
                    <TableCell><div className="font-medium">{row.customer_name || '—'}</div><div className="text-xs text-muted-foreground">{row.customer_email || row.notes || ''}</div></TableCell>
                    <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                    <TableCell>{row.validity_days} j</TableCell>
                    <TableCell className="whitespace-nowrap">{fmt(row.first_activated_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmt(row.expires_at || row.fixed_expires_at)}</TableCell>
                    <TableCell>{row.active_devices}/{row.max_devices}</TableCell>
                    <TableCell className="whitespace-nowrap space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => copy(row.code)} title="Copier"><Copy className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => licenseAction('reset_license', row)}><RotateCcw className="h-3.5 w-3.5 mr-1" />Réinitialiser</Button>
                      <Button size="sm" variant={row.active ? 'destructive' : 'default'} onClick={() => licenseAction('toggle_license', row, !row.active)}>{row.active ? <><Ban className="h-3.5 w-3.5 mr-1" />Désactiver</> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Activer</>}</Button>
                    </TableCell>
                  </TableRow>
                ); })}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card><CardHeader><CardTitle>Appareils activés</CardTitle><CardDescription>Révoquez un appareil pour libérer une place sur sa licence.</CardDescription></CardHeader><CardContent className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead>Licence</TableHead><TableHead>Appareil</TableHead><TableHead>Plateforme</TableHead><TableHead>Version</TableHead><TableHead>Activation</TableHead><TableHead>Dernier contrôle</TableHead><TableHead>Statut</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>{overview.devices.map((row) => <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{licenseById.get(row.license_id)?.code || row.license_id.slice(0, 8)}</TableCell>
                <TableCell title={row.device_hash} className="font-mono text-xs">{row.device_label || shortDevice(row.device_hash)}</TableCell>
                <TableCell>{row.platform || '—'}</TableCell><TableCell>{row.app_version || '—'}</TableCell>
                <TableCell className="whitespace-nowrap">{fmt(row.first_activated_at)}</TableCell><TableCell className="whitespace-nowrap">{fmt(row.last_seen_at)}</TableCell>
                <TableCell>{row.revoked_at ? <Badge variant="destructive">Révoqué</Badge> : <Badge>Actif</Badge>}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => revokeDevice(row)}>{row.revoked_at ? 'Restaurer' : 'Révoquer'}</Button></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="trials">
          <Card><CardHeader><CardTitle>Essais gratuits</CardTitle><CardDescription>Un appareil conserve la même échéance d’essai côté serveur, même après réinstallation de l’application.</CardDescription></CardHeader><CardContent className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead>Appareil</TableHead><TableHead>Plateforme</TableHead><TableHead>Version</TableHead><TableHead>Début</TableHead><TableHead>Expiration</TableHead><TableHead>Dernière activité</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>{overview.trials.map((row) => { const active = new Date(row.expires_at).getTime() > Date.now(); return <TableRow key={row.id}>
                <TableCell title={row.device_hash} className="font-mono text-xs">{row.device_label || shortDevice(row.device_hash)}</TableCell><TableCell>{row.platform || '—'}</TableCell><TableCell>{row.app_version || '—'}</TableCell>
                <TableCell>{fmt(row.started_at)}</TableCell><TableCell>{fmt(row.expires_at)}</TableCell><TableCell>{fmt(row.last_seen_at)}</TableCell><TableCell><Badge variant={active ? 'default' : 'destructive'}>{active ? 'En cours' : 'Terminé'}</Badge></TableCell>
              </TableRow>; })}</TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card><CardHeader><CardTitle>Règles de licence</CardTitle><CardDescription>La valeur demandée est préconfigurée à 7 jours d’essai gratuit.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div><Label>Essai gratuit (jours)</Label><Input type="number" min={1} max={90} value={overview.settings.trial_days} onChange={(e) => setOverview((o) => ({ ...o, settings: { ...o.settings, trial_days: Number(e.target.value) } }))} /></div>
            <div><Label>Validité licence par défaut</Label><Input type="number" min={1} max={3650} value={overview.settings.default_validity_days} onChange={(e) => setOverview((o) => ({ ...o, settings: { ...o.settings, default_validity_days: Number(e.target.value) } }))} /></div>
            <div><Label>Appareils par défaut</Label><Input type="number" min={1} max={100} value={overview.settings.default_max_devices} onChange={(e) => setOverview((o) => ({ ...o, settings: { ...o.settings, default_max_devices: Number(e.target.value) } }))} /></div>
            <div><Label>Contrôle en ligne (heures)</Label><Input type="number" min={1} max={720} value={overview.settings.online_check_hours} onChange={(e) => setOverview((o) => ({ ...o, settings: { ...o.settings, online_check_hours: Number(e.target.value) } }))} /></div>
            <Button onClick={saveSettings} disabled={busy}>Enregistrer les règles</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="events">
          <Card><CardHeader><CardTitle>Journal des licences</CardTitle><CardDescription>Traçabilité des activations, validations, refus et actions administrateur.</CardDescription></CardHeader><CardContent className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Événement</TableHead><TableHead>Licence</TableHead><TableHead>Appareil</TableHead></TableRow></TableHeader>
              <TableBody>{overview.events.map((row) => <TableRow key={row.id}><TableCell className="whitespace-nowrap">{fmt(row.created_at)}</TableCell><TableCell>{row.event_type}</TableCell><TableCell className="font-mono text-xs">{row.license_id ? licenseById.get(row.license_id)?.code || row.license_id.slice(0, 8) : '—'}</TableCell><TableCell className="font-mono text-xs">{shortDevice(row.device_hash)}</TableCell></TableRow>)}</TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
