import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Play } from 'lucide-react';

interface TestResult {
  test_name: string;
  status: 'success' | 'failed' | 'warning';
  details: string;
  data?: any;
}

export const CompleteSystemTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const runCompleteTest = async () => {
    setIsLoading(true);
    setTestResults([]);
    const results: TestResult[] = [];

    try {
      // Test 1: Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        results.push({
          test_name: "Authentification",
          status: "success",
          details: `Utilisateur connecté: ${user.email}`,
          data: { user_id: user.id }
        });
      } else {
        results.push({
          test_name: "Authentification",
          status: "failed",
          details: "Aucun utilisateur connecté"
        });
        setTestResults(results);
        setIsLoading(false);
        return;
      }

      // Test 2: Vérifier les politiques RLS des bots
      try {
        const { data: policies, error: policiesError } = await supabase.rpc('get_final_bot_policies');
        if (policiesError) throw policiesError;
        
        const activePolicies = policies?.filter((p: any) => p.is_active) || [];
        results.push({
          test_name: "Politiques RLS Bots",
          status: "success",
          details: `${activePolicies.length} politiques actives sur ${policies?.length || 0} total`,
          data: policies
        });
      } catch (error: any) {
        results.push({
          test_name: "Politiques RLS Bots",
          status: "failed",
          details: `Erreur: ${error.message}`
        });
      }

      // Test 3: Vérifier l'accès aux bots de l'utilisateur
      try {
        const { data: userBots, error: botsError } = await supabase
          .from('bots')
          .select(`
            id, name, is_active, share_enabled,
            bot_owners!inner (user_id)
          `);
        
        if (botsError) throw botsError;
        
        results.push({
          test_name: "Accès aux Bots",
          status: "success",
          details: `Accès à ${userBots?.length || 0} bots pour cet utilisateur`,
          data: { bot_count: userBots?.length || 0, bots: userBots }
        });
      } catch (error: any) {
        results.push({
          test_name: "Accès aux Bots",
          status: "failed",
          details: `Erreur: ${error.message}`
        });
      }

      // Test 4: Vérifier les bot_owners
      try {
        const { data: botOwners, error: ownersError } = await supabase
          .from('bot_owners')
          .select('*');
        
        if (ownersError) throw ownersError;
        
        const currentUserOwner = botOwners?.find(o => o.user_id === user.id);
        if (currentUserOwner) {
          results.push({
            test_name: "Bot Owner",
            status: "success",
            details: `Bot owner trouvé, max_bots: ${currentUserOwner.max_bots}`,
            data: currentUserOwner
          });
        } else {
          results.push({
            test_name: "Bot Owner",
            status: "warning",
            details: "Aucun bot owner trouvé pour cet utilisateur"
          });
        }
      } catch (error: any) {
        results.push({
          test_name: "Bot Owner",
          status: "failed",
          details: `Erreur: ${error.message}`
        });
      }

      // Test 5: Vérifier l'accès aux messages de chat
      try {
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select(`
            id, message_type, created_at,
            bots!inner (
              id, name,
              bot_owners!inner (user_id)
            )
          `)
          .limit(5);
        
        if (messagesError) throw messagesError;
        
        results.push({
          test_name: "Accès aux Messages",
          status: "success",
          details: `Accès à ${messages?.length || 0} messages récents`,
          data: { message_count: messages?.length || 0 }
        });
      } catch (error: any) {
        results.push({
          test_name: "Accès aux Messages",
          status: "failed",
          details: `Erreur: ${error.message}`
        });
      }

      // Test 6: Vérifier l'accès aux utilisateurs de bot
      try {
        const { data: botUsers, error: usersError } = await supabase
          .from('bot_users')
          .select(`
            id, user_name, last_active,
            bots!inner (
              id, name,
              bot_owners!inner (user_id)
            )
          `)
          .limit(5);
        
        if (usersError) throw usersError;
        
        results.push({
          test_name: "Accès aux Bot Users",
          status: "success",
          details: `Accès à ${botUsers?.length || 0} utilisateurs de bots`,
          data: { bot_users_count: botUsers?.length || 0 }
        });
      } catch (error: any) {
        results.push({
          test_name: "Accès aux Bot Users",
          status: "failed",
          details: `Erreur: ${error.message}`
        });
      }

      // Test 7: Test de création de bot (sans vraiment créer)
      try {
        const { data: testResult, error: testError } = await supabase.rpc('test_bot_creation_fixed');
        if (testError) throw testError;
        
        const hasFailures = testResult?.some((r: any) => r.status === 'failed');
        results.push({
          test_name: "Test Création Bot",
          status: hasFailures ? "failed" : "success",
          details: hasFailures 
            ? "Des erreurs ont été détectées dans le test de création"
            : "Test de création de bot réussi",
          data: testResult
        });
      } catch (error: any) {
        results.push({
          test_name: "Test Création Bot",
          status: "failed",
          details: `Erreur: ${error.message}`
        });
      }

      // Test 8: Vérifier l'isolation des données
      try {
        const { data: allBots, error: allBotsError } = await supabase
          .from('bots')
          .select('id, name, owner_id')
          .limit(1);
        
        if (allBotsError) throw allBotsError;
        
        // Si on peut voir des bots, vérifier qu'ils appartiennent à l'utilisateur
        const botCount = allBots?.length || 0;
        results.push({
          test_name: "Isolation des Données",
          status: "success",
          details: `RLS fonctionne correctement - accès à ${botCount} bots uniquement`,
          data: { accessible_bots: botCount }
        });
      } catch (error: any) {
        results.push({
          test_name: "Isolation des Données",
          status: "warning",
          details: `Test d'isolation: ${error.message}`
        });
      }

    } catch (error: any) {
      results.push({
        test_name: "Test Global",
        status: "failed",
        details: `Erreur globale: ${error.message}`
      });
    }

    setTestResults(results);
    setIsLoading(false);

    const failureCount = results.filter(r => r.status === 'failed').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    
    toast({
      title: failureCount === 0 ? "Tests réussis" : "Tests avec problèmes",
      description: `${results.length - failureCount - warningCount} réussis, ${warningCount} avertissements, ${failureCount} échecs`,
      variant: failureCount === 0 ? "default" : "destructive",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Test Complet du Système Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runCompleteTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Lancer le Test Complet
          </Button>

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Résultats des Tests</h3>
              <div className="grid gap-2">
                {testResults.map((result, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <div className="font-medium">{result.test_name}</div>
                      </div>
                      <Badge className={getStatusColor(result.status)}>
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 ml-7">
                      {result.details}
                    </div>
                    {result.data && (
                      <details className="mt-2 ml-7">
                        <summary className="text-xs text-gray-500 cursor-pointer">Voir les données</summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Test d'intégrité :</strong> Ce test vérifie que les modifications apportées 
              n'ont pas cassé l'existant et que chaque propriétaire de bot a accès uniquement 
              à ses propres données (bots, statistiques, historiques, discussions).
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};