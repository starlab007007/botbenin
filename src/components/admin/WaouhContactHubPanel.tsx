import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  ClipboardCopy,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

export interface HubContact {
  channel: string;
  value: string;
  normalized: string | null;
  display: string;
  whatsapp_candidate: boolean;
  whatsapp_reachable: boolean | null;
  whatsapp_chat_id: string | null;
  send_allowed: boolean;
  source: string;
  origin_kind: string;
  origin_id: string | null;
  contact_id: string | null;
  entity_id: string | null;
  consent_state: string | null;
  contactability_level: string;
  verification_status: string | null;
  public_business: boolean;
  opted_out: boolean;
  last_verified_at: string | null;
  label: string | null;
}

interface HubRow {
  fabric_id: string;
  source_record_id: string;
  source_key: string;
  source_label: string;
  source_family: string;
  operational_state: string;
  intent: string;
  actor_type: string;
  subject: string | null;
  city: string | null;
  contactability_level: string;
  source_url: string | null;
  contacts: HubContact[];
  primary_whatsapp: string | null;
  contact_count: number;
  whatsapp_count: number;
  wa_reachable_count: number;
}

interface HubStats {
  rows: number;
  contacts: number;
  whatsapp: number;
  reachable: number;
  sendable: number;
}

interface HubPage {
  offset: number;
  limit: number;
  source_rows: number;
  has_more: boolean;
}

const EMPTY_STATS: HubStats = { rows: 0, contacts: 0, whatsapp: 0, reachable: 0, sendable: 0 };

function levelClass(level?: string) {
  if (["C3", "C4", "C5"].includes(String(level || ""))) return "border-emerald-500 text-emerald-700";
  if (["C1", "C2"].includes(String(level || ""))) return "border-blue-500 text-blue-700";
  return "border-slate-300 text-slate-600";
}

function reachableMeta(contact: HubContact) {
  if (contact.opted_out || contact.consent_state === "revoked") {
    return { label: "Bloqué", className: "border-red-500 text-red-700" };
  }
  if (contact.whatsapp_reachable === true) {
    return { label: "WhatsApp vérifié", className: "border-emerald-500 text-emerald-700" };
  }
  if (contact.whatsapp_reachable === false) {
    return { label: "Non joignable", className: "border-red-400 text-red-700" };
  }
  if (contact.whatsapp_candidate) {
    return { label: "À vérifier WAHA", className: "border-amber-400 text-amber-700" };
  }
  return { label: contact.channel, className: "border-slate-300 text-slate-600" };
}

