import { useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  CheckCircle2,
  CircleDot,
  Handshake,
  Loader2,
  PackageCheck,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { assertChatResponse, type ChatReply } from "@/lib/chatReply";
import { WaouhProductResults } from "@/components/waouh/WaouhProductCard";
import { WaouhMuseAvatar } from "@/components/waouh/WaouhMuseAvatar";
import { cn } from "@/lib/utils";

type AvatarIntent = "buy" | "sell" | "ask";
type JourneyResponse = {
  id: string;
  raw: Record<string, any>;
  reply: ChatReply;
};

const SESSION_KEY = "waouh_web_session_id";

function sessionId() {
  let value = localStorage.getItem(SESSION_KEY);
  if (!value) {
    value = crypto.randomUUID?.() ?? `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

const STAGES = [
  { label: "Objectif", icon: Target },
  { label: "Marché", icon: Radar },
  { label: "Négociation", icon: Handshake },
  { label: "Livraison", icon: PackageCheck },
  { label: "Terminé", icon: CheckCircle2 },
];

function stageFrom(data: Record<string, any>, current: number) {
  const workflow = String(data.workflow_state ?? data.intent ?? "").toLowerCase();
  const hasResults =
    (Array.isArray(data.results) && data.results.length > 0) ||
    (Array.isArray(data.products) && data.products.length > 0);
  if (/completed|settled|deal_completed/.test(workflow)) return 4;
  if (/delivered|picked_up|pending_assignment|assigned|awaiting_confirmation/.test(workflow) || data.deal_id) return 3;
  if (/negotiat|counter|offer/.test(workflow) || data.negotiation_id || data.thread_id) return 2;
  if (hasResults) return 1;
  return current;
}

function mergeScope(scope: Record<string, any>, data: Record<string, any>) {
  const meta = data.meta && typeof data.meta === "object" ? data.meta : {};
  const next = { ...scope };
  [
    "thread_id",
    "article_id",
    "negotiation_id",
    "deal_id",
    "transaction_id",
    "counterpart_user_id",
    "buyer_user_id",
    "seller_user_id",
    "role",
    "search_request_id",
    "search_thread_id",
  ].forEach((key) => {
    const value = data[key] ?? meta[key];
    if (value != null && String(value).trim()) next[key] = value;
  });
  return next;
}

function actionText(action: { id: string; label: string }) {
  if (/^(?:accepter|accept)/i.test(action.id)) return "OUI";
  if (/^(?:refuser|reject)/i.test(action.id)) return "NON";
  return action.label;
}

export function WaouhAvatarCommerceFlow({
  intent,
  avatarName = "Avatar",
  onExit,
}: {
  intent: AvatarIntent;
  avatarName?: string;
  onExit?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const scopeRef = useRef<Record<string, any>>({});
  const [input, setInput] = useState("");
  const [objective, setObjective] = useState<string | null>(null);
  const [responses, setResponses] = useState<JourneyResponse[]>([]);
  const [stage, setStage] = useState(0);
  const [sending, setSending] = useState(false);

  const labels = useMemo(() => {
    if (intent === "sell") {
      return {
        title: "Vendre avec votre Avatar",
        question: "Que voulez-vous vendre ?",
        hint: "Ex. Je vends 20 sacs de soja à Parakou…",
        suggestions: ["Trouver des acheteurs sérieux", "Comparer la demande du marché", "M’aider à fixer mon prix"],
      };
    }
    if (intent === "ask") {
      return {
        title: "Demander à votre Avatar",
        question: "Que souhaitez-vous accomplir ?",
        hint: "Décrivez simplement votre besoin…",
        suggestions: ["Trouver une opportunité", "Comparer avant de décider", "Organiser une prestation"],
      };
    }
    return {
      title: "Acheter avec votre Avatar",
      question: "Que cherchez-vous ?",
      hint: "Ex. Je cherche un téléphone fiable à Cotonou…",
      suggestions: ["Trouver le meilleur prix", "Comparer près de moi", "Chercher une offre fiable"],
    };
  }, [intent]);

  const normalizedIntent = intent === "ask" ? "assistant" : intent;

  const send = async (
    value?: string,
    actionMeta: Record<string, unknown> = {},
  ) => {
    const text = (value ?? input).trim();
    if (!text || sending) return;

    if (!user && (Object.keys(scopeRef.current).length > 0 || responses.length > 0)) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour poursuivre une négociation ou conclure un deal.",
      });
      window.location.href = `/app/auth?next=${encodeURIComponent(`/app/avatar?intent=${intent}`)}`;
      return;
    }

    setSending(true);
    setObjective((current) => current ?? text);
    if (value == null) setInput("");

    try {
      const sid = sessionId();
      const meta = {
        ...scopeRef.current,
        ...actionMeta,
        source: "avatar_commerce_web",
        avatar_flow: true,
        avatar_journey: true,
        avatar_intent: normalizedIntent,
        intent: normalizedIntent,
        schema: "waouh.message.v1",
        idempotency_key: crypto.randomUUID?.() ?? `avatar_${Date.now()}`,
      };

      const { data, error } = await supabase.functions.invoke("waouh-channel-in-secure", {
        headers: { "x-waouh-session": sid },
        body: {
          channel: "web",
          sessionId: sid,
          text,
          attachments: [],
          authUserId: user?.id ?? null,
          meta,
        },
      });

      const reply = assertChatResponse(data, error);
      const raw = (data ?? {}) as Record<string, any>;
      scopeRef.current = mergeScope(scopeRef.current, raw);
      setStage((current) => Math.max(current, stageFrom(raw, current)));

      if (!raw.suppress_direct_reply) {
        setResponses((items) => [
          ...items,
          {
            id: raw.outbound_message_id ?? crypto.randomUUID?.() ?? `avatar_reply_${Date.now()}`,
            raw,
            reply,
          },
        ]);
      }
    } catch (error: any) {
      toast({
        title: "Votre Avatar n’a pas pu poursuivre",
        description: error?.message ?? "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleResultAction = (text: string) => {
    void send(text, {
      ...scopeRef.current,
      commerce_action_source: "avatar_journey",
    });
  };

  const handleExplicitAction = (action: Record<string, any>) => {
    const id = String(action.id ?? action.payload ?? "");
    if (/counter|contre-proposition|proposer/i.test(id)) {
      setInput("Je propose  FCFA");
      return;
    }
    void send(actionText({ id, label: String(action.label ?? id) }), {
      ...scopeRef.current,
      button_payload: id,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(79,127,255,.10),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#fff_48%,#fbf9ff_100%)]">
      <div className="mx-auto w-full max-w-5xl px-3 pt-3 sm:px-4">
        <div className="rounded-[26px] border border-blue-100 bg-white/90 p-3 shadow-[0_20px_60px_-40px_rgba(49,91,216,.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <WaouhMuseAvatar mode={intent === "sell" ? "seller" : intent === "buy" ? "buyer" : "neutral"} phase={sending ? (stage >= 2 ? "negotiating" : "searching") : stage >= 4 ? "success" : stage >= 2 ? "negotiating" : "listening"} size="md" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-950">{avatarName}</div>
              <div className="mt-0.5 text-[10px] font-semibold text-slate-500">{labels.title}</div>
            </div>
            <div className="hidden rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-black text-blue-700 sm:block">
              CONTACT PROTÉGÉ
            </div>
            {onExit && (
              <Button variant="ghost" size="sm" onClick={onExit} className="h-8 rounded-xl text-[10px]">
                Quitter
              </Button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {STAGES.map(({ label, icon: Icon }, index) => (
              <div key={label} className="min-w-0 text-center">
                <div className={cn("mx-auto h-1 rounded-full transition-colors", index <= stage ? "bg-blue-500" : "bg-slate-200")} />
                <div className={cn("mt-1 flex items-center justify-center gap-1 text-[8px] font-bold", index <= stage ? "text-slate-800" : "text-slate-400")}>
                  <Icon className="h-2.5 w-2.5" />
                  <span className="truncate">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        {!objective ? (
          <div className="mx-auto max-w-xl py-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-blue-500" />
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{labels.question}</h2>
            <p className="mx-auto mt-2 max-w-md text-xs font-medium leading-relaxed text-slate-500">
              {avatarName} explore NEXUS, Radar, Partenaires et Signal Fabric. Vous gardez la décision finale.
            </p>
            <div className="mt-6 grid gap-2">
              {labels.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-violet-50/60 p-3">
              <div className="flex items-start gap-2">
                <Target className="mt-0.5 h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wide text-blue-600">Votre objectif</div>
                  <div className="mt-1 text-xs font-bold text-slate-800">{objective}</div>
                  {stage > 0 && <div className="mt-1 text-[10px] font-semibold text-slate-500">{avatarName} poursuit cet objectif en arrière-plan.</div>}
                </div>
              </div>
            </div>

            {responses.map(({ id, raw, reply }) => (
              <div key={id} className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <CircleDot className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[10px] font-black text-slate-500">{avatarName} a trouvé</span>
                  {(raw.thread_id || raw.deal_id) && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-black text-emerald-700">
                      <ShieldCheck className="h-2.5 w-2.5" /> deal sécurisé
                    </span>
                  )}
                </div>

                {reply.text && (
                  <div className="whitespace-pre-wrap text-xs font-medium leading-relaxed text-slate-700">{reply.text}</div>
                )}

                {reply.results.length > 0 && (
                  <WaouhProductResults
                    results={reply.results}
                    onAction={sending ? undefined : handleResultAction}
                    journey
                  />
                )}

                {reply.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reply.actions.slice(0, 5).map((action: any) => (
                      <Button
                        key={String(action.id ?? action.label)}
                        size="sm"
                        variant={/accept|confirmer|payer|paiement/i.test(String(action.id)) ? "default" : "outline"}
                        className="h-9 rounded-xl text-[10px] font-black"
                        disabled={sending}
                        onClick={() => handleExplicitAction(action)}
                      >
                        {String(action.label ?? action.id)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                <WaouhMuseAvatar mode={intent === "sell" ? "seller" : intent === "buy" ? "buyer" : "neutral"} phase={stage >= 2 ? "negotiating" : "searching"} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    {stage >= 2 ? `${avatarName} sécurise la prochaine étape…` : `${avatarName} interroge le marché réel…`}
                  </div>
                  <div className="mt-1 text-[9px] font-semibold text-slate-500">NEXUS · Signal Fabric · Radar · Partenaires</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-5xl px-3 pb-3 sm:px-4">
        <div className="flex items-end gap-2 rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_-30px_rgba(15,23,42,.35)]">
          <Sparkles className="mb-2.5 ml-1 h-4 w-4 shrink-0 text-blue-500" />
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder={objective ? "Répondez à votre Avatar…" : labels.hint}
            className="min-h-[42px] max-h-28 resize-none border-0 bg-transparent p-2 text-xs shadow-none focus-visible:ring-0"
          />
          <Button
            size="icon"
            className="h-11 w-11 shrink-0 rounded-2xl"
            disabled={sending || !input.trim()}
            onClick={() => void send()}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
