import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Search, 
  Calendar,
  User,
  Activity,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';

interface LogEntry {
  id: string;
  admin_user_id: string;
  target_user_id?: string;
  action: string;
  details: any;
  created_at: string;
  ip_address?: unknown;
  user_agent?: string;
}

interface ActivityEntry {
  id: string;
  user_id: string;
  activity_type: string;
  description?: string;
  metadata: any;
  created_at: string;
}

export const SystemLogs: React.FC = () => {
  const [adminLogs, setAdminLogs] = useState<LogEntry[]>([]);
  const [userActivities, setUserActivities] = useState<ActivityEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'admin' | 'activity'>('admin');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer les logs admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (adminError) throw adminError;
      setAdminLogs(adminData || []);

      // Récupérer les activités utilisateurs récentes
      const { data: activityData, error: activityError } = await supabase
        .from('user_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (activityError) {
        console.warn('Impossible de charger les activités utilisateur:', activityError);
        setUserActivities([]);
      } else {
        setUserActivities(activityData || []);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les logs système",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'status_change': return <User className="w-4 h-4" />;
      case 'role_assigned': return <AlertTriangle className="w-4 h-4" />;
      case 'account_created': return <User className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'status_change': return 'bg-blue-100 text-blue-800';
      case 'role_assigned': return 'bg-red-100 text-red-800';
      case 'account_created': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAdminLogs = adminLogs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActivities = userActivities.filter(activity =>
    activity.activity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (activity.description && activity.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des logs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-blue-600" />
              <CardTitle>Logs Système</CardTitle>
            </div>
            <Button onClick={fetchLogs} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher dans les logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant={activeTab === 'admin' ? 'default' : 'outline'}
                onClick={() => setActiveTab('admin')}
                size="sm"
              >
                Logs Admin ({adminLogs.length})
              </Button>
              <Button
                variant={activeTab === 'activity' ? 'default' : 'outline'}
                onClick={() => setActiveTab('activity')}
                size="sm"
              >
                Activités ({userActivities.length})
              </Button>
            </div>
          </div>

          {/* Logs Administrateur */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              {filteredAdminLogs.map((log) => (
                <div 
                  key={log.id}
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-2">
                      Admin ID: {log.admin_user_id}
                      {log.target_user_id && ` → Utilisateur: ${log.target_user_id}`}
                    </p>
                    {log.details && (
                      <div className="bg-gray-50 rounded p-2 text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.ip_address && (
                      <p className="text-xs text-gray-500 mt-1">
                        IP: {String(log.ip_address)}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {filteredAdminLogs.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun log administrateur trouvé</p>
                </div>
              )}
            </div>
          )}

          {/* Activités Utilisateurs */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline">
                        {activity.activity_type}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(activity.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-1">
                      Utilisateur: {activity.user_id}
                    </p>
                    {activity.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {activity.description}
                      </p>
                    )}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="bg-gray-50 rounded p-2 text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(activity.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredActivities.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucune activité utilisateur trouvée</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};