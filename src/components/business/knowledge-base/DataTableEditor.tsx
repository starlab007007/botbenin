import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit, Upload, Image as ImageIcon } from 'lucide-react';
import { KnowledgeTable } from '@/types/knowledge-base';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DataTableEditorProps {
  table: KnowledgeTable;
  data: Record<string, any>[];
  onChange: (newData: Record<string, any>[]) => void;
}

export const DataTableEditor: React.FC<DataTableEditorProps> = ({
  table,
  data,
  onChange
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();

  const handleOpenDialog = (index: number | null = null) => {
    if (index !== null) {
      setEditingIndex(index);
      setFormData({ ...data[index] });
    } else {
      setEditingIndex(null);
      setFormData({});
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const newData = [...data];
    if (editingIndex !== null) {
      newData[editingIndex] = formData;
    } else {
      newData.push(formData);
    }
    onChange(newData);
    setIsDialogOpen(false);
    setFormData({});
  };

  const handleDelete = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    onChange(newData);
  };

  const handleImageUpload = async (fieldName: string, file: File) => {
    try {
      setUploadingImage(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      // Include user ID in path to match RLS policy
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('knowledge_bases')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('knowledge_bases')
        .getPublicUrl(filePath);

      setFormData({ ...formData, [fieldName]: publicUrl });
      
      toast({
        title: 'Succès',
        description: 'Image téléchargée avec succès'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger l\'image',
        variant: 'destructive'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const renderField = (field: any) => {
    if (field.type === 'image') {
      return (
        <div className="space-y-2">
          {formData[field.name] && (
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 border rounded-lg overflow-hidden">
              <img 
                src={formData[field.name]} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingImage}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleImageUpload(field.name, file);
                };
                input.click();
              }}
              className="flex-1 sm:flex-initial text-xs sm:text-sm"
            >
              <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              {uploadingImage ? 'Téléchargement...' : 'Choisir une image'}
            </Button>
            {formData[field.name] && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFormData({ ...formData, [field.name]: '' })}
                className="flex-1 sm:flex-initial"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            )}
          </div>
        </div>
      );
    }
    
    if (field.type === 'select') {
      return (
        <Select
          value={formData[field.name] || ''}
          onValueChange={(value) => setFormData({ ...formData, [field.name]: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'textarea') {
      return (
        <Textarea
          placeholder={field.placeholder}
          value={formData[field.name] || ''}
          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          rows={3}
        />
      );
    }

    return (
      <Input
        type={field.type === 'price' ? 'number' : field.type}
        placeholder={field.placeholder}
        value={formData[field.name] || ''}
        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
      />
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-base sm:text-lg">{table.name}</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">{table.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={table.required ? 'default' : 'secondary'} className="text-xs">
                {table.required ? 'Requis' : 'Optionnel'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {data.length} entrée{data.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {data.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {table.fields.slice(0, 3).map(field => (
                      <TableHead key={field.name} className="min-w-[100px] text-xs sm:text-sm">{field.name}</TableHead>
                    ))}
                    <TableHead className="text-right min-w-[80px] text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={index}>
                      {table.fields.slice(0, 3).map(field => (
                        <TableCell key={field.name} className="max-w-[150px] sm:max-w-[200px] truncate text-xs sm:text-sm">
                          {row[field.name] || '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-muted-foreground">
              Aucune donnée. Commencez par ajouter une entrée.
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()} className="flex-1 text-sm sm:text-base">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une entrée
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingIndex !== null ? 'Modifier' : 'Ajouter'} - {table.name}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Remplissez les champs ci-dessous
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 py-4">
            {table.fields.map(field => (
              <div key={field.name} className={field.type === 'textarea' || field.type === 'image' ? 'md:col-span-2' : ''}>
                <Label className="text-sm">
                  {field.name}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <div className="mt-2">
                  {renderField(field)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">
              {editingIndex !== null ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
