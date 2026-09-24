import { useState } from "react";
import {
  Activity, BellRing, Bot, Check, Clock3, ListChecks, Pause, Play,
  RotateCcw, ShieldCheck, Store, Tag, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { moneyXof, relativeAgentTime } from "@/lib/waouh/agenticClient";
import { approvalDecisionPayload, type AgenticAction, type WaouhMessageBlock } from "@/lib/waouh/agenticContracts";

type BlockAction = (action: AgenticAction, payload: Record<string, unknown>) => Promise<void> | void;

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon", planning: "Planification", searching: "Recherche", comparing: "Comparaison",
  watching: "En veille", active: "Active", triggered: "Objectif atteint", paused: "En pause",
  completed: "Terminée", cancelled: "Annulée", failed: "À relancer", pending: "À valider",
  approved: "Validée", rejected: "Refusée", sent: "Envoyée", accepted: "Acceptée",
  proposed: "Proposée",
  countered: "Contre-offre", expired: "Expirée", withdrawn: "Retirée",
};

const statusTone = (status?: string) => {
  if (["completed", "approved", "accepted", "triggered"].includes(status || "")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (["failed", "rejected", "cancelled", "expired"].includes(status || "")) return "bg-rose-100 text-rose-800 border-rose-200";
  if (["paused", "pending", "draft"].includes(status || "")) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-sky-100 text-sky-800 border-sky-200";
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  return <Badge variant="outline" className={cn("text-[10px]", statusTone(status))}>{STATUS_LABEL[status] || status}</Badge>;
}

function Shell({ icon: Icon, title, children }: { icon: typeof Bot; title: string; children: React.ReactNode }) {
  return (
    <section className="not-prose mt-2 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <header className="flex items-center gap-2 border-b bg-muted/35 px-3 py-2">
        <Icon className="h-4 w-4 text-cyan-600" />
        <h4 className="min-w-0 flex-1 truncate text-xs font-semibold">{title}</h4>
        <Badge variant="outline" className="text-[9px] font-normal">WAOUH IA</Badge>
      </header>
      <div className="space-y-2 p-3">{children}</div>
    </section>
  );
}

function MissionCard({ block, onAction, busy }: { block: Extract<WaouhMessageBlock, { type: "mission" | "mission_status" }>; onAction?: BlockAction; busy: boolean }) {
  const { mission } = block;
  return (
    <Shell icon={ListChecks} title={mission.title}>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={mission.status} />
        {mission.budget_max_amount != null && <span className="text-xs font-semibold">Budget max. {moneyXof(mission.budget_max_amount, mission.currency)}</span>}
      </div>
      {mission.summary && <p className="text-xs leading-relaxed text-muted-foreground">{mission.summary}</p>}
      {mission.progress != null && <div className="space-y-1"><Progress value={mission.progress} className="h-1.5" /><div className="text-right text-[10px] text-muted-foreground">{Math.round(mission.progress)} %</div></div>}
      {!!mission.steps?.length && <ol className="space-y-1">{mission.steps.slice(0, 5).map((step, index) => <li key={step.id || index} className="flex items-center gap-2 text-xs"><span className={cn("h-1.5 w-1.5 rounded-full", step.status === "completed" ? "bg-emerald-500" : step.status === "failed" ? "bg-rose-500" : "bg-muted-foreground/40")} /><span className={step.status === "completed" ? "text-muted-foreground line-through" : ""}>{step.label}</span></li>)}</ol>}
      {onAction && !["completed", "cancelled"].includes(mission.status) && <div className="flex flex-wrap gap-1.5 pt-1">
        {mission.status === "active" && <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction("mission.run", { mission_id: mission.id })}><Bot className="mr-1 h-3.5 w-3.5" />Exécuter maintenant</Button>}
        {mission.status === "paused" ? <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("mission.resume", { mission_id: mission.id })}><Play className="mr-1 h-3.5 w-3.5" />Reprendre</Button> : <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("mission.pause", { mission_id: mission.id })}><Pause className="mr-1 h-3.5 w-3.5" />Pause</Button>}
        {mission.status === "failed" && <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("mission.resume", { mission_id: mission.id })}><RotateCcw className="mr-1 h-3.5 w-3.5" />Relancer</Button>}
        <Button size="sm" variant="ghost" disabled={busy} className="text-muted-foreground hover:text-destructive" onClick={() => onAction("mission.cancel", { mission_id: mission.id })}><X className="mr-1 h-3.5 w-3.5" />Arrêter</Button>
      </div>}
    </Shell>
  );
}

function WatchCard({ block, onAction, busy }: { block: Extract<WaouhMessageBlock, { type: "watch" | "watch_status" }>; onAction?: BlockAction; busy: boolean }) {
  const { watch } = block;
  return (
    <Shell icon={BellRing} title={watch.title}>
      <div className="flex items-center justify-between gap-2"><StatusBadge status={watch.status} />{watch.last_checked_at && <span className="text-[10px] text-muted-foreground">Vérifiée {relativeAgentTime(watch.last_checked_at)}</span>}</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/45 p-2"><div className="text-[10px] text-muted-foreground">Prix observé</div><strong>{moneyXof(watch.current_amount, watch.currency)}</strong></div>
        <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/20"><div className="text-[10px] text-muted-foreground">Alerte à</div><strong className="text-emerald-700 dark:text-emerald-400">{moneyXof(watch.target_amount, watch.currency)}</strong></div>
      </div>
      {onAction && !["expired", "cancelled"].includes(watch.status) && <div className="flex gap-1.5">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("watch.update", { watch_id: watch.id, status: watch.status === "paused" ? "active" : "paused" })}>{watch.status === "paused" ? <Play className="mr-1 h-3.5 w-3.5" /> : <Pause className="mr-1 h-3.5 w-3.5" />}{watch.status === "paused" ? "Activer" : "Pause"}</Button>
        <Button size="sm" variant="ghost" disabled={busy} className="text-muted-foreground hover:text-destructive" onClick={() => onAction("watch.delete", { watch_id: watch.id })}><X className="mr-1 h-3.5 w-3.5" />Supprimer</Button>
      </div>}
    </Shell>
  );
}

