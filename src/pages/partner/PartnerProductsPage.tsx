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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { useWaouhAI } from '@/hooks/useWaouhAI';
import { SmartCombobox } from '@/components/ui/smart-combobox';
import { ProductPhotoUploader } from '@/components/waouh/ProductPhotoUploader';
import { BUSINESS_CATEGORIES, PRODUCT_UNITS } from '@/data/beninLocations';
import { Plus, Loader2, ArrowLeft, Trash2, Sparkles, Wand2, Pencil, ImageOff } from 'lucide-react';

const PRODUCT_CATEGORIES = [
  'Alimentation', 'Boissons', 'Électronique', 'Mode & Vêtements', 'Maison & Décoration',
  'Beauté & Cosmétiques', 'Bureautique & Papeterie', 'Auto & Moto', 'Téléphonie & Accessoires',
  'Bébé & Enfants', 'Sport & Loisirs', 'Bricolage & Jardin', 'Services', 'Autre',
];

type ProductForm = {
  nom: string; description: string; categorie: string;
  prix: string | number; unite: string;
  disponible: boolean; stock_estime: string | number; photos: string[];
};

const emptyForm: ProductForm = {
  nom: '', description: '', categorie: '', prix: '',
  unite: '', disponible: true, stock_estime: '', photos: [],
};

