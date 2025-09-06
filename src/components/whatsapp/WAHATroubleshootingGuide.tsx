import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  Lightbulb, 
  Settings,
  Zap,
  FileText,
  ExternalLink
} from 'lucide-react';

interface TroubleshootingStep {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  solution: string;
  checked?: boolean;
}

const WAHATroubleshootingGuide: React.FC = () => {
  const [openSections, setOpenSections] = useState<string[]>(['common-issues']);
  const [checkedSteps, setCheckedSteps] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleStepCheck = (stepId: string) => {
    setCheckedSteps(prev => 
      prev.includes(stepId)
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const commonIssues: TroubleshootingStep[] = [
    {
      id: 'session-not-exists',
      title: '404 - Session n\'existe pas',
      description: 'Erreur 404 sur tous les endpoints QR, la session n\'est pas créée sur le serveur WAHA.',
      severity: 'error',
      solution: 'Cliquez sur "Test Complet" → La session sera créée automatiquement puis le QR généré.'
    },
    {
      id: 'api-key-invalid',
      title: '401 Unauthorized - Clé API invalide',
      description: 'La clé API WAHA n\'est pas configurée ou incorrecte.',
      severity: 'error',
      solution: 'Vérifiez que la variable WAHA_API_KEY est correctement configurée dans les secrets Supabase.'
    },
    {
      id: 'wrong-endpoints',
      title: 'Endpoints incorrects',
      description: 'Les anciens endpoints /api/sessions/{name}/auth/qr ne fonctionnent plus.',
      severity: 'warning',
      solution: 'Utilisez les nouveaux endpoints: POST /api/{session}/auth/qr (sans "sessions" dans l\'URL).'
    },
    {
      id: 'session-not-started',
      title: 'Session non démarrée',
      description: 'La session existe mais n\'est pas en état SCAN_QR_CODE.',
      severity: 'warning',
      solution: 'Démarrez d\'abord la session avec "Start Session", puis récupérez le QR.'
    }
  ];

  const diagnosticSteps: TroubleshootingStep[] = [
    {
      id: 'test-connection',
      title: 'Test de connectivité WAHA',
      description: 'Vérifier que l\'API WAHA répond correctement',
      severity: 'info',
      solution: 'Cliquez sur "1. Test Connexion" dans le diagnostic complet'
    },
    {
      id: 'create-session',
      title: 'Création de session de test',
      description: 'Créer une session avec un nom unique pour éviter les conflits',
      severity: 'info', 
      solution: 'Utilisez "2. Créer Session" avec un nom unique (ex: test_2025_01_06)'
    },
    {
      id: 'start-session',
      title: 'Démarrage de session',
      description: 'S\'assurer que la session est en état actif',
      severity: 'info',
      solution: 'La session doit être démarrée avant de pouvoir générer un QR'
    },
    {
      id: 'get-qr',
      title: 'Récupération du QR Code',
      description: 'Obtenir le QR Code une fois la session active',
      severity: 'info',
      solution: 'Utilisez "3. Récupérer QR" ou le bouton "Test Complet" automatique'
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Guide de Résolution - QR Code WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              <strong>Solution Rapide:</strong> Utilisez le bouton "🎯 Test Complet" dans le diagnostic ci-dessus. 
              Il résout automatiquement la plupart des problèmes en créant une nouvelle session et en générant le QR.
            </AlertDescription>
          </Alert>

          {/* Section Problèmes Courants */}
          <Collapsible 
            open={openSections.includes('common-issues')}
            onOpenChange={() => toggleSection('common-issues')}
          >
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Problèmes Courants & Solutions
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${
                  openSections.includes('common-issues') ? 'rotate-180' : ''
                }`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              {commonIssues.map((issue) => (
                <div key={issue.id} className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start gap-3">
                    <Badge variant={
                      issue.severity === 'error' ? 'destructive' : 
                      issue.severity === 'warning' ? 'secondary' : 'default'
                    }>
                      {issue.severity === 'error' ? 'Critique' :
                       issue.severity === 'warning' ? 'Attention' : 'Info'}
                    </Badge>
                    <div className="flex-1">
                      <h4 className="font-semibold">{issue.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border-l-4 border-green-500">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          <strong>Solution:</strong> {issue.solution}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Section Étapes de Diagnostic */}
          <Collapsible 
            open={openSections.includes('diagnostic-steps')}
            onOpenChange={() => toggleSection('diagnostic-steps')}
          >
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-500" />
                  Étapes de Diagnostic Détaillé
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${
                  openSections.includes('diagnostic-steps') ? 'rotate-180' : ''
                }`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {diagnosticSteps.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    checkedSteps.includes(step.id) 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300' 
                      : 'bg-background hover:bg-muted/50'
                  }`}
                  onClick={() => toggleStepCheck(step.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      checkedSteps.includes(step.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {checkedSteps.includes(step.id) ? '✓' : index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      <p className="text-xs text-blue-600 mt-1">{step.solution}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Section Configuration */}
          <Collapsible 
            open={openSections.includes('configuration')}
            onOpenChange={() => toggleSection('configuration')}
          >
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  Vérification de Configuration
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${
                  openSections.includes('configuration') ? 'rotate-180' : ''
                }`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Variables d'Environnement Requises
                  </h4>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <code className="text-sm">WAHA_BASE_URL</code>
                      <Badge variant="outline">https://waha.bot.bj</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <code className="text-sm">WAHA_API_KEY</code>
                      <Badge variant="secondary">Requis</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <code className="text-sm">WAHA_DASHBOARD_USERNAME</code>
                      <Badge variant="outline">admin</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <code className="text-sm">WAHA_DASHBOARD_PASSWORD</code>
                      <Badge variant="outline">***</Badge>
                    </div>
                  </div>
                </div>

                <Alert>
                  <ExternalLink className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Configuration Supabase:</strong> Les variables d'environnement doivent être 
                    configurées dans les secrets des Edge Functions Supabase.
                    <Button variant="link" size="sm" className="p-0 h-auto ml-1">
                      Ouvrir les secrets →
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
};

export default WAHATroubleshootingGuide;