import * as React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage, uploadOptions, thumbUrl } from '@/lib/imageOptimize';

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  folder?: string; // path inside bucket
  bucket?: string;
  className?: string;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const ProductPhotoUploader = React.memo(function ProductPhotoUploader({
  value, onChange, max = 3, folder = 'partner-products', bucket = 'waouh-media', className,
}: Props) {
  const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const remaining = Math.max(0, max - (value?.length || 0));

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    const newUrls: string[] = [];
    for (const raw of list) {
      if (!raw.type.startsWith('image/')) {
        toast({ title: 'Fichier ignoré', description: `${raw.name} n'est pas une image.`, variant: 'destructive' });
        continue;
      }
      if (raw.size > MAX_SIZE) {
        toast({ title: 'Fichier trop lourd', description: `${raw.name} dépasse 5 Mo.`, variant: 'destructive' });
        continue;
      }
      // (B) Compress client-side before upload — typically 60-85% smaller.
      const f = await compressImage(raw, { maxDimension: 1600, quality: 0.82 });
      const ext = (f.name.split('.').pop() || 'webp').toLowerCase();
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      // (C) Long cache-control — filenames are immutable, safe for 1 year.
      const { error } = await supabase.storage.from(bucket).upload(path, f, uploadOptions(f.type));
      if (error) {
        toast({ title: 'Échec upload', description: error.message, variant: 'destructive' });
        continue;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }
    onChange([...(value || []), ...newUrls].slice(0, max));
    setUploading(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  const removeAt = (i: number) => onChange((value || []).filter((_, idx) => idx !== i));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-3 gap-2">
        {(value || []).map((url, i) => (
          <div key={url + i} className="relative aspect-square rounded-md overflow-hidden border bg-muted group">
            <img src={thumbUrl(url)} alt={`Photo ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Supprimer"
              className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center text-xs text-muted-foreground hover:border-primary hover:text-primary transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5 mb-1" />}
            <span>{uploading ? 'Envoi...' : `Ajouter (${remaining})`}</span>
          </button>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Upload className="h-3 w-3" />
        Jusqu'à {max} photos · 5 Mo max · compressées automatiquement
      </p>
    </div>
  );
});
