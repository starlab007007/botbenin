import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Phone, 
  Mail,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Edit3,
  Send,
  BarChart3,
  Users,
  Clock
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  industry: string;
  validated?: boolean;
  whatsappAvailable?: boolean;
  emailRequired?: boolean;
}

interface WhatsAppShareManagerProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  message: string;
  selectedBot?: {
    id: string;
    name: string;
    public_chat_url: string;
  };
  onFinalizeCampaign: (summary: CampaignSummary) => void;
}

interface CampaignSummary {
  totalContacts: number;
  whatsappSent: number;
  emailSent: number;
  failed: number;
  statuses: ContactStatus[];
}

interface ContactStatus {
  contactId: string;
  name: string;
  status: 'whatsapp_sent' | 'email_sent' | 'manual_required' | 'failed';
  channel: 'whatsapp' | 'email';
  message?: string;
}

export const WhatsAppShareManager: React.FC<WhatsAppShareManagerProps> = ({
  isOpen,
  onClose,
  contacts,
  message,
  selectedBot,
  onFinalizeCampaign
}) => {
  const [validatedContacts, setValidatedContacts] = useState<Contact[]>([]);
  const [currentStep, setCurrentStep] = useState<'validation' | 'sharing' | 'summary'>('validation');
  const [contactStatuses, setContactStatuses] = useState<ContactStatus[]>([]);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (contacts.length > 0) {
      validateContacts();
    }
  }, [contacts]);

  const validateContacts = async () => {
    const validated = contacts.map(contact => ({
      ...contact,
      validated: !!(contact.phone && contact.phone.trim()),
      whatsappAvailable: Math.random() > 0.3, // Simulation
      emailRequired: !contact.email || !contact.email.trim()
    }));
    setValidatedContacts(validated);
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    // Nettoyer et formater le numéro pour WhatsApp
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // S'assurer que le numéro commence par +
    if (!cleaned.startsWith('+')) {
      // Si ça commence par 33, ajouter le +
      if (cleaned.startsWith('33')) {
        cleaned = '+' + cleaned;
      }
      // Si ça commence par 0, remplacer par +33
      else if (cleaned.startsWith('0')) {
        cleaned = '+33' + cleaned.substring(1);
      }
      // Sinon ajouter +33 par défaut
      else {
        cleaned = '+33' + cleaned;
      }
    }
    
    return cleaned;
  };

  const generateWhatsAppLink = (contact: Contact, customMessage: string) => {
    const formattedPhone = formatPhoneForWhatsApp(contact.phone);
    const encodedMessage = encodeURIComponent(customMessage);
    return `https://wa.me/${formattedPhone.replace(/[^\d]/g, '')}?text=${encodedMessage}`;
  };

  const generateBotLink = (contact: Contact) => {
    if (!selectedBot) return 'Bot non sélectionné';

    const params = new URLSearchParams({
      utm_source: 'lead_qualification',
      utm_medium: 'whatsapp',
      utm_campaign: 'automated_qualification',
      contact_name: contact.name,
      company: contact.companyName,
      industry: contact.industry,
      lead_id: contact.id
    });

    return `${selectedBot.public_chat_url}&${params.toString()}`;
  };

  const handleWhatsAppShare = async (contact: Contact) => {
    const botLink = generateBotLink(contact);
    
    const personalizedMessage = message
      .replace(/{name}/g, contact.name)
      .replace(/{companyName}/g, contact.companyName)
      .replace(/{industry}/g, contact.industry)
      .replace(/{botLink}/g, botLink);

    const whatsappLink = generateWhatsAppLink(contact, personalizedMessage);
    
    try {
      // Créer un élément a temporaire pour forcer l'ouverture
      const tempLink = document.createElement('a');
      tempLink.href = whatsappLink;
      tempLink.target = '_blank';
      tempLink.rel = 'noopener noreferrer';
      
      // Ajouter au DOM, cliquer, puis supprimer
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      
      // Marquer comme envoyé
      const status: ContactStatus = {
        contactId: contact.id,
        name: contact.name,
        status: 'whatsapp_sent',
        channel: 'whatsapp',
        message: personalizedMessage
      };
      
      setContactStatuses(prev => [...prev, status]);
      
      toast({
        title: "WhatsApp ouvert",
        description: `Message préparé pour ${contact.name} - ${formatPhoneForWhatsApp(contact.phone)}`,
      });
    } catch (error) {
      console.error('Erreur WhatsApp:', error);
      
      const status: ContactStatus = {
        contactId: contact.id,
        name: contact.name,
        status: 'failed',
        channel: 'whatsapp',
        message: 'Erreur ouverture WhatsApp'
      };
      
      setContactStatuses(prev => [...prev, status]);
      
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir WhatsApp. Copiez le lien manuellement.",
        variant: "destructive",
      });
      
      // Fallback: copier le lien dans le presse-papiers
      try {
        await navigator.clipboard.writeText(whatsappLink);
        toast({
          title: "Lien copié",
          description: "Le lien WhatsApp a été copié dans le presse-papiers",
        });
      } catch (clipboardError) {
        console.error('Erreur copie:', clipboardError);
      }
    }
  };

  const handleEmailFallback = async (contact: Contact, email: string) => {
    if (!email.includes('@')) {
      toast({
        title: "Email invalide",
        description: "Veuillez saisir un email valide",
        variant: "destructive",
      });
      return;
    }

    // Simulation envoi email
    const status: ContactStatus = {
      contactId: contact.id,
      name: contact.name,
      status: 'email_sent',
      channel: 'email',
      message: `Email envoyé à ${email}`
    };
    
    setContactStatuses(prev => [...prev, status]);
    setEditingContact(null);
    setEmailInput('');
    
    toast({
      title: "Email envoyé",
      description: `Message envoyé à ${email}`,
    });
  };

  const handlePhoneEdit = (contact: Contact, newPhone: string) => {
    setValidatedContacts(prev => 
      prev.map(c => 
        c.id === contact.id 
          ? { ...c, phone: newPhone, whatsappAvailable: true } 
          : c
      )
    );
    setEditingContact(null);
    setPhoneInput('');
    
    toast({
      title: "Numéro modifié",
      description: "Vous pouvez maintenant partager sur WhatsApp",
    });
  };

  const proceedToSummary = () => {
    const summary: CampaignSummary = {
      totalContacts: contacts.length,
      whatsappSent: contactStatuses.filter(s => s.status === 'whatsapp_sent').length,
      emailSent: contactStatuses.filter(s => s.status === 'email_sent').length,
      failed: contactStatuses.filter(s => s.status === 'failed').length,
      statuses: contactStatuses
    };
    
    setCurrentStep('summary');
    onFinalizeCampaign(summary);
  };

  const renderValidationStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Validation des contacts</h3>
      </div>
      
      <div className="grid gap-4">
        {validatedContacts.map((contact) => (
          <Card key={contact.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium">{contact.name}</div>
                <div className="text-sm text-gray-600">{contact.companyName}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{contact.phone}</span>
                  {contact.whatsappAvailable ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                  )}
                </div>
                {contact.emailRequired && (
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm text-orange-600">Email manquant</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                {contact.whatsappAvailable ? (
                  <Button 
                    size="sm" 
                    onClick={() => handleWhatsAppShare(contact)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    WhatsApp
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setEditingContact(contact.id);
                      setPhoneInput(contact.phone);
                    }}
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                )}
                
                {contact.emailRequired && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setEditingContact(contact.id + '_email');
                      setEmailInput('');
                    }}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    + Email
                  </Button>
                )}
              </div>
            </div>
            
            {editingContact === contact.id && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <Label>Modifier le numéro</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+33..."
                  />
                  <Button 
                    size="sm"
                    onClick={() => handlePhoneEdit(contact, phoneInput)}
                  >
                    ✓
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setEditingContact(null)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}
            
            {editingContact === contact.id + '_email' && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <Label>Ajouter un email</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="email@exemple.com"
                    type="email"
                  />
                  <Button 
                    size="sm"
                    onClick={() => handleEmailFallback(contact, emailInput)}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setEditingContact(null)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={proceedToSummary}>
          Voir le récapitulatif
          <BarChart3 className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderSummaryStep = () => {
    const summary: CampaignSummary = {
      totalContacts: contacts.length,
      whatsappSent: contactStatuses.filter(s => s.status === 'whatsapp_sent').length,
      emailSent: contactStatuses.filter(s => s.status === 'email_sent').length,
      failed: contactStatuses.filter(s => s.status === 'failed').length,
      statuses: contactStatuses
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold">Récapitulatif de la campagne</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-blue-50">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.totalContacts}</div>
              <div className="text-sm text-blue-700">Total contacts</div>
            </div>
          </Card>
          <Card className="p-4 bg-green-50">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.whatsappSent}</div>
              <div className="text-sm text-green-700">WhatsApp</div>
            </div>
          </Card>
          <Card className="p-4 bg-purple-50">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{summary.emailSent}</div>
              <div className="text-sm text-purple-700">Email</div>
            </div>
          </Card>
          <Card className="p-4 bg-red-50">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
              <div className="text-sm text-red-700">Échecs</div>
            </div>
          </Card>
        </div>
        
        <Card className="p-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Détail des statuts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.statuses.map((status, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{status.name}</div>
                  {status.channel === 'whatsapp' ? (
                    <MessageSquare className="w-4 h-4 text-green-600" />
                  ) : (
                    <Mail className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <Badge 
                  variant={
                    status.status === 'whatsapp_sent' || status.status === 'email_sent' 
                      ? 'default' 
                      : status.status === 'failed' 
                        ? 'destructive' 
                        : 'secondary'
                  }
                >
                  {status.status === 'whatsapp_sent' && 'Envoyé WhatsApp'}
                  {status.status === 'email_sent' && 'Envoyé Email'}
                  {status.status === 'failed' && 'Échec'}
                  {status.status === 'manual_required' && 'Manuel requis'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setCurrentStep('validation')}>
            Retour
          </Button>
          <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
            Finaliser la campagne
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            Partage WhatsApp et finalisation
          </DialogTitle>
          <DialogDescription>
            Validez et partagez avec {contacts.length} contact(s) via WhatsApp avec fallback email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {currentStep === 'validation' && renderValidationStep()}
          {currentStep === 'summary' && renderSummaryStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};