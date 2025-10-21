import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileUploadFieldProps {
  fieldName: string;
  value: string | null;
  onChange: (url: string) => void;
  onClear: () => void;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  fieldName,
  value,
  onChange,
  onClear
}) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('knowledge_bases')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('knowledge_bases')
        .getPublicUrl(filePath);

      onChange(publicUrl);
      
      toast({
        title: 'Succès',
        description: 'Fichier téléchargé avec succès'
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le fichier',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const getFileName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/');
      return decodeURIComponent(parts[parts.length - 1]);
    } catch {
      return 'Fichier';
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 text-sm truncate hover:underline"
          >
            {getFileName(value)}
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleFileUpload(file);
          };
          input.click();
        }}
        className="w-full"
      >
        <Upload className="w-4 h-4 mr-2" />
        {uploading ? 'Téléchargement...' : value ? 'Remplacer le fichier' : 'Choisir un fichier'}
      </Button>
    </div>
  );
};
