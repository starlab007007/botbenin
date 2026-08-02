import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Bot, Brain, BarChart3, Package, QrCode, MessageCircle,
  Trash2, RefreshCw, Play, Square, LogOut, Search,
} from "lucide-react";

// ---------------- Types ----------------
type OwnerMap = Record<string, { email?: string | null; full_name?: string | null }>;

// ---------------- Utilities ----------------
async function logAdminAction(admin_id: string, action: string, target: string, target_id: string, details: any = {}) {
  await supabase.from("admin_logs").insert({
    admin_user_id: admin_id,
    action: `${action}:${target}`,
    details: { target, target_id, ...details },
  } as any);
}

async function fetchOwners(userIds: string[]): Promise<OwnerMap> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return {};
  const { data } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .in("id", ids);
  const map: OwnerMap = {};
  (data ?? []).forEach((p: any) => { map[p.id] = { email: p.email, full_name: p.full_name }; });
  return map;
}

function OwnerCell({ userId, owners }: { userId: string | null; owners: OwnerMap }) {
  if (!userId) return <span className="text-muted-foreground">—</span>;
  const o = owners[userId];
  return (
    <div className="text-xs">
      <div className="font-medium">{o?.full_name ?? "Utilisateur"}</div>
      <div className="text-muted-foreground truncate max-w-[180px]">{o?.email ?? userId.slice(0, 8) + "…"}</div>
    </div>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }); }
  catch { return "—"; }
}

