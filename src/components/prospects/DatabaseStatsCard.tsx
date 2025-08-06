import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  Users, 
  TrendingUp, 
  Calendar,
  BarChart3,
  Mail,
  Phone,
  Target,
  Activity,
  Plus
} from 'lucide-react';
import { ProspectDatabase } from '@/hooks/useProspectDatabases';

interface DatabaseStatsCardProps {
  database: ProspectDatabase;
  onEdit: (database: ProspectDatabase) => void;
  onViewProspects: (database: ProspectDatabase) => void;
  onCreateCampaign: (database: ProspectDatabase) => void;
  onExport: (database: ProspectDatabase) => void;
}

export const DatabaseStatsCard: React.FC<DatabaseStatsCardProps> = ({
  database,
  onEdit,
  onViewProspects,
  onCreateCampaign,
  onExport
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getActivityLevel = (count: number) => {
    if (count === 0) return { level: 'Aucune', color: 'secondary' };
    if (count < 10) return { level: 'Faible', color: 'destructive' };
    if (count < 50) return { level: 'Modérée', color: 'default' };
    return { level: 'Élevée', color: 'default' };
  };

  const activity = getActivityLevel(database.prospect_count || 0);

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold truncate">
                {database.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {database.description || 'Aucune description'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={database.is_active ? "default" : "secondary"}>
              {database.is_active ? 'Actif' : 'Inactif'}
            </Badge>
            <Badge variant={activity.color as any}>
              {activity.level}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistiques principales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-xl font-bold">{database.prospect_count || 0}</div>
              <div className="text-xs text-muted-foreground">Prospects</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-sm font-medium">{formatDate(database.updated_at)}</div>
              <div className="text-xs text-muted-foreground">Mise à jour</div>
            </div>
          </div>
        </div>

        {/* Métriques additionnelles */}
        <div className="grid grid-cols-3 gap-2 py-2 border-t border-gray-100">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Activity className="w-3 h-3 text-purple-500" />
            </div>
            <div className="text-xs text-muted-foreground">Activité</div>
            <div className="text-sm font-medium">{activity.level}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Target className="w-3 h-3 text-orange-500" />
            </div>
            <div className="text-xs text-muted-foreground">Conversion</div>
            <div className="text-sm font-medium">-</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
            </div>
            <div className="text-xs text-muted-foreground">Croissance</div>
            <div className="text-sm font-medium">-</div>
          </div>
        </div>

        {/* Actions principales */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewProspects(database)}
            className="w-full"
          >
            <Users className="w-4 h-4 mr-1" />
            Voir prospects
          </Button>
          <Button 
            size="sm" 
            onClick={() => onEdit(database)}
            className="w-full"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Gérer
          </Button>
        </div>

        {/* Actions secondaires */}
        <div className="grid grid-cols-3 gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onCreateCampaign(database)}
            className="w-full text-xs"
          >
            <Mail className="w-3 h-3 mr-1" />
            Campagne
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onExport(database)}
            className="w-full text-xs"
          >
            <Phone className="w-3 h-3 mr-1" />
            Export
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEdit(database)}
            className="w-full text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Actions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};