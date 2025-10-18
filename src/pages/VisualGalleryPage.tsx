import { useState, useEffect } from 'react';
import { useMediaManager, MediaItem } from '@/hooks/useMediaManager';
import { UniversalMediaModal } from '@/components/visual-creator/UniversalMediaModal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Image as ImageIcon, Video, FileText, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function VisualGalleryPage() {
  const { loadUserGallery, deleteMedia, downloadMedia, isLoading } = useMediaManager();
  const [medias, setMedias] = useState<MediaItem[]>([]);
  const [filteredMedias, setFilteredMedias] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadGallery();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [medias, searchTerm, typeFilter]);

  const loadGallery = async () => {
    const data = await loadUserGallery();
    setMedias(data);
  };

  const applyFilters = () => {
    let filtered = [...medias];

    if (typeFilter !== 'all') {
      filtered = filtered.filter(m => m.type === typeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.prompt.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMedias(filtered);
  };

  const handleView = (media: MediaItem) => {
    setSelectedMedia(media);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const success = await deleteMedia(id);
    if (success) {
      setMedias(prev => prev.filter(m => m.id !== id));
      setDeleteId(null);
    }
  };

  const getTypeIcon = (type: MediaItem['type']) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'flyer':
      case 'product_photo':
        return <FileText className="h-4 w-4" />;
      default:
        return <ImageIcon className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: MediaItem['type']) => {
    switch (type) {
      case 'video':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'flyer':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'product_photo':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case '3d_model':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Ma Galerie</h1>
        <p className="text-muted-foreground">
          Toutes vos créations visuelles en un seul endroit
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre ou prompt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Vidéos</SelectItem>
              <SelectItem value="flyer">Flyers</SelectItem>
              <SelectItem value="product_photo">Photos Produit</SelectItem>
              <SelectItem value="combined_image">Images combinées</SelectItem>
              <SelectItem value="3d_model">Modèles 3D</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          {filteredMedias.length} résultat{filteredMedias.length > 1 ? 's' : ''}
        </div>
      </Card>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      ) : filteredMedias.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Aucune création</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || typeFilter !== 'all'
              ? 'Aucun résultat pour ces filtres'
              : 'Commencez à créer pour remplir votre galerie'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMedias.map((media) => (
            <Card key={media.id} className="overflow-hidden group hover:shadow-lg transition-all">
              {/* Image/Thumbnail */}
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={media.thumbnail_url || media.image_url}
                  alt={media.title || 'Création'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleView(media)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Voir
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteId(media.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold line-clamp-1 flex-1">
                    {media.title}
                  </h3>
                  <Badge variant="outline" className={getTypeColor(media.type)}>
                    <span className="flex items-center gap-1">
                      {getTypeIcon(media.type)}
                      {media.type}
                    </span>
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {media.prompt}
                </p>
                {media.style && (
                  <Badge variant="secondary" className="text-xs">
                    {media.style}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(media.created_at || '').toLocaleDateString('fr-FR')}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de visualisation */}
      <UniversalMediaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        media={selectedMedia}
        onDownload={downloadMedia}
      />

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La création sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
