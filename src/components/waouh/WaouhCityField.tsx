import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BENIN_CITIES } from "@/data/beninLocations";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

type Suggestion = { label: string; value: string; hint: string };

const INDEX: Suggestion[] = BENIN_CITIES.flatMap((c) => [
  { label: c.ville, value: c.ville, hint: "Ville" },
  ...c.quartiers.filter((q) => q !== "Centre" && fold(q) !== fold(c.ville)).map((q) => ({ label: q, value: `${q}, ${c.ville}`, hint: c.ville })),
]);

/** Suggestions prédictives : début de mot d'abord, puis contient. Accents ignorés. */
export function suggestPlaces(input: string, limit = 6): Suggestion[] {
  const q = fold(input);
  if (!q) return [];
  const starts: Suggestion[] = [];
  const contains: Suggestion[] = [];
  for (const s of INDEX) {
    const f = fold(s.label);
    if (f.startsWith(q)) starts.push(s);
    else if (f.split(/[\s-]+/).some((w) => w.startsWith(q)) || f.includes(q)) contains.push(s);
  }
  return [...starts, ...contains].slice(0, limit);
}

/**
 * Champ « lieu » intelligent : saisie prédictive (villes et quartiers du Bénin),
 * bouton « Ma position » (géolocalisation + adresse déduite) et remplissage
 * automatique silencieux si l'autorisation est déjà accordée.
 */
export function WaouhCityField({ value, onChange, placeholder = "Ville ou quartier", className = "", ariaLabel = "Ville ou quartier", autoLocate = true }: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  autoLocate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const suggestions = useMemo(() => suggestPlaces(value), [value]);

  const locate = useCallback(async (silent: boolean) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { if (!silent) setNotice("Position indisponible sur cet appareil."); return; }
    setLocating(true);
    setNotice("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: !silent, timeout: 9000, maximumAge: 120000 }));
      const { data } = await supabase.functions.invoke("waouh-geocode", { body: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
      const city = typeof data?.city === "string" ? data.city.trim() : "";
      const district = typeof data?.district === "string" ? data.district.trim() : "";
      if (city) {
        if (silent && valueRef.current.trim()) return;
        onChange(district && district !== city ? `${district}, ${city}` : city);
      } else if (!silent) setNotice("Position trouvée, ville inconnue. Saisissez-la.");
    } catch (err: any) {
      if (!silent) setNotice(err?.code === 1 ? "Autorisez la position dans votre navigateur." : "Position introuvable. Saisissez la ville.");
    } finally {
      setLocating(false);
    }
  }, [onChange]);

  useEffect(() => {
    if (!autoLocate || valueRef.current.trim() || typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let alive = true;
    navigator.permissions.query({ name: "geolocation" as PermissionName }).then((p) => { if (alive && p.state === "granted") void locate(true); }).catch(() => {});
    return () => { alive = false; };
  }, [autoLocate, locate]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (s: Suggestion) => { onChange(s.value); setOpen(false); setNotice(""); };
  const show = open && suggestions.length > 0 && fold(value) !== fold(suggestions[0]?.value ?? "");

  return (
    <div ref={box} className={`relative ${className}`}>
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
      <input
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % suggestions.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + suggestions.length) % suggestions.length); }
          else if (e.key === "Enter") { e.preventDefault(); pick(suggestions[active] ?? suggestions[0]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className="h-11 w-full rounded-2xl border border-blue-100 bg-white pl-9 pr-11 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
      <button type="button" onClick={() => void locate(false)} aria-label="Utiliser ma position" disabled={locating}
        className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-blue-50 text-blue-600 active:scale-95 disabled:opacity-60">
        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
      </button>
      {show && (
        <ul role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-2xl border border-blue-100 bg-white p-1 shadow-xl">
          {suggestions.map((s, i) => (
            <li key={s.value} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm ${i === active ? "bg-blue-50" : ""}`}>
                <span className="font-bold text-slate-900">{s.label}</span>
                <span className="text-[11px] font-semibold text-slate-400">{s.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {notice && <p className="mt-1 text-[11px] font-semibold text-slate-500">{notice}</p>}
    </div>
  );
}

export default WaouhCityField;
