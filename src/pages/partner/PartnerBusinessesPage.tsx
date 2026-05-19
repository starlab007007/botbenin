import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { SmartCombobox } from '@/components/ui/smart-combobox';
import { PhoneInput } from '@/components/ui/phone-input';
import { LocationAutocomplete } from '@/components/waouh/LocationAutocomplete';
import { BUSINESS_CATEGORIES, MOMO_OPERATORS } from '@/data/beninLocations';
import { formatPhoneDisplay } from '@/lib/phone';
import { businessSchema, flattenZodErrors } from '@/lib/validation/waouh';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { useWaouhAI } from '@/hooks/useWaouhAI';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, MapPin, Loader2, Package, Sparkles, Mic, MicOff, Wand2, Eye, Pencil, Trash2 } from 'lucide-react';

type FormState = {
  nom_entreprise: string; categorie: string; description: string; adresse_complete: string;
  ville: string; quartier: string; telephone: string; whatsapp: string;
  mobile_money_number: string; mobile_money_operator: string;
  lat: number | null; lng: number | null;
  tags: string[]; horaires: string;
};

const emptyForm: FormState = {
  nom_entreprise: '', categorie: '', description: '', adresse_complete: '',
  ville: '', quartier: '', telephone: '', whatsapp: '',
  mobile_money_number: '', mobile_money_operator: 'MTN',
  lat: null, lng: null,
  tags: [], horaires: '',
};

