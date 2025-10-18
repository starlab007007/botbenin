import { useState } from 'react';
import { Share2, Copy, Check, Facebook, Twitter, Linkedin, MessageCircle, Send, Link as LinkIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { socialShareService } from '@/services/socialShareService';
import { videoExportService } from '@/services/videoExportService';
import { useToast } from '@/hooks/use-toast';

interface VideoShareDialogProps {
  videoUrl: string;
  videoTitle: string;
  videoDescription?: string;
  scriptText?: string;
  trigger?: React.ReactNode;
}

export function VideoShareDialog({
  videoUrl,
  videoTitle,
  videoDescription,
  scriptText,
  trigger
}: VideoShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const hashtags = videoExportService.generateHashtags('tiktok', ['IA', 'Video', 'Digital']);
  const description = videoDescription || videoExportService.generateSEODescription(videoTitle, 'tiktok', scriptText);
  const fullText = `${videoTitle}\n\n${description}\n\n${hashtags.join(' ')}`;

  const handleCopyLink = async () => {
    const success = await socialShareService.copyToClipboard(videoUrl);
    if (success) {
      setCopied(true);
      toast({
        title: "Lien copié !",
        description: "Le lien a été copié dans le presse-papiers",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyAll = async () => {
    const success = await socialShareService.copyToClipboard(fullText + '\n\n' + videoUrl);
    if (success) {
      toast({
        title: "Tout copié !",
        description: "Titre, description, hashtags et lien copiés",
      });
    }
  };

  const handleShare = async (platform: string) => {
    try {
      await socialShareService.shareOnPlatform(platform, {
        title: videoTitle,
        description,
        url: videoUrl,
        hashtags
      });

      toast({
        title: "Partage en cours",
        description: `Ouverture de ${platform}...`,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
      toast({
        title: "Erreur",
        description: "Impossible de partager sur cette plateforme",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Partager
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partager la vidéo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Video Preview */}
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-[9/16] max-w-[200px] mx-auto">
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Titre</Label>
            <Textarea
              value={videoTitle}
              readOnly
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              readOnly
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags suggérés</Label>
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label>Lien de la vidéo</Label>
            <div className="flex gap-2">
              <input
                type="text"
                value={videoUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-muted rounded-md"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Copy Button */}
          <Button
            onClick={handleCopyAll}
            variant="secondary"
            className="w-full"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier tout (Titre + Description + Hashtags + Lien)
          </Button>

          {/* Share Buttons */}
          <div className="space-y-3">
            <Label>Partager sur</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleShare('facebook')}
                className="justify-start"
              >
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </Button>

              <Button
                variant="outline"
                onClick={() => handleShare('twitter')}
                className="justify-start"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter / X
              </Button>

              <Button
                variant="outline"
                onClick={() => handleShare('linkedin')}
                className="justify-start"
              >
                <Linkedin className="w-4 h-4 mr-2" />
                LinkedIn
              </Button>

              <Button
                variant="outline"
                onClick={() => handleShare('whatsapp')}
                className="justify-start"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>

              <Button
                variant="outline"
                onClick={() => handleShare('telegram')}
                className="justify-start"
              >
                <Send className="w-4 h-4 mr-2" />
                Telegram
              </Button>

              <Button
                variant="outline"
                onClick={() => handleShare('copy')}
                className="justify-start"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Copier le lien
              </Button>
            </div>
          </div>

          {/* TikTok Instructions */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <Label className="text-sm font-semibold">📱 Instructions TikTok</Label>
            <p className="text-xs text-muted-foreground whitespace-pre-line">
              {socialShareService.getTikTokInstructions()}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
