import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Loader2, Phone } from "lucide-react";
import { parsePhoneNumberFromString, AsYouType, type CountryCode } from "libphonenumber-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COUNTRIES: { code: CountryCode; label: string; dial: string; flag: string }[] = [
  { code: "BJ", label: "Bénin", dial: "+229", flag: "🇧🇯" },
  { code: "CI", label: "Côte d'Ivoire", dial: "+225", flag: "🇨🇮" },
  { code: "SN", label: "Sénégal", dial: "+221", flag: "🇸🇳" },
  { code: "TG", label: "Togo", dial: "+228", flag: "🇹🇬" },
  { code: "BF", label: "Burkina Faso", dial: "+226", flag: "🇧🇫" },
  { code: "ML", label: "Mali", dial: "+223", flag: "🇲🇱" },
  { code: "NG", label: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "GH", label: "Ghana", dial: "+233", flag: "🇬🇭" },
  { code: "CM", label: "Cameroun", dial: "+237", flag: "🇨🇲" },
  { code: "FR", label: "France", dial: "+33", flag: "🇫🇷" },
];

interface Props {
  value: string;
  onChange: (e164: string) => void;
  defaultCountry?: CountryCode;
  checkWhatsApp?: boolean;
}

export function SmartPhoneInput({ value, onChange, defaultCountry = "BJ", checkWhatsApp = true }: Props) {
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [local, setLocal] = useState("");
  const [waStatus, setWaStatus] = useState<"idle" | "checking" | "yes" | "no" | "unknown">("idle");

  const parsed = local ? parsePhoneNumberFromString(local, country) : null;
  const isValid = parsed?.isValid() ?? false;
  const e164 = isValid ? parsed!.number : "";
  const displayLocal = local ? new AsYouType(country).input(local) : "";

  // sync out
  if (e164 && e164 !== value) onChange(e164);

  const verify = async () => {
    if (!isValid) return toast.error("Numéro invalide");
    setWaStatus("checking");
    try {
      const { data, error } = await supabase.functions.invoke("waouh-check-whatsapp", { body: { phone: e164 } });
      if (error) throw error;
      if (data?.ok === false && !("isWhatsApp" in (data || {}))) { setWaStatus("unknown"); toast.warning(data.error || "Vérification indisponible"); return; }
      setWaStatus(data?.isWhatsApp ? "yes" : "no");
      toast[data?.isWhatsApp ? "success" : "warning"](data?.isWhatsApp ? "Numéro WhatsApp actif ✓" : "Ce numéro n'est pas sur WhatsApp");
    } catch (e: any) { setWaStatus("unknown"); toast.error(e.message || "Vérification impossible"); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={country} onValueChange={(v) => { setCountry(v as CountryCode); setWaStatus("idle"); }}>
          <SelectTrigger className="w-[130px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {COUNTRIES.map(c => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">{c.flag} {c.dial}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={displayLocal}
            onChange={(e) => { setLocal(e.target.value); setWaStatus("idle"); }}
            placeholder="Numéro local"
            className="pl-9"
            inputMode="tel"
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {isValid ? (
            <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {e164}</span>
          ) : local ? (
            <span className="text-amber-600 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Format invalide</span>
          ) : (
            <span className="text-muted-foreground">Entrez un numéro</span>
          )}
        </div>
        {checkWhatsApp && isValid && (
          <Button type="button" size="sm" variant="ghost" onClick={verify} disabled={waStatus === "checking"} className="h-6 px-2 text-xs">
            {waStatus === "checking" ? <Loader2 className="h-3 w-3 animate-spin" /> :
             waStatus === "yes" ? <span className="text-green-600">✓ WhatsApp</span> :
             waStatus === "no" ? <span className="text-red-600">✗ Pas WhatsApp</span> :
             "Vérifier WhatsApp"}
          </Button>
        )}
      </div>
    </div>
  );
}
