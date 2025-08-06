import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Settings,
  Users,
  Mail,
  Phone,
  Building2,
  MapPin,
  Loader2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Play
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GoogleSheetData {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  location: string;
  linkedin: string;
  source: string;
  notes: string;
  created_date: string;
  last_contact: string;
  status: string;
  score: number;
  industry: string;
  website: string;
}

interface GoogleSheetsImportProps {
  onBack: () => void;
}

export const GoogleSheetsImport: React.FC<GoogleSheetsImportProps> = ({ onBack }) => {
  const [data, setData] = useState<GoogleSheetData[]>([]);
  const [filteredData, setFilteredData] = useState<GoogleSheetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [sheetConfig, setSheetConfig] = useState({
    spreadsheetId: '1iebACfq1aShY0Awd7EKDQGTC3BirVJiOojHjKnCqQNE',
    sheetName: 'Feuille 1'
  });
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadGoogleSheetData();
  }, []);

  // Filter data when search term or status filter changes
  useEffect(() => {
    filterData();
  }, [data, searchTerm, statusFilter]);

  const loadGoogleSheetData = async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('google-sheets-reader', {
        body: {
          spreadsheetId: sheetConfig.spreadsheetId,
          sheetName: sheetConfig.sheetName
        }
      });

      if (error) {
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les données Google Sheets",
          variant: "destructive"
        });
        console.error('Error loading Google Sheets data:', error);
        return;
      }

      if (result?.data) {
        setData(result.data);
        toast({
          title: "Données chargées",
          description: `${result.data.length} prospects importés depuis Google Sheets`,
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du chargement",
        variant: "destructive"
      });
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...data];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredData(filtered);
  };

  const getLastFiveResults = () => {
    return [...filteredData]
      .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
      .slice(0, 5);
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  const handleQualificationAction = async () => {
    if (selectedRows.length === 0) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner au moins un prospect pour la qualification",
        variant: "destructive"
      });
      return;
    }

    try {
      const selectedProspects = filteredData.filter(item => selectedRows.includes(item.id));
      
      // Launch qualification process
      const { data: result, error } = await supabase.functions.invoke('prospect-qualification', {
        body: {
          prospects: selectedProspects,
          qualificationType: 'email' // Default to email qualification
        }
      });

      if (error) {
        toast({
          title: "Erreur de qualification",
          description: "Impossible de lancer le processus de qualification",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Qualification lancée",
        description: `Processus de qualification démarré pour ${selectedRows.length} prospects`,
        variant: "default"
      });

      // Clear selection
      setSelectedRows([]);
    } catch (error) {
      console.error('Qualification error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la qualification",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'qualified': return 'default';
      case 'contacted': return 'secondary';
      case 'interested': return 'outline';
      case 'new': return 'destructive';
      default: return 'outline';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const uniqueStatuses = [...new Set(data.map(item => item.status))];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au menu
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Mes Listes de Prospects (Import)</h1>
              <p className="text-gray-600">Gestion et qualification des prospects via Google Sheets</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsConfigModalOpen(true)}
              disabled={isLoading}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </Button>
            <Button
              onClick={loadGoogleSheetData}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Actualiser
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Prospects</p>
                  <p className="text-2xl font-bold">{data.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Qualifiés</p>
                  <p className="text-2xl font-bold">{data.filter(d => d.status === 'qualified').length}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En attente</p>
                  <p className="text-2xl font-bold">{data.filter(d => d.status === 'new').length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Score Moyen</p>
                  <p className="text-2xl font-bold">
                    {data.length > 0 ? (data.reduce((sum, d) => sum + d.score, 0) / data.length).toFixed(1) : '0'}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center space-x-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Rechercher par nom, email, entreprise..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">Tous les statuts</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedRows.length} sélectionné(s)
                </span>
                <Button
                  onClick={handleQualificationAction}
                  disabled={selectedRows.length === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Lancer Qualification
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">Tous les prospects</TabsTrigger>
            <TabsTrigger value="recent">5 derniers ajouts</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Liste complète des prospects</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="ml-2">Chargement des données...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <input
                              type="checkbox"
                              checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                              onChange={handleSelectAll}
                              className="mr-2"
                            />
                          </TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Entreprise</TableHead>
                          <TableHead>Poste</TableHead>
                          <TableHead>Téléphone</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((prospect) => (
                          <TableRow key={prospect.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(prospect.id)}
                                onChange={() => handleSelectRow(prospect.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{prospect.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                {prospect.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                                {prospect.company}
                              </div>
                            </TableCell>
                            <TableCell>{prospect.position}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                {prospect.phone}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(prospect.status)}>
                                {prospect.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`font-semibold ${getScoreColor(prospect.score)}`}>
                                {prospect.score}/10
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>5 derniers prospects ajoutés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {getLastFiveResults().map((prospect) => (
                    <Card key={prospect.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(prospect.id)}
                            onChange={() => handleSelectRow(prospect.id)}
                          />
                          <div>
                            <h3 className="font-semibold">{prospect.name}</h3>
                            <p className="text-sm text-gray-600">{prospect.position} chez {prospect.company}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-500">{prospect.email}</span>
                              <Badge variant={getStatusBadgeVariant(prospect.status)} className="text-xs">
                                {prospect.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getScoreColor(prospect.score)}`}>
                            {prospect.score}/10
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(prospect.created_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Configuration Modal */}
        {isConfigModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Configuration Google Sheets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ID du Google Sheet</label>
                  <Input
                    value={sheetConfig.spreadsheetId}
                    onChange={(e) => setSheetConfig(prev => ({ ...prev, spreadsheetId: e.target.value }))}
                    placeholder="ID du spreadsheet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nom de la feuille</label>
                  <Input
                    value={sheetConfig.sheetName}
                    onChange={(e) => setSheetConfig(prev => ({ ...prev, sheetName: e.target.value }))}
                    placeholder="Nom de la feuille"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={() => {
                    setIsConfigModalOpen(false);
                    loadGoogleSheetData();
                  }}>
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};