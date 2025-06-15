
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader, Send, Bot } from "lucide-react";

interface Props {
  replyText: string;
  setReplyText: (val: string) => void;
  sending: boolean;
  onSend: () => void;
  selectedBot: any;
}

export const MessageReplyForm: React.FC<Props> = ({
  replyText,
  setReplyText,
  sending,
  onSend,
  selectedBot,
}) => {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-gray-700 flex items-center gap-2">
        <Bot className="w-4 h-4" />
        Répondre en tant que {selectedBot?.name || 'Bot'}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Tapez votre réponse..."
          className="min-h-[60px] max-h-[120px] resize-none flex-1"
          disabled={sending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey && !sending) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <Button
          onClick={onSend}
          disabled={!replyText.trim() || sending}
          size="sm"
          className="h-fit mt-auto"
        >
          {sending ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Cette réponse sera envoyée comme message du bot • Ctrl+Enter pour envoyer
      </div>
    </div>
  );
};
