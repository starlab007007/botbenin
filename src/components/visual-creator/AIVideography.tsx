import { useState, useRef } from 'react';
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
import { Upload, Wand2, X, Download, Eye, Video, Sparkles, Zap, BookOpen, Palette, Film, RotateCw, CheckCircle2, Clock, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMediaManager } from '@/hooks/useMediaManager';
import { UniversalMediaModal } from './UniversalMediaModal';
import { VideoGenerator } from '@/utils/videoGenerator';
import { useVideoRecorder } from '@/hooks/useVideoRecorder';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const animationTypes = [
  {
    id: 'product-rotation',
    name: 'Product Rotation',
    description: 'Rotation 360° du produit dans son environnement',
    duration: 8,
    frames: 240,
    icon: RotateCw,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'environment-story',
    name: 'Environment Story',
    description: 'Histoire cinématique : environnement → produit → éléments',
    duration: 12,
    frames: 360,
    icon: Film,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'dynamic-showcase',
    name: 'Dynamic Showcase',
    description: 'Présentation dynamique avec mouvements dramatiques',
    duration: 10,
    frames: 300,
    icon: Sparkles,
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'minimal-motion',
    name: 'Minimal Motion',
    description: 'Mouvements subtils et élégants, style minimaliste',
    duration: 6,
    frames: 180,
    icon: Camera,
    color: 'from-gray-500 to-slate-500',
  },
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
  const [animationType, setAnimationType] = useState<'product-rotation' | 'environment-story' | 'dynamic-showcase' | 'minimal-motion'>('product-rotation');
  const [videoStyle, setVideoStyle] = useState('modern');
  const [description, setDescription] = useState('');
  const [environmentPrompt, setEnvironmentPrompt] = useState('');
  const [generateElements, setGenerateElements] = useState(false);
  const [exportFormat, setExportFormat] = useState('1080x1080');
  const [textOverlay, setTextOverlay] = useState({
    enabled: false,
    title: '',
    subtitle: '',
    cta: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [result, setResult] = useState<{ url: string; type: 'image' | 'video'; blob?: Blob; id?: string; prompt?: string } | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      toast.error('Veuillez d\'abord uploader une image du produit');
      return;
    }

    if (!environmentPrompt.trim()) {
      toast.error('Veuillez décrire l\'environnement souhaité');
      return;
    }

    if (!canvasRef.current) {
      toast.error('Erreur d\'initialisation du canvas');
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      // Step 1: Enhance product
      setGenerationStep('Étape 1/5: Amélioration du produit...');
      toast.info('Étape 1/5: Amélioration du produit...');
      const enhanceResponse = await supabase.functions.invoke('generate-ai-video', {
        body: {
          step: 'enhance-product',
          image,
          videoType,
          format: exportFormat,
          description: description || 'Professional product enhancement for video animation',
        }
      });

      if (enhanceResponse.error) throw enhanceResponse.error;
      const enhancedProductUrl = enhanceResponse.data.imageUrl;
      toast.success('✓ Produit amélioré');

      // Step 2: Generate environment
      setGenerationStep('Étape 2/5: Création de l\'environnement...');
      toast.info('Étape 2/5: Création de l\'environnement...');
      const envResponse = await supabase.functions.invoke('generate-ai-video', {
        body: {
          step: 'generate-environment',
          environmentPrompt,
          videoType,
          format: exportFormat,
          videoStyle,
        }
      });

      if (envResponse.error) throw envResponse.error;
      const environmentUrl = envResponse.data.imageUrl;
      toast.success('✓ Environnement généré');

      // Step 3: Generate visual elements (if enabled)
      let elementsUrl = null;
      if (generateElements) {
        setGenerationStep('Étape 3/5: Génération des éléments visuels...');
        toast.info('Étape 3/5: Génération des éléments visuels...');
        const elementsResponse = await supabase.functions.invoke('generate-ai-video', {
          body: {
            step: 'generate-elements',
            videoType,
            format: exportFormat,
          }
        });

        if (elementsResponse.error) throw elementsResponse.error;
        elementsUrl = elementsResponse.data.imageUrl;
        toast.success('✓ Éléments visuels créés');
      } else {
        toast.info('Étape 3/5: Éléments visuels ignorés');
      }

      // Step 4: Animate with Canvas
      setGenerationStep('Étape 4/5: Animation du produit...');
      toast.info('Étape 4/5: Animation du produit...');

      const selectedAnimation = animationTypes.find(a => a.id === animationType)!;
      const [width, height] = exportFormat.split('x').map(Number);

      const videoGenerator = new VideoGenerator(
        canvasRef.current,
        {
          animationType,
          duration: selectedAnimation.duration,
          width,
          height,
          fps: 30,
          textOverlay: textOverlay.enabled ? textOverlay : undefined,
        },
        {
          productImage: enhancedProductUrl,
          environmentImage: environmentUrl,
          elementsImage: elementsUrl || undefined,
        }
      );

      await videoGenerator.loadAssets();
      toast.success('✓ Assets chargés');

      // Step 5: Record video
      setGenerationStep('Étape 5/5: Enregistrement vidéo...');
      toast.info('Étape 5/5: Enregistrement vidéo MP4...');

      const recorder = useVideoRecorder();

      // Create a promise wrapper for the recording
      const recordVideo = (): Promise<{ blob: Blob; url: string }> => {
        return new Promise((resolve, reject) => {
          recorder.startRecording(
            {
              canvas: canvasRef.current!,
              duration: selectedAnimation.duration,
              fps: 30,
            },
            (blob, url) => {
              resolve({ blob, url });
            }
          ).catch(reject);

          // Start animation simultaneously
          videoGenerator.animate((progress) => {
            setGenerationStep(`Enregistrement: ${Math.round(progress * 100)}%`);
          }).catch(reject);
        });
      };

      const { blob: videoBlob, url: videoUrl } = await recordVideo();
      toast.success('✓ Vidéo enregistrée');

      // Save to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(`ai-videos/${Date.now()}.webm`, videoBlob, {
          contentType: 'video/webm',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(uploadData.path);

      setResult({ 
        url: videoUrl, 
        type: 'video', 
        blob: videoBlob,
        id: uploadData.path,
        prompt: `${videoType} - ${animationType} - ${environmentPrompt}`
      });
      toast.success('🎬 Vidéo MP4 générée avec succès!');
      setGenerationStep('');
    } catch (error) {
      console.error('Erreur génération:', error);
      toast.error('Erreur lors de la génération');
      setGenerationStep('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (result) {
      downloadMedia(result.url, `ai-video-${animationType}-${exportFormat}.webm`);
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
              Studio de Production Vidéo AI
              <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full">
                MP4 Real-Time
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Génération de vidéos MP4 professionnelles avec animations Canvas en temps réel
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
              videoType === 'story-telling' ? "Ex: Bureau moderne lumineux avec vue sur la ville, professionnel" :
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

        {/* TEXTE OVERLAY */}
        <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              4. Texte sur la vidéo
            </Label>
            <Switch
              checked={textOverlay.enabled}
              onCheckedChange={(checked) => setTextOverlay({...textOverlay, enabled: checked})}
              disabled={isGenerating}
            />
          </div>
          {textOverlay.enabled && (
            <div className="grid gap-3 pt-2">
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
          )}
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

        {/* ANIMATION TYPE */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-primary" />
            <Label className="text-base font-semibold">6. Type d'Animation Vidéo</Label>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {animationTypes.map((animation) => {
              const Icon = animation.icon;
              return (
                <Card
                  key={animation.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    animationType === animation.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setAnimationType(animation.id as typeof animationType)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${animation.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-base">{animation.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{animation.duration}s</span>
                            <span className="text-xs">•</span>
                            <span>{animation.frames} frames</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {animation.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* STYLE VISUEL */}
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

        {/* FORMAT D'EXPORT */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">8. Format d'export</Label>
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
          <Label className="text-base font-semibold">9. Options avancées</Label>
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
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || !image || !environmentPrompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {generationStep || 'Génération en cours...'}
              </>
            ) : (
              <>
                <Film className="mr-2 h-5 w-5" />
                Générer Vidéo MP4
              </>
            )}
          </Button>

          {/* Hidden canvas for video rendering */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Vidéo MP4 Générée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border bg-black">
              {result.type === 'video' ? (
                <video
                  src={result.url}
                  controls
                  autoPlay
                  loop
                  className="w-full h-auto"
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              ) : (
                <img
                  src={result.url}
                  alt="Generated preview"
                  className="w-full h-auto"
                />
              )}
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Format:</span>
                <span className="font-medium">{exportFormat} • 30 FPS • WebM</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Durée:</span>
                <span className="font-medium">
                  {animationTypes.find(a => a.id === animationType)?.duration}s
                </span>
              </div>
              {result.blob && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Taille:</span>
                  <span className="font-medium">
                    {(result.blob.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(true)}
                className="flex-1"
              >
                <Eye className="mr-2 h-4 w-4" />
                Visualiser en grand
              </Button>
              <Button
                onClick={handleDownload}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger MP4
              </Button>
            </div>
          </CardContent>
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
