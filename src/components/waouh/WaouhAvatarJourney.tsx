import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Compass,
  Handshake,
  Loader2,
  LockKeyhole,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  expressNexusInterest,
  globalNexusDiscovery,
  moneyXof,
  prepareNexusContact,
  searchNexus,
  sendNexusDiscoveryContact,
  type NexusDiscoveryResult,
  type NexusSearchItem,
} from "@/lib/waouh/nexus";
import { invokeWaouhAgentic } from "@/lib/waouh/agenticClient";

export type AvatarJourneyMode = "buy" | "sell" | "ask";

const COPY: Record<AvatarJourneyMode, { title: string; subtitle: string; placeholder: string; icon: typeof Search }> = {
  buy: {
    title: "Acheter avec votre Avatar",
    subtitle: "Décrivez l’objectif. Avatar cherche, compare et ouvre le bon Deal Room.",
    placeholder: "Ex. Samsung S25 fiable sous 450 000 FCFA à Cotonou",
    icon: ShoppingBag,
  },
  sell: {
    title: "Vendre avec votre Avatar",
    subtitle: "Avatar trouve les acheteurs pertinents sans exposer vos contacts.",
    placeholder: "Ex. Je vends 10 tonnes de soja et cherche des acheteurs sérieux",
    icon: Handshake,
  },
  ask: {
    title: "Demander à votre Avatar",
    subtitle: "Avatar comprend votre objectif et orchestre NEXUS, Radar, Missions et Partenaires.",
    placeholder: "Ex. Trouve la meilleure façon d’acheter, vendre ou négocier",
    icon: Sparkles,
  },
};

function dispatchDealRoom(item: NexusSearchItem) {
  if (!item.article_id) return;
  window.dispatchEvent(
    new CustomEvent("waouh:open-match-chat", {
      detail: {
        article_id: item.article_id,
        counterpart_user_id: null,
        seller_user_id: null,
        kind: "buyer",
        title: item.title,
        price: item.price ?? null,
        city: item.city ?? null,
        photo: item.photos?.[0] ?? null,
        source: "avatar_journey",
      },
    }),
  );
}

