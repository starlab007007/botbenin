
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, MessageSquare, Calendar } from 'lucide-react';

interface LocalBusiness {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
}

interface MarketingCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBusinesses: LocalBusiness[];
}

export const MarketingCampaignModal: React.FC<MarketingCampaignModalProps> = ({
  isOpen,
  onClose,
  selectedBusinesses
}) => {
  const [campaignData, setCampaignData] = useState({
    name: '',
    type: 'email' as 'email' | 'whatsapp' | 'sms',
    subject: '',
    messageTemplate: '',
    scheduledAt: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const createCampaign = async () => {
    if (!campaignData.name || !campaignData.messageTemplate) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le nom et le message de la campagne",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const targetContacts = selectedBusinesses.map(business => ({
        id: business.id,
        name: business.name,
        company: business.companyName,
        email: business.email,
        phone: business.phone
      }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur d'authentification",
          description: "Vous devez être connecté pour créer une campagne",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          user_id: user.id,
          name: campaignData.name,
          type: campaignData.type,
          subject: campaignData.type === 'email' ? campaignData.subject : null,
          message_template: campaignData.messageTemplate,
          target_contacts: targetContacts,
          scheduled_at: campaignData.scheduledAt ? new Date(campaignData.scheduledAt).toISOString() : null,
          status: campaignData.scheduledAt ? 'scheduled' : 'draft'
        });

      if (error) throw error;

      toast({
        title: "Campagne créée",
        description: `Campagne "${campaignData.name}" créée avec succès pour ${selectedBusinesses.length} contacts`,
      });

      onClose();
      setCampaignData({
        name: '',
        type: 'email',
        subject: '',
        messageTemplate: '',
        scheduledAt: ''
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la campagne",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getCampaignIcon = () => {
    switch (campaignData.type) {
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'whatsapp':
        return <MessageSquare className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {getCampaignIcon()}
            <span className="ml-2">Créer une Campagne Marketing</span>
          </DialogTitle>
          <DialogDescription>
            Créez une campagne pour {selectedBusinesses.length} entreprise(s) sélectionnée(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom de la campagne *</Label>
              <Input
                id="name"
                value={campaignData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ma campagne locale"
              />
            </div>
            <div>
              <Label htmlFor="type">Type de campagne</Label>
              <Select value={campaignData.type} onValueChange={(value: 'email' | 'whatsapp' | 'sms') => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {campaignData.type === 'email' && (
            <div>
              <Label htmlFor="subject">Sujet de l'email</Label>
              <Input
                id="subject"
                value={campaignData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Découvrez notre offre spéciale"
              />
            </div>
          )}

          <div>
            <Label htmlFor="message">Message de la campagne *</Label>
            <Textarea
              id="message"
              value={campaignData.messageTemplate}
              onChange={(e) => handleInputChange('messageTemplate', e.target.value)}
              placeholder="Bonjour {name}, nous avons remarqué votre entreprise {company}..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Utilisez {'{name}'} et {'{company}'} pour personnaliser le message
            </p>
          </div>

          <div>
            <Label htmlFor="scheduledAt">Programmer l'envoi (optionnel)</Label>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={campaignData.scheduledAt}
                onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Contacts ciblés ({selectedBusinesses.length}):</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedBusinesses.slice(0, 5).map((business, index) => (
                <div key={index} className="text-xs text-gray-600">
                  • {business.name} ({business.companyName}) - {business.email}
                </div>
              ))}
              {selectedBusinesses.length > 5 && (
                <div className="text-xs text-gray-500">
                  ... et {selectedBusinesses.length - 5} autres
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Annuler
            </Button>
            <Button onClick={createCampaign} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer la campagne'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
