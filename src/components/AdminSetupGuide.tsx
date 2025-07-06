import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  User, 
  Crown, 
  Database, 
  ArrowRight,
  Copy,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

export const AdminSetupGuide: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { currentUser, hasPermission } = useUser();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const sqlCommand = `SELECT public.assign_admin_role('${user?.email || 'votre@email.com'}');`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlCommand);
      setCopied(true);
      toast({
        title: "Copié !",
        description: "La commande SQL a été copiée dans le presse-papiers",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier la commande",
        variant: "destructive",
      });
    }
  };

  const steps = [
    {
      id: 1,
      title: "Créer un compte utilisateur",
      description: "Inscrivez-vous via le formulaire d'inscription",
      status: isAuthenticated ? 'completed' : 'pending',
      action: isAuthenticated ? null : "Cliquez sur 'Se connecter' pour vous inscrire"
    },
    {
      id: 2,
      title: "Assigner le rôle Admin",
      description: "Utilisez la fonction SQL pour devenir administrateur",
      status: hasPermission('platform.admin') ? 'completed' : 'pending',
      action: hasPermission('platform.admin') ? null : "Exécutez la commande SQL ci-dessous"
    },
    {
      id: 3,
      title: "Accéder au panneau Admin",
      description: "Accédez à la gestion des utilisateurs",
      status: hasPermission('platform.admin') ? 'completed' : 'pending',
      action: hasPermission('platform.admin') ? "Aller à /admin/users" : "Complétez d'abord les étapes précédentes"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="w-6 h-6 text-blue-600" />
            <span>Configuration Admin - Guide Complet</span>
          </CardTitle>
          <CardDescription>
            Suivez ces étapes pour configurer votre premier compte administrateur
          </CardDescription>
        </CardHeader>
      </Card>

      {/* État actuel */}
      <Card>
        <CardHeader>
          <CardTitle>État Actuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isAuthenticated ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <User className={`w-5 h-5 ${isAuthenticated ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Authentification</p>
                <p className={`font-semibold ${isAuthenticated ? 'text-green-600' : 'text-gray-400'}`}>
                  {isAuthenticated ? 'Connecté' : 'Non connecté'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                hasPermission('platform.admin') ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <Crown className={`w-5 h-5 ${hasPermission('platform.admin') ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rôle Admin</p>
                <p className={`font-semibold ${hasPermission('platform.admin') ? 'text-red-600' : 'text-gray-400'}`}>
                  {hasPermission('platform.admin') ? 'Activé' : 'Non activé'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Base de données</p>
                <p className="font-semibold text-blue-600">Configurée</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Étapes */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={step.id} className={`${
            step.status === 'completed' ? 'border-green-200 bg-green-50' : 'border-gray-200'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.status === 'completed' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    <Badge variant={step.status === 'completed' ? 'default' : 'secondary'}>
                      {step.status === 'completed' ? 'Terminé' : 'En attente'}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-3">{step.description}</p>
                  
                  {step.action && (
                    <div className="flex items-center space-x-2 text-sm text-blue-600">
                      <ArrowRight className="w-4 h-4" />
                      <span>{step.action}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Commande SQL */}
      {isAuthenticated && !hasPermission('platform.admin') && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-orange-600" />
              <span>Commande SQL à Exécuter</span>
            </CardTitle>
            <CardDescription>
              Exécutez cette commande dans l'éditeur SQL de Supabase pour devenir administrateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <code className="text-green-400 text-sm">{sqlCommand}</code>
              <Button
                onClick={copyToClipboard}
                size="sm"
                variant="outline"
                className="absolute top-2 right-2 h-8 w-8 p-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            
            {copied && (
              <div className="flex items-center space-x-2 text-green-600 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Commande copiée !</span>
              </div>
            )}
            
            <div className="flex items-start space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium">Instructions :</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Allez dans le dashboard Supabase → SQL Editor</li>
                  <li>Collez cette commande dans l'éditeur</li>
                  <li>Cliquez sur "Run" pour exécuter</li>
                  <li>Rechargez cette page pour voir les changements</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Succès */}
      {hasPermission('platform.admin') && (
        <Card className="border-l-4 border-l-green-500 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  🎉 Configuration Admin Terminée !
                </h3>
                <p className="text-green-700">
                  Vous êtes maintenant administrateur. Accédez au panneau de contrôle à /admin/users
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compte de test */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-purple-600" />
            <span>Compte de Test (Alternative)</span>
          </CardTitle>
          <CardDescription>
            Si vous préférez utiliser un compte pré-configuré
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="space-y-2">
              <div>
                <strong>Email :</strong> admin@bot.bj
              </div>
              <div>
                <strong>Mot de passe :</strong> AdminBot2024!
              </div>
            </div>
            <p className="text-sm text-purple-700 mt-3">
              Note : Ce compte doit être créé manuellement via l'inscription si il n'existe pas encore.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};