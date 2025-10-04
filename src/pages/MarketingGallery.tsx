import React from 'react';
import { Download, Share2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Import all marketing images
import heroBotBJ from '@/assets/marketing/hero-botbj.jpg';
import flyerWhatsapp from '@/assets/marketing/flyer-whatsapp.jpg';
import flyerIABusiness from '@/assets/marketing/flyer-ia-business.jpg';
import flyerMarketing from '@/assets/marketing/flyer-marketing.jpg';
import flyerGestion from '@/assets/marketing/flyer-gestion.jpg';
import flyerCitoyen from '@/assets/marketing/flyer-citoyen.jpg';
import flyerCreateurVisuel from '@/assets/marketing/flyer-createur-visuel.jpg';
import postLancement from '@/assets/marketing/post-lancement.jpg';
import infographieTarifs from '@/assets/marketing/infographie-tarifs.jpg';
import storyTemoignage from '@/assets/marketing/story-temoignage.jpg';
import tiktokThumbnail from '@/assets/marketing/tiktok-thumbnail.jpg';
import facebookCover from '@/assets/marketing/facebook-cover.jpg';
import postEssaiGratuit from '@/assets/marketing/post-essai-gratuit.jpg';
import postResultats from '@/assets/marketing/post-resultats.jpg';
import postAvantApres from '@/assets/marketing/post-avant-apres.jpg';
import postAstuce from '@/assets/marketing/post-astuce.jpg';
import youtubeThumbnail from '@/assets/marketing/youtube-thumbnail.jpg';
import postOffreSpeciale from '@/assets/marketing/post-offre-speciale.jpg';

interface MarketingAsset {
  id: string;
  title: string;
  category: string;
  dimensions: string;
  usage: string[];
  image: string;
}

const marketingAssets: MarketingAsset[] = [
  {
    id: 'hero-main',
    title: 'Hero Banner Principal',
    category: 'Bannière',
    dimensions: '1920x1080',
    usage: ['Site web', 'Présentations', 'Emails'],
    image: heroBotBJ,
  },
  {
    id: 'flyer-whatsapp',
    title: 'Module WhatsApp',
    category: 'Flyer',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'LinkedIn'],
    image: flyerWhatsapp,
  },
  {
    id: 'flyer-ia',
    title: 'Module IA Business',
    category: 'Flyer',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'LinkedIn'],
    image: flyerIABusiness,
  },
  {
    id: 'flyer-marketing',
    title: 'Module Marketing',
    category: 'Flyer',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'LinkedIn'],
    image: flyerMarketing,
  },
  {
    id: 'flyer-gestion',
    title: 'Module Gestion',
    category: 'Flyer',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'LinkedIn'],
    image: flyerGestion,
  },
  {
    id: 'flyer-citoyen',
    title: 'Module Citoyen',
    category: 'Flyer',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'LinkedIn'],
    image: flyerCitoyen,
  },
  {
    id: 'flyer-createur',
    title: 'Module Créateur Visuel',
    category: 'Flyer',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'LinkedIn'],
    image: flyerCreateurVisuel,
  },
  {
    id: 'post-lancement',
    title: 'Post de Lancement',
    category: 'Post Social',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'LinkedIn'],
    image: postLancement,
  },
  {
    id: 'post-essai',
    title: 'Essai Gratuit 30 Jours',
    category: 'Post Social',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'LinkedIn'],
    image: postEssaiGratuit,
  },
  {
    id: 'post-resultats',
    title: 'Nos Résultats',
    category: 'Post Social',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'LinkedIn'],
    image: postResultats,
  },
  {
    id: 'post-avant-apres',
    title: 'Avant / Après',
    category: 'Post Social',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'Storytelling'],
    image: postAvantApres,
  },
  {
    id: 'post-astuce',
    title: 'Astuce & Conseils',
    category: 'Post Social',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'Éducation'],
    image: postAstuce,
  },
  {
    id: 'post-offre',
    title: 'Offre Spéciale',
    category: 'Post Social',
    dimensions: '1080x1080',
    usage: ['Instagram', 'Facebook', 'Promotions'],
    image: postOffreSpeciale,
  },
  {
    id: 'infographie-tarifs',
    title: 'Infographie Tarifs',
    category: 'Story',
    dimensions: '1080x1920',
    usage: ['Instagram Stories', 'Facebook Stories', 'WhatsApp Status'],
    image: infographieTarifs,
  },
  {
    id: 'story-temoignage',
    title: 'Template Témoignage',
    category: 'Story',
    dimensions: '1080x1920',
    usage: ['Instagram Stories', 'Facebook Stories'],
    image: storyTemoignage,
  },
  {
    id: 'tiktok-thumb',
    title: 'TikTok Thumbnail',
    category: 'Story',
    dimensions: '1080x1920',
    usage: ['TikTok', 'Instagram Reels', 'YouTube Shorts'],
    image: tiktokThumbnail,
  },
  {
    id: 'facebook-cover',
    title: 'Couverture Facebook',
    category: 'Bannière',
    dimensions: '1200x628',
    usage: ['Page Facebook', 'Groupe', 'Événement'],
    image: facebookCover,
  },
  {
    id: 'youtube-thumb',
    title: 'YouTube Thumbnail',
    category: 'Bannière',
    dimensions: '1920x1080',
    usage: ['YouTube', 'Vimeo', 'Tutoriels'],
    image: youtubeThumbnail,
  },
];

