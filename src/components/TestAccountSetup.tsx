import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserCheck, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';

export const TestAccountSetup: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@test.com');
  const [userEmail, setUserEmail] = useState('user@test.com');
  const [password, setPassword] = useState('testpassword123');
  const [results, setResults] = useState<string[]>([]);

  const hasAdminPermission = () => {
    return currentUser?.permissions?.includes('manage_users') || 
           currentUser?.role === 'admin';
  };

  const createTestAccount = async (email: string, isAdmin: boolean = false) => {
    try {
      // Essayer d'abord de créer le compte via Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: isAdmin ? 'Admin Test' : 'Utilisateur Test'
          }
        }
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        throw signUpError;
      }

      // Attendre un peu pour que l'utilisateur soit créé
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Configurer le compte avec la fonction appropriée
      const functionName = isAdmin ? 'setup_test_admin_account' : 'setup_test_user_account';
      const { data, error } = await supabase.rpc(
        functionName as any, // Type assertion to bypass TypeScript strict typing
        {
          test_email: email,
          test_password: password
        }
      );

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la création du compte de test:', error);
      throw error;
    }
  };

  const handleCreateAccounts = async () => {
    if (!hasAdminPermission()) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent créer des comptes de test",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResults([]);
    const newResults: string[] = [];

    try {
      // Créer le compte admin
      toast({
        title: "Création en cours",
        description: "Création du compte administrateur...",
      });

      try {
        const adminResult = await createTestAccount(adminEmail, true);
        newResults.push(`✅ Admin: ${adminResult}`);
      } catch (error: any) {
        newResults.push(`❌ Admin: ${error.message}`);
      }

      // Attendre un peu entre les créations
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Créer le compte utilisateur
      toast({
        title: "Création en cours",
        description: "Création du compte utilisateur...",
      });

      try {
        const userResult = await createTestAccount(userEmail, false);
        newResults.push(`✅ Utilisateur: ${userResult}`);
      } catch (error: any) {
        newResults.push(`❌ Utilisateur: ${error.message}`);
      }

      setResults(newResults);

      toast({
        title: "Création terminée",
        description: "Vérifiez les résultats ci-dessous",
      });

    } catch (error: any) {
      console.error('Erreur générale:', error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la création des comptes: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasAdminPermission()) {
    return (
      <Card className="p-8 text-center">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h2>
        <p className="text-gray-600">Seuls les administrateurs peuvent accéder à la configuration des comptes de test.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configuration des comptes de test</h2>
            <p className="text-gray-600">Créez des comptes de test pour développement et démonstration</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email administrateur
            </label>
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@test.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email utilisateur standard
            </label>
            <Input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="user@test.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe (pour les deux comptes)
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          onClick={handleCreateAccounts}
          disabled={isLoading || !adminEmail || !userEmail || !password}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Création en cours...
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4 mr-2" />
              Créer les comptes de test
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Résultats de la configuration
            </h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    result.startsWith('✅') 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {result.startsWith('✅') ? (
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="text-sm">{result}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-amber-500" />
          Instructions importantes
        </h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <Badge variant="outline" className="mt-0.5">1</Badge>
            <p>
              Les comptes seront créés avec les permissions appropriées selon leur rôle
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <Badge variant="outline" className="mt-0.5">2</Badge>
            <p>
              <strong>Compte Admin :</strong> Accès complet à toutes les fonctionnalités, 
              abonnement Enterprise, 10 bots maximum
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <Badge variant="outline" className="mt-0.5">3</Badge>
            <p>
              <strong>Compte Utilisateur :</strong> Accès limité aux modules gratuits, 
              abonnement Free, 1 bot maximum
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <Badge variant="outline" className="mt-0.5">4</Badge>
            <p>
              Si les comptes existent déjà, ils seront mis à jour avec les nouveaux paramètres
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
