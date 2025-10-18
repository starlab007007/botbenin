import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { videoExportService, type ExportFormat, type ExportResolution, type Platform } from '@/services/videoExportService';
import { useToast } from '@/hooks/use-toast';

interface VideoExportDialogProps {
  videoUrl: string;
  videoTitle: string;
  trigger?: React.ReactNode;
}

export function VideoExportDialog({ videoUrl, videoTitle, trigger }: VideoExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [platform, setPlatform] = useState<Platform>('tiktok');
  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const { toast } = useToast();

  const platformSpecs = videoExportService.getPlatformSpecs();
  const currentSpec = platformSpecs[platform];

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const fileName = `${videoTitle.replace(/[^a-z0-9]/gi, '-')}-${platform}-${resolution}`;
      await videoExportService.downloadVideo(videoUrl, fileName, format);

      toast({
        title: "Téléchargement lancé",
        description: `Vidéo optimisée pour ${currentSpec.name}`,
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la vidéo",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exporter la vidéo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Platform Selection */}
          <div className="space-y-3">
            <Label>Plateforme cible</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(platformSpecs).map(([key, spec]) => (
                  <SelectItem key={key} value={key}>
                    {spec.icon} {spec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {currentSpec.instructions}
            </p>
          </div>

          {/* Resolution */}
          <div className="space-y-3">
            <Label>Résolution</Label>
            <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as ExportResolution)}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1080p" id="1080p" />
                  <Label htmlFor="1080p" className="font-normal cursor-pointer">
                    1080p (Full HD) - {videoExportService.getDimensions('1080p', currentSpec.defaultAspectRatio).width}x{videoExportService.getDimensions('1080p', currentSpec.defaultAspectRatio).height}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="720p" id="720p" />
                  <Label htmlFor="720p" className="font-normal cursor-pointer">
                    720p (HD) - {videoExportService.getDimensions('720p', currentSpec.defaultAspectRatio).width}x{videoExportService.getDimensions('720p', currentSpec.defaultAspectRatio).height}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="480p" id="480p" />
                  <Label htmlFor="480p" className="font-normal cursor-pointer">
                    480p (SD) - {videoExportService.getDimensions('480p', currentSpec.defaultAspectRatio).width}x{videoExportService.getDimensions('480p', currentSpec.defaultAspectRatio).height}
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Format */}
          <div className="space-y-3">
            <Label>Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex gap-4">
                {currentSpec.formats.includes('mp4') && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mp4" id="mp4" />
                    <Label htmlFor="mp4" className="font-normal cursor-pointer">
                      MP4 (Vidéo)
                    </Label>
                  </div>
                )}
                {currentSpec.formats.includes('gif') && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gif" id="gif" />
                    <Label htmlFor="gif" className="font-normal cursor-pointer">
                      GIF (Animé)
                    </Label>
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Téléchargement...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Télécharger ({format.toUpperCase()})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
