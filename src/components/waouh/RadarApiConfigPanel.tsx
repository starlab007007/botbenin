import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  TestTube2,
} from "lucide-react";
import { toast } from "sonner";
import { syncNexusSource } from "@/lib/waouh/nexus";

type ProviderId =
  | "serpapi"
  | "apify"
  | "firecrawl"
  | "google_places"
  | "facebook_business"
  | "instagram_business"
  | "telegram_public"
  | "tiktok_connected"
  | "whatsapp_groups"
  | "sms_rcs";

type RadarApiConfig = {
  id: string;
  provider: ProviderId;
  source_key: string | null;
  label: string | null;
  auth_mode: string | null;
  base_url: string | null;
  docs_url: string | null;
  active: boolean;
  daily_quota: number;
  usage_today: number;
  usage_reset_at: string;
  last_test_at: string | null;
  last_test_status: string | null;
  last_test_message: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  extra_config: Record<string, unknown> | null;
  has_key: boolean;
  configured: boolean;
  runtime?: Record<string, unknown> | null;
};

type Draft = {
  secret: string;
  dailyQuota: number;
  show: boolean;
  editing: boolean;
  values: Record<string, string>;
};

type FieldDef = {
  key: string;
  label: string;
  placeholder: string;
  array?: boolean;
};

type ProviderMeta = {
  label: string;
  help: string;
  secretLabel?: string;
  secretHelp?: string;
  keyRequired: boolean;
  native?: boolean;
  fields?: FieldDef[];
  actionHref?: string;
  actionLabel?: string;
};

const ORDER: ProviderId[] = [
  "serpapi",
  "apify",
  "firecrawl",
  "google_places",
  "facebook_business",
  "instagram_business",
  "telegram_public",
  "tiktok_connected",
  "whatsapp_groups",
  "sms_rcs",
];

const META: Record<ProviderId, ProviderMeta> = {
  serpapi: {
    label: "SerpAPI · Web public",
    help: "Recherche Google/Web : annonces, achats, ventes, services, annuaires et pages sociales publiques.",
    secretLabel: "Clé API SerpAPI",
    secretHelp: "serpapi.com/manage-api-key",
    keyRequired: true,
  },
  apify: {
    label: "Apify · Web social public",
    help: "Collecte des sources Facebook Marketplace/groupes publics explicitement ajoutées au Radar.",
    secretLabel: "Token Apify",
    secretHelp: "console.apify.com/account/integrations",
    keyRequired: true,
    fields: [
      { key: "fb_marketplace_actor", label: "Actor Marketplace (optionnel)", placeholder: "apify~facebook-marketplace-scraper" },
      { key: "fb_group_actor", label: "Actor groupes publics (optionnel)", placeholder: "apify~facebook-groups-scraper" },
    ],
  },
  firecrawl: {
    label: "Firecrawl · Sites Web",
    help: "Collecte des sites publics ajoutés dans Sources.",
    secretLabel: "Clé Firecrawl",
    secretHelp: "Configuration Firecrawl",
    keyRequired: true,
  },
  google_places: {
    label: "Google Places / Maps",
    help: "Entreprises, boutiques et services : téléphone public, site, carte, géolocalisation et photos.",
    secretLabel: "Clé Google Places API",
    secretHelp: "Google Cloud Console · Places API (New)",
    keyRequired: true,
  },
  facebook_business: {
    label: "Facebook Business / Pages",
    help: "Pages Business autorisées via Graph API. Les groupes privés ne sont pas parcourus.",
    secretLabel: "Access token Meta",
    secretHelp: "Token autorisé pour les Pages concernées",
    keyRequired: true,
    fields: [
      { key: "page_ids", label: "Page IDs autorisées", placeholder: "123..., 456...", array: true },
    ],
  },
  instagram_business: {
    label: "Instagram Business",
    help: "Médias des comptes Business explicitement connectés, avec photo/miniature et légende commerciale.",
    secretLabel: "Access token Meta / Instagram",
    secretHelp: "Token autorisé pour Instagram Business",
    keyRequired: true,
    fields: [
      { key: "account_ids", label: "Instagram Business Account IDs", placeholder: "1784..., 1784...", array: true },
    ],
  },
  telegram_public: {
    label: "Telegram public / Bot",
    help: "Canaux/groupes où le bot WAOUH a été ajouté et que l’admin place en liste autorisée.",
    secretLabel: "Bot token Telegram",
    secretHelp: "BotFather · token du bot WAOUH",
    keyRequired: true,
    fields: [
      { key: "chat_ids", label: "Chats/canaux autorisés", placeholder: "-100..., @canal_public", array: true },
    ],
  },
  tiktok_connected: {
    label: "TikTok connecté",
    help: "Vidéos du compte TikTok explicitement connecté via Display API ; couverture, lien et description.",
    secretLabel: "Access token TikTok",
    secretHelp: "OAuth TikTok · scopes user.info.basic + video.list",
    keyRequired: true,
  },
  whatsapp_groups: {
    label: "WhatsApp · groupes autorisés",
    help: "Messages reçus via WAHA uniquement pour les groupes ajoutés explicitement dans l’onglet Sources.",
    keyRequired: false,
    native: true,
  },
  sms_rcs: {
    label: "SMS / RCS WAOUH",
    help: "Canal natif existant : réception, consentement, normalisation +22901XXXXXXXX et routage WAOUH.",
    keyRequired: false,
    native: true,
    actionHref: "/admin/waouh/native-messaging",
    actionLabel: "Configurer SMS / RCS",
  },
};

