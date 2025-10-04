import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Bot, 
  TrendingUp,
  Shield,
  CreditCard,
  Users
} from 'lucide-react';

interface NotificationPreference {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  email: boolean;
  push: boolean;
  category: string;
}

export const NotificationSettings: React.FC = () => {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      id: 'messages',
      title: 'Nouveaux messages',
      description: 'Recevez une notification pour chaque nouveau message de vos chatbots',
      icon: <MessageSquare className="w-5 h-5" />,
      email: true,
      push: true,
      category: 'Activité'
    },
    {
      id: 'bots',
      title: 'Activité des bots',
      description: 'Alertes sur l\'état et les performances de vos chatbots',
      icon: <Bot className="w-5 h-5" />,
      email: true,
      push: false,
      category: 'Activité'
    },
    {
      id: 'users',
      title: 'Nouveaux utilisateurs',
      description: 'Notification quand un nouvel utilisateur interagit avec vos bots',
      icon: <Users className="w-5 h-5" />,
      email: false,
      push: true,
      category: 'Activité'
    },
    {
      id: 'analytics',
      title: 'Rapports analytiques',
      description: 'Recevez des résumés hebdomadaires de vos statistiques',
      icon: <TrendingUp className="w-5 h-5" />,
      email: true,
      push: false,
      category: 'Rapports'
    },
    {
      id: 'security',
      title: 'Alertes de sécurité',
      description: 'Connexions suspectes et changements de sécurité',
      icon: <Shield className="w-5 h-5" />,
      email: true,
      push: true,
      category: 'Sécurité'
    },
    {
      id: 'billing',
      title: 'Facturation',
      description: 'Notifications de paiement, factures et changements d\'abonnement',
      icon: <CreditCard className="w-5 h-5" />,
      email: true,
      push: false,
      category: 'Compte'
    }
  ]);

  const toggleNotification = (id: string, type: 'email' | 'push') => {
    setPreferences(prev => prev.map(pref => 
      pref.id === id ? { ...pref, [type]: !pref[type] } : pref
    ));
  };

  const savePreferences = () => {
    toast({
      title: "Préférences sauvegardées",
      description: "Vos paramètres de notification ont été mis à jour"
    });
  };

  const categories = Array.from(new Set(preferences.map(p => p.category)));

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Gérez vos notifications</h3>
            <p className="text-sm text-muted-foreground">
              Choisissez comment et quand vous souhaitez être notifié
            </p>
          </div>
        </div>
      </Card>

      {/* Préférences par catégorie */}
      {categories.map(category => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
            {category}
          </h3>
          <Card className="divide-y">
            {preferences
              .filter(pref => pref.category === category)
              .map((pref) => (
                <div key={pref.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {pref.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{pref.title}</h4>
                        <p className="text-sm text-muted-foreground">{pref.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-8 ml-4">
                      <div className="flex flex-col items-center space-y-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <Switch
                          checked={pref.email}
                          onCheckedChange={() => toggleNotification(pref.id, 'email')}
                        />
                      </div>
                      <div className="flex flex-col items-center space-y-2">
                        <Bell className="w-4 h-4 text-muted-foreground" />
                        <Switch
                          checked={pref.push}
                          onCheckedChange={() => toggleNotification(pref.id, 'push')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </Card>
        </div>
      ))}

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} size="lg">
          Sauvegarder les préférences
        </Button>
      </div>
    </div>
  );
};
