import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAutomationBots } from '@/hooks/useAutomationBots';
import { 
  Bot, 
  TrendingUp, 
  Users, 
  MessageCircle, 
  Clock, 
  ExternalLink,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';

interface QualificationMetrics {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalQualified: number;
  averageScore: number;
  responseTime: string;
}

interface LeadQualificationWorkflowProps {
  isVisible?: boolean;
}

export const LeadQualificationWorkflow: React.FC<LeadQualificationWorkflowProps> = ({ 
  isVisible = true 
}) => {
  const [metrics] = useState<QualificationMetrics>({
    totalSent: 47,
    totalOpened: 35,
    totalClicked: 23,
    totalQualified: 12,
    averageScore: 7.8,
    responseTime: '2.3h'
  });
  
  const { botOptions, loading } = useAutomationBots();
  const { toast } = useToast();

  const openBotAnalytics = (botId: string) => {
    // Simulation d'ouverture des analytics du bot
    toast({
      title: "Analytics du Bot",
      description: "Ouverture des statistiques de qualification...",
    });
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-6">
      {/* En-tête du workflow */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Zap className="w-5 h-5 mr-2 text-purple-600" />
            Workflow de Qualification Automatisée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalSent}</div>
              <div className="text-sm text-gray-600">Messages envoyés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.totalClicked}</div>
              <div className="text-sm text-gray-600">Interactions bot</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.totalQualified}</div>
              <div className="text-sm text-gray-600">Leads qualifiés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.averageScore}/10</div>
              <div className="text-sm text-gray-600">Score moyen</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bots actifs dans le workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Bot className="w-5 h-5 mr-2" />
              Bots Automatisés Actifs ({botOptions.length})
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/automations'}>
              <ExternalLink className="w-4 h-4 mr-1" />
              Gérer
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Chargement des bots automatisés...
            </div>
          ) : botOptions.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">Aucun bot automatisé</h3>
              <p className="text-gray-600 mb-4">
                Créez votre premier bot automatisé pour commencer la qualification IA
              </p>
              <Button onClick={() => window.location.href = '/automations'}>
                Créer mon premier bot
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {botOptions.map((bot) => (
                <Card key={bot.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Bot className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{bot.name}</h4>
                          <Badge variant="default" className="text-xs">
                            Actif
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                      {bot.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Conversations:</span>
                        <span className="font-medium">
                          {Math.floor(Math.random() * 20) + 5}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Qualifications:</span>
                        <span className="font-medium text-green-600">
                          {Math.floor(Math.random() * 10) + 3}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Score moyen:</span>
                        <span className="font-medium text-blue-600">
                          {(Math.random() * 3 + 7).toFixed(1)}/10
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openBotAnalytics(bot.id)}
                        className="text-xs"
                      >
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Analytics
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(bot.public_chat_url, '_blank')}
                        className="text-xs"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Tester
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiques de performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 font-medium text-sm">Taux de conversion</p>
                <p className="text-2xl font-bold text-green-800">
                  {((metrics.totalQualified / metrics.totalSent) * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-xs text-green-600 mt-2">
              +12% vs période précédente
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 font-medium text-sm">Engagement</p>
                <p className="text-2xl font-bold text-blue-800">
                  {((metrics.totalClicked / metrics.totalOpened) * 100).toFixed(1)}%
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Taux de clic sur interaction
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-700 font-medium text-sm">Temps moyen</p>
                <p className="text-2xl font-bold text-orange-800">
                  {metrics.responseTime}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-xs text-orange-600 mt-2">
              Première réponse automatique
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Target className="w-6 h-6 text-blue-600" />
              <span className="text-sm">Nouvelle qualification</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <BarChart3 className="w-6 h-6 text-green-600" />
              <span className="text-sm">Rapport détaillé</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Bot className="w-6 h-6 text-purple-600" />
              <span className="text-sm">Créer nouveau bot</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Zap className="w-6 h-6 text-yellow-600" />
              <span className="text-sm">Optimiser workflow</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};