export default function WaouhContactHubPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<HubRow[]>([]);
  const [stats, setStats] = useState<HubStats>(EMPTY_STATS);
  const [page, setPage] = useState<HubPage>({ offset: 0, limit: 100, source_rows: 0, has_more: false });
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [whatsappOnly, setWhatsappOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [materializing, setMaterializing] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ row: HubRow; contact: HubContact } | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const sourceOptions = useMemo(
    () => [...new Set(rows.map((r) => r.source_key).filter(Boolean))].sort(),
    [rows],
  );

  const load = async (requestedOffset: number = page.offset) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-admin-stats", {
        body: {
          action: "contact_hub_search",
          q: q.trim() || null,
          source: source || null,
          contacts_only: true,
          whatsapp_only: whatsappOnly,
          limit: 100,
          offset: requestedOffset,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Contact Hub indisponible");
      setRows((data.rows || []) as HubRow[]);
      setStats({ ...EMPTY_STATS, ...(data.stats || {}) });
      setPage({
        offset: Number(data?.page?.offset ?? requestedOffset),
        limit: Number(data?.page?.limit ?? 100),
        source_rows: Number(data?.page?.source_rows ?? 0),
        has_more: data?.page?.has_more === true,
      });
    } catch (error: any) {
      toast({
        title: "Contact Hub indisponible",
        description: error?.message || String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(0);
    // Initialisation uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncWaha = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-waha-sync-contacts", {
        body: { backfill: true, maxSessions: 3, maxContactsPerSession: 1000 },
      });
      if (error) throw error;
      toast({
        title: data?.warning ? "Synchronisation WAHA terminée avec avertissement" : "Synchronisation WAHA terminée",
        description: data?.warning || `${data?.mapped ?? 0} contacts mappés · ${data?.backfilled ?? 0} lignes enrichies`,
      });
      await load(page.offset);
    } catch (error: any) {
      toast({ title: "Échec synchronisation WAHA", description: error?.message || String(error), variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const materializeAll = async () => {
    setMaterializing(true);
    let offset = 0;
    let attempted = 0;
    let written = 0;
    let skippedNoEntity = 0;
    let skippedRevoked = 0;
    let skippedInvalid = 0;

    try {
      for (let pageNo = 0; pageNo < 100; pageNo += 1) {
        const { data, error } = await supabase.functions.invoke("waouh-admin-stats", {
          body: {
            action: "contact_hub_materialize",
            q: null,
            source: null,
            contacts_only: false,
            limit: 100,
            offset,
          },
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "Centralisation impossible");

        attempted += Number(data.attempted || 0);
        written += Number(data.written || 0);
        skippedNoEntity += Number(data.skipped_no_entity || 0);
        skippedRevoked += Number(data.skipped_revoked || 0);
        skippedInvalid += Number(data.skipped_invalid || 0);

        if (data?.page?.has_more !== true) break;
        offset += Number(data?.page?.limit || 100);
      }

      toast({
        title: "Contacts centralisés",
        description:
          `${written} nouveau(x) contact(s) persisté(s) · ${attempted} candidat(s) · ${skippedNoEntity} sans entité · ${skippedRevoked} bloqué(s) · ${skippedInvalid} invalide(s)`,
      });
      await load(0);
    } catch (error: any) {
      toast({
        title: "Centralisation des contacts échouée",
        description: error?.message || String(error),
        variant: "destructive",
      });
    } finally {
      setMaterializing(false);
    }
  };

  const verify = async (row: HubRow, contact: HubContact) => {
    const phone = contact.normalized || contact.value;
    const key = `${row.fabric_id}:${phone}`;
    setVerifying(key);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-admin-stats", {
        body: { action: "contact_hub_verify", fabric_id: row.fabric_id, phone },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Vérification WAHA impossible");
      toast({
        title: data.exists ? "WhatsApp vérifié" : "Numéro non trouvé sur WhatsApp",
        description: data.exists
          ? `${data.display || data.normalized} · session ${data.session || "WAHA"}`
          : data.normalized || phone,
        variant: data.exists ? "default" : "destructive",
      });
      await load(page.offset);
    } catch (error: any) {
      toast({ title: "Vérification WAHA échouée", description: error?.message || String(error), variant: "destructive" });
    } finally {
      setVerifying(null);
    }
  };

  const openSend = (row: HubRow, contact: HubContact) => {
    setSelected({ row, contact });
    setMessage("");
  };

  const send = async () => {
    if (!selected || !message.trim()) return;
    setSending(true);
    try {
      const { row, contact } = selected;
      const { data, error } = await supabase.functions.invoke("waouh-admin-stats", {
        body: {
          action: "contact_hub_send",
          fabric_id: row.fabric_id,
          phone: contact.normalized || contact.value,
          message: message.trim(),
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Envoi impossible");
      const queueStatus = data?.queue?.status || "queued";
      toast({
        title: queueStatus === "sent" ? "Message WhatsApp envoyé" : "Message WhatsApp mis en file",
        description: `${data.display || data.phone || ""} · ${queueStatus}`,
      });
      setSelected(null);
      setMessage("");
      await load(page.offset);
    } catch (error: any) {
      toast({ title: "Envoi WhatsApp échoué", description: error?.message || String(error), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Contact copié", description: value });
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
                Contact Hub · WhatsApp / WAHA
              </CardTitle>
              <CardDescription className="mt-1">
                Coordonnées complètes réservées aux administrateurs. Normalisation E.164, vérification WhatsApp via WAHA,
                puis envoi par la file WAOUH avec retries, traçabilité et contrôle d’opt-out.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={materializeAll} disabled={materializing}>
                {materializing
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Phone className="h-4 w-4 mr-2" />}
                Centraliser toutes les sources
              </Button>
              <Button variant="outline" onClick={syncWaha} disabled={syncing || materializing}>
                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Synchroniser WAHA
              </Button>
              <Button onClick={() => load(0)} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Rechercher
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <MiniStat label="Signaux avec contact" value={stats.rows} />
            <MiniStat label="Contacts complets" value={stats.contacts} />
            <MiniStat label="Numéros WhatsApp" value={stats.whatsapp} />
            <MiniStat label="WAHA vérifiés" value={stats.reachable} accent="text-emerald-700" />
            <MiniStat label="Envoi autorisé" value={stats.sendable} accent="text-blue-700" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void load(0); }}
              placeholder="Nom, produit, ville, numéro, source…"
            />
            <Input
              list="waouh-contact-source-options"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Toutes les sources"
            />
            <datalist id="waouh-contact-source-options">
              {sourceOptions.map((s) => <option key={s} value={s} />)}
            </datalist>
            <Button
              variant={whatsappOnly ? "default" : "outline"}
              onClick={() => setWhatsappOnly((v) => !v)}
            >
              <Phone className="h-4 w-4 mr-2" />
              {whatsappOnly ? "WhatsApp uniquement" : "Tous les contacts"}
            </Button>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source / signal</TableHead>
                  <TableHead>Contact complet</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Autorisation</TableHead>
                  <TableHead>Provenance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.flatMap((row) =>
                  row.contacts.map((contact, index) => {
                    const meta = reachableMeta(contact);
                    const verifyKey = `${row.fabric_id}:${contact.normalized || contact.value}`;
                    return (
                      <TableRow key={`${row.fabric_id}:${contact.channel}:${contact.normalized || contact.value}:${index}`}>
                        <TableCell className="min-w-[220px]">
                          <div className="font-medium">{row.subject || "(sans titre)"}</div>
                          <div className="text-xs text-muted-foreground">{row.source_label || row.source_key}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px]">{row.intent || "—"}</Badge>
                            <Badge variant="outline" className={levelClass(row.contactability_level)}>
                              {row.contactability_level || "C0"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[210px]">
                          <div className="font-mono font-semibold text-sm">{contact.display || contact.value}</div>
                          {contact.normalized && contact.normalized !== contact.value && (
                            <div className="text-[11px] text-muted-foreground font-mono">{contact.normalized}</div>
                          )}
                          {contact.label && <div className="text-xs text-muted-foreground mt-1">{contact.label}</div>}
                        </TableCell>
                        <TableCell className="min-w-[160px]">
                          <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                          {contact.whatsapp_chat_id && (
                            <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate max-w-[160px]">
                              {contact.whatsapp_chat_id}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[160px]">
                          <div className="flex items-center gap-1.5">
                            {contact.send_allowed
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              : <TriangleAlert className="h-4 w-4 text-amber-600" />}
                            <span className="text-xs font-medium">
                              {contact.send_allowed ? "Contact exploitable" : "Lecture uniquement"}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {contact.consent_state || "consentement non renseigné"} · {contact.contactability_level}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs min-w-[160px]">
                          <div>{contact.origin_kind}</div>
                          <div className="text-muted-foreground">{contact.source}</div>
                          {contact.public_business && (
                            <Badge variant="outline" className="mt-1 text-[10px] border-cyan-400 text-cyan-700">
                              <ShieldCheck className="h-3 w-3 mr-1" />Business public
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right min-w-[250px]">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => copy(contact.normalized || contact.value)}>
                              <ClipboardCopy className="h-3.5 w-3.5 mr-1" />Copier
                            </Button>
                            {contact.whatsapp_candidate && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => verify(row, contact)}
                                disabled={verifying === verifyKey}
                              >
                                {verifying === verifyKey
                                  ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                  : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
                                Vérifier WAHA
                              </Button>
                            )}
                            {contact.whatsapp_candidate && (
                              <Button
                                size="sm"
                                onClick={() => openSend(row, contact)}
                                disabled={!contact.send_allowed}
                                title={!contact.send_allowed ? "Contact non autorisé par la Contact Layer" : undefined}
                              >
                                <Send className="h-3.5 w-3.5 mr-1" />Notifier
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }),
                )}

                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Aucun contact exploitable avec ces filtres.
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                      Résolution des contacts et normalisation WhatsApp…
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Lot {Math.floor(page.offset / page.limit) + 1} · {page.source_rows} signal(s) analysé(s) sur ce lot · {stats.contacts} contact(s) résolu(s)
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={loading || page.offset === 0}
                onClick={() => load(Math.max(0, page.offset - page.limit))}
              >
                Précédent
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || !page.has_more}
                onClick={() => load(page.offset + page.limit)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !sending) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Envoyer une notification WhatsApp</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">{selected.row.subject || selected.row.source_label}</div>
                <div className="font-mono text-emerald-700 mt-1">
                  {selected.contact.display || selected.contact.normalized || selected.contact.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selected.row.source_label} · {selected.contact.contactability_level} · {selected.contact.consent_state || "consentement non renseigné"}
                </div>
              </div>
              <Textarea
                rows={6}
                maxLength={3000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Rédigez la notification ou le message à envoyer par WAHA…"
              />
              <div className="text-[11px] text-muted-foreground text-right">{message.length}/3000</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={sending}>Annuler</Button>
            <Button onClick={send} disabled={sending || !message.trim()}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer via WAHA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold mt-1 ${accent || ""}`}>{Number(value || 0).toLocaleString("fr-FR")}</div>
    </div>
  );
}
