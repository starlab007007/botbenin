import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Play, Search, Loader2 } from 'lucide-react';
import { useVideoAssets } from '@/hooks/useVideoAssets';
import { AudioPreviewPlayer } from '@/components/video-production/AudioPreviewPlayer';
import { useState } from 'react';
import { formatDuration } from '@/utils/videoFormatUtils';

export default function VideoAssetsPage() {
  const { scripts, audios, frames, videos, isLoading } = useVideoAssets();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredScripts = scripts.filter(s =>
    s.script_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAudios = audios.filter(a =>
    a.script_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVideos = videos.filter(v =>
    v.video_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Assets Vidéo</h1>
          <p className="text-muted-foreground">
            Gérez tous vos scripts, audios, frames et vidéos
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans les assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="scripts" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="scripts">
            📝 Scripts ({filteredScripts.length})
          </TabsTrigger>
          <TabsTrigger value="audios">
            🎵 Audios ({filteredAudios.length})
          </TabsTrigger>
          <TabsTrigger value="frames">
            🖼️ Frames ({frames.length})
          </TabsTrigger>
          <TabsTrigger value="videos">
            🎬 Vidéos ({filteredVideos.length})
          </TabsTrigger>
        </TabsList>

        {/* Scripts */}
        <TabsContent value="scripts" className="space-y-4">
          <div className="grid gap-4">
            {filteredScripts.map((script) => (
              <Card key={script.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <Badge>{script.script_length}</Badge>
                        {script.is_active && <Badge variant="default">Actif</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(script.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{script.script_text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Audios */}
        <TabsContent value="audios" className="space-y-4">
          <div className="grid gap-4">
            {filteredAudios.map((audio) => (
              <Card key={audio.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">Audio {audio.video_id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Voix: {audio.voice_id} • {formatDuration(audio.audio_duration)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AudioPreviewPlayer audioUrl={audio.audio_url} />
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {audio.script_text}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Frames */}
        <TabsContent value="frames" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {frames.map((frame) => (
              <Card key={frame.id}>
                <CardContent className="pt-4">
                  <img
                    src={frame.image_url}
                    alt={frame.frame_type}
                    className="w-full rounded-lg aspect-video object-cover"
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <Badge variant="secondary">{frame.frame_type}</Badge>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Vidéos */}
        <TabsContent value="videos" className="space-y-4">
          <div className="grid gap-4">
            {filteredVideos.map((video) => (
              <Card key={video.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{video.video_title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(video.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {video.rendered_video_url && (
                        <Badge variant="secondary">🎬 Shotstack</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {video.thumbnail_url && (
                  <CardContent>
                    <img
                      src={video.thumbnail_url}
                      alt={video.video_title}
                      className="w-full rounded-lg"
                    />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
