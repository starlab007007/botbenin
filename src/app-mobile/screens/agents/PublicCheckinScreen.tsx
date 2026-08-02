import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { presenceRepository } from "@/lib/waouh/presenceRepository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, LogIn, Coffee, Play, LogOut, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Navigation } from "lucide-react";
import { toast } from "sonner";

const ACTIONS = [
  { id: "arrival", label: "Arrivée", icon: LogIn, color: "bg-green-500" },
  { id: "break_start", label: "Début pause", icon: Coffee, color: "bg-amber-500" },
  { id: "break_end", label: "Retour pause", icon: Play, color: "bg-blue-500" },
  { id: "departure", label: "Sortie", icon: LogOut, color: "bg-red-500" },
];

export default function PublicCheckinScreen() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const payload = decodeURIComponent((searchParams.get("t") || searchParams.get("c") || token || "").trim());

  const [preview, setPreview] = useState<any>(null);
  const [employeeCode, setEmployeeCode] = useState("");
  const [pin, setPin] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState("Position non encore autorisée");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSite, setLoadingSite] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const loadSite = useCallback(async () => {
    setLoadingSite(true);
    setLoadError(null);
    setPreview(null);
    if (!payload) {
      setLoadError("Le lien de pointage est incomplet ou incorrect.");
      setLoadingSite(false);
      return;
    }
    try {
      const data = await presenceRepository.previewQr(payload);
      setPreview(data);
    } catch (error: any) {
      setLoadError(error?.message || "QR invalide, expiré ou site désactivé.");
    } finally {
      setLoadingSite(false);
    }
  }, [payload]);

  useEffect(() => { void loadSite(); }, [loadSite]);

  const site = preview?.site || preview;
  const requireCode = !!(site?.require_employee_code ?? preview?.require_employee_code);
  const requirePin = !!(site?.require_pin ?? preview?.require_pin);
  const radius = site?.radius_meters ?? preview?.radius_meters;

  const requestPosition = () => {
    if (!navigator.geolocation) {
      setGpsStatus("La géolocalisation n'est pas disponible sur ce téléphone.");
      return;
    }
    setGpsStatus("Recherche de votre position précise…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPos({ lat: position.coords.latitude, lng: position.coords.longitude, acc: position.coords.accuracy });
        setGpsStatus(`Position autorisée · précision ${Math.round(position.coords.accuracy)} m`);
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "Autorisation GPS refusée. Activez la localisation dans le navigateur.",
          2: "Position indisponible. Activez le GPS puis réessayez.",
          3: "La recherche GPS a expiré. Réessayez près d'une fenêtre.",
        };
        setGpsStatus(messages[error.code] || "Impossible d'obtenir la position.");
        toast.error(messages[error.code] || "Géolocalisation impossible");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const submit = async () => {
    if (!action) return toast.error("Sélectionnez une action");
    if (!pos) return toast.error("Activez votre position GPS");
    if (requireCode && !employeeCode.trim()) return toast.error("Code employé requis");
    if (requirePin && pin.length !== 4) return toast.error("PIN à 4 chiffres requis");

    setLoading(true);
    try {
      const data = await presenceRepository.record({
        qrPayload: payload,
        action,
        latitude: pos.lat,
        longitude: pos.lng,
        accuracyMeters: pos.acc,
        employeeCode: employeeCode || null,
        pin: pin || null,
      });
      setDone(data?.message || "Pointage enregistré");
    } catch (error: any) {
      toast.error(error?.message || "Le pointage n'a pas pu être enregistré");
    } finally {
      setLoading(false);
    }
  };

  if (loadingSite) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 p-6 bg-background text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h1 className="text-xl font-bold">Ouverture du pointage</h1>
        <p className="text-sm text-muted-foreground">Vérification du QR et chargement du site…</p>
      </div>
    );
  }

  if (loadError || !preview) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-5 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <AlertTriangle className="h-14 w-14 mx-auto text-destructive" />
            <div>
              <h1 className="text-xl font-bold">Pointage indisponible</h1>
              <p className="text-sm text-muted-foreground mt-2">{loadError || "Ce QR n'est pas valide."}</p>
            </div>
            <Button className="w-full" onClick={() => void loadSite()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-green-50 to-white text-center">
        <CheckCircle2 className="h-20 w-20 text-green-600 mb-4" />
        <h1 className="text-2xl font-bold">{done}</h1>
        <p className="text-muted-foreground mt-2">Votre pointage a été enregistré avec succès.</p>
        <Button variant="outline" className="mt-5" onClick={() => { setDone(null); setAction(""); setPin(""); }}>
          Nouveau pointage
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-muted/20 p-3 sm:p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center py-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center mx-auto mb-2">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{site?.name || "Pointage"}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {[site?.address, radius ? `Pointage dans un rayon de ${radius} m` : null].filter(Boolean).join(" · ")}
          </p>
        </div>

        {requireCode && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <Label>Code employé</Label>
              <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="Ex: EMP-014" />
            </CardContent>
          </Card>
        )}

        {requirePin && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <Label>PIN à 4 chiffres</Label>
              <Input type="tel" maxLength={4} inputMode="numeric" value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="****" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <Button key={item.id} type="button" variant={action === item.id ? "default" : "outline"}
                onClick={() => setAction(item.id)}
                className={`h-16 flex-col ${action === item.id ? `${item.color} text-white hover:opacity-90` : ""}`}>
                <Icon className="h-5 w-5 mb-1" /> {item.label}
              </Button>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Navigation className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Position GPS</div>
              <div className="text-xs text-muted-foreground">{gpsStatus}</div>
            </div>
            <Button size="sm" variant="outline" onClick={requestPosition}>{pos ? "Actualiser" : "Activer"}</Button>
          </CardContent>
        </Card>

        <Button className="w-full h-12" onClick={submit} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Valider mon pointage
        </Button>
      </div>
    </div>
  );
}
