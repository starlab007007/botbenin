import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, ImageOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import ProductFormNativeScreen from './ProductFormNativeScreen';
import ProductViewerDialog from './ProductViewerDialog';

export default function PartnerProductsNativeScreen() {
  const params = useParams();
  const codeParam = (params as any).code as string | undefined;
  const businessIdParam = (params as any).businessId as string | undefined;
  const { partner } = useWaouhPartner();
  const { toast } = useToast();

  const [business, setBusiness] = useState<any>(null);
  const [businessId, setBusinessId] = useState<string | null>(businessIdParam || null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      let bQuery = supabase.from('waouh_partner_businesses' as any).select('*');
      if (codeParam) bQuery = bQuery.eq('code_court', codeParam.toUpperCase());
      else if (businessIdParam) bQuery = bQuery.eq('id', businessIdParam);
      else { setLoading(false); return; }
      const { data: b, error: bErr } = await bQuery.maybeSingle();
      if (bErr) throw bErr;
      if (!b) { setBusiness(null); setProducts([]); setLoading(false); return; }
      setBusiness(b);
      setBusinessId((b as any).id);
      const { data: p, error: pErr } = await supabase
        .from('waouh_partner_products' as any)
        .select('*')
        .eq('business_id', (b as any).id)
        .order('created_at', { ascending: false });
      if (pErr) throw pErr;
      setProducts((p as any) || []);
    } catch (e: any) {
      toast({ title: 'Erreur de chargement', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [codeParam, businessIdParam]);

  const remove = async (id: string) => {
    const { error } = await supabase.from('waouh_partner_products' as any).delete().eq('id', id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: 'Produit supprimé' });
    load();
  };

  return (
    <>
      <div className="p-4 pb-28 space-y-3">
        <Link to="/app/partner/businesses" className="inline-flex items-center text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3 mr-1" />Retour aux entreprises
        </Link>
        <div>
          <h2 className="text-lg font-semibold truncate">{business?.nom_entreprise || '...'}</h2>
          <p className="text-xs text-muted-foreground">{products.length} produit(s)</p>
        </div>

        {loading && products.length === 0 && (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin h-5 w-5" /></div>
        )}
        {!loading && products.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            Aucun produit. Touchez « + Ajouter ».
          </div>
        )}

        {products.map(p => {
          const photos: string[] = Array.isArray(p.photos) ? p.photos : [];
          return (
            <div key={p.id} className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="flex gap-3 p-3">
                <button
                  type="button"
                  onClick={() => setViewing(p)}
                  className="w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0 relative active:scale-95 transition-transform"
                  aria-label="Voir le produit"
                >
                  {photos[0] ? (
                    <img src={photos[0]} alt={p.nom} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageOff className="h-6 w-6" />
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-medium truncate">{p.nom}</h3>
                    <Badge variant={p.disponible ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                      {p.disponible ? 'Dispo' : 'Indispo'}
                    </Badge>
                  </div>
                  {p.categorie && <p className="text-xs text-muted-foreground">{p.categorie}</p>}
                  {(p.prix_min || p.prix_max) && (
                    <p className="text-sm font-semibold mt-1">
                      {p.prix_min === p.prix_max
                        ? `${Number(p.prix_min).toLocaleString()} F`
                        : `${Number(p.prix_min || 0).toLocaleString()} - ${Number(p.prix_max || 0).toLocaleString()} F`}
                      {p.unite && <span className="text-xs text-muted-foreground"> / {p.unite}</span>}
                    </p>
                  )}
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="secondary" className="h-8" onClick={() => setViewing(p)}>
                      <Eye className="h-3 w-3 mr-1" />Voir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => { setEditing(p); setFormOpen(true); }}
                    >
                      <Pencil className="h-3 w-3 mr-1" />Modifier
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
                          <AlertDialogDescription>« {p.nom} » sera supprimé.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(p.id)} className="bg-destructive text-destructive-foreground">
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => { setEditing(null); setFormOpen(true); }}
        disabled={!businessId}
        aria-label="Ajouter un produit"
        title="Ajouter un produit"
        className="fixed left-1/2 -translate-x-1/2 z-40 p-2 active:scale-90 transition-transform flex items-center justify-center bg-transparent disabled:opacity-40"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
      >
        <Plus className="h-12 w-12 text-[#2563eb]" strokeWidth={3} />
      </button>

      {formOpen && businessId && (
        <ProductFormNativeScreen
          businessId={businessId}
          initial={editing}
          onClose={() => setFormOpen(false)}
          onSaved={load}
        />
      )}

      <ProductViewerDialog
        product={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
        onUpdated={load}
        onEditFull={() => { setEditing(viewing); setViewing(null); setFormOpen(true); }}
      />
    </>
  );
}
