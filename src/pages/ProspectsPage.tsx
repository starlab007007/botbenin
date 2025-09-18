
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Database, 
  Users, 
  Plus, 
  BarChart3,
  Target,
  TrendingUp,
  Activity,
  Mail,
  Search,
  Filter,
  Download,
  Import,
  Phone
} from 'lucide-react';
import { ProspectList } from '@/components/prospects/ProspectList';
import { ProspectDatabaseManager } from '@/components/prospects/ProspectDatabaseManager';
import { CreateProspectModal } from '@/components/prospects/CreateProspectModal';
import { CreateDatabaseModal } from '@/components/prospects/CreateDatabaseModal';
import { ProspectExportModal } from '@/components/prospects/ProspectExportModal';
import { GlobalReportModal } from '@/components/prospects/GlobalReportModal';
import { CreateCampaignModal } from '@/components/prospects/CreateCampaignModal';
import { CampaignManagerModal } from '@/components/prospects/CampaignManagerModal';
import { useProspectDatabases } from '@/hooks/useProspectDatabases';

export const ProspectsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateProspectOpen, setIsCreateProspectOpen] = useState(false);
  const [isCreateDatabaseOpen, setIsCreateDatabaseOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isGlobalReportOpen, setIsGlobalReportOpen] = useState(false);
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isCampaignManagerOpen, setIsCampaignManagerOpen] = useState(false);
  const [activeView, setActiveView] = useState<'databases' | 'prospects' | 'analytics'>('databases');
  const { stats } = useProspectDatabases();

  // Statistiques enrichies
  const enrichedStats = [
    { 
      title: 'Total Prospects', 
      value: stats.totalProspects.toString(), 
      change: '+12%', 
      icon: Users,
      color: 'blue',
      description: 'Prospects dans toutes les bases'
    },
    { 
      title: 'Bases Actives', 
      value: stats.activeDatabases.toString(), 
      change: `+${stats.totalDatabases - stats.activeDatabases} inactives`, 
      icon: Database,
      color: 'green',
      description: 'Bases de données en cours d\'utilisation'
    },
    { 
      title: 'Moyenne/Base', 
      value: stats.averageProspectsPerDatabase.toString(), 
      change: 'prospects', 
      icon: TrendingUp,
      color: 'purple',
      description: 'Prospects par base active'
    },
    { 
      title: 'Performance', 
      value: '23.5%', 
      change: '+5.2%', 
      icon: Target,
      color: 'orange',
      description: 'Taux de conversion global'
    },
  ];

  const getStatColor = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      green: 'text-green-600 bg-green-50 border-green-200',
      purple: 'text-purple-600 bg-purple-50 border-purple-200',
      orange: 'text-orange-600 bg-orange-50 border-orange-200',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Prospects</h1>
            <p className="text-gray-600">
              Organisez, suivez et optimisez vos prospects et campagnes
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsGlobalReportOpen(true)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Rapport global
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Export complet
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsCreateDatabaseOpen(true)}>
                  <Database className="w-4 h-4 mr-2" />
                  Nouvelle base de données
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCreateProspectOpen(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Nouveau prospect
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCreateCampaignOpen(true)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Nouvelle campagne
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCampaignManagerOpen(true)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Gérer les campagnes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Statistiques enrichies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {enrichedStats.map((stat, index) => (
          <Card key={index} className={`hover:shadow-md transition-all border-l-4 ${getStatColor(stat.color).split(' ')[2]}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatColor(stat.color)}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {stat.change}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barre d'actions avec onglets */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Tableau de bord</h2>
              <div className="flex items-center space-x-1">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Temps réel</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Import className="w-4 h-4 mr-2" />
                    Importer
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Database className="w-4 h-4 mr-2" />
                    Importer CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Users className="w-4 h-4 mr-2" />
                    Importer Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Phone className="w-4 h-4 mr-2" />
                    Synchroniser CRM
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtres
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation par onglets améliorée */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="space-y-6">
        <div className="border-b border-gray-200 bg-white rounded-lg shadow-sm">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1">
            <TabsTrigger value="databases" className="flex items-center space-x-2 py-3">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Bases de Données</span>
              <span className="sm:hidden">Bases</span>
              <Badge variant="secondary" className="ml-2">
                {stats.totalDatabases}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2 py-3">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="databases" className="space-y-6">
          <ProspectDatabaseManager />
        </TabsContent>


        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics et Rapports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analyses avancées</h3>
                  <p className="text-muted-foreground mb-4">
                    Rapports détaillés de performance, taux de conversion et suivi des prospects
                  </p>
                  <Badge variant="secondary">Bientôt disponible</Badge>
                </div>
                
                <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center">
                  <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Tableaux de bord</h3>
                  <p className="text-muted-foreground mb-4">
                    Visualisations interactives et métriques en temps réel
                  </p>
                  <Badge variant="secondary">En développement</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateProspectModal 
        isOpen={isCreateProspectOpen} 
        onClose={() => setIsCreateProspectOpen(false)} 
      />
      
      <CreateDatabaseModal 
        isOpen={isCreateDatabaseOpen} 
        onClose={() => setIsCreateDatabaseOpen(false)} 
      />
      
      <ProspectExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
      
      <GlobalReportModal
        isOpen={isGlobalReportOpen}
        onClose={() => setIsGlobalReportOpen(false)}
      />
      
      <CreateCampaignModal
        isOpen={isCreateCampaignOpen}
        onClose={() => setIsCreateCampaignOpen(false)}
      />
      
      <CampaignManagerModal
        isOpen={isCampaignManagerOpen}
        onClose={() => setIsCampaignManagerOpen(false)}
      />
    </div>
  );
};
