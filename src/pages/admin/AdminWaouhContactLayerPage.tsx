import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Network, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Level = "C0" | "C1" | "C2" | "C3" | "C4" | "C5";
type Source = {
  source_key: string;
  label: string;
  family: string;
  connector_mode: string;
  operational_state: string;
  supports_contact: boolean;
  default_contactability: Level;
  trust_weight: number;
  updated_at?: string | null;
};
type Policy = {
  level: Level;
  label: string;
  can_reveal: boolean;
  can_auto_contact: boolean;
  requires_approval: boolean;
};
const levels: Level[] = ["C0", "C1", "C2", "C3", "C4", "C5"];

export default function AdminWaouhContactLayerPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [counts, setCounts] = useState<any>({ contacts: {}, fabric: {} });
  const [policy, setPolicy] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { level: Level; trust: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("waouh-admin-stats", {
      body: { action: "contact_layer_get" },
    });
    if (error || !data?.ok) {
      toast.error(data?.error || error?.message || "Chargement impossible.");
    } else {
      setSources(data.sources || []);
      setCounts(data.counts || { contacts: {}, fabric: {} });
      setPolicy(data.policy || []);
      const next: Record<string, { level: Level; trust: string }> = {};
      for (const source of data.sources || []) {
        next[source.source_key] = {
          level: source.default_contactability,
          trust: String(source.trust_weight),
        };
      }
      setDrafts(next);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const policyMap = useMemo(
    () => Object.fromEntries(policy.map((item) => [item.level, item])),
    [policy],
  );

  const save = async (source: Source) => {
    const draft = drafts[source.source_key];
    if (!draft) return;
    setBusy(source.source_key);
    const { data, error } = await supabase.functions.invoke("waouh-admin-stats", {
      body: {
        action: "contact_layer_update_source",
        source_key: source.source_key,
        default_contactability: draft.level,
        trust_weight: Number(draft.trust),
      },
    });
    if (error || !data?.ok) {
      toast.error(data?.error || error?.message || "Enregistrement impossible.");
    } else {
      toast.success(source.label + " mis à jour.");
      await load();
    }
    setBusy(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement Contact Layer…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        <section className="rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white shadow-xl md:p-8">
          <Link
            to="/admin/waouh?tab=control"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Centre de contrôle
          </Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">Contact Layer C0–C5</h1>
                <p className="text-sm text-white/80">
                  Contactabilité, consentement, visibilité et politique par source.
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-5">
          {levels.map((level) => (
            <Card key={level}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{level}</Badge>
                  <Network className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-3 text-2xl font-bold">{counts?.fabric?.[level] ?? 0}</div>
                <div className="text-xs text-muted-foreground">signaux Signal Fabric</div>
                <div className="mt-1 text-xs">{counts?.contacts?.[level] ?? 0} contact(s)</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Politique C0–C4</CardTitle>
            <CardDescription>
              Les niveaux élevés restent contraints par la nature de la source et le consentement.
              La valeur par défaut n’élève pas rétroactivement les contacts déjà collectés.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            {levels.map((level) => {
              const item = policyMap[level];
              return (
                <div key={level} className="rounded-xl border p-3">
                  <div className="font-semibold">
                    {level} · {item?.label}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div>Révéler : {item?.can_reveal ? "oui" : "non"}</div>
                    <div>Auto-contact : {item?.can_auto_contact ? "oui" : "non"}</div>
                    <div>Approbation : {item?.requires_approval ? "requise" : "non"}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Politique par source NEXUS</CardTitle>
            <CardDescription>
              Niveau de contactabilité par défaut et poids de confiance. C3/C4 sont limités aux
              sources compatibles avec consentement ou relation partenaire.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sources.map((source) => {
              const draft =
                drafts[source.source_key] ||
                { level: source.default_contactability, trust: String(source.trust_weight) };
              return (
                <div
                  key={source.source_key}
                  className="grid gap-3 rounded-xl border bg-white p-4 lg:grid-cols-[minmax(220px,1.4fr)_180px_160px_140px]"
                >
                  <div>
                    <div className="font-semibold">{source.label}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{source.source_key}</Badge>
                      <span>{source.family}</span>
                      <span>{source.connector_mode}</span>
                      <span>{source.operational_state}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Niveau par défaut</Label>
                    <Select
                      value={draft.level}
                      onValueChange={(value) =>
                        setDrafts((current) => ({
                          ...current,
                          [source.source_key]: { ...draft, level: value as Level },
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level} · {policyMap[level]?.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Poids confiance 0–1</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={draft.trust}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [source.source_key]: { ...draft, trust: event.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="w-full"
                      disabled={busy === source.source_key}
                      onClick={() => void save(source)}
                    >
                      {busy === source.source_key ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
