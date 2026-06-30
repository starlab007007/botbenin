import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Users, Send, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

const SECTEURS = ["Mode & Beauté", "Tech & Électronique", "Auto & Moto", "Immobilier", "Alimentaire", "Services", "Autre"];
const CLASSES: { id: "A"|"B"|"C"|"D"; label: string; hint: string }[] = [
  { id: "A", label: "A — Chaud", hint: "Vu <7j, intent ≥60" },
  { id: "B", label: "B — Tiède", hint: "Vu <30j, intent ≥30" },
  { id: "C", label: "C — Froid", hint: "Vu <90j" },
  { id: "D", label: "D — Dormant", hint: ">90j" },
];
const SOURCES = [
  { id: "radar", label: "📡 Radar IA" },
  { id: "catalog", label: "📦 Catalogue unifié" },
  { id: "signal", label: "🔔 Signaux récents" },
  { id: "wa_contact", label: "💬 Contacts WhatsApp" },
];

interface Filters {
  sources: string[];
  secteurs: string[];
  villes: string[];
  classes: string[];
  min_freshness_days?: number;
  min_qualite: number;
  min_intent: number;
}

interface Preview {
  total: number;
  breakdown: Record<string, number>;
  sample: Array<{ phone_masked: string; display_name?: string; secteur: string; ville: string; classe: string; intent_score: number; qualite_score: number; sources: string[] }>;
}

