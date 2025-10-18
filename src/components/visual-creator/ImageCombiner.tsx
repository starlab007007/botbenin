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
import { Upload, Wand2, X, Download, Eye, Grid3x3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMediaManager } from '@/hooks/useMediaManager';
import { UniversalMediaModal } from './UniversalMediaModal';

const layouts = [
  { id: 'grid', name: 'Grille', description: '2x2 ou 3x3', icon: '⊞' },
  { id: 'collage', name: 'Collage', description: 'Disposition artistique', icon: '🎨' },
  { id: 'before-after', name: 'Avant/Après', description: 'Comparaison', icon: '⇄' },
  { id: 'panorama', name: 'Panorama', description: 'Horizontal', icon: '📷' },
];

export const ImageCombiner = () => {
  const { saveToGallery, downloadMedia } = useMediaManager();
  const [images, setImages] = useState<string[]>([]);
  const [layout, setLayout] = useState('grid');
  const [overlayText, setOverlayText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 6) {
      toast.error('Maximum 6 images');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCombine = async () => {
    if (images.length < 2) {
      toast.error('Ajoutez au moins 2 images');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedLayout = layouts.find(l => l.id === layout);
      const prompt = `Combine these ${images.length} images into a professional ${selectedLayout?.name} layout.
${overlayText ? `Add overlay text: "${overlayText}"` : ''}
Style: Modern, clean, professional design with smooth transitions between images.
High quality, social media ready.`;

      const { data, error } = await supabase.functions.invoke('combine-images', {
        body: {
          images: images,
          layout: layout,
          overlayText: overlayText,
          prompt: prompt
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const savedMedia = await saveToGallery({
          type: 'combined_image',
          title: `Combinaison ${layout}`,
          prompt: prompt,
          style: layout,
          format: `${images.length} images`,
          imageUrl: data.imageUrl,
          metadata: {
            layout: layout,
            imageCount: images.length,
            overlayText: overlayText
          }
        });

        if (savedMedia) {
          setResult(savedMedia);
          toast.success('Images combinées avec succès !');
        }
      }
    } catch (error) {
      console.error('Combination error:', error);
      toast.error('Erreur lors de la combinaison');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Grid3x3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Combinaison d'images</h2>
            <p className="text-sm text-muted-foreground">
              Fusionnez plusieurs images en une création unique
            </p>
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-3">
          <Label>Vos images (2-6 images)</Label>
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border group">
                <img src={img} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {images.length < 6 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer transition-all hover:scale-105">
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Ajouter</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            )}
          </div>
        </div>

        {/* Layout Selection */}
        <div className="space-y-3">
          <Label>Disposition</Label>
          <div className="grid grid-cols-2 gap-3">
            {layouts.map((lay) => (
              <button
                key={lay.id}
                onClick={() => setLayout(lay.id)}
                className={`p-4 rounded-lg border-2 transition-all hover:scale-105 text-left ${
                  layout === lay.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="text-2xl mb-1">{lay.icon}</div>
                <div className="text-sm font-medium">{lay.name}</div>
                <div className="text-xs text-muted-foreground">{lay.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Overlay Text */}
        <div className="space-y-3">
          <Label>Texte à ajouter (optionnel)</Label>
          <Input
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder="Ex: Summer Collection 2024"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleCombine}
          disabled={isGenerating || images.length < 2}
          size="lg"
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Combinaison en cours...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Combiner les images
            </>
          )}
        </Button>
      </Card>

      {/* Result Preview */}
      {result && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Résultat</h3>
          <div className="relative aspect-video rounded-lg overflow-hidden border">
            <img
              src={result.image_url}
              alt={result.title}
              className="w-full h-full object-cover"
            />
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
              onClick={() => downloadMedia(result.image_url, `combined-${result.id}.png`)}
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
