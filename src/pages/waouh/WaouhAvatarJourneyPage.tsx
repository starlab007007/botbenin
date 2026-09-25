import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  MessageSquareText,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WaouhProductResults, type WaouhResultCard } from "@/components/waouh/WaouhProductCard";
import { supabase } from "@/integrations/supabase/client";
import { normalizeChatReply } from "@/lib/chatReply";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type JourneyMode = "buy" | "sell" | "ask";
type JourneyTurn = {
  id: string;
  direction: "in" | "out";
  text: string;
  results: WaouhResultCard[];
};

const SESSION_KEY = "waouh_web_session_id";
const PENDING_OPEN_KEY = "waouh_pending_open";

function sessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const MODE = {
  buy: {
    title: "Acheter avec mon Avatar",
    subtitle: "Chercher · comparer · négocier · conclure",
    prompt: "Décrivez votre achat",
    hint: "Ex. Je cherche une moto Bajaj en bon état à Cotonou, budget 450 000 FCFA",
    lead: "Votre Avatar cadre le besoin, explore NEXUS, compare le marché réel puis ouvre un Deal Room uniquement quand vous choisissez une opportunité.",
    intent: "buy",
    icon: ShoppingBag,
    accent: "text-blue-600",
    button: "bg-blue-600 hover:bg-blue-700",
  },
  sell: {
    title: "Vendre avec mon Avatar",
    subtitle: "Structurer · trouver des acheteurs · conclure",
    prompt: "Décrivez ce que vous vendez",
    hint: "Ex. Je vends un Samsung S25 256 Go neuf à Cotonou",
    lead: "Votre Avatar structure l’offre, trouve plusieurs acheteurs pertinents et isole chaque négociation dans son propre Deal Room.",
    intent: "sell",
    icon: Tag,
    accent: "text-amber-600",
    button: "bg-amber-500 hover:bg-amber-600",
  },
  ask: {
    title: "Demander à mon Avatar",
    subtitle: "Comprendre · explorer · proposer · agir",
    prompt: "Dites votre objectif",
    hint: "Décrivez simplement ce que vous voulez obtenir",
    lead: "Votre Avatar choisit les moteurs WAOUH utiles, rassemble les informations et vous conduit vers la prochaine action la plus pertinente.",
    intent: "assistant",
    icon: MessageSquareText,
    accent: "text-violet-600",
    button: "bg-violet-600 hover:bg-violet-700",
  },
} as const;

function normalizeMode(value?: string): JourneyMode {
  return value === "sell" || value === "ask" ? value : "buy";
}

function bufferAuthoritativeMatch(data: any) {
  const articleId = String(data?.article_id || data?.meta?.article_id || "").trim();
  const threadId = String(data?.thread_id || data?.meta?.thread_id || "").trim();
  if (!articleId || !threadId) return false;
  const detail = {
    article_id: articleId,
    counterpart_user_id: data?.counterpart_user_id ?? data?.seller_user_id ?? data?.meta?.counterpart_user_id ?? null,
    seller_user_id: data?.seller_user_id ?? data?.meta?.seller_user_id ?? null,
    buyer_user_id: data?.buyer_user_id ?? data?.meta?.buyer_user_id ?? null,
    thread_id: threadId,
    negotiation_id: data?.negotiation_id ?? data?.meta?.negotiation_id ?? null,
    deal_id: data?.deal_id ?? data?.meta?.deal_id ?? null,
    kind: "buyer",
    title: data?.title ?? data?.meta?.title ?? "Deal Room",
    price: data?.price ?? data?.meta?.price ?? null,
    city: data?.city ?? data?.meta?.city ?? null,
    photo: data?.image_url ?? data?.meta?.image_url ?? null,
    source: "avatar_journey",
  };
  try {
    const raw = localStorage.getItem(PENDING_OPEN_KEY);
    const current = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(current) ? current : [];
    arr.push(detail);
    localStorage.setItem(PENDING_OPEN_KEY, JSON.stringify(arr.slice(-10)));
  } catch {}
  return true;
}

