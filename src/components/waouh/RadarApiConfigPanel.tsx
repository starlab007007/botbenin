import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, RotateCcw, Save, TestTube2, KeyRound, AlertCircle, CheckCircle2, RefreshCw, Power } from "lucide-react";
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

const META: Record<string, { label: string; help: string; where: string }> = {
  serpapi: {
    label: "SerpAPI",
    help: "Scout d'annonces publiques BJ via Google.",
    where: "Récupérez la clé sur https://serpapi.com/manage-api-key",
  },
  apify: {
    label: "Apify",
    help: "Scraping Facebook Marketplace + groupes.",
    where: "Récupérez le token sur https://console.apify.com/account/integrations",
  },
};

const PROVIDERS: Array<"serpapi" | "apify"> = ["serpapi", "apify"];

const placeholderConfig = (provider: "serpapi" | "apify"): RadarApiConfig => ({
  id: provider,
  provider,
  api_key: null,
  active: false,
  daily_quota: provider === "serpapi" ? 1000 : 500,
  usage_today: 0,
  usage_reset_at: new Date().toISOString(),
  last_test_at: null,
  last_test_status: null,
  last_test_message: null,
});

export default function RadarApiConfigPanel() {
  const [configs, setConfigs] = useState<RadarApiConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { api_key: string; daily_quota: number; show: boolean; editing: boolean }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [errorByProvider, setErrorByProvider] = useState<Record<string, string | null>>({});

  const setProviderError = (provider: string, msg: string | null) =>
    setErrorByProvider((prev) => ({ ...prev, [provider]: msg }));

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.functions.invoke("waouh-radar-api-config", { body: { action: "list" } });
    setLoading(false);
    if (error) {
      setLoadError(error.message || "Impossible de charger la configuration");
      return;
    }
    const payloadErr = (data as any)?.error;
    if (payloadErr) {
      setLoadError(payloadErr);
      return;
    }
    const list: RadarApiConfig[] = (data as any)?.configs || [];
    // Ensure both providers are always visible
    const merged = PROVIDERS.map((p) => list.find((c) => c.provider === p) || placeholderConfig(p));
    setConfigs(merged);
    setDraft(Object.fromEntries(
      merged.map((c) => [c.provider, { api_key: "", daily_quota: c.daily_quota, show: false, editing: !c.api_key }]),
    ));
  };

  useEffect(() => { load(); }, []);

  const handleInvoke = async (provider: string, body: any, successMsg?: string) => {
    setProviderError(provider, null);
    const { data, error } = await supabase.functions.invoke("waouh-radar-api-config", { body });
    if (error) {
      setProviderError(provider, error.message);
      toast.error(error.message);
      return null;
    }
    const payloadErr = (data as any)?.error;
    if (payloadErr) {
      setProviderError(provider, payloadErr);
      toast.error(payloadErr);
      return null;
    }
    if (successMsg) toast.success(successMsg);
    return data;
  };

  const save = async (provider: string) => {
    const d = draft[provider];
    if (!d.api_key && !configs.find((c) => c.provider === provider)?.api_key) {
      setProviderError(provider, "Collez d'abord une clé API");
      return;
    }
    setBusy(provider);
    const ok = await handleInvoke(provider, { action: "upsert", provider, api_key: d.api_key || undefined, daily_quota: d.daily_quota }, "Configuration enregistrée");
    setBusy(null);
    if (ok) {
      setDraft((prev) => ({ ...prev, [provider]: { ...prev[provider], api_key: "", editing: false } }));
      load();
    }
  };

  const toggle = async (provider: string, active: boolean) => {
    const cfg = configs.find((c) => c.provider === provider);
    if (active && !cfg?.api_key && !draft[provider]?.api_key) {
      setProviderError(provider, "Enregistrez d'abord une clé API avant d'activer");
      toast.error("Clé API requise avant activation");
      return;
    }
    const ok = await handleInvoke(provider, { action: "toggle", provider, active }, active ? "Provider activé" : "Provider désactivé");
    if (ok) load();
  };

  const test = async (provider: string) => {
    setBusy(provider + "-test");
    const d = draft[provider];
    const data = await handleInvoke(provider, { action: "test", provider, api_key: d.api_key || undefined });
    setBusy(null);
    if (data) {
      const r: any = data;
      if (r.ok) toast.success(`✓ ${r.message} (${r.latency_ms}ms)`);
      else { toast.error(`✗ ${r.message}`); setProviderError(provider, r.message); }
      load();
    }
  };

  const resetQuota = async (provider: string) => {
    const ok = await handleInvoke(provider, { action: "reset_quota", provider }, "Quota remis à zéro");
    if (ok) load();
  };

  return (
    <Card className="p-4 border-amber-500/30">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-500" /> Configuration API Radar
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Collez une clé → Enregistrez → Activez → Testez. Les scans Radar IA n'utilisent que les providers actifs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Recharger
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Chargement impossible</AlertTitle>
          <AlertDescription>
            {loadError}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={load}>Réessayer</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {configs.map((c) => {
          const d = draft[c.provider] || { api_key: "", daily_quota: c.daily_quota, show: false, editing: !c.api_key };
          const pct = c.daily_quota > 0 ? Math.round((c.usage_today / c.daily_quota) * 100) : 0;
          const warn = pct >= 80;
          const hasKey = !!c.api_key;
          const fullyReady = hasKey && c.active;
          const err = errorByProvider[c.provider];
          const meta = META[c.provider];
          return (
            <Card key={c.provider} className={`p-3 space-y-3 ${fullyReady ? "border-emerald-500/40" : !hasKey ? "border-amber-500/40" : "border-border"}`}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {meta?.label || c.provider}
                    {fullyReady ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px]">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Actif
                      </Badge>
                    ) : !hasKey ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/40 text-[10px]">
                        <AlertCircle className="w-3 h-3 mr-1" /> Non configuré
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Désactivé</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{meta?.help}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Power className={`w-3.5 h-3.5 ${c.active ? "text-emerald-500" : "text-muted-foreground"}`} />
                  <Switch checked={c.active} onCheckedChange={(v) => toggle(c.provider, v)} aria-label="Activer le provider" />
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant={warn ? "destructive" : "outline"} className="text-[10px]">
                  Quota: {c.usage_today}/{c.daily_quota} ({pct}%)
                </Badge>
                {c.last_test_status && (
                  <Badge variant={c.last_test_status === "ok" ? "default" : "destructive"} className="text-[10px]">
                    Dernier test: {c.last_test_status === "ok" ? "OK" : "KO"}
                  </Badge>
                )}
              </div>
              {c.last_test_message && (
                <div className="text-[11px] text-muted-foreground truncate" title={c.last_test_message}>
                  {c.last_test_at ? new Date(c.last_test_at).toLocaleString("fr-FR") : ""} — {c.last_test_message}
                </div>
              )}

              {/* Error */}
              {err && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">{err}</AlertDescription>
                </Alert>
              )}

              {/* Step 1: API key */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  1. Clé API {hasKey && !d.editing && <span className="text-emerald-600">(configurée)</span>}
                </Label>
                {hasKey && !d.editing ? (
                  <div className="flex gap-1">
                    <Input value="•••••••••••••••• (clé enregistrée)" disabled className="font-mono text-xs" />
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setDraft({ ...draft, [c.provider]: { ...d, editing: true } })}
                    >
                      Changer
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-1">
                      <Input
                        type={d.show ? "text" : "password"}
                        placeholder={`Coller la clé ${meta?.label}`}
                        value={d.api_key}
                        onChange={(e) => setDraft({ ...draft, [c.provider]: { ...d, api_key: e.target.value } })}
                      />
                      <Button variant="outline" size="icon" onClick={() => setDraft({ ...draft, [c.provider]: { ...d, show: !d.show } })}>
                        {d.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{meta?.where}</p>
                  </>
                )}
              </div>

              {/* Step 2: Quota */}
              <div>
                <Label className="text-xs font-medium">2. Quota journalier (requêtes)</Label>
                <Input
                  type="number"
                  min={0}
                  value={d.daily_quota}
                  onChange={(e) => setDraft({ ...draft, [c.provider]: { ...d, daily_quota: parseInt(e.target.value || "0", 10) } })}
                />
              </div>

              {/* Step 3: Actions */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">3. Actions</Label>
                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" onClick={() => save(c.provider)} disabled={busy === c.provider}>
                    {busy === c.provider ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => test(c.provider)} disabled={busy === c.provider + "-test" || (!hasKey && !d.api_key)}>
                    {busy === c.provider + "-test" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <TestTube2 className="w-3.5 h-3.5 mr-1" />}
                    Tester
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => resetQuota(c.provider)}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset quota
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
