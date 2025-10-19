import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Wand2, X, Download, Eye, Video, Sparkles, Zap, BookOpen, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMediaManager } from '@/hooks/useMediaManager';
import { UniversalMediaModal } from './UniversalMediaModal';
import { removeBackground, loadImage, imageUrlToBlob, blobToDataUrl } from '@/utils/backgroundRemoval';
import { detectBackgroundColor } from '@/utils/colorDetection';

const cameraEffects = [
  { id: 'zoom-in', name: 'Zoom In', description: 'Zoom progressif', icon: '🔍' },
  { id: 'zoom-out', name: 'Zoom Out', description: 'Zoom arrière', icon: '🔎' },
  { id: 'pan-left', name: 'Pan Left', description: 'Droite à gauche', icon: '⬅️' },
  { id: 'pan-right', name: 'Pan Right', description: 'Gauche à droite', icon: '➡️' },
  { id: 'orbit', name: 'Orbit', description: 'Rotation autour', icon: '🔄' },
  { id: 'parallax', name: 'Parallax', description: 'Profondeur 3D', icon: '🎬' },
  { id: '360-rotate', name: '360° Rotation', description: 'Rotation complète', icon: '🌐' },
];

const videoStyles = [
  { id: 'modern', name: 'Moderne', description: 'Épuré et professionnel' },
  { id: 'dynamic', name: 'Dynamique', description: 'Rapides et énergiques' },
  { id: 'cinematic', name: 'Cinématique', description: 'Style film dramatique' },
  { id: 'smooth', name: 'Fluide', description: 'Doux et élégants' },
];

const videoTypes = [
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    description: 'Mise en valeur luxueuse du produit',
    icon: Sparkles,
    features: ['Fond premium', 'Effets lumière', 'Rotation 360°']
  },
  {
    id: 'story-telling',
    name: 'Story Telling',
    description: 'Narration visuelle avec contexte',
    icon: BookOpen,
    features: ['Scène contextuelle', 'Transitions fluides', 'Ambiance narrative']
  },
  {
    id: 'dynamic-ad',
    name: 'Dynamic Ad',
    description: 'Publicité énergique et dynamique',
    icon: Zap,
    features: ['Multiples effets', 'Texte animé', 'CTA percutant']
  },
  {
    id: 'minimal-elegant',
    name: 'Minimal Élégant',
    description: 'Design épuré et sophistiqué',
    icon: Palette,
    features: ['Fond abstrait', 'Mouvements doux', 'Minimaliste']
  }
];

const exportFormats = [
  { id: '1080x1080', name: 'Carré', description: 'Instagram Feed, Facebook', ratio: '1:1' },
  { id: '1080x1920', name: 'Vertical', description: 'Stories, Reels, TikTok', ratio: '9:16' },
  { id: '1920x1080', name: 'Horizontal', description: 'YouTube, Facebook Video', ratio: '16:9' },
];

