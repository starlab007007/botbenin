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
import { Loader2, Search, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';

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
  const [cleanReport, setCleanReport] = useState<{ ok: number; failed: number } | null>(null);

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
  const cleanWithAI = async () => {
    setCleaning(true);
    setCleanReport(null);
    // Récupère les 20 entrées les moins propres (score bas, non vérifiées)
    const { data: entries } = await supabase
      .from('waouh_unified_catalog' as any)
      .select('id, titre, description, categorie, ville, source, qualite_score')
      .eq('verified', false)
      .order('qualite_score', { ascending: true })
      .limit(20);
    if (!entries?.length) { setCleaning(false); toast({ title: 'Rien à nettoyer' }); return; }
    let ok = 0, failed = 0;
    for (const e of entries as any[]) {
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
      } else failed++;
    }
    setCleanReport({ ok, failed });
    setCleaning(false);
    toast({ title: `✅ Nettoyage terminé`, description: `${ok} OK / ${failed} échecs` });
    loadStats(); search();
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
                        <TableCell className="text-xs">{r.vendeur_nom}<div className="text-muted-foreground">{r.vendeur_phone}</div></TableCell>
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
              <Button onClick={cleanWithAI} disabled={cleaning} size="lg">
                {cleaning ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Lancer le nettoyage IA (20 entrées)
              </Button>
              {cleanReport && (
                <div className="p-4 rounded border bg-muted/30">
                  ✅ {cleanReport.ok} entrées nettoyées · ❌ {cleanReport.failed} échecs
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
