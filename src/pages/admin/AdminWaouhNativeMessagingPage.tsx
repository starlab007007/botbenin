import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  MessagesSquare,
  KeyRound,
  Radio,
  RefreshCw,
  Send,
  Save,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  buildSmsUri,
  coerceNativeMessagingSettings,
  DEFAULT_NATIVE_MESSAGING_SETTINGS,
  formatBeninPhone,
  isValidBeninPhone,
  normalizeBeninPhone,
  validateNativeMessagingSettings,
  type WaouhNativeMessagingProvider,
  type WaouhNativeMessagingSettings,
} from "@/lib/waouh/nativeMessagingSettings";
import { WAOUH_RUNTIME_ENDPOINTS } from "@/lib/waouh/runtimeEndpoints";

const providerLabels: Record<WaouhNativeMessagingProvider, string> = {
  not_configured: "À configurer",
  infobip: "Infobip",
  test: "Simulation locale",
};

type RuntimeReadiness = {
  phone_encryption_ready: boolean;
  phone_hash_ready: boolean;
  webhook_ready: boolean;
  internal_secret_ready: boolean;
  infobip_base_url_ready: boolean;
  infobip_api_key_ready: boolean;
  provider_ready: boolean;
  retry_worker_ready: boolean;
  runtime_ready: boolean;
};

const EMPTY_RUNTIME_READINESS: RuntimeReadiness = {
  phone_encryption_ready: false,
  phone_hash_ready: false,
  webhook_ready: false,
  internal_secret_ready: false,
  infobip_base_url_ready: false,
  infobip_api_key_ready: false,
  provider_ready: false,
  retry_worker_ready: false,
  runtime_ready: false,
};

const SUPABASE_FUNCTIONS_BASE =
  "https://mvynepqulhflxtyymtzs.supabase.co/functions/v1";
const NATIVE_INGRESS_URL =
  `${SUPABASE_FUNCTIONS_BASE}/waouh-studio-pair-code-v2145`;
const NATIVE_RECEIPTS_URL =
  `${SUPABASE_FUNCTIONS_BASE}/waouh-studio-agent-webhook-v2146`;

