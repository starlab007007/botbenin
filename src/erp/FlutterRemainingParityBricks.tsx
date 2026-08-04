import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  BookOpenText,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Loader2,
  MapPin,
  MessageSquareText,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { AgentsSection } from '@/components/whatsapp/agents/AgentsSection';
import { useMobileAuth } from '@/app-mobile/hooks/useMobileAuth';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { cn } from '@/lib/utils';

type ModuleAction = {
  title: string;
  description: string;
  icon: LucideIcon;
  route?: string;
  accent?: string;
};

function ShellParityFrame({
  title,
  subtitle,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50/60 p-5 md:p-7">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-3xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(165_91%_25%)] text-white shadow-sm">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

function ActionGrid({ actions }: { actions: ModuleAction[] }) {
  const navigate = useNavigate();
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {actions.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            type="button"
            onClick={() => item.route && navigate(item.route)}
            className={cn(
              'rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
              item.accent,
            )}
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(165_91%_25%)]/10 text-[hsl(165_91%_25%)]">
              <Icon className="h-5 w-5" />
            </div>
            <div className="font-semibold text-slate-950">{item.title}</div>
            <p className="mt-1 text-sm leading-snug text-slate-500">{item.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold text-slate-950">{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

const agentActions: ModuleAction[] = [
  { title: 'Conversationnel', description: 'Agent WhatsApp pour vendre, répondre, prendre RDV et relancer.', icon: MessageSquareText, route: '/app/bots/new' },
  { title: 'BI / Analyse', description: 'Agent d’analyse Google Sheet, Excel, CSV et API.', icon: BarChart3, route: '/app/agents/bi/new' },
  { title: 'Stock WAOUH IA', description: 'Agent stock, produits, alertes et réapprovisionnement intelligent.', icon: Package, route: '/app/agents/stock/new' },
  { title: 'Présence QR', description: 'Sites, QR géolocalisés, check-in et notifications WhatsApp.', icon: QrCode, route: '/app/agents/attendance/new' },
];

export function AgentsIaParityBrick() {
  return (
    <ShellParityFrame
      title="Agents IA"
      subtitle="Même contenu que Flutter : agents conversationnels, BI, stock et présence QR."
      icon={Sparkles}
      action={<Button className="bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]"><Plus className="mr-2 h-4 w-4" /> Nouvel agent</Button>}
    >
      <ActionGrid actions={agentActions} />
      <AgentsSection />
    </ShellParityFrame>
  );
}

export function ConversationalParityBrick() {
  const navigate = useNavigate();
  return (
    <ShellParityFrame
      title="Conversationnel"
      subtitle="Agent IA WhatsApp : catalogue, ton, réponses automatiques, transfert humain et suivi."
      icon={MessageSquareText}
      action={<Button onClick={() => navigate('/app/bots/new')} className="bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]"><Plus className="mr-2 h-4 w-4" /> Créer l’agent</Button>}
    >
      <ActionGrid
        actions={[
          { title: 'Catalogue & produits', description: 'L’agent répond selon les produits, prix, disponibilités et conditions.', icon: Package },
          { title: 'Ton commercial', description: 'Personnalité, langue, style de réponse et règles de négociation.', icon: Bot },
          { title: 'WhatsApp connecté', description: 'Liaison avec une session WAHA active pour répondre aux clients.', icon: MessageSquareText },
          { title: 'Main humaine', description: 'Escalade et reprise manuelle si le client demande un humain.', icon: Users },
        ]}
      />
      <AgentsSection />
    </ShellParityFrame>
  );
}

export function BiWaouhParityBrick() {
  return (
    <ShellParityFrame
      title="BI WAOUH IA"
      subtitle="Même parcours Flutter : source de données, lignes importées, indicateurs et lecture IA."
      icon={BarChart3}
      action={<Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Actualiser</Button>}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Sources" value="CSV · Excel · Sheet · API" icon={FileText} />
        <MetricCard label="Analyse" value="IA" icon={Sparkles} />
        <MetricCard label="Rapports" value="Temps réel" icon={BarChart3} />
      </div>
      <ActionGrid
        actions={[
          { title: 'Importer les données', description: 'Fichiers CSV, Excel, Google Sheets ou API métier.', icon: FileText, route: '/app/agents/bi/new' },
          { title: 'Visualiser', description: 'Graphiques, KPI, comparaisons et tendances.', icon: BarChart3 },
          { title: 'Demander à l’IA', description: 'Lecture intelligente des anomalies et recommandations.', icon: Sparkles },
          { title: 'Exporter le rapport', description: 'Préparer une synthèse exploitable pour décision.', icon: ClipboardCheck },
        ]}
      />
      <Card>
        <CardHeader><CardTitle>Lecture décisionnelle</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Cette brique Web reprend le contenu fonctionnel Flutter : importer, analyser, visualiser et demander une interprétation IA.</p>
          <Progress value={45} />
          <p>Connectez une source pour afficher les lignes, les indicateurs et les recommandations.</p>
        </CardContent>
      </Card>
    </ShellParityFrame>
  );
}

export function StockWaouhParityBrick() {
  const { partner } = useWaouhPartner();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!partner?.id) return;
      setLoading(true);
      const { data: businesses } = await supabase
        .from('waouh_partner_businesses' as any)
        .select('id')
        .eq('partner_id', partner.id);
      const ids = ((businesses ?? []) as any[]).map((row) => row.id).filter(Boolean);
      if (!ids.length) {
        if (mounted) { setProducts([]); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from('waouh_partner_products' as any)
        .select('*')
        .in('business_id', ids)
        .order('created_at', { ascending: false })
        .limit(100);
      if (mounted) { setProducts((data as any[]) ?? []); setLoading(false); }
    };
    void run();
    return () => { mounted = false; };
  }, [partner?.id]);

  const lowStock = products.filter((p) => Number(p.stock ?? p.quantity ?? 0) <= Number(p.alert_threshold ?? 0)).length;
  return (
    <ShellParityFrame
      title="Stock WAOUH IA"
      subtitle="Même logique Flutter : produits, disponibilité, alertes et recommandations de réapprovisionnement."
      icon={Package}
      action={<Button variant="outline" onClick={() => window.location.reload()}><RefreshCw className="mr-2 h-4 w-4" /> Recharger</Button>}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Produits" value={loading ? '…' : products.length} icon={Package} />
        <MetricCard label="Alertes" value={loading ? '…' : lowStock} icon={ClipboardCheck} />
        <MetricCard label="IA stock" value="Active" icon={Sparkles} />
      </div>
      <Card>
        <CardHeader><CardTitle>Produits suivis</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Chargement…</div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucun produit stock trouvé. Ajoutez vos produits depuis Boutiques & magasins.</div>
          ) : (
            products.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-2xl border bg-white p-4">
                <div className="min-w-0"><strong className="truncate">{p.name ?? p.nom ?? p.title ?? 'Produit'}</strong><p className="text-xs text-muted-foreground">{p.category ?? p.categorie ?? 'Stock'} · {Number(p.price ?? p.prix ?? 0).toLocaleString()} FCFA</p></div>
                <Badge variant="secondary">Stock {p.stock ?? p.quantity ?? '—'}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </ShellParityFrame>
  );
}

export function PresenceQrParityBrick() {
  return (
    <ShellParityFrame
      title="Présence QR"
      subtitle="Même contenu Flutter : sites, QR géolocalisés, pointages et notifications WhatsApp."
      icon={QrCode}
      action={<Button className="bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]"><Plus className="mr-2 h-4 w-4" /> Nouveau site</Button>}
    >
      <ActionGrid
        actions={[
          { title: 'Sites de présence', description: 'Créer les sites, zones ou agences à contrôler.', icon: Building2, route: '/app/agents/attendance/new' },
          { title: 'QR géolocalisé', description: 'QR unique avec contrôle de position et heure.', icon: QrCode },
          { title: 'Pointages', description: 'Entrées, sorties, retard et présence terrain.', icon: ClipboardCheck },
          { title: 'Notifications WhatsApp', description: 'Alerte automatique aux responsables.', icon: MessageSquareText },
        ]}
      />
      <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Configurez un site pour générer le QR et commencer les pointages.</CardContent></Card>
    </ShellParityFrame>
  );
}

function usePartnerBusinesses() {
  const { partner } = useWaouhPartner();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!partner?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('waouh_partner_businesses' as any)
        .select('*')
        .eq('partner_id', partner.id)
        .order('created_at', { ascending: false });
      if (mounted) { setItems((data as any[]) ?? []); setLoading(false); }
    };
    void run();
    return () => { mounted = false; };
  }, [partner?.id]);
  return { items, loading, partner };
}

