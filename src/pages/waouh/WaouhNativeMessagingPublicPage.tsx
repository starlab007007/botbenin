import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Copy,
  Loader2,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PublicNativeMessagingConfig = {
  enabled: boolean;
  phone_e164: string;
  phone_display: string;
  sender_name: string;
  sms_uri: string;
  sms_uri_android?: string;
  sms_uri_ios?: string;
  default_message: string;
  rcs_enabled: boolean;
  sms_enabled: boolean;
  virtual_groups_enabled: boolean;
};

const PROJECT_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  "https://mvynepqulhflxtyymtzs.supabase.co"
).replace(/\/$/, "");

function buildPublicConfigUrl(invite: string | null, room: string | null): string {
  const url = new URL(`${PROJECT_URL}/functions/v1/waouh-tel-open-messages`);
  if (invite) url.searchParams.set("invite", invite);
  if (room) url.searchParams.set("room", room);
  return url.toString();
}

function smsUriForCurrentPlatform(config: PublicNativeMessagingConfig | null): string {
  if (!config?.sms_uri) return "";
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent) ||
    (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isAppleMobile) return config.sms_uri_ios || config.sms_uri.replace("?body=", "&body=");
  return config.sms_uri_android || config.sms_uri;
}

async function readPublicConfig(
  invite: string | null,
  room: string | null,
  signal: AbortSignal,
): Promise<PublicNativeMessagingConfig> {
  const response = await fetch(buildPublicConfigUrl(invite, room), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  const payload = await response.json().catch(() => null) as {
    data?: PublicNativeMessagingConfig;
    error?: string | { code?: string; message?: string };
  } | null;

  if (!response.ok || !payload?.data) {
    const code = typeof payload?.error === "string"
      ? payload.error
      : payload?.error?.code;
    if (code === "native_messaging_disabled") {
      throw new Error("Le service par numéro est momentanément désactivé.");
    }
    if (code === "number_not_configured") {
      throw new Error("Le numéro WAOUH n’est pas encore configuré.");
    }
    if (
      code === "invite_not_found" || code === "invite_expired" || code === "invite_invalid" ||
      code === "room_not_found" || code === "room_unavailable" || code === "room_invalid"
    ) {
      throw new Error("Cette invitation de groupe n’est plus valide.");
    }
    throw new Error("Impossible de charger le numéro WAOUH pour le moment.");
  }
  return payload.data;
}

export default function WaouhNativeMessagingPublicPage() {
  const [searchParams] = useSearchParams();
  const invite = useMemo(() => searchParams.get("invite")?.trim() || null, [searchParams]);
  const room = useMemo(() => searchParams.get("room")?.trim() || null, [searchParams]);
  const [config, setConfig] = useState<PublicNativeMessagingConfig | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const openMessagesUri = useMemo(
    () => smsUriForCurrentPlatform(config),
    [config],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    readPublicConfig(invite, room, controller.signal)
      .then(setConfig)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setConfig(null);
          setError(reason instanceof Error ? reason.message : "Service indisponible.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [invite, room, reloadKey]);

  const copyNumber = async () => {
    if (!config?.phone_e164) return;
    try {
      await navigator.clipboard.writeText(config.phone_e164);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="Retour à bot.bj">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20">
              <MessageCircle className="h-6 w-6" />
            </span>
            <span>
              <strong className="block text-lg leading-none">WAOUH</strong>
              <span className="text-xs text-emerald-200/70">Native Messaging</span>
            </span>
          </Link>
          <Badge className="border border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/10">
            Sans nouvelle application
          </Badge>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              WAOUH dans votre téléphone
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Écrivez à WAOUH comme à un contact.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Aucun compte supplémentaire à créer. Envoyez un SMS ou un message RCS pour chercher,
              comparer, vendre et suivre vos demandes depuis l’application Messages de votre téléphone.
            </p>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <Feature icon={Smartphone} title="Un simple numéro" text="Depuis l’app Messages" />
              {config?.rcs_enabled ? (
                <Feature icon={MessagesSquare} title="RCS enrichi" text="Photos et suggestions" />
              ) : (
                <Feature icon={MessagesSquare} title="SMS universel" text="Disponible sans données mobiles" />
              )}
              {config?.virtual_groups_enabled ? (
                <Feature icon={Users} title="Groupes WAOUH" text="Invitations par code" />
              ) : (
                <Feature icon={ShieldCheck} title="Vous décidez" text="STOP et EFFACER à tout moment" />
              )}
            </div>
          </div>

          <Card className="border-white/10 bg-white/[0.07] p-6 text-white shadow-2xl shadow-emerald-950/50 backdrop-blur sm:p-8">
            {loading ? (
              <div className="flex min-h-80 flex-col items-center justify-center gap-4 text-slate-300" role="status">
                <Loader2 className="h-9 w-9 animate-spin text-emerald-300" />
                <p>Chargement du numéro WAOUH…</p>
              </div>
            ) : error || !config ? (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <span className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-amber-300/10 text-amber-200">
                  <RefreshCw className="h-7 w-7" />
                </span>
                <h2 className="text-xl font-bold">Service bientôt disponible</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  Réessayer
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-emerald-200">Numéro officiel</p>
                    <h2 className="mt-1 text-2xl font-black sm:text-3xl">{config.phone_display}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={copyNumber}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                    aria-label="Copier le numéro"
                  >
                    {copied ? <Check className="h-5 w-5 text-emerald-300" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>

                <Button asChild className="mt-7 h-14 w-full bg-emerald-400 text-base font-bold text-slate-950 hover:bg-emerald-300">
                  <a href={openMessagesUri}>
                    Ouvrir Messages
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <p className="mt-3 text-center text-xs text-slate-400">
                  Le premier message sera préparé. Vous gardez le contrôle de son envoi.
                </p>

                <div className="mt-7 space-y-3 border-t border-white/10 pt-6 text-sm text-slate-300">
                  <Step number="1" text={`Ajoutez ${config.sender_name} à vos contacts.`} />
                  <Step number="2" text={`Envoyez « ${config.default_message} » ou décrivez directement votre besoin.`} />
                  <Step number="3" text="Recevez les résultats dans la même conversation." />
                </div>

                <div className="mt-6 flex items-start gap-3 rounded-xl bg-slate-950/50 p-4 text-xs leading-5 text-slate-300">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <p>
                    Répondez <strong className="text-white">STOP</strong> pour suspendre les messages,
                    {" "}<strong className="text-white">REPRENDRE</strong> pour les réactiver ou
                    {" "}<strong className="text-white">EFFACER</strong> pour demander la suppression de vos données.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Smartphone;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <Icon className="mb-3 h-5 w-5 text-emerald-300" />
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-300/15 font-bold text-emerald-200">
        {number}
      </span>
      <span>{text}</span>
    </div>
  );
}
