import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const GoogleSheetsDiagnostic: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);
    
    const diagnosticResults: DiagnosticResult[] = [];

    // Test 1: Configuration de base
    diagnosticResults.push({
      test: 'Configuration de base',
      status: 'success',
      message: 'Sheet ID configuré: 1iW3xloFx6GH9_Ot8RXBhm9c-SxF1O8R5S1C0wPyzNok'
    });

    // Test 2: Test de connexion avec sheet public Google
    try {
      const { data: testResult, error: testError } = await supabase.functions.invoke('google-sheets-reader', {
        body: {
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          sheetName: 'Class Data'
        }
      });

      if (testError) {
        diagnosticResults.push({
          test: 'Test connexion API Google',
          status: 'error',
          message: `Erreur: ${testError.message}`,
          details: testError
        });
      } else if (testResult?.data) {
        diagnosticResults.push({
          test: 'Test connexion API Google',
          status: 'success',
          message: `✅ API fonctionnelle (${testResult.data.length} lignes de test)`
        });
      } else if (testResult?.error) {
        diagnosticResults.push({
          test: 'Test connexion API Google',
          status: 'warning',
          message: `⚠️ API accessible mais: ${testResult.error}`,
          details: testResult
        });
      }
    } catch (err) {
      diagnosticResults.push({
        test: 'Test connexion API Google',
        status: 'error',
        message: `Exception: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
        details: err
      });
    }

    // Test 3: Test avec votre sheet spécifique
    try {
      const { data: yourSheetResult, error: yourSheetError } = await supabase.functions.invoke('google-sheets-reader', {
        body: {
          spreadsheetId: '1iW3xloFx6GH9_Ot8RXBhm9c-SxF1O8R5S1C0wPyzNok',
          sheetName: 'Feuille 1'
        }
      });

      if (yourSheetError) {
        diagnosticResults.push({
          test: 'Test votre Google Sheet',
          status: 'error',
          message: `Erreur: ${yourSheetError.message}`,
          details: yourSheetError
        });
      } else if (yourSheetResult?.data) {
        const headers = yourSheetResult.headers || [];
        const requiredHeaders = ['user_id', '_isOrphan', 'contact_name', 'company_name', 'company_website', 'Rôle', 'linkedin_contact_url', 'Pertinence du prospect par rapport à notre offre ? (sur 100)', 'Préparation de l\'appel', 'Run', 'Statut'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length === 0) {
          diagnosticResults.push({
            test: 'Test votre Google Sheet',
            status: 'success',
            message: `✅ Sheet accessible avec ${yourSheetResult.data.length} lignes et toutes les colonnes requises`,
            details: { headers, dataCount: yourSheetResult.data.length }
          });
        } else {
          diagnosticResults.push({
            test: 'Test votre Google Sheet',
            status: 'warning',
            message: `⚠️ Sheet accessible (${yourSheetResult.data.length} lignes) mais colonnes manquantes: ${missingHeaders.join(', ')}`,
            details: { headers, missingHeaders, dataCount: yourSheetResult.data.length }
          });
        }
      } else if (yourSheetResult?.error) {
        diagnosticResults.push({
          test: 'Test votre Google Sheet',
          status: 'error',
          message: `Erreur d'accès: ${yourSheetResult.error}`,
          details: yourSheetResult
        });
      } else {
        diagnosticResults.push({
          test: 'Test votre Google Sheet',
          status: 'warning',
          message: 'Sheet accessible mais aucune donnée trouvée'
        });
      }
    } catch (err) {
      diagnosticResults.push({
        test: 'Test votre Google Sheet',
        status: 'error',
        message: `Exception: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
        details: err
      });
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Diagnostic Google Sheets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostic} disabled={isRunning} className="w-full">
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Diagnostic en cours...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Lancer le diagnostic
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Résultats du diagnostic</h3>
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{result.test}</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <Badge className={getStatusColor(result.status)}>
                      {result.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{result.message}</p>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500">Détails techniques</summary>
                    <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Résumé</h4>
            <div className="text-sm text-blue-800">
              <p>✅ Succès: {results.filter(r => r.status === 'success').length}</p>
              <p>⚠️ Avertissements: {results.filter(r => r.status === 'warning').length}</p>
              <p>❌ Erreurs: {results.filter(r => r.status === 'error').length}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};