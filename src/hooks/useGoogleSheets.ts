
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface GoogleSheetProspectWithUser {
  id: string;
  user_id: string;
  [key: string]: any; // Dynamic columns from Google Sheet
}

interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
}

export const useGoogleSheets = (initialConfig?: GoogleSheetsConfig, userId?: string) => {
  const [data, setData] = useState<GoogleSheetProspectWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [config, setConfig] = useState<GoogleSheetsConfig>(
    initialConfig || {
      spreadsheetId: '14EJzlOtGp3aGQciNLgqafi-yjz6Rc83bGXahWE5OIZ8',
      sheetName: 'Feuille 1'
    }
  );
  const { toast } = useToast();

  // Sécurité : Vérifier la validité de l'utilisateur
  const isUserValid = userId && userId !== 'unknown' && userId.trim() !== '';

  const loadData = useCallback(async (showNotification = true) => {
    // Sécurité stricte : Ne pas charger de données sans utilisateur valide
    if (!isUserValid) {
      setError('Utilisateur non authentifié');
      setConnectionStatus('error');
      setData([]);
      setIsLoading(false);
      if (showNotification) {
        toast({
          title: "❌ Accès refusé",
          description: "Vous devez être connecté pour accéder à vos prospects",
          variant: "destructive",
        });
      }
      return;
    }

    if (!config.spreadsheetId) {
      setError('ID Google Sheet manquant');
      setConnectionStatus('error');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      console.log('🔄 Chargement Google Sheets:', config);

      // Si aucun nom de feuille spécifié, essayer les noms les plus courants
      const sheetNamesToTry = config.sheetName 
        ? [config.sheetName]
        : ['Sheet1', 'Feuille1', 'Feuil1', 'Class Data', 'Data', 'Prospects', 'Liste'];

      let lastError = null;
      let successData = null;

      for (const sheetName of sheetNamesToTry) {
        try {
          console.log(`Tentative avec feuille: "${sheetName}"`);
          
          const { data: result, error: functionError } = await supabase.functions.invoke('google-sheets-reader', {
            body: {
              spreadsheetId: config.spreadsheetId,
              sheetName: sheetName
            }
          });

          if (functionError) {
            console.log(`Erreur function pour "${sheetName}":`, functionError);
            lastError = new Error(`Erreur Supabase: ${functionError.message}`);
            continue;
          }

          if (result?.error) {
            console.log(`Erreur result pour "${sheetName}":`, result.error);
            lastError = new Error(result.details || result.error);
            continue;
          }

          if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
            console.log(`✅ Succès avec feuille "${sheetName}": ${result.data.length} éléments`);
            successData = { result, sheetName };
            break;
          } else {
            console.log(`Feuille "${sheetName}" trouvée mais vide`);
            lastError = new Error(`La feuille "${sheetName}" ne contient pas de données`);
          }
        } catch (err) {
          console.log(`Exception pour "${sheetName}":`, err);
          lastError = err;
          continue;
        }
      }

      if (successData) {
        const { result, sheetName: workingSheetName } = successData;
        
        // Filtrage strict par user_id - Sécurité renforcée
        let processedData: GoogleSheetProspectWithUser[] = [];
        if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
          processedData = result.data
            // Filtrage strict : seulement les données qui ont déjà le bon user_id
            .filter(item => item.user_id && item.user_id === userId)
            .map(item => ({
              ...item,
              id: item.id || `user_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              user_id: userId // Force le user_id correct
            }));
        } else if (result?.prospects && Array.isArray(result.prospects) && result.prospects.length > 0) {
          processedData = result.prospects
            // Filtrage strict : seulement les données qui ont déjà le bon user_id
            .filter(item => item.user_id && item.user_id === userId)
            .map(item => ({
              ...item,
              id: item.id || `user_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              user_id: userId // Force le user_id correct
            }));
        }

        if (processedData.length > 0) {
          setData(processedData);
          setLastSync(new Date());
          setConnectionStatus('connected');
          
          // Mettre à jour la config avec le nom de feuille qui fonctionne
          if (workingSheetName !== config.sheetName) {
            setConfig(prev => ({ ...prev, sheetName: workingSheetName }));
          }

          if (showNotification) {
            toast({
              title: "✅ Synchronisation réussie",
              description: `${processedData.length} prospects chargés depuis la feuille "${workingSheetName}"`,
              duration: 3000,
            });
          }

          console.log('✅ Données chargées:', processedData.length, 'prospects');
        } else {
          throw new Error('Aucune donnée valide trouvée dans la réponse');
        }
      } else {
        throw lastError || new Error('Aucune feuille valide trouvée dans le Google Sheet');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      setConnectionStatus('error');
      
      console.error('❌ Erreur chargement Google Sheets:', err);
      
      if (showNotification) {
        toast({
          title: "❌ Erreur de synchronisation",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [config, toast]);

  const testConnection = useCallback(async () => {
    setConnectionStatus('connecting');
    
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
          title: "❌ Test de connexion échoué",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      if (result?.data) {
        setConnectionStatus('connected');
        toast({
          title: "✅ Connexion réussie",
          description: "L'API Google Sheets est accessible",
        });
        return true;
      }

      setConnectionStatus('error');
      toast({
        title: "⚠️ Connexion partielle",
        description: "API accessible mais pas de données test",
        variant: "default",
      });
      return false;
    } catch (err) {
      setConnectionStatus('error');
      toast({
        title: "❌ Erreur de test",
        description: "Impossible de tester la connexion",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const updateConfig = useCallback((newConfig: Partial<GoogleSheetsConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const refreshData = useCallback(() => {
    loadData(true);
  }, [loadData]);

  // Chargement automatique au démarrage avec sécurité
  useEffect(() => {
    if (config.spreadsheetId && config.sheetName && isUserValid) {
      loadData(false);
    } else if (!isUserValid) {
      // Nettoyer les données si l'utilisateur n'est pas valide
      setData([]);
      setConnectionStatus('idle');
      setError('Utilisateur non authentifié');
    }
  }, [loadData, config, isUserValid]);

  // Auto-refresh toutes les 5 minutes si connecté
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const interval = setInterval(() => {
        loadData(false);
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [connectionStatus, loadData]);

  return {
    data,
    isLoading,
    error,
    lastSync,
    connectionStatus,
    config,
    loadData,
    testConnection,
    updateConfig,
    refreshData,
    // Statistiques calculées
    stats: {
      total: data.length,
      qualified: data.filter(p => p.status === 'qualified' || p.Statut === 'Succès').length,
      new: data.filter(p => p.status === 'new' || p.Statut === 'En attente').length,
      contacted: data.filter(p => p.status === 'contacted' || p.Statut === 'En cours').length,
      averageScore: data.length > 0 ? 
        Math.round(data.reduce((sum, p) => {
          const score = parseInt(p['Pertinence du prospect par rapport à notre offre ? (sur 100)'] || p.score || '0');
          return sum + score;
        }, 0) / data.length * 10) / 10 : 0
    }
  };
};