export default function PartnerBusinessesPage() {
  const { partner, loading } = useWaouhPartner();
  const { toast } = useToast();
  const ai = useWaouhAI();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [voice, setVoice] = useState<{ rec: any; listening: boolean; transcript: string }>({ rec: null, listening: false, transcript: '' });

  const load = useCallback(async () => {
    if (!partner) return;
    const { data } = await supabase.from('waouh_partner_businesses' as any).select('*').eq('partner_id', partner.id).order('created_at', { ascending: false });
    setBusinesses((data as any) || []);
  }, [partner]);
  useEffect(() => { load(); }, [load]);

  const detail = businesses.find(b => b.id === detailId) || null;

  const resetForm = () => { setForm({ ...emptyForm }); setErrors({}); setEditingId(null); };
  const startEdit = (b: any) => {
    setEditingId(b.id);
    setForm({
      nom_entreprise: b.nom_entreprise || '', categorie: b.categorie || '',
      description: b.description || '', adresse_complete: b.adresse_complete || '',
      ville: b.ville || '', quartier: b.quartier || '',
      telephone: b.telephone || '', whatsapp: b.whatsapp || '',
      mobile_money_number: b.mobile_money_number || '',
      mobile_money_operator: b.mobile_money_operator || 'MTN',
      lat: b.lat, lng: b.lng,
      tags: b.tags || [], horaires: b?.horaires?.texte || '',
    });
    setErrors({});
    setOpen(true);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return toast({ title: 'GPS indisponible', variant: 'destructive' });
    toast({ title: '📍 Détection en cours...' });
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setForm(f => ({ ...f, lat, lng }));
        const geo = await ai.run<any>('reverse_geocode', { lat, lng });
        if (geo) {
          setForm(f => ({ ...f, lat, lng,
            ville: f.ville || geo.ville || '',
            quartier: f.quartier || geo.quartier || '',
            adresse_complete: f.adresse_complete || geo.adresse_complete || '',
          }));
          toast({ title: '✅ Position trouvée', description: `${geo.ville}${geo.quartier ? ' · ' + geo.quartier : ''}` });
        }
      },
      err => toast({ title: 'Erreur GPS', description: err.message, variant: 'destructive' }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const enrichWithAI = async () => {
    if (!form.nom_entreprise) return toast({ title: 'Saisis le nom d\'abord' });
    const r = await ai.run<any>('enrich_business', { nom: form.nom_entreprise, ville: form.ville });
    if (r) {
      setForm(f => ({ ...f,
        categorie: f.categorie || r.categorie || '',
        description: f.description || r.description || '',
        tags: r.tags || [], horaires: r.horaires_typiques || '',
      }));
      toast({ title: '✨ Informations complétées par IA' });
    }
  };

  const startVoice = () => {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return toast({ title: 'Dictée vocale non supportée', variant: 'destructive' });
    const rec = new SR(); rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = true;
    let transcript = '';
    rec.onresult = (e: any) => { transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(' '); setVoice(v => ({ ...v, transcript })); };
    rec.onend = async () => {
      setVoice(v => ({ ...v, listening: false }));
      if (transcript.trim()) {
        toast({ title: '🎤 Analyse IA…' });
        const r = await ai.run<any>('parse_voice_business', { text: transcript });
        if (r) { setForm(f => ({ ...f, ...Object.fromEntries(Object.entries(r).filter(([_, v]) => v)) })); toast({ title: '✨ Formulaire pré-rempli' }); }
      }
    };
    rec.start();
    setVoice({ rec, listening: true, transcript: '' });
  };
  const stopVoice = () => { voice.rec?.stop(); };

  const save = async () => {
    if (!partner) return;
    const parsed = businessSchema.safeParse(form);
    if (!parsed.success) {
      const errs = flattenZodErrors<FormState>(parsed.error);
      setErrors(errs as any);
      toast({ title: 'Corrigez les champs en rouge', variant: 'destructive' });
      return;
    }
    setErrors({});
    setSaving(true);
    const { tags, horaires, ...rest } = form;
    const payload: any = {
      ...rest,
      ...parsed.data, // valeurs normalisées (téléphones E.164)
      tags: tags?.length ? tags : null,
      horaires: horaires ? { texte: horaires } : null,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('waouh_partner_businesses' as any).update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('waouh_partner_businesses' as any).insert({ ...payload, partner_id: partner.id }));
    }
    setSaving(false);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: editingId ? '✅ Entreprise modifiée' : '✅ Entreprise enregistrée' });
    setOpen(false); resetForm(); load();
  };

  const remove = async (id: string) => {
    const { count } = await supabase.from('waouh_partner_sales' as any).select('id', { count: 'exact', head: true }).eq('business_id', id);
    if (count && count > 0) {
      const { error } = await supabase.from('waouh_partner_businesses' as any).update({ statut: 'pause' }).eq('id', id);
      if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      toast({ title: 'Entreprise désactivée', description: `Conservée car ${count} vente(s) y sont liées.` });
    } else {
      const { error } = await supabase.from('waouh_partner_businesses' as any).delete().eq('id', id);
      if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      toast({ title: '🗑️ Entreprise supprimée' });
    }
    load();
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!partner) return <div className="p-8">Vous n'êtes pas encore partenaire. <Link to="/partner" className="underline">S'inscrire</Link></div>;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">Mes entreprises</h1>
          <p className="text-muted-foreground">{businesses.length} entreprise(s) · enrôlement intelligent IA ✨</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />Enrôler une entreprise</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Modifier' : 'Nouvelle'} entreprise</DialogTitle>
              <CardDescription>Dictée vocale, GPS et IA pour aller 10× plus vite.</CardDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/40 border">
              <Button type="button" size="sm" variant={voice.listening ? 'destructive' : 'default'} onClick={voice.listening ? stopVoice : startVoice}>
                {voice.listening ? <><MicOff className="h-4 w-4 mr-1" />Arrêter</> : <><Mic className="h-4 w-4 mr-1" />Dicter</>}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={detectLocation} disabled={ai.loading === 'reverse_geocode'}>
                {ai.loading === 'reverse_geocode' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MapPin className="h-4 w-4 mr-1" />}
                Détecter ma position
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={enrichWithAI} disabled={ai.loading === 'enrich_business'}>
                {ai.loading === 'enrich_business' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Compléter par IA
              </Button>
            </div>
            {voice.transcript && <div className="text-xs italic text-muted-foreground p-2 bg-muted/30 rounded">🎤 {voice.transcript}</div>}

            <div className="space-y-4">
              <div>
                <Label>Nom de l'entreprise *</Label>
                <Input value={form.nom_entreprise} aria-invalid={!!errors.nom_entreprise || undefined}
                  className={errors.nom_entreprise ? 'border-destructive' : ''}
                  onChange={e => setForm({ ...form, nom_entreprise: e.target.value })} placeholder="Ex: Maquis Chez Sika" />
                {errors.nom_entreprise && <p className="text-xs text-destructive mt-1">{errors.nom_entreprise}</p>}
              </div>
              <div>
                <Label>Catégorie *</Label>
                <SmartCombobox value={form.categorie} onChange={v => setForm({ ...form, categorie: v })}
                  options={BUSINESS_CATEGORIES} placeholder="Type d'activité"
                  invalid={!!errors.categorie} errorMessage={errors.categorie} />
              </div>
              <LocationAutocomplete
                ville={form.ville} quartier={form.quartier}
                onChange={({ ville, quartier }) => setForm({ ...form, ville, quartier })}
                villeInvalid={!!errors.ville} villeError={errors.ville}
              />
              <div><Label>Adresse complète</Label><Input value={form.adresse_complete} onChange={e => setForm({ ...form, adresse_complete: e.target.value })} placeholder="Repère, rue, immeuble..." /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              {form.tags?.length > 0 && <div className="flex flex-wrap gap-1">{form.tags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Téléphone</Label><PhoneInput value={form.telephone} onChange={v => setForm({ ...form, telephone: v })} invalid={!!errors.telephone} errorMessage={errors.telephone} /></div>
                <div><Label>WhatsApp</Label><PhoneInput value={form.whatsapp} onChange={v => setForm({ ...form, whatsapp: v })} invalid={!!errors.whatsapp} errorMessage={errors.whatsapp} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Opérateur Mobile Money</Label>
                  <SmartCombobox value={form.mobile_money_operator} onChange={v => setForm({ ...form, mobile_money_operator: v })}
                    options={MOMO_OPERATORS.map(o => o.value)} allowCustom={false} />
                </div>
                <div><Label>Numéro Mobile Money</Label><PhoneInput value={form.mobile_money_number} onChange={v => setForm({ ...form, mobile_money_number: v })} invalid={!!errors.mobile_money_number} errorMessage={errors.mobile_money_number} /></div>
              </div>
              {form.lat && <div className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" />GPS : {form.lat.toFixed(5)}, {form.lng?.toFixed(5)}</div>}
              <Button disabled={saving} onClick={save} className="w-full">{saving && <Loader2 className="animate-spin h-4 w-4 mr-2" />}{editingId ? 'Mettre à jour' : 'Enregistrer'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businesses.map(b => (
          <Card key={b.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-lg">{b.nom_entreprise}</CardTitle>
                {b.verifie_admin && <Badge variant="default">Vérifié</Badge>}
              </div>
              <CardDescription>{b.categorie} · {b.ville}{b.quartier ? ` · ${b.quartier}` : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm flex-1 flex flex-col">
              {b.description && <p className="text-muted-foreground line-clamp-2">{b.description}</p>}
              {b.telephone && <div>📞 {formatPhoneDisplay(b.telephone)}</div>}
              {b.mobile_money_number && <div>💳 {b.mobile_money_operator} · {formatPhoneDisplay(b.mobile_money_number)}</div>}
              <Badge variant={b.statut === 'active' ? 'default' : 'secondary'} className="w-fit">{b.statut}</Badge>
              <div className="flex gap-1 pt-2 mt-auto flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setDetailId(b.id)}><Eye className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => startEdit(b)}><Pencil className="h-4 w-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer cette entreprise ?</AlertDialogTitle>
                      <AlertDialogDescription>Si des ventes sont liées, elle sera désactivée (pas supprimée). Sinon, supprimée définitivement.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(b.id)}>Confirmer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Link to={`/partner/businesses/${b.id}/products`} className="ml-auto">
                  <Button size="sm" variant="default"><Package className="h-4 w-4 mr-1" />Produits</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {businesses.length === 0 && <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">Aucune entreprise enrôlée pour l'instant.</CardContent></Card>}
      </div>

      {/* Drawer détail */}
      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.nom_entreprise}</SheetTitle>
                <SheetDescription>{detail.categorie} · {detail.ville}{detail.quartier && ` · ${detail.quartier}`}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-3 text-sm">
                {detail.description && <p>{detail.description}</p>}
                {detail.adresse_complete && <div><strong>Adresse :</strong> {detail.adresse_complete}</div>}
                {detail.telephone && <div><strong>Téléphone :</strong> {formatPhoneDisplay(detail.telephone)}</div>}
                {detail.whatsapp && <div><strong>WhatsApp :</strong> {formatPhoneDisplay(detail.whatsapp)}</div>}
                {detail.mobile_money_number && <div><strong>Mobile Money :</strong> {detail.mobile_money_operator} · {formatPhoneDisplay(detail.mobile_money_number)}</div>}
                {detail.lat && <div><strong>GPS :</strong> {Number(detail.lat).toFixed(5)}, {Number(detail.lng).toFixed(5)}</div>}
                <div><strong>Statut :</strong> <Badge variant={detail.statut === 'active' ? 'default' : 'secondary'}>{detail.statut}</Badge> {detail.verifie_admin && <Badge>Vérifié admin</Badge>}</div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={() => { setDetailId(null); startEdit(detail); }}><Pencil className="h-4 w-4 mr-1" />Modifier</Button>
                  <Link to={`/partner/businesses/${detail.id}/products`}><Button variant="outline"><Package className="h-4 w-4 mr-1" />Produits</Button></Link>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
