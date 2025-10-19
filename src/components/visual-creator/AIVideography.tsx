import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Wand2, X, Download, Eye, Video } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMediaManager } from '@/hooks/useMediaManager';
import { UniversalMediaModal } from './UniversalMediaModal';
import { removeBackground, loadImage, imageUrlToBlob, blobToDataUrl } from '@/utils/backgroundRemoval';
import { detectBackgroundColor } from '@/utils/colorDetection';

const cameraEffects = [
  { id: 'zoom-in', name: 'Zoom In', description: 'Zoom progressif vers le sujet', icon: '🔍' },
  { id: 'zoom-out', name: 'Zoom Out', description: 'Zoom arrière révélant le contexte', icon: '🔎' },
  { id: 'pan-left', name: 'Pan Left', description: 'Mouvement de droite à gauche', icon: '⬅️' },
  { id: 'pan-right', name: 'Pan Right', description: 'Mouvement de gauche à droite', icon: '➡️' },
  { id: 'orbit', name: 'Orbit', description: 'Rotation autour du sujet', icon: '🔄' },
  { id: 'parallax', name: 'Parallax', description: 'Effet de profondeur 3D', icon: '🎬' },
  { id: '360-rotate', name: '360° Rotation', description: 'Rotation complète à 360 degrés', icon: '🌐' },
];

const videoStyles = [
  { id: 'modern', name: 'Moderne', description: 'Style épuré et professionnel' },
  { id: 'dynamic', name: 'Dynamique', description: 'Transitions rapides et énergiques' },
  { id: 'cinematic', name: 'Cinématique', description: 'Style film avec effets dramatiques' },
  { id: 'smooth', name: 'Fluide', description: 'Mouvements doux et élégants' },
];

