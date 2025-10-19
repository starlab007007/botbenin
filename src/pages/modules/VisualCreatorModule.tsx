import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Wand2, 
  Image as ImageIcon, 
  Video, 
  Sparkles, 
  Download, 
  Share2,
  Facebook,
  Instagram,
  Smile,
  Zap,
  Palette,
  Camera,
  TrendingUp,
  Eye,
  Trash2,
  History,
  FileText,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMediaManager, MediaItem } from '@/hooks/useMediaManager';
import { UniversalMediaModal } from '@/components/visual-creator/UniversalMediaModal';
import { useNavigate } from 'react-router-dom';
import { FlyerGenerator } from '@/components/visual-creator/FlyerGenerator';
import { AIVideography } from '@/components/visual-creator/AIVideography';
import { shareMediaFile } from '@/utils/socialShare';

interface SocialFormat {
  id: string;
  name: string;
  size: string;
  icon: any;
  gradient: string;
}

const socialFormats: SocialFormat[] = [
  { id: 'instagram-post', name: 'Instagram Post', size: '1080x1080', icon: Instagram, gradient: 'from-purple-600 to-pink-600' },
  { id: 'instagram-story', name: 'Instagram Story', size: '1080x1920', icon: Instagram, gradient: 'from-purple-500 to-orange-500' },
  { id: 'facebook-post', name: 'Facebook Post', size: '1200x630', icon: Facebook, gradient: 'from-blue-600 to-blue-700' },
  { id: 'tiktok', name: 'TikTok', size: '1080x1920', icon: Smile, gradient: 'from-black to-gray-800' },
];

const styles = [
  { id: 'modern', name: 'Moderne', emoji: '✨' },
  { id: 'minimal', name: 'Minimaliste', emoji: '⚪' },
  { id: 'colorful', name: 'Coloré', emoji: '🌈' },
  { id: 'elegant', name: 'Élégant', emoji: '💎' },
  { id: 'dynamic', name: 'Dynamique', emoji: '⚡' },
  { id: 'professional', name: 'Professionnel', emoji: '💼' },
];

