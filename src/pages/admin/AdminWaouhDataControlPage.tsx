import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWaouhAI } from '@/hooks/useWaouhAI';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search, Sparkles, RefreshCw, CheckCircle2, XCircle, StopCircle, Clock } from 'lucide-react';
import { useRef } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanItems, setCleanItems] = useState<CleanItem[]>([]);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [batchSize, setBatchSize] = useState(20);
  const cancelRef = useRef(false);

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
  useEffect(() => { loadStats(); }, []);

  const search = async () => {
    const { data, error } = await supabase.rpc('waouh_search_unified' as any, {
      q: query || null, in_ville: ville || null, max_results: 100
    });
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    let rows = (data as any) || [];
    if (sourceFilter !== 'all') rows = rows.filter((r: any) => r.source === sourceFilter);
    setResults(rows);
  };

  const toggleVerified = async (id: string, current: boolean) => {
    await supabase.from('waouh_unified_catalog' as any).update({ verified: !current, qualite_score: !current ? 90 : 70 }).eq('id', id);
    search(); loadStats();
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
              <CardTitle>Recherche unifiée</CardTitle>
              <CardDescription>Tri par priorité (Partner → Chat → Radar) puis score qualité</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Input placeholder="Recherche texte..." value={query} onChange={e => setQuery(e.target.value)} className="flex-1 min-w-[200px]" />
                <Input placeholder="Ville" value={ville} onChange={e => setVille(e.target.value)} className="max-w-xs" />
                <select className="border rounded px-3 text-sm" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                  <option value="all">Toutes sources</option>
                  <option value="partner">Partner</option>
                  <option value="chat">Chat</option>
                  <option value="radar">Radar</option>
                </select>
                <Button onClick={search}><Search className="h-4 w-4 mr-2" />Rechercher</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Titre</TableHead><TableHead>Ville</TableHead><TableHead>Prix</TableHead><TableHead>Vendeur</TableHead><TableHead>Score</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {results.map(r => (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant={r.source === 'partner' ? 'default' : r.source === 'chat' ? 'secondary' : 'outline'}>{r.source} · P{r.priority_rank}</Badge></TableCell>
                        <TableCell className="max-w-xs truncate">{r.titre}</TableCell>
                        <TableCell>{r.ville}</TableCell>
                        <TableCell>{r.prix_min ? `${Number(r.prix_min).toLocaleString()} F` : '-'}</TableCell>
                        <TableCell className="text-xs"><div className="font-medium">{r.vendeur_nom}</div><PhoneCell value={r.vendeur_whatsapp || r.vendeur_phone} /></TableCell>
                        <TableCell><Badge variant="outline">{r.qualite_score}</Badge></TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => toggleVerified(r.id, false)}><CheckCircle2 className="h-4 w-4 mr-1" />Vérifier</Button></TableCell>
                      </TableRow>
                    ))}
                    {results.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{loading ? 'Chargement...' : 'Lancez une recherche'}</TableCell></TableRow>}
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
