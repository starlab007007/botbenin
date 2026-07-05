import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Sparkles, Package, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StockAgentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const [agent, setAgent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showMove, setShowMove] = useState<any>(null);
  const [form, setForm] = useState({ name: "", sku: "", quantity: "0", threshold_low: "5", unit_price_fcfa: "0" });
  const [moveQty, setMoveQty] = useState("1");
  const [moveType, setMoveType] = useState<"in" | "out">("in");

  const refresh = async () => {
    const { data: a } = await supabase.from("waouh_stock_agents").select("*").eq("id", id).maybeSingle();
    setAgent(a);
    const { data: its } = await supabase.from("waouh_stock_items").select("*").eq("agent_id", id).order("created_at", { ascending: false });
    setItems(its || []);
  };
  useEffect(() => { refresh(); }, [id]);

  const totalValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price_fcfa), 0);
  const outStock = items.filter(i => Number(i.quantity) <= 0).length;
  const lowStock = items.filter(i => Number(i.quantity) > 0 && Number(i.quantity) <= Number(i.threshold_low)).length;

  const addItem = async () => {
    if (!user || !form.name.trim()) return toast.error("Nom requis");
    const { error } = await supabase.from("waouh_stock_items").insert({
      agent_id: id, user_id: user.id, name: form.name, sku: form.sku || null,
      quantity: Number(form.quantity), threshold_low: Number(form.threshold_low),
      unit_price_fcfa: Number(form.unit_price_fcfa),
    });
    if (error) return toast.error(error.message);
    toast.success("Produit ajouté");
    setShowAdd(false); setForm({ name: "", sku: "", quantity: "0", threshold_low: "5", unit_price_fcfa: "0" });
    refresh();
  };

  const doMovement = async () => {
    if (!user || !showMove) return;
    const qty = Number(moveQty);
    if (!qty) return toast.error("Quantité invalide");
    const delta = moveType === "in" ? qty : -qty;
    const newQty = Number(showMove.quantity) + delta;
    if (newQty < 0) return toast.error("Stock insuffisant");
    await supabase.from("waouh_stock_movements").insert({
      item_id: showMove.id, user_id: user.id, movement_type: moveType, quantity: qty,
    });
    await supabase.from("waouh_stock_items").update({ quantity: newQty }).eq("id", showMove.id);
    toast.success(`${moveType === "in" ? "Entrée" : "Sortie"} enregistrée`);
    setShowMove(null); setMoveQty("1");
    refresh();
  };

  const askAi = async () => {
    setLoadingInsight(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-stock-analyze", { body: { agent_id: id } });
      if (error) throw error;
      setInsight(data.insight || "Aucune recommandation.");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingInsight(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-3 py-3 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/bots")} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-2"><Package className="h-4 w-4" /> {agent?.name || "…"}</div>
          <div className="text-xs text-white/70">{items.length} produits · {totalValue.toLocaleString("fr-FR")} FCFA</div>
        </div>
        <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={() => setShowAdd(true)}><Plus /></Button>
      </header>

      <main className="p-3 max-w-md mx-auto space-y-3 pb-24">
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">Valeur</div><div className="text-sm font-bold">{Math.round(totalValue / 1000)}k</div></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">Stock bas</div><div className="text-sm font-bold text-amber-600">{lowStock}</div></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">Ruptures</div><div className="text-sm font-bold text-red-600">{outStock}</div></CardContent></Card>
        </div>

        <Button onClick={askAi} disabled={loadingInsight} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          {loadingInsight ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Analyse IA
        </Button>
        {insight && <Card><CardContent className="p-3 text-sm whitespace-pre-wrap">{insight}</CardContent></Card>}

        {items.map(it => {
          const isOut = Number(it.quantity) <= 0;
          const isLow = !isOut && Number(it.quantity) <= Number(it.threshold_low);
          return (
            <Card key={it.id} className={isOut ? "border-red-300" : isLow ? "border-amber-300" : ""}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-xs text-muted-foreground">{it.sku || "—"} · {Number(it.unit_price_fcfa).toLocaleString("fr-FR")} FCFA</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : ""}`}>{it.quantity}</div>
                  {(isOut || isLow) && <AlertTriangle className="h-3 w-3 inline text-amber-500" />}
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setShowMove(it); setMoveType("in"); }}><TrendingUp className="h-4 w-4 text-green-600" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setShowMove(it); setMoveType("out"); }}><TrendingDown className="h-4 w-4 text-red-600" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!items.length && (
          <Card><CardContent className="p-6 text-center space-y-2">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <div className="font-medium">Aucun produit pour l'instant</div>
            <p className="text-xs text-muted-foreground">Ajoutez votre premier produit pour suivre les entrées / sorties et recevoir des recommandations IA.</p>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Ajouter un produit</Button>
          </CardContent></Card>
        )}
      </main>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto max-w-[90vw]">
          <DialogHeader><DialogTitle>Nouveau produit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Quantité</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>Seuil bas</Label><Input type="number" value={form.threshold_low} onChange={e => setForm({ ...form, threshold_low: e.target.value })} /></div>
            </div>
            <div><Label>Prix (FCFA)</Label><Input type="number" value={form.unit_price_fcfa} onChange={e => setForm({ ...form, unit_price_fcfa: e.target.value })} /></div>
            <Button className="w-full" onClick={addItem}>Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showMove} onOpenChange={() => setShowMove(null)}>
        <DialogContent className="max-w-[90vw]">
          <DialogHeader><DialogTitle>{moveType === "in" ? "Entrée" : "Sortie"} — {showMove?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Quantité (stock actuel : {showMove?.quantity})</Label><Input type="number" value={moveQty} onChange={e => setMoveQty(e.target.value)} /></div>
            <Button className="w-full" onClick={doMovement}>Confirmer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
