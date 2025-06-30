
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bot, Shield, Phone, Video, MoreVertical, Clock } from 'lucide-react';

interface StandardizedChatHeaderProps {
  botName: string;
  botRole: string;
  isOnline?: boolean;
  waitTime?: number;
  onGoBack: () => void;
  showBackButton?: boolean;
}

export const StandardizedChatHeader: React.FC<StandardizedChatHeaderProps> = ({
  botName,
  botRole,
  isOnline = true,
  waitTime = 0,
  onGoBack,
  showBackButton = true
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {showBackButton && (
            <Button variant="ghost" size="sm" onClick={onGoBack} className="text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          )}
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-white">{botName}</h3>
              <Shield className="w-4 h-4 text-green-300" />
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-white/90">{botRole} • {isOnline ? 'En ligne' : 'Hors ligne'}</p>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Accès public
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-10 w-10 p-0">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-10 w-10 p-0">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-10 w-10 p-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {waitTime > 0 && (
        <div className="mt-2 flex items-center text-sm text-blue-100">
          <Clock className="w-4 h-4 mr-1" />
          Connexion en cours... {Math.floor(waitTime / 60)}:{(waitTime % 60).toString().padStart(2, '0')}
        </div>
      )}
    </div>
  );
};
