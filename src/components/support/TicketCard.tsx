import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { SEVERITY_LABELS, STATUS_LABELS, type SupportTicket } from '@/types/support';
import { SLABadge } from './SLABadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, Hash } from 'lucide-react';

interface Props { ticket: SupportTicket; basePath?: string }

export const TicketCard: React.FC<Props> = ({ ticket, basePath = '/sigdsts/tickets' }) => {
  const sev = SEVERITY_LABELS[ticket.severity];
  const stat = STATUS_LABELS[ticket.status];
  const resolved = ticket.status === 'resolu' || ticket.status === 'clos';

  return (
    <Link to={`${basePath}/${ticket.id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Hash className="w-3 h-3" />
              <span className="font-mono">{ticket.ticket_number}</span>
              <span>·</span>
              <span>{format(new Date(ticket.created_at), 'dd MMM HH:mm', { locale: fr })}</span>
            </div>
            <h3 className="font-medium truncate group-hover:text-primary transition-colors">{ticket.title}</h3>
            {ticket.module && <p className="text-xs text-muted-foreground mt-0.5">Module : {ticket.module}</p>}
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Badge className={sev.color}>{sev.label}</Badge>
          <Badge variant="outline" className={stat.color}>{stat.label}</Badge>
          <SLABadge dueAt={ticket.sla_due_at} breached={ticket.sla_breached} resolved={resolved} />
        </div>
      </Card>
    </Link>
  );
};
