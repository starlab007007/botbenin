import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppAccounts } from '@/hooks/useWhatsAppAccounts';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { 
  MessageCircle,
  Smartphone,
  Webhook,
  Code2,
  Users,
  Play,
  Square,
  QrCode,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Settings,
  Monitor,
  Bot,
  MessageSquare,
  Clock,
  Zap
} from 'lucide-react';

interface StepProps {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  isActive?: boolean;
  isCompleted?: boolean;
  onClick?: () => void;
}

const StepCard: React.FC<StepProps> = ({ 
  number, 
  title, 
  description, 
  icon, 
  isActive = false, 
  isCompleted = false,
  onClick 
}) => (
  <Card 
    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
      isActive ? 'ring-2 ring-primary border-primary' : 
      isCompleted ? 'border-green-200 bg-green-50/50' : ''
    }`}
    onClick={onClick}
  >
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${
            isCompleted ? 'bg-green-100 text-green-600' :
            isActive ? 'bg-primary/10 text-primary' : 
            'bg-gray-100 text-gray-400'
          }`}>
            {isCompleted ? <CheckCircle className="w-5 h-5" /> : icon}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          isCompleted ? 'bg-green-500 text-white' :
          isActive ? 'bg-primary text-white' : 
          'bg-gray-200 text-gray-500'
        }`}>
          {isCompleted ? '✓' : number}
        </div>
      </div>
    </CardHeader>
  </Card>
);

const WhatsAppConnectPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedBot, setSelectedBot] = useState<string>('');
  const [newSessionName, setNewSessionName] = useState('');
  const [qrCode, setQrCode] = useState<string>('');
  const [welcomeMessage, setWelcomeMessage] = useState('Bonjour! Je suis votre assistant IA. Comment puis-je vous aider?');
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(true);
  const [responseDelay, setResponseDelay] = useState(2);

  const { 
    accounts, 
    bots, 
    botLinks, 
    loading, 
    createSession, 
    startSession, 
    getQRCode, 
    stopSession, 
    deleteSession,
    linkBot,
    unlinkBot,
    updateBotLink,
    sendMessage 
  } = useWhatsAppAccounts();

  // Utiliser le hook pour les messages WhatsApp
  const { messages, contacts, getMessageStats } = useWhatsAppMessages(selectedAccount);

  const { toast } = useToast();

  // Calculer les étapes completées
  const completedSteps = () => {
    const steps = [
      accounts.some(a => a.status === 'connected'), // Étape 1: WhatsApp connecté
      botLinks.some(bl => bl.is_active), // Étape 2: Bot lié
      botLinks.some(bl => bl.auto_response_enabled), // Étape 3: Auto-réponse configurée
      false // Étape 4: Widget intégré (à implémenter plus tard)
    ];
    return steps;
  };

  const steps = [
    {
      number: 1,
      title: "Connecter WhatsApp",
      description: "Liez votre numéro WhatsApp",
      icon: <Smartphone className="w-5 h-5" />
    },
    {
      number: 2,
      title: "Lier un Bot",
      description: "Associez un bot IA à votre WhatsApp",
      icon: <Bot className="w-5 h-5" />
    },
    {
      number: 3,
      title: "Configuration",
      description: "Paramétrez les réponses automatiques",
      icon: <Settings className="w-5 h-5" />
    },
    {
      number: 4,
      title: "Surveillance",
      description: "Monitorer vos conversations",
      icon: <Monitor className="w-5 h-5" />
    }
  ];

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom de session",
        variant: "destructive",
      });
      return;
    }

    try {
      await createSession(newSessionName.trim());
      setNewSessionName('');
      setCurrentStep(1);
    } catch (error: any) {
      console.error('Error creating session:', error);
    }
  };

  const handleStartConnection = async (accountId: string) => {
    setSelectedAccount(accountId);
    setShowWarningModal(true);
  };

  const proceedWithConnection = async () => {
    setShowWarningModal(false);
    setShowConnectionModal(true);
    
    const account = accounts.find(a => a.id === selectedAccount);
    if (account) {
      try {
        await startSession(account.session_name);
        // Attendre et récupérer le QR code
        setTimeout(async () => {
          const qrCodeData = await getQRCode(account.session_name);
          if (qrCodeData) {
            setQrCode(qrCodeData);
          }
        }, 2000);
      } catch (error) {
        console.error('Error starting session:', error);
      }
    }
  };

  const handleLinkBot = async () => {
    if (!selectedAccount || !selectedBot) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un compte et un bot",
        variant: "destructive",
      });
      return;
    }

    try {
      await linkBot(selectedAccount, selectedBot, welcomeMessage);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error linking bot:', error);
    }
  };

  const connectedAccounts = accounts.filter(a => a.status === 'connected');
  const activeLinks = botLinks.filter(bl => bl.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* En-tête */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <MessageCircle className="w-10 h-10 text-green-500" />
          <h1 className="text-4xl font-bold">WhatsApp Automation</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Connectez et automatisez vos conversations WhatsApp avec l'IA
        </p>
      </div>

      {/* Étapes du processus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {steps.map((step, index) => (
          <StepCard
            key={step.number}
            {...step}
            isActive={currentStep === step.number}
            isCompleted={completedSteps()[index]}
            onClick={() => setCurrentStep(step.number)}
          />
        ))}
      </div>

      {/* Contenu principal selon l'étape */}
      <div className="space-y-6">
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Étape 1: Connecter votre numéro WhatsApp
                </CardTitle>
                <CardDescription>
                  Sélectionnez une session et scannez le code QR avec votre WhatsApp pour établir la connexion
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Création de session */}
            <Card>
              <CardHeader>
                <CardTitle>Créer une nouvelle session WhatsApp</CardTitle>
                <CardDescription>
                  Ajoutez un nouveau compte WhatsApp à automatiser
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="sessionName">Nom de la session</Label>
                    <Input
                      id="sessionName"
                      placeholder="ex: MonWhatsAppBusiness"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleCreateSession} className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Créer Session
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liste des sessions */}
            {accounts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Choisir une session non connectée</CardTitle>
                  <CardDescription>
                    Sélectionnez une session ci-dessous pour la connecter à votre WhatsApp Business
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          <div>
                            <h4 className="font-medium">{account.session_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {account.phone_number || 'Non connecté'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={account.status === 'connected' ? 'default' : 'secondary'}
                            className={account.status === 'connected' ? 'bg-green-500' : ''}
                          >
                            {account.status === 'connected' ? 'Connecté' : 'Déconnecté'}
                          </Badge>
                          {account.status !== 'connected' ? (
                            <Button 
                              size="sm"
                              onClick={() => handleStartConnection(account.id)}
                              className="bg-blue-500 hover:bg-blue-600"
                            >
                              Scanner QR Code
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    await stopSession(account.session_name);
                                    toast({
                                      title: "Session arrêtée",
                                      description: "WhatsApp a été déconnecté",
                                    });
                                  } catch (error) {
                                    console.error('Error stopping session:', error);
                                  }
                                }}
                              >
                                <Square className="w-3 h-3 mr-1" />
                                Arrêter
                              </Button>
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (confirm('Êtes-vous sûr de vouloir supprimer cette session?')) {
                                    try {
                                      await deleteSession(account.session_name);
                                      toast({
                                        title: "Session supprimée",
                                        description: "La session a été supprimée avec succès",
                                      });
                                    } catch (error) {
                                      console.error('Error deleting session:', error);
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Supprimer
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {connectedAccounts.length > 0 && (
              <div className="text-center">
                <Button 
                  onClick={() => setCurrentStep(2)}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-2"
                >
                  Continuer vers l'étape 2 →
                </Button>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Étape 2: Lier un Bot IA
                </CardTitle>
                <CardDescription>
                  Associez un bot IA à votre compte WhatsApp pour les réponses automatiques
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="whatsapp-account">Compte WhatsApp</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un compte connecté" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectedAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.session_name} - {account.phone_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="bot">Bot IA</Label>
                    <Select value={selectedBot} onValueChange={setSelectedBot}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un bot" />
                      </SelectTrigger>
                      <SelectContent>
                        {bots.map((bot) => (
                          <SelectItem key={bot.id} value={bot.id}>
                            {bot.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="welcome-message">Message de bienvenue</Label>
                  <Textarea
                    id="welcome-message"
                    placeholder="Message qui sera envoyé automatiquement..."
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button onClick={handleLinkBot} className="w-full">
                  <Bot className="w-4 h-4 mr-2" />
                  Lier le Bot
                </Button>
              </CardContent>
            </Card>

            {/* Bots liés existants */}
            {activeLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Bots Liés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activeLinks.map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium">{link.bots.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Auto-réponse: {link.auto_response_enabled ? 'Activée' : 'Désactivée'}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Actif</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <Button onClick={() => setCurrentStep(3)}>
                      Continuer vers la configuration →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Étape 3: Configuration des Réponses Automatiques
                </CardTitle>
                <CardDescription>
                  Personnalisez le comportement de vos bots WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {activeLinks.map((link) => (
                  <div key={link.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{link.bots.name}</h4>
                      <Badge className="bg-green-100 text-green-800">
                        {link.auto_response_enabled ? 'Auto-réponse Active' : 'Manuelle'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Réponses automatiques</Label>
                        <Switch 
                          checked={link.auto_response_enabled}
                          onCheckedChange={async (checked) => {
                            try {
                              await updateBotLink(link.id, {
                                auto_response_enabled: checked,
                                response_delay_seconds: responseDelay
                              });
                              toast({
                                title: "Mis à jour",
                                description: `Auto-réponse ${checked ? 'activée' : 'désactivée'}`,
                              });
                            } catch (error) {
                              console.error('Error updating bot link:', error);
                              toast({
                                title: "Erreur",
                                description: "Impossible de mettre à jour la configuration",
                                variant: "destructive",
                              });
                            }
                          }}
                        />
                      </div>
                      
                      <div>
                        <Label>Délai de réponse (secondes)</Label>
                        <Input 
                          type="number" 
                          value={link.response_delay_seconds || responseDelay}
                          onChange={async (e) => {
                            const newDelay = Number(e.target.value);
                            setResponseDelay(newDelay);
                            try {
                              await updateBotLink(link.id, {
                                response_delay_seconds: newDelay
                              });
                            } catch (error) {
                              console.error('Error updating delay:', error);
                            }
                          }}
                          min="1"
                          max="30"
                        />
                      </div>

                      <div>
                        <Label>Message de bienvenue</Label>
                        <Textarea 
                          value={link.welcome_message}
                          onChange={async (e) => {
                            const newMessage = e.target.value;
                            setWelcomeMessage(newMessage);
                            try {
                              await updateBotLink(link.id, {
                                welcome_message: newMessage
                              });
                            } catch (error) {
                              console.error('Error updating welcome message:', error);
                            }
                          }}
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            try {
                              await unlinkBot(link.id);
                              toast({
                                title: "Bot déconnecté",
                                description: "Le bot a été déconnecté avec succès",
                              });
                            } catch (error) {
                              console.error('Error unlinking bot:', error);
                              toast({
                                title: "Erreur",
                                description: "Impossible de déconnecter le bot",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Déconnecter
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="text-center">
                  <Button onClick={() => setCurrentStep(4)} className="bg-green-500 hover:bg-green-600">
                    Configuration terminée →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Étape 4: Surveillance et Monitoring
                </CardTitle>
                <CardDescription>
                  Supervisez vos conversations et l'activité de vos bots
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Messages Aujourd'hui
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{messages.length}</div>
                      <p className="text-xs text-muted-foreground">
                        messages reçus
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Contacts Actifs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{contacts.length}</div>
                      <p className="text-xs text-muted-foreground">
                        conversations uniques
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Réponses Auto
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {botLinks.filter(bl => bl.auto_response_enabled).length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        bots configurés
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Statistiques détaillées */}
                {selectedAccount && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-base">Statistiques Détaillées</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Messages entrants</p>
                          <p className="font-semibold">{getMessageStats().incomingMessages}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Messages sortants</p>
                          <p className="font-semibold">{getMessageStats().outgoingMessages}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Réponses bot</p>
                          <p className="font-semibold">{getMessageStats().botResponses}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Contacts uniques</p>
                          <p className="font-semibold">{getMessageStats().uniqueContacts}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions de gestion */}
                <div className="mt-6 flex gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Rafraîchir les données
                      window.location.reload();
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                  </Button>
                  
                  {connectedAccounts.length > 0 && (
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        const account = connectedAccounts[0];
                        try {
                          await stopSession(account.session_name);
                          toast({
                            title: "Session arrêtée",
                            description: "La session WhatsApp a été déconnectée",
                          });
                        } catch (error) {
                          console.error('Error stopping session:', error);
                          toast({
                            title: "Erreur",
                            description: "Impossible d'arrêter la session",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Arrêter Session
                    </Button>
                  )}
                </div>

                <div className="mt-6">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      🎉 Félicitations! Votre WhatsApp Automation est maintenant configuré et prêt à fonctionner. 
                      Vos bots vont automatiquement répondre aux messages reçus selon vos paramètres.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal d'avertissement */}
      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="w-6 h-6 text-green-500" />
              <DialogTitle>Connecter WhatsApp Agent</DialogTitle>
            </div>
            <DialogDescription className="text-center">
              Vous êtes sur le point de connecter votre compte WhatsApp.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important: À lire avant de continuer</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className="text-orange-500">•</span>
                <div>
                  <strong>Contrôle IA Complet:</strong> Une fois connecté, l'agent IA répondra automatiquement à TOUS les messages reçus sur ce numéro WhatsApp.
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-orange-500">•</span>
                <div>
                  <strong>24/7 Actif:</strong> L'agent sera actif jusqu'à ce que vous désactiviez manuellement la campagne ou vous déconnectiez.
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-orange-500">•</span>
                <div>
                  <strong>Utilisez un Numéro Dédié:</strong> Nous recommandons d'utiliser un compte WhatsApp Business ou un numéro dédié à cet usage.
                </div>
              </div>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                <strong>Vous gardez le contrôle</strong><br />
                Vous pouvez toujours mettre en pause, modifier, ou complètement déconnecter votre agent à tout moment depuis le tableau de bord.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowWarningModal(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={proceedWithConnection}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                J'ai compris, Continuer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de connexion avec QR */}
      <Dialog open={showConnectionModal} onOpenChange={setShowConnectionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="w-6 h-6 text-green-500" />
              <DialogTitle>Connecter WhatsApp Agent</DialogTitle>
            </div>
            <DialogDescription className="text-center">
              Scannez le code QR avec votre WhatsApp pour compléter la connexion
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <div className="p-2 border-2 border-dashed border-gray-300 rounded-lg">
              {qrCode ? (
                <img src={qrCode} alt="QR Code WhatsApp" className="mx-auto max-w-full" />
              ) : (
                <div className="py-20">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Génération du QR code...</p>
                </div>
              )}
            </div>

            <div className="text-sm space-y-2">
              <p className="font-medium">Étapes pour se connecter:</p>
              <ol className="text-left space-y-1 text-xs">
                <li>1. Ouvrez WhatsApp Business sur votre téléphone</li>
                <li>2. Appuyez sur Menu (⋮) → Appareils liés</li>
                <li>3. Appuyez sur "Lier un appareil"</li>
                <li>4. Scannez ce code QR</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={async () => {
                  const account = accounts.find(a => a.id === selectedAccount);
                  if (account) {
                    try {
                      setQrCode('');
                      const newQrCode = await getQRCode(account.session_name);
                      if (newQrCode) {
                        setQrCode(newQrCode);
                      }
                    } catch (error) {
                      console.error('Error refreshing QR code:', error);
                      toast({
                        title: "Erreur",
                        description: "Impossible de rafraîchir le QR code",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser QR
              </Button>
              <Button variant="outline" onClick={() => setShowConnectionModal(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppConnectPage;