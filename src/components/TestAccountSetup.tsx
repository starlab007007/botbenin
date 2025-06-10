
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
  Settings,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

interface TestAccount {
  email: string;
  password: string;
  role: string;
  subscription: string;
}

export const TestAccountSetup: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [testAccounts, setTestAccounts] = useState<TestAccount[]>([]);

  const hasAdminPermission = () => {
    return currentUser?.permissions?.includes('manage_users') || 
           currentUser?.role === 'admin';
  };

  const createTestAccounts = async () => {
    if (!hasAdminPermission()) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent créer des comptes de test",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setTestAccounts([]);

    try {
      const accountsToCreate = [
        {
          email: 'admin@test.com',
          password: 'admin123456',
          isAdmin: true
        },
        {
          email: 'user@test.com', 
          password: 'user123456',
          isAdmin: false
        }
      ];

      const createdAccounts: TestAccount[] = [];

      for (const account of accountsToCreate) {
        try {
          const { data, error } = await supabase.functions.invoke('setup-test-accounts', {
            body: {
              email: account.email,
              password: account.password,
              isAdmin: account.isAdmin
            }
          });

          if (error) throw error;

          createdAccounts.push({
            email: account.email,
            password: account.password,
            role: account.isAdmin ? 'Administrateur' : 'Utilisateur',
            subscription: account.isAdmin ? 'Enterprise' : 'Free'
          });

          toast({
            title: "Compte créé",
            description: `Compte ${account.isAdmin ? 'administrateur' : 'utilisateur'} créé avec succès`,
          });

        } catch (error: any) {
          console.error(`Erreur lors de la création du compte ${account.email}:`, error);
          toast({
            title: "Erreur",
            description: `Erreur pour ${account.email}: ${error.message}`,
            variant: "destructive",
          });
        }

        // Attendre entre les créations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setTestAccounts(createdAccounts);

      if (createdAccounts.length > 0) {
        toast({
          title: "Configuration terminée",
          description: `${createdAccounts.length} compte(s) de test créé(s) avec succès`,
        });
      }

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

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié",
      description: `${type} copié dans le presse-papiers`,
    });
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
            <p className="text-gray-600">Créez des comptes de test prêts à l'emploi pour développement et démonstration</p>
          </div>
        </div>

        <Button
          onClick={createTestAccounts}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 mb-6"
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

        {testAccounts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Comptes de test créés
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>

            <div className="grid gap-4">
              {testAccounts.map((account, index) => (
                <Card key={index} className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800">{account.role}</span>
                        <Badge variant="outline" className="text-xs">
                          {account.subscription}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-mono">{account.email}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(account.email, 'Email')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">Mot de passe:</span>
                          <span className="font-mono">
                            {showPasswords ? account.password : '••••••••••'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(account.password, 'Mot de passe')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-amber-500" />
          Instructions et informations importantes
        </h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <Badge variant="outline" className="mt-0.5">1</Badge>
            <p>
              <strong>Compte Administrateur (admin@test.com) :</strong> Accès complet à toutes les fonctionnalités, 
              abonnement Enterprise, 10 bots maximum, toutes les permissions de gestion.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <Badge variant="outline" className="mt-0.5">2</Badge>
            <p>
              <strong>Compte Utilisateur (user@test.com) :</strong> Accès limité aux modules gratuits, 
              abonnement Free, 1 bot maximum, permissions de base.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <Badge variant="outline" className="mt-0.5">3</Badge>
            <p>
              <strong>Connexion :</strong> Utilisez soit l'email soit le numéro de téléphone (pour les tests, 
              les numéros sont +229 97 00 00 01 pour l'admin et +229 97 00 00 02 pour l'utilisateur).
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <Badge variant="outline" className="mt-0.5">4</Badge>
            <p>
              <strong>Fonctionnalités :</strong> Testez l'inscription par email, la connexion par email/téléphone, 
              Google Auth, et toutes les fonctionnalités selon les permissions de chaque rôle.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <Badge variant="outline" className="mt-0.5">5</Badge>
            <p>
              Si les comptes existent déjà, ils seront mis à jour avec les nouvelles configurations.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
