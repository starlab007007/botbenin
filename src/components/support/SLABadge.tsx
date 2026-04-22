import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  dueAt: string | null;
  breached?: boolean;
  resolved?: boolean;
}

export const SLABadge: React.FC<Props> = ({ dueAt, breached, resolved }) => {
  if (resolved) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 gap-1">
        <CheckCircle2 className="w-3 h-3" /> SLA respecté
      </Badge>
    );
  }
  if (!dueAt) return null;
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const diff = due - now;
  const isBreached = breached || diff < 0;
  const distance = formatDistanceToNow(new Date(dueAt), { locale: fr, addSuffix: false });

  if (isBreached) {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 gap-1">
        <AlertTriangle className="w-3 h-3" /> SLA dépassé ({distance})
      </Badge>
    );
  }
  const warn = diff < 30 * 60 * 1000; // < 30 min
  return (
    <Badge variant="outline" className={`gap-1 ${warn ? 'bg-orange-50 text-orange-700 border-orange-300' : 'bg-blue-50 text-blue-700 border-blue-300'}`}>
      <Clock className="w-3 h-3" /> SLA dans {distance}
    </Badge>
  );
};
