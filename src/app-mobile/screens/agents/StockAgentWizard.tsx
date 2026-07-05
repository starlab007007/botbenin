import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

export default function StockAgentWizard() {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [alertMsisdn, setAlertMsisdn] = useState("");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!user) return toast.error("Connexion requise");
    if (!name.trim()) return toast.error("Nom requis");
    setLoading(true);
    try {
      const { data, error } = await supabase.from("waouh_stock_agents").insert({
        user_id: user.id, name, business_name: businessName || null,
        alert_msisdn: alertMsisdn || null,
      }).select().single();
      if (error) throw error;
      toast.success("Agent créé");
      navigate(`/app/agents/stock/${data.id}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-3 py-3 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div>
          <div className="font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> Nouvel agent Stock</div>
        </div>
      </header>
      <main className="p-4 max-w-md mx-auto space-y-4 pb-24">
        <div className="space-y-2"><Label>Nom de l'agent</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Boutique Cotonou" /></div>
        <div className="space-y-2"><Label>Nom du commerce (facultatif)</Label><Input value={businessName} onChange={e => setBusinessName(e.target.value)} /></div>
        <div className="space-y-2"><Label>WhatsApp pour alertes (facultatif)</Label><Input value={alertMsisdn} onChange={e => setAlertMsisdn(e.target.value)} placeholder="22961234567" /></div>
        <Button className="w-full h-12" onClick={create} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Créer l'agent
        </Button>
      </main>
    </div>
  );
}
