import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { VideoScriptGenerator } from './VideoScriptGenerator';
import { VoiceSelector } from './VoiceSelector';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { useVideoAssembly } from '@/hooks/useVideoAssembly';

interface VideoProductionWizardProps {
  videoId: string;
  onComplete?: (videoUrl: string) => void;
}

type WizardStep = 'frames' | 'template' | 'script' | 'audio' | 'assemble';

const STEPS: { id: WizardStep; title: string; description: string }[] = [
  { id: 'frames', title: 'Frames', description: 'Génération des 4 images' },
  { id: 'template', title: 'Template', description: 'Choix du style et de la musique' },
  { id: 'script', title: 'Script', description: 'Génération et édition du texte' },
  { id: 'audio', title: 'Audio', description: 'Choix de la voix et génération' },
  { id: 'assemble', title: 'Assemblage', description: 'Création de la vidéo finale' }
];

export const VideoProductionWizard = ({ videoId, onComplete }: VideoProductionWizardProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('frames');
  const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([]);
  
  // États pour chaque étape
  const [framesData, setFramesData] = useState<any>(null);
  const [templateData, setTemplateData] = useState<any>(null);
  const [scriptData, setScriptData] = useState<any>(null);
  const [audioData, setAudioData] = useState<any>(null);
  
  const { generatedFrames, hasAllFrames, loadExistingFrames } = useVideoGeneration();
  const { assembleVideo, isAssembling, assemblyStatus } = useVideoAssembly();

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const markStepComplete = (step: WizardStep) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      markStepComplete(currentStep);
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'frames':
        return hasAllFrames(videoId);
      case 'template':
        return templateData !== null;
      case 'script':
        return scriptData !== null;
      case 'audio':
        return audioData !== null;
      default:
        return false;
    }
  };

  const handleAssemble = async () => {
    if (!framesData || !templateData || !scriptData || !audioData) {
      return;
    }

    const result = await assembleVideo({
      videoId,
      videoTitle: `Video ${videoId}`,
      frames: framesData,
      config: templateData,
      templateId: templateData?.template || 'default',
      musicId: templateData?.musicId || 'default'
    });

    if (result) {
      markStepComplete('assemble');
      onComplete?.(result.dataUrl || '');
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Production Vidéo - Étape {currentStepIndex + 1}/{STEPS.length}</CardTitle>
              <CardDescription>{STEPS[currentStepIndex].description}</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {Math.round(progress)}%
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  index <= currentStepIndex ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    completedSteps.includes(step.id)
                      ? 'bg-green-500 text-white'
                      : index === currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {completedSteps.includes(step.id) ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="text-xs text-center">{step.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 'frames' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Génération des Frames</h3>
              <p className="text-muted-foreground">
                Les frames doivent être générées sur la page de production vidéo
              </p>
              <Button onClick={() => markStepComplete('frames')}>
                Marquer comme terminé
              </Button>
            </div>
          )}

          {currentStep === 'template' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choix du Template et de la Musique</h3>
              <p className="text-muted-foreground">
                Sélectionnez votre template et musique
              </p>
              <Button onClick={() => {
                setTemplateData({ template: 'default', musicId: 'default' });
                markStepComplete('template');
              }}>
                Utiliser les paramètres par défaut
              </Button>
            </div>
          )}

          {currentStep === 'script' && (
            <div className="space-y-4">
              <VideoScriptGenerator videoId={videoId} frames={{ hero: '', demo: '', result: '', cta: '' }} />
              <Button onClick={() => {
                setScriptData({ text: 'Script généré' });
                markStepComplete('script');
              }}>
                Valider le script
              </Button>
            </div>
          )}

          {currentStep === 'audio' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choix de la Voix</h3>
              <VoiceSelector
                selectedVoiceId={audioData?.voiceId || ''}
                onVoiceSelect={(voiceId) => {
                  setAudioData({ ...audioData, voiceId });
                }}
              />
              {audioData?.voiceId && scriptData && (
                <Button
                  onClick={() => {
                    // Générer l'audio ici
                    markStepComplete('audio');
                  }}
                >
                  Générer l'audio
                </Button>
              )}
            </div>
          )}

          {currentStep === 'assemble' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Récapitulatif et Assemblage</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Frames</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">4 frames générées</Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Template</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">{templateData?.template}</Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Script</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm line-clamp-2">{scriptData?.text}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Voix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">{audioData?.voiceId}</Badge>
                  </CardContent>
                </Card>
              </div>

              {assemblyStatus && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>{assemblyStatus.message}</span>
                        <span>{Math.round(assemblyStatus.progress)}%</span>
                      </div>
                      <Progress value={assemblyStatus.progress} />
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleAssemble}
                disabled={isAssembling}
                className="w-full"
                size="lg"
              >
                {isAssembling ? 'Assemblage en cours...' : '🎬 Assembler la vidéo finale'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={currentStepIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>

        <Button
          onClick={goToNextStep}
          disabled={!canProceed() || currentStepIndex === STEPS.length - 1}
        >
          Suivant
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};