import { useEffect, useState } from "react";
import { useWaouhPartner } from "@/hooks/useWaouhPartner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import MobileScreenHeader from "../../components/MobileScreenHeader";
import { Loader2, TrendingUp } from "lucide-react";

export default function PartnerSalesScreen() {
  const { partner } = useWaouhPartner();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partner) return;
    supabase
      .from("waouh_partner_sales" as any)
      .select("*")
      .eq("partner_id", partner.id)
      .order("date_vente", { ascending: false })
      .then(({ data }) => {
        setSales((data as any) || []);
        setLoading(false);
      });

    const ch = supabase
      .channel(`m-sales-list-${partner.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waouh_partner_sales",
          filter: `partner_id=eq.${partner.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("waouh_partner_sales" as any)
            .select("*")
            .eq("partner_id", partner.id)
            .order("date_vente", { ascending: false });
          setSales((data as any) || []);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [partner?.id]);

  const total = sales.reduce(
    (s, x) => s + Number(x.commission_partner || 0),
    0
  );

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(64px+env(safe-area-inset-bottom)+16px)]">
      <MobileScreenHeader
        title="Mes ventes & commissions"
        subtitle={`${sales.length} vente(s)`}
        back="/app/partner"
      />
      <div className="p-3 space-y-3">
        <div className="rounded-2xl border bg-gradient-to-br from-[hsl(var(--wa-green)/0.08)] to-transparent p-4">
          <div className="text-xs text-muted-foreground">
            Commission cumulée
          </div>
          <div className="text-2xl font-bold text-[hsl(var(--wa-green))]">
            {total.toLocaleString()} FCFA
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sales.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucune vente attribuée pour l'instant.
            </p>
          </div>
        ) : (
          sales.map((s) => (
            <div key={s.id} className="rounded-2xl border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.date_vente).toLocaleDateString("fr")}
                  </div>
                  <div className="font-semibold mt-0.5">
                    {Number(s.montant_vente).toLocaleString()} F
                  </div>
                </div>
                <Badge
                  variant={s.statut === "paid" ? "default" : "secondary"}
                  className={
                    s.statut === "paid" ? "bg-[hsl(var(--wa-green))]" : ""
                  }
                >
                  {s.statut}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Source · <Badge variant="outline" className="text-[10px]">{s.source}</Badge>
                </span>
                <span className="font-semibold text-[hsl(var(--wa-green))]">
                  +{Number(s.commission_partner).toLocaleString()} F
                </span>
              </div>
              {s.buyer_phone && (
                <div className="text-xs text-muted-foreground">
                  Acheteur : {s.buyer_phone}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