const placeholder = (provider: ProviderId): RadarApiConfig => ({
  id: provider,
  provider,
  source_key: provider,
  label: META[provider].label,
  auth_mode: META[provider].native ? "native" : "api_key",
  base_url: null,
  docs_url: null,
  active: provider === "whatsapp_groups",
  daily_quota: META[provider].native ? 0 : 500,
  usage_today: 0,
  usage_reset_at: new Date().toISOString(),
  last_test_at: null,
  last_test_status: null,
  last_test_message: null,
  last_sync_at: null,
  last_sync_status: null,
  last_sync_message: null,
  extra_config: {},
  has_key: false,
  configured: false,
});

const extraToDraft = (cfg: RadarApiConfig) => {
  const fields = META[cfg.provider].fields || [];
  return Object.fromEntries(fields.map((field) => {
    const raw = cfg.extra_config?.[field.key];
    const text = Array.isArray(raw) ? raw.join(", ") : String(raw ?? "");
    return [field.key, text];
  }));
};

const draftToExtra = (provider: ProviderId, values: Record<string, string>) => {
  const out: Record<string, unknown> = {};
  for (const field of META[provider].fields || []) {
    const raw = String(values[field.key] || "").trim();
    out[field.key] = field.array
      ? raw.split(",").map((item) => item.trim()).filter(Boolean)
      : raw;
  }
  return out;
};

const errorMessage = async (error: any, fallback: string) => {
  const response = error?.context as Response | undefined;
  if (response && typeof response.clone === "function") {
    try {
      const payload = await response.clone().json();
      if (payload?.error) return String(payload.error);
      if (payload?.message) return String(payload.message);
    } catch {}
  }
  return error?.message || fallback;
};

