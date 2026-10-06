import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWaouhAI } from '@/hooks/useWaouhAI';
import { Progress } from '@/components/ui/progress';
import WaouhContactHubPanel, { type HubContact } from '@/components/admin/WaouhContactHubPanel';
import {
  Loader2, Search, Sparkles, RefreshCw, CheckCircle2, XCircle, StopCircle, Clock,
  MoreHorizontal, Eye, Pencil, Trash2, Power, PowerOff, ShieldCheck, MapPin, ImageIcon, Phone,
  Download, FileSpreadsheet, Archive, ExternalLink, Network, RotateCcw, ClipboardCopy, Send
} from 'lucide-react';

type CleanItemStatus = 'pending' | 'processing' | 'ok' | 'failed' | 'cancelled';
interface CleanItem { id: string; titre: string; status: CleanItemStatus; message?: string }

interface FabricStats {
  total: number;
  internal: number;
  partner: number;
  whatsapp: number;
  radar: number;
  nexus_external: number;
  contactable: number;
  buy: number;
  sell: number;
  sources_with_data: number;
  configured_sources: number;
  source_counts: Record<string, number>;
  family_counts: Record<string, number>;
}

interface DiscoverySource {
  source_key: string;
  label: string;
  family: string;
  connector_mode: string;
  operational_state: string;
  default_contactability: string;
  supports_buy: boolean;
  supports_sell: boolean;
}

interface FabricRow {
  fabric_id: string;
  source_record_id: string;
  source_key: string;
  source_label: string;
  source_family: string;
  operational_state: string;
  intent: string;
  actor_type: string;
  subject: string | null;
  raw_text: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  condition: string | null;
  price_min: number | null;
  price_max: number | null;
  currency: string | null;
  city: string | null;
  contactability_level: string;
  trust_score: number | null;
  observed_at: string | null;
  source_url: string | null;
  evidence: Record<string, any> | null;
  photo_url: string | null;
  has_photo: boolean;
  has_price: boolean;
  has_contact: boolean;
  quality_tier: string;
  completeness: number;
  nexus_managed: boolean;
  catalog_id: string | null;
  verified: boolean;
  is_catalog_mutable: boolean;
  contacts?: HubContact[];
  primary_whatsapp?: string | null;
  contact_count?: number;
  whatsapp_count?: number;
  wa_reachable_count?: number;
}

const EMPTY_STATS: FabricStats = {
  total: 0, internal: 0, partner: 0, whatsapp: 0, radar: 0, nexus_external: 0,
  contactable: 0, buy: 0, sell: 0, sources_with_data: 0, configured_sources: 0,
  source_counts: {}, family_counts: {},
};

const FAMILY_LABELS: Record<string, string> = {
  internal: 'WAOUH interne',
  partner: 'Partenaires',
  messaging: 'Messagerie',
  web: 'Web / Radar',
  social: 'Réseaux sociaux / API',
  maps: 'Cartes / Places',
  field: 'Terrain / Scouts',
  telephony: 'Téléphonie',
  catalog: 'Catalogue',
  directory: 'Annuaires',
  b2b: 'B2B / RFQ',
  external: 'NEXUS / Externe',
};

const stateLabel = (state?: string) => ({
  live: 'Live',
  ingest_only: 'Ingestion',
  disabled: 'Désactivée',
  requires_config: 'À configurer',
  planned: 'Planifiée',
}[String(state || '')] || state || '—');

const intentLabel = (intent?: string) => ({
  SELL: 'Vendeur',
  BUY: 'Acheteur',
  ANNOUNCE: 'Annonce',
  RFQ: 'Demande / RFQ',
}[String(intent || '').toUpperCase()] || intent || '—');

const contactHint = (row: FabricRow) => {
  const ev = row.evidence || {};
  const last4 = ev.contact_last4 || ev.whatsapp_phone_last4 || ev.contact_phone_last4;
  if (last4) return `•••• ${last4}`;
  if (ev.has_whatsapp === true) return 'WhatsApp disponible';
  if (ev.has_contact === true || row.has_contact) return 'Contact disponible';
  return 'Aucun contact exploitable';
};

const sourceStateClass = (state?: string) => {
  if (state === 'live') return 'border-green-500 text-green-700';
  if (state === 'disabled') return 'border-red-400 text-red-700';
  if (state === 'requires_config' || state === 'planned') return 'border-amber-400 text-amber-700';
  return '';
};

const contactClass = (level?: string) => {
  if (['C3', 'C4', 'C5'].includes(String(level))) return 'border-green-500 text-green-700';
  if (['C1', 'C2'].includes(String(level))) return 'border-blue-400 text-blue-700';
  return 'border-slate-300 text-slate-600';
};

