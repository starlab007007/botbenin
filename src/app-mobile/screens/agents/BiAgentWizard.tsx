import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const SOURCES = [
  { id: "google_sheet", label: "Google Sheet", hint: "Collez l'URL du sheet (lecture publique)" },
  { id: "csv", label: "CSV en ligne", hint: "URL d'un fichier .csv accessible" },
  { id: "json_url", label: "API JSON", hint: "URL renvoyant un tableau JSON" },
];

export default function BiAgentWizard() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("google_sheet");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!name.trim() || !url.trim()) return toast.error("Nom et URL requis");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-bi-ingest", {
        body: { name, source_type: sourceType, source_url: url },
      });
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
          <div className="font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Agent BI</div>
          <div className="text-xs text-white/70">Connectez votre source de données</div>
        </div>
      </header>
      <main className="p-4 max-w-md mx-auto space-y-4 pb-24">
        <div className="space-y-2">
          <Label>Nom de l'agent</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Ventes 2025" />
        </div>
        <div className="space-y-2">
          <Label>Type de source</Label>
          <div className="grid gap-2">
            {SOURCES.map((s) => (
              <Card key={s.id} className={`cursor-pointer ${sourceType === s.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSourceType(s.id)}>
                <CardContent className="p-3">
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.hint}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          {sourceType === "google_sheet" && (
            <p className="text-xs text-muted-foreground">Dans Google Sheets → Partager → « Tout utilisateur ayant le lien » (Lecteur).</p>
          )}
        </div>
        <Button className="w-full h-12" onClick={create} disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion…</> : "Connecter et analyser"}
        </Button>
      </main>
    </div>
  );
}
