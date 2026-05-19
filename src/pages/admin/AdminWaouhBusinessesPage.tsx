import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPhoneDisplay } from '@/lib/phone';
import { Loader2, ShieldCheck, ShieldOff, Trash2, Search } from 'lucide-react';

export default function AdminWaouhBusinessesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('waouh_partner_businesses' as any)
      .select('*, partner:waouh_partners(code_partenaire, nom)')
      .order('created_at', { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, payload: any, msg: string) => {
    const { error } = await supabase.from('waouh_partner_businesses' as any).update(payload).eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else { toast({ title: msg }); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('waouh_partner_businesses' as any).delete().eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else { toast({ title: '🗑️ Supprimée' }); load(); }
  };

  const filtered = items.filter(i => !search ||
    i.nom_entreprise?.toLowerCase().includes(search.toLowerCase()) ||
    i.ville?.toLowerCase().includes(search.toLowerCase()) ||
    i.categorie?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Entreprises partenaires</h1>
        <p className="text-muted-foreground">{items.length} entreprise(s) tous partenaires confondus</p>
      </div>
      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input className="pl-8" placeholder="Rechercher nom, ville, catégorie…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardHeader><CardTitle>Validation & supervision</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Entreprise</TableHead><TableHead>Catégorie</TableHead><TableHead>Ville</TableHead>
                <TableHead>Partenaire</TableHead><TableHead>Contact</TableHead><TableHead>Statut</TableHead>
                <TableHead>Vérifié</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(b => (
                  <TableRow key={b.id}>
                    <TableCell><strong>{b.nom_entreprise}</strong></TableCell>
                    <TableCell>{b.categorie}</TableCell>
                    <TableCell>{b.ville}{b.quartier ? ` · ${b.quartier}` : ''}</TableCell>
                    <TableCell className="text-xs">{b.partner?.code_partenaire} · {b.partner?.nom}</TableCell>
                    <TableCell className="text-xs">{formatPhoneDisplay(b.telephone)}</TableCell>
                    <TableCell><Badge variant={b.statut === 'active' ? 'default' : 'secondary'}>{b.statut}</Badge></TableCell>
                    <TableCell>{b.verifie_admin ? <Badge className="bg-emerald-600">OK</Badge> : <Badge variant="outline">Non</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" title={b.verifie_admin ? 'Révoquer' : 'Vérifier'}
                          onClick={() => update(b.id, { verifie_admin: !b.verifie_admin }, b.verifie_admin ? 'Vérification retirée' : '✅ Vérifié')}>
                          {b.verifie_admin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </Button>
                        {b.statut === 'active'
                          ? <Button size="sm" variant="outline" onClick={() => update(b.id, { statut: 'pause' }, 'Mise en pause')}>Pause</Button>
                          : <Button size="sm" variant="outline" onClick={() => update(b.id, { statut: 'active' }, 'Réactivée')}>Activer</Button>}
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucune entreprise</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
