import {WaouhSmartSale} from './WaouhSmartSale';
import {useAuth} from '@/contexts/AuthContext';
import {buildWaouhAuthRedirect} from '@/lib/waouhAccessPolicy';
import { useEffect, useRef, useState } from "react";
import { WaouhCityField } from "./WaouhCityField";
import { Search, Sparkles, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { guidedBudget, guidedChatPath, queueGuidedAsk, type GuidedAskInput, type GuidedKind } from "@/lib/waouh/guidedAsk";

import { followAutomaticSearch, type AutomaticSearch } from "@/lib/waouh/automaticMission";
import { saleSearchPath } from "@/lib/waouh/smartSale";

const DELEGATION: Partial<Record<GuidedKind, NonNullable<AutomaticSearch["discovery_kind"]>>> = {
  acheter: "purchase", service: "service", prestation: "project", opportunite: "opportunity", vendre: "sale",
};
const NEXT_STEP: Record<GuidedKind, string> = {
  acheter: "Bot compare et négocie dans votre budget. Vous validez l’accord.",
  vendre: "Bot recherche des acheteurs et négocie au-dessus de votre plancher. Vous validez la vente.",
  trouver: "Bot élargit la recherche et vous prévient. Vous choisissez la piste.",
  demander: "Bot cherche et compare les réponses à votre besoin. Vous choisissez la suite.",
  opportunite: "Bot surveille les annonces et les échéances. Vous choisissez où déposer votre dossier.",
  service: "Bot demande des devis comparables. Vous validez le prestataire.",
  prestation: "Bot compare les conditions et le coût. Vous validez les modalités.",
};

export type QuickAskKind = GuidedKind;

/** Lien de recherche publique, gardé pour un visiteur non connecté. */

const COPY: Record<QuickAskKind, {
  title: string; line: string; field: string; chips: string[]; cta: string; budget: string | null;
}> = {
  acheter: {
    title: "Acheter",
    line: "Que cherchez-vous ?",
    field: "Ex. iPhone 13, moto, climatiseur…",
    chips: ["Samsung S25", "Moto d’occasion", "Climatiseur 1,5 CV"],
    cta: "Chercher pour moi",
    budget: "Budget max (FCFA)",
  },
  vendre: {
    title: "Vendre",
    line: "Que vendez-vous ?",
    field: "Ex. mon téléphone, 10 tonnes de soja…",
    chips: ["Mon téléphone", "10 tonnes de soja", "Ma moto"],
    cta: "Trouver des acheteurs",
    budget: "Prix souhaité (FCFA)",
  },
  trouver: {
    title: "Trouver",
    line: "Bot cherche partout pour vous.",
    field: "Produit, service, vendeur ou acheteur…",
    chips: ["Un S25 fiable à Cotonou", "Vendre 10 tonnes de soja", "Plombier à Porto-Novo"],
    cta: "Lancer la recherche",
    budget: "Budget (FCFA, facultatif)",
  },
  opportunite: {
    title: "Opportunité",
    line: "Quelle opportunité cherchez-vous ?",
    field: "Ex. appel d’offres, emploi, bourse, partenariat…",
    chips: ["Appel d’offres BTP", "Stage en informatique", "Subvention agricole"],
    cta: "Chercher des opportunités",
    budget: null,
  },
  service: {
    title: "Service",
    line: "De quel service avez-vous besoin ?",
    field: "Ex. plombier, électricien, livreur…",
    chips: ["Plombier", "Réparation de climatiseur", "Livreur fiable"],
    cta: "Trouver un professionnel",
    budget: "Budget max (FCFA)",
  },
  prestation: {
    title: "Prestation",
    line: "Quelle prestation voulez-vous confier ?",
    field: "Ex. site web, traiteur pour 50 personnes…",
    chips: ["Création d’un site vitrine", "Traiteur pour 50 personnes", "Logo et charte graphique"],
    cta: "Trouver un prestataire",
    budget: "Budget max (FCFA)",
  },
  demander: {
    title: "Demander",
    line: "Dites-le comme vous voulez.",
    field: "De quoi avez-vous besoin ?",
    chips: ["Un livreur fiable", "Traiteur pour 50 personnes", "Un plombier"],
    cta: "Demander à Bot",
    budget: null,
  },
};

/** Formulaire express (bottom-sheet) : 1 champ, ville/budget qui apparaissent quand utile. */
export function WaouhQuickAsk({
  kind, onClose, onSubmit, onAsk, initialQuery = "",
}: {
  kind: QuickAskKind | null;
  initialQuery?: string;
  onClose: () => void;
  onSubmit: (path: string) => void;
  /** Compte connecté : la demande part par le moteur du Chat au lieu d'ouvrir un autre écran. */
  onAsk?: (ask: GuidedAskInput) => void;
}) {
  const {user}=useAuth();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sellWithBot, setSellWithBot] = useState(false);
  const lock = useRef(false);
  useEffect(() => { setSellWithBot(false); setError(""); if (kind) { setQ(initialQuery); setCity(""); setBudget(""); } }, [kind, initialQuery]);
  const c = kind ? COPY[kind] : null;

  const needsBudget = kind === "acheter" || kind === "service" || kind === "prestation";
  const launch = async (request: AutomaticSearch) => {
    if (!user || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await followAutomaticSearch(user.id, { ...request, confirmed_entry_delegation: true });
      if (result.skipped === "paused") throw new Error("Bot est en pause. Réactivez-le dans les réglages de l’Avatar.");
      if (!result.mandate?.metadata?.entry_delegation) throw new Error("La mission n’a pas été activée. Réessayez.");
      onSubmit(`/app/missions?mandate=${encodeURIComponent(result.mandate.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La mission n’a pas pu être démarrée. Réessayez.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const delegate = () => {
    if (!kind || q.trim().length < 3) return;
    if (!user) {
      onSubmit(buildWaouhAuthRedirect("/app/chat", "/app/auth"));
      return;
    }
    const limit = guidedBudget(budget);
    if (needsBudget && !limit) {
      setError("Indiquez votre budget maximal pour confier la mission.");
      return;
    }
    void launch({
      goal: q.trim(), city: city.trim() || undefined, budget_max: limit ?? undefined,
      mode: kind === "acheter" ? "buy" : "ask", discovery_kind: DELEGATION[kind],
      completion_goal: needsBudget ? "agreement" : "recommendations",
    });
  };

  const go = () => {
    if (!c || !kind || !q.trim() || lock.current) return;
    if (onAsk && user && kind !== "vendre") { onAsk({ kind, q: q.trim(), city: city.trim(), budget }); return; }
    // Même chemin pour tous : la demande est déposée pour le Chat, qui s'ouvre (connexion d'abord pour un visiteur).
    queueGuidedAsk({ kind, q: q.trim(), city: city.trim(), budget });
    onSubmit(user ? guidedChatPath() : buildWaouhAuthRedirect(guidedChatPath(), "/app/auth"));
  };

  return (
    <Sheet open={!!kind} onOpenChange={(open) => !open && !lock.current && onClose()}>
      <SheetContent side="bottom" className={kind==='vendre'?'wss-sheet [&>button]:hidden':"max-h-[90dvh] overflow-y-auto rounded-t-[28px] border-slate-200 bg-white px-5 pb-6 pt-5 [&>button]:hidden"}>
        {kind === "vendre" ? <>
          <div className="wss-sheet-heading"><BotLiveAvatar size={40}/><div><SheetTitle>Vendre</SheetTitle><SheetDescription>{NEXT_STEP.vendre}</SheetDescription></div><button type="button" aria-label="Fermer" disabled={busy} onClick={onClose}><X size={19}/></button></div>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-900">
            <input type="checkbox" checked={sellWithBot} disabled={busy} onChange={event => setSellWithBot(event.target.checked)} /> Confier la vente à Bot
          </label>
          {sellWithBot && <Input value={budget} inputMode="numeric" disabled={busy} onChange={e => setBudget(e.target.value.replace(/\D/g, ""))} placeholder="Prix plancher privé (FCFA)" aria-label="Prix plancher privé (FCFA)" />}
          {error && <p role="alert">{error}</p>}
          {busy && <p role="status">Activation du mandat…</p>}
          <WaouhSmartSale key={user?.id ?? "guest"} publishLabel={sellWithBot ? "Publier et confier à Bot" : undefined} beforePublish={() => {
            if (lock.current) return false;
            if (!sellWithBot || guidedBudget(budget)) return true;
            setError("Indiquez votre prix plancher avant de publier.");
            return false;
          }} onPublished={sale => {
            if (!user) return;
            if (!sellWithBot) { onSubmit(saleSearchPath(user.id, sale)); return; }
            const floor = guidedBudget(budget);
            if (!floor) return;
            void launch({ goal: sale.article.title, city: sale.draft.city, article_id: sale.article.article_id,
              mode: "sell", discovery_kind: "sale", mission_context: {
                kind: "sale", price_floor: floor, brief: sale.draft.description,
                quantity: sale.draft.quantity, unit: sale.draft.unit, max_days: null, required_pages: null,
              }, completion_goal: "transaction" });
          }} onConnect={() => onSubmit(buildWaouhAuthRedirect("/app/nexus?kind=vendre"))} />
        </> : c && (
          <div className="mx-auto w-full max-w-lg space-y-3">
            <div className="flex items-center gap-3">
              <BotLiveAvatar size={56} state={q.trim() ? "talking" : "idle"} />
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-xl font-black text-slate-950">{c.title}</SheetTitle>
                <SheetDescription className="mt-1 inline-block rounded-2xl rounded-tl-sm border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-blue-900">{c.line}</SheetDescription>
              </div>
              <button type="button" aria-label="Fermer" onClick={onClose} disabled={busy} className="grid h-9 w-9 place-items-center rounded-full border border-blue-100 bg-white text-slate-500"><X className="h-4 w-4" /></button>
            </div>

            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); go(); } }}
              aria-label={c.line}
              placeholder={c.field}
              className="h-12 rounded-2xl border-blue-100 bg-white"
            />

            {!q.trim() ? (
              <div className="flex flex-wrap gap-1.5">
                {c.chips.map((chip) => (
                  <button key={chip} type="button" onClick={() => setQ(chip)} className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-bold text-blue-700 shadow-sm active:scale-95">{chip}</button>
                ))}
              </div>
            ) : (
              <div className={`grid gap-2 ${c.budget ? "grid-cols-2" : "grid-cols-1"}`}>
                <WaouhCityField value={city} onChange={setCity} placeholder="Ville ou quartier" />
                {c.budget && (
                  <Input value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={c.budget} aria-label={c.budget} className="h-11 rounded-2xl border-blue-100 bg-white" />
                )}
              </div>
            )}

            <section className="space-y-2 rounded-3xl bg-slate-50 p-3">
              <p className="px-1 text-sm text-slate-700">{kind && NEXT_STEP[kind]}</p>
              <Button onClick={delegate} disabled={q.trim().length < 3 || busy} className="h-12 w-full rounded-2xl bg-blue-600 font-semibold text-white">
                <Sparkles className="mr-2 h-4 w-4" />{busy ? "Activation du mandat…" : user ? "Confier à Bot" : "Se connecter pour confier à Bot"}
              </Button>
              <Button variant="ghost" onClick={go} disabled={!q.trim() || busy} className="h-11 w-full rounded-2xl text-slate-700">
                <Search className="mr-2 h-4 w-4" /> Voir les résultats moi-même
              </Button>
              {error && <p role="alert" className="px-1 text-sm text-rose-700">{error}</p>}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default WaouhQuickAsk;
