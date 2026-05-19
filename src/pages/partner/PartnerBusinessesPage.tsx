import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, MapPin, Loader2, Package } from 'lucide-react';

export default function PartnerBusinessesPage() {
  const { partner, loading } = useWaouhPartner();
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    nom_entreprise: '', categorie: '', description: '', adresse_complete: '',
    ville: '', quartier: '', telephone: '', whatsapp: '',
    mobile_money_number: '', mobile_money_operator: 'MTN', lat: null, lng: null,
  });

  const load = async () => {
    if (!partner) return;
    const { data } = await supabase.from('waouh_partner_businesses' as any).select('*').eq('partner_id', partner.id).order('created_at', { ascending: false });
    setBusinesses((data as any) || []);
  };

  useEffect(() => { load(); }, [partner]);

  const captureGPS = () => {
    if (!navigator.geolocation) return toast({ title: 'GPS indisponible', variant: 'destructive' });
    navigator.geolocation.getCurrentPosition(
      pos => { setForm((f: any) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })); toast({ title: 'Position capturée', description: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}` }); },
      err => toast({ title: 'Erreur GPS', description: err.message, variant: 'destructive' })
    );
  };

  const save = async () => {
    if (!partner) return;
    setSaving(true);
    const { error } = await supabase.from('waouh_partner_businesses' as any).insert({ ...form, partner_id: partner.id });
    setSaving(false);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: 'Entreprise enregistrée' });
    setOpen(false);
    setForm({ nom_entreprise: '', categorie: '', description: '', adresse_complete: '', ville: '', quartier: '', telephone: '', whatsapp: '', mobile_money_number: '', mobile_money_operator: 'MTN', lat: null, lng: null });
    load();
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!partner) return <div className="p-8">Vous n'êtes pas encore partenaire. <Link to="/partner" className="underline">S'inscrire</Link></div>;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes entreprises</h1>
          <p className="text-muted-foreground">{businesses.length} entreprise(s) enrôlée(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Enrôler une entreprise</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouvelle entreprise</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nom de l'entreprise *</Label><Input value={form.nom_entreprise} onChange={e => setForm({ ...form, nom_entreprise: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Catégorie</Label><Input value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} placeholder="Alimentation, Mode..." /></div>
                <div><Label>Ville</Label><Input value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Quartier</Label><Input value={form.quartier} onChange={e => setForm({ ...form, quartier: e.target.value })} /></div>
                <div><Label>Adresse complète</Label><Input value={form.adresse_complete} onChange={e => setForm({ ...form, adresse_complete: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Téléphone</Label><Input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} /></div>
                <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Opérateur MM</Label><Input value={form.mobile_money_operator} onChange={e => setForm({ ...form, mobile_money_operator: e.target.value })} /></div>
                <div><Label>Numéro Mobile Money</Label><Input value={form.mobile_money_number} onChange={e => setForm({ ...form, mobile_money_number: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={captureGPS}><MapPin className="h-4 w-4 mr-2" />Capturer GPS</Button>
                {form.lat && <span className="text-sm text-muted-foreground">{form.lat.toFixed(5)}, {form.lng.toFixed(5)}</span>}
              </div>
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
