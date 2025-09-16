import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: any;
}

interface PermissionCheck {
  success: boolean;
  userInfo?: any;
  permissions?: {
    basic_api: boolean;
    convai_read: boolean;
    convai_write: boolean;
    agent_access: boolean;
  };
  recommendations?: string[];
  error?: string;
}

export const ElevenLabsDiagnostic: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [permissionCheck, setPermissionCheck] = useState<PermissionCheck | null>(null);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);
    setPermissionCheck(null);

    try {
      console.log('🔍 Lancement du diagnostic ElevenLabs...');
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-diagnostic');

      if (error) {
        toast.error(`Erreur diagnostic: ${error.message}`);
        return;
      }

      if (data.success) {
        setResults(data.diagnostics);
        setSummary(data.summary);
        toast.success('Diagnostic terminé !');
      } else {
        toast.error(`Erreur diagnostic: ${data.error}`);
        setResults(data.diagnostics || []);
      }

      // Lancer aussi la vérification des permissions
      await checkPermissions();
    } catch (error: any) {
      console.error('❌ Erreur diagnostic:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-check-permissions');
      
      if (error) {
        console.error('❌ Erreur vérification permissions:', error);
        return;
      }

      setPermissionCheck(data);
    } catch (error: any) {
      console.error('❌ Erreur check permissions:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAIL':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'PASS' ? 'default' : status === 'FAIL' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic ElevenLabs</CardTitle>
          <CardDescription>
            Vérifiez la configuration et la connectivité avec l'API ElevenLabs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runDiagnostic} 
            disabled={isRunning}
            className="w-full mb-4"
          >
            {isRunning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isRunning ? 'Diagnostic en cours...' : 'Lancer le diagnostic'}
          </Button>

          {/* Alerte pour les problèmes de permissions */}
          {permissionCheck && !permissionCheck.success && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <Key className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-red-800">Problème de permissions détecté !</p>
                  <div className="text-sm space-y-1">
                    {permissionCheck.recommendations?.map((rec, i) => (
                      <div key={i}>{rec}</div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('https://elevenlabs.io/app/settings/api-keys', '_blank')}
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Gérer les clés API
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('https://elevenlabs.io/pricing', '_blank')}
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Plans & Permissions
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Informations sur le compte */}
          {permissionCheck?.userInfo && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="font-medium">Informations du compte</h3>
                  <div className="text-sm text-muted-foreground">
                    <div>Email: {permissionCheck.userInfo.email}</div>
                    <div>Plan: {permissionCheck.userInfo.subscription?.tier || 'Free'}</div>
                    {permissionCheck.userInfo.subscription?.character_count && (
                      <div>Caractères utilisés: {permissionCheck.userInfo.subscription.character_count}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statut des permissions */}
          {permissionCheck?.permissions && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h3 className="font-medium">Statut des Permissions</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {permissionCheck.permissions.basic_api ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span>API de base</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {permissionCheck.permissions.convai_read ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span>Lecture ConvAI</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {permissionCheck.permissions.convai_write ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span>Écriture ConvAI</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {permissionCheck.permissions.agent_access ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span>Accès Agent</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {summary && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-500">{summary.passed}</div>
                    <div className="text-sm text-muted-foreground">Réussis</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
                    <div className="text-sm text-muted-foreground">Échoués</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{summary.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {results.map((result, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {typeof result.details === 'string' ? (
                      result.details
                    ) : (
                      <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};