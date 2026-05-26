import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Package, Pencil, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPhoneDisplay } from '@/lib/phone';
import BusinessFormNativeScreen from './BusinessFormNativeScreen';

export default function PartnerBusinessesNativeScreen() {
  const { partner, loading } = useWaouhPartner();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = useCallback(async () => {
    if (!partner) return;
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('waouh_partner_businesses' as any)
        .select('*')
        .eq('partner_id', partner.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data as any) || []);
    } catch (e: any) {
      toast({ title: 'Erreur de chargement', description: e?.message, variant: 'destructive' });
    } finally {
      setLoadingList(false);
    }
  }, [partner, toast]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    const { count } = await supabase.from('waouh_partner_sales' as any).select('id', { count: 'exact', head: true }).eq('business_id', id);
    if (count && count > 0) {
      const { error } = await supabase.from('waouh_partner_businesses' as any).update({ statut: 'pause' }).eq('id', id);
      if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      toast({ title: 'Entreprise désactivée', description: `${count} vente(s) liée(s).` });
    } else {
      const { error } = await supabase.from('waouh_partner_businesses' as any).delete().eq('id', id);
      if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      toast({ title: '🗑️ Entreprise supprimée' });
    }
    load();
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-5 w-5" /></div>;
  }
  if (!partner) {
    return (
      <div className="p-6 text-sm">
        Vous n'êtes pas encore partenaire. <Link to="/app/partner" className="underline">S'inscrire</Link>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 pb-28 space-y-3">
        <div className="text-sm text-muted-foreground">
          {items.length} entreprise(s)
        </div>
        {loadingList && items.length === 0 && (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin h-5 w-5" /></div>
        )}
        {items.length === 0 && !loadingList && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            Aucune entreprise. Touchez « + Enrôler » pour commencer.
          </div>
        )}
        {items.map(b => (
          <div key={b.id} className="rounded-xl border bg-card p-4 space-y-2 shadow-sm">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-base truncate">{b.nom_entreprise}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {b.categorie}
                </p>
              </div>
              <Badge variant={b.statut === 'active' ? 'default' : 'secondary'}>{b.statut}</Badge>
            </div>
            {(b.ville || b.quartier) && (
              <div className="text-xs flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3" /> {b.ville}{b.quartier && ` · ${b.quartier}`}
              </div>
            )}
            {b.telephone && <div className="text-xs">📞 {formatPhoneDisplay(b.telephone)}</div>}
            {b.mobile_money_number && (
              <div className="text-xs">💳 {b.mobile_money_operator} · {formatPhoneDisplay(b.mobile_money_number)}</div>
            )}
            <div className="flex gap-2 pt-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditing(b); setFormOpen(true); }}
                className="h-9"
              >
                <Pencil className="h-4 w-4 mr-1" />Modifier
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-9 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer cette entreprise ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Si des ventes sont liées, elle sera désactivée. Sinon, supprimée définitivement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(b.id)}>Confirmer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Link
                to={b.code_court ? `/app/partner/b/${b.code_court}/produits` : `/app/partner/businesses/${b.id}/products`}
                className="ml-auto"
              >
                <Button size="sm" className="h-9">
                  <Package className="h-4 w-4 mr-1" />Produits
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => { setEditing(null); setFormOpen(true); }}
        className="fixed right-4 z-40 h-14 px-5 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform flex items-center gap-2 font-semibold"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
      >
        <Plus className="h-5 w-5" />
        Enrôler
      </button>

      {formOpen && (
        <BusinessFormNativeScreen
          initial={editing}
          onClose={() => setFormOpen(false)}
          onSaved={load}
        />
      )}
    </>
  );
}
