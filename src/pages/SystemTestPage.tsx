import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, AlertTriangle, Play, Database, User, Bot } from 'lucide-react';

interface TestResult {
  testName: string;
  success: boolean;
  details: string;
  timestamp: Date;
}

export const SystemTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const addTestResult = (testName: string, success: boolean, details: string) => {
    setTestResults(prev => [...prev, {
      testName,
      success,
      details,
      timestamp: new Date()
    }]);
  };

  const runSystemHealthCheck = async () => {
    try {
      const { data, error } = await supabase
        .rpc('system_health_check');

      if (error) throw error;

      data.forEach((metric: any) => {
        addTestResult(
          `Health Check: ${metric.metric_name}`,
          metric.status === 'success' || metric.status === 'info',
          `${metric.metric_value} (${metric.status})`
        );
      });

      return true;
    } catch (error) {
      addTestResult('System Health Check', false, `Erreur: ${error}`);
      return false;
    }
  };

  const testDatabaseTriggers = async () => {
    if (!isAuthenticated || !user) {
      addTestResult('Database Triggers Test', false, 'Utilisateur non authentifié');
      return false;
    }

    try {
      // Tester la création automatique de bot_owner
      const { data: ownerCheck } = await supabase
        .from('bot_owners')
        .select('id, max_bots')
        .eq('user_id', user.id)
        .single();

      if (ownerCheck) {
        addTestResult(
          'Bot Owner Existence',
          true,
          `Bot owner existant avec limite: ${ownerCheck.max_bots}`
        );
      } else {
        addTestResult('Bot Owner Existence', false, 'Aucun bot owner trouvé');
        return false;
      }

      // Tester les politiques RLS
      const { data: botsData, error: botsError } = await supabase
        .from('bots')
        .select('id, name')
        .eq('owner_id', ownerCheck.id);

      if (botsError) {
        addTestResult('RLS Policies Test', false, `Erreur RLS: ${botsError.message}`);
        return false;
      }

      addTestResult(
        'RLS Policies Test',
        true,
        `Accès autorisé aux bots (${botsData?.length || 0} bots trouvés)`
      );

      return true;
    } catch (error) {
      addTestResult('Database Triggers Test', false, `Erreur: ${error}`);
      return false;
    }
  };

  const testBotCreationFlow = async () => {
    if (!isAuthenticated || !user) {
      addTestResult('Bot Creation Test', false, 'Utilisateur non authentifié');
      return false;
    }

    try {
      // Créer un bot de test
      const testBotData = {
        name: `Test Bot ${Date.now()}`,
        description: 'Bot de test automatique',
        webhook_url: 'https://test.webhook.com',
        chat_title: 'Test Assistant',
        chat_context: 'general'
      };

      const { data: createdBot, error: createError } = await supabase
        .from('bots')
        .insert(testBotData)
        .select('*')
        .single();

      if (createError) {
        addTestResult('Bot Creation Test', false, `Erreur création: ${createError.message}`);
        return false;
      }

      addTestResult(
        'Bot Creation Test',
        true,
        `Bot créé avec succès (ID: ${createdBot.id})`
      );

      // Vérifier que l'URL publique a été générée automatiquement
      if (createdBot.public_chat_url) {
        addTestResult(
          'Public URL Generation',
          true,
          `URL générée: ${createdBot.public_chat_url}`
        );
      } else {
        addTestResult('Public URL Generation', false, 'URL publique non générée');
      }

      // Nettoyer le bot de test
      await supabase
        .from('bots')
        .delete()
        .eq('id', createdBot.id);

      addTestResult('Test Cleanup', true, 'Bot de test supprimé');

      return true;
    } catch (error) {
      addTestResult('Bot Creation Test', false, `Erreur: ${error}`);
      return false;
    }
  };

  const runCompleteTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      addTestResult('Test Started', true, 'Début des tests du système');

      // Test 1: Vérification de l'état du système
      const healthOk = await runSystemHealthCheck();
      
      // Test 2: Test des triggers de base de données
      const triggersOk = await testDatabaseTriggers();
      
      // Test 3: Test du flux de création de bot
      const botCreationOk = await testBotCreationFlow();

      const allTestsPassed = healthOk && triggersOk && botCreationOk;

      addTestResult(
        'All Tests Complete',
        allTestsPassed,
        allTestsPassed ? 'Tous les tests ont réussi ✅' : 'Certains tests ont échoué ❌'
      );

      toast({
        title: allTestsPassed ? "Tests réussis" : "Tests terminés avec des erreurs",
        description: allTestsPassed 
          ? "Le système fonctionne parfaitement" 
          : "Vérifiez les résultats pour plus de détails",
        variant: allTestsPassed ? "default" : "destructive",
      });

    } catch (error) {
      addTestResult('System Error', false, `Erreur système: ${error}`);
      toast({
        title: "Erreur système",
        description: "Impossible de terminer les tests",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tests Système</h1>
          <p className="text-gray-600">Vérification complète du système de bout en bout</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={clearResults}
            variant="outline"
            disabled={isRunning}
          >
            Effacer
          </Button>
          <Button 
            onClick={runCompleteTest}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isRunning ? 'Tests en cours...' : 'Lancer les tests'}
          </Button>
        </div>
      </div>

      {/* Statut de l'utilisateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Statut Utilisateur</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Badge variant={isAuthenticated ? "default" : "destructive"}>
                {isAuthenticated ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                {isAuthenticated ? 'Authentifié' : 'Non authentifié'}
              </Badge>
            </div>
            {user && (
              <div className="text-sm text-gray-600">
                Email: {user.email}
              </div>
            )}
            {user && (
              <div className="text-sm text-gray-600">
                ID: {user.id}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Résultats des tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Résultats des Tests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun test exécuté. Cliquez sur "Lancer les tests" pour commencer.
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <div className="mt-0.5">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {result.testName}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {result.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <span>Instructions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>Tests Système :</strong> Vérifie l'état global de la base de données</p>
            <p>• <strong>Tests Triggers :</strong> Vérifie que les triggers automatiques fonctionnent</p>
            <p>• <strong>Tests Création Bot :</strong> Teste le flux complet de création de chatbot</p>
            <p>• <strong>Nettoyage :</strong> Les bots de test sont automatiquement supprimés</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};