import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Apple, CheckCircle2, Copy, Download, ExternalLink, FileArchive, FileUp, HardDriveDownload, Loader2, RefreshCcw, ShieldCheck, UploadCloud } from 'lucide-react';

type ArtifactKind = 'dmg' | 'exe' | 'msi';
type ArtifactDefinition = { filename: string; label: string; platform: string; kind: ArtifactKind; accept: string; description: string };
type ArtifactMeta = { filename: string; platform: string; kind: ArtifactKind; version?: string | null; notes?: string | null; source?: string | null; size?: number | null; sha256?: string | null; uploaded_at?: string | null; uploaded_by?: string | null; download_url: string; available: boolean };
type PublishHistory = { action: string; filename: string; version?: string | null; size?: number | null; sha256?: string | null; at?: string | null; by?: string | null; notes?: string | null };

const ARTIFACTS: ArtifactDefinition[] = [
  { filename: 'PrivatAI-Mac-Intel.dmg', label: 'Mac Intel', platform: 'macOS Intel', kind: 'dmg', accept: '.dmg,application/x-apple-diskimage,application/octet-stream', description: 'DMG macOS Intel x86_64 publié sur bot.bj.' },
  { filename: 'PrivatAI-Windows-x64-Setup.exe', label: 'Windows EXE', platform: 'Windows x64', kind: 'exe', accept: '.exe,application/vnd.microsoft.portable-executable,application/octet-stream', description: 'Installateur Windows standard pour le grand public.' },
  { filename: 'PrivatAI-Windows-x64.msi', label: 'Windows MSI', platform: 'Windows x64', kind: 'msi', accept: '.msi,application/x-msi,application/octet-stream', description: 'Package MSI pour déploiement administré ou entreprise.' },
];

const formatBytes = (value?: number | null) => {
  if (!value || value <= 0) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let n = value;
  let unit = 0;
  while (n >= 1024 && unit < units.length - 1) { n /= 1024; unit += 1; }
  return `${n >= 10 || unit === 0 ? n.toFixed(0) : n.toFixed(1)} ${units[unit]}`;
};
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString('fr-FR') : '—';
const shortHash = (value?: string | null) => value ? `${value.slice(0, 12)}…${value.slice(-10)}` : '—';
const inferArtifact = (file: File) => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.dmg')) return ARTIFACTS.find((item) => item.kind === 'dmg');
  if (name.endsWith('.exe')) return ARTIFACTS.find((item) => item.kind === 'exe');
  if (name.endsWith('.msi')) return ARTIFACTS.find((item) => item.kind === 'msi');
  return undefined;
};

