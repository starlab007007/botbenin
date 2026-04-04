import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit, Image as ImageIcon } from 'lucide-react';
import { KnowledgeTable } from '@/types/knowledge-base';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { FileUploadField } from './fields/FileUploadField';
import { DateTimeField } from './fields/DateTimeField';
import { AddressField } from './fields/AddressField';

interface DataTableEditorProps {
  table: KnowledgeTable;
  data: Record<string, any>[];
  onChange: (newData: Record<string, any>[]) => void;
}

export const DataTableEditor: React.FC<DataTableEditorProps> = ({ table, data, onChange }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
    onChange(data.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (fieldName: string, file: File) => {
    try {
      setUploadingImage(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('knowledge_bases').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('knowledge_bases').getPublicUrl(filePath);
      setFormData({ ...formData, [fieldName]: publicUrl });
      toast({ title: 'Succès', description: 'Image téléchargée avec succès' });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: 'Erreur', description: "Impossible de télécharger l'image", variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const renderField = (field: any) => {
    if (field.type === 'file') {
      return <FileUploadField fieldName={field.name} value={formData[field.name] || null} onChange={(url) => setFormData({ ...formData, [field.name]: url })} onClear={() => setFormData({ ...formData, [field.name]: '' })} />;
    }
    if (field.type === 'datetime') {
      return <DateTimeField value={formData[field.name] || ''} onChange={(value) => setFormData({ ...formData, [field.name]: value })} placeholder={field.placeholder} />;
    }
    if (field.type === 'address') {
      return <AddressField value={formData[field.name] || ''} onChange={(value) => setFormData({ ...formData, [field.name]: value })} placeholder={field.placeholder} />;
    }
    if (field.type === 'image') {
      return (
        <div className="space-y-2">
          {formData[field.name] && (
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 border rounded-lg overflow-hidden">
              <img src={formData[field.name]} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={uploadingImage} onClick={() => {
              const input = document.createElement('input');
              input.type = 'file'; input.accept = 'image/*';
              input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) handleImageUpload(field.name, file); };
              input.click();
            }} className="flex-1 text-xs">
              <ImageIcon className="w-3 h-3 mr-1.5" />
              {uploadingImage ? 'Upload...' : 'Image'}
            </Button>
            {formData[field.name] && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({ ...formData, [field.name]: '' })}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      );
    }
    if (field.type === 'select') {
      return (
        <Select value={formData[field.name] || ''} onValueChange={(value) => setFormData({ ...formData, [field.name]: value })}>
          <SelectTrigger><SelectValue placeholder={field.placeholder} /></SelectTrigger>
          <SelectContent>{field.options?.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
        </Select>
      );
    }
    if (field.type === 'textarea') {
      return <Textarea placeholder={field.placeholder} value={formData[field.name] || ''} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })} rows={3} />;
    }
    return (
      <Input
        type={field.type === 'price' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : field.type}
        placeholder={field.placeholder}
        value={formData[field.name] || ''}
        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
      />
    );
  };

  // Mobile: card-based layout
  const renderMobileCards = () => (
    <div className="space-y-3">
      {data.map((row, index) => {
        const primaryField = table.fields[0];
        const secondaryField = table.fields[1];
        return (
          <div key={index} className="bg-card border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {primaryField?.type === 'image' && row[primaryField.name] ? (
                    <img src={row[primaryField.name]} alt="" className="w-10 h-10 object-cover rounded inline-block mr-2" />
                  ) : (
                    row[primaryField?.name] || 'Sans nom'
                  )}
                </p>
                {secondaryField && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {row[secondaryField.name] || '-'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(index)} className="h-8 w-8 p-0">
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(index)} className="h-8 w-8 p-0">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </div>
            {table.fields.length > 2 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border/50">
                {table.fields.slice(2, 6).map(field => (
                  <div key={field.name} className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{field.name}</span>
                    <p className="text-xs truncate mt-0.5">{row[field.name] || '-'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Desktop: table layout
  const renderDesktopTable = () => (
    <div className="border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {table.fields.slice(0, 5).map(field => (
                <TableHead key={field.name} className="min-w-[100px] text-xs font-semibold uppercase tracking-wider">{field.name}</TableHead>
              ))}
              <TableHead className="text-right min-w-[80px] text-xs font-semibold uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index} className="hover:bg-muted/20 transition-colors">
                {table.fields.slice(0, 5).map(field => (
                  <TableCell key={field.name} className="max-w-[200px] truncate text-sm">
                    {field.type === 'image' && row[field.name] ? (
                      <img src={row[field.name]} alt="" className="w-10 h-10 object-cover rounded-lg" />
                    ) : (
                      row[field.name] || <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(index)} className="h-8 w-8 p-0 hover:bg-primary/10">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(index)} className="h-8 w-8 p-0 hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 bg-gradient-to-r from-muted/30 to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-base truncate">{table.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5 line-clamp-1">{table.description}</CardDescription>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant={table.required ? 'default' : 'secondary'} className="text-[10px] h-5">
                {table.required ? 'Requis' : 'Optionnel'}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5">
                {data.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5 space-y-3">
          {data.length > 0 ? (
            isMobile ? renderMobileCards() : renderDesktopTable()
          ) : (
            <div className="text-center py-8 sm:py-10">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Plus className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Aucune donnée. Ajoutez votre première entrée.</p>
            </div>
          )}

          <Button onClick={() => handleOpenDialog()} className="w-full h-10 sm:h-11 text-sm font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une entrée
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="fixed inset-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] translate-x-0 translate-y-0 w-full sm:max-w-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-none sm:rounded-lg border-0 sm:border">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-3 border-b sm:border-b-0 -mx-4 px-4 -mt-4 pt-4 sm:mx-0 sm:px-0 sm:mt-0 sm:pt-0 sm:pb-0 sm:relative">
            <DialogTitle className="text-base sm:text-lg pr-8">
              {editingIndex !== null ? 'Modifier' : 'Ajouter'} — {table.name}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Remplissez les champs ci-dessous
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 py-3 sm:py-4">
              {table.fields.map(field => (
                <div key={field.name} className={field.type === 'textarea' || field.type === 'image' || field.type === 'file' || field.type === 'datetime' || field.type === 'address' ? 'md:col-span-2' : ''}>
                  <Label className="text-xs sm:text-sm font-medium block mb-1.5">
                    {field.name}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <div>{renderField(field)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="sticky bottom-0 bg-background z-10 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t -mx-4 px-4 -mb-4 pb-4 sm:mx-0 sm:px-0 sm:mb-0 sm:pb-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto h-11 sm:h-10">Annuler</Button>
            <Button onClick={handleSave} className="w-full sm:w-auto h-11 sm:h-10">
              {editingIndex !== null ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
