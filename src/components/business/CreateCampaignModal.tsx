import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { useSocialSharingCampaigns } from '@/hooks/useSocialSharingCampaigns';
import { Loader2, Mail, Users, Target, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface B2BContact {
  id: string;
  name: string;
  companyName: string;
  jobTitle: string;
  location: string;
  linkedinUrl: string;
  email: string;
  phone: string;
  industry: string;
  companySize: string;
  coordinates?: [number, number];
}

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: B2BContact[];
}

const CAMPAIGN_TEMPLATES = [
  {
    id: 'b2b-introduction',
    name: 'Introduction B2B',
    description: 'Présentation professionnelle pour premiers contacts',
    subject: 'Collaboration possible entre nos entreprises',
    template: `Bonjour {name},

J'espère que ce message vous trouve en bonne santé.

Je me permets de vous contacter car je pense qu'il pourrait y avoir des opportunités de collaboration intéressantes entre {companyName} et notre entreprise.

Travaillant dans le secteur {industry}, nous avons développé des solutions qui pourraient bénéficier à votre activité de {jobTitle}.

Seriez-vous disponible pour un échange de 15 minutes dans les prochains jours ?

Cordialement,`
  },
  {
    id: 'solution-proposal',
    name: 'Proposition de Solution',
    description: 'Présentation ciblée d\'une solution métier',
    subject: 'Solution adaptée pour {companyName}',
    template: `Bonjour {name},

En tant que {jobTitle} chez {companyName}, vous êtes probablement confronté(e) aux défis du secteur {industry}.

Nous avons développé une solution spécialement conçue pour des entreprises comme la vôtre, basée à {location}.

Notre approche a déjà permis à des entreprises similaires d'optimiser leurs résultats de 30% en moyenne.

Puis-je vous proposer une démonstration personnalisée ?

Bien à vous,`
  },
  {
    id: 'partnership',
    name: 'Partenariat Stratégique',
    description: 'Proposition de partenariat d\'affaires',
    subject: 'Opportunité de partenariat stratégique',
    template: `Bonjour {name},

J'ai remarqué l'excellent travail que {companyName} accomplit dans le secteur {industry}.

Notre entreprise développe des solutions complémentaires qui pourraient créer une synergie intéressante avec votre activité.

En tant que {jobTitle}, vous seriez la personne idéale pour évaluer cette opportunité de partenariat.

Pourrions-nous planifier un appel pour explorer cette possibilité ?

Cordialement,`
  }
];

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  selectedContacts
}) => {
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { createCampaign } = useSocialSharingCampaigns();

  const [selectedBotId, setSelectedBotId] = useState('');
  const [botOptions, setBotOptions] = useState<{ id: string; name: string }[]>([]);
  const [loadingBots, setLoadingBots] = useState(false);

  useEffect(() => {
    const loadBots = async () => {
      setLoadingBots(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) { setBotOptions([]); return; }
        const { data: owner } = await supabase
          .from('bot_owners')
          .select('id')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        if (!owner?.id) { setBotOptions([]); return; }
        const { data: bots } = await supabase
          .from('bots')
          .select('id, name')
          .eq('owner_id', owner.id)
          .order('created_at', { ascending: false });
        setBotOptions((bots || []).map((b: any) => ({ id: b.id, name: b.name })));
      } finally {
        setLoadingBots(false);
      }
    };
    loadBots();
  }, []);
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = CAMPAIGN_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setCustomSubject(template.subject);
      setCustomMessage(template.template);
    }
  };

  const generatePersonalizedMessage = (contact: B2BContact) => {
    return customMessage
      .replace(/{name}/g, contact.name)
      .replace(/{companyName}/g, contact.companyName)
      .replace(/{jobTitle}/g, contact.jobTitle)
      .replace(/{industry}/g, contact.industry)
      .replace(/{location}/g, contact.location);
  };

  const generatePersonalizedSubject = (contact: B2BContact) => {
    return customSubject
      .replace(/{name}/g, contact.name)
      .replace(/{companyName}/g, contact.companyName)
      .replace(/{jobTitle}/g, contact.jobTitle)
      .replace(/{industry}/g, contact.industry)
      .replace(/{location}/g, contact.location);
  };

  const handleCreateCampaign = async () => {
    if (!selectedBotId) {
      toast({
        title: "Bot requis",
        description: "Sélectionnez le bot pour cette campagne",
        variant: "destructive",
      });
      return;
    }
    if (!campaignName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez donner un nom à votre campagne",
        variant: "destructive",
      });
      return;
    }

    if (!customMessage.trim()) {
      toast({
        title: "Message requis",
        description: "Veuillez saisir le contenu de votre message",
        variant: "destructive",
      });
      return;
    }

    if (!senderName.trim() || !senderEmail.trim()) {
      toast({
        title: "Expéditeur requis",
        description: "Veuillez renseigner vos informations d'expéditeur",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Préparer les données de la campagne
      const campaignData = {
        botId: selectedBotId,
        name: campaignName,
        customMessage: customMessage,
        isActive: true,
        targetPlatforms: ['email'],
        trackingParameters: {
          senderName,
          senderEmail,
          template: selectedTemplate,
          contactCount: selectedContacts.length,
          createdAt: new Date().toISOString()
        },
        previewImages: [],
        // Données des contacts pour personnalisation
        targetContacts: selectedContacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          companyName: contact.companyName,
          jobTitle: contact.jobTitle,
          industry: contact.industry,
          location: contact.location,
          personalizedSubject: generatePersonalizedSubject(contact),
          personalizedMessage: generatePersonalizedMessage(contact)
        }))
      };

      const result = await createCampaign(campaignData);
      
      if (result) {
        toast({
          title: "Campagne créée avec succès",
          description: `La campagne "${campaignName}" a été créée avec ${selectedContacts.length} contacts`,
        });
        onClose();
        
        // Réinitialiser le formulaire
        setCampaignName('');
        setSelectedTemplate('');
        setCustomSubject('');
        setCustomMessage('');
        setSenderName('');
        setSenderEmail('');
      } else {
        throw new Error('Erreur lors de la création de la campagne');
      }
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

  const getContactsByIndustry = () => {
    const industries = selectedContacts.reduce((acc, contact) => {
      acc[contact.industry] = (acc[contact.industry] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return industries;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Créer une Campagne Email B2B
          </DialogTitle>
          <DialogDescription>
            Créez une campagne personnalisée pour {selectedContacts.length} contact(s) sélectionné(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Résumé des contacts */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-3 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Contacts sélectionnés ({selectedContacts.length})
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Par secteur:</p>
                {Object.entries(getContactsByIndustry()).map(([industry, count]) => (
                  <Badge key={industry} variant="outline" className="mr-1 mb-1">
                    {industry} ({count})
                  </Badge>
                ))}
              </div>
              <div>
                <p className="font-medium">Exemples de contacts:</p>
                <div className="space-y-1">
                  {selectedContacts.slice(0, 3).map((contact, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      • {contact.name} - {contact.companyName}
                    </div>
                  ))}
                  {selectedContacts.length > 3 && (
                    <div className="text-xs text-gray-500">
                      et {selectedContacts.length - 3} autres...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration de campagne */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaignBot">Bot de la campagne</Label>
                <Select value={selectedBotId} onValueChange={setSelectedBotId}>
                  <SelectTrigger id="campaignBot">
                    <SelectValue placeholder={loadingBots ? 'Chargement des bots...' : 'Sélectionner un bot'} />
                  </SelectTrigger>
                  <SelectContent>
                    {botOptions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaignName">Nom de la campagne</Label>
                <Input
                  id="campaignName"
                  placeholder="Ex: Prospection B2B Janvier 2024"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Modèle de message</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-gray-500">{template.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderName">Nom de l'expéditeur</Label>
                <Input
                  id="senderName"
                  placeholder="Votre nom complet"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderEmail">Email de l'expéditeur</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  placeholder="votre.email@entreprise.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Contenu du message */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Objet du message</Label>
                <Input
                  id="subject"
                  placeholder="Objet personnalisé..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Variables disponibles: {'{name}'}, {'{companyName}'}, {'{jobTitle}'}, {'{industry}'}, {'{location}'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message personnalisé</Label>
                <Textarea
                  id="message"
                  placeholder="Votre message personnalisé..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={8}
                />
                <p className="text-xs text-gray-500">
                  Le message sera automatiquement personnalisé pour chaque contact
                </p>
              </div>
            </div>
          </div>

          {/* Prévisualisation */}
          {customMessage && selectedContacts.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-3 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Prévisualisation (exemple avec {selectedContacts[0].name})
              </h4>
              <div className="bg-white p-3 rounded border text-sm">
                <div className="font-medium mb-2">
                  Objet: {generatePersonalizedSubject(selectedContacts[0])}
                </div>
                <div className="whitespace-pre-wrap">
                  {generatePersonalizedMessage(selectedContacts[0])}
                </div>
                <div className="mt-2 text-gray-500">
                  {senderName}
                  {senderName && senderEmail && ' - '}
                  {senderEmail}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Annuler
            </Button>
            <Button onClick={handleCreateCampaign} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Créer la Campagne
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};