export default function PartnerProductsPage() {
  const params = useParams();
  const codeParam = (params as any).code as string | undefined;
  const businessIdParam = (params as any).businessId as string | undefined;
  const { partner } = useWaouhPartner();
  const { toast } = useToast();
  const ai = useWaouhAI();
  const [business, setBusiness] = useState<any>(null);
  const [businessId, setBusinessId] = useState<string | null>(businessIdParam || null);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductForm>({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const load = async () => {
    let bQuery = supabase.from('waouh_partner_businesses' as any).select('*');
    if (codeParam) bQuery = bQuery.eq('code_court', codeParam.toUpperCase());
    else if (businessIdParam) bQuery = bQuery.eq('id', businessIdParam);
    else return;
    const { data: b } = await bQuery.maybeSingle();
    if (!b) { setBusiness(null); setProducts([]); return; }
    setBusiness(b);
    setBusinessId((b as any).id);
    const { data: p } = await supabase.from('waouh_partner_products' as any).select('*').eq('business_id', (b as any).id).order('created_at', { ascending: false });
    setProducts((p as any) || []);
  };
  useEffect(() => { load(); }, [codeParam, businessIdParam]);

  const openNew = () => { setEditId(null); setForm({ ...emptyForm }); setOpen(true); };
  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      nom: p.nom || '', description: p.description || '', categorie: p.categorie || '',
      prix: p.prix_min ?? p.prix_max ?? '', unite: p.unite || '',
      disponible: p.disponible ?? true, stock_estime: p.stock_estime ?? '',
      photos: Array.isArray(p.photos) ? p.photos : [],
    });
    setOpen(true);
  };

  const parseFreeText = async () => {
    if (!freeText.trim()) return;
    const r = await ai.run<any>('parse_product_free_text', { text: freeText });
    if (r) {
      setForm(prev => ({
        ...prev,
        nom: r.nom || prev.nom, description: r.description || prev.description,
        categorie: r.categorie || prev.categorie,
        prix_min: r.prix_min ?? prev.prix_min, prix_max: r.prix_max ?? prev.prix_max,
        unite: r.unite || prev.unite, stock_estime: r.stock_estime ?? prev.stock_estime,
      }));
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
    if (!form.nom.trim()) return toast({ title: 'Nom requis', variant: 'destructive' });
    setSaving(true);
    const payload: any = {
      nom: form.nom, description: form.description || null, categorie: form.categorie || null,
      prix_min: form.prix_min !== '' ? Number(form.prix_min) : null,
      prix_max: form.prix_max !== '' ? Number(form.prix_max) : null,
      unite: form.unite || null, disponible: form.disponible,
      stock_estime: form.stock_estime !== '' ? parseInt(String(form.stock_estime)) : null,
      photos: form.photos,
    };
    const { error } = editId
      ? await supabase.from('waouh_partner_products' as any).update(payload).eq('id', editId)
      : await supabase.from('waouh_partner_products' as any).insert({ ...payload, partner_id: partner.id, business_id: businessId });
    setSaving(false);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: editId ? 'Produit mis à jour' : 'Produit ajouté' });
    setOpen(false); setEditId(null); setForm({ ...emptyForm });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('waouh_partner_products' as any).delete().eq('id', id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: 'Produit supprimé' });
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
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nouveau produit</Button>
        </div>
      </div>

      {/* Dialog création / édition */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm({ ...emptyForm }); } }}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Modifier le produit' : 'Ajouter un produit'}</DialogTitle></DialogHeader>

          {!editId && (
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 space-y-2">
              <Label className="flex items-center gap-1"><Wand2 className="h-3 w-3" />Décris en langage naturel</Label>
              <div className="flex gap-2">
                <Input placeholder='ex: "20 kg de riz à 800F le kilo, stock 50"' value={freeText} onChange={e => setFreeText(e.target.value)} onKeyDown={e => e.key === 'Enter' && parseFreeText()} />
                <Button size="sm" onClick={parseFreeText} disabled={ai.loading === 'parse_product_free_text'}>
                  {ai.loading === 'parse_product_free_text' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyser'}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Photos du produit <span className="text-xs text-muted-foreground">(3 max)</span></Label>
              <ProductPhotoUploader value={form.photos} onChange={photos => setForm({ ...form, photos })} max={3} />
            </div>
            <div><Label>Nom *</Label><Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Catégorie</Label>
                <SmartCombobox value={form.categorie} onChange={v => setForm({ ...form, categorie: v })} options={PRODUCT_CATEGORIES} placeholder="Choisir une catégorie" />
              </div>
              <div>
                <Label>Unité</Label>
                <SmartCombobox value={form.unite} onChange={v => setForm({ ...form, unite: v })} options={PRODUCT_UNITS} placeholder="kg, pièce..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Prix min (FCFA)</Label><Input type="number" value={form.prix_min} onChange={e => setForm({ ...form, prix_min: e.target.value })} /></div>
              <div><Label>Prix max (FCFA)</Label><Input type="number" value={form.prix_max} onChange={e => setForm({ ...form, prix_max: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Stock estimé</Label><Input type="number" value={form.stock_estime} onChange={e => setForm({ ...form, stock_estime: e.target.value })} /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={form.disponible} onCheckedChange={v => setForm({ ...form, disponible: v })} /><Label>Disponible</Label></div>
            </div>
            <Button disabled={saving || !form.nom} onClick={save} className="w-full">
              {saving && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              {editId ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
        {products.map(p => {
          const photos: string[] = Array.isArray(p.photos) ? p.photos : [];
          return (
            <Card key={p.id} className="overflow-hidden flex flex-col">
              <div className="aspect-video bg-muted relative">
                {photos[0] ? (
                  <img src={photos[0]} alt={p.nom} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageOff className="h-8 w-8" />
                  </div>
                )}
                {photos.length > 1 && (
                  <Badge className="absolute bottom-2 right-2 bg-black/60 text-white border-0">+{photos.length - 1}</Badge>
                )}
                <Badge className="absolute top-2 right-2" variant={p.disponible ? 'default' : 'secondary'}>
                  {p.disponible ? 'Dispo' : 'Indispo'}
                </Badge>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg truncate">{p.nom}</CardTitle>
                {p.categorie && <CardDescription className="text-xs">{p.categorie}</CardDescription>}
              </CardHeader>
              <CardContent className="text-sm space-y-2 flex-1 flex flex-col">
                {p.description && <p className="text-muted-foreground line-clamp-2">{p.description}</p>}
                {(p.prix_min || p.prix_max) && (
                  <div className="font-semibold">
                    {p.prix_min === p.prix_max ? `${Number(p.prix_min).toLocaleString()} F` : `${Number(p.prix_min || 0).toLocaleString()} - ${Number(p.prix_max || 0).toLocaleString()} F`}
                    {p.unite && <span className="text-xs text-muted-foreground"> / {p.unite}</span>}
                  </div>
                )}
                <div className="flex gap-2 mt-auto pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4 mr-1" />Modifier
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
                        <AlertDialogDescription>« {p.nom} » sera définitivement supprimé.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(p.id)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {products.length === 0 && <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">Aucun produit. Utilisez "Suggérer produits IA" pour démarrer rapidement.</CardContent></Card>}
      </div>
    </div>
  );
}
