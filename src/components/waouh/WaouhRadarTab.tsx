import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, RefreshCw, Radar, Users, Activity, Trash2, ArrowUpRight, Target, ShieldCheck, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import RadarApiConfigPanel from "./RadarApiConfigPanel";
import RadarAutoControlPanel from "@/components/admin/RadarAutoControlPanel";
import { syncNexusSource, type NexusSourceSyncProvider } from "@/lib/waouh/nexus";

type Source = { id: string; type: string; identifier: string; label: string | null; active: boolean; scan_freq_min: number; last_scan_at: string | null; last_signal_count: number };
type Signal = { id: string; source_type: string; intent: string; product: any; price: number | null; city: string | null; contact_phone: string | null; contact_handle: string | null; confidence: number; status: string; captured_at: string; raw_url: string | null; raw_text: string | null; raw_payload?: any; promoted_article_id: string | null; promoted_buyer_profile_id: string | null };
type Profile = { id: string; contact_phone: string; display_name: string | null; role: string; categories: string[]; cities: string[]; signals_count: number; reliability_score: number; last_seen_at: string | null };
type ContactabilityLevel = "C0" | "C1" | "C2" | "C3" | "C4";
type DiscoverySourcePolicy = {
  source_key: string;
  label: string;
  family: string;
  connector_mode?: string;
  operational_state: string;
  supports_contact: boolean;
  default_contactability: ContactabilityLevel;
  max_contactability: ContactabilityLevel;
  allowed_levels: ContactabilityLevel[];
  capabilities?: Record<string, unknown>;
  updated_at?: string | null;
};
const CONTACT_LEVELS: ContactabilityLevel[] = ["C0", "C1", "C2", "C3", "C4"];
const CONTACT_RULES: Record<ContactabilityLevel, string> = {
  C0: "Découverte uniquement · aucun contact révélé",
  C1: "Contact professionnel public · pas d’outreach automatique",
  C2: "Blind matching / privé · approbation requise",
  C3: "Opt-in commercial · consentement requis",
  C4: "Agent ↔ Agent / partenaire WAOUH",
};

const fmtPrice = (n: number | null) => n ? new Intl.NumberFormat("fr-FR").format(n) + " FCFA" : "—";

