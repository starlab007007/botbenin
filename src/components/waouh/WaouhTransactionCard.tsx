import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, CreditCard, Loader2, ShieldCheck, Truck, Star, MessageCircle } from "lucide-react";
import { WaouhDealPaymentDialog } from "./WaouhDealPaymentDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { userFacingErrorText } from "@/lib/userFacingError";
type Tx = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  status_history: Array<{ status: string; at: string }>;
  article_id: string;
  payment_method?: string | null;
  buyer_id?: string | null;
  seller_id?: string | null;
  thread_id?: string | null;
};

type Deal = {
  id: string;
  thread_id?: string | null;
  status: string;
  payment_status?: string | null;
  amount?: number | null;
  delivered_at?: string | null;
};

const SESSION_KEY = "waouh_web_session_id";
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

const STEPS = [
  { key: "agreement", label: "Accord confirmé", icon: ShieldCheck },
  { key: "delivery", label: "Livraison WAOUH", icon: Truck },
  { key: "payment", label: "Paiement après livraison", icon: CreditCard },
];

export const WaouhTransactionCard: React.FC<{ transactionId: string }> = ({ transactionId }) => {
  const [tx, setTx] = useState<Tx | null>(null);
  const [article, setArticle] = useState<{ title: string } | null>(null);
  const [viewerRole, setViewerRole] = useState<"buyer" | "seller" | "other">("other");
  const [notFound, setNotFound] = useState(false);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [hasRated, setHasRated] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    setNotFound(false);
    (async () => {
      const { data } = await supabase.from("waouh_transactions").select("*").eq("id", transactionId).maybeSingle();
      if (!active) return;
      if (!data) { setNotFound(true); return; }
      setTx(data as any);
      const threadId = (data as any).thread_id as string | null | undefined;
      if (threadId) {
        const { data: d } = await supabase.from("waouh_deals")
          .select("id,thread_id,status,payment_status,amount,delivered_at")
          .eq("thread_id", threadId)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (active) setDeal((d as Deal | null) ?? null);
      }
      if ((data as any).article_id) {
        const { data: a } = await supabase.from("waouh_articles").select("title").eq("id", (data as any).article_id).maybeSingle();
        if (active) setArticle(a as any);
      }
      // Resolve viewer role via session_id AND auth user (try both, accept any match)
      const sessionId = localStorage.getItem(SESSION_KEY);
      const candidateIds: string[] = [];
      if (user?.id) {
        const { data: rows } = await supabase.from("waouh_users")
          .select("id")
          .eq("auth_user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(100);
        for (const row of rows ?? []) {
          if (row?.id && !candidateIds.includes(row.id)) candidateIds.push(row.id);
        }
      }
      if (sessionId) {
        const { data: wu } = await supabase.from("waouh_users").select("id").eq("web_session_id", sessionId).maybeSingle();
        if (wu?.id) candidateIds.push(wu.id);
      }
      const t: any = data;
      if (!active) return;
      let role: "buyer" | "seller" | "other" = "other";
      if (candidateIds.includes(t.buyer_id)) role = "buyer";
      else if (candidateIds.includes(t.seller_id)) role = "seller";
      else if (!t.buyer_id && sessionId) role = "buyer"; // unclaimed → presumed buyer
      setViewerRole(role);

      // Check existing rating
      if (candidateIds[0]) {
        const { data: r } = await supabase.from("waouh_ratings").select("id").eq("transaction_id", transactionId).eq("rater_id", candidateIds[0]).maybeSingle();
        if (active && r) setHasRated(true);
      }
    })();

    const ch = supabase
      .channel(`waouh_tx_${transactionId}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "waouh_transactions", filter: `id=eq.${transactionId}` },
        (p) => setTx(p.new as any))
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [transactionId, user?.id]);

  useEffect(() => {
    if (!tx?.thread_id) return;
    let active = true;
    const reload = async () => {
      const { data } = await supabase.from("waouh_deals")
        .select("id,thread_id,status,payment_status,amount,delivered_at")
        .eq("thread_id", tx.thread_id!)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) setDeal((data as Deal | null) ?? null);
    };
    void reload();
    const channel = supabase
      .channel(`waouh_deal_${tx.thread_id}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "waouh_deals", filter: `thread_id=eq.${tx.thread_id}` },
        () => { void reload(); })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [tx?.thread_id]);

  const submitRating = async (stars: number) => {
    if (!tx || hasRated) return;
    const sessionId = localStorage.getItem(SESSION_KEY);
    let waouhId: string | null = null;
    if (user?.id) {
      const { data: rows } = await supabase.from("waouh_users")
        .select("id")
        .eq("auth_user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      waouhId = rows?.[0]?.id ?? null;
    }
    if (!waouhId && sessionId) {
      const { data: wu } = await supabase.from("waouh_users").select("id").eq("web_session_id", sessionId).maybeSingle();
      waouhId = wu?.id ?? null;
    }
    if (!waouhId) { toast.error("Session introuvable"); return; }
    const { error } = await supabase.from("waouh_ratings").insert({
      transaction_id: tx.id, rater_id: waouhId, ratee_id: tx.seller_id, rating: stars,
    });
    if (error) { toast.error(userFacingErrorText(error, "save")); return; }
    setHasRated(true);
    setRating(stars);
    toast.success("Merci pour votre évaluation !");
  };

  if (notFound) return null;
  if (!tx) {
    return (
      <Card className="p-3 my-2 bg-white border-cyan-100 max-w-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement transaction…
        </div>
      </Card>
    );
  }

  // Hide card from third parties when transaction is private
  if (viewerRole === "other") return null;

  const workflow = deal?.status ?? "awaiting_confirmation";
  const currentIdx =
    workflow === "completed" || deal?.payment_status === "paid" ? 2 :
    ["assigned", "picked_up", "delivered"].includes(workflow) ? 1 : 0;
  const paymentReady = viewerRole === "buyer" && workflow === "delivered" && deal?.payment_status !== "paid";

  return (
    <Card className="my-2 max-w-sm overflow-hidden border-0 shadow-xl ring-1 ring-cyan-500/10">
      {/* Gradient header */}
      <div className="bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-90">
              💎 Transaction · {viewerRole === "buyer" ? "Achat sécurisé" : "Vente sécurisée"}
            </div>
            <div className="font-bold text-base truncate">{article?.title || "Article"}</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold tracking-tight">{fmt(tx.amount)}</span>
              <span className="text-[10px] uppercase opacity-80 flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" /> Escrow
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-white/20 backdrop-blur px-1.5 py-0.5 rounded">
            #{tx.id.slice(0, 6).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-4 bg-white">
        {/* Steps */}
        <div className="space-y-2 mb-3">
          {STEPS.map((s, i) => {
            const done = i < currentIdx || (i === 2 && currentIdx === 2);
            const current = i === currentIdx;
            const Icon = done ? CheckCircle2 : current ? s.icon : Circle;
            return (
              <div key={s.key} className="flex items-center gap-2 text-xs">
                <Icon className={cn("w-4 h-4 shrink-0",
                  done ? "text-emerald-500" : current ? "text-cyan-500 animate-pulse" : "text-gray-300"
                )} />
                <span className={cn("flex-1 font-medium", done || current ? "text-gray-900" : "text-gray-400")}>{s.label}</span>
                {current && <span className="text-[10px] text-gray-400">{workflow.replaceAll("_", " ")}</span>}
              </div>
            );
          })}
        </div>

        {/* Parcours canonique : aucun paiement avant livraison. */}
        {viewerRole === "buyer" && paymentReady && deal?.id && (
          <div className="space-y-2">
            <div className="text-xs text-center text-emerald-700 font-semibold bg-emerald-50 rounded-md py-1.5 border border-emerald-100">
              ✅ Livraison confirmée · vous pouvez maintenant enregistrer le paiement
            </div>
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:opacity-95 shadow-lg shadow-cyan-500/30 font-semibold"
              onClick={() => setPaymentOpen(true)}
            >
              <CreditCard className="w-4 h-4 mr-2" /> Confirmer le paiement
            </Button>
          </div>
        )}
        {viewerRole === "buyer" && !paymentReady && workflow !== "completed" && (
          <div className="space-y-2">
            <div className="text-xs text-center text-slate-600 font-semibold bg-slate-50 rounded-md py-2 border border-slate-100">
              {workflow === "picked_up"
                ? "📦 Livraison en cours. Le paiement sera confirmé après remise."
                : workflow === "assigned"
                  ? "🛵 Livreur assigné. Suivez la livraison dans WAOUH."
                  : "🤝 Accord enregistré. WAOUH conduit la préparation et la livraison."}
            </div>
            {tx.article_id && (
              <Button
                size="sm"
                variant="outline"
                className="w-full border-emerald-300 hover:bg-emerald-50"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("waouh:open-match-chat", {
                      detail: {
                        article_id: tx.article_id,
                        kind: "buyer",
                        title: article?.title,
                        source: "card",
                      },
                    })
                  );
                }}
              >
                <MessageCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
                Continuer dans le Deal Room
              </Button>
            )}
          </div>
        )}
        {viewerRole === "seller" && workflow !== "completed" && (
          <div className="text-xs text-center text-slate-700 font-semibold bg-slate-50 rounded-md py-2 border border-slate-100">
            {workflow === "delivered"
              ? "📬 Livraison effectuée · confirmation du paiement acheteur en attente"
              : workflow === "picked_up"
                ? "📦 Colis pris en charge par le livreur WAOUH"
                : workflow === "assigned"
                  ? "🛵 Livreur assigné"
                  : "🤝 Accord enregistré · suivez la préparation dans WAOUH"}
          </div>
        )}

        {/* COMPLETED - rating (buyer only) */}
        {(workflow === "completed" || deal?.payment_status === "paid") && (
          <div className="space-y-2">
            <div className="text-xs text-center text-emerald-700 font-bold">🎉 Transaction terminée</div>
            {viewerRole === "buyer" && !hasRated && (
              <div className="flex flex-col items-center gap-1.5 pt-1">
                <div className="text-xs text-gray-600">Notez le vendeur :</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => submitRating(s)} className="hover:scale-125 transition" aria-label={`${s} étoile${s > 1 ? "s" : ""}`}>
                      <Star className={cn("w-6 h-6", (rating ?? 0) >= s ? "fill-amber-400 text-amber-400" : "text-gray-300")} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hasRated && <div className="text-xs text-center text-amber-600">⭐ Merci pour votre évaluation</div>}
          </div>
        )}
      </div>
      {deal?.id && (
        <WaouhDealPaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          dealId={deal.id}
          amount={Number(deal.amount ?? tx.amount ?? 0)}
        />
      )}
    </Card>
  );
};

export default WaouhTransactionCard;