export function StoresParityBrick() {
  const { items, loading } = usePartnerBusinesses();
  const navigate = useNavigate();
  return (
    <ShellParityFrame
      title="Boutiques & magasins"
      subtitle="Même contenu Flutter : enrôlement, modification, statut, ville, téléphone et produits."
      icon={Store}
      action={<Button onClick={() => navigate('/app/partner/businesses')} className="bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]"><Plus className="mr-2 h-4 w-4" /> Enrôler</Button>}
    >
      <MetricCard label="Entreprises" value={loading ? '…' : items.length} icon={Store} />
      <Card>
        <CardHeader><CardTitle>Mes entreprises</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Chargement…</div> : items.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune entreprise. Enrôlez une boutique ou un magasin pour commencer.</div> : items.map((b) => (
            <div key={b.id} className="flex flex-col gap-2 rounded-2xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
              <div><strong>{b.nom_entreprise ?? b.name ?? 'Entreprise'}</strong><p className="text-xs text-muted-foreground">{b.categorie ?? 'Commerce'} · {b.ville ?? 'Ville non renseignée'}{b.quartier ? ` · ${b.quartier}` : ''}</p></div>
              <div className="flex items-center gap-2"><Badge>{b.statut ?? 'active'}</Badge><Button size="sm" variant="outline" onClick={() => navigate(b.code_court ? `/app/partner/b/${b.code_court}/produits` : `/app/partner/businesses/${b.id}/products`)}><Package className="mr-1 h-3.5 w-3.5" /> Produits</Button></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </ShellParityFrame>
  );
}

export function SalesParityBrick() {
  const { partner } = useWaouhPartner();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!partner?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('waouh_partner_sales' as any)
        .select('*')
        .eq('partner_id', partner.id)
        .order('date_vente', { ascending: false });
      if (mounted) { setSales((data as any[]) ?? []); setLoading(false); }
    };
    void run();
    return () => { mounted = false; };
  }, [partner?.id]);

  const total = sales.reduce((sum, item) => sum + Number(item.commission_partner || 0), 0);
  return (
    <ShellParityFrame title="Ventes" subtitle="Même contenu Flutter : ventes attribuées, source, statut et commission partenaire." icon={TrendingUp}>
      <div className="grid gap-4 md:grid-cols-3"><MetricCard label="Ventes" value={loading ? '…' : sales.length} icon={TrendingUp} /><MetricCard label="Commissions" value={`${total.toLocaleString()} F`} icon={CheckCircle2} /><MetricCard label="Traçabilité" value="Source" icon={ClipboardCheck} /></div>
      <Card><CardHeader><CardTitle>Mes ventes & commissions</CardTitle></CardHeader><CardContent className="space-y-3">
        {loading ? <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Chargement…</div> : sales.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune vente attribuée pour l’instant.</div> : sales.map((sale) => <div key={sale.id} className="flex items-center justify-between rounded-2xl border bg-white p-4"><div><strong>{Number(sale.montant_vente || 0).toLocaleString()} F</strong><p className="text-xs text-muted-foreground">{new Date(sale.date_vente).toLocaleDateString('fr-FR')} · source {sale.source ?? '—'}</p></div><Badge>{sale.statut ?? 'pending'}</Badge><span className="font-semibold text-[hsl(165_91%_25%)]">+{Number(sale.commission_partner || 0).toLocaleString()} F</span></div>)}
      </CardContent></Card>
    </ShellParityFrame>
  );
}

