
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface GoogleSheetProspect {
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

interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
}

export const useGoogleSheets = (initialConfig?: GoogleSheetsConfig) => {
  const [data, setData] = useState<GoogleSheetProspect[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [config, setConfig] = useState<GoogleSheetsConfig>(
    initialConfig || {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetName: 'Class Data'
    }
  );
  const { toast } = useToast();

  const loadData = useCallback(async (showNotification = true) => {
    if (!config.spreadsheetId || !config.sheetName) {
      setError('Configuration Google Sheets incomplète');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      console.log('🔄 Chargement Google Sheets:', config);

      const { data: result, error: functionError } = await supabase.functions.invoke('google-sheets-reader', {
        body: {
          spreadsheetId: config.spreadsheetId,
          sheetName: config.sheetName
        }
      });

      if (functionError) {
        throw new Error(`Erreur Supabase: ${functionError.message}`);
      }

      if (result?.error) {
        throw new Error(result.details || result.error);
      }

      if (result?.data && Array.isArray(result.data)) {
        const processedData = result.data.map(item => ({
          ...item,
          source: 'Google Sheets',
          id: item.id || `gs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }));

        setData(processedData);
        setLastSync(new Date());
        setConnectionStatus('connected');

        if (showNotification) {
          toast({
            title: "✅ Synchronisation réussie",
            description: `${processedData.length} prospects chargés depuis Google Sheets`,
            duration: 3000,
          });
        }

        console.log('✅ Données chargées:', processedData.length, 'prospects');
      } else {
        setData([]);
        setConnectionStatus('error');
        setError('Aucune donnée trouvée dans la feuille');
        
        if (showNotification) {
          toast({
            title: "⚠️ Aucune donnée",
            description: "La feuille Google Sheets semble vide",
            variant: "default",
          });
        }
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

  // Chargement automatique au démarrage
  useEffect(() => {
    if (config.spreadsheetId && config.sheetName) {
      loadData(false);
    }
  }, [loadData, config]);

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
      qualified: data.filter(p => p.status === 'qualified').length,
      new: data.filter(p => p.status === 'new').length,
      contacted: data.filter(p => p.status === 'contacted').length,
      averageScore: data.length > 0 ? 
        Math.round(data.reduce((sum, p) => sum + p.score, 0) / data.length * 10) / 10 : 0
    }
  };
};
