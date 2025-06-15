
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail } from 'lucide-react';

interface BotConversation {
  bot_id: string;
  bot_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  session_id: string;
  total_messages: number;
  last_message_at: string;
  last_message_content: string;
  session_start: string;
  is_active: boolean;
}

interface MessageDetails {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: string;
  user_name: string;
}

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

interface MessageViewProps {
  conversation: BotConversation;
  messages: MessageDetails[];
  onBack: () => void;
  onContactUser: (contact: ContactInfo) => void;
}

export const MessageView: React.FC<MessageViewProps> = ({
  conversation,
  messages,
  onBack,
  onContactUser
}) => {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="w-full max-w-none p-2 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack} size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onContactUser({
                user_id: conversation.user_id,
                user_name: conversation.user_name,
                user_email: conversation.user_email,
                session_count: 1,
                message_count: conversation.total_messages,
                first_interaction: conversation.session_start,
                last_interaction: conversation.last_message_at,
                status: 'active'
              })}
            >
              <Mail className="w-4 h-4 mr-1" />
              Contacter
            </Button>
          </div>
          <div className="w-full">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
              Conversation avec {conversation.user_name}
            </h2>
            <p className="text-gray-600 text-sm">
              Bot: {conversation.bot_name} • {conversation.total_messages} messages
            </p>
          </div>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Messages de la conversation</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex w-full ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="break-words">{message.content}</div>
                    <div className="opacity-75 mt-1 text-xs">
                      {new Date(message.timestamp).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