export function WaouhAvatarJourney({ mode, onClose }: { mode: AvatarJourneyMode; onClose?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const copy = COPY[mode];
  const Icon = copy.icon;

  const [goal, setGoal] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [stage, setStage] = useState(0);
  const [status, setStatus] = useState("Décrivez votre objectif. Avatar s’occupe du reste.");
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [buyResults, setBuyResults] = useState<NexusSearchItem[]>([]);
  const [discovery, setDiscovery] = useState<NexusDiscoveryResult[]>([]);

  const budgetValue = useMemo(() => {
    const value = Number(budget.replace(/\D/g, ""));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }, [budget]);

  const run = async () => {
    const query = goal.trim();
    if (!query || busy) return;
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour lancer un parcours Avatar persistant." });
      return;
    }
    setBusy(true);
    setStage(1);
    setStatus("Avatar comprend votre objectif…");
    setBuyResults([]);
    setDiscovery([]);
    try {
      await invokeWaouhAgentic("mission.create", {
        goal: query,
        channel: "web_avatar",
        locale: "fr-BJ",
        constraints: {
          intent: mode,
          ...(city.trim() ? { city: city.trim() } : {}),
          ...(budgetValue ? { budget_max: budgetValue } : {}),
        },
        preferences: {},
      }).catch(() => null);

      setStage(2);
      setStatus(mode === "sell" ? "Avatar cherche les acheteurs et signaux de demande…" : "Avatar explore NEXUS, Radar, Partenaires et WAOUH…");

      if (mode === "buy") {
        const result = await searchNexus({
          query,
          budget_max: budgetValue,
          city: city.trim() || undefined,
          limit: 18,
          persist_intent: true,
        });
        setBuyResults(result.results);
        setStage(3);
        setStatus(result.results.length ? `Avatar a comparé ${result.results.length} option(s).` : "Aucune option immédiate. La mission reste active.");
      } else {
        const result = await globalNexusDiscovery({
          query,
          mode: mode === "sell" ? "find_buyers" : "auto",
          city: city.trim() || undefined,
          budget_max: budgetValue,
          limit: 20,
          refresh_external: true,
          smart: true,
        });
        setDiscovery(result.results);
        setStage(3);
        setStatus(result.results.length ? `Avatar a classé ${result.results.length} opportunité(s).` : "Aucune opportunité immédiate. La mission reste active.");
      }
    } catch (error: any) {
      toast({ title: "Exploration impossible", description: error?.message || String(error), variant: "destructive" });
      setStatus("Avatar n’a pas pu terminer cette exploration.");
    } finally {
      setBusy(false);
    }
  };

  const interest = async (item: NexusSearchItem) => {
    const key = item.article_id || item.catalog_id || item.title;
    setActing(key);
    setStage(4);
    setStatus("Avatar contacte le vendeur et prépare le Deal Room sécurisé…");
    try {
      await expressNexusInterest(item);
      dispatchDealRoom(item);
      toast({
        title: "Intérêt transmis",
        description: item.article_id
          ? "Le Deal Room s’ouvre pour poursuivre offre, contre-offre, accord, livraison et paiement."
          : "Le catalogue est en cours de promotion vers un article WAOUH. Le vendeur a été notifié.",
      });
      setStatus("Le vendeur est notifié. La négociation peut maintenant commencer.");
    } catch (error: any) {
      toast({ title: "Mise en relation impossible", description: error?.message || String(error), variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const approach = async (item: NexusDiscoveryResult) => {
    setActing(item.fabric_id);
    setStage(4);
    setStatus("Avatar vérifie le niveau de contact autorisé…");
    try {
      const prepared = await prepareNexusContact(item.fabric_id);
      if (!prepared.contact_policy.can_blind_message && !prepared.contact_policy.can_auto_contact) {
        toast({ title: "Contact protégé", description: "Cette opportunité reste surveillée : aucun contact privé direct n’est autorisé." });
        setStatus("Avatar garde cette opportunité sous surveillance.");
        return;
      }
      await sendNexusDiscoveryContact({
        fabric_id: item.fabric_id,
        confirmed: true,
        message:
          mode === "sell"
            ? "Bonjour, WAOUH vous transmet une offre compatible avec votre besoin. Souhaitez-vous poursuivre dans WAOUH ?"
            : "Bonjour, WAOUH a identifié une opportunité compatible. Souhaitez-vous poursuivre dans WAOUH ?",
      });
      toast({ title: "Approche envoyée", description: "WAOUH a transmis le message sans exposer vos coordonnées privées." });
      setStatus("Approche transmise. Avatar attend la réponse.");
    } catch (error: any) {
      toast({ title: "Approche impossible", description: error?.message || String(error), variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const stages = [
    ["Comprendre", Bot],
    ["Explorer", Compass],
    ["Comparer", Search],
    ["Agir", Handshake],
  ] as const;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-[28px] border-sky-100 bg-gradient-to-br from-white via-sky-50/70 to-violet-50/60 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 via-cyan-400 to-violet-400 p-[3px] shadow-lg shadow-blue-500/15">
              <div className="grid h-full w-full place-items-center rounded-full bg-white"><Bot className="h-7 w-7 text-blue-600" /></div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white">Avatar</Badge>
                <Badge variant="outline">NEXUS actif</Badge>
              </div>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">{copy.title}</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">{status}</p>
            </div>
            {onClose && <Button size="sm" variant="ghost" onClick={onClose}>Fermer</Button>}
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            {stages.map(([label, StageIcon], index) => {
              const active = stage >= index + 1;
              return (
                <div key={label} className="text-center">
                  <div className={`mx-auto grid h-9 w-9 place-items-center rounded-full ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                    <StageIcon className="h-4 w-4" />
                  </div>
                  <div className={`mt-1 text-[10px] font-bold ${active ? "text-blue-700" : "text-slate-400"}`}>{label}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="space-y-3 p-4">
          <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={copy.placeholder} className="min-h-24 resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville (optionnel)" />
            <Input value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={mode === "sell" ? "Prix cible" : "Budget max. FCFA"} />
          </div>
          <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={busy || !goal.trim()} onClick={() => void run()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Lancer avec mon Avatar
          </Button>
        </CardContent>
      </Card>

      {buyResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between"><h3 className="font-black">Options comparées</h3><span className="text-xs font-bold text-blue-600">{buyResults.length} résultat(s)</span></div>
          <div className="grid gap-3 lg:grid-cols-2">
            {buyResults.slice(0, 10).map((item) => {
              const key = item.article_id || item.catalog_id || item.title;
              return (
                <Card key={key} className="rounded-2xl">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><ShoppingBag className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-950">{item.title}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {moneyXof(item.price, item.currency)}{item.city ? ` · ${item.city}` : ""}{item.source ? ` · ${item.source}` : ""}
                        </div>
                      </div>
                      <Badge variant="secondary">{Math.round(item.scores.total_score)}%</Badge>
                    </div>
                    {item.advice && <p className="text-xs leading-relaxed text-slate-500">{item.advice}</p>}
                    <Button className="w-full" disabled={acting === key} onClick={() => void interest(item)}>
                      {acting === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Handshake className="mr-2 h-4 w-4" />}
                      Intéressé · ouvrir le Deal Room
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {discovery.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between"><h3 className="font-black">{mode === "sell" ? "Acheteurs et demandes" : "Opportunités détectées"}</h3><span className="text-xs font-bold text-blue-600">{discovery.length} signal(s)</span></div>
          <div className="grid gap-3 lg:grid-cols-2">
            {discovery.slice(0, 10).map((item) => (
              <Card key={item.fabric_id} className="rounded-2xl">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><Compass className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-950">{item.subject || item.category || "Opportunité WAOUH"}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline">{item.source_key}</Badge>
                        {item.city && <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{item.city}</Badge>}
                        <Badge variant="outline">{item.contact_policy.label}</Badge>
                      </div>
                    </div>
                    <Badge variant="secondary">{Math.round(item.scores.total_score)}%</Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">{item.scores.reasons?.slice(0, 3).join(" · ")}</p>
                  <Button className="w-full" disabled={acting === item.fabric_id} onClick={() => void approach(item)}>
                    {acting === item.fabric_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
                    Approcher via Avatar · contacts protégés
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!busy && stage >= 2 && buyResults.length === 0 && discovery.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-blue-50/40 p-5 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-blue-600" />
          <div className="mt-2 text-sm font-bold">La mission reste active</div>
          <p className="mt-1 text-xs text-muted-foreground">Avatar continuera à exploiter Missions & veille lorsque de nouvelles opportunités apparaîtront.</p>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-[11px] font-semibold text-muted-foreground">
        <LockKeyhole className="h-4 w-4 text-blue-600" />
        Contacts privés protégés. Les actions sensibles restent sous votre validation.
        <ArrowRight className="ml-auto h-4 w-4" />
      </div>
    </div>
  );
}

export default WaouhAvatarJourney;