export default function RadarApiConfigPanel() {
  const [configs, setConfigs] = useState<RadarApiConfig[]>([]);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const byProvider = useMemo(
    () => new Map(configs.map((item) => [item.provider, item])),
    [configs],
  );

  const applyConfigs = (incoming: RadarApiConfig[]) => {
    const merged = ORDER.map((provider) => incoming.find((c) => c.provider === provider) || placeholder(provider));
    setConfigs(merged);
    setDraft(Object.fromEntries(merged.map((cfg) => [
      cfg.provider,
      {
        secret: "",
        dailyQuota: cfg.daily_quota,
        show: false,
        editing: !cfg.has_key,
        values: extraToDraft(cfg),
      } satisfies Draft,
    ])));
  };

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.functions.invoke("waouh-radar-api-config", {
      body: { action: "list" },
    });
    setLoading(false);
    if (error) {
      setLoadError(await errorMessage(error, "Impossible de charger les connecteurs NEXUS."));
      applyConfigs([]);
      return;
    }
    if ((data as any)?.error) {
      setLoadError(String((data as any).error));
      applyConfigs([]);
      return;
    }
    applyConfigs(((data as any)?.configs || []) as RadarApiConfig[]);
  };

  useEffect(() => { void load(); }, []);

  const invoke = async (provider: ProviderId, body: Record<string, unknown>, success?: string) => {
    setErrors((prev) => ({ ...prev, [provider]: null }));
    const { data, error } = await supabase.functions.invoke("waouh-radar-api-config", { body });
    if (error) {
      const message = await errorMessage(error, "Action connecteur impossible.");
      setErrors((prev) => ({ ...prev, [provider]: message }));
      toast.error(message);
      return null;
    }
    if ((data as any)?.error) {
      const message = String((data as any).error);
      setErrors((prev) => ({ ...prev, [provider]: message }));
      toast.error(message);
      return null;
    }
    if (success) toast.success(success);
    return data as any;
  };

  const save = async (provider: ProviderId) => {
    const cfg = byProvider.get(provider) || placeholder(provider);
    const d = draft[provider];
    const meta = META[provider];
    if (meta.keyRequired && !cfg.has_key && !d?.secret.trim()) {
      setErrors((prev) => ({ ...prev, [provider]: "Renseignez le secret/token avant d’enregistrer." }));
      return;
    }
    setBusy(`${provider}:save`);
    const result = await invoke(provider, {
      action: "upsert",
      provider,
      api_key: d?.secret.trim() || undefined,
      daily_quota: d?.dailyQuota ?? cfg.daily_quota,
      extra_config: draftToExtra(provider, d?.values || {}),
    }, "Configuration NEXUS enregistrée");
    setBusy(null);
    if (result) await load();
  };

  const toggle = async (provider: ProviderId, active: boolean) => {
    setBusy(`${provider}:toggle`);
    const result = await invoke(provider, { action: "toggle", provider, active }, active ? "Connecteur activé" : "Connecteur désactivé");
    setBusy(null);
    if (result) await load();
  };

  const test = async (provider: ProviderId) => {
    const d = draft[provider];
    setBusy(`${provider}:test`);
    const result = await invoke(provider, {
      action: "test",
      provider,
      api_key: d?.secret.trim() || undefined,
      extra_config: draftToExtra(provider, d?.values || {}),
    });
    setBusy(null);
    if (result?.ok) toast.success(`✓ ${result.message}`);
    else if (result?.message) toast.error(String(result.message));
    await load();
  };

  const resetQuota = async (provider: ProviderId) => {
    await invoke(provider, { action: "reset_quota", provider }, "Quota remis à zéro");
    await load();
  };

  const collectNow = async (provider: ProviderId) => {
    const d = draft[provider];
    const query = String(d?.values?.default_query || "commerce").trim() || "commerce";
    const city = String(d?.values?.city || "").trim() || undefined;
    setBusy(`${provider}:collect`);
    try {
      const result = await syncNexusSource({
        provider,
        query,
        city,
        mode: "find_sellers",
        limit: 15,
      });
      if (result.push_mode) {
        toast.success(provider === "whatsapp_groups"
          ? `Collecte temps réel active · ${result.active_group_count ?? 0} groupe(s) autorisé(s)`
          : "Canal entrant actif : collecte à la réception");
      } else if (!result.configured) {
        toast.error(result.reason || "Connecteur à configurer");
      } else {
        toast.success(`${result.inserted ?? 0} signal(aux) intégré(s) dans NEXUS`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Collecte NEXUS impossible");
    } finally {
      setBusy(null);
      await load();
    }
  };

  return (
    <Card className="p-4 border-cyan-500/25">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-cyan-600" />
            NEXUS · Connecteurs & sources
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
            Un seul centre Admin pour SerpAPI, Apify, Maps, Facebook/Instagram Business,
            Telegram, TikTok, WhatsApp et SMS/RCS. Les secrets restent côté serveur.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
          Recharger
        </Button>
      </div>

      <Alert className="my-3 border-emerald-500/25 bg-emerald-500/5">
        <KeyRound className="w-4 h-4" />
        <AlertTitle>Collecte contrôlée</AlertTitle>
        <AlertDescription className="text-xs">
          WAOUH collecte les sources publiques, Business ou explicitement autorisées.
          Les groupes WhatsApp/Telegram et les actifs sociaux privés ne sont jamais parcourus sans connexion/autorisation.
        </AlertDescription>
      </Alert>

      {loadError && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Configuration indisponible</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-3">
        {configs.map((cfg) => {
          const meta = META[cfg.provider];
          const d = draft[cfg.provider] || {
            secret: "", dailyQuota: cfg.daily_quota, show: false, editing: !cfg.has_key, values: {},
          };
          const pct = cfg.daily_quota > 0 ? Math.round((cfg.usage_today / cfg.daily_quota) * 100) : 0;
          const error = errors[cfg.provider];
          const isNativeSms = cfg.provider === "sms_rcs";
          return (
            <Card key={cfg.provider} className={`p-3 space-y-3 ${cfg.configured ? "border-emerald-500/40" : "border-amber-500/30"}`}>
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium flex gap-2 items-center flex-wrap">
                    {meta.label}
                    <Badge variant="outline" className={cfg.configured ? "text-emerald-700 border-emerald-500/40" : "text-amber-700 border-amber-500/40"}>
                      {cfg.configured ? <><CheckCircle2 className="w-3 h-3 mr-1" />Prêt</> : "À configurer"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{meta.help}</p>
                </div>
                {!isNativeSms && (
                  <Switch
                    checked={cfg.active}
                    onCheckedChange={(value) => void toggle(cfg.provider, value)}
                    disabled={busy === `${cfg.provider}:toggle`}
                    aria-label={`Activer ${meta.label}`}
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {cfg.daily_quota > 0 && (
                  <Badge variant={pct >= 80 ? "destructive" : "secondary"} className="text-[10px]">
                    {cfg.usage_today}/{cfg.daily_quota} · {pct}%
                  </Badge>
                )}
                {cfg.last_test_status && (
                  <Badge variant={cfg.last_test_status === "ok" ? "default" : "destructive"} className="text-[10px]">
                    test {cfg.last_test_status.toUpperCase()}
                  </Badge>
                )}
                {cfg.last_sync_status && (
                  <Badge variant="outline" className="text-[10px]">
                    collecte {cfg.last_sync_status}
                  </Badge>
                )}
              </div>

              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {meta.keyRequired && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{meta.secretLabel}</Label>
                  {cfg.has_key && !d.editing ? (
                    <div className="flex gap-1">
                      <Input disabled value="•••••••••••• (secret serveur)" className="text-xs font-mono" />
                      <Button size="sm" variant="outline" onClick={() => setDraft((prev) => ({
                        ...prev, [cfg.provider]: { ...d, editing: true },
                      }))}>Changer</Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Input
                        type={d.show ? "text" : "password"}
                        value={d.secret}
                        placeholder="Coller le secret/token"
                        onChange={(event) => setDraft((prev) => ({
                          ...prev,
                          [cfg.provider]: { ...d, secret: event.target.value },
                        }))}
                      />
                      <Button size="icon" variant="outline" onClick={() => setDraft((prev) => ({
                        ...prev, [cfg.provider]: { ...d, show: !d.show },
                      }))}>
                        {d.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                  {meta.secretHelp && <p className="text-[10px] text-muted-foreground">{meta.secretHelp}</p>}
                </div>
              )}

              {(meta.fields || []).map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    value={d.values[field.key] || ""}
                    placeholder={field.placeholder}
                    onChange={(event) => setDraft((prev) => ({
                      ...prev,
                      [cfg.provider]: {
                        ...d,
                        values: { ...d.values, [field.key]: event.target.value },
                      },
                    }))}
                  />
                </div>
              ))}

              {!meta.native && (
                <div className="space-y-1">
                  <Label className="text-xs">Quota journalier</Label>
                  <Input
                    type="number"
                    min={0}
                    value={d.dailyQuota}
                    onChange={(event) => setDraft((prev) => ({
                      ...prev,
                      [cfg.provider]: { ...d, dailyQuota: Number(event.target.value || 0) },
                    }))}
                  />
                </div>
              )}

              {meta.actionHref && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => { window.location.href = meta.actionHref!; }}>
                  <Settings2 className="w-3.5 h-3.5 mr-1" />
                  {meta.actionLabel}
                </Button>
              )}

              <div className="flex flex-wrap gap-1.5">
                {!meta.native && (
                  <Button size="sm" onClick={() => void save(cfg.provider)} disabled={busy === `${cfg.provider}:save`}>
                    {busy === `${cfg.provider}:save` ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Enregistrer
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => void test(cfg.provider)} disabled={busy === `${cfg.provider}:test`}>
                  {busy === `${cfg.provider}:test` ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5 mr-1" />}
                  Tester
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void collectNow(cfg.provider)}
                  disabled={busy === `${cfg.provider}:collect` || (!cfg.configured && !meta.native)}
                >
                  {busy === `${cfg.provider}:collect`
                    ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                  {meta.native ? "État collecte" : "Collecter"}
                </Button>
                {!meta.native && (
                  <Button size="sm" variant="ghost" onClick={() => void resetQuota(cfg.provider)}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Quota
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
