import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Mail, 
  Phone, 
  MessageSquare, 
  Users, 
  Target, 
  Sparkles,
  CheckCircle,
  AlertCircle,
  Send
} from 'lucide-react';

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

interface LeadQualificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: B2BContact[];
  qualificationType: 'sms' | 'email' | 'whatsapp';
}

const EMAIL_TEMPLATES = [
  {
    id: 'qualification-simple',
    name: 'Qualification Simple',
    subject: 'Êtes-vous intéressé(e) par nos solutions ?',
    template: `Bonjour {name},

Nous avons identifié {companyName} comme une entreprise qui pourrait bénéficier de nos solutions.

Pouvez-vous me confirmer si vous seriez intéressé(e) par :
- Une présentation de 15 minutes de nos services
- L'envoi d'une documentation détaillée
- Un audit gratuit de vos besoins

Merci de répondre simplement par OUI ou NON.

Cordialement,`
  },
  {
    id: 'qualification-budget',
    name: 'Qualification Budget',
    subject: 'Évaluation rapide de vos besoins',
    template: `Bonjour {name},

Nous proposons des solutions adaptées aux entreprises du secteur {industry}.

Pour vous proposer la meilleure approche, pourriez-vous nous indiquer :
1. Votre budget annuel pour ce type de solution (< 5K€, 5-15K€, > 15K€)
2. Votre échéance de décision (3 mois, 6 mois, 12 mois)
3. Votre niveau d'urgence (faible, moyen, élevé)

Réponse attendue : quelques mots suffisent.

Merci,`
  }
];

const SMS_TEMPLATES = [
  {
    id: 'sms-quick',
    name: 'SMS Rapide',
    template: 'Bonjour {name}, {companyName} pourrait bénéficier de nos solutions. Intéressé(e) ? Répondez OUI/NON. Merci!'
  },
  {
    id: 'sms-meeting',
    name: 'SMS Rendez-vous',
    template: 'Bonjour {name} de {companyName}, je peux vous présenter nos solutions en 15min. Disponible cette semaine ? Répondez OUI/NON.'
  }
];

const WHATSAPP_TEMPLATES = [
  {
    id: 'whatsapp-intro',
    name: 'Introduction WhatsApp',
    template: `Bonjour {name} 👋

Je vous contacte car {companyName} pourrait être intéressée par nos solutions pour le secteur {industry}.

Seriez-vous disponible pour un échange rapide de 10 minutes ?

Merci ! 🙂`
  },
  {
    id: 'whatsapp-demo',
    name: 'Démonstration WhatsApp',
    template: `Bonjour {name},

Nous avons développé une solution spécialement pour les entreprises comme {companyName}.

Puis-je vous envoyer une démonstration vidéo de 3 minutes ?

C'est gratuit et sans engagement 😊`
  }
];

