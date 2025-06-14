
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
}

interface BotMessage {
  id: string;
  message_content: string;
  created_at: string;
  message_type: string;
  bot_user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

interface ReplyFormProps {
  selectedSession: BotSession;
  selectedBot: any;
  messages: BotMessage[];
  onMessagesUpdate: (messages: BotMessage[]) => void;
}

export const ReplyForm: React.FC<ReplyFormProps> = ({
  selectedSession,
  selectedBot,
  messages,
  onMessagesUpdate,
}) => {
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const { toast } = useToast();

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

  return (
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
  );
};
