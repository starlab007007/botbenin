
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateDatabaseModal: React.FC<CreateDatabaseModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Nom requis",
        description: "Le nom de la base de données est obligatoire",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🚀 Création nouvelle base de données');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      
      if (!user) {
        throw new Error("Vous devez être connecté pour créer une base de données");
      }

      console.log('👤 Utilisateur:', user.id);
      console.log('📝 Données base:', { name: name.trim(), description: description.trim(), isActive });

      const { data, error } = await supabase
        .from('prospect_databases')
        .insert([{
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          is_active: isActive
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création:', error);
        throw error;
      }

      console.log('✅ Base créée:', data);

      toast({
        title: "Base de données créée",
        description: `La base "${name}" a été créée avec succès`,
      });

      // Reset form
      setName('');
      setDescription('');
      setIsActive(true);
      
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error('💥 Erreur création base:', error);
      
      let errorMessage = "Impossible de créer la base de données";
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        errorMessage = "Une base avec ce nom existe déjà";
      } else if (error?.code === 'PGRST301') {
        errorMessage = "Problème de permissions. Veuillez vous reconnecter.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle Base de Données</DialogTitle>
          <DialogDescription>
            Créez une nouvelle base de données pour organiser vos prospects
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom de la base *</Label>
            <Input 
              id="name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
              placeholder="ex: Prospects Tech 2024"
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de cette base de données..."
              className="resize-none"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch 
              id="isActive" 
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isLoading}
            />
            <Label htmlFor="isActive">Base active</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer la base'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
