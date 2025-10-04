import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Repeat, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Campaign {
  id: string;
  name: string;
  trackingParameters?: any;
}

interface CampaignSchedulerProps {
  campaign: Campaign;
  onUpdate: () => void;
}

export const CampaignScheduler: React.FC<CampaignSchedulerProps> = ({ 
  campaign,
  onUpdate 
}) => {
  const { toast } = useToast();
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [timezone, setTimezone] = useState('Africa/Porto-Novo');

  const handleSaveSchedule = () => {
    if (!scheduleDate || !scheduleTime) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date et une heure",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Programmation enregistrée",
      description: `La campagne sera envoyée le ${scheduleDate} à ${scheduleTime}`,
    });
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Programmez l'envoi de votre campagne pour optimiser le taux d'engagement. 
          Les emails programmés peuvent être annulés jusqu'à 1h avant l'envoi.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Planifier l'envoi</h3>
        
        <div className="space-y-6">
          {/* Date et heure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date d'envoi
              </Label>
              <Input
                id="date"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Heure d'envoi
              </Label>
              <Input
                id="time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>

          {/* Fuseau horaire */}
          <div className="space-y-2">
            <Label>Fuseau horaire</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Porto-Novo">Afrique/Porto-Novo (GMT+1)</SelectItem>
                <SelectItem value="Europe/Paris">Europe/Paris (GMT+1)</SelectItem>
                <SelectItem value="America/New_York">Amérique/New York (GMT-5)</SelectItem>
                <SelectItem value="Asia/Tokyo">Asie/Tokyo (GMT+9)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fréquence */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Fréquence d'envoi
            </Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Une seule fois</SelectItem>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
              </SelectContent>
            </Select>
            {frequency !== 'once' && (
              <p className="text-sm text-gray-500">
                La campagne sera automatiquement relancée selon la fréquence choisie
              </p>
            )}
          </div>

          {/* Résumé de la programmation */}
          {scheduleDate && scheduleTime && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Résumé de la programmation</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p>📅 Date: {new Date(scheduleDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p>🕐 Heure: {scheduleTime}</p>
                <p>🌍 Fuseau: {timezone}</p>
                <p>🔄 Fréquence: {frequency === 'once' ? 'Envoi unique' : `Envoi ${frequency === 'daily' ? 'quotidien' : frequency === 'weekly' ? 'hebdomadaire' : 'mensuel'}`}</p>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setScheduleDate('');
                setScheduleTime('');
                setFrequency('once');
              }}
            >
              Réinitialiser
            </Button>
            <Button 
              onClick={handleSaveSchedule}
              className="flex-1"
              disabled={!scheduleDate || !scheduleTime}
            >
              <Save className="w-4 h-4 mr-2" />
              Enregistrer la programmation
            </Button>
          </div>
        </div>
      </Card>

      {/* Meilleurs moments pour envoyer */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
        <h4 className="font-semibold text-green-900 mb-3">⏰ Meilleurs moments pour envoyer</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/70 p-4 rounded-lg">
            <div className="font-medium text-green-900 mb-2">🌅 Matin (9h-11h)</div>
            <p className="text-sm text-green-800">Taux d'ouverture élevé, les gens consultent leurs emails au début de journée</p>
          </div>
          <div className="bg-white/70 p-4 rounded-lg">
            <div className="font-medium text-green-900 mb-2">🌞 Midi (12h-14h)</div>
            <p className="text-sm text-green-800">Bon engagement pendant la pause déjeuner</p>
          </div>
          <div className="bg-white/70 p-4 rounded-lg">
            <div className="font-medium text-green-900 mb-2">🌆 Soir (17h-19h)</div>
            <p className="text-sm text-green-800">Engagement modéré, consultation en fin de journée</p>
          </div>
        </div>
      </Card>
    </div>
  );
};