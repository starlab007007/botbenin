import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Download, Share2, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useMediaManager, MediaItem } from '@/hooks/useMediaManager';
import { toast } from 'sonner';
import { UniversalMediaModal } from './UniversalMediaModal';

interface FlyerHistoryProps {
  onReuseParameters?: (flyer: MediaItem) => void;
}

export const FlyerHistory = ({ onReuseParameters }: FlyerHistoryProps) => {
  const { loadUserGallery, deleteMedia, downloadMedia } = useMediaManager();
  const [flyers, setFlyers] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFlyer, setSelectedFlyer] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadFlyers();
  }, []);

  const loadFlyers = async () => {
    setIsLoading(true);
    const items = await loadUserGallery({ type: 'flyer', limit: 50 });
    setFlyers(items);
    setIsLoading(false);
  };

  const handleView = (flyer: MediaItem) => {
    setSelectedFlyer(flyer);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce flyer ?')) {
      const success = await deleteMedia(id);
      if (success) {
        setFlyers(prev => prev.filter(f => f.id !== id));
        toast.success('Flyer supprimé');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (flyers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-2">Aucun flyer dans votre galerie</p>
        <p className="text-sm text-muted-foreground">
          Vos flyers générés apparaîtront ici
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flyers.map((flyer) => (
          <Card key={flyer.id} className="overflow-hidden group">
            <div className="aspect-[3/4] bg-muted relative">
              <img
                src={flyer.thumbnail_url || flyer.image_url}
                alt={flyer.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleView(flyer)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => downloadMedia(flyer.image_url!, `${flyer.title}.png`)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleDelete(flyer.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <h4 className="font-medium truncate">{flyer.title}</h4>
              <p className="text-sm text-muted-foreground truncate">{flyer.prompt}</p>
              {onReuseParameters && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => onReuseParameters(flyer)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Réutiliser
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <UniversalMediaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        media={selectedFlyer}
        onDownload={downloadMedia}
      />
    </>
  );
};
