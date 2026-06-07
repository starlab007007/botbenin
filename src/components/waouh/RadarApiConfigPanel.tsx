import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, RotateCcw, Save, TestTube2, KeyRound } from "lucide-react";
import { toast } from "sonner";

type RadarApiConfig = {
  id: string;
  provider: "serpapi" | "apify";
  api_key: string | null;
  active: boolean;
  daily_quota: number;
  usage_today: number;
  usage_reset_at: string;
  last_test_at: string | null;
  last_test_status: string | null;
  last_test_message: string | null;
};

const META: Record<string, { label: string; help: string }> = {
  serpapi: { label: "SerpAPI", help: "Clé Google SerpAPI utilisée pour le scout d'annonces publiques BJ." },
  apify: { label: "Apify", help: "Token Apify utilisé pour scraper Facebook Marketplace + groupes." },
};

export default function RadarApiConfigPanel() {
  const [configs, setConfigs] = useState<RadarApiConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Record<string, { api_key: string; daily_quota: number; show: boolean }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("waouh-radar-api-config", { body: { action: "list" } });
    setLoading(false);
    if (error) return toast.error(error.message);
    const list: RadarApiConfig[] = (data as any)?.configs || [];
    setConfigs(list);
    setDraft(Object.fromEntries(list.map((c) => [c.provider, { api_key: "", daily_quota: c.daily_quota, show: false }])));
  };

  useEffect(() => { load(); }, []);

  const save = async (provider: string) => {
    setBusy(provider);
    const d = draft[provider];
    const { error } = await supabase.functions.invoke("waouh-radar-api-config", {
      body: { action: "upsert", provider, api_key: d.api_key || undefined, daily_quota: d.daily_quota },
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Configuration enregistrée");
    load();
  };

  const toggle = async (provider: string, active: boolean) => {
    const { error } = await supabase.functions.invoke("waouh-radar-api-config", { body: { action: "toggle", provider, active } });
    if (error) return toast.error(error.message);
    load();
  };

  const test = async (provider: string) => {
    setBusy(provider + "-test");
    const d = draft[provider];
    const { data, error } = await supabase.functions.invoke("waouh-radar-api-config", {
      body: { action: "test", provider, api_key: d.api_key || undefined },
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    const r: any = data;
    if (r.ok) toast.success(`✓ ${r.message} (${r.latency_ms}ms)`);
    else toast.error(`✗ ${r.message}`);
    load();
  };

  const resetQuota = async (provider: string) => {
    await supabase.functions.invoke("waouh-radar-api-config", { body: { action: "reset_quota", provider } });
    toast.success("Quota remis à zéro");
    load();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-amber-500" /> Configuration API Radar</h3>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {configs.map((c) => {
          const d = draft[c.provider] || { api_key: "", daily_quota: c.daily_quota, show: false };
          const pct = c.daily_quota > 0 ? Math.round((c.usage_today / c.daily_quota) * 100) : 0;
          const warn = pct >= 80;
          return (
            <Card key={c.provider} className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{META[c.provider]?.label || c.provider}</div>
                  <div className="text-[11px] text-muted-foreground">{META[c.provider]?.help}</div>
                </div>
                <Switch checked={c.active} onCheckedChange={(v) => toggle(c.provider, v)} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "actif" : "désactivé"}</Badge>
                <Badge variant={warn ? "destructive" : "outline"}>{c.usage_today} / {c.daily_quota} req · {pct}%</Badge>
                {c.last_test_status && (
                  <Badge variant={c.last_test_status === "ok" ? "default" : "destructive"}>
                    {c.last_test_status === "ok" ? "test OK" : "test KO"}
                  </Badge>
                )}
              </div>
              {c.last_test_message && (
                <div className="text-[11px] text-muted-foreground truncate" title={c.last_test_message}>
                  {c.last_test_at ? new Date(c.last_test_at).toLocaleString("fr-FR") : ""} — {c.last_test_message}
                </div>
              )}
              <div>
                <Label className="text-xs">Clé API {c.api_key ? "(remplir uniquement pour changer)" : ""}</Label>
                <div className="flex gap-1 mt-1">
                  <Input
                    type={d.show ? "text" : "password"}
                    placeholder={c.api_key ? "•••••••• (clé existante)" : "Coller la clé"}
                    value={d.api_key}
                    onChange={(e) => setDraft({ ...draft, [c.provider]: { ...d, api_key: e.target.value } })}
                  />
                  <Button variant="outline" size="icon" onClick={() => setDraft({ ...draft, [c.provider]: { ...d, show: !d.show } })}>
                    {d.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Quota journalier</Label>
                <Input
                  type="number"
                  min={0}
                  value={d.daily_quota}
                  onChange={(e) => setDraft({ ...draft, [c.provider]: { ...d, daily_quota: parseInt(e.target.value || "0", 10) } })}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => save(c.provider)} disabled={busy === c.provider}>
                  {busy === c.provider ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Enregistrer
                </Button>
                <Button size="sm" variant="outline" onClick={() => test(c.provider)} disabled={busy === c.provider + "-test"}>
                  {busy === c.provider + "-test" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <TestTube2 className="w-3.5 h-3.5 mr-1" />}
                  Tester
                </Button>
                <Button size="sm" variant="ghost" onClick={() => resetQuota(c.provider)}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset quota
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
