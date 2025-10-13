import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityStats {
  totalActions: number;
  activeUsers: number;
  topActions: Array<{ action: string; count: number }>;
  recentActivities: Array<{
    id: string;
    action: string;
    timestamp: string;
    user_id: string;
    details: any;
  }>;
}

export const ActivityDashboard = () => {
  const [stats, setStats] = useState<ActivityStats>({
    totalActions: 0,
    activeUsers: 0,
    topActions: [],
    recentActivities: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setIsLoading(true);

      // Total actions aujourd'hui
      const { count: totalActions } = await supabase
        .from('access_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      // Utilisateurs actifs aujourd'hui
      const { data: activeUsersData } = await supabase
        .from('access_logs')
        .select('user_id')
        .gte('timestamp', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
      
      const uniqueUsers = new Set(activeUsersData?.map(log => log.user_id)).size;

      // Top actions
      const { data: logsData } = await supabase
        .from('access_logs')
        .select('action')
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const actionCounts = logsData?.reduce((acc: any, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {});

      const topActions = Object.entries(actionCounts || {})
        .map(([action, count]) => ({ action, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Activités récentes
      const { data: recentActivities } = await supabase
        .from('access_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      setStats({
        totalActions: totalActions || 0,
        activeUsers: uniqueUsers,
        topActions,
        recentActivities: recentActivities || []
      });
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions Aujourd'hui</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs Actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Principale</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {stats.topActions[0]?.action || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.topActions[0]?.count || 0} fois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Statut</CardTitle>
            <AlertCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium text-green-500">Opérationnel</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Actions</CardTitle>
            <CardDescription>7 derniers jours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topActions.map((action, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm font-medium">{action.action}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{action.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activités Récentes</CardTitle>
            <CardDescription>Dernières 10 actions</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 text-sm">
                    <Activity className="h-4 w-4 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString('fr-FR')}
                      </p>
                      {activity.details?.path && (
                        <p className="text-xs text-muted-foreground">
                          {activity.details.path}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