export default function AudienceBuilder({ onSubmitted }: { onSubmitted?: () => void }) {
  const [step, setStep] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    sources: ["radar", "catalog"], secteurs: [], villes: [], classes: ["A", "B"],
    min_qualite: 50, min_intent: 0, min_freshness_days: 30,
  });
  const [villeInput, setVilleInput] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("Bonjour {{display_name}} 👋\nDécouvrez notre nouvelle offre adaptée à {{ville}} — répondez OUI pour en savoir plus.");
  const [mediaUrl, setMediaUrl] = useState("");
  const [quotaRequested, setQuotaRequested] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-diffusion-audience", { body: filters });
      if (error) throw error;
      setPreview(data as Preview);
    } catch (e: any) {
      toast.error("Aperçu impossible : " + e.message);
    } finally { setLoadingPreview(false); }
  };

  useEffect(() => { if (step === 4 || step === 5) fetchPreview(); /* eslint-disable-next-line */ }, [step, filters]);

  const toggle = (key: keyof Filters, value: string) => {
    setFilters(f => {
      const arr = (f[key] as string[]) || [];
      return { ...f, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const addVille = () => {
    if (villeInput.trim()) {
      setFilters(f => ({ ...f, villes: Array.from(new Set([...f.villes, villeInput.trim()])) }));
      setVilleInput("");
    }
  };

  const submit = async () => {
    if (!message.trim()) { toast.error("Message requis"); return; }
    if (!preview || preview.total === 0) { toast.error("Audience vide"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-diffusion-submit", {
        body: {
          name: name || `Diffusion ${new Date().toLocaleDateString()}`,
          message_template: message, media_url: mediaUrl || null,
          filters, quota_requested: Math.min(quotaRequested, preview.total),
          audience_snapshot: { total: preview.total, breakdown: preview.breakdown },
        },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "Erreur");
      toast.success("✅ Demande envoyée à l'administrateur pour validation");
      onSubmitted?.();
      setStep(1); setPreview(null);
    } catch (e: any) {
      toast.error("Échec : " + e.message);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Étape {step}/5</span>
        <div className="flex gap-1">{[1,2,3,4,5].map(n => (
          <div key={n} className={`h-1.5 w-8 rounded-full ${n<=step ? 'bg-[hsl(165_91%_18%)]' : 'bg-muted'}`} />
        ))}</div>
      </div>

      {step === 1 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">1. Source des contacts</h3>
          <p className="text-xs text-muted-foreground">D'où viennent vos cibles ?</p>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map(s => (
              <Badge key={s.id} variant={filters.sources.includes(s.id) ? "default" : "outline"} className="cursor-pointer px-3 py-1.5" onClick={() => toggle("sources", s.id)}>{s.label}</Badge>
            ))}
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">2. Secteur d'activité</h3>
          <p className="text-xs text-muted-foreground">Aucun = tous les secteurs</p>
          <div className="flex flex-wrap gap-2">
            {SECTEURS.map(s => (
              <Badge key={s} variant={filters.secteurs.includes(s) ? "default" : "outline"} className="cursor-pointer px-3 py-1.5" onClick={() => toggle("secteurs", s)}>{s}</Badge>
            ))}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">3. Géographie</h3>
          <div className="flex gap-2">
            <Input value={villeInput} onChange={e => setVilleInput(e.target.value)} placeholder="Ex: Cotonou, Porto-Novo…" onKeyDown={e => e.key === 'Enter' && addVille()} />
            <Button type="button" onClick={addVille}>Ajouter</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filters.villes.map(v => (
              <Badge key={v} variant="secondary" className="cursor-pointer" onClick={() => toggle("villes", v)}>{v} ×</Badge>
            ))}
            {filters.villes.length === 0 && <span className="text-xs text-muted-foreground">Toutes les villes</span>}
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">4. Classe & fraîcheur</h3>
          <div className="grid grid-cols-2 gap-2">
            {CLASSES.map(c => (
              <button key={c.id} onClick={() => toggle("classes", c.id)} className={`text-left rounded-lg border p-3 ${filters.classes.includes(c.id) ? 'border-[hsl(165_91%_18%)] bg-[hsl(165_91%_18%)]/5' : ''}`}>
                <div className="font-medium text-sm">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.hint}</div>
              </button>
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <label className="text-xs">Fraîcheur max : {filters.min_freshness_days ?? "∞"} jours</label>
            <input type="range" min={1} max={180} value={filters.min_freshness_days ?? 90} onChange={e => setFilters(f => ({...f, min_freshness_days: parseInt(e.target.value)}))} className="w-full" />
            <label className="text-xs">Qualité min : {filters.min_qualite}</label>
            <input type="range" min={0} max={100} step={5} value={filters.min_qualite} onChange={e => setFilters(f => ({...f, min_qualite: parseInt(e.target.value)}))} className="w-full" />
          </div>
          <AudiencePreviewBlock preview={preview} loading={loadingPreview} />
        </Card>
      )}

      {step === 5 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">5. Message & demande</h3>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la campagne (optionnel)" />
          <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Bonjour {{display_name}}…" />
          <p className="text-xs text-muted-foreground">Variables : {`{{display_name}}, {{ville}}, {{categorie_top}}`}</p>
          <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="URL image (optionnel)" />
          <div className="flex items-center gap-2">
            <label className="text-sm">Plafond demandé :</label>
            <Input type="number" value={quotaRequested} onChange={e => setQuotaRequested(parseInt(e.target.value) || 0)} className="w-24" />
            <span className="text-xs text-muted-foreground">/ {preview?.total ?? 0} éligibles</span>
          </div>
          <AudiencePreviewBlock preview={preview} loading={loadingPreview} />
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-2 text-xs text-amber-900 dark:text-amber-200">
            ⚠️ Cette diffusion sera <b>soumise à validation administrateur</b> avant envoi.
          </div>
        </Card>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="outline" disabled={step === 1} onClick={() => setStep(s => s - 1)}><ChevronLeft className="h-4 w-4" /> Précédent</Button>
        {step < 5 ? (
          <Button onClick={() => setStep(s => s + 1)} className="bg-[hsl(165_91%_18%)]">Suivant <ChevronRight className="h-4 w-4" /></Button>
        ) : (
          <Button onClick={submit} disabled={submitting || !preview?.total} className="bg-[#FF6B35] hover:bg-[#e85a25]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Demander validation
          </Button>
        )}
      </div>
    </div>
  );
}

function AudiencePreviewBlock({ preview, loading }: { preview: Preview | null; loading: boolean }) {
  if (loading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Calcul de l'audience…</div>;
  if (!preview) return null;
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> {preview.total.toLocaleString()} contacts éligibles</div>
      <div className="flex gap-2 text-xs">
        {(["A","B","C","D"] as const).map(k => (
          <Badge key={k} variant="outline">{k} : {preview.breakdown[k] ?? 0}</Badge>
        ))}
      </div>
      {preview.sample.length > 0 && (
        <div className="text-xs space-y-1 pt-1">
          <div className="text-muted-foreground">Échantillon :</div>
          {preview.sample.slice(0, 5).map((s, i) => (
            <div key={i} className="flex justify-between gap-2 truncate">
              <span className="truncate">{s.phone_masked} · {s.display_name || "—"} · {s.secteur}</span>
              <span className="text-muted-foreground">{s.classe} · {s.ville || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
