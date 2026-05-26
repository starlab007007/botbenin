import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import NativeFormScreen from '@/app-mobile/components/native/NativeFormScreen';
import NativeCategoryPicker from '@/app-mobile/components/native/NativeCategoryPicker';
import NativeSelectSheet from '@/app-mobile/components/native/NativeSelectSheet';
import NativeVilleQuartierPicker from '@/app-mobile/components/native/NativeVilleQuartierPicker';
import NativePhoneInput from '@/app-mobile/components/native/NativePhoneInput';
import { BUSINESS_CATEGORIES, MOMO_OPERATORS } from '@/data/beninLocations';
import { businessSchema, flattenZodErrors } from '@/lib/validation/waouh';
import { useCustomCategories } from '@/hooks/useCustomCategories';
import { useWaouhAI } from '@/hooks/useWaouhAI';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type BusinessFormState = {
  nom_entreprise: string;
  categorie: string;
  description: string;
  adresse_complete: string;
  ville: string;
  quartier: string;
  telephone: string;
  whatsapp: string;
  mobile_money_number: string;
  mobile_money_operator: string;
  lat: number | null;
  lng: number | null;
};

const empty: BusinessFormState = {
  nom_entreprise: '', categorie: '', description: '', adresse_complete: '',
  ville: '', quartier: '', telephone: '', whatsapp: '',
  mobile_money_number: '', mobile_money_operator: 'MTN', lat: null, lng: null,
};

interface Props {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function BusinessFormNativeScreen({ initial, onClose, onSaved }: Props) {
  const { partner } = useWaouhPartner();
  const { toast } = useToast();
  const ai = useWaouhAI();
  const { all: categories, add: addCategory } = useCustomCategories('business', BUSINESS_CATEGORIES);

  const [form, setForm] = useState<BusinessFormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        nom_entreprise: initial.nom_entreprise || '',
        categorie: initial.categorie || '',
        description: initial.description || '',
        adresse_complete: initial.adresse_complete || '',
        ville: initial.ville || '',
        quartier: initial.quartier || '',
        telephone: initial.telephone || '',
        whatsapp: initial.whatsapp || '',
        mobile_money_number: initial.mobile_money_number || '',
        mobile_money_operator: initial.mobile_money_operator || 'MTN',
        lat: initial.lat ?? null,
        lng: initial.lng ?? null,
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [initial]);

  const detectLocation = () => {
    if (!navigator.geolocation) return toast({ title: 'GPS indisponible', variant: 'destructive' });
    toast({ title: '📍 Détection en cours...' });
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setForm(f => ({ ...f, lat, lng }));
        const geo = await ai.run<any>('reverse_geocode', { lat, lng });
        if (geo) {
          setForm(f => ({
            ...f, lat, lng,
            ville: f.ville || geo.ville || '',
            quartier: f.quartier || geo.quartier || '',
            adresse_complete: f.adresse_complete || geo.adresse_complete || '',
          }));
          toast({ title: '✅ Position trouvée', description: `${geo.ville || ''}${geo.quartier ? ' · ' + geo.quartier : ''}` });
        }
      },
      err => toast({ title: 'Erreur GPS', description: err.message, variant: 'destructive' }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async () => {
    if (!partner) return;
    const parsed = businessSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(flattenZodErrors<BusinessFormState>(parsed.error) as any);
      toast({ title: 'Corrigez les champs en rouge', variant: 'destructive' });
      return;
    }
    setErrors({});
    setSaving(true);
    const payload: any = { ...form, ...parsed.data };
    const { error } = initial
      ? await supabase.from('waouh_partner_businesses' as any).update(payload).eq('id', initial.id)
      : await supabase.from('waouh_partner_businesses' as any).insert({ ...payload, partner_id: partner.id });
    setSaving(false);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: initial ? '✅ Entreprise modifiée' : '✅ Entreprise enregistrée' });
    onSaved();
    onClose();
  };

  return (
    <NativeFormScreen
      title={initial ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
      subtitle="GPS et IA pour aller plus vite"
      onBack={onClose}
      saving={saving}
      onSubmit={save}
      submitLabel={initial ? 'Mettre à jour' : 'Enregistrer'}
    >
      <Button
        type="button"
        variant="outline"
        onClick={detectLocation}
        disabled={ai.loading === 'reverse_geocode'}
        className="w-full h-12 justify-center"
      >
        {ai.loading === 'reverse_geocode'
          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          : <MapPin className="h-4 w-4 mr-2" />}
        Détecter ma position
      </Button>

      <div>
        <label className="text-sm font-medium block mb-1.5">Nom de l'entreprise *</label>
        <Input
          value={form.nom_entreprise}
          onChange={e => setForm({ ...form, nom_entreprise: e.target.value })}
          placeholder="Ex: Maquis Chez Sika"
          className={`h-12 text-base ${errors.nom_entreprise ? 'border-destructive' : ''}`}
        />
        {errors.nom_entreprise && (
          <p className="text-xs text-destructive mt-1">{errors.nom_entreprise}</p>
        )}
      </div>

      <NativeCategoryPicker
        label="Catégorie *"
        value={form.categorie}
        onChange={v => { setForm({ ...form, categorie: v }); if (v) addCategory(v); }}
        options={categories}
        placeholder="Type d'activité"
        allowCustom
        onCreate={addCategory}
        invalid={!!errors.categorie}
        errorMessage={errors.categorie}
      />

      <NativeVilleQuartierPicker
        ville={form.ville}
        quartier={form.quartier}
        onChange={({ ville, quartier }) => setForm({ ...form, ville, quartier })}
        villeInvalid={!!errors.ville}
        villeError={errors.ville}
      />

      <NativePhoneInput
        label="Téléphone"
        value={form.telephone}
        onChange={v => setForm({ ...form, telephone: v })}
        invalid={!!errors.telephone}
        errorMessage={errors.telephone}
      />
      <NativePhoneInput
        label="WhatsApp"
        value={form.whatsapp}
        onChange={v => setForm({ ...form, whatsapp: v })}
        invalid={!!errors.whatsapp}
        errorMessage={errors.whatsapp}
      />

      <NativeSelectSheet
        label="Opérateur Mobile Money"
        value={form.mobile_money_operator}
        onChange={v => setForm({ ...form, mobile_money_operator: v })}
        options={MOMO_OPERATORS.map(o => o.value)}
        placeholder="MTN"
      />
      <NativePhoneInput
        label="Numéro Mobile Money"
        value={form.mobile_money_number}
        onChange={v => setForm({ ...form, mobile_money_number: v })}
        invalid={!!errors.mobile_money_number}
        errorMessage={errors.mobile_money_number}
      />

      {form.lat && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          GPS : {form.lat.toFixed(5)}, {form.lng?.toFixed(5)}
        </div>
      )}
    </NativeFormScreen>
  );
}