// ---------------- Bots classiques ----------------
function BotsClassicTab({ adminId }: { adminId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [owners, setOwners] = useState<OwnerMap>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bots")
      .select("id,name,description,is_active,owner_id,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setOwners(await fetchOwners((data ?? []).map((r: any) => r.owner_id)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (b: any) => {
    const { error } = await supabase.from("bots").update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(adminId, b.is_active ? "deactivate" : "activate", "bots", b.id);
    toast({ title: b.is_active ? "Bot désactivé" : "Bot activé" });
    load();
  };

  const remove = async (b: any) => {
    const { error } = await supabase.from("bots").delete().eq("id", b.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(adminId, "delete", "bots", b.id, { name: b.name });
    toast({ title: "Bot supprimé" });
    load();
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      (r.name ?? "").toLowerCase().includes(s) ||
      (owners[r.owner_id]?.email ?? "").toLowerCase().includes(s)
    );
  }, [rows, q, owners]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" className="pl-8" />
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Chargement…</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Aucun bot</TableCell></TableRow>}
            {filtered.map(b => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{b.description}</div>
                </TableCell>
                <TableCell><OwnerCell userId={b.owner_id} owners={owners} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!b.is_active} onCheckedChange={() => toggle(b)} />
                    <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Actif" : "Inactif"}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(b.created_at)}</TableCell>
                <TableCell className="text-right">
                  <DeleteButton onConfirm={() => remove(b)} label={b.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- Agents IA WAOUH ----------------
function AiAgentsTab({ adminId }: { adminId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [owners, setOwners] = useState<OwnerMap>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("waouh_ai_agents")
      .select("id,name,sector,agent_type,status,user_id,waha_session_name,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setOwners(await fetchOwners((data ?? []).map((r: any) => r.user_id)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (a: any, next: "active" | "paused") => {
    const { error } = await supabase.from("waouh_ai_agents").update({ status: next }).eq("id", a.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(adminId, next, "waouh_ai_agents", a.id);
    toast({ title: `Agent ${next === "active" ? "activé" : "mis en pause"}` });
    load();
  };

  const remove = async (a: any) => {
    const { error } = await supabase.from("waouh_ai_agents").delete().eq("id", a.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(adminId, "delete", "waouh_ai_agents", a.id, { name: a.name });
    toast({ title: "Agent supprimé" });
    load();
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      (r.name ?? "").toLowerCase().includes(s) ||
      (r.sector ?? "").toLowerCase().includes(s) ||
      (owners[r.user_id]?.email ?? "").toLowerCase().includes(s)
    );
  }, [rows, q, owners]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" className="pl-8" />
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Type / Secteur</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>Session WA</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Chargement…</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aucun agent IA</TableCell></TableRow>}
            {filtered.map(a => {
              const active = a.status === "active";
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.agent_type ?? "commerce"}</Badge>
                    <div className="text-xs text-muted-foreground">{a.sector ?? "—"}</div>
                  </TableCell>
                  <TableCell><OwnerCell userId={a.user_id} owners={owners} /></TableCell>
                  <TableCell className="text-xs">{a.waha_session_name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={active} onCheckedChange={() => setStatus(a, active ? "paused" : "active")} />
                      <Badge variant={active ? "default" : "secondary"}>{active ? "Actif" : "Pause"}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteButton onConfirm={() => remove(a)} label={a.name} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- BI Sources ----------------
function BiAgentsTab({ adminId }: { adminId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [owners, setOwners] = useState<OwnerMap>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("waouh_bi_sources")
      .select("id,name,source_type,status,row_count,column_count,user_id,updated_at,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setOwners(await fetchOwners((data ?? []).map((r: any) => r.user_id)));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (r: any) => {
    const { error } = await supabase.from("waouh_bi_sources").delete().eq("id", r.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(adminId, "delete", "waouh_bi_sources", r.id, { name: r.name });
    toast({ title: "Source supprimée" });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end"><Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button></div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>Lignes / Colonnes</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Mis à jour</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Chargement…</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Aucune source BI</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><Badge variant="outline">{r.source_type}</Badge></TableCell>
                <TableCell><OwnerCell userId={r.user_id} owners={owners} /></TableCell>
                <TableCell className="text-xs">{r.row_count ?? 0} / {r.column_count ?? 0}</TableCell>
                <TableCell><Badge variant={r.status === "ready" ? "default" : "secondary"}>{r.status ?? "—"}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(r.updated_at)}</TableCell>
                <TableCell className="text-right"><DeleteButton onConfirm={() => remove(r)} label={r.name} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- Stock (produits partenaires — parité Flutter) ----------------
function StockAgentsTab({ adminId }: { adminId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [owners, setOwners] = useState<OwnerMap>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("waouh_partner_products")
      .select("id,nom,categorie,unite,stock_estime,stock_minimum,partner_id,updated_at,waouh_partners(nom,user_id)")
      .order("updated_at", { ascending: false })
      .limit(200);
    const list = data ?? [];
    setRows(list);
    setOwners(await fetchOwners(list.map((r: any) => r.waouh_partners?.user_id).filter(Boolean)));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (r: any) => {
    const { error } = await (supabase as any).from("waouh_partner_products").delete().eq("id", r.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(adminId, "delete", "waouh_partner_products", r.id, { name: r.nom });
    toast({ title: "Produit supprimé" });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end"><Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button></div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Commerce</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Seuil</TableHead>
              <TableHead>Maj</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Chargement…</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Aucun produit en stock</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nom}</TableCell>
                <TableCell>{r.waouh_partners?.nom ?? "—"}</TableCell>
                <TableCell><OwnerCell userId={r.waouh_partners?.user_id} owners={owners} /></TableCell>
                <TableCell>{r.stock_estime ?? 0}{r.unite ? ` ${r.unite}` : ""}</TableCell>
                <TableCell className="text-xs">{r.stock_minimum ?? 0}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(r.updated_at)}</TableCell>
                <TableCell className="text-right"><DeleteButton onConfirm={() => remove(r)} label={r.nom} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- Présence QR (waouh_presence_sites — parité Flutter) ----------------
function AttendanceAgentsTab({ adminId }: { adminId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [owners, setOwners] = useState<OwnerMap>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("waouh_presence_sites")
      .select("id,name,address,radius_meters,responsible_whatsapp,active,user_id,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setOwners(await fetchOwners((data ?? []).map((r: any) => r.user_id)));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (r: any) => {
    const { error } = await (supabase as any).from("waouh_presence_sites").update({ active: !r.active }).eq("id", r.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(adminId, r.active ? "deactivate" : "activate", "waouh_presence_sites", r.id);
    toast({ title: r.active ? "Site désactivé" : "Site activé" });
    load();
  };

  const regenerateQr = async (r: any) => {
    const { error } = await supabase.functions.invoke("waouh-presence-qr-create", {
      body: { site_id: r.id, validity_minutes: 60 * 24 * 30, use_limit: 500, replace_active: true },
    });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(adminId, "regenerate_qr", "waouh_presence_sites", r.id);
    toast({ title: "QR régénéré" });
    load();
  };

  const remove = async (r: any) => {
    const { error } = await (supabase as any).from("waouh_presence_sites").delete().eq("id", r.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(adminId, "delete", "waouh_presence_sites", r.id, { name: r.name });
    toast({ title: "Site supprimé" });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end"><Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button></div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Adresse</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>Rayon</TableHead>
              <TableHead>Employeur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Chargement…</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Aucun site</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{r.address ?? "—"}</TableCell>
                <TableCell><OwnerCell userId={r.user_id} owners={owners} /></TableCell>
                <TableCell className="text-xs">{r.radius_meters ?? 50} m</TableCell>
                <TableCell className="text-xs">{r.responsible_whatsapp ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!r.active} onCheckedChange={() => toggle(r)} />
                    <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Actif" : "Inactif"}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="outline" size="sm" onClick={() => regenerateQr(r)}><QrCode className="h-3.5 w-3.5" /></Button>
                  <DeleteButton onConfirm={() => remove(r)} label={r.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- WhatsApp Sessions ----------------
function WhatsAppSessionsTab({ adminId }: { adminId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [owners, setOwners] = useState<OwnerMap>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_accounts")
      .select("id,session_name,phone_number,status,user_id,last_activity,created_at,waha_authenticated")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setOwners(await fetchOwners((data ?? []).map((r: any) => r.user_id)));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const callWaha = async (action: "start" | "stop" | "restart" | "logout", session_name: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("waha-connect", {
        body: { action, session_name },
      });
      if (error) throw error;
      toast({ title: `Session ${action}`, description: data?.message ?? "OK" });
      await logAdminAction(adminId, action, "whatsapp_accounts", session_name);
      setTimeout(load, 1200);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Action échouée", variant: "destructive" });
    }
  };

  const remove = async (r: any) => {
    const { error } = await supabase.from("whatsapp_accounts").delete().eq("id", r.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(adminId, "delete", "whatsapp_accounts", r.id, { session_name: r.session_name });
    toast({ title: "Session supprimée" });
    load();
  };

  const statusVariant = (s?: string) =>
    s === "WORKING" ? "default" : s === "SCAN_QR_CODE" || s === "STARTING" ? "secondary" : "outline";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end"><Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button></div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Chargement…</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucune session</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-xs">{r.session_name}</TableCell>
                <TableCell className="text-xs">{r.phone_number ?? "—"}</TableCell>
                <TableCell><OwnerCell userId={r.user_id} owners={owners} /></TableCell>
                <TableCell><Badge variant={statusVariant(r.status) as any}>{r.status ?? "—"}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(r.last_activity ?? r.created_at)}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="outline" size="sm" title="Démarrer" onClick={() => callWaha("start", r.session_name)}><Play className="h-3.5 w-3.5" /></Button>
                  <Button variant="outline" size="sm" title="Redémarrer" onClick={() => callWaha("restart", r.session_name)}><RefreshCw className="h-3.5 w-3.5" /></Button>
                  <Button variant="outline" size="sm" title="Arrêter" onClick={() => callWaha("stop", r.session_name)}><Square className="h-3.5 w-3.5" /></Button>
                  <Button variant="outline" size="sm" title="Déconnecter" onClick={() => callWaha("logout", r.session_name)}><LogOut className="h-3.5 w-3.5" /></Button>
                  <DeleteButton onConfirm={() => remove(r)} label={r.session_name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- Delete confirm ----------------
function DeleteButton({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {label} » ?</AlertDialogTitle>
          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------- Page ----------------
export default function AdminBotsControlPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const adminId = user?.id ?? "";

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}><ArrowLeft className="h-4 w-4 mr-1" />Admin</Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Bot className="h-7 w-7 text-cyan-600" /> Contrôle Bots & Agents IA</h1>
        <p className="text-muted-foreground text-sm">Supervision complète : bots classiques, agents IA WAOUH (BI, Stock, Présence QR) et sessions WhatsApp. Activer, désactiver, contrôler et suivre.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Gestion centralisée</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="bots" className="w-full">
            <TabsList className="flex flex-wrap gap-1">
              <TabsTrigger value="bots"><Bot className="h-4 w-4 mr-1" />Bots</TabsTrigger>
              <TabsTrigger value="ai"><Brain className="h-4 w-4 mr-1" />Agents IA</TabsTrigger>
              <TabsTrigger value="bi"><BarChart3 className="h-4 w-4 mr-1" />BI</TabsTrigger>
              <TabsTrigger value="stock"><Package className="h-4 w-4 mr-1" />Stock</TabsTrigger>
              <TabsTrigger value="attendance"><QrCode className="h-4 w-4 mr-1" />Présence QR</TabsTrigger>
              <TabsTrigger value="wa"><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</TabsTrigger>
            </TabsList>
            <TabsContent value="bots" className="mt-4"><BotsClassicTab adminId={adminId} /></TabsContent>
            <TabsContent value="ai" className="mt-4"><AiAgentsTab adminId={adminId} /></TabsContent>
            <TabsContent value="bi" className="mt-4"><BiAgentsTab adminId={adminId} /></TabsContent>
            <TabsContent value="stock" className="mt-4"><StockAgentsTab adminId={adminId} /></TabsContent>
            <TabsContent value="attendance" className="mt-4"><AttendanceAgentsTab adminId={adminId} /></TabsContent>
            <TabsContent value="wa" className="mt-4"><WhatsAppSessionsTab adminId={adminId} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
