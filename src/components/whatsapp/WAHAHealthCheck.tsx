import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle,
  XCircle,
  RefreshCw,
  Activity,
  AlertTriangle,
  Settings
} from 'lucide-react';

interface AuthTest {
  method: string;
  headers?: string[];
  status?: number;
  statusText?: string;
  success: boolean;
  error?: string;
}

interface HealthCheckResult {
  success: boolean;
  wahaBaseUrl?: string;
  authTests?: AuthTest[];
  workingMethods?: AuthTest[];
  recommendations?: string;
  error?: string;
}

const WAHAHealthCheck: React.FC = () => {
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('waha-health-check');
      
      if (error) throw error;
      
      setResult(data);
      
      if (data.workingMethods?.length > 0) {
        toast({
          title: "Test de santé réussi",
          description: `${data.workingMethods.length} méthode(s) d'authentification fonctionnent`,
        });
      } else {
        toast({
          title: "Problème détecté",
          description: "Aucune méthode d'authentification ne fonctionne",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Health check failed:', error);
      setResult({
        success: false,
        error: error.message || 'Erreur inconnue'
      });
      toast({
        title: "Erreur",
        description: "Impossible d'exécuter le test de santé",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMethodBadge = (test: AuthTest) => {
    if (test.success) {
      return <Badge className="bg-green-500">✓ Fonctionne</Badge>;
    } else {
      return <Badge variant="destructive">✗ Échec</Badge>;
    }
  };

  const getMethodDescription = (method: string) => {
    switch (method) {
      case 'no_auth': return 'Aucune authentification';
      case 'basic_auth': return 'Authentification basique (Username/Password)';
      case 'dashboard_access': return 'Accès au dashboard WAHA';
      default:
        if (method.includes('api_key')) {
          return `Clé API (${method.replace('api_key_variant_', 'Variante ')})`;
        }
        return method;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Diagnostic WAHA
        </CardTitle>
        <CardDescription>
          Testez la connectivité et l'authentification avec le serveur WAHA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runHealthCheck} 
          disabled={loading}
          className="w-full"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Test en cours...' : 'Lancer le diagnostic'}
        </Button>

        {result && (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              {result.success && result.workingMethods && result.workingMethods.length > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {result.success && result.workingMethods && result.workingMethods.length > 0 
                    ? 'Connexion WAHA fonctionnelle' 
                    : 'Problème de connexion WAHA'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.wahaBaseUrl && `Serveur: ${result.wahaBaseUrl}`}
                </p>
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations && (
              <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Recommandation</p>
                    <p className="text-sm text-blue-700">{result.recommendations}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Working Methods */}
            {result.workingMethods && result.workingMethods.length > 0 && (
              <div>
                <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Méthodes d'authentification fonctionnelles
                </h4>
                <div className="space-y-2">
                  {result.workingMethods.map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded border-l-4 border-green-500">
                      <span className="text-sm">{getMethodDescription(test.method)}</span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500">Status: {test.status}</Badge>
                        {getMethodBadge(test)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Test Results */}
            {result.authTests && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Tous les tests d'authentification
                </h4>
                <div className="space-y-2">
                  {result.authTests.map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <span className="text-sm font-medium">{getMethodDescription(test.method)}</span>
                        {test.headers && (
                          <p className="text-xs text-muted-foreground">
                            Headers: {test.headers.join(', ')}
                          </p>
                        )}
                        {test.error && (
                          <p className="text-xs text-red-600">Erreur: {test.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {test.status && (
                          <Badge variant="outline">
                            {test.status} {test.statusText}
                          </Badge>
                        )}
                        {getMethodBadge(test)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Details */}
            {result.error && (
              <div className="p-3 rounded-lg bg-red-50 border-l-4 border-red-500">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Erreur</p>
                    <p className="text-sm text-red-700">{result.error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WAHAHealthCheck;