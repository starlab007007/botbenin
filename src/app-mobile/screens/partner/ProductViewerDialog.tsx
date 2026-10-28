import {ProductGallery} from '@/components/waouh/WaouhProductPresentation';
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil, ImageOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChatImage } from '@/app-mobile/components/ChatImage';
import { ProductPhotoUploader } from '@/components/waouh/ProductPhotoUploader';

import { userFacingErrorText } from "@/lib/userFacingError";
interface Props {
  product: any;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onEditFull?: () => void;
}

export default function ProductViewerDialog({ product, open, onClose, onUpdated, onEditFull }: Props) {
  const { toast } = useToast();
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [editingPhotos, setEditingPhotos] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setPhotos(Array.isArray(product?.photos) ? product.photos : []);
    setEditingPhotos(false);
  }, [product?.id, open]);

  if (!product) return null;

  const gallery = photos.map((url) => ({ url, caption: product.nom as string | undefined }));

  const savePhotos = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('waouh_partner_products' as any)
      .update({ photos })
      .eq('id', product.id);
    setSaving(false);
    if (error) return toast({ title: 'Mise à jour impossible', description: userFacingErrorText(error, "save"), variant: 'destructive' });
    toast({ title: 'Photos mises à jour' });
    setEditingPhotos(false);
    onUpdated?.();
  };

  const priceLabel =
    product.prix_min || product.prix_max
      ? product.prix_min === product.prix_max
        ? `${Number(product.prix_min).toLocaleString()} F`
        : `${Number(product.prix_min || 0).toLocaleString()} - ${Number(product.prix_max || 0).toLocaleString()} F`
      : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-[92vw] max-h-[90dvh] overflow-y-auto p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="pr-6 truncate">{product.nom}</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Photo gallery */}
          <ProductGallery photos={photos} title={product.nom||'Produit'} detail/>

          {/* Photo editor */}
          {editingPhotos ? (
            <div className="rounded-lg border bg-card p-3 space-y-3">
              <ProductPhotoUploader value={photos} onChange={setPhotos} max={4} />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setPhotos(Array.isArray(product.photos) ? product.photos : []); setEditingPhotos(false); }}>
                  Annuler
                </Button>
                <Button size="sm" onClick={savePhotos} disabled={saving}>
                  {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Enregistrer
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setEditingPhotos(true)}>
              <Pencil className="h-3 w-3 mr-1" />Changer les photos
            </Button>
          )}

          {/* Infos */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={product.disponible ? 'default' : 'secondary'}>
                {product.disponible ? 'Disponible' : 'Indisponible'}
              </Badge>
              {product.categorie && <Badge variant="outline">{product.categorie}</Badge>}
              {product.stock_estime != null && product.stock_estime !== '' && (
                <Badge variant="outline">Stock : {product.stock_estime}</Badge>
              )}
            </div>
            {priceLabel && (
              <p className="text-base font-semibold">
                {priceLabel}
                {product.unite && <span className="text-xs text-muted-foreground"> / {product.unite}</span>}
              </p>
            )}
            {product.description && (
              <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
            )}
          </div>

          {onEditFull && (
            <Button variant="secondary" className="w-full" onClick={onEditFull}>
              <Pencil className="h-3 w-3 mr-1" />Modifier toutes les infos
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
