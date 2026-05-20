import * as React from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { jidToPhone, formatPhoneDisplay, parsePhone, isValidPhone, toE164 } from '@/lib/phone';
import { cn } from '@/lib/utils';

interface PhoneCellProps {
  value?: string | null;
  showActions?: boolean;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Affiche un numéro lisible (🇧🇯 +229 01 XX XX XX XX) à partir d'un :
 *  - JID WhatsApp (273091318042723@lid, 22901...@s.whatsapp.net)
 *  - E.164 ou local
 * Fallback : valeur brute en muted si non normalisable.
 */
export const PhoneCell = React.memo(function PhoneCell({
  value, showActions = true, className, fallback,
}: PhoneCellProps) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;

  const raw = String(value).trim();
  let e164 = '';

  if (raw.includes('@')) {
    e164 = jidToPhone(raw);
  } else {
    const p = parsePhone(raw);
    if (isValidPhone(p.local, p.country)) e164 = toE164(p.local, p.country);
  }

  if (!e164) {
    return (
      <span className={cn('text-xs text-muted-foreground font-mono truncate', className)} title={raw}>
        {fallback ?? raw}
      </span>
    );
  }

  const display = formatPhoneDisplay(e164);
  const waNumber = e164.replace('+', '');

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="text-sm tabular-nums whitespace-nowrap">{display}</span>
      {showActions && (
        <span className="inline-flex items-center gap-1 opacity-70">
          <a href={`tel:${e164}`} aria-label="Appeler" className="hover:text-primary"><Phone className="h-3.5 w-3.5" /></a>
          <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="hover:text-emerald-600"><MessageCircle className="h-3.5 w-3.5" /></a>
        </span>
      )}
    </div>
  );
});
