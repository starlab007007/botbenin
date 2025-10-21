import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, ZoomIn, ZoomOut, Share2, Maximize2, MessageCircle, Facebook, Video as VideoIcon } from 'lucide-react';
import { useState } from 'react';
import { MediaItem } from '@/hooks/useMediaManager';
import { shareMediaFile, shareOnTikTok, shareNative } from '@/utils/socialShare';
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
      <DialogContent className={`${isFullscreen ? 'max-w-[98vw] h-[98vh]' : 'max-w-[95vw] md:max-w-4xl w-full'} ${isFullscreen ? 'p-0' : 'p-0'} gap-0`}>
        <div className="flex flex-col h-full max-h-[98vh]">
          {/* Header */}
          <DialogHeader className="p-3 md:p-6 pb-3 md:pb-4 border-b flex-shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base md:text-xl font-bold mb-2 truncate">
                  {media.title}
                </DialogTitle>
                <div className="space-y-1 text-xs md:text-sm text-muted-foreground">
                  <p><span className="font-medium">Type:</span> {media.type}</p>
                  {media.style && <p><span className="font-medium">Style:</span> {media.style}</p>}
                  {media.format && <p><span className="font-medium">Format:</span> {media.format}</p>}
                  <p className="text-xs italic line-clamp-2">{media.prompt}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="ml-2 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-muted/30 relative min-h-0">
            <div className="flex items-center justify-center min-h-full p-3 md:p-6">
              {isVideo ? (
                <video
                  key={media.image_url}
                  src={media.image_url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  preload="metadata"
                  className="max-w-full max-h-full rounded-lg shadow-lg"
                  style={{ transform: `scale(${zoom})` }}
                  onError={(e) => {
                    console.error('Video load error in modal:', media.image_url?.substring(0, 100));
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.error-message')) {
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'error-message text-destructive p-6 text-center';
                      const icon = document.createElement('div');
                      icon.className = 'mb-2 text-2xl';
                      icon.textContent = '⚠️';
                      const title = document.createElement('p');
                      title.className = 'font-semibold mb-1';
                      title.textContent = 'Erreur de lecture vidéo';
                      const desc = document.createElement('p');
                      desc.className = 'text-sm opacity-80';
                      desc.textContent = 'Essayez de télécharger le fichier MP4';
                      errorDiv.appendChild(icon);
                      errorDiv.appendChild(title);
                      errorDiv.appendChild(desc);
                      parent.appendChild(errorDiv);
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    console.log('Video metadata in modal:', {
                      duration: e.currentTarget.duration,
                      width: e.currentTarget.videoWidth,
                      height: e.currentTarget.videoHeight
                    });
                  }}
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              ) : (
                <img
                  src={media.image_url}
                  alt={media.title || 'Création'}
                  className="max-w-full max-h-full rounded-lg shadow-lg transition-transform duration-200 bg-white"
                  style={{ transform: `scale(${zoom})` }}
                  draggable={false}
                  onLoad={(e) => {
                    console.log('✅ Modal image loaded:', {
                      width: e.currentTarget.naturalWidth,
                      height: e.currentTarget.naturalHeight,
                      title: media.title
                    });
                  }}
                  onError={(e) => {
                    console.error('❌ Image load error in modal:', media.image_url?.substring(0, 100));
                    console.error('Media type:', media.type, 'Title:', media.title);
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.error-message')) {
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'error-message text-destructive p-6 text-center flex flex-col gap-2';
                      const icon = document.createElement('div');
                      icon.className = 'mb-2 text-4xl';
                      icon.textContent = '⚠️';
                      const title = document.createElement('p');
                      title.className = 'font-semibold text-lg';
                      title.textContent = 'Impossible de charger l\'image';
                      const desc = document.createElement('p');
                      desc.className = 'text-sm opacity-80';
                      desc.textContent = 'L\'image peut être en cours de génération ou le format n\'est pas supporté';
                      const debug = document.createElement('div');
                      debug.className = 'text-xs mt-2 p-2 bg-muted rounded font-mono max-w-md mx-auto break-all';
                      debug.textContent = `${media.image_url?.substring(0, 80)}...`;
                      errorDiv.appendChild(icon);
                      errorDiv.appendChild(title);
                      errorDiv.appendChild(desc);
                      errorDiv.appendChild(debug);
                      parent.appendChild(errorDiv);
                    }
                  }}
                  loading="eager"
                />
              )}
            </div>
          </div>

          {/* Actions Bar */}
          <div className="p-2 md:p-4 border-t bg-background flex items-center justify-between gap-2 flex-wrap flex-shrink-0">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 order-1 w-full sm:w-auto justify-center sm:justify-start">
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
            <div className="flex items-center gap-1 md:gap-2 flex-wrap order-2 w-full sm:w-auto justify-center sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => media.image_url && shareMediaFile(media.image_url, media.title, isVideo)}
                className="gap-1 text-xs md:text-sm px-2 md:px-3"
              >
                <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => media.image_url && shareMediaFile(media.image_url, media.title, isVideo)}
                className="gap-1 text-xs md:text-sm px-2 md:px-3"
              >
                <Facebook className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Facebook</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => media.image_url && shareOnTikTok(media.image_url, media.title)}
                className="gap-1 text-xs md:text-sm px-2 md:px-3"
              >
                <VideoIcon className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">TikTok</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => media.image_url && shareMediaFile(media.image_url, media.title, isVideo)}
                className="gap-1 text-xs md:text-sm px-2 md:px-3"
              >
                <Share2 className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Partager</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleDownload}
                className="gap-1 text-xs md:text-sm px-2 md:px-3"
              >
                <Download className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden lg:inline">Télécharger</span> {isVideo ? 'MP4' : 'IMG'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
