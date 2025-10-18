import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Frame {
  frame_type: 'hero' | 'demo' | 'result' | 'cta';
  promotional_text: string | null;
}

interface PromotionalTextExporterProps {
  frames: Frame[];
  videoSummary?: string | null;
}

export function PromotionalTextExporter({ frames, videoSummary }: PromotionalTextExporterProps) {
  const { toast } = useToast();

  const exportAsJSON = () => {
    const data = {
      videoSummary,
      frames: frames.map(f => ({
        type: f.frame_type,
        text: f.promotional_text
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'promotional-texts.json';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export réussi',
      description: 'Fichier JSON téléchargé'
    });
  };

  const exportAsMarkdown = () => {
    const heroFrame = frames.find(f => f.frame_type === 'hero');
    const demoFrame = frames.find(f => f.frame_type === 'demo');
    const resultFrame = frames.find(f => f.frame_type === 'result');
    const ctaFrame = frames.find(f => f.frame_type === 'cta');

    const md = `# Textes Promotionnels

## Résumé Vidéo
${videoSummary || 'Non généré'}

## Frame Hero (Accroche)
${heroFrame?.promotional_text || 'Non généré'}

## Frame Demo (Démonstration)
${demoFrame?.promotional_text || 'Non généré'}

## Frame Result (Résultats)
${resultFrame?.promotional_text || 'Non généré'}

## Frame CTA (Appel à l'action)
${ctaFrame?.promotional_text || 'Non généré'}
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'promotional-texts.md';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export réussi',
      description: 'Fichier Markdown téléchargé'
    });
  };

  const copyForSocialMedia = (platform: 'tiktok' | 'instagram' | 'facebook') => {
    let formatted = videoSummary || '';
    
    if (platform === 'tiktok') {
      formatted += '\n\n#BéninEntrepreneurs #BusinessAfricain #TechBenin #Innovation';
    } else if (platform === 'instagram') {
      formatted += '\n\n#Entrepreneuriat #AfriqueDigitale #BusinessGrowth';
    }
    
    navigator.clipboard.writeText(formatted);
    toast({
      title: `Copié pour ${platform}`,
      description: 'Texte prêt à coller sur ' + platform
    });
  };

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
      <Button onClick={exportAsJSON} size="sm" className="w-full sm:w-auto">
        <Download className="mr-2 h-4 w-4" />
        <span className="text-xs sm:text-sm">Vidéo</span>
      </Button>
      <Button onClick={exportAsMarkdown} size="sm" variant="outline" className="w-full sm:w-auto">
        <Download className="mr-2 h-4 w-4" />
        <span className="text-xs sm:text-sm">📦 Frames (ZIP)</span>
      </Button>
      <Button onClick={() => copyForSocialMedia('tiktok')} size="sm" variant="outline" className="w-full sm:w-auto">
        <Share2 className="mr-2 h-4 w-4" />
        <span className="text-xs sm:text-sm">TikTok</span>
      </Button>
      <Button onClick={() => copyForSocialMedia('instagram')} size="sm" variant="outline" className="w-full sm:w-auto">
        <Share2 className="mr-2 h-4 w-4" />
        <span className="text-xs sm:text-sm">Instagram</span>
      </Button>
    </div>
  );
}
