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

const cameraEffects = [
  { id: 'zoom-in', name: 'Zoom In', description: 'Zoom progressif vers le sujet', icon: '🔍' },
  { id: 'zoom-out', name: 'Zoom Out', description: 'Zoom arrière révélant le contexte', icon: '🔎' },
  { id: 'pan-left', name: 'Pan Left', description: 'Mouvement de droite à gauche', icon: '⬅️' },
  { id: 'pan-right', name: 'Pan Right', description: 'Mouvement de gauche à droite', icon: '➡️' },
  { id: 'orbit', name: 'Orbit', description: 'Rotation autour du sujet', icon: '🔄' },
  { id: 'parallax', name: 'Parallax', description: 'Effet de profondeur 3D', icon: '🎬' },
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
    try {
      const selectedEffect = cameraEffects.find(e => e.id === cameraEffect);
      const selectedStyle = videoStyles.find(s => s.id === videoStyle);
      
      const prompt = `Create a professional promotional video from this image with:
- Camera effect: ${selectedEffect?.name} - ${selectedEffect?.description}
- Video style: ${selectedStyle?.name} - ${selectedStyle?.description}
- Duration: ${duration} seconds
${description ? `- Additional context: ${description}` : ''}

Generate smooth, professional camera movements with cinematic quality.
Add subtle motion blur and depth effects for realism.
High quality, marketing-ready video output.`;

      const { data, error } = await supabase.functions.invoke('generate-ai-video', {
        body: {
          image: image,
          cameraEffect: cameraEffect,
          videoStyle: videoStyle,
          duration: parseInt(duration),
          description: description,
          prompt: prompt
        }
      });

      if (error) throw error;

      if (data?.videoUrl) {
        const savedMedia = await saveToGallery({
          type: 'video',
          title: `Vidéo ${cameraEffect} - ${videoStyle}`,
          prompt: prompt,
          style: videoStyle,
          format: `${duration}s`,
          imageUrl: data.videoUrl,
          metadata: {
            cameraEffect: cameraEffect,
            videoStyle: videoStyle,
            duration: parseInt(duration),
            description: description,
            isEnhancedImage: data.isEnhancedImage || false
          }
        });

        if (savedMedia) {
          setResult(savedMedia);
          toast.success('Vidéo animée générée avec succès !');
        }
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
          <div className="relative aspect-video rounded-lg overflow-hidden border bg-black">
            <img
              src={result.image_url}
              alt="Vidéo générée"
              className={`w-full h-full object-contain ${
                result.metadata?.cameraEffect === 'zoom-in' ? 'animate-[zoom-in_5s_ease-in-out_infinite]' :
                result.metadata?.cameraEffect === 'zoom-out' ? 'animate-[zoom-out_5s_ease-in-out_infinite]' :
                result.metadata?.cameraEffect === 'pan-left' ? 'animate-[pan-left_5s_ease-in-out_infinite]' :
                result.metadata?.cameraEffect === 'pan-right' ? 'animate-[pan-right_5s_ease-in-out_infinite]' :
                result.metadata?.cameraEffect === 'orbit' ? 'animate-[orbit_5s_ease-in-out_infinite]' :
                result.metadata?.cameraEffect === 'parallax' ? 'animate-[parallax_5s_ease-in-out_infinite]' :
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
