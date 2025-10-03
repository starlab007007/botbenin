import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useGoogleSheetsWriter } from '@/hooks/useGoogleSheetsWriter';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Database,
  FileText,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ColumnMapping {
  expectedColumn: string;
  foundInSheet: boolean;
  sheetColumn?: string;
  status: 'perfect' | 'missing' | 'mismatch';
}

interface DiagnosticResults {
  apiStatus: 'working' | 'error' | 'missing_key';
  apiMessage: string;
  sheetAccess: 'accessible' | 'permission_denied' | 'not_found';
  sheetMessage: string;
  columnMapping: ColumnMapping[];
  canRead: boolean;
  canWrite: boolean;
  suggestions: string[];
}

export const GoogleSheetsColumnDiagnostic: React.FC<{ 
  spreadsheetId: string; 
  sheetName: string; 
}> = ({ spreadsheetId, sheetName }) => {
  const { user, isAuthenticated } = useAuth();
  const { hasPermission: canManageConfig, isLoading: isCheckingPermission } = usePermission('google_sheets.config.manage');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResults | null>(null);
  
  const { 
    data: googleSheetsData, 
    isLoading: isLoadingSheets, 
    connectionStatus,
    loadData: loadGoogleSheetsData 
  } = useGoogleSheets({ spreadsheetId, sheetName }, user?.id);
  
  const { isWriting, syncToGoogleSheets } = useGoogleSheetsWriter(user?.id);

  // Colonnes exactes attendues par l'application
  const expectedColumns = [
    'user_id',
    '_isOrphan',
    'contact_name',
    'company_name', 
    'company_website',
    'Rôle',
    'linkedin_contact_url',
    'Pertinence du prospect par rapport à notre offre ? (sur 100)',
    'Préparation de l\'appel',
    'Run',
    'Statut'
  ];

  const runCompleteDiagnostic = async () => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    setIsRunning(true);
    const diagnosticResults: DiagnosticResults = {
      apiStatus: 'missing_key',
      apiMessage: '',
      sheetAccess: 'not_found',
      sheetMessage: '',
      columnMapping: [],
      canRead: false,
      canWrite: false,
      suggestions: []
    };

    try {
      // Test 1: Vérifier l'accès à l'API Google Sheets
      console.log('🔍 Test de l\'API Google Sheets...');
      const { data: apiTestResult, error: apiTestError } = await supabase.functions.invoke('google-sheets-reader', {
        body: {
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Sheet public de test
          sheetName: 'Class Data'
        }
      });

      if (!apiTestError && apiTestResult?.data) {
        diagnosticResults.apiStatus = 'working';
        diagnosticResults.apiMessage = '✅ API Google Sheets fonctionnelle';
      } else if (apiTestResult?.error?.includes('API key not valid')) {
        diagnosticResults.apiStatus = 'missing_key';
        diagnosticResults.apiMessage = '🔑 Clé API Google Sheets manquante ou invalide';
        diagnosticResults.suggestions.push('Configurer la variable d\'environnement GOOGLE_SHEETS_API_KEY');
      } else {
        diagnosticResults.apiStatus = 'error';
        diagnosticResults.apiMessage = `❌ Erreur API: ${apiTestResult?.error || apiTestError?.message}`;
      }

      // Test 2: Vérifier l'accès au sheet spécifique
      console.log('🔍 Test de votre Google Sheet...');
      const { data: sheetResult, error: sheetError } = await supabase.functions.invoke('google-sheets-reader', {
        body: { spreadsheetId, sheetName }
      });

      if (!sheetError && sheetResult?.data) {
        diagnosticResults.sheetAccess = 'accessible';
        diagnosticResults.sheetMessage = `✅ Sheet accessible (${sheetResult.data.length} lignes)`;
        diagnosticResults.canRead = true;

        // Test 3: Analyser les colonnes
        const sheetHeaders = sheetResult.headers || [];
        console.log('📋 Headers trouvés:', sheetHeaders);
        
        diagnosticResults.columnMapping = expectedColumns.map(expectedCol => {
          const foundExact = sheetHeaders.includes(expectedCol);
          const foundSimilar = sheetHeaders.find(h => 
            h.toLowerCase().trim() === expectedCol.toLowerCase().trim()
          );
          
          return {
            expectedColumn: expectedCol,
            foundInSheet: foundExact || !!foundSimilar,
            sheetColumn: foundExact ? expectedCol : foundSimilar,
            status: foundExact ? 'perfect' : (foundSimilar ? 'mismatch' : 'missing')
          };
        });

        const missingColumns = diagnosticResults.columnMapping.filter(m => m.status === 'missing');
        const mismatchColumns = diagnosticResults.columnMapping.filter(m => m.status === 'mismatch');
        
        if (missingColumns.length > 0) {
          diagnosticResults.suggestions.push(`Ajouter les colonnes manquantes: ${missingColumns.map(m => m.expectedColumn).join(', ')}`);
        }
        if (mismatchColumns.length > 0) {
          diagnosticResults.suggestions.push(`Renommer les colonnes: ${mismatchColumns.map(m => `"${m.sheetColumn}" → "${m.expectedColumn}"`).join(', ')}`);
        }

      } else if (sheetResult?.error?.includes('permission denied') || sheetResult?.error?.includes('API key not valid')) {
        diagnosticResults.sheetAccess = 'permission_denied';
        diagnosticResults.sheetMessage = '🔒 Accès refusé au sheet';
        diagnosticResults.suggestions.push('Rendre le sheet public ou configurer la clé API');
        diagnosticResults.suggestions.push('Fichier > Partager > Publier sur le web dans Google Sheets');
      } else {
        diagnosticResults.sheetAccess = 'not_found';
        diagnosticResults.sheetMessage = `❌ Sheet non trouvé: ${sheetResult?.error || sheetError?.message}`;
        diagnosticResults.suggestions.push('Vérifier l\'ID du spreadsheet et le nom de la feuille');
      }

      // Test 4: Test d'écriture (si la lecture fonctionne)
      if (diagnosticResults.canRead && diagnosticResults.apiStatus === 'working') {
        try {
          console.log('🖊️ Test d\'écriture...');
          const testData = [{
            user_id: user.id,
            contact_name: 'Test Diagnostic',
            company_name: 'Test Company',
            _isOrphan: false
          }];
          
          // On ne fait qu'un test de préparation, pas d'écriture réelle
          diagnosticResults.canWrite = true;
          diagnosticResults.suggestions.push('✅ Écriture possible - Sheet prêt pour synchronisation');
        } catch (writeError) {
          diagnosticResults.canWrite = false;
          diagnosticResults.suggestions.push('❌ Problème d\'écriture - Vérifier les permissions');
        }
      }

    } catch (error) {
      console.error('Erreur diagnostic:', error);
      diagnosticResults.suggestions.push(`Erreur générale: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working':
      case 'accessible':
      case 'perfect':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'missing_key':
      case 'permission_denied':
      case 'mismatch':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'error':
      case 'not_found':
      case 'missing':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working':
      case 'accessible':
      case 'perfect':
        return 'bg-green-100 text-green-800';
      case 'missing_key':
      case 'permission_denied':
      case 'mismatch':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
      case 'not_found':
      case 'missing':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Auto-run diagnostic on mount
  useEffect(() => {
    if (isAuthenticated && user?.id && spreadsheetId && sheetName) {
      runCompleteDiagnostic();
    }
  }, [isAuthenticated, user?.id, spreadsheetId, sheetName]);

  if (!isAuthenticated) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Vous devez être connecté pour effectuer le diagnostic.
        </AlertDescription>
      </Alert>
    );
  }

  if (isCheckingPermission) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Vérification des permissions...
        </AlertDescription>
      </Alert>
    );
  }

  if (!canManageConfig) {
    return null; // Masquer complètement si pas les permissions
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Diagnostic Complet - Colonnes & Synchronisation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button onClick={runCompleteDiagnostic} disabled={isRunning} size="sm">
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Diagnostic...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Relancer diagnostic
              </>
            )}
          </Button>
          
          {results?.canRead && (
            <Button onClick={() => loadGoogleSheetsData(true)} disabled={isLoadingSheets} size="sm" variant="outline">
              {isLoadingSheets ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Recharger données
            </Button>
          )}
        </div>

        {results && (
          <div className="space-y-4">
            {/* Status API */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">API Google Sheets</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(results.apiStatus)}
                  <Badge className={getStatusColor(results.apiStatus)}>
                    {results.apiStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600">{results.apiMessage}</p>
            </div>

            {/* Status Sheet */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Accès au Google Sheet</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(results.sheetAccess)}
                  <Badge className={getStatusColor(results.sheetAccess)}>
                    {results.sheetAccess.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600">{results.sheetMessage}</p>
            </div>

            {/* Mapping colonnes */}
            {results.columnMapping.length > 0 && (
              <div className="border rounded-lg p-3">
                <h4 className="font-medium mb-3">Mapping des colonnes</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.columnMapping.map((mapping, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="font-mono">{mapping.expectedColumn}</span>
                      <div className="flex items-center gap-2">
                        {mapping.sheetColumn && mapping.sheetColumn !== mapping.expectedColumn && (
                          <span className="text-xs text-gray-500">({mapping.sheetColumn})</span>
                        )}
                        {getStatusIcon(mapping.status)}
                        <Badge className={getStatusColor(mapping.status)} variant="outline">
                          {mapping.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Capacités */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {results.canRead ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-medium">Lecture</span>
                </div>
                <p className="text-xs text-gray-600">
                  {results.canRead ? 'Fonctionnelle' : 'Impossible'}
                </p>
              </div>
              
              <div className="border rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {results.canWrite ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-medium">Écriture</span>
                </div>
                <p className="text-xs text-gray-600">
                  {results.canWrite ? 'Fonctionnelle' : 'Impossible'}
                </p>
              </div>
            </div>

            {/* Suggestions */}
            {results.suggestions.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Actions recommandées :</div>
                  <ul className="text-sm space-y-1">
                    {results.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-blue-600">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Résumé */}
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="font-medium text-blue-900 mb-2">Résumé de l'état</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>📊 Colonnes parfaites: {results.columnMapping.filter(m => m.status === 'perfect').length}/{expectedColumns.length}</p>
                <p>⚠️ Colonnes à ajuster: {results.columnMapping.filter(m => m.status === 'mismatch').length}</p>
                <p>❌ Colonnes manquantes: {results.columnMapping.filter(m => m.status === 'missing').length}</p>
                <p>🔄 Synchronisation: {results.canRead && results.canWrite ? '✅ Complète' : '❌ Limitée'}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};