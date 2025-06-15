
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send } from 'lucide-react';

interface ContactInfo {
  user_id: string;
  user_name: string;
  user_email: string;
  session_count: number;
  message_count: number;
  first_interaction: string;
  last_interaction: string;
  status: 'active' | 'inactive';
}

interface ContactMessageFormProps {
  contact: ContactInfo;
  message: string;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onBack: () => void;
}

export const ContactMessageForm: React.FC<ContactMessageFormProps> = ({
  contact,
  message,
  onMessageChange,
  onSendMessage,
  onBack
}) => {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="w-full max-w-none p-2 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3 mb-4">
          <Button variant="outline" onClick={onBack} size="sm" className="w-fit">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="w-full">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
              Contacter {contact.user_name}
            </h2>
            <p className="text-gray-600 text-sm break-all">{contact.user_email}</p>
          </div>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Envoyer un message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                placeholder="Tapez votre message ici..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={onSendMessage} disabled={!message.trim()} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Envoyer
              </Button>
              <Button variant="outline" onClick={onBack} className="w-full">
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
