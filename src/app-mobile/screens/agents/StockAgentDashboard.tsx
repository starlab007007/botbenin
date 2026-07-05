import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Sparkles, Package, AlertTriangle, Loader2, Upload, FileSpreadsheet } from "lucide-react";
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
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importRawHeaders, setImportRawHeaders] = useState<string[]>([]);
  const [showMove, setShowMove] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", sku: "", category: "",
    quantity: "0", threshold_low: "5",
    unit_price_fcfa: "0", cost_price_fcfa: "0",
    supplier: "",
  });
  const emptyForm = { name: "", sku: "", category: "", quantity: "0", threshold_low: "5", unit_price_fcfa: "0", cost_price_fcfa: "0", supplier: "" };
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

  // --- Import Excel / CSV / Google Sheet ---
  const parseCsvText = (text: string) => {
    const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim());
    const split = (l: string) => { const out: string[] = []; let cur = ""; let q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map(s => s.trim().replace(/^"|"$/g, "")); };
    const headers = split(lines[0]).map(h => h.toLowerCase());
    return lines.slice(1).map(l => { const c = split(l); return Object.fromEntries(headers.map((h, i) => [h, c[i] ?? ""])); });
  };
  const pickField = (row: any, keys: string[]) => { for (const k of keys) { const found = Object.keys(row).find(x => x.includes(k)); if (found && row[found]) return row[found]; } return ""; };

  const importFile = async (file: File) => {
    if (!user) return;
    setImporting(true);
    try {
      let rows: any[] = [];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "txt") { rows = parseCsvText(await file.text()); }
      else if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
        rows = parseCsvText(csv);
      } else throw new Error("Format non supporté (CSV, XLSX, XLS)");

      const items = rows.map(r => ({
        agent_id: id, user_id: user.id,
        name: pickField(r, ["nom", "name", "produit", "product", "designation", "libell"]),
        sku: pickField(r, ["sku", "code", "ref"]) || null,
        quantity: Number(pickField(r, ["quantit", "quantity", "stock", "qte"])) || 0,
        threshold_low: Number(pickField(r, ["seuil", "threshold", "min"])) || 5,
        unit_price_fcfa: Number(String(pickField(r, ["prix", "price", "fcfa", "cost"])).replace(/[^\d.]/g, "")) || 0,
      })).filter(x => x.name);

      if (!items.length) throw new Error("Aucun produit détecté. Vérifiez les colonnes (nom, quantité, prix…).");
      const { error } = await supabase.from("waouh_stock_items").insert(items);
      if (error) throw error;
      toast.success(`${items.length} produits importés`);
      setShowImport(false); setImportUrl("");
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setImporting(false); }
  };

  const importGoogleSheet = async () => {
    if (!importUrl.trim()) return toast.error("URL requise");
    setImporting(true);
    try {
      const m = importUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (!m) throw new Error("URL Google Sheet invalide");
      const gid = (importUrl.match(/[#?&]gid=(\d+)/) || [])[1] || "0";
      const csvUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
      const r = await fetch(csvUrl);
      if (!r.ok) throw new Error("Sheet inaccessible (rendez-le public en lecture)");
      const text = await r.text();
      const rows = parseCsvText(text);
      const items = rows.map(r => ({
        agent_id: id, user_id: user!.id,
        name: pickField(r, ["nom", "name", "produit", "product", "designation", "libell"]),
        sku: pickField(r, ["sku", "code", "ref"]) || null,
        quantity: Number(pickField(r, ["quantit", "quantity", "stock", "qte"])) || 0,
        threshold_low: Number(pickField(r, ["seuil", "threshold", "min"])) || 5,
        unit_price_fcfa: Number(String(pickField(r, ["prix", "price", "fcfa", "cost"])).replace(/[^\d.]/g, "")) || 0,
      })).filter(x => x.name);
      if (!items.length) throw new Error("Aucun produit détecté");
      const { error } = await supabase.from("waouh_stock_items").insert(items);
      if (error) throw error;
      toast.success(`${items.length} produits importés`);
      setShowImport(false); setImportUrl("");
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setImporting(false); }
  };


  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-3 py-3 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/bots")} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-2"><Package className="h-4 w-4" /> {agent?.name || "…"}</div>
          <div className="text-xs text-white/70">{items.length} produits · {totalValue.toLocaleString("fr-FR")} FCFA</div>
        </div>
        <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={() => setShowImport(true)} title="Importer"><Upload className="h-5 w-5" /></Button>
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
          <Card><CardContent className="p-6 text-center space-y-3">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <div className="font-medium">Aucun produit pour l'instant</div>
            <p className="text-xs text-muted-foreground">Ajoutez manuellement ou importez un fichier Excel / Google Sheet.</p>
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Ajouter un produit</Button>
              <Button size="sm" variant="outline" onClick={() => setShowImport(true)}><Upload className="mr-1 h-3 w-3" /> Importer un fichier</Button>
            </div>
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

      <Dialog open={showImport} onOpenChange={setShowImport}>

        <DialogContent className="max-h-[90dvh] overflow-y-auto max-w-[92vw]">
          <DialogHeader><DialogTitle>Importer des produits</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Colonnes reconnues : <b>nom</b>, sku, <b>quantité</b>, seuil, <b>prix</b> (FCFA).</p>

            <div>
              <Label className="text-sm mb-2 block flex items-center gap-2"><Upload className="h-4 w-4" /> Fichier CSV / Excel</Label>
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-lg p-4 text-center ${importing ? "opacity-50" : "hover:border-primary/50"}`}>
                  <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm">Cliquez pour choisir</div>
                  <div className="text-xs text-muted-foreground">CSV, XLSX, XLS</div>
                </div>
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" disabled={importing} onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); }} />
              </label>
            </div>

            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">ou</span></div></div>

            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Google Sheet (lecture publique)</Label>
              <Input placeholder="https://docs.google.com/spreadsheets/d/…" value={importUrl} onChange={e => setImportUrl(e.target.value)} />
              <Button className="w-full" onClick={importGoogleSheet} disabled={importing || !importUrl}>
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Importer depuis Google Sheet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

