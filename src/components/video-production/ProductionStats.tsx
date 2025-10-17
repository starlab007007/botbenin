import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ProductionStats as Stats } from '@/types/video-production';
import { Circle, Loader2, CheckCircle, Play } from 'lucide-react';

interface ProductionStatsProps {
  stats: Stats;
}

export const ProductionStats: React.FC<ProductionStatsProps> = ({ stats }) => {
  const statItems = [
    {
      label: 'Total',
      value: stats.total,
      icon: Circle,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      label: 'À produire',
      value: stats.toProduceCount,
      icon: Circle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    {
      label: 'En production',
      value: stats.inProgressCount,
      icon: Loader2,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Terminées',
      value: stats.completedCount,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Publiées',
      value: stats.publishedCount,
      icon: Play,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  const completionPercentage = stats.total > 0 
    ? Math.round((stats.publishedCount / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statItems.map((item) => (
          <Card key={item.label} className={item.bgColor}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-background/50`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progression globale</span>
              <span className="font-bold text-primary">{completionPercentage}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.publishedCount} vidéo{stats.publishedCount > 1 ? 's' : ''} publiée{stats.publishedCount > 1 ? 's' : ''} sur {stats.total}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
