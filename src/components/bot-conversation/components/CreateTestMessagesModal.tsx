
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CreateTestMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBot: any;
  selectedSession: any;
  onMessagesCreated: () => void;
}

export const CreateTestMessagesModal: React.FC<CreateTestMessagesModalProps> = ({
  isOpen,
  onClose,
  selectedBot,
  selectedSession,
  onMessagesCreated
}) => {
  const [loading, setLoading] = useState(false);
  const [userMessage, setUserMessage] = useState("Bonjour, j'ai besoin d'aide avec votre service.");
  const [botResponse, setBotResponse] = useState("Bonjour ! Je suis ravi de vous aider. Que puis-je faire pour vous aujourd'hui ?");

  const createTestMessages = async () => {
    if (!selectedBot || !selectedSession) return;

    setLoading(true);
    try {
      console.log("[CreateTestMessages] Création de messages de test...");
      
      // 1. Créer ou récupérer un bot_user pour cette session
      let botUserId = selectedSession.bot_user_id;
      
      if (!botUserId) {
        const { data: newBotUser, error: userError } = await supabase
          .from("bot_users")
          .insert({
            bot_id: selectedBot.id,
            session_id: selectedSession.session_token,
            user_name: "Utilisateur Test",
            user_email: null,
            is_authenticated: false
          })
          .select()
          .single();

        if (userError) {
          console.error("Erreur création bot_user:", userError);
          throw userError;
        }
        
        botUserId = newBotUser.id;
        console.log("[CreateTestMessages] Bot user créé:", botUserId);
      }

      // 2. Créer le message utilisateur
      const { error: userMsgError } = await supabase
        .from("chat_messages")
        .insert({
          bot_id: selectedBot.id,
          bot_user_id: botUserId,
          message_content: userMessage,
          message_type: "user",
          metadata: {
            session_token: selectedSession.session_token,
            is_test: true
          }
        });

      if (userMsgError) {
        console.error("Erreur création message utilisateur:", userMsgError);
        throw userMsgError;
      }

      // 3. Créer la réponse du bot
      const { error: botMsgError } = await supabase
        .from("chat_messages")
        .insert({
          bot_id: selectedBot.id,
          bot_user_id: botUserId,
          message_content: botResponse,
          message_type: "bot",
          metadata: {
            session_token: selectedSession.session_token,
            is_test: true
          }
        });

      if (botMsgError) {
        console.error("Erreur création message bot:", botMsgError);
        throw botMsgError;
      }

      console.log("[CreateTestMessages] Messages de test créés avec succès");
      onMessagesCreated();
      onClose();
    } catch (error) {
      console.error("[CreateTestMessages] Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Créer des messages de test
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="user-message">Message utilisateur</Label>
            <Textarea
              id="user-message"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Tapez le message de l'utilisateur..."
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label htmlFor="bot-response">Réponse du bot</Label>
            <Textarea
              id="bot-response"
              value={botResponse}
              onChange={(e) => setBotResponse(e.target.value)}
              placeholder="Tapez la réponse du bot..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={createTestMessages} disabled={loading || !userMessage || !botResponse}>
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer les messages"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
