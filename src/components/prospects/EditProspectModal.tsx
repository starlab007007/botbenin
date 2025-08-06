import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProspects } from '@/hooks/useProspects';

interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  status: string;
  source?: string;
  notes?: string;
  tags?: string[];
  score: number;
}

interface EditProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect | null;
  onSuccess?: () => void;
}

export const EditProspectModal: React.FC<EditProspectModalProps> = ({ 
  isOpen, 
  onClose, 
  prospect,
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
    score: 50
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { updateProspect } = useProspects({});

  useEffect(() => {
    if (prospect) {
      setFormData({
        first_name: prospect.first_name || '',
        last_name: prospect.last_name || '',
        email: prospect.email || '',
        phone: prospect.phone || '',
        company: prospect.company || '',
        position: prospect.position || '',
        status: prospect.status || 'new',
        source: prospect.source || '',
        notes: prospect.notes || '',
        tags: prospect.tags ? prospect.tags.join(', ') : '',
        score: prospect.score || 50
      });
    }
  }, [prospect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospect) return;

    setIsLoading(true);

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const updateData = {
        ...formData,
        tags: tagsArray,
        score: Number(formData.score)
      };

      const result = await updateProspect(prospect.id, updateData);
      
      if (result.error) {
        throw new Error('Erreur lors de la mise à jour');
      }

      toast({
        title: "Prospect mis à jour",
        description: `Les informations de ${formData.first_name} ${formData.last_name} ont été mises à jour.`,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le prospect.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form when closing
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
      score: 50
    });
  };

  if (!prospect) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier le Prospect</DialogTitle>
          <DialogDescription>
            Modifiez les informations de {prospect.first_name} {prospect.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mettre à jour
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};