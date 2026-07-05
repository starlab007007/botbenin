import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, Plus, QrCode as QrIcon, Download } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

export default function AttendanceDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const [site, setSite] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [form, setForm] = useState({ full_name: "", msisdn: "" });

  const refresh = async () => {
    const { data: s } = await supabase.from("waouh_attendance_sites").select("*").eq("id", id).maybeSingle();
    setSite(s);
    const { data: emps } = await supabase.from("waouh_attendance_employees").select("*").eq("site_id", id).order("full_name");
    setEmployees(emps || []);
    const { data: evs } = await supabase.from("waouh_attendance_events").select("*, waouh_attendance_employees(full_name)").eq("site_id", id).order("created_at", { ascending: false }).limit(30);
    setEvents(evs || []);
  };
  useEffect(() => { refresh(); }, [id]);

  const generateQr = async () => {
    if (!site) return;
    const url = `${window.location.origin}/checkin/${site.qr_token}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
    setQrDataUrl(dataUrl);
    setShowQr(true);
  };

  const downloadQr = () => {
    const a = document.createElement("a");
    a.href = qrDataUrl; a.download = `qr-${site.name}.png`; a.click();
  };

  const addEmp = async () => {
    if (!user || !form.full_name.trim() || !form.msisdn.trim()) return toast.error("Nom et téléphone requis");
    const { error } = await supabase.from("waouh_attendance_employees").insert({
      site_id: id, user_id: user.id, full_name: form.full_name, msisdn: form.msisdn,
    });
    if (error) return toast.error(error.message);
    toast.success("Employé ajouté");
    setShowAdd(false); setForm({ full_name: "", msisdn: "" });
    refresh();
  };

  const ACTION_LABELS: any = { arrival: "🟢 Arrivée", break_start: "☕ Pause", break_end: "▶️ Retour", departure: "🔴 Sortie" };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-3 py-3 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/bots")} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-2"><MapPin className="h-4 w-4" /> {site?.name || "…"}</div>
          <div className="text-xs text-white/70">{employees.length} employés · rayon {site?.radius_m}m</div>
        </div>
        <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={generateQr}><QrIcon /></Button>
        <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={() => setShowAdd(true)}><Plus /></Button>
      </header>

      <main className="p-3 max-w-md mx-auto space-y-3 pb-24">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">EMPLOYÉS</div>
            {employees.length ? employees.map(e => (
              <div key={e.id} className="flex justify-between py-1 text-sm border-b last:border-0">
                <span>{e.full_name}</span><span className="text-muted-foreground text-xs">{e.msisdn}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">Aucun employé.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">HISTORIQUE ({events.length})</div>
            {events.length ? events.map(ev => (
              <div key={ev.id} className="flex justify-between py-1 text-sm border-b last:border-0">
                <span>{ACTION_LABELS[ev.action]} {ev.waouh_attendance_employees?.full_name}</span>
                <span className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString("fr-FR")}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">Aucun scan encore.</p>}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-[90vw]">
          <DialogHeader><DialogTitle>Ajouter un employé</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom complet</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Téléphone (avec indicatif)</Label><Input value={form.msisdn} onChange={e => setForm({ ...form, msisdn: e.target.value })} placeholder="22961234567" /></div>
            <Button className="w-full" onClick={addEmp}>Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-[90vw]">
          <DialogHeader><DialogTitle>QR Code — {site?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-center">
            {qrDataUrl && <img src={qrDataUrl} alt="QR" className="mx-auto max-w-full" />}
            <p className="text-xs text-muted-foreground">Imprimez et affichez sur le site. Valide uniquement dans un rayon de {site?.radius_m}m.</p>
            <Button onClick={downloadQr} className="w-full"><Download className="mr-2 h-4 w-4" /> Télécharger</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
