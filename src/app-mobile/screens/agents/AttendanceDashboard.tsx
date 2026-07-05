import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, Plus, QrCode as QrIcon, Download, Copy, Share2, Printer, Users } from "lucide-react";
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
  const [loadingData, setLoadingData] = useState(true);
  const [form, setForm] = useState({ full_name: "", msisdn: "" });

  const shareUrl = site ? `${window.location.origin}/checkin/${site.qr_token}` : "";

  const refresh = async () => {
    setLoadingData(true);
    const { data: s } = await supabase.from("waouh_attendance_sites").select("*").eq("id", id).maybeSingle();
    setSite(s);
    const { data: emps } = await supabase.from("waouh_attendance_employees").select("*").eq("site_id", id).order("full_name");
    setEmployees(emps || []);
    const { data: evs } = await supabase.from("waouh_attendance_events").select("*, waouh_attendance_employees(full_name)").eq("site_id", id).order("created_at", { ascending: false }).limit(30);
    setEvents(evs || []);
    setLoadingData(false);
  };
  useEffect(() => { refresh(); }, [id]);

  const generateQr = async () => {
    if (!site) return;
    const dataUrl = await QRCode.toDataURL(shareUrl, { width: 512, margin: 2 });
    setQrDataUrl(dataUrl);
    setShowQr(true);
  };

  const downloadQr = () => {
    const a = document.createElement("a");
    a.href = qrDataUrl; a.download = `qr-${site.name}.png`; a.click();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Pointage — ${site.name}`, text: "Scannez ou ouvrez le lien pour pointer", url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      copyLink();
    }
  };

  const printA4 = () => {
    if (!qrDataUrl || !site) return;
    const win = window.open("", "_blank", "width=800,height=1000");
    if (!win) return toast.error("Autorisez les fenêtres pop-up pour imprimer");
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Pointage — ${site.name}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, system-ui, sans-serif; margin: 0; color: #111; text-align: center; }
        .wrap { display: flex; flex-direction: column; align-items: center; padding: 20mm 10mm; }
        h1 { font-size: 28pt; margin: 0 0 4mm; }
        .site { font-size: 18pt; color: #555; margin-bottom: 10mm; }
        img { width: 130mm; height: 130mm; border: 4mm solid #111; padding: 4mm; background: #fff; }
        ol { text-align: left; max-width: 150mm; font-size: 13pt; line-height: 1.7; margin: 10mm auto 5mm; }
        .url { font-family: monospace; font-size: 11pt; word-break: break-all; color: #0369a1; margin-top: 4mm; }
        .foot { margin-top: 8mm; font-size: 10pt; color: #666; }
      </style></head><body onload="window.print();window.setTimeout(()=>window.close(),500)">
      <div class="wrap">
        <h1>Pointage présence</h1>
        <div class="site">${site.name}${site.address ? " · " + site.address : ""}</div>
        <img src="${qrDataUrl}" alt="QR Code" />
        <ol>
          <li>Scannez ce QR avec l'appareil photo de votre téléphone.</li>
          <li>Autorisez la géolocalisation (obligatoire, rayon ${site.radius_m} m).</li>
          <li>Sélectionnez votre nom, saisissez les 4 derniers chiffres de votre numéro.</li>
          <li>Choisissez : Arrivée / Pause / Retour / Sortie.</li>
        </ol>
        <div class="url">${shareUrl}</div>
        <div class="foot">Bot.BJ — Système de pointage géolocalisé</div>
      </div></body></html>`);
    win.document.close();
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
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Users className="h-3 w-3" /> EMPLOYÉS ({employees.length})</div>
            {loadingData ? (
              <p className="text-sm text-muted-foreground py-2">Chargement…</p>
            ) : employees.length ? employees.map(e => (
              <div key={e.id} className="flex justify-between py-1 text-sm border-b last:border-0">
                <span>{e.full_name}</span><span className="text-muted-foreground text-xs">{e.msisdn}</span>
              </div>
            )) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Aucun employé pour l'instant.</p>
                <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Ajouter un employé</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">HISTORIQUE ({events.length})</div>
            {loadingData ? (
              <p className="text-sm text-muted-foreground py-2">Chargement…</p>
            ) : events.length ? events.map(ev => (
              <div key={ev.id} className="flex justify-between py-1 text-sm border-b last:border-0">
                <span>{ACTION_LABELS[ev.action]} {ev.waouh_attendance_employees?.full_name}</span>
                <span className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString("fr-FR")}</span>
              </div>
            )) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Aucun pointage encore.</p>
                <Button size="sm" variant="outline" onClick={generateQr}><QrIcon className="mr-1 h-3 w-3" /> Générer le QR à afficher</Button>
              </div>
            )}
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
        <DialogContent className="max-w-[92vw] max-h-[92dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>QR pointage — {site?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {qrDataUrl && <img src={qrDataUrl} alt="QR" className="mx-auto max-w-full rounded-lg border-4 border-primary/20 bg-white p-2" />}

            <div className="rounded-lg bg-muted p-2 flex items-center gap-2">
              <div className="flex-1 text-xs font-mono truncate">{shareUrl}</div>
              <Button size="icon" variant="ghost" onClick={copyLink} className="h-8 w-8"><Copy className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={shareLink} className="h-8 w-8"><Share2 className="h-4 w-4" /></Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Valide uniquement dans un rayon de <strong>{site?.radius_m} m</strong> autour du site.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button onClick={downloadQr} variant="outline"><Download className="mr-2 h-4 w-4" /> PNG</Button>
              <Button onClick={printA4}><Printer className="mr-2 h-4 w-4" /> Imprimer A4</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
