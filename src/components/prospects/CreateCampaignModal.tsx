import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  Calendar,
  Target,
  Users,
  Settings,
  Send,
  Bot,
  UserCog,
  Edit,
  Check,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProspectDatabases } from '@/hooks/useProspectDatabases';
import { useProspects } from '@/hooks/useProspects';
import { supabase } from '@/integrations/supabase/client';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProspects?: string[];
  databaseId?: string;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ 
  isOpen, 
  onClose, 
  selectedProspects,
  databaseId 
}) => {
  const [campaignType, setCampaignType] = useState<'email' | 'phone' | 'sms'>('email');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedDatabase, setSelectedDatabase] = useState(databaseId || '');
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduleDate, setScheduleDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [executionMode, setExecutionMode] = useState<'manual' | 'ai'>('manual');
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [availableBots, setAvailableBots] = useState<any[]>([]);
  const [prospectsData, setProspectsData] = useState<any[]>([]);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [contactUpdates, setContactUpdates] = useState<Record<string, { email?: string; phone?: string }>>({});
  
  const { toast } = useToast();
  const { databases } = useProspectDatabases();
  const { prospects, fetchProspects } = useProspects({ databaseId: selectedDatabase });

  // Charger les bots disponibles
  useEffect(() => {
    const loadBots = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('bots')
          .select('id, name, description')
          .eq('is_active', true)
          .order('name');

        if (!error && data) {
          setAvailableBots(data);
        }
      } catch (error) {
        console.error('Error loading bots:', error);
      }
    };

    if (isOpen && executionMode === 'ai') {
      loadBots();
    }
  }, [isOpen, executionMode]);

  // Charger les prospects de la base sélectionnée
  useEffect(() => {
    if (selectedDatabase && isOpen) {
      fetchProspects(true);
    }
  }, [selectedDatabase, isOpen]);

  useEffect(() => {
    setProspectsData(prospects);
  }, [prospects]);

  const campaignTypes = [
    {
      type: 'email' as const,
      icon: Mail,
      title: 'Campagne Email',
      description: 'Envoi d\'emails personnalisés',
      color: 'bg-blue-500'
    },
    {
      type: 'phone' as const,
      icon: Phone,
      title: 'Campagne Téléphonique',
      description: 'Séquence d\'appels programmés',
      color: 'bg-green-500'
    },
    {
      type: 'sms' as const,
      icon: MessageSquare,
      title: 'Campagne SMS',
      description: 'Messages texte automatisés',
      color: 'bg-purple-500'
    }
  ];

  const emailTemplates = [
    {
      id: 'introduction',
      name: 'Email d\'introduction',
      subject: 'Découvrez comment [COMPANY] peut transformer votre business',
      content: `Bonjour [FIRST_NAME],

J'espère que ce message vous trouve en bonne santé.

Je me permets de vous contacter car j'ai remarqué que [COMPANY] pourrait bénéficier de nos services...

Cordialement,
[SENDER_NAME]`
    },
    {
      id: 'follow_up',
      name: 'Email de relance',
      subject: 'Suivi de notre dernière conversation',
      content: `Bonjour [FIRST_NAME],

Suite à notre dernier échange, je souhaitais faire le point avec vous...

N'hésitez pas à me contacter pour discuter davantage.

Cordialement,
[SENDER_NAME]`
    }
  ];

  const handleUpdateContact = async (prospectId: string) => {
    const updates = contactUpdates[prospectId];
    if (!updates) return;

    try {
      const { error } = await supabase
        .from('prospects')
        .update(updates)
        .eq('id', prospectId);

      if (error) throw error;

      toast({
        title: "Contact mis à jour",
        description: "Les informations ont été enregistrées.",
      });

      setEditingContact(null);
      fetchProspects(true);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le contact.",
        variant: "destructive"
      });
    }
  };

  const getValidContacts = () => {
    return prospectsData.filter(p => {
      if (campaignType === 'email') {
        return p.email && p.email.trim() !== '';
      }
      if (campaignType === 'phone' || campaignType === 'sms') {
        return p.phone && p.phone.trim() !== '';
      }
      return false;
    });
  };

  const handleCreateCampaign = async () => {
    const validContacts = getValidContacts();
    
    if (!name || !message) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }

    if (validContacts.length === 0) {
      toast({
        title: "Aucun contact valide",
        description: `Aucun prospect n'a ${campaignType === 'email' ? "d'email" : 'de téléphone'} valide.`,
        variant: "destructive"
      });
      return;
    }

    if (executionMode === 'ai' && !selectedBotId) {
      toast({
        title: "Bot non sélectionné",
        description: "Veuillez sélectionner un bot pour la prise en main IA.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const campaignData = {
        user_id: user.id,
        name,
        type: campaignType,
        status: scheduleType === 'immediate' ? 'active' : 'scheduled',
        start_date: scheduleType === 'scheduled' ? scheduleDate : new Date().toISOString(),
        content: {
          subject: campaignType === 'email' ? subject : undefined,
          message,
          execution_mode: executionMode,
          bot_id: executionMode === 'ai' ? selectedBotId : undefined
        },
        segment: {
          database_id: selectedDatabase,
          prospect_count: validContacts.length,
          contact_type: campaignType
        }
      };

      const { error } = await supabase
        .from('campaigns')
        .insert(campaignData);

      if (error) throw error;

      toast({
        title: "Campagne créée",
        description: `Campagne "${name}" créée avec ${validContacts.length} contacts. ${executionMode === 'ai' ? 'Le bot prendra en charge l\'exécution.' : 'Mode manuel activé.'}`,
      });

      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la campagne.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSubject('');
    setMessage('');
    setSelectedDatabase('');
    setExecutionMode('manual');
    setSelectedBotId('');
    setContactUpdates({});
    setEditingContact(null);
  };

  const getTargetDescription = () => {
    if (selectedProspects && selectedProspects.length > 0) {
      return `${selectedProspects.length} prospect(s) sélectionné(s)`;
    }
    if (selectedDatabase) {
      const db = databases.find(d => d.id === selectedDatabase);
      return `Base: ${db?.name} (${db?.prospect_count || 0} prospects)`;
    }
    return "Aucune cible sélectionnée";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Créer une Campagne
          </DialogTitle>
          <DialogDescription>
            Configurez votre campagne de prospection
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="type" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="type">Type</TabsTrigger>
            <TabsTrigger value="target">Cible</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="schedule">Planification</TabsTrigger>
          </TabsList>

          <TabsContent value="type" className="space-y-6">
            <div>
              <Label className="text-base font-medium">Type de campagne</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                {campaignTypes.map((type) => (
                  <Card 
                    key={type.type}
                    className={`cursor-pointer transition-all ${campaignType === type.type ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setCampaignType(type.type)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className={`w-12 h-12 rounded-lg ${type.color} text-white flex items-center justify-center mx-auto mb-3`}>
                        <type.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-medium mb-1">{type.title}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="campaignName">Nom de la campagne *</Label>
              <Input
                id="campaignName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Campagne Acquisition Q4"
                className="mt-1"
              />
            </div>
          </TabsContent>

          <TabsContent value="target" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Audience cible
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="database">Base de données</Label>
                  <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionnez une base de données" />
                    </SelectTrigger>
                    <SelectContent>
                      {databases.map((db) => (
                        <SelectItem key={db.id} value={db.id}>
                          {db.name} ({db.prospect_count || 0} prospects)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDatabase && prospectsData.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Contacts disponibles ({getValidContacts().length} valides)</Label>
                      <Badge variant={getValidContacts().length === 0 ? 'destructive' : 'default'}>
                        {campaignType === 'email' ? 'Avec email' : 'Avec téléphone'}
                      </Badge>
                    </div>
                    
                    <ScrollArea className="h-64 border rounded-lg p-3">
                      <div className="space-y-2">
                        {prospectsData.map((prospect) => {
                          const hasValidContact = campaignType === 'email' 
                            ? prospect.email && prospect.email.trim() !== ''
                            : prospect.phone && prospect.phone.trim() !== '';
                          
                          const isEditing = editingContact === prospect.id;
                          
                          return (
                            <div 
                              key={prospect.id} 
                              className={`p-3 border rounded-lg ${!hasValidContact ? 'bg-muted/50 border-destructive/20' : ''}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium flex items-center gap-2">
                                    {prospect.first_name} {prospect.last_name}
                                    {!hasValidContact && (
                                      <AlertCircle className="w-4 h-4 text-destructive" />
                                    )}
                                  </div>
                                  
                                  {campaignType === 'email' && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Mail className="w-3 h-3 text-muted-foreground" />
                                      {isEditing ? (
                                        <div className="flex items-center gap-2">
                                          <Input
                                            type="email"
                                            value={contactUpdates[prospect.id]?.email ?? prospect.email ?? ''}
                                            onChange={(e) => setContactUpdates(prev => ({
                                              ...prev,
                                              [prospect.id]: { ...prev[prospect.id], email: e.target.value }
                                            }))}
                                            className="h-7 text-xs"
                                            placeholder="email@example.com"
                                          />
                                          <Button 
                                            size="sm" 
                                            variant="ghost"
                                            onClick={() => handleUpdateContact(prospect.id)}
                                          >
                                            <Check className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">
                                          {prospect.email || 'Non renseigné'}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {(campaignType === 'phone' || campaignType === 'sms') && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Phone className="w-3 h-3 text-muted-foreground" />
                                      {isEditing ? (
                                        <div className="flex items-center gap-2">
                                          <Input
                                            type="tel"
                                            value={contactUpdates[prospect.id]?.phone ?? prospect.phone ?? ''}
                                            onChange={(e) => setContactUpdates(prev => ({
                                              ...prev,
                                              [prospect.id]: { ...prev[prospect.id], phone: e.target.value }
                                            }))}
                                            className="h-7 text-xs"
                                            placeholder="+33 6 12 34 56 78"
                                          />
                                          <Button 
                                            size="sm" 
                                            variant="ghost"
                                            onClick={() => handleUpdateContact(prospect.id)}
                                          >
                                            <Check className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">
                                          {prospect.phone || 'Non renseigné'}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {!isEditing && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingContact(prospect.id);
                                      setContactUpdates(prev => ({
                                        ...prev,
                                        [prospect.id]: {
                                          email: prospect.email || '',
                                          phone: prospect.phone || ''
                                        }
                                      }));
                                    }}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            {campaignType === 'email' && (
              <>
                <div>
                  <Label className="text-base font-medium">Modèles disponibles</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {emailTemplates.map((template) => (
                      <Card 
                        key={template.id}
                        className="cursor-pointer hover:shadow-md transition-all"
                        onClick={() => {
                          setSubject(template.subject);
                          setMessage(template.content);
                        }}
                      >
                        <CardContent className="p-4">
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.subject}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Objet de l'email *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Objet de votre email"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="message">
                Message {campaignType === 'email' ? 'email' : campaignType === 'sms' ? 'SMS' : 'script d\'appel'} *
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Rédigez votre ${campaignType === 'email' ? 'email' : campaignType === 'sms' ? 'message SMS' : 'script d\'appel'}...`}
                className="mt-1 min-h-[200px]"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Variables disponibles: [FIRST_NAME], [LAST_NAME], [COMPANY], [POSITION]
              </div>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Aperçu</h4>
                <div className="text-sm">
                  {campaignType === 'email' && subject && (
                    <div className="mb-2">
                      <strong>Objet:</strong> {subject.replace('[FIRST_NAME]', 'Jean').replace('[COMPANY]', 'Entreprise ABC')}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-muted-foreground">
                    {message.replace('[FIRST_NAME]', 'Jean').replace('[LAST_NAME]', 'Dupont').replace('[COMPANY]', 'Entreprise ABC').replace('[POSITION]', 'Directeur')}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <div>
              <Label className="text-base font-medium">Planification</Label>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <Card 
                  className={`cursor-pointer transition-all ${scheduleType === 'immediate' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setScheduleType('immediate')}
                >
                  <CardContent className="p-4 text-center">
                    <Send className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-medium">Envoi immédiat</div>
                    <div className="text-sm text-muted-foreground">Démarrer maintenant</div>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all ${scheduleType === 'scheduled' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setScheduleType('scheduled')}
                >
                  <CardContent className="p-4 text-center">
                    <Calendar className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-medium">Planifier</div>
                    <div className="text-sm text-muted-foreground">Programmer l'envoi</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {scheduleType === 'scheduled' && (
              <div>
                <Label htmlFor="scheduleDate">Date et heure d'envoi</Label>
                <Input
                  id="scheduleDate"
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label className="text-base font-medium mb-3">Mode d'exécution</Label>
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${executionMode === 'manual' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setExecutionMode('manual')}
                >
                  <CardContent className="p-4 text-center">
                    <UserCog className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-medium">Manuel</div>
                    <div className="text-sm text-muted-foreground">Vous gérez l'envoi</div>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all ${executionMode === 'ai' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setExecutionMode('ai')}
                >
                  <CardContent className="p-4 text-center">
                    <Bot className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-medium">IA / Bot</div>
                    <div className="text-sm text-muted-foreground">Automatisé par bot</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {executionMode === 'ai' && (
              <div>
                <Label htmlFor="botSelect">Sélectionner un bot</Label>
                <Select value={selectedBotId} onValueChange={setSelectedBotId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choisir un bot" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBots.map((bot) => (
                      <SelectItem key={bot.id} value={bot.id}>
                        <div>
                          <div className="font-medium">{bot.name}</div>
                          {bot.description && (
                            <div className="text-xs text-muted-foreground">{bot.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Le bot sélectionné prendra en charge l'exécution de la campagne
                </p>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Résumé de la campagne</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge>{campaignType.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nom:</span>
                  <span>{name || 'Non défini'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contacts valides:</span>
                  <Badge variant={getValidContacts().length === 0 ? 'destructive' : 'default'}>
                    {getValidContacts().length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Planification:</span>
                  <span>{scheduleType === 'immediate' ? 'Immédiat' : 'Programmé'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exécution:</span>
                  <Badge variant="outline">
                    {executionMode === 'ai' ? 'Automatique (Bot)' : 'Manuel'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleCreateCampaign}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Création...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Créer la campagne
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};