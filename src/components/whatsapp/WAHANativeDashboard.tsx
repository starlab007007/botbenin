import React, { useMemo, useState } from 'react';
import { useWhatsAppAccounts } from '@/hooks/useWhatsAppAccounts';
import Native from '@/components/whatsapp/NativeWAHAInterface';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

// Helper to normalize WAHA/DB statuses into UI statuses
const mapStatus = (status?: string): 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' => {
  const s = (status || '').toUpperCase();
  if (s.includes('WORK') || s === 'CONNECTED' || s === 'ACTIVE') return 'WORKING';
  if (s.includes('QR')) return 'SCAN_QR_CODE';
  if (s.includes('START')) return 'STARTING';
  if (s.includes('FAIL') || s.includes('ERR')) return 'FAILED';
  return 'STOPPED';
};

const WAHANativeDashboard: React.FC = () => {
  const { toast } = useToast();
  const {
    accounts,
    loading,
    createSession,
    startSession,
    getQRCode,
    stopSession,
    deleteSession,
    sendMessage,
  } = useWhatsAppAccounts();

  const sessions = useMemo(() => (
    (accounts || []).map(a => ({
      name: a.session_name,
      status: mapStatus(a.status),
      qr: a.qr_code || undefined,
    }))
  ), [accounts]);

  const [selectedSession, setSelectedSession] = useState('');
  const [qrCode, setQrCode] = useState('');

  const handleCreateSession = async (name: string) => {
    try {
      await createSession(name);
      await startSession(name);
    } catch {}
  };

  const handleStart = async (name: string) => {
    try { await startSession(name); } catch {}
  };
  const handleStop = async (name: string) => {
    try { await stopSession(name); } catch {}
  };
  const handleDelete = async (name: string) => {
    try { await deleteSession(name); } catch {}
  };
  const handleGetQR = async (name: string) => {
    try {
      const code = await getQRCode(name);
      setSelectedSession(name);
      if (typeof code === 'string') setQrCode(code);
    } catch {}
  };

  const handleSendMessage = async (data: any) => {
    try {
      const typeMap: Record<string, 'text'|'image'|'file'> = {
        text: 'text', image: 'image', document: 'file', audio: 'file', video: 'file'
      };
      if (data.file) {
        toast({
          title: 'Envoi de média',
          description: 'Pour les médias, fournissez une URL publique dans le message ou utilisez la pièce jointe via une URL. (Upload natif bientôt disponible.)',
        });
      }
      await sendMessage(
        data.session || data.sessionName || data.session_name,
        data.recipient,
        data.text || '',
        typeMap[data.type] || 'text',
        data.mediaUrl
      );
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Échec de l\'envoi', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-0">
          <div className="p-6">
            <Native.SessionsTab
              sessions={sessions}
              onCreateSession={handleCreateSession}
              onStartSession={handleStart}
              onStopSession={handleStop}
              onDeleteSession={handleDelete}
              onGetQR={handleGetQR}
              qrCode={qrCode}
              selectedSession={selectedSession}
            />
          </div>
          <Separator />
          <div className="p-6">
            <Native.MessagesTab
              sessions={sessions}
              onSendMessage={handleSendMessage}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WAHANativeDashboard;
