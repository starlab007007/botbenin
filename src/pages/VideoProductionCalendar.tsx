import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { videoProductionData } from '@/data/videoProductionData';
import { Calendar, Video } from 'lucide-react';
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export const VideoProductionCalendar: React.FC = () => {
  const videosByDate = useMemo(() => {
    const grouped: Record<string, typeof videoProductionData> = {};
    
    videoProductionData.forEach(video => {
      if (video.publicationDate) {
        const date = video.publicationDate;
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(video);
      }
    });

    return grouped;
  }, []);

  const sortedDates = Object.keys(videosByDate).sort();
  
  // Organiser par semaine
  const weeklySchedule = useMemo(() => {
    const weeks: Record<string, Record<string, typeof videoProductionData>> = {};
    
    sortedDates.forEach(dateStr => {
      const date = parseISO(dateStr);
      const weekStart = startOfWeek(date, { locale: fr });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = {};
      }
      
      weeks[weekKey][dateStr] = videosByDate[dateStr];
    });

    return weeks;
  }, [videosByDate, sortedDates]);

  const seriesColors: Record<string, string> = {
    lancement: 'bg-primary/20 text-primary border-primary',
    whatsapp: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500',
    prospects: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500',
    createur: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500',
    chatbot: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500',
    guides: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500',
    paiement: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500',
    temoignages: 'bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500',
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Calendrier de Publication</h1>
            <p className="text-muted-foreground">Planning des 4 semaines de lancement</p>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{videoProductionData.length}</p>
            <p className="text-sm text-muted-foreground">Vidéos totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{Object.keys(weeklySchedule).length}</p>
            <p className="text-sm text-muted-foreground">Semaines</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{sortedDates.length}</p>
            <p className="text-sm text-muted-foreground">Jours de publication</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">10s</p>
            <p className="text-sm text-muted-foreground">Durée/vidéo</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendrier par semaine */}
      <div className="space-y-6">
        {Object.entries(weeklySchedule).map(([weekStart, weekDates], weekIndex) => {
          const startDate = parseISO(weekStart);
          const endDate = addDays(startDate, 6);
          
          return (
            <Card key={weekStart}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Badge variant="outline" className="text-base">
                    Semaine {weekIndex + 1}
                  </Badge>
                  <span className="text-muted-foreground text-base font-normal">
                    {format(startDate, 'd MMM', { locale: fr })} - {format(endDate, 'd MMM yyyy', { locale: fr })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {Object.entries(weekDates).map(([dateStr, videos]) => {
                    const date = parseISO(dateStr);
                    const dayName = format(date, 'EEEE', { locale: fr });
                    const dayDate = format(date, 'd MMMM', { locale: fr });
                    
                    return (
                      <div key={dateStr} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold capitalize">{dayName}</p>
                            <p className="text-sm text-muted-foreground capitalize">{dayDate}</p>
                          </div>
                          <Badge variant="secondary">
                            {videos.length} vidéo{videos.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          {videos.map(video => (
                            <div 
                              key={video.id} 
                              className={`p-3 rounded-lg border ${seriesColors[video.series]} space-y-2`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{video.title}</p>
                                  <p className="text-xs opacity-80 mt-1">{video.description}</p>
                                </div>
                                <Video className="h-4 w-4 flex-shrink-0" />
                              </div>
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {video.series}
                                </Badge>
                                {video.platforms.map(platform => (
                                  <Badge key={platform} variant="secondary" className="text-xs">
                                    {platform}
                                  </Badge>
                                ))}
                              </div>
                              
                              <p className="text-xs font-medium">🎯 {video.hook}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Légende */}
      <Card>
        <CardHeader>
          <CardTitle>Légende des séries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries({
              lancement: '🚀 Lancement',
              whatsapp: '💬 WhatsApp',
              prospects: '🎯 Prospects',
              createur: '🎨 Créateur',
              chatbot: '🤖 Chatbot',
              guides: '📚 Guides',
              paiement: '💳 Paiement',
              temoignages: '⭐ Témoignages',
            }).map(([key, label]) => (
              <div key={key} className={`p-3 rounded-lg border ${seriesColors[key]}`}>
                <p className="text-sm font-medium">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
