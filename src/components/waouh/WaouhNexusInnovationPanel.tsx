import { useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode, Bot, Camera, Database, Loader2, MapPin, ScanSearch, Sparkles, Store, Upload, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { moneyXof } from "@/lib/waouh/agenticClient";
import {
  createNexusBuyerAutopilot,
  createNexusSellerAutopilot,
  getNexusSources,
  getSellerOpportunities,
  identifyNexusVisual,
  lookupNexusBarcode,
  searchNexus,
  submitNexusScoutReport,
  type NexusSearchResponse,
  type NexusSellerGroup,
  type NexusSourceStatus,
} from "@/lib/waouh/nexus";

const message = (error: unknown) => error instanceof Error ? error.message : "Une erreur inattendue est survenue.";

function SearchPreview({ result }: { result: NexusSearchResponse | null }) {
  if (!result) return null;
  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{result.query}</div>
          <div className="text-[11px] text-muted-foreground">
            {result.market.sample_count
              ? `${result.market.sample_count} prix comparés · médiane ${moneyXof(result.market.median)}`
              : "Comparaison locale en cours"}
          </div>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {result.results.slice(0, 3).map((item) => (
          <div key={item.article_id ?? item.catalog_id ?? item.title} className="rounded-lg border bg-background p-2">
            <div className="line-clamp-1 text-xs font-semibold">{item.title}</div>
            <div className="mt-1 text-sm font-bold">{moneyXof(item.price, item.currency)}</div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              {item.city && <><MapPin className="h-3 w-3" />{item.city}</>}
              <span className="ml-auto">{Math.round(item.scores.total_score)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WaouhNexusInnovationPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const imageInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [visualQuery, setVisualQuery] = useState("");
  const [visualResult, setVisualResult] = useState<NexusSearchResponse | null>(null);
  const [barcode, setBarcode] = useState("");
  const [barcodeResult, setBarcodeResult] = useState<NexusSearchResponse | null>(null);
  const [sources, setSources] = useState<NexusSourceStatus | null>(null);
  const [sellerGroups, setSellerGroups] = useState<NexusSellerGroup[]>([]);
  const [scoutTitle, setScoutTitle] = useState("");
  const [scoutPrice, setScoutPrice] = useState("");
  const [scoutCity, setScoutCity] = useState("Cotonou");
  const [scoutPlace, setScoutPlace] = useState("");

  useEffect(() => {
    if (!user) return;
    getNexusSources().then(setSources).catch(() => undefined);
  }, [user?.id]);

  const activeProviderCount = useMemo(
    () => sources?.providers.filter((provider) => provider.active).length ?? 0,
    [sources],
  );

  const uploadAndIdentify = async (file: File) => {
    if (!user) return;
    setBusy("vision");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `nexus/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("waouh-uploads").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("waouh-uploads").getPublicUrl(path);
      const identified = await identifyNexusVisual(publicUrl.publicUrl);
      setVisualQuery(identified.query);
      const search = await searchNexus({ query: identified.query, limit: 6, persist_intent: true });
      setVisualResult(search);
      toast({ title: "Produit reconnu", description: `WAOUH compare maintenant « ${identified.query} ».` });
    } catch (error) {
      toast({ title: "Analyse photo impossible", description: message(error), variant: "destructive" });
    } finally {
      setBusy(null);
      if (imageInput.current) imageInput.current.value = "";
    }
  };

  const runBarcode = async () => {
    const code = barcode.trim();
    if (!code) return;
    setBusy("barcode");
    try {
      const lookup = await lookupNexusBarcode(code);
      setVisualQuery(lookup.query);
      const search = await searchNexus({ query: lookup.query, limit: 6, persist_intent: true });
      setBarcodeResult(search);
      toast({
        title: "Produit retrouvé",
        description: `${lookup.articles.length + lookup.catalog.length} référence(s) GTIN directe(s), puis comparaison NEXUS.`,
      });
    } catch (error) {
      toast({ title: "Code non reconnu", description: message(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const startBuyerAutopilot = async (query: string) => {
    if (!query.trim()) return;
    setBusy("buyer-auto");
    try {
      await createNexusBuyerAutopilot({ goal: query.trim(), city: scoutCity || undefined });
      toast({ title: "WAOUH travaille pour vous", description: "Mission + veille créées. L’IA continuera à chercher et comparer." });
    } catch (error) {
      toast({ title: "Autopilote impossible", description: message(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const loadSellerAutopilot = async () => {
    setBusy("seller-load");
    try {
      const result = await getSellerOpportunities();
      setSellerGroups(result.articles);
    } catch (error) {
      toast({ title: "Articles vendeur indisponibles", description: message(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const startSellerAutopilot = async (group: NexusSellerGroup) => {
    setBusy(`seller:${group.article.id}`);
    try {
      const price = Number(group.article.price ?? 0);
      await createNexusSellerAutopilot({
        article_id: group.article.id,
        goal: `Vendre ${group.article.title} au meilleur prix raisonnable`,
        min_price_amount: price > 0 ? Math.round(price * 0.85) : undefined,
        max_discount_percent: 15,
        delivery_zones: group.article.city ? [group.article.city] : [],
      });
      toast({ title: "Agent vendeur activé", description: "WAOUH peut maintenant qualifier les acheteurs et négocier dans vos limites, avec validation avant accord." });
    } catch (error) {
      toast({ title: "Activation impossible", description: message(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const submitScout = async () => {
    if (!scoutTitle.trim()) return;
    setBusy("scout");
    try {
      await submitNexusScoutReport({
        title: scoutTitle.trim(),
        observed_price: scoutPrice ? Number(scoutPrice) : undefined,
        city: scoutCity || undefined,
        place_name: scoutPlace || undefined,
        source_type: "field",
        availability: "available",
      });
      setScoutTitle("");
      setScoutPrice("");
      setScoutPlace("");
      toast({ title: "Observation enregistrée", description: "Elle pourra enrichir l’intelligence prix après vérification." });
    } catch (error) {
      toast({ title: "Observation impossible", description: message(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (!user) return null;

  return (
    <Card className="overflow-hidden border-cyan-200/70 dark:border-cyan-900/70">
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">NEXUS Lab</div>
              <div className="text-[11px] text-muted-foreground">Photo · code-barres · autopilote · intelligence terrain</div>
            </div>
          </div>
          <Badge variant="outline" className="gap-1"><Database className="h-3 w-3" />{activeProviderCount} source(s) externe(s) live</Badge>
        </div>

        <Tabs defaultValue="vision">
          <TabsList className="grid h-auto grid-cols-4">
            <TabsTrigger value="vision" className="gap-1 text-xs"><Camera className="h-3.5 w-3.5" />Photo</TabsTrigger>
            <TabsTrigger value="barcode" className="gap-1 text-xs"><Barcode className="h-3.5 w-3.5" />Code</TabsTrigger>
            <TabsTrigger value="auto" className="gap-1 text-xs"><Bot className="h-3.5 w-3.5" />Auto</TabsTrigger>
            <TabsTrigger value="scout" className="gap-1 text-xs"><ScanSearch className="h-3.5 w-3.5" />Scout</TabsTrigger>
          </TabsList>

          <TabsContent value="vision" className="space-y-3">
            <input ref={imageInput} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAndIdentify(file); }} />
            <Button className="w-full" variant="outline" disabled={busy === "vision"} onClick={() => imageInput.current?.click()}>
              {busy === "vision" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Montrer un produit à WAOUH
            </Button>
            {visualQuery && (
              <div className="flex gap-2">
                <Input value={visualQuery} onChange={(e) => setVisualQuery(e.target.value)} />
                <Button disabled={busy === "buyer-auto"} onClick={() => void startBuyerAutopilot(visualQuery)}>Acheter pour moi</Button>
              </div>
            )}
            <SearchPreview result={visualResult} />
          </TabsContent>

          <TabsContent value="barcode" className="space-y-3">
            <div className="flex gap-2">
              <Input value={barcode} onChange={(event) => setBarcode(event.target.value)} inputMode="numeric" placeholder="EAN / UPC / GTIN" />
              <Button disabled={!barcode.trim() || busy === "barcode"} onClick={() => void runBarcode()}>
                {busy === "barcode" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Barcode className="h-4 w-4" />}
              </Button>
            </div>
            <SearchPreview result={barcodeResult} />
          </TabsContent>

          <TabsContent value="auto" className="space-y-3">
            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" />Acheteur</div>
              <p className="mt-1 text-xs text-muted-foreground">Lancez une recherche depuis Photo/Code puis « Acheter pour moi » : WAOUH crée une mission et une veille automatique.</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold"><Store className="h-4 w-4" />Vendeur</div>
                  <p className="mt-1 text-xs text-muted-foreground">WAOUH trouve les acheteurs compatibles et négocie dans vos limites.</p>
                </div>
                <Button size="sm" variant="outline" disabled={busy === "seller-load"} onClick={() => void loadSellerAutopilot()}>
                  {busy === "seller-load" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mes articles"}
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {sellerGroups.slice(0, 5).map((group) => (
                  <div key={group.article.id} className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">{group.article.title}</div>
                      <div className="text-[10px] text-muted-foreground">{group.matched_count} acheteur(s) compatible(s) · {moneyXof(group.article.price)}</div>
                    </div>
                    <Button size="sm" disabled={busy === `seller:${group.article.id}`} onClick={() => void startSellerAutopilot(group)}>
                      {busy === `seller:${group.article.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Vendre pour moi"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scout" className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={scoutTitle} onChange={(e) => setScoutTitle(e.target.value)} placeholder="Produit observé" />
              <Input value={scoutPrice} onChange={(e) => setScoutPrice(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Prix FCFA" />
              <Input value={scoutCity} onChange={(e) => setScoutCity(e.target.value)} placeholder="Ville" />
              <Input value={scoutPlace} onChange={(e) => setScoutPlace(e.target.value)} placeholder="Boutique / marché" />
            </div>
            <Button className="w-full" disabled={!scoutTitle.trim() || busy === "scout"} onClick={() => void submitScout()}>
              {busy === "scout" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
              Ajouter au réseau de prix WAOUH
            </Button>
            {sources && (
              <div className="rounded-xl border p-3 text-xs">
                <div className="font-semibold">Sources actives dans le cerveau marché</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(sources.offers).map(([source, count]) => <Badge key={source} variant="secondary">{source}: {count}</Badge>)}
                  {Object.entries(sources.demands).map(([source, count]) => <Badge key={`d-${source}`} variant="outline">demande {source}: {count}</Badge>)}
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  Radar avec contact exploitable : {sources.radar.contacts_ready}. Les connecteurs externes désactivés restent visibles mais ne sont jamais présentés comme live.
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default WaouhNexusInnovationPanel;
