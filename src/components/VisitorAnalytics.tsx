
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Eye, 
  TrendingUp, 
  Clock,
  MapPin,
  Monitor,
  Smartphone,
  Globe,
  BarChart3,
  Calendar,
  RefreshCw
} from 'lucide-react';

interface VisitorAnalytics {
  bot_id: string;
  bot_name: string;
  total_sessions: number;
  sessions_24h: number;
  sessions_7d: number;
  sessions_30d: number;
  unique_visitors: number;
  unique_visitors_24h: number;
  unique_visitors_7d: number;
  converted_sessions: number;
  conversion_rate_percent: number;
  avg_interactions_per_session: number;
  avg_time_spent_seconds: number;
  avg_pages_per_session: number;
  sessions_from_short_links: number;
  sessions_from_social: number;
  sessions_direct: number;
  last_visitor_activity: string;
  active_sessions: number;
}

interface VisitorAnalyticsProps {
  botId: string;
  botName: string;
}

export const VisitorAnalytics: React.FC<VisitorAnalyticsProps> = ({ botId, botName }) => {
  const [analytics, setAnalytics] = useState<VisitorAnalytics | null>(null);
  const [recentVisitors, setRecentVisitors] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchAnalytics();
    fetchRecentVisitors();
    fetchTopPages();
  }, [botId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bot_visitor_analytics')
        .select('*')
        .eq('bot_id', botId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setAnalytics(data);
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentVisitors = async () => {
    try {
      const timeFilter = new Date();
      switch (timeRange) {
        case '24h':
          timeFilter.setHours(timeFilter.getHours() - 24);
          break;
        case '7d':
          timeFilter.setDate(timeFilter.getDate() - 7);
          break;
        case '30d':
          timeFilter.setDate(timeFilter.getDate() - 30);
          break;
      }

      const { data, error } = await supabase
        .from('anonymous_visitor_sessions')
        .select(`
          id,
          entry_point,
          referrer_url,
          utm_source,
          utm_medium,
          utm_campaign,
          started_at,
          last_activity,
          total_interactions,
          time_spent_seconds,
          converted_to_lead,
          visitor_fingerprints!inner(
            browser_info,
            timezone,
            language,
            platform
          )
        `)
        .eq('bot_id', botId)
        .gte('started_at', timeFilter.toISOString())
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentVisitors(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des visiteurs récents:', error);
    }
  };

  const fetchTopPages = async () => {
    try {
      const timeFilter = new Date();
      switch (timeRange) {
        case '24h':
          timeFilter.setHours(timeFilter.getHours() - 24);
          break;
        case '7d':
          timeFilter.setDate(timeFilter.getDate() - 7);
          break;
        case '30d':
          timeFilter.setDate(timeFilter.getDate() - 30);
          break;
      }

      const { data, error } = await supabase
        .from('visitor_tracking_events')
        .select(`
          page_url,
          visitor_session_id,
          anonymous_visitor_sessions!inner(bot_id)
        `)
        .eq('anonymous_visitor_sessions.bot_id', botId)
        .eq('event_type', 'page_view')
        .gte('timestamp', timeFilter.toISOString());

      if (error) throw error;

      // Compter les pages vues
      const pageViewCounts = (data || []).reduce((acc: any, event: any) => {
        const url = event.page_url || 'Page inconnue';
        acc[url] = (acc[url] || 0) + 1;
        return acc;
      }, {});

      const sortedPages = Object.entries(pageViewCounts)
        .map(([url, count]) => ({ url, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);

      setTopPages(sortedPages);
    } catch (error) {
      console.error('Erreur lors du chargement des pages populaires:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceIcon = (browserInfo: any) => {
    const userAgent = browserInfo?.userAgent?.toLowerCase() || '';
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const getTrafficSourceColor = (entryPoint: string) => {
    switch (entryPoint) {
      case 'shortened_link': return 'bg-blue-100 text-blue-800';
      case 'social_share': return 'bg-purple-100 text-purple-800';
      case 'referral': return 'bg-green-100 text-green-800';
      case 'direct': return 'bg-gray-100 text-gray-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics des Visiteurs</h2>
        <div className="flex items-center space-x-2">
          <div className="flex rounded-lg border">
            {[
              { key: '24h', label: '24h' },
              { key: '7d', label: '7j' },
              { key: '30d', label: '30j' }
            ].map((range) => (
              <Button
                key={range.key}
                onClick={() => setTimeRange(range.key as any)}
                variant={timeRange === range.key ? "default" : "ghost"}
                size="sm"
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              >
                {range.label}
              </Button>
            ))}
          </div>
          <Button
            onClick={() => {
              fetchAnalytics();
              fetchRecentVisitors();
              fetchTopPages();
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Visiteurs Uniques</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {timeRange === '24h' ? analytics.unique_visitors_24h : 
                 timeRange === '7d' ? analytics.unique_visitors_7d : 
                 analytics.unique_visitors}
              </div>
              <div className="text-xs text-gray-500">
                {timeRange === '24h' ? 'Dernières 24h' : 
                 timeRange === '7d' ? 'Derniers 7 jours' : 
                 'Derniers 30 jours'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Eye className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Sessions</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {timeRange === '24h' ? analytics.sessions_24h : 
                 timeRange === '7d' ? analytics.sessions_7d : 
                 analytics.sessions_30d}
              </div>
              <div className="text-xs text-gray-500">
                {analytics.active_sessions} actives
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600">Taux de Conversion</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.conversion_rate_percent}%
              </div>
              <div className="text-xs text-gray-500">
                {analytics.converted_sessions} conversions
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-600">Temps Moyen</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatDuration(analytics.avg_time_spent_seconds)}
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(analytics.avg_interactions_per_session)} interactions
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sources de trafic */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Sources de Trafic</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {analytics.sessions_from_short_links}
                </div>
                <div className="text-sm text-gray-600">Liens Raccourcis</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {analytics.sessions_from_social}
                </div>
                <div className="text-sm text-gray-600">Réseaux Sociaux</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-gray-600 mb-1">
                  {analytics.sessions_direct}
                </div>
                <div className="text-sm text-gray-600">Trafic Direct</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visiteurs récents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Visiteurs Récents</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentVisitors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun visiteur récent pour cette période
            </div>
          ) : (
            <div className="space-y-3">
              {recentVisitors.map((visitor, index) => (
                <div key={visitor.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getDeviceIcon(visitor.visitor_fingerprints?.browser_info)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getTrafficSourceColor(visitor.entry_point)}>
                          {visitor.entry_point}
                        </Badge>
                        {visitor.utm_source && (
                          <Badge variant="outline" className="text-xs">
                            {visitor.utm_source}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {visitor.visitor_fingerprints?.timezone} • {visitor.visitor_fingerprints?.language}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-900">
                      {formatDuration(visitor.time_spent_seconds)} • {visitor.total_interactions} interactions
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(visitor.started_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pages populaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>Pages Populaires</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune donnée de page pour cette période
            </div>
          ) : (
            <div className="space-y-2">
              {topPages.map((page: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 truncate">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {page.url.replace(/^https?:\/\/[^\/]+/, '')} 
                    </div>
                  </div>
                  <div className="text-sm font-bold text-blue-600">
                    {page.count} vues
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
