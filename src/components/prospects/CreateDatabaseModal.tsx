
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Database, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatabaseCreated?: () => void;
}

export const CreateDatabaseModal: React.FC<CreateDatabaseModalProps> = ({
  isOpen,
  onClose,
  onDatabaseCreated
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la base de données est requis",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('prospect_databases')
        .insert([
          {
            name: name.trim(),
            description: description.trim() || null,
            user_id: userData.user.id
          }
        ]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Base de données créée avec succès",
      });

      setName('');
      setDescription('');
      onClose();
      
      if (onDatabaseCreated) {
        onDatabaseCreated();
      }
    } catch (error) {
      console.error('Error creating database:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la base de données",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Nouvelle Base de Données
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="database-name">Nom *</Label>
            <Input
              id="database-name"
              placeholder="Ex: Prospects Q1 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="database-description">Description</Label>
            <Textarea
              id="database-description"
              placeholder="Description optionnelle de la base de données"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
