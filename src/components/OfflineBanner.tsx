import { useEffect, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Persistent banner shown when the device is offline.
 * Also fires a sonner toast on online/offline transitions so the user
 * gets clear, contextual feedback (WhatsApp-like).
 */
export const OfflineBanner = () => {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      toast.error('Pas de connexion internet', {
        description: 'Vos messages seront envoyés dès le retour du réseau.',
        id: 'offline-toast',
        duration: 4000,
      });
    } else if (wasOffline.current) {
      wasOffline.current = false;
      toast.success('Connexion rétablie', {
        description: 'Synchronisation en cours…',
        id: 'online-toast',
        duration: 3000,
      });
    }
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-amber-500 text-amber-950 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 py-1.5 px-3 shadow-sm z-50"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 6px)' }}
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">Hors ligne — vos actions seront envoyées à la reconnexion</span>
    </div>
  );
};

export default OfflineBanner;
