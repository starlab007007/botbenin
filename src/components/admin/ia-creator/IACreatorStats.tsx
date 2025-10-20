import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Users, HardDrive, AlertCircle } from 'lucide-react';

interface IACreatorStatsProps {
  stats: {
    total_creations: number;
    total_users: number;
    active_users_24h: number;
    active_users_7d: number;
    total_images: number;
    total_flyers: number;
    total_videos: number;
    creations_this_month: number;
    total_storage_used_gb: number;
    pending_moderation: number;
    flagged_creations: number;
  } | undefined;
}

export const IACreatorStats: React.FC<IACreatorStatsProps> = ({ stats }) => {
  if (!stats) return null;

  const statCards = [
    {
      title: 'Créations Totales',
      value: stats.total_creations.toLocaleString(),
      subtitle: `${stats.creations_this_month} ce mois`,
      icon: Palette,
      color: 'text-pink-500',
    },
    {
      title: 'Utilisateurs Actifs',
      value: stats.active_users_24h.toLocaleString(),
      subtitle: `${stats.active_users_7d} sur 7j`,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Stockage Utilisé',
      value: `${stats.total_storage_used_gb.toFixed(2)} GB`,
      subtitle: `Images: ${stats.total_images}, Flyers: ${stats.total_flyers}`,
      icon: HardDrive,
      color: 'text-green-500',
    },
    {
      title: 'Modération',
      value: stats.pending_moderation.toLocaleString(),
      subtitle: `${stats.flagged_creations} signalés`,
      icon: AlertCircle,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};