function ApprovalCard({ block, onAction, busy }: { block: Extract<WaouhMessageBlock, { type: "approval" }>; onAction?: BlockAction; busy: boolean }) {
  const { approval } = block;
  return (
    <Shell icon={ShieldCheck} title={approval.title}>
      <div className="flex items-center justify-between gap-2"><StatusBadge status={approval.status} />{approval.expires_at && <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="h-3 w-3" />{relativeAgentTime(approval.expires_at)}</span>}</div>
      {approval.description && <p className="text-xs leading-relaxed text-muted-foreground">{approval.description}</p>}
      {approval.status === "pending" && onAction && <div className="grid grid-cols-2 gap-2">
        <Button size="sm" disabled={busy} className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onAction("approval.decide", approvalDecisionPayload(approval.id, "approved"))}><Check className="mr-1 h-3.5 w-3.5" />Autoriser</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("approval.decide", approvalDecisionPayload(approval.id, "rejected"))}><X className="mr-1 h-3.5 w-3.5" />Refuser</Button>
      </div>}
    </Shell>
  );
}

function OfferCard({ block, onAction, busy }: { block: Extract<WaouhMessageBlock, { type: "seller_offer" }>; onAction?: BlockAction; busy: boolean }) {
  const { offer } = block;
  const [counter, setCounter] = useState("");
  const active = !["accepted", "rejected", "expired", "withdrawn"].includes(offer.status || "sent");
  return (
    <Shell icon={Tag} title={offer.title || "Offre vendeur"}>
      <div className="flex items-start justify-between gap-2"><div><div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{moneyXof(offer.unit_price_amount, offer.currency)}</div>{offer.delivery_fee_amount ? <div className="text-[10px] text-muted-foreground">Livraison : {moneyXof(offer.delivery_fee_amount, offer.currency)}</div> : null}</div><StatusBadge status={offer.status || "sent"} /></div>
      {offer.expires_at && <div className="text-[10px] text-muted-foreground">Expire {relativeAgentTime(offer.expires_at)}</div>}
      {active && onAction && <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2"><Button size="sm" disabled={busy} className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onAction("offer.respond", { offer_id: offer.id, decision: "accept" })}><Check className="mr-1 h-3.5 w-3.5" />Accepter</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("offer.respond", { offer_id: offer.id, decision: "reject" })}>Refuser</Button></div>
        <div className="flex gap-1.5"><Input value={counter} inputMode="numeric" onChange={(event) => setCounter(event.target.value.replace(/\D/g, ""))} placeholder="Votre contre-offre" className="h-8 text-xs" /><Button size="sm" variant="secondary" disabled={busy || !Number(counter)} onClick={() => onAction("offer.respond", { offer_id: offer.id, decision: "counter", counter_amount: Number(counter) })}>Proposer</Button></div>
      </div>}
    </Shell>
  );
}

export function WaouhAgentBlocks({ blocks, onAction, busy = false }: { blocks: WaouhMessageBlock[]; onAction?: BlockAction; busy?: boolean }) {
  const structural = blocks.filter((block) => block.type !== "product_carousel");
  if (!structural.length) return null;
  return <div className="space-y-2">{structural.map((block, index) => {
    if (block.type === "mission" || block.type === "mission_status") return <MissionCard key={`${block.type}-${block.mission.id}-${index}`} block={block} onAction={onAction} busy={busy} />;
    if (block.type === "watch" || block.type === "watch_status") return <WatchCard key={`${block.type}-${block.watch.id}-${index}`} block={block} onAction={onAction} busy={busy} />;
    if (block.type === "approval") return <ApprovalCard key={`${block.type}-${block.approval.id}-${index}`} block={block} onAction={onAction} busy={busy} />;
    if (block.type === "seller_offer") return <OfferCard key={`${block.type}-${block.offer.id}-${index}`} block={block} onAction={onAction} busy={busy} />;
    if (block.type === "seller_policy") return <Shell key={`${block.type}-${index}`} icon={Store} title="Politique vendeur"><div className="flex flex-wrap gap-1.5 text-xs"><Badge variant="outline">Mode {block.policy.auto_negotiate ? "automatique" : "assisté"}</Badge>{block.policy.min_price_amount != null && <Badge variant="outline">Plancher {moneyXof(block.policy.min_price_amount, block.policy.currency)}</Badge>}{block.policy.max_discount_percent != null && <Badge variant="outline">Remise max. {block.policy.max_discount_percent} %</Badge>}</div></Shell>;
    if (block.type === "activity") return <Shell key={`${block.type}-${index}`} icon={Activity} title="Activité de l’agent"><ol className="space-y-2">{block.entries.slice(0, 6).map((entry) => <li key={entry.id} className="flex gap-2 text-xs"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" /><div className="min-w-0"><div className="font-medium">{entry.title}</div>{entry.description && <div className="text-muted-foreground">{entry.description}</div>}<div className="text-[10px] text-muted-foreground">{relativeAgentTime(entry.created_at)}</div></div></li>)}</ol></Shell>;
    return null;
  })}</div>;
}

export default WaouhAgentBlocks;
