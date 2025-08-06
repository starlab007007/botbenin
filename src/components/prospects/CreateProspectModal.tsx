
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProspects } from '@/hooks/useProspects';
import { useProspectDatabases } from '@/hooks/useProspectDatabases';

interface CreateProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  databaseId?: string;
  onSuccess?: () => void;
}

export const CreateProspectModal: React.FC<CreateProspectModalProps> = ({ 
  isOpen, 
  onClose, 
  databaseId,
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    status: 'new',
    source: '',
    notes: '',
    tags: '',
    score: 50,
    database_id: databaseId || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { createProspect } = useProspects({});
  const { databases } = useProspectDatabases();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const prospectData = {
        ...formData,
        tags: tagsArray,
        score: Number(formData.score)
      };

      const result = await createProspect(prospectData);
      
      if (result) {
        toast({
          title: "Prospect créé",
          description: `Le prospect "${formData.first_name} ${formData.last_name}" a été créé avec succès.`,
        });

        onSuccess?.();
        onClose();
        
        // Reset form
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          company: '',
          position: '',
          status: 'new',
          source: '',
          notes: '',
          tags: '',
          score: 50,
          database_id: databaseId || ''
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le prospect.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau Prospect</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau prospect à votre base de données
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="database">Base de données *</Label>
            <Select value={formData.database_id} onValueChange={(value) => setFormData(prev => ({ ...prev, database_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une base de données" />
              </SelectTrigger>
              <SelectContent>
                {databases.map((db) => (
                  <SelectItem key={db.id} value={db.id}>
                    {db.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom *</Label>
              <Input 
                id="firstName" 
                required 
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="Jean" 
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom *</Label>
              <Input 
                id="lastName" 
                required 
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Dupont" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="jean.dupont@example.com" 
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input 
                id="phone" 
                type="tel" 
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+33 6 12 34 56 78" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">Entreprise</Label>
              <Input 
                id="company" 
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Tech Solutions" 
              />
            </div>
            <div>
              <Label htmlFor="position">Poste</Label>
              <Input 
                id="position" 
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                placeholder="Directeur Marketing" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status">Statut</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nouveau</SelectItem>
                  <SelectItem value="contacted">Contacté</SelectItem>
                  <SelectItem value="qualified">Qualifié</SelectItem>
                  <SelectItem value="converted">Converti</SelectItem>
                  <SelectItem value="lost">Perdu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Input 
                id="source" 
                value={formData.source}
                onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                placeholder="LinkedIn, site web, référence..." 
              />
            </div>
            <div>
              <Label htmlFor="score">Score (0-100)</Label>
              <Input 
                id="score" 
                type="number"
                min="0"
                max="100"
                value={formData.score}
                onChange={(e) => setFormData(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes sur ce prospect..."
              className="resize-none"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
            <Input 
              id="tags" 
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="VIP, Marketing, Tech..." 
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le prospect
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
