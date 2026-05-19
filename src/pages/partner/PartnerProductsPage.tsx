import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { Plus, Loader2, ArrowLeft, Trash2 } from 'lucide-react';

export default function PartnerProductsPage() {
  const { businessId } = useParams();
  const { partner } = useWaouhPartner();
  const { toast } = useToast();
  const [business, setBusiness] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ nom: '', description: '', categorie: '', prix_min: '', prix_max: '', unite: '', disponible: true, stock_estime: '' });

  const load = async () => {
    if (!businessId) return;
    const [b, p] = await Promise.all([
      supabase.from('waouh_partner_businesses' as any).select('*').eq('id', businessId).single(),
      supabase.from('waouh_partner_products' as any).select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    ]);
    setBusiness(b.data);
    setProducts((p.data as any) || []);
  };
  useEffect(() => { load(); }, [businessId]);

  const save = async () => {
    if (!partner || !businessId) return;
    setSaving(true);
    const { error } = await supabase.from('waouh_partner_products' as any).insert({
      ...form, partner_id: partner.id, business_id: businessId,
      prix_min: form.prix_min ? Number(form.prix_min) : null,
      prix_max: form.prix_max ? Number(form.prix_max) : null,
      stock_estime: form.stock_estime ? parseInt(form.stock_estime) : null,
    });
    setSaving(false);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: 'Produit ajouté' });
    setOpen(false);
    setForm({ nom: '', description: '', categorie: '', prix_min: '', prix_max: '', unite: '', disponible: true, stock_estime: '' });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('waouh_partner_products' as any).delete().eq('id', id);
    load();
  };

  return (
    <div className="container py-8 space-y-6">
      <Link to="/partner/businesses" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" />Retour aux entreprises</Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{business?.nom_entreprise || '...'}</h1>
          <p className="text-muted-foreground">{products.length} produit(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nouveau produit</Button></DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>Ajouter un produit</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nom *</Label><Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Catégorie</Label><Input value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} /></div>
                <div><Label>Unité</Label><Input value={form.unite} onChange={e => setForm({ ...form, unite: e.target.value })} placeholder="kg, pièce..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Prix min (FCFA)</Label><Input type="number" value={form.prix_min} onChange={e => setForm({ ...form, prix_min: e.target.value })} /></div>
                <div><Label>Prix max (FCFA)</Label><Input type="number" value={form.prix_max} onChange={e => setForm({ ...form, prix_max: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Stock estimé</Label><Input type="number" value={form.stock_estime} onChange={e => setForm({ ...form, stock_estime: e.target.value })} /></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={form.disponible} onCheckedChange={v => setForm({ ...form, disponible: v })} /><Label>Disponible</Label></div>
              </div>
              <Button disabled={saving || !form.nom} onClick={save} className="w-full">{saving && <Loader2 className="animate-spin h-4 w-4 mr-2" />}Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{p.nom}</CardTitle>
                <Badge variant={p.disponible ? 'default' : 'secondary'}>{p.disponible ? 'Dispo' : 'Indispo'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {p.description && <p className="text-muted-foreground line-clamp-2">{p.description}</p>}
              {(p.prix_min || p.prix_max) && <div className="font-semibold">{p.prix_min === p.prix_max ? `${p.prix_min} F` : `${p.prix_min || 0} - ${p.prix_max || 0} F`} {p.unite && `/ ${p.unite}`}</div>}
              <Button variant="ghost" size="sm" onClick={() => remove(p.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-1" />Supprimer</Button>
            </CardContent>
          </Card>
        ))}
        {products.length === 0 && <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">Aucun produit. Ajoutez-en un.</CardContent></Card>}
      </div>
    </div>
  );
}
