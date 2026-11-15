import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Check, MapPin, Wallet, X } from "lucide-react";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { WaouhChatMarketBrief } from "@/components/waouh/WaouhChatMarketBrief";
import { GUIDED_KIND_LABEL, type GuidedKind } from "@/lib/waouh/guidedAsk";
import { briefMoney } from "@/lib/waouh/chatMarketBrief";
import { SEARCH_STAGES, searchStage } from "@/lib/waouh/chatSearchStage";
import "./waouh-search-live.css";
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
  /** Entrée guidée d'origine (Acheter, Service, Prestation…) ; absente pour une phrase libre. */
  kind?: GuidedKind;
  budget?: number | null;
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

  // À la fin du déroulé, on amène l'analyse (puis les offres) en haut de la fenêtre.
  const outcomeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!revealed) return;
    const box = scroller.current, target = outcomeRef.current;
    if (!box) return;
    box.scrollTo({ top: target ? Math.max(0, target.offsetTop - box.offsetTop - 8) : box.scrollHeight, behavior: "smooth" });
  }, [revealed]);

  const stage = searchStage(search, revealed);
  const failed = search?.status === "error";

  return (
    <Sheet open={!!search} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="wsl flex w-full flex-col gap-0 p-0 sm:max-w-2xl [&>button]:hidden" data-waouh-ui="search-live-v2">
        <SheetTitle className="sr-only">Recherche live</SheetTitle>
        <SheetDescription className="sr-only">Déroulé de la recherche, analyse du marché et offres trouvées</SheetDescription>
        <header className="wsl-head">
          <div className="wsl-head-row">
            <button type="button" onClick={onClose} aria-label="Retour au chat" className="wsl-icon"><ArrowLeft size={19} /></button>
            <BotLiveAvatar size={40} state={running ? "thinking" : "idle"} />
            <div className="wsl-head-copy">
              <span className="wsl-kicker">{search?.kind ? `${GUIDED_KIND_LABEL[search.kind]} · ` : ""}{running ? "Bot cherche pour vous" : revealed ? "Recherche terminée" : "Bot analyse les offres"}</span>
              <strong>{search?.goal}</strong>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer" className="wsl-icon"><X size={17} /></button>
          </div>
          {(search?.city || search?.budget) && (
            <div className="wsl-chips">
              {search?.city && <span><MapPin size={12} aria-hidden="true" />{search.city}</span>}
              {search?.budget ? <span><Wallet size={12} aria-hidden="true" />Budget {briefMoney(search.budget)}</span> : null}
            </div>
          )}
          <ol className="wsl-stages" aria-label="Avancement">
            {SEARCH_STAGES.map((label, i) => (
              <li key={label} className={i < stage ? "is-done" : i === stage ? "is-current" : undefined} aria-current={i === stage ? "step" : undefined}>
                <span>{i < stage ? <Check size={11} aria-hidden="true" /> : i + 1}</span>{label}
              </li>
            ))}
          </ol>
        </header>

        <div ref={scroller} className="wsl-body">
          <WaouhReasoningFeed steps={feed.shown} running={running} pending={feed.pending} summary={revealed ? outcome?.summary ?? null : null} onSkip={feed.skip} />
          <div ref={outcomeRef} className="wsl-anchor" aria-hidden="true" />
          {revealed && search && search.results.length > 0 && (
            <>
              <WaouhChatMarketBrief results={search.results} city={search.city} budget={search.budget ?? null} kind={search.kind} />
              <div className="wsl-offers">
                <div className="wsl-offers-head">
                  <strong>Les offres</strong>
                  <span>Choisissez une offre, écrivez au vendeur ou proposez votre prix : l’échange s’ouvre dans votre Chat.</span>
                </div>
                <WaouhProductResults results={search.results} onAction={onAction} />
              </div>
            </>
          )}
          {revealed && search && search.results.length === 0 && (
            <div className="wsl-empty" role="status">
              <strong>{failed ? "La recherche a été interrompue" : "Aucune offre assez proche pour le moment"}</strong>
              <p>{failed ? "Rien n’a été envoyé. Vous pouvez relancer votre demande depuis le chat." : "Précisez le modèle, la ville ou le budget : Bot relance aussitôt la recherche."}</p>
              <button type="button" className="wsl-primary" onClick={onClose}>Préciser ma demande</button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default WaouhChatSearchWindow;
