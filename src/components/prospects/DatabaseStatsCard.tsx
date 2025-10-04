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
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-lg font-semibold truncate">
                {database.name}
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                {database.description || 'Aucune description'}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 shrink-0">
            <Badge variant={database.is_active ? "default" : "secondary"} className="text-[10px] sm:text-xs">
              {database.is_active ? 'Actif' : 'Inactif'}
            </Badge>
            <Badge variant={activity.color as any} className="text-[10px] sm:text-xs">
              {activity.level}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4">
        {/* Statistiques principales */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-base sm:text-xl font-bold truncate">{database.prospect_count || 0}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Prospects</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-medium truncate">{formatDate(database.updated_at)}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Mise à jour</div>
            </div>
          </div>
        </div>

        {/* Métriques additionnelles */}
        <div className="grid grid-cols-3 gap-1 sm:gap-2 py-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Activity className="w-2 h-2 sm:w-3 sm:h-3 text-purple-500" />
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Activité</div>
            <div className="text-xs sm:text-sm font-medium truncate">{activity.level}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Target className="w-2 h-2 sm:w-3 sm:h-3 text-orange-500" />
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Conversion</div>
            <div className="text-xs sm:text-sm font-medium">-</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-2 h-2 sm:w-3 sm:h-3 text-emerald-500" />
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Croissance</div>
            <div className="text-xs sm:text-sm font-medium">-</div>
          </div>
        </div>

        {/* Actions principales */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewProspects(database)}
            className="w-full text-xs sm:text-sm"
          >
            <Users className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
            <span className="hidden sm:inline">Voir prospects</span>
            <span className="sm:hidden">Prospects</span>
          </Button>
          <Button 
            size="sm" 
            onClick={() => onEdit(database)}
            className="w-full text-xs sm:text-sm"
          >
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
            Gérer
          </Button>
        </div>

        {/* Actions secondaires */}
        <div className="grid grid-cols-3 gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onCreateCampaign(database)}
            className="w-full text-[10px] sm:text-xs px-1 sm:px-2"
          >
            <Mail className="w-3 h-3 sm:mr-1" />
            <span className="hidden sm:inline">Campagne</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onExport(database)}
            className="w-full text-[10px] sm:text-xs px-1 sm:px-2"
          >
            <Phone className="w-3 h-3 sm:mr-1" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEdit(database)}
            className="w-full text-[10px] sm:text-xs px-1 sm:px-2"
          >
            <Plus className="w-3 h-3 sm:mr-1" />
            <span className="hidden sm:inline">Actions</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};