export default function AdminWaouhDataControlPage() {
  const { toast } = useToast();
  const ai = useWaouhAI();

  const [stats, setStats] = useState<FabricStats>(EMPTY_STATS);
  const [sources, setSources] = useState<DiscoverySource[]>([]);
  const [results, setResults] = useState<FabricRow[]>([]);
  const [query, setQuery] = useState('');
  const [ville, setVille] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [intentFilter, setIntentFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [sourceStateFilter, setSourceStateFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [cleaning, setCleaning] = useState(false);
  const [cleanItems, setCleanItems] = useState<CleanItem[]>([]);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [batchSize, setBatchSize] = useState(20);
  const cancelRef = useRef(false);

  const [viewing, setViewing] = useState<FabricRow | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [editDraft, setEditDraft] = useState<any>({});
  const [contactVerifying, setContactVerifying] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<{ row: FabricRow; contact: HubContact } | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingContact, setSendingContact] = useState(false);

  const families = useMemo(() => {
    const values = new Set<string>(sources.map(s => s.family).filter(Boolean));
    Object.keys(stats.family_counts || {}).forEach(k => values.add(k));
    return [...values].sort((a, b) => (FAMILY_LABELS[a] || a).localeCompare(FAMILY_LABELS[b] || b, 'fr'));
  }, [sources, stats.family_counts]);

  const visibleSources = useMemo(() => {
    const list = familyFilter === 'all' ? sources : sources.filter(s => s.family === familyFilter);
    const withDataOnly = list.filter(s => (stats.source_counts?.[s.source_key] || 0) > 0);
    const dataKeys = new Set(withDataOnly.map(s => s.source_key));
    const inferred = Object.keys(stats.source_counts || {})
      .filter(k => !dataKeys.has(k))
      .map(k => ({
        source_key: k,
        label: k.replaceAll('_', ' '),
        family: 'external',
        connector_mode: 'unknown',
        operational_state: 'live',
        default_contactability: 'C0',
        supports_buy: true,
        supports_sell: true,
      } as DiscoverySource));
    return [...withDataOnly, ...inferred]
      .filter(s => familyFilter === 'all' || s.family === familyFilter)
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [sources, stats.source_counts, familyFilter]);

  const loadStats = async () => {
    const { data, error } = await supabase.rpc('waouh_admin_signal_fabric_stats' as any);
    if (error) {
      toast({ title: 'Signal Fabric indisponible', description: error.message, variant: 'destructive' });
      return;
    }
    setStats({ ...EMPTY_STATS, ...((data as any) || {}) });
  };

  const loadSources = async () => {
    const { data, error } = await supabase
      .from('waouh_discovery_sources' as any)
      .select('source_key,label,family,connector_mode,operational_state,default_contactability,supports_buy,supports_sell')
      .order('family')
      .order('label');
    if (!error && data) setSources(data as any);
  };

  const search = async () => {
    setSearching(true);
    const { data, error } = await supabase.functions.invoke('waouh-admin-stats', {
      body: {
        action: 'contact_hub_search',
        q: query.trim() || null,
        city: ville.trim() || null,
        family: familyFilter === 'all' ? null : familyFilter,
        source: sourceFilter === 'all' ? null : sourceFilter,
        intent: intentFilter === 'all' ? null : intentFilter,
        contactability: contactFilter === 'all' ? null : contactFilter,
        operational_state: sourceStateFilter === 'all' ? null : sourceStateFilter,
        contacts_only: false,
        whatsapp_only: false,
        limit: 300,
        offset: 0,
      },
    });
    setSearching(false);
    if (error || !data?.ok) {
      toast({
        title: 'Erreur Signal Fabric',
        description: error?.message || data?.error || 'Read-model contacts indisponible',
        variant: 'destructive',
      });
      return;
    }
    setResults(((data?.rows as any) || []) as FabricRow[]);
  };

  const copyContact = async (contact: HubContact) => {
    const value = contact.normalized || contact.value;
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Contact copié', description: value });
    } catch {
      toast({ title: 'Copie impossible', variant: 'destructive' });
    }
  };

  const verifyContact = async (row: FabricRow, contact: HubContact) => {
    const phone = contact.normalized || contact.value;
    const key = `${row.fabric_id}:${phone}`;
    setContactVerifying(key);
    try {
      const { data, error } = await supabase.functions.invoke('waouh-admin-stats', {
        body: { action: 'contact_hub_verify', fabric_id: row.fabric_id, phone },
      });
      if (error || !data?.ok) throw new Error(error?.message || data?.error || 'Vérification WAHA impossible');
      toast({
        title: data.exists ? 'WhatsApp vérifié' : 'Numéro absent de WhatsApp',
        description: data.display || data.normalized || phone,
        variant: data.exists ? 'default' : 'destructive',
      });
      await search();
    } catch (error: any) {
      toast({ title: 'Vérification WAHA échouée', description: error?.message || String(error), variant: 'destructive' });
    } finally {
      setContactVerifying(null);
    }
  };

  const openContactMessage = (row: FabricRow, contact: HubContact) => {
    setMessageTarget({ row, contact });
    setMessageText('');
  };

  const sendContactMessage = async () => {
    if (!messageTarget || !messageText.trim()) return;
    setSendingContact(true);
    try {
      const { row, contact } = messageTarget;
      const { data, error } = await supabase.functions.invoke('waouh-admin-stats', {
        body: {
          action: 'contact_hub_send',
          fabric_id: row.fabric_id,
          phone: contact.normalized || contact.value,
          message: messageText.trim(),
        },
      });
      if (error || !data?.ok) throw new Error(error?.message || data?.error || 'Envoi WhatsApp impossible');
      toast({
        title: data?.queue?.status === 'sent' ? 'Message WhatsApp envoyé' : 'Message WhatsApp mis en file',
        description: `${data.display || data.phone || ''} · ${data?.queue?.status || 'queued'}`,
      });
      setMessageTarget(null);
      setMessageText('');
      await search();
    } catch (error: any) {
      toast({ title: 'Envoi WhatsApp échoué', description: error?.message || String(error), variant: 'destructive' });
    } finally {
      setSendingContact(false);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setVille('');
    setFamilyFilter('all');
    setSourceFilter('all');
    setIntentFilter('all');
    setContactFilter('all');
    setSourceStateFilter('all');
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadSources()]);
      if (mounted) setLoading(false);
      if (mounted) await search();
    })();
    return () => { mounted = false; };
    // Chargement initial seulement ; la recherche est volontairement déclenchée par le bouton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadSources(), search()]);
    setLoading(false);
  };

  const toggleVerified = async (row: FabricRow) => {
    if (!row.catalog_id || !row.is_catalog_mutable) return;
    const { error } = await supabase
      .from('waouh_unified_catalog' as any)
      .update({ verified: !row.verified, qualite_score: !row.verified ? 90 : 70 })
      .eq('id', row.catalog_id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: !row.verified ? '✅ Vérifié' : 'Vérification retirée' });
    await refreshAll();
  };

  const toggleActive = async (row: FabricRow) => {
    if (!row.catalog_id || !row.is_catalog_mutable) return;
    const { error } = await supabase
      .from('waouh_unified_catalog' as any)
      .update({ is_active: false })
      .eq('id', row.catalog_id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: 'Entrée catalogue désactivée', description: 'Le signal disparaît du read-model actif Signal Fabric.' });
    await refreshAll();
  };

  const removeRow = async (row: FabricRow) => {
    if (!row.catalog_id || !row.is_catalog_mutable) return;
    if (!confirm('Supprimer définitivement cette entrée du catalogue historique ?')) return;
    const { error } = await supabase.from('waouh_unified_catalog' as any).delete().eq('id', row.catalog_id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: 'Supprimé' });
    await refreshAll();
  };

  const openEdit = async (row: FabricRow) => {
    if (!row.catalog_id || !row.is_catalog_mutable) return;
    const { data, error } = await supabase
      .from('waouh_unified_catalog' as any)
      .select('id,titre,description,categorie,ville,quartier,prix_min,prix_max,vendeur_nom,vendeur_phone,vendeur_whatsapp')
      .eq('id', row.catalog_id)
      .maybeSingle();
    if (error || !data) {
      toast({ title: 'Impossible de charger cette entrée', description: error?.message || 'Entrée introuvable', variant: 'destructive' });
      return;
    }
    setEditing(data as any);
    setEditDraft({ ...(data as any) });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const patch: any = {
      titre: editDraft.titre || null,
      description: editDraft.description || null,
      categorie: editDraft.categorie || null,
      ville: editDraft.ville || null,
      quartier: editDraft.quartier || null,
      vendeur_nom: editDraft.vendeur_nom || null,
      vendeur_phone: editDraft.vendeur_phone || null,
      vendeur_whatsapp: editDraft.vendeur_whatsapp || null,
      prix_min: editDraft.prix_min === '' ? null : Number(editDraft.prix_min),
      prix_max: editDraft.prix_max === '' ? null : Number(editDraft.prix_max),
    };
    const { error } = await supabase.from('waouh_unified_catalog' as any).update(patch).eq('id', editing.id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: '✅ Mis à jour' });
    setEditing(null);
    await refreshAll();
  };

  const exportRows = (kind: 'xlsx' | 'csv') => {
    if (!results.length) {
      toast({ title: 'Rien à exporter', variant: 'destructive' });
      return;
    }
    const flat = results.map(r => ({
      fabric_id: r.fabric_id,
      nexus: r.nexus_managed,
      famille: FAMILY_LABELS[r.source_family] || r.source_family,
      source: r.source_label,
      source_key: r.source_key,
      intention: r.intent,
      sujet: r.subject,
      categorie: r.category,
      ville: r.city,
      prix_min: r.price_min,
      prix_max: r.price_max,
      devise: r.currency,
      contactabilite: r.contactability_level,
      contact_disponible: r.has_contact,
      contacts_complets: (r.contacts || []).map(c => `${c.channel}: ${c.display || c.value}`).join(' | '),
      whatsapp_normalises: (r.contacts || []).filter(c => c.whatsapp_candidate && c.normalized).map(c => c.normalized).join(' | '),
      whatsapp_principal: r.primary_whatsapp || null,
      whatsapp_verifies: (r.contacts || []).filter(c => c.whatsapp_reachable === true).map(c => c.normalized || c.value).join(' | '),
      contacts_envoi_autorise: (r.contacts || []).filter(c => c.send_allowed).map(c => c.normalized || c.value).join(' | '),
      qualite: r.quality_tier,
      completude: r.completeness,
      confiance: r.trust_score,
      observe_le: r.observed_at,
      url_source: r.source_url,
    }));
    const ws = XLSX.utils.json_to_sheet(flat);
    if (kind === 'xlsx') {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Signal Fabric');
      const fname = `waouh-signal-fabric-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fname);
      toast({ title: '✅ Excel téléchargé', description: fname });
      return;
    }
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waouh-signal-fabric-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '✅ CSV téléchargé' });
  };

  const syncWaha = async () => {
    try {
      toast({ title: 'Synchronisation WAHA + contacts centralisés en cours…' });
      const { data: waha, error: wahaError } = await supabase.functions.invoke('waouh-waha-sync-contacts', {
        body: { backfill: true, maxSessions: 3, maxContactsPerSession: 1000 },
      });
      if (wahaError) throw wahaError;

      let offset = 0;
      let pages = 0;
      let persisted = 0;
      let reachable = 0;
      let failed = 0;
      let processedRows = 0;

      while (pages < 40) {
        const { data: batch, error: batchError } = await supabase.functions.invoke('waouh-admin-stats', {
          body: { action: 'contact_hub_backfill', limit: 50, offset },
        });
        if (batchError || !batch?.ok) {
          throw new Error(batchError?.message || batch?.error || 'Backfill canonique indisponible');
        }
        persisted += Number(batch.persisted || 0);
        reachable += Number(batch.reachable || 0);
        failed += Number(batch.failed || 0);
        processedRows += Number(batch.processed_rows || 0);
        pages += 1;
        if (!batch?.page?.has_more || batch?.page?.next_offset == null) break;
        offset = Number(batch.page.next_offset);
      }

      toast({
        title: failed > 0 || waha?.warning
          ? '⚠️ Synchronisation terminée avec avertissement'
          : '✅ WAHA + contacts centralisés synchronisés',
        description: [
          waha?.warning || `${waha?.mapped ?? 0} contact(s) WAHA mappé(s)`,
          `${processedRows} signal(s) analysé(s)`,
          `${persisted} contact(s) canonique(s)`,
          `${reachable} WhatsApp reconnu(s)`,
          failed ? `${failed} échec(s)` : null,
        ].filter(Boolean).join(' · '),
      });
      await refreshAll();
    } catch (e: any) {
      toast({ title: 'Erreur synchro contacts / WAHA', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const backupCatalog = async () => {
    try {
      toast({ title: 'Backup en cours…' });
      const { data, error } = await supabase.functions.invoke('waouh-catalog-backup', { body: { trigger: 'manual' } });
      if (error) throw error;
      toast({ title: '✅ Backup créé', description: `${data?.rows_count ?? 0} lignes archivées · ${data?.path || ''}` });
    } catch (e: any) {
      toast({ title: 'Erreur backup', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  // === Nettoyage IA : reste volontairement limité au catalogue historique éditable. ===
  const updateItem = (id: string, patch: Partial<CleanItem>) =>
    setCleanItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  const cancelCleaning = () => { cancelRef.current = true; };

  const cleanWithAI = async () => {
    cancelRef.current = false;
    setCleaning(true);
    setCleanProgress(0);
    setCleanItems([]);
    const { data: entries } = await supabase
      .from('waouh_unified_catalog' as any)
      .select('id,titre,description,categorie,ville,source,qualite_score')
      .eq('verified', false)
      .order('qualite_score', { ascending: true })
      .limit(batchSize);
    if (!entries?.length) {
      setCleaning(false);
      toast({ title: 'Rien à nettoyer' });
      return;
    }

    const initial: CleanItem[] = (entries as any[]).map(e => ({ id: e.id, titre: e.titre || '(sans titre)', status: 'pending' }));
    setCleanItems(initial);

    let ok = 0, failed = 0, cancelled = 0;
    const total = entries.length;
    for (let i = 0; i < total; i++) {
      if (cancelRef.current) {
        for (let j = i; j < total; j++) updateItem((entries as any[])[j].id, { status: 'cancelled' });
        cancelled = total - i;
        break;
      }
      const e = (entries as any[])[i];
      updateItem(e.id, { status: 'processing' });
      try {
        const r = await ai.run<any>('clean_catalog_entry', {
          entry: { titre: e.titre, description: e.description, categorie: e.categorie, ville: e.ville },
        });
        if (r?.titre) {
          await supabase.from('waouh_unified_catalog' as any).update({
            titre: r.titre,
            categorie: r.categorie || e.categorie,
            sous_categorie: r.sous_categorie || null,
            tags: r.tags || null,
            qualite_score: Math.max(e.qualite_score || 0, r.qualite_score || 0),
          }).eq('id', e.id);
          ok++;
          updateItem(e.id, { status: 'ok', titre: r.titre, message: `Score: ${r.qualite_score || '?'}` });
        } else {
          failed++;
          updateItem(e.id, { status: 'failed', message: 'Réponse IA invalide' });
        }
      } catch (err: any) {
        failed++;
        updateItem(e.id, { status: 'failed', message: err?.message || 'Erreur' });
      }
      setCleanProgress(Math.round(((i + 1) / total) * 100));
    }
    setCleaning(false);
    toast({
      title: cancelRef.current ? 'Nettoyage annulé' : '✅ Nettoyage terminé',
      description: `${ok} OK · ${failed} échecs${cancelled ? ` · ${cancelled} annulés` : ''}`,
    });
    await refreshAll();
  };

  const statusMeta: Record<CleanItemStatus, { label: string; icon: any; cls: string }> = {
    pending: { label: 'En attente', icon: Clock, cls: 'text-muted-foreground' },
    processing: { label: 'En cours', icon: Loader2, cls: 'text-blue-600 animate-spin' },
    ok: { label: 'OK', icon: CheckCircle2, cls: 'text-green-600' },
    failed: { label: 'Échec', icon: XCircle, cls: 'text-red-600' },
    cancelled: { label: 'Annulé', icon: StopCircle, cls: 'text-amber-600' },
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contrôle NEXUS · Signal Fabric</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue canonique des annonces, vendeurs, acheteurs et signaux collectés par WAOUH, NEXUS et les connecteurs externes.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard label="Signal Fabric" value={stats.total} sub={`${stats.sources_with_data}/${stats.configured_sources} sources`} />
        <StatCard label="WAOUH interne" value={stats.internal} color="text-blue-700" />
        <StatCard label="Partner" value={stats.partner} color="text-emerald-700" />
        <StatCard label="WhatsApp" value={stats.whatsapp} color="text-green-700" />
        <StatCard label="Radar IA" value={stats.radar} color="text-amber-700" />
        <StatCard label="NEXUS externe" value={stats.nexus_external} color="text-violet-700" />
        <StatCard label="Contactables C1+" value={stats.contactable} color="text-cyan-700" />
      </div>

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search"><Search className="h-4 w-4 mr-1" />Signal Fabric</TabsTrigger>
          <TabsTrigger value="contacts"><Phone className="h-4 w-4 mr-1" />Contacts WhatsApp</TabsTrigger>
          <TabsTrigger value="sources"><Network className="h-4 w-4 mr-1" />Sources</TabsTrigger>
          <TabsTrigger value="clean"><Sparkles className="h-4 w-4 mr-1" />Nettoyage IA</TabsTrigger>
          <TabsTrigger value="restore"><RefreshCw className="h-4 w-4 mr-1" />Restauration</TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Catalogue NEXUS / Signal Fabric — Annonces · Vendeurs · Acheteurs</CardTitle>
              <CardDescription>
                Toutes les sources passent par le même read-model : WAOUH, Partner, WhatsApp, Radar IA, Apify, SerpAPI,
                réseaux sociaux, Maps, Scouts et autres connecteurs. NEXUS orchestre les sources externes sans les masquer sous « Radar ».
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                <Input placeholder="Produit, vendeur, besoin, marque…" value={query} onChange={e => setQuery(e.target.value)} />
                <Input placeholder="Ville" value={ville} onChange={e => setVille(e.target.value)} />
                <select className="border rounded px-3 h-10 text-sm bg-background" value={familyFilter} onChange={e => {
                  setFamilyFilter(e.target.value);
                  setSourceFilter('all');
                }}>
                  <option value="all">Toutes familles</option>
                  {families.map(f => <option key={f} value={f}>{FAMILY_LABELS[f] || f} ({stats.family_counts?.[f] || 0})</option>)}
                </select>
                <select className="border rounded px-3 h-10 text-sm bg-background" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                  <option value="all">Toutes sources</option>
                  {visibleSources.map(s => (
                    <option key={s.source_key} value={s.source_key}>
                      {s.label} ({stats.source_counts?.[s.source_key] || 0})
                    </option>
                  ))}
                </select>
                <select className="border rounded px-3 h-10 text-sm bg-background" value={intentFilter} onChange={e => setIntentFilter(e.target.value)}>
                  <option value="all">Toutes intentions</option>
                  <option value="SELL">Vendeurs</option>
                  <option value="BUY">Acheteurs</option>
                  <option value="ANNOUNCE">Annonces</option>
                  <option value="RFQ">Demandes / RFQ</option>
                </select>
                <select className="border rounded px-3 h-10 text-sm bg-background" value={contactFilter} onChange={e => setContactFilter(e.target.value)}>
                  <option value="all">Toute contactabilité</option>
                  <option value="contactable">Contactables C1+</option>
                  <option value="C0">C0 · veille uniquement</option>
                  <option value="C1">C1 · contact public limité</option>
                  <option value="C2">C2 · canal WAOUH</option>
                  <option value="C3">C3 · consenti</option>
                  <option value="C4">C4 · partenaire</option>
                </select>
                <select className="border rounded px-3 h-10 text-sm bg-background" value={sourceStateFilter} onChange={e => setSourceStateFilter(e.target.value)}>
                  <option value="all">Tous états source</option>
                  <option value="live">Live</option>
                  <option value="ingest_only">Ingestion seulement</option>
                  <option value="requires_config">À configurer</option>
                  <option value="disabled">Désactivée</option>
                  <option value="planned">Planifiée</option>
                </select>
                <div className="flex gap-2">
                  <Button onClick={search} disabled={searching} className="flex-1">
                    {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Rechercher
                  </Button>
                  <Button variant="outline" size="icon" onClick={resetFilters} title="Réinitialiser les filtres">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={syncWaha}>
                  <RefreshCw className="h-4 w-4 mr-2" />Synchroniser contacts WAHA
                </Button>
                <Button variant="outline" onClick={() => exportRows('xlsx')}>
                  <Download className="h-4 w-4 mr-2" />Télécharger Excel
                </Button>
                <Button variant="outline" onClick={() => exportRows('csv')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />CSV pour Google Sheets
                </Button>
                <Button variant="outline" onClick={backupCatalog}>
                  <Archive className="h-4 w-4 mr-2" />Backup catalogue historique
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{results.length} résultat{results.length > 1 ? 's' : ''} · max 300</span>
                <span>{stats.buy} intentions d'achat · {stats.sell} offres / annonces</span>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Photo</TableHead>
                      <TableHead>Provenance</TableHead>
                      <TableHead>Intention</TableHead>
                      <TableHead>Sujet / qualité</TableHead>
                      <TableHead>Acteur</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Lieu / Prix</TableHead>
                      <TableHead>Confiance</TableHead>
                      <TableHead>Observé</TableHead>
                      <TableHead>État source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map(r => (
                      <TableRow key={r.fabric_id}>
                        <TableCell>
                          {r.photo_url ? (
                            <img src={r.photo_url} alt="" className="h-12 w-12 rounded object-cover border" loading="lazy" />
                          ) : (
                            <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 min-w-[150px]">
                            <div className="flex flex-wrap gap-1">
                              {r.nexus_managed && <Badge className="w-fit bg-violet-600">NEXUS</Badge>}
                              <Badge variant="outline" className="w-fit">{r.source_label}</Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground">{FAMILY_LABELS[r.source_family] || r.source_family}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{r.source_key}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={['BUY', 'RFQ'].includes(String(r.intent).toUpperCase()) ? 'secondary' : 'default'}>
                            {intentLabel(r.intent)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="font-medium truncate">{r.subject || '(sans titre)'}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.category || '—'}</div>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px]">Qualité {r.quality_tier}</Badge>
                            <Badge variant="outline" className="text-[10px]">{r.completeness}% complet</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{r.actor_type || '—'}</div>
                          {r.verified && <Badge variant="outline" className="mt-1 border-green-500 text-green-700 text-[10px]">✓ Vérifié</Badge>}
                        </TableCell>
                        <TableCell className="text-xs min-w-[280px] max-w-[360px]">
                          <div className="flex flex-wrap items-center gap-1 mb-1.5">
                            <Badge variant="outline" className={contactClass(r.contactability_level)}>
                              {r.contactability_level || 'C0'}
                            </Badge>
                            {(r.whatsapp_count || 0) > 0 && (
                              <Badge variant="outline" className="border-emerald-400 text-emerald-700">
                                {r.whatsapp_count} WhatsApp
                              </Badge>
                            )}
                            {(r.wa_reachable_count || 0) > 0 && (
                              <Badge variant="outline" className="border-green-500 text-green-700">
                                {r.wa_reachable_count} vérifié
                              </Badge>
                            )}
                          </div>
                          {(r.contacts || []).length > 0 ? (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {(r.contacts || []).map((contact, index) => {
                                const phone = contact.normalized || contact.value;
                                const verifyKey = `${r.fabric_id}:${phone}`;
                                return (
                                  <div
                                    key={`${r.fabric_id}:${contact.channel}:${phone}:${index}`}
                                    className="rounded border bg-background/70 px-2 py-1.5"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="font-mono font-semibold break-all">{contact.display || contact.value}</div>
                                        {contact.normalized && contact.normalized !== contact.value && (
                                          <div className="font-mono text-[10px] text-muted-foreground">{contact.normalized}</div>
                                        )}
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                          {contact.channel} · {contact.source}
                                          {contact.consent_state ? ` · ${contact.consent_state}` : ''}
                                        </div>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={
                                          contact.whatsapp_reachable === true
                                            ? 'border-emerald-500 text-emerald-700'
                                            : contact.whatsapp_reachable === false
                                              ? 'border-red-400 text-red-700'
                                              : contact.whatsapp_candidate
                                                ? 'border-amber-400 text-amber-700'
                                                : 'border-slate-300 text-slate-600'
                                        }
                                      >
                                        {contact.whatsapp_reachable === true
                                          ? 'WA ✓'
                                          : contact.whatsapp_reachable === false
                                            ? 'WA ✕'
                                            : contact.whatsapp_candidate
                                              ? 'WA ?'
                                              : contact.channel}
                                      </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => copyContact(contact)}>
                                        <ClipboardCopy className="h-3 w-3 mr-1" />Copier
                                      </Button>
                                      {contact.whatsapp_candidate && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2 text-[10px]"
                                          onClick={() => verifyContact(r, contact)}
                                          disabled={contactVerifying === verifyKey}
                                        >
                                          {contactVerifying === verifyKey
                                            ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            : <ShieldCheck className="h-3 w-3 mr-1" />}
                                          Vérifier WAHA
                                        </Button>
                                      )}
                                      {contact.whatsapp_candidate && (
                                        <Button
                                          size="sm"
                                          className="h-7 px-2 text-[10px]"
                                          onClick={() => openContactMessage(r, contact)}
                                          disabled={!contact.send_allowed}
                                          title={!contact.send_allowed ? 'Lecture uniquement : contact non autorisé par la Contact Layer' : undefined}
                                        >
                                          <Send className="h-3 w-3 mr-1" />Notifier
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mt-1 text-muted-foreground">{contactHint(r)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs min-w-[130px]">
                          <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city || '—'}</div>
                          <div className="font-medium text-emerald-700 mt-1">
                            {r.price_min
                              ? `${Number(r.price_min).toLocaleString('fr-FR')}${r.price_max && r.price_max !== r.price_min ? `–${Number(r.price_max).toLocaleString('fr-FR')}` : ''} ${r.currency || 'XOF'}`
                              : 'Prix à confirmer'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold">{Math.round(Number(r.trust_score || 0))}/100</div>
                          <Progress value={Number(r.trust_score || 0)} className="h-1.5 w-20 mt-1" />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.observed_at ? new Date(r.observed_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sourceStateClass(r.operational_state)}>{stateLabel(r.operational_state)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewing(r)}><Eye className="h-4 w-4 mr-2" />Voir détails</DropdownMenuItem>
                              {r.source_url && (
                                <DropdownMenuItem onClick={() => window.open(r.source_url!, '_blank', 'noopener,noreferrer')}>
                                  <ExternalLink className="h-4 w-4 mr-2" />Ouvrir la source
                                </DropdownMenuItem>
                              )}
                              {r.is_catalog_mutable && r.catalog_id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="h-4 w-4 mr-2" />Modifier le catalogue</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleVerified(r)}>
                                    <ShieldCheck className="h-4 w-4 mr-2" />{r.verified ? 'Retirer vérification' : 'Vérifier'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleActive(r)}>
                                    <PowerOff className="h-4 w-4 mr-2" />Désactiver
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => removeRow(r)}>
                                    <Trash2 className="h-4 w-4 mr-2" />Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {results.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                          {loading || searching ? 'Chargement du Signal Fabric…' : 'Aucun résultat — ajustez les filtres'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <WaouhContactHubPanel />
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Registre des sources NEXUS</CardTitle>
              <CardDescription>
                Les sources configurées restent distinctes de Signal Fabric : une source peut être Live sans avoir encore produit de signal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Famille</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>État</TableHead>
                      <TableHead>C par défaut</TableHead>
                      <TableHead>BUY</TableHead>
                      <TableHead>SELL</TableHead>
                      <TableHead>Signaux</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map(s => (
                      <TableRow key={s.source_key}>
                        <TableCell>
                          <div className="font-medium">{s.label}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{s.source_key}</div>
                        </TableCell>
                        <TableCell>{FAMILY_LABELS[s.family] || s.family}</TableCell>
                        <TableCell className="text-xs">{s.connector_mode}</TableCell>
                        <TableCell><Badge variant="outline" className={sourceStateClass(s.operational_state)}>{stateLabel(s.operational_state)}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={contactClass(s.default_contactability)}>{s.default_contactability}</Badge></TableCell>
                        <TableCell>{s.supports_buy ? '✓' : '—'}</TableCell>
                        <TableCell>{s.supports_sell ? '✓' : '—'}</TableCell>
                        <TableCell className="font-semibold">{stats.source_counts?.[s.source_key] || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clean">
          <Card>
            <CardHeader>
              <CardTitle>Nettoyage intelligent du catalogue historique</CardTitle>
              <CardDescription>
                Cette opération édite uniquement <code>waouh_unified_catalog</code>. Les signaux NEXUS/Signal Fabric restent des données de provenance en lecture seule.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-sm text-muted-foreground">Taille du lot :</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={batchSize}
                  onChange={e => setBatchSize(Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
                  disabled={cleaning}
                  className="w-24"
                />
                <Button onClick={cleanWithAI} disabled={cleaning} size="lg">
                  {cleaning ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Lancer le nettoyage IA ({batchSize})
                </Button>
                {cleaning && (
                  <Button onClick={cancelCleaning} variant="destructive" size="lg">
                    <StopCircle className="h-4 w-4 mr-2" />Annuler
                  </Button>
                )}
              </div>

              {(cleaning || cleanItems.length > 0) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progression</span>
                    <span className="font-mono">{cleanProgress}%</span>
                  </div>
                  <Progress value={cleanProgress} />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>✅ {cleanItems.filter(i => i.status === 'ok').length} OK</span>
                    <span>❌ {cleanItems.filter(i => i.status === 'failed').length} échecs</span>
                    <span>⏸ {cleanItems.filter(i => i.status === 'cancelled').length} annulés</span>
                    <span>⏳ {cleanItems.filter(i => i.status === 'pending' || i.status === 'processing').length} restants</span>
                  </div>
                </div>
              )}

              {cleanItems.length > 0 && (
                <div className="border rounded-md max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Statut</TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead>Détails</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cleanItems.map(it => {
                        const m = statusMeta[it.status];
                        const Icon = m.icon;
                        return (
                          <TableRow key={it.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${m.cls}`} />
                                <span className="text-xs">{m.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-md truncate text-sm">{it.titre}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{it.message || '—'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restore">
          <Card>
            <CardHeader>
              <CardTitle>Restauration et synchronisation</CardTitle>
              <CardDescription>
                Le Signal Fabric est un read-model : on restaure chaque source autoritative (WAOUH, Partner, WhatsApp, Radar, connecteur NEXUS),
                puis la vue canonique se reconstruit automatiquement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={refreshAll}><RefreshCw className="h-4 w-4 mr-2" />Recalculer Signal Fabric</Button>
              <p className="text-sm text-muted-foreground">
                Pour un re-backfill, utilisez le connecteur de la source concernée. Les signaux externes ne doivent pas être copiés manuellement dans le catalogue historique.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.subject || 'Détails du signal'}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              {viewing.photo_url && <img src={viewing.photo_url} alt="" className="w-full max-h-72 object-contain rounded border bg-muted" />}
              <div className="flex flex-wrap gap-2">
                {viewing.nexus_managed && <Badge className="bg-violet-600">NEXUS externe</Badge>}
                <Badge variant="outline">{viewing.source_label}</Badge>
                <Badge variant="outline">{FAMILY_LABELS[viewing.source_family] || viewing.source_family}</Badge>
                <Badge variant="outline">{intentLabel(viewing.intent)}</Badge>
                <Badge variant="outline" className={contactClass(viewing.contactability_level)}>{viewing.contactability_level}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Fabric ID"><span className="font-mono text-xs break-all">{viewing.fabric_id}</span></Field>
                <Field label="Source key">{viewing.source_key}</Field>
                <Field label="État source">{stateLabel(viewing.operational_state)}</Field>
                <Field label="Acteur">{viewing.actor_type || '—'}</Field>
                <Field label="Catégorie">{viewing.category || '—'}</Field>
                <Field label="Ville">{viewing.city || '—'}</Field>
                <Field label="Prix">{viewing.price_min ? `${Number(viewing.price_min).toLocaleString('fr-FR')} ${viewing.currency || 'XOF'}` : 'À confirmer'}</Field>
                <Field label="Confiance">{Math.round(Number(viewing.trust_score || 0))}/100</Field>
                <Field label="Qualité">{viewing.quality_tier} · {viewing.completeness}%</Field>
                <Field label="Contacts">
                  {(viewing.contacts || []).length > 0 ? (
                    <div className="space-y-1">
                      {(viewing.contacts || []).map((contact, index) => (
                        <div key={`${contact.channel}:${contact.normalized || contact.value}:${index}`}>
                          <span className="font-mono">{contact.display || contact.value}</span>
                          <span className="text-xs text-muted-foreground"> · {contact.channel}</span>
                        </div>
                      ))}
                    </div>
                  ) : contactHint(viewing)}
                </Field>
                <Field label="Observé">{viewing.observed_at ? new Date(viewing.observed_at).toLocaleString('fr-FR') : '—'}</Field>
                <Field label="Catalogue éditable">{viewing.is_catalog_mutable ? 'Oui' : 'Non · source autoritative'}</Field>
              </div>
              {viewing.raw_text && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Contenu / preuve textuelle</div>
                  <p className="whitespace-pre-wrap">{viewing.raw_text}</p>
                </div>
              )}
              {viewing.source_url && (
                <Button variant="outline" onClick={() => window.open(viewing.source_url!, '_blank', 'noopener,noreferrer')}>
                  <ExternalLink className="h-4 w-4 mr-2" />Ouvrir la source publique
                </Button>
              )}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Evidence Signal Fabric</div>
                <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-56">{JSON.stringify(viewing.evidence || {}, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!messageTarget} onOpenChange={(open) => !open && setMessageTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Envoyer un message WhatsApp</DialogTitle>
          </DialogHeader>
          {messageTarget && (
            <div className="space-y-3">
              <div className="rounded border bg-muted/40 p-3 text-sm">
                <div className="font-medium">{messageTarget.row.subject || 'Signal WAOUH'}</div>
                <div className="font-mono text-xs mt-1">
                  {messageTarget.contact.display || messageTarget.contact.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {messageTarget.contact.source} · {messageTarget.contact.contactability_level}
                  {messageTarget.contact.consent_state ? ` · ${messageTarget.contact.consent_state}` : ''}
                </div>
              </div>
              <LField label="Message">
                <Textarea
                  rows={5}
                  maxLength={3000}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Votre message…"
                />
              </LField>
              <div className="text-[11px] text-muted-foreground">
                WAOUH vérifie le numéro via WAHA avant l’envoi, respecte l’opt-out et trace le résultat dans la file outbound.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageTarget(null)} disabled={sendingContact}>Annuler</Button>
            <Button onClick={sendContactMessage} disabled={sendingContact || !messageText.trim()}>
              {sendingContact ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer sur WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier l'entrée du catalogue historique</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <LField label="Titre"><Input value={editDraft.titre || ''} onChange={e => setEditDraft({ ...editDraft, titre: e.target.value })} /></LField>
            <LField label="Description"><Textarea rows={3} value={editDraft.description || ''} onChange={e => setEditDraft({ ...editDraft, description: e.target.value })} /></LField>
            <div className="grid grid-cols-2 gap-3">
              <LField label="Catégorie"><Input value={editDraft.categorie || ''} onChange={e => setEditDraft({ ...editDraft, categorie: e.target.value })} /></LField>
              <LField label="Ville"><Input value={editDraft.ville || ''} onChange={e => setEditDraft({ ...editDraft, ville: e.target.value })} /></LField>
              <LField label="Quartier"><Input value={editDraft.quartier || ''} onChange={e => setEditDraft({ ...editDraft, quartier: e.target.value })} /></LField>
              <LField label="Vendeur"><Input value={editDraft.vendeur_nom || ''} onChange={e => setEditDraft({ ...editDraft, vendeur_nom: e.target.value })} /></LField>
              <LField label="Prix min"><Input type="number" value={editDraft.prix_min ?? ''} onChange={e => setEditDraft({ ...editDraft, prix_min: e.target.value })} /></LField>
              <LField label="Prix max"><Input type="number" value={editDraft.prix_max ?? ''} onChange={e => setEditDraft({ ...editDraft, prix_max: e.target.value })} /></LField>
              <LField label="Téléphone"><Input value={editDraft.vendeur_phone || ''} onChange={e => setEditDraft({ ...editDraft, vendeur_phone: e.target.value })} /></LField>
              <LField label="WhatsApp"><Input value={editDraft.vendeur_whatsapp || ''} onChange={e => setEditDraft({ ...editDraft, vendeur_whatsapp: e.target.value })} /></LField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={saveEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

function LField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: number; color?: string; sub?: string }) {
  return (
    <Card><CardContent className="pt-5 pb-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color || ''}`}>{Number(value || 0).toLocaleString('fr-FR')}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
    </CardContent></Card>
  );
}
