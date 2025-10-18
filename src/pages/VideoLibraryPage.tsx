import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Share2, Trash2, Play, Search, Video, Clock, HardDrive, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { VideoSlideshow } from '@/components/video/VideoSlideshow';
import { VideoExportDialog } from '@/components/video-production/VideoExportDialog';
import { VideoShareDialog } from '@/components/video-production/VideoShareDialog';

interface GeneratedVideo {
  id: string;
  video_id: string;
  video_title: string;
  video_url: string;
  storage_path: string;
  thumbnail_url: string | null;
  duration: number;
  format: string;
  size_bytes: number;
  template_id: string;
  music_id: string;
  created_at: string;
  user_id: string;
  use_shotstack?: boolean;
  shotstack_render_id?: string;
  rendered_video_url?: string;
  render_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

interface VideoFrame {
  id: string;
  video_id: string;
  frame_type: string;
  image_url: string;
  prompt: string;
  created_at: string;
}

export const VideoLibraryPage = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [videoFrames, setVideoFrames] = useState<Record<string, VideoFrame[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingRenders, setCheckingRenders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadVideos();
  }, []);

  const checkShotstackStatus = async (video: GeneratedVideo) => {
    if (!video.shotstack_render_id || video.render_status === 'completed' || video.render_status === 'failed') {
      return;
    }

    setCheckingRenders(prev => new Set(prev).add(video.video_id));

    try {
      const { data, error } = await supabase.functions.invoke('check-shotstack-status', {
        body: { 
          renderId: video.shotstack_render_id,
          videoId: video.video_id
        }
      });

      if (!error && data?.status === 'done') {
        toast.success(`Vidéo prête ! "${video.video_title}" est disponible.`);
        loadVideos();
      }
    } catch (error) {
      console.error('Error checking render status:', error);
    } finally {
      setCheckingRenders(prev => {
        const newSet = new Set(prev);
        newSet.delete(video.video_id);
        return newSet;
      });
    }
  };

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data as GeneratedVideo[] || []);
      
      // Vérifier le statut des vidéos Shotstack en cours
      data?.forEach(video => {
        if (video.use_shotstack && video.render_status === 'processing') {
          checkShotstackStatus(video as GeneratedVideo);
        }
      });
      
      // Charger les frames pour chaque vidéo
      if (data) {
        for (const video of data) {
          await loadFramesForVideo(video.video_id);
        }
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Erreur lors du chargement des vidéos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFramesForVideo = async (videoId: string) => {
    try {
      const { data, error } = await supabase
        .from('video_frames')
        .select('*')
        .eq('video_id', videoId)
        .order('frame_type');
      
      if (!error && data) {
        setVideoFrames(prev => ({ ...prev, [videoId]: data }));
      }
    } catch (error) {
      console.error('Error loading frames for video:', videoId, error);
    }
  };

  const downloadVideo = async (video: GeneratedVideo) => {
    try {
      // Si c'est une vraie vidéo Shotstack, télécharger le MP4
      if (video.use_shotstack && video.rendered_video_url) {
        const a = document.createElement('a');
        a.href = video.rendered_video_url;
        a.download = `${video.video_title.replace(/\s+/g, '-')}.mp4`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast.success(`Téléchargement de la vidéo ${video.video_title}`);
        return;
      }

      // Sinon, télécharger toutes les frames
      const frames = videoFrames[video.video_id] || [];
      if (frames.length === 0) {
        toast.error('Aucune frame disponible');
        return;
      }
      
      toast.info('Téléchargement des frames...');
      
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const response = await fetch(frame.image_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${video.video_title}_${frame.frame_type}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        if (i < frames.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      toast.success(`${frames.length} frames téléchargées!`);
    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const shareVideo = async (video: GeneratedVideo) => {
    try {
      await navigator.clipboard.writeText(video.video_url);
      toast.success('Lien copié dans le presse-papier!');
    } catch (error) {
      toast.error('Erreur lors de la copie du lien');
    }
  };

  const deleteVideo = async (video: GeneratedVideo) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vidéo?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('video-assets')
        .remove([video.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('generated_videos')
        .delete()
        .eq('id', video.id);

      if (dbError) throw dbError;

      setVideos(videos.filter(v => v.id !== video.id));
      toast.success('Vidéo supprimée!');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const downloadFrame = async (frame: VideoFrame) => {
    try {
      const response = await fetch(frame.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${frame.video_id}_${frame.frame_type}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Frame téléchargée!');
    } catch (error) {
      console.error('Error downloading frame:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const filteredVideos = videos.filter(video =>
    video.video_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateVideoSize = (videoId: string): number => {
    const frames = videoFrames[videoId] || [];
    return frames.length * 500 * 1024;
  };

  const totalSize = videos.reduce((sum, video) => {
    return sum + calculateVideoSize(video.video_id);
  }, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  const calculateDuration = (videoId: string): number => {
    const frames = videoFrames[videoId] || [];
    return frames.length * 2.5;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/video-production/generate')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">📚 Bibliothèque Vidéo</h1>
            <p className="text-muted-foreground">
              Toutes vos vidéos générées en un seul endroit
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Video className="h-8 w-8 text-primary" />
              <div>
                <p className="text-3xl font-bold">{videos.length}</p>
                <p className="text-sm text-muted-foreground">Vidéos créées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Download className="h-8 w-8 text-primary" />
              <div>
                <p className="text-3xl font-bold">{totalSizeMB} MB</p>
                <p className="text-sm text-muted-foreground">Stockage utilisé</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Play className="h-8 w-8 text-primary" />
              <div>
                <p className="text-3xl font-bold">
                  {videos.reduce((sum, v) => sum + calculateDuration(v.video_id), 0).toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">Secondes de contenu</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une vidéo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucune vidéo</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? 'Aucune vidéo ne correspond à votre recherche'
                : 'Commencez par générer votre première vidéo'}
            </p>
            <Button onClick={() => navigate('/video-production/generate')}>
              Créer une vidéo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => {
            const frames = videoFrames[video.video_id] || [];
            const frameUrls = frames.map(f => f.image_url);
            const duration = calculateDuration(video.video_id);
            const sizeBytes = calculateVideoSize(video.video_id);
            const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

            return (
              <Card key={video.id} className="overflow-hidden hover:shadow-lg transition">
                <CardHeader className="p-0 relative">
                  {frameUrls.length > 0 ? (
                    <VideoSlideshow 
                      frames={frameUrls}
                      duration={2.5}
                      className="w-full aspect-[9/16]"
                    />
                  ) : (
                    <div className="w-full aspect-[9/16] bg-muted flex items-center justify-center">
                      <Video className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold mb-2 truncate">{video.video_title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{duration}s</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        <span>{sizeMB} MB</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        <span>{frames.length} frames</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(video.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Miniatures des frames */}
                  {frames.length > 0 && (
                    <div className="grid grid-cols-4 gap-1 pt-2 border-t">
                      {frames.map((frame) => (
                        <div key={frame.id} className="relative group">
                          <img 
                            src={frame.image_url} 
                            alt={frame.frame_type}
                            className="w-full rounded aspect-[9/16] object-cover cursor-pointer hover:opacity-75 transition"
                            title={frame.frame_type}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/60 rounded"
                            onClick={() => downloadFrame(frame)}
                          >
                            <Download className="h-3 w-3 text-white" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status Badge Shotstack */}
                  {video.use_shotstack && (
                    <div className="pt-2 border-t">
                      {video.render_status === 'processing' ? (
                        <Badge variant="secondary" className="w-full justify-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Rendu en cours...
                        </Badge>
                      ) : video.render_status === 'completed' ? (
                        <Badge variant="default" className="w-full justify-center gap-2 bg-green-500">
                          <CheckCircle className="h-3 w-3" />
                          Vidéo MP4 prête
                        </Badge>
                      ) : video.render_status === 'failed' ? (
                        <Badge variant="destructive" className="w-full justify-center">
                          Échec du rendu
                        </Badge>
                      ) : null}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {video.use_shotstack && video.render_status === 'processing' ? (
                      <Button
                        onClick={() => checkShotstackStatus(video)}
                        size="sm"
                        variant="outline"
                        disabled={checkingRenders.has(video.video_id)}
                        className="flex-1 gap-2"
                      >
                        {checkingRenders.has(video.video_id) ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Vérification...
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4" />
                            Vérifier le statut
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => downloadVideo(video)}
                        className="flex-1"
                        disabled={video.use_shotstack && video.render_status !== 'completed'}
                        title={video.use_shotstack && video.rendered_video_url ? 'Télécharger la vidéo MP4' : 'Télécharger les frames'}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {video.use_shotstack && video.rendered_video_url ? 'MP4' : 'Frames'}
                      </Button>
                     )}
                    <VideoShareDialog
                      videoUrl={video.use_shotstack && video.rendered_video_url ? video.rendered_video_url : video.video_url}
                      videoTitle={video.video_title}
                      trigger={
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <VideoExportDialog
                      videoUrl={video.use_shotstack && video.rendered_video_url ? video.rendered_video_url : video.video_url}
                      videoTitle={video.video_title}
                      trigger={
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteVideo(video)}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
