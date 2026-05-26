import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import NativeFormScreen from '@/app-mobile/components/native/NativeFormScreen';
import NativeCategoryPicker from '@/app-mobile/components/native/NativeCategoryPicker';
import NativeSelectSheet from '@/app-mobile/components/native/NativeSelectSheet';
import { ProductPhotoUploader } from '@/components/waouh/ProductPhotoUploader';
import { PRODUCT_UNITS } from '@/data/beninLocations';
import { useCustomCategories } from '@/hooks/useCustomCategories';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PRODUCT_CATEGORIES = [
  'Alimentation', 'Boissons', 'Électronique', 'Mode & Vêtements', 'Maison & Décoration',
  'Beauté & Cosmétiques', 'Bureautique & Papeterie', 'Auto & Moto', 'Téléphonie & Accessoires',
  'Bébé & Enfants', 'Sport & Loisirs', 'Bricolage & Jardin', 'Services',
];

export type ProductFormState = {
  nom: string;
  description: string;
  categorie: string;
  prix: string | number;
  unite: string;
  disponible: boolean;
  stock_estime: string | number;
  photos: string[];
};

const empty: ProductFormState = {
  nom: '', description: '', categorie: '', prix: '',
  unite: '', disponible: true, stock_estime: '', photos: [],
};

interface Props {
  businessId: string;
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductFormNativeScreen({ businessId, initial, onClose, onSaved }: Props) {
  const { partner } = useWaouhPartner();
  const { toast } = useToast();
  const { all: categories, add: addCategory } = useCustomCategories('product', PRODUCT_CATEGORIES);

  const [form, setForm] = useState<ProductFormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        nom: initial.nom || '',
        description: initial.description || '',
        categorie: initial.categorie || '',
        prix: initial.prix_min ?? initial.prix_max ?? '',
        unite: initial.unite || '',
        disponible: initial.disponible ?? true,
        stock_estime: initial.stock_estime ?? '',
        photos: Array.isArray(initial.photos) ? initial.photos : [],
      });
    } else {
      setForm(empty);
    }
  }, [initial]);

  const save = async () => {
    if (!partner || !businessId) return;
    if (!form.nom.trim()) return toast({ title: 'Nom requis', variant: 'destructive' });
    setSaving(true);
    const payload: any = {
      nom: form.nom,
      description: form.description || null,
      categorie: form.categorie || null,
      prix_min: form.prix !== '' ? Number(form.prix) : null,
      prix_max: form.prix !== '' ? Number(form.prix) : null,
      unite: form.unite || null,
      disponible: form.disponible,
      stock_estime: form.stock_estime !== '' ? parseInt(String(form.stock_estime)) : null,
      photos: form.photos,
    };
    const { error } = initial
      ? await supabase.from('waouh_partner_products' as any).update(payload).eq('id', initial.id)
      : await supabase.from('waouh_partner_products' as any).insert({ ...payload, partner_id: partner.id, business_id: businessId });
    setSaving(false);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: initial ? '✅ Produit modifié' : '✅ Produit ajouté' });
    onSaved();
    onClose();
  };

  return (
    <NativeFormScreen
      title={initial ? 'Modifier le produit' : 'Ajouter un produit'}
      onBack={onClose}
      saving={saving}
      canSubmit={!!form.nom.trim()}
      onSubmit={save}
      submitLabel={initial ? 'Mettre à jour' : 'Enregistrer'}
    >
      <div>
        <label className="text-sm font-medium block mb-1.5">
          Photos du produit <span className="text-xs text-muted-foreground">(3 max)</span>
        </label>
        <ProductPhotoUploader
          value={form.photos}
          onChange={photos => setForm({ ...form, photos })}
          max={3}
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1.5">Nom *</label>
        <Input
          value={form.nom}
          onChange={e => setForm({ ...form, nom: e.target.value })}
          className="h-12 text-base"
        />
      </div>

      <NativeCategoryPicker
        label="Catégorie"
        value={form.categorie}
        onChange={v => { setForm({ ...form, categorie: v }); if (v) addCategory(v); }}
        options={categories}
        placeholder="Choisir ou créer..."
        allowCustom
        onCreate={addCategory}
      />

      <NativeSelectSheet
        label="Unité"
        value={form.unite}
        onChange={v => setForm({ ...form, unite: v })}
        options={PRODUCT_UNITS}
        placeholder="kg, pièce..."
      />

      <div>
        <label className="text-sm font-medium block mb-1.5">Prix (FCFA)</label>
        <Input
          type="number"
          inputMode="decimal"
          value={form.prix}
          onChange={e => setForm({ ...form, prix: e.target.value })}
          className="h-12 text-base"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div>
          <label className="text-sm font-medium block mb-1.5">Stock estimé</label>
          <Input
            type="number"
            inputMode="numeric"
            value={form.stock_estime}
            onChange={e => setForm({ ...form, stock_estime: e.target.value })}
            className="h-12 text-base"
          />
        </div>
        <div className="flex items-center gap-3 h-12 px-3 rounded-lg border bg-background">
          <Switch
            checked={form.disponible}
            onCheckedChange={v => setForm({ ...form, disponible: v })}
          />
          <label className="text-sm font-medium">Disponible</label>
        </div>
      </div>
    </NativeFormScreen>
  );
}
