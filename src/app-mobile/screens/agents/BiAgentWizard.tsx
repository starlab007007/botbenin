import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { biRepository, parseCsv } from "@/lib/waouh/biRepository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, BarChart3, FileSpreadsheet, Link2, Cloud, Upload } from "lucide-react";
import { toast } from "sonner";

type SourceId = "google_sheet" | "csv" | "json_url" | "file";

const SOURCES: { id: SourceId; label: string; hint: string; icon: any }[] = [
  { id: "google_sheet", label: "Google Sheet", hint: "URL d'un sheet partagé en lecture", icon: FileSpreadsheet },
  { id: "file", label: "Fichier local (CSV / Excel)", hint: "Import direct depuis votre appareil", icon: Upload },
  { id: "csv", label: "CSV en ligne", hint: "URL d'un fichier .csv accessible", icon: Link2 },
  { id: "json_url", label: "API JSON", hint: "URL renvoyant un tableau JSON", icon: Cloud },
];

// Lit un fichier local et le convertit en CSV texte (support .csv et .xlsx minimal via SheetJS lazy-load)
async function fileToCsv(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "txt") {
    return await file.text();
  }
  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const first = wb.SheetNames[0];
    return XLSX.utils.sheet_to_csv(wb.Sheets[first]);
  }
  throw new Error("Format non supporté (utilisez CSV, XLSX ou XLS)");
}

export default function BiAgentWizard() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceId>("google_sheet");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!name.trim()) return toast.error("Nom de l'agent requis");
    if (sourceType === "file" && !file) return toast.error("Sélectionnez un fichier");
    if (sourceType !== "file" && !url.trim()) return toast.error("URL requise");
    setLoading(true);
    try {
      let body: Record<string, any> = { name, source_type: sourceType, source_url: url };
      if (sourceType === "file" && file) {
        const csv = await fileToCsv(file);
        if (csv.length > 4_000_000) throw new Error("Fichier trop volumineux (max ~4 Mo). Réduisez le nombre de lignes.");
        body = { name, source_type: "csv_inline", source_url: file.name, csv_text: csv };
      }
      const { data, error } = await supabase.functions.invoke("waouh-bi-ingest", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Source connectée · ${data.datasource.row_count} lignes`);
      navigate(`/app/agents/bi/${data.datasource.id}`);
    } catch (e: any) {
      toast.error(e.message || "Échec de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-3 py-3 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div>
          <div className="font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Nouvel agent BI</div>
          <div className="text-xs text-white/70">Étape 1/2 · Connectez vos données</div>
        </div>
      </header>
      <main className="p-4 max-w-md mx-auto space-y-5 pb-24">
        <div className="space-y-2">
          <Label>Nom de l'agent</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Ventes 2025" />
        </div>

        <div className="space-y-2">
          <Label>Source de données</Label>
          <div className="grid gap-2">
            {SOURCES.map((s) => {
              const Icon = s.icon;
              const active = sourceType === s.id;
              return (
                <Card key={s.id} className={`cursor-pointer transition ${active ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent/40"}`} onClick={() => { setSourceType(s.id); setUrl(""); setFile(null); }}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.hint}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {sourceType === "file" ? (
          <div className="space-y-2">
            <Label>Fichier CSV ou Excel</Label>
            <label className="block w-full cursor-pointer">
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition ${file ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"}`}>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm font-medium">{file ? file.name : "Cliquez pour choisir un fichier"}</div>
                <div className="text-xs text-muted-foreground mt-1">CSV, XLSX, XLS · max 4 Mo</div>
              </div>
              <input type="file" accept=".csv,.xlsx,.xls,text/csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            {sourceType === "google_sheet" && (
              <p className="text-xs text-muted-foreground">Google Sheets → Partager → « Tout utilisateur ayant le lien » (Lecteur).</p>
            )}
          </div>
        )}

        <Button className="w-full h-12" onClick={create} disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion et analyse…</> : "Connecter et analyser"}
        </Button>
      </main>
    </div>
  );
}
