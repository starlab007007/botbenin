import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSimpleProspectAdder } from '@/hooks/useSimpleProspectAdder';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useGoogleSheetsWriter } from '@/hooks/useGoogleSheetsWriter';
import { useProspectEvaluationWebhook } from '@/hooks/useProspectEvaluationWebhook';
import { ProspectViewer } from './ProspectViewer';
import { WebhookConfigurationPanel } from './WebhookConfigurationPanel';
import { EvaluationResultsViewer } from './EvaluationResultsViewer';
import { 
  User, 
  Building, 
  Plus,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Phone,
  Zap,
  Play,
  Pause,
  Rocket,
  ArrowRight,
  Settings,
  Users,
  Eye,
  FileText,
  Cog,
  Sparkles,
  History
} from 'lucide-react';

type Step = 'add' | 'activate' | 'evaluate' | 'view';

interface RecentProspect {
  id: string;
  contact_name: string;
  company_name: string;
  timestamp: Date;
  runStatus?: boolean;
  isEvaluated?: boolean;
  linkedin_url?: string;
  website?: string;
}

interface IACallPreparationFormProps {
  spreadsheetId: string;
  sheetName: string;
}

export const IACallPreparationForm: React.FC<IACallPreparationFormProps> = ({
  spreadsheetId,
  sheetName
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('add');
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedProspect, setSelectedProspect] = useState<RecentProspect | null>(null);
  const [recentAdditions, setRecentAdditions] = useState<RecentProspect[]>([]);
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [showEvaluationResults, setShowEvaluationResults] = useState(false);

  const {
    isAdding,
    lastAddTime,
    addProspect
  } = useSimpleProspectAdder(user?.id);

  const {
    updateProspectField,
    isWriting
  } = useGoogleSheetsWriter(user?.id);

  const {
    data: sheetsData,
    refreshData: refetchSheets
  } = useGoogleSheets({ spreadsheetId, sheetName }, user?.id);

  const {
    webhookConfig,
    isLoading: isEvaluating,
    evaluationResults,
    evaluationHistory,
    setWebhookConfig,
    triggerEvaluation,
    testWebhook,
    clearResults,
    getProspectEvaluationHistory,
    hasBeenEvaluated
  } = useProspectEvaluationWebhook();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation basique
    if (!contactName.trim() || !companyName.trim()) {
      toast.error('Veuillez remplir le nom du contact et le nom de l\'entreprise');
      return;
    }

    // Vérifier les doublons récents
    const isDuplicate = recentAdditions.some(
      addition => 
        addition.contact_name.toLowerCase() === contactName.toLowerCase() &&
        addition.company_name.toLowerCase() === companyName.toLowerCase()
    );

    if (isDuplicate) {
      toast.error('Ce prospect a déjà été ajouté récemment');
      return;
    }

    const success = await addProspect({
      spreadsheetId,
      sheetName,
      contact_name: contactName.trim(),
      company_name: companyName.trim()
    });

    if (success) {
      // Ajouter à la liste des ajouts récents
      const newAddition: RecentProspect = {
        id: `recent_${Date.now()}`,
        contact_name: contactName.trim(),
        company_name: companyName.trim(),
        timestamp: new Date(),
        runStatus: false,
        isEvaluated: false
      };
      
      setRecentAdditions(prev => [newAddition, ...prev.slice(0, 4)]); // Garder seulement les 5 derniers
      setSelectedProspect(newAddition);
      
      // Réinitialiser le formulaire et passer à l'étape suivante
      setContactName('');
      setCompanyName('');
      setCurrentStep('activate');
      
      toast.success('Prospect ajouté avec succès ! Passez à l\'activation.');
    }
  };

  const handleActivateProspect = async (prospect: RecentProspect, activate: boolean) => {
    try {
      // D'abord récupérer les données à jour pour trouver l'ID correct
      await refetchSheets();
      
      if (!sheetsData || sheetsData.length === 0) {
        toast.error('Impossible de récupérer les données actuelles de Google Sheets');
        return;
      }

      // Trouver le prospect correspondant par nom et entreprise
      const matchingProspect = sheetsData.find((record: any) => 
        record.contact_name === prospect.contact_name && 
        record.company_name === prospect.company_name &&
        record.user_id === user?.id
      );

      if (!matchingProspect) {
        toast.error('Prospect non trouvé dans Google Sheets');
        return;
      }

      const success = await updateProspectField(
        { spreadsheetId, sheetName },
        matchingProspect.id,
        'Run',
        activate ? 'TRUE' : 'FALSE'
      );

      if (success) {
        // Mettre à jour le statut local immédiatement
        const updatedProspect = { ...prospect, runStatus: activate };
        
        setRecentAdditions(prev => prev.map(p => 
          p.id === prospect.id ? updatedProspect : p
        ));

        setSelectedProspect(updatedProspect);

        if (activate) {
          // Passer directement à l'étape évaluation
          setCurrentStep('evaluate');
          toast.success('Prospect activé ! Prêt pour l\'évaluation IA.');
        } else {
          // Retourner à l'étape activation si désactivé
          setCurrentStep('activate');
          toast.success('Prospect désactivé.');
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation:', error);
      toast.error('Erreur lors de l\'activation du prospect');
    }
  };

  const handleEvaluate = async () => {
    if (!selectedProspect) return;

    const success = await triggerEvaluation(
      {
        id: selectedProspect.id,
        contact_name: selectedProspect.contact_name,
        company_name: selectedProspect.company_name,
        linkedin_url: selectedProspect.linkedin_url,
        website: selectedProspect.website
      },
      (prospectId: string, value: string) => 
        updateProspectField(
          { spreadsheetId, sheetName },
          prospectId,
          'evaluation_status',
          value
        )
    );

    if (success) {
      toast.success('Évaluation IA réalisée avec succès !');
    }
  };

  const handleTestWebhook = async () => {
    const success = await testWebhook();
    if (success) {
      toast.success('Webhook configuré et fonctionnel !');
    }
  };

  const getTimeSinceAdd = (timestamp: Date): string => {
    const diff = Date.now() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `Il y a ${hours}h`;
  };

  const resetToAddStep = () => {
    setCurrentStep('add');
    setSelectedProspect(null);
    setContactName('');
    setCompanyName('');
  };

  // Retourner la vue des prospects si c'est l'étape sélectionnée
  if (currentStep === 'view') {
    return (
      <ProspectViewer 
        spreadsheetId={spreadsheetId}
        sheetName={sheetName}
        onBack={() => setCurrentStep('add')}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Indicateur d'étapes */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${currentStep === 'add' ? 'text-blue-600' : (currentStep === 'activate' || currentStep === 'evaluate') ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'add' ? 'bg-blue-100' : (currentStep === 'activate' || currentStep === 'evaluate') ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Ajouter</span>
            </div>
            
            <ArrowRight className="w-4 h-4 text-gray-400" />
            
            <div className={`flex items-center gap-2 ${currentStep === 'activate' ? 'text-blue-600' : currentStep === 'evaluate' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'activate' ? 'bg-blue-100' : currentStep === 'evaluate' ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Settings className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Activer</span>
            </div>
            
            <ArrowRight className="w-4 h-4 text-gray-400" />
            
            <div className={`flex items-center gap-2 ${currentStep === 'evaluate' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'evaluate' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Rocket className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Évaluer</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire principal */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            {currentStep === 'add' && <Phone className="w-8 h-8 text-white" />}
            {currentStep === 'activate' && <Settings className="w-8 h-8 text-white" />}
            {currentStep === 'evaluate' && <Rocket className="w-8 h-8 text-white" />}
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {currentStep === 'add' && 'Ajouter un Prospect'}
            {currentStep === 'activate' && 'Activer le Prospect'}
            {currentStep === 'evaluate' && 'Lancer l\'Évaluation IA'}
          </CardTitle>
          <p className="text-muted-foreground">
            {currentStep === 'add' && 'Saisissez les informations du prospect'}
            {currentStep === 'activate' && 'Activez le prospect pour l\'évaluation IA'}
            {currentStep === 'evaluate' && 'Démarrez l\'analyse IA du prospect'}
          </p>
        </CardHeader>
        <CardContent>
          {/* Étape 1: Ajouter */}
          {currentStep === 'add' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nom du contact */}
              <div className="space-y-2">
                <Label htmlFor="contact-name" className="flex items-center gap-2 text-sm font-medium">
                  <User className="w-4 h-4 text-blue-600" />
                  Nom du contact
                </Label>
                <Input
                  id="contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  disabled={isAdding}
                  className="h-12 text-base"
                  required
                />
              </div>

              {/* Nom de l'entreprise */}
              <div className="space-y-2">
                <Label htmlFor="company-name" className="flex items-center gap-2 text-sm font-medium">
                  <Building className="w-4 h-4 text-purple-600" />
                  Nom de l'entreprise
                </Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Acme Corporation"
                  disabled={isAdding}
                  className="h-12 text-base"
                  required
                />
              </div>

              {/* Bouton d'ajout */}
              <Button
                type="submit"
                disabled={isAdding || !contactName.trim() || !companyName.trim()}
                className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Ajout en cours...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Ajouter le prospect
                  </>
                )}
              </Button>
              
              {/* Actions complémentaires */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  type="button"
                  onClick={() => setCurrentStep('view')}
                  variant="outline"
                  className="h-12 text-base border-2 border-blue-200 hover:bg-blue-50"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Mes prospects
                </Button>
                
                <Button
                  type="button"
                  onClick={() => setShowWebhookConfig(true)}
                  variant="outline"
                  className="h-12 text-base border-2 border-purple-200 hover:bg-purple-50"
                >
                  <Cog className="w-5 h-5 mr-2" />
                  Configuration
                </Button>
                
                <Button
                  type="button"
                  onClick={() => setShowEvaluationResults(true)}
                  variant="outline"
                  className="h-12 text-base border-2 border-green-200 hover:bg-green-50"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Résultats ({evaluationResults.length})
                </Button>
              </div>
            </form>
          )}

          {/* Étape 2: Activer */}
          {currentStep === 'activate' && selectedProspect && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Prospect sélectionné</h3>
                <div className="text-blue-800">
                  <div className="font-medium">{selectedProspect.contact_name}</div>
                  <div className="text-sm">{selectedProspect.company_name}</div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Activez le prospect pour permettre à l'IA de commencer l'analyse
                </p>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleActivateProspect(selectedProspect, true)}
                    disabled={isWriting || selectedProspect.runStatus}
                    className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    {isWriting ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5 mr-2" />
                    )}
                    Démarrer
                  </Button>
                  
                  <Button
                    onClick={() => handleActivateProspect(selectedProspect, false)}
                    disabled={isWriting || !selectedProspect.runStatus}
                    variant="outline"
                    className="flex-1 h-12"
                  >
                    {isWriting ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Pause className="w-5 h-5 mr-2" />
                    )}
                    Arrêter
                  </Button>
                </div>

                <Button
                  onClick={resetToAddStep}
                  variant="ghost"
                  className="w-full"
                >
                  Ajouter un autre prospect
                </Button>
              </div>
            </div>
          )}

          {/* Étape 3: Évaluer */}
          {currentStep === 'evaluate' && selectedProspect && (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-2">Prospect activé</h3>
                <div className="text-green-800">
                  <div className="font-medium">{selectedProspect.contact_name}</div>
                  <div className="text-sm">{selectedProspect.company_name}</div>
                  <Badge className="mt-2 bg-green-100 text-green-800">
                    Status: {selectedProspect.runStatus ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Lancez maintenant l'évaluation IA pour analyser ce prospect
                </p>
                
                <Button
                  onClick={handleEvaluate}
                  disabled={isEvaluating || !selectedProspect.runStatus}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Évaluation en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      {hasBeenEvaluated(selectedProspect.id) ? 'Réévaluer' : 'Lancer l\'évaluation IA'}
                    </>
                  )}
                </Button>

                {!selectedProspect.runStatus && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    ⚠️ Le prospect doit être activé avant l'évaluation
                  </p>
                )}

                {/* Configuration webhook si non configuré */}
                {!webhookConfig?.url && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Configuration requise</span>
                    </div>
                    <p className="text-sm text-yellow-700 mb-3">
                      Configurez l'URL webhook pour activer l'évaluation IA
                    </p>
                    <Button
                      onClick={() => setShowWebhookConfig(true)}
                      size="sm"
                      variant="outline"
                      className="border-yellow-300 hover:bg-yellow-100"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurer maintenant
                    </Button>
                  </div>
                )}

                {/* Bouton historique si évaluations existantes */}
                {hasBeenEvaluated(selectedProspect.id) && (
                  <Button
                    onClick={() => setShowEvaluationResults(true)}
                    variant="outline"
                    className="w-full h-10 text-sm"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Voir l'historique ({getProspectEvaluationHistory(selectedProspect.id)?.evaluations.length || 0})
                  </Button>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => setCurrentStep('activate')}
                    variant="outline"
                    className="flex-1"
                  >
                    Retour à l'activation
                  </Button>
                  
                  <Button
                    onClick={resetToAddStep}
                    variant="ghost"
                    className="flex-1"
                  >
                    Nouveau prospect
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Statut global */}
          {(isAdding || isWriting || isEvaluating) && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center text-blue-700">
                <Clock className="w-4 h-4 mr-2" />
                {isAdding && 'Synchronisation en cours avec Google Sheets...'}
                {isWriting && 'Mise à jour du prospect...'}
                {isEvaluating && 'Évaluation IA en cours...'}
              </div>
            </div>
          )}

          {lastAddTime && !isAdding && currentStep === 'add' && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-center text-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Dernier ajout: {getTimeSinceAdd(lastAddTime)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ajouts récents */}
      {recentAdditions.length > 0 && currentStep === 'add' && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Prospects récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAdditions.map((addition, index) => (
                <div
                  key={addition.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    setSelectedProspect(addition);
                    setCurrentStep('activate');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      #{recentAdditions.length - index}
                    </Badge>
                    <div>
                      <div className="font-medium text-sm">{addition.contact_name}</div>
                      <div className="text-xs text-muted-foreground">{addition.company_name}</div>
                      <div className="flex gap-1 mt-1">
                        {addition.runStatus && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            Actif
                          </Badge>
                        )}
                        {addition.isEvaluated && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                            Évalué
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getTimeSinceAdd(addition.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Webhook */}
      <WebhookConfigurationPanel
        isOpen={showWebhookConfig}
        onClose={() => setShowWebhookConfig(false)}
      />

      {/* Résultats d'évaluation */}
      {showEvaluationResults && (
        <EvaluationResultsViewer
          results={evaluationResults}
          evaluationHistory={evaluationHistory}
          onClose={() => setShowEvaluationResults(false)}
        />
      )}

      {/* Instructions */}
      <Card className="border-0 shadow-sm bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <h4 className="font-semibold mb-1">Processus en 3 étapes :</h4>
              <ul className="space-y-1 text-amber-700">
                <li>• <strong>Ajouter :</strong> Saisir les informations du prospect</li>
                <li>• <strong>Activer :</strong> Démarrer/Arrêter le prospect (Run = True/False)</li>
                <li>• <strong>Évaluer :</strong> Lancer l'analyse IA via webhook</li>
                <li>• Les données sont synchronisées automatiquement avec Google Sheets</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};