import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface IACreatorChartsProps {
  stats: {
    total_images: number;
    total_flyers: number;
    total_videos: number;
    total_creations: number;
    active_users_24h: number;
    active_users_7d: number;
    active_users_30d: number;
    avg_creations_per_user: number;
  } | undefined;
}

export const IACreatorCharts: React.FC<IACreatorChartsProps> = ({ stats }) => {
  if (!stats) return null;

  const items = [
    { name: 'Images', value: stats.total_images, color: '#ec4899' },
    { name: 'Flyers', value: stats.total_flyers, color: '#8b5cf6' },
    { name: 'Vidéos', value: stats.total_videos, color: '#3b82f6' },
  ];
  const total = items.reduce((s, i) => s + i.value, 0) || 1;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Répartition par Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it) => (
            <div key={it.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: it.color }} />{it.name}</span>
                <span className="font-semibold">{it.value} ({((it.value / total) * 100).toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full" style={{ width: `${(it.value / total) * 100}%`, background: it.color }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques Globales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total créations</span>
            <span className="text-2xl font-bold">{stats.total_creations}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Utilisateurs actifs (24h)</span>
            <span className="text-2xl font-bold">{stats.active_users_24h}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Utilisateurs actifs (7j)</span>
            <span className="text-2xl font-bold">{stats.active_users_7d}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Moyenne par utilisateur</span>
            <span className="text-2xl font-bold">{stats.avg_creations_per_user.toFixed(1)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
