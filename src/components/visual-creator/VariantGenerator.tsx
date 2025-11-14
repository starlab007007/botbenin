import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, Eye, Share2 } from 'lucide-react';
import { botbjVariants, getBotBJVariantPrompts } from '@/utils/botbjPromptVariants';
import JSZip from 'jszip';

interface GeneratedVariant {
  name: string;
  imageUrl: string | null;
  success: boolean;
  error?: string;
}

export const VariantGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentVariant, setCurrentVariant] = useState<string>('');
  const [results, setResults] = useState<GeneratedVariant[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<GeneratedVariant | null>(null);

  const base64ToBlob = (base64: string, type: string = 'image/png') => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type });
  };

  const downloadImage = (variant: GeneratedVariant) => {
    if (!variant.imageUrl) return;
    
    const link = document.createElement('a');
    link.href = variant.imageUrl;
    link.download = `${variant.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${variant.name} téléchargée`);
  };

  const downloadAllAsZip = async () => {
    try {
      const zip = new JSZip();
      const successfulResults = results.filter(r => r.success && r.imageUrl);
      
      if (successfulResults.length === 0) {
        toast.error('Aucune image à télécharger');
        return;
      }

      toast.info('Préparation du ZIP...');

      for (const result of successfulResults) {
        if (!result.imageUrl) continue;
        
        const base64Data = result.imageUrl.split(',')[1];
        const blob = base64ToBlob(base64Data);
        const filename = `${result.name.replace(/\s+/g, '_')}.png`;
        zip.file(filename, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'BOT.BJ_3_Variantes.zip';
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('ZIP téléchargé avec succès! 🎉');
    } catch (error) {
      console.error('Error creating ZIP:', error);
      toast.error('Erreur lors de la création du ZIP');
    }
  };

  const generateVariants = async () => {
    setIsGenerating(true);
    setProgress(0);
    setResults([]);
    setCurrentVariant('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Vous devez être connecté');
        return;
      }

      const variants = getBotBJVariantPrompts();
      
      toast.info('🎨 Génération de 3 variantes en cours...');
      setProgress(10);

      const { data, error } = await supabase.functions.invoke('generate-visual-variants', {
        body: { variants },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error:', error);
        toast.error('Erreur lors de la génération: ' + error.message);
        return;
      }

      if (!data || !data.results) {
        toast.error('Aucun résultat reçu');
        return;
      }

      setProgress(100);
      setResults(data.results);

      const successCount = data.summary.successful;
      const failedCount = data.summary.failed;

      if (successCount === 3) {
        toast.success(`✅ Les 3 variantes ont été générées avec succès!`);
      } else if (successCount > 0) {
        toast.warning(`⚠️ ${successCount}/3 variantes générées. ${failedCount} ont échoué.`);
      } else {
        toast.error('❌ Aucune variante n\'a pu être générée');
      }

    } catch (error) {
      console.error('Error generating variants:', error);
      toast.error('Erreur lors de la génération des variantes');
    } finally {
      setIsGenerating(false);
      setCurrentVariant('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-primary/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">🎨 Générateur de Variantes BOT.BJ</h2>
            <p className="text-muted-foreground">
              Génération automatique de 3 variantes marketing professionnelles
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            3 Variantes
          </Badge>
        </div>

        {/* Variant Cards Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {botbjVariants.map((variant, index) => (
            <Card key={variant.id} className="p-4 bg-background/50 border-muted">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono">
                  {String.fromCharCode(65 + index)}
                </Badge>
                <h3 className="font-semibold text-sm">{variant.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{variant.description}</p>
            </Card>
          ))}
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateVariants}
          disabled={isGenerating}
          className="w-full h-12 text-lg"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              🪄 Générer les 3 Variantes
            </>
          )}
        </Button>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            {currentVariant && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Génération: {currentVariant}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">📦 Résultats</h3>
            <Button
              onClick={downloadAllAsZip}
              variant="default"
              disabled={results.filter(r => r.success).length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger tout en ZIP
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {results.map((result, index) => (
              <Card key={index} className="overflow-hidden">
                {result.success && result.imageUrl ? (
                  <>
                    <div className="relative aspect-video bg-muted group">
                      <img
                        src={result.imageUrl}
                        alt={result.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => setSelectedPreview(result)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => downloadImage(result)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="default">✅ Succès</Badge>
                        <Badge variant="outline" className="font-mono">
                          {String.fromCharCode(65 + index)}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm">{result.name}</h4>
                    </div>
                  </>
                ) : (
                  <div className="p-6">
                    <Badge variant="destructive" className="mb-2">❌ Échec</Badge>
                    <h4 className="font-semibold text-sm mb-2">{result.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {result.error || 'Erreur inconnue'}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedPreview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPreview(null)}
        >
          <div className="max-w-6xl w-full bg-background rounded-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">{selectedPreview.name}</h2>
                <p className="text-sm text-muted-foreground">1200x630px</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(selectedPreview);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPreview(null)}
                >
                  Fermer
                </Button>
              </div>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              <img
                src={selectedPreview.imageUrl || ''}
                alt={selectedPreview.name}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
