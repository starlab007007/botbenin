import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ListChecks, ArrowRight, Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Résumé automatique de la conversation POUR UN SEUL ARTICLE.
 * Calculé côté client à partir des messages de la fenêtre courante :
 * points clés, prochaine étape, décision. Aucune fenêtre n'est mélangée :
 * le composant ne reçoit que les messages déjà isolés (1 article × 1 interlocuteur).
 */
export type SummaryMsg = { direction: "in" | "out"; text: string; created_at?: string };

const money = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

function extractPrices(text: string): number[] {
  const out: number[] = [];
  const re = /(\d[\d\s.]{2,})\s*(?:f\s?cfa|fcfa|xof|f\b)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = Number(m[1].replace(/[\s.]/g, ""));
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

export type ArticleSummary = {
  keyPoints: string[];
  nextStep: string;
  decision: string;
  decisionTone: "done" | "pending" | "cancelled";
};

export function buildArticleSummary(
  messages: SummaryMsg[],
  ctx: { title?: string | null; price?: number | null; role: "buyer" | "seller"; closed?: boolean }
): ArticleSummary {
  const all = messages.map((m) => m.text || "").join("\n").toLowerCase();
  const keyPoints: string[] = [];

  if (ctx.title) keyPoints.push(`Article : ${ctx.title}${ctx.price ? ` — annoncé à ${money(Number(ctx.price))}` : ""}`);

  const offers = messages.flatMap((m) => extractPrices(m.text || "").map((p) => ({ p, dir: m.direction })));
  const buyerOffer = offers.filter((o) => (ctx.role === "buyer" ? o.dir === "in" : o.dir === "out")).pop();
  const sellerOffer = offers.filter((o) => (ctx.role === "buyer" ? o.dir === "out" : o.dir === "in")).pop();
  if (buyerOffer) keyPoints.push(`Offre acheteur : ${money(buyerOffer.p)}`);
  if (sellerOffer) keyPoints.push(`Prix vendeur : ${money(sellerOffer.p)}`);

  if (/livrai|livreur|expédi/.test(all)) keyPoints.push("Livraison évoquée");
  if (/mobile money|momo|mtn|moov|espèce|cash|paiement/.test(all)) keyPoints.push("Modalité de paiement évoquée");
  if (/rendez|rencontr|lieu|adresse|quartier/.test(all)) keyPoints.push("Lieu / rendez-vous discuté");
  if (messages.length) keyPoints.push(`${messages.length} message${messages.length > 1 ? "s" : ""} échangé${messages.length > 1 ? "s" : ""}`);

  let decision = "Négociation en cours";
  let decisionTone: ArticleSummary["decisionTone"] = "pending";
  let nextStep =
    ctx.role === "buyer"
      ? "Proposer votre prix ou demander une photo supplémentaire"
      : "Répondre à l'acheteur et confirmer la disponibilité";

  if (/annul|plus intéress|abandon/.test(all)) {
    decision = "Discussion annulée";
    decisionTone = "cancelled";
    nextStep = "Relancer une recherche pour un autre article";
  }
  if (ctx.closed || /vente conclue|achat confirmé|vendu|marché conclu/.test(all)) {
    decision = "Vente conclue";
    decisionTone = "done";
    nextStep = "Organiser la livraison et finaliser le paiement";
  } else if (/d'accord|ok pour|j'accepte|ça marche/.test(all)) {
    decision = "Accord de principe sur le prix";
    nextStep = "Confirmer l'achat pour déclencher la livraison";
  } else if (buyerOffer && sellerOffer && buyerOffer.p !== sellerOffer.p) {
    decision = `Écart de ${money(Math.abs(sellerOffer.p - buyerOffer.p))} à combler`;
    nextStep = "Proposer un prix intermédiaire";
  }

  return { keyPoints: keyPoints.slice(0, 5), nextStep, decision, decisionTone };
}

export function WaouhArticleSummary({
  messages,
  title,
  price,
  role,
  closed,
  className,
}: {
  messages: SummaryMsg[];
  title?: string | null;
  price?: number | null;
  role: "buyer" | "seller";
  closed?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  const s = useMemo(() => buildArticleSummary(messages, { title, price, role, closed }), [messages, title, price, role, closed]);

  if (!messages.length) return null;

  return (
    <div className={cn("mx-auto w-full rounded-xl border border-border bg-card/95 px-3 py-2 shadow-sm", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <ListChecks className="h-4 w-4 text-primary shrink-0" />
        <span className="flex-1 text-[12px] font-semibold text-foreground">Résumé de cette négociation</span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
            s.decisionTone === "done" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            s.decisionTone === "cancelled" && "bg-destructive/15 text-destructive",
            s.decisionTone === "pending" && "bg-muted text-muted-foreground"
          )}
        >
          {s.decision}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-1.5 space-y-1">
          <ul className="space-y-0.5">
            {s.keyPoints.map((k, i) => (
              <li key={i} className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground">
                <span className="text-primary">•</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-2 py-1 text-[11px] text-foreground">
            <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span><span className="font-semibold">Prochaine étape :</span> {s.nextStep}</span>
          </div>
          <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Gavel className="mt-0.5 h-3 w-3 shrink-0" />
            <span><span className="font-semibold">Décision :</span> {s.decision}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default WaouhArticleSummary;
