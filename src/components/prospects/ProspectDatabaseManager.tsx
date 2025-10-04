import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Search, 
  Filter, 
  Plus, 
  BarChart3, 
  Download,
  TrendingUp,
  Users,
  Activity,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { DatabaseStatsCard } from './DatabaseStatsCard';
import { CreateDatabaseModal } from './CreateDatabaseModal';
import { ProspectDatabase, useProspectDatabases } from '@/hooks/useProspectDatabases';
import { useToast } from '@/hooks/use-toast';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PermissionButton } from '@/components/auth/PermissionButton';

export const ProspectDatabaseManager: React.FC = () => {
  const { databases, isLoading, stats, refreshDatabases } = useProspectDatabases();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const { toast } = useToast();

  const filteredDatabases = databases.filter(db => {
    const matchesSearch = db.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (db.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && db.is_active) ||
                         (filterStatus === 'inactive' && !db.is_active);
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (database: ProspectDatabase) => {
    toast({
      title: "Fonctionnalité en développement",
      description: `Édition de la base "${database.name}" sera bientôt disponible.`,
    });
  };

  const handleViewProspects = (database: ProspectDatabase) => {
    toast({
      title: "Fonctionnalité en développement", 
      description: `Visualisation des prospects de "${database.name}" sera bientôt disponible.`,
    });
  };

  const handleCreateCampaign = (database: ProspectDatabase) => {
    toast({
      title: "Fonctionnalité en développement",
      description: `Création de campagne avec "${database.name}" sera bientôt disponible.`,
    });
  };

  const handleExport = (database: ProspectDatabase) => {
    toast({
      title: "Fonctionnalité en développement",
      description: `Export de "${database.name}" sera bientôt disponible.`,
    });
  };

  const handleDatabaseCreated = () => {
    setShowCreateModal(false);
    refreshDatabases();
  };

  return (
    <PermissionGuard 
      anyPermissions={['prospects.view.own', 'prospects.view.all']}
      fallbackMessage="Vous n'avez pas la permission de voir les prospects. Contactez votre administrateur."
    >
      <div className="space-y-4 sm:space-y-6">
        {/* En-tête avec statistiques globales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Database className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold truncate">{stats.totalDatabases}</div>
                <div className="text-xs sm:text-sm text-muted-foreground truncate">Bases totales</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold truncate">{stats.activeDatabases}</div>
                <div className="text-xs sm:text-sm text-muted-foreground truncate">Bases actives</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold truncate">{stats.totalProspects}</div>
                <div className="text-xs sm:text-sm text-muted-foreground truncate">Prospects totaux</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold truncate">{stats.averageProspectsPerDatabase}</div>
                <div className="text-xs sm:text-sm text-muted-foreground truncate">Moyenne / base</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre d'outils */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Database className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Gestion des Bases de Données
            </CardTitle>
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refreshDatabases()}
                disabled={isLoading}
                className="flex-1 sm:flex-none"
              >
                <RefreshCw className={`w-4 h-4 sm:mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Download className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Export global</span>
              </Button>
              <PermissionButton
                permission="prospects.create"
                noPermissionMessage="Vous n'avez pas la permission de créer des bases de prospects"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-1" />
                Nouvelle base
              </PermissionButton>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une base de données..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtres */}
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
                className="flex-1 sm:flex-none"
              >
                Toutes
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('active')}
                className="flex-1 sm:flex-none"
              >
                Actives
              </Button>
              <Button
                variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('inactive')}
                className="flex-1 sm:flex-none"
              >
                Inactives
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des bases de données */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 sm:p-6">
                <div className="h-20 sm:h-24 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDatabases.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-12 text-center">
            <Database className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              {searchTerm ? 'Aucune base trouvée' : 'Aucune base de données'}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              {searchTerm 
                ? 'Essayez de modifier vos critères de recherche.'
                : 'Créez votre première base de données pour commencer à organiser vos prospects.'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer ma première base
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {filteredDatabases.map((database) => (
            <DatabaseStatsCard
              key={database.id}
              database={database}
              onEdit={handleEdit}
              onViewProspects={handleViewProspects}
              onCreateCampaign={handleCreateCampaign}
              onExport={handleExport}
            />
          ))}
        </div>
      )}

      {/* Modal de création */}
      <CreateDatabaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleDatabaseCreated}
      />
    </div>
    </PermissionGuard>
  );
};