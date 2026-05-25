import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Store, TrendingUp, Package, Wallet } from "lucide-react";

export default function PartnerScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useMobileAuth();
  const [stats, setStats] = useState({ businesses: 0, products: 0, sales: 0, pendingPayouts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/app/auth"); return; }
    (async () => {
      const [b, p, s, payouts] = await Promise.all([
        supabase.from("waouh_partner_businesses").select("id", { count: "exact", head: true }).eq("partner_id", user.id),
        supabase.from("waouh_partner_products").select("id", { count: "exact", head: true }).eq("partner_id", user.id),
        supabase.from("waouh_partner_sales").select("montant", { count: "exact" }).eq("partner_id", user.id),
        supabase.from("waouh_partner_payouts").select("montant_total").eq("partner_id", user.id).eq("statut", "pending"),
      ]);
      const totalSales = (s.data as any[] ?? []).reduce((acc, r) => acc + Number(r.montant ?? 0), 0);
      const pending = (payouts.data as any[] ?? []).reduce((acc, r) => acc + Number(r.montant_total ?? 0), 0);
      setStats({
        businesses: b.count ?? 0, products: p.count ?? 0,
        sales: totalSales, pendingPayouts: pending,
      });
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

  const tiles = [
    { label: "Entreprises", value: stats.businesses, icon: Store, color: "text-[hsl(165_91%_25%)]" },
    { label: "Produits", value: stats.products, icon: Package, color: "text-blue-600" },
    { label: "Ventes (FCFA)", value: fmt(stats.sales), icon: TrendingUp, color: "text-[#FF6B35]" },
    { label: "À reverser", value: `${fmt(stats.pendingPayouts)} FCFA`, icon: Wallet, color: "text-purple-600" },
  ];

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-[hsl(165_91%_18%)] text-white px-4 py-3">
        <h1 className="text-xl font-bold">Waouh Partenaire</h1>
        <p className="text-xs text-white/70">Tableau de bord</p>
      </header>
      <main className="p-4 space-y-4">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Chargement…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-xl border bg-card p-4">
                <t.icon className={`h-5 w-5 mb-2 ${t.color}`} />
                <div className="text-xs text-muted-foreground">{t.label}</div>
                <div className="text-lg font-bold">{t.value}</div>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <Button variant="outline" className="h-12" onClick={() => navigate("/partner/businesses")}>Entreprises</Button>
          <Button variant="outline" className="h-12" onClick={() => navigate("/partner/products")}>Produits</Button>
          <Button variant="outline" className="h-12" onClick={() => navigate("/partner/sales")}>Ventes</Button>
          <Button variant="outline" className="h-12" onClick={() => navigate("/partner/payouts")}>Paiements</Button>
        </div>
      </main>
    </div>
  );
}
