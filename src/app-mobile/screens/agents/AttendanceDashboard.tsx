import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { presenceRepository, type PresenceEvent, type PresenceMember, type PresenceSite } from "@/lib/waouh/presenceRepository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, Plus, QrCode as QrIcon, Download, Copy, Share2, Printer, Users, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

const ACTION_LABELS: Record<string, string> = {
  arrival: "🟢 Arrivée",
  check_in: "🟢 Arrivée",
  break_start: "☕ Pause",
  break_end: "▶️ Retour",
  departure: "🔴 Sortie",
  check_out: "🔴 Sortie",
};

export default function AttendanceDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState<PresenceSite | null>(null);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [events, setEvents] = useState<PresenceEvent[]>([]);
  const [qrPayload, setQrPayload] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ display_name: "", phone: "", employee_code: "" });

  const PUBLIC_BASE = typeof window !== "undefined" ? window.location.origin : "https://bot.bj";
  const shareUrl = qrPayload ? `${PUBLIC_BASE}/checkin/${encodeURIComponent(qrPayload)}` : "";

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoadingData(true);
    try {
      const [s, m, e] = await Promise.all([
        presenceRepository.fetchSite(id),
        presenceRepository.fetchMembers(id),
        presenceRepository.fetchEvents(id, 30),
      ]);
      setSite(s);
      setMembers(m);
      setEvents(e);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingData(false);
    }
  }, [id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const generateQr = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const token = await presenceRepository.createQrToken(id);
      setQrPayload(token.qr_payload);
      const url = `${PUBLIC_BASE}/checkin/${encodeURIComponent(token.qr_payload)}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512, margin: 2, errorCorrectionLevel: "H",
        color: { dark: "#06483F", light: "#FFFFFF" },
      });
      setQrDataUrl(dataUrl);
      setShowQr(true);
    } catch (e: any) {
      toast.error(e.message || "Impossible de générer le QR");
    } finally {
      setGenerating(false);
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl || !site) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-presence-${site.name}.png`;
    a.click();
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); toast.success("Lien copié"); }
    catch { toast.error("Impossible de copier le lien"); }
  };

  const shareLink = async () => {
    if (!shareUrl || !site) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Pointage — ${site.name}`, text: "Ouvrez ce lien pour pointer votre présence.", url: shareUrl });
      } catch { /* annulé */ }
    } else await copyLink();
  };

  const openPublicPage = () => { if (shareUrl) window.open(shareUrl, "_blank", "noopener,noreferrer"); };

  const printA4 = () => {
    if (!qrDataUrl || !site || !shareUrl) return;
    const win = window.open("", "_blank", "width=800,height=1000");
    if (!win) return toast.error("Autorisez les fenêtres pop-up pour imprimer");
    const safeName = String(site.name || "Site").replace(/[<>]/g, "");
    const safeAddress = String(site.address || "").replace(/[<>]/g, "");
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Pointage — ${safeName}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: -apple-system, system-ui, sans-serif; margin: 0; color: #111; text-align: center; }
        .wrap { display: flex; flex-direction: column; align-items: center; padding: 18mm 10mm; }
        h1 { font-size: 28pt; margin: 0 0 4mm; }
        .site { font-size: 18pt; color: #555; margin-bottom: 9mm; }
        img { width: 128mm; height: 128mm; border: 3mm solid #06483f; padding: 4mm; background: #fff; }
        ol { text-align: left; max-width: 150mm; font-size: 13pt; line-height: 1.65; margin: 9mm auto 4mm; }
        .foot { margin-top: 8mm; font-size: 10pt; color: #666; }
      </style></head><body onload="window.print();window.setTimeout(()=>window.close(),500)">
      <div class="wrap">
        <h1>Pointage présence</h1>
        <div class="site">${safeName}${safeAddress ? " · " + safeAddress : ""}</div>
        <img src="${qrDataUrl}" alt="QR Code de pointage" />
        <ol>
          <li>Scannez ce QR avec l'appareil photo de votre téléphone.</li>
          <li>La page de pointage s'ouvre directement.</li>
          <li>Autorisez la position GPS, puis choisissez Arrivée, Pause, Retour ou Sortie.</li>
          <li>Le pointage est accepté dans un rayon de ${site.radius_meters} m autour du site.</li>
        </ol>
        <div class="foot">Bot.BJ — Système de pointage géolocalisé</div>
      </div></body></html>`);
    win.document.close();
  };

  const addMember = async () => {
    if (!id || !form.display_name.trim()) return toast.error("Nom requis");
    try {
      await presenceRepository.saveMember({
        siteId: id,
        displayName: form.display_name,
        phone: form.phone || null,
        employeeCode: form.employee_code || null,
        role: "member",
      });
      toast.success("Membre ajouté");
      setShowAdd(false);
      setForm({ display_name: "", phone: "", employee_code: "" });
      void refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-3 py-3 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/bots")} className="text-white hover:bg-white/15">
          <ArrowLeft />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {site?.name || "…"}
          </div>
          <div className="text-xs text-white/70">
            {members.length} membres · rayon {site?.radius_meters || "…"} m
          </div>
        </div>
        <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={generateQr} disabled={generating}>
          {generating ? <Loader2 className="animate-spin" /> : <QrIcon />}
        </Button>
        <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={() => setShowAdd(true)}>
          <Plus />
        </Button>
      </header>

      <main className="p-3 max-w-md mx-auto space-y-3 pb-24">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="h-3 w-3" /> ÉQUIPE ({members.length})
            </div>
            {loadingData ? (
              <p className="text-sm text-muted-foreground py-2">Chargement…</p>
            ) : members.length ? (
              members.map((member) => (
                <div key={member.id} className="flex justify-between py-1 text-sm border-b last:border-0">
                  <span>{member.display_name}</span>
                  <span className="text-muted-foreground text-xs">{member.member_phone || member.employee_code || member.status}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Aucun membre pour l'instant.</p>
                <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Ajouter un membre</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">HISTORIQUE ({events.length})</div>
            {loadingData ? (
              <p className="text-sm text-muted-foreground py-2">Chargement…</p>
            ) : events.length ? (
              events.map((event) => (
                <div key={event.id} className="flex justify-between py-1 text-sm border-b last:border-0 gap-2">
                  <span>{ACTION_LABELS[event.action] || event.action} {event.waouh_presence_members?.display_name || ""}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(event.occurred_at).toLocaleString("fr-FR")}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">Aucun pointage enregistré.</div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ajouter un membre</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nom complet *</Label>
              <Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Téléphone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="22961234567" /></div>
            <div className="space-y-1"><Label>Code employé</Label>
              <Input value={form.employee_code} onChange={e => setForm({ ...form, employee_code: e.target.value })} /></div>
            <Button className="w-full" onClick={addMember}>Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>QR de pointage</DialogTitle></DialogHeader>
          <div className="space-y-3 text-center">
            {qrDataUrl && <img src={qrDataUrl} alt="QR de pointage du site" className="w-56 h-56 mx-auto rounded-xl border" />}
            <p className="text-xs text-muted-foreground break-all">{shareUrl}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={downloadQr}><Download className="mr-1 h-4 w-4" /> Télécharger</Button>
              <Button variant="outline" onClick={copyLink}><Copy className="mr-1 h-4 w-4" /> Copier</Button>
              <Button variant="outline" onClick={shareLink}><Share2 className="mr-1 h-4 w-4" /> Partager</Button>
              <Button variant="outline" onClick={printA4}><Printer className="mr-1 h-4 w-4" /> Imprimer</Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={openPublicPage}>
              <ExternalLink className="mr-1 h-4 w-4" /> Ouvrir la page de pointage
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
