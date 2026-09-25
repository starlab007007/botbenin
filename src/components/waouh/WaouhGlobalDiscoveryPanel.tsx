import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, Camera, ExternalLink, Globe2, Loader2, MapPin, MessageCircle, Radar,
  Search, Send, Share2, Sparkles, Store, Upload, Users, Wifi, WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getNexusSources,
  globalNexusDiscovery,
  ingestSharedCommerceSignal,
  prepareNexusContact,
  sendNexusDiscoveryContact,
  type NexusDiscoveryMode,
  type NexusDiscoveryResult,
  type NexusDiscoverySource,
  type NexusResolvedDiscoveryMode,
  type NexusSmartDiscoveryPlan,
  type NexusSourceStatus,
} from "@/lib/waouh/nexus";
import { moneyXof } from "@/lib/waouh/agenticClient";

const sourceLabel = (key?: string | null) => {
  const value = String(key ?? "");
  const labels: Record<string, string> = {
    waouh_app: "WAOUH",
    partner: "Partenaire",
    whatsapp: "WhatsApp",
    share_to_waouh: "Partagé à WAOUH",
    radar_ia: "Radar IA",
    serpapi: "Web public",
    apify: "Web social",
    google_places: "Google Maps",
    facebook_business: "Facebook",
    instagram_business: "Instagram",
    tiktok_connected: "TikTok",
    telegram_public: "Telegram",
    benin_directory: "Annuaire Bénin",
    b2b_rfq: "B2B / RFQ",
    scout: "Scout terrain",
    voice: "Voix",
    sms_rcs: "SMS/RCS",
    ussd: "USSD",
  };
  return labels[value] ?? (value || "Source");
};

const stateLabel = (source: NexusDiscoverySource) => {
  if (source.operational_state === "live") return "Live";
  if (source.operational_state === "requires_config") return "À configurer";
  if (source.operational_state === "ingest_only") return "Partage / import";
  if (source.operational_state === "planned") return "Préparé";
  return "Désactivé";
};

const errorText = (error: unknown) => error instanceof Error ? error.message : "Erreur inattendue.";

const resultPhotos = (result: NexusDiscoveryResult) => {
  const evidence = (result.evidence || {}) as Record<string, any>;
  const values = [
    ...(Array.isArray(evidence.photos) ? evidence.photos : []),
    evidence.image_url,
    evidence.thumbnail,
  ];
  return values
    .map((value) => typeof value === "string" ? value : value?.url)
    .filter((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value))
    .slice(0, 4);
};

const resultContactHint = (result: NexusDiscoveryResult) => {
  const evidence = (result.evidence || {}) as Record<string, any>;
  const hints = evidence.contact_hints || {};
  if (Number(hints.whatsapp_verified_count || 0) > 0) return "WhatsApp détecté";
  if (Number(hints.phone_count || 0) > 0 || evidence.contact_last4) return "Contact détecté";
  return null;
};

type SharedSignalState = Awaited<ReturnType<typeof ingestSharedCommerceSignal>>;
type PreparedContactState = Awaited<ReturnType<typeof prepareNexusContact>> & { result: NexusDiscoveryResult };
type PreparedContactItem = PreparedContactState["contacts"][number];


export function WaouhGlobalDiscoveryPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const shareImageInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<NexusDiscoveryMode>("auto");
  const [resolvedMode, setResolvedMode] = useState<NexusResolvedDiscoveryMode>("find_sellers");
  const [intelligence, setIntelligence] = useState<NexusSmartDiscoveryPlan | null>(null);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<NexusDiscoveryResult[]>([]);
  const [sourceMix, setSourceMix] = useState<Record<string, number>>({});
  const [refreshState, setRefreshState] = useState<Record<string, {
    configured?: boolean;
    inserted?: number;
    reason?: string | null;
    surfaces?: Record<string, number>;
  }>>({});
  const [sources, setSources] = useState<NexusSourceStatus | null>(null);
  const [shareText, setShareText] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareOrigin, setShareOrigin] = useState("whatsapp");
  const [shareImageUrl, setShareImageUrl] = useState("");
  const [shareImageName, setShareImageName] = useState("");
  const [sharedSignal, setSharedSignal] = useState<SharedSignalState | null>(null);
  const [contact, setContact] = useState<PreparedContactState | null>(null);
  const [contactMessage, setContactMessage] = useState("");

  const liveSources = useMemo(
    () => (sources?.registry ?? []).filter((source) => source.operational_state === "live"),
    [sources],
  );

  const loadSources = async () => {
    try {
      setSources(await getNexusSources());
    } catch {
      // Non-blocking: discovery itself can still work.
    }
  };

  useEffect(() => { void loadSources(); }, []);

  const searchEverywhere = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setContact(null);
    try {
      const response = await globalNexusDiscovery({
        query: query.trim(),
        mode,
        city: city.trim() || undefined,
        budget_max: mode !== "find_buyers" && budget ? Number(budget) : undefined,
        limit: 24,
        refresh_external: true,
        smart: true,
      });
      setResults(response.results);
      setSourceMix(response.source_mix);
      setRefreshState(response.refresh ?? {});
      setResolvedMode(response.mode);
      setIntelligence(response.intelligence ?? null);
      if (mode === "auto" && response.intelligence?.city && !city.trim()) {
        setCity(response.intelligence.city);
      }
      if (mode === "auto" && response.mode === "find_sellers" && !budget && response.intelligence?.budget_max) {
        setBudget(String(Math.round(response.intelligence.budget_max)));
      }
      if (!response.results.length) {
        toast({
          title: response.mode === "find_sellers"
            ? "Aucun vendeur suffisamment proche pour l’instant"
            : "Aucun acheteur suffisamment proche pour l’instant",
          description: "WAOUH a compris l’objectif et conserve la recherche côté NEXUS. Les sources indisponibles restent signalées sans bloquer le parcours.",
        });
      }
      void loadSources();
    } catch (error) {
      toast({ title: "Recherche impossible", description: errorText(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const uploadSharedImage = async (file: File) => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour analyser une capture ou une photo.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `nexus/${user.id}/shared/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("waouh-uploads").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("waouh-uploads").getPublicUrl(path);
      setShareImageUrl(data.publicUrl);
      setShareImageName(file.name);
      toast({ title: "Image prête", description: "WAOUH Vision pourra extraire produit, prix, lieu et coordonnées visibles." });
    } catch (error) {
      toast({ title: "Import impossible", description: errorText(error), variant: "destructive" });
    } finally {
      setBusy(false);
      if (shareImageInput.current) shareImageInput.current.value = "";
    }
  };

  const ingestShare = async () => {
    if (!shareText.trim() && !shareImageUrl && !shareUrl.trim()) return;
    setBusy(true);
    try {
      const response = await ingestSharedCommerceSignal({
        raw_text: shareText.trim() || undefined,
        image_url: shareImageUrl || undefined,
        source_url: shareUrl.trim() || undefined,
        origin_surface: shareOrigin,
        source_key: shareOrigin === "b2b" ? "b2b_rfq" : "share_to_waouh",
      });
      setSharedSignal(response);
      toast({
        title: "Signal compris par WAOUH",
        description: `${response.signal.intent} · ${response.signal.product_name ?? response.signal.category ?? "contenu commercial"}`,
      });
      setShareText("");
      setShareUrl("");
      setShareImageUrl("");
      setShareImageName("");
      void loadSources();
    } catch (error) {
      toast({ title: "Analyse impossible", description: errorText(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const prepareContact = async (result: NexusDiscoveryResult) => {
    setBusy(true);
    try {
      const prepared = await prepareNexusContact(result.fabric_id);
      setContact({ ...prepared, result });
      const product = result.subject ?? result.category ?? query;
      setContactMessage(`Bonjour, je vous contacte via WAOUH au sujet de « ${product} ». Est-ce toujours disponible / pertinent pour vous ?`);
      if (!prepared.contact_policy.can_reveal) {
        toast({ title: prepared.contact_policy.label, description: prepared.note });
      }
    } catch (error) {
      toast({ title: "Contact indisponible", description: errorText(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openUserInitiatedContact = (channel: string, value: string) => {
    if (channel === "phone" || channel === "whatsapp") {
      const digits = value.replace(/\D/g, "");
      if (channel === "whatsapp") window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
      else window.location.href = `tel:+${digits}`;
      return;
    }
    if (/^https?:/i.test(value)) window.open(value, "_blank", "noopener,noreferrer");
    if (channel === "email") window.location.href = `mailto:${value}`;
  };

  const sendWithWaouh = async () => {
    if (!contact?.fabric_id || !contactMessage.trim()) return;
    setBusy(true);
    try {
      const sent = await sendNexusDiscoveryContact({
        fabric_id: contact.fabric_id,
        message: contactMessage.trim(),
        confirmed: true,
      });
      toast({
        title: "Contact WAOUH mis en file",
        description: sent.blind
          ? "Proposition transmise dans WAOUH sans révéler les coordonnées privées."
          : `${sent.channel} · contact …${sent.phone_last4 ?? ""}`,
      });
    } catch (error) {
      toast({ title: "Envoi non autorisé ou indisponible", description: errorText(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Globe2 className="h-4 w-4" />
              WAOUH Global Discovery
            </div>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
              Cherche l’offre pour la demande et la demande pour l’offre à travers WAOUH, partenaires, Google Maps, Web public, Facebook, Instagram, Telegram, TikTok, WhatsApp autorisé, SMS/RCS, B2B et terrain.
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Wifi className="h-3 w-3" />{liveSources.length} source(s) live
          </Badge>
        </div>

        <Tabs defaultValue="hunt">
          <TabsList className="grid h-auto grid-cols-3">
            <TabsTrigger value="hunt" className="gap-1 text-xs"><Search className="h-3.5 w-3.5" />Chercher partout</TabsTrigger>
            <TabsTrigger value="share" className="gap-1 text-xs"><Share2 className="h-3.5 w-3.5" />Partager à WAOUH</TabsTrigger>
            <TabsTrigger value="sources" className="gap-1 text-xs"><Radar className="h-3.5 w-3.5" />Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="hunt" className="space-y-3">
            <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/50 p-3 dark:border-cyan-900 dark:bg-cyan-950/20">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                <Sparkles className="h-4 w-4 text-cyan-600" />
                Dites simplement votre objectif — l’IA choisit le meilleur parcours.
              </div>
              <div className="grid gap-2 sm:grid-cols-[200px_1fr_160px_140px]">
                <Select value={mode} onValueChange={(value) => { setMode(value as NexusDiscoveryMode); setIntelligence(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Mode IA · WAOUH décide</SelectItem>
                    <SelectItem value="find_sellers">Je cherche à acheter</SelectItem>
                    <SelectItem value="find_buyers">Je cherche à vendre</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void searchEverywhere()}
                  placeholder={
                    mode === "auto"
                      ? "Ex. Je veux un S25 fiable à Cotonou / Je veux vendre 10 tonnes de soja"
                      : mode === "find_sellers"
                        ? "Ex. Samsung S25 256 Go, climatiseur 1,5 CV…"
                        : "Ex. 10 tonnes soja, 50 sacs ciment…"
                  }
                />
                <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ville / zone" />
                {mode !== "find_buyers" ? (
                  <Input value={budget} onChange={(event) => setBudget(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Budget max" />
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
            </div>
            <Button className="w-full bg-cyan-600 text-white hover:bg-cyan-700" onClick={() => void searchEverywhere()} disabled={!query.trim() || busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : mode === "auto" ? (
                <Sparkles className="mr-2 h-4 w-4" />
              ) : mode === "find_sellers" ? (
                <Store className="mr-2 h-4 w-4" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              {mode === "auto"
                ? "Comprendre et chercher partout"
                : mode === "find_sellers"
                  ? "Trouver les vendeurs partout"
                  : "Trouver les acheteurs partout"}
            </Button>

            {intelligence && (
              <div className="rounded-xl border bg-background p-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-cyan-600" />
                      Plan IA NEXUS
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {resolvedMode === "find_sellers" ? "Acheteur → vendeurs" : "Vendeur → acheteurs"}
                      {" · "}{intelligence.normalized_query}
                    </div>
                  </div>
                  <Badge variant="secondary">confiance IA {Math.round(intelligence.confidence * 100)}%</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {intelligence.priorities.slice(0, 5).map((item) => (
                    <Badge key={`priority-${item}`} variant="outline">{item.replace(/_/g, " ")}</Badge>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {intelligence.source_families.slice(0, 8).map((item) => (
                    <Badge key={`source-family-${item}`} variant="secondary">{item.replace(/_/g, " ")}</Badge>
                  ))}
                </div>
                {intelligence.next_actions.length > 0 && (
                  <div className="mt-2 grid gap-1 sm:grid-cols-3">
                    {intelligence.next_actions.slice(0, 3).map((item, index) => (
                      <div key={item} className="rounded-lg bg-muted/40 px-2 py-1.5 text-[11px]">
                        <span className="mr-1 font-semibold">{index + 1}.</span>{item}
                      </div>
                    ))}
                  </div>
                )}
                {intelligence.missing.length > 0 && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    À préciser si utile : {intelligence.missing.join(" · ")}
                  </div>
                )}
              </div>
            )}

            {(Object.keys(sourceMix).length > 0 || Object.keys(refreshState).length > 0) && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(sourceMix).map(([source, count]) => (
                  <Badge key={source} variant="secondary">{sourceLabel(source)} · {count}</Badge>
                ))}
                {Object.entries(refreshState).map(([source, state]) => {
                  const skipped = state.reason === "not_selected_by_ai_plan";
                  return (
                    <Badge key={`refresh-${source}`} variant="outline" className="gap-1">
                      {skipped ? <Radar className="h-3 w-3" /> : state.configured ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {sourceLabel(source)} {skipped ? "non nécessaire" : state.configured ? `+${state.inserted ?? 0}` : "non configuré"}
                    </Badge>
                  );
                })}
              </div>
            )}

            {results.length > 0 && (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">
                    {resolvedMode === "find_sellers" ? "Vendeurs et offres les plus compatibles" : "Acheteurs et demandes les plus compatibles"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Classés par pertinence, confiance, prix, proximité, fraîcheur et contactabilité.
                  </div>
                </div>
                <Badge variant="outline">{results.length} résultat(s)</Badge>
              </div>
            )}

            <div className="grid gap-2 lg:grid-cols-2">
              {results.map((result) => {
                const photos = resultPhotos(result);
                const contactHint = resultContactHint(result);
                return (
                <div key={result.fabric_id} className="rounded-xl border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    {photos[0] && (
                      <img
                        src={photos[0]}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-lg border object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{result.subject ?? result.category ?? "Signal commercial"}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="h-5 px-1.5 text-[9px]">{sourceLabel(result.source_key)}</Badge>
                        <span>{result.intent}</span>
                        {result.actor_type && <span>· {result.actor_type}</span>}
                        {result.city && <span className="inline-flex items-center gap-0.5">· <MapPin className="h-3 w-3" />{result.city}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{Math.round(result.scores.total_score)}%</div>
                      <div className="text-[9px] text-muted-foreground">match</div>
                    </div>
                  </div>

                  {(result.price_min != null || result.price_max != null) && (
                    <div className="mt-2 text-sm font-semibold">
                      {result.price_min != null && result.price_max != null && result.price_min !== result.price_max
                        ? `${moneyXof(result.price_min)} – ${moneyXof(result.price_max)}`
                        : moneyXof(result.price_min ?? result.price_max)}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary">confiance {Math.round(result.scores.trust_score)}%</Badge>
                    <Badge variant="outline">{result.contact_policy.level} · {result.contact_policy.label}</Badge>
                    {contactHint && <Badge variant="secondary">{contactHint}</Badge>}
                    {result.scores.reasons.slice(0, 2).map((reason) => <Badge key={reason} variant="outline">{reason}</Badge>)}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.source_url && (
                      <Button size="sm" variant="outline" onClick={() => window.open(result.source_url!, "_blank", "noopener,noreferrer")}>
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />Source
                      </Button>
                    )}
                    <Button size="sm" onClick={() => void prepareContact(result)} disabled={busy}>
                      <MessageCircle className="mr-1 h-3.5 w-3.5" />
                      {result.contact_policy.level === "C0" ? "Voir possibilité de contact" : "Contacter"}
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>

            {contact && (
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{contact.actor_name ?? contact.result?.subject ?? "Contact"}</div>
                    <div className="text-[11px] text-muted-foreground">{contact.contact_policy.level} · {contact.contact_policy.label}</div>
                  </div>
                  {contact.source_url && (
                    <Button size="sm" variant="ghost" onClick={() => window.open(contact.source_url, "_blank", "noopener,noreferrer")}>
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />Voir la source
                    </Button>
                  )}
                </div>
                {contact.note && <p className="mt-2 text-xs text-muted-foreground">{contact.note}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {(contact.contacts ?? []).map((item: PreparedContactItem) => (
                    <Button key={item.id} size="sm" variant="outline" onClick={() => openUserInitiatedContact(item.channel, item.value)}>
                      {item.channel === "email" ? "Email" : item.channel === "whatsapp" ? "WhatsApp" : "Appeler"} {item.value_last4 ? `…${item.value_last4}` : ""}
                    </Button>
                  ))}
                </div>
                {(contact.contact_policy.can_auto_contact || contact.contact_policy.can_blind_message) && (
                  <div className="mt-3 space-y-2">
                    <Textarea value={contactMessage} onChange={(event) => setContactMessage(event.target.value)} rows={3} />
                    <Button size="sm" disabled={busy || !contactMessage.trim()} onClick={() => void sendWithWaouh()}>
                      <Send className="mr-1 h-3.5 w-3.5" />
                      {contact.contact_policy.can_blind_message ? "Transmettre sans révéler les contacts" : "WAOUH contacte maintenant"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="share" className="space-y-3">
            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><Share2 className="h-4 w-4" />Transformer un contenu vu ailleurs en signal WAOUH</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Collez un message WhatsApp, un post Facebook/Instagram/TikTok/Telegram, une annonce Web ou une demande B2B. WAOUH extrait l’intention et masque les coordonnées dans le texte stocké.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
              <Select value={shareOrigin} onValueChange={setShareOrigin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="web">Site / annonce Web</SelectItem>
                  <SelectItem value="b2b">B2B / RFQ</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
              <Input value={shareUrl} onChange={(event) => setShareUrl(event.target.value)} placeholder="Lien source (optionnel)" />
            </div>
            <input
              ref={shareImageInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadSharedImage(file);
              }}
            />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Textarea
                value={shareText}
                onChange={(event) => setShareText(event.target.value)}
                rows={5}
                placeholder="Collez le message/post, ou ajoutez directement une capture d’écran/photo. Exemple : « Samsung A55 neuf, 175 000 F, Cotonou, tel… »"
              />
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-20 gap-2 sm:w-36 sm:flex-col"
                disabled={busy}
                onClick={() => shareImageInput.current?.click()}
              >
                {shareImageUrl ? <Camera className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                <span className="text-xs">{shareImageUrl ? "Changer l’image" : "Capture / photo"}</span>
              </Button>
            </div>
            {shareImageUrl && (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                <span className="truncate">📷 {shareImageName || "Image à analyser"}</span>
                <Button size="sm" variant="ghost" onClick={() => { setShareImageUrl(""); setShareImageName(""); }}>Retirer</Button>
              </div>
            )}
            <Button className="w-full" disabled={(!shareText.trim() && !shareImageUrl && !shareUrl.trim()) || busy} onClick={() => void ingestShare()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              Analyser et ajouter au Signal Fabric
            </Button>
            {sharedSignal && (
              <div className="rounded-xl border p-3 text-xs">
                <div className="font-semibold">{sharedSignal.signal.intent} · {sharedSignal.signal.product_name ?? sharedSignal.signal.category ?? "Signal"}</div>
                <div className="mt-1 text-muted-foreground">
                  acteur {sharedSignal.signal.actor_type} · confiance extraction {Math.round((sharedSignal.signal.confidence ?? 0) * 100)}% · contact {sharedSignal.signal.contactability_level}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sources" className="space-y-2">
            {(sources?.registry ?? []).map((source) => (
              <div key={source.source_key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold">{source.label}</div>
                    <Badge variant={source.operational_state === "live" ? "secondary" : "outline"}>{stateLabel(source)}</Badge>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {source.family} · {source.connector_mode} · BUY {source.supports_buy ? "✓" : "—"} · SELL {source.supports_sell ? "✓" : "—"} · contact {source.default_contactability}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {source.supports_business && <Building2 className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-semibold">{source.signal_count}</span>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default WaouhGlobalDiscoveryPanel;