export function PartnerParityBrick() {
  const { partner, loading } = useWaouhPartner();
  const navigate = useNavigate();
  return (
    <ShellParityFrame
      title="Partenaires"
      subtitle="Même logique Flutter : création automatique du partenaire puis accès direct aux boutiques et ventes."
      icon={Users}
      action={<Button onClick={() => navigate('/app/partner/businesses')} className="bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]"><Store className="mr-2 h-4 w-4" /> Ouvrir mes boutiques</Button>}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Statut" value={loading ? '…' : partner ? 'Actif' : 'À créer'} icon={CheckCircle2} />
        <MetricCard label="Boutiques" value="Commerce" icon={Store} />
        <MetricCard label="Commissions" value="Ventes" icon={TrendingUp} />
      </div>
      <ActionGrid actions={[{ title: 'Boutiques & magasins', description: 'Enrôler et gérer les points de vente.', icon: Store, route: '/app/partner/businesses' }, { title: 'Ventes', description: 'Suivre les ventes attribuées et les commissions.', icon: TrendingUp, route: '/app/partner/sales' }, { title: 'Produits', description: 'Publier les articles associés à chaque boutique.', icon: Package, route: '/app/partner/businesses' }, { title: 'Traçabilité', description: 'Conserver la source et le statut des opérations.', icon: ClipboardCheck }]} />
    </ShellParityFrame>
  );
}

