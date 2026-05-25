import { useEffect, useState } from "react";
import { useWaouhPartner } from "@/hooks/useWaouhPartner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import MobileScreenHeader from "../../components/MobileScreenHeader";
import { Loader2, Wallet } from "lucide-react";

export default function PartnerPayoutsScreen() {
  const { partner } = useWaouhPartner();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partner) return;
    supabase
      .from("waouh_partner_payouts" as any)
      .select("*")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPayouts((data as any) || []);
        setLoading(false);
      });
  }, [partner?.id]);

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(64px+env(safe-area-inset-bottom)+16px)]">
      <MobileScreenHeader
        title="Mes versements"
        subtitle={`${payouts.length} versement(s)`}
        back="/app/partner"
      />
      <div className="p-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <Wallet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucun versement pour l'instant.
            </p>
          </div>
        ) : (
          payouts.map((p) => (
            <div key={p.id} className="rounded-2xl border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {p.periode_debut} → {p.periode_fin}
                  </div>
                  <div className="text-lg font-bold text-[hsl(var(--wa-green))] mt-0.5">
                    {Number(p.montant_total).toLocaleString()} F
                  </div>
                </div>
                <Badge
                  variant={p.statut === "paid" ? "default" : "secondary"}
                  className={
                    p.statut === "paid" ? "bg-[hsl(var(--wa-green))]" : ""
                  }
                >
                  {p.statut}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>{p.nb_ventes} vente(s)</div>
                {p.mobile_money_ref && (
                  <div>Réf MoMo : <span className="font-mono">{p.mobile_money_ref}</span></div>
                )}
                {p.paid_at && (
                  <div>
                    Payé le {new Date(p.paid_at).toLocaleDateString("fr")}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
