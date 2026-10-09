import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  Bot,
  CheckCircle2,
  ChevronRight,
  Flag,
  Globe2,
  MessageSquareText,
  Mic,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Volume2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { newChatRoute, openNewChat } from "@/lib/waouh/newChat";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { invokeWaouhAgentic } from "@/lib/waouh/agenticClient";
import {
  listFromAgenticData,
  type AgentMission,
  type NonFinancialApproval,
  type PriceWatch,
} from "@/lib/waouh/agenticContracts";
import { WaouhMuseAvatar, type WaouhMusePhase } from "@/components/waouh/WaouhMuseAvatar";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { BotGreeting, botActivityLine } from "@/components/waouh/bot/BotGreeting";
import type { BotExpression } from "@/components/waouh/bot/BotCharacter";
import { BotWorkingStrip } from "@/components/waouh/bot/BotWorkingStrip";
import { useMobileProfile } from "@/app-mobile/hooks/useMobileProfile";
import { buildWaouhAuthRedirect } from "@/lib/waouhAccessPolicy";

type AvatarProfile = {
  name: string;
  preset: "sky" | "aura" | "nova" | "orbit" | "sol" | "flux";
  personality: string;
  proactivity: string;
};

type AgenticSummary = {
  missions: number;
  watches: number;
  approvals: number;
};

export type WaouhAvatarHomePageProps = {
  onAsk?: (prompt: string) => void;
};

const DEFAULT_PROFILE: AvatarProfile = {
  name: "Bot",
  preset: "sky",
  personality: "Équilibré",
  proactivity: "Équilibré",
};

const PERSONALITIES = ["Calme", "Dynamique", "Business", "Chaleureux", "Équilibré"];
const PROACTIVITIES = ["Discret", "Équilibré", "Proactif"];
const PRESETS: AvatarProfile["preset"][] = ["sky", "aura", "nova", "orbit", "sol", "flux"];

const presetGradient: Record<AvatarProfile["preset"], string> = {
  sky: "from-blue-100 via-white to-cyan-100",
  aura: "from-violet-100 via-white to-fuchsia-100",
  nova: "from-indigo-100 via-white to-blue-100",
  orbit: "from-cyan-100 via-white to-emerald-100",
  sol: "from-amber-100 via-white to-orange-100",
  flux: "from-emerald-100 via-white to-teal-100",
};

