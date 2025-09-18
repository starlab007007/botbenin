import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useGoogleSheets, GoogleSheetProspectWithUser } from '@/hooks/useGoogleSheets';
import { useGoogleSheetsWriter } from '@/hooks/useGoogleSheetsWriter';
import { useAuth } from '@/contexts/AuthContext';
import { ProspectAnalysisModal } from './ProspectAnalysisModal';
import { 
  RefreshCw, 
  Save, 
  Plus, 
  BarChart3, 
  User, 
  Building, 
  Globe, 
  Linkedin, 
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Link as LinkIcon,
  Shield,
  Trash2,
  Target
} from 'lucide-react';

interface GoogleSheetRow extends GoogleSheetProspectWithUser {
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
  const { user, isAuthenticated } = useAuth();
  const [localData, setLocalData] = useState<GoogleSheetRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<GoogleSheetProspectWithUser | null>(null);

  const {
    data: googleSheetsData,
    isLoading: isLoadingSheets,
    connectionStatus,
    loadData: loadGoogleSheetsData,
    updateConfig: updateGoogleSheetsConfig
  } = useGoogleSheets(undefined, user?.id);

  const {
    isWriting,
    lastWriteTime,
    syncToGoogleSheets
  } = useGoogleSheetsWriter(user?.id);

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

  // Synchroniser avec les données Google Sheets avec DOUBLE FILTRAGE de sécurité
  useEffect(() => {
    if (googleSheetsData && Array.isArray(googleSheetsData) && googleSheetsData.length > 0 && user?.id) {
      // DOUBLE FILTRAGE: S'assurer que seules les données de l'utilisateur connecté sont affichées
      const secureFilteredData = googleSheetsData
        .filter(row => row.user_id === user.id) // Premier filtrage de sécurité
        .map((row, index) => ({
          ...row,
          id: row.id || `user_${user.id}_${Date.now()}_${index}`,
          user_id: user.id // Force user_id to current user
        }));
      
      console.log(`🔒 Double filtrage de sécurité: ${secureFilteredData.length} prospects validés pour l'utilisateur ${user.id}`);
      
      // Extraire les headers depuis le premier objet, exclure les colonnes systèmes
      if (secureFilteredData.length > 0) {
        const firstRow = secureFilteredData[0];
        const extractedHeaders = Object.keys(firstRow).filter(key => 
          !['id', 'user_id'].includes(key)
        );
        setHeaders(extractedHeaders);
      }
      
      setLocalData(secureFilteredData);
      setLastSyncTime(new Date());
      setHasUnsavedChanges(false);
    } else if (user?.id) {
      // Si pas de données ou utilisateur non connecté, vider les données locales
      console.log('🔒 Nettoyage des données: aucune donnée valide ou utilisateur non connecté');
      setLocalData([]);
      setHeaders([]);
      setHasUnsavedChanges(false);
    }
  }, [googleSheetsData, user?.id]);

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
    if (!user?.id) {
      toast.error('Vous devez être connecté pour ajouter des prospects');
      return;
    }

