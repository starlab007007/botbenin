
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Play, Clock, User, Star, Search, Filter, Download, Share, Bookmark } from 'lucide-react';

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  category: string;
  instructor: string;
  rating: number;
  views: number;
  thumbnailUrl: string;
  videoUrl: string;
  tags: string[];
}

const videoTutorials: VideoTutorial[] = [
  {
    id: '1',
    title: 'Guide de démarrage Bot.Bj - Premiers pas',
    description: 'Découvrez comment créer votre compte, naviguer dans l\'interface et configurer vos premiers paramètres.',
    duration: '12:30',
    level: 'Débutant',
    category: 'Prise en main',
    instructor: 'Marie Dubois',
    rating: 4.9,
    views: 1250,
    thumbnailUrl: '/placeholder.svg',
    videoUrl: 'https://example.com/video1',
    tags: ['démarrage', 'configuration', 'interface']
  },
  {
    id: '2',
    title: 'Créer votre premier chatbot IA',
    description: 'Tutoriel complet pour créer, configurer et déployer votre premier assistant conversationnel.',
    duration: '18:45',
    level: 'Débutant',
    category: 'Chatbots',
    instructor: 'Jean-Pierre Martin',
    rating: 4.8,
    views: 980,
    thumbnailUrl: '/placeholder.svg',
    videoUrl: 'https://example.com/video2',
    tags: ['chatbot', 'IA', 'création']
  },
  {
    id: '3',
    title: 'Automatisations avancées avec n8n',
    description: 'Apprenez à créer des workflows complexes et connecter plus de 400 services avec n8n.',
    duration: '25:15',
    level: 'Intermédiaire',
    category: 'Automatisations',
    instructor: 'Sophie Laurent',
    rating: 4.9,
    views: 750,
    thumbnailUrl: '/placeholder.svg',
    videoUrl: 'https://example.com/video3',
    tags: ['n8n', 'workflows', 'intégrations']
  },
  {
    id: '4',
    title: 'Agent IA Business - Analyse et reporting',
    description: 'Configurez votre agent IA Business pour générer des rapports automatiques et analyser vos données.',
    duration: '22:10',
    level: 'Intermédiaire',
    category: 'Agents IA',
    instructor: 'Marie Dubois',
    rating: 4.7,
    views: 650,
    thumbnailUrl: '/placeholder.svg',
    videoUrl: 'https://example.com/video4',
    tags: ['business', 'analytics', 'rapports']
  },
  {
    id: '5',
    title: 'Marketing automation avec l\'IA',
    description: 'Découvrez comment automatiser vos campagnes marketing avec notre agent IA spécialisé.',
    duration: '19:30',
    level: 'Intermédiaire',
    category: 'Marketing',
    instructor: 'Sophie Laurent',
    rating: 4.8,
    views: 820,
    thumbnailUrl: '/placeholder.svg',
    videoUrl: 'https://example.com/video5',
    tags: ['marketing', 'automation', 'campagnes']
  },
  {
    id: '6',
    title: 'Intégrations API personnalisées',
    description: 'Tutoriel avancé pour créer des intégrations personnalisées avec vos systèmes existants.',
    duration: '31:45',
    level: 'Avancé',
    category: 'Développement',
    instructor: 'Jean-Pierre Martin',
    rating: 4.9,
    views: 420,
    thumbnailUrl: '/placeholder.svg',
    videoUrl: 'https://example.com/video6',
    tags: ['API', 'intégrations', 'développement']
  }
];

const categories = ['Tous', 'Prise en main', 'Chatbots', 'Automatisations', 'Agents IA', 'Marketing', 'Développement'];
const levels = ['Tous', 'Débutant', 'Intermédiaire', 'Avancé'];

export const VideoTutorials: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedLevel, setSelectedLevel] = useState('Tous');
  const [bookmarkedVideos, setBookmarkedVideos] = useState<string[]>([]);

  const filteredVideos = videoTutorials.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'Tous' || video.category === selectedCategory;
    const matchesLevel = selectedLevel === 'Tous' || video.level === selectedLevel;
    
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const toggleBookmark = (videoId: string) => {
    setBookmarkedVideos(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Débutant': return 'bg-green-100 text-green-800';
      case 'Intermédiaire': return 'bg-yellow-100 text-yellow-800';
      case 'Avancé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedVideo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto p-6">
          <Button 
            onClick={() => setSelectedVideo(null)}
            variant="outline" 
            className="mb-6 text-gray-700 border-gray-300"
          >
            ← Retour aux tutoriels
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2">
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-0">
                  <div className="aspect-video bg-gray-900 rounded-t-lg flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-16 h-16 text-white mb-4 mx-auto" />
                      <p className="text-white">Lecteur vidéo intégré</p>
                      <p className="text-gray-300 text-sm">Cliquez pour lire la vidéo</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedVideo.title}</h1>
                    <p className="text-gray-600 mb-4">{selectedVideo.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{selectedVideo.duration}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600">{selectedVideo.rating}</span>
                        </div>
                        <span className="text-sm text-gray-600">{selectedVideo.views} vues</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={() => toggleBookmark(selectedVideo.id)}
                          variant="outline" 
                          size="sm"
                          className="text-gray-700 border-gray-300"
                        >
                          <Bookmark className={`w-4 h-4 ${bookmarkedVideos.includes(selectedVideo.id) ? 'fill-current text-blue-600' : ''}`} />
                        </Button>
                        <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
                          <Share className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Video Info */}
            <div className="space-y-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900">Instructeur</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedVideo.instructor}</h3>
                      <p className="text-sm text-gray-600">Expert Bot.Bj</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900">Détails</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Catégorie</span>
                    <p className="font-medium text-gray-900">{selectedVideo.category}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Niveau</span>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(selectedVideo.level)}`}>
                        {selectedVideo.level}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedVideo.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <Video className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vidéos Tutoriels</h1>
          <p className="text-gray-600">Apprenez à maîtriser Bot.Bj avec nos guides vidéo complets</p>
        </div>

        {/* Filters */}
        <Card className="bg-white border border-gray-200 mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un tutoriel..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Niveau</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  {levels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <Card key={video.id} className="bg-white border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-200 rounded-t-lg relative group">
                  <img 
                    src={video.thumbnailUrl} 
                    alt={video.title}
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      onClick={() => setSelectedVideo(video)}
                      className="bg-white text-gray-900 hover:bg-gray-100"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Lire
                    </Button>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(video.id);
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-white bg-opacity-90 hover:bg-opacity-100"
                    >
                      <Bookmark className={`w-4 h-4 ${bookmarkedVideos.includes(video.id) ? 'fill-current text-blue-600' : 'text-gray-600'}`} />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(video.level)}`}>
                      {video.level}
                    </span>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{video.rating}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{video.instructor}</span>
                    <span>{video.views} vues</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredVideos.length === 0 && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun tutoriel trouvé</h3>
            <p className="text-gray-600">Essayez de modifier vos critères de recherche</p>
          </div>
        )}
      </div>
    </div>
  );
};
