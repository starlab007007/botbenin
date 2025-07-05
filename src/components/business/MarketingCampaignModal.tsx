
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, MessageSquare, Calendar, Sparkles } from 'lucide-react';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';

interface LocalBusiness {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  category: string;
  industry: string;
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
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const { createCampaign, generateAIMessage } = useMarketingCampaigns();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateAIMessage = async () => {
    if (selectedBusinesses.length === 0) {
      toast({
        title: "Aucune entreprise sélectionnée",
        description: "Sélectionnez au moins une entreprise pour générer un message",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingMessage(true);
    try {
      // Analyser les catégories des entreprises sélectionnées
      const categories = selectedBusinesses.map(b => b.category || b.industry).filter(Boolean);
      const mainCategory = categories.length > 0 ? categories[0] : 'general';
      
      const generatedMessage = await generateAIMessage(mainCategory, campaignData.type, 'business_owners');
      
      setCampaignData(prev => ({
        ...prev,
        messageTemplate: generatedMessage || '',
        subject: campaignData.type === 'email' && !campaignData.subject ? 
          'Opportunité de croissance pour votre entreprise' : prev.subject
      }));

      toast({
        title: "Message généré !",
        description: "Le message a été généré avec l'IA. Vous pouvez le modifier si nécessaire.",
      });
    } catch (error) {
      console.error('Error generating message:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le message avec l'IA",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignData.name || !campaignData.messageTemplate) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le nom et le message de la campagne",
        variant: "destructive",
      });
      return;
    }

    try {
      const targetContacts = selectedBusinesses.map(business => ({
        id: business.id,
        name: business.name,
        company: business.companyName,
        email: business.email || '',
        phone: business.phone || '',
        category: business.category || '',
        industry: business.industry || ''
      }));

      await createCampaign({
        name: campaignData.name,
        type: campaignData.type,
        subject: campaignData.type === 'email' ? campaignData.subject : undefined,
        message_template: campaignData.messageTemplate,
        target_contacts: targetContacts,
        scheduled_at: campaignData.scheduledAt ? new Date(campaignData.scheduledAt).toISOString() : undefined
      });

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
      // Error handled in createCampaign
      console.error('Error creating campaign:', error);
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
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="message">Message de la campagne *</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAIMessage}
                disabled={isGeneratingMessage}
              >
                {isGeneratingMessage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Générer avec IA
                  </>
                )}
              </Button>
            </div>
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
                  • {business.name} ({business.companyName}) - {business.email || 'Email non disponible'}
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
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleCreateCampaign}>
              Créer la campagne
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