export const AIVideography = () => {
  const { saveToGallery, downloadMedia } = useMediaManager();
  const [image, setImage] = useState<string>('');
  const [videoType, setVideoType] = useState('product-showcase');
  const [cameraEffect, setCameraEffect] = useState('zoom-in');
  const [videoStyle, setVideoStyle] = useState('modern');
  const [duration, setDuration] = useState('5');
  const [description, setDescription] = useState('');
  const [environmentPrompt, setEnvironmentPrompt] = useState('');
  const [generateElements, setGenerateElements] = useState(false);
  const [exportFormat, setExportFormat] = useState('1080x1080');
  const [textOverlay, setTextOverlay] = useState({ title: '', subtitle: '', cta: '' });
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
      // ÉTAPE 1: Amélioration AI du produit
      toast.info('🎨 Amélioration AI du produit...', { duration: 3000 });
      console.log('Étape 1/5: Traitement AI du produit...');
      
      const { data: enhancedData, error: enhanceError } = await supabase.functions.invoke('generate-ai-video', {
        body: {
          image,
          cameraEffect,
          videoStyle,
          videoType,
          duration: parseInt(duration),
          description: description || 'Product promotional video',
          exportFormat,
          step: 'enhance-product'
        }
      });

      if (enhanceError) throw enhanceError;

      const enhancedProductImage = enhancedData?.enhancedImage || image;
      console.log('✓ Produit amélioré');

      // ÉTAPE 2: Génération de l'environnement
      toast.info('🌍 Création de l\'environnement...', { duration: 4000 });
      console.log('Étape 2/5: Génération environnement...');
      
      const { data: environmentData, error: environmentError } = await supabase.functions.invoke('generate-ai-video', {
        body: {
          environmentPrompt,
          videoStyle,
          videoType,
          exportFormat,
          step: 'generate-environment'
        }
      });

      if (environmentError) throw environmentError;

      const environmentImage = environmentData?.environmentImage;
      console.log('✓ Environnement généré');

      if (!environmentImage) {
        throw new Error('Échec de la génération de l\'environnement');
      }

      // ÉTAPE 3: Génération des éléments visuels (optionnel)
      let elementsImage = null;
      if (generateElements) {
        toast.info('✨ Ajout des effets visuels...', { duration: 3000 });
        console.log('Étape 3/5: Génération éléments visuels...');
        
        const { data: elementsData } = await supabase.functions.invoke('generate-ai-video', {
          body: {
            videoType,
            videoStyle,
            exportFormat,
            generateElements: true,
            step: 'generate-elements'
          }
        });

        if (elementsData && !elementsData.skipped) {
          elementsImage = elementsData.elementsImage;
          console.log('✓ Éléments visuels générés');
        }
      }

      // ÉTAPE 4: Composition finale
      toast.info('🎬 Composition finale...', { duration: 4000 });
      console.log('Étape 4/5: Composition...');
      
      const { data: compositionData, error: compositionError } = await supabase.functions.invoke('generate-ai-video', {
        body: {
          productImage: enhancedProductImage,
          environmentImage: environmentImage,
          cameraEffect,
          videoStyle,
          videoType,
          exportFormat,
          textOverlay: textOverlay.title || textOverlay.subtitle || textOverlay.cta ? textOverlay : null,
          step: 'compose-final'
        }
      });

      if (compositionError) throw compositionError;

      const finalComposedImage = compositionData?.composedImage;
      console.log('✓ Composition terminée');

      if (!finalComposedImage) {
        throw new Error('Échec de la composition finale');
      }

      // ÉTAPE 5: Traitement optionnel pour effet 360°
      let processedImage = finalComposedImage;
      let detectedBackgroundColor: string | null = null;

      if (cameraEffect === '360-rotate') {
        toast.info('🔍 Optimisation 360°...', { duration: 2000 });
        console.log('Étape 5/5: Optimisation 360°...');
        
        try {
          detectedBackgroundColor = await detectBackgroundColor(finalComposedImage);
          setBackgroundColor(detectedBackgroundColor);

          const imageBlob = await imageUrlToBlob(finalComposedImage);
          const imageForProcessing = await loadImage(imageBlob);
          const resultBlob = await removeBackground(imageForProcessing);
          processedImage = await blobToDataUrl(resultBlob);
          console.log('✓ Optimisation 360° terminée');
        } catch (bgError) {
          console.error('Erreur optimisation 360°:', bgError);
          detectedBackgroundColor = 'rgb(255, 255, 255)';
          setBackgroundColor(detectedBackgroundColor);
        }
      }

      // SAUVEGARDE
      toast.info('💾 Sauvegarde...', { duration: 2000 });
      console.log('Sauvegarde...');

      const savedMedia = await saveToGallery({
        type: 'video',
        title: `${videoTypes.find(t => t.id === videoType)?.name} - ${description || 'Sans titre'}`,
        prompt: `Vidéo ${videoType} avec environnement généré: ${environmentPrompt}. Effet ${cameraEffect}, style ${videoStyle}. Format ${exportFormat}.`,
        style: videoStyle,
        format: `${duration}s - ${exportFormat}`,
        imageUrl: processedImage,
        metadata: {
          videoType,
          cameraEffect,
          videoStyle,
          duration: parseInt(duration),
          description,
          environmentPrompt,
          hasGeneratedEnvironment: true,
          hasVisualElements: generateElements && !!elementsImage,
          textOverlay: textOverlay.title || textOverlay.subtitle || textOverlay.cta ? textOverlay : null,
          exportFormat,
          aiEnhanced: true,
          enhancementPrompt: `Professional ${videoType} with generated environment: ${environmentPrompt}`,
          hasTransparentBackground: cameraEffect === '360-rotate',
          backgroundColor: detectedBackgroundColor,
          qualityLevel: 'professional-complete',
          processingSteps: [
            'product_enhancement',
            'environment_generation',
            generateElements ? 'visual_elements_generation' : null,
            'final_composition',
            cameraEffect === '360-rotate' ? 'background_optimization' : null,
            'camera_animation'
          ].filter(Boolean)
        }
      });

      if (savedMedia) {
        setResult(savedMedia);
        toast.success('🎉 Vidéo créée avec succès !', { duration: 4000 });
        console.log('✓ Génération complète terminée !');
      }
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedVideoType = videoTypes.find(t => t.id === videoType);
  const selectedFormat = exportFormats.find(f => f.id === exportFormat);

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              AI Videography Pro
              <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full">
                Phases 1-3
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Système complet de génération de vidéos promotionnelles professionnelles
            </p>
          </div>
        </div>

        {/* TYPE DE VIDÉO */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">1. Type de vidéo</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {videoTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setVideoType(type.id)}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 text-left ${
                    videoType === type.id
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${videoType === type.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-sm font-semibold">{type.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                  {videoType === type.id && (
                    <div className="mt-2 pt-2 border-t space-y-1">
                      {type.features.map((feature, idx) => (
                        <div key={idx} className="text-xs text-primary flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* IMAGE DU PRODUIT */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">2. Image du produit</Label>
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

        {/* ENVIRONNEMENT */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">3. Environnement (description)</Label>
          <Textarea
            value={environmentPrompt}
            onChange={(e) => setEnvironmentPrompt(e.target.value)}
            placeholder={
              videoType === 'product-showcase' ? "Ex: Marbre blanc élégant avec éclairage doré, ambiance luxueuse" :
              videoType === 'story-telling' ? "Ex: Bureau moderne lumineux avec vue sur la ville, professionnnel" :
              videoType === 'dynamic-ad' ? "Ex: Arrière-plan urbain dynamique avec néons et mouvement" :
              "Ex: Fond abstrait géométrique minimaliste, couleurs douces"
            }
            rows={3}
            disabled={isGenerating}
            className="resize-none"
          />
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              L'AI génère un {selectedVideoType?.name} personnalisé basé sur votre description.
            </p>
          </div>
        </div>

        {/* TEXTE OVERLAY (nouveau) */}
        <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            4. Texte sur la vidéo (optionnel)
          </Label>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Titre principal</Label>
              <Input
                placeholder="Ex: Nouveauté 2025"
                value={textOverlay.title}
                onChange={(e) => setTextOverlay({...textOverlay, title: e.target.value})}
                disabled={isGenerating}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sous-titre</Label>
              <Input
                placeholder="Ex: Élégance Intemporelle"
                value={textOverlay.subtitle}
                onChange={(e) => setTextOverlay({...textOverlay, subtitle: e.target.value})}
                disabled={isGenerating}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Call-to-action</Label>
              <Input
                placeholder="Ex: Découvrir Maintenant"
                value={textOverlay.cta}
                onChange={(e) => setTextOverlay({...textOverlay, cta: e.target.value})}
                disabled={isGenerating}
              />
            </div>
          </div>
        </div>

        {/* DESCRIPTION PRODUIT */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            5. Description du produit
            <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Montre de luxe en acier inoxydable"
            disabled={isGenerating}
          />
        </div>

        {/* PARAMÈTRES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <Label>6. Effet de caméra</Label>
            <Select value={cameraEffect} onValueChange={setCameraEffect} disabled={isGenerating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cameraEffects.map((effect) => (
                  <SelectItem key={effect.id} value={effect.id}>
                    <div className="flex items-center gap-2">
                      <span>{effect.icon}</span>
                      <span>{effect.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>7. Style visuel</Label>
            <Select value={videoStyle} onValueChange={setVideoStyle} disabled={isGenerating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {videoStyles.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>8. Durée</Label>
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
        </div>

        {/* FORMAT D'EXPORT (nouveau) */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">9. Format d'export</Label>
          <div className="grid grid-cols-3 gap-3">
            {exportFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => setExportFormat(format.id)}
                className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                  exportFormat === format.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                disabled={isGenerating}
              >
                <div className="text-sm font-semibold">{format.name}</div>
                <div className="text-xs text-muted-foreground">{format.ratio}</div>
                <div className="text-xs text-muted-foreground mt-1">{format.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* OPTIONS AVANCÉES */}
        <div className="space-y-3 border rounded-lg p-4">
          <Label className="text-base font-semibold">10. Options avancées</Label>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Ajouter des éléments visuels</p>
              <p className="text-xs text-muted-foreground">
                Particules, effets de lumière, décorations
              </p>
            </div>
            <Switch
              checked={generateElements}
              onCheckedChange={setGenerateElements}
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* BOUTON GÉNÉRATION */}
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
                Créer ma vidéo {selectedVideoType?.name}
              </>
            )}
          </Button>

          {!image && (
            <p className="text-xs text-center text-muted-foreground">
              Ajoutez une image pour commencer
            </p>
          )}

          {image && !environmentPrompt.trim() && (
            <p className="text-xs text-center text-muted-foreground">
              Décrivez l'environnement pour continuer
            </p>
          )}
        </div>
      </Card>

      {/* RÉSULTAT */}
      {result && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Votre {selectedVideoType?.name}</h3>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-primary/20 text-primary text-xs rounded-full font-medium">
                {selectedFormat?.name} - {selectedFormat?.ratio}
              </div>
              <div className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                {result.metadata?.videoType}
              </div>
            </div>
          </div>
          <div
            className={`relative rounded-lg overflow-hidden border ${
              exportFormat === '1080x1920' ? 'aspect-[9/16]' : 
              exportFormat === '1920x1080' ? 'aspect-video' : 
              'aspect-square'
            }`}
            style={{
              backgroundColor: result.metadata?.cameraEffect === '360-rotate' && backgroundColor
                ? backgroundColor
                : 'black'
            }}
          >
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
            <div className="absolute top-2 right-2 px-3 py-1 bg-black/70 text-white text-xs rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {result.metadata?.cameraEffect}
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
              onClick={() => downloadMedia(result.image_url, `${videoType}-${exportFormat}-${result.id}.png`)}
            >
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
          </div>
        </Card>
      )}

      {/* MODAL */}
      <UniversalMediaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        media={result}
        onDownload={downloadMedia}
      />
    </div>
  );
};
