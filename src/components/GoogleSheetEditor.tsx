import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useGoogleSheetsWriter } from '@/hooks/useGoogleSheetsWriter';
import { 
  RefreshCw, 
  Save, 
  Plus, 
  Trash2, 
  User, 
  Building, 
  Globe, 
  Linkedin, 
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Link as LinkIcon
} from 'lucide-react';

interface GoogleSheetRow {
  id: string;
  [key: string]: any;
}

interface GoogleSheetEditorProps {
  spreadsheetId: string;
  sheetName: string;
}

export const GoogleSheetEditor: React.FC<GoogleSheetEditorProps> = ({
  spreadsheetId,
  sheetName
}) => {
  const [localData, setLocalData] = useState<GoogleSheetRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const {
    data: googleSheetsData,
    isLoading: isLoadingSheets,
    connectionStatus,
    loadData: loadGoogleSheetsData,
    updateConfig: updateGoogleSheetsConfig
  } = useGoogleSheets();

  const {
    isWriting,
    lastWriteTime,
    syncToGoogleSheets
  } = useGoogleSheetsWriter();

  // Configuration initiale
  useEffect(() => {
    if (spreadsheetId && sheetName) {
      updateGoogleSheetsConfig({ spreadsheetId, sheetName });
    }
  }, [spreadsheetId, sheetName, updateGoogleSheetsConfig]);

  // Charger les données initiales
  useEffect(() => {
    if (spreadsheetId && sheetName) {
      loadInitialData();
    }
  }, [spreadsheetId, sheetName]);

  // Synchroniser avec les données Google Sheets
  useEffect(() => {
    if (googleSheetsData && Array.isArray(googleSheetsData) && googleSheetsData.length > 0) {
      const processedData = googleSheetsData.map((row, index) => ({
        id: row.id || `row_${index}`,
        ...row
      }));
      
      // Extraire les headers depuis le premier objet
      if (processedData.length > 0) {
        const firstRow = processedData[0];
        const extractedHeaders = Object.keys(firstRow).filter(key => key !== 'id');
        setHeaders(extractedHeaders);
      }
      
      setLocalData(processedData);
      setLastSyncTime(new Date());
      setHasUnsavedChanges(false);
    }
  }, [googleSheetsData]);

  const loadInitialData = async () => {
    try {
      await loadGoogleSheetsData();
      toast.success('Données Google Sheet chargées');
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast.error('Erreur lors du chargement du Google Sheet');
    }
  };

  const updateCellValue = useCallback((rowId: string, column: string, value: string) => {
    setLocalData(prev => 
      prev.map(row => 
        row.id === rowId 
          ? { ...row, [column]: value }
          : row
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  const addNewRow = () => {
    const newRow: GoogleSheetRow = {
      id: `new_${Date.now()}`,
    };
    
    // Initialiser avec des valeurs vides pour tous les headers
    headers.forEach(header => {
      newRow[header] = '';
    });

    setLocalData(prev => [...prev, newRow]);
    setHasUnsavedChanges(true);
  };

  const deleteRow = (rowId: string) => {
    if (localData.length > 1) {
      setLocalData(prev => prev.filter(row => row.id !== rowId));
      setHasUnsavedChanges(true);
      toast.success('Ligne supprimée');
    } else {
      toast.error('Vous devez conserver au moins une ligne');
    }
  };

  const saveToGoogleSheets = async () => {
    if (!hasUnsavedChanges) {
      toast.info('Aucune modification à sauvegarder');
      return;
    }

    // Convertir les données locales au format attendu par l'API
    const formattedData = localData.map(row => {
      const { id, ...rowData } = row;
      return {
        id: id,
        contactName: rowData['contact_name'] || rowData['Nom du Contact'] || '',
        companyName: rowData['company_name'] || rowData['Nom de l\'Entreprise'] || '',
        companyWebsite: rowData['company_website'] || rowData['Site Web Entreprise'] || '',
        role: rowData['Rôle'] || rowData['Rôle / Poste'] || '',
        linkedinUrl: rowData['linkedin_contact_url'] || rowData['Profil LinkedIn'] || '',
        relevance: rowData['Pertinence du prospect par rapport à notre offre ? (sur 100)'] || rowData['Notes/Pertinence'] || '',
        status: rowData['Statut'] || 'pending'
      };
    });

    const success = await syncToGoogleSheets(
      { spreadsheetId, sheetName }, 
      formattedData
    );

    if (success) {
      setHasUnsavedChanges(false);
      setLastSyncTime(new Date());
      toast.success('Données synchronisées vers Google Sheets');
      // Recharger pour avoir la version à jour
      await loadInitialData();
    }
  };

  const refreshFromGoogleSheets = async () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'Vous avez des modifications non sauvegardées. Continuer va les perdre. Êtes-vous sûr ?'
      );
      if (!confirmed) return;
    }

    await loadInitialData();
  };

  const getFieldIcon = (fieldName: string) => {
    const name = fieldName.toLowerCase();
    if (name.includes('nom') || name.includes('contact')) return <User className="w-4 h-4" />;
    if (name.includes('entreprise') || name.includes('company')) return <Building className="w-4 h-4" />;
    if (name.includes('site') || name.includes('web')) return <Globe className="w-4 h-4" />;
    if (name.includes('linkedin')) return <Linkedin className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'terminé':
      case 'completed':
      case 'succès':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Terminé</Badge>;
      case 'en cours':
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />En cours</Badge>;
      case 'échec':
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Échec</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
    }
  };

  const renderCell = (row: GoogleSheetRow, column: string) => {
    const value = row[column] || '';
    
    // Rendu spécial pour le statut
    if (column.toLowerCase().includes('statut')) {
      return (
        <Select
          value={value}
          onValueChange={(newValue) => updateCellValue(row.id, column, newValue)}
        >
          <SelectTrigger className="w-full min-w-[120px]">
            <SelectValue placeholder="Choisir..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="En attente">En attente</SelectItem>
            <SelectItem value="En cours">En cours</SelectItem>
            <SelectItem value="Succès">Succès</SelectItem>
            <SelectItem value="Échec">Échec</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Rendu normal pour les autres champs
    return (
      <Input
        value={value}
        onChange={(e) => updateCellValue(row.id, column, e.target.value)}
        placeholder="Saisir..."
        className="w-full min-w-[150px]"
      />
    );
  };

  if (isLoadingSheets) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement du Google Sheet...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec contrôles */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Google Sheet - {sheetName}
              <Badge 
                variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
                className="ml-2"
              >
                {connectionStatus === 'connected' ? 'Connecté' : 
                 connectionStatus === 'connecting' ? 'Connexion...' : 
                 connectionStatus === 'error' ? 'Erreur' : 'Non configuré'}
              </Badge>
              {hasUnsavedChanges && (
                <Badge variant="destructive" className="ml-2">
                  Modifications non sauvées
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex gap-2">
              <Button
                onClick={refreshFromGoogleSheets}
                disabled={isLoadingSheets}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              
              <Button
                onClick={addNewRow}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
              
              <Button
                onClick={saveToGoogleSheets}
                disabled={isWriting || !hasUnsavedChanges}
                size="sm"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {isWriting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Sauvegarder
              </Button>
            </div>
          </div>
          
          {(lastSyncTime || lastWriteTime) && (
            <div className="text-xs text-gray-500 flex gap-4 mt-2">
              {lastSyncTime && (
                <span>Dernière lecture: {lastSyncTime.toLocaleString()}</span>
              )}
              {lastWriteTime && (
                <span>Dernière écriture: {lastWriteTime.toLocaleString()}</span>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Tableau des données */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {localData.length > 0 && headers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {getFieldIcon(header)}
                          {header}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {localData.map((row, rowIndex) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      {headers.map((column) => (
                        <td key={`${row.id}-${column}`} className="px-4 py-3">
                          {column.toLowerCase().includes('statut') ? (
                            <div className="flex items-center gap-2">
                              {renderCell(row, column)}
                              {getStatusBadge(row[column])}
                            </div>
                          ) : (
                            renderCell(row, column)
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <Button
                          onClick={() => deleteRow(row.id)}
                          disabled={localData.length <= 1}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Aucune donnée trouvée</p>
              <p className="text-sm">
                Vérifiez que votre Google Sheet contient des données ou que l'ID est correct.
              </p>
              <Button
                onClick={addNewRow}
                className="mt-4"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une première ligne
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations sur la synchronisation */}
      <Card className="border-0 shadow-sm bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              <span>
                Synchronisé avec: 
                <span className="font-mono ml-1 text-xs">
                  {spreadsheetId.substring(0, 12)}.../{sheetName}
                </span>
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <span>{localData.length} ligne(s)</span>
              {hasUnsavedChanges && (
                <Badge variant="destructive" className="text-xs">
                  Non sauvé
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};