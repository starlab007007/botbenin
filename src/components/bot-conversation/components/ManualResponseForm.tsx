
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ManualResponseFormProps {
  onSendResponse: (message: string) => Promise<void>;
  disabled?: boolean;
  botName?: string;
}

export const ManualResponseForm: React.FC<ManualResponseFormProps> = ({
  onSendResponse,
  disabled = false,
  botName = "Bot"
}) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await onSendResponse(message.trim());
      setMessage("");
      toast({
        title: "Message envoyé",
        description: "Votre réponse a été envoyée avec succès.",
      });
    } catch (error) {
      console.error('Error sending manual response:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Répondre en tant que {botName}
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
          disabled={disabled || sending}
        />
        
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!message.trim() || disabled || sending}
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
