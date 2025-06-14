
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChevronRight, Loader, MessageSquare, Send, Bot, User, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BotMessage {
  id: string;
  message_content: string;
  created_at: string;
  message_type: string;
  bot_user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
}

interface UnifiedMessageListProps {
  selectedSession: BotSession | null;
  messages: BotMessage[];
  loadingMessages: boolean;
  selectedBot: any;
  onMessagesUpdate: (messages: BotMessage[]) => void;
}

export const UnifiedMessageList: React.FC<UnifiedMessageListProps> = ({
  selectedSession,
  messages,
  loadingMessages,
  selectedBot,
  onMessagesUpdate,
}) => {
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { toast } = useToast();

  // Fonction de débogage pour voir les informations de la base de données
  const handleDebugSession = async () => {
    if (!selectedSession || !selectedBot) return;

    try {
      console.log("=== DÉBOGAGE SESSION ===");
      
      // 1. Vérifier la session dans enhanced_chat_sessions
      const { data: enhancedSession, error: enhancedError } = await supabase
        .from("enhanced_chat_sessions")
        .select("*")
        .eq("session_token", selectedSession.session_token);

      console.log("Enhanced sessions:", enhancedSession, enhancedError);

      // 2. Vérifier les bot_users liés
      const { data: botUsers, error: usersError } = await supabase
        .from("bot_users")
        .select("*")
        .eq("bot_id", selectedBot.id);

      console.log("Bot users:", botUsers, usersError);

      // 3. Vérifier tous les messages du bot
      const { data: allMessages, error: messagesError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("bot_id", selectedBot.id)
        .order("created_at", { ascending: false })
        .limit(20);

      console.log("Tous les messages:", allMessages, messagesError);

      setDebugInfo({
        enhancedSession,
        botUsers,
        allMessages,
        sessionToken: selectedSession.session_token,
        botId: selectedBot.id
      });

    } catch (error) {
      console.error("Erreur débogage:", error);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedSession || !selectedBot || sendingReply) {
      return;
    }

    setSendingReply(true);

    try {
      // Créer ou récupérer un bot_user_id pour cette session
      let botUserId = selectedSession.bot_user_id;

      if (!botUserId) {
        // Créer un nouvel utilisateur bot pour cette session
        const { data: newBotUser, error: userError } = await supabase
          .from("bot_users")
          .insert({
            bot_id: selectedBot.id,
            session_id: selectedSession.session_token,
            user_name: `Session ${selectedSession.session_token.slice(0, 8)}`,
            is_authenticated: selectedSession.source_type === 'authenticated'
          })
          .select()
          .single();

        if (userError) {
          console.error("Erreur création bot_user :", userError);
          throw userError;
        }

        botUserId = newBotUser.id;
      }

      // Insérer le message de réponse
      const { data: newMessage, error: messageError } = await supabase
        .from("chat_messages")
        .insert({
          bot_id: selectedBot.id,
          bot_user_id: botUserId,
          message_content: replyText,
          message_type: "bot",
          ip_address: "admin_response",
          user_agent: "admin_panel",
          metadata: {
            session_token: selectedSession.session_token,
            source: "admin_manual_reply"
          }
        })
        .select()
        .single();

      if (messageError) {
        console.error("Erreur envoi message :", messageError);
        throw messageError;
      }

      // Ajouter le nouveau message à la liste
      const updatedMessages = [...messages, {
        id: newMessage.id,
        message_content: newMessage.message_content,
        created_at: newMessage.created_at,
        message_type: newMessage.message_type,
        bot_user_id: newMessage.bot_user_id,
        ip_address: newMessage.ip_address,
        user_agent: newMessage.user_agent
      }];

      onMessagesUpdate(updatedMessages);
      setReplyText("");

      toast({
        title: "Message envoyé",
        description: "Votre réponse a été envoyée avec succès.",
      });

    } catch (error) {
      console.error("Erreur lors de l'envoi de la réponse :", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  if (!selectedSession) {
    return (
      <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
        <div className="flex flex-1 items-center justify-center text-gray-400 text-lg h-full">
          <ChevronRight className="w-6 h-6 mr-1" /> Sélectionnez une session
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
      <div className="mb-2 font-semibold text-lg text-primary flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Messages de la session
        <span className="text-sm text-gray-500">
          ({selectedSession.source_type === 'anonymous' ? 'anonyme' : 'authentifiée'})
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDebugSession}
          className="ml-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="text-xs text-gray-600 mb-3">
        Token: {selectedSession.session_token.slice(0, 20)}...
        {selectedSession.bot_user_id && (
          <div className="mt-1">
            User ID: {selectedSession.bot_user_id.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* Informations de débogage */}
      {debugInfo && (
        <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
          <div className="font-medium mb-1">Debug Info:</div>
          <div>Enhanced Sessions: {debugInfo.enhancedSession?.length || 0}</div>
          <div>Bot Users: {debugInfo.botUsers?.length || 0}</div>
          <div>Messages Total: {debugInfo.allMessages?.length || 0}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDebugInfo(null)}
            className="mt-1"
          >
            Masquer
          </Button>
        </div>
      )}

      {/* Liste des messages */}
      <div className="flex-1 overflow-y-auto max-h-[35vh] space-y-2 mb-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="animate-spin w-6 h-6" />
            <span className="ml-2 text-sm text-gray-500">Chargement des messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">Aucun message trouvé</p>
            <p className="text-xs mt-1">
              Cette session n'a pas encore de messages de conversation
            </p>
            <p className="text-xs mt-2 text-gray-400">
              Session: {selectedSession.source_type} • Token: {selectedSession.session_token.slice(0, 12)}...
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDebugSession}
              className="mt-3"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Analyser la session
            </Button>
          </div>
        ) : (
          <>
            <div className="text-xs text-green-600 mb-2 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {messages.length} message(s) trouvé(s)
            </div>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  "p-3 rounded-lg shadow-sm my-2 border flex items-start gap-2",
                  msg.message_type === "user"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-green-50 border-green-200"
                )}
              >
                <div className="flex-shrink-0 mt-1">
                  {msg.message_type === "user" ? (
                    <User className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Bot className="w-4 h-4 text-green-600" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-medium text-gray-700">
                      {msg.message_type === "user" ? "Utilisateur" : "Bot"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR')}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-800 leading-relaxed">
                    {msg.message_content}
                  </div>
                  
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <span>
                      {new Date(msg.created_at).toLocaleDateString('fr-FR')} à {new Date(msg.created_at).toLocaleTimeString('fr-FR')}
                    </span>
                    {msg.bot_user_id && (
                      <span className="bg-gray-100 px-1 rounded">
                        ID: {msg.bot_user_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Zone de réponse manuelle */}
      <div className="border-t pt-4">
        <div className="mb-2 text-sm font-medium text-gray-700 flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Répondre en tant que bot
        </div>
        
        <div className="flex gap-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Tapez votre réponse..."
            className="min-h-[80px] max-h-[120px] resize-none"
            disabled={sendingReply}
          />
          <Button
            onClick={handleSendReply}
            disabled={!replyText.trim() || sendingReply}
            size="sm"
            className="h-fit mt-auto"
          >
            {sendingReply ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 mt-1">
          Cette réponse sera envoyée comme message du bot dans la conversation
        </div>
      </div>
    </Card>
  );
};
