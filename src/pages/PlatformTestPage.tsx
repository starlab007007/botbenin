import React, { useState } from 'react';
import { CompletePlatformTest } from '@/components/testing/CompletePlatformTest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFrontendIntegrationTest } from '@/hooks/useFrontendIntegrationTest';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Play,
  RotateCcw,
  Layers,
  Server
} from 'lucide-react';

export const PlatformTestPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('frontend');
  const frontendTest = useFrontendIntegrationTest();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'running': return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const testsByCategory = frontendTest.tests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, typeof frontendTest.tests>);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Tests Complets de la Plateforme</h1>
        <p className="text-muted-foreground">Tests de bout en bout Backend + Frontend</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="frontend" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Tests Frontend-Backend
          </TabsTrigger>
          <TabsTrigger value="backend" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Tests Backend
          </TabsTrigger>
        </TabsList>

        <TabsContent value="frontend" className="space-y-6">
          {/* Stats Frontend */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total', value: frontendTest.stats.total, color: 'text-foreground' },
              { label: 'Réussis', value: frontendTest.stats.success, color: 'text-green-500' },
              { label: 'Échoués', value: frontendTest.stats.error, color: 'text-red-500' },
              { label: 'Avertissements', value: frontendTest.stats.warning, color: 'text-yellow-500' },
              { label: 'En cours', value: frontendTest.stats.pending, color: 'text-blue-500' },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-6 text-center">
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Controls Frontend */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Tests d'intégration Frontend-Backend</h3>
                  <p className="text-sm text-muted-foreground">
                    Teste toutes les interactions UI avec le backend Supabase
                  </p>
                  {frontendTest.isRunning && <Progress value={frontendTest.progress} className="mt-4" />}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={frontendTest.resetTests} 
                    variant="outline" 
                    size="lg" 
                    disabled={frontendTest.isRunning}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Réinitialiser
                  </Button>
                  <Button 
                    onClick={frontendTest.runAllTests} 
                    disabled={frontendTest.isRunning} 
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {frontendTest.isRunning ? 'En cours...' : 'Lancer'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Frontend */}
          {Object.entries(testsByCategory).map(([category, categoryTests]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {category}
                  <Badge variant="outline" className="ml-auto">{categoryTests.length} tests</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryTests.map((test, idx) => (
                    <Alert 
                      key={idx}
                      variant={test.status === 'error' ? 'destructive' : 'default'}
                      className={test.status === 'success' ? 'border-green-500' : test.status === 'warning' ? 'border-yellow-500' : ''}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(test.status)}
                        <div className="flex-1">
                          <AlertTitle className="text-sm font-semibold">{test.name}</AlertTitle>
                          {test.message && <AlertDescription className="text-xs">{test.message}</AlertDescription>}
                          {test.duration && <div className="text-xs text-muted-foreground mt-1">Durée: {test.duration}ms</div>}
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="backend">
          <CompletePlatformTest />
        </TabsContent>
      </Tabs>
    </div>
  );
};
