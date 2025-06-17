
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Users, 
  ArrowLeft,
  RefreshCw,
  Shield,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  getSecureChatHistory, 
  getOwnerBotSessions,
  verifyBotOwnership,
  type SecureChatMessage,
  type SecureBotSession 
} from '@/services/chat/secureHistoryManager';

interface SecureConversationManagerProps {
  onBack: () => void;
}

export const SecureConversationManager: React.FC<SecureConversationManagerProps> = ({ onBack }) => {
  const [sessions, setSessions] = useState<SecureBotSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SecureBotSession | null>(null);
  const [messages, setMessages] = useState<SecureChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending');
  const { toast } = useToast();

  useEffect(() => {
    loadSecureData();
  }, []);

  const loadSecureData = async () => {
    try {
      setIsLoading(true);
      setVerificationStatus('pending');
      
      // Load all sessions for the authenticated user
      const secureSessions = await getOwnerBotSessions();
      setSessions(secureSessions);
      
      setVerificationStatus('verified');
      toast({
        title: "Données sécurisées chargées",
        description: `${secureSessions.length} sessions trouvées`,
      });
      
    } catch (error) {
      console.error('Error loading secure data:', error);
      setVerificationStatus('failed');
      toast({
        title: "Erreur de sécurité",
        description: "Impossible de charger les données de manière sécurisée",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionMessages = async (session: SecureBotSession) => {
    try {
      // Verify ownership first
      const isOwner = await verifyBotOwnership(session.bot_id);
      if (!isOwner) {
        toast({
          title: "Accès refusé",
          description: "Vous n'êtes pas propriétaire de ce bot",
          variant: "destructive",
        });
        return;
      }

      setSelectedSession(session);
      const secureMessages = await getSecureChatHistory(session.bot_id, session.session_id);
      setMessages(secureMessages);
      
      toast({
        title: "Messages chargés",
        description: `${secureMessages.length} messages trouvés`,
      });
      
    } catch (error) {
      console.error('Error loading session messages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages de cette session",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Shield className="w-5 h-5 text-blue-600 animate-pulse" />;
    }
  };

  const getStatusText = () => {
    switch (verificationStatus) {
      case 'verified':
        return 'Données sécurisées et vérifiées';
      case 'failed':
        return 'Échec de la vérification de sécurité';
      default:
        return 'Vérification de la sécurité en cours...';
    }
  };

  // Message detail view
  if (selectedSession) {
    return (
      <div className="min-h-screen w-full bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => setSelectedSession(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux sessions
              </Button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedSession.bot_name}
                </h2>
                <p className="text-gray-600">
                  Session avec {selectedSession.user_name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
          </div>

          {/* Session Info */}
          <Card className="mb-6 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Utilisateur</div>
                <div className="font-medium">{selectedSession.user_name}</div>
                {selectedSession.user_email && (
                  <div className="text-sm text-gray-500">{selectedSession.user_email}</div>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-600">Début de session</div>
                <div className="font-medium">
                  {new Date(selectedSession.session_start).toLocaleString('fr-FR')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Dernière activité</div>
                <div className="font-medium">
                  {new Date(selectedSession.last_activity).toLocaleString('fr-FR')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total messages</div>
                <div className="font-medium">{messages.length}</div>
              </div>
            </div>
          </Card>

          {/* Messages */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Historique des messages
            </h3>
            
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun message trouvé pour cette session</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div key={message.message_id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Badge variant={message.message_type === 'user' ? 'default' : 'secondary'}>
                      {message.message_type === 'user' ? 'User' : 'Bot'}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {message.user_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.message_timestamp).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-gray-700">{message.message_content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Main sessions view
  return (
    <div className="min-h-screen w-full bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Gestion Sécurisée des Conversations
              </h2>
              <p className="text-gray-600">
                Toutes vos conversations avec isolation des données garantie
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
            <Button variant="outline" onClick={loadSecureData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Security Status Alert */}
        {verificationStatus === 'failed' && (
          <Card className="mb-6 p-4 border-red-200 bg-red-50">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                Problème de sécurité détecté. Vos données peuvent ne pas être correctement isolées.
              </span>
            </div>
          </Card>
        )}

        {/* Sessions List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Sessions de conversation ({sessions.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Chargement sécurisé en cours...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune session trouvée
              </h3>
              <p className="text-gray-600">
                Aucune conversation n'a encore été initiée avec vos chatbots
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={`${session.bot_id}-${session.session_id}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => loadSessionMessages(session)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{session.bot_name}</Badge>
                      <span className="font-medium text-gray-900">{session.user_name}</span>
                      {session.user_email && (
                        <span className="text-sm text-gray-600">{session.user_email}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Dernière activité: {new Date(session.last_activity).toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {session.total_messages} messages
                    </div>
                    <Badge variant={session.is_active ? 'default' : 'secondary'}>
                      {session.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
