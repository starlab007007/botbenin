import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, LogIn, Coffee, Play, LogOut, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ACTIONS = [
  { id: "arrival", label: "Arrivée", icon: LogIn, color: "bg-green-500" },
  { id: "break_start", label: "Début pause", icon: Coffee, color: "bg-amber-500" },
  { id: "break_end", label: "Retour pause", icon: Play, color: "bg-blue-500" },
  { id: "departure", label: "Sortie", icon: LogOut, color: "bg-red-500" },
];

export default function PublicCheckinScreen() {
  const { token } = useParams();
  const [site, setSite] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string>("");
  const [last4, setLast4] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [action, setAction] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("waouh_attendance_sites").select("id, name, radius_m, active, qr_token").eq("qr_token", token).eq("active", true).maybeSingle();
      if (!s) return toast.error("QR invalide");
      setSite(s);
      const { data: emps } = await supabase.from("waouh_attendance_employees").select("id, full_name").eq("site_id", s.id).eq("active", true).order("full_name");
      setEmployees(emps || []);
    })();
  }, [token]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => toast.error("Géolocalisation nécessaire pour valider"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const submit = async () => {
    if (!site || !selectedEmp || !action) return toast.error("Sélectionnez employé + action");
    if (!pos) return toast.error("Position GPS requise");
    if (last4.length !== 4) return toast.error("Les 4 derniers chiffres de votre téléphone");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-attendance-checkin", {
        body: { qr_token: token, employee_id: selectedEmp, last4, action, lat: pos.lat, lng: pos.lng },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDone(data.message);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  if (!site) return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (done) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-green-50 to-white text-center">
        <CheckCircle2 className="h-20 w-20 text-green-600 mb-4" />
        <h1 className="text-2xl font-bold">{done}</h1>
        <p className="text-muted-foreground mt-2">Votre employeur a été notifié.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center py-4">
          <MapPin className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-xl font-bold">{site.name}</h1>
          <p className="text-xs text-muted-foreground">Pointage sur site (rayon {site.radius_m}m)</p>
        </div>

        <Card><CardContent className="p-3">
          <Label>Votre nom</Label>
          <select className="w-full mt-1 border rounded-md p-2 bg-background" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </CardContent></Card>

        <Card><CardContent className="p-3">
          <Label>4 derniers chiffres de votre téléphone</Label>
          <Input type="tel" maxLength={4} inputMode="numeric" value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, ""))} placeholder="1234" />
        </CardContent></Card>

        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <Button key={a.id} variant={action === a.id ? "default" : "outline"} onClick={() => setAction(a.id)} className={`h-16 flex-col ${action === a.id ? a.color + " text-white hover:opacity-90" : ""}`}>
                <Icon className="h-5 w-5 mb-1" /> {a.label}
              </Button>
            );
          })}
        </div>

        <Button className="w-full h-12" onClick={submit} disabled={loading || !pos}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {pos ? "Valider mon pointage" : "En attente de la position…"}
        </Button>
      </div>
    </div>
  );
}
