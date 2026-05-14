import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, TrendingUp, Users, Coins, Activity, Sparkles, MapPin, Clock, ExternalLink, Play, MessageCircle, QrCode, RefreshCw } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import WaouhWebChat from "@/components/waouh/WaouhWebChat";
import WaouhWhatsAppPanel from "@/components/waouh/WaouhWhatsAppPanel";

type Stats = {
  total_articles: number;
  active_articles: number;
  sold_articles: number;
  expired_articles: number;
  total_volume: number;
  total_commission: number;
  unique_users: number;
  top_categories: { category: string; count: number }[];
  city_density: { city: string; count: number }[];
  growth_30d: { date: string; published: number; sold: number }[];
};

const cityCoords: Record<string, { x: number; y: number }> = {
  Cotonou: { x: 220, y: 380 },
  "Porto-Novo": { x: 270, y: 360 },
  Parakou: { x: 200, y: 180 },
  Abomey: { x: 180, y: 320 },
  Natitingou: { x: 160, y: 100 },
  Bohicon: { x: 195, y: 310 },
};

function fmtXOF(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}

export default function WaouhPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<Record<string, any>>({});

  const loadAll = async () => {
    const { data: statsData } = await supabase.functions.invoke("waouh-admin-stats");
    if (statsData) setStats(statsData);

    const { data: a } = await supabase.from("waouh_articles").select("*, waouh_users!seller_id(phone_number, display_name, city)").order("created_at", { ascending: false }).limit(200);
    setArticles(a || []);

    const { data: b } = await supabase.from("waouh_buyer_profiles").select("*, waouh_users!user_id(phone_number, display_name)").order("created_at", { ascending: false }).limit(100);
    setBuyers(b || []);

    const { data: t } = await supabase.from("waouh_transactions").select("*, waouh_articles(title), seller:waouh_users!seller_id(phone_number), buyer:waouh_users!buyer_id(phone_number)").order("created_at", { ascending: false }).limit(100);
    setTransactions(t || []);

    const { data: s } = await supabase.from("waouh_settings").select("*");
    if (s) setSettings(Object.fromEntries(s.map((r: any) => [r.key, r.value])));
  };

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("waouh-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "waouh_articles" }, (payload: any) => {
        setActivity((prev) => [{ type: "article", at: new Date(), payload: payload.new }, ...prev].slice(0, 10));
        loadAll();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "waouh_transactions" }, (payload: any) => {
        setActivity((prev) => [{ type: "transaction", at: new Date(), payload: payload.new }, ...prev].slice(0, 10));
        loadAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filteredArticles = articles.filter((a) =>
    (filterCategory === "all" || a.category === filterCategory) &&
    (filterStatus === "all" || a.status === filterStatus) &&
    (!search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.brand?.toLowerCase().includes(search.toLowerCase()))
  );

  const statusColor: Record<string, string> = {
    active: "bg-waouh-success/20 text-waouh-success border-waouh-success/40",
    reserved: "bg-waouh-warning/20 text-waouh-warning border-waouh-warning/40",
    sold: "bg-waouh-ai/20 text-waouh-ai border-waouh-ai/40",
    expired: "bg-muted text-muted-foreground",
    paused: "bg-muted text-muted-foreground",
  };

  const saveSetting = async (key: string, value: any) => {
    const { error } = await supabase.from("waouh_settings").upsert({ key, value });
    if (error) toast.error(error.message); else { toast.success("Paramètre enregistré"); setSettings((s) => ({ ...s, [key]: value })); }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-foreground">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header bot.bj style */}
        <div className="rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 p-5 md:p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">WAOUH — Administration</h1>
                <p className="text-sm text-white/85">World AI Open Universal Hub · Commerce IA géolocalisé</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/waouh-chat" target="_blank">
                <Button variant="secondary" className="bg-white/15 hover:bg-white/25 text-white border-white/30">
                  <MessageCircle className="w-4 h-4 mr-2" /> Ouvrir le chat public
                </Button>
              </Link>
              <Link to="/waouh/demo">
                <Button variant="secondary" className="bg-white text-blue-600 hover:bg-white/90">
                  <Play className="w-4 h-4 mr-2" /> Démo conversation
                </Button>
              </Link>
              <Badge className="bg-emerald-400/20 text-white border-emerald-300/40">
                <span className="w-2 h-2 rounded-full bg-emerald-300 mr-2 animate-pulse" /> Système actif
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="bg-white border border-gray-200 flex-wrap h-auto p-1 shadow-sm">
            <TabsTrigger value="dashboard">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="articles">Annonces</TabsTrigger>
            <TabsTrigger value="buyers">Acheteurs</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp (WAHA)</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={ShoppingBag} label="Annonces actives" value={stats?.active_articles ?? 0} color="waouh-primary" />
              <KpiCard icon={TrendingUp} label="Volume transactionnel" value={fmtXOF(stats?.total_volume ?? 0)} color="waouh-success" />
              <KpiCard icon={Users} label="Utilisateurs WAOUH" value={stats?.unique_users ?? 0} color="waouh-ai" />
              <KpiCard icon={Coins} label="Commissions perçues" value={fmtXOF(stats?.total_commission ?? 0)} color="waouh-payment" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 p-4 bg-card border-[hsl(var(--waouh-border))]">
                <h3 className="font-semibold mb-3">Annonces publiées vs vendues — 30 derniers jours</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={stats?.growth_30d ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--waouh-border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--waouh-bg))", border: "1px solid hsl(var(--waouh-border))" }} />
                    <Line type="monotone" dataKey="published" stroke="hsl(var(--waouh-primary))" strokeWidth={2} dot={false} name="Publiées" />
                    <Line type="monotone" dataKey="sold" stroke="hsl(var(--waouh-success))" strokeWidth={2} dot={false} name="Vendues" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
                <h3 className="font-semibold mb-3">Top catégories</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats?.top_categories ?? []} layout="vertical">
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis dataKey="category" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
                    <Tooltip contentStyle={{ background: "hsl(var(--waouh-bg))", border: "1px solid hsl(var(--waouh-border))" }} />
                    <Bar dataKey="count" fill="hsl(var(--waouh-primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-waouh-primary" /> Densité — Bénin</h3>
                <svg viewBox="0 0 400 500" className="w-full h-64">
                  <path d="M120 60 L280 60 L300 200 L320 350 L280 460 L150 460 L130 350 L110 200 Z" fill="hsl(var(--waouh-bg))" stroke="hsl(var(--waouh-border))" strokeWidth="2" />
                  {(stats?.city_density ?? []).map((c) => {
                    const co = cityCoords[c.city] ?? { x: 200, y: 250 };
                    const r = Math.min(30, 8 + Math.sqrt(c.count) * 4);
                    return (
                      <g key={c.city}>
                        <circle cx={co.x} cy={co.y} r={r} fill="hsl(var(--waouh-primary))" fillOpacity={0.3} />
                        <circle cx={co.x} cy={co.y} r={4} fill="hsl(var(--waouh-primary))" />
                        <text x={co.x + 8} y={co.y + 4} fill="hsl(var(--foreground))" fontSize="11">{c.city} ({c.count})</text>
                      </g>
                    );
                  })}
                </svg>
              </Card>

              <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-waouh-ai" /> Activité temps réel</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activity.length === 0 && <p className="text-sm text-muted-foreground">En attente d'événements...</p>}
                  {activity.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 rounded border border-[hsl(var(--waouh-border))] bg-[hsl(var(--waouh-bg))] animate-fade-in">
                      <span className={`w-2 h-2 rounded-full ${e.type === "article" ? "bg-waouh-primary" : "bg-waouh-success"}`} />
                      <span className="flex-1 truncate">
                        {e.type === "article" ? `Annonce: ${e.payload?.title ?? "?"}` : `Transaction: ${fmtXOF(Number(e.payload?.amount ?? 0))}`}
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(e.at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ARTICLES */}
          <TabsContent value="articles" className="space-y-4 mt-4">
            <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
              <div className="flex flex-wrap gap-2 mb-4">
                <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes catégories</SelectItem>
                    {["smartphone","ordinateur","vetement","vehicule","electromenager","meuble","autre"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    {["active","reserved","sold","expired","paused"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b border-[hsl(var(--waouh-border))]">
                    <tr><th className="p-2">Titre</th><th className="p-2">Vendeur</th><th className="p-2">Prix</th><th className="p-2">Catégorie</th><th className="p-2">Statut</th><th className="p-2">Ville</th><th className="p-2">Date</th></tr>
                  </thead>
                  <tbody>
                    {filteredArticles.map((a) => (
                      <tr key={a.id} onClick={() => setSelectedArticle(a)} className="border-b border-[hsl(var(--waouh-border))] hover:bg-waouh-primary/5 cursor-pointer">
                        <td className="p-2 font-medium">{a.title}</td>
                        <td className="p-2 text-muted-foreground">{a.waouh_users?.phone_number ?? "—"}</td>
                        <td className="p-2 font-semibold text-waouh-success">{fmtXOF(Number(a.price))}</td>
                        <td className="p-2">{a.category}</td>
                        <td className="p-2"><Badge className={statusColor[a.status]}>{a.status}</Badge></td>
                        <td className="p-2 text-muted-foreground">{a.city ?? "—"}</td>
                        <td className="p-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredArticles.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucune annonce</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* BUYERS */}
          <TabsContent value="buyers" className="space-y-4 mt-4">
            <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b border-[hsl(var(--waouh-border))]">
                    <tr><th className="p-2">Utilisateur</th><th className="p-2">Recherche</th><th className="p-2">Budget max</th><th className="p-2">Rayon</th><th className="p-2">Notif.</th><th className="p-2">Statut</th><th className="p-2">Action</th></tr>
                  </thead>
                  <tbody>
                    {buyers.map((b) => (
                      <tr key={b.id} className="border-b border-[hsl(var(--waouh-border))]">
                        <td className="p-2">{b.waouh_users?.phone_number ?? "—"}</td>
                        <td className="p-2 max-w-md truncate">{b.query_text}</td>
                        <td className="p-2">{b.price_max ? fmtXOF(Number(b.price_max)) : "—"}</td>
                        <td className="p-2">{b.radius_km} km</td>
                        <td className="p-2">{b.notified_article_ids?.length ?? 0}</td>
                        <td className="p-2"><Badge className={b.is_active ? "bg-waouh-success/20 text-waouh-success border-waouh-success/40" : ""}>{b.is_active ? "actif" : "inactif"}</Badge></td>
                        <td className="p-2">
                          <Button size="sm" variant="outline" onClick={async () => {
                            await supabase.functions.invoke("waouh-notify-buyers", { body: { buyer_profile_id: b.id } });
                            toast.success("Matching déclenché");
                          }}>Notifier</Button>
                        </td>
                      </tr>
                    ))}
                    {buyers.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucun profil acheteur</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TRANSACTIONS */}
          <TabsContent value="transactions" className="space-y-4 mt-4">
            <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b border-[hsl(var(--waouh-border))]">
                    <tr><th className="p-2">ID</th><th className="p-2">Produit</th><th className="p-2">Vendeur</th><th className="p-2">Acheteur</th><th className="p-2">Montant</th><th className="p-2">Commission</th><th className="p-2">Méthode</th><th className="p-2">Escrow</th><th className="p-2">Statut</th></tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id} className="border-b border-[hsl(var(--waouh-border))]">
                        <td className="p-2 font-mono text-xs">{t.id.slice(0, 8)}</td>
                        <td className="p-2">{t.waouh_articles?.title ?? "—"}</td>
                        <td className="p-2 text-xs">{t.seller?.phone_number}</td>
                        <td className="p-2 text-xs">{t.buyer?.phone_number}</td>
                        <td className="p-2 font-semibold">{fmtXOF(Number(t.amount))}</td>
                        <td className="p-2 text-waouh-payment">{fmtXOF(Number(t.commission))}</td>
                        <td className="p-2">{t.payment_method}</td>
                        <td className="p-2"><Badge>{t.escrow_status}</Badge></td>
                        <td className="p-2"><Badge className={t.status === "completed" ? "bg-waouh-success/20 text-waouh-success" : ""}>{t.status}</Badge></td>
                      </tr>
                    ))}
                    {transactions.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Aucune transaction</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>


          {/* WHATSAPP WAHA */}
          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <WaouhWhatsAppPanel />
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-waouh-ai" /> Configuration IA</h3>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Modèle</Label>
                  <Select value={settings.ai?.model ?? "google/gemini-2.5-flash"} onValueChange={(v) => saveSetting("ai", { ...settings.ai, model: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (rapide)</SelectItem>
                      <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (vision/négo)</SelectItem>
                      <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (low-cost)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Température</Label>
                  <Input type="number" step="0.1" min="0" max="2" defaultValue={settings.ai?.temperature ?? 0.7}
                    onBlur={(e) => saveSetting("ai", { ...settings.ai, temperature: Number(e.target.value) })} />
                </div>
                <div className="md:col-span-3">
                  <Label>Instructions personnalisées</Label>
                  <Input defaultValue={settings.ai?.custom_instructions ?? ""}
                    onBlur={(e) => saveSetting("ai", { ...settings.ai, custom_instructions: e.target.value })} />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
              <h3 className="font-semibold mb-3">Paramètres commerciaux</h3>
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <Label>Commission (%)</Label>
                  <Input type="number" step="0.5" defaultValue={(settings.commercial?.commission_rate ?? 0.03) * 100}
                    onBlur={(e) => saveSetting("commercial", { ...settings.commercial, commission_rate: Number(e.target.value) / 100 })} />
                </div>
                <div>
                  <Label>Expiration (jours)</Label>
                  <Input type="number" defaultValue={settings.commercial?.expiry_days ?? 7}
                    onBlur={(e) => saveSetting("commercial", { ...settings.commercial, expiry_days: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Rayon défaut (km)</Label>
                  <Input type="number" defaultValue={settings.commercial?.default_radius_km ?? 30}
                    onBlur={(e) => saveSetting("commercial", { ...settings.commercial, default_radius_km: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={!!settings.commercial?.auto_expand_radius}
                    onCheckedChange={(v) => saveSetting("commercial", { ...settings.commercial, auto_expand_radius: v })} />
                  <Label>Expansion auto rayon</Label>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
              <h3 className="font-semibold mb-3">Paiements</h3>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={!!settings.payments?.momo_enabled}
                    onCheckedChange={(v) => saveSetting("payments", { ...settings.payments, momo_enabled: v })} />
                  <Label>Mobile Money (Qosic)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!settings.payments?.stripe_enabled}
                    onCheckedChange={(v) => saveSetting("payments", { ...settings.payments, stripe_enabled: v })} />
                  <Label>Stripe (cartes)</Label>
                </div>
                <div>
                  <Label>Délai escrow (heures)</Label>
                  <Input type="number" defaultValue={settings.payments?.escrow_release_hours ?? 24}
                    onBlur={(e) => saveSetting("payments", { ...settings.payments, escrow_release_hours: Number(e.target.value) })} />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
              <h3 className="font-semibold mb-3">WhatsApp</h3>
              <p className="text-sm text-muted-foreground">Sprint 2 — la connexion WhatsApp Business Cloud sera activée à la prochaine étape. Les credentials Meta (token, phone number ID, verify token, app secret) devront être ajoutés en secrets Supabase.</p>
              <div className="mt-2"><Badge className={settings.whatsapp?.verified ? "bg-waouh-success/20 text-waouh-success" : "bg-waouh-warning/20 text-waouh-warning"}>{settings.whatsapp?.verified ? "Webhook vérifié" : "Webhook non configuré"}</Badge></div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Article detail modal */}
        <Dialog open={!!selectedArticle} onOpenChange={(o) => !o && setSelectedArticle(null)}>
          <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
            {selectedArticle && (
              <>
                <DialogHeader><DialogTitle>{selectedArticle.title}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  {selectedArticle.photos?.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedArticle.photos.map((p: string, i: number) => <img key={i} src={p} alt="" className="rounded border border-[hsl(var(--waouh-border))]" />)}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{selectedArticle.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Prix:</span> <span className="font-semibold text-waouh-success">{fmtXOF(Number(selectedArticle.price))}</span></div>
                    <div><span className="text-muted-foreground">Catégorie:</span> {selectedArticle.category}</div>
                    <div><span className="text-muted-foreground">Marque:</span> {selectedArticle.brand ?? "—"}</div>
                    <div><span className="text-muted-foreground">État:</span> {selectedArticle.condition}</div>
                    <div><span className="text-muted-foreground">Ville:</span> {selectedArticle.city ?? "—"}</div>
                    <div><span className="text-muted-foreground">Vues:</span> {selectedArticle.views_count}</div>
                  </div>
                  {selectedArticle.market_price_min && (
                    <div className="p-2 rounded bg-waouh-ai/10 border border-waouh-ai/30 text-sm">
                      📊 Prix marché: {fmtXOF(Number(selectedArticle.market_price_min))} – {fmtXOF(Number(selectedArticle.market_price_max ?? 0))}
                    </div>
                  )}
                  <a href={`https://wa.me/${(selectedArticle.waouh_users?.phone_number ?? "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <Button className="w-full bg-waouh-success hover:bg-waouh-success/90 text-white">
                      <ExternalLink className="w-4 h-4 mr-2" /> Contacter sur WhatsApp
                    </Button>
                  </a>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <Card className={`p-4 bg-card border-[hsl(var(--waouh-border))] hover:border-${color}/50 transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 text-${color}`} />
        <Clock className="w-3 h-3 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-xl md:text-2xl font-bold text-${color} mt-1 truncate`}>{value}</p>
    </Card>
  );
}
