import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAutomationBots } from '@/hooks/useAutomationBots';
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
  Send,
  Bot,
  ExternalLink,
  Copy,
  Zap
} from 'lucide-react';
import { WhatsAppShareManager } from './WhatsAppShareManager';
import { SocialSharingCampaignWizard } from '../social-sharing/SocialSharingCampaignWizard';

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

interface EnhancedLeadQualificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: B2BContact[];
  qualificationType: 'sms' | 'email' | 'whatsapp';
}

const ENHANCED_EMAIL_TEMPLATES = [
  {
    id: 'bot-qualification',
    name: 'Qualification avec Bot IA',
    subject: 'Évaluation rapide avec notre assistant IA',
    template: `Bonjour {name},

Nous avons développé un assistant IA spécialement pour qualifier les besoins des entreprises comme {companyName}.

Plutôt que de vous faire perdre du temps avec de longs formulaires, notre bot peut vous qualifier en 3 minutes via une conversation naturelle.

{botLink}

Cliquez simplement sur le lien ci-dessus pour démarrer la qualification automatique.

Cordialement,
{senderInfo}`
  },
  {
    id: 'bot-demo-instant',
    name: 'Démonstration Interactive Instantanée',
    subject: 'Démo interactive en 5 minutes - {companyName}',
    template: `Bonjour {name},

Au lieu d'une présentation classique, nous vous proposons une démonstration interactive avec notre assistant spécialisé.

Il peut vous montrer en temps réel comment nos solutions s'adaptent aux défis de {companyName} dans le secteur {industry}.

{botLink}

La démo est entièrement adaptée à votre profil et disponible 24h/24.

{senderInfo}`
  }
];

const ENHANCED_SMS_TEMPLATES = [
  {
    id: 'sms-bot-quick',
    name: 'SMS Bot Qualification',
    template: 'Bonjour {name}, qualifiez vos besoins en 2min avec notre assistant IA: {botLink} - {senderInfo}'
  },
  {
    id: 'sms-bot-demo',
    name: 'SMS Démo Interactive',
    template: '{name}, démo interactive personnalisée pour {companyName}: {botLink} - Disponible maintenant!'
  }
];

const ENHANCED_WHATSAPP_TEMPLATES = [
  {
    id: 'whatsapp-bot-intro',
    name: 'WhatsApp Assistant IA',
    template: `Bonjour {name} 👋

J'ai configuré un assistant IA spécialement pour {companyName}.

Il peut vous qualifier et vous présenter nos solutions en mode conversationnel, quand vous voulez:

{botLink}

C'est plus rapide qu'un appel et plus personnel qu'un email 😊

{senderInfo}`
  },
  {
    id: 'whatsapp-bot-expert',
    name: 'WhatsApp Expert Virtuel',
    template: `Salut {name}! 🤖

Plutôt que de planifier un RDV, que diriez-vous d'échanger avec notre expert virtuel spécialisé dans votre secteur {industry}?

{botLink}

Il connaît parfaitement les défis de {companyName} et peut vous proposer des solutions sur-mesure instantanément.

Disponible 24h/24! 🚀`
  }
];

