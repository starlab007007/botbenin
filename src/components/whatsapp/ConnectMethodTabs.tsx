import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, KeyRound } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import QRConnectionFlow from './QRConnectionFlow';
import PairCodeFlow from './PairCodeFlow';

interface ConnectMethodTabsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
  /** Optional: default tab. */
  defaultMethod?: 'qr' | 'code';
}

/**
 * Unified WhatsApp connection dialog with two methods:
 *  - QR Code (existing flow, wrapped inline)
 *  - 8-digit pair code (new)
 *
 * Both share the same WAHA session and the same auto-close-on-connect logic.
 */
const ConnectMethodTabs: React.FC<ConnectMethodTabsProps> = ({
  open,
  onOpenChange,
  sessionName,
  defaultMethod = 'qr',
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <FaWhatsapp className="h-5 w-5 text-green-600" />
            Connecter WhatsApp — <span className="font-mono text-sm">{sessionName}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultMethod} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr" className="gap-2">
              <QrCode className="h-4 w-4" /> QR Code
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-2">
              <KeyRound className="h-4 w-4" /> Code à 8 chiffres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="mt-4">
            {/* Reuse the existing QR flow, but render its body only (no nested dialog) */}
            <QRConnectionFlow
              open={open}
              onOpenChange={onOpenChange}
              sessionName={sessionName}
              embedded
            />
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <PairCodeFlow
              sessionName={sessionName}
              onConnected={() => setTimeout(() => onOpenChange(false), 2500)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectMethodTabs;
