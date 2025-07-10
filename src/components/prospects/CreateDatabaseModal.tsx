
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface CreateDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateDatabaseModal: React.FC<CreateDatabaseModalProps> = ({ isOpen, onClose }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Creating database...');
    onClose();
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
            <Input id="name" required placeholder="ex: Prospects Tech 2024" />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Description de cette base de données..."
              className="resize-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="isActive" defaultChecked />
            <Label htmlFor="isActive">Base active</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              Créer la base
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
