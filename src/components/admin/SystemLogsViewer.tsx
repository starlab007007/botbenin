import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle, Info, XCircle, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LogEntry {
  timestamp: string;
  level: string;
  msg: string;
  error?: string;
  status?: string;
  path?: string;
  error_severity?: string;
  event_message?: string;
}

export const SystemLogsViewer: React.FC = () => {
  const [authLogs, setAuthLogs] = useState<LogEntry[]>([]);
  const [postgresLogs, setPostgresLogs] = useState<LogEntry[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // Récupérer les logs d'authentification
      const { data: authData } = await supabase.functions.invoke('supabase-analytics-query', {
        body: { logType: 'auth' }
      });

      if (authData?.data) {
        setAuthLogs(authData.data);
      }

      // Récupérer les logs postgres
      const { data: pgData } = await supabase.functions.invoke('supabase-analytics-query', {
        body: { logType: 'postgres' }
      });

      if (pgData?.data) {
        setPostgresLogs(pgData.data);
      }

      // Récupérer les logs d'activité
      const { data: accessData, error: accessError } = await supabase
        .from('access_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (accessError) {
        console.error('Error fetching access logs:', accessError);
      } else {
        setAccessLogs(accessData || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'info':
        return <Info className="w-4 h-4 text-primary" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: number | string) => {
    const date = new Date(typeof timestamp === 'number' ? timestamp / 1000 : timestamp);
    return date.toLocaleString('fr-FR');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Logs Système</CardTitle>
            <CardDescription>
              Surveillance des erreurs d'authentification et de base de données
            </CardDescription>
          </div>
          <Button
            onClick={fetchLogs}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="auth" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="auth">
              Authentification ({authLogs.length})
            </TabsTrigger>
            <TabsTrigger value="postgres">
              PostgreSQL ({postgresLogs.length})
            </TabsTrigger>
            <TabsTrigger value="access">
              <Activity className="w-4 h-4 mr-2" />
              Activités ({accessLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auth" className="mt-4">
            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
              {authLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Aucun log disponible
                </div>
              ) : (
                <div className="space-y-3">
                  {authLogs.map((log, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getLevelIcon(log.level)}
                          <Badge variant={log.status === '500' ? 'destructive' : 'secondary'}>
                            {log.status || log.level}
                          </Badge>
                          {log.path && (
                            <Badge variant="outline">{log.path}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{log.msg}</p>
                      {log.error && (
                        <p className="text-xs text-destructive bg-destructive/10 p-2 rounded mt-2">
                          {log.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="postgres" className="mt-4">
            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
              {postgresLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Aucun log disponible
                </div>
              ) : (
                <div className="space-y-3">
                  {postgresLogs.map((log, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="outline">{log.error_severity}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">{log.event_message}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
        </TabsContent>

        <TabsContent value="access">
          <ScrollArea className="h-[600px] w-full">
            <div className="space-y-4">
              {accessLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun log d'activité disponible
                </p>
              ) : (
                accessLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Activity className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">{log.action}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>User ID: {log.user_id}</p>
                          <p>IP: {log.ip_address}</p>
                          {log.details?.path && <p>Path: {log.details.path}</p>}
                          {log.user_agent && (
                            <p className="text-xs truncate">Agent: {log.user_agent}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
  );
};
