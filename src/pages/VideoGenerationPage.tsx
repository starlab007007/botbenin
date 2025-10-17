import React, { useState } from 'react';
import { videoProductionData } from '@/data/videoProductionData';
import { VideoFrameGenerator } from '@/components/video-production/VideoFrameGenerator';
import { VideoAssembler } from '@/components/video-production/VideoAssembler';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, Info, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

export const VideoGenerationPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const { generatedFrames } = useVideoGeneration();

  const selectedVideo = selectedVideoId 
    ? videoProductionData.find(v => v.id === selectedVideoId)
    : null;

  const videosBySeries = videoProductionData.reduce((acc, video) => {
    if (!acc[video.series]) {
      acc[video.series] = [];
    }
    acc[video.series].push(video);
    return acc;
  }, {} as Record<string, typeof videoProductionData>);

  const seriesLabels: Record<string, string> = {
    lancement: '🚀 Lancement',
    whatsapp: '💬 WhatsApp',
    prospects: '🎯 Prospects',
    createur: '🎨 Créateur',
    chatbot: '🤖 Chatbot',
    guides: '📚 Guides',
    paiement: '💳 Paiement',
    temoignages: '⭐ Témoignages',
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/video-production')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la production
        </Button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Génération IA des Vidéos</h1>
            <p className="text-muted-foreground">
              Génération automatique des frames pour les 30+ vidéos de la campagne Bot.BJ
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Comment ça marche :</strong> Sélectionnez une vidéo, générez automatiquement les 4 frames via l'IA, 
            puis cliquez sur "Générer la vidéo" pour assembler automatiquement une vidéo MP4 avec transitions, 
            textes et musique. Visualisez et téléchargez directement !
          </AlertDescription>
        </Alert>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{videoProductionData.length}</p>
            <p className="text-sm text-muted-foreground">Vidéos totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{Object.keys(videosBySeries).length}</p>
            <p className="text-sm text-muted-foreground">Séries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">4</p>
            <p className="text-sm text-muted-foreground">Frames/vidéo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">10s</p>
            <p className="text-sm text-muted-foreground">Durée</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Sélectionner une vidéo</CardTitle>
            <CardDescription>Choisissez une vidéo pour générer ses frames</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="series">Par série</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-2 max-h-[600px] overflow-y-auto">
                {videoProductionData.map((video) => (
                  <Button
                    key={video.id}
                    variant={selectedVideoId === video.id ? "default" : "outline"}
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => setSelectedVideoId(video.id)}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm">{video.title}</p>
                        <Badge variant="secondary" className="text-xs">
                          {video.series}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-70">{video.hook}</p>
                    </div>
                  </Button>
                ))}
              </TabsContent>

              <TabsContent value="series" className="space-y-4 max-h-[600px] overflow-y-auto">
                {Object.entries(videosBySeries).map(([series, videos]) => (
                  <div key={series} className="space-y-2">
                    <p className="font-semibold text-sm">{seriesLabels[series]}</p>
                    <div className="space-y-1">
                      {videos.map((video) => (
                        <Button
                          key={video.id}
                          variant={selectedVideoId === video.id ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-left"
                          onClick={() => setSelectedVideoId(video.id)}
                        >
                          {video.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Generation Area */}
        <div className="lg:col-span-2 space-y-6">
          {selectedVideo ? (
            <>
              <VideoFrameGenerator video={selectedVideo} />
              
              {/* Section de montage vidéo */}
              {selectedVideo && generatedFrames[selectedVideo.id]?.length === 4 && (
                <VideoAssembler
                  video={selectedVideo}
                  frames={{
                    hero: generatedFrames[selectedVideo.id][0].imageUrl,
                    demo: generatedFrames[selectedVideo.id][1].imageUrl,
                    result: generatedFrames[selectedVideo.id][2].imageUrl,
                    cta: generatedFrames[selectedVideo.id][3].imageUrl
                  }}
                />
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Sélectionnez une vidéo</h3>
                <p className="text-muted-foreground">
                  Choisissez une vidéo dans la liste pour commencer la génération
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions de production</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">1. Génération des frames</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Sélectionnez une vidéo dans la liste</li>
                <li>• Cliquez sur "Générer toutes les frames"</li>
                <li>• Attendez la génération IA (4 frames)</li>
                <li>• Vérifiez les frames générées</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2. Assemblage automatique</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Choisissez un template de montage</li>
                <li>• Sélectionnez la musique de fond</li>
                <li>• Ajustez le volume si nécessaire</li>
                <li>• Cliquez sur "Générer la vidéo"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3. Visualisation</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• La vidéo s'affiche automatiquement</li>
                <li>• Prévisualisation dans le lecteur intégré</li>
                <li>• Format: 1080x1920 (9:16), 10s</li>
                <li>• Transitions et textes inclus</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">4. Téléchargement & Publication</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Téléchargez la vidéo en MP4</li>
                <li>• Publiez sur TikTok, Instagram, etc.</li>
                <li>• Ajoutez les hashtags appropriés</li>
                <li>• Suivez les analytics de performance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
