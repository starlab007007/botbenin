import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, 
  QrCode, 
  Play, 
  Square, 
  Trash2, 
  MessageCircle,
  Bot,
  Plus,
  RefreshCw,
  Settings,
  Monitor
} from 'lucide-react';

interface WhatsAppAccount {
  id: string;
  session_name: string;
  phone_number?: string;
  status: string;
  qr_code?: string;
  created_at: string;
  last_activity: string;
}

interface Bot {
  id: string;
  name: string;
  description?: string;
}

interface BotLink {
  id: string;
  bot_id: string;
  whatsapp_account_id: string;
  is_active: boolean;
  auto_response_enabled: boolean;
  welcome_message: string;
  bots: Bot;
}

const WhatsAppConnectPage: React.FC = () => {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [botLinks, setBotLinks] = useState<BotLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<WhatsAppAccount | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    
    // Set up realtime subscription for WhatsApp accounts
    const subscription = supabase
      .channel('whatsapp_accounts_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_accounts'
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      // Load WhatsApp accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // Load bots
      const { data: botsData, error: botsError } = await supabase
        .from('bots')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name');

      if (botsError) throw botsError;
      setBots(botsData || []);

      // Load bot links
      const { data: linksData, error: linksError } = await supabase
        .from('whatsapp_bot_links')
        .select(`
          *,
          bots (id, name, description)
        `)
        .order('created_at', { ascending: false });

      if (linksError) throw linksError;
      setBotLinks(linksData || []);

    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!newSessionName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom de session",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'create',
          sessionName: newSessionName.trim(),
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Session créée",
          description: `Session ${newSessionName} créée avec succès`,
        });
        setNewSessionName('');
        await loadData();
      } else {
        throw new Error(data.error || 'Failed to create session');
      }
    } catch (error: any) {
      console.error('Failed to create session:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la session",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const startSession = async (account: WhatsAppAccount) => {
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'start',
          sessionName: account.session_name,
        },
      });

      if (error) throw error;

      if (data.success) {
        setSelectedAccount(account);
        toast({
          title: "Session démarrée",
          description: "Veuillez scanner le code QR pour connecter WhatsApp",
        });
        
        // Wait a bit then fetch QR code
        setTimeout(() => getQRCode(account), 2000);
      } else {
        throw new Error(data.error || 'Failed to start session');
      }
    } catch (error: any) {
      console.error('Failed to start session:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de démarrer la session",
        variant: "destructive",
      });
    }
  };

  const getQRCode = async (account: WhatsAppAccount) => {
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'qr',
          sessionName: account.session_name,
        },
      });

      if (error) throw error;

      if (data.success && data.qrCode) {
        setQrCode(data.qrCode);
      }
    } catch (error: any) {
      console.error('Failed to get QR code:', error);
    }
  };

  const stopSession = async (account: WhatsAppAccount) => {
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'stop',
          sessionName: account.session_name,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Session arrêtée",
          description: `Session ${account.session_name} arrêtée`,
        });
        setQrCode('');
      }
    } catch (error: any) {
      console.error('Failed to stop session:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'arrêter la session",
        variant: "destructive",
      });
    }
  };

  const deleteSession = async (account: WhatsAppAccount) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la session ${account.session_name} ?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'delete',
          sessionName: account.session_name,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Session supprimée",
          description: `Session ${account.session_name} supprimée`,
        });
        await loadData();
      }
    } catch (error: any) {
      console.error('Failed to delete session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la session",
        variant: "destructive",
      });
    }
  };

  const linkBot = async (accountId: string, botId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_bot_links')
        .insert({
          whatsapp_account_id: accountId,
          bot_id: botId,
          is_active: true,
          auto_response_enabled: true,
        });

      if (error) throw error;

      toast({
        title: "Bot lié",
        description: "Le bot a été lié avec succès à ce compte WhatsApp",
      });
      await loadData();
    } catch (error: any) {
      console.error('Failed to link bot:', error);
      toast({
        title: "Erreur",
        description: "Impossible de lier le bot",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connecté';
      case 'connecting': return 'Connexion...';
      case 'error': return 'Erreur';
      default: return 'Déconnecté';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">WhatsApp Connect</h1>
        <p className="text-muted-foreground">
          Connectez vos comptes WhatsApp et configurez vos bots pour des réponses automatiques
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="bots">Liaison Bots</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sessions Actives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {accounts.filter(a => a.status === 'connected').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  sur {accounts.length} sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Bots Liés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {botLinks.filter(bl => bl.is_active).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  liaisons actives
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Auto-réponses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {botLinks.filter(bl => bl.auto_response_enabled).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  bots configurés
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Créer une nouvelle session</CardTitle>
              <CardDescription>
                Ajoutez un nouveau compte WhatsApp à votre plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="sessionName">Nom de la session</Label>
                  <Input
                    id="sessionName"
                    placeholder="ex: MonWhatsApp"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={createSession} 
                    disabled={creating}
                    className="flex items-center gap-2"
                  >
                    {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Créer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5" />
                      <div>
                        <CardTitle className="text-lg">{account.session_name}</CardTitle>
                        <CardDescription>
                          {account.phone_number || 'Numéro non connecté'}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={getStatusColor(account.status)}>
                      {getStatusText(account.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {account.status === 'disconnected' && (
                      <Button
                        size="sm"
                        onClick={() => startSession(account)}
                        className="flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Démarrer
                      </Button>
                    )}
                    
                    {account.status === 'connecting' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => getQRCode(account)}
                        className="flex items-center gap-2"
                      >
                        <QrCode className="w-4 h-4" />
                        QR Code
                      </Button>
                    )}
                    
                    {(account.status === 'connected' || account.status === 'connecting') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => stopSession(account)}
                        className="flex items-center gap-2"
                      >
                        <Square className="w-4 h-4" />
                        Arrêter
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteSession(account)}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </Button>
                  </div>

                  {selectedAccount?.id === account.id && qrCode && (
                    <div className="mt-4 p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        Scannez ce code QR avec WhatsApp:
                      </p>
                      <img src={qrCode} alt="QR Code" className="mx-auto" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bots" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lier un bot à WhatsApp</CardTitle>
              <CardDescription>
                Connectez vos bots IA à vos comptes WhatsApp pour des réponses automatiques
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <p className="text-muted-foreground">
                  Aucun compte WhatsApp disponible. Créez d'abord une session.
                </p>
              ) : bots.length === 0 ? (
                <p className="text-muted-foreground">
                  Aucun bot disponible. Créez d'abord un bot dans la section Gestion des Bots.
                </p>
              ) : (
                <div className="space-y-4">
                  {accounts.map((account) => (
                    <div key={account.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span className="font-medium">{account.session_name}</span>
                          <Badge variant="outline" className={getStatusColor(account.status)}>
                            {getStatusText(account.status)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <Label>Sélectionner un bot</Label>
                          <Select onValueChange={(botId) => linkBot(account.id, botId)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un bot..." />
                            </SelectTrigger>
                            <SelectContent>
                              {bots.map((bot) => (
                                <SelectItem key={bot.id} value={bot.id}>
                                  {bot.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Show linked bots */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Bots liés:</h4>
                        {botLinks
                          .filter(bl => bl.whatsapp_account_id === account.id)
                          .map((link) => (
                            <div key={link.id} className="flex items-center justify-between p-2 bg-muted rounded">
                              <div className="flex items-center gap-2">
                                <Bot className="w-4 h-4" />
                                <span>{link.bots.name}</span>
                                {link.auto_response_enabled && (
                                  <Badge variant="outline">Auto-réponse</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages WhatsApp</CardTitle>
              <CardDescription>
                Gérez et consultez l'historique des messages WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Fonctionnalité de gestion des messages à venir</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppConnectPage;