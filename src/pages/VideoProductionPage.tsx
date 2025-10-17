import React, { useState, useMemo } from 'react';
import { VideoProduction, VideoStatus, VideoSeries, VideoPlatform } from '@/types/video-production';
import { videoProductionData } from '@/data/videoProductionData';
import { VideoProductionCard } from '@/components/video-production/VideoProductionCard';
import { ProductionStats } from '@/components/video-production/ProductionStats';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Film, Calendar, Download, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const VideoProductionPage: React.FC = () => {
  const [videos, setVideos] = useState<VideoProduction[]>(videoProductionData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<VideoStatus | 'all'>('all');
  const [filterSeries, setFilterSeries] = useState<VideoSeries | 'all'>('all');
  const [filterPlatform, setFilterPlatform] = useState<VideoPlatform | 'all'>('all');

  const stats = useMemo(() => {
    return {
      total: videos.length,
      toProduceCount: videos.filter(v => v.status === 'to_produce').length,
      inProgressCount: videos.filter(v => v.status === 'in_progress').length,
      completedCount: videos.filter(v => v.status === 'completed').length,
      publishedCount: videos.filter(v => v.status === 'published').length,
    };
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          video.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || video.status === filterStatus;
      const matchesSeries = filterSeries === 'all' || video.series === filterSeries;
      const matchesPlatform = filterPlatform === 'all' || video.platforms.includes(filterPlatform);
      
      return matchesSearch && matchesStatus && matchesSeries && matchesPlatform;
    });
  }, [videos, searchTerm, filterStatus, filterSeries, filterPlatform]);

  const videosBySeries = useMemo(() => {
    const grouped: Record<VideoSeries, VideoProduction[]> = {
      lancement: [],
      whatsapp: [],
      prospects: [],
      createur: [],
      chatbot: [],
      guides: [],
      paiement: [],
      temoignages: [],
    };

    filteredVideos.forEach(video => {
      grouped[video.series].push(video);
    });

    return grouped;
  }, [filteredVideos]);

  const handleStatusChange = (id: string, status: VideoStatus) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  };

  const seriesLabels: Record<VideoSeries, string> = {
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
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Film className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Production Vidéo Bot.BJ</h1>
            <p className="text-muted-foreground">Gestion des shorts 10 secondes pour le lancement</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <ProductionStats stats={stats} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Affinez votre recherche</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une vidéo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as VideoStatus | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="to_produce">À produire</SelectItem>
                <SelectItem value="in_progress">En production</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSeries} onValueChange={(value) => setFilterSeries(value as VideoSeries | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Série" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les séries</SelectItem>
                {Object.entries(seriesLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPlatform} onValueChange={(value) => setFilterPlatform(value as VideoPlatform | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Plateforme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les plateformes</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterSeries('all');
                setFilterPlatform('all');
              }}
            >
              Réinitialiser
            </Button>
            <Badge variant="secondary" className="ml-auto">
              {filteredVideos.length} résultat{filteredVideos.length > 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button 
          onClick={() => window.location.href = '/video-production/generate'} 
          className="gap-2"
        >
          <Film className="h-4 w-4" />
          Générer avec l'IA
        </Button>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => window.location.href = '/video-production/calendar'}
        >
          <Calendar className="h-4 w-4" />
          Calendrier de publication
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter la liste
        </Button>
        <Button variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Guide de production
        </Button>
      </div>

      {/* Videos by Series */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-2">
          <TabsTrigger value="all">
            Toutes ({filteredVideos.length})
          </TabsTrigger>
          {Object.entries(videosBySeries).map(([series, vids]) => (
            <TabsTrigger key={series} value={series}>
              {seriesLabels[series as VideoSeries]} ({vids.length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {Object.entries(videosBySeries).map(([series, vids]) => {
            if (vids.length === 0) return null;
            
            return (
              <div key={series} className="space-y-3">
                <h3 className="text-xl font-semibold">{seriesLabels[series as VideoSeries]}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vids.map(video => (
                    <VideoProductionCard
                      key={video.id}
                      video={video}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredVideos.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune vidéo trouvée</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {Object.entries(videosBySeries).map(([series, vids]) => (
          <TabsContent key={series} value={series} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vids.map(video => (
                <VideoProductionCard
                  key={video.id}
                  video={video}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
