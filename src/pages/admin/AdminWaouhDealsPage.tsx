import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Truck, Package, CheckCircle2, Plus, Phone, MapPin, X } from "lucide-react";

type Deal = any;
type Courier = {
  id: string;
  name: string;
  phone_number: string;
  city: string | null;
  active: boolean;
  notes?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_assignment: "À assigner",
  assigned: "Assigné",
  picked_up: "Collecté",
  delivered: "Livré",
  completed: "Terminé",
  cancelled: "Annulé",
};

const STATUS_COLOR: Record<string, string> = {
  pending_assignment: "bg-amber-100 text-amber-800",
  assigned: "bg-sky-100 text-sky-800",
  picked_up: "bg-cyan-100 text-cyan-800",
  delivered: "bg-indigo-100 text-indigo-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
};

export default function AdminWaouhDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCourierOpen, setNewCourierOpen] = useState(false);
  const [tab, setTab] = useState("active");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("waouh_deals" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("waouh_couriers" as any).select("*").order("active", { ascending: false }).order("name"),
    ]);
    setDeals((d || []) as any);
    setCouriers((c || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Enrich deals with article/users in batch (with profiles fallback for name/phone)
  const [enrichments, setEnrichments] = useState<Record<string, any>>({});
  useEffect(() => {
    if (deals.length === 0) return;
    (async () => {
      const articleIds = Array.from(new Set(deals.map((d) => d.article_id).filter(Boolean)));
      const userIds = Array.from(new Set(deals.flatMap((d) => [d.buyer_user_id, d.seller_user_id]).filter(Boolean)));
      const [{ data: arts }, { data: us }] = await Promise.all([
        articleIds.length ? supabase.from("waouh_articles").select("id, title, price").in("id", articleIds) : Promise.resolve({ data: [] } as any),
        userIds.length ? supabase.from("waouh_users").select("id, display_name, phone_number, city, auth_user_id").in("id", userIds) : Promise.resolve({ data: [] } as any),
      ]);
      const authIds = Array.from(new Set((us || []).map((u: any) => u.auth_user_id).filter(Boolean)));
      const { data: profs } = authIds.length
        ? await supabase.from("profiles" as any).select("id, full_name, phone").in("id", authIds)
        : { data: [] } as any;
      const profMap: Record<string, any> = {};
      (profs || []).forEach((p: any) => { profMap[p.id] = p; });
      const map: Record<string, any> = {};
      (arts || []).forEach((a: any) => { map[`article:${a.id}`] = a; });
      (us || []).forEach((u: any) => {
        const p = u.auth_user_id ? profMap[u.auth_user_id] : null;
        map[`user:${u.id}`] = {
          ...u,
          display_name: u.display_name || p?.full_name || null,
          phone_number: u.phone_number || p?.phone || null,
        };
      });
      setEnrichments(map);
    })();
  }, [deals]);

  const filtered = useMemo(() => {
    const active = ["pending_assignment", "assigned", "picked_up", "delivered"];
    return deals.filter((d) => tab === "active" ? active.includes(d.status) : !active.includes(d.status));
  }, [deals, tab]);

  return (
    <div className="container mx-auto py-6 px-4 space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="w-6 h-6" /> Ops Livraisons WAOUH</h1>
          <p className="text-sm text-muted-foreground">Assigner les livreurs, suivre les statuts, fermer la boucle paiement.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}><Loader2 className={loading ? "w-4 h-4 mr-2 animate-spin" : "hidden"} />Rafraîchir</Button>
          <Button onClick={() => setNewCourierOpen(true)}><Plus className="w-4 h-4 mr-1" /> Livreur</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Truck className="w-4 h-4" /> Livreurs ({couriers.filter(c => c.active).length} actifs)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {couriers.length === 0 && <span className="text-sm text-muted-foreground">Aucun livreur. Ajoutez-en un.</span>}
          {couriers.map((c) => (
            <CourierChip key={c.id} courier={c} onChanged={fetchData} />
          ))}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">En cours ({deals.filter(d => ["pending_assignment","assigned","picked_up","delivered"].includes(d.status)).length})</TabsTrigger>
          <TabsTrigger value="archive">Historique</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Chargement…</div>}
          {!loading && filtered.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">Aucun deal.</div>}
          {filtered.map((d) => (
            <DealCard
              key={d.id}
              deal={d}
              article={enrichments[`article:${d.article_id}`]}
              buyer={enrichments[`user:${d.buyer_user_id}`]}
              seller={enrichments[`user:${d.seller_user_id}`]}
              couriers={couriers.filter(c => c.active)}
              onRefresh={fetchData}
            />
          ))}
        </TabsContent>
      </Tabs>

      <NewCourierDialog open={newCourierOpen} onOpenChange={setNewCourierOpen} onCreated={fetchData} />
    </div>
  );
}

