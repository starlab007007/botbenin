import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, ZoomIn, ZoomOut, Share2, Maximize2, MessageCircle, Facebook, Video as VideoIcon } from 'lucide-react';
import { useState } from 'react';
import { MediaItem } from '@/hooks/useMediaManager';
import { shareOnWhatsApp, shareOnFacebook, shareOnTikTok, shareNative } from '@/utils/socialShare';
import { isVideoFile } from '@/utils/videoConverter';

interface UniversalMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaItem | null;
  onDownload?: (url: string, fileName: string) => void;
}

export const UniversalMediaModal = ({
  isOpen,
  onClose,
  media,
  onDownload
}: UniversalMediaModalProps) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!media) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => setZoom(1);

  const isVideo = media.type === 'video' || (media.image_url && isVideoFile(media.image_url));

  const handleDownload = () => {
    if (media.image_url && onDownload) {
      const extension = isVideo ? 'mp4' : 'png';
      const fileName = `${media.title || 'creation'}-${media.id}.${extension}`;
      onDownload(media.image_url, fileName);
    }
  };

  const handleShareNative = async () => {
    if (media.image_url) {
      try {
        const response = await fetch(media.image_url);
        const blob = await response.blob();
        await shareNative(blob, media.title || 'Ma création', media.image_url);
      } catch (error) {
        console.error('Share error:', error);
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-[95vw] h-[95vh]' : 'max-w-4xl'} p-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold mb-2">
                  {media.title}
                </DialogTitle>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><span className="font-medium">Type:</span> {media.type}</p>
                  {media.style && <p><span className="font-medium">Style:</span> {media.style}</p>}
                  {media.format && <p><span className="font-medium">Format:</span> {media.format}</p>}
                  <p className="text-xs italic">{media.prompt}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="ml-4"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-muted/30 relative">
            <div className="flex items-center justify-center min-h-full p-6">
              {isVideo ? (
                <video
                  src={media.image_url}
                  controls
                  autoPlay
                  loop
                  className="max-w-full max-h-full rounded-lg shadow-lg"
                  style={{ transform: `scale(${zoom})` }}
                />
              ) : (
                <img
                  src={media.image_url}
                  alt={media.title || 'Création'}
                  className="max-w-full max-h-full rounded-lg shadow-lg transition-transform duration-200 cursor-move"
                  style={{ transform: `scale(${zoom})` }}
                  draggable={false}
                />
              )}
            </div>
          </div>

          {/* Actions Bar */}
          <div className="p-4 border-t bg-background flex items-center justify-between gap-2 flex-wrap">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="min-w-[60px]"
              >
                {Math.round(zoom * 100)}%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="ml-2"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => media.image_url && shareOnWhatsApp(media.image_url, media.title)}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => media.image_url && shareOnFacebook(media.image_url)}
                className="gap-2"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => media.image_url && shareOnTikTok(media.image_url, media.title)}
                className="gap-2"
              >
                <VideoIcon className="h-4 w-4" />
                TikTok
              </Button>
              {navigator.share && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareNative}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Partager
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger {isVideo ? 'MP4' : 'Image'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
