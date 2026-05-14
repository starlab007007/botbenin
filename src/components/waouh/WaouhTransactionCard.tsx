import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, CreditCard, Loader2, ShieldCheck, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Tx = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  status_history: Array<{ status: string; at: string }>;
  article_id: string;
  payment_method?: string | null;
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

const STEPS = [
  { key: "pending", label: "En attente paiement", icon: CreditCard },
  { key: "paid", label: "Payé (escrow)", icon: ShieldCheck },
  { key: "released", label: "Libéré au vendeur", icon: Truck },
];

export const WaouhTransactionCard: React.FC<{ transactionId: string; onPay: (tx: Tx) => void }> = ({ transactionId, onPay }) => {
  const [tx, setTx] = useState<Tx | null>(null);
  const [article, setArticle] = useState<{ title: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("waouh_transactions").select("*").eq("id", transactionId).maybeSingle();
      if (active && data) {
        setTx(data as any);
        if ((data as any).article_id) {
          const { data: a } = await supabase.from("waouh_articles").select("title").eq("id", (data as any).article_id).maybeSingle();
          if (active) setArticle(a as any);
        }
      }
    })();

    const ch = supabase
      .channel(`waouh_tx_${transactionId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "waouh_transactions", filter: `id=eq.${transactionId}` },
        (p) => setTx(p.new as any))
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [transactionId]);

  if (!tx) {
    return (
      <Card className="p-3 my-2 bg-white border-cyan-100 max-w-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement transaction…
        </div>
      </Card>
    );
  }

  const statusIndex = STEPS.findIndex((s) => s.key === tx.status);
  const currentIdx = statusIndex < 0 ? 0 : statusIndex;
  const historyMap = Object.fromEntries((tx.status_history || []).map((h) => [h.status, h.at]));

  return (
    <Card className="p-4 my-2 bg-white border-cyan-200 shadow-md max-w-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-cyan-600 font-semibold">Transaction</div>
          <div className="font-bold text-gray-900 text-sm">{article?.title || "Article"}</div>
          <div className="text-cyan-700 font-bold">{fmt(tx.amount)}</div>
        </div>
        <span className="text-[10px] font-mono text-gray-400">#{tx.id.slice(0, 6).toUpperCase()}</span>
      </div>

      <div className="space-y-2 mb-3">
        {STEPS.map((s, i) => {
          const done = i < currentIdx || (i === currentIdx && tx.status !== "pending");
          const current = i === currentIdx;
          const at = historyMap[s.key];
          const Icon = done ? CheckCircle2 : current ? s.icon : Circle;
          return (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <Icon className={cn("w-4 h-4 shrink-0",
                done ? "text-emerald-500" : current ? "text-cyan-500 animate-pulse" : "text-gray-300"
              )} />
              <span className={cn("flex-1", done || current ? "text-gray-900" : "text-gray-400")}>{s.label}</span>
              {at && <span className="text-[10px] text-gray-400">{new Date(at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
          );
        })}
      </div>

      {tx.status === "pending" && (
        <Button size="sm" className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90" onClick={() => onPay(tx)}>
          <CreditCard className="w-4 h-4 mr-1.5" /> Payer maintenant
        </Button>
      )}
      {tx.status === "paid" && (
        <div className="text-xs text-center text-emerald-600 font-medium">✓ Fonds sécurisés en escrow</div>
      )}
      {tx.status === "released" && (
        <div className="text-xs text-center text-emerald-700 font-medium">✓ Transaction terminée avec succès</div>
      )}
    </Card>
  );
};

export default WaouhTransactionCard;