const CourierChip: React.FC<{ courier: Courier; onChanged: () => void }> = ({ courier, onChanged }) => {
  const toggle = async () => {
    await supabase.from("waouh_couriers" as any).update({ active: !courier.active }).eq("id", courier.id);
    onChanged();
  };
  return (
    <div className={`px-3 py-1.5 rounded-full text-xs border flex items-center gap-1.5 ${courier.active ? "bg-emerald-50 border-emerald-200" : "bg-muted text-muted-foreground"}`}>
      <span className="font-medium">{courier.name}</span>
      <span className="text-muted-foreground">· {courier.phone_number}</span>
      {courier.city && <span className="text-muted-foreground">· {courier.city}</span>}
      <button onClick={toggle} title="Basculer actif" className="ml-1 opacity-60 hover:opacity-100">
        {courier.active ? <X className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
      </button>
    </div>
  );
};

const DealCard: React.FC<{
  deal: Deal;
  article: any;
  buyer: any;
  seller: any;
  couriers: Courier[];
  onRefresh: () => void;
}> = ({ deal, article, buyer, seller, couriers, onRefresh }) => {
  const [courierId, setCourierId] = useState<string>("");
  const [etaMin, setEtaMin] = useState<number>(30);
  const [busy, setBusy] = useState<string | null>(null);
  const [editEta, setEditEta] = useState(false);
  const [newEta, setNewEta] = useState<number>(deal.eta_minutes || 30);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const assign = async () => {
    if (!courierId) { toast.error("Choisis un livreur"); return; }
    setBusy("assign");
    try {
      const { error } = await supabase.functions.invoke("waouh-deal-ops", {
        body: { action: "assign", deal_id: deal.id, courier_id: courierId, eta_minutes: etaMin },
      });
      if (error) throw error;
      toast.success("Livreur assigné — notifications envoyées");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Erreur d'assignation");
    } finally { setBusy(null); }
  };

  const updateStatus = async (status: string, reason?: string) => {
    setBusy(status);
    try {
      const { error } = await supabase.functions.invoke("waouh-deal-ops", {
        body: { action: "status", deal_id: deal.id, status, reason: reason || undefined },
      });
      if (error) throw error;
      toast.success(`Statut mis à jour : ${STATUS_LABEL[status] || status}`);
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally { setBusy(null); }
  };

  const updateEta = async () => {
    if (!newEta || newEta < 1) { toast.error("ETA invalide"); return; }
    setBusy("eta");
    try {
      const { error } = await supabase.functions.invoke("waouh-deal-ops", {
        body: { action: "update_eta", deal_id: deal.id, eta_minutes: newEta },
      });
      if (error) throw error;
      toast.success(`ETA mise à jour (${newEta} min) — acheteur notifié`);
      setEditEta(false);
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Erreur ETA");
    } finally { setBusy(null); }
  };

  const confirmCancel = async () => {
    await updateStatus("cancelled", cancelReason.trim());
    setCancelOpen(false);
    setCancelReason("");
  };

  const amountFcfa = Number(deal.amount || 0).toLocaleString("fr-FR");
  const isPending = deal.status === "pending_assignment";
  const isAssigned = deal.status === "assigned";
  const isPickedUp = deal.status === "picked_up";
  const isDelivered = deal.status === "delivered";

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              {article?.title || "Article supprimé"}
              <Badge className={`${STATUS_COLOR[deal.status] || ""} border-0 text-[10px]`}>{STATUS_LABEL[deal.status] || deal.status}</Badge>
              {deal.payment_status === "paid" && <Badge className="bg-emerald-600 text-white border-0 text-[10px]">💰 Payé ({deal.payment_method})</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">
              #{String(deal.id).slice(0, 8)} · {amountFcfa} FCFA · {new Date(deal.created_at).toLocaleString("fr-FR")}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="border rounded p-2">
            <div className="text-xs text-muted-foreground font-semibold">🛒 Acheteur</div>
            <div>{buyer?.display_name || "—"}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" /> {buyer?.phone_number || "—"}
              {buyer?.city && <><MapPin className="w-3 h-3 ml-1" /> {buyer.city}</>}
            </div>
          </div>
          <div className="border rounded p-2">
            <div className="text-xs text-muted-foreground font-semibold">👤 Vendeur</div>
            <div>{seller?.display_name || "—"}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" /> {seller?.phone_number || "—"}
              {seller?.city && <><MapPin className="w-3 h-3 ml-1" /> {seller.city}</>}
            </div>
          </div>
        </div>

        {deal.courier_name && (
          <div className="text-sm bg-sky-50 dark:bg-sky-950/30 rounded p-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>🛵 Livreur : <strong>{deal.courier_name}</strong> · {deal.courier_phone}</span>
            {!editEta && deal.eta_minutes && (
              <span className="text-muted-foreground">
                · ETA {deal.eta_minutes} min
                {deal.eta_at && <> (≈ {new Date(deal.eta_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})</>}
              </span>
            )}
            {(isAssigned || isPickedUp) && !editEta && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs ml-auto" onClick={() => { setNewEta(deal.eta_minutes || 30); setEditEta(true); }}>
                ⏱️ Modifier ETA
              </Button>
            )}
            {editEta && (
              <div className="flex items-center gap-1 ml-auto">
                <Input type="number" min={1} value={newEta} onChange={(e) => setNewEta(Number(e.target.value || 0))} className="h-7 w-20" />
                <span className="text-xs text-muted-foreground">min</span>
                <Button size="sm" className="h-7" onClick={updateEta} disabled={busy === "eta"}>
                  {busy === "eta" ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditEta(false)} disabled={busy === "eta"}>Annuler</Button>
              </div>
            )}
          </div>
        )}

        {isPending && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Livreur</Label>
              <Select value={courierId} onValueChange={setCourierId}>
                <SelectTrigger><SelectValue placeholder="Choisir un livreur" /></SelectTrigger>
                <SelectContent>
                  {couriers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} · {c.phone_number}{c.city ? ` · ${c.city}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <Label className="text-xs">ETA (min)</Label>
              <Input type="number" min={1} value={etaMin} onChange={(e) => setEtaMin(Number(e.target.value || 0))} />
            </div>
            <Button onClick={assign} disabled={busy === "assign"}>
              {busy === "assign" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Truck className="w-4 h-4 mr-1" />}
              Assigner
            </Button>
          </div>
        )}

        {(isAssigned || isPickedUp || isDelivered) && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {isAssigned && (
              <Button size="sm" variant="outline" onClick={() => updateStatus("picked_up")} disabled={busy !== null}>
                {busy === "picked_up" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Package className="w-4 h-4 mr-1" />}
                Marquer collecté
              </Button>
            )}
            {(isAssigned || isPickedUp) && (
              <Button size="sm" onClick={() => updateStatus("delivered")} disabled={busy !== null}>
                {busy === "delivered" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                Marquer livré
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setCancelOpen(true)} disabled={busy !== null}>
              <X className="w-4 h-4 mr-1" /> Annuler la livraison
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] w-[90vw] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-rose-600">⚠️ Annuler la livraison</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              L'acheteur et le vendeur seront notifiés. Cette action ne peut pas être annulée.
            </p>
            <div>
              <Label className="text-xs">Raison (optionnel, partagée aux parties)</Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="ex : livreur indisponible, article cassé…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={busy === "cancelled"}>
              Retour
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={busy === "cancelled"}>
              {busy === "cancelled" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const NewCourierDialog: React.FC<{ open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }> = ({ open, onOpenChange, onCreated }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name || !phone) { toast.error("Nom et téléphone requis"); return; }
    setBusy(true);
    const { error } = await supabase.from("waouh_couriers" as any).insert({
      name, phone_number: phone, city: city || null, notes: notes || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Livreur ajouté");
    setName(""); setPhone(""); setCity(""); setNotes("");
    onCreated(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] w-[90vw] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouveau livreur</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Téléphone (E.164 sans +)</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="22996123456" /></div>
          <div><Label>Ville</Label><Input value={city} onChange={e => setCity(e.target.value)} /></div>
          <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button onClick={submit} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
