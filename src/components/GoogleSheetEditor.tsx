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
import { supabase } from '@/integrations/supabase/client';
import { ProspectAnalysisModal } from './ProspectAnalysisModal';
import { WebhookConfigModal } from './WebhookConfigModal';
import { useProspectEvaluationWebhook } from '@/hooks/useProspectEvaluationWebhook';
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
  Target,
  Settings,
  Zap
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
  const [webhookConfigModalOpen, setWebhookConfigModalOpen] = useState(false);

  // Hook pour gérer le webhook d'évaluation
  const {
    webhookConfig,
    isLoading: isWebhookLoading,
    setWebhookConfig,
    triggerEvaluation,
    testWebhook
  } = useProspectEvaluationWebhook();

  const {
    data: googleSheetsData,
    orphanProspects,
    hasOrphans,
    isLoading: isLoadingSheets,
    connectionStatus,
    loadData: loadGoogleSheetsData,
    updateConfig: updateGoogleSheetsConfig,
    adoptOrphanProspects
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

  // Chargement automatique sécurisé à l'ouverture
  useEffect(() => {
    if (spreadsheetId && sheetName && user?.id && isAuthenticated) {
      loadInitialData();
    }
  }, [spreadsheetId, sheetName, user?.id, isAuthenticated]);

  // Synchroniser avec les données Google Sheets - Filtrage sécurisé
  useEffect(() => {
    if (!user?.id || !isAuthenticated) {
      // Sécurité : Nettoyer les données si pas d'utilisateur authentifié
      setLocalData([]);
      setHeaders([]);
      return;
    }

    if (googleSheetsData && Array.isArray(googleSheetsData) && googleSheetsData.length > 0) {
      // Double filtrage sécurisé : vérifier que chaque prospect appartient à l'utilisateur
      const userProspects = googleSheetsData.filter(row => 
        row.user_id === user.id
      );

      const processedData = userProspects.map((row, index) => ({
        ...row,
        id: row.id || `user_${user.id}_${Date.now()}_${index}`,
        user_id: user.id // Force le user_id correct
      }));
      
        // Extraire les headers depuis le premier objet, inclure user_id et _isOrphan pour la synchronisation
        if (processedData.length > 0) {
          const firstRow = processedData[0];
          const allKeys = Object.keys(firstRow).filter(key => key !== 'id');
          // Réorganiser pour avoir user_id et _isOrphan en premier, puis le reste
          const systemColumns = ['user_id', '_isOrphan'];
          const otherColumns = allKeys.filter(key => !systemColumns.includes(key));
          const extractedHeaders = [...systemColumns, ...otherColumns];
          setHeaders(extractedHeaders);
        } else if (orphanProspects && orphanProspects.length > 0) {
          // Si pas de prospects possédés mais des orphelins, extraire headers des orphelins
          const firstOrphan = orphanProspects[0];
          const allKeys = Object.keys(firstOrphan).filter(key => key !== 'id');
          // Réorganiser pour avoir user_id et _isOrphan en premier, puis le reste
          const systemColumns = ['user_id', '_isOrphan'];
          const otherColumns = allKeys.filter(key => !systemColumns.includes(key));
          const extractedHeaders = [...systemColumns, ...otherColumns];
          setHeaders(extractedHeaders);
      }
      
      setLocalData(processedData);
      setLastSyncTime(new Date());
      setHasUnsavedChanges(false);
    } else {
      // Aucune donnée personnelle mais peut-être des orphelins
      if (orphanProspects && orphanProspects.length > 0) {
        const firstOrphan = orphanProspects[0];
        const allKeys = Object.keys(firstOrphan).filter(key => key !== 'id');
        // Réorganiser pour avoir user_id et _isOrphan en premier, puis le reste
        const systemColumns = ['user_id', '_isOrphan'];
        const otherColumns = allKeys.filter(key => !systemColumns.includes(key));
        const extractedHeaders = [...systemColumns, ...otherColumns];
        setHeaders(extractedHeaders);
        setLocalData([]); // Pas de data personnelle
      } else {
        // Charger les headers depuis le Google Sheet
        loadHeadersFromSheet();
      }
    }
  }, [googleSheetsData, user?.id, isAuthenticated]);

  // Charger les headers depuis le Google Sheet si pas de données
  const loadHeadersFromSheet = async () => {
    if (!user?.id || !isAuthenticated) return;
    
    try {
      // Appeler la fonction pour récupérer les headers du sheet
      const { data: result, error } = await supabase.functions.invoke('google-sheets-reader', {
        body: {
          spreadsheetId,
          sheetName,
          headersOnly: true
        }
      });

      if (!error && result?.headers && Array.isArray(result.headers)) {
        const allHeaders = result.headers.filter(header => header !== 'id');
        // Réorganiser pour avoir user_id et _isOrphan en premier, puis le reste
        const systemColumns = ['user_id', '_isOrphan'];
        const otherColumns = allHeaders.filter(header => !systemColumns.includes(header));
        const filteredHeaders = [...systemColumns, ...otherColumns];
        setHeaders(filteredHeaders);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des headers:', error);
    }
  };

  const loadInitialData = async () => {
    // Sécurité : Vérifier l'authentification avant tout chargement
    if (!user?.id || !isAuthenticated) {
      toast.error('Vous devez être connecté pour accéder aux prospects');
      return;
    }

    try {
      await loadGoogleSheetsData();
      toast.success('Données Google Sheet synchronisées');
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

  // Fonction pour mettre à jour la colonne Run dans Google Sheets
  const updateRunInSheet = async (prospectId: string, value: string): Promise<boolean> => {
    const updatedData = localData.map(row => 
      row.id === prospectId 
        ? { ...row, Run: value }
        : row
    );
    
    setLocalData(updatedData);
    
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
      const displayValue = value === 'true' ? 'Oui' : 'Non';
      toast.success(`Statut "Exécuter" mis à jour: ${displayValue}`);
      return true;
    } else {
      // Restaurer les données en cas d'échec
      setLocalData(localData);
      toast.error('Erreur lors de la mise à jour du statut');
      return false;
    }
  };

  const handleEvaluateProspect = async (prospectId: string) => {
    const prospect = localData.find(p => p.id === prospectId);
    if (!prospect) {
      toast.error('Prospect non trouvé');
      return;
    }

    const success = await triggerEvaluation(prospect, updateRunInSheet);
    
    if (success) {
      setAnalysisModalOpen(false);
    }
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

  const handleAdoptOrphans = async () => {
    const success = await adoptOrphanProspects();
    if (success) {
      // Recharger les données après adoption
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
    if (name === 'user_id') return <Shield className="w-4 h-4" />;
    if (name === '_isorphan') return <AlertCircle className="w-4 h-4" />;
    if (name.includes('nom') || name.includes('contact') || name.includes('name')) return <User className="w-4 h-4" />;
    if (name.includes('entreprise') || name.includes('company') || name.includes('société')) return <Building className="w-4 h-4" />;
    if (name.includes('site') || name.includes('web') || name.includes('url')) return <Globe className="w-4 h-4" />;
    if (name.includes('linkedin')) return <Linkedin className="w-4 h-4" />;
    if (name.includes('score') || name.includes('note') || name.includes('pertinence')) return <BarChart3 className="w-4 h-4" />;
    if (name.includes('statut') || name.includes('status')) return <CheckCircle className="w-4 h-4" />;
    if (name.includes('run') || name.includes('exécuter')) return <Zap className="w-4 h-4" />;
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
    const columnLower = column.toLowerCase();
    
    // Rendu spécial pour la colonne user_id (lecture seule)
    if (columnLower === 'user_id') {
      return (
        <Input
          value={value}
          disabled
          className="bg-gray-100 text-gray-600 text-xs font-mono"
          placeholder="ID utilisateur"
        />
      );
    }

    // Rendu spécial pour la colonne _isOrphan (lecture seule)
    if (columnLower === '_isorphan') {
      const isOrphan = value === 'true' || value === true;
      return (
        <Badge variant={isOrphan ? "destructive" : "default"} className="text-xs">
          {isOrphan ? 'Orphelin' : 'Assigné'}
        </Badge>
      );
    }
    
    // Rendu spécial pour les colonnes de statut
    if (columnLower.includes('statut') || columnLower.includes('status')) {
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
            <SelectItem value="Terminé">Terminé</SelectItem>
            <SelectItem value="Succès">Succès</SelectItem>
            <SelectItem value="Échec">Échec</SelectItem>
            <SelectItem value="Annulé">Annulé</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Rendu spécial pour la colonne RUN/Exécuter
    if (columnLower === 'run' || columnLower.includes('exécuter') || columnLower.includes('execute')) {
      // Convertir true/false en Oui/Non pour l'affichage
      const displayValue = value === 'true' || value === true || value === 'Oui' ? 'Oui' : 'Non';
      
      return (
        <Select
          value={displayValue}
          onValueChange={async (newValue) => {
            // Convertir Oui/Non en true/false pour le stockage
            const storageValue = newValue === 'Oui' ? 'true' : 'false';
            updateCellValue(row.id, column, storageValue);
            
            // Sauvegarder automatiquement dans Google Sheets
            const updatedData = localData.map(r => 
              r.id === row.id 
                ? { ...r, [column]: storageValue }
                : r
            );
            
            const formattedData = updatedData.map(r => ({
              ...r,
              user_id: r.user_id || user?.id || 'unknown'
            }));

            const success = await syncToGoogleSheets(
              { spreadsheetId, sheetName }, 
              formattedData
            );

            if (success) {
              setHasUnsavedChanges(false);
              setLastSyncTime(new Date());
              toast.success(`Valeur "${newValue}" sauvegardée dans Google Sheets`);
            } else {
              toast.error('Erreur lors de la sauvegarde automatique');
            }
          }}
        >
          <SelectTrigger className="w-full min-w-[120px]">
            <SelectValue>
              <span className={displayValue === 'Oui' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {displayValue}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Oui">
              <span className="text-green-600 font-medium">Oui</span>
            </SelectItem>
            <SelectItem value="Non">
              <span className="text-red-600 font-medium">Non</span>
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Rendu spécial pour les colonnes de priorité ou score
    if (columnLower.includes('priorité') || columnLower.includes('priority') || 
        columnLower.includes('score') || columnLower.includes('note')) {
      return (
        <Select
          value={value}
          onValueChange={(newValue) => updateCellValue(row.id, column, newValue)}
        >
          <SelectTrigger className="w-full min-w-[120px]">
            <SelectValue placeholder="Choisir..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 - Très faible</SelectItem>
            <SelectItem value="2">2 - Faible</SelectItem>
            <SelectItem value="3">3 - Moyenne</SelectItem>
            <SelectItem value="4">4 - Élevée</SelectItem>
            <SelectItem value="5">5 - Très élevée</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Rendu spécial pour les emails
    if (columnLower.includes('email') || columnLower.includes('mail')) {
      return (
        <Input
          type="email"
          value={value}
          onChange={(e) => updateCellValue(row.id, column, e.target.value)}
          placeholder="email@exemple.com"
          className="w-full min-w-[200px]"
        />
      );
    }

    // Rendu spécial pour les téléphones
    if (columnLower.includes('téléphone') || columnLower.includes('telephone') || 
        columnLower.includes('phone') || columnLower.includes('mobile')) {
      return (
        <Input
          type="tel"
          value={value}
          onChange={(e) => updateCellValue(row.id, column, e.target.value)}
          placeholder="+33 1 23 45 67 89"
          className="w-full min-w-[150px]"
        />
      );
    }

    // Rendu spécial pour les URLs
    if (columnLower.includes('url') || columnLower.includes('site') || 
        columnLower.includes('web') || columnLower.includes('linkedin')) {
      return (
        <Input
          type="url"
          value={value}
          onChange={(e) => updateCellValue(row.id, column, e.target.value)}
          placeholder="https://exemple.com"
          className="w-full min-w-[200px]"
        />
      );
    }

    // Rendu spécial pour les dates
    if (columnLower.includes('date') || columnLower.includes('créé') || 
        columnLower.includes('modifié') || columnLower.includes('updated')) {
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => updateCellValue(row.id, column, e.target.value)}
          className="w-full min-w-[150px]"
        />
      );
    }

    // Rendu spécial pour les champs texte longs (commentaires, descriptions, etc.)
    if (columnLower.includes('commentaire') || columnLower.includes('description') || 
        columnLower.includes('notes') || columnLower.includes('remarque')) {
      return (
        <Input
          value={value}
          onChange={(e) => updateCellValue(row.id, column, e.target.value)}
          placeholder="Saisir une description..."
          className="w-full min-w-[250px]"
        />
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

  // États de chargement améliorés
  if (isLoadingSheets) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Synchronisation en cours...</h3>
          <p className="text-gray-600">Chargement de vos prospects depuis Google Sheets</p>
          <Badge variant="outline" className="mt-2">
            <Clock className="w-3 h-3 mr-1" />
            Patientez quelques instants
          </Badge>
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
                onClick={() => setWebhookConfigModalOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                title="Configurer le webhook d'évaluation"
              >
                <Settings className="w-4 h-4" />
                Webhook
                {webhookConfig?.isActive && (
                  <Zap className="w-3 h-3 text-green-600" />
                )}
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

      {/* Alerte pour prospects orphelins */}
      {hasOrphans && orphanProspects && (
        <Card className="border-orange-200 shadow-lg bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-orange-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Prospects sans propriétaire détectés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-4">
              {orphanProspects.length} prospects trouvés dans votre Google Sheet n'ont pas de propriétaire assigné. 
              Vous pouvez les adopter pour les ajouter à votre compte.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleAdoptOrphans}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                size="sm"
              >
                <Target className="w-4 h-4 mr-2" />
                Adopter les {orphanProspects.length} prospects
              </Button>
              <Badge variant="outline" className="self-center">
                {orphanProspects.length} prospects disponibles
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tableau des données - Prospects */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Mes Prospects ({localData.length})
              <Badge variant="outline" className="ml-2">
                <Shield className="w-3 h-3 mr-1" />
                Utilisateur: {user.email || user.name}
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
            {localData.length > 0 || headers.length > 0 ? (
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
                            <span className="truncate">
                              {header.toLowerCase() === 'run' ? 'Exécuter' : header}
                            </span>
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
                     {localData.length > 0 ? (
                       localData.map((row, rowIndex) => (
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
                       ))
                     ) : (
                       headers.length > 0 && (
                         <tr className="bg-blue-50/30 border-b border-blue-200">
                           <td className="px-3 py-4 text-sm font-medium text-gray-500">1</td>
                           {headers.map((column) => (
                             <td key={`empty-${column}`} className="px-4 py-4">
                               <div className="min-w-[140px]">
                                 <Input
                                   placeholder="Aucune donnée - Cliquez 'Ajouter' pour commencer"
                                   disabled
                                   className="bg-gray-50 border-dashed"
                                 />
                               </div>
                             </td>
                           ))}
                           <td className="px-4 py-4 text-center">
                             <Badge variant="outline" className="bg-gray-50">N/A</Badge>
                           </td>
                           <td className="px-4 py-4 text-center">
                             <Badge variant="outline" className="text-blue-600">Aucun prospect</Badge>
                           </td>
                         </tr>
                       )
                     )}
                   </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="max-w-md mx-auto">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Aucun prospect trouvé
                </h3>
                <p className="text-gray-500 mb-4">
                  {!isAuthenticated 
                    ? "Vous devez être connecté pour voir vos prospects."
                    : "Vous n'avez pas encore de prospects dans votre Google Sheet. Cliquez sur 'Créer mon premier prospect' pour commencer."
                  }
                </p>
                {isAuthenticated && (
                  <Button
                    onClick={addNewRow}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer mon premier prospect
                  </Button>
                )}
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
      
      {/* Modal de configuration du webhook */}
      <WebhookConfigModal
        isOpen={webhookConfigModalOpen}
        onClose={() => setWebhookConfigModalOpen(false)}
        webhookConfig={webhookConfig}
        onSave={setWebhookConfig}
        onDelete={() => setWebhookConfig(null)}
        onTest={testWebhook}
        isLoading={isWebhookLoading}
      />
    </div>
  );
};