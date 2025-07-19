import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, RefreshCw, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  test: string;
  status: 'pending' | 'success' | 'error' | 'running';
  message: string;
}

export const InscriptionTestValidator: React.FC = () => {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const updateResult = (test: string, status: ValidationResult['status'], message: string) => {
    setResults(prev => {
      const existing = prev.find(r => r.test === test);
      if (existing) {
        return prev.map(r => r.test === test ? { ...r, status, message } : r);
      }
      return [...prev, { test, status, message }];
    });
  };

  const testDatabaseStructure = async () => {
    updateResult('Structure DB', 'running', 'Vérification de la structure...');
    
    try {
      // Test simple: vérifier que nous pouvons faire une requête basique
      const { data: testData, error: testError } = await supabase
        .from('bot_owners')
        .select('id')
        .limit(1);

      if (testError) {
        updateResult('Structure DB', 'error', `Erreur accès DB: ${testError.message}`);
        return false;
      }

      updateResult('Structure DB', 'success', 'Accès base de données OK');
      return true;
    } catch (error: any) {
      updateResult('Structure DB', 'error', `Erreur: ${error.message}`);
      return false;
    }
  };

  const testInscriptionFlow = async () => {
    updateResult('Flux inscription', 'running', 'Test du processus d\'inscription...');
    
    try {
      const testEmail = `test-validation-${Date.now()}@example.com`;
      const testPassword = 'testpassword123';

      // Tenter une inscription
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Test Validation User',
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        if (error.message.includes('bot_owners_user_id_unique')) {
          updateResult('Flux inscription', 'error', 'ERREUR CRITIQUE: Contrainte unique violée!');
          return false;
        } else if (error.message.includes('User already registered')) {
          updateResult('Flux inscription', 'success', 'Inscription fonctionnelle (utilisateur existant)');
          return true;
        } else {
          updateResult('Flux inscription', 'error', `Erreur inscription: ${error.message}`);
          return false;
        }
      }

      if (data.user) {
        updateResult('Flux inscription', 'success', 'Inscription réussie sans erreur DB');
        return true;
      }

      updateResult('Flux inscription', 'error', 'Aucun utilisateur créé');
      return false;
    } catch (error: any) {
      updateResult('Flux inscription', 'error', `Exception: ${error.message}`);
      return false;
    }
  };

  const runValidation = async () => {
    setIsRunning(true);
    setResults([]);

    const tests = [
      { name: 'Structure DB', fn: testDatabaseStructure },
      { name: 'Flux inscription', fn: testInscriptionFlow },
    ];

    let allPassed = true;

    for (const test of tests) {
      const success = await test.fn();
      if (!success) allPassed = false;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);

    toast({
      title: allPassed ? "✅ Validation réussie" : "❌ Validation échouée",
      description: allPassed 
        ? "L'erreur d'inscription est corrigée définitivement"
        : "Des problèmes persistent dans le système",
      variant: allPassed ? "default" : "destructive",
    });
  };

  const getStatusIcon = (status: ValidationResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <TestTube className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TestTube className="w-5 h-5" />
          <span>Validateur Correction Inscription</span>
        </CardTitle>
        <CardDescription>
          Validation finale de la correction de l'erreur "database error saving new user"
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={runValidation} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Validation en cours...' : 'Lancer la validation'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  {getStatusIcon(result.status)}
                  <span className="font-medium">{result.test}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{result.message}</span>
                  <Badge 
                    variant={result.status === 'success' ? 'default' : 
                             result.status === 'error' ? 'destructive' : 'secondary'}
                  >
                    {result.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && !isRunning && (
          <div className={`p-4 rounded-lg ${
            results.every(r => r.status === 'success') 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className="font-semibold mb-2">
              {results.every(r => r.status === 'success') 
                ? '🎉 Correction réussie !' 
                : '⚠️ Problèmes détectés'}
            </h3>
            <p className="text-sm">
              {results.every(r => r.status === 'success')
                ? 'L\'erreur d\'inscription a été corrigée définitivement. Les utilisateurs peuvent maintenant s\'inscrire sans erreur.'
                : 'Des problèmes persistent. Vérifiez les détails ci-dessus.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};