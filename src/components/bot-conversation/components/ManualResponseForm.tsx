
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot } from "lucide-react";
import { useManualMessageSender } from "../hooks/useManualMessageSender";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
}

interface ManualResponseFormProps {
  selectedBot: any;
  selectedSession: BotSession | null;
  onMessageSent?: () => void;
}

export const ManualResponseForm: React.FC<ManualResponseFormProps> = ({
  selectedBot,
  selectedSession,
  onMessageSent
}) => {
  const [message, setMessage] = useState("");
  const { sendManualMessage, sending } = useManualMessageSender(selectedBot?.id, selectedSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || sending) return;

    try {
      await sendManualMessage(message, () => {
        setMessage("");
        if (onMessageSent) {
          onMessageSent();
        }
      });
    } catch (error) {
      console.error('Error in ManualResponseForm:', error);
    }
  };

  if (!selectedSession || !selectedBot) {
    return (
      <Card className="p-4">
        <div className="text-center text-gray-500">
          Sélectionnez une session pour envoyer une réponse
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Répondre en tant que {selectedBot.name}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Cette réponse sera envoyée comme message du bot dans la conversation
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tapez votre réponse..."
          className="min-h-[80px] resize-none"
          disabled={sending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey && !sending) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Ctrl+Enter pour envoyer
          </div>
          <Button
            type="submit"
            disabled={!message.trim() || sending}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </form>
    </Card>
  );
};
