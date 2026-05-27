import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import NativeFormScreen from '@/app-mobile/components/native/NativeFormScreen';
import NativeCategoryPicker from '@/app-mobile/components/native/NativeCategoryPicker';
import NativeVilleQuartierPicker from '@/app-mobile/components/native/NativeVilleQuartierPicker';
import NativePhoneInput from '@/app-mobile/components/native/NativePhoneInput';
import { BUSINESS_CATEGORIES } from '@/data/beninLocations';
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
  whatsapp: string;
  lat: number | null;
  lng: number | null;
};

const empty: BusinessFormState = {
  nom_entreprise: '', categorie: '', description: '', adresse_complete: '',
  ville: '', quartier: '', whatsapp: '', lat: null, lng: null,
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
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        nom_entreprise: initial.nom_entreprise || '',
        categorie: initial.categorie || '',
        description: initial.description || '',
        adresse_complete: initial.adresse_complete || '',
        ville: initial.ville || '',
        quartier: initial.quartier || '',
        whatsapp: initial.whatsapp || '',
        lat: initial.lat ?? null,
        lng: initial.lng ?? null,
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [initial]);

  const applyPosition = async (lat: number, lng: number) => {
    setForm(f => ({ ...f, lat, lng }));
    try {
      const geo = await ai.run<any>('reverse_geocode', { lat, lng });
      if (geo) {
        setForm(f => ({
          ...f, lat, lng,
          ville: f.ville || geo.ville || '',
          quartier: f.quartier || geo.quartier || '',
          adresse_complete: f.adresse_complete || geo.adresse_complete || '',
        }));
        toast({
          title: '✅ Position trouvée',
          description: `${geo.ville || ''}${geo.quartier ? ' · ' + geo.quartier : ''}`,
        });
      } else {
        toast({ title: '✅ Position GPS enregistrée' });
      }
    } catch (e: any) {
      toast({ title: '✅ Position GPS enregistrée', description: e?.message });
    }
  };

  const detectLocation = async () => {
    if (gpsLoading) return;
    setGpsLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.checkPermissions();
        let granted = perm.location === 'granted' || perm.coarseLocation === 'granted';
        if (!granted) {
          const req = await Geolocation.requestPermissions({ permissions: ['location'] });
          granted = req.location === 'granted' || req.coarseLocation === 'granted';
        }
        if (!granted) {
          toast({ title: 'Permission refusée', description: 'Autorisez la localisation dans les paramètres.', variant: 'destructive' });
          return;
        }
        toast({ title: '📍 Détection en cours...' });
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
        await applyPosition(pos.coords.latitude, pos.coords.longitude);
      } else {
        if (!navigator.geolocation) {
          toast({ title: 'GPS indisponible', variant: 'destructive' });
          return;
        }
        toast({ title: '📍 Détection en cours...' });
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              await applyPosition(pos.coords.latitude, pos.coords.longitude);
              resolve();
            },
            (err) => {
              toast({ title: 'Erreur GPS', description: err.message, variant: 'destructive' });
              resolve();
            },
            { enableHighAccuracy: true, timeout: 15000 },
          );
        });
      }
    } catch (e: any) {
      toast({ title: 'Erreur GPS', description: e?.message || 'Impossible de récupérer la position', variant: 'destructive' });
    } finally {
      setGpsLoading(false);
    }
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

  const gpsBusy = gpsLoading || ai.loading === 'reverse_geocode';

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
        disabled={gpsBusy}
        className="w-full h-12 justify-center"
      >
        {gpsBusy
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
        label="WhatsApp"
        value={form.whatsapp}
        onChange={v => setForm({ ...form, whatsapp: v })}
        invalid={!!errors.whatsapp}
        errorMessage={errors.whatsapp}
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
