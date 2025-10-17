import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VideoProduction, VideoStatus } from '@/types/video-production';
import { Calendar, Clock, Hash, Play, CheckCircle, Loader2, Circle } from 'lucide-react';
import { FaTiktok, FaInstagram, FaYoutube, FaWhatsapp } from 'react-icons/fa';

interface VideoProductionCardProps {
  video: VideoProduction;
  onStatusChange?: (id: string, status: VideoStatus) => void;
}

const statusConfig = {
  to_produce: { label: 'À produire', icon: Circle, color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'En production', icon: Loader2, color: 'bg-warning text-warning-foreground' },
  completed: { label: 'Terminé', icon: CheckCircle, color: 'bg-success text-success-foreground' },
  published: { label: 'Publié', icon: Play, color: 'bg-primary text-primary-foreground' },
};

const platformIcons = {
  tiktok: FaTiktok,
  instagram: FaInstagram,
  youtube: FaYoutube,
  whatsapp: FaWhatsapp,
};

const seriesColors = {
  lancement: 'bg-gradient-to-br from-primary/20 to-primary/5',
  whatsapp: 'bg-gradient-to-br from-green-500/20 to-green-500/5',
  prospects: 'bg-gradient-to-br from-blue-500/20 to-blue-500/5',
  createur: 'bg-gradient-to-br from-purple-500/20 to-purple-500/5',
  chatbot: 'bg-gradient-to-br from-orange-500/20 to-orange-500/5',
  guides: 'bg-gradient-to-br from-cyan-500/20 to-cyan-500/5',
  paiement: 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5',
  temoignages: 'bg-gradient-to-br from-pink-500/20 to-pink-500/5',
};

export const VideoProductionCard: React.FC<VideoProductionCardProps> = ({ video, onStatusChange }) => {
  const StatusIcon = statusConfig[video.status].icon;

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-lg ${seriesColors[video.series]}`}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg leading-tight">{video.title}</CardTitle>
            <CardDescription className="text-sm">{video.description}</CardDescription>
          </div>
          <Badge className={statusConfig[video.status].color}>
            <StatusIcon className={`h-3 w-3 mr-1 ${video.status === 'in_progress' ? 'animate-spin' : ''}`} />
            {statusConfig[video.status].label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{video.duration}s</span>
          <span>•</span>
          <span className="capitalize">Priorité {video.priority}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Hook */}
        <div className="p-3 bg-background/50 rounded-lg border">
          <p className="font-semibold text-sm text-foreground">🎯 {video.hook}</p>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Contenu:</p>
          <ul className="space-y-1">
            {video.content.map((item, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="p-2 bg-primary/10 rounded border border-primary/20">
          <p className="text-xs font-medium text-muted-foreground mb-1">CTA:</p>
          <p className="text-sm font-semibold text-primary">{video.cta}</p>
        </div>

        {/* Platforms */}
        <div className="flex items-center gap-2 flex-wrap">
          {video.platforms.map((platform) => {
            const Icon = platformIcons[platform];
            return (
              <Badge key={platform} variant="outline" className="gap-1">
                <Icon className="h-3 w-3" />
                {platform}
              </Badge>
            );
          })}
        </div>

        {/* Hashtags */}
        <div className="flex items-start gap-2">
          <Hash className="h-3 w-3 mt-1 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground flex-wrap">
            {video.hashtags.join(' ')}
          </p>
        </div>

        {/* Publication Date */}
        {video.publicationDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Publication: {new Date(video.publicationDate).toLocaleDateString('fr-FR')}</span>
          </div>
        )}

        {/* Status Change Buttons */}
        {onStatusChange && (
          <div className="flex gap-2 pt-2 border-t">
            {video.status === 'to_produce' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(video.id, 'in_progress')}
                className="flex-1"
              >
                Démarrer
              </Button>
            )}
            {video.status === 'in_progress' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(video.id, 'completed')}
                className="flex-1"
              >
                Terminer
              </Button>
            )}
            {video.status === 'completed' && (
              <Button
                size="sm"
                onClick={() => onStatusChange(video.id, 'published')}
                className="flex-1"
              >
                Publier
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
