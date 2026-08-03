import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ChevronRight, MapPin, Package, Plus, RefreshCw, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { biRepository } from '@/lib/waouh/biRepository';
import { stockRepository, isLowStock } from '@/lib/waouh/stockRepository';
import { presenceRepository } from '@/lib/waouh/presenceRepository';

export type BrickHomeKind = 'bi' | 'stock' | 'presence';

type SmartCard = {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  route: string;
};

type KindConfig = {
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  createLabel: string;
  createRoute: string;
  emptyTitle: string;
  emptyHint: string;
  load: () => Promise<{ cards: SmartCard[]; stats: { label: string; value: string }[] }>;
};

const CONFIG: Record<BrickHomeKind, KindConfig> = {
  bi: {
    label: 'BI WAOUH IA',
    description: 'Sources connectées (Google Sheet, Excel, CSV, API) et analyses IA.',
    icon: BarChart3,
    accent: 'bg-blue-100 text-blue-700',
    createLabel: 'Connecter une source',
    createRoute: '/app/agents/bi/new',
    emptyTitle: 'Aucune source de données',
    emptyHint: 'Connectez un Google Sheet, un fichier Excel/CSV ou une API pour lancer vos analyses.',
    load: async () => {
      const sources = await biRepository.fetchSources().catch(() => []);
      let rows = 0;
      for (const source of sources) rows += source.row_count ?? 0;

      return {
        cards: sources.map((source) => ({
          id: source.id,
          title: source.name,
          subtitle: `${source.source_type} · ${source.row_count ?? 0} lignes · ${source.column_count ?? 0} colonnes`,
          badge: source.status ?? undefined,
          route: `/app/agents/bi/${source.id}`,
        })),
        stats: [
          { label: 'Sources', value: String(sources.length) },
          { label: 'Lignes analysées', value: String(rows) },
        ],
      };
    },
  },
  stock: {
    label: 'Stock WAOUH IA',
    description: 'Produits, niveaux, alertes de rupture et recommandations de réapprovisionnement.',
    icon: Package,
    accent: 'bg-amber-100 text-amber-700',
    createLabel: 'Ajouter un produit',
    createRoute: '/app/agents/stock/new',
    emptyTitle: 'Aucun produit suivi',
    emptyHint: 'Ajoutez vos produits pour activer les alertes de rupture et les analyses IA.',
    load: async () => {
      const products = await stockRepository.fetchProducts().catch(() => []);
      const low = products.filter((product) => isLowStock(product));
      return {
        cards: products.slice(0, 12).map((product) => ({
          id: product.id,
          title: product.nom,
          subtitle: `${product.stock_estime ?? 0} ${product.unite || 'unité(s)'} · seuil ${product.stock_minimum ?? 0}`,
          badge: isLowStock(product) ? 'Réappro' : undefined,
          route: '/app/agents/stock',
        })),
        stats: [
          { label: 'Produits', value: String(products.length) },
          { label: 'Alertes stock', value: String(low.length) },
        ],
      };
    },
  },
  presence: {
    label: 'Présence QR',
    description: 'Sites, QR géolocalisés (50 m) et pointages notifiés sur WhatsApp.',
    icon: MapPin,
    accent: 'bg-fuchsia-100 text-fuchsia-700',
    createLabel: 'Créer un site',
    createRoute: '/app/agents/attendance/new',
    emptyTitle: 'Aucun site de présence',
    emptyHint: 'Créez un site pour générer son QR code et suivre les arrivées et sorties.',
    load: async () => {
      const sites = await presenceRepository.fetchSites().catch(() => []);
      return {
        cards: sites.map((site) => ({
          id: site.id,
          title: site.name,
          subtitle: `${site.address || 'Adresse non renseignée'} · rayon ${site.radius_meters} m`,
          badge: site.require_geolocation ? 'Géolocalisé' : undefined,
          route: `/app/agents/attendance/${site.id}`,
        })),
        stats: [{ label: 'Sites', value: String(sites.length) }],
      };
    },
  },
};

/**
 * Grille de cartes « smart » identique au parcours Flutter :
 * compteurs live issus de Supabase, puis ouverture du tableau de bord concerné.
 */
export const BrickHome = ({ kind }: { kind: BrickHomeKind }) => {
  const navigate = useNavigate();
  const config = CONFIG[kind];
  const Icon = config.icon;

  const [cards, setCards] = useState<SmartCard[]>([]);
  const [stats, setStats] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    config
      .load()
      .then((result) => {
        if (cancelled) return;
        setCards(result.cards);
        setStats(result.stats);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config, kind]);

  const reload = () => {
    setLoading(true);
    config.load().then((result) => {
      setCards(result.cards);
      setStats(result.stats);
      setLoading(false);
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${config.accent}`}>
            <Icon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{config.label}</h2>
            <p className="max-w-xl text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : undefined} />
            Actualiser
          </Button>
          <Button type="button" size="sm" onClick={() => navigate(config.createRoute)}>
            <Plus size={15} />
            {config.createLabel}
          </Button>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => navigate(card.route)}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-accent/40"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-foreground">{card.title}</span>
                {card.badge && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">{card.subtitle}</p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      {!loading && cards.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
          <h3 className="font-medium text-foreground">{config.emptyTitle}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{config.emptyHint}</p>
          <Button type="button" className="mt-4" onClick={() => navigate(config.createRoute)}>
            <Plus size={16} />
            {config.createLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export const BiBrickHome = () => <BrickHome kind="bi" />;
export const StockBrickHome = () => <BrickHome kind="stock" />;
export const PresenceBrickHome = () => <BrickHome kind="presence" />;

export default BrickHome;
