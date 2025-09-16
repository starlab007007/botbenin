import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: any;
}

export const ElevenLabsDiagnostic: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);

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
    } catch (error: any) {
      console.error('❌ Erreur diagnostic:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsRunning(false);
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