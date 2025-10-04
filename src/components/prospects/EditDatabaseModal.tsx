import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Database, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProspectDatabases, ProspectDatabase } from '@/hooks/useProspectDatabases';

interface EditDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: ProspectDatabase | null;
  onSuccess?: () => void;
}

export const EditDatabaseModal: React.FC<EditDatabaseModalProps> = ({ 
  isOpen, 
  onClose, 
  database,
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { updateDatabase } = useProspectDatabases();

  useEffect(() => {
    if (database) {
      setFormData({
        name: database.name || '',
        description: database.description || '',
        is_active: database.is_active ?? true
      });
    }
  }, [database]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!database) return;

    setIsLoading(true);

    try {
      await updateDatabase(database.id, formData);

      toast({
        title: "Base mise à jour",
        description: `La base "${formData.name}" a été mise à jour avec succès.`,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la base de données.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
  };

  if (!database) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Gérer la Base de Données
          </DialogTitle>
          <DialogDescription>
            Modifiez les paramètres de "{database.name}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Nom de la base *</Label>
            <Input 
              id="name" 
              required 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Clients Premium, Prospects Q1 2024..." 
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez l'objectif ou le contenu de cette base..."
              className="resize-none"
              rows={4}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="active">Base active</Label>
              <p className="text-sm text-muted-foreground">
                Les bases inactives ne peuvent pas être utilisées pour les campagnes
              </p>
            </div>
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <div className="font-medium">Statistiques actuelles</div>
                <div className="text-muted-foreground">
                  • {database.prospect_count || 0} prospects enregistrés<br/>
                  • Dernière modification: {new Date(database.updated_at).toLocaleDateString('fr-FR')}<br/>
                  • Créée le: {new Date(database.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};