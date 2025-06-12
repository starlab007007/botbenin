
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Database,
  TrendingUp,
  Target,
  FileSpreadsheet,
  Import,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { ProspectList } from "@/components/prospects/ProspectList";
import { ProspectDatabaseList } from "@/components/prospects/ProspectDatabaseList";
import { CreateProspectModal } from "@/components/prospects/CreateProspectModal";
import { CreateDatabaseModal } from "@/components/prospects/CreateDatabaseModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const ProspectsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateProspectOpen, setIsCreateProspectOpen] = useState(false);
  const [isCreateDatabaseOpen, setIsCreateDatabaseOpen] = useState(false);
  const [activeView, setActiveView] = useState('prospects');

  const stats = [
    {
      title: 'Total Prospects',
      value: '1,234',
      change: '+20%',
      icon: Users,
      color: 'blue',
      description: 'Ce mois'
    },
    {
      title: 'Nouveaux',
      value: '89',
      change: '+12',
      icon: TrendingUp,
      color: 'green',
      description: 'Cette semaine'
    },
    {
      title: 'Qualifiés',
      value: '156',
      change: '+5%',
      icon: Target,
      color: 'purple',
      description: 'Prêts à contacter'
    },
    {
      title: 'Bases de données',
      value: '12',
      change: '+2',
      icon: Database,
      color: 'orange',
      description: 'Actives'
    }
  ];

  const getStatColor = (color: string) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Prospects</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos prospects, bases de données et pipeline commercial
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Import className="w-4 h-4 mr-2" />
                Importer
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Fichier CSV
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Database className="w-4 h-4 mr-2" />
                Base existante
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            onClick={() => setIsCreateDatabaseOpen(true)} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Database className="w-4 h-4 mr-2" />
            Nouvelle Base
          </Button>
          
          <Button 
            onClick={() => setIsCreateProspectOpen(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Prospect
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`w-10 h-10 bg-gradient-to-r ${getStatColor(stat.color)} rounded-lg flex items-center justify-center`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className="text-right">
                  <Badge 
                    variant="secondary" 
                    className={`${stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {stat.change}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barre de recherche et filtres */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher des prospects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Eye className="w-4 h-4 mr-2" />
                  Vue détaillée
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier en lot
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer sélection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Contenu principal avec onglets */}
      <Card>
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <div className="border-b border-gray-200 px-6 pt-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="prospects" className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Prospects
              </TabsTrigger>
              <TabsTrigger value="databases" className="flex items-center">
                <Database className="w-4 h-4 mr-2" />
                Bases de données
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="prospects" className="p-6 pt-4">
            <ProspectList searchTerm={searchTerm} />
          </TabsContent>
          
          <TabsContent value="databases" className="p-6 pt-4">
            <ProspectDatabaseList />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Modals */}
      <CreateProspectModal 
        isOpen={isCreateProspectOpen} 
        onClose={() => setIsCreateProspectOpen(false)} 
      />
      
      <CreateDatabaseModal 
        isOpen={isCreateDatabaseOpen} 
        onClose={() => setIsCreateDatabaseOpen(false)} 
      />
    </div>
  );
};
