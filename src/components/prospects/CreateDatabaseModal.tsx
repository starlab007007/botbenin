
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur d'authentification",
          description: "Vous devez être connecté pour créer une base de données",
          variant: "destructive",
        });
        return;
      }

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

      if (error) throw error;

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
    } catch (error) {
      console.error('Error creating database:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la base de données",
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
