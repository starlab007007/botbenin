import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Star
} from 'lucide-react';

interface QualificationAnalyticsProps {
  campaigns: any[];
  results: any[];
}

export const QualificationAnalytics: React.FC<QualificationAnalyticsProps> = ({
  campaigns,
  results
}) => {
  const calculateGlobalStats = () => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalSent = campaigns.reduce((acc, c) => acc + c.totalSent, 0);
    const totalResponses = campaigns.reduce((acc, c) => acc + c.totalResponses, 0);
    const totalQualified = campaigns.reduce((acc, c) => acc + c.totalQualified, 0);
    const avgScore = campaigns.length > 0 
      ? campaigns.reduce((acc, c) => acc + c.averageScore, 0) / campaigns.length 
      : 0;

    const responseRate = totalSent > 0 ? (totalResponses / totalSent) * 100 : 0;
    const qualificationRate = totalResponses > 0 ? (totalQualified / totalResponses) * 100 : 0;

    return {
      totalCampaigns,
      activeCampaigns,
      totalSent,
      totalResponses,
      totalQualified,
      avgScore,
      responseRate,
      qualificationRate
    };
  };

  const calculateResultStats = () => {
    const completed = results.filter(r => r.status === 'completed').length;
    const partial = results.filter(r => r.status === 'partial').length;
    const noResponse = results.filter(r => r.status === 'no-response').length;

    const channelStats = {
      whatsapp: results.filter(r => r.channel === 'whatsapp').length,
      sms: results.filter(r => r.channel === 'sms').length,
      email: results.filter(r => r.channel === 'email').length
    };

    const scoreDistribution = {
      high: results.filter(r => r.score >= 8).length,
      medium: results.filter(r => r.score >= 5 && r.score < 8).length,
      low: results.filter(r => r.score > 0 && r.score < 5).length,
      none: results.filter(r => r.score === 0).length
    };

    return {
      completed,
      partial,
      noResponse,
      channelStats,
      scoreDistribution
    };
  };

  const stats = calculateGlobalStats();
  const resultStats = calculateResultStats();

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Campagnes</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalCampaigns}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <Badge variant={stats.activeCampaigns > 0 ? "default" : "secondary"}>
                {stats.activeCampaigns} actives
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux de Réponse</p>
                <p className="text-2xl font-bold text-green-600">{stats.responseRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-2">
              <Progress value={stats.responseRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Score Moyen</p>
                <p className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>
                  {stats.avgScore.toFixed(1)}/10
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-2">
              <Progress value={stats.avgScore * 10} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Leads Qualifiés</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalQualified}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <Badge variant="outline">
                {stats.qualificationRate.toFixed(1)}% de conversion
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analyses détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par statut */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Répartition par Statut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Complétées</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{resultStats.completed}</span>
                  <div className="w-24">
                    <Progress 
                      value={(resultStats.completed / results.length) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm">Partielles</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{resultStats.partial}</span>
                  <div className="w-24">
                    <Progress 
                      value={(resultStats.partial / results.length) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm">Pas de réponse</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{resultStats.noResponse}</span>
                  <div className="w-24">
                    <Progress 
                      value={(resultStats.noResponse / results.length) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Répartition par canal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Performance par Canal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">WhatsApp</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{resultStats.channelStats.whatsapp}</span>
                  <div className="w-24">
                    <Progress 
                      value={(resultStats.channelStats.whatsapp / results.length) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">SMS</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{resultStats.channelStats.sms}</span>
                  <div className="w-24">
                    <Progress 
                      value={(resultStats.channelStats.sms / results.length) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Email</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{resultStats.channelStats.email}</span>
                  <div className="w-24">
                    <Progress 
                      value={(resultStats.channelStats.email / results.length) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distribution des scores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="w-5 h-5 mr-2" />
              Distribution des Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Élevé (8-10)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{resultStats.scoreDistribution.high}</span>
                  <div className="w-24">
                    <Progress 
                      value={(resultStats.scoreDistribution.high / results.length) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Moyen (5-7)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{resultStats.scoreDistribution.medium}</span>
                  <div className="w-24">
                    <Progress 
                      value={(resultStats.scoreDistribution.medium / results.length) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Faible (1-4)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{resultStats.scoreDistribution.low}</span>
                  <div className="w-24">
                    <Progress 
                      value={(resultStats.scoreDistribution.low / results.length) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm">Aucun score</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{resultStats.scoreDistribution.none}</span>
                  <div className="w-24">
                    <Progress 
                      value={(resultStats.scoreDistribution.none / results.length) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top campagnes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Top Campagnes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaigns
                .sort((a, b) => b.totalQualified - a.totalQualified)
                .slice(0, 3)
                .map((campaign, index) => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-32">{campaign.name}</p>
                        <p className="text-xs text-gray-500">{campaign.totalQualified} qualifiés</p>
                      </div>
                    </div>
                    <Badge 
                      variant={campaign.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};