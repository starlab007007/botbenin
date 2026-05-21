import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWaouhAI } from '@/hooks/useWaouhAI';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, Search, Sparkles, RefreshCw, CheckCircle2, XCircle, StopCircle, Clock,
  MoreHorizontal, Eye, Pencil, Trash2, Power, PowerOff, ShieldCheck, MapPin, ImageIcon,
  Download, FileSpreadsheet, Archive
} from 'lucide-react';
import { PhoneCell } from '@/components/waouh/PhoneCell';

type CleanItemStatus = 'pending' | 'processing' | 'ok' | 'failed' | 'cancelled';
interface CleanItem { id: string; titre: string; status: CleanItemStatus; message?: string }

export default function AdminWaouhDataControlPage() {
  const { toast } = useToast();
  const ai = useWaouhAI();
  const [stats, setStats] = useState<any>({ partner: 0, chat: 0, radar: 0, total: 0, verified: 0 });
  const [results, setResults] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [ville, setVille] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanItems, setCleanItems] = useState<CleanItem[]>([]);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [batchSize, setBatchSize] = useState(20);
  const cancelRef = useRef(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [editDraft, setEditDraft] = useState<any>({});

  const loadStats = async () => {
    setLoading(true);
    const sources: Array<'partner' | 'chat' | 'radar'> = ['partner', 'chat', 'radar'];
    const counts: any = { total: 0, verified: 0 };
    await Promise.all(sources.map(async (src) => {
      const { count } = await supabase.from('waouh_unified_catalog' as any).select('id', { count: 'exact', head: true }).eq('source', src);
      counts[src] = count || 0;
    }));
    counts.total = counts.partner + counts.chat + counts.radar;
    const { count: vCount } = await supabase.from('waouh_unified_catalog' as any).select('id', { count: 'exact', head: true }).eq('verified', true);
    counts.verified = vCount || 0;
    setStats(counts);
    setLoading(false);
  };
  useEffect(() => { loadStats(); search(); /* eslint-disable-next-line */ }, []);

  const search = async () => {
    setSearching(true);
    const { data, error } = await supabase.rpc('waouh_search_unified' as any, {
      q: query || null,
      in_ville: ville || null,
      max_results: 200,
      in_type: typeFilter === 'all' ? null : typeFilter,
      in_source: sourceFilter === 'all' ? null : sourceFilter,
      include_inactive: statusFilter !== 'active',
      only_verified: statusFilter === 'verified',
    });
    setSearching(false);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    let rows = (data as any) || [];
    if (statusFilter === 'inactive') rows = rows.filter((r: any) => !r.is_active);
    setResults(rows);
  };

  const toggleVerified = async (id: string, current: boolean) => {
    const { error } = await supabase.from('waouh_unified_catalog' as any).update({ verified: !current, qualite_score: !current ? 90 : 70 }).eq('id', id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: !current ? '✅ Vérifié' : 'Vérification retirée' });
    setResults(prev => prev.map(r => r.id === id ? { ...r, verified: !current } : r));
    loadStats();
  };
  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('waouh_unified_catalog' as any).update({ is_active: !current }).eq('id', id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: !current ? 'Activé' : 'Désactivé' });
    setResults(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r));
  };
  const removeRow = async (id: string) => {
    if (!confirm('Supprimer définitivement cette entrée du catalogue ?')) return;
    const { error } = await supabase.from('waouh_unified_catalog' as any).delete().eq('id', id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: 'Supprimé' });
    setResults(prev => prev.filter(r => r.id !== id));
    loadStats();
  };
  const openEdit = (r: any) => {
    setEditing(r);
    setEditDraft({
      titre: r.titre || '', description: r.description || '', categorie: r.categorie || '',
      ville: r.ville || '', quartier: r.quartier || '',
      prix_min: r.prix_min ?? '', prix_max: r.prix_max ?? '',
      vendeur_nom: r.vendeur_nom || '', vendeur_phone: r.vendeur_phone || '', vendeur_whatsapp: r.vendeur_whatsapp || '',
    });
  };
  const saveEdit = async () => {
    if (!editing) return;
    const patch: any = { ...editDraft };
    ['prix_min', 'prix_max'].forEach(k => { patch[k] = patch[k] === '' ? null : Number(patch[k]); });
    const { error } = await supabase.from('waouh_unified_catalog' as any).update(patch).eq('id', editing.id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: '✅ Mis à jour' });
    setResults(prev => prev.map(r => r.id === editing.id ? { ...r, ...patch } : r));
    setEditing(null);
  };

  // === Nettoyage IA en batch ===
  const updateItem = (id: string, patch: Partial<CleanItem>) =>
    setCleanItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  const cancelCleaning = () => { cancelRef.current = true; };

  const cleanWithAI = async () => {
    cancelRef.current = false;
    setCleaning(true);
    setCleanProgress(0);
    setCleanItems([]);
    const { data: entries } = await supabase
      .from('waouh_unified_catalog' as any)
      .select('id, titre, description, categorie, ville, source, qualite_score')
      .eq('verified', false)
      .order('qualite_score', { ascending: true })
      .limit(batchSize);
    if (!entries?.length) { setCleaning(false); toast({ title: 'Rien à nettoyer' }); return; }

    const initial: CleanItem[] = (entries as any[]).map(e => ({ id: e.id, titre: e.titre || '(sans titre)', status: 'pending' }));
    setCleanItems(initial);

    let ok = 0, failed = 0, cancelled = 0;
    const total = entries.length;
    for (let i = 0; i < total; i++) {
      if (cancelRef.current) {
        // Marquer le reste comme annulé
        for (let j = i; j < total; j++) updateItem((entries as any[])[j].id, { status: 'cancelled' });
        cancelled = total - i;
        break;
      }
      const e = (entries as any[])[i];
      updateItem(e.id, { status: 'processing' });
      try {
        const r = await ai.run<any>('clean_catalog_entry', { entry: { titre: e.titre, description: e.description, categorie: e.categorie, ville: e.ville } });
        if (r?.titre) {
          await supabase.from('waouh_unified_catalog' as any).update({
            titre: r.titre,
            categorie: r.categorie || e.categorie,
            sous_categorie: r.sous_categorie || null,
            tags: r.tags || null,
            qualite_score: Math.max(e.qualite_score || 0, r.qualite_score || 0),
          }).eq('id', e.id);
          ok++;
          updateItem(e.id, { status: 'ok', titre: r.titre, message: `Score: ${r.qualite_score || '?'}` });
        } else {
          failed++;
          updateItem(e.id, { status: 'failed', message: 'Réponse IA invalide' });
        }
      } catch (err: any) {
        failed++;
        updateItem(e.id, { status: 'failed', message: err?.message || 'Erreur' });
      }
      setCleanProgress(Math.round(((i + 1) / total) * 100));
    }
    setCleaning(false);
    toast({
      title: cancelRef.current ? 'Nettoyage annulé' : '✅ Nettoyage terminé',
      description: `${ok} OK · ${failed} échecs${cancelled ? ` · ${cancelled} annulés` : ''}`,
    });
    loadStats(); search();
  };

  const statusMeta: Record<CleanItemStatus, { label: string; icon: any; cls: string }> = {
    pending:    { label: 'En attente',  icon: Clock,        cls: 'text-muted-foreground' },
    processing: { label: 'En cours',    icon: Loader2,      cls: 'text-blue-600 animate-spin' },
    ok:         { label: 'OK',          icon: CheckCircle2, cls: 'text-green-600' },
    failed:     { label: 'Échec',       icon: XCircle,      cls: 'text-red-600' },
    cancelled:  { label: 'Annulé',      icon: StopCircle,   cls: 'text-amber-600' },
  };

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-bold">Contrôle Base de Données Unifiée</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Partner (P1)" value={stats.partner} color="text-emerald-700" />
        <StatCard label="Chat (P2)" value={stats.chat} color="text-blue-700" />
        <StatCard label="Radar (P3)" value={stats.radar} color="text-amber-700" />
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Vérifiés" value={stats.verified} color="text-green-700" />
      </div>

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search"><Search className="h-4 w-4 mr-1" />Recherche</TabsTrigger>
          <TabsTrigger value="clean"><Sparkles className="h-4 w-4 mr-1" />Nettoyage IA</TabsTrigger>
          <TabsTrigger value="restore"><RefreshCw className="h-4 w-4 mr-1" />Restauration</TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Catalogue unifié — Annonces · Vendeurs · Acheteurs</CardTitle>
              <CardDescription>Source unique pour toutes les annonces (Partner → Chat → Radar). Contacts WhatsApp normalisés au format Bénin +229 01 XX XX XX XX.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Input placeholder="Recherche texte..." value={query} onChange={e => setQuery(e.target.value)} className="flex-1 min-w-[200px]" />
                <Input placeholder="Ville" value={ville} onChange={e => setVille(e.target.value)} className="max-w-[180px]" />
                <select className="border rounded px-3 text-sm bg-background" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="all">Tous types</option>
                  <option value="offer">Annonces (vendeurs)</option>
                  <option value="demand">Demandes (acheteurs)</option>
                </select>
                <select className="border rounded px-3 text-sm bg-background" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                  <option value="all">Toutes sources</option>
                  <option value="partner">Partner</option>
                  <option value="chat">Chat</option>
                  <option value="radar">Radar IA</option>
                </select>
                <select className="border rounded px-3 text-sm bg-background" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="active">Actives</option>
                  <option value="inactive">Désactivées</option>
                  <option value="verified">Vérifiées</option>
                  <option value="all">Toutes</option>
                </select>
                <Button onClick={search} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Rechercher
                </Button>
                <Button variant="outline" onClick={async () => {
                  try {
                    toast({ title: 'Synchronisation WAHA en cours…', description: 'Récupération des contacts depuis toutes les sessions actives.' });
                    const { data, error } = await supabase.functions.invoke('waouh-waha-sync-contacts', { body: { backfill: true } });
                    if (error) throw error;
                    if (data?.warning) {
                      toast({ title: '⚠️ Aucune session WAHA active', description: data.warning, variant: 'destructive' });
                    } else {
                      const sessLabel = (data?.sessions || []).join(', ') || 'aucune session';
                      toast({ title: '✅ Synchro WAHA terminée', description: `Sessions: ${sessLabel} · ${data?.mapped ?? 0} contacts mappés · ${data?.backfilled ?? 0} annonces mises à jour` });
                    }
                    search();
                  } catch (e: any) {
                    const msg = e?.context?.body ? (typeof e.context.body === 'string' ? e.context.body : JSON.stringify(e.context.body)) : (e?.message || String(e));
                    toast({ title: 'Erreur synchro WAHA', description: msg, variant: 'destructive' });
                  }
                }}>
                  <RefreshCw className="h-4 w-4 mr-2" />Synchroniser contacts WAHA
                </Button>
                <Button variant="outline" onClick={() => {
                  if (!results.length) { toast({ title: 'Rien à exporter', variant: 'destructive' }); return; }
                  const ws = XLSX.utils.json_to_sheet(results);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Catalogue');
                  const fname = `waouh-catalogue-${new Date().toISOString().slice(0,10)}.xlsx`;
                  XLSX.writeFile(wb, fname);
                  toast({ title: '✅ Excel téléchargé', description: fname });
                }}>
                  <Download className="h-4 w-4 mr-2" />Télécharger Excel
                </Button>
                <Button variant="outline" onClick={() => {
                  if (!results.length) { toast({ title: 'Rien à exporter', variant: 'destructive' }); return; }
                  const ws = XLSX.utils.json_to_sheet(results);
                  const csv = XLSX.utils.sheet_to_csv(ws);
                  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `waouh-catalogue-${new Date().toISOString().slice(0,10)}.csv`;
                  a.click(); URL.revokeObjectURL(url);
                  toast({ title: '✅ CSV téléchargé', description: 'Importez ce fichier dans Google Sheets via Fichier → Importer.' });
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />CSV pour Google Sheets
                </Button>
                <Button variant="outline" onClick={async () => {
                  try {
                    toast({ title: 'Backup en cours…' });
                    const { data, error } = await supabase.functions.invoke('waouh-catalog-backup', { body: { trigger: 'manual' } });
                    if (error) throw error;
                    toast({ title: '✅ Backup créé', description: `${data?.rows_count ?? 0} lignes archivées · ${data?.path}` });
                  } catch (e: any) {
                    const msg = e?.context?.body ? (typeof e.context.body === 'string' ? e.context.body : JSON.stringify(e.context.body)) : (e?.message || String(e));
                    toast({ title: 'Erreur backup', description: msg, variant: 'destructive' });
                  }
                }}>
                  <Archive className="h-4 w-4 mr-2" />Backup manuel
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">{results.length} résultat{results.length > 1 ? 's' : ''}</div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Photos</TableHead>
                      <TableHead>Source · Type</TableHead>
                      <TableHead>Titre / Catégorie</TableHead>
                      <TableHead>Vendeur / Acheteur</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Lieu</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Publié</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map(r => {
                      const photo = Array.isArray(r.photos) && r.photos.length ? r.photos[0] : null;
                      const phoneDisplay = r.vendeur_phone_norm || r.vendeur_phone;
                      const waDisplay = r.vendeur_whatsapp_norm || r.vendeur_whatsapp;
                      return (
                        <TableRow key={r.id} className={!r.is_active ? 'opacity-60' : ''}>
                          <TableCell>
                            {photo ? (
                              <img src={photo} alt="" className="h-12 w-12 rounded object-cover border" loading="lazy" />
                            ) : (
                              <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            {Array.isArray(r.photos) && r.photos.length > 1 && (
                              <div className="text-[10px] text-muted-foreground text-center mt-0.5">+{r.photos.length - 1}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={r.source === 'partner' ? 'default' : r.source === 'chat' ? 'secondary' : 'outline'} className="w-fit">
                                {r.source} · P{r.priority_rank}
                              </Badge>
                              <Badge variant={r.type === 'offer' ? 'default' : 'outline'} className="w-fit text-[10px]">
                                {r.type === 'offer' ? '🏷️ Annonce' : '🔎 Acheteur'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="font-medium truncate">{r.titre || '(sans titre)'}</div>
                            <div className="text-xs text-muted-foreground truncate">{r.categorie || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{r.vendeur_nom || <span className="text-muted-foreground italic">Anonyme</span>}</div>
                          </TableCell>
                          <TableCell><PhoneCell value={phoneDisplay} /></TableCell>
                          <TableCell><PhoneCell value={waDisplay} /></TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.ville || '—'}</div>
                            {r.quartier && <div className="text-muted-foreground">{r.quartier}</div>}
                            {r.lat && r.lng && <div className="text-[10px] text-muted-foreground font-mono">{Number(r.lat).toFixed(3)}, {Number(r.lng).toFixed(3)}</div>}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-emerald-700 whitespace-nowrap">
                            {r.prix_min ? `${Number(r.prix_min).toLocaleString()} ${r.devise || 'F'}` : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {r.date_publication ? new Date(r.date_publication).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={r.is_active ? 'default' : 'secondary'} className="w-fit text-[10px]">
                                {r.is_active ? 'Actif' : 'Désactivé'}
                              </Badge>
                              {r.verified && <Badge variant="outline" className="w-fit text-[10px] border-green-500 text-green-700">✓ Vérifié</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewing(r)}><Eye className="h-4 w-4 mr-2" />Voir détails</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="h-4 w-4 mr-2" />Modifier</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleVerified(r.id, r.verified)}>
                                  <ShieldCheck className="h-4 w-4 mr-2" />{r.verified ? 'Retirer vérification' : 'Vérifier'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleActive(r.id, r.is_active)}>
                                  {r.is_active ? <><PowerOff className="h-4 w-4 mr-2" />Désactiver</> : <><Power className="h-4 w-4 mr-2" />Activer</>}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => removeRow(r.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {results.length === 0 && (
                      <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        {loading || searching ? 'Chargement...' : 'Aucun résultat — ajustez les filtres'}
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clean">
          <Card>
            <CardHeader>
              <CardTitle>Nettoyage intelligent par IA</CardTitle>
              <CardDescription>Sélectionne les 20 entrées au score qualité le plus bas, normalise titre / catégorie / tags et recalcule le score.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-sm text-muted-foreground">Taille du lot :</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={batchSize}
                  onChange={e => setBatchSize(Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
                  disabled={cleaning}
                  className="w-24"
                />
                <Button onClick={cleanWithAI} disabled={cleaning} size="lg">
                  {cleaning ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Lancer le nettoyage IA ({batchSize})
                </Button>
                {cleaning && (
                  <Button onClick={cancelCleaning} variant="destructive" size="lg">
                    <StopCircle className="h-4 w-4 mr-2" />Annuler
                  </Button>
                )}
              </div>

              {(cleaning || cleanItems.length > 0) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progression</span>
                    <span className="font-mono">{cleanProgress}%</span>
                  </div>
                  <Progress value={cleanProgress} />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>✅ {cleanItems.filter(i => i.status === 'ok').length} OK</span>
                    <span>❌ {cleanItems.filter(i => i.status === 'failed').length} échecs</span>
                    <span>⏸ {cleanItems.filter(i => i.status === 'cancelled').length} annulés</span>
                    <span>⏳ {cleanItems.filter(i => i.status === 'pending' || i.status === 'processing').length} restants</span>
                  </div>
                </div>
              )}

              {cleanItems.length > 0 && (
                <div className="border rounded-md max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Statut</TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead>Détails</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cleanItems.map(it => {
                        const m = statusMeta[it.status];
                        const Icon = m.icon;
                        return (
                          <TableRow key={it.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${m.cls}`} />
                                <span className="text-xs">{m.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-md truncate text-sm">{it.titre}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{it.message || '—'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restore">
          <Card>
            <CardHeader>
              <CardTitle>Restauration des sources</CardTitle>
              <CardDescription>Les triggers de synchronisation Partner / Chat / Radar sont actifs. Les nouvelles entrées entrent automatiquement dans le catalogue unifié.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={loadStats}><RefreshCw className="h-4 w-4 mr-2" />Recalculer les compteurs</Button>
              <p className="text-sm text-muted-foreground mt-4">Pour un re-backfill complet d'une source, contactez l'équipe technique.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Voir détails */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.titre || 'Détails'}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              {Array.isArray(viewing.photos) && viewing.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {viewing.photos.map((p: string, i: number) => (
                    <img key={i} src={p} alt="" className="w-full aspect-square object-cover rounded border" />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Source">{viewing.source} (P{viewing.priority_rank})</Field>
                <Field label="Type">{viewing.type === 'offer' ? 'Annonce vendeur' : 'Demande acheteur'}</Field>
                <Field label="Catégorie">{viewing.categorie || '—'} {viewing.sous_categorie ? `· ${viewing.sous_categorie}` : ''}</Field>
                <Field label="Prix">{viewing.prix_min ? `${Number(viewing.prix_min).toLocaleString()} ${viewing.devise || 'FCFA'}` : '—'}</Field>
                <Field label="Ville">{viewing.ville || '—'}</Field>
                <Field label="Quartier">{viewing.quartier || '—'}</Field>
                <Field label="Géolocalisation">{viewing.lat && viewing.lng ? `${viewing.lat}, ${viewing.lng}` : '—'}</Field>
                <Field label="Date publication">{viewing.date_publication ? new Date(viewing.date_publication).toLocaleString('fr-FR') : '—'}</Field>
                <Field label="Vendeur"><div>{viewing.vendeur_nom || '—'}</div></Field>
                <Field label="Score qualité">{viewing.qualite_score}</Field>
                <Field label="Téléphone"><PhoneCell value={viewing.vendeur_phone_norm || viewing.vendeur_phone} /></Field>
                <Field label="WhatsApp"><PhoneCell value={viewing.vendeur_whatsapp_norm || viewing.vendeur_whatsapp} /></Field>
                {viewing.vendeur_mobile_money && <Field label="Mobile Money"><PhoneCell value={viewing.vendeur_mobile_money} /></Field>}
              </div>
              {viewing.description && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Description</div>
                  <p className="whitespace-pre-wrap text-sm">{viewing.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modifier */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier l'entrée du catalogue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <LField label="Titre"><Input value={editDraft.titre || ''} onChange={e => setEditDraft({ ...editDraft, titre: e.target.value })} /></LField>
            <LField label="Description"><Textarea rows={3} value={editDraft.description || ''} onChange={e => setEditDraft({ ...editDraft, description: e.target.value })} /></LField>
            <div className="grid grid-cols-2 gap-3">
              <LField label="Catégorie"><Input value={editDraft.categorie || ''} onChange={e => setEditDraft({ ...editDraft, categorie: e.target.value })} /></LField>
              <LField label="Ville"><Input value={editDraft.ville || ''} onChange={e => setEditDraft({ ...editDraft, ville: e.target.value })} /></LField>
              <LField label="Quartier"><Input value={editDraft.quartier || ''} onChange={e => setEditDraft({ ...editDraft, quartier: e.target.value })} /></LField>
              <LField label="Vendeur"><Input value={editDraft.vendeur_nom || ''} onChange={e => setEditDraft({ ...editDraft, vendeur_nom: e.target.value })} /></LField>
              <LField label="Prix min"><Input type="number" value={editDraft.prix_min ?? ''} onChange={e => setEditDraft({ ...editDraft, prix_min: e.target.value })} /></LField>
              <LField label="Prix max"><Input type="number" value={editDraft.prix_max ?? ''} onChange={e => setEditDraft({ ...editDraft, prix_max: e.target.value })} /></LField>
              <LField label="Téléphone"><Input value={editDraft.vendeur_phone || ''} onChange={e => setEditDraft({ ...editDraft, vendeur_phone: e.target.value })} placeholder="+229 01..." /></LField>
              <LField label="WhatsApp"><Input value={editDraft.vendeur_whatsapp || ''} onChange={e => setEditDraft({ ...editDraft, vendeur_whatsapp: e.target.value })} placeholder="+229 01..." /></LField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={saveEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}
function LField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color || ''}`}>{value.toLocaleString()}</div>
    </CardContent></Card>
  );
}
