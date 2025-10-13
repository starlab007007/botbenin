import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SystemLogsViewer } from '@/components/admin/SystemLogsViewer';
import { ActivityDashboard } from '@/components/admin/ActivityDashboard';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

export default function SystemLogsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleExportLogs = () => {
    // TODO: Implement CSV export
    console.log('Export logs as CSV');
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs Système</h1>
          <p className="text-muted-foreground">
            Surveillance et analyse des activités de la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="logs">Logs Détaillés</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <ActivityDashboard />
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs Système Détaillés</CardTitle>
              <CardDescription>
                Authentification, PostgreSQL et activités utilisateur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemLogsViewer />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
