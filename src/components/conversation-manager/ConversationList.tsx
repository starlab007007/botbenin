
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Calendar, Clock, Eye, Mail } from 'lucide-react';

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

interface ConversationListProps {
  conversations: BotConversation[];
  isLoading: boolean;
  onViewConversation: (conversation: BotConversation) => void;
  onContactUser: (contact: ContactInfo) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  isLoading,
  onViewConversation,
  onContactUser
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune conversation trouvée
          </h3>
          <p className="text-gray-600 text-sm">
            Aucune conversation ne correspond à vos critères de recherche.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conversation) => (
        <Card key={`${conversation.bot_id}-${conversation.session_id}`} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm break-words">
                      {conversation.user_name}
                    </h3>
                    <Badge variant="secondary" className="text-xs">{conversation.bot_name}</Badge>
                    <Badge variant="default" className="text-xs">
                      {conversation.total_messages} messages
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-xs mb-2 break-all">{conversation.user_email}</p>
                  <p className="text-gray-700 text-xs line-clamp-2 break-words">
                    Dernier message: {conversation.last_message_content}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Début: {new Date(conversation.session_start).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Dernier: {new Date(conversation.last_message_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => onViewConversation(conversation)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir la conversation
                </Button>
                <Button
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
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contacter l'utilisateur
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
