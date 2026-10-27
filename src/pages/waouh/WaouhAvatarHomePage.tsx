import { WaouhAutonomySettings } from '@/components/waouh/WaouhAutonomySettings';
import { WaouhPremiumAvatar } from '@/components/waouh/WaouhPremiumAvatar';
import { WaouhAvatarInbox } from "@/components/waouh/WaouhAvatarInbox";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  Bot,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  EyeOff,
  Flag,
  Gauge,
  Globe2,
  Heart,
  Mic,
  Moon,
  MessageSquareText,
  Rocket,
  Scale,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Volume2,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WaouhQuickAsk, type QuickAskKind } from "@/components/waouh/WaouhQuickAsk";
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
  /** N'affiche que le réglage de l'Avatar (nom, apparence, personnalité, initiative) —
   * sans la salutation complète, les 4 actions ni la jauge. Utilisé pour l'onglet
   * « Avatar » dans l'app (/app/avatar) ; l'accueil public (bot.bj, /) garde la version
   * complète. */
  settingsOnly?: boolean;
};

const PERSONALITY_ICON: Record<string, LucideIcon> = {
  Calme: Moon,
  Dynamique: Zap,
  Business: Briefcase,
  Chaleureux: Heart,
  Équilibré: Scale,
};

const PROACTIVITY_ICON: Record<string, LucideIcon> = {
  Discret: EyeOff,
  Équilibré: Gauge,
  Proactif: Rocket,
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

/** Réglage avatar — symboles d'abord, texte minimal : chaque choix est une icône
 * avec une légende courte, pas un bouton-texte. */
function AvatarSettingsFields({ draft, setDraft }: { draft: AvatarProfile; setDraft: (update: (value: AvatarProfile) => AvatarProfile) => void }) {
  return (
    <div className="space-y-5">
      <Input
        value={draft.name}
        onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value.slice(0, 18) }))}
        placeholder="Nom de l'Avatar"
        className="h-11 rounded-xl text-center font-bold"
      />

      <div className="grid grid-cols-6 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setDraft((value) => ({ ...value, preset }))}
            className={`h-12 rounded-2xl border bg-gradient-to-br ${presetGradient[preset]} ${draft.preset === preset ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
            aria-label={`Apparence ${preset}`}
            title={preset}
          />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {PERSONALITIES.map((item) => {
          const Icon = PERSONALITY_ICON[item] ?? Scale;
          const active = draft.personality === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setDraft((value) => ({ ...value, personality: item }))}
              aria-label={`Personnalité : ${item}`}
              aria-pressed={active}
              title={item}
              className={`flex flex-col items-center gap-1 rounded-2xl border py-2.5 ${active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500"}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-bold leading-none">{item}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PROACTIVITIES.map((item) => {
          const Icon = PROACTIVITY_ICON[item] ?? Gauge;
          const active = draft.proactivity === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setDraft((value) => ({ ...value, proactivity: item }))}
              aria-label={`Initiative : ${item}`}
              aria-pressed={active}
              title={item}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 ${active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500"}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-bold leading-none">{item}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WaouhAvatarHomePage({ onAsk, settingsOnly = false }: WaouhAvatarHomePageProps) {
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
    if (settingsOnly) return;
    void refreshSummary();
    const timer = window.setInterval(() => void refreshSummary(), 30000);
    const onFocus = () => void refreshSummary();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshSummary, settingsOnly]);

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
        action: () => navigate("/app/missions?view=suivi&focus=approvals"),
      };
    }
    if (summary.watches > 0) {
      return {
        title: "Le marché est surveillé",
        detail: `${profile.name} suit ${summary.watches} veille(s) pour vous.`,
        action: () => navigate("/app/missions?view=suivi&focus=watches"),
      };
    }
    if (summary.missions > 0) {
      return {
        title: "Recherche en cours",
        detail: `${profile.name} poursuit ${summary.missions} mission(s).`,
        action: () => navigate("/app/missions?view=suivi&focus=missions"),
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

  const [quickAsk, setQuickAsk] = useState<QuickAskKind | null>(null);

  const actions = [
    {
      title: "Acheter",
      subtitle: "Je trouve et compare",
      icon: ShoppingBag,
      card: "from-blue-50 to-blue-100/80 border-blue-100",
      iconTone: "text-blue-600",
      action: () => (user ? setQuickAsk("acheter") : navigate("/app/avatar/acheter")),
    },
    {
      title: "Vendre",
      subtitle: "Je trouve des acheteurs",
      icon: Tag,
      card: "from-amber-50 to-orange-100/75 border-amber-100",
      iconTone: "text-amber-600",
      action: () => (user ? setQuickAsk("vendre") : navigate("/app/avatar/vendre")),
    },
    {
      title: "Trouver",
      subtitle: "Partout avec NEXUS",
      icon: Globe2,
      card: "from-cyan-50 to-sky-100/80 border-cyan-100",
      iconTone: "text-cyan-600",
      action: () => (user ? setQuickAsk("trouver") : navigate("/app/nexus")),
    },
    {
      title: "Demander",
      subtitle: "Parlez naturellement",
      icon: MessageSquareText,
      card: "from-violet-50 to-purple-100/80 border-violet-100",
      iconTone: "text-violet-600",
      action: () => (user ? setQuickAsk("demander") : navigate("/app/avatar/demander")),
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

  if (settingsOnly) return <main className="h-full overflow-y-auto bg-[#f5f7fc] px-3 py-4 pb-28"><WaouhAutonomySettings key={user?.id??'guest'} name={profile.name} appearance={<><AvatarSettingsFields draft={draft} setDraft={setDraft}/><Button className="mt-4 w-full" onClick={storeProfile}>Enregistrer ma présentation</Button></>}/></main>;
  return <main className="h-full overflow-y-auto bg-[#f5f7fc] px-3 py-4 pb-28"><WaouhPremiumAvatar name={profile.name} firstName={mobileProfile?.full_name} missions={summary.missions} approvals={summary.approvals} onAction={kind=>actions.find(action=>action.title.toLowerCase()===kind)?.action()} onSettings={()=>navigate('/app/avatar')} onMissions={()=>navigate('/app/missions')} onAsk={value=>navigate(`/app/nexus?${new URLSearchParams({q:value,go:'1',kind:'trouver',mode:'auto'})}`)}/><WaouhQuickAsk kind={quickAsk} onClose={()=>setQuickAsk(null)} onSubmit={path=>{setQuickAsk(null);navigate(path);}}/></main>;
/* Previous composition retained in git history. */
}
