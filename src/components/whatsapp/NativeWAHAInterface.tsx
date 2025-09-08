import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import BotWebhookLinker from './BotWebhookLinker';
import { 
  QrCode,
  Play,
  Square,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Smartphone,
  MessageCircle,
  Users,
  Image,
  Video,
  Mic,
  FileText,
  Send,
  Upload,
  Download,
  Settings,
  Webhook,
  Activity,
  Globe,
  Shield,
  Database,
  BarChart3,
  Link2
} from 'lucide-react';

interface SessionData {
  name: string;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
  qr?: string;
  me?: {
    id: string;
    pushName: string;
  };
}

interface MessageData {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  type: string;
  ack?: number;
}

// Sessions Management Tab
export const SessionsTab: React.FC<{
  sessions: SessionData[];
  onCreateSession: (name: string) => void;
  onStartSession: (name: string) => void;
  onStopSession: (name: string) => void;
  onDeleteSession: (name: string) => void;
  onGetQR: (name: string) => void;
  qrCode: string;
  selectedSession: string;
}> = ({ 
  sessions, 
  onCreateSession, 
  onStartSession, 
  onStopSession, 
  onDeleteSession, 
  onGetQR,
  qrCode,
  selectedSession 
}) => {
  const [newSessionName, setNewSessionName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBotLinker, setShowBotLinker] = useState(false);
  const [selectedSessionForBot, setSelectedSessionForBot] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WORKING':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'STOPPED':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Arrêtée</Badge>;
      case 'STARTING':
        return <Badge className="bg-blue-500 text-white"><Activity className="w-3 h-3 mr-1" />Démarrage</Badge>;
      case 'SCAN_QR_CODE':
        return <Badge className="bg-orange-500 text-white"><QrCode className="w-3 h-3 mr-1" />QR Code</Badge>;
      case 'FAILED':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Erreur</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const handleCreateSession = () => {
    if (newSessionName.trim()) {
      onCreateSession(newSessionName.trim());
      setNewSessionName('');
      setShowCreateDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Sessions WhatsApp</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une nouvelle session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nom de la session</label>
                <Input
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Ex: session1, main, business..."
                />
              </div>
              <Button onClick={handleCreateSession} className="w-full">
                Créer la session
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => (
          <Card key={session.name} className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg border-0">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{session.name}</CardTitle>
                  {session.me && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {session.me.pushName} ({session.me.id})
                    </p>
                  )}
                </div>
                {getStatusBadge(session.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {session.status === 'STOPPED' && (
                  <Button 
                    size="sm" 
                    onClick={() => onStartSession(session.name)}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Démarrer
                  </Button>
                )}
                
                {session.status === 'WORKING' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onStopSession(session.name)}
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Arrêter
                  </Button>
                )}
                
                {(session.status === 'SCAN_QR_CODE' || session.status === 'STARTING') && (
                  <Button 
                    size="sm" 
                    onClick={() => onGetQR(session.name)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <QrCode className="w-3 h-3 mr-1" />
                    QR Code
                  </Button>
                )}
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setSelectedSessionForBot(session.name);
                    setShowBotLinker(true);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Link2 className="w-3 h-3 mr-1" />
                  Lier Bot
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onDeleteSession(session.name)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Supprimer
                </Button>
              </div>
              
              {selectedSession === session.name && qrCode && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <p className="text-sm text-center mb-2">Scannez ce QR code avec WhatsApp</p>
                  <div className="flex justify-center">
                    <img src={`data:image/png;base64,${qrCode}`} alt="QR Code" className="max-w-48 max-h-48" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <BotWebhookLinker
        open={showBotLinker}
        onOpenChange={setShowBotLinker}
        sessionName={selectedSessionForBot}
        onWebhookAdded={() => {
          toast.success('Bot lié avec succès!');
          setShowBotLinker(false);
        }}
      />
    </div>
  );
};

// Advanced Message Sender Tab
export const MessagesTab: React.FC<{
  sessions: SessionData[];
  onSendMessage: (data: any) => void;
}> = ({ sessions, onSendMessage }) => {
  const [selectedSession, setSelectedSession] = useState('');
  const [recipient, setRecipient] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'image' | 'document' | 'audio' | 'video'>('text');
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const activeSessions = sessions.filter(s => s.status === 'WORKING');

  const handleSendMessage = () => {
    if (!selectedSession || !recipient || (!messageText.trim() && !mediaFile)) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const messageData = {
      session: selectedSession,
      recipient: recipient,
      text: messageText,
      type: messageType,
      file: mediaFile
    };

    onSendMessage(messageData);
    setMessageText('');
    setMediaFile(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMediaFile(file);
      // Auto-detect message type based on file
      if (file.type.startsWith('image/')) setMessageType('image');
      else if (file.type.startsWith('video/')) setMessageType('video');
      else if (file.type.startsWith('audio/')) setMessageType('audio');
      else setMessageType('document');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900 shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Envoyer un Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Session Active</label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une session" />
                </SelectTrigger>
                <SelectContent>
                  {activeSessions.map((session) => (
                    <SelectItem key={session.name} value={session.name}>
                      {session.name} {session.me && `(${session.me.pushName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Destinataire</label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Numéro de téléphone (ex: 22960000000)"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Type de Message</label>
            <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Texte
                  </div>
                </SelectItem>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Image
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Vidéo
                  </div>
                </SelectItem>
                <SelectItem value="audio">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Audio
                  </div>
                </SelectItem>
                <SelectItem value="document">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Document
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {messageType !== 'text' && (
            <div>
              <label className="text-sm font-medium">Fichier Multimédia</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  accept={
                    messageType === 'image' ? 'image/*' :
                    messageType === 'video' ? 'video/*' :
                    messageType === 'audio' ? 'audio/*' :
                    '*/*'
                  }
                />
                {mediaFile && (
                  <Badge variant="secondary">{mediaFile.name}</Badge>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">
              {messageType === 'image' ? 'Légende' : 'Message'}
            </label>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={
                messageType === 'image' ? 'Légende de l\'image (optionnel)' :
                messageType === 'text' ? 'Tapez votre message ici...' :
                'Description du fichier (optionnel)'
              }
              rows={4}
            />
          </div>

          <Button 
            onClick={handleSendMessage}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            Envoyer le Message
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Webhook Configuration Tab
export const WebhooksTab: React.FC<{
  onConfigureWebhook: (url: string, events: string[]) => void;
}> = ({ onConfigureWebhook }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const availableEvents = [
    'message',
    'message.status',
    'session.status',
    'auth.request',
    'auth.success',
    'auth.failure',
    'call',
    'presence',
    'chat.archive',
    'chat.delete',
    'contact.upsert',
    'group.join',
    'group.leave'
  ];

  const handleEventToggle = (event: string) => {
    setSelectedEvents(prev => 
      prev.includes(event) 
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const handleSaveWebhook = () => {
    if (!webhookUrl.trim()) {
      toast.error('Veuillez entrer une URL de webhook');
      return;
    }
    
    onConfigureWebhook(webhookUrl, selectedEvents);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900 shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Configuration des Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">URL du Webhook</label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://votre-serveur.com/webhook"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Événements à écouter</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableEvents.map((event) => (
                <div 
                  key={event}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedEvents.includes(event)
                      ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                  onClick={() => handleEventToggle(event)}
                >
                  <span className="text-sm font-medium">{event}</span>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSaveWebhook}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurer le Webhook
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default {
  SessionsTab,
  MessagesTab,
  WebhooksTab
};