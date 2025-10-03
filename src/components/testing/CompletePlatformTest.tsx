import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { usePlatformTest, TestResult } from '@/hooks/usePlatformTest';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Play,
  RotateCcw,
  Database,
  Users,
  Bot,
  MessageSquare,
  Settings,
  Shield,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const CompletePlatformTest: React.FC = () => {
  const { tests, isRunning, progress, stats, runAllTests, resetTests } = usePlatformTest();
  const { toast } = useToast();

  const handleRunTests = async () => {
    try {
      await runAllTests();
      toast({
        title: 'Tests terminés',
        description: `✅ ${stats.success} réussis • ❌ ${stats.error} échoués`,
        variant: stats.error === 0 ? 'default' : 'destructive'
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'running': return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      'Authentification': Shield,
      'Permissions': Shield,
      'Base de données': Database,
      'Gestion utilisateurs': Users,
      'Messagerie': MessageSquare,
      'WhatsApp': MessageSquare,
      'Analytics': FileText,
      'Edge Functions': Settings,
    };
    const Icon = icons[category] || Bot;
    return <Icon className="h-5 w-5" />;
  };

  const testsByCategory = tests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, TestResult[]>);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Tests Complets de la Plateforme</h1>
        <p className="text-muted-foreground">Test de bout en bout de toutes les fonctionnalités</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Réussis', value: stats.success, color: 'text-green-500' },
          { label: 'Échoués', value: stats.error, color: 'text-red-500' },
          { label: 'Avertissements', value: stats.warning, color: 'text-yellow-500' },
          { label: 'En cours', value: stats.pending, color: 'text-blue-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6 text-center">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Lancer les tests complets</h3>
              <p className="text-sm text-muted-foreground">
                Exécute tous les tests de validation
              </p>
              {isRunning && <Progress value={progress} className="mt-4" />}
            </div>
            <div className="flex gap-2">
              <Button onClick={resetTests} variant="outline" size="lg" disabled={isRunning}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
              <Button onClick={handleRunTests} disabled={isRunning} size="lg">
                <Play className="h-4 w-4 mr-2" />
                {isRunning ? 'En cours...' : 'Lancer'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {Object.entries(testsByCategory).map(([category, categoryTests]) => (
        <Card key={category} className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getCategoryIcon(category)}
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
    </div>
  );
};
