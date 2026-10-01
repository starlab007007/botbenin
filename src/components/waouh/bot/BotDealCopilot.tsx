import { Flag, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JourneyStepKey } from "@/lib/waouh/commerceAction";
import { BotLiveAvatar } from "./BotLiveAvatar";

const NEXT_STEP: Record<JourneyStepKey, { buyer: string; seller: string }> = {
  interest: { buyer: "Faire une offre au vendeur", seller: "Répondre à l'acheteur" },
  negotiation: { buyer: "Obtenir l'accord sur le prix", seller: "Accepter ou contre-proposer" },
  agreement: { buyer: "Choisir le paiement à la livraison", seller: "Confirmer que l'article est disponible" },
  preparation: { buyer: "Bot attribue un livreur", seller: "Préparer l'article" },
  courier: { buyer: "Livraison en cours", seller: "Remettre l'article au livreur" },
  delivery: { buyer: "Confirmer le paiement", seller: "Paiement en cours de confirmation" },
  payment: { buyer: "Vente terminée", seller: "Vente terminée" },
};

const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;

/**
 * Bot conduit la Deal Room : objectif, position actuelle et prochaine étape,
 * calculés uniquement à partir de l'état déjà affiché (aucun appel serveur).
 */
export function BotDealCopilot({
  title,
  role,
  stage,
  currentOffer,
  listPrice,
  closed,
  className,
}: {
  title: string;
  role: "buyer" | "seller";
  stage: JourneyStepKey | null;
  currentOffer: number | null;
  listPrice: number | null;
  closed?: boolean;
  className?: string;
}) {
  const step = stage ?? "interest";
  const next = closed ? "Discussion finalisée" : NEXT_STEP[step][role];
  const position = currentOffer ?? listPrice;
  return (
    <section
      data-waouh-ui="bot-deal-copilot-v3"
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-cyan-100 bg-gradient-to-r from-emerald-50/90 via-white to-sky-50/90 px-3 py-2.5 shadow-sm",
        className,
      )}
    >
      <BotLiveAvatar size={44} state={closed ? "idle" : "thinking"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-black text-slate-950">Bot conduit cette discussion</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-[11px] font-semibold text-slate-600 sm:grid-cols-3">
          <span className="flex min-w-0 items-center gap-1">
            <Target className="h-3.5 w-3.5 shrink-0 text-teal-600" />
            <span className="truncate">{role === "buyer" ? "Obtenir" : "Vendre"} « {title} » au meilleur prix</span>
          </span>
          {position ? (
            <span className="flex min-w-0 items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span className="truncate">Position : <b className="text-slate-900">{fcfa(position)}</b></span>
            </span>
          ) : <span className="hidden sm:block" />}
          <span className="flex min-w-0 items-center gap-1">
            <Flag className="h-3.5 w-3.5 shrink-0 text-violet-600" />
            <span className="truncate">Prochaine étape : <b className="text-slate-900">{next}</b></span>
          </span>
        </div>
      </div>
    </section>
  );
}

export default BotDealCopilot;
