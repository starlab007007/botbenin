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
import { Plus, Trash2, Edit, Upload } from 'lucide-react';
import { KnowledgeTable } from '@/types/knowledge-base';

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

  const renderField = (field: any) => {
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{table.name}</CardTitle>
              <CardDescription>{table.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={table.required ? 'default' : 'secondary'}>
                {table.required ? 'Requis' : 'Optionnel'}
              </Badge>
              <Badge variant="outline">
                {data.length} entrée{data.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {table.fields.slice(0, 3).map(field => (
                      <TableHead key={field.name}>{field.name}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={index}>
                      {table.fields.slice(0, 3).map(field => (
                        <TableCell key={field.name} className="max-w-[200px] truncate">
                          {row[field.name] || '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(index)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucune donnée. Commencez par ajouter une entrée.
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()} className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une entrée
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? 'Modifier' : 'Ajouter'} - {table.name}
            </DialogTitle>
            <DialogDescription>
              Remplissez les champs ci-dessous
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {table.fields.map(field => (
              <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <Label>
                  {field.name}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <div className="mt-2">
                  {renderField(field)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {editingIndex !== null ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
