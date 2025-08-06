import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAutomationBots } from '@/hooks/useAutomationBots';
import { SocialSharingModal } from './SocialSharingModal';
import { 
  ArrowLeft,
  Bot,
  MessageSquare,
  Smartphone,
  Mail,
  Share2,
  ExternalLink,
  Copy,
  CheckCircle,
  Target,
  Zap,
  Users,
  Plus,
  Settings
} from 'lucide-react';

interface NewLeadQualificationProps {
  onBack: () => void;
}

interface QualificationCampaign {
  name: string;
  selectedBot: string;
  message: string;
  channels: string[];
  targetEmails: string[];
  targetPhones: string[];
}

export const NewLeadQualification: React.FC<NewLeadQualificationProps> = ({ onBack }) => {
  const [campaign, setCampaign] = useState<QualificationCampaign>({
    name: '',
    selectedBot: '',
    message: '',
    channels: [],
    targetEmails: [],
    targetPhones: []
  });
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [botLink, setBotLink] = useState('');
  
  const { botOptions, loading } = useAutomationBots();
  const { toast } = useToast();

  const messageTemplates = {
    whatsapp: `🤖 Bonjour ! Je suis l'assistant IA de notre équipe.

Nous avons développé des solutions qui pourraient vous intéresser. 

Auriez-vous 2 minutes pour répondre à quelques questions rapides ? Cela nous permettra de mieux comprendre vos besoins.

👉 Cliquez ici pour commencer : {botLink}`,
    
    sms: `Bonjour ! Assistant IA ici. Nous avons des solutions qui pourraient vous intéresser. 2 min pour quelques questions ? {botLink}`,
    
    email: `Objet: Qualification rapide de vos besoins - 2 minutes

Bonjour,

Je vous contacte pour vous proposer une qualification rapide de vos besoins via notre assistant IA.

Cette qualification prend seulement 2 minutes et nous permettra de :
- Mieux comprendre vos défis actuels
- Vous proposer des solutions adaptées
- Planifier un échange si pertinent

Cliquez simplement sur ce lien pour commencer : {botLink}

Cordialement,`
  };

  const addEmail = () => {
    if (newEmail && !campaign.targetEmails.includes(newEmail)) {
      setCampaign(prev => ({
        ...prev,
        targetEmails: [...prev.targetEmails, newEmail]
      }));
      setNewEmail('');
    }
  };

  const removeEmail = (email: string) => {
    setCampaign(prev => ({
      ...prev,
      targetEmails: prev.targetEmails.filter(e => e !== email)
    }));
  };

  const addPhone = () => {
    if (newPhone && !campaign.targetPhones.includes(newPhone)) {
      setCampaign(prev => ({
        ...prev,
        targetPhones: [...prev.targetPhones, newPhone]
      }));
      setNewPhone('');
    }
  };

  const removePhone = (phone: string) => {
    setCampaign(prev => ({
      ...prev,
      targetPhones: prev.targetPhones.filter(p => p !== phone)
    }));
  };

  const toggleChannel = (channel: string) => {
    setCampaign(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const generateBotLink = () => {
    if (!campaign.selectedBot) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un bot d'abord",
        variant: "destructive"
      });
      return;
    }

    const selectedBotData = botOptions.find(bot => bot.id === campaign.selectedBot);
    if (selectedBotData) {
      const link = selectedBotData.public_chat_url;
      setBotLink(link);
      
      // Mettre à jour le message avec le lien
      const template = messageTemplates[campaign.channels[0] as keyof typeof messageTemplates] || messageTemplates.whatsapp;
      setCampaign(prev => ({
        ...prev,
        message: template.replace('{botLink}', link)
      }));

      toast({
        title: "Lien généré",
        description: "Le lien du bot a été généré et intégré au message",
      });
    }
  };

  const copyBotLink = () => {
    if (botLink) {
      navigator.clipboard.writeText(botLink);
      toast({
        title: "Lien copié",
        description: "Le lien du bot a été copié dans le presse-papiers",
      });
    }
  };

  const openSocialSharing = () => {
    if (!botLink) {
      toast({
        title: "Erreur",
        description: "Veuillez générer le lien du bot d'abord",
        variant: "destructive"
      });
      return;
    }
    setShareModalOpen(true);
  };

  const launchCampaign = () => {
    if (!campaign.name || !campaign.selectedBot || !campaign.message) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Campagne lancée",
      description: `La campagne "${campaign.name}" a été lancée avec succès !`,
    });

    // Ici vous pourriez sauvegarder la campagne en base de données
    console.log('Campagne lancée:', campaign);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'sms': return <Smartphone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au menu
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nouvelle Qualification</h1>
              <p className="text-gray-600">Créez une campagne de qualification avec vos bots IA automatisés</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration de la campagne */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Configuration de la Campagne
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="campaignName">Nom de la campagne *</Label>
                  <Input
                    id="campaignName"
                    value={campaign.name}
                    onChange={(e) => setCampaign(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Qualification Prospects B2B Q1 2024"
                  />
                </div>

                <div>
                  <Label htmlFor="selectedBot">Bot IA Automatisé *</Label>
                  <Select value={campaign.selectedBot} onValueChange={(value) => setCampaign(prev => ({ ...prev, selectedBot: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un bot automatisé" />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <SelectItem value="loading" disabled>Chargement des bots...</SelectItem>
                      ) : botOptions.length === 0 ? (
                        <SelectItem value="no-bots" disabled>Aucun bot disponible</SelectItem>
                      ) : (
                        botOptions.map(bot => (
                          <SelectItem key={bot.id} value={bot.id}>
                            <div className="flex items-center space-x-2">
                              <Bot className="w-4 h-4" />
                              <span>{bot.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {botOptions.length === 0 && !loading && (
                    <p className="text-sm text-gray-500 mt-1">
                      <Button variant="link" className="p-0 h-auto text-blue-600" onClick={() => window.open('/automations', '_blank')}>
                        Créez votre premier bot automatisé
                      </Button>
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Button onClick={generateBotLink} disabled={!campaign.selectedBot}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Générer le lien du bot
                  </Button>
                  {botLink && (
                    <Button variant="outline" onClick={copyBotLink}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier le lien
                    </Button>
                  )}
                </div>

                {botLink && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Lien du bot généré</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1 break-all">{botLink}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Canaux de diffusion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Share2 className="w-5 h-5 mr-2" />
                  Canaux de Diffusion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-100 text-green-700' },
                    { id: 'sms', label: 'SMS', icon: Smartphone, color: 'bg-blue-100 text-blue-700' },
                    { id: 'email', label: 'Email', icon: Mail, color: 'bg-purple-100 text-purple-700' }
                  ].map(channel => (
                    <div
                      key={channel.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        campaign.channels.includes(channel.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleChannel(channel.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <channel.icon className="w-5 h-5" />
                          <span className="font-medium">{channel.label}</span>
                        </div>
                        {campaign.channels.includes(channel.id) && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Message personnalisé */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Message de Qualification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="message">Message personnalisé *</Label>
                  <Textarea
                    id="message"
                    value={campaign.message}
                    onChange={(e) => setCampaign(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Rédigez votre message d'invitation à la qualification..."
                    rows={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le lien {botLink ? 'généré' : 'du bot'} sera automatiquement intégré dans le message
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCampaign(prev => ({ ...prev, message: messageTemplates.whatsapp.replace('{botLink}', botLink || '[LIEN_BOT]') }))}
                  >
                    Modèle WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCampaign(prev => ({ ...prev, message: messageTemplates.sms.replace('{botLink}', botLink || '[LIEN_BOT]') }))}
                  >
                    Modèle SMS
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCampaign(prev => ({ ...prev, message: messageTemplates.email.replace('{botLink}', botLink || '[LIEN_BOT]') }))}
                  >
                    Modèle Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions et contacts */}
          <div className="space-y-6">
            {/* Actions de partage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions de Partage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={openSocialSharing}
                  className="w-full flex items-center justify-center space-x-2"
                  disabled={!botLink}
                >
                  <Share2 className="w-4 h-4" />
                  <span>Partager sur les Réseaux</span>
                </Button>
                
                <div className="text-xs text-gray-500 text-center">
                  Facebook, Instagram, TikTok, Messenger
                </div>
              </CardContent>
            </Card>

            {/* Contacts Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Mail className="w-4 h-4 mr-2" />
                  Contacts Email ({campaign.targetEmails.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex space-x-2">
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                  />
                  <Button onClick={addEmail} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {campaign.targetEmails.map(email => (
                    <div key={email} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span className="truncate">{email}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeEmail(email)}>
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contacts Téléphone */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Contacts Téléphone ({campaign.targetPhones.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex space-x-2">
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+33123456789"
                    onKeyPress={(e) => e.key === 'Enter' && addPhone()}
                  />
                  <Button onClick={addPhone} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {campaign.targetPhones.map(phone => (
                    <div key={phone} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span>{phone}</span>
                      <Button variant="ghost" size="sm" onClick={() => removePhone(phone)}>
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lancer la campagne */}
            <Card>
              <CardContent className="p-4">
                <Button 
                  onClick={launchCampaign}
                  className="w-full"
                  size="lg"
                  disabled={!campaign.name || !campaign.selectedBot || !campaign.message}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Lancer la Qualification
                </Button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  La campagne sera lancée immédiatement
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal de partage social */}
        <SocialSharingModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          botLink={botLink}
          message={campaign.message}
        />
      </div>
    </div>
  );
};