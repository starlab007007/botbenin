import { useEffect, useState } from "react";
import { useMediaManager, MediaItem } from "@/hooks/useMediaManager";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Share2, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UniversalMediaModal } from "./UniversalMediaModal";
import { shareOnWhatsApp, shareOnFacebook, shareOnTikTok, shareNative } from "@/utils/socialShare";

interface VideoHistoryProps {
  onReuseParameters?: (media: MediaItem) => void;
}

export function VideoHistory({ onReuseParameters }: VideoHistoryProps) {
  const { loadUserGallery, deleteMedia, downloadMedia, isLoading } = useMediaManager();
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    const allMedia = await loadUserGallery({ type: 'video', limit: 50 });
    setVideos(allMedia);
  };

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) return;
    
    const success = await deleteMedia(mediaId);
    if (success) {
      toast.success('Vidéo supprimée');
      loadVideos();
    }
  };

  const handleView = (media: MediaItem) => {
    setSelectedMedia(media);
    setIsModalOpen(true);
  };

  const handleShare = async (media: MediaItem, platform: 'whatsapp' | 'facebook' | 'tiktok' | 'native') => {
    const url = media.image_url;
    const title = media.title || 'Ma création vidéo';

    switch (platform) {
      case 'whatsapp':
        shareOnWhatsApp(url, title);
        break;
      case 'facebook':
        shareOnFacebook(url);
        break;
      case 'tiktok':
        shareOnTikTok(url, title);
        break;
      case 'native':
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          await shareNative(blob, title, url);
        } catch (error) {
          console.error('Share error:', error);
          toast.error('Erreur lors du partage');
        }
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-2">Aucune vidéo dans votre galerie</p>
        <p className="text-sm text-muted-foreground">
          Vos vidéos générées apparaîtront ici
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden group">
            <div className="aspect-video bg-muted relative">
              <video
                src={video.image_url}
                className="w-full h-full object-cover"
                muted
                loop
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => {
                  e.currentTarget.pause();
                  e.currentTarget.currentTime = 0;
                }}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleView(video)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadMedia(video.image_url, `${video.title}.mp4`)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold line-clamp-1">{video.title}</h3>
                {video.prompt && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {video.prompt}
                  </p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {video.style && (
                  <Badge variant="secondary" className="text-xs">
                    {video.style}
                  </Badge>
                )}
                {video.format && (
                  <Badge variant="outline" className="text-xs">
                    {video.format}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleShare(video, 'native')}
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Partager
                </Button>
                
                {onReuseParameters && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReuseParameters(video)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Réutiliser
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(video.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedMedia && (
        <UniversalMediaModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMedia(null);
          }}
          media={selectedMedia}
          onDownload={() => downloadMedia(selectedMedia.image_url, `${selectedMedia.title}.mp4`)}
        />
      )}
    </>
  );
}
