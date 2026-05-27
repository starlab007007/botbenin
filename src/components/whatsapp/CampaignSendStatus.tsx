import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle, MessageCircle, Loader2, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  status: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  repliedAt?: string | null;
  className?: string;
  showLabel?: boolean;
}

// Icônes type WhatsApp : ⏳ ✓ ✓✓ ✓✓-bleu 💬 ❌
export const CampaignSendStatus: React.FC<Props> = ({
  status, sentAt, deliveredAt, readAt, repliedAt, className, showLabel,
}) => {
  let icon: React.ReactNode;
  let label = status;
  let color = 'text-muted-foreground';

  if (status === 'failed') {
    icon = <AlertCircle className="w-4 h-4" />;
    color = 'text-destructive';
    label = 'Échec';
  } else if (status === 'skipped') {
    icon = <MinusCircle className="w-4 h-4" />;
    label = 'Ignoré';
  } else if (status === 'sending') {
    icon = <Loader2 className="w-4 h-4 animate-spin" />;
    color = 'text-amber-600';
    label = 'En cours';
  } else if (repliedAt || status === 'replied') {
    icon = <MessageCircle className="w-4 h-4 fill-current" />;
    color = 'text-blue-600';
    label = 'Répondu';
  } else if (readAt || status === 'read') {
    icon = <CheckCheck className="w-4 h-4" />;
    color = 'text-[#53BDEB]'; // bleu WhatsApp
    label = 'Lu';
  } else if (deliveredAt || status === 'delivered') {
    icon = <CheckCheck className="w-4 h-4" />;
    color = 'text-muted-foreground';
    label = 'Livré';
  } else if (sentAt || status === 'sent') {
    icon = <Check className="w-4 h-4" />;
    color = 'text-muted-foreground';
    label = 'Envoyé';
  } else {
    icon = <Clock className="w-4 h-4" />;
    label = 'En attente';
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', color, className)}>
      {icon}
      {showLabel && <span>{label}</span>}
    </span>
  );
};
