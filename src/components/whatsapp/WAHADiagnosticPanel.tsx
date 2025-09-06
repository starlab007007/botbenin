import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, XCircle, Loader2, Play, RefreshCw } from 'lucide-react';
import { useWAHADiagnostic, DiagnosticResult } from '@/hooks/useWAHADiagnostic';

const DiagnosticResultItem: React.FC<{ result: DiagnosticResult }> = ({ result }) => {
  const getStatusIcon = () => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = () => {
    if (result.success) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Réussi</Badge>;
    }
    return <Badge variant="destructive">Échec</Badge>;
  };

  return (
    <div className="flex items-start space-x-3 p-3 border rounded-lg">
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon()}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium truncate">
            {result.test.replace(/_/g, ' ').toUpperCase()}
          </h4>
          {getStatusBadge()}
        </div>
        
        {result.status && (
          <p className="text-xs text-muted-foreground mt-1">
            Status: {result.status}
          </p>
        )}
        
        {result.details && (
          <p className="text-xs text-muted-foreground mt-1">
            {result.details}
          </p>
        )}
        
        {result.error && (
          <p className="text-xs text-red-600 mt-1">
            Erreur: {result.error}
          </p>
        )}
        
        {result.responseBody && result.responseBody.length < 100 && (
          <p className="text-xs text-muted-foreground mt-1 font-mono bg-gray-50 p-1 rounded">
            {result.responseBody}
          </p>
        )}
      </div>
    </div>
  );
};

export const WAHADiagnosticPanel: React.FC = () => {
  const { report, loading, error, runDiagnostic } = useWAHADiagnostic();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Diagnostic WAHA
            </CardTitle>
            <CardDescription>
              Analysez les problèmes d'authentification et de connectivité WAHA
            </CardDescription>
          </div>
          <Button
            onClick={runDiagnostic}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                {report ? <RefreshCw className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {report ? 'Relancer' : 'Démarrer'} le diagnostic
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">Erreur de diagnostic: {error}</span>
            </div>
          </div>
        )}

        {report && (
          <>
            {/* Configuration Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-600">Serveur</div>
                <div className="text-xs text-gray-500 truncate">{report.waha_config.url}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-600">Username</div>
                <div className="text-xs text-gray-500">{report.waha_config.username}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-600">Password</div>
                <div className="text-xs text-gray-500">{report.waha_config.password}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-600">API Key</div>
                <div className="text-xs text-gray-500">{report.waha_config.api_key}</div>
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{report.summary.total_tests}</div>
                <div className="text-sm text-gray-600">Tests totaux</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{report.summary.successful_tests}</div>
                <div className="text-sm text-gray-600">Réussis</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">{report.summary.failed_tests}</div>
                <div className="text-sm text-gray-600">Échecs</div>
              </div>
            </div>

            {/* Recommendations */}
            {report.summary.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Recommandations:</h4>
                {report.summary.recommendations.map((rec, index) => (
                  <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    {rec}
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Detailed Results */}
            <div>
              <h4 className="font-medium text-sm mb-3">Résultats détaillés:</h4>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {report.diagnostic_results.map((result, index) => (
                    <DiagnosticResultItem key={index} result={result} />
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Diagnostic effectué le {new Date(report.timestamp).toLocaleString('fr-FR')}
            </div>
          </>
        )}

        {!report && !loading && !error && (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Cliquez sur "Démarrer le diagnostic" pour analyser la connectivité WAHA</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};