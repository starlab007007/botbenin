
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { 
  Crown, 
  UserPlus, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Mail,
  Calendar,
  Users
} from 'lucide-react';

export const AdminControlPanel: React.FC = () => {
  const { currentUser, assignAdminRole, hasPermission, users, isLoading } = useUser();
  const { toast } = useToast();
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssignAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: "Email requis",
        description: "Veuillez saisir un email valide",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);
    try {
      const result = await assignAdminRole(newAdminEmail);
      
      if (result.includes('succès')) {
        toast({
          title: "Succès !",
          description: result,
        });
        setNewAdminEmail('');
      } else {
        toast({
          title: "Information",
          description: result,
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'assigner le rôle admin",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  if (!hasPermission('platform.admin')) {
    return (
      <Card className="max-w-md w-full mx-auto">
        <CardContent className="p-8 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <CardTitle className="text-xl text-gray-900 mb-2">Accès restreint</CardTitle>
          <CardDescription>
            Vous n'avez pas les permissions administrateur nécessaires.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  const adminUsers = users.filter(user => user.role === 'admin');

  return (
    <div className="space-y-6">
      {/* Header avec informations admin */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-red-600" />
            <CardTitle className="text-red-600">Panneau d'Administration</CardTitle>
          </div>
          <CardDescription>
            Gestion des comptes administrateurs et permissions système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Votre Rôle</p>
                <p className="font-semibold text-red-600">Administrateur</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Admins</p>
                <p className="font-semibold">{adminUsers.length}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Dernière Connexion</p>
                <p className="font-semibold text-sm">
                  {currentUser?.lastLogin?.toLocaleDateString('fr-FR') || 'Jamais'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section d'assignation de rôle admin */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <CardTitle>Assigner le Rôle Administrateur</CardTitle>
          </div>
          <CardDescription>
            Promouvoir un utilisateur existant au rang d'administrateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              type="email"
              placeholder="email@exemple.com"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleAssignAdmin}
              disabled={isAssigning || !newAdminEmail.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isAssigning ? 'Attribution...' : 'Assigner Admin'}
            </Button>
          </div>
          
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important :</p>
                <p>L'utilisateur doit déjà avoir un compte sur la plateforme. Cette action lui donnera un accès administrateur complet.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des administrateurs */}
      <Card>
        <CardHeader>
          <CardTitle>Administrateurs Actuels</CardTitle>
          <CardDescription>
            Liste de tous les comptes avec privilèges administrateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : adminUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun administrateur trouvé
            </div>
          ) : (
            <div className="space-y-3">
              {adminUsers.map((admin) => (
                <div 
                  key={admin.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{admin.name}</p>
                        {admin.id === currentUser?.id && (
                          <Badge variant="secondary" className="text-xs">Vous</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Mail className="w-3 h-3" />
                        <span>{admin.email}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-red-100 text-red-800 border-red-200">
                      Administrateur
                    </Badge>
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs">Actif</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations sur les permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions Administrateur</CardTitle>
          <CardDescription>
            Capacités et privilèges du rôle administrateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Gestion des Utilisateurs</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Voir tous les utilisateurs</li>
                <li>• Modifier les rôles et permissions</li>
                <li>• Suspendre ou activer des comptes</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Gestion de la Plateforme</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Accès aux logs système</li>
                <li>• Gestion de tous les bots</li>
                <li>• Administration des campagnes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
