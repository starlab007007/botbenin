import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Play, 
  Pause, 
  AlertCircle,
  CheckCircle2,
  Mail,
  Users,
  Clock,
  Zap
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Campaign {
  id: string;
  name: string;
  trackingParameters?: any;
  isActive: boolean;
}

interface CampaignSendManagerProps {
  campaign: Campaign;
  onUpdate: () => void;
}

export const CampaignSendManager: React.FC<CampaignSendManagerProps> = ({ 
  campaign,
  onUpdate 
}) => {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  const totalContacts = campaign.trackingParameters?.contactCount || 0;
  const sentCount = campaign.trackingParameters?.sentCount || 0;
  const pendingCount = totalContacts - sentCount;

  const handleSendCampaign = async () => {
    setIsSending(true);
    setSendProgress(0);

    // Simulation d'envoi progressif
    const interval = setInterval(() => {
      setSendProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSending(false);
          toast({
            title: "Envoi terminé",
            description: `${totalContacts} emails ont été envoyés avec succès`,
          });
          onUpdate();
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleTestSend = () => {
    toast({
      title: "Email de test envoyé",
      description: "Un email de test a été envoyé à votre adresse",
    });
  };

  return (
    <div className="space-y-6">
      {/* Alerte de statut */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Vérifiez attentivement les paramètres avant d'envoyer la campagne. 
          Les emails envoyés ne peuvent pas être rappelés.
        </AlertDescription>
      </Alert>

      {/* Résumé de la campagne */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">Contacts totaux</span>
          </div>
          <p className="text-3xl font-bold text-blue-900">{totalContacts}</p>
        </Card>

        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Déjà envoyés</span>
          </div>
          <p className="text-3xl font-bold text-green-900">{sentCount}</p>
        </Card>

        <Card className="p-6 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-orange-700 font-medium">En attente</span>
          </div>
          <p className="text-3xl font-bold text-orange-900">{pendingCount}</p>
        </Card>
      </div>

      {/* Options d'envoi */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Options d'envoi</h3>
        
        <div className="space-y-6">
          {/* Mode d'envoi */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Mode d'envoi</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="p-4 cursor-pointer border-2 border-blue-500 bg-blue-50">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <div className="font-medium text-blue-900">Envoi immédiat</div>
                    <div className="text-sm text-blue-700">
                      Envoyer tous les emails maintenant
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer border-2 border-gray-200 hover:border-gray-300">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-600 mt-1" />
                  <div>
                    <div className="font-medium text-gray-900">Envoi progressif</div>
                    <div className="text-sm text-gray-600">
                      Répartir l'envoi sur plusieurs heures
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Informations d'envoi */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Emails à envoyer:</span>
              <span className="font-medium">{pendingCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Temps estimé:</span>
              <span className="font-medium">{Math.ceil(pendingCount / 10)} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Coût estimé:</span>
              <span className="font-medium text-green-600">Gratuit</span>
            </div>
          </div>

          {/* Progression de l'envoi */}
          {isSending && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Envoi en cours...</span>
                <span className="font-medium">{sendProgress}%</span>
              </div>
              <Progress value={sendProgress} className="h-2" />
              <p className="text-xs text-gray-500">
                {Math.floor((sendProgress / 100) * pendingCount)} / {pendingCount} emails envoyés
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleTestSend} 
              variant="outline"
              className="flex-1"
              disabled={isSending}
            >
              <Mail className="w-4 h-4 mr-2" />
              Envoyer un test
            </Button>
            
            <Button 
              onClick={handleSendCampaign}
              disabled={isSending || pendingCount === 0}
              className="flex-1"
              size="lg"
            >
              {isSending ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Lancer l'envoi ({pendingCount} emails)
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Conseils d'envoi */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <h4 className="font-semibold text-purple-900 mb-3">💡 Conseils pour maximiser l'engagement</h4>
        <ul className="space-y-2 text-sm text-purple-800">
          <li className="flex items-start gap-2">
            <span className="text-purple-600">•</span>
            <span>Envoyez vos emails entre 9h et 11h pour un meilleur taux d'ouverture</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600">•</span>
            <span>Évitez les mots spam comme "gratuit", "promotion", "urgent" dans l'objet</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600">•</span>
            <span>Personnalisez chaque message avec le nom et l'entreprise du contact</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600">•</span>
            <span>Incluez toujours un appel à l'action clair et précis</span>
          </li>
        </ul>
      </Card>
    </div>
  );
};