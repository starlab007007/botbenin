import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, CreditCard, Loader2, ShieldCheck, Truck, Star, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
};

const SESSION_KEY = "waouh_web_session_id";
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

const STEPS = [
  { key: "pending", label: "En attente paiement", icon: CreditCard },
  { key: "paid", label: "Payé (escrow)", icon: ShieldCheck },
  { key: "released", label: "Libéré au vendeur", icon: Truck },
];

export const WaouhTransactionCard: React.FC<{ transactionId: string; onPay: (tx: Tx) => void }> = ({ transactionId, onPay }) => {
  const [tx, setTx] = useState<Tx | null>(null);
  const [article, setArticle] = useState<{ title: string } | null>(null);
  const [viewerRole, setViewerRole] = useState<"buyer" | "seller" | "other">("other");
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
      if ((data as any).article_id) {
        const { data: a } = await supabase.from("waouh_articles").select("title").eq("id", (data as any).article_id).maybeSingle();
        if (active) setArticle(a as any);
      }
      // Resolve viewer role via session_id AND auth user (try both, accept any match)
      const sessionId = localStorage.getItem(SESSION_KEY);
      const candidateIds: string[] = [];
      if (user?.id) {
        const { data: wu } = await supabase.from("waouh_users").select("id").eq("auth_user_id", user.id).maybeSingle();
        if (wu?.id) candidateIds.push(wu.id);
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

  const submitRating = async (stars: number) => {
    if (!tx || hasRated) return;
    const sessionId = localStorage.getItem(SESSION_KEY);
    let waouhId: string | null = null;
    if (user?.id) {
      const { data: wu } = await supabase.from("waouh_users").select("id").eq("auth_user_id", user.id).maybeSingle();
      waouhId = wu?.id ?? null;
    }
    if (!waouhId && sessionId) {
      const { data: wu } = await supabase.from("waouh_users").select("id").eq("web_session_id", sessionId).maybeSingle();
      waouhId = wu?.id ?? null;
    }
    if (!waouhId) { toast.error("Session introuvable"); return; }
    const { error } = await supabase.from("waouh_ratings").insert({
      transaction_id: tx.id, rater_id: waouhId, ratee_id: tx.seller_id, rating: stars,
    });
    if (error) { toast.error(error.message); return; }
    setHasRated(true);
    setRating(stars);
    toast.success("Merci pour votre évaluation !");
  };

  const confirmReceived = async () => {
    if (!tx) return;
    setConfirming(true);
    try {
      const sessionId = localStorage.getItem(SESSION_KEY) || "";
      const { data, error } = await supabase.functions.invoke("waouh-payment", {
        body: { action: "confirm_received", transaction_id: tx.id },
        headers: sessionId ? { "x-waouh-session": sessionId } : undefined,
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || "Échec de la confirmation");
      } else {
        toast.success("Réception confirmée — fonds libérés au vendeur");
      }
    } finally { setConfirming(false); }
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

  const normalizedStatus = tx.status === "payment_pending" || tx.status === "initiated" ? "pending" : tx.status;
  const statusIndex = STEPS.findIndex((s) => s.key === normalizedStatus);
  const currentIdx = statusIndex < 0 ? 0 : statusIndex;
  const historyMap = Object.fromEntries((tx.status_history || []).map((h) => [h.status, h.at]));

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
            const done = i < currentIdx || (i === currentIdx && normalizedStatus !== "pending");
            const current = i === currentIdx;
            const at = historyMap[s.key];
            const Icon = done ? CheckCircle2 : current ? s.icon : Circle;
            return (
              <div key={s.key} className="flex items-center gap-2 text-xs">
                <Icon className={cn("w-4 h-4 shrink-0",
                  done ? "text-emerald-500" : current ? "text-cyan-500 animate-pulse" : "text-gray-300"
                )} />
                <span className={cn("flex-1 font-medium", done || current ? "text-gray-900" : "text-gray-400")}>{s.label}</span>
                {at && <span className="text-[10px] text-gray-400">{new Date(at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
              </div>
            );
          })}
        </div>

        {/* BUYER actions */}
        {viewerRole === "buyer" && normalizedStatus === "pending" && (
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:opacity-95 shadow-lg shadow-cyan-500/30 font-semibold"
            onClick={() => onPay(tx)}
          >
            <CreditCard className="w-4 h-4 mr-2" /> 💳 Payer maintenant
          </Button>
        )}
        {viewerRole === "buyer" && tx.status === "paid" && (
          <div className="space-y-2">
            <div className="text-xs text-center text-emerald-700 font-semibold bg-emerald-50 rounded-md py-1.5 border border-emerald-100">
              🔒 Fonds sécurisés en escrow
            </div>
            <Button size="sm" variant="outline" className="w-full border-cyan-300 hover:bg-cyan-50" onClick={confirmReceived} disabled={confirming}>
              {confirming ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <PackageCheck className="w-4 h-4 mr-1.5 text-cyan-600" />}
              J'ai bien reçu l'article
            </Button>
          </div>
        )}

        {/* SELLER read-only states */}
        {viewerRole === "seller" && normalizedStatus === "pending" && (
          <div className="text-xs text-center text-amber-700 font-semibold bg-amber-50 rounded-md py-2 border border-amber-100">
            ⏳ En attente du paiement de l'acheteur
          </div>
        )}
        {viewerRole === "seller" && tx.status === "paid" && (
          <div className="text-xs text-center text-emerald-700 font-semibold bg-emerald-50 rounded-md py-2 border border-emerald-100">
            ✅ Paiement reçu — préparez la livraison
          </div>
        )}

        {/* COMPLETED - rating (buyer only) */}
        {(tx.status === "released" || tx.status === "completed") && (
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
    </Card>
  );
};

export default WaouhTransactionCard;