export function ApresBacParityBrick() {
  return (
    <ShellParityFrame
      title="AprèsBac IA"
      subtitle="Même contenu Flutter : profil, orientation, filières, recommandations et accompagnement IA."
      icon={GraduationCap}
      action={<Button className="bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]"><Sparkles className="mr-2 h-4 w-4" /> Démarrer l’orientation</Button>}
    >
      <ActionGrid actions={[{ title: 'Profil candidat', description: 'Série, notes, centres d’intérêt, contraintes et objectifs.', icon: Users }, { title: 'Éligibilité', description: 'Analyse des conditions d’accès aux filières et établissements.', icon: ClipboardCheck }, { title: 'Recommandations', description: 'Filières, écoles et parcours adaptés au profil.', icon: GraduationCap }, { title: 'Assistant IA', description: 'Questions/réponses et explication des choix proposés.', icon: Sparkles }]} />
      <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Renseignez le profil pour générer les recommandations AprèsBac IA.</CardContent></Card>
    </ShellParityFrame>
  );
}

export function FaIaParityBrick() {
  return (
    <ShellParityFrame
      title="FA IA"
      subtitle="Même contenu Flutter : consultation, lancer sécurisé, signe, interprétation et journal privé."
      icon={BookOpenText}
      action={<Button className="bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]"><Sparkles className="mr-2 h-4 w-4" /> Nouvelle consultation</Button>}
    >
      <ActionGrid actions={[{ title: 'Consultation', description: 'Poser une intention claire avant le lancer.', icon: MessageSquareText }, { title: 'Lancer sécurisé', description: 'Animation et révélation finale du signe.', icon: Sparkles }, { title: 'Interprétation', description: 'Lecture approfondie selon le signe et le contexte.', icon: BookOpenText }, { title: 'Journal privé', description: 'Historique personnel des consultations.', icon: FileText }]} />
      <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">La brique Web conserve le parcours Flutter FA IA sans importer d’écran mobile fixe dans le shell ERP.</CardContent></Card>
    </ShellParityFrame>
  );
}