export default function AdminPrivatAIDownloadsPanel() {
  const [artifacts, setArtifacts] = useState<ArtifactMeta[]>([]);
  const [history, setHistory] = useState<PublishHistory[]>([]);
  const [selectedFilename, setSelectedFilename] = useState(ARTIFACTS[0].filename);
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('0.1.0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selected = useMemo(() => ARTIFACTS.find((item) => item.filename === selectedFilename) || ARTIFACTS[0], [selectedFilename]);

  const getAccessToken = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) throw new Error('Session administrateur expirée. Reconnectez-vous.');
    return token;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch('/privatia/admin/downloads', { method: 'GET', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || payload?.error || `HTTP ${response.status}`);
      setArtifacts(Array.isArray(payload.artifacts) ? payload.artifacts : []);
      setHistory(Array.isArray(payload.history) ? payload.history : []);
    } catch (error) {
      toast({ title: 'Installateurs indisponibles', description: String((error as Error).message || error), variant: 'destructive' });
    } finally { setLoading(false); }
  }, [getAccessToken]);

  useEffect(() => { void load(); }, [load]);
  const artifactMeta = (filename: string) => artifacts.find((item) => item.filename === filename);
  const copy = async (value: string, label = 'Copié') => { await navigator.clipboard?.writeText(value); toast({ title: label, description: value }); };

  const chooseFile = (next: File | null) => {
    setFile(next); setProgress(0);
    if (!next) return;
    const inferred = inferArtifact(next);
    if (!inferred) {
      toast({ title: 'Format non reconnu', description: 'Sélectionnez un fichier .dmg, .exe ou .msi.', variant: 'destructive' });
      return;
    }
    setSelectedFilename(inferred.filename);
    const versionMatch = next.name.match(/(\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?)/);
    if (versionMatch?.[1]) setVersion(versionMatch[1]);
  };

  const publish = async () => {
    if (!file) { toast({ title: 'Fichier requis', description: 'Choisissez le DMG, EXE ou MSI à publier.', variant: 'destructive' }); return; }
    const inferred = inferArtifact(file);
    if (!inferred || inferred.filename !== selected.filename) {
      toast({ title: 'Fichier incompatible', description: `Le fichier sélectionné ne correspond pas à ${selected.label}.`, variant: 'destructive' }); return;
    }
    if (!version.trim()) { toast({ title: 'Version requise', description: 'Indiquez la version publiée.', variant: 'destructive' }); return; }
    const replacing = artifactMeta(selected.filename)?.available;
    if (!window.confirm(`${replacing ? 'Remplacer' : 'Publier'} ${selected.label} avec ${file.name} (${formatBytes(file.size)}) ?\n\nAprès validation, ce fichier deviendra immédiatement la version téléchargée par les utilisateurs depuis bot.bj.`)) return;

    setUploading(true); setProgress(0);
    try {
      const token = await getAccessToken();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `/privatia/admin/downloads/${encodeURIComponent(selected.filename)}`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.setRequestHeader('X-PrivatAI-Version', version.trim());
        xhr.setRequestHeader('X-PrivatAI-Notes', notes.trim());
        xhr.upload.onprogress = (event) => { if (event.lengthComputable && event.total > 0) setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100))); };
        xhr.onerror = () => reject(new Error('Connexion interrompue pendant le chargement.'));
        xhr.onabort = () => reject(new Error('Chargement annulé.'));
        xhr.onload = () => {
          let payload: any = {};
          try { payload = JSON.parse(xhr.responseText || '{}'); } catch { payload = {}; }
          if (xhr.status >= 200 && xhr.status < 300) { setProgress(100); resolve(); }
          else reject(new Error(payload?.detail || payload?.error || `HTTP ${xhr.status}`));
        };
        xhr.send(file);
      });
      toast({ title: 'Version publiée', description: `${selected.label} ${version.trim()} est maintenant disponible sur bot.bj.` });
      setFile(null); setNotes(''); if (inputRef.current) inputRef.current.value = '';
      await load();
    } catch (error) {
      toast({ title: 'Publication impossible', description: String((error as Error).message || error), variant: 'destructive' });
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-6">
      <Card className="border-violet-200 bg-gradient-to-br from-violet-50/70 via-background to-background">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl"><HardDriveDownload className="h-6 w-6 text-violet-600" />Versions & téléchargements PrivatAI</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">Chargez ici les installateurs validés. Le fichier publié devient la version servie directement depuis <strong>bot.bj</strong>, sans page GitHub et sans manipulation serveur manuelle.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void load()} disabled={loading || uploading}>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}Actualiser</Button>
              <Button variant="outline" onClick={() => window.open('/privatia', '_blank', 'noopener,noreferrer')}><ExternalLink className="h-4 w-4 mr-2" />Voir la page publique</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {ARTIFACTS.map((definition) => {
          const meta = artifactMeta(definition.filename); const available = Boolean(meta?.available);
          return (
            <Card key={definition.filename} className={selectedFilename === definition.filename ? 'ring-2 ring-violet-500' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 grid place-items-center">{definition.kind === 'dmg' ? <Apple className="h-5 w-5" /> : <FileArchive className="h-5 w-5" />}</div>
                  <Badge variant={available ? 'default' : 'secondary'}>{available ? 'Publié' : 'Non publié'}</Badge>
                </div>
                <CardTitle className="text-lg mt-3">{definition.label}</CardTitle><CardDescription>{definition.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3">
                  <span className="text-muted-foreground">Version</span><strong className="text-right">{meta?.version || '—'}</strong>
                  <span className="text-muted-foreground">Taille</span><strong className="text-right">{formatBytes(meta?.size)}</strong>
                  <span className="text-muted-foreground">Publication</span><strong className="text-right text-xs">{formatDate(meta?.uploaded_at)}</strong>
                </div>
                {meta?.sha256 && <button className="w-full text-left font-mono text-xs text-muted-foreground hover:text-foreground" onClick={() => void copy(meta.sha256 || '', 'SHA-256 copié')} title={meta.sha256}>SHA-256 {shortHash(meta.sha256)}</button>}
                <div className="flex gap-2">
                  <Button variant={selectedFilename === definition.filename ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setSelectedFilename(definition.filename)}><FileUp className="h-4 w-4 mr-2" />Publier</Button>
                  {available && <Button variant="outline" size="icon" onClick={() => void copy(`${window.location.origin}${meta?.download_url}`, 'Lien public copié')} title="Copier le lien public"><Copy className="h-4 w-4" /></Button>}
                  {available && <Button variant="outline" size="icon" onClick={() => window.open(meta?.download_url, '_blank', 'noopener,noreferrer')} title="Tester le téléchargement"><Download className="h-4 w-4" /></Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-violet-600" />Publier une nouvelle version</CardTitle><CardDescription>Sélectionnez la plateforme, choisissez le fichier validé puis publiez. L’ancienne version est sauvegardée côté serveur avant remplacement.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ARTIFACTS.map((item) => <button key={item.filename} type="button" onClick={() => setSelectedFilename(item.filename)} className={`rounded-xl border p-4 text-left transition ${selectedFilename === item.filename ? 'border-violet-500 bg-violet-50' : 'hover:bg-muted/50'}`}><div className="font-semibold">{item.label}</div><div className="text-xs text-muted-foreground mt-1">{item.filename}</div></button>)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="lg:col-span-2">
              <Label htmlFor="privatai-installer">Fichier {selected.kind.toUpperCase()}</Label>
              <Input ref={inputRef} id="privatai-installer" type="file" accept={selected.accept} onChange={(event) => chooseFile(event.target.files?.[0] || null)} disabled={uploading} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Le fichier sera publié sous le nom stable <span className="font-mono">{selected.filename}</span>.</p>
            </div>
            <div><Label htmlFor="privatai-version">Version</Label><Input id="privatai-version" value={version} onChange={(event) => setVersion(event.target.value)} placeholder="0.1.0" disabled={uploading} className="mt-1" /></div>
          </div>
          <div><Label htmlFor="privatai-release-notes">Note de publication</Label><Input id="privatai-release-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex. Version validée sur Mac Intel — licence V2 — corrections installation" maxLength={400} disabled={uploading} className="mt-1" /></div>
          {file && <div className="rounded-xl border bg-muted/30 p-4 flex items-center justify-between gap-4 flex-wrap"><div><div className="font-medium">{file.name}</div><div className="text-xs text-muted-foreground">{formatBytes(file.size)} → {selected.label}</div></div><Badge variant="outline">Prêt à publier</Badge></div>}
          {uploading && <div className="space-y-2"><div className="flex justify-between text-sm"><span>Chargement et validation du fichier…</span><strong>{progress}%</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} /></div><p className="text-xs text-muted-foreground">Ne fermez pas cette page jusqu’à la confirmation de publication.</p></div>}
          <div className="flex items-center justify-between gap-4 flex-wrap rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="flex gap-3 items-start"><ShieldCheck className="h-5 w-5 text-emerald-700 mt-0.5" /><div><div className="font-semibold text-emerald-900">Publication contrôlée</div><div className="text-xs text-emerald-800 mt-1 max-w-2xl">Le serveur vérifie le rôle administrateur, la taille, le format binaire et calcule le SHA-256 avant de remplacer la version publique.</div></div></div>
            <Button onClick={() => void publish()} disabled={!file || uploading} className="min-w-40">{uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}{uploading ? 'Publication…' : 'Publier maintenant'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Liens publics stables</CardTitle><CardDescription>Ces adresses restent identiques quand vous remplacez une version. Les utilisateurs n’ont aucun lien GitHub à manipuler.</CardDescription></CardHeader>
        <CardContent className="space-y-2">{ARTIFACTS.map((item) => <div key={item.filename} className="flex items-center justify-between gap-3 rounded-lg border p-3 flex-wrap"><div><div className="font-medium text-sm">{item.label}</div><code className="text-xs text-muted-foreground">{`${window.location.origin}/privatia/downloads/${item.filename}`}</code></div><Button variant="outline" size="sm" onClick={() => void copy(`${window.location.origin}/privatia/downloads/${item.filename}`, 'Lien public copié')}><Copy className="h-4 w-4 mr-2" />Copier</Button></div>)}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historique des publications</CardTitle><CardDescription>Traçabilité des dernières versions chargées depuis le backoffice.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Fichier</TableHead><TableHead>Version</TableHead><TableHead>Taille</TableHead><TableHead>Administrateur</TableHead><TableHead>SHA-256</TableHead></TableRow></TableHeader>
            <TableBody>{history.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune publication administrateur enregistrée pour le moment.</TableCell></TableRow> : history.map((row, index) => <TableRow key={`${row.at}-${row.filename}-${index}`}><TableCell className="whitespace-nowrap">{formatDate(row.at)}</TableCell><TableCell className="font-mono text-xs">{row.filename}</TableCell><TableCell>{row.version || '—'}</TableCell><TableCell>{formatBytes(row.size)}</TableCell><TableCell className="text-xs">{row.by || '—'}</TableCell><TableCell>{row.sha256 ? <button className="font-mono text-xs hover:underline" onClick={() => void copy(row.sha256 || '', 'SHA-256 copié')}>{shortHash(row.sha256)}</button> : '—'}</TableCell></TableRow>)}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-emerald-200"><CardContent className="pt-6 flex gap-3 items-start"><CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" /><div><div className="font-semibold">Parcours administrateur</div><p className="text-sm text-muted-foreground mt-1">1. Générer et tester le DMG/EXE/MSI → 2. Ouvrir cette page → 3. Choisir le fichier → 4. Indiquer la version → 5. Publier → 6. Tester le lien public. La landing PrivatAI utilise automatiquement le nom stable du fichier publié.</p></div></CardContent></Card>
    </div>
  );
}
