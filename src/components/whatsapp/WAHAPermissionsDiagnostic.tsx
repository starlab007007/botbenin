import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWAHADiagnostic } from '@/hooks/useWAHADiagnostic';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const WAHAPermissionsDiagnostic: React.FC = () => {
  const { report, loading, error, runDiagnostic } = useWAHADiagnostic();

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getPermissionAnalysis = () => {
    if (!report) return null;

    const readTests = report.diagnostic_results.filter(r => 
      r.test.includes('server_availability') || 
      r.test.includes('dashboard_auth') ||
      r.test === 'endpoint_sessions'
    );

    const writeTests = report.diagnostic_results.filter(r => 
      r.test.includes('api_key') || 
      r.test.includes('bearer') ||
      r.test.includes('basic_auth')
    );

    const readSuccess = readTests.some(t => t.success);
    const writeSuccess = writeTests.some(t => t.success);

    return {
      canRead: readSuccess,
      canWrite: writeSuccess,
      readTests,
      writeTests
    };
  };

  const analysis = getPermissionAnalysis();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          🔍 Diagnostic des Permissions WAHA
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Analyse détaillée des permissions de votre API Key WAHA
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <Button 
          onClick={runDiagnostic} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            'Lancer le Diagnostic des Permissions'
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {report && (
          <div className="space-y-4">
            
            {/* Résumé Global */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold mb-2">📊 Résumé Global</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">{report.summary.total_tests}</div>
                  <div>Tests Total</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">{report.summary.successful_tests}</div>
                  <div>Réussis</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-red-600">{report.summary.failed_tests}</div>
                  <div>Échoués</div>
                </div>
              </div>
            </div>

            {/* Analyse des Permissions */}
            {analysis && (
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-3">🔑 Analyse des Permissions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(analysis.canRead)}
                    <span className={analysis.canRead ? 'text-green-600' : 'text-red-600'}>
                      Permissions de LECTURE
                    </span>
                    {analysis.canRead && <Badge variant="secondary">OK</Badge>}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(analysis.canWrite)}
                    <span className={analysis.canWrite ? 'text-green-600' : 'text-red-600'}>
                      Permissions d'ÉCRITURE
                    </span>
                    {!analysis.canWrite && <Badge variant="destructive">MANQUANT</Badge>}
                  </div>
                </div>

                {/* Problème Identifié */}
                {analysis.canRead && !analysis.canWrite && (
                  <Alert className="mb-4">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription className="font-medium">
                      🎯 PROBLÈME IDENTIFIÉ: Votre API Key WAHA a uniquement des permissions de LECTURE. 
                      Les permissions d'ÉCRITURE sont nécessaires pour créer des sessions et générer des QR codes.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Détails des Tests */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">📋 Détails des Tests</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {report.diagnostic_results.map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.success)}
                      <span>{result.test}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.status && (
                        <Badge variant={result.success ? "secondary" : "destructive"}>
                          {result.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Solutions Recommandées */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                💡 Solutions Recommandées
              </h3>
              <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                {report.summary.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
                
                {analysis?.canRead && !analysis?.canWrite && (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>Vérifier que votre API Key WAHA a les permissions d'écriture (create, update, delete)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>Régénérer une nouvelle API Key avec toutes les permissions dans le dashboard WAHA</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>Mettre à jour la variable d'environnement WAHA_API_KEY avec la nouvelle clé</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default WAHAPermissionsDiagnostic;