export const EnhancedLeadQualificationModal: React.FC<EnhancedLeadQualificationModalProps> = ({
  isOpen,
  onClose,
  selectedContacts,
  qualificationType
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedBot, setSelectedBot] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [senderInfo, setSenderInfo] = useState('');
  const [qualificationCriteria, setQualificationCriteria] = useState('budget');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const { toast } = useToast();
  const { botOptions, loading: botsLoading } = useAutomationBots();

  const getAvailableContacts = () => {
    if (qualificationType === 'email') {
      return selectedContacts.filter(contact => contact.email && contact.email.trim() !== '');
    } else {
      return selectedContacts.filter(contact => contact.phone && contact.phone.trim() !== '');
    }
  };

  const getTemplates = () => {
    switch (qualificationType) {
      case 'email': return ENHANCED_EMAIL_TEMPLATES;
      case 'sms': return ENHANCED_SMS_TEMPLATES;
      case 'whatsapp': return ENHANCED_WHATSAPP_TEMPLATES;
      default: return [];
    }
  };

  const getSelectedBot = () => {
    return botOptions.find(bot => bot.id === selectedBot);
  };

  const generateBotLink = (contact: B2BContact) => {
    const selectedBotData = getSelectedBot();
    if (!selectedBotData) return 'Sélectionnez un bot d\'abord';

    const params = new URLSearchParams({
      utm_source: 'lead_qualification',
      utm_medium: qualificationType,
      utm_campaign: 'automated_qualification',
      contact_name: contact.name,
      company: contact.companyName,
      industry: contact.industry,
      lead_id: contact.id
    });

    return `${selectedBotData.public_chat_url}&${params.toString()}`;
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
    const botLink = generateBotLink(contact);
    
    return customMessage
      .replace(/{name}/g, contact.name)
      .replace(/{companyName}/g, contact.companyName)
      .replace(/{jobTitle}/g, contact.jobTitle)
      .replace(/{industry}/g, contact.industry)
      .replace(/{location}/g, contact.location)
      .replace(/{botLink}/g, botLink)
      .replace(/{senderInfo}/g, senderInfo);
  };

  const copyBotLink = async (contact: B2BContact) => {
    const link = generateBotLink(contact);
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Lien copié",
        description: `Lien du bot pour ${contact.name} copié dans le presse-papiers`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive",
      });
    }
  };

  const simulateEnhancedQualificationProcess = async () => {
    const steps = [
      'Configuration des bots automatisés...',
      'Génération des liens personnalisés...',
      'Préparation des messages avec IA...',
      'Validation des données de contact...',
      'Envoi des messages de qualification...',
      'Activation du suivi automatique...',
      'Configuration des relances intelligentes...',
      'Finalisation du processus...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  };

  const [showWhatsAppManager, setShowWhatsAppManager] = useState(false);
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [campaignSummary, setCampaignSummary] = useState<any>(null);

  const handleStartQualification = async () => {
    if (!selectedBot) {
      toast({
        title: "Bot requis",
        description: "Veuillez sélectionner un bot automatisé",
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
      await simulateEnhancedQualificationProcess();
      
      // Préparation des données pour WhatsApp Manager
      if (qualificationType === 'whatsapp') {
        setShowWhatsAppManager(true);
      } else {
        // Pour email/SMS, processus direct
        await finalizeQualificationProcess();
      }
      
    } catch (error) {
      console.error('Error starting enhanced qualification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de lancer la qualification automatisée",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep(0);
    }
  };

  const finalizeQualificationProcess = async () => {
    toast({
      title: "Qualification IA lancée avec succès",
      description: `${getAvailableContacts().length} messages avec bots automatisés envoyés`,
    });
    
    // Proposer la finalisation en campagne
    setShowCampaignWizard(true);
  };

  const handleCampaignFinalization = (summary: any) => {
    setCampaignSummary(summary);
    setShowCampaignWizard(true);
    setShowWhatsAppManager(false);
  };

  const getModalTitle = () => {
    switch (qualificationType) {
      case 'email': return 'Qualification Email + Bot IA';
      case 'sms': return 'Qualification SMS + Bot IA';
      case 'whatsapp': return 'Qualification WhatsApp + Bot IA';
      default: return 'Qualification Automatisée';
    }
  };

  const getModalIcon = () => {
    return <Zap className="w-5 h-5 mr-2" />;
  };

  const availableContacts = getAvailableContacts();

  if (isProcessing) {
    const steps = [
      'Configuration des bots automatisés...',
      'Génération des liens personnalisés...',
      'Préparation des messages avec IA...',
      'Validation des données de contact...',
      'Envoi des messages de qualification...',
      'Activation du suivi automatique...',
      'Configuration des relances intelligentes...',
      'Finalisation du processus...'
    ];

    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              Qualification IA en cours...
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium">Traitement automatisé</p>
                <p className="text-gray-600">{steps[processingStep]}</p>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {getModalIcon()}
            {getModalTitle()} avec Bots IA Automatisés
          </DialogTitle>
          <DialogDescription>
            🤖 Sélectionnez un bot automatisé et partagez des liens personnalisés avec messages IA pour {availableContacts.length} contact(s) • {botOptions.length} bot(s) disponible(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sélection du Bot Automatisé */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Bot className="w-5 h-5 mr-2" />
                Sélection du Bot Automatisé
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {botsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">Chargement des bots...</span>
                </div>
              ) : botOptions.length === 0 ? (
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-yellow-800 font-medium">Aucun bot automatisé disponible</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Créez d'abord un bot dans la section "Automatisations"
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="bot-select">Bot à utiliser pour la qualification</Label>
                  <Select value={selectedBot} onValueChange={setSelectedBot}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un bot automatisé" />
                    </SelectTrigger>
                    <SelectContent>
                      {botOptions.map((bot) => (
                        <SelectItem key={bot.id} value={bot.id}>
                          <div className="flex items-center space-x-2">
                            <Bot className="w-4 h-4" />
                            <div>
                              <div className="font-medium">{bot.name}</div>
                              <div className="text-xs text-gray-500">{bot.chat_title}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedBot && (
                    <div className="mt-3 p-3 bg-white rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Bot sélectionné: {getSelectedBot()?.name}</p>
                          <p className="text-xs text-gray-500">{getSelectedBot()?.description}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(getSelectedBot()?.public_chat_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Tester
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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
          </div>

          <Tabs defaultValue="message" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="message">Message</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
              <TabsTrigger value="preview">Aperçu</TabsTrigger>
              <TabsTrigger value="tracking">Suivi</TabsTrigger>
            </TabsList>

            <TabsContent value="message" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template">Modèle de message automatisé</Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un modèle avec bot IA" />
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
                      placeholder="Votre message avec intégration bot..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={qualificationType === 'email' ? 12 : 8}
                    />
                    <p className="text-xs text-gray-500">
                      Variables: {'{name}'}, {'{companyName}'}, {'{industry}'}, {'{botLink}'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="automation" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Configuration Automatisation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Critères de qualification automatique</Label>
                      <Select value={qualificationCriteria} onValueChange={setQualificationCriteria}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="budget">Budget et timing avec IA</SelectItem>
                          <SelectItem value="interest">Niveau d'intérêt automatique</SelectItem>
                          <SelectItem value="authority">Pouvoir de décision + scoring</SelectItem>
                          <SelectItem value="need">Besoin identifié par bot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Avantages de l'automatisation :</h4>
                      <ul className="text-sm space-y-1">
                        <li>🤖 Qualification 24h/24 par IA</li>
                        <li>📊 Scoring automatique des leads</li>
                        <li>🔄 Relances programmées intelligentes</li>
                        <li>📈 Analytics temps réel</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Liens Bot Personnalisés</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedBot && availableContacts.length > 0 && (
                      <div className="space-y-3">
                        <Label>Liens générés pour chaque contact:</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {availableContacts.slice(0, 5).map((contact, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                              <span className="truncate">{contact.name} - {contact.companyName}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyBotLink(contact)}
                                className="h-6 px-2"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          {availableContacts.length > 5 && (
                            <p className="text-xs text-gray-500 text-center">
                              +{availableContacts.length - 5} autres liens...
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              {customMessage && selectedBot && availableContacts.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Aperçu messages avec bot IA ({availableContacts.length} contact(s))
                  </h4>
                  
                  <div className="grid gap-4 max-h-96 overflow-y-auto">
                    {availableContacts.slice(0, 3).map((contact, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-600">
                              Pour: {contact.name} ({qualificationType === 'email' ? contact.email : contact.phone})
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Bot: {getSelectedBot()?.name}
                            </Badge>
                          </div>
                          
                          {qualificationType === 'email' && customSubject && (
                            <div className="font-medium text-sm">
                              Objet: {customSubject.replace(/{name}/g, contact.name).replace(/{companyName}/g, contact.companyName)}
                            </div>
                          )}
                          
                          <div className="text-sm whitespace-pre-wrap border-l-2 border-blue-200 pl-3 bg-gray-50 p-3 rounded">
                            {generatePersonalizedMessage(contact)}
                          </div>
                          
                          <div className="bg-blue-50 p-2 rounded text-xs">
                            <div className="flex items-center space-x-2">
                              <Bot className="w-3 h-3" />
                              <span className="font-medium">Lien bot automatisé:</span>
                            </div>
                            <div className="truncate text-blue-600 mt-1">
                              {generateBotLink(contact)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Suivi et Analytics Automatiques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h5 className="font-medium">Métriques trackées:</h5>
                      <ul className="text-sm space-y-1">
                        <li>✓ Taux d'ouverture des messages</li>
                        <li>✓ Clics sur liens bot</li>
                        <li>✓ Conversations initiées</li>
                        <li>✓ Temps de conversation</li>
                        <li>✓ Qualification complétée</li>
                        <li>✓ Score de qualification</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="font-medium">Relances automatiques:</h5>
                      <ul className="text-sm space-y-1">
                        <li>🔄 J+1: Rappel si pas d'ouverture</li>
                        <li>🔄 J+3: Nouveau message si pas de clic</li>
                        <li>🔄 J+7: Follow-up personnalisé</li>
                        <li>🔄 J+14: Dernière tentative</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border">
                    <h5 className="font-medium mb-2">Intelligence Artificielle Intégrée:</h5>
                    <p className="text-sm text-gray-700">
                      Chaque interaction avec le bot enrichit automatiquement le profil du lead avec des données 
                      de qualification, des préférences comportementales et un score de maturité commercial.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              onClick={handleStartQualification}
              disabled={!selectedBot || !customMessage.trim() || !senderInfo.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {qualificationType === 'whatsapp' ? 'Valider et partager sur WhatsApp' : 'Lancer qualification IA'}
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* WhatsApp Share Manager */}
      {showWhatsAppManager && (
        <WhatsAppShareManager
          isOpen={showWhatsAppManager}
          onClose={() => setShowWhatsAppManager(false)}
          contacts={getAvailableContacts()}
          message={customMessage}
          onFinalizeCampaign={handleCampaignFinalization}
        />
      )}
      
      {/* Campaign Wizard for Finalization */}
      {showCampaignWizard && (
        <SocialSharingCampaignWizard
          onClose={() => {
            setShowCampaignWizard(false);
            onClose();
          }}
          afterCreate={() => {
            toast({
              title: "Campagne finalisée",
              description: "Votre campagne a été sauvegardée avec succès",
            });
          }}
          initialData={{
            campaignName: `Qualification ${qualificationType} - ${new Date().toLocaleDateString()}`,
            description: `Campagne de qualification via ${qualificationType} avec ${getAvailableContacts().length} contacts`,
            platforms: [qualificationType],
            contacts: getAvailableContacts(),
            qualificationType: qualificationType,
            botId: selectedBot,
            customMessage: customMessage
          }}
        />
      )}
    </Dialog>
  );
};