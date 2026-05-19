import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { useWaouhAI } from '@/hooks/useWaouhAI';
import { SmartCombobox } from '@/components/ui/smart-combobox';
import { BUSINESS_CATEGORIES, PRODUCT_UNITS } from '@/data/beninLocations';
import { Plus, Loader2, ArrowLeft, Trash2, Sparkles, Wand2 } from 'lucide-react';

const emptyForm = { nom: '', description: '', categorie: '', prix_min: '', prix_max: '', unite: '', disponible: true, stock_estime: '' };

export default function PartnerProductsPage() {
  const { businessId } = useParams();
  const { partner } = useWaouhPartner();
  const { toast } = useToast();
  const ai = useWaouhAI();
  const [business, setBusiness] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [freeText, setFreeText] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());

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

  const parseFreeText = async () => {
    if (!freeText.trim()) return;
    const r = await ai.run<any>('parse_product_free_text', { text: freeText });
    if (r) {
      setForm({
        nom: r.nom || '', description: r.description || '', categorie: r.categorie || '',
        prix_min: r.prix_min ?? '', prix_max: r.prix_max ?? '', unite: r.unite || '',
        disponible: true, stock_estime: r.stock_estime ?? '',
      });
      setFreeText('');
      toast({ title: '✨ Formulaire pré-rempli' });
    }
  };

  const suggestProducts = async () => {
    setSuggestOpen(true);
    const r = await ai.run<any>('suggest_products', { nom: business?.nom_entreprise, categorie: business?.categorie, ville: business?.ville });
    if (r?.produits) { setSuggestions(r.produits); setPicked(new Set(r.produits.map((_: any, i: number) => i))); }
  };

  const addPicked = async () => {
    if (!partner || !businessId) return;
    const rows = Array.from(picked).map(i => ({
      partner_id: partner.id, business_id: businessId,
      nom: suggestions[i].nom, description: suggestions[i].description || null,
      categorie: suggestions[i].categorie || null,
      prix_min: suggestions[i].prix_min, prix_max: suggestions[i].prix_max,
      unite: suggestions[i].unite, disponible: true,
    }));
    const { error } = await supabase.from('waouh_partner_products' as any).insert(rows);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: `✅ ${rows.length} produit(s) ajouté(s)` });
    setSuggestOpen(false); setSuggestions([]); setPicked(new Set());
    load();
  };

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
    setForm({ ...emptyForm });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('waouh_partner_products' as any).delete().eq('id', id);
    load();
  };

  return (
    <div className="container py-8 space-y-6">
      <Link to="/partner/businesses" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" />Retour aux entreprises</Link>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">{business?.nom_entreprise || '...'}</h1>
          <p className="text-muted-foreground">{products.length} produit(s)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={suggestProducts} disabled={ai.loading === 'suggest_products'}>
            {ai.loading === 'suggest_products' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Suggérer produits IA
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nouveau produit</Button></DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
              <DialogHeader><DialogTitle>Ajouter un produit</DialogTitle></DialogHeader>

              <div className="p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 space-y-2">
                <Label className="flex items-center gap-1"><Wand2 className="h-3 w-3" />Décris en langage naturel</Label>
                <div className="flex gap-2">
                  <Input placeholder='ex: "20 kg de riz à 800F le kilo, stock 50"' value={freeText} onChange={e => setFreeText(e.target.value)} onKeyDown={e => e.key === 'Enter' && parseFreeText()} />
                  <Button size="sm" onClick={parseFreeText} disabled={ai.loading === 'parse_product_free_text'}>
                    {ai.loading === 'parse_product_free_text' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyser'}
                  </Button>
                </div>
              </div>

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
      </div>

      {/* Dialog Suggestions IA */}
      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✨ Produits suggérés par IA</DialogTitle>
            <CardDescription>Cochez ceux à ajouter, les prix peuvent être édités après</CardDescription>
          </DialogHeader>
          {ai.loading === 'suggest_products' && <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>}
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent">
                <Checkbox checked={picked.has(i)} onCheckedChange={c => { const n = new Set(picked); c ? n.add(i) : n.delete(i); setPicked(n); }} />
                <div className="flex-1 text-sm">
                  <div className="font-medium">{s.nom}</div>
                  <div className="text-xs text-muted-foreground">{s.categorie} · {s.prix_min}-{s.prix_max} F / {s.unite}</div>
                  {s.description && <div className="text-xs text-muted-foreground mt-1">{s.description}</div>}
                </div>
              </div>
            ))}
          </div>
          {suggestions.length > 0 && (
            <Button onClick={addPicked} className="w-full">Ajouter {picked.size} produit(s)</Button>
          )}
        </DialogContent>
      </Dialog>

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
        {products.length === 0 && <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">Aucun produit. Utilisez "Suggérer produits IA" pour démarrer rapidement.</CardContent></Card>}
      </div>
    </div>
  );
}
