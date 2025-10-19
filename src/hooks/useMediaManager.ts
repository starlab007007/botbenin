import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { convertWebMtoMP4, isVideoFile, getVideoFormat } from '@/utils/videoConverter';
import { toast as sonnerToast } from 'sonner';

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'flyer' | '3d_model' | 'product_photo' | 'combined_image';
  title?: string;
  prompt: string;
  style?: string;
  format?: string;
  image_url?: string;
  storage_path?: string;
  thumbnail_url?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

interface SaveMediaParams {
  type: MediaItem['type'];
  title?: string;
  prompt: string;
  style?: string;
  format?: string;
  imageUrl: string;
  metadata?: Record<string, any>;
}

export const useMediaManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const saveToGallery = async (params: SaveMediaParams): Promise<MediaItem | null> => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour sauvegarder",
          variant: "destructive"
        });
        return null;
      }

      // Télécharger l'image et l'uploader dans Supabase Storage
      let storagePath = '';
      let thumbnailUrl = params.imageUrl;
      
      if (params.imageUrl.startsWith('data:image')) {
        // Convertir base64 en blob de manière robuste
        const base64Data = params.imageUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        
        // Upload vers Storage
        const fileName = `${user.id}/${Date.now()}-${params.type}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('visual-assets')
          .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        storagePath = uploadData.path;
        
        // Obtenir l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('visual-assets')
          .getPublicUrl(storagePath);
          
        thumbnailUrl = publicUrl;
      }

      // Insérer dans visual_creations
      const { data, error } = await supabase
        .from('visual_creations')
        .insert({
          user_id: user.id,
          type: params.type,
          title: params.title || `${params.type} - ${new Date().toLocaleDateString('fr-FR')}`,
          prompt: params.prompt,
          style: params.style,
          format: params.format,
          image_url: thumbnailUrl,
          storage_path: storagePath,
          thumbnail_url: thumbnailUrl,
          metadata: params.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ Sauvegardé !",
        description: "Votre création a été ajoutée à votre galerie"
      });

      return data as MediaItem;
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder votre création",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserGallery = async (filters?: {
    type?: MediaItem['type'];
    searchTerm?: string;
    limit?: number;
  }): Promise<MediaItem[]> => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      let query = supabase
        .from('visual_creations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.searchTerm) {
        query = query.or(`title.ilike.%${filters.searchTerm}%,prompt.ilike.%${filters.searchTerm}%`);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as MediaItem[];
    } catch (error) {
      console.error('Load gallery error:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMedia = async (mediaId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: media } = await supabase
        .from('visual_creations')
        .select('storage_path')
        .eq('id', mediaId)
        .single();

      // Supprimer le fichier du storage si existe
      if (media?.storage_path) {
        await supabase.storage
          .from('visual-assets')
          .remove([media.storage_path]);
      }

      // Supprimer l'entrée de la base
      const { error } = await supabase
        .from('visual_creations')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      toast({
        title: "Supprimé",
        description: "La création a été supprimée"
      });

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadMedia = async (mediaUrl: string, fileName: string) => {
    try {
      // Déterminer le type MIME si c'est un blob URL
      let mimeType: string | undefined;
      if (mediaUrl.startsWith('blob:')) {
        try {
          const response = await fetch(mediaUrl);
          const blob = await response.blob();
          mimeType = blob.type;
        } catch (e) {
          console.warn('Could not determine blob MIME type', e);
        }
      }
      
      // Check if it's a video file that needs conversion
      if (isVideoFile(mediaUrl, mimeType) && getVideoFormat(mediaUrl, mimeType) === 'webm') {
        sonnerToast.info('Conversion en MP4 en cours...', { duration: Infinity, id: 'converting' });
        
        // Fetch the video
        const response = await fetch(mediaUrl);
        const webmBlob = await response.blob();
        
        // Convert to MP4
        const mp4Blob = await convertWebMtoMP4(webmBlob, (progress) => {
          sonnerToast.loading(`Conversion: ${progress}%`, { id: 'converting' });
        });
        
        sonnerToast.dismiss('converting');
        sonnerToast.success('Conversion terminée !');
        
        // Download the converted file
        const url = URL.createObjectURL(mp4Blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName.replace(/\.webm$/i, '.mp4');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Téléchargement réussi",
          description: "Le fichier MP4 a été téléchargé"
        });
      } else {
        // Direct download for non-video or already MP4 files
        const response = await fetch(mediaUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Téléchargement réussi",
          description: "Le fichier a été téléchargé"
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      sonnerToast.dismiss('converting');
      toast({
        title: "Erreur",
        description: "Échec du téléchargement",
        variant: "destructive"
      });
    }
  };

  return {
    saveToGallery,
    loadUserGallery,
    deleteMedia,
    downloadMedia,
    isLoading
  };
};
