import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface PolicyStatus {
  policy_name: string;
  policy_type: string;
  is_active: boolean;
  description: string;
}

interface TestResult {
  test_name: string;
  status: string;
  details: string;
}

export const BotRLSDiagnostic: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyStatus[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const checkPolicies = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_final_bot_policies');
      
      if (error) throw error;
      
      setPolicies(data || []);
      toast({
        title: "Diagnostic des politiques",
        description: "État des politiques RLS récupéré avec succès",
      });
    } catch (error: any) {
      console.error('Erreur lors du diagnostic des politiques:', error);
      toast({
        title: "Erreur de diagnostic",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runBotCreationTest = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('test_bot_creation_fixed');
      
      if (error) throw error;
      
      setTestResults(data || []);
      
      const hasFailures = data?.some((result: TestResult) => result.status === 'failed');
      
      toast({
        title: hasFailures ? "Test avec erreurs" : "Test réussi",
        description: hasFailures 
          ? "Certains tests ont échoué, vérifiez les détails"
          : "Tous les tests de création de bots ont réussi",
        variant: hasFailures ? "destructive" : "default",
      });
    } catch (error: any) {
      console.error('Erreur lors du test de création:', error);
      toast({
        title: "Erreur de test",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Diagnostic des Politiques RLS - Bots
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={checkPolicies} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Vérifier les Politiques
            </Button>
            <Button 
              onClick={runBotCreationTest} 
              disabled={isLoading}
              variant="default"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Tester la Création
            </Button>
          </div>

          {policies.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">État des Politiques RLS</h3>
              <div className="grid gap-2">
                {policies.map((policy, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{policy.policy_name}</div>
                      <div className="text-sm text-gray-600">{policy.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {policy.policy_type}
                      </Badge>
                      <Badge className={getStatusColor(policy.is_active)}>
                        {policy.is_active ? 'ACTIVE' : 'DÉSACTIVÉE'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Résultats des Tests</h3>
              <div className="grid gap-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="font-medium">{result.test_name}</div>
                      <div className="text-sm text-gray-600">{result.details}</div>
                    </div>
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Note :</strong> La politique conflictuelle "ALL" a été désactivée pour résoudre les problèmes de sauvegarde. 
              Les politiques spécifiques (SELECT, INSERT, UPDATE, DELETE) restent actives et fonctionnelles.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};