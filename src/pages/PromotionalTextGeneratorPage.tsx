import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { usePromotionalTextGeneration, PromotionalStyle } from '@/hooks/usePromotionalTextGeneration';
import { PromotionalTextDisplay } from '@/components/video-production/PromotionalTextDisplay';
import { PromotionalTextExporter } from '@/components/video-production/PromotionalTextExporter';

export const PromotionalTextGeneratorPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [frames, setFrames] = useState<any[]>([]);
  const [video, setVideo] = useState<any>(null);
  const [style, setStyle] = useState<PromotionalStyle>('epic');
  const [allGenerated, setAllGenerated] = useState(false);
  
  const { generateAllFrameTexts, generateVideoSummary, isGenerating } = usePromotionalTextGeneration();

  useEffect(() => {
    if (videoId) {
      loadData();
    }
  }, [videoId]);

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
      toast.error('Erreur de chargement');
    }
  };

  const handleGenerateAll = async () => {
    if (!frames.length) return;

    const success = await generateAllFrameTexts(
      frames.map(f => ({
        id: f.id,
        frame_type: f.frame_type,
        prompt: f.prompt
      })),
      style
    );

    if (success) {
      await loadData();
      setAllGenerated(true);

      // Générer automatiquement le résumé vidéo
      if (frames.length === 4) {
        const heroText = frames.find(f => f.frame_type === 'hero')?.promotional_text;
        const demoText = frames.find(f => f.frame_type === 'demo')?.promotional_text;
        const resultText = frames.find(f => f.frame_type === 'result')?.promotional_text;
        const ctaText = frames.find(f => f.frame_type === 'cta')?.promotional_text;

        if (heroText && demoText && resultText && ctaText && videoId) {
          await generateVideoSummary(videoId, heroText, demoText, resultText, ctaText);
          await loadData();
        }
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/video-library')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Textes Promotionnels</h1>
          <p className="text-muted-foreground">
            Générez des textes marketing époustouflants pour votre vidéo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Choisissez le style de vos textes promotionnels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Style de texte</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as PromotionalStyle)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="epic">🚀 Épique (Impact maximal)</SelectItem>
                <SelectItem value="professional">💼 Professionnel</SelectItem>
                <SelectItem value="casual">😊 Décontracté</SelectItem>
                <SelectItem value="urgent">⚡ Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleGenerateAll}
            disabled={isGenerating || allGenerated}
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating ? 'Génération en cours...' : allGenerated ? 'Textes déjà générés' : 'Générer tous les textes'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <CardTitle>🎬 Résumé Promotionnel Vidéo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed">
              {video.promotional_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {allGenerated && (
        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
            <CardDescription>
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
