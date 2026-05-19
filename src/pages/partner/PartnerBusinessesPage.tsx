import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SmartCombobox } from '@/components/ui/smart-combobox';
import { PhoneInput } from '@/components/ui/phone-input';
import { LocationAutocomplete } from '@/components/waouh/LocationAutocomplete';
import { BUSINESS_CATEGORIES, MOMO_OPERATORS } from '@/data/beninLocations';
import { formatPhoneDisplay } from '@/lib/phone';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { useWaouhAI } from '@/hooks/useWaouhAI';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, MapPin, Loader2, Package, Sparkles, Mic, MicOff, Wand2 } from 'lucide-react';

const emptyForm = {
  nom_entreprise: '', categorie: '', description: '', adresse_complete: '',
  ville: '', quartier: '', telephone: '', whatsapp: '',
  mobile_money_number: '', mobile_money_operator: 'MTN',
  lat: null as number | null, lng: null as number | null,
  tags: [] as string[], horaires: '',
};

export default function PartnerBusinessesPage() {
  const { partner, loading } = useWaouhPartner();
  const { toast } = useToast();
  const ai = useWaouhAI();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [voice, setVoice] = useState<{ rec: any; listening: boolean; transcript: string }>({ rec: null, listening: false, transcript: '' });

  const load = async () => {
    if (!partner) return;
    const { data } = await supabase.from('waouh_partner_businesses' as any).select('*').eq('partner_id', partner.id).order('created_at', { ascending: false });
    setBusinesses((data as any) || []);
  };
  useEffect(() => { load(); }, [partner]);

  // === GPS intelligent: capture + reverse geocode auto ===
  const detectLocation = () => {
    if (!navigator.geolocation) return toast({ title: 'GPS indisponible', variant: 'destructive' });
    toast({ title: '📍 Détection en cours...' });
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setForm(f => ({ ...f, lat, lng }));
        const geo = await ai.run<any>('reverse_geocode', { lat, lng });
        if (geo) {
          setForm(f => ({
            ...f, lat, lng,
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

  const geocodeFromAddress = async () => {
    if (!form.adresse_complete && !form.ville) return toast({ title: 'Saisis une adresse ou une ville d\'abord' });
    const q = [form.adresse_complete, form.quartier, form.ville].filter(Boolean).join(', ');
    const r = await ai.run<any>('geocode_address', { q });
    if (r?.lat) {
      setForm(f => ({ ...f, lat: r.lat, lng: r.lng }));
      toast({ title: '📍 Coordonnées calculées', description: `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}` });
    } else {
      toast({ title: 'Adresse introuvable', variant: 'destructive' });
    }
  };

  // === IA: enrichissement ===
  const enrichWithAI = async () => {
    if (!form.nom_entreprise) return toast({ title: 'Saisis le nom d\'abord' });
    const r = await ai.run<any>('enrich_business', { nom: form.nom_entreprise, ville: form.ville });
    if (r) {
      setForm(f => ({
        ...f,
        categorie: f.categorie || r.categorie || '',
        description: f.description || r.description || '',
        tags: r.tags || [],
        horaires: r.horaires_typiques || '',
      }));
      toast({ title: '✨ Informations complétées par IA' });
    }
  };

  // === Voice dictation ===
  const startVoice = () => {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return toast({ title: 'Dictée vocale non supportée par ce navigateur', variant: 'destructive' });
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;
    let transcript = '';
    rec.onresult = (e: any) => {
      transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setVoice(v => ({ ...v, transcript }));
    };
    rec.onend = async () => {
      setVoice(v => ({ ...v, listening: false }));
      if (transcript.trim()) {
        toast({ title: '🎤 Analyse IA en cours...' });
        const r = await ai.run<any>('parse_voice_business', { text: transcript });
        if (r) {
          setForm(f => ({ ...f, ...Object.fromEntries(Object.entries(r).filter(([_, v]) => v)) }));
          toast({ title: '✨ Formulaire pré-rempli' });
        }
      }
    };
    rec.start();
    setVoice({ rec, listening: true, transcript: '' });
  };
  const stopVoice = () => { voice.rec?.stop(); };

  const save = async () => {
    if (!partner) return;
    setSaving(true);
    const { tags, horaires, ...insertable } = form;
    const { error } = await supabase.from('waouh_partner_businesses' as any).insert({
      ...insertable, partner_id: partner.id,
      tags: tags?.length ? tags : null,
      horaires: horaires ? { texte: horaires } : null,
    });
    setSaving(false);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: '✅ Entreprise enregistrée' });
    setOpen(false);
    setForm({ ...emptyForm });
    load();
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!partner) return <div className="p-8">Vous n'êtes pas encore partenaire. <Link to="/partner" className="underline">S'inscrire</Link></div>;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes entreprises</h1>
          <p className="text-muted-foreground">{businesses.length} entreprise(s) · enrôlement intelligent IA ✨</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Enrôler une entreprise</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle entreprise</DialogTitle>
              <CardDescription>Utilise la dictée vocale, la détection GPS et l'IA pour aller 10× plus vite.</CardDescription>
            </DialogHeader>

            {/* Barre actions IA */}
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <Button type="button" size="sm" variant={voice.listening ? 'destructive' : 'default'} onClick={voice.listening ? stopVoice : startVoice}>
                {voice.listening ? <><MicOff className="h-4 w-4 mr-1" />Arrêter</> : <><Mic className="h-4 w-4 mr-1" />Dicter</>}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={detectLocation} disabled={ai.loading === 'reverse_geocode'}>
                {ai.loading === 'reverse_geocode' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MapPin className="h-4 w-4 mr-1" />}
                Détecter ma position
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={geocodeFromAddress} disabled={ai.loading === 'geocode_address'}>
                {ai.loading === 'geocode_address' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
                Géocoder l'adresse
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={enrichWithAI} disabled={ai.loading === 'enrich_business'}>
                {ai.loading === 'enrich_business' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Compléter par IA
              </Button>
            </div>
            {voice.transcript && (
              <div className="text-xs italic text-muted-foreground p-2 bg-muted/30 rounded">🎤 {voice.transcript}</div>
            )}

            <div className="space-y-4">
              <div><Label>Nom de l'entreprise *</Label><Input value={form.nom_entreprise} onChange={e => setForm({ ...form, nom_entreprise: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Catégorie</Label><Input value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} placeholder="Auto-suggéré par IA" /></div>
                <div><Label>Ville</Label><Input value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Quartier</Label><Input value={form.quartier} onChange={e => setForm({ ...form, quartier: e.target.value })} /></div>
                <div><Label>Adresse complète</Label><Input value={form.adresse_complete} onChange={e => setForm({ ...form, adresse_complete: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              {form.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.tags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Téléphone</Label><Input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} /></div>
                <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Opérateur MM</Label><Input value={form.mobile_money_operator} onChange={e => setForm({ ...form, mobile_money_operator: e.target.value })} /></div>
                <div><Label>Numéro Mobile Money</Label><Input value={form.mobile_money_number} onChange={e => setForm({ ...form, mobile_money_number: e.target.value })} /></div>
              </div>
              {form.lat && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />GPS : {form.lat.toFixed(5)}, {form.lng?.toFixed(5)}
                </div>
              )}
              <Button disabled={saving || !form.nom_entreprise} onClick={save} className="w-full">
                {saving && <Loader2 className="animate-spin h-4 w-4 mr-2" />}Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businesses.map(b => (
          <Card key={b.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{b.nom_entreprise}</CardTitle>
                {b.verifie_admin && <Badge variant="default">Vérifié</Badge>}
              </div>
              <CardDescription>{b.categorie} · {b.ville}{b.quartier ? ` · ${b.quartier}` : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {b.description && <p className="text-muted-foreground line-clamp-2">{b.description}</p>}
              {b.telephone && <div>📞 {b.telephone}</div>}
              {b.mobile_money_number && <div>💳 {b.mobile_money_operator} {b.mobile_money_number}</div>}
              {b.lat && <div className="text-xs text-muted-foreground">📍 {Number(b.lat).toFixed(4)}, {Number(b.lng).toFixed(4)}</div>}
              <Link to={`/partner/businesses/${b.id}/products`}>
                <Button variant="outline" size="sm" className="w-full mt-2"><Package className="h-4 w-4 mr-2" />Gérer les produits</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {businesses.length === 0 && <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">Aucune entreprise enrôlée pour l'instant.</CardContent></Card>}
      </div>
    </div>
  );
}