const signalPhoto = (signal: Signal) => {
  const candidates = [
    ...(Array.isArray(signal.product?.photos) ? signal.product.photos : []),
    signal.product?.image_url,
    signal.product?.photo,
    signal.raw_payload?.full_picture,
    signal.raw_payload?.image,
    signal.raw_payload?.thumbnail,
    ...(Array.isArray(signal.raw_payload?.images) ? signal.raw_payload.images : []),
  ];
  for (const value of candidates) {
    const url = typeof value === "string" ? value : value?.url || value?.src;
    if (typeof url === "string" && /^https?:\/\//i.test(url)) return url;
  }
  return null;
};

export default function WaouhRadarTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("radarTab");
  const initialTab = ["signals", "sources", "profiles", "contact"].includes(requestedTab || "") ? requestedTab! : "signals";
  const [tab, setTab] = useState(initialTab);
  const [sources, setSources] = useState<Source[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [contactPolicies, setContactPolicies] = useState<DiscoverySourcePolicy[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactBusy, setContactBusy] = useState<string | null>(null);
  const [newSrc, setNewSrc] = useState({
    type: "fb_marketplace",
    identifier: "",
    label: "",
    scan_freq_min: 60,
    actor_input_json: "",
  });

  const load = async () => {
    setLoading(true);
    const [s1, s2, s3] = await Promise.all([
      supabase.from("waouh_radar_sources").select("*").order("created_at", { ascending: false }),
      supabase.from("waouh_radar_signals").select("*").order("captured_at", { ascending: false }).limit(100),
      supabase.from("waouh_radar_profiles").select("*").order("signals_count", { ascending: false }).limit(50),
    ]);
    setSources((s1.data as any) || []);
    setSignals((s2.data as any) || []);
    setProfiles((s3.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const requested = searchParams.get("radarTab");
    if (requested && ["signals", "sources", "profiles", "contact"].includes(requested) && requested !== tab) {
      setTab(requested);
    }
  }, [searchParams]);

  const loadContactPolicies = async () => {
    setContactLoading(true);
    const { data, error } = await supabase.functions.invoke("waouh-radar-api-config", {
      body: { action: "contact_policy_list" },
    });
    setContactLoading(false);
    if (error || !data?.ok) {
      toast.error(data?.error || error?.message || "Impossible de charger Contact Layer C0–C4");
      return;
    }
    setContactPolicies((data.policies || []) as DiscoverySourcePolicy[]);
  };

  const updateContactPolicy = async (sourceKey: string, level: ContactabilityLevel) => {
    setContactBusy(sourceKey);
    const { data, error } = await supabase.functions.invoke("waouh-radar-api-config", {
      body: { action: "contact_policy_update", source_key: sourceKey, default_contactability: level },
    });
    setContactBusy(null);
    if (error || !data?.ok) {
      toast.error(data?.error || error?.message || "Mise à jour Contact Layer impossible");
      return;
    }
    const policy = data.policy as DiscoverySourcePolicy;
    setContactPolicies((current) => current.map((item) => item.source_key === sourceKey ? policy : item));
    toast.success(`${policy.label} : niveau ${policy.default_contactability} appliqué`);
  };

  useEffect(() => {
    if (tab === "contact" && contactPolicies.length === 0 && !contactLoading) void loadContactPolicies();
  }, [tab]);

  useEffect(() => {
    const ch = supabase.channel(`radar_signals_live_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "waouh_radar_signals" }, (p) => {
        setSignals((prev) => [p.new as Signal, ...prev].slice(0, 100));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const addSource = async () => {
    if (!newSrc.identifier) return toast.error("Identifiant requis");
    let config: Record<string, unknown> = {};
    if (newSrc.type === "apify_actor" && newSrc.actor_input_json.trim()) {
      try {
        const parsed = JSON.parse(newSrc.actor_input_json);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return toast.error("L'input Apify doit être un objet JSON.");
        }
        config = { actor_id: newSrc.identifier.trim(), input: parsed };
      } catch {
        return toast.error("JSON Apify invalide.");
      }
    } else if (newSrc.type === "apify_actor") {
      config = { actor_id: newSrc.identifier.trim(), input: {} };
    }
    const payload = {
      type: newSrc.type,
      identifier: newSrc.identifier.trim(),
      label: newSrc.label.trim() || null,
      scan_freq_min: newSrc.scan_freq_min,
      config,
    };
    const { error } = await supabase.from("waouh_radar_sources").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Source NEXUS ajoutée");
      setNewSrc({ type: "fb_marketplace", identifier: "", label: "", scan_freq_min: 60, actor_input_json: "" });
      load();
    }
  };

  const toggleSource = async (id: string, active: boolean) => {
    await supabase.from("waouh_radar_sources").update({ active }).eq("id", id);
    load();
  };

  const updateSourceFrequency = async (id: string, minutes: number) => {
    const scan_freq_min = Math.max(5, Math.min(1440, Math.round(minutes || 60)));
    const { error } = await supabase.from("waouh_radar_sources").update({ scan_freq_min }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setSources((prev) => prev.map((item) => item.id === id ? { ...item, scan_freq_min } : item));
      toast.success("Fréquence mise à jour");
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Supprimer cette source ?")) return;
    await supabase.from("waouh_radar_sources").delete().eq("id", id);
    load();
  };

  const triggerScan = async (fn: string) => {
    toast.loading(`Lancement ${fn}…`, { id: fn });
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    toast.dismiss(fn);
    if (error) toast.error(error.message);
    else toast.success(`OK : ${JSON.stringify(data).slice(0, 80)}`);
    load();
  };

  const providerForSource = (type: string): NexusSourceSyncProvider | null => {
    if (["fb_marketplace", "fb_group", "apify_actor"].includes(type)) return "apify";
    if (type === "fb_page") return "facebook_business";
    if (type === "instagram_business") return "instagram_business";
    if (["telegram", "telegram_channel"].includes(type)) return "telegram_public";
    if (type === "wa_group") return "whatsapp_groups";
    if (type === "google_places") return "google_places";
    if (type === "tiktok") return "tiktok_connected";
    if (type === "web_search") return "serpapi";
    if (["site", "web_social", "directory", "b2b_rfq", "rss", "linkedin_public", "youtube_public", "x_public"].includes(type)) return "firecrawl";
    return null;
  };

  const collectSource = async (source: Source) => {
    const provider = providerForSource(source.type);
    if (!provider) return toast.error("Aucun collecteur NEXUS associé à cette source.");
    setBusyId(source.id);
    try {
      const data = await syncNexusSource({
        provider,
        query:
          provider === "serpapi" || provider === "google_places"
            ? (source.label || source.identifier)
            : undefined,
        limit: 20,
      });
      toast.success(
        data.push_mode
          ? `Source temps réel prête${data.active_group_count != null ? ` · ${data.active_group_count} groupe(s)` : ""}`
          : `${data.inserted ?? 0} signal(aux) collecté(s)`,
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Collecte NEXUS impossible");
    } finally {
      setBusyId(null);
    }
  };

  const promoteSignal = async (id: string) => {
    setBusyId(id);
    const { data, error } = await supabase.rpc("waouh_promote_signal" as any, { p_signal_id: id });
    setBusyId(null);
    if (error) toast.error(error.message);
    else { toast.success(`Promu en ${(data as any)?.kind}`); load(); }
  };

  const matchSignal = async (id: string) => {
    setBusyId(id);
    const { data, error } = await supabase.rpc("waouh_match_signal" as any, { p_signal_id: id });
    setBusyId(null);
    if (error) toast.error(error.message);
    else toast.success(`${(data as any)?.count ?? 0} correspondance(s)`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Radar className="w-5 h-5 text-cyan-500" /> Radar IA</h2>
          <p className="text-xs text-muted-foreground">NEXUS collecte les sources publiques ou explicitement autorisées : Web, Maps, Facebook, Instagram, Telegram, TikTok, WhatsApp, SMS/RCS, annuaires et B2B — puis alimente le Signal Fabric et la base unifiée.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => triggerScan("waouh-serpapi-scout")}>SerpAPI</Button>
          <Button variant="outline" size="sm" onClick={() => triggerScan("waouh-radar-apify")}>Apify</Button>
          <Button variant="outline" size="sm" onClick={() => triggerScan("waouh-radar-site-scraper")}>Sites Web</Button>
          <Button variant="outline" size="sm" onClick={() => triggerScan("waouh-radar-process")}>Process queue</Button>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Sources actives</div><div className="text-2xl font-bold">{sources.filter(s => s.active).length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Signaux récents</div><div className="text-2xl font-bold">{signals.length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Profils détectés</div><div className="text-2xl font-bold">{profiles.length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Promus 24h</div><div className="text-2xl font-bold">{signals.filter(s => (s.promoted_article_id || s.promoted_buyer_profile_id) && Date.now() - new Date(s.captured_at).getTime() < 86400000).length}</div></Card>
      </div>
      <RadarAutoControlPanel />
      <RadarApiConfigPanel />



      <Tabs value={tab} onValueChange={(value) => {
        setTab(value);
        setSearchParams((previous) => {
          const next = new URLSearchParams(previous);
          next.set("radarTab", value);
          return next;
        }, { replace: true });
      }}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="signals"><Activity className="w-4 h-4 mr-1" /> Signaux</TabsTrigger>
          <TabsTrigger value="sources"><Radar className="w-4 h-4 mr-1" /> Sources</TabsTrigger>
          <TabsTrigger value="profiles"><Users className="w-4 h-4 mr-1" /> Profils</TabsTrigger>
          <TabsTrigger value="contact"><ShieldCheck className="w-4 h-4 mr-1" /> Contact Layer C0–C4</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-2">
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {signals.map((s) => (
            <Card key={s.id} className="p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                {signalPhoto(s) && (
                  <img
                    src={signalPhoto(s)!}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover border shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={s.intent === "SELL" ? "default" : s.intent === "BUY" ? "secondary" : "outline"}>{s.intent}</Badge>
                    <Badge variant="outline" className="text-[10px]">{s.source_type}</Badge>
                    <Badge variant="outline" className="text-[10px]">conf {(s.confidence * 100).toFixed(0)}%</Badge>
                    <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                    {(s.product?.whatsapp_detected || s.source_type === "wa_group") && (
                      <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">WhatsApp détecté</Badge>
                    )}
                    {signalPhoto(s) && (
                      <Badge variant="outline" className="text-[10px]">Photo</Badge>
                    )}
                    {(s.promoted_article_id || s.promoted_buyer_profile_id) && (
                      <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/40 text-[10px]">Promu</Badge>
                    )}
                  </div>
                  <div className="font-medium text-sm">{s.product?.title || s.raw_text?.slice(0, 100)}</div>
                  <div className="text-xs text-muted-foreground">{fmtPrice(s.price)} · {s.city || "—"} · {s.contact_phone || s.contact_handle || "anon"} · {new Date(s.captured_at).toLocaleString("fr-FR")}</div>
                  {s.raw_url && <a href={s.raw_url} target="_blank" rel="noreferrer" className="text-xs text-cyan-600 hover:underline">Source ↗</a>}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {!s.promoted_article_id && !s.promoted_buyer_profile_id && (s.intent === "SELL" || s.intent === "BUY") && (
                    <Button size="sm" variant="outline" disabled={busyId === s.id} onClick={() => promoteSignal(s.id)}>
                      <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Promouvoir
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={busyId === s.id} onClick={() => matchSignal(s.id)}>
                    <Target className="w-3.5 h-3.5 mr-1" /> Matcher
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {signals.length === 0 && !loading && <p className="text-sm text-muted-foreground text-center py-8">Aucun signal capturé. Lancez un scan.</p>}
        </TabsContent>

        <TabsContent value="sources" className="space-y-3">
          <Card className="p-4">
            <div className="font-medium mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter une source</div>
            <div className="grid sm:grid-cols-5 gap-2">
              <Select value={newSrc.type} onValueChange={(v) => setNewSrc({ ...newSrc, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fb_marketplace">Facebook Marketplace public</SelectItem>
                  <SelectItem value="fb_group">Facebook groupe public / autorisé</SelectItem>
                  <SelectItem value="fb_page">Facebook Page / Business</SelectItem>
                  <SelectItem value="instagram_business">Instagram Business</SelectItem>
                  <SelectItem value="tiktok">TikTok connecté / public</SelectItem>
                  <SelectItem value="wa_group">WhatsApp groupe autorisé (id@g.us)</SelectItem>
                  <SelectItem value="telegram_channel">Telegram canal / groupe autorisé</SelectItem>
                  <SelectItem value="google_places">Google Places / Maps</SelectItem>
                  <SelectItem value="directory">Annuaire entreprise</SelectItem>
                  <SelectItem value="b2b_rfq">B2B / RFQ / appel d’offres</SelectItem>
                  <SelectItem value="rss">Flux RSS / Atom public</SelectItem>
                  <SelectItem value="web_search">Recherche Web publique</SelectItem>
                  <SelectItem value="web_social">Web social public</SelectItem>
                  <SelectItem value="linkedin_public">LinkedIn public</SelectItem>
                  <SelectItem value="youtube_public">YouTube public</SelectItem>
                  <SelectItem value="x_public">X / Twitter public</SelectItem>
                  <SelectItem value="apify_actor">Apify Actor public personnalisé</SelectItem>
                  <SelectItem value="site">Site web public</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="URL, Page ID, @canal, -100..., group@g.us, requête…" value={newSrc.identifier} onChange={(e) => setNewSrc({ ...newSrc, identifier: e.target.value })} />
              <Input placeholder="Label" value={newSrc.label} onChange={(e) => setNewSrc({ ...newSrc, label: e.target.value })} />
              <Input
                type="number"
                min={5}
                max={1440}
                title="Fréquence de collecte en minutes"
                value={newSrc.scan_freq_min}
                onChange={(e) => setNewSrc({ ...newSrc, scan_freq_min: Math.max(5, Number(e.target.value || 60)) })}
              />
              <Button onClick={addSource}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
            </div>
            {newSrc.type === "apify_actor" && (
              <div className="mt-2">
                <Input
                  value={newSrc.actor_input_json}
                  onChange={(e) => setNewSrc({ ...newSrc, actor_input_json: e.target.value })}
                  placeholder={'Input JSON optionnel, ex. {"startUrls":[{"url":"https://..."}],"maxItems":30}'}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Dans « Identifiant », indiquez l’Actor Apify au format username~actor-name.
                </p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">
              Groupes WhatsApp : uniquement les groupes connectés au compte WAHA et ajoutés ici à la liste autorisée.
              Facebook : Pages Business autorisées via Meta ; Marketplace/groupes publics via Apify ou Web public configuré.
            </p>
          </Card>

          {sources.map((s) => (
            <Card key={s.id} className="p-3 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2"><Badge>{s.type}</Badge><span className="font-medium text-sm">{s.label || s.identifier}</span></div>
                <div className="text-xs text-muted-foreground">{s.identifier} · scan {s.scan_freq_min}min · last: {s.last_scan_at ? new Date(s.last_scan_at).toLocaleString("fr-FR") : "jamais"} · {s.last_signal_count} signaux</div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  className="w-24 h-8 text-xs"
                  defaultValue={s.scan_freq_min}
                  title="Fréquence en minutes"
                  onBlur={(e) => void updateSourceFrequency(s.id, Number(e.target.value))}
                />
                <span className="text-[10px] text-muted-foreground">min</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!s.active || busyId === s.id || !providerForSource(s.type)}
                  onClick={() => void collectSource(s)}
                >
                  {busyId === s.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                  Collecter
                </Button>
                <Switch checked={s.active} onCheckedChange={(v) => toggleSource(s.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => deleteSource(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="profiles" className="space-y-2">
          {profiles.map((p) => (
            <Card key={p.id} className="p-3 flex items-center justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><Badge variant={p.role === "seller" ? "default" : p.role === "buyer" ? "secondary" : "outline"}>{p.role}</Badge><span className="font-medium">{p.display_name || p.contact_phone}</span></div>
                <div className="text-xs text-muted-foreground">{p.contact_phone} · {p.signals_count} signaux · catégories: {p.categories?.join(", ") || "—"} · villes: {p.cities?.join(", ") || "—"}</div>
              </div>
              <Badge variant="outline">★ {(p.reliability_score * 100).toFixed(0)}%</Badge>
            </Card>
          ))}
          {profiles.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun profil détecté.</p>}
        </TabsContent>

        <TabsContent value="contact" className="space-y-3">
          <Card className="p-4 border-cyan-200 bg-cyan-50/30">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold flex items-center gap-2"><LockKeyhole className="w-4 h-4 text-cyan-700" />Contact Layer C0–C4</div>
                <p className="mt-1 text-xs text-muted-foreground max-w-3xl">
                  Politique de contactabilité par source. L’administrateur peut réduire un niveau ou l’augmenter uniquement jusqu’au plafond sûr de la source.
                  La découverte d’un contact ne vaut jamais consentement commercial.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadContactPolicies()} disabled={contactLoading}>
                {contactLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}Actualiser
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-3">
              {CONTACT_LEVELS.map((level) => (
                <div key={level} className="rounded-lg border bg-background p-2">
                  <Badge variant="outline">{level}</Badge>
                  <div className="text-[10px] text-muted-foreground mt-1 leading-snug">{CONTACT_RULES[level]}</div>
                </div>
              ))}
            </div>
          </Card>
          {contactLoading && contactPolicies.length === 0 && <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>}
          {contactPolicies.map((policy) => (
            <Card key={policy.source_key} className="p-3">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{policy.label}</span>
                    <Badge variant="outline" className="text-[10px]">{policy.source_key}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{policy.family}</Badge>
                    <Badge variant={policy.operational_state === "live" ? "default" : "outline"} className="text-[10px]">{policy.operational_state}</Badge>
                    {!policy.supports_contact && <Badge variant="outline" className="text-[10px] text-amber-700">sans contact</Badge>}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Niveau actuel <strong>{policy.default_contactability}</strong> · plafond sûr <strong>{policy.max_contactability}</strong> · {CONTACT_RULES[policy.default_contactability]}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Niveau par défaut</span>
                  <Select
                    value={policy.default_contactability}
                    disabled={contactBusy === policy.source_key}
                    onValueChange={(value) => void updateContactPolicy(policy.source_key, value as ContactabilityLevel)}
                  >
                    <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {policy.allowed_levels.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {contactBusy === policy.source_key && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              </div>
            </Card>
          ))}
          {!contactLoading && contactPolicies.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune politique Contact Layer disponible.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