export default function WaouhAvatarJourneyPage() {
  const { mode: rawMode } = useParams();
  const mode = normalizeMode(rawMode);
  const config = MODE[mode];
  const Icon = config.icon;
  const navigate = useNavigate();
  const { user } = useAuth();
  const sid = useRef(sessionId()).current;

  const [goal, setGoal] = useState("");
  const [started, setStarted] = useState(false);
  const [sending, setSending] = useState(false);
  const [turns, setTurns] = useState<JourneyTurn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const phase = useMemo(() => {
    if (!started) return 0;
    if (sending) return 1;
    if (turns.some((turn) => turn.results.length > 0)) return 2;
    return 1;
  }, [sending, started, turns]);

  const buildGoal = (value: string) => {
    if (started) return value;
    if (mode === "buy") return `Je veux acheter : ${value}. Mon Avatar doit préciser le besoin si nécessaire, utiliser NEXUS pour chercher le marché réel, comparer les offres et préparer la meilleure mise en relation.`;
    if (mode === "sell") return `Je veux vendre : ${value}. Mon Avatar doit structurer l’offre, utiliser NEXUS pour trouver des acheteurs pertinents, comparer les demandes et préparer la meilleure mise en relation.`;
    return `${value}. Mon Avatar doit comprendre l’objectif, explorer les sources WAOUH utiles et me proposer la prochaine action la plus pertinente.`;
  };

  const sendCore = async (raw: string, action = false) => {
    const value = raw.trim();
    if (!value || sending) return;
    const text = action ? value : buildGoal(value);
    setSending(true);
    setError(null);
    const inbound: JourneyTurn = {
      id: `in-${crypto.randomUUID?.() ?? Date.now()}`,
      direction: "in",
      text,
      results: [],
    };
    setTurns((prev) => [...prev, inbound]);
    if (!action) setGoal("");
    setStarted(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("waouh-channel-in-secure", {
        headers: { "x-waouh-session": sid },
        body: {
          channel: "web",
          sessionId: sid,
          text,
          authUserId: user?.id ?? null,
          meta: {
            source: "avatar_journey",
            origin_surface: "avatar_journey",
            avatar_journey: true,
            avatar_journey_mode: mode,
            intent: action ? "workflow" : config.intent,
            action: action ? "workflow" : config.intent,
            result_limit: 10,
            max_results: 10,
            idempotency_key: crypto.randomUUID?.() ?? `journey-${Date.now()}`,
          },
        },
      });
      if (invokeError) throw invokeError;
      if (!data || data.ok === false || data.success === false || data.error) {
        throw new Error(data?.message || data?.error || "Le moteur WAOUH n’a pas pu répondre.");
      }
      const reply = normalizeChatReply(data);
      setTurns((prev) => [
        ...prev,
        {
          id: String(data?.outbound_message_id || `out-${crypto.randomUUID?.() ?? Date.now()}`),
          direction: "out",
          text: reply.text,
          results: reply.results,
        },
      ]);

      const dedicated = bufferAuthoritativeMatch(data);
      const intent = String(data?.intent || data?.meta?.intent || "").toLowerCase();
      if (dedicated || /negotiat|deal_|match_|decide|contact_exchange/.test(intent)) {
        window.setTimeout(() => navigate("/app/chat/waouh"), 120);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  const start = () => void sendCore(goal);
  const handleAction = (payload: string) => void sendCore(payload, true);

  const labels = ["Comprendre", "Explorer", "Comparer", "Deal"];

  return (
    <main className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[radial-gradient(circle_at_15%_0%,rgba(79,127,255,.11),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(139,124,255,.10),transparent_30%),#f8fbff]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-blue-100/80 bg-white/90 px-3 backdrop-blur-xl">
        <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate("/app/muse")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="grid h-9 w-9 place-items-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50 shadow-sm">
          <Sparkles className="h-4.5 w-4.5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-slate-950">{config.title}</div>
          <div className="truncate text-[10px] font-semibold text-slate-500">{config.subtitle}</div>
        </div>
        <div className={cn("grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm", config.accent)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </header>

      <section className="shrink-0 px-3 pt-3">
        <div className="rounded-[24px] border border-blue-100/80 bg-white/82 p-3 shadow-[0_18px_50px_-34px_rgba(42,78,140,.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-blue-500/20">
              <Sparkles className={cn("h-5 w-5", sending && "animate-pulse")} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-950">Votre Avatar conduit le parcours</div>
              <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                {sending ? "Recherche et analyse du marché en cours…" : config.lead}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {labels.map((label, index) => {
              const active = index <= phase;
              return (
                <div key={label} className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-black",
                      active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {active ? <Check className="h-3 w-3" /> : index + 1}
                    </span>
                    <span className={cn("truncate text-[9px] font-bold", active ? "text-slate-900" : "text-slate-400")}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {!started ? (
          <div className="mx-auto max-w-2xl space-y-4 pt-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">{config.prompt}</h1>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{config.lead}</p>
            </div>
            <Textarea
              autoFocus
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={config.hint}
              className="min-h-32 resize-none rounded-[22px] border-blue-100 bg-white/95 p-4 text-sm shadow-sm focus-visible:ring-blue-400"
            />
            <Button onClick={start} disabled={!goal.trim() || sending} className={cn("h-12 w-full rounded-2xl font-black text-white", config.button)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Laisser mon Avatar commencer
            </Button>
            <div className="flex items-start gap-2 rounded-2xl border border-blue-100 bg-white/70 p-3 text-[10px] font-semibold leading-relaxed text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              Les coordonnées privées restent protégées. L’accord, la livraison et le paiement suivent le Deal Graph WAOUH.
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-3 pb-6">
            {turns.map((turn) => (
              <div key={turn.id} className={cn("space-y-2", turn.direction === "in" ? "ml-auto max-w-[88%]" : "max-w-full")}>
                {turn.text && (
                  <div className={cn(
                    "rounded-2xl px-3.5 py-3 text-sm leading-relaxed shadow-sm",
                    turn.direction === "in"
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-800"
                  )}>
                    {turn.direction === "out" ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
                    ) : turn.text}
                  </div>
                )}
                {turn.results.length > 0 && (
                  <WaouhProductResults results={turn.results} onAction={handleAction} />
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2.5 text-[11px] font-bold text-blue-700 shadow-sm">
                <Search className="h-4 w-4 animate-pulse" />
                Avatar explore NEXUS, Radar, Partenaire et le marché…
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">{error}</div>
            )}
          </div>
        )}
      </section>

      {started && (
        <footer className="shrink-0 border-t border-slate-200/80 bg-white/90 p-2.5 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[22px] border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/5">
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendCore(goal);
                  setGoal("");
                }
              }}
              placeholder="Continuez avec votre Avatar…"
              className="min-h-10 max-h-28 flex-1 resize-none border-0 bg-transparent py-2 shadow-none focus-visible:ring-0"
            />
            <Button
              size="icon"
              disabled={!goal.trim() || sending}
              onClick={() => { void sendCore(goal); setGoal(""); }}
              className={cn("h-11 w-11 shrink-0 rounded-2xl text-white", config.button)}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        </footer>
      )}
    </main>
  );
}
