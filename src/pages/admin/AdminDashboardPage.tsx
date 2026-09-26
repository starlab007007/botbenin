import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, Key, Activity, Settings, Palette, Database, Megaphone, Bot, GraduationCap, Sparkles, PackageOpen, ArrowLeft, Network, MessageSquareText, HeartPulse, History, Truck, SlidersHorizontal, Handshake, Building2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminPrivatAIPage from './AdminPrivatAIPage';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingDiffusion, setPendingDiffusion] = useState<number>(0);
  const [showPrivatAI, setShowPrivatAI] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { count } = await supabase
        .from('waouh_diffusion_approvals' as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (alive) setPendingDiffusion(count ?? 0);
    };
    load();
    const ch = supabase
      .channel('admin-diffusion-approvals-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waouh_diffusion_approvals' }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  const waouhAccessGroups = [
    {
      title: 'Pilotage & diagnostic',
      items: [
        { label: 'Centre de contrôle', path: '/admin/waouh?tab=control', note: 'État global, alertes et kill switches', icon: Activity },
        { label: 'Monitoring temps réel', path: '/admin/waouh/monitoring', note: 'Santé et métriques opérationnelles', icon: Activity },
        { label: 'Health Check', path: '/admin/waouh/health-check', note: 'Divergences, synchronisation et anomalies', icon: HeartPulse },
        { label: 'Historique & traces', path: '/admin/waouh/historique', note: 'Chat, négociations, queue et traces', icon: History },
        { label: 'Deal Ops', path: '/admin/waouh/deals', note: 'Deals, livraison, paiement et arbitrage', icon: Truck },
      ],
    },
    {
      title: 'Architecture de contrôle WAOUH',
      items: [
        { label: 'NEXUS', path: '/admin/waouh/radar', note: 'Signal Fabric, sources, quotas, scans et automatisation', icon: Network },
        { label: 'Contact Layer C0–C4', path: '/admin/waouh/contact-layer', note: 'Contactabilité, consentement et politique par source', icon: Shield },
        { label: 'Avatar Commerce', path: '/admin/waouh?tab=control#module-avatar_commerce', note: 'ON/OFF du parcours Acheter / Vendre / Demander', icon: Sparkles },
        { label: 'Chat Web / App', path: '/admin/waouh?tab=control#module-chat_web', note: 'Canal, activité 24 h et fils actifs', icon: MessageSquareText },
        { label: 'WhatsApp', path: '/admin/waouh/whatsapp-ops', note: 'WAHA, sessions, queue, erreurs et replay', icon: MessageSquareText },
        { label: 'Muse / Agents IA', path: '/admin/waouh?tab=control#module-muse_agents', note: 'Missions, approvals, erreurs, outbox et automatisation', icon: Bot },
        { label: 'Négociation', path: '/admin/waouh?tab=control#module-negotiation', note: 'Propositions, contre-propositions, acceptations et stagnation', icon: SlidersHorizontal },
        { label: 'Deal Room / Deal Graph', path: '/admin/waouh/deals', note: 'Deals, paiement, livraison, litiges et actions de secours', icon: Truck },
        { label: 'Outbound', path: '/admin/waouh?tab=control#module-outbound', note: 'Pending, sent, failed, auto et dispatch manuel', icon: ExternalLink },
        { label: 'Diffusion', path: '/admin/waouh/diffusion-approvals', note: 'Validation humaine des demandes en attente', icon: Megaphone },
        { label: 'SMS / RCS', path: '/admin/waouh/native-messaging', note: 'Provider, SMS, RCS et fallback vers SMS', icon: MessageSquareText },
        { label: 'Partenaires', path: '/admin/waouh/partners', note: 'Activité, catalogue, permissions et entreprises', icon: Handshake },
        { label: 'Données unifiées', path: '/admin/waouh/data-control', note: 'Qualité, contacts, catalogue et incohérences', icon: Database },
      ],
    },
    {
      title: 'Paramétrage & opérations',
      items: [
        { label: 'Paramètres généraux', path: '/admin/waouh?tab=settings', note: 'IA, commerce, paiement et règles', icon: SlidersHorizontal },
        { label: 'Monitoring temps réel', path: '/admin/waouh/monitoring', note: 'Santé et métriques opérationnelles', icon: Activity },
        { label: 'Health Check', path: '/admin/waouh/health-check', note: 'Divergences, synchronisation et anomalies', icon: HeartPulse },
        { label: 'Historique & traces', path: '/admin/waouh/historique', note: 'Chat, négociations, outbound et traces', icon: History },
      ],
    },
    {
      title: 'Données & écosystème',
      items: [
        { label: 'Catalogue & données', path: '/admin/waouh/data-control', note: 'Qualité, normalisation et contrôle IA', icon: Database },
        { label: 'Partenaires', path: '/admin/waouh/partners', note: 'Partenaires et permissions', icon: Handshake },
        { label: 'Commerces', path: '/admin/waouh/businesses', note: 'Entreprises, catalogues et vérification', icon: Building2 },
        { label: 'Démo / recette', path: '/admin/waouh/demo', note: 'Parcours de démonstration', icon: Sparkles },
      ],
    },
  ];

  const adminCards = [
    {
      title: 'Gestion des Utilisateurs',
      description: 'Gérer les comptes utilisateurs et leurs statuts',
      icon: Users,
      path: '/admin/users',
      color: 'text-blue-500',
    },
    {
      title: 'Gestion des Rôles',
      description: 'Créer et modifier les rôles système',
      icon: Shield,
      path: '/admin/roles',
      color: 'text-purple-500',
    },
    {
      title: 'Gestion des Permissions',
      description: 'Configurer les permissions granulaires',
      icon: Key,
      path: '/admin/permissions',
      color: 'text-green-500',
    },
    {
      title: 'Contrôle Bots & Agents IA',
      description: 'Superviser bots, agents IA (BI, Stock, Présence QR) et sessions WhatsApp',
      icon: Bot,
      path: '/admin/bots-control',
      color: 'text-cyan-500',
    },
    {
      title: 'PrivatAI — Administration',
      description: 'Publier DMG/EXE/MSI, gérer l’essai 7 jours, licences, appareils, révocations et journal',
      icon: PackageOpen,
      path: '__privatai__',
      color: 'text-violet-500',
    },
    {
      title: 'Logs d\'Activité',
      description: 'Consulter l\'historique des actions',
      icon: Activity,
      path: '/admin/logs',
      color: 'text-orange-500',
    },
    {
      title: 'IA Créateur Pro',
      description: 'Gérer le module de création visuelle IA',
      icon: Palette,
      path: '/admin/ia-creator',
      color: 'text-pink-500',
    },
    {
      title: 'Bases de Connaissances',
      description: 'Gérer toutes les bases de connaissances',
      icon: Database,
      path: '/admin/knowledge-bases',
      color: 'text-teal-500',
    },
    {
      title: 'Diffusion IA — Validation',
      description: 'Vérifier et approuver les campagnes de diffusion IA (audience, message, quota)',
      icon: Megaphone,
      path: '/admin/waouh/diffusion-approvals',
      color: 'text-emerald-500',
      badge: pendingDiffusion,
    },
    {
      title: 'Après BAC IA — Suivi',
      description: 'Suivi des chats IA d\'orientation post-BAC : KPIs, sessions, séries, top filières, OCR',
      icon: GraduationCap,
      path: '/admin/apresbac',
      color: 'text-indigo-500',
    },
    {
      title: 'FA IA — Suivi & Codes',
      description: 'Consultations bot.bj/fa, codes d\'accès 6 chiffres, quotas quotidiens et statistiques',
      icon: Sparkles,
      path: '/admin/fa',
      color: 'text-amber-500',
    },
  ];

  if (showPrivatAI) {
    return (
      <div>
        <div className="container mx-auto px-4 pt-6">
          <Button variant="outline" onClick={() => setShowPrivatAI(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />Retour au dashboard admin
          </Button>
        </div>
        <AdminPrivatAIPage />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard Admin</h1>
        <p className="text-muted-foreground">
          Bienvenue {user?.email} - Gestion complète du système
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {adminCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.path}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => card.path === '__privatai__' ? setShowPrivatAI(true) : navigate(card.path)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Icon className={`h-8 w-8 ${card.color}`} />
                  {(card as any).badge && (card as any).badge > 0 ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                      {(card as any).badge} en attente
                    </Badge>
                  ) : (
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="mt-4">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  {(card as any).badge && (card as any).badge > 0 ? 'Vérifier & Valider' : 'Accéder'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mb-8 border-cyan-200">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>WAOUH — chemins d’accès administration</CardTitle>
              <CardDescription className="mt-1">
                Accès directs aux réglages, consoles de suivi et outils de contrôle. Les routes sont affichées pour qu’aucun paramétrage ne reste caché.
              </CardDescription>
            </div>
            <Button onClick={() => navigate('/admin/waouh?tab=control')}>
              <Activity className="h-4 w-4 mr-2" />Ouvrir WAOUH Command Center
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          {waouhAccessGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full rounded-xl border bg-background px-3 py-3 text-left transition-all hover:border-cyan-300 hover:bg-cyan-50/40 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg border bg-muted/30 p-2">
                        <Icon className="h-4 w-4 text-cyan-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{item.label}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{item.note}</div>
                        <code className="mt-1 block truncate text-[10px] text-slate-500">{item.path}</code>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">--</div>
              <div className="text-sm text-muted-foreground">Utilisateurs Total</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">--</div>
              <div className="text-sm text-muted-foreground">Rôles Actifs</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">--</div>
              <div className="text-sm text-muted-foreground">Permissions</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
