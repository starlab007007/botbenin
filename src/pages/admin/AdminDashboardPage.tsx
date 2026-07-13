import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, Key, Activity, Settings, Palette, Database, Megaphone, Bot } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingDiffusion, setPendingDiffusion] = useState<number>(0);

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
  ];

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
              onClick={() => navigate(card.path)}
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