function currentSmsPlatform(): "android" | "ios" {
  if (typeof navigator === "undefined") return "android";
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isAppleMobile ? "ios" : "android";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function readFunctionFailure(
  data: unknown,
  error: unknown,
  fallback: string,
): Promise<{ message: string; runtime?: Partial<RuntimeReadiness> }> {
  let payload = asRecord(data);
  const errorRecord = asRecord(error);
  const context = errorRecord?.context;
  if (!payload && typeof Response !== "undefined" && context instanceof Response) {
    payload = asRecord(await context.clone().json().catch(() => null));
  }
  const runtime = asRecord(payload?.runtime) as Partial<RuntimeReadiness> | null;
  const payloadError = payload?.error;
  const nestedError = asRecord(payloadError);
  const message = typeof payloadError === "string"
    ? payloadError
    : typeof nestedError?.message === "string"
      ? nestedError.message
      : typeof errorRecord?.message === "string"
        ? errorRecord.message
        : fallback;
  return { message, ...(runtime ? { runtime } : {}) };
}

type EditableKey =
  | "business_phone_e164"
  | "rcs_sender_name"
  | "provider"
  | "enabled"
  | "sms_enabled"
  | "rcs_enabled"
  | "fallback_to_sms"
  | "virtual_groups_enabled";

export default function AdminWaouhNativeMessagingPage() {
  const [settings, setSettings] = useState<WaouhNativeMessagingSettings>(
    DEFAULT_NATIVE_MESSAGING_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeReadiness>(EMPTY_RUNTIME_READINESS);
  const [infobipBaseUrl, setInfobipBaseUrl] = useState("");
  const [infobipApiKey, setInfobipApiKey] = useState("");
  const [providerSaving, setProviderSaving] = useState(false);
  const [webhookSecretOnce, setWebhookSecretOnce] = useState("");
  const [rotatingWebhook, setRotatingWebhook] = useState(false);
  const [testDestination, setTestDestination] = useState("");
  const [testConsent, setTestConsent] = useState(false);
  const [testSending, setTestSending] = useState<"sms" | "rcs" | null>(null);

  const update = <K extends EditableKey>(
    key: K,
    value: WaouhNativeMessagingSettings[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      WAOUH_RUNTIME_ENDPOINTS.nativeMessagingSettings,
      { body: { action: "get" } },
    );
    if (error || !data?.ok) {
      const failure = await readFunctionFailure(
        data,
        error,
        "Impossible de charger les paramètres.",
      );
      if (failure.runtime) {
        setRuntime({ ...EMPTY_RUNTIME_READINESS, ...failure.runtime });
      }
      toast.error(failure.message);
    } else {
      setSettings(coerceNativeMessagingSettings(data.data));
      setRuntime({ ...EMPTY_RUNTIME_READINESS, ...(data.runtime || {}) });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const normalizedPhone = normalizeBeninPhone(settings.business_phone_e164);
  const phoneIsValid = isValidBeninPhone(normalizedPhone);
  const smsUri = useMemo(
    () => buildSmsUri(normalizedPhone, "BONJOUR WAOUH", currentSmsPlatform()),
    [normalizedPhone],
  );
  const validationErrors = validateNativeMessagingSettings(settings);
  const runtimeBlocksActivation = settings.enabled && !runtime.runtime_ready;

  const saveSettings = async () => {
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke(
      WAOUH_RUNTIME_ENDPOINTS.nativeMessagingSettings,
      {
        body: {
          action: "save",
          settings: {
            business_phone_e164: normalizedPhone,
            rcs_sender_name: settings.rcs_sender_name.trim(),
            provider: settings.provider,
            enabled: settings.enabled,
            sms_enabled: settings.sms_enabled,
            rcs_enabled: settings.rcs_enabled,
            fallback_to_sms: settings.fallback_to_sms,
            virtual_groups_enabled: settings.virtual_groups_enabled,
          },
        },
      },
    );
    if (error || !data?.ok) {
      const failure = await readFunctionFailure(
        data,
        error,
        "Enregistrement impossible.",
      );
      if (failure.runtime) {
        setRuntime({ ...EMPTY_RUNTIME_READINESS, ...failure.runtime });
      }
      toast.error(failure.message);
    } else {
      setSettings(coerceNativeMessagingSettings(data.data));
      setRuntime({ ...EMPTY_RUNTIME_READINESS, ...(data.runtime || {}) });
      toast.success("Paramètres Native Messaging enregistrés.");
    }
    setSaving(false);
  };

  const configureInfobip = async () => {
    if (!infobipBaseUrl.trim() && !infobipApiKey.trim()) {
      toast.error("Renseignez l’URL Infobip ou la clé API.");
      return;
    }
    setProviderSaving(true);
    const { data, error } = await supabase.functions.invoke(
      WAOUH_RUNTIME_ENDPOINTS.nativeMessagingSettings,
      {
        body: {
          action: "configure_provider",
          base_url: infobipBaseUrl.trim(),
          api_key: infobipApiKey.trim(),
        },
      },
    );
    if (error || !data?.ok) {
      const failure = await readFunctionFailure(
        data,
        error,
        "Configuration Infobip impossible.",
      );
      toast.error(failure.message);
    } else {
      setRuntime({ ...EMPTY_RUNTIME_READINESS, ...(data.runtime || {}) });
      setInfobipApiKey("");
      toast.success("Configuration Infobip enregistrée côté serveur.");
    }
    setProviderSaving(false);
  };

  const rotateWebhookSecret = async () => {
    setRotatingWebhook(true);
    const { data, error } = await supabase.functions.invoke(
      WAOUH_RUNTIME_ENDPOINTS.nativeMessagingSettings,
      { body: { action: "rotate_webhook_secret" } },
    );
    if (error || !data?.ok || typeof data.secret !== "string") {
      const failure = await readFunctionFailure(
        data,
        error,
        "Rotation du secret webhook impossible.",
      );
      toast.error(failure.message);
    } else {
      setWebhookSecretOnce(data.secret);
      toast.success("Nouveau secret webhook généré. Copiez-le maintenant.");
      await loadSettings();
    }
    setRotatingWebhook(false);
  };

  const sendRealTest = async (channel: "sms" | "rcs") => {
    if (!testConsent) {
      toast.error("Confirmez le consentement du numéro de test.");
      return;
    }
    setTestSending(channel);
    const { data, error } = await supabase.functions.invoke(
      WAOUH_RUNTIME_ENDPOINTS.nativeMessagingSettings,
      {
        body: {
          action: "test_send",
          channel,
          destination: testDestination.trim(),
          confirmed_consent: true,
        },
      },
    );
    if (error || !data?.ok) {
      const failure = await readFunctionFailure(
        data,
        error,
        `Échec du test réel ${channel.toUpperCase()}.`,
      );
      toast.error(failure.message);
    } else {
      toast.success(
        `${channel.toUpperCase()} accepté par Infobip · ID ${data.provider_message_id || "reçu"}`,
      );
    }
    setTestSending(null);
  };

  const copy = async (value: string, message: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("Le navigateur n’autorise pas la copie automatique.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" /> Chargement des paramètres…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-3">
              <Link
                to="/admin/waouh"
                className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Administration WAOUH
              </Link>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                  <MessagesSquare className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold md:text-3xl">WAOUH Native Messaging</h1>
                  <p className="mt-1 text-sm text-white/80">
                    Accès complémentaire par un simple numéro SMS ou RCS
                  </p>
                </div>
              </div>
            </div>
            <Badge className={settings.enabled
              ? "w-fit border-emerald-200/40 bg-emerald-300/20 px-3 py-1.5 text-white"
              : "w-fit border-white/25 bg-white/10 px-3 py-1.5 text-white/80"}
            >
              <span className={`mr-2 h-2 w-2 rounded-full ${settings.enabled ? "bg-emerald-200" : "bg-white/50"}`} />
              {settings.enabled ? "Service actif" : "Service arrêté"}
            </Badge>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-emerald-600" /> Numéro public
                </CardTitle>
                <CardDescription>
                  Numéro que les utilisateurs enregistrent puis contactent depuis Messages.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="business-phone">Numéro SMS/RCS du service</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="business-phone"
                      value={settings.business_phone_e164}
                      onChange={(event) => update("business_phone_e164", event.target.value)}
                      onBlur={() => update("business_phone_e164", normalizedPhone)}
                      placeholder="+22901XXXXXXXX"
                      inputMode="tel"
                      autoComplete="tel"
                      className={settings.business_phone_e164 && !phoneIsValid ? "border-red-400" : ""}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!phoneIsValid}
                      onClick={() => void copy(normalizedPhone, "Numéro copié.")}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Copier
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={phoneIsValid ? "text-emerald-700" : "text-slate-500"}>
                      {phoneIsValid ? `Format valide · ${formatBeninPhone(normalizedPhone)}` : "Format obligatoire : +22901XXXXXXXX"}
                    </span>
                    <Badge variant="outline">Indicatif verrouillé : +229</Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rcs-sender-name">Nom expéditeur RCS</Label>
                    <Input
                      id="rcs-sender-name"
                      maxLength={40}
                      value={settings.rcs_sender_name}
                      onChange={(event) => update("rcs_sender_name", event.target.value)}
                      placeholder="WAOUH"
                    />
                    <p className="text-xs text-slate-500">Nom public affiché dans les conversations enrichies.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Fournisseur télécom</Label>
                    <Select
                      value={settings.provider}
                      onValueChange={(value) => update("provider", value as WaouhNativeMessagingProvider)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(providerLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Les clés API sont configurées uniquement côté serveur.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-emerald-600" /> Connexion Infobip
                </CardTitle>
                <CardDescription>
                  Les identifiants sont chiffrés côté serveur et ne sont jamais relus dans le navigateur.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="infobip-base-url">Base URL Infobip</Label>
                    <Input
                      id="infobip-base-url"
                      value={infobipBaseUrl}
                      onChange={(event) => setInfobipBaseUrl(event.target.value)}
                      placeholder="https://xxxxx.api.infobip.com"
                      autoComplete="off"
                    />
                    <RuntimeCheck ready={runtime.infobip_base_url_ready} label="Base URL serveur" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="infobip-api-key">API key Infobip</Label>
                    <Input
                      id="infobip-api-key"
                      type="password"
                      value={infobipApiKey}
                      onChange={(event) => setInfobipApiKey(event.target.value)}
                      placeholder={runtime.infobip_api_key_ready ? "Clé déjà configurée · saisir uniquement pour remplacer" : "Clé API"}
                      autoComplete="new-password"
                    />
                    <RuntimeCheck ready={runtime.infobip_api_key_ready} label="API key serveur" />
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={providerSaving || (!infobipBaseUrl.trim() && !infobipApiKey.trim())}
                  onClick={() => void configureInfobip()}
                  className="bg-slate-950 text-white hover:bg-slate-800"
                >
                  {providerSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Enregistrer Infobip
                </Button>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Webhooks à configurer dans Infobip</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Utilisez ces URL pour les messages entrants et les accusés de livraison.
                    </p>
                  </div>
                  <EndpointRow label="Messages entrants SMS/RCS" value={NATIVE_INGRESS_URL} onCopy={() => void copy(NATIVE_INGRESS_URL, "URL ingress copiée.")} />
                  <EndpointRow label="Accusés / delivery receipts" value={NATIVE_RECEIPTS_URL} onCopy={() => void copy(NATIVE_RECEIPTS_URL, "URL receipts copiée.")} />

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-950">Secret de signature webhook</p>
                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      Générez-le puis copiez-le dans Infobip. Sa valeur n’est affichée qu’au moment de la rotation.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 border-amber-300 bg-white"
                      disabled={rotatingWebhook}
                      onClick={() => void rotateWebhookSecret()}
                    >
                      {rotatingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                      Générer / renouveler
                    </Button>
                    {webhookSecretOnce ? (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Input readOnly value={webhookSecretOnce} className="font-mono text-xs" />
                        <Button
                          type="button"
                          onClick={() => void copy(webhookSecretOnce, "Secret webhook copié.")}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Copier
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-emerald-600" /> Canaux et disponibilité
                </CardTitle>
                <CardDescription>
                  Le commutateur principal coupe ce service supplémentaire sans toucher au chat Flutter.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                <SettingSwitch
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  label="Activer Native Messaging"
                  description="Autorise le traitement des nouveaux messages entrants."
                  checked={settings.enabled}
                  disabled={!runtime.runtime_ready && !settings.enabled}
                  onCheckedChange={(checked) => setSettings((current) => ({
                    ...current,
                    enabled: checked,
                    virtual_groups_enabled: checked ? current.virtual_groups_enabled : false,
                  }))}
                />
                <SettingSwitch
                  icon={<MessageCircle className="h-5 w-5" />}
                  label="SMS"
                  description="Canal universel et repli lorsque RCS est indisponible."
                  checked={settings.sms_enabled}
                  onCheckedChange={(checked) => update("sms_enabled", checked)}
                />
                <SettingSwitch
                  icon={<MessagesSquare className="h-5 w-5" />}
                  label="RCS enrichi"
                  description="Photos, cartes, carrousels, boutons et accusés selon compatibilité."
                  checked={settings.rcs_enabled}
                  onCheckedChange={(checked) => update("rcs_enabled", checked)}
                />
                <SettingSwitch
                  icon={<RefreshCw className="h-5 w-5" />}
                  label="Fallback RCS → SMS"
                  description="Bascule automatiquement sur SMS lorsqu’un destinataire n’est pas joignable en RCS."
                  checked={settings.fallback_to_sms}
                  disabled={!settings.sms_enabled}
                  onCheckedChange={(checked) => update("fallback_to_sms", checked)}
                />
                <SettingSwitch
                  icon={<Users className="h-5 w-5" />}
                  label="Groupes virtuels"
                  description="Salles WAOUH distribuées dans les conversations individuelles SMS/RCS."
                  checked={settings.virtual_groups_enabled}
                  disabled={!settings.enabled}
                  onCheckedChange={(checked) => update("virtual_groups_enabled", checked)}
                />
              </CardContent>
            </Card>

            {validationErrors.length > 0 && (
              <Card className="border-amber-300 bg-amber-50">
                <CardContent className="p-4 text-sm text-amber-900">
                  <p className="font-medium">Configuration à compléter</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {validationErrors.map((error) => <li key={error}>{error}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-emerald-600" /> Test réel opérateur
                </CardTitle>
                <CardDescription>
                  Envoie réellement un SMS ou un RCS via Infobip. Des frais opérateur peuvent s’appliquer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="native-test-destination">Numéro destinataire de test</Label>
                  <Input
                    id="native-test-destination"
                    value={testDestination}
                    onChange={(event) => setTestDestination(event.target.value)}
                    placeholder="+22901XXXXXXXX"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  <p className="text-xs text-slate-500">
                    Pour RCS, le numéro doit être compatible avec le sender RCS configuré chez Infobip.
                  </p>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-slate-50 p-3">
                  <Checkbox
                    checked={testConsent}
                    onCheckedChange={(checked) => setTestConsent(checked === true)}
                    aria-label="Consentement du destinataire"
                  />
                  <span className="text-sm leading-5 text-slate-700">
                    Je confirme que ce numéro m’appartient ou que son titulaire accepte de recevoir ce message de test.
                  </span>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    disabled={!runtime.provider_ready || !settings.sms_enabled || !testConsent || !testDestination.trim() || testSending !== null}
                    onClick={() => void sendRealTest("sms")}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {testSending === "sms" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                    Envoyer SMS réel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!runtime.provider_ready || !settings.rcs_enabled || !testConsent || !testDestination.trim() || testSending !== null}
                    onClick={() => void sendRealTest("rcs")}
                  >
                    {testSending === "rcs" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessagesSquare className="mr-2 h-4 w-4" />}
                    Envoyer RCS réel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className={runtime.runtime_ready ? "border-emerald-200" : "border-amber-300 bg-amber-50"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className={runtime.runtime_ready ? "h-5 w-5 text-emerald-600" : "h-5 w-5 text-amber-700"} />
                  Préparation du runtime
                </CardTitle>
                <CardDescription>
                  Seul l’état des secrets est affiché. Leur valeur ne quitte jamais le serveur.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                <RuntimeCheck ready={runtime.phone_encryption_ready} label="Chiffrement des numéros" />
                <RuntimeCheck ready={runtime.phone_hash_ready} label="Index privé distinct" />
                <RuntimeCheck ready={runtime.webhook_ready} label="Signature des webhooks" />
                <RuntimeCheck ready={runtime.internal_secret_ready} label="Secret interne dédié" />
                <RuntimeCheck ready={runtime.infobip_base_url_ready} label="Base URL Infobip" />
                <RuntimeCheck ready={runtime.infobip_api_key_ready} label="API key Infobip" />
                <RuntimeCheck ready={runtime.provider_ready} label="Fournisseur sélectionné" />
                <RuntimeCheck ready={runtime.retry_worker_ready} label="Worker de reprise" />
                <RuntimeCheck ready={runtime.runtime_ready} label="Activation autorisée" strong />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                size="lg"
                disabled={saving || validationErrors.length > 0 || runtimeBlocksActivation}
                onClick={() => void saveSettings()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Enregistrer les paramètres
              </Button>
            </div>
          </div>

          <aside className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-slate-950 text-white">
                <CardTitle className="text-base">Aperçu « Ouvrir Messages »</CardTitle>
                <CardDescription className="text-slate-300">
                  Teste le lien avec l’application Messages installée sur cet appareil.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100">
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Écrire à WAOUH</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {phoneIsValid ? formatBeninPhone(normalizedPhone) : "+229 01 XX XX XX XX"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Message prérempli : BONJOUR WAOUH</p>
                </div>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!smsUri}>
                  <a href={smsUri || undefined}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir Messages
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!smsUri}
                  onClick={() => void copy(smsUri, "Lien SMS copié.")}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copier le lien sms:
                </Button>
                {smsUri && <code className="block break-all rounded-lg bg-slate-100 p-3 text-xs text-slate-600">{smsUri}</code>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" /> Séparation garantie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Ce canal possède ses propres utilisateurs, conversations, files et quotas.</p>
                <Separator />
                <p>Le chat Flutter, ses sessions et ses écrans restent indépendants.</p>
                <Separator />
                <p>Aucun secret fournisseur n’est conservé dans ces paramètres.</p>
              </CardContent>
            </Card>

            <div className="px-1 text-xs text-slate-500">
              Dernière mise à jour : {settings.updated_at
                ? new Date(settings.updated_at).toLocaleString("fr-FR")
                : "jamais"}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function EndpointRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all text-xs text-slate-600">{value}</code>
        <Button type="button" size="sm" variant="outline" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SettingSwitch({
  icon,
  label,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 text-emerald-600">{icon}</span>
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  );
}

function RuntimeCheck({
  ready,
  label,
  strong = false,
}: {
  ready: boolean;
  label: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${strong ? "bg-white/70 font-semibold" : ""}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"}`} />
      <span className={ready ? "text-emerald-800" : "text-amber-900"}>
        {label} · {ready ? "prêt" : "à configurer"}
      </span>
    </div>
  );
}