    const newRow: GoogleSheetRow = {
      id: `user_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: user.id,
    };
    
    // Initialiser avec des valeurs vides pour tous les headers
    headers.forEach(header => {
      newRow[header] = '';
    });

    setLocalData(prev => [...prev, newRow]);
    setHasUnsavedChanges(true);
  };

  const openAnalysisModal = (prospect: GoogleSheetProspectWithUser) => {
    setSelectedProspect(prospect);
    setAnalysisModalOpen(true);
  };

  const deleteProspect = async (prospectId: string) => {
    const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer ce prospect ? Cette action est irréversible.');
    if (confirmed) {
      try {
        // Supprimer localement
        const updatedData = localData.filter(row => row.id !== prospectId);
        setLocalData(updatedData);
        
        // Synchroniser immédiatement avec Google Sheets
        const formattedData = updatedData.map(row => ({
          ...row,
          user_id: row.user_id || user?.id || 'unknown'
        }));

        const success = await syncToGoogleSheets(
          { spreadsheetId, sheetName }, 
          formattedData
        );

        if (success) {
          setHasUnsavedChanges(false);
          setLastSyncTime(new Date());
          toast.success('Prospect supprimé et synchronisé avec Google Sheets');
          // Recharger pour avoir la version à jour
          await loadInitialData();
        } else {
          // Si la synchronisation échoue, restaurer les données
          setLocalData(localData);
          toast.error('Erreur lors de la synchronisation avec Google Sheets');
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        // Restaurer les données en cas d'erreur
        setLocalData(localData);
        toast.error('Erreur lors de la suppression du prospect');
      }
    }
  };

  const getScoreFromProspect = (prospect: GoogleSheetProspectWithUser): number | null => {
    // Chercher dans différentes colonnes possibles pour le score
    const scoreFields = ['Notes/Pertinence', 'Notes', 'Pertinence', 'Score', 'score', 'notes'];
    for (const field of scoreFields) {
      const value = prospect[field];
      if (value) {
        const numValue = parseFloat(value.toString());
        if (!isNaN(numValue)) {
          return numValue;
        }
      }
    }
    return null;
  };

  const handleEvaluateProspect = (prospectId: string) => {
    toast.success(`Évaluation démarrée pour le prospect ${prospectId.substring(0, 12)}...`);
    setAnalysisModalOpen(false);
    // TODO: Implémenter la logique d'évaluation
  };

  const saveToGoogleSheets = async () => {
    if (!hasUnsavedChanges) {
      toast.info('Aucune modification à sauvegarder');
      return;
    }

    // Send data as-is with user_id
    const formattedData = localData.map(row => ({
      ...row,
      user_id: row.user_id || user?.id || 'unknown'
    }));

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

  // Check authentication
  if (!isAuthenticated || !user) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <Shield className="w-8 h-8 mx-auto mb-4 text-orange-600" />
          <p className="text-gray-600">Vous devez être connecté pour accéder aux prospects.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingSheets) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement de vos prospects...</p>
          <p className="text-sm text-gray-500 mt-2">Synchronisation avec Google Sheets en cours</p>
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

      {/* Tableau des données - Prospects */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Mes Prospects ({localData.length})
              <Badge variant="outline" className="ml-2">
                <Shield className="w-3 h-3 mr-1" />
                Utilisateur: {user.name}
              </Badge>
            </div>
            {localData.length > 0 && (
              <Badge variant="outline" className="text-sm">
                {headers.length} colonnes
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {localData.length > 0 && headers.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-12">
                        #
                      </th>
                      {headers.map((header) => (
                        <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase min-w-[150px]">
                          <div className="flex items-center gap-2">
                            {getFieldIcon(header)}
                            <span className="truncate">{header}</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-700 uppercase w-32">
                        <div className="flex items-center gap-2 justify-center">
                          <Target className="w-4 h-4" />
                          <span>Score</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase w-32">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {localData.map((row, rowIndex) => (
                      <tr 
                        key={row.id} 
                        className={`
                          hover:bg-blue-50/50 transition-all duration-200
                          ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                          border-b border-gray-100
                        `}
                      >
                        <td className="px-3 py-4 text-sm font-medium text-gray-500">
                          {rowIndex + 1}
                        </td>
                        {headers.map((column) => (
                          <td key={`${row.id}-${column}`} className="px-4 py-4">
                            {column.toLowerCase().includes('statut') ? (
                              <div className="space-y-2">
                                {renderCell(row, column)}
                                <div className="flex justify-start">
                                  {getStatusBadge(row[column])}
                                </div>
                              </div>
                            ) : (
                              <div className="min-w-[140px]">
                                {renderCell(row, column)}
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-4 text-center">
                          {(() => {
                            const score = getScoreFromProspect(row);
                            return (
                              <div className="flex items-center justify-center">
                                <div className={`px-3 py-2 rounded-lg text-sm font-bold min-w-[60px] ${
                                  score !== null 
                                    ? score >= 80 
                                      ? 'bg-green-100 text-green-800' 
                                      : score >= 60 
                                        ? 'bg-orange-100 text-orange-800' 
                                        : 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {score !== null ? `${score}/100` : 'N/A'}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={() => openAnalysisModal(row)}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Analyser le prospect"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => deleteProspect(row.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Supprimer le prospect"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="max-w-md mx-auto">
                <FileText className="w-16 h-16 mx-auto mb-6 text-gray-300" />
                <h3 className="text-xl font-semibold mb-3 text-gray-700">Aucun prospect trouvé</h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Vérifiez que votre Google Sheet contient des données ou que l'ID et le nom de la feuille sont corrects.
                  <br />
                  Les données doivent être au format tableau avec des en-têtes en première ligne.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={addNewRow}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Créer le premier prospect
                  </Button>
                  <div className="text-xs text-gray-400">
                    ou actualisez pour recharger les données
                  </div>
                </div>
              </div>
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

      {/* Analysis Modal */}
      <ProspectAnalysisModal
        isOpen={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        prospect={selectedProspect}
        onEvaluate={handleEvaluateProspect}
        scoreFromSheet={selectedProspect ? getScoreFromProspect(selectedProspect) : null}
      />
    </div>
  );
};