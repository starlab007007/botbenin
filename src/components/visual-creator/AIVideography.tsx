import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Wand2, X, Download, Eye, Video, Sparkles } from 'lucide-react';
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
  const [environmentPrompt, setEnvironmentPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
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
      toast.error('Veuillez ajouter une image de produit');
      return;
    }

    if (!environmentPrompt.trim()) {
      toast.error('Veuillez décrire l\'environnement souhaité');
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      // ============================================================
      // ÉTAPE 1: Amélioration AI du produit
      // ============================================================
      toast.info('🎨 Amélioration AI du produit...', { duration: 3000 });
      console.log('Étape 1/4: Traitement AI du produit...');
      
      const { data: enhancedData, error: enhanceError } = await supabase.functions.invoke('generate-ai-video', {
        body: {
          image,
          cameraEffect,
          videoStyle,
          duration: parseInt(duration),
          description: description || 'Product promotional video',
          step: 'enhance-product'
        }
      });

      if (enhanceError) throw enhanceError;

      const enhancedProductImage = enhancedData?.enhancedImage || image;
      console.log('✓ Produit amélioré avec succès');

      // ============================================================
      // ÉTAPE 2: Génération de l'environnement de luxe
      // ============================================================
      toast.info('🌍 Création de l\'environnement de luxe...', { duration: 4000 });
      console.log('Étape 2/4: Génération de l\'environnement...');
      
      const { data: environmentData, error: environmentError } = await supabase.functions.invoke('generate-ai-video', {
        body: {
          environmentPrompt,
          videoStyle,
          step: 'generate-environment'
        }
      });

      if (environmentError) throw environmentError;

      const environmentImage = environmentData?.environmentImage;
      console.log('✓ Environnement généré avec succès');

      if (!environmentImage) {
        throw new Error('Échec de la génération de l\'environnement');
      }

      // ============================================================
      // ÉTAPE 3: Composition finale produit + environnement
      // ============================================================
      toast.info('🎬 Composition Product Showcase...', { duration: 4000 });
      console.log('Étape 3/4: Composition finale...');
      
      const { data: compositionData, error: compositionError } = await supabase.functions.invoke('generate-ai-video', {
        body: {
          productImage: enhancedProductImage,
          environmentImage: environmentImage,
          cameraEffect,
          videoStyle,
          step: 'compose-final'
        }
      });

      if (compositionError) throw compositionError;

      const finalComposedImage = compositionData?.composedImage;
      console.log('✓ Composition terminée avec succès');

      if (!finalComposedImage) {
        throw new Error('Échec de la composition finale');
      }

      // ============================================================
      // ÉTAPE 4: Traitement optionnel pour effet 360°
      // ============================================================
      let processedImage = finalComposedImage;
      let detectedBackgroundColor: string | null = null;

      if (cameraEffect === '360-rotate') {
        toast.info('🔍 Optimisation pour rotation 360°...', { duration: 2000 });
        console.log('Étape 4/4: Optimisation 360°...');
        
        try {
          // Détection couleur fond
          detectedBackgroundColor = await detectBackgroundColor(finalComposedImage);
          console.log('✓ Couleur de fond détectée:', detectedBackgroundColor);
          setBackgroundColor(detectedBackgroundColor);

          // Suppression fond
          const imageBlob = await imageUrlToBlob(finalComposedImage);
          const imageForProcessing = await loadImage(imageBlob);
          const resultBlob = await removeBackground(imageForProcessing);
          processedImage = await blobToDataUrl(resultBlob);
          console.log('✓ Fond supprimé - produit isolé');
        } catch (bgError) {
          console.error('Erreur suppression fond:', bgError);
          detectedBackgroundColor = 'rgb(255, 255, 255)';
          setBackgroundColor(detectedBackgroundColor);
        }
      }

      // ============================================================
      // ÉTAPE 5: Sauvegarde du résultat avec métadonnées complètes
      // ============================================================
      toast.info('💾 Sauvegarde de votre Product Showcase...', { duration: 2000 });
      console.log('Étape 5/5: Sauvegarde...');

      const savedMedia = await saveToGallery({
        type: 'video',
        title: `Product Showcase - ${description || 'Sans titre'}`,
        prompt: `Vidéo Product Showcase professionnelle avec environnement généré: ${environmentPrompt}. Effet ${cameraEffect}, style ${videoStyle}.`,
        style: videoStyle,
        format: `${duration}s - 1080x1080`,
        imageUrl: processedImage,
        metadata: {
          videoType: 'product-showcase',
          cameraEffect,
          videoStyle,
          duration: parseInt(duration),
          description,
          environmentPrompt,
          hasGeneratedEnvironment: true,
          aiEnhanced: true,
          enhancementPrompt: `Professional Product Showcase with generated luxury environment: ${environmentPrompt}`,
          hasTransparentBackground: cameraEffect === '360-rotate',
          backgroundColor: detectedBackgroundColor,
          qualityLevel: 'professional-advanced',
          processingSteps: [
            'product_enhancement',
            'environment_generation',
            'final_composition',
            cameraEffect === '360-rotate' ? 'background_optimization' : null,
            'camera_animation'
          ].filter(Boolean)
        }
      });

      if (savedMedia) {
        setResult(savedMedia);
        toast.success('🎉 Product Showcase créé avec succès !', { duration: 4000 });
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
            <h2 className="text-xl font-bold flex items-center gap-2">
              Product Showcase AI
              <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">MVP</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Créez des spots publicitaires professionnels en combinant votre produit avec un environnement généré par AI
            </p>
          </div>
        </div>

        {/* === SECTION 1: Image du produit === */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            Image du produit
          </Label>
          {image ? (
            <div className="relative aspect-video rounded-lg overflow-hidden border group">
              <img src={image} alt="Source" className="w-full h-full object-contain bg-muted" />
              <button
                onClick={() => setImage('')}
                className="absolute top-2 right-2 p-2 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer transition-all hover:scale-[1.02]">
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Cliquez pour ajouter votre produit</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP</p>
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

        {/* === SECTION 2: Description de l'environnement === */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            Environnement de luxe (description)
          </Label>
          <Textarea
            value={environmentPrompt}
            onChange={(e) => setEnvironmentPrompt(e.target.value)}
            placeholder="Ex: Marbre blanc élégant avec éclairage doré doux, ambiance minimaliste luxueuse, style studio haut de gamme"
            rows={3}
            disabled={isGenerating}
            className="resize-none"
          />
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Décrivez l'arrière-plan professionnel où votre produit sera mis en valeur. L'AI va générer un environnement de luxe sur-mesure.
            </p>
          </div>
        </div>

        {/* === SECTION 3: Description du produit === */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">3</span>
            Description du produit
            <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Montre de luxe en acier inoxydable"
            disabled={isGenerating}
          />
        </div>

        {/* === SECTION 4 & 5: Effet de caméra et Style === */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">4</span>
              Effet de caméra
            </Label>
            <Select value={cameraEffect} onValueChange={setCameraEffect} disabled={isGenerating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cameraEffects.map((effect) => (
                  <SelectItem key={effect.id} value={effect.id}>
                    <div className="flex items-center gap-2">
                      <span>{effect.icon}</span>
                      <div>
                        <div className="font-medium">{effect.name}</div>
                        <div className="text-xs text-muted-foreground">{effect.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">5</span>
              Style visuel
            </Label>
            <Select value={videoStyle} onValueChange={setVideoStyle} disabled={isGenerating}>
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
        </div>

        {/* === SECTION 6: Durée === */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">6</span>
            Durée
          </Label>
          <Select value={duration} onValueChange={setDuration} disabled={isGenerating}>
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

        {/* === BOUTON GÉNÉRATION === */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !image || !environmentPrompt.trim()}
            size="lg"
            className="w-full gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Créer mon Product Showcase
              </>
            )}
          </Button>

          {!image && (
            <p className="text-xs text-center text-muted-foreground">
              Ajoutez une image de produit pour commencer
            </p>
          )}

          {image && !environmentPrompt.trim() && (
            <p className="text-xs text-center text-muted-foreground">
              Décrivez l'environnement souhaité pour continuer
            </p>
          )}
        </div>
      </Card>

      {/* === RÉSULTAT === */}
      {result && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Votre Product Showcase</h3>
            <div className="px-3 py-1 bg-primary/20 text-primary text-xs rounded-full font-medium">
              Format: 1080x1080
            </div>
          </div>
          <div
            className="relative aspect-square rounded-lg overflow-hidden border"
            style={{
              backgroundColor: result.metadata?.cameraEffect === '360-rotate' && backgroundColor
                ? backgroundColor
                : 'black'
            }}
          >
            <img
              src={result.image_url}
              alt="Product Showcase généré"
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
            <div className="absolute top-2 right-2 px-3 py-1 bg-black/70 text-white text-xs rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {result.metadata?.cameraEffect || 'Animation'}
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
              onClick={() => downloadMedia(result.image_url, `product-showcase-${result.id}.png`)}
            >
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
          </div>
        </Card>
      )}

      {/* === MODAL === */}
      <UniversalMediaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        media={result}
        onDownload={downloadMedia}
      />
    </div>
  );
};
