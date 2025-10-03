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
      <div className="space-y-6">
        {/* En-tête avec statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalDatabases}</div>
                <div className="text-sm text-muted-foreground">Bases totales</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.activeDatabases}</div>
                <div className="text-sm text-muted-foreground">Bases actives</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalProspects}</div>
                <div className="text-sm text-muted-foreground">Prospects totaux</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.averageProspectsPerDatabase}</div>
                <div className="text-sm text-muted-foreground">Moyenne / base</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre d'outils */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Gestion des Bases de Données
            </CardTitle>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refreshDatabases()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button 
                variant="outline" 
                size="sm"
              >
                <Download className="w-4 h-4 mr-1" />
                Export global
              </Button>
              <PermissionButton
                permission="prospects.create"
                noPermissionMessage="Vous n'avez pas la permission de créer des bases de prospects"
                size="sm"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nouvelle base
              </PermissionButton>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
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
            <div className="flex space-x-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Toutes
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('active')}
              >
                Actives
              </Button>
              <Button
                variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('inactive')}
              >
                Inactives
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des bases de données */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDatabases.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? 'Aucune base trouvée' : 'Aucune base de données'}
            </h3>
            <p className="text-muted-foreground mb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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