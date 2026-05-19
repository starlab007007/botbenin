import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search } from 'lucide-react';

export default function AdminWaouhDataControlPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>({ partner: 0, chat: 0, radar: 0, total: 0, verified: 0 });
  const [results, setResults] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [ville, setVille] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    const sources: Array<'partner' | 'chat' | 'radar'> = ['partner', 'chat', 'radar'];
    const counts: any = { total: 0, verified: 0 };
    for (const src of sources) {
      const { count } = await supabase.from('waouh_unified_catalog' as any).select('id', { count: 'exact', head: true }).eq('source', src);
      counts[src] = count || 0;
      counts.total += count || 0;
    }
    const { count: vCount } = await supabase.from('waouh_unified_catalog' as any).select('id', { count: 'exact', head: true }).eq('verified', true);
    counts.verified = vCount || 0;
    setStats(counts);
    setLoading(false);
  };

  useEffect(() => { loadStats(); }, []);

  const search = async () => {
    const { data, error } = await supabase.rpc('waouh_search_unified' as any, {
      q: query || null, in_ville: ville || null, max_results: 50
    });
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    setResults((data as any) || []);
  };

  const toggleVerified = async (id: string, current: boolean) => {
    await supabase.from('waouh_unified_catalog' as any).update({ verified: !current, qualite_score: !current ? 90 : 70 }).eq('id', id);
    search();
    loadStats();
  };

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-bold">Contrôle Base de Données Unifiée</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Partner (P1)" value={stats.partner} color="bg-emerald-500/10 text-emerald-700" />
        <StatCard label="Chat (P2)" value={stats.chat} color="bg-blue-500/10 text-blue-700" />
        <StatCard label="Radar (P3)" value={stats.radar} color="bg-amber-500/10 text-amber-700" />
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Vérifiés" value={stats.verified} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recherche unifiée</CardTitle>
          <CardDescription>Tri par priorité (Partner → Chat → Radar) puis score qualité</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Recherche texte..." value={query} onChange={e => setQuery(e.target.value)} />
            <Input placeholder="Ville" value={ville} onChange={e => setVille(e.target.value)} className="max-w-xs" />
            <Button onClick={search}><Search className="h-4 w-4 mr-2" />Rechercher</Button>
          </div>
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
                  <TableCell><Button size="sm" variant="outline" onClick={() => toggleVerified(r.id, false)}>Vérifier</Button></TableCell>
                </TableRow>
              ))}
              {results.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{loading ? 'Chargement...' : 'Lancez une recherche'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