const MarketingGallery = () => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Tous');
  const [selectedAsset, setSelectedAsset] = React.useState<MarketingAsset | null>(null);

  const categories = ['Tous', 'Flyer', 'Post Social', 'Story', 'Bannière'];

  const filteredAssets = selectedCategory === 'Tous'
    ? marketingAssets
    : marketingAssets.filter(asset => asset.category === selectedCategory);

  const handleDownload = (asset: MarketingAsset) => {
    const link = document.createElement('a');
    link.href = asset.image;
    link.download = `${asset.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📸 Galerie Marketing Bot.BJ</h1>
          <p className="text-muted-foreground">
            Tous vos visuels marketing professionnels prêts à utiliser
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-square bg-muted">
                <img
                  src={asset.image}
                  alt={asset.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleDownload(asset)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: asset.title,
                          text: `Découvrez ${asset.title} de Bot.BJ`,
                        });
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm">{asset.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {asset.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {asset.dimensions}
                </p>
                <div className="flex flex-wrap gap-1">
                  {asset.usage.slice(0, 2).map((use) => (
                    <Badge key={use} variant="outline" className="text-xs">
                      {use}
                    </Badge>
                  ))}
                  {asset.usage.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{asset.usage.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Preview Modal */}
        {selectedAsset && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedAsset(null)}
          >
            <div className="max-w-4xl w-full bg-background rounded-lg overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg">{selectedAsset.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedAsset.dimensions} • {selectedAsset.category}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(selectedAsset);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedAsset(null)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
              <div className="p-4 max-h-[70vh] overflow-auto">
                <img
                  src={selectedAsset.image}
                  alt={selectedAsset.title}
                  className="w-full h-auto"
                />
              </div>
              <div className="p-4 border-t">
                <h3 className="font-semibold mb-2">Utilisation recommandée:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAsset.usage.map((use) => (
                    <Badge key={use}>{use}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{marketingAssets.length}</div>
            <div className="text-sm text-muted-foreground">Visuels Totaux</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">
              {marketingAssets.filter(a => a.category === 'Flyer').length}
            </div>
            <div className="text-sm text-muted-foreground">Flyers</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">
              {marketingAssets.filter(a => a.category === 'Post Social').length}
            </div>
            <div className="text-sm text-muted-foreground">Posts Sociaux</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">
              {marketingAssets.filter(a => a.category === 'Story').length}
            </div>
            <div className="text-sm text-muted-foreground">Stories</div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MarketingGallery;
