import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from '@/lib/recharts-stub';

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

  const pieData = [
    { name: 'Images', value: stats.total_images, color: '#ec4899' },
    { name: 'Flyers', value: stats.total_flyers, color: '#8b5cf6' },
    { name: 'Vidéos', value: stats.total_videos, color: '#3b82f6' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Répartition par Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
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