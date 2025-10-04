
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header avec actions */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestion des Prospects</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Organisez, suivez et optimisez vos prospects et campagnes
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Button variant="outline" size="sm" onClick={() => setIsGlobalReportOpen(true)} className="flex-1 sm:flex-none">
              <BarChart3 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Rapport global</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)} className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Export complet</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="flex-1 sm:flex-none">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {enrichedStats.map((stat, index) => (
          <Card key={index} className={`hover:shadow-md transition-all border-l-4 ${getStatColor(stat.color).split(' ')[2]}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${getStatColor(stat.color)}`}>
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {stat.change}
                </Badge>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground hidden sm:block">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barre d'actions avec onglets */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <h2 className="text-lg sm:text-xl font-semibold">Tableau de bord</h2>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 animate-pulse" />
                <span className="text-xs sm:text-sm text-muted-foreground">Temps réel</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Import className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Importer</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
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
              
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Filter className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Filtres</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation par onglets améliorée */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="space-y-4 sm:space-y-6">
        <div className="bg-card rounded-lg shadow-sm border">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="databases" className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
              <Database className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Bases de Données</span>
              <span className="sm:hidden">Bases</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-[10px] sm:text-xs px-1 sm:px-2">
                {stats.totalDatabases}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="prospects" className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Prospects</span>
              <span className="sm:hidden">Contacts</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-[10px] sm:text-xs px-1 sm:px-2">
                {stats.totalProspects}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="databases" className="space-y-6">
          <ProspectDatabaseManager />
        </TabsContent>

        <TabsContent value="prospects" className="space-y-4">
          <div className="space-y-4">
            {/* Barre de recherche intégrée */}
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 sm:gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un prospect..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <Filter className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filtres</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)} className="flex-1 sm:flex-none">
                      <Download className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Exporter</span>
                    </Button>
                    <Button size="sm" onClick={() => setIsCreateProspectOpen(true)} className="flex-1 sm:flex-none">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <ProspectList searchTerm={searchTerm} />
          </div>
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
