import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Play } from 'lucide-react';
import { AudioPreviewPlayer } from './AudioPreviewPlayer';
import { loadScriptVersions, setActiveScriptVersion, ScriptVersion } from '@/utils/scriptVersioning';
import { formatFileSize, formatDuration } from '@/utils/videoFormatUtils';
import { toast } from 'sonner';

interface VideoDetailsDialogProps {
  video: any;
  frames?: any[];
  trigger?: React.ReactNode;
}

export const VideoDetailsDialog = ({ video, frames = [], trigger }: VideoDetailsDialogProps) => {
  const [scriptVersions, setScriptVersions] = useState<ScriptVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (video?.video_id) {
      loadVersions();
    }
  }, [video?.video_id]);

  const loadVersions = async () => {
    setIsLoading(true);
    const versions = await loadScriptVersions(video.video_id);
    setScriptVersions(versions);
    setIsLoading(false);
  };

  const handleRestoreVersion = async (versionId: string) => {
    const success = await setActiveScriptVersion(video.video_id, versionId);
    if (success) {
      toast.success('Version restaurée');
      loadVersions();
    } else {
      toast.error('Erreur lors de la restauration');
    }
  };

  const downloadFrame = (frameUrl: string, frameType: string) => {
    const link = document.createElement('a');
    link.href = frameUrl;
    link.download = `${frameType}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAudio = (audioUrl: string) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `audio-${video.video_id}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            🔍 Détails
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{video.video_title || 'Détails de la vidéo'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="frames" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="frames">🖼️ Frames</TabsTrigger>
            <TabsTrigger value="script">📝 Script</TabsTrigger>
            <TabsTrigger value="audio">🎵 Audio</TabsTrigger>
            <TabsTrigger value="metadata">📊 Métadonnées</TabsTrigger>
          </TabsList>

          {/* Onglet Frames */}
          <TabsContent value="frames" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {frames.map((frame) => (
                <Card key={frame.id}>
                  <CardContent className="pt-4">
                    <img
                      src={frame.image_url}
                      alt={frame.frame_type}
                      className="w-full rounded-lg"
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Badge>{frame.frame_type}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFrame(frame.image_url, frame.frame_type)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            {frames.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucune frame disponible
              </p>
            )}
          </TabsContent>

          {/* Onglet Script */}
          <TabsContent value="script" className="space-y-4">
            {video.description_text && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">Script Actif</CardTitle>
                    <Badge variant="default">Actuel</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{video.description_text}</p>
                </CardContent>
              </Card>
            )}

            {/* Historique des versions */}
            {scriptVersions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Versions Précédentes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scriptVersions.map((version) => (
                    <div
                      key={version.id}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <p className="text-sm line-clamp-2">{version.script_text}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Badge variant="secondary">{version.script_length}</Badge>
                          {version.is_active && <Badge variant="default">Actif</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(version.created_at).toLocaleString()}
                          </span>
                          {!version.is_active && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestoreVersion(version.id)}
                            >
                              ↩️ Restaurer
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {!video.description_text && scriptVersions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun script disponible
              </p>
            )}
          </TabsContent>

          {/* Onglet Audio */}
          <TabsContent value="audio" className="space-y-4">
            {video.description_audio_url ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audio de Description</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AudioPreviewPlayer audioUrl={video.description_audio_url} />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Voix :</span>
                      <span className="ml-2 font-medium">{video.audio_voice_id || 'N/A'}</span>
                    </div>
                    {video.audio_duration && (
                      <div>
                        <span className="text-muted-foreground">Durée :</span>
                        <span className="ml-2 font-medium">
                          {formatDuration(video.audio_duration)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => downloadAudio(video.description_audio_url)}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger l'audio
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aucun audio disponible
              </p>
            )}
          </TabsContent>

          {/* Onglet Métadonnées */}
          <TabsContent value="metadata">
            <Card>
              <CardContent className="pt-6">
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Titre</dt>
                    <dd className="font-medium">{video.video_title || 'N/A'}</dd>
                  </div>

                  <div>
                    <dt className="text-sm text-muted-foreground">Durée</dt>
                    <dd className="font-medium">
                      {video.duration ? formatDuration(video.duration) : 'N/A'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm text-muted-foreground">Format</dt>
                    <dd className="font-medium">
                      {video.export_format || 'MP4'} • {video.export_resolution || '1080p'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm text-muted-foreground">Optimisé pour</dt>
                    <dd className="font-medium">{video.optimized_for_platform || 'TikTok'}</dd>
                  </div>

                  {video.size_bytes && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Taille</dt>
                      <dd className="font-medium">{formatFileSize(video.size_bytes)}</dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-sm text-muted-foreground">Template</dt>
                    <dd className="font-medium">{video.template_id || 'N/A'}</dd>
                  </div>

                  <div>
                    <dt className="text-sm text-muted-foreground">Musique</dt>
                    <dd className="font-medium">{video.music_id || 'Aucune'}</dd>
                  </div>

                  <div>
                    <dt className="text-sm text-muted-foreground">Créé le</dt>
                    <dd className="font-medium">
                      {new Date(video.created_at).toLocaleString()}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm text-muted-foreground">Shotstack</dt>
                    <dd className="font-medium">
                      {video.use_shotstack ? (
                        <Badge variant="secondary">✅ Activé</Badge>
                      ) : (
                        <Badge variant="outline">❌ Désactivé</Badge>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm text-muted-foreground">Statut</dt>
                    <dd className="font-medium">
                      {video.render_status ? (
                        <Badge>{video.render_status}</Badge>
                      ) : (
                        'N/A'
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
