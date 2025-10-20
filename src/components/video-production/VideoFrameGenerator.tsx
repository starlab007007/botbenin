import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Sparkles, Eye, Loader2, Film, Info, Palette, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { VideoProduction } from '@/types/video-production';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VideoFrameGeneratorProps {
  video: VideoProduction;
  onFramesReady?: (frames: any[]) => void;
}

export const VideoFrameGenerator: React.FC<VideoFrameGeneratorProps> = ({ video, onFramesReady }) => {
  const { user } = useAuth();
  const { 
    isGenerating, 
    isLoading,
    generatedFrames, 
    generateAllFramesForVideo,
    loadExistingFrames,
    hasAllFrames
  } = useVideoGeneration();
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showCreatorDialog, setShowCreatorDialog] = useState(false);
  const [selectedFrameType, setSelectedFrameType] = useState<'hero' | 'demo' | 'result' | 'cta' | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  const frames = generatedFrames[video.id] || [];

  // Load existing frames on mount
  useEffect(() => {
    loadExistingFrames(video.id);
  }, [video.id]);

  const buildPrompts = () => {
    const baseStyle = `Modern mobile-first design, vertical 9:16 format 1080x1920, 
vibrant colors with Bot.BJ branding (green #10B981, blue #3B82F6, orange #F59E0B), 
clean UI, professional quality, high resolution.

CONTEXTE AFRICAIN/BÉNINOIS OBLIGATOIRE:
- Personnages: Africains diversifiés, entrepreneurs béninois
- Décor: Environnement urbain béninois (Cotonou, Porto-Novo, marchés animés)
- Commerce: Maquis, boutiques, restaurants locaux
- Couleurs: Vives et chaleureuses, reflets de l'Afrique
- Textes: UNIQUEMENT en français, devise en CFA
- Éviter: Contextes européens/américains, personnes non-africaines
- Style: Moderne mais authentique, professionnel mais chaleureux
- Éléments: Smartphones, commerce moderne africain, entrepreneurs locaux`;
    
    return [
      {
        frameType: 'hero' as const,
        prompt: `Hero frame for "${video.title}": ${video.hook}. ${baseStyle}. Bold text overlay, eye-catching visual.`
      },
      {
        frameType: 'demo' as const,
        prompt: `Demo screenshot for "${video.title}": Show ${video.content[0]}. ${baseStyle}. UI mockup, interface elements visible.`
      },
      {
        frameType: 'result' as const,
        prompt: `Result visualization for "${video.title}": ${video.content[video.content.length - 1]}. ${baseStyle}. Success indicators, metrics, positive outcome.`
      },
      {
        frameType: 'cta' as const,
        prompt: `Call-to-action frame for "${video.title}": ${video.cta}. ${baseStyle}. Clear button, Logo Bot.BJ visible, compelling visual.`
      }
    ];
  };

  const handleGenerateAll = async () => {
    setGenerationProgress(0);
    const prompts = buildPrompts();
    
    // Generate only missing frames
    const missingFrameTypes = ['hero', 'demo', 'result', 'cta'].filter(
      type => !frames.some(f => f.frameType === type)
    );

    if (missingFrameTypes.length === 0) {
      toast.info('Toutes les frames sont déjà générées!');
      return;
    }

    const missingPrompts = prompts.filter(p => 
      missingFrameTypes.includes(p.frameType)
    );
    
    for (let i = 0; i < missingPrompts.length; i++) {
      await generateAllFramesForVideo(video.id, [missingPrompts[i]]);
      setGenerationProgress(((i + 1) / missingPrompts.length) * 100);
    }

    toast.success('✅ Toutes les frames sont générées!');
  };

  const handleContinueToVideo = () => {
    console.log('🎬 Continuer vers création vidéo', { frames, videoId: video.id });
    if (onFramesReady) {
      onFramesReady(frames);
    } else {
      console.error('❌ onFramesReady callback not provided');
    }
  };

  const downloadFrame = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenCreator = (frameType: 'hero' | 'demo' | 'result' | 'cta') => {
    setSelectedFrameType(frameType);
    const prompts = buildPrompts();
    const framePrompt = prompts.find(p => p.frameType === frameType);
    setCustomPrompt(framePrompt?.prompt || '');
    setShowCreatorDialog(true);
  };

  const handleGenerateWithCreator = async () => {
    if (!customPrompt.trim() || !selectedFrameType || !user) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    // Vérifier que la session existe
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Vous devez être connecté pour utiliser l\'IA Créateur');
      return;
    }

    // Vérifier les limites
    const { data: limitCheck, error: limitError } = await supabase.rpc('check_ia_creator_limit', {
      p_user_id: user.id,
      p_creation_type: 'image',
    }) as { data: { allowed: boolean; unlimited: boolean; used?: number; limit?: number; remaining?: number; } | null; error: any };

    if (limitError) {
      console.error('Erreur vérification limites:', limitError);
      toast.error('Erreur lors de la vérification des limites');
      return;
    }

    if (limitCheck && !limitCheck.allowed && !limitCheck.unlimited) {
      toast.error(
        `Limite atteinte : ${limitCheck.used}/${limitCheck.limit} images ce mois. Passez à un pack supérieur !`,
        { duration: 5000 }
      );
      return;
    }

    setIsGeneratingCustom(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-visual-content', {
        body: { 
          prompt: customPrompt,
          format: 'instagram-story',
          style: 'professional'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        // Sauvegarder dans video_frames
        const { error: saveError } = await supabase
          .from('video_frames')
          .insert({
            video_id: video.id,
            frame_type: selectedFrameType,
            image_url: data.imageUrl,
            prompt: customPrompt,
            storage_path: '',
            user_id: user.id
          });

        if (saveError) throw saveError;

        // Incrémenter le compteur d'utilisation
        await supabase.rpc('increment_ia_creator_usage', {
          p_user_id: user.id,
          p_creation_type: 'image',
          p_file_size_mb: 0.5,
        });

        await loadExistingFrames(video.id);
        toast.success(`✅ Frame ${selectedFrameType} générée avec IA Créateur!`);
        setShowCreatorDialog(false);
        setCustomPrompt('');
        setSelectedFrameType(null);
      }
    } catch (error) {
      console.error('Erreur génération:', error);
      toast.error('Erreur lors de la génération avec IA Créateur');
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Génération IA - {video.title}
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerateAll}
            disabled={isGenerating || isLoading}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'Génération...' : 
             hasAllFrames(video.id) ? '♻️ Regénérer' : 'Générer toutes les frames'}
          </Button>

          {hasAllFrames(video.id) && (
            <Button 
              onClick={handleContinueToVideo}
              variant="default"
              className="gap-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            >
              <Film className="h-4 w-4" />
              Continuer → Créer la vidéo
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {frames.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {hasAllFrames(video.id) 
                ? '✅ 4/4 frames générées - Prêt pour la vidéo!'
                : `⏳ ${frames.length}/4 frames générées`}
            </AlertDescription>
          </Alert>
        )}

        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Génération en cours...</span>
              <span>{Math.round(generationProgress)}%</span>
            </div>
            <Progress value={generationProgress} />
          </div>
        )}

        {/* Frame Generation Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Frames à générer</h4>
            <Button 
              onClick={() => setShowCreatorDialog(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Palette className="h-4 w-4" />
              Utiliser IA Créateur
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {['hero', 'demo', 'result', 'cta'].map((frameType) => {
              const existingFrame = frames.find(f => f.frameType === frameType);
              return (
                <div key={frameType} className="space-y-2">
                  {existingFrame ? (
                    <div className="relative group">
                      <img 
                        src={existingFrame.imageUrl}
                        alt={`${frameType} frame`}
                        className="w-full rounded-lg border shadow-sm"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(existingFrame.imageUrl, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => downloadFrame(existingFrame.imageUrl, `${video.id}-${frameType}.png`)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenCreator(frameType as any)}
                        >
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-video rounded-lg border-2 border-dashed border-muted flex flex-col items-center justify-center gap-2 p-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCreator(frameType as any)}
                        className="gap-2"
                      >
                        <Palette className="h-4 w-4" />
                        Créer avec IA
                      </Button>
                    </div>
                  )}
                  <Badge variant="secondary" className="capitalize">
                    {frameType}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Video Info */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Hook</p>
            <p className="font-semibold">{video.hook}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Contenu</p>
            <ul className="text-sm space-y-1">
              {video.content.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">CTA</p>
            <p className="font-semibold text-primary">{video.cta}</p>
          </div>
        </div>
      </CardContent>

      {/* IA Creator Dialog */}
      <Dialog open={showCreatorDialog} onOpenChange={setShowCreatorDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              IA Créateur - Frame {selectedFrameType?.toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              Personnalisez votre prompt pour générer une frame unique avec l'IA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                💡 Utilisez l'IA Créateur pour générer des frames personnalisées avec un contrôle total sur le style et le contenu
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="custom" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="custom">✨ Prompt Personnalisé</TabsTrigger>
                <TabsTrigger value="auto">🤖 Prompt Auto</TabsTrigger>
              </TabsList>

              <TabsContent value="custom" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Décrivez votre frame</label>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ex: Une image dynamique montrant un entrepreneur béninois utilisant Bot.BJ sur son téléphone, fond moderne avec couleurs vertes et bleues..."
                    className="min-h-32"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomPrompt('Image promotionnelle pour Bot.BJ, entrepreneur africain avec smartphone, arrière-plan moderne de Cotonou, couleurs vibrantes (vert #10B981, bleu #3B82F6), style professionnel, format vertical 9:16')}
                  >
                    📱 Promo Mobile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomPrompt('Interface Bot.BJ sur écran de smartphone, dashboard avec statistiques, design moderne vert et bleu, interface claire et intuitive, contexte africain, format vertical 1080x1920')}
                  >
                    💻 Interface
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomPrompt('Résultats et métriques Bot.BJ, graphiques de croissance, entrepreneur béninois satisfait, chiffres impressionnants, couleurs Bot.BJ (vert, bleu, orange), style corporate moderne, format vertical')}
                  >
                    📊 Résultats
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomPrompt('Call-to-action Bot.BJ, bouton clair avec texte en français, logo Bot.BJ visible, fond accrocheur avec dégradé vert-bleu, message convaincant, contexte professionnel africain, format 9:16')}
                  >
                    🎯 CTA
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="auto" className="space-y-4">
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    Le prompt automatique est optimisé selon le contenu de votre vidéo "{video.title}"
                  </AlertDescription>
                </Alert>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{buildPrompts().find(p => p.frameType === selectedFrameType)?.prompt}</p>
                </div>
                <Button
                  onClick={() => {
                    const autoPrompt = buildPrompts().find(p => p.frameType === selectedFrameType);
                    if (autoPrompt) setCustomPrompt(autoPrompt.prompt);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Utiliser ce prompt
                </Button>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerateWithCreator}
                disabled={isGeneratingCustom || !customPrompt.trim()}
                className="flex-1 gap-2"
              >
                {isGeneratingCustom ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Générer avec IA Créateur
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowCreatorDialog(false)}
                variant="outline"
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};