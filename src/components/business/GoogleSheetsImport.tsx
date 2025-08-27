
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
  Download,
  RefreshCw,
  Settings,
  Users,
  Mail,
  Phone,
  Building2,
  Loader2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Play,
  FileSpreadsheet,
  Globe,
  ExternalLink
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
  const [lastLoadTime, setLastLoadTime] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  // Données dynamiques basées sur les entêtes du Google Sheet
  const [dynamicHeaders, setDynamicHeaders] = useState<string[]>([]);
  const [dynamicRows, setDynamicRows] = useState<Array<Record<string, any>>>([]);
  const [filteredRows, setFilteredRows] = useState<Array<Record<string, any>>>([]);
  const [statusKey, setStatusKey] = useState<string | null>(null);
  const { toast } = useToast();

  // Extrait l'ID du Google Sheet si l'utilisateur colle l'URL complète
  const extractSheetId = (input: string) => {
    const match = input.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  };


  // Chargement automatique au démarrage
  useEffect(() => {
    loadGoogleSheetData();
  }, []);

  // Filtrage des données
  useEffect(() => {
    filterData();
  }, [data, searchTerm, statusFilter, dynamicRows, statusFilter]);

  const loadGoogleSheetData = async (showToast = true) => {
    console.log('=== Chargement des données Google Sheets ===');
    console.log('Configuration:', sheetConfig);
    
    setIsLoading(true);
    setConnectionStatus('testing');
    
    const sanitizedId = extractSheetId(sheetConfig.spreadsheetId);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('google-sheets-reader', {
        body: {
          spreadsheetId: sanitizedId,
          sheetName: sheetConfig.sheetName
        }
      });

      console.log('Réponse de la fonction:', { result, error });

      if (error) {
        console.error('Erreur Supabase:', error);
        setConnectionStatus('error');
        if (showToast) {
          toast({
            title: 'Erreur de connexion',
            description: `Impossible de se connecter aux Google Sheets: ${error.message}`,
            variant: 'destructive'
          });
        }
        return;
      }

      if (result?.error) {
        console.error('Erreur de la fonction:', result.error);
        setConnectionStatus('error');
        if (showToast) {
          toast({
            title: 'Erreur Google Sheets',
            description: result.details || result.error,
            variant: 'destructive'
          });
        }
        return;
      }

      // Données dynamiques (colonnes + lignes)
      const headers: string[] = result?.headers || result?.metadata?.headers || [];
      const records: Array<Record<string, any>> = result?.records || [];

      if (headers.length > 0) {
        console.log('Headers:', headers);
        console.log('Records:', records.length);
        
        setDynamicHeaders(headers);
        setDynamicRows(records);
        setFilteredRows(records);
        
        // Trouver la colonne de statut
        const foundStatusKey = headers.find((h) => 
          h?.toLowerCase?.().includes('status') || 
          h?.toLowerCase?.().includes('statut') ||
          h?.toLowerCase?.().includes('état')
        ) || null;
        setStatusKey(foundStatusKey);
        
        setData([]); // Clear old format data
        setLastLoadTime(new Date());
        setConnectionStatus('connected');
        
        if (showToast) {
          toast({
            title: '✅ Google Sheets connecté',
            description: `${records.length} lignes chargées depuis votre feuille avec ${headers.length} colonnes`,
            variant: 'default'
          });
        }
      } else {
        console.warn('Aucune donnée trouvée:', result);
        setConnectionStatus('error');
        if (showToast) {
          toast({
            title: 'Aucune donnée',
            description: 'Aucune donnée trouvée dans la feuille Google Sheets',
            variant: 'default'
          });
        }
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement:', error);
      setConnectionStatus('error');
      if (showToast) {
        toast({
          title: 'Erreur',
          description: `Erreur technique: ${error.message}`,
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    // Si on a des données dynamiques, les filtrer
    if (hasDynamic) {
      let filtered = [...dynamicRows];

      if (searchTerm) {
        filtered = filtered.filter(row => {
          const searchableValues = Object.values(row).join(' ').toLowerCase();
          return searchableValues.includes(searchTerm.toLowerCase());
        });
      }

      if (statusFilter !== 'all' && statusKey) {
        filtered = filtered.filter(row => {
          const rowStatus = row[statusKey]?.toString().toLowerCase() || '';
          return rowStatus === statusFilter.toLowerCase();
        });
      }

      setFilteredRows(filtered);
    } else {
      // Sinon filtrer les anciennes données
      let filtered = [...data];

      if (searchTerm) {
        filtered = filtered.filter(item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.position.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (statusFilter !== 'all') {
        filtered = filtered.filter(item => item.status === statusFilter);
      }

      setFilteredData(filtered);
    }
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      const { data: result, error } = await supabase.functions.invoke('google-sheets-reader', {
        body: {
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          sheetName: 'Class Data'
        }
      });
      
      if (error) {
        setConnectionStatus('error');
        toast({
          title: "Test de connexion",
          description: `❌ Connexion échouée: ${error.message}`,
          variant: "destructive"
        });
      } else if (result?.data) {
        setConnectionStatus('connected');
        toast({
          title: "Test de connexion",
          description: `✅ Connexion réussie! API Google Sheets accessible`,
          variant: "default"
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Test de connexion",
          description: "❌ API accessible mais aucune donnée retournée",
          variant: "destructive"
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Test de connexion",
        description: "❌ Erreur lors du test de connectivité",
        variant: "destructive"
      });
    }
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

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing': return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'connected': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Globe className="w-4 h-4 text-gray-400" />;
    }
  };

  const dynamicUniqueStatuses = statusKey
    ? Array.from(new Set(dynamicRows.map((r) => (r[statusKey!] ?? '').toString()).filter(Boolean)))
    : [];
  const uniqueStatuses = dynamicUniqueStatuses.length > 0
    ? dynamicUniqueStatuses
    : Array.from(new Set(data.map((item) => item.status)));

  const hasDynamic = dynamicHeaders.length > 0 && dynamicRows.length > 0;

  const totalCount = hasDynamic ? dynamicRows.length : data.length;
  const qualifiedCount = hasDynamic && statusKey
    ? dynamicRows.filter((r) => (r[statusKey!] ?? '').toString().toLowerCase() === 'qualified').length
    : data.filter((d) => d.status === 'qualified').length;
  const pendingCount = hasDynamic && statusKey
    ? dynamicRows.filter((r) => (r[statusKey!] ?? '').toString().toLowerCase() === 'new').length
    : data.filter((d) => d.status === 'new').length;
  const scoreKey = hasDynamic
    ? dynamicHeaders.find((h) => ['score', 'note', 'rating'].includes(h.toLowerCase())) || null
    : null;
  const avgScore = hasDynamic && scoreKey
    ? (() => {
        const nums = dynamicRows
          .map((r) => parseFloat(String(r[scoreKey!]).replace(',', '.')))
          .filter((n) => !isNaN(n));
        return nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)) : 0;
      })()
    : (data.length > 0 ? Number((data.reduce((sum, d) => sum + d.score, 0) / data.length).toFixed(1)) : 0);


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête avec statut de connexion */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <FileSpreadsheet className="w-6 h-6 mr-2 text-green-600" />
                Mes Listes de Prospects (Google Sheets)
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                {getConnectionStatusIcon()}
                <p className="text-gray-600">
                  {connectionStatus === 'connected' && lastLoadTime 
                    ? `Connecté - Dernière sync: ${lastLoadTime.toLocaleTimeString()}`
                    : connectionStatus === 'testing' 
                    ? 'Test de connexion en cours...'
                    : connectionStatus === 'error'
                    ? 'Erreur de connexion aux Google Sheets'
                    : 'Prêt à se connecter'}
                </p>
              </div>
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
              variant="outline"
              onClick={testConnection}
              disabled={isLoading}
            >
              {connectionStatus === 'testing' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Globe className="w-4 h-4 mr-2" />
              )}
              Test API
            </Button>
            <Button
              onClick={() => loadGoogleSheetData()}
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

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Enregistrements</p>
                  <p className="text-2xl font-bold">{totalCount}</p>
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
                  <p className="text-2xl font-bold">{qualifiedCount}</p>
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
                  <p className="text-2xl font-bold">{pendingCount}</p>
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
                  <p className="text-2xl font-bold">{avgScore}</p>
                </div>
                <Eye className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et actions */}
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
                    onClick={() => {
                      if (hasDynamic) {
                        if (selectedRows.length === filteredRows.length) {
                          setSelectedRows([]);
                        } else {
                          setSelectedRows(filteredRows.map(r => r.id));
                        }
                      } else {
                        handleSelectAll();
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    {selectedRows.length === (hasDynamic ? filteredRows.length : filteredData.length) ? 'Désélectionner' : 'Tout sélectionner'}
                  </Button>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des prospects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
                Liste complète des prospects
              </CardTitle>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600 font-medium">Source: Google Sheets</span>
                {data.length > 0 || hasDynamic && totalCount > 0 && (
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Exporter ({totalCount})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && totalCount === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin mr-3" />
                <span>Connexion aux Google Sheets en cours...</span>
              </div>
            ) : totalCount === 0 ? (
              <div className="text-center p-8">
                <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune donnée trouvée</h3>
                <p className="text-gray-600 mb-4">
                  Vérifiez votre configuration Google Sheets ou testez la connexion
                </p>
                <div className="flex justify-center space-x-2">
                  <Button onClick={() => setIsConfigModalOpen(true)} variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Configuration
                  </Button>
                  <Button onClick={testConnection}>
                    <Globe className="w-4 h-4 mr-2" />
                    Test connexion
                  </Button>
                </div>
              </div>
            ) : hasDynamic ? (
              // Affichage dynamique basé sur les colonnes du sheet
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={filteredRows.length > 0 && filteredRows.every(row => selectedRows.includes(row.id))}
                          onChange={() => {
                            if (filteredRows.every(row => selectedRows.includes(row.id))) {
                              setSelectedRows(prev => prev.filter(id => !filteredRows.map(r => r.id).includes(id)));
                            } else {
                              setSelectedRows(prev => [...new Set([...prev, ...filteredRows.map(r => r.id)])]);
                            }
                          }}
                          className="mr-2"
                        />
                      </TableHead>
                      {dynamicHeaders.map((header, index) => (
                        <TableHead key={index}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row, rowIndex) => (
                      <TableRow key={row.id || rowIndex}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(row.id)}
                            onChange={() => {
                              if (selectedRows.includes(row.id)) {
                                setSelectedRows(prev => prev.filter(id => id !== row.id));
                              } else {
                                setSelectedRows(prev => [...prev, row.id]);
                              }
                            }}
                          />
                        </TableCell>
                        {dynamicHeaders.map((header, colIndex) => (
                          <TableCell key={colIndex} className={colIndex === 0 ? "font-medium" : ""}>
                            {header === statusKey && row[header] ? (
                              <Badge variant="outline">
                                {row[header]}
                              </Badge>
                            ) : (
                              row[header] || '-'
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              // Affichage statique pour les anciennes données (fallback)
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
                          <div className="flex items-center space-x-1">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {prospect.linkedin && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={prospect.linkedin} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de configuration */}
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
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  />
                  <div className="text-xs text-gray-600 mt-2 p-3 bg-blue-50 rounded-md">
                    <p className="font-medium mb-1">📋 Comment obtenir l'ID :</p>
                    <p>1. Ouvrez votre Google Sheet dans le navigateur</p>
                    <p>2. Copiez l'ID depuis l'URL :</p>
                    <p className="font-mono text-blue-700 text-xs break-all mt-1">
                      https://docs.google.com/spreadsheets/d/<span className="bg-yellow-200 px-1">VOTRE_ID_ICI</span>/edit
                    </p>
                    <p className="mt-1">3. Collez l'ID dans le champ ci-dessus</p>
                  </div>
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
