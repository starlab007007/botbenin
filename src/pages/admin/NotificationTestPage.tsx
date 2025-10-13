import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Send, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const NotificationTestPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const sendTestNotification = async (type: string) => {
    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté',
        variant: 'destructive',
      });
      return;
    }

    setLoading(type);
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          user_id: user.id,
          title: `Test ${type}`,
          content: `Ceci est une notification de test de type ${type}`,
          type,
          action_url: '/dashboard',
          metadata: { test: true, timestamp: Date.now() }
        }
      });

      if (error) throw error;

      toast({
        title: '✅ Notification envoyée',
        description: `Vérifiez votre panneau de notifications`,
      });
    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const notificationTypes = [
    { type: 'message', label: 'Message', description: 'Simule un nouveau message reçu' },
    { type: 'bot_interaction', label: 'Bot Interaction', description: 'Simule une interaction bot' },
    { type: 'link_click', label: 'Link Click', description: 'Simule un clic sur un lien' },
    { type: 'share', label: 'Share', description: 'Simule un partage' },
    { type: 'booking', label: 'Booking', description: 'Simule une réservation' },
    { type: 'system', label: 'Système', description: 'Notification système générique' },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Bell className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Test des notifications</h1>
            <p className="text-muted-foreground">
              Envoyez des notifications de test pour vérifier le système
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notificationTypes.map(({ type, label, description }) => (
            <Card key={type} className="p-4">
              <h3 className="font-semibold mb-2">{label}</h3>
              <p className="text-sm text-muted-foreground mb-4">{description}</p>
              <Button 
                onClick={() => sendTestNotification(type)}
                disabled={loading === type}
                className="w-full"
              >
                {loading === type ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer test
                  </>
                )}
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">ℹ️ Instructions</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Cliquez sur un bouton pour envoyer une notification de test</li>
            <li>• Les notifications apparaîtront en temps réel dans le panneau (coin supérieur droit)</li>
            <li>• Un toast apparaîtra également pour confirmer l'envoi</li>
            <li>• Les notifications persistent même après fermeture de l'app</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
