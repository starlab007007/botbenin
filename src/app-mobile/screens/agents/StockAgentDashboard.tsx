import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { stockRepository, isLowStock, type StockProduct, type StockMovement } from "@/lib/waouh/stockRepository";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Package, Plus, TrendingDown, TrendingUp, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function StockAgentDashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StockProduct | null>(null);
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [minimum, setMinimum] = useState("0");
  const [analysis, setAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([
        stockRepository.fetchProducts(),
        stockRepository.fetchMovements(null, 30),
      ]);
      setProducts(p);
      setMovements(m);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const openProduct = (p: StockProduct) => {
    setSelected(p);
    setQty("1");
    setNote("");
    setMinimum(String(p.stock_minimum ?? 0));
  };

  const move = async (movementType: "in" | "out") => {
    if (!selected) return;
    try {
      await stockRepository.registerMovement({
        product: selected,
        quantity: Math.abs(Number(qty) || 0),
        movementType,
        note: note || null,
      });
      toast.success(movementType === "in" ? "Entrée enregistrée" : "Sortie enregistrée");
      setSelected(null);
      void refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveThreshold = async () => {
    if (!selected) return;
    try {
      await stockRepository.updateThresholds(selected, Number(minimum) || 0, selected.stock_target);
      toast.success("Seuil mis à jour");
      setSelected(null);
      void refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const reorder = async () => {
    if (!selected) return;
    try {
      await stockRepository.requestReorder(selected, Math.abs(Number(qty) || 0), note || null);
      toast.success("Réapprovisionnement demandé");
      setSelected(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const analyze = async () => {
    setAnalyzing(true);
    setAnalysis("");
    try {
      const { data, error } = await supabase.functions.invoke("waouh-stock-analyze", {
        body: { question: "Analyse mon stock et donne les priorités de réapprovisionnement." },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnalysis((data as any).analysis || (data as any).answer || "Aucune analyse disponible.");
    } catch (e: any) {
      toast.error(e.message || "Analyse indisponible");
    } finally { setAnalyzing(false); }
  };

  const low = products.filter(isLowStock);

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-3 py-3 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/bots")} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Stock IA</div>
          <div className="text-xs text-white/70">{products.length} produits · {low.length} en alerte</div>
        </div>
        <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={() => void refresh()}><RefreshCw /></Button>
        <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={() => navigate("/app/agents/stock/new")}><Plus /></Button>
      </header>

      <main className="p-3 max-w-md mx-auto space-y-3 pb-24">
        <Button className="w-full" variant="outline" onClick={analyze} disabled={analyzing}>
          {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Analyse IA du stock
        </Button>
        {analysis && (
          <Card><CardContent className="p-3 text-sm whitespace-pre-wrap">{analysis}</CardContent></Card>
        )}

        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">PRODUITS ({products.length})</div>
            {loading ? (
              <p className="text-sm text-muted-foreground py-2">Chargement…</p>
            ) : products.length ? (
              products.map((p) => (
                <button key={p.id} onClick={() => openProduct(p)}
                  className="w-full flex justify-between items-center py-2 text-sm border-b last:border-0 text-left">
                  <span className="min-w-0 flex-1 truncate">{p.nom}</span>
                  <span className="flex items-center gap-2">
                    {isLowStock(p) && <Badge variant="destructive" className="text-[10px]">Alerte</Badge>}
                    <span className="font-semibold">{p.stock_estime ?? 0}{p.unite ? ` ${p.unite}` : ""}</span>
                  </span>
                </button>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Aucun produit en stock.</p>
                <Button size="sm" onClick={() => navigate("/app/agents/stock/new")}><Plus className="mr-1 h-3 w-3" /> Ajouter un produit</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">MOUVEMENTS ({movements.length})</div>
            {movements.length ? movements.map((m) => (
              <div key={m.id} className="flex justify-between py-1 text-sm border-b last:border-0">
                <span className="flex items-center gap-1">
                  {m.movement_type === "in" ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />}
                  {m.movement_type} · {m.quantity}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("fr-FR")}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground py-2">Aucun mouvement.</p>}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.nom}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Stock actuel : <strong>{selected?.stock_estime ?? 0}</strong>
              {selected?.stock_minimum ? ` · seuil ${selected.stock_minimum}` : ""}
            </div>
            <div className="space-y-1"><Label>Quantité</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
            <div className="space-y-1"><Label>Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facultatif" /></div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => move("in")}><TrendingUp className="mr-1 h-4 w-4" /> Entrée</Button>
              <Button variant="outline" onClick={() => move("out")}><TrendingDown className="mr-1 h-4 w-4" /> Sortie</Button>
            </div>
            <Button variant="secondary" className="w-full" onClick={reorder}>Demander un réapprovisionnement</Button>
            <div className="space-y-1"><Label>Seuil d'alerte</Label>
              <Input type="number" value={minimum} onChange={(e) => setMinimum(e.target.value)} /></div>
            <Button variant="outline" className="w-full" onClick={saveThreshold}>Enregistrer le seuil</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
