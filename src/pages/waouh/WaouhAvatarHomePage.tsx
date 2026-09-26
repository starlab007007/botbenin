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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  name: "Ayo",
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
    const name = localStorage.getItem("waouh.avatar.name") || DEFAULT_PROFILE.name;
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
    localStorage.setItem("waouh.avatar.name", profile.name.trim() || "Ayo");
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

    if (onAsk) {
      onAsk(text);
      return;
    }

    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1180;
    if (isDesktop) {
      navigate("/");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("waouh:avatar-ask", { detail: { prompt: text } }));
      }, 80);
    } else {
      navigate(`/app/chat/waouh?prefill=${encodeURIComponent(text)}`);
    }
  }, [navigate, onAsk]);

  const submitPrompt = () => {
    const text = prompt.trim();
    if (!text) return;
    setPrompt("");
    askAvatar(text);
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Saisie vocale non disponible",
        description: "Votre navigateur ne fournit pas la reconnaissance vocale. Vous pouvez écrire à Ayo.",
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
    const next = { ...draft, name: draft.name.trim() || "Ayo" };
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

  const suggestions = summary.approvals > 0
    ? ["Que dois-je valider ?", "Résume mes négociations", "Quelles actions sont urgentes ?"]
    : summary.missions > 0
      ? ["Où en sont mes missions ?", "Compare les meilleures options", "Que faut-il faire ensuite ?"]
      : ["Trouve-moi un bon téléphone à Cotonou", "Je veux vendre un produit", "Aide-moi à trouver un service"];

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,.10),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(139,92,246,.08),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#ffffff_58%)]">
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-violet-50/80 px-5 py-5 shadow-[0_24px_70px_-48px_rgba(37,99,235,.45)] sm:px-7 sm:py-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-300/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-violet-300/10 blur-3xl" />

          <div className="relative grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="flex justify-center">
              <motion.div
                animate={
                  phase === "idle"
                    ? { y: [0, -5, 0] }
                    : phase === "listening"
                      ? { scale: [1, 1.06, 1] }
                      : { scale: [1, 1.035, 1] }
                }
                transition={{ duration: phase === "idle" ? 3.6 : 1.35, repeat: Infinity, ease: "easeInOut" }}
                className={`relative grid h-40 w-40 place-items-center rounded-[42px] border-4 border-white bg-gradient-to-br ${presetGradient[profile.preset]} shadow-xl shadow-blue-500/10`}
              >
                <div className="absolute -inset-3 rounded-[48px] border border-blue-200/50" />
                <WaouhMuseAvatar phase={phase} size="lg" className="scale-125" />
                <span className="absolute right-3 top-3 rounded-full border border-white bg-white/85 px-2 py-1 text-[9px] font-black text-blue-600 shadow-sm">
                  WAOUH AI
                </span>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-emerald-100 bg-white/90 px-2.5 py-1 text-[9px] font-bold text-emerald-700 shadow-sm">
                  ● Actif
                </span>
              </motion.div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full border-blue-200 bg-white/80 text-blue-700">
                  <Sparkles className="mr-1 h-3 w-3" /> Votre Avatar WAOUH
                </Badge>
                <Badge variant="outline" className="rounded-full border-cyan-200 bg-white/80 text-cyan-700">
                  NEXUS
                </Badge>
              </div>

              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-950">{profile.name}</h1>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Votre Avatar WAOUH · {profile.personality}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="rounded-2xl bg-white/80"
                  onClick={() => {
                    setDraft(profile);
                    setSettingsOpen(true);
                  }}
                  aria-label="Personnaliser mon Avatar"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <motion.p
                key={status}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-lg font-bold text-slate-800"
              >
                {status}
              </motion.p>

              <div className="mt-3 flex flex-wrap gap-2">
                {[profile.personality, profile.proactivity, "NEXUS"].map((label) => (
                  <span key={label} className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-blue-600">
                    {label}
                  </span>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant={voiceActive ? "default" : "ghost"}
                    className="h-10 w-10 shrink-0 rounded-xl"
                    onClick={startVoice}
                    aria-label="Parler à mon Avatar"
                  >
                    {voiceActive ? <Volume2 className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Input
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") submitPrompt();
                    }}
                    placeholder={`Dites à ${profile.name} ce que vous voulez faire…`}
                    className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <Button type="button" className="h-10 rounded-xl px-4" onClick={submitPrompt} disabled={!prompt.trim()}>
                    <Send className="mr-2 h-4 w-4" />
                    Demander
                  </Button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => askAvatar(suggestion)}
                    className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-black tracking-tight text-slate-950">Que voulez-vous faire ?</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                className={`group rounded-[24px] border bg-gradient-to-br ${card} p-5 text-left shadow-sm transition hover:shadow-md`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 shadow-sm">
                  <Icon className={`h-5 w-5 ${iconTone}`} />
                </span>
                <span className="mt-5 block text-lg font-black text-slate-950">{title}</span>
                <span className="mt-1 block text-sm font-semibold text-slate-500">{subtitle}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500 transition group-hover:text-slate-900">
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
            <span className="mt-1 block text-sm font-semibold text-slate-500">{contextualForYou.detail}</span>
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