export const VisualCreatorModule: React.FC = () => {
  const navigate = useNavigate();
  const { saveToGallery, downloadMedia, loadUserGallery } = useMediaManager();
  const [prompt, setPrompt] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('instagram-post');
  const [selectedStyle, setSelectedStyle] = useState<string>('modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Charger les créations récentes au montage
  React.useEffect(() => {
    const loadRecent = async () => {
      const recent = await loadUserGallery({ limit: 8 });
      setGeneratedImages(recent);
    };
    loadRecent();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Veuillez décrire votre création');
      return;
    }

    setIsGenerating(true);
    try {
      const format = socialFormats.find(f => f.id === selectedFormat);
      const style = styles.find(s => s.id === selectedStyle);
      
      const enhancedPrompt = `${prompt}. Style: ${style?.name}. Format: ${format?.name} ${format?.size}. Ultra high quality, professional, modern design.`;

      const { data, error } = await supabase.functions.invoke('generate-visual-content', {
        body: { 
          prompt: enhancedPrompt,
          format: selectedFormat,
          style: selectedStyle
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        // Sauvegarder automatiquement dans la galerie
        const savedMedia = await saveToGallery({
          type: 'image',
          prompt: prompt,
          style: style?.name,
          format: format?.name,
          imageUrl: data.imageUrl,
          metadata: {
            format: format?.size,
            generatedAt: new Date().toISOString()
          }
        });

        if (savedMedia) {
          setGeneratedImages(prev => [savedMedia, ...prev]);
          toast.success('✅ Création générée et sauvegardée !');
        }
      }
    } catch (error) {
      console.error('Erreur génération:', error);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleView = (media: MediaItem) => {
    setSelectedMedia(media);
    setIsModalOpen(true);
  };

  const handleDownload = (url: string, fileName: string) => {
    downloadMedia(url, fileName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border-b">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,transparent)]" />
        <div className="relative px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-fade-in">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Propulsé par l'Intelligence Artificielle</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary animate-fade-in">
              IA Créateur Visuel
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
              Créez des images et vidéos promotionnelles époustouflantes pour vos réseaux sociaux en quelques secondes. 
              Boostez votre visibilité et convertissez plus de clients grâce à l'IA.
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { icon: Zap, label: 'Génération rapide', value: '< 30s' },
                { icon: Palette, label: 'Styles uniques', value: '50+' },
                { icon: Camera, label: 'Formats sociaux', value: '10+' },
                { icon: TrendingUp, label: 'Engagement', value: '+300%' },
              ].map((stat, index) => (
                <Card key={index} className="p-4 bg-card/50 backdrop-blur border-primary/10 hover:border-primary/30 transition-all hover:scale-105">
                  <stat.icon className="w-6 h-6 text-primary mb-2 mx-auto" />
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="images" className="space-y-6">
          <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-3 h-12">
            <TabsTrigger value="images" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Images
            </TabsTrigger>
            <TabsTrigger value="flyers" className="gap-2">
              <FileText className="w-4 h-4" />
              Flyers
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video className="w-4 h-4" />
              AI Videography
            </TabsTrigger>
          </TabsList>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Creation Panel */}
              <Card className="lg:col-span-2 p-6 space-y-6 bg-card/50 backdrop-blur border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                    <Wand2 className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Créer une image</h2>
                    <p className="text-sm text-muted-foreground">Décrivez votre vision, l'IA s'occupe du reste</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Format Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Format de publication
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {socialFormats.map((format) => (
                        <button
                          key={format.id}
                          onClick={() => setSelectedFormat(format.id)}
                          className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                            selectedFormat === format.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-background hover:border-primary/50'
                          }`}
                        >
                          <format.icon className={`w-5 h-5 mb-2 bg-gradient-to-br ${format.gradient} bg-clip-text text-transparent`} />
                          <div className="text-sm font-medium text-foreground">{format.name}</div>
                          <div className="text-xs text-muted-foreground">{format.size}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Style visuel
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {styles.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`px-4 py-2 rounded-full border-2 transition-all hover:scale-105 ${
                            selectedStyle === style.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background hover:border-primary/50'
                          }`}
                        >
                          <span className="mr-2">{style.emoji}</span>
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Input */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Description de votre création
                    </label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ex: Une image promotionnelle pour mon nouveau produit bio, avec des fruits frais, des couleurs vives et un texte accrocheur..."
                      className="min-h-32 resize-none"
                    />
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    size="lg"
                    className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        Générer avec l'IA
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Tips Panel */}
              <Card className="p-6 space-y-4 bg-gradient-to-br from-accent/10 to-primary/10 border-primary/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Conseils pour de meilleurs résultats</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>Soyez précis dans votre description</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>Mentionnez les couleurs souhaitées</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>Indiquez l'ambiance désirée</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>Précisez le message à transmettre</span>
                  </li>
                </ul>

                <div className="pt-4 border-t border-primary/20">
                  <h4 className="font-medium text-foreground mb-2">Exemples de prompts</h4>
                  <div className="space-y-2">
                    {[
                      "Image promotionnelle pour restaurant, plat appétissant, éclairage chaleureux",
                      "Annonce de vente flash, fond dynamique, texte percutant, style moderne",
                      "Présentation de service, professionnel, couleurs corporate, épuré"
                    ].map((example, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(example)}
                        className="text-xs text-left p-2 rounded bg-background/50 hover:bg-background border border-border hover:border-primary/50 transition-all w-full"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Gallery */}
            {generatedImages.length > 0 && (
              <Card className="p-6 space-y-4 bg-card/50 backdrop-blur border-primary/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Vos créations récentes ({generatedImages.length})
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/visual-gallery')}
                    className="gap-2"
                  >
                    <History className="w-4 h-4" />
                    Voir toute la galerie
                  </Button>
                </div>
                
                <ScrollArea className="h-96">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {generatedImages.map((media, index) => (
                      <div
                        key={media.id}
                        className="group relative aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all"
                      >
                        <img
                          src={media.thumbnail_url || media.image_url}
                          alt={media.title || `Création ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleView(media)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleDownload(media.image_url!, `creation-${media.id}.png`)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => shareMediaFile(media.image_url!, media.title, false)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => shareMediaFile(media.image_url!, media.title, false)}
                          >
                            <Facebook className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>

          {/* Flyers Tab */}
          <TabsContent value="flyers" className="space-y-6">
            <FlyerGenerator />
          </TabsContent>

          {/* AI Videography Tab */}
          <TabsContent value="videos" className="space-y-6">
            <AIVideography />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de visualisation */}
      <UniversalMediaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        media={selectedMedia}
        onDownload={handleDownload}
      />
    </div>
  );
};
