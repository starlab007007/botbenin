import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface VideoFrame {
  id: string;
  image_url: string;
  frame_type: string;
}

interface FramesDownloadButtonProps {
  frames: VideoFrame[];
  videoTitle: string;
}

export const FramesDownloadButton = ({ frames, videoTitle }: FramesDownloadButtonProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadFramesAsZip = async () => {
    if (!frames || frames.length === 0) {
      toast.error('Aucune frame disponible');
      return;
    }

    setIsDownloading(true);
    try {
      const zip = new JSZip();
      
      // Télécharger chaque frame
      for (const frame of frames) {
        try {
          const response = await fetch(frame.image_url);
          if (!response.ok) throw new Error(`Erreur lors du téléchargement de ${frame.frame_type}`);
          
          const blob = await response.blob();
          zip.file(`${frame.frame_type}.png`, blob);
        } catch (error) {
          console.error(`Erreur pour ${frame.frame_type}:`, error);
          toast.error(`Erreur pour ${frame.frame_type}`);
        }
      }
      
      // Générer le ZIP
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      // Télécharger
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `frames-${videoTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`${frames.length} frames téléchargées`);
    } catch (error) {
      console.error('Erreur téléchargement ZIP:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={downloadFramesAsZip}
      disabled={isDownloading || !frames || frames.length === 0}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          Téléchargement...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-1" />
          📸 Frames (ZIP)
        </>
      )}
    </Button>
  );
};
