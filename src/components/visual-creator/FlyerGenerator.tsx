import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Upload, Wand2, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMediaManager } from '@/hooks/useMediaManager';
import { UniversalMediaModal } from './UniversalMediaModal';

const flyerTemplates = [
  { id: 'restaurant', name: 'Restaurant', emoji: '🍽️', sizes: ['A4', 'A5', 'Instagram'] },
  { id: 'commerce', name: 'Commerce', emoji: '🛍️', sizes: ['A4', 'A5', 'Story'] },
  { id: 'event', name: 'Événement', emoji: '🎉', sizes: ['A4', 'Square', 'Story'] },
  { id: 'promo', name: 'Promotion', emoji: '💰', sizes: ['A4', 'Square', 'Story'] },
  { id: 'service', name: 'Service', emoji: '⚙️', sizes: ['A4', 'A5', 'Square'] },
];

export const FlyerGenerator = () => {
  const { saveToGallery, downloadMedia } = useMediaManager();
  const [template, setTemplate] = useState('restaurant');
  const [size, setSize] = useState('Instagram');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFlyer, setGeneratedFlyer] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!title || !description) {
      toast.error('Veuillez remplir le titre et la description');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedTemplate = flyerTemplates.find(t => t.id === template);
      const prompt = `Create a professional ${selectedTemplate?.name} flyer for ${size} format. 
Title: "${title}"
Description: "${description}"
${price ? `Price: ${price}` : ''}
${productImage ? 'Include the product image provided.' : ''}
Style: Modern, eye-catching, commercial design with clear typography and attractive layout.
Ultra high quality, print-ready design.`;

      const { data, error } = await supabase.functions.invoke('generate-visual-content', {
        body: {
          prompt,
          format: size.toLowerCase(),
          style: 'professional',
          type: 'flyer',
          baseImage: productImage
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const savedMedia = await saveToGallery({
          type: 'flyer',
          title: title,
          prompt: prompt,
          style: 'professional',
          format: size,
          imageUrl: data.imageUrl,
          metadata: {
            template: template,
            price: price,
            description: description
          }
        });

        if (savedMedia) {
          setGeneratedFlyer(savedMedia);
          toast.success('Flyer généré avec succès !');
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Erreur lors de la génération du flyer');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Générateur de Flyers</h2>
            <p className="text-sm text-muted-foreground">
              Créez des flyers professionnels pour vos promotions
            </p>
          </div>
        </div>

        {/* Template Selection */}
        <div className="space-y-3">
          <Label>Type de flyer</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {flyerTemplates.map((temp) => (
              <button
                key={temp.id}
                onClick={() => setTemplate(temp.id)}
                className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                  template === temp.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="text-3xl mb-2">{temp.emoji}</div>
                <div className="text-sm font-medium">{temp.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Size Selection */}
        <div className="space-y-3">
          <Label>Format</Label>
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {flyerTemplates
                .find(t => t.id === template)
                ?.sizes.map(s => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Image Upload */}
        <div className="space-y-3">
          <Label>Image produit (optionnel)</Label>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild className="cursor-pointer">
              <label>
                <Upload className="w-4 h-4 mr-2" />
                Uploader une image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </Button>
            {productImage && (
              <img
                src={productImage}
                alt="Preview"
                className="h-16 w-16 object-cover rounded-lg border"
              />
            )}
          </div>
        </div>

        {/* Text Inputs */}
        <div className="space-y-3">
          <Label>Titre principal *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: -50% sur tous nos produits"
          />
        </div>

        <div className="space-y-3">
          <Label>Description *</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre offre, promotion ou événement..."
            rows={4}
          />
        </div>

        <div className="space-y-3">
          <Label>Prix (optionnel)</Label>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ex: 49.99€"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !title || !description}
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
              Générer le flyer
            </>
          )}
        </Button>
      </Card>

      {/* Preview Generated Flyer */}
      {generatedFlyer && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">✅ Flyer créé avec succès</h3>
            <div className="text-sm text-muted-foreground">
              Sauvegardé dans votre galerie
            </div>
          </div>
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden border shadow-lg">
            <img
              src={generatedFlyer.image_url}
              alt={generatedFlyer.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsModalOpen(true)}
            >
              <Eye className="w-4 h-4" />
              Visualiser en grand
            </Button>
            <Button
              className="gap-2"
              onClick={() => downloadMedia(generatedFlyer.image_url, `flyer-${generatedFlyer.id}.png`)}
            >
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Le flyer est enregistré dans votre galerie et peut être téléchargé à tout moment
          </div>
        </Card>
      )}

      {/* Modal */}
      <UniversalMediaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        media={generatedFlyer}
        onDownload={downloadMedia}
      />
    </div>
  );
};
