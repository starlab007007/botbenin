import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { useWaouhPartner } from "@/hooks/useWaouhPartner";

/**
 * Mobile : on saute les écrans "Devenir partenaire" et "Espace partenaire".
 * Dès qu'un utilisateur authentifié arrive ici, on s'assure qu'un enregistrement
 * waouh_partners existe (création silencieuse si besoin) puis on redirige
 * directement vers /app/partner/businesses.
 */
export default function PartnerHomeScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useMobileAuth();
  const { partner, loading, refresh } = useWaouhPartner();
  const creatingRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/app/auth", { replace: true });
      return;
    }
    if (loading) return;

    if (partner) {
      navigate("/app/partner/businesses", { replace: true });
      return;
    }

    if (creatingRef.current) return;
    creatingRef.current = true;

    (async () => {
      const nom = (user as any).user_metadata?.full_name || user.email || "Partenaire";
      const { error } = await supabase.from("waouh_partners" as any).insert({
        user_id: user.id,
        nom,
        email: user.email ?? null,
        statut: "active",
      } as any);
      // En cas de doublon (déjà créé entre-temps), on ignore et on continue.
      if (error && !/duplicate|unique/i.test(error.message)) {
        creatingRef.current = false;
      }
      await refresh();
      navigate("/app/partner/businesses", { replace: true });
    })();
  }, [authLoading, user, loading, partner, navigate, refresh]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
