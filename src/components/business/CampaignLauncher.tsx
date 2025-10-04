import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Phone, Send, Sparkles, Calendar } from 'lucide-react';

interface CampaignLauncherProps {
  database: {
    id: string;
    name: string;
    data: any[];
    total_records: number;
  };
  campaignType: 'whatsapp' | 'email';
  onComplete: () => void;
}

export const CampaignLauncher: React.FC<CampaignLauncherProps> = ({
  database,
  campaignType,
  onComplete
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [validContacts, setValidContacts] = useState<any[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    // Analyser les champs disponibles
    if (database.data.length > 0) {
      const fields = Object.keys(database.data[0]);
      setAvailableFields(fields);

      // Sélectionner automatiquement le champ approprié
      if (campaignType === 'email') {
        const emailField = fields.find(f => 
          f.toLowerCase().includes('email') || 
          database.data[0][f]?.includes?.('@')
        );
        if (emailField) setSelectedField(emailField);
      } else {
        const phoneField = fields.find(f => 
          f.toLowerCase().includes('phone') || 
          f.toLowerCase().includes('tel') ||
          /[\d+\-\(\)\s]{8,}/.test(String(database.data[0][f]))
        );
        if (phoneField) setSelectedField(phoneField);
      }
    }
  }, [database, campaignType]);

  useEffect(() => {
    // Filtrer les contacts valides
    if (selectedField) {
      const valid = database.data.filter(row => {
        const value = row[selectedField];
        if (!value) return false;
        
        if (campaignType === 'email') {
          return typeof value === 'string' && value.includes('@') && value.includes('.');
        } else {
          return typeof value === 'string' && /[\d+]{8,}/.test(value.replace(/[\s\-\(\)]/g, ''));
        }
      });
      setValidContacts(valid);
    }
  }, [selectedField, database, campaignType]);

  const generateAIMessage = () => {
    // Simulation de génération IA
    const templates = campaignType === 'email' 
      ? [
          `Bonjour,\n\nNous avons le plaisir de vous présenter notre nouvelle offre exclusive.\n\nDécouvrez comment nous pouvons vous aider à atteindre vos objectifs.\n\nCordialement,\nL'équipe`,
          `Cher(e) prospect,\n\nJ'espère que ce message vous trouve bien.\n\nJe souhaitais vous présenter une opportunité qui pourrait vous intéresser.\n\nSeriez-vous disponible pour un échange rapide ?\n\nBien à vous`
        ]
      : [
          `Bonjour ! 👋\n\nNous avons une offre spéciale pour vous.\n\nIntéressé(e) ? Répondez OUI pour en savoir plus !`,
          `Salut ! 🎉\n\nDécouvrez notre nouvelle solution qui pourrait transformer votre activité.\n\nQue diriez-vous d'un appel rapide ?`
        ];
    
    setMessage(templates[Math.floor(Math.random() * templates.length)]);
    
    toast({
      title: "Message généré",
      description: "Message créé par IA. Personnalisez-le selon vos besoins."
    });
  };

  const handleLaunch = async () => {
    if (!campaignName || !message || !selectedField || validContacts.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs et sélectionner un champ de contact valide",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Créer la campagne dans la base de données
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const { data: campaign, error } = await supabase
        .from('social_sharing_campaigns')
        .insert({
          campaign_name: campaignName,
          user_id: userId,
          campaign_description: `Campagne ${campaignType} générée depuis l'import intelligent`,
          bot_id: '', // Pas de bot associé pour l'instant
          platforms: JSON.stringify([campaignType === 'email' ? 'email' : 'whatsapp']),
          target_audience: JSON.stringify({
            database_id: database.id,
            field: selectedField,
            total: validContacts.length
          }),
          content_variations: JSON.stringify([{
            platform: campaignType,
            content: message,
            predicted_performance: 0.8
          }]),
          is_active: !scheduledDate,
          scheduled_start: scheduledDate || null,
          ai_settings: JSON.stringify({
            source: 'intelligent_import',
            contacts_count: validContacts.length
          })
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Campagne créée !",
        description: `${validContacts.length} contacts seront contactés ${scheduledDate ? 'à la date prévue' : 'immédiatement'}`,
      });

      onComplete();
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la campagne: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {campaignType === 'email' ? <Mail className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            Statistiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{database.total_records}</p>
              <p className="text-xs text-muted-foreground">Total prospects</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{validContacts.length}</p>
              <p className="text-xs text-muted-foreground">Contacts valides</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {database.total_records - validContacts.length}
              </p>
              <p className="text-xs text-muted-foreground">Invalides</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="campaignName">Nom de la campagne *</Label>
          <Input
            id="campaignName"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Ex: Campagne Prospects Mars 2025"
          />
        </div>

        <div>
          <Label htmlFor="contactField">Champ de contact *</Label>
          <Select value={selectedField} onValueChange={setSelectedField}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le champ" />
            </SelectTrigger>
            <SelectContent>
              {availableFields.map(field => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedField && (
            <p className="text-xs text-muted-foreground mt-1">
              {validContacts.length} contacts valides trouvés dans ce champ
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="message">Message de la campagne *</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={generateAIMessage}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Générer avec IA
            </Button>
          </div>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              campaignType === 'email'
                ? "Bonjour,\n\nVotre message personnalisé ici...\n\nCordialement,"
                : "Bonjour ! 👋\n\nVotre message WhatsApp ici..."
            }
            rows={8}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {message.length} caractères
          </p>
        </div>

        <div>
          <Label htmlFor="scheduledDate">Date d'envoi (optionnel)</Label>
          <Input
            id="scheduledDate"
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Laissez vide pour envoyer immédiatement
          </p>
        </div>
      </div>

      {/* Aperçu */}
      {message && validContacts.length > 0 && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Aperçu du message</CardTitle>
            <CardDescription>
              Exemple pour: {validContacts[0][selectedField]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg ${
              campaignType === 'email' 
                ? 'bg-blue-50 dark:bg-blue-950' 
                : 'bg-green-50 dark:bg-green-950'
            }`}>
              <pre className="whitespace-pre-wrap font-sans text-sm">{message}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          onClick={handleLaunch}
          disabled={loading || validContacts.length === 0}
          className="min-w-[200px]"
        >
          {loading ? (
            <>Création en cours...</>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Lancer la campagne
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
