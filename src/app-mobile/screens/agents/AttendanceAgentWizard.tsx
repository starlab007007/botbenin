import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AddressAutocomplete } from "../../components/AddressAutocomplete";
import { SmartPhoneInput } from "../../components/SmartPhoneInput";

export default function AttendanceAgentWizard() {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState("50");
  const [employer, setEmployer] = useState("");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!user) return toast.error("Connexion requise");
    if (!name.trim()) return toast.error("Nom du site requis");
    if (lat == null || lng == null) return toast.error("Position GPS requise (adresse ou géolocalisation)");
    if (!employer.trim()) return toast.error("WhatsApp employeur requis");
    setLoading(true);
    try {
      const { data, error } = await supabase.from("waouh_attendance_sites").insert({
        user_id: user.id, name, address: address || null, lat, lng,
        radius_m: Number(radius) || 50, employer_msisdn: employer.replace(/[^\d]/g, ""),
      }).select().single();
      if (error) throw error;
      toast.success("Site créé");
      navigate(`/app/agents/attendance/${data.id}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-3 py-3 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div>
          <div className="font-semibold flex items-center gap-2"><MapPin className="h-5 w-5" /> Nouveau site QR</div>
          <div className="text-xs text-white/70">Présence géolocalisée</div>
        </div>
      </header>
      <main className="p-4 max-w-md mx-auto space-y-4 pb-24">
        <div className="space-y-2"><Label>Nom du site *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Boutique Ganhi" /></div>

        <div className="space-y-2">
          <Label>Adresse & Position *</Label>
          <AddressAutocomplete
            address={address}
            onAddressChange={setAddress}
            lat={lat}
            lng={lng}
            onPositionChange={(la, ln) => { setLat(la); setLng(ln); }}
          />
          <p className="text-xs text-muted-foreground">Sélectionnez une suggestion ou utilisez votre position actuelle.</p>
        </div>

        <div className="space-y-2"><Label>Rayon autorisé (m)</Label><Input type="number" value={radius} onChange={e => setRadius(e.target.value)} /></div>

        <div className="space-y-2">
          <Label>WhatsApp employeur *</Label>
          <SmartPhoneInput value={employer} onChange={setEmployer} />
        </div>

        <Button className="w-full h-12" onClick={create} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Créer le site</Button>
      </main>
    </div>
  );
}
