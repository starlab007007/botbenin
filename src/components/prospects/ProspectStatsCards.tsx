import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX,
  TrendingUp,
  Target,
  Phone,
  Mail
} from 'lucide-react';

interface ProspectStatsCardsProps {
  stats: {
    totalProspects: number;
    newProspects: number;
    contactedProspects: number;
    qualifiedProspects: number;
    convertedProspects: number;
    avgScore: number;
  };
}

export const ProspectStatsCards: React.FC<ProspectStatsCardsProps> = ({ stats }) => {
  const statItems = [
    {
      title: 'Total Prospects',
      value: stats.totalProspects,
      icon: Users,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
      bgColor: 'bg-blue-600',
      change: '+12%',
      description: 'Prospects totaux'
    },
    {
      title: 'Nouveaux',
      value: stats.newProspects,
      icon: UserPlus,
      color: 'bg-green-50 text-green-600 border-green-200',
      bgColor: 'bg-green-600',
      change: '+5',
      description: 'Cette semaine'
    },
    {
      title: 'Contactés',
      value: stats.contactedProspects,
      icon: Phone,
      color: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      bgColor: 'bg-yellow-600',
      change: '+8',
      description: 'En cours'
    },
    {
      title: 'Qualifiés',
      value: stats.qualifiedProspects,
      icon: UserCheck,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
      bgColor: 'bg-purple-600',
      change: '+3',
      description: 'Prêts à convertir'
    },
    {
      title: 'Convertis',
      value: stats.convertedProspects,
      icon: Target,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      bgColor: 'bg-emerald-600',
      change: '+2',
      description: 'Clients acquis'
    },
    {
      title: 'Score Moyen',
      value: `${stats.avgScore}%`,
      icon: TrendingUp,
      color: 'bg-orange-50 text-orange-600 border-orange-200',
      bgColor: 'bg-orange-600',
      change: '+5%',
      description: 'Qualité globale'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {statItems.map((item, index) => (
        <Card key={index} className={`hover:shadow-md transition-all duration-200 border-l-4 ${item.color.split(' ')[2]}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-xs">
                {item.change}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {item.title}
              </p>
              <p className="text-2xl font-bold text-foreground mb-1">
                {typeof item.value === 'string' ? item.value : item.value.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};