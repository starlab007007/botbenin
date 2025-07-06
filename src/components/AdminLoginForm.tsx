
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle } from 'lucide-react';

interface AdminLoginFormProps {
  onAdminCreated?: () => void;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onAdminCreated }) => {
  const [email, setEmail] = useState('admin@bot.bj');
  const [password, setPassword] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const { toast } = useToast();

  const handleCreateAdmin = async () => {
    if (!email || !password) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingAdmin(true);
    try {
      // Créer le compte administrateur
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: "Compte existant",
            description: "Ce compte existe déjà. Tentative d'attribution du rôle admin...",
          });
          await assignAdminRole();
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Compte créé",
          description: "Le compte administrateur a été créé. Attribution du rôle admin...",
        });
        await assignAdminRole();
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du compte admin:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le compte administrateur",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const assignAdminRole = async () => {
    setIsAssigningRole(true);
    try {
      const { data, error } = await supabase.rpc('assign_admin_role', {
        user_email: email
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Succès !",
        description: data || "Rôle administrateur attribué avec succès",
      });
      
      if (onAdminCreated) {
        onAdminCreated();
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'attribution du rôle admin:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'attribuer le rôle admin",
        variant: "destructive",
      });
    } finally {
      setIsAssigningRole(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6 text-red-600" />
        </div>
        <CardTitle className="text-2xl text-red-600">Configuration Admin</CardTitle>
        <CardDescription>
          Créer le premier compte administrateur de la plateforme
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Important :</p>
              <p>Cette action créera le premier compte administrateur avec tous les privilèges.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email administrateur</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@bot.bj"
            />
          </div>
          
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe sécurisé"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleCreateAdmin}
            disabled={isCreatingAdmin || isAssigningRole || !email || !password}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isCreatingAdmin || isAssigningRole ? 'Configuration...' : 'Créer le Compte Admin'}
          </Button>
          
          {email !== 'admin@bot.bj' && (
            <Button 
              onClick={assignAdminRole}
              disabled={isAssigningRole || !email}
              variant="outline"
              className="w-full"
            >
              {isAssigningRole ? 'Attribution...' : 'Attribuer Rôle Admin (Compte existant)'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
