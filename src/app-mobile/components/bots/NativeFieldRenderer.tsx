import { useRef, useState } from 'react';
import { Image as ImageIcon, MapPin, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import NativeSelectSheet from '../native/NativeSelectSheet';
import { cn } from '@/lib/utils';

interface Field {
  name: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  description?: string;
}

interface Props {
  field: Field;
  value: any;
  onChange: (v: any) => void;
}

/** Rend un champ d'entrée 100% natif Android (clavier typé, picker date natif, file picker natif, bottom-sheet pour select). */
export default function NativeFieldRenderer({ field, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('knowledge_bases').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('knowledge_bases').getPublicUrl(path);
      onChange(publicUrl);
      toast.success('Fichier téléchargé');
    } catch (e: any) {
      toast.error(e.message || "Erreur d'upload");
    } finally {
      setUploading(false);
    }
  };

  const useMyPosition = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Géolocalisation indisponible');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
      () => toast.error("Position refusée")
    );
  };

  const baseInput =
    'w-full h-12 px-3 rounded-lg border border-input bg-background text-[15px] outline-none focus:border-primary';

  if (field.type === 'select') {
    return (
      <NativeSelectSheet
        value={value || ''}
        onChange={onChange}
        options={field.options || []}
        placeholder={field.placeholder || 'Sélectionner...'}
      />
    );
  }

  if (field.type === 'multiselect') {
    const selected: string[] = Array.isArray(value) ? value : value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : [];
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {(field.options || []).map(opt => {
            const on = selected.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                onClick={() => onChange(on ? selected.filter(s => s !== opt) : [...selected, opt])}
                className={cn(
                  'px-3 py-2 rounded-full border text-xs active:scale-95 transition',
                  on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input'
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        rows={4}
        placeholder={field.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[100px] px-3 py-2.5 rounded-lg border border-input bg-background text-[15px] outline-none focus:border-primary resize-none"
      />
    );
  }

  if (field.type === 'image' || field.type === 'file') {
    const accept = field.type === 'image' ? 'image/*' : '*/*';
    return (
      <div className="space-y-2">
        {value && field.type === 'image' && (
          <div className="relative w-28 h-28 rounded-lg overflow-hidden border">
            <img src={value} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {value && field.type === 'file' && (
          <div className="text-xs text-muted-foreground truncate">📎 {String(value).split('/').pop()}</div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 h-11 rounded-lg border border-input bg-background flex items-center justify-center gap-2 text-sm active:bg-accent"
          >
            {field.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Envoi...' : value ? 'Remplacer' : 'Choisir un fichier'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="h-11 w-11 rounded-lg border border-input flex items-center justify-center active:bg-accent"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (field.type === 'address') {
    return (
      <div className="space-y-2">
        <input
          type="text"
          placeholder={field.placeholder || 'Adresse'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
        />
        <button
          type="button"
          onClick={useMyPosition}
          className="w-full h-11 rounded-lg border border-input bg-background flex items-center justify-center gap-2 text-sm active:bg-accent"
        >
          <MapPin className="h-4 w-4" /> Utiliser ma position
        </button>
      </div>
    );
  }

  const inputType =
    field.type === 'price' || field.type === 'number' ? 'number'
    : field.type === 'date' ? 'date'
    : field.type === 'time' ? 'time'
    : field.type === 'datetime' ? 'datetime-local'
    : field.type === 'email' ? 'email'
    : field.type === 'phone' ? 'tel'
    : field.type === 'url' ? 'url'
    : 'text';

  const inputMode =
    field.type === 'phone' ? 'tel'
    : field.type === 'email' ? 'email'
    : field.type === 'url' ? 'url'
    : field.type === 'number' || field.type === 'price' ? 'decimal'
    : undefined;

  return (
    <input
      type={inputType}
      inputMode={inputMode as any}
      placeholder={field.placeholder}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={baseInput}
    />
  );
}
