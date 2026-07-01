import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Check, X, RefreshCw, Eye, Users, Save, Filter } from "lucide-react";
import { toast } from "sonner";
import DiffusionTrackingDashboard from "@/components/diffusion/DiffusionTrackingDashboard";

interface Recipient {
  phone_e164: string;
  name?: string;
  secteur?: string | null;
  ville?: string | null;
  classe?: string | null;
  included: boolean;
  intent_score?: number;
}
interface Approval {
  id: string; campaign_id: string | null; requested_by: string;
  audience_filters: any; audience_snapshot: any;
  message_template: string; media_url: string | null;
  quota_requested: number; quota_approved: number | null;
  status: string; reason: string | null;
  created_at: string;
  audience_recipients?: Recipient[];
  excluded_phones?: string[];
}

const E164 = /^\+?[1-9]\d{7,14}$/;

function normalizePhoneBJ(raw: string): string {
  let p = String(raw || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.length === 10 && p.startsWith("0")) p = "229" + p.slice(1);
  else if (p.length === 8) p = "229" + p;
  return "+" + p;
}

export default function AdminDiffusionApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "actives" | "history">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { quota?: number; reason?: string; template?: string }>>({});
  const [recipientsByApproval, setRecipientsByApproval] = useState<Record<string, Recipient[]>>({});
  const [loadingRecipients, setLoadingRecipients] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState<Record<string, boolean>>({});
  const [rowFilter, setRowFilter] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from("waouh_diffusion_approvals" as any).select("*").order("created_at", { ascending: false }).limit(100);
    if (tab === "pending") q = q.eq("status", "pending");
    else if (tab === "history") q = q.in("status", ["rejected"]);
    else if (tab === "actives") q = q.eq("status", "approved");
    const { data } = await q;
    const rows = (data as any as Approval[]) ?? [];
    setItems(rows);
    // preload persisted recipients
    const map: Record<string, Recipient[]> = {};
    rows.forEach(r => { if (Array.isArray(r.audience_recipients) && r.audience_recipients.length) map[r.id] = r.audience_recipients; });
    setRecipientsByApproval(prev => ({ ...prev, ...map }));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  useEffect(() => {
    const ch = supabase.channel("admin-approvals-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "waouh_diffusion_approvals" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [tab]);

  const loadRecipients = async (a: Approval) => {
    setLoadingRecipients(a.id);
    try {
      const filters = a.audience_filters || {};
      const { data, error } = await supabase.functions.invoke("waouh-diffusion-audience", {
        body: { ...filters, admin_full: true, limit_sample: 500 },
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.error || "Erreur audience");
      const list: Recipient[] = (res.sample || []).map((s: any) => ({
        phone_e164: normalizePhoneBJ(s.phone_e164 || ""),
        name: s.display_name || "",
        secteur: s.secteur, ville: s.ville, classe: s.classe,
        intent_score: s.intent_score,
        included: true,
      })).filter((r: Recipient) => E164.test(r.phone_e164));
      // Merge with any previously persisted list (keep admin edits)
      const existing = recipientsByApproval[a.id] || [];
      const existingMap = new Map(existing.map(r => [r.phone_e164, r]));
      list.forEach(r => { if (existingMap.has(r.phone_e164)) r.included = existingMap.get(r.phone_e164)!.included; });
      setRecipientsByApproval(prev => ({ ...prev, [a.id]: list }));
      setShowEditor(prev => ({ ...prev, [a.id]: true }));
      toast.success(`${list.length} numéros chargés`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingRecipients(null); }
  };

  const updateRecipient = (aid: string, idx: number, patch: Partial<Recipient>) => {
    setRecipientsByApproval(prev => {
      const list = [...(prev[aid] || [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, [aid]: list };
    });
  };

  const bulkInclude = (aid: string, value: boolean, filterFn?: (r: Recipient) => boolean) => {
    setRecipientsByApproval(prev => {
      const list = (prev[aid] || []).map(r => (!filterFn || filterFn(r)) ? { ...r, included: value } : r);
      return { ...prev, [aid]: list };
    });
  };

  const act = async (a: Approval, action: "approve" | "reject") => {
    setBusy(a.id);
    try {
      const ov = overrides[a.id] || {};
      const list = recipientsByApproval[a.id] || [];
      const includedCount = list.filter(r => r.included).length;
      const body: any = {
        approval_id: a.id, action,
        quota_approved: ov.quota ?? (includedCount > 0 ? Math.min(a.quota_requested, includedCount) : a.quota_requested),
        reason: ov.reason,
        message_template_override: ov.template,
      };
      if (list.length > 0) body.audience_recipients = list;
      const { data, error } = await supabase.functions.invoke("waouh-diffusion-approve", { body });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error);
      toast.success(action === "approve" ? `✅ Approuvée (${includedCount || a.quota_requested} destinataires)` : "❌ Rejetée");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📣 Diffusion IA — Validation & Suivi</h1>
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">🕐 En attente</TabsTrigger>
          <TabsTrigger value="actives">✅ Approuvées / Suivi</TabsTrigger>
          <TabsTrigger value="history">📁 Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {loading && <p className="text-center text-muted-foreground py-8">Chargement…</p>}
          {!loading && items.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune demande en attente</p>}
          {items.map(a => (
            <ApprovalCard key={a.id}
              a={a}
              busy={busy === a.id}
              loadingRecipients={loadingRecipients === a.id}
              recipients={recipientsByApproval[a.id]}
              showEditor={!!showEditor[a.id]}
              rowFilter={rowFilter[a.id] || ""}
              overrides={overrides[a.id]}
              onSetFilter={(v) => setRowFilter(o => ({ ...o, [a.id]: v }))}
              onSetOverride={(patch) => setOverrides(o => ({ ...o, [a.id]: { ...o[a.id], ...patch } }))}
              onLoadRecipients={() => loadRecipients(a)}
              onToggleEditor={() => setShowEditor(o => ({ ...o, [a.id]: !o[a.id] }))}
              onUpdateRecipient={(idx, patch) => updateRecipient(a.id, idx, patch)}
              onBulkInclude={(v, fn) => bulkInclude(a.id, v, fn)}
              onAct={act}
            />
          ))}
        </TabsContent>

        <TabsContent value="actives" className="space-y-4 mt-4">
          {loading ? <p className="text-center text-muted-foreground py-8">Chargement…</p> :
            items.length === 0 ? <p className="text-center text-muted-foreground py-8">Aucune campagne approuvée</p> :
            <>
              <p className="text-xs text-muted-foreground">
                {items.length} demande(s) approuvée(s) • Le tableau de bord ci-dessous suit toutes les campagnes actives (envoyés, réponses, conversions, relance J+3).
              </p>
              <DiffusionTrackingDashboard />
            </>
          }
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          {loading && <p className="text-center text-muted-foreground py-8">Chargement…</p>}
          {!loading && items.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun historique</p>}
          {items.map(a => (
            <Card key={a.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Demande #{a.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                <Badge variant="destructive">{a.status}</Badge>
              </div>
              {a.reason && <p className="text-xs italic text-muted-foreground mt-2">Motif : {a.reason}</p>}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ k, v }: { k: string; v: any }) {
  return (
    <div className="rounded border bg-muted/30 p-2">
      <div className="text-muted-foreground text-[10px] uppercase">{k}</div>
      <div className="font-medium truncate text-sm">{String(v)}</div>
    </div>
  );
}

function ApprovalCard(props: {
  a: Approval;
  busy: boolean;
  loadingRecipients: boolean;
  recipients?: Recipient[];
  showEditor: boolean;
  rowFilter: string;
  overrides?: { quota?: number; reason?: string; template?: string };
  onSetFilter: (v: string) => void;
  onSetOverride: (patch: any) => void;
  onLoadRecipients: () => void;
  onToggleEditor: () => void;
  onUpdateRecipient: (idx: number, patch: Partial<Recipient>) => void;
  onBulkInclude: (v: boolean, fn?: (r: Recipient) => boolean) => void;
  onAct: (a: Approval, action: "approve" | "reject") => void;
}) {
  const { a, busy, loadingRecipients, recipients, showEditor, rowFilter, overrides,
          onSetFilter, onSetOverride, onLoadRecipients, onToggleEditor,
          onUpdateRecipient, onBulkInclude, onAct } = props;

  const filtered = useMemo(() => {
    const q = rowFilter.trim().toLowerCase();
    const list = recipients || [];
    if (!q) return list.map((r, i) => ({ r, i }));
    return list.map((r, i) => ({ r, i })).filter(({ r }) =>
      r.phone_e164.toLowerCase().includes(q) ||
      (r.name || "").toLowerCase().includes(q) ||
      (r.secteur || "").toLowerCase().includes(q) ||
      (r.ville || "").toLowerCase().includes(q) ||
      (r.classe || "").toLowerCase().includes(q)
    );
  }, [recipients, rowFilter]);

  const includedCount = (recipients || []).filter(r => r.included).length;
  const total = (recipients || []).length;
  const canApprove = a.status !== "pending" ? false : (total === 0 ? true : includedCount > 0);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">Demande #{a.id.slice(0, 8)}</div>
          <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
        </div>
        <Badge variant={a.status === "pending" ? "default" : a.status === "approved" ? "secondary" : "destructive"}>{a.status}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <Info k="Audience estimée" v={a.audience_snapshot?.total ?? "—"} />
        <Info k="Plafond demandé" v={a.quota_requested} />
        <Info k="Secteurs" v={(a.audience_filters?.secteurs ?? []).join(", ") || "Tous"} />
        <Info k="Villes" v={(a.audience_filters?.villes ?? []).join(", ") || "Toutes"} />
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-1">Message</div>
        <Textarea defaultValue={a.message_template} rows={3}
          onChange={e => onSetOverride({ template: e.target.value })}
          disabled={a.status !== "pending"} />
      </div>

      {/* Recipients editor */}
      <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            Numéros ciblés
            {total > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {includedCount} inclus / {total} chargés
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onLoadRecipients} disabled={loadingRecipients || a.status !== "pending"}>
              {loadingRecipients ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
              {total > 0 ? "Recharger" : "Voir & éditer les numéros"}
            </Button>
            {total > 0 && (
              <Button size="sm" variant="ghost" onClick={onToggleEditor}>
                {showEditor ? "Réduire" : "Déplier"}
              </Button>
            )}
          </div>
        </div>

        {showEditor && total > 0 && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <Input placeholder="Filtrer (téléphone, nom, secteur, ville…)" value={rowFilter}
                  onChange={e => onSetFilter(e.target.value)} className="h-8 text-xs" />
              </div>
              <Button size="sm" variant="outline" onClick={() => onBulkInclude(true)}>Tout inclure</Button>
              <Button size="sm" variant="outline" onClick={() => onBulkInclude(false, (r) =>
                filtered.some(f => f.r.phone_e164 === r.phone_e164)
              )}>Exclure le filtre</Button>
            </div>

            <div className="max-h-[380px] overflow-y-auto border rounded bg-background">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr className="text-left">
                    <th className="p-2 w-10">✓</th>
                    <th className="p-2">Téléphone</th>
                    <th className="p-2">Nom</th>
                    <th className="p-2">Secteur</th>
                    <th className="p-2">Ville</th>
                    <th className="p-2 w-14">Classe</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ r, i }) => {
                    const valid = E164.test(r.phone_e164);
                    return (
                      <tr key={i} className={"border-t " + (r.included ? "" : "opacity-50 line-through")}>
                        <td className="p-2">
                          <Checkbox checked={r.included} onCheckedChange={(v) => onUpdateRecipient(i, { included: !!v })} />
                        </td>
                        <td className="p-2">
                          <Input value={r.phone_e164}
                            onChange={e => onUpdateRecipient(i, { phone_e164: e.target.value })}
                            onBlur={e => onUpdateRecipient(i, { phone_e164: normalizePhoneBJ(e.target.value) })}
                            className={"h-7 text-xs " + (valid ? "" : "border-destructive")} />
                        </td>
                        <td className="p-2 truncate max-w-[160px]">{r.name || "—"}</td>
                        <td className="p-2 truncate max-w-[120px]">{r.secteur || "—"}</td>
                        <td className="p-2 truncate max-w-[100px]">{r.ville || "—"}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.classe || "—"}</Badge></td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Aucun résultat</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">
              💡 Les modifications sont enregistrées automatiquement au moment de l'approbation.
            </p>
          </>
        )}
      </div>

      {a.status === "pending" && (
        <div className="flex flex-col md:flex-row md:items-center gap-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <label className="text-sm whitespace-nowrap">Plafond approuvé :</label>
            <Input type="number"
              defaultValue={includedCount > 0 ? Math.min(a.quota_requested, includedCount) : a.quota_requested}
              className="w-28"
              onChange={e => onSetOverride({ quota: parseInt(e.target.value) || 0 })} />
          </div>
          <Input placeholder="Motif (optionnel)" className="flex-1"
            onChange={e => onSetOverride({ reason: e.target.value })} />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => onAct(a, "reject")} disabled={busy}>
              <X className="h-4 w-4 mr-1" /> Rejeter
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onAct(a, "approve")}
              disabled={busy || !canApprove}
              title={!canApprove ? "Inclure au moins un numéro pour approuver" : ""}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Approuver{total > 0 ? ` (${includedCount})` : ""}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
