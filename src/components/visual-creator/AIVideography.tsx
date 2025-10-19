import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Wand2, X, Download, Eye, Video, Sparkles, Zap, BookOpen, Palette, Film, RotateCw, CheckCircle2, Clock, Loader2, Camera, Share2, MessageCircle, Facebook } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMediaManager, MediaItem } from '@/hooks/useMediaManager';
import { UniversalMediaModal } from './UniversalMediaModal';
import { VideoHistory } from './VideoHistory';
import { VideoGenerator } from '@/utils/videoGenerator';
import { useVideoRecorder } from '@/hooks/useVideoRecorder';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GenerationProgress } from './GenerationProgress';
import { shareMediaFile, shareOnTikTok } from '@/utils/socialShare';

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
  const videoRecorder = useVideoRecorder();
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
  
  interface VideoResult {
    url: string;
    type: 'image' | 'video';
    blob?: Blob;
    id: string;
    prompt: string;
    savedMedia?: MediaItem;
  }
  
  interface GenerationStep {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    result?: {
      image?: string;
      data?: any;
    };
    error?: string;
  }
  
  const [result, setResult] = useState<VideoResult | null>(null);
  const [progressSteps, setProgressSteps] = useState<GenerationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepsPaused, setStepsPaused] = useState(false);
  // Store intermediate results
  const [enhancedProductUrl, setEnhancedProductUrl] = useState<string | null>(null);
  const [environmentUrl, setEnvironmentUrl] = useState<string | null>(null);
  const [elementsUrl, setElementsUrl] = useState<string | null>(null);
  const [composedImageUrl, setComposedImageUrl] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewStepMedia, setPreviewStepMedia] = useState<MediaItem | null>(null);
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

  const initializeProgressSteps = () => {
    const steps: GenerationStep[] = [
      {
        id: 'enhance-product',
        title: 'Amélioration du produit',
        description: 'Optimisation qualité et détails du produit',
        status: 'pending'
      },
      {
        id: 'generate-environment',
        title: 'Génération environnement',
        description: 'Création du décor et de l\'ambiance',
        status: 'pending'
      },
      {
        id: 'compose-final',
        title: 'Composition finale',
        description: 'Intégration du produit dans l\'environnement',
        status: 'pending'
      },
      {
        id: 'animate-video',
        title: 'Animation vidéo',
        description: 'Application animation et enregistrement',
        status: 'pending'
      }
    ];
    setProgressSteps(steps);
    setCurrentStepIndex(0);
  };

  const updateStepStatus = (stepId: string, status: GenerationStep['status'], result?: any, error?: string) => {
    setProgressSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, result, error }
        : step
    ));
  };

  const executeEnhanceProduct = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    
    // Convert base64 image to blob if needed and upload to avoid large payloads
    let imageUrl = image;
    if (image.startsWith('data:')) {
      const blob = await fetch(image).then(r => r.blob());
      const uploadFileName = `${user.id}/ai-video-input/original-${Date.now()}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(uploadFileName, blob, { contentType: 'image/png', upsert: false });
      
      if (uploadError) {
        console.error('Upload original image error:', uploadError);
        throw new Error(`Échec upload image: ${uploadError.message}`);
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(uploadData.path);
      
      imageUrl = publicUrl;
    }
    
    try {
      console.log('🚀 Calling enhance-product with URL:', imageUrl);
      console.log('📦 Request body:', {
        step: 'enhance-product',
        image: imageUrl ? imageUrl.substring(0, 100) + '...' : 'null',
        videoType,
        format: exportFormat
      });
      
      const enhanceResponse = await supabase.functions.invoke('generate-ai-video', {
        body: {
          step: 'enhance-product',
          image: imageUrl,
          videoType,
          format: exportFormat,
          description: description || 'Professional product enhancement',
        }
      });

      console.log('✅ Enhance response received:', enhanceResponse);

      if (enhanceResponse.error) {
        console.error('❌ Edge function error:', enhanceResponse.error);
        
        // Détecter si c'est une erreur de fonction non déployée
        if (enhanceResponse.error.message?.includes('FunctionsRelayError') || 
            enhanceResponse.error.message?.includes('Failed to fetch')) {
          throw new Error('La fonction de génération vidéo n\'est pas encore déployée. Veuillez attendre 2-3 minutes et réessayer, ou déployez manuellement avec: supabase functions deploy generate-ai-video');
        }
        
        throw new Error(enhanceResponse.error.message || 'Échec de l\'amélioration du produit');
      }
      
      if (!enhanceResponse.data || !enhanceResponse.data.enhancedImage) {
        console.error('Invalid response data:', enhanceResponse.data);
        throw new Error('Réponse invalide: image améliorée manquante');
      }
      
      const enhancedImageUrl = enhanceResponse.data.enhancedImage;
      console.log('Enhanced image URL type:', enhancedImageUrl.substring(0, 50));
      
      // Check if it's already a public URL or base64
      let finalUrl = enhancedImageUrl;
      
      if (enhancedImageUrl.startsWith('data:')) {
        // It's base64, convert and upload
        console.log('Converting base64 to blob and uploading...');
        const blob = await fetch(enhancedImageUrl).then(r => r.blob());
        const fileName = `${user.id}/ai-video-steps/product-${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, blob, { contentType: 'image/png', upsert: false });
        
        if (uploadError) {
          console.error('Upload enhanced image error:', uploadError);
          throw new Error(`Échec upload image améliorée: ${uploadError.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(uploadData.path);
        
        finalUrl = publicUrl;
        console.log('Uploaded enhanced image to:', finalUrl);
      } else {
        console.log('Enhanced image is already a public URL:', finalUrl);
      }
      
      setEnhancedProductUrl(finalUrl);
      updateStepStatus('enhance-product', 'completed', { image: finalUrl });
      console.log('Product enhancement completed successfully');
    } catch (error: any) {
      console.error('executeEnhanceProduct error:', error);
      
      // Handle network errors specifically
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        throw new Error('Erreur de connexion. Vérifiez votre connexion internet et réessayez.');
      }
      throw error;
    }
  };

  const executeGenerateEnvironment = async () => {
    try {
      console.log('Calling generate-environment...');
      
      const envResponse = await supabase.functions.invoke('generate-ai-video', {
        body: {
          step: 'generate-environment',
          environmentPrompt,
          videoType,
          format: exportFormat,
          videoStyle,
        }
      });

      console.log('Environment response:', envResponse);

      if (envResponse.error) {
        console.error('Edge function error:', envResponse.error);
        throw new Error(envResponse.error.message || 'Échec de la génération d\'environnement');
      }
      
      if (!envResponse.data || !envResponse.data.environmentImage) {
        console.error('Invalid response data:', envResponse.data);
        throw new Error('Réponse invalide: image environnement manquante');
      }
      
      const environmentImageUrl = envResponse.data.environmentImage;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');
      
      let finalUrl = environmentImageUrl;
      
      if (environmentImageUrl.startsWith('data:')) {
        console.log('Converting base64 environment to blob and uploading...');
        const blob = await fetch(environmentImageUrl).then(r => r.blob());
        const fileName = `${user.id}/ai-video-steps/environment-${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, blob, { contentType: 'image/png', upsert: false });
        
        if (uploadError) {
          console.error('Upload environment error:', uploadError);
          throw new Error(`Échec upload environnement: ${uploadError.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(uploadData.path);
        
        finalUrl = publicUrl;
        console.log('Uploaded environment to:', finalUrl);
      }
      
      setEnvironmentUrl(finalUrl);
      updateStepStatus('generate-environment', 'completed', { image: finalUrl });
      console.log('Environment generation completed successfully');
    } catch (error: any) {
      console.error('executeGenerateEnvironment error:', error);
      
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        throw new Error('Erreur de connexion. Vérifiez votre connexion internet et réessayez.');
      }
      throw error;
    }
  };

  const executeComposeFinal = async () => {
    if (!enhancedProductUrl || !environmentUrl) {
      throw new Error('Images produit et environnement manquantes');
    }

    try {
      console.log('Calling compose-final with:', { enhancedProductUrl, environmentUrl });
      
      const composeResponse = await supabase.functions.invoke('generate-ai-video', {
        body: {
          step: 'compose-final',
          productImage: enhancedProductUrl,
          environmentImage: environmentUrl,
          videoType,
          videoStyle,
          cameraEffect: animationType,
          exportFormat,
          textOverlay: textOverlay.enabled ? textOverlay : undefined,
        }
      });

      console.log('Compose response:', composeResponse);

      if (composeResponse.error) {
        console.error('Edge function error:', composeResponse.error);
        throw new Error(composeResponse.error.message || 'Échec de la composition finale');
      }
      
      if (!composeResponse.data || !composeResponse.data.composedImage) {
        console.error('Invalid response data:', composeResponse.data);
        throw new Error('Réponse invalide: image composée manquante');
      }
      
      const composedImageUrl = composeResponse.data.composedImage;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');
      
      let finalUrl = composedImageUrl;
      
      if (composedImageUrl.startsWith('data:')) {
        console.log('Converting base64 composed image to blob and uploading...');
        const blob = await fetch(composedImageUrl).then(r => r.blob());
        const fileName = `${user.id}/ai-video-steps/composed-${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, blob, { contentType: 'image/png', upsert: false });
        
        if (uploadError) {
          console.error('Upload composed image error:', uploadError);
          throw new Error(`Échec upload image composée: ${uploadError.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(uploadData.path);
        
        finalUrl = publicUrl;
        console.log('Uploaded composed image to:', finalUrl);
      }
      
      setComposedImageUrl(finalUrl);
      updateStepStatus('compose-final', 'completed', { image: finalUrl });
      console.log('Composition completed successfully');
    } catch (error: any) {
      console.error('executeComposeFinal error:', error);
      
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        throw new Error('Erreur de connexion. Vérifiez votre connexion internet et réessayez.');
      }
      throw error;
    }
  };

  const executeAnimateVideo = async () => {
    if (!canvasRef.current) {
      throw new Error('Canvas non initialisé');
    }

    // Use composed image if available, otherwise fall back to separate images
    const hasComposedImage = !!composedImageUrl;
    if (!hasComposedImage && (!enhancedProductUrl || !environmentUrl)) {
      throw new Error('Images manquantes');
    }

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
        productImage: composedImageUrl || enhancedProductUrl!,
        environmentImage: composedImageUrl || environmentUrl!,
        elementsImage: elementsUrl || undefined,
        isComposed: hasComposedImage,
      }
    );

    await videoGenerator.loadAssets();
    
    const recordVideo = (): Promise<{ blob: Blob; url: string }> => {
      return new Promise((resolve, reject) => {
        videoRecorder.startRecording(
          {
            canvas: canvasRef.current!,
            duration: selectedAnimation.duration,
            fps: 30,
          },
          (blob, url) => resolve({ blob, url })
        ).catch(reject);

        videoGenerator.animate((progress) => {
          setGenerationStep(`Animation: ${Math.round(progress * 100)}%`);
        }).catch(reject);
      });
    };

    const { blob: videoBlob, url: videoUrl } = await recordVideo();

    // Déterminer le type MIME du blob
    const videoFileType = videoBlob.type === 'video/mp4' ? 'mp4' : 'webm';

    // Get user ID for storage path
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const fileName = `${user.id}/ai-videos/${Date.now()}.${videoFileType}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, videoBlob, {
        contentType: videoBlob.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(uploadData.path);

    // Utiliser l'URL publique pour le résultat
    setResult({ 
      url: publicUrl, 
      type: 'video' as const, 
      blob: videoBlob,
      id: uploadData.path,
      prompt: `${videoFileType} - ${animationType} - ${environmentPrompt}`
    });

    // Sauvegarder automatiquement dans la galerie
    try {
      const savedMedia = await saveToGallery({
        type: 'video',
        title: `Vidéo ${videoType} - ${animationType}`,
        prompt: environmentPrompt || description,
        style: videoStyle,
        format: exportFormat,
        imageUrl: publicUrl,
        metadata: {
          animationType,
          videoType,
          duration: selectedAnimation.duration,
          exportFormat,
          originalFormat: videoBlob.type === 'video/mp4' ? 'mp4' : 'webm',
          compatible: 'all-devices' // MP4 compatible avec tous les appareils
        }
      });

      if (savedMedia) {
        setResult(prev => prev ? { ...prev, savedMedia } : null);
        toast.success('✅ Vidéo générée et sauvegardée !');
      }
    } catch (saveError) {
      console.error('Auto-save error:', saveError);
      // Ne pas bloquer, l'utilisateur peut sauvegarder manuellement
    }
    
    // Utiliser l'URL publique dans le step pour la visualisation
    updateStepStatus('animate-video', 'completed', { image: publicUrl, data: { publicUrl } });
  };

  const handleRegenerateStep = async (stepId: string) => {
    const stepIndex = progressSteps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;

    setProgressSteps(prev => prev.map((step, idx) => 
      idx >= stepIndex 
        ? { ...step, status: 'pending' as const, result: undefined, error: undefined }
        : step
    ));

    setCurrentStepIndex(stepIndex);
    setStepsPaused(false);
    await continueGeneration(stepIndex);
  };

  const handleContinueGeneration = () => {
    setStepsPaused(false);
    continueGeneration(currentStepIndex + 1);
  };

  const continueGeneration = async (fromStepIndex: number) => {
    const steps = progressSteps;
    
    for (let i = fromStepIndex; i < steps.length && !stepsPaused; i++) {
      setCurrentStepIndex(i);
      const step = steps[i];
      
      try {
        updateStepStatus(step.id, 'processing');
        
        if (step.id === 'enhance-product') {
          await executeEnhanceProduct();
        } else if (step.id === 'generate-environment') {
          await executeGenerateEnvironment();
        } else if (step.id === 'compose-final') {
          await executeComposeFinal();
        } else if (step.id === 'animate-video') {
          await executeAnimateVideo();
        }
        
        updateStepStatus(step.id, 'completed');
        setStepsPaused(true);
        return;
        
      } catch (error: any) {
        console.error(`Error in step ${step.id}:`, error);
        const errorMessage = error.message || 'Une erreur s\'est produite';
        updateStepStatus(step.id, 'error', undefined, errorMessage);
        toast.error(`Erreur: ${errorMessage}`);
        setIsGenerating(false);
        return;
      }
    }
    
    setIsGenerating(false);
    toast.success("✓ Vidéo générée avec succès!");
  };

  const handleGenerate = async () => {
    if (!image) {
      toast.error("Veuillez uploader une image du produit");
      return;
    }

    if (!environmentPrompt.trim()) {
      toast.error("Veuillez décrire l'environnement");
      return;
    }

    if (!canvasRef.current) {
      toast.error("Canvas non initialisé");
      return;
    }

    setIsGenerating(true);
    setResult(null);
    initializeProgressSteps();
    await continueGeneration(0);
  };

  const handleDownload = async () => {
    if (!result) {
      toast.error('Aucun résultat à télécharger');
      return;
    }

    try {
      if (result.blob) {
        const fileName = `ai-video-${animationType}-${exportFormat}-${Date.now()}.mp4`;
        
        // Si c'est du WebM, convertir en MP4
        if (result.blob.type === 'video/webm') {
          toast.info('Conversion en MP4...', { id: 'converting' });
          const { convertWebMtoMP4 } = await import('@/utils/videoConverter');
          const { downloadAsFile } = await import('@/utils/socialShare');
          
          const mp4Blob = await convertWebMtoMP4(result.blob, (progress) => {
            toast.loading(`Conversion: ${progress}%`, { id: 'converting' });
          });
          toast.dismiss('converting');
          
          downloadAsFile(mp4Blob, fileName);
          toast.success('Vidéo téléchargée en MP4 !');
        } else {
          // Téléchargement direct
          const { downloadAsFile } = await import('@/utils/socialShare');
          downloadAsFile(result.blob, fileName);
          toast.success('Vidéo téléchargée !');
        }
      } else {
        toast.error('Blob vidéo manquant');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleSaveStep = async (stepId: string, imageUrl: string) => {
    const step = progressSteps.find(s => s.id === stepId);
    if (!step) return;

    await saveToGallery({
      type: 'image',
      title: `${step.title} - ${videoType}`,
      prompt: environmentPrompt || description,
      style: videoStyle,
      format: exportFormat,
      imageUrl,
      metadata: {
        stepId,
        animationType,
        videoType,
      }
    });
  };

  const handleSaveVideo = async () => {
    if (!result) return;

    await saveToGallery({
      type: 'video',
      title: `Vidéo ${videoType} - ${animationType}`,
      prompt: environmentPrompt || description,
      style: videoStyle,
      format: exportFormat,
      imageUrl: result.url,
      metadata: {
        animationType,
        videoType,
        duration: animationTypes.find(a => a.id === animationType)?.duration,
        exportFormat,
      }
    });

    toast.success('Vidéo sauvegardée dans votre galerie !');
  };

  const handleReuseParameters = (media: MediaItem) => {
    if (media.metadata) {
      if (media.metadata.videoType) setVideoType(media.metadata.videoType);
      if (media.metadata.animationType) setAnimationType(media.metadata.animationType);
      if (media.metadata.exportFormat) setExportFormat(media.metadata.exportFormat);
    }
    if (media.style) setVideoStyle(media.style);
    if (media.prompt) setEnvironmentPrompt(media.prompt);
    
    toast.success('Paramètres restaurés !');
    // Scroll to top to see the restored parameters
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedVideoType = videoTypes.find(t => t.id === videoType);
  const selectedFormat = exportFormats.find(f => f.id === exportFormat);

  return (
    <Tabs defaultValue="create" className="space-y-6 max-w-5xl mx-auto">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="create">Créer une vidéo</TabsTrigger>
        <TabsTrigger value="history">Historique</TabsTrigger>
      </TabsList>

      <TabsContent value="create" className="space-y-6">
        {/* Guide d'utilisation */}
      <Card className="p-4 md:p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-2">Comment utiliser ce studio vidéo ?</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-primary">1.</span>
                <span>Choisissez le type de vidéo et uploadez votre image produit</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-primary">2.</span>
                <span>Décrivez l'environnement souhaité et configurez les options</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-primary">3.</span>
                <span>Lancez la génération - chaque étape peut être visualisée et téléchargée</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-primary">4.</span>
                <span>Téléchargez votre vidéo finale au format MP4</span>
              </li>
            </ol>
          </div>
        </div>
      </Card>

      <Card className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold flex flex-wrap items-center gap-2">
              Studio de Production Vidéo AI
              <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full">
                MP4 Real-Time
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Génération de vidéos MP4 professionnelles avec animations Canvas en temps réel
            </p>
          </div>
        </div>

        {/* TYPE DE VIDÉO */}
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            1. Type de vidéo
            <span className="text-xs font-normal text-muted-foreground">(Requis)</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          <Label className="text-base font-semibold flex items-center gap-2">
            2. Image du produit
            <span className="text-xs font-normal text-muted-foreground">(Requis)</span>
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

        {/* ENVIRONNEMENT */}
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            3. Environnement (description)
            <span className="text-xs font-normal text-muted-foreground">(Requis)</span>
          </Label>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* PROGRESSION DES ÉTAPES */}
      {progressSteps.length > 0 && (
        <GenerationProgress
          steps={progressSteps}
          currentStepIndex={currentStepIndex}
          onRegenerateStep={handleRegenerateStep}
          onContinue={handleContinueGeneration}
          onViewResult={(stepId) => {
            const step = progressSteps.find(s => s.id === stepId);
            if (step?.result?.image) {
              // Open in modal instead of new window
              const isVideo = step.id === 'animate-video';
              setPreviewStepMedia({
                id: step.id,
                type: isVideo ? 'video' : 'image',
                title: step.title,
                prompt: step.description,
                style: videoStyle,
                format: exportFormat,
                image_url: step.result.image,
                metadata: { stepId: step.id, videoType, animationType }
              } as MediaItem);
            }
          }}
          onSaveStep={handleSaveStep}
        />
      )}

      {/* RÉSULTAT */}
      {result && (
        <Card className="border-2 border-green-500/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Vidéo MP4 Générée avec Succès !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 md:p-6">
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
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Format:</span>
                <span className="font-medium">{exportFormat} • 30 FPS • {result.blob?.type === 'video/mp4' ? 'MP4' : 'WebM'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Durée:</span>
                <span className="font-medium">
                  {animationTypes.find(a => a.id === animationType)?.duration}s
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Compatibilité:</span>
                <span className="font-medium text-green-600">
                  ✓ Tous appareils {result.blob?.type === 'video/mp4' && '(MP4)'}
                </span>
              </div>
              {result.blob && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Taille:</span>
                  <span className="font-medium">
                    {(result.blob.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="default"
                onClick={handleSaveVideo}
                className="flex-1 gap-2"
                size="lg"
              >
                <Download className="h-4 w-4" />
                Sauvegarder dans la galerie
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(true)}
                className="flex-1 gap-2"
                size="lg"
              >
                <Eye className="h-4 w-4" />
                Visualiser en grand
              </Button>
              <Button
                onClick={handleDownload}
                className="flex-1 gap-2"
                size="lg"
              >
                <Download className="h-4 w-4" />
                Télécharger MP4
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center border-t pt-4">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   const shareUrl = result.savedMedia?.image_url || result.url;
                   if (shareUrl.startsWith('blob:')) {
                     toast.error('Veuillez patienter, sauvegarde en cours...');
                     return;
                   }
                   shareMediaFile(shareUrl, `Vidéo ${videoType}`, true);
                 }}
                 className="gap-2"
               >
                 <MessageCircle className="h-4 w-4" />
                 WhatsApp
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   const shareUrl = result.savedMedia?.image_url || result.url;
                   if (shareUrl.startsWith('blob:')) {
                     toast.error('Veuillez patienter, sauvegarde en cours...');
                     return;
                   }
                   shareMediaFile(shareUrl, `Vidéo ${videoType}`, true);
                 }}
                 className="gap-2"
               >
                 <Facebook className="h-4 w-4" />
                 Facebook
               </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const shareUrl = result.savedMedia?.image_url || result.url;
                  if (shareUrl.startsWith('blob:')) {
                    toast.error('Veuillez patienter, sauvegarde en cours...');
                    return;
                  }
                  shareOnTikTok(shareUrl, `Vidéo ${videoType}`);
                }}
                className="gap-2"
              >
                <Video className="h-4 w-4" />
                TikTok
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL - Final Video */}
      <UniversalMediaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        media={result ? {
          id: result.id,
          type: 'video',
          title: `Vidéo ${videoType}`,
          prompt: environmentPrompt || description,
          style: videoStyle,
          format: exportFormat,
          image_url: result.url,
          metadata: { animationType, videoType }
        } as MediaItem : null}
        onDownload={downloadMedia}
      />

      {/* MODAL - Step Preview */}
      <UniversalMediaModal
        isOpen={!!previewStepMedia}
        onClose={() => setPreviewStepMedia(null)}
        media={previewStepMedia}
        onDownload={downloadMedia}
      />
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <VideoHistory onReuseParameters={handleReuseParameters} />
      </TabsContent>
    </Tabs>
  );
};
