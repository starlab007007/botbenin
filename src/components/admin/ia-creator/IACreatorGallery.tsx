import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Flag, Trash2, Eye } from 'lucide-react';

interface Creation {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
  metadata: any;
  moderation?: {
    status: string;
    moderation_notes?: string;
  }[];
}

interface IACreatorGalleryProps {
  creations: Creation[] | undefined;
  onModerate: (creationId: string, status: 'approved' | 'rejected' | 'flagged', notes?: string) => void;
  onDelete: (creationId: string) => void;
}

export const IACreatorGallery: React.FC<IACreatorGalleryProps> = ({
  creations,
  onModerate,
  onDelete,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!creations || creations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune création trouvée
      </div>
    );
  }

  const getStatusBadge = (moderation?: { status: string }[]) => {
    if (!moderation || moderation.length === 0) {
      return <Badge variant="secondary">En attente</Badge>;
    }
    const status = moderation[0].status;
    if (status === 'approved') return <Badge className="bg-green-500">Approuvé</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Rejeté</Badge>;
    if (status === 'flagged') return <Badge className="bg-orange-500">Signalé</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {creations.map((creation) => (
          <Card key={creation.id} className="overflow-hidden">
            <div className="relative aspect-square">
              <img
                src={creation.image_url}
                alt={creation.prompt}
                className="object-cover w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImage(creation.image_url)}
              />
              <div className="absolute top-2 right-2">
                {getStatusBadge(creation.moderation)}
              </div>
            </div>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {creation.prompt}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onModerate(creation.id, 'approved')}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approuver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onModerate(creation.id, 'rejected')}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Rejeter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onModerate(creation.id, 'flagged')}
                >
                  <Flag className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(creation.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lightbox simple */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
          />
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-4"
            onClick={() => setSelectedImage(null)}
          >
            <XCircle className="h-6 w-6" />
          </Button>
        </div>
      )}
    </>
  );
};