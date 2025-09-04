import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const WAHATestDiagnostic = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const runDiagnostic = async () => {
    setIsLoading(true);
    try {
      console.log('Calling WAHA test diagnostic...');
      
      const { data, error } = await supabase.functions.invoke('waha-test-auth', {
        body: {}
      });

      if (error) {
        console.error('Function error:', error);
        toast.error(`Erreur: ${error.message}`);
        return;
      }

      console.log('Test results:', data);
      setTestResults(data);
      
      if (data.success) {
        toast.success('Tests d\'authentification WAHA terminés');
      } else {
        toast.error('Tests échoués');
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.error('Erreur lors du diagnostic');
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateSession = async () => {
    setIsLoading(true);
    try {
      const sessionName = `test_${Date.now()}`;
      console.log('Testing session creation with name:', sessionName);
      
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'create',
          sessionName: sessionName,
          phoneNumber: '+1234567890'
        }
      });

      if (error) {
        console.error('Session creation error:', error);
        toast.error(`Erreur création session: ${error.message}`);
        return;
      }

      console.log('Session creation result:', data);
      
      if (data.success) {
        toast.success('Session créée avec succès!');
        setTestResults({ ...testResults, sessionCreate: data });
      } else {
        toast.error(`Échec création session: ${data.error}`);
        setTestResults({ ...testResults, sessionCreate: data });
      }
    } catch (error) {
      console.error('Session creation error:', error);
      toast.error('Erreur lors de la création de session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>Diagnostic WAHA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostic} 
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Test en cours...' : 'Tester Authentification'}
          </Button>
          
          <Button 
            onClick={testCreateSession} 
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? 'Création...' : 'Tester Création Session'}
          </Button>
        </div>

        {testResults && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Résultats des tests:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};