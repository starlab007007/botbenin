import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Source = { source: string; label: string; engine?: string | null; total: number; day: number; week: number; priced_pct: number; city_pct: number; photo_pct: number; stale: number; last_seen?: string | null };
type Tower = {
  totals: { total: number; day: number; priced_pct: number; stale: number };
  sources: Source[];
  registry: { entries: number; tested_ok: number };
  engines: { engine: string; enabled: boolean; version?: string; last_test?: string }[];
  deal_rooms: { total: number; bot: number; paused: number; week: number };
  outbound_pending: number;
};

const ago = (iso?: string | null) => {
  if (!iso) return "jamais";
  const h = Math.round((Date.now() - Date.parse(iso)) / 3_600_000);
  return h < 1 ? "il y a moins d'1 h" : h < 48 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`;
};

const JOURNEYS = [
  ["Produits / Achat", "Annonces avec prix et photo, nouvelles en 24 h"],
  ["Vente / Acheteurs", "Acheteurs joignables par annonce"],
  ["Prestataires / Services", "Fiches avec téléphone et ville"],
  ["Opportunités", "Nouvelles opportunités de la semaine"],
  ["Objets rares", "Délai avant la première piste"],
  ["Négociation / Accord", "Accords sur négociations ouvertes"],
];

export default function AdminNexusControlTowerPage() {
  const [data, setData] = useState<Tower | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setError(null);
    const { data, error } = await supabase.rpc("waouh_admin_nexus_control" as never);
    if (error) { console.error("control tower", error); setError("Le tableau n'a pas pu être chargé. Réessayez."); return; }
    setData(data as unknown as Tower);
  };
  useEffect(() => { void load(); }, []);

  if (error) return <div className="p-6 space-y-3"><p className="text-destructive">{error}</p><Button onClick={load}>Réessayer</Button></div>;
  if (!data) return <div className="p-6 text-muted-foreground">Chargement…</div>;
  const silent = data.sources.filter((s) => s.source !== "WAOUH" && s.day === 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tour de contrôle NEXUS</h1>
          <p className="text-sm text-muted-foreground">Ce que chaque source apporte aux recherches, achats, ventes, services et opportunités.</p>
        </div>
        <Button variant="outline" onClick={load}>Actualiser</Button>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Fiches", data.totals.total],
          ["Nouvelles 24 h", data.totals.day],
          ["Avec prix", `${data.totals.priced_pct ?? 0} %`],
          ["Trop anciennes", data.totals.stale],
          ["Messages en attente", data.outbound_pending],
        ].map(([k, v]) => (
          <Card key={String(k)}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-2xl font-bold">{v}</p></CardContent></Card>
        ))}
      </section>

      {(silent.length > 0 || data.outbound_pending > 0) && (
        <Card className="border-destructive/40">
          <CardHeader><CardTitle className="text-base">Alertes</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {silent.length > 0 && <p>{silent.length} source{silent.length > 1 ? "s" : ""} sans nouvelle fiche depuis 24 h : {silent.slice(0, 6).map((s) => s.label).join(", ")}{silent.length > 6 ? "…" : ""}</p>}
            {data.outbound_pending > 0 && <p>{data.outbound_pending} messages WhatsApp attendent l'envoi : reconnectez le numéro.</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Sources</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.sources.map((s) => (
            <div key={s.source} className="flex flex-col gap-2 rounded-xl border p-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.label}</p>
                <p className="text-xs text-muted-foreground">Vue {ago(s.last_seen)}{s.engine ? ` · outil : ${s.engine}` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant={s.day > 0 ? "default" : "secondary"}>{s.day} en 24 h</Badge>
                <Badge variant="outline">{s.total} fiches</Badge>
                <Badge variant="outline">prix {s.priced_pct} %</Badge>
                <Badge variant="outline">ville {s.city_pct} %</Badge>
                <Badge variant="outline">photo {s.photo_pct} %</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Annuaire des sites</CardTitle></CardHeader>
          <CardContent className="text-sm"><p className="text-3xl font-bold">{data.registry.tested_ok}/{data.registry.entries}</p><p className="text-muted-foreground">rubriques validées par un vrai test</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Outils de lecture</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">{data.engines.map((e) => <p key={e.engine} className="flex justify-between"><span>{e.engine}</span><span className="text-muted-foreground">{e.enabled ? (e.last_test === "passed" || e.last_test === "success" ? "testé ✓" : "actif") : "coupé"}</span></p>)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Négociations</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm"><p>{data.deal_rooms.week} ouvertes cette semaine</p><p>{data.deal_rooms.bot} confiées à Bot en ce moment</p><p>{data.deal_rooms.paused} en pause</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Parcours à piloter</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">{JOURNEYS.map(([j, k]) => <div key={j} className="rounded-xl border p-3"><p className="font-semibold">{j}</p><p className="text-xs text-muted-foreground">Indicateur : {k}</p></div>)}</CardContent>
      </Card>
    </div>
  );
}