export const AIVideography = () => {
  const { saveToGallery, downloadMedia } = useMediaManager();
  const [image, setImage] = useState<string>('');
  const [cameraEffect, setCameraEffect] = useState('zoom-in');
  const [videoStyle, setVideoStyle] = useState('modern');
  const [duration, setDuration] = useState('5');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [originalBackground, setOriginalBackground] = useState<string>('');
  const [backgroundColor, setBackgroundColor] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!image) {
      toast.error('Ajoutez une image');
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      // ✨ ÉTAPE 1: Traitement AI de l'image (TOUJOURS - Qualité professionnelle)
      toast.info('🎨 Traitement AI en cours - Amélioration de la qualité...', { duration: 3000 });
      console.log('Étape 1: Traitement AI de l\'image pour qualité professionnelle...');

      const { data: videoData, error: videoError } = await supabase.functions.invoke('generate-ai-video', {
        body: {
          image: image,
          cameraEffect: cameraEffect,
          videoStyle: videoStyle,
          duration: parseInt(duration),
          description: description,
        }
      });

      if (videoError) throw videoError;
      if (!videoData?.videoUrl) throw new Error('Aucune image améliorée générée');

      const enhancedImage = videoData.videoUrl;
      console.log('✓ Image améliorée par AI avec succès - Qualité professionnelle');
      toast.success('✨ Image améliorée avec succès !');

      // ✨ ÉTAPE 2: Si effet 360°, détecter couleur puis supprimer le fond
      let processedImage = enhancedImage;
      let detectedBackgroundColor: string | null = null;

      if (cameraEffect === '360-rotate') {
        // Sous-étape 2a: Détection de couleur de fond
        toast.info('🎨 Analyse de l\'arrière-plan...', { duration: 2000 });
        console.log('Étape 2a: Détection de la couleur de fond pour effet 360°...');
        
        try {
          detectedBackgroundColor = await detectBackgroundColor(enhancedImage);
          console.log('✓ Couleur de fond détectée:', detectedBackgroundColor);
          setBackgroundColor(detectedBackgroundColor);
          toast.success('🎨 Couleur de fond détectée !');
        } catch (error) {
          console.error('Erreur lors de la détection de couleur:', error);
          detectedBackgroundColor = 'rgb(255, 255, 255)';
          setBackgroundColor(detectedBackgroundColor);
        }

        // Sous-étape 2b: Suppression du fond
        toast.info('✂️ Isolation du produit - Suppression du fond...', { duration: 3000 });
        console.log('Étape 2b: Suppression du fond pour isolation du produit...');

        try {
          const imageBlob = await imageUrlToBlob(enhancedImage);
          const imageForProcessing = await loadImage(imageBlob);
          const resultBlob = await removeBackground(imageForProcessing);
          processedImage = await blobToDataUrl(resultBlob);
          console.log('✓ Fond supprimé avec succès - Produit isolé');
          toast.success('✂️ Fond supprimé avec succès !');
        } catch (bgError) {
          console.error('Erreur lors de la suppression du fond:', bgError);
          toast.error('Erreur lors de la suppression du fond');
          processedImage = enhancedImage;
        }
      }

      // ✨ ÉTAPE 3: Application de l'effet de caméra
      toast.info(`🎬 Application de l'effet ${cameraEffect}...`, { duration: 2000 });
      console.log('Étape 3: Application de l\'effet de caméra...');

      // ✨ ÉTAPE 4: Sauvegarde dans la galerie
      console.log('Étape 4: Sauvegarde dans la galerie...');
      const savedMedia = await saveToGallery({
        type: 'video',
        title: `Vidéo ${cameraEffect} - Qualité Pro AI`,
        prompt: description || `Vidéo professionnelle avec effet ${cameraEffect} et style ${videoStyle}`,
        style: videoStyle,
        format: `${duration}s`,
        imageUrl: processedImage,
        metadata: {
          cameraEffect: cameraEffect,
          videoStyle: videoStyle,
          duration: parseInt(duration),
          description: description,
          aiEnhanced: true,
          enhancementPrompt: videoData.enhancementPrompt || 'Professional AI enhancement',
          qualityLevel: 'professional',
          hasTransparentBackground: cameraEffect === '360-rotate',
          backgroundColor: detectedBackgroundColor,
          processingSteps: [
            'ai_enhancement',
            cameraEffect === '360-rotate' ? 'background_removal' : null,
            'camera_animation'
          ].filter(Boolean)
        }
      });

      if (savedMedia) {
        setResult(savedMedia);
        toast.success('✨ Vidéo professionnelle créée et sauvegardée !', { duration: 4000 });
        console.log('✓ Génération terminée avec succès !');
      }
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error('Erreur lors de la génération de la vidéo');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Videography</h2>
            <p className="text-sm text-muted-foreground">
              Transformez vos photos en vidéos promotionnelles animées
            </p>
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-3">
          <Label>Votre image</Label>
          {image ? (
            <div className="relative aspect-video rounded-lg overflow-hidden border group">
              <img src={image} alt="Source" className="w-full h-full object-cover" />
              <button
                onClick={() => setImage('')}
                className="absolute top-2 right-2 p-2 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer transition-all hover:scale-105">
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Cliquez pour ajouter une image</p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          )}
        </div>

        {/* Camera Effect Selection */}
        <div className="space-y-3">
          <Label>Effet de caméra</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {cameraEffects.map((effect) => (
              <button
                key={effect.id}
                onClick={() => setCameraEffect(effect.id)}
                className={`p-3 rounded-lg border-2 transition-all hover:scale-105 text-left ${
                  cameraEffect === effect.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="text-2xl mb-1">{effect.icon}</div>
                <div className="text-sm font-medium">{effect.name}</div>
                <div className="text-xs text-muted-foreground">{effect.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Video Style */}
        <div className="space-y-3">
          <Label>Style de vidéo</Label>
          <Select value={videoStyle} onValueChange={setVideoStyle}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {videoStyles.map((style) => (
                <SelectItem key={style.id} value={style.id}>
                  <div>
                    <div className="font-medium">{style.name}</div>
                    <div className="text-xs text-muted-foreground">{style.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Duration */}
        <div className="space-y-3">
          <Label>Durée (secondes)</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 secondes</SelectItem>
              <SelectItem value="5">5 secondes</SelectItem>
              <SelectItem value="7">7 secondes</SelectItem>
              <SelectItem value="10">10 secondes</SelectItem>
              <SelectItem value="15">15 secondes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <Label>Description du produit/contexte (optionnel)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Montre de luxe, ambiance élégante"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !image}
          size="lg"
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Générer la vidéo
            </>
          )}
        </Button>
      </Card>

      {/* Result Preview */}
      {result && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Résultat</h3>
          <div 
            className="relative aspect-video rounded-lg overflow-hidden border"
            style={{
              backgroundColor: result.metadata?.cameraEffect === '360-rotate' && backgroundColor 
                ? backgroundColor 
                : 'black'
            }}
          >
            {/* Image animée */}
            <img
              src={result.image_url}
              alt="Vidéo générée"
              className={`relative w-full h-full object-contain ${
                result.metadata?.cameraEffect === 'zoom-in' ? 'animate-[zoom-in_5s_ease-in-out_infinite]' :
                result.metadata?.cameraEffect === 'zoom-out' ? 'animate-[zoom-out_5s_ease-in-out_infinite]' :
                result.metadata?.cameraEffect === 'pan-left' ? 'animate-[pan-left_5s_ease-in-out_infinite]' :
                result.metadata?.cameraEffect === 'pan-right' ? 'animate-[pan-right_5s_ease-in-out_infinite]' :
                result.metadata?.cameraEffect === 'orbit' ? 'animate-[orbit_5s_ease-in-out_infinite]' :
                result.metadata?.cameraEffect === 'parallax' ? 'animate-[parallax_5s_ease-in-out_infinite]' :
                result.metadata?.cameraEffect === '360-rotate' ? 'animate-[rotate-360_8s_linear_infinite]' :
                ''
              }`}
            />
            <div className="absolute top-2 right-2 px-3 py-1 bg-black/70 text-white text-xs rounded-full">
              Animation: {result.metadata?.cameraEffect || 'auto'}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setIsModalOpen(true)}
            >
              <Eye className="w-4 h-4" />
              Visualiser
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => downloadMedia(result.image_url, `video-animated-${result.id}.png`)}
            >
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
          </div>
        </Card>
      )}

      {/* Modal */}
      <UniversalMediaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        media={result}
        onDownload={downloadMedia}
      />
    </div>
  );
};