const readAvatarProfile = (): AvatarProfile => {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const storedName = localStorage.getItem("waouh.avatar.name") || DEFAULT_PROFILE.name;
    const name = storedName.trim().toLowerCase() === "ayo" ? "Bot" : storedName;
    const preset = (localStorage.getItem("waouh.avatar.preset") || DEFAULT_PROFILE.preset) as AvatarProfile["preset"];
    const personality = localStorage.getItem("waouh.avatar.personality") || DEFAULT_PROFILE.personality;
    const proactivity = localStorage.getItem("waouh.avatar.proactivity") || DEFAULT_PROFILE.proactivity;
    return {
      name: name.trim() || DEFAULT_PROFILE.name,
      preset: PRESETS.includes(preset) ? preset : DEFAULT_PROFILE.preset,
      personality,
      proactivity,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
};

const saveAvatarProfile = (profile: AvatarProfile) => {
  try {
    localStorage.setItem("waouh.avatar.name", profile.name.trim() || "Bot");
    localStorage.setItem("waouh.avatar.preset", profile.preset);
    localStorage.setItem("waouh.avatar.personality", profile.personality);
    localStorage.setItem("waouh.avatar.proactivity", profile.proactivity);
    localStorage.setItem("waouh.avatar.configured", "true");
  } catch {
    // La personnalisation reste non bloquante si le stockage navigateur est indisponible.
  }
};

export default function WaouhAvatarHomePage({ onAsk }: WaouhAvatarHomePageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<AvatarProfile>(() => readAvatarProfile());
  const [draft, setDraft] = useState<AvatarProfile>(() => readAvatarProfile());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [summary, setSummary] = useState<AgenticSummary>({ missions: 0, watches: 0, approvals: 0 });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [greetExpression, setGreetExpression] = useState<BotExpression>("idle");
  const [promptFocused, setPromptFocused] = useState(false);
  const [botLeaving, setBotLeaving] = useState(false);
  const { profile: mobileProfile } = useMobileProfile();

  const refreshSummary = useCallback(async () => {
    if (!user) {
      setSummary({ missions: 0, watches: 0, approvals: 0 });
      return;
    }
    setSummaryLoading(true);
    const calls = await Promise.allSettled([
      invokeWaouhAgentic<{ missions?: AgentMission[] }>("mission.list", { limit: 50 }),
      invokeWaouhAgentic<{ watches?: PriceWatch[] }>("watch.list", { limit: 50 }),
      invokeWaouhAgentic<{ approvals?: NonFinancialApproval[] }>("approval.list", { status: "pending", limit: 50 }),
    ]);
    setSummaryLoading(false);

    const missions = calls[0].status === "fulfilled"
      ? listFromAgenticData<AgentMission>(calls[0].value, "missions")
          .filter((item) => !["completed", "cancelled", "failed"].includes(item.status)).length
      : 0;
    const watches = calls[1].status === "fulfilled"
      ? listFromAgenticData<PriceWatch>(calls[1].value, "watches")
          .filter((item) => ["active", "paused", "triggered"].includes(item.status)).length
      : 0;
    const approvals = calls[2].status === "fulfilled"
      ? listFromAgenticData<NonFinancialApproval>(calls[2].value, "approvals")
          .filter((item) => item.status === "pending").length
      : 0;

    setSummary({ missions, watches, approvals });
  }, [user]);

  useEffect(() => {
    void refreshSummary();
    const timer = window.setInterval(() => void refreshSummary(), 30000);
    const onFocus = () => void refreshSummary();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshSummary]);

  const phase: WaouhMusePhase = useMemo(() => {
    if (voiceActive) return "listening";
    if (summary.approvals > 0) return "contacting";
    if (summary.missions > 0) return "searching";
    if (summary.watches > 0) return "comparing";
    return "idle";
  }, [voiceActive, summary]);

  const status = useMemo(() => {
    if (voiceActive) return "Je vous écoute…";
    if (summary.approvals > 0) return "Une décision vous attend.";
    if (summary.missions > 0) return "Je poursuis vos missions.";
    if (summary.watches > 0) return "Je surveille le marché pour vous.";
    return "Je suis prêt. Que faisons-nous ?";
  }, [voiceActive, summary]);

  const contextualForYou = useMemo(() => {
    if (summary.approvals > 0) {
      return {
        title: "Une décision vous attend",
        detail: `${profile.name} a préparé ${summary.approvals} action(s) à valider.`,
        action: () => navigate("/app/missions"),
      };
    }
    if (summary.watches > 0) {
      return {
        title: "Le marché est surveillé",
        detail: `${profile.name} suit ${summary.watches} veille(s) pour vous.`,
        action: () => navigate("/app/missions"),
      };
    }
    if (summary.missions > 0) {
      return {
        title: "Recherche en cours",
        detail: `${profile.name} poursuit ${summary.missions} mission(s).`,
        action: () => navigate("/app/missions"),
      };
    }
    return {
      title: "Explorez le marché",
      detail: `${profile.name} peut chercher vendeurs, acheteurs et opportunités.`,
      action: () => navigate("/app/nexus"),
    };
  }, [navigate, profile.name, summary]);

  const askAvatar = useCallback((value: string) => {
    const text = value.trim();
    if (!text) return;

    if (!user) {
      const target = newChatRoute(text);
      navigate(buildWaouhAuthRedirect(target));
      return;
    }

    if (onAsk) {
      onAsk(text);
      return;
    }

    openNewChat(navigate, text);
  }, [navigate, onAsk, user]);

  const submitPrompt = () => {
    const text = prompt.trim();
    if (!text) return;
    setPrompt("");
    setBotLeaving(true);
    window.setTimeout(() => {
      askAvatar(text);
      window.setTimeout(() => setBotLeaving(false), 500);
    }, 420);
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Saisie vocale non disponible",
        description: "Votre navigateur ne fournit pas la reconnaissance vocale. Vous pouvez écrire à Bot.",
      });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setVoiceActive(true);
    recognition.onresult = (event: any) => {
      const text = String(event?.results?.[0]?.[0]?.transcript || "").trim();
      if (text) setPrompt(text);
    };
    recognition.onerror = () => setVoiceActive(false);
    recognition.onend = () => setVoiceActive(false);
    recognition.start();
  };

  const storeProfile = () => {
    if (!user) {
      setSettingsOpen(false);
      navigate(buildWaouhAuthRedirect("/app/avatar"));
      return;
    }
    const next = { ...draft, name: draft.name.trim() || "Bot" };
    saveAvatarProfile(next);
    setProfile(next);
    setSettingsOpen(false);
    toast({ title: `${next.name} est prêt`, description: "La présence de votre Avatar a été mise à jour." });
  };

  const actions = [
    {
      title: "Acheter",
      subtitle: "Je trouve et compare",
      icon: ShoppingBag,
      card: "from-blue-50 to-blue-100/80 border-blue-100",
      iconTone: "text-blue-600",
      action: () => navigate("/app/avatar/acheter"),
    },
    {
      title: "Vendre",
      subtitle: "Je trouve des acheteurs",
      icon: Tag,
      card: "from-amber-50 to-orange-100/75 border-amber-100",
      iconTone: "text-amber-600",
      action: () => navigate("/app/avatar/vendre"),
    },
    {
      title: "Trouver",
      subtitle: "Partout avec NEXUS",
      icon: Globe2,
      card: "from-cyan-50 to-sky-100/80 border-cyan-100",
      iconTone: "text-cyan-600",
      action: () => navigate("/app/nexus"),
    },
    {
      title: "Demander",
      subtitle: "Parlez naturellement",
      icon: MessageSquareText,
      card: "from-violet-50 to-purple-100/80 border-violet-100",
      iconTone: "text-violet-600",
      action: () => navigate("/app/avatar/demander"),
    },
  ] as const;

  const botExpression: BotExpression = botLeaving
    ? "think"
    : voiceActive || promptFocused
      ? "listen"
      : greetExpression === "hello" || greetExpression === "talk"
        ? greetExpression
        : summary.approvals > 0
          ? "ask"
          : summary.missions > 0
            ? "work"
            : summary.watches > 0
              ? "think"
              : greetExpression;

  /** Bot glisse vers la conversation, puis l'action s'ouvre. */
  const glideThen = (action: () => void) => {
    setBotLeaving(true);
    window.setTimeout(() => {
      action();
      window.setTimeout(() => setBotLeaving(false), 500);
    }, 420);
  };

  const suggestions = summary.approvals > 0
    ? ["Que dois-je valider ?", "Résume mes négociations", "Quelles actions sont urgentes ?"]
    : summary.missions > 0
      ? ["Où en sont mes missions ?", "Compare les meilleures options", "Que faut-il faire ensuite ?"]
      : ["Trouve-moi un bon téléphone à Cotonou", "Je veux vendre un produit", "Aide-moi à trouver un service"];

  return (
    <main data-waouh-ui="bot-home-v3" className="h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,.10),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(139,92,246,.08),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#ffffff_58%)]">
      <div className="mx-auto w-full max-w-6xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-6 lg:px-8">
        <section className="avatar-home-welcome relative overflow-hidden rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-violet-50/80 px-5 py-5 shadow-[0_24px_70px_-48px_rgba(37,99,235,.45)] sm:px-7 sm:py-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-300/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-violet-300/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-start gap-3 sm:gap-5">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <span className="botc-glide inline-flex" data-leaving={botLeaving}>
                <BotLiveAvatar size="clamp(56px, 15vw, 160px)" expression={botExpression} />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/90 px-2 py-1 text-[10px] whitespace-nowrap font-black text-emerald-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> En ligne
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-[clamp(22px,5vw,36px)] font-black leading-none tracking-tight text-slate-950">{profile.name}</h1>
                  <p className="mt-1.5 text-sm font-semibold text-slate-500">
                    Votre assistant personnel
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="rounded-2xl bg-white/80"
                  onClick={() => {
                    if (!user) {
                      navigate(buildWaouhAuthRedirect("/app/avatar"));
                      return;
                    }
                    setDraft(profile);
                    setSettingsOpen(true);
                  }}
                  aria-label="Personnaliser mon Avatar"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <BotGreeting
                compact
                className="mt-2"
                firstName={user ? mobileProfile?.full_name : null}
                thirdLine={botActivityLine(summary.missions, "mission")}
                onExpressionChange={setGreetExpression}
                choices={[
                  { label: "Acheter", onSelect: () => glideThen(() => navigate("/app/avatar/acheter")) },
                  { label: "Vendre", onSelect: () => glideThen(() => navigate("/app/avatar/vendre")) },
                  summary.missions + summary.approvals > 0
                    ? { label: "Voir mes missions", onSelect: () => glideThen(() => navigate("/app/missions")) }
                    : { label: "Explorer", onSelect: () => glideThen(() => navigate("/app/nexus")) },
                ]}
              />

            </div>
            </div>
            <div className="min-w-0">
              {phase !== "idle" && (
                <motion.p
                  key={status}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm font-bold text-teal-800"
                >
                  {status}
                </motion.p>
              )}

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant={voiceActive ? "default" : "ghost"}
                    className="h-11 w-11 shrink-0 rounded-xl"
                    onClick={startVoice}
                    aria-label="Parler à mon Avatar"
                  >
                    {voiceActive ? <Volume2 className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Input
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onFocus={() => setPromptFocused(true)}
                    onBlur={() => setPromptFocused(false)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") submitPrompt();
                    }}
                    aria-label="Votre demande à Bot"
                    placeholder="Demandez à Bot…"
                    className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <Button type="button" className="h-11 shrink-0 rounded-xl px-3 sm:px-4" onClick={submitPrompt} disabled={!prompt.trim()} aria-label="Demander">
                    <Send className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Demander</span>
                  </Button>
                </div>
              </div>

              <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-none">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => askAvatar(suggestion)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  className="h-11 min-w-0 rounded-xl px-2 text-xs bg-gradient-to-r from-teal-500 to-cyan-600 font-black shadow-sm hover:from-teal-600 hover:to-cyan-700"
                  onClick={() => askAvatar("Bonjour Bot, aide-moi à démarrer.")}
                >
                  <MessageSquareText className="mr-2 h-4 w-4" /> Démarrer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-w-0 rounded-xl px-2 text-xs border-blue-100 bg-white/85 font-black text-blue-700"
                  onClick={() => askAvatar("Bot, cherche la meilleure opportunité pour moi.")}
                >
                  <Search className="mr-2 h-4 w-4" /> Chercher
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-w-0 rounded-xl px-2 text-xs border-violet-100 bg-white/85 font-black text-violet-700"
                  onClick={() => askAvatar("Bot, aide-moi à négocier et conclure ce deal.")}
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Négocier
                </Button>
              </div>
              <BotWorkingStrip className="mt-3" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base sm:text-xl font-bold tracking-tight text-slate-950">À vous de choisir</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 xl:grid-cols-4">
            {actions.map(({ title, subtitle, icon: Icon, card, iconTone, action }, index) => (
              <motion.button
                key={title}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.045 }}
                whileHover={{ y: -2 }}
                onClick={action}
                data-waouh-action={title.toLowerCase()}
                className={`avatar-action-card group rounded-[18px] border bg-gradient-to-br ${card} p-3 sm:p-5 text-left shadow-sm transition hover:shadow-md`}
              >
                <span className="grid h-9 w-9 sm:h-12 sm:w-12 place-items-center rounded-xl bg-white/80 shadow-sm">
                  <Icon className={`h-5 w-5 ${iconTone}`} />
                </span>
                <span className="mt-2 sm:mt-5 block text-sm sm:text-lg font-bold text-slate-950">{title}</span>
                <span className="mt-1 block text-xs sm:text-sm font-medium text-slate-500">{subtitle}</span>
                <span className="mt-2 sm:mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition group-hover:text-slate-900">
                  Ouvrir <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </motion.button>
            ))}
          </div>
        </section>

        <section
          className="cursor-pointer rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
          onClick={() => navigate("/app/missions")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") navigate("/app/missions");
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-black text-slate-950">Ce que {profile.name} fait pour vous</h2>
            <ChevronRight className="ml-auto h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {[
              { label: "Missions", value: summary.missions, icon: Flag, alert: false },
              { label: "Veilles", value: summary.watches, icon: BellRing, alert: false },
              { label: "À valider", value: summary.approvals, icon: ShieldCheck, alert: summary.approvals > 0 },
            ].map(({ label, value, icon: Icon, alert }) => (
              <div key={label} className={`rounded-2xl p-4 text-center ${alert ? "bg-amber-50" : "bg-slate-50"}`}>
                <Icon className={`mx-auto h-5 w-5 ${alert ? "text-amber-600" : "text-blue-600"}`} />
                <div className="mt-2 text-2xl font-black text-slate-950">{summaryLoading ? "…" : value}</div>
                <div className="mt-0.5 text-xs font-bold text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={contextualForYou.action}
          className="group flex w-full items-center gap-4 rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-violet-50 p-4 text-left shadow-sm transition hover:shadow-md sm:p-5"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm">
            {summary.approvals > 0 ? <CheckCircle2 className="h-6 w-6" /> : <Search className="h-6 w-6" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-black uppercase tracking-wide text-blue-600">Pour vous</span>
            <span className="mt-1 block text-lg font-black text-slate-950">{contextualForYou.title}</span>
            <span className="mt-1 block text-xs sm:text-sm font-medium text-slate-500">{contextualForYou.detail}</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-blue-500 transition group-hover:translate-x-1" />
        </button>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500">
          <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600" />
          <span>Votre Avatar prépare, recherche et conseille. Vous validez toujours les actions sensibles et les décisions finales.</span>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Personnaliser mon Avatar</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex justify-center">
              <div className={`grid h-28 w-28 place-items-center rounded-[32px] border-4 border-white bg-gradient-to-br ${presetGradient[draft.preset]} shadow-xl`}>
                <WaouhMuseAvatar phase="listening" size="lg" />
              </div>
            </div>

            <Input
              value={draft.name}
              onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value.slice(0, 18) }))}
              placeholder="Nom de votre Avatar"
              className="h-11 rounded-xl text-center font-bold"
            />

            <div>
              <div className="mb-2 text-sm font-bold text-slate-800">Apparence</div>
              <div className="grid grid-cols-6 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDraft((value) => ({ ...value, preset }))}
                    className={`h-12 rounded-2xl border bg-gradient-to-br ${presetGradient[preset]} ${draft.preset === preset ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
                    aria-label={preset}
                    title={preset}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-bold text-slate-800">Personnalité</div>
              <div className="flex flex-wrap gap-2">
                {PERSONALITIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDraft((value) => ({ ...value, personality: item }))}
                    className={`rounded-full border px-3 py-2 text-xs font-bold ${draft.personality === item ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-bold text-slate-800">Initiative</div>
              <div className="grid grid-cols-3 gap-2">
                {PROACTIVITIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDraft((value) => ({ ...value, proactivity: item }))}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold ${draft.proactivity === item ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <Button type="button" className="h-11 w-full rounded-xl" onClick={storeProfile}>
              <Bot className="mr-2 h-4 w-4" />
              Enregistrer mon Avatar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
