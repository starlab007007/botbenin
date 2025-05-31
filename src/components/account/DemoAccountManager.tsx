
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield, 
  Eye, 
  EyeOff,
  Users,
  AlertTriangle
} from 'lucide-react';

interface DemoAccount {
  id: string;
  user_id: string;
  is_demo: boolean;
  created_at: string;
  users?: {
    email: string;
    full_name: string;
    is_active: boolean;
  };
}

export const DemoAccountManager: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser && hasPermission('manage_users')) {
      fetchDemoAccounts();
    }
  }, [currentUser]);

  const hasPermission = (permission: string) => {
    return currentUser?.permissions?.includes(permission) || false;
  };

  const fetchDemoAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('demo_accounts')
        .select(`
          *,
          users (
            email,
            full_name,
            is_active
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setDemoAccounts(data);
    } catch (error) {
      console.error('Erreur lors du chargement des comptes démo:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les comptes de démonstration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDemoStatus = async (demoAccountId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('demo_accounts')
        .update({ is_demo: !currentStatus })
        .eq('id', demoAccountId);

      if (error) throw error;

      await fetchDemoAccounts();
      
      toast({
        title: "Statut mis à jour",
        description: `Le compte a été ${!currentStatus ? 'marqué comme démo' : 'retiré des comptes démo'}`,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut du compte",
        variant: "destructive",
      });
    }
  };

  const addDemoAccount = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('demo_accounts')
        .insert({ user_id: userId, is_demo: true });

      if (error) throw error;

      await fetchDemoAccounts();
      
      toast({
        title: "Compte ajouté",
        description: "Le compte a été ajouté aux comptes de démonstration",
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le compte aux comptes de démonstration",
        variant: "destructive",
      });
    }
  };

  if (!hasPermission('manage_users')) {
    return (
      <Card className="p-8 text-center">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h2>
        <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour gérer les comptes de démonstration.</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <Card className="uniform-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Comptes de démonstration ({demoAccounts.length})
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <AlertTriangle className="w-4 h-4" />
          <span>Les données de ces comptes sont masquées pour les non-admins</span>
        </div>
      </div>

      {demoAccounts.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucun compte de démonstration configuré</p>
        </div>
      ) : (
        <div className="space-y-4">
          {demoAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {account.users?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'D'}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {account.users?.full_name || 'Nom non défini'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {account.users?.email}
                  </div>
                </div>
                <Badge className={account.is_demo ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}>
                  {account.is_demo ? 'Démo Actif' : 'Démo Inactif'}
                </Badge>
                <Badge className={account.users?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {account.users?.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleDemoStatus(account.id, account.is_demo)}
                  className="flex items-center space-x-2"
                >
                  {account.is_demo ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>Retirer du démo</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Marquer comme démo</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Fonctionnement des comptes de démonstration</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Les données personnelles (email, nom, téléphone) sont masquées pour les utilisateurs non-admin</li>
          <li>• Les comptes marqués comme "démo" apparaissent avec des données fictives dans l'interface publique</li>
          <li>• Seuls les administrateurs peuvent voir les vraies données de ces comptes</li>
          <li>• Utile pour les démonstrations de la plateforme sans exposer de vraies données</li>
        </ul>
      </div>
    </Card>
  );
};
