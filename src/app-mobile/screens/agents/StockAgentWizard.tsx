import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { stockRepository } from "@/lib/waouh/stockRepository";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

export default function StockAgentWizard() {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState("");
  const [unite, setUnite] = useState("");
  const [prix, setPrix] = useState("");
  const [quantite, setQuantite] = useState("0");
  const [minimum, setMinimum] = useState("0");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!user) return toast.error("Connexion requise");
    if (!nom.trim()) return toast.error("Nom du produit requis");
    setLoading(true);
    try {
      await stockRepository.createProduct({
        nom,
        categorie: categorie || null,
        unite: unite || null,
        prixMin: prix ? Number(prix) : null,
        stockEstime: Number(quantite) || 0,
        stockMinimum: Number(minimum) || 0,
      });
      toast.success("Produit ajouté au stock");
      navigate("/app/agents/stock");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-3 py-3 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div>
          <div className="font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> Nouveau produit en stock</div>
          <div className="text-xs text-white/70">Même base que l'application mobile</div>
        </div>
      </header>
      <main className="p-4 max-w-md mx-auto space-y-4 pb-24">
        <div className="space-y-2"><Label>Nom du produit *</Label><Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Sac de riz 25 kg" /></div>
        <div className="space-y-2"><Label>Catégorie</Label><Input value={categorie} onChange={e => setCategorie(e.target.value)} /></div>
        <div className="space-y-2"><Label>Unité</Label><Input value={unite} onChange={e => setUnite(e.target.value)} placeholder="pièce, kg, carton…" /></div>
        <div className="space-y-2"><Label>Prix (FCFA)</Label><Input type="number" value={prix} onChange={e => setPrix(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Quantité initiale</Label><Input type="number" value={quantite} onChange={e => setQuantite(e.target.value)} /></div>
          <div className="space-y-2"><Label>Seuil d'alerte</Label><Input type="number" value={minimum} onChange={e => setMinimum(e.target.value)} /></div>
        </div>
        <Button className="w-full h-12" onClick={create} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Ajouter au stock
        </Button>
      </main>
    </div>
  );
}