export const LeadQualificationModal: React.FC<LeadQualificationModalProps> = ({
  isOpen,
  onClose,
  selectedContacts,
  qualificationType
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [senderInfo, setSenderInfo] = useState('');
  const [qualificationCriteria, setQualificationCriteria] = useState('budget');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const { toast } = useToast();

  const getAvailableContacts = () => {
    if (qualificationType === 'email') {
      return selectedContacts.filter(contact => contact.email && contact.email.trim() !== '');
    } else {
      return selectedContacts.filter(contact => contact.phone && contact.phone.trim() !== '');
    }
  };

  const getTemplates = () => {
    switch (qualificationType) {
      case 'email': return EMAIL_TEMPLATES;
      case 'sms': return SMS_TEMPLATES;
      case 'whatsapp': return WHATSAPP_TEMPLATES;
      default: return [];
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const templates = getTemplates();
    const template = templates.find(t => t.id === templateId);
    if (template) {
      if ('subject' in template && typeof template.subject === 'string') {
        setCustomSubject(template.subject);
      }
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

  const simulateQualificationProcess = async () => {
    const steps = [
      'Préparation des messages personnalisés...',
      'Extraction des données de contact...',
      'Validation des numéros/emails...',
      'Envoi des messages de qualification...',
      'Configuration du suivi automatique...',
      'Finalisation du processus...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const handleStartQualification = async () => {
    if (!customMessage.trim()) {
      toast({
        title: "Message requis",
        description: "Veuillez saisir le contenu de votre message",
        variant: "destructive",
      });
      return;
    }

    if (!senderInfo.trim()) {
      toast({
        title: "Informations expéditeur requises",
        description: "Veuillez renseigner vos informations",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await simulateQualificationProcess();
      
      toast({
        title: "Qualification lancée avec succès",
        description: `${getAvailableContacts().length} messages de qualification envoyés`,
      });
      
      // Simulation de la création des données de qualification
      const qualificationData = {
        type: qualificationType,
        contacts: getAvailableContacts().length,
        template: selectedTemplate,
        criteria: qualificationCriteria,
        message: customMessage,
        sender: senderInfo,
        createdAt: new Date().toISOString()
      };
      
      console.log('Qualification data:', qualificationData);
      
      onClose();
    } catch (error) {
      console.error('Error starting qualification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de lancer la qualification",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep(0);
    }
  };

  const getModalTitle = () => {
    switch (qualificationType) {
      case 'email': return 'Qualification par Email';
      case 'sms': return 'Qualification par SMS';
      case 'whatsapp': return 'Qualification par WhatsApp';
      default: return 'Qualification des Leads';
    }
  };

  const getModalIcon = () => {
    switch (qualificationType) {
      case 'email': return <Mail className="w-5 h-5 mr-2" />;
      case 'sms': return <Phone className="w-5 h-5 mr-2" />;
      case 'whatsapp': return <MessageSquare className="w-5 h-5 mr-2" />;
      default: return <Target className="w-5 h-5 mr-2" />;
    }
  };

  const availableContacts = getAvailableContacts();

  if (isProcessing) {
    const steps = [
      'Préparation des messages personnalisés...',
      'Extraction des données de contact...',
      'Validation des numéros/emails...',
      'Envoi des messages de qualification...',
      'Configuration du suivi automatique...',
      'Finalisation du processus...'
    ];

    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              Qualification en cours...
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium">Traitement en cours</p>
                <p className="text-gray-600">{steps[processingStep]}</p>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((processingStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Étape {processingStep + 1} sur {steps.length}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {getModalIcon()}
            {getModalTitle()}
          </DialogTitle>
          <DialogDescription>
            Qualifiez {availableContacts.length} contact(s) disponible(s) sur {selectedContacts.length} sélectionné(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statut des contacts */}
          <div className={`p-4 rounded-lg ${availableContacts.length === selectedContacts.length ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {availableContacts.length === selectedContacts.length ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <h4 className="font-medium">
                {availableContacts.length} contact(s) avec {qualificationType === 'email' ? 'email' : 'téléphone'} disponible(s)
              </h4>
            </div>
            {availableContacts.length !== selectedContacts.length && (
              <p className="text-sm text-yellow-700">
                {selectedContacts.length - availableContacts.length} contact(s) seront ignorés car ils n'ont pas de {qualificationType === 'email' ? 'adresse email' : 'numéro de téléphone'}.
              </p>
            )}
          </div>

          <Tabs defaultValue="message" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="message">Message</TabsTrigger>
              <TabsTrigger value="criteria">Critères</TabsTrigger>
              <TabsTrigger value="preview">Aperçu</TabsTrigger>
            </TabsList>

            <TabsContent value="message" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template">Modèle de message</Label>
                    <Select value={selectedTemplate} onValueChange={(value: string) => handleTemplateChange(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un modèle" />
                      </SelectTrigger>
                      <SelectContent>
                        {getTemplates().map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {qualificationType === 'email' && (
                    <div className="space-y-2">
                      <Label htmlFor="subject">Objet de l'email</Label>
                      <Input
                        id="subject"
                        placeholder="Objet du message..."
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="senderInfo">Informations expéditeur</Label>
                    <Input
                      id="senderInfo"
                      placeholder="Votre nom et entreprise"
                      value={senderInfo}
                      onChange={(e) => setSenderInfo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="message">Message personnalisé</Label>
                    <Textarea
                      id="message"
                      placeholder="Votre message..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={qualificationType === 'email' ? 10 : 6}
                    />
                    <p className="text-xs text-gray-500">
                      Variables: {'{name}'}, {'{companyName}'}, {'{jobTitle}'}, {'{industry}'}, {'{location}'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="criteria" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Critères de qualification</Label>
                  <Select value={qualificationCriteria} onValueChange={(value: string) => setQualificationCriteria(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget et timing</SelectItem>
                      <SelectItem value="interest">Niveau d'intérêt</SelectItem>
                      <SelectItem value="authority">Pouvoir de décision</SelectItem>
                      <SelectItem value="need">Besoin identifié</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Objectifs de qualification :</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Identifier les prospects intéressés</li>
                    <li>• Qualifier le budget disponible</li>
                    <li>• Déterminer le calendrier de décision</li>
                    <li>• Évaluer l'autorité décisionnelle</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              {customMessage && availableContacts.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Aperçu des messages ({availableContacts.length} contact(s))
                  </h4>
                  
                  <div className="grid gap-4 max-h-64 overflow-y-auto">
                    {availableContacts.slice(0, 3).map((contact, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-600 mb-1">
                          Pour: {contact.name} ({qualificationType === 'email' ? contact.email : contact.phone})
                        </div>
                        {qualificationType === 'email' && customSubject && (
                          <div className="font-medium mb-2 text-sm">
                            Objet: {customSubject.replace(/{name}/g, contact.name).replace(/{companyName}/g, contact.companyName)}
                          </div>
                        )}
                        <div className="text-sm whitespace-pre-wrap border-l-2 border-blue-200 pl-3">
                          {generatePersonalizedMessage(contact)}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {senderInfo}
                        </div>
                      </div>
                    ))}
                    {availableContacts.length > 3 && (
                      <div className="text-center text-sm text-gray-500">
                        et {availableContacts.length - 3} autres messages...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Annuler
            </Button>
            <Button onClick={handleStartQualification} disabled={isProcessing || availableContacts.length === 0}>
              <Send className="w-4 h-4 mr-2" />
              Lancer la Qualification ({availableContacts.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};