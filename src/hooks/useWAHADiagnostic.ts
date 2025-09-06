import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DiagnosticResult {
  test: string;
  success: boolean;
  status?: number;
  details?: string;
  error?: string;
  responseBody?: string;
  cookies?: string;
}

export interface DiagnosticSummary {
  total_tests: number;
  successful_tests: number;
  failed_tests: number;
  recommendations: string[];
}

export interface DiagnosticReport {
  timestamp: string;
  waha_config: {
    url: string;
    username: string;
    password: string;
    api_key: string;
  };
  diagnostic_results: DiagnosticResult[];
  summary: DiagnosticSummary;
}

export const useWAHADiagnostic = () => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    
    try {
      console.log('🔍 Starting WAHA diagnostic...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(
        'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waha-diagnostic',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const diagnosticData: DiagnosticReport = await response.json();
      setReport(diagnosticData);
      
      // Show summary toast
      const { summary } = diagnosticData;
      if (summary.successful_tests === 0) {
        toast.error('🔴 Tous les tests d\'authentification ont échoué');
      } else if (summary.failed_tests > 0) {
        toast.warning(`🟡 ${summary.successful_tests}/${summary.total_tests} tests réussis`);
      } else {
        toast.success('🟢 Tous les tests d\'authentification ont réussi');
      }
      
      console.log('🔍 Diagnostic terminé:', diagnosticData);
      
    } catch (error) {
      console.error('Error running diagnostic:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur de diagnostic';
      setError(errorMessage);
      toast.error('Erreur lors du diagnostic WAHA');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    report,
    loading,
    error,
    runDiagnostic
  };
};