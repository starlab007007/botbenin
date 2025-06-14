
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdvancedCampaignFeatures } from "@/hooks/useAdvancedCampaignFeatures";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Check, X, RefreshCw } from "lucide-react";

interface AIContentGeneratorProps {
  campaignId: string;
}

export const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({ campaignId }) => {
  const { aiAssets, generateAIContent, fetchAIAssets } = useAdvancedCampaignFeatures();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [assetType, setAssetType] = useState<'text' | 'image' | 'hashtags' | 'variation'>('text');
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    fetchAIAssets(campaignId);
  }, [campaignId]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt requis", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    const result = await generateAIContent(campaignId, assetType, prompt);
    setIsGenerating(false);

    if (result) {
      setPrompt("");
      toast({ title: "Contenu généré", description: "Le contenu IA a été créé avec succès." });
    } else {
      toast({ title: "Erreur", description: "Impossible de générer le contenu.", variant: "destructive" });
    }
  };

  const assetTypes = [
    { value: "text", label: "Texte" },
    { value: "image", label: "Image" },
    { value: "hashtags", label: "Hashtags" },
    { value: "variation", label: "Variations" }
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
          Générateur de Contenu IA
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type de contenu</label>
            <Select value={assetType} onValueChange={(value: any) => setAssetType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assetTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décrivez le contenu que vous souhaitez générer..."
              rows={3}
            />
          </div>
          
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Générer le contenu
              </>
            )}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h4 className="font-medium">Contenu généré</h4>
        {aiAssets.map((asset) => (
          <Card key={asset.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                  {asset.assetType}
                </span>
                {asset.qualityScore && (
                  <span className="ml-2 text-sm text-gray-500">
                    Score: {Math.round(asset.qualityScore)}%
                  </span>
                )}
              </div>
              <div className="flex space-x-1">
                <Button size="sm" variant="ghost" className="text-green-600">
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded text-sm mb-2">
              <strong>Prompt:</strong> {asset.promptUsed}
            </div>
            
            <div className="bg-blue-50 p-3 rounded text-sm">
              <strong>Contenu généré:</strong>
              <pre className="mt-1 whitespace-pre-wrap">
                {JSON.stringify(asset.generatedContent, null, 2)}
              </pre>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              Généré le {new Date(asset.createdAt).toLocaleDateString()}
            </div>
          </Card>
        ))}
        
        {aiAssets.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            Aucun contenu généré pour l'instant. Utilisez le générateur ci-dessus pour commencer.
          </div>
        )}
      </div>
    </div>
  );
};
