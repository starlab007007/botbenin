
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, RefreshCw, MessageCircle } from 'lucide-react';

interface NoBotAvailableProps {
  onRefresh: () => void;
  isLoading: boolean;
}

export const NoBotAvailable: React.FC<NoBotAvailableProps> = ({ onRefresh, isLoading }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-white border border-gray-200 text-center p-8">
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <Bot className="w-10 h-10 text-gray-400" />
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucun assistant disponible
            </h3>
            <p className="text-gray-600 mb-4">
              Aucun chatbot n'est actuellement configuré pour le chat en direct. 
              Les propriétaires de bots peuvent activer cette fonctionnalité dans leurs paramètres.
            </p>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={onRefresh}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Actualisation...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualiser la liste
                </>
              )}
            </Button>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Vous êtes propriétaire d'un bot ?</h4>
              <p className="text-sm text-gray-600 mb-3">
                Activez l'affichage dans le chat live depuis votre tableau de bord pour que votre bot apparaisse ici.
              </p>
              <Button variant="outline" size="sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                Accéder au tableau de bord
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
