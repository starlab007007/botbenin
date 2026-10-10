import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { WaouhProductResults, type WaouhResultCard } from "@/components/waouh/WaouhProductCard";
import { WaouhReasoningFeed, useReasoningFeed } from "@/components/waouh/WaouhReasoningFeed";
import { resultContact, channelLabel } from "@/lib/waouh/resultCardData";
import { maskPhone, planSteps, sameZone, summaryStep, type ReasonStep, type ReasonSummary } from "@/lib/waouh/liveReasoning";

export type ChatSearch = {
  id: string;
  goal: string;
  city: string;
  status: "running" | "done" | "error";
  results: WaouhResultCard[];
  text: string;
};

const priceOf = (r: WaouhResultCard) => {
  const v = r.price ?? r.price_min ?? r.price_max;
  return typeof v === "number" && v > 0 ? v : null;
};

const money = (n: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} FCFA`;

/** Étapes finales, construites uniquement à partir des résultats réellement renvoyés. */
export function chatSearchOutcome(search: ChatSearch): { steps: ReasonStep[]; summary: ReasonSummary } {
  const results = search.results;
  const ctx = { query: search.goal, city: search.city };
  const prices = results.map(priceOf).filter((p): p is number => p !== null);
  const inZone = results.filter((r) => sameZone(r.city, search.city)).length;
  const withContact = results.filter((r) => !!resultContact(r).phone);
  const contactable = results.filter((r) => !!r.fabric_id || !!r.article_id || !!resultContact(r).phone).length;
  const summary: ReasonSummary = {
    found: results.length,
    internal: results.filter((r) => !r.fabric_id).length,
    external: results.filter((r) => !!r.fabric_id).length,
    inZone,
    contactable,
    bestPrice: prices.length ? Math.min(...prices) : null,
    nextSteps: results.length
      ? ["Confiez une offre à Bot : il contacte et prépare la négociation.", results.length < 4 ? "Peu de résultats : activez une veille." : "Vous validez toujours l’accord final."]
      : ["Précisez votre besoin : je relance la recherche."],
  };
  const steps: ReasonStep[] = [];
  if (!results.length) {
    steps.push({ id: "none", tone: "warn", text: search.text.trim() ? search.text.trim().slice(0, 220) : "Aucune annonce assez proche pour le moment." });
  } else {
    steps.push({ id: "found", tone: "found", text: `${results.length} ${results.length > 1 ? "annonces trouvées" : "annonce trouvée"}${inZone ? ` · ${inZone} dans votre zone` : ""}.` });
    if (withContact.length) {
      steps.push({
        id: "contact",
        tone: "contact",
        text: `${withContact.length} contact${withContact.length > 1 ? "s" : ""} joignable${withContact.length > 1 ? "s" : ""} · numéros masqués.`,
        evidence: withContact.slice(0, 3).map((r, i) => {
          const c = resultContact(r);
          const p = priceOf(r);
          return { key: `${r.id}-${i}`, title: r.title, city: r.city ?? null, inZone: sameZone(r.city, search.city), price: p ? money(p) : null, phone: c.phone ? maskPhone(c.phone.replace(/\D/g, "").slice(-4)) : null, channel: channelLabel(c.channel) || null };
        }),
      });
    }
    steps.push(summaryStep(summary, ctx));
  }
  return { steps, summary };
}

/**
 * Fenêtre « Recherche live » : chaque recherche du chat s'ouvre ici, jamais dans l'historique.
 * Le raisonnement progresse en direct, puis les résultats s'affichent comme dans le chat.
 */
export function WaouhChatSearchWindow({ search, onClose, onAction }: {
  search: ChatSearch | null;
  onClose: () => void;
  onAction?: (text: string, meta?: Record<string, unknown>) => void;
}) {
  const feed = useReasoningFeed();
  const startedFor = useRef<string | null>(null);
  const finishedFor = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!search || startedFor.current === search.id) return;
    startedFor.current = search.id;
    finishedFor.current = null;
    feed.reset();
    feed.push(planSteps({ query: search.goal, city: search.city || undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search?.id]);

  const outcome = useMemo(() => (search && search.status !== "running" ? chatSearchOutcome(search) : null), [search]);

  useEffect(() => {
    if (!search || !outcome || finishedFor.current === search.id) return;
    if (startedFor.current !== search.id) return;
    finishedFor.current = search.id;
    feed.push(outcome.steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, search?.id]);

  const running = !search || search.status === "running";
  const revealed = !running && feed.pending === 0;

  useEffect(() => {
    if (revealed) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [revealed]);

  return (
    <Sheet open={!!search} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-blue-100 bg-gradient-to-b from-white to-blue-50/50 p-0 sm:max-w-xl [&>button]:hidden">
        <SheetTitle className="sr-only">Recherche live</SheetTitle>
        <SheetDescription className="sr-only">Raisonnement de Bot et résultats de la recherche</SheetDescription>
        <header className="flex shrink-0 items-center gap-2 border-b border-blue-100 bg-white/90 px-3 py-2.5 backdrop-blur">
          <button type="button" onClick={onClose} aria-label="Retour au chat" className="grid h-9 w-9 place-items-center rounded-full text-slate-600 active:scale-95"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Recherche live</div>
            <div className="truncate text-sm font-black text-slate-950">{search?.goal}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 active:scale-95"><X className="h-4 w-4" /></button>
        </header>

        <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
          <WaouhReasoningFeed steps={feed.shown} running={running} pending={feed.pending} summary={revealed ? outcome?.summary ?? null : null} onSkip={feed.skip} />
          {revealed && search && search.results.length > 0 && (
            <div className="space-y-2">
              <div className="px-1 text-sm font-black text-slate-900">Résultats</div>
              <WaouhProductResults results={search.results} onAction={onAction} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default WaouhChatSearchWindow;
