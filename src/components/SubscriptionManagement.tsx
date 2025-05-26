
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Zap, Rocket, Check, X } from 'lucide-react';

interface BotOwner {
  id: string;
  subscription_plan: string;
  max_bots: number;
  created_at: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  maxBots: number;
  features: string[];
  color: string;
  icon: React.ReactNode;
}

export const SubscriptionManagement: React.FC = () => {
  const [botOwner, setBotOwner] = useState<BotOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Gratuit',
      price: 0,
      maxBots: 1,
      features: [
        '1 chatbot',
        '100 messages/mois',
        'Support communautaire',
        'Intégration webhook basique'
      ],
      color: 'bg-gray-500',
      icon: <Zap className="w-5 h-5" />
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 29,
      maxBots: 5,
      features: [
        '5 chatbots',
        '5,000 messages/mois',
        'Support prioritaire',
        'Analytics avancées',
        'API complète',
        'Intégrations multiples'
      ],
      color: 'bg-blue-500',
      icon: <Crown className="w-5 h-5" />
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99,
      maxBots: 50,
      features: [
        'Chatbots illimités',
        'Messages illimités',
        'Support dédié 24/7',
        'Analytics personnalisées',
        'Intégrations sur mesure',
        'Formation équipe',
        'SLA garanti'
      ],
      color: 'bg-purple-500',
      icon: <Rocket className="w-5 h-5" />
    }
  ];

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerData, error } = await supabase
        .from('bot_owners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération de l\'abonnement:', error);
        return;
      }

      setBotOwner(ownerData);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations d'abonnement",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const upgradePlan = async (newPlan: string, maxBots: number) => {
    if (!botOwner) return;

    try {
      const { error } = await supabase
        .from('bot_owners')
        .update({ 
          subscription_plan: newPlan,
          max_bots: maxBots
        })
        .eq('id', botOwner.id);

      if (error) throw error;

      setBotOwner(prev => prev ? {
        ...prev,
        subscription_plan: newPlan,
        max_bots: maxBots
      } : null);

      toast({
        title: "Abonnement mis à jour",
        description: `Vous êtes maintenant abonné au plan ${newPlan}`,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'abonnement",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Abonnement actuel */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Abonnement actuel</h2>
        {botOwner && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge variant="default" className="capitalize">
                Plan {botOwner.subscription_plan}
              </Badge>
              <span className="text-gray-600">
                {botOwner.max_bots} bot(s) maximum
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Depuis le {new Date(botOwner.created_at).toLocaleDateString('fr-FR')}
            </div>
          </div>
        )}
      </Card>

      {/* Plans disponibles */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Choisir un plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === botOwner?.subscription_plan;
            const isUpgrade = plans.findIndex(p => p.id === plan.id) > 
                             plans.findIndex(p => p.id === botOwner?.subscription_plan);

            return (
              <Card key={plan.id} className={`p-6 relative ${
                isCurrentPlan ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}>
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500">Plan actuel</Badge>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`w-12 h-12 ${plan.color} rounded-lg flex items-center justify-center text-white mx-auto mb-3`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price}€
                    </span>
                    <span className="text-gray-600">/mois</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrentPlan ? "outline" : "default"}
                  disabled={isCurrentPlan}
                  onClick={() => upgradePlan(plan.id, plan.maxBots)}
                >
                  {isCurrentPlan ? 'Plan actuel' : 
                   isUpgrade ? 'Passer à ce plan' : 'Rétrograder'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Informations de facturation */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Informations de facturation
        </h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p>• Les changements de plan prennent effet immédiatement</p>
          <p>• Facturation mensuelle automatique</p>
          <p>• Annulation possible à tout moment</p>
          <p>• Support client disponible pour toute question</p>
        </div>
      </Card>
    </div>
  );
};
