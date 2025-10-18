import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePromotionalTextGeneration, PromotionalStyle, FrameType } from '@/hooks/usePromotionalTextGeneration';
import { useVoiceGeneration } from '@/hooks/useVoiceGeneration';
import { PromotionalTextDisplay } from '@/components/video-production/PromotionalTextDisplay';
import { PromotionalTextExporter } from '@/components/video-production/PromotionalTextExporter';
import { VoiceSelector } from '@/components/video-production/VoiceSelector';
import { AudioPreview } from '@/components/video-production/AudioPreview';
import { FinalVideoAssembler } from '@/components/video-production/FinalVideoAssembler';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Sparkles, CheckCircle, AlertCircle, TestTube, Mic } from 'lucide-react';

export const PromotionalTextGeneratorPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [frames, setFrames] = useState<any[]>([]);
  const [video, setVideo] = useState<any>(null);
  const [selectedStyle, setSelectedStyle] = useState<PromotionalStyle>('epic');
  const [allGenerated, setAllGenerated] = useState(false);
  const [functionStatus, setFunctionStatus] = useState<'checking' | 'ready' | 'deploying' | 'demo'>('checking');
  const [selectedVoiceId, setSelectedVoiceId] = useState('antoine-professional');
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  
  const { 
    generateAllFrameTexts, 
    generateVideoSummary, 
    isGenerating,
    useFallback,
    checkFunctionAvailability 
  } = usePromotionalTextGeneration();

  const { 
    generateMultipleVoices,
    isGenerating: isGeneratingVoice 
  } = useVoiceGeneration();

  useEffect(() => {
    if (videoId) {
      loadData();
      loadAudioTracks();
      testFunctionStatus();
    }
  }, [videoId]);

  const loadAudioTracks = async () => {
    if (!videoId) return;
    
    try {
      const { data, error } = await supabase
        .from('video_audio_tracks')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAudioTracks(data || []);
    } catch (error) {
      console.error('Error loading audio tracks:', error);
    }
  };

  const testFunctionStatus = async () => {
    setFunctionStatus('checking');
    const isAvailable = await checkFunctionAvailability();
    setFunctionStatus(isAvailable ? 'ready' : 'deploying');
  };

  const handleTestConnection = async () => {
    toast({
      title: 'Test de connexion...',
      description: 'Vérification de la disponibilité des fonctions'
    });
    
    await testFunctionStatus();
    
    if (functionStatus === 'ready') {
      toast({
        title: '✅ Fonctions opérationnelles',
        description: 'Les fonctions sont déployées et prêtes à générer des textes'
      });
    } else {
      toast({
        title: '⏳ Fonctions en déploiement',
        description: 'Mode démo activé avec textes exemples'
      });
    }
  };

  const loadData = async () => {
    try {
      // Charger les frames
      const { data: framesData, error: framesError } = await supabase
        .from('video_frames')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });

      if (framesError) throw framesError;
      setFrames(framesData || []);

      // Charger la vidéo
      const { data: videoData, error: videoError } = await supabase
        .from('generated_videos')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (videoError) throw videoError;
      setVideo(videoData);

      // Vérifier si tous les textes sont générés
      const allHaveText = framesData?.every(f => f.promotional_text);
      setAllGenerated(allHaveText || false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur de chargement des données',
        variant: 'destructive'
      });
    }
  };

  const handleGenerateVoices = async () => {
    if (!frames.length || !videoId) {
      toast({
        title: 'Erreur',
        description: 'Aucun texte disponible pour générer les voix',
        variant: 'destructive'
      });
      return;
    }

    const textsToGenerate = frames
      .filter(f => f.promotional_text)
      .map(f => ({
        text: f.promotional_text,
        frameType: f.frame_type as 'hero' | 'demo' | 'result' | 'cta',
      }));

    if (textsToGenerate.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Générez d\'abord les textes avant de créer les voix',
        variant: 'destructive'
      });
      return;
    }

    const success = await generateMultipleVoices(textsToGenerate, selectedVoiceId, videoId);
    
    if (success) {
      await loadAudioTracks();
    }
  };

  const handleGenerateAll = async () => {
    if (!frames.length) {
      toast({
        title: 'Erreur',
        description: 'Aucune frame disponible pour générer les textes',
        variant: 'destructive'
      });
      return;
    }

    try {
      const success = await generateAllFrameTexts(
        frames.map(f => ({
          id: f.id,
          frame_type: f.frame_type,
          prompt: f.prompt
        })),
        selectedStyle
      );

      if (success) {
        await loadData();
        setAllGenerated(true);

        // Générer automatiquement le résumé vidéo
        if (frames.length === 4) {
          const { data: refreshedFrames } = await supabase
            .from('video_frames')
            .select('*')
            .eq('video_id', videoId)
            .order('created_at', { ascending: true });

          if (refreshedFrames) {
            const heroText = refreshedFrames.find(f => f.frame_type === 'hero')?.promotional_text;
            const demoText = refreshedFrames.find(f => f.frame_type === 'demo')?.promotional_text;
            const resultText = refreshedFrames.find(f => f.frame_type === 'result')?.promotional_text;
            const ctaText = refreshedFrames.find(f => f.frame_type === 'cta')?.promotional_text;

            if (heroText && demoText && resultText && ctaText && videoId) {
              await generateVideoSummary(videoId, heroText, demoText, resultText, ctaText);
              await loadData();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in handleGenerateAll:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/video-library')}
          className="w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold">Textes Promotionnels</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Générez des textes marketing époustouflants pour votre vidéo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg sm:text-xl">Configuration</CardTitle>
              <CardDescription className="text-sm">
                Choisissez le style de vos textes promotionnels
              </CardDescription>
            </div>
            
            {/* Badge de statut */}
            <Badge variant={functionStatus === 'ready' ? 'default' : 'secondary'} className="gap-2">
              {functionStatus === 'checking' && <>⏳ Vérification...</>}
              {functionStatus === 'ready' && <><CheckCircle className="h-3 w-3" /> Fonction prête</>}
              {functionStatus === 'deploying' && <><AlertCircle className="h-3 w-3" /> En déploiement</>}
              {functionStatus === 'demo' && <>🎨 Mode démo</>}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Style promotionnel</label>
            <Select
              value={selectedStyle}
              onValueChange={(value) => setSelectedStyle(value as PromotionalStyle)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="epic">🚀 Épique - Impact maximum</SelectItem>
                <SelectItem value="professional">💼 Professionnel - Sérieux et crédible</SelectItem>
                <SelectItem value="casual">😊 Décontracté - Proche et amical</SelectItem>
                <SelectItem value="urgent">⚡ Urgent - Action immédiate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleGenerateAll}
              disabled={isGenerating || allGenerated}
              className="flex-1 text-sm sm:text-base"
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isGenerating ? 'Génération en cours...' : allGenerated ? 'Textes déjà générés' : 'Générer tous les textes'}
            </Button>

            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isGenerating}
              size="lg"
            >
              <TestTube className="mr-2 h-4 w-4" />
              Tester
            </Button>
          </div>

          {/* Messages informatifs */}
          {functionStatus === 'deploying' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                ⏳ <strong>Fonctions en déploiement</strong> - Le mode démo utilise des textes exemples. 
                La génération IA sera disponible après le déploiement complet (2-5 minutes).
              </p>
            </div>
          )}

          {useFallback && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                🎨 <strong>Mode démo actif</strong> - Textes exemples utilisés. 
                Cliquez sur "Tester" pour vérifier si les fonctions sont maintenant déployées.
              </p>
            </div>
          )}

          {functionStatus === 'ready' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-800">
                ✅ <strong>Système opérationnel</strong> - Les textes seront générés avec Lovable AI.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sélection de voix et génération audio */}
      {allGenerated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Génération Vocale
            </CardTitle>
            <CardDescription>
              Créez une voix-off professionnelle pour votre vidéo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <VoiceSelector
              selectedVoiceId={selectedVoiceId}
              onVoiceSelect={setSelectedVoiceId}
            />

            <Button
              onClick={handleGenerateVoices}
              disabled={isGeneratingVoice}
              className="w-full"
              size="lg"
            >
              <Mic className="mr-2 h-4 w-4" />
              {isGeneratingVoice ? 'Génération en cours...' : 'Générer toutes les voix-off'}
            </Button>

            {/* Aperçu des pistes audio */}
            {audioTracks.length > 0 && (
              <div className="space-y-3 pt-4">
                <h4 className="font-medium text-sm">Pistes audio générées</h4>
                {audioTracks.map((track) => (
                  <AudioPreview
                    key={track.id}
                    audioUrl={track.audio_url}
                    title={`${track.frame_type?.toUpperCase()} - ${track.voice_name}`}
                    duration={track.audio_duration}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assemblage Vidéo Finale */}
      {audioTracks.length === 4 && video && frames.length === 4 && (
        <FinalVideoAssembler
          videoId={videoId!}
          videoUrl={video.video_url || video.video_asset_url}
          audioTracks={audioTracks.map(track => ({
            url: track.audio_url,
            frameType: track.frame_type,
            duration: track.audio_duration,
          }))}
          frames={{
            hero: frames.find(f => f.frame_type === 'hero')?.image_url,
            demo: frames.find(f => f.frame_type === 'demo')?.image_url,
            result: frames.find(f => f.frame_type === 'result')?.image_url,
            cta: frames.find(f => f.frame_type === 'cta')?.image_url,
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {frames.map((frame) => (
          <PromotionalTextDisplay
            key={frame.id}
            frameType={frame.frame_type}
            promotionalText={frame.promotional_text}
            imageUrl={frame.image_url}
          />
        ))}
      </div>

      {video?.promotional_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">🎬 Résumé Promotionnel Vidéo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm sm:text-base lg:text-lg leading-relaxed">
              {video.promotional_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {allGenerated && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Export</CardTitle>
            <CardDescription className="text-sm">
              Téléchargez ou copiez vos textes promotionnels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PromotionalTextExporter
              frames={frames}
              videoSummary={video?.promotional_summary}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
