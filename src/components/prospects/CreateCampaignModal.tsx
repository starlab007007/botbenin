import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  Calendar,
  Target,
  Users,
  Settings,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProspectDatabases } from '@/hooks/useProspectDatabases';

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
  
  const { toast } = useToast();
  const { databases } = useProspectDatabases();

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

  const handleCreateCampaign = async () => {
    if (!name || !message || (!selectedDatabase && !selectedProspects)) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    // Simuler la création de campagne
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "Campagne créée",
      description: `La campagne "${name}" a été créée avec succès.`,
    });
    
    setIsCreating(false);
    onClose();
    
    // Reset form
    setName('');
    setSubject('');
    setMessage('');
    setSelectedDatabase('');
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
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  {getTargetDescription()}
                </div>
                
                {!selectedProspects && (
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
                  <span className="text-muted-foreground">Cible:</span>
                  <span>{getTargetDescription()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Planification:</span>
                  <span>{scheduleType === 'immediate' ? 'Immédiat' : 'Programmé'}</span>
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