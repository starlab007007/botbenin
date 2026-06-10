import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Send, Download, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type RadarContact = {
  id: string;
  phone_e164: string;
  display_name: string | null;
  source: string | null;
  first_seen_at: string;
  last_seen_at: string;
  signal_count: number;
  categories: string[];
  cities: string[];
  intent_buy_count: number;
  intent_sell_count: number;
  status: "new" | "available" | "opted_in" | "opted_out" | "blocked";
  auto_notify: boolean;
  last_message_at: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "secondary", available: "outline", opted_in: "default", opted_out: "destructive", blocked: "destructive",
};

export default function RadarContactsTab() {
  const [rows, setRows] = useState<RadarContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterIntent, setFilterIntent] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyMode, setNotifyMode] = useState<"buyer" | "seller" | "announcement">("announcement");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifyArticle, setNotifyArticle] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("waouh_radar_contacts" as any)
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const sync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("waouh-radar-api-config", { body: { action: "contacts_sync" } });
    setSyncing(false);
    if (error) return toast.error(error.message);
    toast.success(`Sync OK — ${(data as any)?.upserted || 0} contacts`);
    load();
  };

  const updateRow = async (id: string, patch: Partial<RadarContact>) => {
    const { error } = await supabase.from("waouh_radar_contacts" as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const filtered = useMemo(() => rows.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterSource !== "all" && r.source !== filterSource) return false;
    if (filterIntent === "buy" && r.intent_buy_count === 0) return false;
    if (filterIntent === "sell" && r.intent_sell_count === 0) return false;
    if (q && !(`${r.phone_e164} ${r.display_name || ""} ${r.categories.join(" ")} ${r.cities.join(" ")}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [rows, filterStatus, filterSource, filterIntent, q]);

  const sources = useMemo(() => Array.from(new Set(rows.map((r) => r.source).filter(Boolean))) as string[], [rows]);
  const stats = useMemo(() => ({
    total: rows.length,
    available: rows.filter((r) => ["new", "available", "opted_in"].includes(r.status)).length,
    opted_out: rows.filter((r) => r.status === "opted_out").length,
    auto: rows.filter((r) => r.auto_notify).length,
  }), [rows]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const s = new Set(selected);
    if (allChecked) filtered.forEach((r) => s.delete(r.id));
    else filtered.forEach((r) => s.add(r.id));
    setSelected(s);
  };
  const toggleOne = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const bulkStatus = async (status: RadarContact["status"]) => {
    if (!selected.size) return toast.error("Sélectionnez au moins 1 contact");
    const ids = Array.from(selected);
    const { error } = await supabase.from("waouh_radar_contacts" as any).update({ status }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} contact(s) → ${status}`);
    setSelected(new Set());
    load();
  };

  const exportCsv = () => {
    const head = ["phone", "name", "source", "status", "auto_notify", "signals", "buy", "sell", "categories", "cities", "last_seen"];
    const lines = [head.join(",")].concat(filtered.map((r) => [
      r.phone_e164, JSON.stringify(r.display_name || ""), r.source || "", r.status, r.auto_notify,
      r.signal_count, r.intent_buy_count, r.intent_sell_count,
      JSON.stringify(r.categories.join("|")), JSON.stringify(r.cities.join("|")), r.last_seen_at,
    ].join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `radar-contacts-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const sendNotify = async () => {
    if (!selected.size || !notifyMsg.trim()) return toast.error("Sélection + message requis");
    setSending(true);
    const { data, error } = await supabase.functions.invoke("waouh-radar-api-config", {
      body: { action: "contacts_notify", contact_ids: Array.from(selected), message: notifyMsg, article_id: notifyArticle || null, mode: notifyMode },
    });
    setSending(false);
    if (error) return toast.error(error.message);
    const r: any = data;
    toast.success(`${r.queued} envoyé(s), ${r.skipped} skipped`);
    if (r.errors?.length) console.error(r.errors);
    setNotifyOpen(false);
    setNotifyMsg("");
    setSelected(new Set());
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-cyan-500" /> Contacts Radar IA</h2>
          <p className="text-xs text-muted-foreground">Contacts collectés via SerpAPI + Apify. Notifiez acheteurs / vendeurs / annonces.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />} Re-sync depuis signaux
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-1" /> CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.total}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Disponibles</div><div className="text-2xl font-bold text-emerald-600">{stats.available}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Opt-out</div><div className="text-2xl font-bold text-red-500">{stats.opted_out}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Auto-notify</div><div className="text-2xl font-bold">{stats.auto}</div></Card>
      </div>

      <Card className="p-3">
        <div className="grid sm:grid-cols-5 gap-2">
          <Input placeholder="Recherche phone/nom/cat" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="new">new</SelectItem>
              <SelectItem value="available">available</SelectItem>
              <SelectItem value="opted_in">opted_in</SelectItem>
              <SelectItem value="opted_out">opted_out</SelectItem>
              <SelectItem value="blocked">blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterIntent} onValueChange={setFilterIntent}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toute intention</SelectItem>
              <SelectItem value="buy">Acheteurs</SelectItem>
              <SelectItem value="sell">Vendeurs</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sources</SelectItem>
              {sources.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" variant="default" disabled={!selected.size} onClick={() => setNotifyOpen(true)}>
              <Send className="w-4 h-4 mr-1" /> Notifier ({selected.size})
            </Button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mt-2">
          <Button size="sm" variant="outline" disabled={!selected.size} onClick={() => bulkAuto(true)}>Activer auto-notify</Button>
          <Button size="sm" variant="outline" disabled={!selected.size} onClick={() => bulkAuto(false)}>Désactiver auto-notify</Button>
          <Button size="sm" variant="outline" disabled={!selected.size} onClick={() => bulkStatus("opted_in")}>Marquer opted_in</Button>
          <Button size="sm" variant="outline" disabled={!selected.size} onClick={() => bulkStatus("opted_out")}>Marquer opted_out</Button>
          <Button size="sm" variant="outline" disabled={!selected.size} onClick={() => bulkStatus("blocked")}>Bloquer</Button>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Téléphone / Nom</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Signaux</TableHead>
              <TableHead>Catégories</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Auto</TableHead>
              <TableHead>Dernier vu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (<TableRow><TableCell colSpan={8} className="text-center"><Loader2 className="w-4 h-4 animate-spin inline" /></TableCell></TableRow>)}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                <AlertCircle className="w-4 h-4 inline mr-1" /> Aucun contact. Lancez "Re-sync".
              </TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id} className={selected.has(r.id) ? "bg-muted/50" : ""}>
                <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} /></TableCell>
                <TableCell>
                  <div className="font-mono text-xs">+{r.phone_e164}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.display_name || "—"}</div>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.source || "?"}</Badge></TableCell>
                <TableCell className="text-xs">
                  <div>{r.signal_count} sig.</div>
                  <div className="text-muted-foreground">B:{r.intent_buy_count} · S:{r.intent_sell_count}</div>
                </TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{r.categories.join(", ") || "—"}</TableCell>
                <TableCell>
                  <Select value={r.status} onValueChange={(v) => updateRow(r.id, { status: v as any })}>
                    <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["new", "available", "opted_in", "opted_out", "blocked"].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Switch checked={r.auto_notify} onCheckedChange={(v) => updateRow(r.id, { auto_notify: v })} /></TableCell>
                <TableCell className="text-xs">{new Date(r.last_seen_at).toLocaleDateString("fr-FR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Envoyer à {selected.size} contact(s)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Mode</Label>
              <Select value={notifyMode} onValueChange={(v: any) => setNotifyMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Annonce générale</SelectItem>
                  <SelectItem value="buyer">Notification acheteur</SelectItem>
                  <SelectItem value="seller">Notification vendeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Article ID (optionnel)</Label>
              <Input value={notifyArticle} onChange={(e) => setNotifyArticle(e.target.value)} placeholder="uuid d'un waouh_articles" />
            </div>
            <div>
              <Label>Message WhatsApp</Label>
              <Textarea rows={5} value={notifyMsg} onChange={(e) => setNotifyMsg(e.target.value)} placeholder="Votre message…" />
            </div>
            <div className="text-xs text-muted-foreground">
              Les contacts en opted_out / blocked seront automatiquement ignorés.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyOpen(false)}>Annuler</Button>
            <Button onClick={sendNotify} disabled={sending || !notifyMsg.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />} Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
